import { exec, runSql } from './db';
import type { TenantState } from './tenant';
import { findObject, objectKey, readsFrom, type RepoObject } from './repo';
import { addRun } from './integration';

/**
 * Chapter 9, persistence and performance (Handbuch 6.5.6, 10.3.4, 10.4, 9.3.7).
 *
 * View persistence: a deployed SQL view can store its result as a snapshot. In DuckDB the snapshot is a table in the
 * hidden schema "persistence"; the view itself then reads that table, so it stays a view for everything else.
 * Remove Persisted Data points the view back at its SQL. Deploying a persisted view removes the snapshot (simplified).
 * A view that reads a view with a data access control cannot be persisted (Handbuch 9.3.7); a view with its own control
 * can (simplified, not verified in the handbook).
 *
 * Runtimes are simulated: the training tenant holds about 1/1000 of production volume, so real query times say nothing.
 * A small cost model estimates production runtimes from rows and SQL complexity along the lineage. Record counts are
 * the real ones of the training tenant; durations and memory sizes are for production volume.
 */

export const PERSIST_SCHEMA = 'persistence';

export interface PersistInfo {
  lastRefresh: string;
  records: number;
  /** Columns of the snapshot, for the size estimate. */
  columns: number;
}

/** One entry of the Expensive Statement Logs. */
export interface Statement {
  id: string;
  at: string;
  user: string;
  /** Where the statement came from. */
  source: 'SAP Analytics Cloud' | 'Data Preview';
  space: string;
  /** SPACE.NAME of the object that was read. */
  object: string;
  statement: string;
  ms: number;
  memMB: number;
  cpuMs: number;
}

export interface Tracing {
  enabled: boolean;
  /** Statements at least this long are logged. */
  thresholdMs: number;
}

export const DEFAULT_TRACING: Tracing = { enabled: false, thresholdMs: 50 };
export const THRESHOLDS = [50, 500, 1000, 5000];

/** Production volume / training tenant volume. */
export const SCALE = 1000;

const qi = (n: string) => `"${n.replace(/"/g, '""')}"`;
const snapshotTable = (key: string) => `${qi(PERSIST_SCHEMA)}.${qi(key)}`;
const stripSemicolon = (sql: string) => sql.trim().replace(/;\s*$/, '');

// ---------------------------------------------------------------- persistence

/** Views (transitively) read by this view that have a data access control. */
export function protectedSources(t: TenantState, o: RepoObject, seen = new Set<string>()): string[] {
  const out: string[] = [];
  for (const k of readsFrom(o, t)) {
    if (seen.has(k)) continue;
    seen.add(k);
    const r = findObject(t, k);
    if (!r) continue;
    if (r.deployed?.dacs?.length) out.push(k);
    out.push(...protectedSources(t, r, seen));
  }
  return [...new Set(out)];
}

/** Why a view cannot be persisted, or null. */
export function persistError(t: TenantState, o: RepoObject): string | null {
  if (o.kind !== 'SQL View') return 'Only views can be persisted.';
  if (!o.deployed?.sql) return `${o.name} is not deployed. Deploy the view first.`;
  const p = protectedSources(t, o);
  if (p.length) {
    return `${o.name} reads ${p.map((k) => k.split('.')[1]).join(', ')}, which has a data access control. A view that uses a view with a data access control cannot be persisted.`;
  }
  return null;
}

