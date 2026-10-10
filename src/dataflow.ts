import type { TenantState } from './tenant';
import { accessError } from './tenant';
import { findObject, objectKey, type RepoObject } from './repo';
import { addRun, lockError } from './integration';
import { exec, runSql } from './db';
import { tableStatements, type ColType, type TableDef } from './localtable';

/**
 * Data flows (excursion c12-m10, Handbuch 6.7.1): an ETL process with sources, operators and one target table.
 * The game keeps the canvas as a fixed pipeline: one source, an optional join with a second source, a projection
 * (columns as SQL expressions, optional filter), an optional aggregation, and the target with mode Append, Truncate or Delete.
 * Union and the Python script operator are only explained. The flow runs as SQL in the space; the rows written to the target
 * are kept with the table (at most MAX_ROWS) so they survive a reload.
 */

export type JoinType = 'INNER' | 'LEFT';
export type TargetMode = 'Append' | 'Truncate' | 'Delete';
export type AggFn = 'SUM' | 'COUNT' | 'MIN' | 'MAX' | 'AVG';
export const AGG_FNS: AggFn[] = ['SUM', 'COUNT', 'MIN', 'MAX', 'AVG'];
export const MAX_ROWS = 500;

export interface DataFlowDef {
  /** SPACE.NAME of the first source. */
  source: string;
  join?: { source: string; type: JoinType; left: string; right: string };
  /** Output columns of the projection: name and SQL expression on the sources (aliases a and b). */
  columns: { name: string; expr: string }[];
  filter: string;
  aggregation?: { measures: { column: string; fn: AggFn }[] };
  target: { table: string; mode: TargetMode };
}

export const emptyDataFlow = (): DataFlowDef => ({ source: '', columns: [], filter: '', target: { table: '', mode: 'Append' } });

const NAME = /^[A-Z_][A-Z0-9_]{0,49}$/;
const ref = (key: string) => key.split('.').map((p) => `"${p}"`).join('.');

/** The SELECT the flow runs (before it writes to the target). */
export function dataFlowSelect(d: DataFlowDef): string {
  const measures = new Map((d.aggregation?.measures ?? []).map((m) => [m.column, m.fn]));
  const cols = d.columns.map((c) => {
    const fn = d.aggregation ? measures.get(c.name) : undefined;
    return fn ? `${fn}(${c.expr}) AS "${c.name}"` : `${c.expr} AS "${c.name}"`;
  });
  const from = `${ref(d.source)} a${d.join ? `\n${d.join.type === 'LEFT' ? 'LEFT JOIN' : 'JOIN'} ${ref(d.join.source)} b ON a."${d.join.left}" = b."${d.join.right}"` : ''}`;
  const groups = d.aggregation ? d.columns.filter((c) => !measures.has(c.name)).map((c) => c.expr) : [];
  return `SELECT ${cols.join(',\n  ')}\nFROM ${from}${d.filter.trim() ? `\nWHERE ${d.filter.trim()}` : ''}${groups.length ? `\nGROUP BY ${groups.join(', ')}` : ''}`;
}

/** Checks before Deploy; returns an error text or null. */
export async function dataFlowError(d: DataFlowDef, space: string, t: TenantState): Promise<string | null> {
  if (!d.source) return 'Choose a source.';
  if (d.join && (!d.join.source || !d.join.left || !d.join.right)) return 'The join needs a second source and a column on each side.';
  if (!d.columns.length) return 'The projection has no columns. Add the columns the target needs.';
  const bad = d.columns.find((c) => !NAME.test(c.name) || !c.expr.trim());
  if (bad) return `Column "${bad.name || '(empty)'}": use A–Z, 0–9 and _ for names and give every column an expression.`;
  if (new Set(d.columns.map((c) => c.name)).size !== d.columns.length) return 'Two columns have the same name.';
  if (d.aggregation && !d.aggregation.measures.length) return 'The aggregation has no measure. Choose a function for at least one column, or remove the aggregation.';
  if (!NAME.test(d.target.table)) return 'Name the target table (A–Z, 0–9, _).';
  const denied = accessError(`SELECT * FROM ${d.source}${d.join ? ` JOIN ${d.join.source}` : ''}`, space, t);
  if (denied) return denied;
  try {
    await runSql(`SELECT * FROM (${dataFlowSelect(d)}) x LIMIT 0`);
  } catch (err) {
    return `The flow does not run: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`;
  }
  const target = findObject(t, `${space}.${d.target.table}`);
  if (target && target.kind !== 'Local Table') return `${d.target.table} exists and is a ${target.kind}. The target must be a local table.`;
  if (target?.source) return `${d.target.table} is loaded by IT from a source system. Write into a table of your own.`;
  if (d.target.mode === 'Delete' && target?.table && !target.table.columns.some((c) => c.key))
    return `Mode Delete removes target rows by their key, and ${d.target.table} has no key column.`;
  return null;
}

const COL: [RegExp, ColType][] = [[/^(TINYINT|SMALLINT|INTEGER|BIGINT|HUGEINT|UBIGINT|UINTEGER)/, 'Integer'], [/^(DECIMAL|DOUBLE|FLOAT|REAL)/, 'Decimal'], [/^DATE$/, 'Date']];

