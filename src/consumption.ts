import type { TenantState } from './tenant';
import { findObject, type RepoObject } from './repo';
import { runSql } from './db';

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

// ---------------------------------------------------------------- OData Consumption API (Handbuch 12.7, 12.4.2)

/**
 * OAuth clients (System › Administration › App Integration). OData consumption needs a user context: purpose Interactive Usage,
 * grant Authorization Code, and the redirect URI of the calling tool (SAP KBA 3563695, Handbuch 12.7.3). API Access uses
 * Client Credentials and has no user. Field names, the secret shown once, and the URLs are simplified (not verified in the handbook).
 */
export type OAuthPurpose = 'Interactive Usage' | 'API Access';
export const OAUTH_PURPOSES: { id: OAuthPurpose; grant: string; text: string }[] = [
  { id: 'Interactive Usage', grant: 'Authorization Code', text: 'A person signs in; the tool acts in that user\'s name. For SAP Analytics Cloud import connections and other OData clients.' },
  { id: 'API Access', grant: 'Client Credentials', text: 'A program acts as itself, without a user. For administration APIs such as user provisioning.' },
];
export interface OAuthClient {
  name: string;
  purpose: OAuthPurpose;
  redirectUri: string;
  /** Token lifetime in hours. */
  lifetimeH: number;
  clientId: string;
  createdAt: string;
}

const TENANT_HOST = 'rheinau-training.eu10.hcs.cloud.sap.example';
export const OAUTH_ENDPOINTS = {
  authorization: `https://rheinau-training.authentication.eu10.hana.ondemand.example/oauth/authorize`,
  token: `https://rheinau-training.authentication.eu10.hana.ondemand.example/oauth/token`,
};
/** The planning team's SAC tenant, which imports through OData (excursion c12-m08). */
export const SAC_PLANNING = {
  label: 'SAP Analytics Cloud · Rheinau Planning (import connection)',
  redirectUri: 'https://rheinau-planning.eu10.sapanalytics.cloud/oauth/client/redirect',
};

/** Service URL of a relational (view) or analytical (analytic model) OData service. Structure not verified (Handbuch 12.7.2). */
export const odataUrl = (o: Pick<RepoObject, 'space' | 'name' | 'kind'>) =>
  `https://${TENANT_HOST}/api/v1/dwc/consumption/${o.kind === 'Analytic Model' ? 'analytical' : 'relational'}/${o.space}/${o.name}/${o.name}`;

export function oauthClientError(name: string, redirectUri: string, purpose: OAuthPurpose, t: TenantState): string | null {
  if (!name.trim()) return 'Enter a name for the client.';
  if (t.oauthClients.some((c) => c.name.toLowerCase() === name.trim().toLowerCase())) return `A client named ${name.trim()} already exists.`;
  if (purpose === 'Interactive Usage' && !/^https:\/\/\S+$/.test(redirectUri.trim())) return 'Interactive Usage needs a redirect URI starting with https://: where the tool receives the code after the user signs in.';
  return null;
}

export function newClientId(t: TenantState) {
  const n = 7100 + ((Date.now() / 1000) | 0) % 50000 + t.oauthClients.length * 37;
  return `sb-${n.toString(16)}-rheinau!b${n % 997}|client!b3650`;
}

export interface ODataResult {
  status: 200 | 400 | 401 | 404;
  message: string;
  columns?: string[];
  rows?: unknown[][];
  total?: number;
}

/** What the calling tool gets back: the checks an OData request passes, in the order the tenant would run them. */
export async function odataRequest(t: TenantState, clientName: string, key: string, toolRedirect: string): Promise<ODataResult> {
  const c = t.oauthClients.find((x) => x.name === clientName);
  if (!c) return { status: 401, message: 'invalid_client: the tenant does not know this client ID.' };
  if (c.purpose !== 'Interactive Usage')
    return { status: 401, message: 'unauthorized_client: the client has purpose API Access (Client Credentials). OData consumption needs a signed-in user: purpose Interactive Usage, grant Authorization Code.' };
  if (c.redirectUri.trim() !== toolRedirect)
    return { status: 400, message: `invalid_request: redirect_uri mismatch. The tool asks to return to ${toolRedirect}, the client allows ${c.redirectUri || '(none)'}. The sign-in never completes.` };
  const o = findObject(t, key);
  if (!o?.deployed) return { status: 404, message: `Not found: ${key} is not deployed.` };
  const consumable = o.kind === 'Analytic Model' || (o.kind === 'SQL View' && o.deployed.exposed);
  if (!consumable) return { status: 404, message: `Not found: ${key} is not exposed for consumption. Switch on Expose for Consumption in its properties and deploy.` };
  if (o.kind === 'Analytic Model') return { status: 200, message: 'Signed in as you. The analytical service answers; SAP Analytics Cloud would now ask for dimensions and measures.' };
  try {
    const res = await runSql(`SELECT * FROM "${o.space}"."${o.name}" LIMIT 5`);
    const cnt = await runSql(`SELECT count(*) AS N FROM "${o.space}"."${o.name}"`);
    const total = Number(cnt.rows[0][0]);
    return { status: 200, message: `Signed in as you. ${total} rows; the first ${res.rows.length} are shown.`, columns: res.columns, rows: res.rows, total };
  } catch (err) {
    return { status: 404, message: `The view cannot be read: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export function sanitizeOAuthClients(data: unknown): OAuthClient[] {
  const out: OAuthClient[] = [];
  for (const d of Array.isArray(data) ? data.slice(0, 20) : []) {
    if (!d || typeof d.name !== 'string' || !d.name.trim() || out.some((c) => c.name === d.name)) continue;
    if (!OAUTH_PURPOSES.some((p) => p.id === d.purpose)) continue;
    out.push({ name: d.name.slice(0, 60), purpose: d.purpose, redirectUri: typeof d.redirectUri === 'string' ? d.redirectUri.slice(0, 300) : '',
      lifetimeH: Number.isFinite(d.lifetimeH) ? Math.min(720, Math.max(1, Math.round(d.lifetimeH))) : 12,
      clientId: typeof d.clientId === 'string' ? d.clientId.slice(0, 80) : '', createdAt: typeof d.createdAt === 'string' ? d.createdAt.slice(0, 40) : '' });
  }
  return out;
}
