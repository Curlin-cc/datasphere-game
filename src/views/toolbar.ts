import { esc, icon, ICONS } from '../ui';

/**
 * Object toolbar of the Data Builder editors (docs/design/README.md C): back to the space, object title with status,
 * groups of icon buttons with a small group label, then "Versions" and "Details" on the right.
 * IDs of the buttons stay the same as before (tests and tutorials use them).
 */

export interface ToolButton {
  id: string;
  icon: string;
  label: string;
  title?: string;
  disabled?: boolean;
}

export interface ToolbarOptions {
  space: string;
  title: string;
  /** e.g. "SQL View · RHN_REP.RHN_REP_F_INVOICES" */
  sub: string;
  statusHtml: string;
  groups: { label: string; buttons: ToolButton[] }[];
  /** Text shown instead of the buttons, e.g. read-only. */
  note?: string;
  /** "Versions" works (SQL views in the excursions); otherwise the tooltip says why not. */
  versions?: { enabled: boolean; why?: string };
  /** Object pages (table, DAC) have no properties panel and so no "Details" button (Bild 30, 38). */
  details?: boolean;
  /** Analytic model (Bild 37): switch "Model · Preview" at the right. */
  mode?: 'model' | 'preview';
}

export function objectToolbar(o: ToolbarOptions) {
  const btn = (b: ToolButton) => `<button class="tb-btn" type="button" id="${b.id}" ${b.disabled ? 'disabled' : ''} title="${esc(b.title ?? b.label)}">
      ${icon(b.icon)}<span>${esc(b.label)}</span></button>`;
  return `<div class="ed-toolbar">
      <button class="tb-back" type="button" id="ed-back" title="Back to ${esc(o.space)}" aria-label="Back to ${esc(o.space)}">${icon(ICONS.back)}</button>
      <div class="ed-title"><b id="ed-title-text">${esc(o.title)}</b><small>${esc(o.sub)}</small></div>
      ${o.statusHtml}
      ${o.note ? `<span class="muted tb-note">${esc(o.note)}</span>` : ''}
      ${o.groups.map((g) => `<div class="tb-group"><small>${esc(g.label)}</small><div>${g.buttons.map(btn).join('')}</div></div>`).join('')}
      <span class="spacer"></span>
      ${o.details === false ? '' : `<button class="btn small" type="button" id="ed-versions" ${o.versions?.enabled ? 'title="Version history: compare and restore deployed versions"' : `disabled title="${esc(o.versions?.why ?? 'Version history: only for SQL views in this game')}"`}>Versions</button>`}
      ${o.details === false ? '' : '<button class="btn small primary" type="button" id="ed-details" aria-pressed="true" title="Show or hide the properties">Details</button>'}
      ${o.mode ? `<span class="seg" role="group" aria-label="Model or Preview">
        <button type="button" id="ed-mode-model" aria-pressed="${o.mode === 'model'}">Model</button>
        <button type="button" id="ed-mode-preview" aria-pressed="${o.mode === 'preview'}">Preview</button></span>` : ''}
    </div>`;
}

/** "Details" shows and hides the properties panel. */
export function bindDetails(root: HTMLElement) {
  const b = root.querySelector<HTMLButtonElement>('#ed-details');
  const page = root.querySelector<HTMLElement>('.editor-page');
  b?.addEventListener('click', () => {
    const hidden = page?.classList.toggle('no-props');
    b.setAttribute('aria-pressed', String(!hidden));
    b.classList.toggle('primary', !hidden);
  });
}

/** Blue head of the properties panel, like "Model Properties" in the real editor. */
export const propsHead = (title: string, objIcon: string, name: string) => `<div class="props-head"><span>${esc(title)}</span></div>
  <div class="props-title">${icon(objIcon)}<b>${esc(name)}</b></div>`;

/**
 * Object page (Bild 30 table, Bild 38 DAC): a head with icon, business and technical name, then anchor tabs over sections
 * that stay on one scrolling page (General · Columns · …). A tab scrolls to its section; scrolling marks the tab in view.
 */
export interface PageSection {
  id: string;
  label: string;
  html: string;
  /** Extra controls at the right of the section title. */
  actions?: string;
}

export function objectPage(objIcon: string, title: string, technical: string, sections: PageSection[]) {
  return `<div class="obj-page" id="obj-page">
      <header class="obj-head">${icon(objIcon)}<div><h1>${esc(title)}</h1><div class="obj-tech">${esc(technical)}</div></div></header>
      <nav class="obj-tabs" role="tablist">${sections.map((s, i) => `<button type="button" role="tab" data-anchor="${s.id}" aria-selected="${i === 0}">${esc(s.label)}</button>`).join('')}</nav>
      ${sections.map((s) => `<section class="obj-sec" id="${s.id}" data-sec-of="${s.id}">
        <div class="obj-sec-head"><h2>${esc(s.label)}</h2>${s.actions ?? ''}</div>
        <div class="obj-panel">${s.html}</div></section>`).join('')}
    </div>`;
}

export function bindObjectPage(root: HTMLElement) {
  const page = root.querySelector<HTMLElement>('#obj-page');
  if (!page) return;
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('.obj-tabs [data-anchor]')];
  const mark = (id: string) => tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.anchor === id)));
  tabs.forEach((b) => b.addEventListener('click', () => {
    mark(b.dataset.anchor!);
    const sec = page.querySelector<HTMLElement>(`#${b.dataset.anchor}`);
    const bar = page.querySelector<HTMLElement>('.obj-tabs');
    if (sec) page.scrollTo({ top: sec.offsetTop - (bar?.offsetHeight ?? 0) - 8, behavior: 'smooth' });
  }));
  page.addEventListener('scroll', () => {
    const bar = page.querySelector<HTMLElement>('.obj-tabs')!.offsetHeight;
    const secs = [...page.querySelectorAll<HTMLElement>('.obj-sec')];
    const cur = secs.filter((s) => s.offsetTop - bar - 24 <= page.scrollTop).pop() ?? secs[0];
    if (cur) mark(cur.id);
  }, { passive: true });
}
