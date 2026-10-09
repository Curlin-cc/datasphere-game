/**
 * Data integration (chapter 3): connections, the simulated source systems behind them, remote tables,
 * replication flows and their runs.
 *
 * Follows the SAP Datasphere handbook (chapters 5, 6 and 10, checked 2026-10-09):
 *  - A connection is created from a connection type and belongs to exactly one space.
 *  - Each type supports its own set of features: Remote Tables, Data Flows, Replication Flows, Model Import.
 *    Validate reports which ones are available. The feature matrix below is simplified (the handbook marks
 *    it as not verified); in a real tenant the validation message is the truth.
 *  - On-premise sources need the SAP Cloud Connector (location ID); TLS needs the server or CA certificate,
 *    uploaded under System > Configuration > Security.
 *  - Remote tables: data access Remote (federation) or Replicated (Snapshot). Real-time is not simulated.
 *  - Replication flows: load type Initial Only or Initial and Delta (only for delta-capable sources),
 *    Truncate empties the target first, projections can add columns.
 *  - A space that exceeds its disk storage is locked until it gets more storage and is unlocked.
 */

import { exec, runSql } from './db';
import type { TenantState } from './tenant';
import type { RepoObject } from './repo';

export type Feature = 'Remote Tables' | 'Data Flows' | 'Replication Flows' | 'Model Import';
export const FEATURES: Feature[] = ['Remote Tables', 'Data Flows', 'Replication Flows', 'Model Import'];

export interface ConnType {
  id: string;
  label: string;
  group: 'SAP' | 'Non-SAP';
  features: Feature[];
  /** Where the source runs: cloud, on-premise (needs Cloud Connector), or either. */
  deployment: 'cloud' | 'onprem' | 'both';
  hostLabel: string;
  auth: string[];
}

export const CONN_TYPES: ConnType[] = [
  { id: 'S4HANA_CLOUD', label: 'SAP S/4HANA Cloud', group: 'SAP', features: ['Remote Tables', 'Data Flows', 'Replication Flows', 'Model Import'], deployment: 'cloud', hostLabel: 'Host', auth: ['OAuth 2.0', 'X.509 Client Certificate', 'User Name and Password'] },
  { id: 'S4HANA_OP', label: 'SAP S/4HANA On-Premise', group: 'SAP', features: ['Remote Tables', 'Data Flows', 'Replication Flows', 'Model Import'], deployment: 'onprem', hostLabel: 'Application Server', auth: ['User Name and Password', 'OAuth 2.0'] },
  { id: 'ABAP', label: 'SAP ABAP', group: 'SAP', features: ['Remote Tables', 'Data Flows'], deployment: 'onprem', hostLabel: 'Application Server', auth: ['User Name and Password', 'OAuth 2.0'] },
  { id: 'HANA', label: 'SAP HANA', group: 'SAP', features: ['Remote Tables', 'Data Flows', 'Replication Flows'], deployment: 'both', hostLabel: 'Host', auth: ['User Name and Password', 'X.509 Client Certificate'] },
  { id: 'ODATA', label: 'Generic OData', group: 'Non-SAP', features: ['Remote Tables', 'Data Flows'], deployment: 'cloud', hostLabel: 'URL', auth: ['OAuth 2.0', 'User Name and Password'] },
  { id: 'JDBC', label: 'Generic JDBC', group: 'Non-SAP', features: ['Remote Tables'], deployment: 'onprem', hostLabel: 'Host', auth: ['User Name and Password'] },
  { id: 'S3', label: 'Amazon Simple Storage Service', group: 'Non-SAP', features: ['Data Flows', 'Replication Flows'], deployment: 'cloud', hostLabel: 'Bucket', auth: ['Access Key'] },
  { id: 'MSSQL', label: 'Microsoft SQL Server', group: 'Non-SAP', features: ['Remote Tables', 'Data Flows'], deployment: 'onprem', hostLabel: 'Host', auth: ['User Name and Password'] },
];

