/**
 * Prints row counts, defect facts and a fingerprint of the generated dataset.
 * Run: npm run data:report  (Node 22.18+ runs TypeScript directly)
 * If the fingerprint changes, bump GENERATOR_VERSION in src/data/generator.ts.
 */
import { createHash } from 'node:crypto';
import { generateDataset, GENERATOR_VERSION } from '../src/data/generator.ts';

const ds = generateDataset();
const fingerprint = createHash('sha1').update(JSON.stringify(ds.tables)).digest('hex').slice(0, 12);

console.log(`Generator v${GENERATOR_VERSION}, seed ${ds.seed}, fingerprint ${fingerprint}\n`);
console.table(ds.tables.map((t) => ({ table: `${t.space}.${t.name}`, rows: t.rows.length })));
console.table(ds.facts);
