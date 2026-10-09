import type { TenantState } from './tenant';

/**
 * Consumption by external tools (excursion, Handbuch 12): database users of a space.
 * A space administrator creates a database user in Space Management › Edit space › Database Access. Its name is
 * <SPACE>#<SUFFIX>. With read access it reads the views of the space that are exposed for consumption via ODBC/JDBC
 * (e.g. Power BI); with write access it may also create objects in its own Open SQL schema.
 * Host, port and password are simulated. The IP allowlist is not modelled (Handbuch 12.6.3: nicht verifiziert).
 */

export interface DbUser {
  space: string;
  /** Part after the #, A–Z, 0–9, _. */
  suffix: string;
  /** Enable Read Access (SQL): read exposed views of the space. */
  read: boolean;
  /** Enable Write Access (SQL, DDL, DML): create and fill tables in its Open SQL schema. */
  write: boolean;
  createdAt: string;
}

export const dbUserName = (u: Pick<DbUser, 'space' | 'suffix'>) => `${u.space}#${u.suffix}`;

/** Simulated connection details, as the user details show them. */
export const DB_HOST = 'rheinau-training.hana.prod-eu10.hanacloud.ondemand.example';
export const DB_PORT = 443;

export function dbUserError(space: string, suffix: string, t: TenantState): string | null {
  if (!suffix) return 'Enter a user name suffix.';
  if (suffix.length > 40 - space.length - 1) return `Space ID, # and suffix together have at most 40 characters.`;
  if (!/^[A-Z0-9_]+$/.test(suffix)) return 'The suffix may only contain capital letters A–Z, digits and underscores.';
  if (t.dbUsers.some((u) => u.space === space && u.suffix === suffix)) return `${space}#${suffix} already exists.`;
  return null;
}

/** What a database user of a space can read: the deployed, exposed views of the space. */
export const readableByDbUser = (t: TenantState, space: string) =>
  t.objects.filter((o) => o.space === space && o.kind === 'SQL View' && o.deployed?.exposed);

export function sanitizeDbUsers(data: unknown, spaceIds: Set<string>): DbUser[] {
  const out: DbUser[] = [];
  for (const d of Array.isArray(data) ? data.slice(0, 40) : []) {
    if (!d || typeof d !== 'object' || !spaceIds.has(d.space) || typeof d.suffix !== 'string' || !/^[A-Z0-9_]{1,39}$/.test(d.suffix)) continue;
    if (out.some((u) => u.space === d.space && u.suffix === d.suffix)) continue;
    out.push({ space: d.space, suffix: d.suffix, read: !!d.read, write: !!d.write, createdAt: typeof d.createdAt === 'string' ? d.createdAt.slice(0, 40) : '' });
  }
  return out;
}