export const connType = (id: string) => CONN_TYPES.find((c) => c.id === id);

/** One object a source system offers. `table` is the RHN_IN table that holds its data in this game. */
export interface SourceObject {
  name: string;
  container: string;
  description: string;
  delta: boolean;
  table: string;
  /** Rows of `table` that belong to this source (SRC_SYS_ID), if the table mixes sources. */
  srcSysId?: string;
}

export interface SourceSystem {
  id: string;
  label: string;
  host: string;
  type: string;
  onprem: boolean;
  /** Cloud Connector location ID the source is reachable through. */
  location?: string;
  /** Certificate the source presents; must be uploaded before a TLS connection validates. */
  certificate?: string;
  objects: SourceObject[];
}

/** The systems of Stadtwerke Rheinau. Host names are fictional. */
export const SOURCE_SYSTEMS: SourceSystem[] = [
  {
    id: 'S4U', label: 'S/4HANA billing', host: 'billing.rheinau-s4.example', type: 'S4HANA_CLOUD', onprem: false,
    objects: [
      { name: 'BILLING_CONTRACTS', container: 'CDS Views', description: 'Supply contracts', delta: true, table: 'BILLING_CONTRACTS', srcSysId: 'S4U' },
      { name: 'BILLING_INVOICES', container: 'CDS Views', description: 'Invoices', delta: true, table: 'BILLING_INVOICES', srcSysId: 'S4U' },
      { name: 'TARIFFS', container: 'CDS Views', description: 'Tariffs with current prices', delta: false, table: 'TARIFFS' },
      { name: 'GRID_AREAS', container: 'CDS Views', description: 'Grid areas and regions', delta: false, table: 'GRID_AREAS' },
    ],
  },
  {
    id: 'MDM', label: 'Meter data management', host: 'mdm-db.rheinau.local', type: 'HANA', onprem: true,
    location: 'RHEINAU_DC', certificate: 'Rheinau Root CA',
    objects: [{ name: 'METER_READINGS', container: 'MDM', description: 'Meter readings', delta: true, table: 'METER_READINGS', srcSysId: 'MDM' }],
  },
  {
    id: 'CRM', label: 'CRM export bucket', host: 'rheinau-crm-export', type: 'S3', onprem: false,
    objects: [{ name: 'customers/CRM_CUSTOMERS.csv', container: 'customers', description: 'Nightly full export of all customers', delta: false, table: 'CRM_CUSTOMERS' }],
  },
];

/** Cloud Connectors and certificates IT has at hand (System > Configuration). */
export const CLOUD_CONNECTORS = [{ location: 'RHEINAU_DC', subaccount: 'rheinau-datasphere', status: 'Connected' }];
export const CERTIFICATE_FILES = [
  { name: 'Rheinau Root CA', file: 'rheinau-root-ca.crt', text: 'CA of Stadtwerke Rheinau, signs all servers in the data center' },
  { name: 'Rheinau Web Proxy', file: 'rheinau-proxy.crt', text: 'Certificate of the office web proxy' },
];

export interface Validation {
  ok: boolean;
  features: Feature[];
  message: string;
  at: string;
}

export interface Connection {
  space: string;
  /** Technical name. */
  name: string;
  businessName: string;
  type: string;
  host: string;
  onprem: boolean;
  locationId: string;
  tls: boolean;
  auth: string;
  validation?: Validation;
  changedAt: string;
}

export type DataAccess = 'Remote' | 'Replicated (Snapshot)';
export type Frequency = 'Daily' | 'Weekly' | 'Monthly';
export type LoadType = 'Initial Only' | 'Initial and Delta';

export interface RemoteInfo {
  connection: string;
  source: string;
  access: DataAccess;
  schedule?: Frequency;
  lastRefresh?: string;
  records?: number;
}

export interface FlowObject {
  source: string;
  target: string;
  loadType: LoadType;
  truncate: boolean;
  /** Projection: additional columns with a constant value. */
  extra: { name: string; value: string }[];
}

