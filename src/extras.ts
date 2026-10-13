import type { TenantState } from './tenant';
import { CAPACITY, assigned } from './tenant';
import { findObject, deploy, objectKey, type RepoObject } from './repo';
import type { TableDef } from './localtable';
import { exec } from './db';

/**
 * State and simulation for the apps that complete the tenant (Monitoring › System and Spaces, Capacities, Elastic Compute
 * Nodes; Catalog & Marketplace › Marketplace Data Products; Translation; Data Sharing Cockpit). Handbuch 1.6, 3.3.2, 8.3,
 * 8.4, 10.4. Most details are marked "not verified" in the Handbuch; they are simplified here and say so on the page.
 */

export type PerfClass = 'Memory' | 'Compute' | 'High Compute';

export interface EcnRun {
  start: string;
  end?: string;
  /** Billed block-hours of this run (at least one hour per block, simplified). */
  blockHours?: number;
}

export interface Ecn {
  name: string;
  /** Business name (SAP help: up to 30 characters); older saves have none. */
  businessName?: string;
  perf: PerfClass;
  blocks: number;
  /** Spaces whose persisted views and local tables the node serves while it runs. */
  spaces: string[];
  runs: EcnRun[];
}

export interface Installed {
  product: string;
  space: string;
  at: string;
  objects: string[];
}

export interface Translation {
  /** Language code, e.g. de. */
  lang: string;
  businessName: string;
  /** The English business name the translation was made for; differs from the current one = outdated. */
  source: string;
  /** Column, attribute and measure names: source name → translated text (SAP: "business names and column names"). */
  columns?: Record<string, string>;
}

export interface Provider {
  name: string;
  description: string;
  email: string;
}

export interface OwnProduct {
  id: string;
  name: string;
  description: string;
  space: string;
  objects: string[];
  contract: 'Free' | 'License Key';
  status: 'Draft' | 'Listed';
  licenses: { customer: string; key: string; at: string }[];
}

export interface ExtrasState {
  ecns: Ecn[];
  installed: Installed[];
  /** License keys activated on the Marketplace Data Products page (product ID → key). */
  licenses: Record<string, string>;
  /** Products whose provider has answered a license request (the key then shows on the product page). */
  requested: string[];
  /** Object key → translations, for objects added to translation. */
  translations: Record<string, Translation[]>;
  provider?: Provider;
  products: OwnProduct[];
}

export const emptyExtras = (): ExtrasState => ({ ecns: [], installed: [], licenses: {}, requested: [], translations: {}, products: [] });

// ---------------------------------------------------------------- monitoring

/** Block-hours included per month in the training tenant (simplified; real contracts differ). */
export const BLOCK_HOURS = 200;
export const PERF_INFO: Record<PerfClass, { vcpu: number; memGB: number }> = {
  Memory: { vcpu: 1, memGB: 16 }, Compute: { vcpu: 2, memGB: 16 }, 'High Compute': { vcpu: 4, memGB: 16 },
};

export const isRunning = (e: Ecn) => !!e.runs[0] && !e.runs[0].end;
export const usedBlockHours = (x: ExtrasState) => x.ecns.reduce((s, e) => s + e.runs.reduce((a, r) => a + (r.blockHours ?? 0), 0), 0);

/** Stops a node: bills the elapsed time, at least one hour (simplified). */
export function stopEcn(e: Ecn, at = new Date()) {
  const r = e.runs[0];
  if (!r || r.end) return;
  r.end = at.toISOString();
  const hours = Math.max(1, Math.ceil((at.getTime() - new Date(r.start).getTime()) / 3_600_000));
  r.blockHours = hours * e.blocks;
}

/** Disk use of the tenant in GB: data in spaces plus what the system keeps for itself (simulated, fixed). */
export function diskBreakdown(t: TenantState, usedMB: (t: TenantState, s: string) => number) {
  const spaces = t.spaces.reduce((s, sp) => s + usedMB(t, sp.id), 0) / 1024;
  return { spaces, other: 6.8, admin: 1.9, audit: 0.35, total: CAPACITY.diskGB };
}

