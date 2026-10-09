import type { TenantState } from './tenant';
import { findObject, objectKey, readsFrom, type RepoObject } from './repo';

/**
 * Transport (excursion, Handbuch 11): packages bundle objects for the move to another tenant
 * (development → test → production). A space administrator creates a package, adds objects and required packages,
 * validates it and exports it to the Content Network for chosen target tenants. The target tenant imports it.
 *
 * Simplified in the game (docs/DECISIONS.md, Handbuch 11.4.1/11.4.2 "nicht verifiziert"):
 *  - a package holds objects of one space; objects of other spaces come from required packages
 *  - validation = every dependency is in the package or in a required package (transitively inside the package's space)
 *  - export is simulated and always succeeds when the package is valid; a failed validation is logged as a failed job
 *  - the training tenant is the source; importing happens in the target tenants and is not played
 *  - connections, users, roles and space settings are not part of a package; schedules travel with their objects
 */

export interface TargetTenant {
  id: string;
  name: string;
}

/** The landscape of Stadtwerke Rheinau: this training tenant is the development tenant. */
export const TARGET_TENANTS: TargetTenant[] = [
  { id: 'RHN-TEST', name: 'Stadtwerke Rheinau · Test' },
  { id: 'RHN-PROD', name: 'Stadtwerke Rheinau · Production' },
];

export interface Package {
  /** Technical name, unique in the tenant. */
  name: string;
  businessName: string;
  space: string;
  description: string;
  /** Version shown in the Content Network, e.g. 1.0.0. Raised on every export. */
  version: string;
  /** SPACE.NAME of the objects in the package (all of `space`). */
  objects: string[];
  /** Technical names of required packages. */
  required: string[];
  /** Target tenant IDs allowed to import the package. */
  targets: string[];
  /** Who created it, for the lists. */
  createdBy: string;
  changedAt: string;
  /** Last successful export: version and time, and the content that was exported (to show "Changes to Export"). */
  exported?: { version: string; at: string; fingerprint: string };
}

export interface TransportJob {
  id: number;
  package: string;
  version: string;
  by: string;
  status: 'Success' | 'Failed';
  at: string;
  messages: string[];
}

export type PackageStatus = 'Not Exported' | 'Exported' | 'Changes to Export';

const fingerprint = (p: Package) => JSON.stringify([p.objects.slice().sort(), p.required.slice().sort(), p.targets.slice().sort()]);

export function packageStatus(p: Package): PackageStatus {
  if (!p.exported) return 'Not Exported';
  return p.exported.fingerprint === fingerprint(p) ? 'Exported' : 'Changes to Export';
}

/** The package an object belongs to, if any (shown as the field "Package" in the editors). */
export const packageOf = (t: TenantState, key: string) => t.packages.find((p) => p.objects.includes(key));

/** What an object needs to work in another tenant: what it reads, its association targets, data access controls, chain steps. */
export function dependencies(o: RepoObject, t: TenantState): string[] {
  const deps = new Set<string>();
  for (const k of readsFrom(o, t)) deps.add(k);
  for (const a of o.associations ?? []) deps.add(a.target);
  for (const d of o.dacs ?? []) deps.add(d.dac);
  if (o.dac?.entity) deps.add(o.dac.entity);
  if (o.dac?.hierarchy) deps.add(o.dac.hierarchy);
  for (const s of o.chain?.steps ?? []) deps.add(s.object);
  deps.delete(objectKey(o));
  return [...deps].filter((k) => findObject(t, k));
}

export interface Validation {
  ok: boolean;
  /** Dependencies of the package's space that are missing in the package: object → needed by. */
  missing: { object: string; neededBy: string }[];
  /** Dependencies in other spaces that no required package contains. */
  outside: { object: string; neededBy: string }[];
  /** Required packages that are not exported yet. */
  notExported: string[];
  /** Objects that are not deployed (only deployed objects can be transported). */
  notDeployed: string[];
  /** Notes that do not block the export, e.g. connections that must exist in the target. */
  notes: string[];
}

export function validatePackage(p: Package, t: TenantState): Validation {
  const v: Validation = { ok: true, missing: [], outside: [], notExported: [], notDeployed: [], notes: [] };
  const required = p.required.map((n) => t.packages.find((x) => x.name === n)).filter((x): x is Package => !!x);
  const inRequired = (k: string) => required.some((r) => r.objects.includes(k));
  const seen = new Set<string>();
  const visit = (key: string) => {
    if (seen.has(key)) return;
    seen.add(key);
    const o = findObject(t, key);
    if (!o) return;
    if (!o.deployed && !o.source) v.notDeployed.push(key);
    if (o.kind === 'Replication Flow' && o.flow?.connection) v.notes.push(`${o.name} uses the connection ${o.flow.connection}: create it in the target tenant before the first run.`);
    for (const d of dependencies(o, t)) {
      const [space] = d.split('.');
      if (space === p.space) {
        if (!p.objects.includes(d) && !inRequired(d) && !v.missing.some((m) => m.object === d)) v.missing.push({ object: d, neededBy: key });
        // Missing objects are followed as well, so the list shows everything that is still needed at once.
        if (!inRequired(d)) visit(d);
      } else if (!inRequired(d) && !v.outside.some((m) => m.object === d)) v.outside.push({ object: d, neededBy: key });
    }
  };
  p.objects.forEach(visit);
  v.notExported = required.filter((r) => !r.exported).map((r) => r.name);
  v.ok = !v.missing.length && !v.outside.length && !v.notExported.length && !v.notDeployed.length && p.objects.length > 0;
  return v;
}

