import { exec } from './db';
import type { TenantState } from './tenant';
import { sanitizeFlow, sanitizeRemote, type FlowDef, type RemoteInfo, type LoadFrom, type Frequency } from './integration';
import { sanitizeModel, modelReads, type AnalyticModelDef } from './analytic';
import { sanitizeTable, tableStatements, type TableDef } from './localtable';
import { sanitizeDac, sanitizeAssignments, type DacDef, type DacAssignment } from './dac';
import { sanitizePersist, type PersistInfo } from './perf';
import { sanitizeChain, type ChainDef } from './taskchain';

/**
 * Repository objects: what the Data Builder and the Repository Explorer list.
 * Each object has a technical name (fixed once deployed) and a business name (for people, changeable),
 * and a deployment status like in SAP Datasphere:
 *  - Not Deployed: saved, but never deployed; nothing runs yet
 *  - Changes to Deploy: deployed once, newer saved changes are not active yet
 *  - Deployed: what is saved is what runs
 */

export type ObjectKind = 'Local Table' | 'Remote Table' | 'SQL View' | 'Replication Flow' | 'Analytic Model' | 'Data Access Control' | 'Task Chain';
export const OBJECT_KINDS: ObjectKind[] = ['Local Table', 'Remote Table', 'SQL View', 'Replication Flow', 'Analytic Model', 'Data Access Control', 'Task Chain'];
export type DeployStatus = 'deployed' | 'not_deployed' | 'changes';
export type SemanticUsage = 'Relational Dataset' | 'Fact' | 'Dimension' | 'Text' | 'Hierarchy';

/**
 * Role of an output column (Handbuch 6.4.1, 6.5.3): in a Fact a column is a Measure or an Attribute, in a Dimension
 * a Key or an Attribute. A Hierarchy (parent-child, simplified) names its Parent and Child columns.
 */
export type ColumnRole = 'Attribute' | 'Key' | 'Measure' | 'Parent' | 'Child';

/** Roles a column can take, per semantic usage. */
export const ROLES_FOR: Record<SemanticUsage, ColumnRole[]> = {
  'Relational Dataset': ['Attribute'],
  Fact: ['Attribute', 'Measure'],
  Dimension: ['Attribute', 'Key'],
  Text: ['Attribute', 'Key'],
  Hierarchy: ['Attribute', 'Parent', 'Child'],
};

/**
 * Association (Handbuch 6.5.4): a semantic relation to a target entity with a key mapping, used as a join only when
 * a consumer needs it. Cardinality is fixed to many-to-one in the game (simplified).
 */
export interface Association {
  /** SPACE.NAME of the target. */
  target: string;
  /** Source column → target column. */
  mapping: { from: string; to: string }[];
}

/** Semantic definition of an entity: usage, column roles, associations. Part of design time and of what is deployed. */
export interface Semantics {
  semanticUsage: SemanticUsage;
  /** Every output column with its role. */
  columnRoles?: Record<string, ColumnRole>;
  associations?: Association[];
  /** Data access controls assigned to a view (chapter 8). */
  dacs?: DacAssignment[];
  /** Expose for Consumption (excursions, Handbuch 12.3): external tools (ODBC, OData) may read the deployed view. */
  exposed?: boolean;
}

/**
 * One deployed version of a SQL view (excursions, Handbuch 11.4.9): every deployment adds one. Kept inside the tenant only;
 * the game keeps the last MAX_VERSIONS. Other object types have no version history in the game.
 */
export interface ObjectVersion {
  no: number;
  at: string;
  /** User ID of who deployed it. */
  by: string;
  businessName: string;
  sql: string;
  semantics: Semantics;
}
export const MAX_VERSIONS = 15;
export const ME = 'DATA_ARCHITECT';