export interface FlowDef {
  connection: string;
  objects: FlowObject[];
  schedule?: Frequency;
}

export interface LoadFrom {
  connection: string;
  source: string;
  extra: { name: string; value: string }[];
}

export interface Run {
  id: string;
  /** SPACE.NAME of the flow or remote table. */
  object: string;
  kind: 'Replication Flow' | 'Remote Table' | 'View';
  start: string;
  status: 'Completed' | 'Running' | 'Failed';
  records: number;
  messages: string[];
}

/** Columns that flows added to tables; re-applied on every start. */
export interface AppliedColumn {
  space: string;
  table: string;
  column: string;
  value: string;
}

export const sourceByHost = (host: string) => SOURCE_SYSTEMS.find((s) => s.host.toLowerCase() === host.trim().toLowerCase());

export function sourceOf(c: Pick<Connection, 'host'>): SourceSystem | undefined {
  return sourceByHost(c.host);
}

export const findConnection = (t: TenantState, space: string, name: string) => t.connections.find((c) => c.space === space && c.name === name);

const now = () => new Date().toISOString();

/** What Validate in the Connections app reports. */
export function validateConnection(t: TenantState, c: Connection): Validation {
  const type = connType(c.type)!;
  const fail = (message: string): Validation => ({ ok: false, features: [], message, at: now() });
  const src = sourceOf(c);
  if (!c.host.trim()) return fail(`Enter the ${type.hostLabel.toLowerCase()}.`);
  if (!src) return fail(`${c.host} could not be reached. Check the ${type.hostLabel.toLowerCase()} for typos.`);
  if (src.type !== c.type) return fail(`${c.host} is not a ${type.label} system. Create the connection with the type that matches the source (${connType(src.type)!.label}).`);
  if (src.onprem && !c.onprem) return fail(`${c.host} runs in the company network and cannot be reached from the cloud directly. On-premise sources are reached through the SAP Cloud Connector: choose On-Premise and enter its location ID.`);
  if (src.onprem) {
    if (!c.locationId.trim()) return fail('Enter the location ID of the Cloud Connector that reaches this host.');
    if (!CLOUD_CONNECTORS.some((cc) => cc.location === c.locationId.trim())) {
      return fail(`No Cloud Connector with location ID ${c.locationId.trim()} is connected to this tenant. System › Configuration › Data Integration lists the connected ones.`);
    }
  }
  if (src.certificate) {
    if (!c.tls) return fail(`${c.host} refused the connection: it only accepts encrypted (TLS) connections.`);
    if (!t.certificates.includes(src.certificate)) {
      return fail(`No secure connection to ${c.host}: its server certificate is not trusted. An administrator uploads the server or CA certificate under System › Configuration › Security.`);
    }
  }
  return { ok: true, features: [...type.features], message: `Connection ${c.name} is valid.`, at: now() };
}

export const isValid = (c?: Connection) => !!c?.validation?.ok;
export const supports = (c: Connection | undefined, f: Feature) => !!c && isValid(c) && c.validation!.features.includes(f);

/** Objects that use a connection; it cannot be deleted while there are any. */
export function dependents(t: TenantState, c: Connection): RepoObject[] {
  return t.objects.filter((o) => o.space === c.space && (o.remote?.connection === c.name || o.flow?.connection === c.name));
}

// ---------------------------------------------------------------- remote tables

/** SQL that reads the data of a source object. */
export function sourceSql(o: SourceObject, extra: { name: string; value: string }[] = []) {
  const cols = extra.map((e) => `, '${e.value.replace(/'/g, "''")}' AS "${e.name}"`).join('');
  const where = o.srcSysId ? ` WHERE SRC_SYS_ID = '${o.srcSysId}'` : '';
  return `SELECT *${cols} FROM "RHN_IN"."${o.table}"${where}`;
}

export function sourceObject(t: TenantState, space: string, connection: string, name: string): SourceObject | undefined {
  const c = findConnection(t, space, connection);
  return c ? sourceOf(c)?.objects.find((o) => o.name === name) : undefined;
}

