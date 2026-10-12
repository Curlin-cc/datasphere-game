/**
 * Local tables the player creates (chapter 8+, Handbuch 6.4.1): columns with a data type and key flag, and rows typed in
 * the Data Editor. Deploy creates the table in the space and inserts the rows. Simplified: four data types, no file upload
 * (see docs/DECISIONS.md).
 *
 * Delta Capture (excursion c12-m11, Handbuch 6.4.2): with the switch on, every deployment after the first records what changed,
 * row by row, in the delta table NAME_Delta (technical columns Change_Type and Change_Date). Transformation flows with
 * Initial and Delta read these records. The delta table lives only in the save game, not in the database: a SQL view cannot
 * read it, which is the documented restriction. Needs a key; once deployed with delta capture, the game does not switch it off.
 */

export type ColType = 'String' | 'Integer' | 'Decimal' | 'Date';
export const COL_TYPES: ColType[] = ['String', 'Integer', 'Decimal', 'Date'];

export interface TableColumn {
  name: string;
  type: ColType;
  key: boolean;
}

export interface TableDef {
  columns: TableColumn[];
  /** One string per column; empty string = NULL. */
  rows: string[][];
  /** Delta Capture switched on (Handbuch 6.4.2). */
  deltaCapture?: boolean;
}

/** One record of the delta table: I = insert, U = update, D = delete (values as in the real tenant: not verified). */
export interface DeltaRecord {
  /** Running number; transformation flows remember the last one they processed. */
  seq: number;
  type: 'I' | 'U' | 'D';
  at: string;
  /** The row after the change (for D: the row before it). */
  row: string[];
}
export const MAX_DELTA = 300;

const keyOf = (def: TableDef, r: string[]) => def.columns.map((c, i) => (c.key ? (r[i] ?? '').trim() : null)).filter((v) => v !== null).join('\u0001');

/** The change records between two deployed versions of a table, by key (same columns assumed; changed columns count as updates). */
export function deltaBetween(before: TableDef, after: TableDef, nextSeq: number, at: string): DeltaRecord[] {
  const old = new Map(before.rows.map((r) => [keyOf(before, r), r]));
  const now = new Map(after.rows.map((r) => [keyOf(after, r), r]));
  const out: DeltaRecord[] = [];
  const add = (type: DeltaRecord['type'], row: string[]) => out.push({ seq: nextSeq + out.length, type, at, row: row.map((v) => v.trim()) });
  const sameCols = JSON.stringify(before.columns) === JSON.stringify(after.columns);
  for (const [k, r] of now) {
    const was = old.get(k);
    if (!was) add('I', r);
    else if (!sameCols || r.some((v, i) => v.trim() !== (was[i] ?? '').trim())) add('U', r);
  }
  for (const [k, r] of old) if (!now.has(k)) add('D', r);
  return out;
}

export function sanitizeDelta(d: unknown): DeltaRecord[] | undefined {
  if (!Array.isArray(d)) return undefined;
  return d.slice(-MAX_DELTA).filter((x) => x && typeof x.seq === 'number' && ['I', 'U', 'D'].includes(x.type) && Array.isArray(x.row))
    .map((x) => ({ seq: x.seq, type: x.type, at: typeof x.at === 'string' ? x.at.slice(0, 30) : '', row: x.row.slice(0, 30).map((v: unknown) => String(v ?? '').slice(0, 200)) }));
}

const SQL_TYPE: Record<ColType, string> = { String: 'VARCHAR', Integer: 'INTEGER', Decimal: 'DECIMAL(18,3)', Date: 'DATE' };
const NAME = /^[A-Z_][A-Z0-9_]{0,49}$/;

export const emptyTable = (): TableDef => ({ columns: [{ name: 'ID', type: 'String', key: true }], rows: [] });

