import type { TenantState } from './tenant';
import { findObject, objectKey, type Association, type RepoObject } from './repo';

/**
 * Analytic Model (chapter 7, Handbuch 6.10): the consumption object for SAP Analytics Cloud.
 * Built on exactly one fact; its dimensions come from the fact's associations. Defines which measures, attributes and
 * variables consumers see. The model holds no data: the Data Preview and the mission checks turn it into one SQL query
 * (`modelSql`), joining a dimension only when the query needs it, like an association at runtime.
 *
 * Simplified in the game (see docs/DECISIONS.md):
 *  - fact and dimensions are read in their deployed version; the fact must be in the model's own space
 *  - measure types: Fact Source, Calculated, Restricted, Count Distinct. Fixed Value and Currency/Unit Conversion only explained
 *  - variables: Filter Variable with Single Value or Interval; other variable types only explained
 *  - restricted measures restrict with "in these values"; the base can be any other measure
 *  - exception aggregation, scaling, visibility, global filter and multi-level dimensions are not simulated
 */

export type Aggregation = 'SUM' | 'MIN' | 'MAX' | 'AVG' | 'COUNT';
export const AGGREGATIONS: Aggregation[] = ['SUM', 'MIN', 'MAX', 'AVG', 'COUNT'];

export type MeasureType = 'Fact Source Measure' | 'Calculated Measure' | 'Restricted Measure' | 'Count Distinct';

export type Measure =
  | { type: 'Fact Source Measure'; name: string; column: string; aggregation: Aggregation }
  | { type: 'Calculated Measure'; name: string; formula: string }
  | { type: 'Restricted Measure'; name: string; base: string; attribute: string; values: string[] }
  | { type: 'Count Distinct'; name: string; attribute: string };

export type Selection = 'Single Value' | 'Interval';

export interface Variable {
  name: string;
  type: 'Filter Variable';
  /** Attribute ID the variable filters. */
  attribute: string;
  selection: Selection;
  mandatory: boolean;
}

export interface AnalyticModelDef {
  /** SPACE.NAME of the fact source. */
  fact: string;
  /** SPACE.NAME of the dimensions added to the model, a subset of the fact's association targets. */
  dimensions: string[];
  /** Visible attribute IDs: a fact column (CUSTOMER_ID) or DIMENSION.COLUMN (RHN_REP_D_GRID_AREA.REGION). */
  attributes: string[];
  measures: Measure[];
  variables: Variable[];
}

/** Values for one variable in a query: a single value or an interval (from–to, both inclusive). */
export interface VariableValue {
  value?: string;
  from?: string;
  to?: string;
}

export interface ModelQuery {
  /** Attribute IDs in the rows. */
  rows: string[];
  /** Measure names in the columns. */
  measures: string[];
  /** Variable name → value. Variables without a value are not applied. */
  variables?: Record<string, VariableValue>;
  /** How to read a source (chapter 8: filtered by data access controls for a user). Default: the object itself. */
  from?: (key: string) => string;
}

// ---------------------------------------------------------------- sources

export interface DimensionSource {
  key: string;
  name: string;
  association: Association;
  /** Non-key columns with role Attribute, in the dimension's deployed version. */
  attributes: string[];
}

export interface ModelSources {
  fact: RepoObject;
  /** Columns with role Measure in the fact's deployed version. */
  measures: string[];
  /** Columns with role Attribute. */
  attributes: string[];
  /** One entry per association of the fact whose target is deployed. */
  dimensions: DimensionSource[];
}

/** Deployed facts a new analytic model in this space can be built on. */
export const factCandidates = (t: TenantState, space: string) =>
  t.objects.filter((o) => o.space === space && o.deployed?.semanticUsage === 'Fact');

