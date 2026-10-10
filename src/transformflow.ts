import type { TenantState } from './tenant';
import { accessError } from './tenant';
import { findObject, objectKey, type RepoObject } from './repo';
import { addRun, lockError } from './integration';
import { exec, runSql } from './db';
import { tableStatements, type ColType, type TableDef } from './localtable';
import { MAX_ROWS } from './dataflow';

/**
 * Transformation flows (excursion c12-m11, Handbuch 6.7.3, 6.12.4): a view transform (here: SQL only, as the game builds no
 * graphical views) writes its result into one target table. Load type Initial Only: every run replaces the target with the
 * full result (simplified, not verified). Initial and Delta: the first run loads everything and remembers how far the delta
 * table of the source has been read; every later run reads only the change records since then (inserts, updates, deletes),
 * runs the transform on the changed rows and updates the target by key. The source must be a local table with Delta Capture,
 * the flow carries its key into the target. Simplified: exactly one delta source per flow (other sources, e.g. a view to join,
 * are read in full); no delta capture on the target; the delta pointer resets when a changed flow is deployed.
 */

export type TfLoad = 'Initial Only' | 'Initial and Delta';
export const TF_LOADS: TfLoad[] = ['Initial Only', 'Initial and Delta'];

export interface TransformFlowDef {
  /** The view transform: one SELECT. */
  sql: string;
  /** Technical name of the target table in the flow's space. */
  target: string;
  loadType: TfLoad;
}

export const emptyTransform = (): TransformFlowDef => ({ sql: '', target: '', loadType: 'Initial Only' });

const NAME = /^[A-Z_][A-Z0-9_]{0,49}$/;
const q = (key: string) => key.split('.').map((p) => `"${p}"`).join('.');
const strip = (sql: string) => sql.trim().replace(/;\s*$/, '');
const code = (sql: string) => sql.replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/'(?:[^']|'')*'/g, "''");
const REF = /"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\.\s*"?([A-Za-z_][A-Za-z0-9_]*)"?/g;

/** SPACE.NAME of every repository object the transform reads. */
export function transformReads(sql: string, t: TenantState): string[] {
  const keys = new Set<string>();
  for (const m of code(sql).matchAll(REF)) {
    const key = `${m[1].toUpperCase()}.${m[2].toUpperCase()}`;
    if (findObject(t, key)) keys.add(key);
  }
  return [...keys];
}

/** Local tables the transform reads that record changes (deployed with Delta Capture). */
export const deltaSources = (sql: string, t: TenantState): RepoObject[] =>
  transformReads(sql, t).map((k) => findObject(t, k)!).filter((o) => o.kind === 'Local Table' && !!o.deployed?.table?.deltaCapture);

const keyCols = (def: TableDef) => def.columns.filter((c) => c.key).map((c) => c.name);