/** Memory a space uses now (GB): persisted views and local tables live in memory (simulated). */
export function memoryUsedGB(t: TenantState, space: string) {
  const objs = t.objects.filter((o) => o.space === space);
  const heavy = objs.filter((o) => o.persisted || o.kind === 'Local Table').length;
  return Math.round((0.12 + objs.length * 0.04 + heavy * 0.21) * 100) / 100;
}

export const failedRuns = (t: TenantState, hours: number, now = Date.now()) =>
  t.runs.filter((r) => r.status === 'Failed' && now - new Date(r.start).getTime() <= hours * 3_600_000);

/** Capacity units per day, split into the blocks Capacities shows (simulated; real rates are per contract). */
export function dailyCU(t: TenantState, day: Date) {
  const used = assigned(t);
  const wobble = 1 + (((day.getUTCDate() * 37) % 11) - 5) / 100;
  const iso = day.toISOString().slice(0, 10);
  const runs = t.runs.filter((r) => r.start.slice(0, 10) === iso).length;
  const ecn = t.extras.ecns.reduce((s, e) => s + e.runs.filter((r) => r.start.slice(0, 10) === iso).reduce((a, r) => a + (r.blockHours ?? 0), 0), 0);
  const memory = Math.round((used.memoryGB * 1.05 * wobble + runs * 0.4 + ecn * 0.5) * 100) / 100;
  const disk = Math.round(used.diskGB * 0.031 * 100) / 100;
  const foundation = 9.6;
  return { memory, disk, foundation, total: Math.round((memory + disk + foundation) * 100) / 100 };
}

/** The days of a month up to today (this month) or the whole month (last month). */
export function monthDays(which: 'this' | 'last', today = new Date()) {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth() - (which === 'last' ? 1 : 0);
  const first = new Date(Date.UTC(y, m, 1));
  const last = which === 'this' ? today.getUTCDate() : new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Array.from({ length: last }, (_, i) => new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), i + 1)));
}

// ---------------------------------------------------------------- marketplace

export interface MarketProduct {
  id: string;
  name: string;
  provider: string;
  category: string;
  description: string;
  contract: 'Free' | 'License Key';
  /** The key the provider sends after a license request (external products). */
  key?: string;
  tables: { name: string; businessName: string; table: TableDef }[];
}