/** What the deployed fact offers: its measures, its attributes and the dimensions it is associated with. */
export function modelSources(t: TenantState, factKey: string): ModelSources | string {
  const fact = findObject(t, factKey);
  const name = factKey.split('.')[1] ?? factKey;
  if (!fact) return `The fact source ${name} does not exist any more.`;
  if (!fact.deployed) return `The fact source ${name} is not deployed.`;
  if (fact.deployed.semanticUsage !== 'Fact') return `${name} is not deployed as a Fact any more. An analytic model needs a fact source.`;
  const roles = Object.entries(fact.deployed.columnRoles ?? {});
  const dimensions: DimensionSource[] = [];
  for (const a of fact.deployed.associations ?? []) {
    const d = findObject(t, a.target);
    if (!d?.deployed) continue;
    const keys = new Set(a.mapping.map((m) => m.to.toUpperCase()));
    dimensions.push({
      key: a.target,
      name: d.name,
      association: a,
      attributes: Object.entries(d.deployed.columnRoles ?? {}).filter(([c, r]) => r === 'Attribute' && !keys.has(c.toUpperCase())).map(([c]) => c),
    });
  }
  return {
    fact,
    measures: roles.filter(([, r]) => r === 'Measure').map(([c]) => c),
    attributes: roles.filter(([, r]) => r !== 'Measure').map(([c]) => c),
    dimensions,
  };
}

/** A new model on a fact: every fact measure (SUM) and every fact attribute, no dimensions yet. */
export function newModel(src: ModelSources): AnalyticModelDef {
  return {
    fact: objectKey(src.fact),
    dimensions: [],
    attributes: [...src.attributes],
    measures: src.measures.map((c) => ({ type: 'Fact Source Measure', name: c.toUpperCase(), column: c, aggregation: 'SUM' })),
    variables: [],
  };
}

// ---------------------------------------------------------------- attributes

export interface AttributeInfo {
  id: string;
  /** Column in its source. */
  column: string;
  /** Technical name of the dimension, or undefined for the fact. */
  dimension?: string;
  /** Column name in query results. */
  alias: string;
  /** For people: "Grid Area › REGION". */
  label: string;
}

/** Every attribute the model could show: fact attributes, then the attributes of the dimensions in the model. */
export function attributeCatalog(def: AnalyticModelDef, src: ModelSources): AttributeInfo[] {
  const out: AttributeInfo[] = src.attributes.map((c) => ({ id: c, column: c, alias: c.toUpperCase(), label: c }));
  for (const d of src.dimensions.filter((x) => def.dimensions.includes(x.key))) {
    for (const c of d.attributes) out.push({ id: `${d.name}.${c}`, column: c, dimension: d.name, alias: c.toUpperCase(), label: `${dimLabel(d.name)} › ${c}` });
  }
  // Same column name in two places: the dimension's gets its prefix.
  const seen = new Map<string, number>();
  out.forEach((a) => seen.set(a.alias, (seen.get(a.alias) ?? 0) + 1));
  out.forEach((a) => {
    if (a.dimension && (seen.get(a.alias) ?? 0) > 1) a.alias = `${a.dimension}_${a.column}`.toUpperCase();
  });
  return out;
}

/** RHN_REP_D_GRID_AREA → Grid Area */
export const dimLabel = (name: string) =>
  name.replace(/^[A-Z0-9]+_REP_D_/, '').split('_').map((w) => w[0] + w.slice(1).toLowerCase()).join(' ');

// ---------------------------------------------------------------- validation