/** Runs a deployed data flow: creates the target if it is missing, then writes by mode. Returns the run. */
export async function runDataFlow(t: TenantState, o: RepoObject) {
  const key = objectKey(o);
  const d = o.deployed?.dataflow;
  const messages: string[] = [];
  const fail = (msg: string) => addRun(t, { object: key, kind: 'Data Flow', start: new Date().toISOString(), status: 'Failed', records: 0, messages: [...messages, msg] });
  if (!d) return fail('The flow is not deployed.');
  const locked = lockError(t, o.space);
  if (locked) return fail(locked);
  const select = dataFlowSelect(d);
  let result;
  try {
    // Values as text: exact for large sums (decimal128 does not survive the trip to JavaScript numbers).
    const shape = await runSql(`SELECT * FROM (${select}) x LIMIT 0`);
    result = await runSql(`SELECT ${shape.columns.map((c) => `CAST("${c}" AS VARCHAR) AS "${c}"`).join(', ')} FROM (${select}) x`);
  } catch (err) {
    return fail(`Reading the sources failed: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
  }
  messages.push(`Read ${result.rows.length} rows from ${d.source}${d.join ? ` joined with ${d.join.source}` : ''}.`);
  let target = findObject(t, `${o.space}.${d.target.table}`);
  if (!target) {
    const desc = await runSql(`DESCRIBE ${select}`);
    const columns = desc.rows.map((r) => ({ name: String(r[0]), type: COL.find(([re]) => re.test(String(r[1])))?.[1] ?? 'String', key: false }));
    target = { space: o.space, name: d.target.table, kind: 'Local Table', businessName: d.target.table, semanticUsage: 'Relational Dataset',
      table: { columns, rows: [] }, status: 'deployed', changedAt: new Date().toISOString() };
    target.deployed = { businessName: target.businessName, table: structuredClone(target.table) };
    t.objects.push(target);
    for (const stmt of tableStatements(o.space, target.name, target.table!)) await exec(stmt);
    messages.push(`Target table ${d.target.table} created with ${columns.length} columns.`);
  }
  const def = target.table!;
  const missing = def.columns.filter((c) => !result.columns.includes(c.name)).map((c) => c.name);
  const extra = result.columns.filter((c) => !def.columns.some((x) => x.name === c));
  if (extra.length) return fail(`The target has no column for ${extra.join(', ')}. Map the flow to the target columns (same names).`);
  const rows = result.rows.map((r) => r.map((v) => (v === null || v === undefined ? '' : String(v))));
  let next: string[][];
  const order = def.columns.map((c) => result.columns.indexOf(c.name));
  const asTarget = (r: string[]) => order.map((i) => (i < 0 ? '' : r[i]));
  if (d.target.mode === 'Truncate') {
    next = rows.map(asTarget);
    messages.push(`Truncate: ${def.rows.length} rows deleted from ${d.target.table}, then ${rows.length} inserted.`);
  } else if (d.target.mode === 'Append') {
    next = [...def.rows, ...rows.map(asTarget)];
    messages.push(`Append: ${rows.length} rows added to ${d.target.table} (now ${next.length}).`);
  } else {
    const keys = def.columns.map((c, i) => (c.key ? i : -1)).filter((i) => i >= 0);
    const hit = new Set(rows.map(asTarget).map((r) => keys.map((i) => r[i]).join('\u0001')));
    next = def.rows.filter((r) => !hit.has(keys.map((i) => r[i]).join('\u0001')));
    messages.push(`Delete: ${def.rows.length - next.length} rows removed from ${d.target.table} by key.`);
  }
  if (missing.length) messages.push(`No value for ${missing.join(', ')}: left empty.`);
  if (next.length > MAX_ROWS) return fail(`The target would hold ${next.length} rows; the training tenant keeps at most ${MAX_ROWS} per table. Aggregate further or use Truncate.`);
  try {
    await exec(`DELETE FROM ${ref(`${o.space}.${target.name}`)}`);
    const all = next.map((r) => def.columns.map((_, i) => r[i] ?? ''));
    for (const stmt of tableStatements(o.space, target.name, { columns: def.columns, rows: all }).slice(1)) await exec(stmt);
  } catch (err) {
    return fail(`Writing to ${d.target.table} failed: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`);
  }
  def.rows = next;
  if (target.deployed?.table) target.deployed.table.rows = next.map((r) => [...r]);
  return addRun(t, { object: key, kind: 'Data Flow', start: new Date().toISOString(), status: 'Completed', records: rows.length, messages });
}

export function sanitizeDataFlow(d: unknown): DataFlowDef | undefined {
  if (!d || typeof d !== 'object') return undefined;
  const x = d as Partial<DataFlowDef>;
  const s = (v: unknown, n = 200) => (typeof v === 'string' ? v.slice(0, n) : '');
  return {
    source: s(x.source, 80),
    join: x.join && typeof x.join === 'object' ? { source: s(x.join.source, 80), type: x.join.type === 'LEFT' ? 'LEFT' : 'INNER', left: s(x.join.left, 60), right: s(x.join.right, 60) } : undefined,
    columns: (Array.isArray(x.columns) ? x.columns : []).slice(0, 30).map((c) => ({ name: s(c?.name, 50), expr: s(c?.expr, 300) })),
    filter: s(x.filter, 300),
    aggregation: x.aggregation && Array.isArray(x.aggregation.measures)
      ? { measures: x.aggregation.measures.slice(0, 30).filter((m) => m && AGG_FNS.includes(m.fn)).map((m) => ({ column: s(m.column, 50), fn: m.fn })) }
      : undefined,
    target: { table: s(x.target?.table, 50), mode: x.target?.mode === 'Truncate' || x.target?.mode === 'Delete' ? x.target.mode : 'Append' },
  };
}

/** For the canvas: the table def of an existing target, if any. */
export const targetTable = (t: TenantState, space: string, d: DataFlowDef): TableDef | undefined =>
  findObject(t, `${space}.${d.target.table}`)?.table;