const days = (from: string, n: number) => Array.from({ length: n }, (_, i) => {
  const d = new Date(`${from}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + i);
  return d.toISOString().slice(0, 10);
});

export const MARKET: MarketProduct[] = [
  {
    id: 'mp-holidays', name: 'Public Holidays Germany 2026', provider: 'Open Data Collective', category: 'Calendar', contract: 'Free',
    description: 'Public holidays per federal state for 2026. Useful to explain consumption dips and to plan meter readings.',
    tables: [{ name: 'MP_PUBLIC_HOLIDAYS', businessName: 'Public Holidays Germany', table: {
      columns: [{ name: 'HOLIDAY_DATE', type: 'Date', key: true }, { name: 'STATE', type: 'String', key: true }, { name: 'HOLIDAY_NAME', type: 'String', key: false }],
      rows: [['2026-01-01', 'ALL', "New Year's Day"], ['2026-01-06', 'BW', 'Epiphany'], ['2026-04-03', 'ALL', 'Good Friday'], ['2026-04-06', 'ALL', 'Easter Monday'],
        ['2026-05-01', 'ALL', 'Labour Day'], ['2026-05-14', 'ALL', 'Ascension Day'], ['2026-05-25', 'ALL', 'Whit Monday'], ['2026-06-04', 'BW', 'Corpus Christi'],
        ['2026-10-03', 'ALL', 'Day of German Unity'], ['2026-11-01', 'BW', "All Saints' Day"], ['2026-12-25', 'ALL', 'Christmas Day'], ['2026-12-26', 'ALL', 'Boxing Day']],
    } }],
  },
  {
    id: 'mp-weather', name: 'Daily Weather Upper Rhine', provider: 'Klimadaten Sued GmbH', category: 'Weather', contract: 'License Key', key: 'KDS-4F7Q-2026',
    description: 'Daily mean temperature and heating degree days for the Upper Rhine region. Explains a large part of heat and gas consumption.',
    tables: [{ name: 'MP_WEATHER_DAILY', businessName: 'Daily Weather Upper Rhine', table: {
      columns: [{ name: 'WEATHER_DATE', type: 'Date', key: true }, { name: 'AVG_TEMP_C', type: 'Decimal', key: false }, { name: 'HEATING_DEGREE_DAYS', type: 'Decimal', key: false }],
      rows: days('2026-01-01', 21).map((d, i) => { const temp = Math.round((1.5 + Math.sin(i / 3) * 3.2) * 10) / 10; return [d, temp.toFixed(1), Math.max(0, 15 - temp).toFixed(1)]; }),
    } }],
  },
  {
    id: 'mp-prices', name: 'Electricity Day-Ahead Prices DE', provider: 'PowerData Exchange', category: 'Energy markets', contract: 'License Key', key: 'PDX-9M2K-2026',
    description: 'Daily average day-ahead price for the German bidding zone. Compare procurement cost with the tariffs you bill.',
    tables: [{ name: 'MP_DAY_AHEAD_PRICES', businessName: 'Day-Ahead Prices DE', table: {
      columns: [{ name: 'PRICE_DATE', type: 'Date', key: true }, { name: 'PRICE_EUR_MWH', type: 'Decimal', key: false }],
      rows: days('2026-01-01', 21).map((d, i) => [d, (82 + ((i * 29) % 37) - 12).toFixed(2)]),
    } }],
  },
];

/** External products plus the player's own listed products (they appear in the marketplace, but cannot be installed here). */
export function marketProducts(t: TenantState): (MarketProduct & { own?: boolean })[] {
  const own = t.extras.products.filter((p) => p.status === 'Listed').map((p) => ({
    id: p.id, name: p.name, provider: t.extras.provider?.name ?? 'Your organization', category: 'Own data product', description: p.description,
    contract: p.contract, tables: [], own: true,
  }));
  return [...MARKET, ...own];
}

/** Installs a product into a space: one local table per product table, deployed with its data. Returns an error or null. */
export async function installProduct(t: TenantState, p: MarketProduct, space: string): Promise<string | null> {
  if (!t.spaces.some((s) => s.id === space)) return 'Choose a target space.';
  if (p.contract === 'License Key' && t.extras.licenses[p.id] !== p.key) return 'This product needs a valid license key.';
  const sp = t.spaces.find((s) => s.id === space)!;
  if (sp.locked) return `${space} is locked. Unlock it in Space Management first.`;
  const now = new Date().toISOString();
  const made: string[] = [];
  for (const pt of p.tables) {
    const key = `${space}.${pt.name}`;
    const old = findObject(t, key);
    if (old) t.objects = t.objects.filter((o) => o !== old);
    const o: RepoObject = {
      space, name: pt.name, kind: 'Local Table', businessName: pt.businessName, semanticUsage: 'Relational Dataset',
      table: structuredClone(pt.table), status: 'not_deployed', changedAt: now,
    };
    t.objects.push(o);
    const err = await deploy(o);
    if (err) return err;
    made.push(objectKey(o));
  }
  t.extras.installed = [{ product: p.id, space, at: now, objects: made }, ...t.extras.installed.filter((i) => !(i.product === p.id && i.space === space))];
  return null;
}

export async function uninstallProduct(t: TenantState, inst: Installed) {
  for (const key of inst.objects) {
    const o = findObject(t, key);
    if (!o) continue;
    await exec(`DROP TABLE IF EXISTS "${o.space}"."${o.name}"`);
    t.objects = t.objects.filter((x) => x !== o);
    t.shares = t.shares.filter((s) => s.object !== key);
  }
  t.extras.installed = t.extras.installed.filter((i) => i !== inst);
}

// ---------------------------------------------------------------- translation and data sharing

export const LANGS: { code: string; label: string }[] = [
  { code: 'de', label: 'German' }, { code: 'fr', label: 'French' }, { code: 'it', label: 'Italian' },
];

/** Objects that carry texts for business users: views and analytic models. */
export const translatable = (o: RepoObject) => o.kind === 'SQL View' || o.kind === 'Analytic Model';

/**
 * Status as in SAP help ("Translating Metadata for SAP Analytics Cloud"): Translated when every target language has a current string,
 * Partially Translated when some have, Not Translated when none has. A string made for an older business name is expired and counts as missing.
 */
export function translationStatus(o: RepoObject, list: Translation[] | undefined): 'Not Added' | 'Not Translated' | 'Partially Translated' | 'Translated' {
  if (!list) return 'Not Added';
  const cols = translationColumns(o);
  // One language is complete when its business name is current and every column name has a text.
  const complete = LANGS.filter((g) => {
    const l = list.find((x) => x.lang === g.code && x.source === o.businessName && x.businessName);
    return !!l && cols.every((c) => l.columns?.[c]);
  }).length;
  const any = list.some((l) => (l.businessName && l.source === o.businessName) || Object.keys(l.columns ?? {}).length);
  return complete === LANGS.length ? 'Translated' : any ? 'Partially Translated' : 'Not Translated';
}

/** Column names to translate: the columns of a dimension or hierarchy view, the measures and fact attributes of an analytic model. */
export function translationColumns(o: RepoObject): string[] {
  const model = o.deployed?.model;
  if (o.kind === 'Analytic Model' && model) {
    return [...model.measures.map((m) => m.name), ...model.attributes.filter((a) => !a.includes('.'))];
  }
  return Object.keys(o.deployed?.columnRoles ?? o.columnRoles ?? {});
}

/**
 * What adding an analytic model brings into the Translation tool (SAP help: "the dimensions and hierarchies attached to added
 * Analytic Models are automatically selected"): its dimensions, also when they are shared from another space, and the hierarchies
 * associated with them.
 */
export function translationDependencies(t: TenantState, am: RepoObject): string[] {
  const dims = (am.deployed?.model ?? am.model)?.dimensions ?? [];
  const out = new Set<string>();
  for (const k of dims) {
    const d = findObject(t, k);
    if (!d) continue;
    out.add(k);
    for (const a of d.deployed?.associations ?? d.associations ?? []) {
      const h = findObject(t, a.target);
      if (h && (h.deployed?.semanticUsage ?? h.semanticUsage) === 'Hierarchy') out.add(a.target);
    }
  }
  return [...out];
}

/** Objects the Translation tool lists for a space: added there, or brought along by an analytic model added there. */
export function translationsIn(t: TenantState, space: string): RepoObject[] {
  const keys = new Set(Object.keys(t.extras.translations).filter((k) => k.split('.')[0] === space));
  for (const k of [...keys]) {
    const o = findObject(t, k);
    if (o?.kind === 'Analytic Model') for (const d of translationDependencies(t, o)) if (t.extras.translations[d]) keys.add(d);
  }
  return [...keys].map((k) => findObject(t, k)).filter((o): o is RepoObject => !!o);
}

export function licenseKey(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const part = (n: number) => n.toString(36).toUpperCase().padStart(4, '0').slice(-4);
  return `RHN-${part(h)}-${part(h * 7 + 13)}`;
}

/** Why an own product cannot be listed yet, or null. */
export function listError(t: TenantState, p: OwnProduct): string | null {
  if (!t.extras.provider) return 'Create your data provider profile first.';
  if (!p.objects.length) return 'Add at least one object.';
  if (p.description.trim().length < 20) return 'Write a description of at least 20 characters: consumers decide by it.';
  const notDeployed = p.objects.filter((k) => findObject(t, k)?.status !== 'deployed');
  if (notDeployed.length) return `Only deployed objects can be offered: ${notDeployed.join(', ')}.`;
  return null;
}

// ---------------------------------------------------------------- save game

export function sanitizeExtras(d: unknown, ids: Set<string>): ExtrasState {
  const x = emptyExtras();
  if (!d || typeof d !== 'object') return x;
  const e = d as Partial<ExtrasState>;
  const str = (v: unknown, max = 200) => String(v ?? '').slice(0, max);
  const spaces = (v: unknown) => (Array.isArray(v) ? v.map(String).filter((s) => ids.has(s)) : []);
  const keys = (v: unknown) => (Array.isArray(v) ? v.map(String).filter((k) => ids.has(k.split('.')[0])).slice(0, 50) : []);
  x.ecns = (Array.isArray(e.ecns) ? e.ecns : []).filter((n) => n && typeof n.name === 'string').slice(0, 10).map((n) => ({
    name: str(n.name, 30), ...(n.businessName ? { businessName: str(n.businessName, 30) } : {}), perf: (['Memory', 'Compute', 'High Compute'] as PerfClass[]).includes(n.perf) ? n.perf : 'Memory',
    blocks: Math.min(32, Math.max(1, Math.round(Number(n.blocks) || 4))), spaces: spaces(n.spaces),
    runs: (Array.isArray(n.runs) ? n.runs : []).slice(0, 30).map((r) => ({
      start: str(r?.start, 40), ...(r?.end ? { end: str(r.end, 40) } : {}), ...(Number(r?.blockHours) > 0 ? { blockHours: Number(r.blockHours) } : {}),
    })),
  }));
  x.installed = (Array.isArray(e.installed) ? e.installed : []).filter((i) => i && ids.has(i.space) && MARKET.some((p) => p.id === i.product))
    .map((i) => ({ product: i.product, space: i.space, at: str(i.at, 40), objects: keys(i.objects) }));
  if (e.licenses && typeof e.licenses === 'object') for (const [k, v] of Object.entries(e.licenses)) x.licenses[str(k, 40)] = str(v, 40);
  x.requested = (Array.isArray(e.requested) ? e.requested : []).map(String).slice(0, 20);
  if (e.translations && typeof e.translations === 'object') {
    for (const [k, list] of Object.entries(e.translations)) {
      if (!ids.has(k.split('.')[0]) || !Array.isArray(list)) continue;
      x.translations[k] = list.filter((l) => l && LANGS.some((g) => g.code === l.lang))
        .map((l) => {
          const cols: Record<string, string> = {};
          if (l.columns && typeof l.columns === 'object') {
            for (const [c, v] of Object.entries(l.columns).slice(0, 80)) if (typeof v === 'string' && v.trim()) cols[str(c, 80)] = str(v, 120);
          }
          return { lang: l.lang, businessName: str(l.businessName, 120), source: str(l.source, 120), ...(Object.keys(cols).length ? { columns: cols } : {}) };
        });
    }
  }
  if (e.provider && typeof e.provider === 'object' && e.provider.name) {
    x.provider = { name: str(e.provider.name, 60), description: str(e.provider.description, 500), email: str(e.provider.email, 80) };
  }
  x.products = (Array.isArray(e.products) ? e.products : []).filter((p) => p && typeof p.id === 'string' && ids.has(p.space)).slice(0, 20).map((p) => ({
    id: str(p.id, 40), name: str(p.name, 60), description: str(p.description, 600), space: p.space, objects: keys(p.objects),
    contract: p.contract === 'License Key' ? 'License Key' : 'Free', status: p.status === 'Listed' ? 'Listed' : 'Draft',
    licenses: (Array.isArray(p.licenses) ? p.licenses : []).slice(0, 30).map((l) => ({ customer: str(l?.customer, 60), key: str(l?.key, 40), at: str(l?.at, 40) })),
  }));
  return x;
}
