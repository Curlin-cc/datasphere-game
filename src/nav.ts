/**
 * Locations for the Back button in the shellbar. A location is the open app plus the page inside it
 * (Data Builder: space picker → start page → editor; Security: Users/Roles; Transport: a package; …).
 * Apps with pages register a getter and a setter here; main.ts notes the location after every render and click
 * and goes back one location at a time, not one app.
 */

type Provider = {
  get: () => unknown;
  set: (loc: any) => void;
  /** Pages not worth returning to, e.g. an empty "new" editor that was saved under a name. */
  transient?: (loc: any) => boolean;
};

const providers = new Map<string, Provider>();

export function registerLocation(view: string, p: Provider) {
  providers.set(view, p);
}

export type Location = { view: string; page: unknown };

export function locationOf(view: string): Location {
  const p = providers.get(view);
  return { view, page: p ? structuredCloneSafe(p.get()) : null };
}

export function restoreLocation(loc: Location) {
  providers.get(loc.view)?.set(structuredCloneSafe(loc.page));
}

export function isTransient(loc: Location) {
  return providers.get(loc.view)?.transient?.(loc.page) ?? false;
}

export const sameLocation = (a: Location, b: Location) => JSON.stringify(a) === JSON.stringify(b);

function structuredCloneSafe<T>(v: T): T {
  return v === undefined || v === null ? v : JSON.parse(JSON.stringify(v));
}