export async function createRemoteView(t: TenantState, o: RepoObject) {
  const src = o.remote && sourceObject(t, o.space, o.remote.connection, o.remote.source);
  if (!src) return;
  await exec(`CREATE OR REPLACE VIEW "${o.space}"."${o.name}" AS ${sourceSql(src)}`);
}

export async function countRows(space: string, name: string): Promise<number> {
  const r = await runSql(`SELECT COUNT(*) FROM "${space}"."${name}"`);
  return Number(r.rows[0][0]);
}

/** Remote queries sent while previewing remote tables with data access Remote. Lives for this visit only. */
export const remoteQueries: { at: string; space: string; connection: string; object: string; statement: string; records: number; ms: number }[] = [];

// ---------------------------------------------------------------- runs

export function addRun(t: TenantState, run: Omit<Run, 'id'>): Run {
  const r = { ...run, id: `R${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}` };
  t.runs.unshift(r);
  t.runs = t.runs.slice(0, 60);
  return r;
}

export const runsOf = (t: TenantState, key: string) => t.runs.filter((r) => r.object === key);
export const lastRun = (t: TenantState, key: string) => runsOf(t, key)[0];

const fmt = (n: number) => n.toLocaleString('en-US');

/** Locked spaces cannot be written to: no loads, no deployments. */
export function lockError(t: TenantState, space: string): string | null {
  const s = t.spaces.find((x) => x.id === space);
  if (!s?.locked) return null;
  return `Space ${space} is locked because it exceeds its assigned disk storage (${s.diskGB} GB assigned, ${s.usedDiskGB ?? s.diskGB} GB used). Assign more storage and unlock it in Space Management.`;
}

/**
 * Runs a deployed replication flow. Writes columns that projections add to the target tables
 * and creates new target tables. Returns the run.
 */
