import type { TenantState } from './tenant';
import { assigned, CAPACITY } from './tenant';
import { deploy, findObject, type RepoObject, type SemanticUsage } from './repo';
import { exec } from './db';
import type { TableDef } from './localtable';

/**
 * Semantic Onboarding › Content Network (excursion c12-m09, Handbuch 8.6): packages from SAP and partners bring their own space
 * and objects. Importing creates the space (if missing), the objects, and deploys them if asked. Remote tables need a connection
 * in the new space; until it exists they have no data access, and views on them cannot be deployed.
 * Package names, CDS names and import options are invented for the game; the handbook marks the options as not verified.
 */

export type ContentArea = 'samples' | 'business' | 'partner';
export const CONTENT_AREAS: { id: ContentArea; label: string; text: string }[] = [
  { id: 'samples', label: 'Samples', text: 'Get started from a collection of templates, pre-made stories, and boardroom presentations.' },
  { id: 'business', label: 'Business Content', text: 'Pre-built industry and Line of Business content.' },
  { id: 'partner', label: '3rd Party Business Content', text: 'Partner developed content for Industry and Line of Business.' },
];

interface PkgObject {
  name: string;
  kind: 'Remote Table' | 'SQL View' | 'Local Table';
  businessName: string;
  semanticUsage: SemanticUsage;
  /** Remote tables: the source object in the SAP system. */
  source?: string;
  sql?: string;
  table?: TableDef;
}

export interface ContentPackage {
  id: string;
  area: ContentArea;
  title: string;
  provider: string;
  version: string;
  description: string;
  prerequisites: string[];
  space: { id: string; name: string; diskGB: number; memoryGB: number };
  /** Connection the remote tables of the package expect in its space. */
  connection?: { name: string; type: string };
  objects: PkgObject[];
}

const S = (cols: [string, 'String' | 'Integer' | 'Decimal' | 'Date', boolean?][], rows: string[][]): TableDef => ({
  columns: cols.map(([name, type, key]) => ({ name, type, key: !!key })),
  rows,
});

