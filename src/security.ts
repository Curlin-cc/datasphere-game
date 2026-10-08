/**
 * Users and roles (chapter 2). Simplified model of SAP Datasphere's role concept:
 *  - DW Administrator is a global role: it applies to the whole tenant, not to spaces.
 *  - Scoped roles are built from a template (Space Administrator, Integrator, Modeler, Viewer, Consumer)
 *    and a scope: the spaces the role can be used in.
 *  - A user gets a scoped role for some or all spaces of its scope.
 * Role texts are simplified for learning; check details against SAP Help before relying on them.
 */

export type Template = 'SPACE_ADMIN' | 'INTEGRATOR' | 'MODELER' | 'VIEWER' | 'CONSUMER';

export const GLOBAL_ADMIN = 'DW Administrator';

export interface ScopedRole {
  /** Role name, e.g. RHN_MODELER. */
  id: string;
  template: Template;
  /** Spaces this role can be assigned for. */
  scope: string[];
}

export interface Assignment {
  user: string;
  /** GLOBAL_ADMIN or the ID of a scoped role. */
  role: string;
  /** Spaces the user gets the role for; empty for the global role. */
  spaces: string[];
}

export interface RoleInfo {
  name: string;
  short: string;
  can: string[];
  cannot: string;
}

/** Shown in Security > Roles. Plain, simplified descriptions. */
export const TEMPLATES: Record<Template, RoleInfo> = {
  SPACE_ADMIN: {
    name: 'DW Space Administrator',
    short: 'Runs a space: members, settings and its objects.',
    can: ['Adds and removes members of their spaces', 'Changes space settings', 'Builds and deploys objects in their spaces'],
    cannot: 'Cannot create spaces or users, and has no say in spaces outside the scope.',
  },
  INTEGRATOR: {
    name: 'DW Integrator',
    short: 'Brings data in: connections, replication and loads.',
    can: ['Creates and maintains connections', 'Runs and schedules replication flows and loads', 'Monitors data integration'],
    cannot: 'Does not build business views or models.',
  },
  MODELER: {
    name: 'DW Modeler',
    short: 'Builds views, facts, dimensions and analytic models.',
    can: ['Creates and changes objects in the Data Builder', 'Previews data', 'Shares objects with other spaces'],
    cannot: 'Cannot manage members or connections.',
  },
  VIEWER: {
    name: 'DW Viewer',
    short: 'Looks, does not touch: reads models and previews data.',
    can: ['Opens objects in the Data Builder read-only', 'Previews data'],
    cannot: 'Cannot create, change or delete anything.',
  },
  CONSUMER: {
    name: 'DW Consumer',
    short: 'Uses the data in reports, without opening Datasphere.',
    can: ['Consumes exposed data and analytic models, e.g. in SAP Analytics Cloud'],
    cannot: 'Has no access to the Data Builder or any modeling tool.',
  },
};

export const ADMIN_INFO: RoleInfo = {
  name: GLOBAL_ADMIN,
  short: 'Runs the tenant: users, roles, spaces and system settings.',
  can: ['Creates users and roles', 'Creates spaces and assigns storage', 'Changes tenant-wide settings'],
  cannot: 'A global role: it is not limited to spaces, so give it to very few people.',
};

export const TEMPLATE_ORDER: Template[] = ['SPACE_ADMIN', 'INTEGRATOR', 'MODELER', 'VIEWER', 'CONSUMER'];

/** Role names: capitals, digits and underscores, up to 30 characters. */
export function roleIdError(id: string, roles: ScopedRole[], self?: string): string | null {
  if (!id) return 'Enter a role name.';
  if (id.length > 30) return 'A role name has at most 30 characters here.';
  if (!/^[A-Z0-9_]+$/.test(id)) return 'Use capital letters, digits and underscores for role names.';
  if (id === GLOBAL_ADMIN.toUpperCase().replace(/ /g, '_')) return 'That name is taken by the standard role.';
  if (roles.some((r) => r.id === id && r.id !== self)) return `A role ${id} already exists.`;
  return null;
}

/** What a user can effectively do: global admin flag plus template-per-space pairs. */
export function effectiveAccess(user: string, roles: ScopedRole[], assignments: Assignment[]) {
  const pairs = new Set<string>();
  let admin = false;
  for (const a of assignments.filter((x) => x.user === user)) {
    if (a.role === GLOBAL_ADMIN) {
      admin = true;
      continue;
    }
    const role = roles.find((r) => r.id === a.role);
    if (!role) continue;
    for (const s of a.spaces) if (role.scope.includes(s)) pairs.add(`${role.template}@${s}`);
  }
  return { admin, pairs };
}

export const templateLabel = (t: Template) => TEMPLATES[t].name.replace(/^DW /, '');

export function sanitizeSecurity(data: { roles?: unknown; assignments?: unknown }, spaceIds: Set<string>) {
  const roles: ScopedRole[] = [];
  for (const r of Array.isArray(data.roles) ? data.roles : []) {
    if (!r || typeof r.id !== 'string' || !/^[A-Z0-9_]{1,30}$/.test(r.id) || !TEMPLATE_ORDER.includes(r.template)) continue;
    if (roles.some((x) => x.id === r.id)) continue;
    roles.push({ id: r.id, template: r.template, scope: (Array.isArray(r.scope) ? r.scope : []).filter((s: unknown) => spaceIds.has(String(s))).map(String) });
  }
  const ids = new Set([GLOBAL_ADMIN, ...roles.map((r) => r.id)]);
  const assignments: Assignment[] = [];
  for (const a of Array.isArray(data.assignments) ? data.assignments : []) {
    if (!a || typeof a.user !== 'string' || typeof a.role !== 'string' || !ids.has(a.role)) continue;
    assignments.push({ user: a.user, role: a.role, spaces: (Array.isArray(a.spaces) ? a.spaces : []).filter((s: unknown) => spaceIds.has(String(s))).map(String) });
  }
  return { roles, assignments };
}
