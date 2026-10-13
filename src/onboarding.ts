import type { TenantState } from './tenant';
import { assigned, CAPACITY } from './tenant';
import { deploy, findObject, type ColumnRole, type RepoObject, type SemanticUsage } from './repo';
import { exec } from './db';
import type { TableDef } from './localtable';
import { cdsEntity, createRemoteView, emptyTable, sourceObject, supports, type CdsEntity, type Connection } from './integration';

/**
 * Semantic Onboarding › Content Network (excursion c12-m09, Handbuch 8.6): packages from SAP and partners bring their own space
 * and objects. Importing creates the space (if missing), the objects, and deploys them if asked. Remote tables need a connection
 * in the new space; until it exists they have no data access, and views on them cannot be deployed.
 * Package names and CDS names are invented for the game. Import options follow SAP help (Import Schedule, Overwrite Preferences,
 * Deployment Preference › Deploy after import); Import Schedule is fixed to None.
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
    description: 'Billing documents, contract accounts and installations of SAP S/4HANA Utilities, modeled as remote tables on CDS views, base views and a billing fact. A starting point for revenue and consumption reporting of energy suppliers.',
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
  /** Content package ID, or ENTITY_IMPORT for Import Entities from an SAP system. */
  pkg: string;
  at: string;
  options: { overwrite: boolean; deploy: boolean };
  lines: { level: 'ok' | 'warn' | 'error' | 'info'; text: string }[];
  /** Import Entities: target space, connection, data access and the selected entities. */
  entities?: { space: string; connection: string; access: EntityAccess; selected: string[] };
}

/** Marks an Import Entities log (Semantic Onboarding › Open Import Logs). */
export const ENTITY_IMPORT = 'IMPORT_ENTITIES';

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
    if (!l || (!packageById(l.pkg) && l.pkg !== ENTITY_IMPORT)) continue;
    const e = l.entities;
    const entities = l.pkg === ENTITY_IMPORT && e && typeof e.space === 'string' && typeof e.connection === 'string'
      ? { space: e.space.slice(0, 20), connection: e.connection.slice(0, 50), access: (ACCESS_OPTIONS.includes(e.access) ? e.access : 'Remote Tables') as EntityAccess,
        selected: (Array.isArray(e.selected) ? e.selected : []).filter((x: unknown) => typeof x === 'string' && !!cdsEntity(x)).slice(0, 10) }
      : undefined;
    if (l.pkg === ENTITY_IMPORT && !entities) continue;
    out.push({
      entities,
      pkg: l.pkg, at: typeof l.at === 'string' ? l.at.slice(0, 40) : '',
      options: { overwrite: !!l.options?.overwrite, deploy: !!l.options?.deploy },
      lines: (Array.isArray(l.lines) ? l.lines : []).slice(0, 40)
        .filter((x: { level?: string; text?: string }) => x && ['ok', 'warn', 'error', 'info'].includes(String(x.level)) && typeof x.text === 'string')
        .map((x: { level: ImportLog['lines'][number]['level']; text: string }) => ({ level: x.level, text: x.text.slice(0, 400) })),
    });
  }
  return out;
}

// ---------------------------------------------------------------- Import Entities (SAP systems, c03-m07)

/**
 * Import Entities from an SAP S/4HANA connection (SAP help "Importing Entities with Semantics from SAP S/4HANA"):
 * the wizard picks a connection (its space is the target space) and the data access, the player selects CDS views, the
 * review lists what will be created, and "Import and Deploy" creates it with semantics:
 *  - ANALYTICAL_DIMENSION: a table (Relational Dataset) and a view with semantic usage Dimension; associated text entities
 *    come along as tables with semantic usage Text, and the view gets the association to them
 *  - LANGUAGE_DEPENDENT_TEXT: a table with semantic usage Text
 *  - not released (custom CDS views): only a local table without data and without associations; data needs a data flow
 * Data access "Replication Flow to Local Tables" (default) creates local tables and one replication flow that fills them on its first run;
 * "Remote Tables" creates remote tables that read the source live. Business Builder objects are listed in the review but not created
 * (simplified: the Business Builder is deprecated, excursion c12-m04). Object names are simplified: tables keep the CDS ID, the
 * dimension view gets the suffix _DIM (not verified against a real tenant).
 */

export type EntityAccess = 'Replication Flow to Local Tables' | 'Remote Tables';
export const ACCESS_OPTIONS: EntityAccess[] = ['Replication Flow to Local Tables', 'Remote Tables'];

