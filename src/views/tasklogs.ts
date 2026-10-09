import { ctx } from '../ctx';
import type { Run } from '../integration';
import { fmtMs } from '../perf';
import { esc, fmtDate } from '../ui';
import { stepTable, bindStepLinks } from './monitor';

/**
 * Monitoring › Task Logs (chapter 10, Handbuch 10.5): every task run of the tenant across all spaces, with filters for
 * status and space. The Data Integration Monitor always shows one space; this list shows them all. Durations are simulated
 * for production volume where the game knows them.
 */

let status: 'all' | Run['status'] = 'all';
let space = 'all';
let selected = '';

const ACTIVITY: Record<Run['kind'], string> = {
  'Replication Flow': 'Run', 'Remote Table': 'Load Snapshot', View: 'Persist', 'Task Chain': 'Run',
};
const TYPE: Record<Run['kind'], string> = {
  'Replication Flow': 'Replication Flow', 'Remote Table': 'Remote Table', View: 'View', 'Task Chain': 'Task Chain',
};

export function renderTaskLogs(main: HTMLElement) {
  const t = ctx.tenant();
  const list = t.runs.filter((r) => (status === 'all' || r.status === status) && (space === 'all' || r.object.startsWith(`${space}.`)));
  const sel = t.runs.find((r) => r.id === selected);
  const statusChip = (r: Run) => `<span class="status" data-status="${r.status === 'Failed' ? 'failed' : r.status === 'Running' ? 'running' : 'deployed'}">${r.status}</span>`;
  main.innerHTML = `
    <div class="view-head">
      <div><h1 class="view-title">Task Logs</h1>
        <p class="view-lead">Every run of every space: flows, snapshots, persistence and task chains. Open a run to read its messages.</p></div>
    </div>
    <div class="repo-filters" id="tasklog-filters">
      <label>Status <select id="tl-status">${(['all', 'Failed', 'Running', 'Completed'] as const).map((s) => `<option value="${s}" ${status === s ? 'selected' : ''}>${s === 'all' ? 'All' : s}</option>`).join('')}</select></label>
      <label>Space <select id="tl-space"><option value="all">All spaces</option>${t.spaces.map((s) => `<option value="${esc(s.id)}" ${space === s.id ? 'selected' : ''}>${esc(s.id)}</option>`).join('')}</select></label>
      <span class="muted">${list.length} of ${t.runs.length} runs</span>
    </div>
    <section class="panel">
      <div class="table-scroll"><table class="grid" id="tasklog-list">
        <thead><tr><th>Start Time</th><th>Object</th><th>Space</th><th>Type</th><th>Activity</th><th>Status</th><th class="num">Records</th><th class="num">Duration</th></tr></thead>
        <tbody>${list.length ? list.map((r) => `<tr class="${r.id === selected ? 'selected' : ''}" data-log-row="${esc(r.object)}">
          <td><button type="button" class="link-btn" data-log="${esc(r.id)}">${fmtDate(r.start)}</button></td>
          <td class="mono">${esc(r.object.split('.')[1])}</td><td class="mono">${esc(r.object.split('.')[0])}</td>
          <td>${TYPE[r.kind]}</td><td>${ACTIVITY[r.kind]}</td><td>${statusChip(r)}</td>
          <td class="num">${r.records.toLocaleString('en-US')}</td><td class="num">${r.ms ? fmtMs(r.ms) : '–'}</td></tr>`).join('')
          : '<tr><td colspan="8" class="muted">No runs match the filters.</td></tr>'}</tbody>
      </table></div>
      <p class="muted">Durations are simulated for production volume; runs before chapter 9 have none. How long logs are kept is set in System › Configuration › Task Logs.</p>
    </section>
    ${sel ? `<section class="panel" id="tasklog-detail"><div class="table-head"><h3>${esc(sel.object.split('.')[1])} <small class="muted">${esc(sel.kind)} · ${fmtDate(sel.start)}</small></h3></div>
      ${sel.steps?.length ? stepTable(sel) : `<ol class="run-log">${sel.messages.map((m) => `<li class="${/fail|cannot|locked|not valid|stopped/i.test(m) ? 'err' : ''}">${esc(m)}</li>`).join('')}</ol>`}</section>` : ''}`;
  main.querySelector<HTMLSelectElement>('#tl-status')!.addEventListener('change', (e) => {
    status = (e.target as HTMLSelectElement).value as typeof status;
    ctx.track(`tasklogs-status:${status}`);
    renderTaskLogs(main);
  });
  main.querySelector<HTMLSelectElement>('#tl-space')!.addEventListener('change', (e) => {
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