function valueError(v: string, type: ColType): string | null {
  if (v === '') return null;
  if (type === 'Integer' && !/^-?\d+$/.test(v)) return 'is not a whole number';
  if (type === 'Decimal' && !/^-?\d+(\.\d+)?$/.test(v)) return 'is not a number (use a dot for decimals)';
  if (type === 'Date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'is not a date (YYYY-MM-DD)';
  return null;
}

/** Everything that must be right before a table can be deployed. Null if fine. */
export function tableError(def: TableDef, deployed?: TableDef): string | null {
  if (!def.columns.length) return 'Add at least one column.';
  // SAP: Delta Capture is set before the first deployment and cannot be changed afterwards (Create a Local Table).
  if (deployed && !!def.deltaCapture !== !!deployed.deltaCapture)
    return deployed.deltaCapture ? 'Delta Capture cannot be switched off once the table is deployed.'
      : 'Delta Capture can only be switched on before a table is deployed for the first time. Create a new table with Delta Capture on.';
  if (def.deltaCapture && !def.columns.some((c) => c.key)) return 'Delta Capture records changes per key: mark at least one key column.';
  const seen = new Set<string>();
  for (const c of def.columns) {
    if (!NAME.test(c.name)) return `Column "${c.name || '(empty)'}": use capital letters, digits and underscores.`;
    if (seen.has(c.name)) return `There are two columns called ${c.name}.`;
    seen.add(c.name);
  }
  const keys = def.columns.map((c, i) => (c.key ? i : -1)).filter((i) => i >= 0);
  const keySeen = new Set<string>();
  for (const [r, row] of def.rows.entries()) {
    for (const [i, c] of def.columns.entries()) {
      const err = valueError((row[i] ?? '').trim(), c.type);
      if (err) return `Row ${r + 1}, ${c.name}: "${row[i]}" ${err}.`;
      if (c.key && !(row[i] ?? '').trim()) return `Row ${r + 1}: the key column ${c.name} is empty.`;
    }
    if (keys.length) {
      const k = keys.map((i) => (row[i] ?? '').trim()).join('\u0001');
      if (keySeen.has(k)) return `Row ${r + 1}: the key (${keys.map((i) => def.columns[i].name).join(', ')}) appears twice.`;
      keySeen.add(k);
    }
  }
  return null;
}

const lit = (v: string, type: ColType) => {
  const t = v.trim();
  if (t === '') return 'NULL';
  if (type === 'Integer' || type === 'Decimal') return t;
  if (type === 'Date') return `DATE '${t}'`;
  return `'${t.replace(/'/g, "''")}'`;
};

/** CREATE and INSERT statements for the deployed version of a table. */
export function tableStatements(space: string, name: string, def: TableDef): string[] {
  const keys = def.columns.filter((c) => c.key).map((c) => `"${c.name}"`);
  const cols = def.columns.map((c) => `"${c.name}" ${SQL_TYPE[c.type]}`).concat(keys.length ? [`PRIMARY KEY (${keys.join(', ')})`] : []);
  const out = [`CREATE OR REPLACE TABLE "${space}"."${name}" (${cols.join(', ')})`];
  if (def.rows.length) {
    out.push(`INSERT INTO "${space}"."${name}" VALUES ${def.rows.map((r) => `(${def.columns.map((c, i) => lit(r[i] ?? '', c.type)).join(', ')})`).join(', ')}`);
  }
  return out;
}

export function sanitizeTable(d: unknown): TableDef | undefined {
  if (!d || typeof d !== 'object') return undefined;
  const t = d as { columns?: unknown; rows?: unknown };
  const columns: TableColumn[] = (Array.isArray(t.columns) ? t.columns : []).slice(0, 30)
    .filter((c): c is TableColumn => !!c && typeof c.name === 'string')
    .map((c) => ({ name: c.name.slice(0, 50), type: COL_TYPES.includes(c.type) ? c.type : 'String', key: !!c.key }));
  if (!columns.length) return undefined;
  const rows = (Array.isArray(t.rows) ? t.rows : []).slice(0, 500)
    .filter(Array.isArray)
    .map((r: unknown[]) => columns.map((_, i) => String(r[i] ?? '').slice(0, 200)));
  const delta = (t as { deltaCapture?: unknown }).deltaCapture === true;
  return delta ? { columns, rows, deltaCapture: true } : { columns, rows };
}