export interface RepoObject {
  space: string;
  /** Technical name. */
  name: string;
  kind: ObjectKind;
  businessName: string;
  semanticUsage: SemanticUsage;
  /** Column roles and associations (chapter 6+), see Semantics. */
  columnRoles?: Record<string, ColumnRole>;
  associations?: Association[];
  dacs?: DacAssignment[];
  exposed?: boolean;
  /** SQL views only: the saved definition. */
  sql?: string;
  /** What is active in the runtime. Missing until the first deploy. */
  deployed?: { businessName: string; sql?: string; flow?: FlowDef; model?: AnalyticModelDef; table?: TableDef; dac?: DacDef; chain?: ChainDef } & Partial<Semantics>;
  /** Remote tables: connection, source object, data access. */
  remote?: RemoteInfo;
  /** Replication flows: the saved definition. */
  flow?: FlowDef;
  /** Analytic models (chapter 7): the saved definition. */
  model?: AnalyticModelDef;
  /** Local tables made by the player (chapter 8): columns and rows. */
  table?: TableDef;
  /** Data access controls (chapter 8): the saved definition. */
  dac?: DacDef;
  /** Task chains (chapter 10): the saved definition, and the schedule (Data Integration Monitor › Task Chains). */
  chain?: ChainDef;
  chainSchedule?: Frequency;
  /** Chapter 9: the deployed view is persisted (its result stored as a snapshot). */
  persisted?: PersistInfo;
  /** Chapter 9: schedule of the view persistence (Data Integration Monitor › Views). */
  persistSchedule?: Frequency;
  /** Local tables created by a flow: where the data comes from, reloaded after a reload. */
  loadFrom?: LoadFrom;
  status: DeployStatus;
  changedAt: string;
  /** Loaded by IT from a source system; cannot be deleted. */
  source?: boolean;
  /** SQL views: deployed versions, oldest first (Versions in the editor toolbar). */
  versions?: ObjectVersion[];
}

export const STATUS_LABEL: Record<DeployStatus, string> = {
  deployed: 'Deployed',
  not_deployed: 'Not Deployed',
  changes: 'Changes to Deploy',
};

export const STATUS_HELP: Record<DeployStatus, string> = {
  deployed: 'What you saved is active. Consumers and other views use exactly this version.',
  not_deployed: 'Saved as a design-time object only. Nothing runs yet; other views and consumers cannot use it.',
  changes: 'There are saved changes that are not active yet. The runtime still uses the last deployed version.',
};

export const SEMANTIC_USAGES: SemanticUsage[] = ['Relational Dataset', 'Fact', 'Dimension', 'Text', 'Hierarchy'];

export const objectKey = (o: { space: string; name: string }) => `${o.space}.${o.name}`;

export function findObject(t: TenantState, key: string): RepoObject | undefined {
  const [space, name] = key.split('.');
  return t.objects.find((o) => o.space === space && o.name === name);
}

/** Technical names: 1–50 characters, A–Z, 0–9 and underscore, unique within the space. */
export function objectNameError(name: string, space: string, t: TenantState): string | null {
  if (!name) return 'Enter a technical name.';
  if (name.length > 50) return 'A technical name has at most 50 characters.';
  if (!/^[A-Z_][A-Z0-9_]*$/.test(name)) return 'A technical name may only contain capital letters, digits and underscores, and must not start with a digit.';
  if (t.objects.some((o) => o.space === space && o.name === name)) return `${space} already has an object called ${name}.`;
  return null;
}

/** Suggests a technical name from a business name, like the real editors do. */
export const suggestTechnicalName = (business: string) =>
  business
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^(\d)/, '_$1')
    .slice(0, 50);

/** Status after a save, derived from what is deployed. */
export function statusAfterSave(o: RepoObject): DeployStatus {
  if (!o.deployed) return 'not_deployed';
  const same = o.deployed.businessName === o.businessName && (o.kind !== 'SQL View' || o.deployed.sql === o.sql)
    && (o.kind !== 'Replication Flow' || JSON.stringify(o.deployed.flow) === JSON.stringify(o.flow))
    && (o.kind !== 'Analytic Model' || JSON.stringify(o.deployed.model) === JSON.stringify(o.model))
    && JSON.stringify(o.deployed.table) === JSON.stringify(o.table)
    && JSON.stringify(o.deployed.dac) === JSON.stringify(o.dac)
    && JSON.stringify(o.deployed.chain) === JSON.stringify(o.chain)
    && JSON.stringify(semanticsOf(o.deployed)) === JSON.stringify(semanticsOf(o));
  return same ? 'deployed' : 'changes';
}

