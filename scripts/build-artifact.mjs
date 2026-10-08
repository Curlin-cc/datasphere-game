/**
 * Builds a version of the game that can be published as a claude.ai artifact.
 * Output: dist-artifact/ with page.html (head/body content only), assets/ and the gzipped DuckDB engine.
 * Run: npm run build:artifact
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const OUT = 'dist-artifact';
const GZ = 'duckdb-eh.gz.wasm'; // gzip bytes; .wasm name because the artifact host only serves known types

execSync('npx vite build --outDir dist-artifact-tmp', {
  stdio: 'inherit',
  env: { ...process.env, VITE_DUCKDB_WASM_GZ: `./${GZ}` },
});

rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/assets`, { recursive: true });

const assets = readdirSync('dist-artifact-tmp/assets');
for (const f of assets) {
  // The raw wasm files are too big for the host; only the gzipped eh build is shipped.
  if (f.endsWith('.wasm') || f.includes('mvp.worker')) continue;
  cpSync(`dist-artifact-tmp/assets/${f}`, `${OUT}/assets/${f}`);
}
const ehWasm = assets.find((f) => f.startsWith('duckdb-eh') && f.endsWith('.wasm'));
writeFileSync(`${OUT}/${GZ}`, gzipSync(readFileSync(`dist-artifact-tmp/assets/${ehWasm}`), { level: 9 }));

// The artifact host wraps the page in its own document, so keep only head and body content.
const html = readFileSync('dist-artifact-tmp/index.html', 'utf8');
const head = html.match(/<head>([\s\S]*)<\/head>/)[1].replace(/<meta[^>]*>\s*/g, '');
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
writeFileSync(`${OUT}/page.html`, `${head.trim()}\n${body.trim()}\n`);

rmSync('dist-artifact-tmp', { recursive: true, force: true });
console.log(`\n${OUT}/ ready:`, readdirSync(OUT), readdirSync(`${OUT}/assets`));
