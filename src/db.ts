import * as duckdb from '@duckdb/duckdb-wasm';
import mvpWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
import mvpWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
import ehWasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
import ehWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  ms: number;
}

const BUNDLES: duckdb.DuckDBBundles = {
  mvp: { mainModule: mvpWasm, mainWorker: mvpWorker },
  eh: { mainModule: ehWasm, mainWorker: ehWorker },
};

let conn: duckdb.AsyncDuckDBConnection | null = null;

/**
 * Artifact build (npm run build:artifact): the host caps single files at 15 MB, so the
 * 36 MB wasm ships gzipped (about 8 MB) and is unpacked here into a blob URL.
 */
async function gzippedBundle(gzUrl: string): Promise<duckdb.DuckDBBundle> {
  const res = await fetch(gzUrl);
  if (!res.ok) throw new Error(`Could not load the database engine (${res.status}).`);
  let bytes = new Uint8Array(await res.arrayBuffer());
  // Some hosts already decode gzip on the wire; only unpack when the gzip magic bytes are there.
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  }
  const wasm = URL.createObjectURL(new Blob([bytes], { type: 'application/wasm' }));
  return { mainModule: wasm, mainWorker: ehWorker, pthreadWorker: null };
}

/** Starts DuckDB in a web worker and opens one shared connection. */
export async function initDb(): Promise<void> {
  const gz = import.meta.env.VITE_DUCKDB_WASM_GZ as string | undefined;
  const bundle = gz ? await gzippedBundle(gz) : await duckdb.selectBundle(BUNDLES);
  const worker = new Worker(bundle.mainWorker!);
  const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  conn = await db.connect();
}

function requireConn(): duckdb.AsyncDuckDBConnection {
  if (!conn) throw new Error('The database is still starting.');
  return conn;
}

/** Runs a statement (or several separated by semicolons) and returns the last result. */
export async function runSql(sql: string): Promise<QueryResult> {
  const c = requireConn();
  const start = performance.now();
  const table = await c.query(sql);
  const ms = performance.now() - start;
  const fields = table.schema.fields;
  const columns = fields.map((f) => f.name);
  const kinds = fields.map((f) => String(f.type));
  // Arrow hands DECIMAL values over unscaled (465.41 arrives as 46541): divide by 10^scale.
  const scales = fields.map((f) => {
    const t = f.type as unknown as { typeId?: number; scale?: number };
    return t.typeId === 7 && typeof t.scale === 'number' ? t.scale : 0;
  });
  const rows = table.toArray().map((r) =>
    columns.map((col, i) => formatTemporal(scaleDecimal(normalize(r[col]), scales[i]), kinds[i])),
  );
  return { columns, rows, ms };
}

/** Executes setup SQL without returning rows. */
export async function exec(sql: string): Promise<void> {
  await requireConn().query(sql);
}

/** Lists user tables and views per schema, used for autocomplete and the object browser. */
export async function listObjects(): Promise<{ schema: string; name: string; type: string; columns: string[] }[]> {
  const res = await runSql(`
    SELECT t.table_schema, t.table_name, t.table_type,
           list(c.column_name ORDER BY c.ordinal_position) AS cols
    FROM information_schema.tables t
    JOIN information_schema.columns c
      ON c.table_schema = t.table_schema AND c.table_name = t.table_name
    WHERE t.table_schema NOT IN ('information_schema', 'pg_catalog', 'main', 'persistence')
    GROUP BY ALL
    ORDER BY 1, 2`);
  return res.rows.map(([schema, name, type, cols]) => ({
    schema: String(schema),
    name: String(name),
    type: String(type) === 'VIEW' ? 'View' : 'Table',
    columns: Array.isArray(cols) ? cols.map(String) : [],
  }));
}

/** Column names and types of a table or view. */
export async function describeColumns(schema: string, name: string): Promise<{ name: string; type: string }[]> {
  const res = await runSql(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_schema = '${schema.replace(/'/g, "''")}' AND table_name = '${name.replace(/'/g, "''")}'
    ORDER BY ordinal_position`);
  return res.rows.map(([n, t]) => ({ name: String(n), type: String(t) }));
}

/** Arrow hands dates and timestamps over as epoch milliseconds; show them as ISO text. */
function formatTemporal(v: unknown, kind: string): unknown {
  if (typeof v !== 'number') return v;
  if (kind.startsWith('Date')) return new Date(v).toISOString().slice(0, 10);
  if (kind.startsWith('Timestamp')) return new Date(v).toISOString().replace('T', ' ').slice(0, 19);
  return v;
}

function scaleDecimal(v: unknown, scale: number): unknown {
  if (!scale || v === null || v === undefined) return v;
  const n = typeof v === 'number' ? v : typeof v === 'bigint' ? Number(v) : Number(String(v));
  return Number.isFinite(n) ? Number((n / 10 ** scale).toFixed(scale)) : v;
}

function normalize(v: unknown): unknown {
  if (typeof v === 'bigint') return Number(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (v && typeof v === 'object' && 'toArray' in v && typeof (v as { toArray: unknown }).toArray === 'function') {
    return Array.from((v as { toArray: () => unknown[] }).toArray()).map(normalize);
  }
  return v;
}