export const PACKAGES: ContentPackage[] = [
  {
    id: 'SAP_UTIL_BILLING', area: 'business', title: 'Utilities – Billing Analysis', provider: 'SAP', version: '2.4.0',
    description: 'Billing documents, contract accounts and installations of SAP S/4HANA Utilities, modeled as remote tables on CDS views, harmonized views and a billing fact. A starting point for revenue and consumption reporting of energy suppliers.',
    prerequisites: [
      'A space administrator imports the package; it creates its own space SAP_UTIL.',
      'Connection SAP_S4H (type SAP S/4HANA On-Premise, feature Remote Tables) in space SAP_UTIL, created after the import.',
      '4 GB disk and 2 GB in-memory free in the tenant.',
    ],
    space: { id: 'SAP_UTIL', name: 'SAP Utilities Billing (Content)', diskGB: 4, memoryGB: 2 },
    connection: { name: 'SAP_S4H', type: 'SAP S/4HANA On-Premise' },
    objects: [
      { name: 'SAP_UTIL_RT_BILLDOC', kind: 'Remote Table', businessName: 'Billing Document (CDS)', semanticUsage: 'Relational Dataset', source: 'I_UtilsBillingDocument' },
      { name: 'SAP_UTIL_RT_CONTRACT_ACCT', kind: 'Remote Table', businessName: 'Contract Account (CDS)', semanticUsage: 'Relational Dataset', source: 'I_UtilsContractAccount' },
      { name: 'SAP_UTIL_RT_INSTALLATION', kind: 'Remote Table', businessName: 'Installation (CDS)', semanticUsage: 'Relational Dataset', source: 'I_UtilsInstallation' },
      { name: 'SAP_UTIL_V_CONTRACT_ACCT', kind: 'SQL View', businessName: 'Contract Account', semanticUsage: 'Dimension',
        sql: 'SELECT CONTRACT_ACCOUNT, BUSINESS_PARTNER, REGION FROM SAP_UTIL.SAP_UTIL_RT_CONTRACT_ACCT' },
      { name: 'SAP_UTIL_V_BILLING', kind: 'SQL View', businessName: 'Billing Analysis', semanticUsage: 'Fact',
        sql: 'SELECT b.BILLING_DOCUMENT, b.CONTRACT_ACCOUNT, i.INSTALLATION, b.BILLING_DATE, b.NET_AMOUNT, b.CONSUMPTION_KWH\nFROM SAP_UTIL.SAP_UTIL_RT_BILLDOC b\nJOIN SAP_UTIL.SAP_UTIL_RT_INSTALLATION i ON b.INSTALLATION = i.INSTALLATION' },
    ],
  },
  {
    id: 'SAP_SAMPLE_ENERGY', area: 'samples', title: 'Sample: Energy Consumption', provider: 'SAP', version: '1.1.0',
    description: 'A small, self-contained sample with its own data: monthly consumption per customer segment and a view on it. Good to try the import without touching any system.',
    prerequisites: ['Creates its own space SAP_SAMPLE; no connection needed.', '1 GB disk and 1 GB in-memory free in the tenant.'],
    space: { id: 'SAP_SAMPLE', name: 'SAP Sample Content', diskGB: 1, memoryGB: 1 },
    objects: [
      { name: 'SAP_SAMPLE_T_CONSUMPTION', kind: 'Local Table', businessName: 'Consumption (sample data)', semanticUsage: 'Relational Dataset',
        table: S([['MONTH', 'String', true], ['SEGMENT', 'String', true], ['KWH', 'Integer']],
          [['2026-01', 'Household', '412000'], ['2026-01', 'Business', '988000'], ['2026-02', 'Household', '398000'], ['2026-02', 'Business', '951000']]) },
      { name: 'SAP_SAMPLE_V_CONSUMPTION', kind: 'SQL View', businessName: 'Consumption by Segment', semanticUsage: 'Fact',
        sql: 'SELECT MONTH, SEGMENT, KWH FROM SAP_SAMPLE.SAP_SAMPLE_T_CONSUMPTION' },
    ],
  },
  {
    id: 'PARTNER_GRID_KPI', area: 'partner', title: 'Grid Operator KPIs', provider: 'Netzwerk Analytics GmbH (partner)', version: '0.9.2',
    description: 'Outage and grid quality indicators (SAIDI, SAIFI) for distribution system operators. Needs data from an asset management system the Stadtwerke Rheinau do not run.',
    prerequisites: ['Creates its own space PARTNER_GRID.', 'Connection AM_SYSTEM (Generic OData) to the asset management system.', 'A license key from the partner.'],
    space: { id: 'PARTNER_GRID', name: 'Grid KPIs (Partner)', diskGB: 2, memoryGB: 1 },
    objects: [],
  },
];

export interface ImportLog {
  pkg: string;
  at: string;
  options: { overwrite: boolean; deploy: boolean };
  lines: { level: 'ok' | 'warn' | 'error' | 'info'; text: string }[];
}

export const packageById = (id: string) => PACKAGES.find((p) => p.id === id);