export async function runFlow(t: TenantState, flowObj: RepoObject): Promise<Run> {
  const def = flowObj.deployed?.flow;
  const key = `${flowObj.space}.${flowObj.name}`;
  const messages: string[] = [];
  const conn = def && findConnection(t, flowObj.space, def.connection);
  const fail = (msg: string) => addRun(t, { object: key, kind: 'Replication Flow', start: now(), status: 'Failed', records: 0, messages: [...messages, msg] });
  if (!def || !conn) return fail('The source connection of this flow no longer exists.');
  if (!isValid(conn)) return fail(`Connection ${conn.name} is not valid: ${conn.validation?.message ?? 'validate it in the Connections app.'}`);
  let total = 0;
  for (const fo of def.objects) {
    const src = sourceOf(conn)?.objects.find((s) => s.name === fo.source);
    if (!src) return fail(`Source object ${fo.source} was not found in ${conn.name}.`);
    const count = Number((await runSql(`SELECT COUNT(*) FROM (${sourceSql(src)})`)).rows[0][0]);
    messages.push(`${fo.source}: ${fmt(count)} records read from ${conn.name}.`);
    const locked = lockError(t, flowObj.space);
    if (locked) return fail(`Writing ${flowObj.space}.${fo.target} failed. ${locked}`);
    const target = t.objects.find((o) => o.space === flowObj.space && o.name === fo.target);
    if (!target) {
      const loadFrom = { connection: conn.name, source: src.name, extra: fo.extra.map((e) => ({ ...e })) };
      try {
        await fillTable(flowObj.space, fo.target, src, fo.extra);
      } catch (err) {
        return fail(`Creating the target table ${fo.target} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      t.objects.push({
        space: flowObj.space, name: fo.target, kind: 'Local Table', businessName: fo.target, semanticUsage: 'Relational Dataset',
        deployed: { businessName: fo.target }, status: 'deployed', changedAt: now(), loadFrom,
      });
      messages.push(`New local table ${fo.target} created.`);
    } else {
      for (const e of fo.extra) await applyColumn(t, { space: flowObj.space, table: fo.target, column: e.name, value: e.value });
      if (fo.truncate) messages.push(`${fo.target} truncated before the load.`);
    }
    if (fo.extra.length) messages.push(`Projection: ${fo.extra.map((e) => `${e.name} = '${e.value}'`).join(', ')} added to every record.`);
    messages.push(`${fo.target}: initial load completed, ${fmt(count)} records written.`);
    if (fo.loadType === 'Initial and Delta') messages.push(`${fo.target}: delta replication active, checks the source for changes every 60 minutes.`);
    total += count;
  }
  const delta = def.objects.some((o) => o.loadType === 'Initial and Delta');
  return addRun(t, { object: key, kind: 'Replication Flow', start: now(), status: delta ? 'Running' : 'Completed', records: total, messages });
}

async function fillTable(space: string, name: string, src: SourceObject, extra: { name: string; value: string }[]) {
  await exec(`CREATE OR REPLACE TABLE "${space}"."${name}" AS ${sourceSql(src, extra)}`);
}

async function applyColumn(t: TenantState, a: AppliedColumn) {
  const col = a.column.replace(/"/g, '');
  await exec(`ALTER TABLE "${a.space}"."${a.table}" ADD COLUMN IF NOT EXISTS "${col}" VARCHAR DEFAULT '${a.value.replace(/'/g, "''")}'`);
  if (!t.appliedColumns.some((x) => x.space === a.space && x.table === a.table && x.column === a.column)) t.appliedColumns.push(a);
}

/** After a reload: tables created by flows, columns added by flows, remote tables. Run before views are restored. */
export async function restoreIntegration(t: TenantState) {
  for (const o of t.objects) {
    if (o.kind !== 'Local Table' || !o.loadFrom) continue;
    const src = sourceObject(t, o.space, o.loadFrom.connection, o.loadFrom.source);
    if (src) await fillTable(o.space, o.name, src, o.loadFrom.extra).catch(() => undefined);
  }
  for (const a of t.appliedColumns) {
    try {
      await applyColumn(t, a);
    } catch {
      /* table gone */
    }
  }
  for (const o of t.objects) if (o.kind === 'Remote Table') await createRemoteView(t, o).catch(() => undefined);
}

// ---------------------------------------------------------------- save game

const str = (v: unknown, max = 120) => (typeof v === 'string' ? v.slice(0, max) : '');

export function sanitizeConnections(data: unknown, spaceIds: Set<string>): Connection[] {
  const out: Connection[] = [];
  for (const c of Array.isArray(data) ? data : []) {
    if (!c || !spaceIds.has(c.space) || !/^[A-Z_][A-Z0-9_]{0,49}$/.test(String(c.name)) || !connType(c.type)) continue;
    if (out.some((x) => x.space === c.space && x.name === c.name)) continue;
    out.push({
      space: c.space, name: c.name, businessName: str(c.businessName) || c.name, type: c.type, host: str(c.host, 200),
      onprem: !!c.onprem, locationId: str(c.locationId, 60), tls: !!c.tls, auth: str(c.auth, 60),
      validation: c.validation && typeof c.validation === 'object'
        ? { ok: !!c.validation.ok, features: (Array.isArray(c.validation.features) ? c.validation.features : []).filter((f: Feature) => FEATURES.includes(f)), message: str(c.validation.message, 400), at: str(c.validation.at, 40) }
        : undefined,
      changedAt: str(c.changedAt, 40) || now(),
    });
  }
  return out;
}

export function sanitizeRuns(data: unknown): Run[] {
  return (Array.isArray(data) ? data : [])
    .filter((r) => r && typeof r.object === 'string' && ['Completed', 'Running', 'Failed'].includes(r.status))
    .slice(0, 60)
    .map((r) => ({
      id: str(r.id, 40) || `R${Math.random().toString(36).slice(2)}`,
      object: r.object, kind: r.kind === 'Remote Table' || r.kind === 'View' ? r.kind : 'Replication Flow',
      start: str(r.start, 40), status: r.status, records: Math.max(0, Number(r.records) || 0),
      messages: (Array.isArray(r.messages) ? r.messages : []).map((m: unknown) => str(m, 400)).slice(0, 30),
    }));
}

export function sanitizeApplied(data: unknown, spaceIds: Set<string>): AppliedColumn[] {
  return (Array.isArray(data) ? data : [])
    .filter((a) => a && spaceIds.has(a.space) && /^[A-Z_][A-Z0-9_]*$/.test(String(a.table)) && /^[A-Z_][A-Z0-9_]*$/.test(String(a.column)))
    .map((a) => ({ space: a.space, table: a.table, column: a.column, value: str(a.value, 60) }));
}

const LOAD_TYPES: LoadType[] = ['Initial Only', 'Initial and Delta'];
const FREQ: Frequency[] = ['Daily', 'Weekly', 'Monthly'];

export function sanitizeFlow(f: unknown): FlowDef | undefined {
  if (!f || typeof f !== 'object') return undefined;
  const d = f as Partial<FlowDef>;
  return {
    connection: str(d.connection, 50),
    schedule: FREQ.includes(d.schedule as Frequency) ? d.schedule : undefined,
    objects: (Array.isArray(d.objects) ? d.objects : []).slice(0, 20).map((o) => ({
      source: str(o?.source, 120),
      target: str(o?.target, 50),
      loadType: LOAD_TYPES.includes(o?.loadType) ? o.loadType : 'Initial Only',
      truncate: !!o?.truncate,
      extra: (Array.isArray(o?.extra) ? o.extra : []).filter((e) => e && /^[A-Z_][A-Z0-9_]*$/.test(String(e.name))).slice(0, 5)
        .map((e) => ({ name: String(e.name), value: str(e.value, 60) })),
    })),
  };
}

export function sanitizeRemote(r: unknown): RemoteInfo | undefined {
  if (!r || typeof r !== 'object') return undefined;
  const d = r as Partial<RemoteInfo>;
  return {
    connection: str(d.connection, 50),
    source: str(d.source, 120),
    access: d.access === 'Replicated (Snapshot)' ? 'Replicated (Snapshot)' : 'Remote',
    schedule: FREQ.includes(d.schedule as Frequency) ? d.schedule : undefined,
    lastRefresh: d.lastRefresh ? str(d.lastRefresh, 40) : undefined,
    records: typeof d.records === 'number' ? d.records : undefined,
  };
}

/**
 * Lena's safety net: Truncate on a target that also holds rows another source delivered (SRC_SYS_ID) would
 * delete those rows for good. Returns her message, or null if the run is safe.
 */
export async function truncateRisk(t: TenantState, flowObj: RepoObject): Promise<string | null> {
  const def = flowObj.deployed?.flow;
  const conn = def && findConnection(t, flowObj.space, def.connection);
  if (!def || !conn) return null;
  for (const fo of def.objects) {
    const src = sourceOf(conn)?.objects.find((s) => s.name === fo.source);
    const target = t.objects.find((o) => o.space === flowObj.space && o.name === fo.target);
    if (!fo.truncate || !src?.srcSysId || !target) continue;
    try {
      const r = await runSql(`SELECT SRC_SYS_ID, COUNT(*) FROM "${flowObj.space}"."${fo.target}" WHERE SRC_SYS_ID <> '${src.srcSysId}' GROUP BY 1 ORDER BY 1`);
      if (r.rows.length) {
        const other = r.rows.map(([s, n]) => `${fmt(Number(n))} rows from ${s}`).join(' and ');
        return `Lena stopped the run: Truncate empties ${fo.target} completely before the load, including ${other}. `
          + `${conn.name} does not deliver those rows, so they would be gone for good. Switch Truncate off for ${fo.target}, deploy, and run again.`;
      }
    } catch {
      /* target without SRC_SYS_ID: nothing to protect */
    }
  }
  return null;
}
