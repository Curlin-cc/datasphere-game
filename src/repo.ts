import { exec } from './db';
import type { TenantState } from './tenant';

/**
 * Repository objects: what the Data Builder and the Repository Explorer list.
 * Each object has a technical name (fixed once deployed) and a business name (for people, changeable),
 * and a deployment status like in SAP Datasphere:
 *  - Not Deployed: saved, but never deployed; nothing runs yet
 *  - Changes to Deploy: deployed once, newer saved changes are not active yet
 *  - Deployed: what is saved is what runs
 */

export type ObjectKind = 'Local Table' | 'SQL View';
export type DeployStatus = 'deployed' | 'not_deployed' | 'changes';
export type SemanticUsage = 'Relational Dataset' | 'Fact' | 'Dimension' | 'Text';

export interface RepoObject {
  space: string;
  /** Technical name. */
  name: string;
  kind: ObjectKind;
  businessName: string;
  semanticUsage: SemanticUsage;
  /** SQL views only: the saved definition. */
  sql?: string;
  /** What is active in the runtime. Missing until the first deploy. */
  deployed?: { businessName: string; sql?: string };
  status: DeployStatus;
  changedAt: string;
  /** Loaded by IT from a source system; cannot be deleted. */
  source?: boolean;
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

export const SEMANTIC_USAGES: SemanticUsage[] = ['Relational Dataset', 'Fact', 'Dimension', 'Text'];

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
  const same = o.deployed.businessName === o.businessName && (o.kind !== 'SQL View' || o.deployed.sql === o.sql);
  return same ? 'deployed' : 'changes';
}

const now = () => new Date().toISOString();

export function touch(o: RepoObject) {
  o.changedAt = now();
  o.status = statusAfterSave(o);
}

/** Runs the deployment. Returns an error text, or null on success. */
export async function deploy(o: RepoObject): Promise<string | null> {
  if (o.kind === 'SQL View') {
    try {
      await exec(`CREATE OR REPLACE VIEW "${o.space}"."${o.name}" AS ${stripSemicolon(o.sql ?? '')}`);
    } catch (err) {
      return `Deployment failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
  o.deployed = { businessName: o.businessName, sql: o.sql };
  o.status = 'deployed';
  o.changedAt = now();
  return null;
}

export async function dropObject(o: RepoObject) {
  if (o.kind === 'SQL View' && o.deployed) await exec(`DROP VIEW IF EXISTS "${o.space}"."${o.name}"`);
}

const stripSemicolon = (sql: string) => sql.trim().replace(/;\s*$/, '');

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
    if (o.kind !== 'Local Table' && o.kind !== 'SQL View') continue;
    if (out.some((x) => x.space === o.space && x.name === o.name)) continue;
    out.push({
      space: o.space,
      name: o.name,
      kind: o.kind,
      businessName: String(o.businessName ?? o.name).slice(0, 120),
      semanticUsage: SEMANTIC_USAGES.includes(o.semanticUsage) ? o.semanticUsage : 'Relational Dataset',
      sql: typeof o.sql === 'string' ? o.sql : undefined,
      deployed: o.deployed && typeof o.deployed === 'object'
        ? { businessName: String(o.deployed.businessName ?? o.businessName), sql: typeof o.deployed.sql === 'string' ? o.deployed.sql : undefined }
        : undefined,
      status: ['deployed', 'not_deployed', 'changes'].includes(o.status) ? o.status : 'not_deployed',
      changedAt: typeof o.changedAt === 'string' ? o.changedAt : now(),
      source: !!o.source,
    });
  }
  return out;
}