/** Runs the persistence: stores the result of the deployed SQL and lets the view read it. Logs a run. */
export async function persistView(t: TenantState, o: RepoObject, trigger: 'Manual' | 'Scheduled' | 'Task Chain' = 'Manual'): Promise<{ ok: boolean; message: string }> {
  const key = objectKey(o);
  const start = new Date().toISOString();
  const problem = persistError(t, o);
  if (problem) {
    addRun(t, { object: key, kind: 'View', start, status: 'Failed', records: 0, messages: [`${trigger} run: Persist ${o.name}.`, problem, 'Run stopped. Nothing was persisted.'] });
    return { ok: false, message: problem };
  }
  try {
    await exec(`CREATE SCHEMA IF NOT EXISTS ${qi(PERSIST_SCHEMA)}`);
    // Build the snapshot from the SQL, not from the view, which may already read an older snapshot.
    await exec(`CREATE OR REPLACE TABLE ${snapshotTable(key)} AS ${stripSemicolon(o.deployed!.sql!)}`);
    await exec(`CREATE OR REPLACE VIEW ${qi(o.space)}.${qi(o.name)} AS SELECT * FROM ${snapshotTable(key)}`);
    const n = Number((await runSql(`SELECT COUNT(*) FROM ${snapshotTable(key)}`)).rows[0][0]);
    const cols = (await runSql(`SELECT * FROM ${snapshotTable(key)} LIMIT 0`)).columns.length;
    o.persisted = { lastRefresh: start, records: n, columns: cols };
    const size = sizeMB(n, cols);
    addRun(t, {
      object: key, kind: 'View', start, status: 'Completed', records: n,
      messages: [`${trigger} run: Persist ${o.name}.`, `View executed, ${n.toLocaleString('en-US')} records stored.`,
        `In-memory size about ${fmtSize(size)} (production volume). The view now reads the snapshot.`],
    });
    return { ok: true, message: `${o.name}: ${n.toLocaleString('en-US')} records persisted` };
  } catch (err) {
    // Keep the database's message, without the position marker that shows internal names.
    const msg = (err instanceof Error ? err.message : String(err)).split(/\n|\s+LINE \d+:/)[0].trim();
    addRun(t, { object: key, kind: 'View', start, status: 'Failed', records: 0, messages: [`${trigger} run: Persist ${o.name}.`, `Failed: ${msg}`] });
    return { ok: false, message: msg };
  }
}

/** Remove Persisted Data: the view reads its SQL again. */
export async function unpersistView(o: RepoObject) {
  const key = objectKey(o);
  if (o.deployed?.sql) await exec(`CREATE OR REPLACE VIEW ${qi(o.space)}.${qi(o.name)} AS ${stripSemicolon(o.deployed.sql)}`);
  await exec(`DROP TABLE IF EXISTS ${snapshotTable(key)}`);
  o.persisted = undefined;
}

/** Called before a view is deployed again or deleted: the snapshot goes. */
export async function dropSnapshot(o: RepoObject) {
  if (!o.persisted) return;
  await exec(`DROP TABLE IF EXISTS ${snapshotTable(objectKey(o))}`);
  o.persisted = undefined;
}

/** After a reload: rebuild the snapshots (the generator data does not change, so they come back the same). */
export async function restorePersistence(t: TenantState) {
  for (const o of t.objects) {
    if (!o.persisted || !o.deployed?.sql) continue;
    const keep = o.persisted;
    try {
      await exec(`CREATE SCHEMA IF NOT EXISTS ${qi(PERSIST_SCHEMA)}`);
      await exec(`CREATE OR REPLACE TABLE ${snapshotTable(objectKey(o))} AS ${stripSemicolon(o.deployed.sql)}`);
      await exec(`CREATE OR REPLACE VIEW ${qi(o.space)}.${qi(o.name)} AS SELECT * FROM ${snapshotTable(objectKey(o))}`);
    } catch {
      o.persisted = undefined;
      continue;
    }
    o.persisted = keep;
  }
}

export function sanitizePersist(d: unknown): PersistInfo | undefined {
  if (!d || typeof d !== 'object') return undefined;
  const x = d as Record<string, unknown>;
  if (typeof x.lastRefresh !== 'string') return undefined;
  return { lastRefresh: x.lastRefresh, records: Math.max(0, Number(x.records) || 0), columns: Math.max(1, Number(x.columns) || 1) };
}

// ---------------------------------------------------------------- cost model

export interface PerfNode {
  key: string;
  name: string;
  kind: string;
  /** Rows in the training tenant. */
  rows: number;
  /** How the object is read. */
  access: 'Persisted' | 'Virtual' | 'Table' | 'Remote' | 'Replicated' | 'Model';
  /** Simulated production milliseconds this object adds itself (its own SQL). */
  ownMs: number;
  /** Simulated production milliseconds to read it, including everything below. */
  totalMs: number;
  /** Work in its own SQL: joins, duplicate removal, aggregation. */
  work: string[];
  dac: boolean;
  /** Views that read it. */
  usedBy: number;
  reads: PerfNode[];
}

