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
      <button class="btn small" type="button" id="ed-versions" ${o.versions?.enabled ? 'title="Version history: compare and restore deployed versions"' : `disabled title="${esc(o.versions?.why ?? 'Version history: only for SQL views in this game')}"`}>Versions</button>
      <button class="btn small primary" type="button" id="ed-details" aria-pressed="true" title="Show or hide the properties">Details</button>
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
