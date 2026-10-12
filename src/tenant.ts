import { DEFAULT_TRACING, sanitizeTracing, sanitizeStatements, type Tracing, type Statement } from './perf';
/**
 * The simulated tenant: spaces with storage and priority, and objects shared between spaces.
 * Lives in the save game; DuckDB schemas are recreated from it on every start.
 *
 * Rules follow SAP Datasphere (checked 2026-10-08, learning.sap.com "Outlining Spaces"):
 *  - Space ID: max 20 characters, A–Z, 0–9 and underscore, cannot be changed after creation
 *  - Space name: max 30 characters, can be changed
 *  - Priority 1 (lowest) to 5 (highest); new spaces get 2 GB disk and 1 GB in-memory
 *  - Objects of a space cannot be used in another space unless they are shared with it
 */

import { sanitizePackages, sanitizeJobs, type Package, type TransportJob } from './transport';
import { sanitizeImportLogs, type ImportLog } from './onboarding';
import { sanitizeDbUsers, sanitizeOAuthClients, type DbUser, type OAuthClient } from './consumption';
import { defaultCatalog, sanitizeCatalog, type CatalogState } from './catalog';
import { emptyExtras, sanitizeExtras, type ExtrasState } from './extras';
import { sanitizeSecurity, type ScopedRole, type Assignment } from './security';
import { sanitizeObjects, type RepoObject } from './repo';
import {
  sanitizeConnections, sanitizeRuns, sanitizeApplied, CERTIFICATE_FILES, type Connection, type Run, type AppliedColumn,
} from './integration';

export interface Space {
  id: string;
  name: string;
  diskGB: number;
  memoryGB: number;
  priority: number;
  /** Prepared by IT; cannot be deleted. */
  system?: boolean;
  /** Locked because it exceeds its disk storage (chapter 3). No loads, no deployments until unlocked. */
  locked?: boolean;
  /** Simulated disk use in GB, only set when it matters (a locked space). */
  usedDiskGB?: number;
}

export interface Share {
  /** SPACE.OBJECT of the shared object. */
  object: string;
  /** Space the object is shared with. */
  to: string;
}

export interface TenantState {
  spaces: Space[];
  shares: Share[];
  /** Space the Data Builder works in. */
  activeSpace: string;
  /** Scoped roles and who has which role where (chapter 2). */
  roles: ScopedRole[];
  assignments: Assignment[];
  /** Repository: tables IT loaded and objects the player built. */
  objects: RepoObject[];
  /** Chapter 3: connections per space, uploaded certificates, consent for scheduled tasks, runs. */
  connections: Connection[];
  certificates: string[];
  consent: boolean;
  runs: Run[];
  appliedColumns: AppliedColumn[];
  /** Chapter 9: expensive statement tracing and its log. */
  tracing: Tracing;
  statements: Statement[];
  /** Mission set-ups already applied, e.g. c03-m06. */
  scenarios: string[];
  /** Excursions: database users (consumption), transport packages and export jobs, catalog metadata. */
  dbUsers: DbUser[];
  /** Excursions: OAuth clients for the OData Consumption API (System › Administration › App Integration). */
  oauthClients: OAuthClient[];
  /** Excursions: logs of Content Network imports (Semantic Onboarding › Open Import Logs). */
  importLogs: ImportLog[];
  packages: Package[];
  transportJobs: TransportJob[];
  catalog: CatalogState;
  /** System and Spaces, Capacities, Elastic Compute Nodes, Marketplace, Translation, Data Sharing Cockpit (src/extras.ts). */
  extras: ExtrasState;
}

export const CAPACITY = { diskGB: 128, memoryGB: 32 };
export const NEW_SPACE_DEFAULTS = { diskGB: 2, memoryGB: 1, priority: 3 };

