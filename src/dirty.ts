import { ctx } from './ctx';
import { TRACK_EVENT } from './tutorial';

/**
 * Dirty tracking for guided mode (review of #13): guided mode must not open anything over unsaved work, but must still
 * auto-open when an editor is open without changes. Every time a page is drawn into #main (its children are replaced),
 * a snapshot of its form state is taken; Save and Deploy take a new one. Unsaved = the form state differs from the snapshot.
 * Covers every editor page, including the Data Builder editors (SQL, table, DAC, model, flows), Business Builder and Security.
 * Search and filter boxes and the Data Preview area (.results) do not count. An open dialog with a form (e.g. Create User) always counts as unsaved.
 */
const IGNORE = 'input[type="search"], [id*="search" i], [id*="filter" i], [data-filter], [name="set-theme"], [name="set-names"]';

function signature(): string {
  const main = document.querySelector('#main');
  if (!main) return '';
  const fields = [...main.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea')]
    .filter((f) => !f.matches(IGNORE) && !f.closest('.results'))
    .map((f) => (f instanceof HTMLInputElement && (f.type === 'checkbox' || f.type === 'radio') ? (f.checked ? '1' : '0') : f.value));
  // Rows and columns added by buttons change the number of fields; the SQL text lives in CodeMirror. Plain table rows and
  // list items are not counted: pages fill them in after drawing (e.g. the column list of a source table), which is no change.
  return JSON.stringify([fields, ctx.editor?.getValue() ?? null, main.querySelectorAll('[data-node]').length]);
}

let base = '';
/** The SQL editor of the snapshot: a page may mount its editor after the snapshot, which is not a change by the player. */
let baseEditor: unknown = null;
let timer = 0;
let editorWatch = 0;
const take = () => {
  base = signature();
  baseEditor = ctx.editor;
};
const snapshot = (delay = 60) => {
  clearTimeout(timer);
  timer = window.setTimeout(take, delay);
};

export function initDirtyTracking() {
  const main = document.querySelector('#main');
  if (!main) return;
  new MutationObserver(() => snapshot()).observe(main, { childList: true });
  snapshot();
  // A newly mounted SQL editor (pages mount it after drawing) starts a new snapshot right away.
  clearInterval(editorWatch);
  editorWatch = window.setInterval(() => ctx.editor !== baseEditor && take(), 100);
}

window.addEventListener(TRACK_EVENT, (e) => {
  const ev = (e as CustomEvent<string>).detail;
  if (/^(save|deploy|assign|unassign):/.test(ev)) snapshot(200);
});

/** True when the page in #main holds changes that were not saved (or a form dialog is open). */
export function pageUnsaved(): boolean {
  if (document.querySelector('.guide-overlay form input:not([readonly]), .guide-overlay form select, .guide-overlay form textarea')
    && !document.querySelector('.settings-dlg')) return true;
  return base !== '' && signature() !== base;
}
