import type { TenantState } from './tenant';
import { objectKey, type RepoObject } from './repo';

/**
 * Catalog (excursion, Handbuch 8.2): metadata, not data. The catalog extracts the objects of connected source systems
 * as assets. A catalog administrator enriches an asset with a description, glossary terms and tags and publishes it;
 * only then do catalog users find it. Glossary terms are defined once and published on their own.
 *
 * Simplified in the game: the training tenant is the only source system and is already connected; every deployed SQL view
 * and analytic model is an asset. KPIs, generated content and the Marketplace are info only (⚠ licence-dependent).
 */

export interface TagHierarchy {
  name: string;
  tags: string[];
}

/** Tag hierarchies of the catalog, set up by the catalog administrator (Calin). */
export const TAG_HIERARCHIES: TagHierarchy[] = [
  { name: 'Subject Area', tags: ['Billing', 'Consumption', 'Customers', 'Grid', 'Tariffs'] },
  { name: 'Layer', tags: ['Entry', 'Data & Semantic', 'Presentation'] },
];
export const ALL_TAGS = TAG_HIERARCHIES.flatMap((h) => h.tags.map((t) => `${h.name}/${t}`));

export interface GlossaryTermDef {
  id: string;
  name: string;
  definition: string;
  published: boolean;
  createdBy: string;
}

export interface AssetMeta {
  /** SPACE.NAME of the object. */
  key: string;
  description: string;
  /** Glossary term IDs. */
  terms: string[];
  /** "Hierarchy/Tag". */
  tags: string[];
  published: boolean;
}

export interface CatalogState {
  terms: GlossaryTermDef[];
  assets: AssetMeta[];
}

export const GLOSSARY_NAME = 'Rheinau Business Glossary';

export const defaultCatalog = (): CatalogState => ({
  terms: [{
    id: 'grid-area', name: 'Grid area', published: true, createdBy: 'Calin Mucea',
    definition: 'A part of the distribution network, run by one regional manager: NORTH, EAST, SOUTH or WEST.',
  }],
  assets: [],
});

/** The catalog's view of the tenant: every deployed SQL view and analytic model. */
export const catalogObjects = (t: TenantState): RepoObject[] =>
  t.objects.filter((o) => (o.kind === 'SQL View' || o.kind === 'Analytic Model') && !!o.deployed);

export function assetMeta(t: TenantState, key: string): AssetMeta {
  let a = t.catalog.assets.find((x) => x.key === key);
  if (!a) {
    a = { key, description: '', terms: [], tags: [], published: false };
    t.catalog.assets.push(a);
  }
  return a;
}

export const findAsset = (t: TenantState, key: string) => t.catalog.assets.find((x) => x.key === key);

/** Asset type as the catalog shows it. */
export const assetType = (o: RepoObject) => (o.kind === 'Analytic Model' ? 'Analytic Model' : `View (${o.deployed?.semanticUsage ?? o.semanticUsage})`);

export const termSlug = (name: string) => name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/** Free-text search over business name, technical name, description, terms and tags. */
export function matches(t: TenantState, o: RepoObject, q: string): boolean {
  if (!q) return true;
  const a = findAsset(t, objectKey(o));
  const terms = (a?.terms ?? []).map((id) => t.catalog.terms.find((x) => x.id === id)?.name ?? '');
  const hay = [o.businessName, o.name, o.space, a?.description ?? '', ...terms, ...(a?.tags ?? [])].join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

export function sanitizeCatalog(data: unknown): CatalogState {
  const c = defaultCatalog();
  if (!data || typeof data !== 'object') return c;
  const d = data as Partial<CatalogState>;
  const terms = (Array.isArray(d.terms) ? d.terms.slice(0, 50) : [])
    .filter((x) => x && typeof x.id === 'string' && /^[a-z0-9-]{1,60}$/.test(x.id) && typeof x.name === 'string')
    .map((x) => ({ id: x.id, name: x.name.slice(0, 80), definition: String(x.definition ?? '').slice(0, 1000), published: !!x.published, createdBy: String(x.createdBy ?? 'You').slice(0, 60) }));
  if (terms.length) c.terms = terms.some((x) => x.id === 'grid-area') ? terms : [...c.terms, ...terms];
  const ids = new Set(c.terms.map((x) => x.id));
  c.assets = (Array.isArray(d.assets) ? d.assets.slice(0, 200) : [])
    .filter((x) => x && typeof x.key === 'string' && /^[A-Z0-9_]{1,20}\.[A-Z_][A-Z0-9_]{0,49}$/.test(x.key))
    .map((x) => ({
      key: x.key, description: String(x.description ?? '').slice(0, 2000),
      terms: (Array.isArray(x.terms) ? x.terms : []).filter((id: unknown) => typeof id === 'string' && ids.has(id)).slice(0, 20),
      tags: (Array.isArray(x.tags) ? x.tags : []).filter((tag: unknown) => typeof tag === 'string' && ALL_TAGS.includes(tag)).slice(0, 20),
      published: !!x.published,
    }));
  return c;
}