const NAME = /^[A-Z_][A-Z0-9_]{0,49}$/;
const TOKEN = /\s*([A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?|[-+*/()])\s*/y;

/** Splits a formula into names, numbers and operators. Null if it contains anything else. */
export function formulaTokens(formula: string): string[] | null {
  const out: string[] = [];
  TOKEN.lastIndex = 0;
  const f = formula.trim();
  while (TOKEN.lastIndex < f.length) {
    const start = TOKEN.lastIndex;
    const m = TOKEN.exec(f);
    if (!m || TOKEN.lastIndex === start) return null;
    out.push(m[1]);
  }
  return out;
}

/** Measures a measure is built on (formula names, base). */
function dependsOn(m: Measure): string[] {
  if (m.type === 'Calculated Measure') return (formulaTokens(m.formula) ?? []).filter((x) => /^[A-Za-z_]/.test(x)).map((x) => x.toUpperCase());
  if (m.type === 'Restricted Measure') return [m.base];
  return [];
}

/** Checks one measure against the model. Null if it is fine. */
export function measureError(m: Measure, def: AnalyticModelDef, src: ModelSources): string | null {
  if (!NAME.test(m.name)) return `${m.name || 'A measure'}: technical names use capital letters, digits and underscores.`;
  const attrs = attributeCatalog(def, src);
  const names = new Set(def.measures.filter((x) => x !== m).map((x) => x.name));
  if (m.type === 'Fact Source Measure') {
    if (!src.measures.includes(m.column)) return `${m.name}: ${m.column} is not a measure of the fact source.`;
  } else if (m.type === 'Calculated Measure') {
    const tokens = formulaTokens(m.formula);
    if (!tokens || !tokens.length) return `${m.name}: the formula may only use measure names, numbers, + - * / and brackets.`;
    for (const x of tokens) if (/^[A-Za-z_]/.test(x) && !names.has(x.toUpperCase())) return `${m.name}: there is no measure ${x} in the model.`;
    let depth = 0;
    let expectOperand = true;
    for (const x of tokens) {
      if (x === '(') {
        if (!expectOperand) return `${m.name}: an operator is missing before "(".`;
        depth++;
      } else if (x === ')') {
        if (expectOperand || --depth < 0) return `${m.name}: the brackets do not match.`;
      } else if ('+-*/'.includes(x)) {
        if (expectOperand && x !== '-') return `${m.name}: "${x}" needs a value before it.`;
        expectOperand = true;
        continue;
      } else {
        if (!expectOperand) return `${m.name}: an operator is missing between two values.`;
      }
      expectOperand = x === '(';
    }
    if (depth !== 0 || expectOperand) return `${m.name}: the formula is not complete.`;
  } else if (m.type === 'Restricted Measure') {
    if (!names.has(m.base)) return `${m.name}: choose the measure it restricts.`;
    if (!attrs.some((a) => a.id === m.attribute)) return `${m.name}: ${m.attribute || 'the attribute'} is not in the model. Add its dimension first.`;
    if (!m.values.length) return `${m.name}: choose at least one value to restrict to.`;
  } else if (!attrs.some((a) => a.id === m.attribute)) {
    return `${m.name}: ${m.attribute || 'the attribute'} is not in the model. Add its dimension first.`;
  }
  return null;
}

/** Everything that must be right before a model can be deployed. Null if it is fine. */
export function modelError(def: AnalyticModelDef, src: ModelSources | string, space: string): string | null {
  if (typeof src === 'string') return src;
  if (src.fact.space !== space) return `The fact source must be in ${space}.`;
  if (!def.measures.length) return 'The model needs at least one measure.';
  for (const d of def.dimensions) {
    if (!src.dimensions.some((x) => x.key === d)) return `${d.split('.')[1]} is no longer associated with the fact. Remove it from the model.`;
  }
  const catalog = attributeCatalog(def, src);
  for (const a of def.attributes) if (!catalog.some((c) => c.id === a)) return `The attribute ${a} is not available any more. Remove it.`;
  const seen = new Set<string>();
  const aliases = new Set(catalog.map((c) => c.alias));
  for (const m of def.measures) {
    if (seen.has(m.name)) return `Two measures are called ${m.name}.`;
    if (aliases.has(m.name)) return `${m.name} is already an attribute name. Give the measure another name.`;
    seen.add(m.name);
    const err = measureError(m, def, src);
    if (err) return err;
  }
  // No measure may depend on itself.
  const byName = new Map(def.measures.map((m) => [m.name, m]));
  const visit = (n: string, path: string[]): string | null => {
    if (path.includes(n)) return `${[...path, n].join(' → ')}: a measure cannot be built on itself.`;
    for (const d of dependsOn(byName.get(n)!)) {
      const e = visit(d, [...path, n]);
      if (e) return e;
    }
    return null;
  };
  for (const m of def.measures) {
    const e = visit(m.name, []);
    if (e) return e;
  }
  const vars = new Set<string>();
  for (const v of def.variables) {
    if (!NAME.test(v.name)) return `Variable ${v.name}: technical names use capital letters, digits and underscores.`;
    if (vars.has(v.name)) return `Two variables are called ${v.name}.`;
    vars.add(v.name);
    if (!catalog.some((c) => c.id === v.attribute) && !src.attributes.includes(v.attribute)) return `Variable ${v.name}: ${v.attribute} is not in the model.`;
  }
  return null;
}

// ---------------------------------------------------------------- query

const lit = (v: string) => `'${v.replace(/'/g, "''")}'`;
const qi = (n: string) => `"${n.replace(/"/g, '""')}"`;

/**
 * The SQL a consumer's query on the model turns into: the fact, LEFT JOINs along the associations that the query
 * needs, measures as aggregates. Restricted measures restrict inside the aggregate (CASE WHEN), so they work
 * in any drill-down. Throws an Error with a readable message if the query cannot be built.
 */
export function modelSql(def: AnalyticModelDef, src: ModelSources, q: ModelQuery): string {
  const catalog = attributeCatalog(def, src);
  const byId = new Map(catalog.map((a) => [a.id, a]));
  const byName = new Map(def.measures.map((m) => [m.name, m]));
  const used = new Set<string>();
  const col = (id: string) => {
    const a = byId.get(id);
    if (!a) throw new Error(`The model has no attribute ${id}.`);
    if (!a.dimension) return `f.${qi(a.column)}`;
    used.add(a.dimension);
    return `${qi(`d_${a.dimension}`)}.${qi(a.column)}`;
  };

  const expr = (name: string, cond: string | null, depth = 0): string => {
    const m = byName.get(name);
    if (!m) throw new Error(`The model has no measure ${name}.`);
    if (depth > 20) throw new Error(`${name} is built on itself.`);
    switch (m.type) {
      case 'Fact Source Measure': {
        const c = `f.${qi(m.column)}`;
        const v = cond ? `CASE WHEN ${cond} THEN ${c} END` : c;
        return `${m.aggregation}(${v})`;
      }
      case 'Calculated Measure':
        return `(${(formulaTokens(m.formula) ?? []).map((x) => (/^[A-Za-z_]/.test(x) ? expr(x.toUpperCase(), cond, depth + 1) : x)).join(' ')})`;
      case 'Restricted Measure': {
        const own = `${col(m.attribute)} IN (${m.values.map(lit).join(', ')})`;
        return expr(m.base, cond ? `(${cond}) AND ${own}` : own, depth + 1);
      }
      case 'Count Distinct': {
        const c = col(m.attribute);
        return `COUNT(DISTINCT ${cond ? `CASE WHEN ${cond} THEN ${c} END` : c})`;
      }
    }
  };

  const rows = q.rows.map((id) => `${col(id)} AS ${qi(byId.get(id)!.alias)}`);
  const measures = q.measures.map((n) => `${expr(n, null)} AS ${qi(n)}`);
  const where: string[] = [];
  for (const v of def.variables) {
    const val = q.variables?.[v.name];
    if (!val) continue;
    const c = byId.has(v.attribute) ? col(v.attribute) : `f.${qi(v.attribute)}`;
    if (v.selection === 'Single Value' && val.value) where.push(`${c} = ${lit(val.value)}`);
    if (v.selection === 'Interval') {
      if (val.from) where.push(`${c} >= ${lit(val.from)}`);
      if (val.to) where.push(`${c} <= ${lit(val.to)}`);
    }
  }
  const [fs, fn] = def.fact.split('.');
  const joins = src.dimensions
    .filter((d) => used.has(d.name))
    .map((d) => {
      const [ds, dn] = d.key.split('.');
      const on = d.association.mapping.map((m) => `f.${qi(m.from)} = ${qi(`d_${d.name}`)}.${qi(m.to)}`).join(' AND ');
      return `LEFT JOIN ${q.from ? q.from(d.key) : `${qi(ds)}.${qi(dn)}`} ${qi(`d_${d.name}`)} ON ${on}`;
    });
  const select = [...rows, ...measures];
  if (!select.length) throw new Error('Choose at least one measure or attribute.');
  const groups = q.rows.map((_, i) => String(i + 1));
  return `SELECT ${select.join(', ')}
FROM ${q.from ? q.from(def.fact) : `${qi(fs)}.${qi(fn)}`} f ${joins.join(' ')}${where.length ? `\nWHERE ${where.join(' AND ')}` : ''}${
    groups.length ? `\nGROUP BY ${groups.join(', ')} ORDER BY ${groups.join(', ')}` : ''}`;
}

/** Where to read distinct values of an attribute, for restricted measures and variable help. */
export function valuesSql(def: AnalyticModelDef, src: ModelSources, attribute: string): string {
  const a = attributeCatalog(def, src).find((x) => x.id === attribute);
  if (!a) throw new Error(`The model has no attribute ${attribute}.`);
  const key = a.dimension ? src.dimensions.find((d) => d.name === a.dimension)!.key : def.fact;
  const [s, n] = key.split('.');
  return `SELECT DISTINCT ${qi(a.column)} FROM ${qi(s)}.${qi(n)} WHERE ${qi(a.column)} IS NOT NULL ORDER BY 1 LIMIT 60`;
}

/** Objects a model reads: the fact and its dimensions (for impact and lineage). */
export const modelReads = (def: AnalyticModelDef) => [def.fact, ...def.dimensions];

// ---------------------------------------------------------------- persistence

const KEY = /^[A-Z0-9_]{1,20}\.[A-Z_][A-Z0-9_]{0,49}$/;
const ATTR = /^([A-Z_][A-Z0-9_]{0,49}\.)?[A-Za-z_][A-Za-z0-9_]{0,99}$/;
const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '');

