import { ctx } from '../ctx';
import type { Run } from '../integration';
import { esc, icon, ICONS } from '../ui';
import { stepTable, bindStepLinks } from './monitor';

/**
 * Monitoring › Task Logs (chapter 10, Handbuch 10.5): every task run of the tenant across all spaces, with filters for
 * status and space. The Data Integration Monitor always shows one space; this list shows them all. Durations are simulated
 * for production volume where the game knows them.
 */

let status: 'all' | Run['status'] = 'all';
let space = 'all';
let selected = '';

/** Activity and object type as the real Task Logs show them (Bild 1): technical names in capitals. */
const ACTIVITY: Record<Run['kind'], string> = {
  'Replication Flow': 'RUN', 'Remote Table': 'REPLICATE', View: 'PERSIST', 'Task Chain': 'RUN_CHAIN',
};
const TYPE: Record<Run['kind'], string> = {
  'Replication Flow': 'REPLICATION_FLOWS', 'Remote Table': 'REMOTE_TABLES', View: 'VIEWS', 'Task Chain': 'TASK_CHAINS',
};
const STATUS_CLASS: Record<Run['status'], string> = { Failed: 'bad', Running: 'run', Completed: 'ok' };

/** "Oct 2, 2026, 11:55:56", as in the tenant. */
const longDate = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' });
};
/** 00:01:04 */
const hms = (ms: number) => {
  const sec = Math.max(1, Math.round(ms / 1000));
  return [Math.floor(sec / 3600), Math.floor((sec % 3600) / 60), sec % 60].map((n) => String(n).padStart(2, '0')).join(':');
};

let filtersOpen = true;

export function renderTaskLogs(main: HTMLElement) {
  const t = ctx.tenant();
  const list = t.runs.filter((r) => (status === 'all' || r.status === status) && (space === 'all' || r.object.startsWith(`${space}.`)));
  const sel = t.runs.find((r) => r.id === selected);
  main.classList.add('bleed');
  main.innerHTML = `
    <div class="mon-page">
      <header class="mon-head">
        <h1 class="view-title">Task Logs</h1>
        ${filtersOpen ? `<div class="mon-filters" id="tasklog-filters">
          <label>Date and Time Range <select disabled title="All runs of the training tenant"><option>All</option></select></label>
          <label>Spaces <select id="tl-space"><option value="all">All</option>${t.spaces.map((s) => `<option value="${esc(s.id)}" ${space === s.id ? 'selected' : ''}>${esc(s.id)}</option>`).join('')}</select></label>
          <label>Statuses <select id="tl-status">${(['all', 'Failed', 'Running', 'Completed'] as const).map((s) => `<option value="${s}" ${status === s ? 'selected' : ''}>${s === 'all' ? 'All' : s.toUpperCase()}</option>`).join('')}</select></label>
          <label>Space Storage Type <select disabled><option>SAP HANA Database</option></select></label>
        </div>` : ''}
        <button type="button" class="mon-collapse" id="tl-collapse" aria-label="${filtersOpen ? 'Hide' : 'Show'} filters" aria-expanded="${filtersOpen}">${icon(filtersOpen ? '<path d="M4 10l4-4 4 4"/>' : ICONS.down)}</button>
      </header>
      <section class="mon-body">
        <div class="panel mon-table">
          <div class="mon-table-head"><h3>Task Logs (${list.length})</h3><span class="spacer"></span>
            <button type="button" class="text-act" disabled>Cancel Task</button>
            <button type="button" class="text-act" id="tl-refresh">Refresh</button>
            <button type="button" class="tb-icon" disabled title="Settings">${icon(ICONS.gear)}</button></div>
          <div class="table-scroll"><table class="grid" id="tasklog-list">
            <thead><tr><th>Start Date and Time</th><th>Object Name</th><th>Object Type</th><th>Space Name</th><th>Space Storage Type</th><th>Activity</th><th>Status</th><th class="num">Records</th><th class="num">Duration</th></tr></thead>
            <tbody>${list.length ? list.map((r) => `<tr class="${r.id === selected ? 'selected' : ''}" data-log-row="${esc(r.object)}">
              <td><button type="button" class="link-btn" data-log="${esc(r.id)}">${longDate(r.start)}</button></td>
              <td class="mono">${esc(r.object.split('.')[1])}</td><td>${TYPE[r.kind]}</td><td class="mono">${esc(r.object.split('.')[0])}</td>
              <td>SAP HANA Database</td><td class="act">${ACTIVITY[r.kind]}</td><td><span class="st-text ${STATUS_CLASS[r.status]}">${r.status.toUpperCase()}</span></td>
              <td class="num">${r.records ? r.records.toLocaleString('en-US') : ''}</td><td class="num">${r.ms ? hms(r.ms) : ''}</td></tr>`).join('')
              : '<tr><td colspan="9" class="muted">No runs match the filters.</td></tr>'}</tbody>
          </table></div>
          <p class="muted mon-note">Every run of every space. Click the start time to read its messages. Durations are simulated for production volume; runs before chapter 9 have none.</p>
        </div>
        ${sel ? `<div class="panel mon-table" id="tasklog-detail"><div class="mon-table-head"><h3>${esc(sel.object.split('.')[1])} <small class="muted">${TYPE[sel.kind]} · ${longDate(sel.start)}</small></h3></div>
          ${sel.steps?.length ? stepTable(sel) : `<ol class="run-log">${sel.messages.map((m) => `<li class="${/fail|cannot|locked|not valid|stopped/i.test(m) ? 'err' : ''}">${esc(m)}</li>`).join('')}</ol>`}</div>` : ''}
      </section>
    </div>`;
  main.querySelector('#tl-collapse')!.addEventListener('click', () => {
    filtersOpen = !filtersOpen;
    renderTaskLogs(main);
  });
  main.querySelector('#tl-refresh')!.addEventListener('click', () => renderTaskLogs(main));
  main.querySelector<HTMLSelectElement>('#tl-status')?.addEventListener('change', (e) => {
    status = (e.target as HTMLSelectElement).value as typeof status;
    ctx.track(`tasklogs-status:${status}`);
    renderTaskLogs(main);
  });
  main.querySelector<HTMLSelectElement>('#tl-space')?.addEventListener('change', (e) => {
    space = (e.target as HTMLSelectElement).value;
    ctx.track(`tasklogs-space:${space}`);
    renderTaskLogs(main);
  });
  main.querySelectorAll<HTMLButtonElement>('[data-log]').forEach((b) =>
    b.addEventListener('click', () => {
      selected = b.dataset.log!;
      const r = t.runs.find((x) => x.id === selected);
      if (r) ctx.track(`tasklog-open:${r.object}`);
      renderTaskLogs(main);
    }),
  );
  bindStepLinks(main);
}
