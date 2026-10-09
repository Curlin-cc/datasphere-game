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
  share: '<circle cx="4" cy="8" r="1.8"/><circle cx="12" cy="4" r="1.8"/><circle cx="12" cy="12" r="1.8"/><path d="M5.6 7.1l4.8-2.3M5.6 8.9l4.8 2.3"/>',
  table: '<rect x="2.5" y="3" width="11" height="10" rx="1"/><path d="M2.5 6.5h11M6.5 6.5V13"/>',
  view: '<path d="M1.8 8s2.3-4 6.2-4 6.2 4 6.2 4-2.3 4-6.2 4-6.2-4-6.2-4z"/><circle cx="8" cy="8" r="1.8"/>',
  menu: '<path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"/>',
  lock: '<rect x="3.5" y="7" width="9" height="6.5" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/>',
  back: '<path d="M10 3.5L5.5 8l4.5 4.5"/>',
  down: '<path d="M4 6l4 4 4-4"/>',
  info: '<circle cx="8" cy="8" r="5.8"/><path d="M8 7.2v4M8 5v.2"/>',
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
