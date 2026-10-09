import type { TenantState } from './tenant';
import { findObject, objectKey, type RepoObject } from './repo';
import { isShared } from './tenant';
import { PEOPLE } from './content/people';

/**
 * Data Access Controls (chapter 8, Handbuch 9.3, 6.5.7): row-level security.
 * A DAC reads a permissions entity (table or view) with an identifier column (the user ID) and one or more criteria
 * columns. It is assigned to a view by mapping each criterion to a view column. After deploying, a user sees only rows
 * whose values match one of his entries; a user without entries sees nothing.
 *
 * Simplified in the game (docs/DECISIONS.md): only the type "Single Values" works ("Operator and Values" is not verified
 * in the handbook, "Hierarchy" needs hierarchies the game does not model yet); several DACs on one view are combined
 * with AND; the filter applies where the game reads an object for a user: Data Preview "View as", analytic models and
 * mission checks. Views built on top of a protected view are not filtered (the real tenant does that).
 */

export type DacType = 'Single Values' | 'Operator and Values' | 'Hierarchy';

export interface DacDef {
  type: 'Single Values';
  /** SPACE.NAME of the permissions entity. */
  entity: string;
  /** Column holding the user ID. */
  identifier: string;
  /** Criteria columns. */
  criteria: string[];
}

export interface DacAssignment {
  /** SPACE.NAME of the data access control. */
  dac: string;
  /** Criterion → column of the protected view. */
  mapping: Record<string, string>;
}

/** Users the game knows, as user IDs (Security › Users). */
export const DAC_USERS = PEOPLE.map((p) => ({ id: p.id.toUpperCase(), name: p.name, title: p.title }));

const qi = (n: string) => `"${n.replace(/"/g, '""')}"`;
const qk = (key: string) => key.split('.').map(qi).join('.');
const lit = (v: string) => `'${v.replace(/'/g, "''")}'`;

/** Tables and views a DAC in this space may read: deployed, in the space or shared with it, not DACs or models. */
export function entityCandidates(t: TenantState, space: string): RepoObject[] {
  return t.objects.filter((o) => (o.kind === 'Local Table' || o.kind === 'SQL View' || o.kind === 'Remote Table')
    && !!o.deployed && (o.space === space || isShared(t, objectKey(o), space)));
}

/** Deployed DACs that can be assigned to a view of this space. */
export const dacCandidates = (t: TenantState, space: string) =>
  t.objects.filter((o) => o.kind === 'Data Access Control' && o.space === space && !!o.deployed?.dac);

/** Everything that must be right before a DAC can be deployed, given the entity's columns. Null if fine. */
export function dacError(def: DacDef, t: TenantState, space: string, columns: string[] | null): string | null {
  if (!def.entity) return 'Choose the permissions entity.';
  const e = findObject(t, def.entity);
  if (!e || !e.deployed) return `${def.entity.split('.')[1] ?? def.entity} is not deployed. Deploy the permissions entity first.`;
  if (e.space !== space && !isShared(t, def.entity, space)) return `${def.entity} is not shared with ${space}.`;
  if (!columns) return `${e.name} cannot be read.`;
  if (!def.identifier) return 'Choose the identifier column: the column with the user IDs.';
  if (!columns.includes(def.identifier)) return `${e.name} has no column ${def.identifier}.`;
  if (!def.criteria.length) return 'Choose at least one criterion: the column with the values a user may see.';
  if (def.criteria.includes(def.identifier)) return 'The identifier column cannot also be a criterion.';
  const missing = def.criteria.filter((c) => !columns.includes(c));
  return missing.length ? `${e.name} has no column ${missing.join(', ')}.` : null;
}

/** Problems of the DAC assignments of a view, given the view's columns. Null if fine. */
export function assignmentError(assignments: DacAssignment[], t: TenantState, columns: string[]): string | null {
  for (const a of assignments) {
    const d = findObject(t, a.dac);
    const def = d?.deployed?.dac;
    if (!def) return `The data access control ${a.dac.split('.')[1]} is not deployed.`;
    for (const c of def.criteria) {
      const col = a.mapping[c];
      if (!col) return `${d!.name}: map the criterion ${c} to a column of the view.`;
      if (!columns.includes(col)) return `${d!.name}: the view has no column ${col} any more.`;
    }
  }
  return null;
}

/**
 * How to read a deployed object as a user: the object itself, or a sub-query that keeps only the rows the user's
 * entries allow. Without a user (modeling, no simulation) the object is read unfiltered.
 */
export function securedFrom(t: TenantState, key: string, user?: string): string {
  const o = findObject(t, key);
  const assignments = o?.deployed?.dacs ?? [];
  if (!user || !assignments.length) return qk(key);
  const conds = assignments.map((a) => {
    const def = findObject(t, a.dac)?.deployed?.dac;
    if (!def) return 'FALSE';
    const match = def.criteria.map((c) => `p.${qi(c)} = x.${qi(a.mapping[c] ?? c)}`).join(' AND ');
    return `EXISTS (SELECT 1 FROM ${qk(def.entity)} p WHERE p.${qi(def.identifier)} = ${lit(user)} AND ${match})`;
  });
  return `(SELECT x.* FROM ${qk(key)} x WHERE ${conds.join(' AND ')})`;
}

export const hasDac = (t: TenantState, key: string) => !!findObject(t, key)?.deployed?.dacs?.length;

const KEY = /^[A-Z0-9_]{1,20}\.[A-Z_][A-Z0-9_]{0,49}$/;
const COL = /^[A-Za-z_][A-Za-z0-9_]{0,99}$/;

export function sanitizeDac(d: unknown): DacDef | undefined {
  if (!d || typeof d !== 'object') return undefined;
  const x = d as Record<string, unknown>;
  const entity = typeof x.entity === 'string' && KEY.test(x.entity) ? x.entity : '';
  const identifier = typeof x.identifier === 'string' && COL.test(x.identifier) ? x.identifier : '';
  const criteria = (Array.isArray(x.criteria) ? x.criteria : []).filter((c): c is string => typeof c === 'string' && COL.test(c)).slice(0, 10);
  return { type: 'Single Values', entity, identifier, criteria };
}

export function sanitizeAssignments(d: unknown): DacAssignment[] {
  const out: DacAssignment[] = [];
  for (const a of Array.isArray(d) ? d.slice(0, 10) : []) {
    if (!a || typeof a.dac !== 'string' || !KEY.test(a.dac) || !a.mapping || typeof a.mapping !== 'object') continue;
    const mapping: Record<string, string> = {};
    for (const [k, v] of Object.entries(a.mapping as Record<string, unknown>).slice(0, 10)) if (COL.test(k) && typeof v === 'string' && COL.test(v)) mapping[k] = v;
    out.push({ dac: a.dac, mapping });
  }
  return out;
}