const now = () => new Date().toISOString();

export function touch(o: RepoObject) {
  o.changedAt = now();
  o.status = statusAfterSave(o);
}

/** The semantic part of an object or of its deployed version, normalized for comparing. */
export function semanticsOf(o: Partial<Semantics>): Semantics {
  return {
    semanticUsage: o.semanticUsage ?? 'Relational Dataset',
    columnRoles: o.columnRoles && Object.keys(o.columnRoles).length ? o.columnRoles : undefined,
    associations: o.associations?.length ? o.associations : undefined,
    dacs: o.dacs?.length ? o.dacs : undefined,
    exposed: o.exposed ? true : undefined,
  };
}

/** Runs the deployment. Returns an error text, or null on success. */
export async function deploy(o: RepoObject): Promise<string | null> {
  if (o.kind === 'SQL View') {
    try {
      // A new deployment replaces the persisted data (simplified): the view is read virtually until the next snapshot.
      if (o.persisted) {
        await exec(`DROP TABLE IF EXISTS "persistence"."${objectKey(o)}"`);
        o.persisted = undefined;
      }
      await exec(`CREATE OR REPLACE VIEW "${o.space}"."${o.name}" AS ${stripSemicolon(o.sql ?? '')}`);
    } catch (err) {
      return `Deployment failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
  if (o.kind === 'Local Table' && o.table) {
    try {
      for (const stmt of tableStatements(o.space, o.name, o.table)) await exec(stmt);
    } catch (err) {
      return `Deployment failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
  o.deployed = {
    businessName: o.businessName, sql: o.sql, flow: o.flow ? structuredClone(o.flow) : undefined,
    model: o.model ? structuredClone(o.model) : undefined, table: o.table ? structuredClone(o.table) : undefined,
    dac: o.dac ? structuredClone(o.dac) : undefined, chain: o.chain ? structuredClone(o.chain) : undefined, ...structuredClone(semanticsOf(o)),
  };
  o.status = 'deployed';
  o.changedAt = now();
  if (o.kind === 'SQL View') addVersion(o, ME, o.changedAt);
  return null;
}

/** Records the deployed state of a SQL view as its next version. */
export function addVersion(o: RepoObject, by: string, at: string) {
  if (!o.deployed?.sql) return;
  const list = (o.versions ??= []);
  list.push({ no: (list.at(-1)?.no ?? 0) + 1, at, by, businessName: o.deployed.businessName, sql: o.deployed.sql,
    semantics: structuredClone(semanticsOf(o.deployed)) });
  if (list.length > MAX_VERSIONS) list.splice(0, list.length - MAX_VERSIONS);
}

/**
 * Restore (Handbuch 11.4.9): the version becomes the design-time state of the view (status Changes to Deploy).
 * Whether a restored version must be deployed again is "nicht verifiziert"; the game asks for a deployment.
 */
export function restoreVersion(o: RepoObject, v: ObjectVersion) {
  o.sql = v.sql;
  o.businessName = v.businessName;
  Object.assign(o, structuredClone(v.semantics));
  touch(o);
}

export async function dropObject(o: RepoObject) {
  if (o.persisted) await exec(`DROP TABLE IF EXISTS "persistence"."${objectKey(o)}"`);
  if ((o.kind === 'SQL View' && o.deployed) || o.kind === 'Remote Table') await exec(`DROP VIEW IF EXISTS "${o.space}"."${o.name}"`);
  if (o.kind === 'Local Table' && (o.loadFrom || o.deployed?.table)) await exec(`DROP TABLE IF EXISTS "${o.space}"."${o.name}"`);
}

/**
 * Impact and lineage (simplified, Handbuch 6.11.2): which objects a view reads (lineage),
 * and which views read an object (impact). Looks at the saved SQL of views, SPACE.NAME references only.
 */
export function readsFrom(o: RepoObject, t: TenantState): string[] {
  if (o.kind === 'Analytic Model' && o.model) return modelReads(o.model).filter((k) => findObject(t, k));
  if (o.kind !== 'SQL View' || !o.sql) return [];
  const code = o.sql.replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/'(?:[^']|'')*'/g, "''");
  const keys = new Set<string>();
  for (const m of code.matchAll(/"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\.\s*"?([A-Za-z_][A-Za-z0-9_]*)"?/g)) {
    const key = `${m[1].toUpperCase()}.${m[2].toUpperCase()}`;
    if (findObject(t, key)) keys.add(key);
  }
  return [...keys];
}

export function usedBy(key: string, t: TenantState): string[] {
  return t.objects.filter((o) => objectKey(o) !== key && readsFrom(o, t).includes(key)).map(objectKey);
}

const stripSemicolon = (sql: string) => sql.trim().replace(/;\s*$/, '');

/** Recreates the player's deployed local tables after a reload (before the views that read them). */
export async function restoreTables(t: TenantState) {
  for (const o of t.objects) {
    if (o.kind !== 'Local Table' || !o.deployed?.table) continue;
    try {
      for (const stmt of tableStatements(o.space, o.name, o.deployed.table)) await exec(stmt);
    } catch {
      /* a broken table stays missing; the editor shows it */
    }
  }
}

/** Recreates deployed views after a reload. Views can depend on each other, so retry until nothing changes. */
export async function restoreViews(t: TenantState) {
  let pending = t.objects.filter((o) => o.kind === 'SQL View' && o.deployed?.sql);
  for (let round = 0; round < 5 && pending.length; round++) {
    const failed: RepoObject[] = [];
    for (const o of pending) {
      try {
        await exec(`CREATE OR REPLACE VIEW "${o.space}"."${o.name}" AS ${stripSemicolon(o.deployed!.sql!)}`);
      } catch {
        failed.push(o);
      }
    }
    if (failed.length === pending.length) break;
    pending = failed;
  }
}

/** Adds the tables IT loaded, if the save does not know them yet. */
export function seedSourceTables(t: TenantState, tables: { space: string; name: string; businessName: string }[]) {
  for (const tb of tables) {
    if (t.objects.some((o) => o.space === tb.space && o.name === tb.name)) continue;
    t.objects.push({
      space: tb.space,
      name: tb.name,
      kind: 'Local Table',
      businessName: tb.businessName,
      semanticUsage: 'Relational Dataset',
      deployed: { businessName: tb.businessName },
      status: 'deployed',
      changedAt: '2026-07-01T06:00:00.000Z',
      source: true,
    });
  }
}

export function sanitizeObjects(data: unknown, spaceIds: Set<string>): RepoObject[] {
  const out: RepoObject[] = [];
  for (const o of Array.isArray(data) ? data : []) {
    if (!o || typeof o !== 'object' || !spaceIds.has(o.space) || typeof o.name !== 'string' || !/^[A-Z_][A-Z0-9_]{0,49}$/.test(o.name)) continue;
    if (!OBJECT_KINDS.includes(o.kind)) continue;
    if (out.some((x) => x.space === o.space && x.name === o.name)) continue;
    out.push({
      space: o.space,
      name: o.name,
      kind: o.kind,
      businessName: String(o.businessName ?? o.name).slice(0, 120),
      ...sanitizeSemantics(o),
      sql: typeof o.sql === 'string' ? o.sql : undefined,
      deployed: o.deployed && typeof o.deployed === 'object'
        ? {
            businessName: String(o.deployed.businessName ?? o.businessName),
            sql: typeof o.deployed.sql === 'string' ? o.deployed.sql : undefined,
            flow: sanitizeFlow(o.deployed.flow),
            model: o.kind === 'Analytic Model' ? sanitizeModel(o.deployed.model) : undefined,
            table: o.kind === 'Local Table' ? sanitizeTable(o.deployed.table) : undefined,
            dac: o.kind === 'Data Access Control' ? sanitizeDac(o.deployed.dac) : undefined,
            chain: o.kind === 'Task Chain' ? sanitizeChain(o.deployed.chain) : undefined,
            ...sanitizeSemantics(o.deployed),
          }
        : undefined,
      remote: o.kind === 'Remote Table' ? sanitizeRemote(o.remote) : undefined,
      flow: o.kind === 'Replication Flow' ? sanitizeFlow(o.flow) : undefined,
      model: o.kind === 'Analytic Model' ? sanitizeModel(o.model) : undefined,
      table: o.kind === 'Local Table' ? sanitizeTable(o.table) : undefined,
      dac: o.kind === 'Data Access Control' ? sanitizeDac(o.dac) : undefined,
      chain: o.kind === 'Task Chain' ? sanitizeChain(o.chain) : undefined,
      chainSchedule: o.kind === 'Task Chain' && ['Daily', 'Weekly', 'Monthly'].includes(o.chainSchedule) ? o.chainSchedule : undefined,
      loadFrom: o.kind === 'Local Table' && o.loadFrom && typeof o.loadFrom.connection === 'string' && typeof o.loadFrom.source === 'string'
        ? { connection: o.loadFrom.connection.slice(0, 50), source: o.loadFrom.source.slice(0, 120), extra: sanitizeFlow({ objects: [{ extra: o.loadFrom.extra }] })!.objects[0].extra }
        : undefined,
      persisted: o.kind === 'SQL View' && o.deployed?.sql ? sanitizePersist(o.persisted) : undefined,
      persistSchedule: o.kind === 'SQL View' && ['Daily', 'Weekly', 'Monthly'].includes(o.persistSchedule) ? o.persistSchedule : undefined,
      status: ['deployed', 'not_deployed', 'changes'].includes(o.status) ? o.status : 'not_deployed',
      changedAt: typeof o.changedAt === 'string' ? o.changedAt : now(),
      source: !!o.source,
      versions: o.kind === 'SQL View' ? sanitizeVersions(o.versions) : undefined,
    });
  }
  return out;
}

function sanitizeVersions(d: unknown): ObjectVersion[] | undefined {
  if (!Array.isArray(d)) return undefined;
  const out: ObjectVersion[] = [];
  for (const v of d.slice(-MAX_VERSIONS)) {
    if (!v || typeof v.sql !== 'string' || !Number.isInteger(v.no) || v.no < 1) continue;
    out.push({ no: v.no, at: typeof v.at === 'string' ? v.at : now(), by: typeof v.by === 'string' && /^[A-Z_]{1,30}$/.test(v.by) ? v.by : ME,
      businessName: String(v.businessName ?? '').slice(0, 120), sql: v.sql, semantics: sanitizeSemantics(v.semantics ?? {}) });
  }
  return out.length ? out : undefined;
}

const ROLES: ColumnRole[] = ['Attribute', 'Key', 'Measure', 'Parent', 'Child'];
const COLUMN = /^[A-Za-z_][A-Za-z0-9_]{0,99}$/;

function sanitizeSemantics(d: Record<string, unknown>): Semantics {
  const usage = SEMANTIC_USAGES.includes(d.semanticUsage as SemanticUsage) ? (d.semanticUsage as SemanticUsage) : 'Relational Dataset';
  const roles: Record<string, ColumnRole> = {};
  if (d.columnRoles && typeof d.columnRoles === 'object') {
    for (const [c, r] of Object.entries(d.columnRoles as Record<string, unknown>).slice(0, 200)) {
      if (COLUMN.test(c) && ROLES.includes(r as ColumnRole)) roles[c] = r as ColumnRole;
    }
  }
  const assoc: Association[] = [];
  for (const a of Array.isArray(d.associations) ? d.associations.slice(0, 20) : []) {
    if (!a || typeof a.target !== 'string' || !/^[A-Z0-9_]{1,20}\.[A-Z_][A-Z0-9_]{0,49}$/.test(a.target)) continue;
    const mapping = (Array.isArray(a.mapping) ? a.mapping : [])
      .filter((m: { from?: unknown; to?: unknown }) => m && typeof m.from === 'string' && typeof m.to === 'string' && COLUMN.test(m.from) && COLUMN.test(m.to))
      .map((m: { from: string; to: string }) => ({ from: m.from, to: m.to }))
      .slice(0, 10);
    if (mapping.length) assoc.push({ target: a.target, mapping });
  }
  return semanticsOf({ semanticUsage: usage, columnRoles: roles, associations: assoc, dacs: sanitizeAssignments(d.dacs), exposed: d.exposed === true });
}