/** Checks before Deploy; returns an error text or null. */
export async function transformError(d: TransformFlowDef, space: string, t: TenantState): Promise<string | null> {
  const sql = strip(d.sql);
  if (!/^(select|with)\b/i.test(code(sql).trim())) return 'The view transform needs one SELECT statement.';
  const delta = code(sql).match(/"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\.\s*"?([A-Za-z_][A-Za-z0-9_]*_DELTA)"?/i);
  if (delta) return `${delta[2]} is a delta table. It cannot be read in SQL (a documented restriction); choose Initial and Delta and read the table itself, the flow picks the changes.`;
  if (!NAME.test(d.target)) return 'Name the target table (A–Z, 0–9, _).';
  const denied = accessError(sql, space, t);
  if (denied) return denied;
  let cols: string[];
  try {
    cols = (await runSql(`SELECT * FROM (\n${sql}\n) x LIMIT 0`)).columns;
  } catch (err) {
    return `The view transform does not run: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`;
  }
  if (new Set(cols.map((c) => c.toUpperCase())).size !== cols.length) return 'Two output columns have the same name. Give each one its own name with AS.';
  const target = findObject(t, `${space}.${d.target}`);
  if (target && target.kind !== 'Local Table') return `${d.target} exists and is a ${target.kind}. The target must be a local table.`;
  if (target?.source) return `${d.target} is loaded by IT from a source system. Write into a table of your own.`;
  if (d.loadType === 'Initial and Delta') {
    const sources = deltaSources(sql, t);
    if (!sources.length) {
      const tables = transformReads(sql, t).map((k) => findObject(t, k)!).filter((o) => o.kind === 'Local Table');
      const mine = tables.find((o) => o.table && !o.source);
      return mine
        ? `Initial and Delta reads changes from a source with Delta Capture, and ${mine.name} records none. Switch on Delta Capture in its table editor (space ${mine.space}) and deploy the table.`
        : 'Initial and Delta needs a source table with Delta Capture. None of the sources records changes.';
    }
    if (sources.length > 1) return `The view transform reads ${sources.length} tables with Delta Capture. The game supports one delta source per flow; join the others as views.`;
    const keys = keyCols(sources[0].deployed!.table!);
    const missing = keys.filter((k) => !cols.some((c) => c.toUpperCase() === k));
    if (missing.length) return `The delta of ${sources[0].name} is applied by its key: keep ${missing.join(', ')} in the output, under the same name.`;
    if (target?.table) {
      const lacks = keys.filter((k) => !target.table!.columns.some((c) => c.name === k));
      if (lacks.length) return `${d.target} has no column ${lacks.join(', ')}: the delta finds its rows by the key of the source.`;
      const tk = keyCols(target.table);
      if (tk.length && tk.join() !== keys.join()) return `${d.target} has the key ${tk.join(', ')}; the delta needs the key of the source (${keys.join(', ')}).`;
    }
  }
  return null;
}

const COL: [RegExp, ColType][] = [[/^(TINYINT|SMALLINT|INTEGER|BIGINT|HUGEINT|UBIGINT|UINTEGER)/, 'Integer'], [/^(DECIMAL|DOUBLE|FLOAT|REAL)/, 'Decimal'], [/^DATE$/, 'Date']];

/** Values as text: exact for decimals (decimal128 does not survive the trip to JavaScript numbers). */
async function readAll(sql: string) {
  const shape = await runSql(`SELECT * FROM (\n${sql}\n) x LIMIT 0`);
  return runSql(`SELECT ${shape.columns.map((c) => `CAST("${c}" AS VARCHAR) AS "${c}"`).join(', ')} FROM (\n${sql}\n) x`);
}

/** Replaces every reference to `key` in the SQL by `by` (outside strings and comments is good enough for the game). */
function swapSource(sql: string, key: string, by: string): string {
  const [sp, nm] = key.split('.');
  const re = new RegExp(`"?${sp}"?\\s*\\.\\s*"?${nm}"?(?![A-Za-z0-9_])`, 'gi');
  return sql.replace(re, by);
}

/** Runs a deployed transformation flow. Returns the run. */
export async function runTransformFlow(t: TenantState, o: RepoObject) {
  const key = objectKey(o);
  const d = o.deployed?.transform;
  const messages: string[] = [];
  const start = new Date().toISOString();
  const fail = (msg: string) => addRun(t, { object: key, kind: 'Transformation Flow', start, status: 'Failed', records: 0, messages: [...messages, msg] });
  if (!d) return fail('The flow is not deployed.');
  const locked = lockError(t, o.space);
  if (locked) return fail(locked);
  const sql = strip(d.sql);
  const src = d.loadType === 'Initial and Delta' ? deltaSources(sql, t)[0] : undefined;
  if (d.loadType === 'Initial and Delta' && !src) return fail('The source no longer records changes (Delta Capture is off or the table is gone).');
  const isDelta = !!src && o.tfPointer !== undefined;
  const srcKeys = src ? keyCols(src.deployed!.table!) : [];

  // Which rows to read: everything, or only the keys that changed since the last run.
  let changed: { upsert: string[][]; deleted: string[][]; records: number; last: number } | undefined;
  let select = sql;
  if (isDelta) {
    const log = (src!.deltaLog ?? []).filter((r) => r.seq > o.tfPointer!);
    const def = src!.deployed!.table!;
    const ki = srcKeys.map((k) => def.columns.findIndex((c) => c.name === k));
    const kOf = (r: string[]) => ki.map((i) => r[i] ?? '');
    const last = new Map<string, { type: string; key: string[] }>();
    for (const r of log) last.set(kOf(r.row).join('\u0001'), { type: r.type, key: kOf(r.row) });
    const counts = { I: 0, U: 0, D: 0 } as Record<string, number>;
    log.forEach((r) => counts[r.type]++);
    const upsert = [...last.values()].filter((x) => x.type !== 'D').map((x) => x.key);
    const deleted = [...last.values()].filter((x) => x.type === 'D').map((x) => x.key);
    changed = { upsert, deleted, records: last.size, last: log.at(-1)?.seq ?? o.tfPointer! };
    messages.push(log.length
      ? `Delta: ${log.length} change record${log.length === 1 ? '' : 's'} in ${src!.name}_Delta since the last run (${counts.I} insert, ${counts.U} update, ${counts.D} delete).`
      : `Delta: no change records in ${src!.name}_Delta since the last run.`);
    if (!log.length) {
      return addRun(t, { object: key, kind: 'Transformation Flow', start, status: 'Completed', records: 0, messages: [...messages, 'Nothing to do; the target is unchanged.'] });
    }
    const lit = (v: string) => `'${v.replace(/'/g, "''")}'`;
    const cond = upsert.length ? upsert.map((k) => `(${srcKeys.map((c, i) => `CAST("${c}" AS VARCHAR) = ${lit(k[i])}`).join(' AND ')})`).join(' OR ') : 'FALSE';
    try {
      await exec('CREATE SCHEMA IF NOT EXISTS "tf_stage"');
      await exec(`CREATE OR REPLACE TABLE "tf_stage"."${src!.name}" AS SELECT * FROM ${q(objectKey(src!))} WHERE ${cond}`);
    } catch (err) {
      return fail(`Reading the changed rows failed: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
    }
    select = swapSource(sql, objectKey(src!), `"tf_stage"."${src!.name}"`);
  }
  let result;
  try {
    result = await readAll(select);
  } catch (err) {
    return fail(`The view transform failed: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
  }
  if (!isDelta) messages.push(`${src ? 'Initial load' : 'Full load (Initial Only)'}: the view transform returned ${result.rows.length} rows.`);
  else messages.push(`The view transform returned ${result.rows.length} row${result.rows.length === 1 ? '' : 's'} for the changed keys.`);

  let target = findObject(t, `${o.space}.${d.target}`);
  if (!target) {
    const desc = await runSql(`DESCRIBE SELECT * FROM (\n${select}\n) x`);
    const columns = desc.rows.map((r) => ({ name: String(r[0]), type: COL.find(([re]) => re.test(String(r[1])))?.[1] ?? 'String', key: srcKeys.includes(String(r[0]).toUpperCase()) }));
    target = { space: o.space, name: d.target, kind: 'Local Table', businessName: d.target, semanticUsage: 'Relational Dataset',
      table: { columns, rows: [] }, status: 'deployed', changedAt: start };
    target.deployed = { businessName: target.businessName, table: structuredClone(target.table) };
    t.objects.push(target);
    for (const stmt of tableStatements(o.space, target.name, target.table!)) await exec(stmt);
    messages.push(`Target table ${d.target} created with ${columns.length} columns${srcKeys.length ? `, key ${srcKeys.join(', ')}` : ''}.`);
  }
  const def = target.table!;
  // The initial load of a delta flow is a full load: it gives a target without a key the key of the source.
  if (src && !isDelta && !def.columns.some((c) => c.key) && srcKeys.every((k) => def.columns.some((c) => c.name === k))) {
    def.columns.forEach((c) => (c.key = srcKeys.includes(c.name)));
    if (target.deployed?.table) target.deployed.table.columns = structuredClone(def.columns);
    await exec(tableStatements(o.space, target.name, { columns: def.columns, rows: [] })[0]);
    messages.push(`Target ${d.target}: key ${srcKeys.join(', ')} set for the delta.`);
  }
  const extra = result.columns.filter((c) => !def.columns.some((x) => x.name === c));
  if (extra.length) return fail(`The target has no column for ${extra.join(', ')}. Map the transform to the target columns (same names).`);
  const order = def.columns.map((c) => result.columns.indexOf(c.name));
  const rows = result.rows.map((r) => order.map((i) => (i < 0 || r[i] === null || r[i] === undefined ? '' : String(r[i]))));
  let next: string[][];
  if (isDelta) {
    const tk = srcKeys.map((k) => def.columns.findIndex((c) => c.name === k));
    if (tk.some((i) => i < 0)) return fail(`The target has no column ${srcKeys.join(', ')}; the delta cannot find its rows.`);
    const hit = new Set([...changed!.upsert, ...changed!.deleted].map((k) => k.join('\u0001')));
    const kept = def.rows.filter((r) => !hit.has(tk.map((i) => r[i] ?? '').join('\u0001')));
    next = [...kept, ...rows];
    messages.push(`Target ${d.target}: ${rows.length} row${rows.length === 1 ? '' : 's'} inserted or updated, ${changed!.deleted.length} deleted by key; now ${next.length} rows.`);
  } else {
    next = rows;
    messages.push(`Target ${d.target}: replaced, now ${rows.length} rows.`);
  }
  if (next.length > MAX_ROWS) return fail(`The target would hold ${next.length} rows; the training tenant keeps at most ${MAX_ROWS} per table.`);
  try {
    await exec(`DELETE FROM ${q(`${o.space}.${target.name}`)}`);
    for (const stmt of tableStatements(o.space, target.name, { columns: def.columns, rows: next }).slice(1)) await exec(stmt);
  } catch (err) {
    return fail(`Writing to ${d.target} failed: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
  }
  def.rows = next;
  if (target.deployed?.table) target.deployed.table.rows = next.map((r) => [...r]);
  if (src) o.tfPointer = changed ? changed.last : Math.max(0, ...(src.deltaLog ?? []).map((r) => r.seq));
  return addRun(t, { object: key, kind: 'Transformation Flow', start, status: 'Completed', records: isDelta ? changed!.records : rows.length, messages });
}

export function sanitizeTransform(d: unknown): TransformFlowDef | undefined {
  if (!d || typeof d !== 'object') return undefined;
  const x = d as Partial<TransformFlowDef>;
  return {
    sql: typeof x.sql === 'string' ? x.sql.slice(0, 4000) : '',
    target: typeof x.target === 'string' ? x.target.slice(0, 50) : '',
    loadType: x.loadType === 'Initial and Delta' ? 'Initial and Delta' : 'Initial Only',
  };
}

/** The first message of a run says what kind of load it was. */
export const isDeltaRun = (messages: string[]) => messages[0]?.startsWith('Delta:') ?? false;