export function defaultTenant(): TenantState {
  return {
    spaces: [{ id: 'RHN_IN', name: 'Rheinau Inbound', diskGB: 40, memoryGB: 8, priority: 3, system: true }],
    shares: [],
    activeSpace: 'RHN_IN',
    roles: [],
    assignments: [],
    objects: [],
    connections: [],
    certificates: [],
    consent: false,
    runs: [],
    appliedColumns: [],
    tracing: { ...DEFAULT_TRACING },
    statements: [],
    scenarios: [],
    dbUsers: [],
    oauthClients: [],
    importLogs: [],
    packages: [],
    transportJobs: [],
    catalog: defaultCatalog(),
    extras: emptyExtras(),
  };
}

/** Names the database or SAP reserve for themselves. */
const RESERVED = new Set([
  'SYS', 'SYSTEM', 'CREATE', 'PUBLIC', 'DBADMIN', 'MONITORING', 'PAL_STEM_TFIDF', 'SAP_PA_APL',
  'DWC_USER_OWNER', 'DWC_TENANT_OWNER', 'DWC_AUDIT_READER', 'DWC_GLOBAL', 'DWC_GLOBAL_LOG',
  'MAIN', 'INFORMATION_SCHEMA', 'PG_CATALOG', 'TEMP',
]);

/** Returns an error text, or null if the ID can be used. */
export function spaceIdError(id: string, tenant: TenantState): string | null {
  if (!id) return 'Enter a space ID.';
  if (id.length > 20) return `A space ID has at most 20 characters, this one has ${id.length}.`;
  if (!/^[A-Z0-9_]+$/.test(id)) return 'A space ID may only contain capital letters A–Z, digits and underscores.';
  if (RESERVED.has(id)) return `${id} is reserved by the system and cannot be used.`;
  if (/^(SAP_|DWC_|_SYS)/.test(id)) return 'Prefixes SAP_, DWC_ and _SYS are reserved for SAP. Use your own prefix.';
  if (tenant.spaces.some((s) => s.id === id)) return `A space ${id} already exists.`;
  return null;
}

export function assigned(tenant: TenantState, except?: string) {
  const others = tenant.spaces.filter((s) => s.id !== except);
  return {
    diskGB: round1(others.reduce((n, s) => n + s.diskGB, 0)),
    memoryGB: round1(others.reduce((n, s) => n + s.memoryGB, 0)),
  };
}

