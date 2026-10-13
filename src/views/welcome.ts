import { ctx } from '../ctx';
import type { TenantState } from '../tenant';
import { esc, icon, ICONS, layerName, layerOf } from '../ui';

/**
 * Page type A of docs/design/README.md: "Welcome to the <App>" with a short text, then a grey area with an illustration
 * on the left and the space cards on the right (Data Builder, Data Integration Monitor, Connections, Business Builder).
 */

/** Simulated disk use of a space in MB, for the cards. Deterministic: base plus a share per object. */
export function usedMB(t: TenantState, space: string): number {
  const s = t.spaces.find((x) => x.id === space);
  if (s?.usedDiskGB) return Math.round(s.usedDiskGB * 1024);
  const n = t.objects.filter((o) => o.space === space).length;
  return Math.round(18.4 + n * 31.7 + (space.length % 5) * 6.3);
}

export const fmtSize = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(2)} MB`);

/** One space card: name, ID, "Disk for Storage:" with a thin bar. */
export function spaceCardHtml(t: TenantState, id: string, attrs: string) {
  const s = t.spaces.find((x) => x.id === id)!;
  const used = usedMB(t, id);
  const pct = Math.min(100, (used / (s.diskGB * 1024)) * 100);
  return `<button type="button" class="space-card" ${attrs}>
    <span class="sc-head"><b>${esc(s.name)}</b><span class="sc-id"><span class="chip" data-layer="${layerKey(id)}">${esc(id)}</span>${esc(layerName(id))} layer</span></span>
    <span class="sc-body"><small>Disk for Storage:</small><span>${fmtSize(used)} of ${s.diskGB} GB</span>
      <span class="bar ${s.locked ? 'over' : ''}"><i style="width:${Math.max(2, pct).toFixed(1)}%"></i></span></span>
  </button>`;
}

const layerKey = (id: string) => layerOf(id) ?? '';

/** Simple line drawing in the spirit of the real empty states (no SAP artwork): cubes and a folder. */
export const ILLUSTRATION = `<svg class="illu" viewBox="0 0 220 130" aria-hidden="true">
  <circle cx="70" cy="70" r="46" class="illu-bg"/><circle cx="160" cy="62" r="34" class="illu-bg"/>
  <path class="illu-line" d="M38 74l20-10 20 10v22l-20 10-20-10zM38 74l20 10 20-10M58 84v22"/>
  <path class="illu-line" d="M92 52h26l8 9h36v52H92z"/>
  <path class="illu-line" d="M150 66l14-7 14 7v15l-14 7-14-7zM150 66l14 7 14-7M164 73v15"/>
  <circle cx="58" cy="30" r="3" class="illu-dot"/><circle cx="190" cy="40" r="2.5" class="illu-dot"/><path class="illu-line" d="M120 32v8M116 36h8M176 104v6M173 107h6"/>
</svg>`;

export interface WelcomeOptions {
  title: string;
  text: string;
  /** Title and text next to the illustration, e.g. "Select a space". */
  emptyTitle: string;
  emptyText: string;
  /** Attributes per card, e.g. data-space="ID". */
  cardAttrs: (id: string) => string;
  /** Element ID of the card grid (tests and tutorials use it). */
  gridId: string;
}

export function welcomeSpacesHtml(o: WelcomeOptions) {
  const t = ctx.tenant();
  return `<div class="welcome-page">
    <header class="welcome-head"><h1>${esc(o.title)}</h1><p>${esc(o.text)}</p></header>
    <div class="welcome-body">
      <div class="welcome-empty">${ILLUSTRATION}<h2>${esc(o.emptyTitle)}</h2><p>${esc(o.emptyText)}</p></div>
      <section class="space-list" aria-label="Spaces">
        <div class="space-list-head"><h2>Spaces <span class="muted">(${t.spaces.length})</span></h2>
          <label class="search-field">${icon(ICONS.search)}<input type="search" placeholder="Search" data-space-search aria-label="Search spaces"></label></div>
        <div class="space-grid" id="${o.gridId}">${t.spaces.map((s) => spaceCardHtml(t, s.id, o.cardAttrs(s.id))).join('')}</div>
      </section>
    </div>
  </div>`;
}

/** Filters the space cards by the search field. */
export function bindSpaceSearch(root: HTMLElement) {
  const input = root.querySelector<HTMLInputElement>('[data-space-search]');
  input?.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    root.querySelectorAll<HTMLElement>('.space-card').forEach((c) => (c.hidden = !!q && !c.textContent!.toLowerCase().includes(q)));
  });
}