/** Runs the import and returns its log (also stored in the tenant). */
export async function importPackage(t: TenantState, p: ContentPackage, options: ImportLog['options']): Promise<ImportLog> {
  const log: ImportLog = { pkg: p.id, at: new Date().toISOString(), options, lines: [] };
  const add = (level: ImportLog['lines'][number]['level'], text: string) => log.lines.push({ level, text });
  if (p.area === 'partner') {
    add('error', `Import stopped: ${p.title} needs a license key from ${p.provider}. Nothing was created.`);
    return keep(t, log);
  }
  if (!t.spaces.some((s) => s.id === p.space.id)) {
    const used = assigned(t);
    if (used.diskGB + p.space.diskGB > CAPACITY.diskGB || used.memoryGB + p.space.memoryGB > CAPACITY.memoryGB) {
      add('error', `Import stopped: the space ${p.space.id} needs ${p.space.diskGB} GB disk and ${p.space.memoryGB} GB in-memory, but the tenant has only ${Math.max(0, CAPACITY.diskGB - used.diskGB)} GB and ${Math.max(0, CAPACITY.memoryGB - used.memoryGB)} GB left. Free storage in Space Management first.`);
      return keep(t, log);
    }
    t.spaces.push({ id: p.space.id, name: p.space.name, diskGB: p.space.diskGB, memoryGB: p.space.memoryGB, priority: 3 });
    await exec(`CREATE SCHEMA IF NOT EXISTS "${p.space.id}"`);
    add('ok', `Space ${p.space.id} created (${p.space.diskGB} GB disk, ${p.space.memoryGB} GB in-memory). Add members in Space Management.`);
  } else add('info', `Space ${p.space.id} exists already.`);

  const now = new Date().toISOString();
  for (const po of p.objects) {
    const key = `${p.space.id}.${po.name}`;
    const existing = findObject(t, key);
    if (existing && !options.overwrite) {
      add('warn', `${po.name} exists already and was skipped (Overwrite is off). Your version stays.`);
      continue;
    }
    if (existing) t.objects = t.objects.filter((o) => o !== existing);
    const o: RepoObject = {
      space: p.space.id, name: po.name, kind: po.kind, businessName: po.businessName, semanticUsage: po.semanticUsage,
      sql: po.sql, table: po.table ? structuredClone(po.table) : undefined, status: 'not_deployed', changedAt: now,
      remote: po.kind === 'Remote Table' ? { connection: p.connection!.name, source: po.source!, access: 'Remote' } : undefined,
    };
    t.objects.push(o);
    if (po.kind === 'Remote Table') {
      // A remote table is a definition; without its connection there is nothing to read.
      o.deployed = { businessName: o.businessName };
      o.status = 'deployed';
      const conn = t.connections.find((c) => c.space === p.space.id && c.name === p.connection!.name);
      add(conn ? 'ok' : 'warn', conn ? `${po.name} imported (remote, ${po.source}).`
        : `${po.name} imported, but connection ${p.connection!.name} does not exist in ${p.space.id}: no data access until it is created and validated.`);
      continue;
    }
    if (!options.deploy) {
      add('info', `${po.name} imported, not deployed.`);
      continue;
    }
    const err = await deploy(o);
    if (err) add('error', /does not exist/i.test(err) ? `${po.name} imported but not deployed: it reads remote tables that have no data access yet.` : `${po.name} imported but not deployed. ${err}`);
    else add('ok', `${po.name} imported and deployed.`);
  }
  add('info', `Import of ${p.title} ${p.version} finished.`);
  return keep(t, log);
}

function keep(t: TenantState, log: ImportLog) {
  t.importLogs = [log, ...t.importLogs].slice(0, 20);
  return log;
}

export function sanitizeImportLogs(d: unknown): ImportLog[] {
  const out: ImportLog[] = [];
  for (const l of Array.isArray(d) ? d.slice(0, 20) : []) {
    if (!l || !packageById(l.pkg)) continue;
    out.push({
      pkg: l.pkg, at: typeof l.at === 'string' ? l.at.slice(0, 40) : '',
      options: { overwrite: !!l.options?.overwrite, deploy: !!l.options?.deploy },
      lines: (Array.isArray(l.lines) ? l.lines : []).slice(0, 40)
        .filter((x: { level?: string; text?: string }) => x && ['ok', 'warn', 'error', 'info'].includes(String(x.level)) && typeof x.text === 'string')
        .map((x: { level: ImportLog['lines'][number]['level']; text: string }) => ({ level: x.level, text: x.text.slice(0, 400) })),
    });
  }
  return out;
}