export function sanitizeModel(d: unknown): AnalyticModelDef | undefined {
  if (!d || typeof d !== 'object') return undefined;
  const m = d as Record<string, unknown>;
  if (typeof m.fact !== 'string' || !KEY.test(m.fact)) return undefined;
  const arr = (v: unknown, n: number) => (Array.isArray(v) ? v.slice(0, n) : []);
  const measures: Measure[] = [];
  for (const x of arr(m.measures, 50) as Record<string, unknown>[]) {
    if (!x || typeof x !== 'object') continue;
    const name = str(x.name, 50);
    if (!NAME.test(name)) continue;
    if (x.type === 'Fact Source Measure' && ATTR.test(str(x.column))) {
      measures.push({ type: x.type, name, column: str(x.column), aggregation: AGGREGATIONS.includes(x.aggregation as Aggregation) ? (x.aggregation as Aggregation) : 'SUM' });
    } else if (x.type === 'Calculated Measure') {
      measures.push({ type: x.type, name, formula: str(x.formula, 500) });
    } else if (x.type === 'Restricted Measure' && ATTR.test(str(x.attribute))) {
      measures.push({ type: x.type, name, base: str(x.base, 50), attribute: str(x.attribute), values: arr(x.values, 60).map((v) => str(v, 100)) });
    } else if (x.type === 'Count Distinct' && ATTR.test(str(x.attribute))) {
      measures.push({ type: x.type, name, attribute: str(x.attribute) });
    }
  }
  const variables: Variable[] = [];
  for (const x of arr(m.variables, 20) as Record<string, unknown>[]) {
    if (!x || !NAME.test(str(x.name, 50)) || !ATTR.test(str(x.attribute))) continue;
    variables.push({ name: str(x.name, 50), type: 'Filter Variable', attribute: str(x.attribute), selection: x.selection === 'Interval' ? 'Interval' : 'Single Value', mandatory: !!x.mandatory });
  }
  return {
    fact: m.fact,
    dimensions: (arr(m.dimensions, 20) as unknown[]).filter((k): k is string => typeof k === 'string' && KEY.test(k)),
    attributes: (arr(m.attributes, 200) as unknown[]).filter((a): a is string => typeof a === 'string' && ATTR.test(a)),
    measures,
    variables,
  };
}
