/** Small helpers shared by all views. */

export const esc = (v: unknown) =>
  String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const LAYER_ORDER = ['in', 'ha', 'rep', undefined];

/** Space ID → layer key for colour coding. */
export function layerOf(space: string): 'in' | 'ha' | 'rep' | undefined {
  if (space.endsWith('_IN')) return 'in';
  if (space.endsWith('_HARM')) return 'ha';
  if (space.endsWith('_REP')) return 'rep';
  return undefined;
}

const LAYER_NAMES = { in: 'Inbound', ha: 'Harmonization', rep: 'Reporting' } as const;

export const layerName = (space: string) => {
  const l = layerOf(space);
  return l ? LAYER_NAMES[l] : 'Unassigned';
};

export const spaceChip = (id: string) => `<span class="chip" data-layer="${layerOf(id) ?? ''}">${esc(id)}</span>`;

export const icon = (paths: string, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 16 16" aria-hidden="true">${paths}</svg>`;

export const ICONS = {
  importIc: '<rect x="2.5" y="2.5" width="9" height="9" rx="1.5"/><path d="M5 7l2 2 3.5-4M11.5 10v3.5H2.5"/>',
  chain: '<rect x="2" y="2.5" width="5" height="4" rx="1"/><rect x="9" y="9.5" width="5" height="4" rx="1"/><path d="M4.5 6.5v5H9"/>',
  share: '<circle cx="4" cy="8" r="1.8"/><circle cx="12" cy="4" r="1.8"/><circle cx="12" cy="12" r="1.8"/><path d="M5.6 7.1l4.8-2.3M5.6 8.9l4.8 2.3"/>',
  table: '<rect x="2.5" y="3" width="11" height="10" rx="1"/><path d="M2.5 6.5h11M6.5 6.5V13"/>',
  view: '<path d="M1.8 8s2.3-4 6.2-4 6.2 4 6.2 4-2.3 4-6.2 4-6.2-4-6.2-4z"/><circle cx="8" cy="8" r="1.8"/>',
  menu: '<path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"/>',
  lock: '<rect x="3.5" y="7" width="9" height="6.5" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/>',
  back: '<path d="M10 3.5L5.5 8l4.5 4.5"/>',
  down: '<path d="M4 6l4 4 4-4"/>',
  remote: '<rect x="2.5" y="3" width="11" height="10" rx="1"/><path d="M2.5 6.5h11M8 8.5v3M6.5 10l1.5 1.5 1.5-1.5"/>',
  flow: '<circle cx="3.5" cy="8" r="1.6"/><circle cx="12.5" cy="8" r="1.6"/><path d="M5.1 8h5.8M9 6l2 2-2 2"/>',
  info: '<circle cx="8" cy="8" r="5.8"/><path d="M8 7.2v4M8 5v.2"/>',
  book: '<path d="M3 3.5h3.5A1.5 1.5 0 018 5v8a1.5 1.5 0 00-1.5-1.5H3zM13 3.5H9.5A1.5 1.5 0 008 5v8a1.5 1.5 0 011.5-1.5H13z"/>',
  help: '<circle cx="8" cy="8" r="5.8"/><path d="M6.3 6.4a1.8 1.8 0 113 1.4c-.8.5-1.3.9-1.3 1.7M8 11.2v.2"/>',
  theme: '<path d="M12.5 9.5A5 5 0 016.5 3.5a5 5 0 106 6z"/>',
  grid: '<circle cx="4" cy="4" r=".9"/><circle cx="8" cy="4" r=".9"/><circle cx="12" cy="4" r=".9"/><circle cx="4" cy="8" r=".9"/><circle cx="8" cy="8" r=".9"/><circle cx="12" cy="8" r=".9"/><circle cx="4" cy="12" r=".9"/><circle cx="8" cy="12" r=".9"/><circle cx="12" cy="12" r=".9"/>',
  right: '<path d="M6 3.5L10.5 8 6 12.5"/>',
  search: '<circle cx="7" cy="7" r="4.2"/><path d="M10.2 10.2l3.3 3.3"/>',
  filter: '<path d="M2.5 3.5h11l-4.3 5v4l-2.4 1.2V8.5z"/>',
  plus: '<path d="M8 3v10M3 8h10"/>',
  star: '<path d="M8 2.5l1.7 3.5 3.8.5-2.8 2.6.7 3.8L8 11.1l-3.4 1.8.7-3.8-2.8-2.6 3.8-.5z"/>',
  folder: '<path d="M2.5 4.5h4l1.2 1.5h5.8v6.5h-11z"/>',
  save: '<path d="M3 3h8l2 2v8H3zM5.5 3v3h4V3M5 13V9h6v4"/>',
  deploy: '<path d="M8 11V3M5 6l3-3 3 3M3 10.5V13h10v-2.5"/>',
  preview: '<rect x="2.5" y="3" width="11" height="10" rx="1"/><path d="M2.5 6.5h11M6.5 6.5V13M10 6.5V13"/>',
  edit: '<path d="M3 13l1-3.5L10.5 3 13 5.5 6.5 12z"/>',
  trash: '<path d="M3.5 4.5h9M6 4.5V3h4v1.5M4.5 4.5l.7 8.5h5.6l.7-8.5"/>',
  sort: '<path d="M5 3v10M3 11l2 2 2-2M11 13V3M9 5l2-2 2 2"/>',
  gear: '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.8v2M8 12.2v2M1.8 8h2M12.2 8h2M3.6 3.6L5 5M11 11l1.4 1.4M3.6 12.4L5 11M11 5l1.4-1.4"/>',
  list: '<path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.5M2.5 8h.5M2.5 12h.5"/>',
  globe: '<circle cx="8" cy="8" r="5.8"/><path d="M2.2 8h11.6M8 2.2c1.6 1.6 2.4 3.6 2.4 5.8S9.6 12.2 8 13.8M8 2.2C6.4 3.8 5.6 5.8 5.6 8s.8 4.2 2.4 5.8"/>',
  check: '<path d="M3.5 8.5l3 3 6-7"/>',
  cube: '<path d="M8 2l5.5 3v6L8 14l-5.5-3V5zM2.5 5L8 8l5.5-3M8 8v6"/>',
};

/** Modal form used by all dialogs. */
export function openDialog(title: string, body: string, cls = '') {
  document.querySelector('.guide-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'guide-overlay';
  overlay.innerHTML = `<form class="guide panel dialog ${cls}" role="dialog" aria-modal="true" aria-labelledby="dlg-title" novalidate>
      <h2 id="dlg-title">${esc(title)}</h2>${body}</form>`;
  document.body.append(overlay);
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', (e) => e.target === overlay && close());
  overlay.querySelectorAll('[data-act="cancel"]').forEach((b) => b.addEventListener('click', close));
  return { form: overlay.querySelector<HTMLFormElement>('form')!, close };
}

/** Content right of the app name in the shellbar (breadcrumb: space, object). Cleared on every view change. */
export function setCrumb(html: string) {
  const el = document.querySelector<HTMLElement>('#shell-crumb');
  if (el) el.innerHTML = html;
}

/** Short message at the bottom of the screen, e.g. "Deployed". */
export function toast(text: string, kind: 'ok' | 'error' | 'info' = 'ok') {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.setAttribute('role', 'status');
  el.textContent = text;
  document.body.append(el);
  setTimeout(() => el.remove(), 3200);
}

export function resultTable(columns: string[], rows: unknown[][]) {
  const MAX = 500;
  const shown = rows.slice(0, MAX);
  return `<table class="grid">
    <thead><tr>${columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${shown
      .map(
        (r) =>
          `<tr>${r
            .map((v) =>
              v === null || v === undefined
                ? '<td class="null">null</td>'
                : `<td class="${typeof v === 'number' ? 'num' : ''}">${esc(Array.isArray(v) ? JSON.stringify(v) : v)}</td>`,
            )
            .join('')}</tr>`,
      )
      .join('')}</tbody>
  </table>${rows.length > MAX ? `<div class="placeholder">Showing the first ${MAX} of ${rows.length} rows.</div>` : ''}`;
}

export const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 16).replace('T', ' ');
};

/** A browser preference (theme, name display). Storage can be blocked: then the choice lasts for this visit only. */
const prefMemory: Record<string, string> = {};
export function readUiPref(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? prefMemory[key] ?? null;
  } catch {
    return prefMemory[key] ?? null;
  }
}
export function writeUiPref(key: string, value: string) {
  prefMemory[key] = value;
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}
/** Name shown first in object lists: business name, or technical name (Settings › UI Settings). */
export const shownName = (o: { name: string; businessName: string }) =>
  readUiPref('dsg-names') === 'technical' ? o.name : o.businessName;