/** One line per problem, for toasts, the validation panel and the failed job. */
export function validationMessages(v: Validation, p: Package): string[] {
  const short = (k: string) => k.split('.')[1] ?? k;
  return [
    ...(p.objects.length ? [] : ['The package has no objects.']),
    ...v.missing.map((m) => `${short(m.object)} is missing: ${short(m.neededBy)} needs it. Add it to the package.`),
    ...v.outside.map((m) => `${m.object} is in another space: ${short(m.neededBy)} needs it. Add a required package that contains it.`),
    ...v.notExported.map((n) => `The required package ${n} has not been exported yet.`),
    ...v.notDeployed.map((k) => `${short(k)} is not deployed. Only deployed objects can be transported.`),
  ];
}

const nextVersion = (v: string) => {
  const [major, minor] = v.split('.').map(Number);
  return `${major || 1}.${(minor || 0) + 1}.0`;
};

/** Exports a package. Returns the job; a failed validation gives a failed job and changes nothing else. */
export function exportPackage(p: Package, t: TenantState, by: string): TransportJob {
  const v = validatePackage(p, t);
  const problems = [...validationMessages(v, p), ...(p.targets.length ? [] : ['Choose at least one target tenant.'])];
  const version = p.exported ? nextVersion(p.exported.version) : p.version;
  const job: TransportJob = {
    id: 2593000 + t.transportJobs.length * 17 + 3,
    package: p.name, version, by, status: problems.length ? 'Failed' : 'Success', at: new Date().toISOString(),
    messages: problems.length ? problems : [
      `Exported ${p.objects.length} objects to the Content Network.`,
      `Shared with ${p.targets.map((id) => TARGET_TENANTS.find((x) => x.id === id)?.name ?? id).join(', ')}.`,
      ...v.notes,
    ],
  };
  if (!problems.length) {
    p.version = version;
    p.exported = { version, at: job.at, fingerprint: fingerprint(p) };
  }
  t.transportJobs.unshift(job);
  t.transportJobs = t.transportJobs.slice(0, 50);
  return job;
}

/** Technical names of packages: like object names, prefixed by the space by convention. */
export function packageNameError(name: string, t: TenantState): string | null {
  if (!name) return 'Enter a technical name.';
  if (!/^[A-Z_][A-Z0-9_]{0,49}$/.test(name)) return 'A technical name may only contain capital letters, digits and underscores.';
  if (t.packages.some((p) => p.name === name)) return `A package ${name} already exists.`;
  return null;
}

/** Creates a package with every deployed object of a space, already exported (mission set-ups: colleagues packed their layer). */
export function presetPackage(t: TenantState, space: string, name: string, businessName: string, by: string, required: string[] = []) {
  if (t.packages.some((p) => p.name === name)) return;
  const objects = t.objects.filter((o) => o.space === space && (o.deployed || o.source)).map(objectKey);
  const p: Package = {
    name, businessName, space, description: `All objects of ${space}.`, version: '1.0.0', objects, required,
    targets: TARGET_TENANTS.map((x) => x.id), createdBy: by, changedAt: '2026-10-08T15:00:00.000Z',
  };
  p.exported = { version: '1.0.0', at: '2026-10-08T15:05:00.000Z', fingerprint: fingerprint(p) };
  t.packages.push(p);
  t.transportJobs.push({ id: 2592000 + t.packages.length, package: name, version: '1.0.0', by, status: 'Success', at: p.exported.at, messages: [`Exported ${objects.length} objects to the Content Network.`] });
}

// ---------------------------------------------------------------- persistence

const NAME = /^[A-Z_][A-Z0-9_]{0,49}$/;
const KEY = /^[A-Z0-9_]{1,20}\.[A-Z_][A-Z0-9_]{0,49}$/;
const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '');

export function sanitizePackages(data: unknown, spaceIds: Set<string>): Package[] {
  const out: Package[] = [];
  for (const d of Array.isArray(data) ? data.slice(0, 30) : []) {
    if (!d || typeof d !== 'object' || !NAME.test(d.name) || !spaceIds.has(d.space) || out.some((p) => p.name === d.name)) continue;
    out.push({
      name: d.name, businessName: str(d.businessName, 120) || d.name, space: d.space, description: str(d.description, 500),
      version: /^\d+\.\d+\.\d+$/.test(d.version) ? d.version : '1.0.0',
      objects: (Array.isArray(d.objects) ? d.objects : []).filter((k: unknown) => typeof k === 'string' && KEY.test(k) && k.startsWith(`${d.space}.`)).slice(0, 200),
      required: (Array.isArray(d.required) ? d.required : []).filter((n: unknown) => typeof n === 'string' && NAME.test(n)).slice(0, 10),
      targets: (Array.isArray(d.targets) ? d.targets : []).filter((id: unknown) => TARGET_TENANTS.some((x) => x.id === id)),
      createdBy: str(d.createdBy, 60) || 'You', changedAt: str(d.changedAt, 40),
      exported: d.exported && typeof d.exported === 'object' && typeof d.exported.fingerprint === 'string'
        ? { version: str(d.exported.version, 20), at: str(d.exported.at, 40), fingerprint: d.exported.fingerprint.slice(0, 20000) } : undefined,
    });
  }
  return out;
}

export function sanitizeJobs(data: unknown): TransportJob[] {
  return (Array.isArray(data) ? data.slice(0, 50) : [])
    .filter((j) => j && typeof j === 'object' && NAME.test(j.package) && (j.status === 'Success' || j.status === 'Failed'))
    .map((j) => ({
      id: Number(j.id) || 0, package: j.package, version: str(j.version, 20), by: str(j.by, 60), status: j.status, at: str(j.at, 40),
      messages: (Array.isArray(j.messages) ? j.messages : []).map((m: unknown) => str(m, 300)).slice(0, 30),
    }));
}