export interface PlannedObject {
  name: string;
  businessName: string;
  kind: 'Remote Table' | 'Local Table' | 'SQL View' | 'Replication Flow';
  semanticUsage: SemanticUsage;
  /** The CDS view it comes from. */
  cds: string;
  /** Supporting entity (followed through an association), not selected by the player. */
  supporting: boolean;
  status: 'Ready for Import' | 'Already Imported';
}

/** Business Builder objects a real import would create (shown in the review only). */
export interface PlannedBusinessObject {
  businessName: string;
  type: 'Business Entity (Dimension)';
  cds: string;
}

export const dimViewName = (id: string) => `${id}_DIM`;
export const flowName = (selected: string[]) => `RF_${selected[0] ?? 'IMPORT'}`.slice(0, 50);

/** The selected entities plus the text entities their associations lead to (only released views follow associations). */
export function withSupporting(selected: string[]): { e: CdsEntity; supporting: boolean }[] {
  const out: { e: CdsEntity; supporting: boolean }[] = [];
  const add = (id: string, supporting: boolean) => {
    const e = cdsEntity(id);
    if (!e || out.some((x) => x.e.id === id)) return;
    out.push({ e, supporting });
    if (e.release === 'C1') for (const tx of e.texts ?? []) add(tx, true);
  };
  for (const id of selected) add(id, false);
  return out;
}

/** What the import will create in the target space (Review Entities). */
export function planImport(t: TenantState, space: string, access: EntityAccess, selected: string[]) {
  const data: PlannedObject[] = [];
  const business: PlannedBusinessObject[] = [];
  const status = (name: string): PlannedObject['status'] => (findObject(t, `${space}.${name}`)?.importedFrom ? 'Already Imported' : 'Ready for Import');
  const entities = withSupporting(selected);
  let needsFlow = false;
  for (const { e, supporting } of entities) {
    const released = e.release === 'C1';
    const kind: PlannedObject['kind'] = released && access === 'Remote Tables' ? 'Remote Table' : 'Local Table';
    if (kind === 'Local Table' && released) needsFlow = true;
    const usage: SemanticUsage = e.pattern === 'LANGUAGE_DEPENDENT_TEXT' ? 'Text' : 'Relational Dataset';
    data.push({ name: e.id, businessName: e.label, kind, semanticUsage: usage, cds: e.id, supporting, status: status(e.id) });
    if (e.pattern === 'ANALYTICAL_DIMENSION') {
      data.push({ name: dimViewName(e.id), businessName: e.label, kind: 'SQL View', semanticUsage: 'Dimension', cds: e.id, supporting, status: status(dimViewName(e.id)) });
      business.push({ businessName: e.label, type: 'Business Entity (Dimension)', cds: e.id });
    }
  }
  if (needsFlow) {
    const name = flowName(selected);
    data.push({ name, businessName: `Replication of ${selected.join(', ')}`, kind: 'Replication Flow', semanticUsage: 'Relational Dataset', cds: selected[0], supporting: false, status: status(name) });
  }
  return { data, business, entities };
}

const keyRoles = (e: CdsEntity): Record<string, ColumnRole> => Object.fromEntries(e.columns.map(([c, key]) => [c, key ? 'Key' : 'Attribute']));

