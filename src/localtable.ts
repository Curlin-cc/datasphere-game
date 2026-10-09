/**
 * Local tables the player creates (chapter 8+, Handbuch 6.4.1): columns with a data type and key flag, and rows typed in
 * the Data Editor. Deploy creates the table in the space and inserts the rows. Simplified: four data types, no
 * delta capture, no file upload (see docs/DECISIONS.md).
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
}

const SQL_TYPE: Record<ColType, string> = { String: 'VARCHAR', Integer: 'INTEGER', Decimal: 'DECIMAL(15,2)', Date: 'DATE' };
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
export function tableError(def: TableDef): string | null {
  if (!def.columns.length) return 'Add at least one column.';
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
  return { columns, rows };
}