/** Validates storage and priority for one space; returns an error text or null. */
export function storageError(space: Pick<Space, 'id' | 'diskGB' | 'memoryGB' | 'priority'>, tenant: TenantState): string | null {
  const { diskGB, memoryGB, priority } = space;
  if (!(diskGB >= 0.1)) return 'Disk storage must be at least 0.1 GB.';
  if (!(memoryGB >= 0.1)) return 'In-memory storage must be at least 0.1 GB.';
  if (memoryGB > diskGB) return 'In-memory storage cannot be larger than disk storage.';
  if (!Number.isInteger(priority) || priority < 1 || priority > 5) return 'Priority goes from 1 (lowest) to 5 (highest).';
  const used = assigned(tenant, space.id);
  if (used.diskGB + diskGB > CAPACITY.diskGB) return `Only ${round1(CAPACITY.diskGB - used.diskGB)} GB disk are still free in the tenant.`;
  if (used.memoryGB + memoryGB > CAPACITY.memoryGB) return `Only ${round1(CAPACITY.memoryGB - used.memoryGB)} GB in-memory are still free in the tenant.`;
  return null;
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

export function sharedWith(tenant: TenantState, space: string): string[] {
  return tenant.shares.filter((s) => s.to === space).map((s) => s.object);
}

export function isShared(tenant: TenantState, object: string, to: string): boolean {
  return tenant.shares.some((s) => s.to === to && s.object.toUpperCase() === object.toUpperCase());
}

/**
 * Sharing guard: a query running in `space` may only read objects of its own space and objects
 * shared with it. Returns an error text for the first object it may not use, or null.
 */
export function accessError(sql: string, space: string, tenant: TenantState): string | null {
  const spaceIds = new Set(tenant.spaces.map((s) => s.id));
  const code = sql
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:[^']|'')*'/g, "''");
  // New objects are always created in the space you work in, as in the real Data Builder.
  const ddl = /\b(?:create|drop|alter)\s+(?:or\s+replace\s+)?(?:temp\s+|temporary\s+)?(?:table|view)\s+(?:if\s+(?:not\s+)?exists\s+)?"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\./gi;
  for (const m of code.matchAll(ddl)) {
    const owner = m[1].toUpperCase();
    if (spaceIds.has(owner) && owner !== space) {
      return `You work in space ${space}, so you can only create or change objects in ${space}. Switch the Data Builder to ${owner} first.`;
    }
  }
  const ref = /"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\.\s*"?([A-Za-z_][A-Za-z0-9_]*)"?/g;
  for (const m of code.matchAll(ref)) {
    const owner = m[1].toUpperCase();
    if (!spaceIds.has(owner) || owner === space) continue;
    const object = `${owner}.${m[2].toUpperCase()}`;
    if (!isShared(tenant, object, space)) {
      return `${object} belongs to space ${owner} and is not shared with ${space}. Share it from ${owner}, or switch the Data Builder to ${owner}.`;
    }
  }
  return null;
}

/** Restores a tenant from a save; falls back to the default for anything malformed. */
export function sanitizeTenant(data: unknown): TenantState {
  const t = defaultTenant();
  if (!data || typeof data !== 'object') return t;
  const d = data as Partial<TenantState>;
  for (const s of Array.isArray(d.spaces) ? d.spaces : []) {
    if (!s || typeof s.id !== 'string' || s.id === 'RHN_IN' || !/^[A-Z0-9_]{1,20}$/.test(s.id)) {
      if (s && s.id === 'RHN_IN') Object.assign(t.spaces[0], pickStorage(s));
      continue;
    }
    if (t.spaces.some((x) => x.id === s.id)) continue;
    t.spaces.push({ id: s.id, name: String(s.name ?? s.id).slice(0, 30), ...pickStorage(s) });
  }
  const ids = new Set(t.spaces.map((s) => s.id));
  t.shares = (Array.isArray(d.shares) ? d.shares : []).filter(
    (s) => s && typeof s.object === 'string' && typeof s.to === 'string' && ids.has(s.to) && ids.has(s.object.split('.')[0]),
  );
  if (typeof d.activeSpace === 'string' && ids.has(d.activeSpace)) t.activeSpace = d.activeSpace;
  Object.assign(t, sanitizeSecurity(d, ids));
  t.objects = sanitizeObjects(d.objects, ids);
  t.connections = sanitizeConnections(d.connections, ids);
  t.certificates = (Array.isArray(d.certificates) ? d.certificates : []).filter((c) => CERTIFICATE_FILES.some((f) => f.name === c));
  t.consent = !!d.consent;
  t.runs = sanitizeRuns(d.runs);
  t.appliedColumns = sanitizeApplied(d.appliedColumns, ids);
  t.tracing = sanitizeTracing(d.tracing);
  t.statements = sanitizeStatements(d.statements);
  t.scenarios = (Array.isArray(d.scenarios) ? d.scenarios : []).map(String).slice(0, 50);
  t.dbUsers = sanitizeDbUsers(d.dbUsers, ids);
  t.oauthClients = sanitizeOAuthClients(d.oauthClients);
  t.importLogs = sanitizeImportLogs(d.importLogs);
  t.packages = sanitizePackages(d.packages, ids);
  t.transportJobs = sanitizeJobs(d.transportJobs);
  t.catalog = sanitizeCatalog(d.catalog);
  t.extras = sanitizeExtras(d.extras, ids);
  return t;
}

function pickStorage(s: Partial<Space>) {
  return {
    ...(s.locked ? { locked: true } : {}),
    ...(typeof s.usedDiskGB === 'number' && s.usedDiskGB > 0 ? { usedDiskGB: round1(s.usedDiskGB) } : {}),
    diskGB: Math.max(0.1, Number(s.diskGB) || NEW_SPACE_DEFAULTS.diskGB),
    memoryGB: Math.max(0.1, Number(s.memoryGB) || NEW_SPACE_DEFAULTS.memoryGB),
    priority: Math.min(5, Math.max(1, Math.round(Number(s.priority) || NEW_SPACE_DEFAULTS.priority))),
  };
}