/** Milliseconds per training-tenant row and unit of work, so that production volume lands in seconds. */
const MS_PER_ROW = 0.11;
const SCAN = 0.02;
const REMOTE = 0.9;

/** Work units of a SQL statement: what makes it expensive. */
export function workOf(sql: string): { weight: number; work: string[] } {
  const s = sql.replace(/--[^\n]*/g, ' ').replace(/'(?:[^']|'')*'/g, "''").toUpperCase();
  const joins = (s.match(/\bJOIN\b/g) ?? []).length;
  const dedup = /\bDISTINCT\b|\bROW_NUMBER\b|\bQUALIFY\b|\bRANK\s*\(/.test(s) && !/COUNT\s*\(\s*DISTINCT/.test(s) ? 1 : 0;
  const window = /\bOVER\s*\(/.test(s) ? 1 : 0;
  const group = /\bGROUP\s+BY\b/.test(s) ? 1 : 0;
  const cases = Math.min(3, (s.match(/\bCASE\b/g) ?? []).length);
  const unions = (s.match(/\bUNION\b/g) ?? []).length;
  const work: string[] = [];
  if (joins) work.push(`${joins} join${joins > 1 ? 's' : ''}`);
  if (dedup || window) work.push('duplicate removal');
  if (group) work.push('aggregation');
  if (cases) work.push(`${cases} CASE mapping${cases > 1 ? 's' : ''}`);
  if (unions) work.push('union');
  return { weight: 0.15 + 0.35 * joins + 4 * Math.max(dedup, window) + 0.8 * group + 0.25 * cases + 0.4 * unions, work };
}

const rowCache = new Map<string, number>();

async function rowsOf(key: string): Promise<number> {
  const [s, n] = key.split('.');
  try {
    return Number((await runSql(`SELECT COUNT(*) FROM ${qi(s)}.${qi(n)}`)).rows[0][0]);
  } catch {
    return rowCache.get(key) ?? 0;
  }
}

/** Estimates how reading an object costs at production volume, with the lineage below it. */
export async function analyze(t: TenantState, key: string, depth = 0): Promise<PerfNode | null> {
  const o = findObject(t, key);
  if (!o || depth > 8) return null;
  const rows = o.kind === 'Analytic Model' ? 0 : await rowsOf(key);
  rowCache.set(key, rows);
  const usedBy = t.objects.filter((x) => objectKey(x) !== key && readsFrom(x, t).includes(key)).length;
  const base = { key, name: o.name, rows, dac: !!o.deployed?.dacs?.length, usedBy };
  if (o.kind === 'Local Table') return { ...base, kind: 'Local Table', access: 'Table', ownMs: rows * SCAN * MS_PER_ROW * 10, totalMs: rows * SCAN * MS_PER_ROW * 10, work: [], reads: [] };
  if (o.kind === 'Remote Table') {
    const remote = o.remote?.access === 'Remote';
    const ms = rows * (remote ? REMOTE : SCAN) * MS_PER_ROW * 10;
    return { ...base, kind: 'Remote Table', access: remote ? 'Remote' : 'Replicated', ownMs: ms, totalMs: ms, work: remote ? ['read live from the source'] : [], reads: [] };
  }
  const reads: PerfNode[] = [];
  for (const k of readsFrom(o, t)) {
    const n = await analyze(t, k, depth + 1);
    if (n) reads.push(n);
  }
  const below = reads.reduce((s, r) => s + r.totalMs, 0);
  if (o.kind === 'Analytic Model') {
    const fact = reads.find((r) => r.key === o.deployed?.model?.fact);
    const own = (fact?.rows ?? 0) * 0.35 * MS_PER_ROW;
    return { ...base, kind: 'Analytic Model', access: 'Model', ownMs: own, totalMs: own + below + 150, work: ['aggregation for the story'], reads };
  }
  const sql = o.deployed?.sql ?? o.sql ?? '';
  const { weight, work } = workOf(sql);
  const input = reads.reduce((s, r) => s + (r.rows || 0), 0);
  const own = (input + rows) * weight * MS_PER_ROW;
  if (o.persisted) {
    const read = rows * SCAN * MS_PER_ROW * 10;
    return { ...base, kind: 'SQL View', access: 'Persisted', ownMs: own, totalMs: read, work, reads };
  }
  return { ...base, kind: 'SQL View', access: 'Virtual', ownMs: own, totalMs: own + below, work, reads };
}

/** Production size of a snapshot in MB (rough: 40 bytes per value). */
export const sizeMB = (rows: number, cols: number) => (rows * cols * 40 * SCALE) / 1024 / 1024;

export const fmtSize = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.max(1, Math.round(mb))} MB`);
export const fmtMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`);