/** Import and Deploy. Returns the log (also kept in the tenant, Open Import Logs). */
export async function importEntities(t: TenantState, conn: Connection, access: EntityAccess, selected: string[]): Promise<ImportLog> {
  const space = conn.space;
  const log: ImportLog = { pkg: ENTITY_IMPORT, at: new Date().toISOString(), options: { overwrite: true, deploy: true }, lines: [],
    entities: { space, connection: conn.name, access, selected: [...selected] } };
  const add = (level: ImportLog['lines'][number]['level'], text: string) => log.lines.push({ level, text });
  if (!supports(conn, 'Model Import')) {
    add('error', `Import stopped: connection ${conn.name} does not support Model Import. Validate it in the Connections app.`);
    return keep(t, log);
  }
  if (!selected.length) {
    add('error', 'Import stopped: no entity selected.');
    return keep(t, log);
  }
  const plan = planImport(t, space, access, selected);
  const now = new Date().toISOString();
  add('info', `Started: import of ${selected.join(', ')} from ${conn.name} into ${space}. Data access: ${access}.`);
  const replace = (o: RepoObject) => {
    t.objects = t.objects.filter((x) => !(x.space === o.space && x.name === o.name));
    t.objects.push(o);
  };
  /** A new import may turn a remote table (a view in the database) into a local table or back: drop whatever is there. */
  const clear = async (name: string) => {
    for (const kind of ['VIEW', 'TABLE']) await exec(`DROP ${kind} IF EXISTS "${space}"."${name}"`).catch(() => undefined);
  };
  const flowObjects: { source: string; target: string }[] = [];
  for (const { e, supporting } of plan.entities) {
    if (supporting) add('info', `${e.id} follows from an association (${e.pattern === 'LANGUAGE_DEPENDENT_TEXT' ? 'text entity' : 'supporting entity'}) and is imported too.`);
    const src = sourceObject(t, space, conn.name, e.id);
    if (!src) {
      add('error', `${e.id}: not found in ${conn.name}.`);
      continue;
    }
    const released = e.release === 'C1';
    const usage: SemanticUsage = e.pattern === 'LANGUAGE_DEPENDENT_TEXT' ? 'Text' : 'Relational Dataset';
    const roles = usage === 'Text' ? keyRoles(e) : undefined;
    const base = { space, name: e.id, businessName: e.label, semanticUsage: usage, columnRoles: roles, status: 'deployed' as const, changedAt: now, importedFrom: e.id };
    if (released && access === 'Remote Tables') {
      const o: RepoObject = { ...base, kind: 'Remote Table', remote: { connection: conn.name, source: e.id, access: 'Remote' },
        deployed: { businessName: e.label, semanticUsage: usage, columnRoles: roles } };
      replace(o);
      await clear(e.id);
      await createRemoteView(t, o);
      add('ok', `${e.id}: remote table created and deployed (data access Remote, reads ${conn.name} live).`);
    } else {
      const o: RepoObject = { ...base, kind: 'Local Table', loadFrom: { connection: conn.name, source: e.id, extra: [] }, loadPending: true,
        deployed: { businessName: e.label, semanticUsage: usage, columnRoles: roles } };
      replace(o);
      await clear(e.id);
      await emptyTable(space, e.id, src);
      if (released) {
        flowObjects.push({ source: e.id, target: e.id });
        add('ok', `${e.id}: local table created and deployed, still empty. The replication flow fills it.`);
      } else {
        add('warn', `${e.id}: not released for extraction (release contract ${e.release}). Only a local table was created, without data and without associations; load it with a data flow.`);
      }
    }
  }
  // Views after all tables, so that their associations find the text entities.
  for (const { e } of plan.entities) {
    const released = e.release === 'C1';
    if (e.pattern === 'ANALYTICAL_DIMENSION') {
      const view = dimViewName(e.id);
      const cols = e.columns.map(([c]) => c);
      const sql = `SELECT ${cols.join(', ')}\nFROM ${space}.${e.id}`;
      const texts = released ? (e.texts ?? []).filter((x) => plan.entities.some((p) => p.e.id === x)) : [];
      const keyCol = e.columns.find(([, k]) => k)![0];
      const associations = texts.map((x) => ({ target: `${space}.${x}`, mapping: [{ from: keyCol, to: keyCol }] }));
      const o: RepoObject = { space, name: view, kind: 'SQL View', businessName: e.label, semanticUsage: 'Dimension', columnRoles: keyRoles(e),
        associations, sql, status: 'not_deployed', changedAt: now, importedFrom: e.id };
      replace(o);
      const err = await deploy(o);
      if (err) add('error', `${view}: created, but not deployed. ${err}`);
      else add('ok', `${view}: view with semantic usage Dimension created and deployed${associations.length ? `, with a text association to ${texts.join(', ')}` : ''}.`);
    }
  }
  if (flowObjects.length) {
    const name = flowName(selected);
    const flow = { connection: conn.name, objects: flowObjects.map((f) => ({ ...f, loadType: 'Initial Only' as const, truncate: false, extra: [] })) };
    replace({ space, name, kind: 'Replication Flow', businessName: `Replication of ${selected.join(', ')}`, semanticUsage: 'Relational Dataset',
      flow, deployed: { businessName: `Replication of ${selected.join(', ')}`, flow: structuredClone(flow) }, status: 'deployed', changedAt: now, importedFrom: selected[0] });
    add('warn', `${name}: replication flow created and deployed, but not run. Open it and run it (or schedule it) to load the data.`);
  }
  add('info', `Business Builder: ${plan.business.length ? `${plan.business.length} business entit${plan.business.length > 1 ? 'ies' : 'y'} would be created in a real tenant. The game skips the deprecated Business Builder.` : 'nothing to create.'}`);
  add('info', `Import of ${selected.join(', ')} finished.`);
  return keep(t, log);
}