// ---------------------------------------------------------------- expensive statements

let seq = 0;
const sid = () => `st-${Date.now().toString(36)}-${(seq++).toString(36)}`;

/** Logs a statement on an object if tracing is on and it is expensive enough. Returns the simulated runtime. */
export async function traceStatement(t: TenantState, key: string, user: string, source: Statement['source'], at = new Date()): Promise<number> {
  const n = await analyze(t, key);
  if (!n) return 0;
  // Different users and stories vary a little, deterministically.
  const jitter = 1 + ((user.charCodeAt(0) + user.length * 7) % 9) / 100;
  const ms = Math.round(n.totalMs * jitter);
  if (t.tracing?.enabled && ms >= t.tracing.thresholdMs) {
    const o = findObject(t, key)!;
    const statement = o.kind === 'Analytic Model'
      ? `SELECT … FROM "${o.name}"(…) GROUP BY …`
      : `SELECT * FROM "${o.name}"`;
    t.statements.unshift({
      id: sid(), at: at.toISOString(), user, source, space: o.space, object: key, statement, ms,
      memMB: Math.round(sizeMB(Math.max(n.rows, 1000), 8) * (n.access === 'Persisted' ? 0.3 : 1.6) + ms / 20),
      cpuMs: Math.round(ms * 2.4),
    });
    t.statements = t.statements.slice(0, 60);
  }
  return ms;
}

/** Story users who open the models at month-end. */
const SAC_USERS = ['PLINDNER', 'MBRANDT', 'ADEMIR'];

/** Simulates a round of SAP Analytics Cloud stories on every deployed analytic model (e.g. the month-end close). */
export async function simulateStories(t: TenantState) {
  const models = t.objects.filter((o) => o.kind === 'Analytic Model' && o.deployed?.model);
  const base = Date.now() - 20 * 60_000;
  let i = 0;
  for (const m of models) for (const u of SAC_USERS) await traceStatement(t, objectKey(m), u, 'SAP Analytics Cloud', new Date(base + (i++) * 97_000));
  t.statements.sort((a, b) => b.at.localeCompare(a.at));
}

export function sanitizeStatements(d: unknown): Statement[] {
  const out: Statement[] = [];
  for (const s of Array.isArray(d) ? d.slice(0, 60) : []) {
    if (!s || typeof s.object !== 'string' || typeof s.at !== 'string') continue;
    out.push({
      id: String(s.id ?? sid()), at: s.at, user: String(s.user ?? '').slice(0, 30), source: s.source === 'Data Preview' ? 'Data Preview' : 'SAP Analytics Cloud',
      space: String(s.space ?? '').slice(0, 20), object: s.object.slice(0, 80), statement: String(s.statement ?? '').slice(0, 300),
      ms: Number(s.ms) || 0, memMB: Number(s.memMB) || 0, cpuMs: Number(s.cpuMs) || 0,
    });
  }
  return out;
}

export function sanitizeTracing(d: unknown): Tracing {
  if (!d || typeof d !== 'object') return { ...DEFAULT_TRACING };
  const x = d as Record<string, unknown>;
  return { enabled: !!x.enabled, thresholdMs: THRESHOLDS.includes(Number(x.thresholdMs)) ? Number(x.thresholdMs) : DEFAULT_TRACING.thresholdMs };
}
