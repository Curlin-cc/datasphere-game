import { ctx } from '../ctx';
import { objectKey, type RepoObject } from '../repo';
import {
  runFlow, truncateRisk, runsOf, lastRun, lockError, addRun, countRows, remoteQueries, createRemoteView,
  type Frequency, type Run,
} from '../integration';
import { spaceSelect } from './connections';
import { esc, openDialog, toast, fmtDate } from '../ui';

/**
 * Data Integration Monitor: always one space. Monitors for remote tables, local tables, views, flows,
 * remote queries and task chains. Remote tables and flows are interactive; the others explain themselves.
 */

type Tab = 'remote' | 'local' | 'views' | 'flows' | 'queries' | 'chains';
let tab: Tab = 'remote';
let selectedRemote = '';
let selectedFlow = '';
let selectedRun = '';

const TABS: { id: Tab; label: string }[] = [
  { id: 'remote', label: 'Remote Tables' },
  { id: 'local', label: 'Local Tables' },
  { id: 'views', label: 'Views' },
  { id: 'flows', label: 'Flows' },
  { id: 'queries', label: 'Remote Queries' },
  { id: 'chains', label: 'Task Chains' },
];

/** For tutorials and links from other apps. */
export function monitorTo(target: Tab, flow?: string) {
  tab = target;
  if (flow) selectedFlow = flow;
}

const runChip = (r?: Pick<Run, 'status'>) =>
  r ? `<span class="status" data-status="${r.status === 'Failed' ? 'failed' : r.status === 'Running' ? 'running' : 'deployed'}">${r.status}</span>` : '<span class="muted">Never run</span>';

export function renderMonitor(main: HTMLElement) {
  const t = ctx.tenant();
  const space = t.activeSpace;
  main.innerHTML = `
    <div class="view-head">
      <div><h1 class="view-title">Data Integration Monitor</h1>
        <p class="view-lead">Run, schedule and watch everything that moves data into this space. The monitor always shows one space.</p></div>
      ${spaceSelect('mon-space', space)}
    </div>
    ${t.consent ? '' : `<div class="consent-banner" id="consent-banner" role="note">
        <span>Scheduled tasks run in your name. To schedule tasks, authorize the job scheduling first.</span>
        <button class="btn small" type="button" id="consent-give">Give consent</button></div>`}
    <div class="tabs" role="tablist" id="mon-tabs">
      ${TABS.map((x) => `<button type="button" role="tab" data-mon-tab="${x.id}" aria-selected="${tab === x.id}">${x.label}</button>`).join('')}
    </div>
    <div id="mon-body"></div>`;
  main.querySelector<HTMLSelectElement>('#mon-space')!.addEventListener('change', (e) => {
    t.activeSpace = (e.target as HTMLSelectElement).value;
    ctx.track(`space:monitor:${t.activeSpace}`);
    ctx.save();
    renderMonitor(main);
  });
  main.querySelector('#consent-give')?.addEventListener('click', () => {
    t.consent = true;
    ctx.track('consent');
    ctx.save();
    toast('Consent given. Scheduled tasks can now run in your name.');
    renderMonitor(main);
  });
  main.querySelectorAll<HTMLButtonElement>('[data-mon-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      tab = b.dataset.monTab as Tab;
      ctx.track(`monitor:${tab}`);
      renderMonitor(main);
    }),
  );
  const host = main.querySelector<HTMLElement>('#mon-body')!;
  const redraw = () => renderMonitor(main);
  if (tab === 'remote') remoteTab(host, redraw);
  else if (tab === 'flows') flowsTab(host, redraw);
  else if (tab === 'queries') queriesTab(host);
  else if (tab === 'local') localTab(host);
  else host.innerHTML = `<section class="panel"><p class="muted">${tab === 'views'
    ? 'Views you persist show up here: run or schedule the persistence, remove it, and analyze views with the View Analyzer. You decide what to persist in chapter 9.'
    : 'Task chains run several loads in a fixed order and show each step with its log. You build your first one in chapter 10.'}</p></section>`;
}

// ---------------------------------------------------------------- remote tables

function remoteTab(host: HTMLElement, redraw: () => void) {
  const t = ctx.tenant();
  const list = t.objects.filter((o) => o.space === t.activeSpace && o.kind === 'Remote Table');
  if (!list.some((o) => o.name === selectedRemote)) selectedRemote = '';
  const sel = list.find((o) => o.name === selectedRemote);
  host.innerHTML = `
    <section class="panel">
      <div class="table-head"><h3>Remote Tables</h3>
        <div class="toolbar">
          <button class="btn small" type="button" id="rt-snapshot" ${sel ? '' : 'disabled'}>Load New Snapshot</button>
          <button class="btn small" type="button" id="rt-remove" ${sel?.remote?.access === 'Replicated (Snapshot)' ? '' : 'disabled'}>Remove Replicated Data</button>
          <button class="btn small" type="button" id="rt-schedule" ${sel ? '' : 'disabled'}>Schedule</button>
        </div></div>
      <div class="table-scroll"><table class="grid" id="rt-list">
        <thead><tr><th></th><th>Name</th><th>Connection</th><th>Data Access</th><th>Refresh Frequency</th><th>Status</th><th>Last Updated</th><th>Number of Records</th></tr></thead>
        <tbody>${list.length ? list.map((o) => {
          const r = lastRun(t, objectKey(o));
          return `<tr class="${o.name === selectedRemote ? 'selected' : ''}">
            <td><input type="radio" name="rt-sel" value="${esc(o.name)}" ${o.name === selectedRemote ? 'checked' : ''} aria-label="Select ${esc(o.name)}"></td>
            <td class="mono">${esc(o.name)}</td><td class="mono">${esc(o.remote!.connection)}</td>
            <td>${esc(o.remote!.access)}</td>
            <td>${o.remote!.schedule ? `Scheduled, ${esc(o.remote!.schedule.toLowerCase())}` : o.remote!.access === 'Remote' ? 'None (read live)' : 'None'}</td>
            <td>${r ? runChip(r) : '<span class="muted">–</span>'}</td>
            <td class="muted">${o.remote!.lastRefresh ? fmtDate(o.remote!.lastRefresh) : '–'}</td>
            <td class="num">${o.remote!.records?.toLocaleString('en-US') ?? '–'}</td></tr>`;
        }).join('') : `<tr><td colspan="8" class="muted">No remote tables in this space. Import them in the Data Builder.</td></tr>`}</tbody>
      </table></div>
      <p class="muted">Remote: every query reads the source live; nothing is stored here. Replicated (Snapshot): a full copy is stored in the space and refreshed when you load a new snapshot or on a schedule.
        Real-time replication depends on source and adapter and is not simulated.</p>
    </section>`;
  host.querySelectorAll<HTMLInputElement>('[name="rt-sel"]').forEach((r) =>
    r.addEventListener('change', () => {
      selectedRemote = r.value;
      redraw();
    }),
  );
  host.querySelector('#rt-snapshot')!.addEventListener('click', async () => {
    if (!sel) return;
    const key = objectKey(sel);
    const locked = lockError(t, sel.space);
    if (locked) {
      addRun(t, { object: key, kind: 'Remote Table', start: new Date().toISOString(), status: 'Failed', records: 0, messages: [locked] });
      ctx.save();
      toast(locked, 'error');
      return redraw();
    }
    await createRemoteView(t, sel);
    const n = await countRows(sel.space, sel.name);
    sel.remote!.access = 'Replicated (Snapshot)';
    sel.remote!.lastRefresh = new Date().toISOString();
    sel.remote!.records = n;
    addRun(t, { object: key, kind: 'Remote Table', start: sel.remote!.lastRefresh, status: 'Completed', records: n, messages: [`Snapshot of ${sel.remote!.source} loaded: ${n} records.`] });
    ctx.track(`snapshot:${key}`);
    ctx.save();
    toast(`${sel.name}: snapshot loaded, ${n} records`);
    redraw();
  });
  host.querySelector('#rt-remove')!.addEventListener('click', () => {
    if (!sel) return;
    sel.remote!.access = 'Remote';
    sel.remote!.schedule = undefined;
    sel.remote!.records = undefined;
    sel.remote!.lastRefresh = undefined;
    ctx.track(`remove-replica:${objectKey(sel)}`);
    ctx.save();
    toast(`${sel.name} reads the source live again`);
    redraw();
  });
  host.querySelector('#rt-schedule')!.addEventListener('click', () =>
    sel && scheduleDialog(sel.name, sel.remote!.schedule, (f) => {
      sel.remote!.schedule = f;
      if (f && sel.remote!.access === 'Remote') toast('A schedule loads snapshots. Load the first one now, or wait for the schedule.', 'info');
      ctx.track(`schedule:${objectKey(sel)}:${f ?? 'none'}`);
    }, redraw),
  );
}

function scheduleDialog(name: string, current: Frequency | undefined, apply: (f: Frequency | undefined) => void, redraw: () => void) {
  const t = ctx.tenant();
  const { form, close } = openDialog(`Schedule ${name}`, `
    <p class="guide-lead">A simple schedule runs the task at a fixed frequency. Complex patterns use a cron expression in a real tenant.</p>
    <fieldset class="question"><legend>Frequency</legend>
      ${(['None', 'Daily', 'Weekly', 'Monthly'] as const).map((f) => `<label><input type="radio" name="freq" value="${f}" ${(current ?? 'None') === f ? 'checked' : ''}> ${f === 'None' ? 'No schedule' : f}</label>`).join('')}
    </fieldset>
    <p class="form-error" role="alert"></p>
    <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button>
      <button class="btn primary" type="submit">Save schedule</button></div>`);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = form.querySelector<HTMLInputElement>('[name="freq"]:checked')?.value ?? 'None';
    if (v !== 'None' && !t.consent) {
      form.querySelector('.form-error')!.textContent = 'You have not authorized job scheduling yet. Give your consent in the banner at the top of the monitor first.';
      return;
    }
    apply(v === 'None' ? undefined : (v as Frequency));
    ctx.save();
    close();
    redraw();
  });
}

// ---------------------------------------------------------------- flows

/** Starts a deployed replication flow, from the editor or the monitor. */
export async function startFlowRun(o: RepoObject): Promise<Run | null> {
  const t = ctx.tenant();
  if (!o.deployed?.flow) {
    toast('Deploy the flow before you run it.', 'error');
    return null;
  }
  if (o.status === 'changes') toast('Running the deployed version. Your saved changes are not deployed yet.', 'info');
  const risk = await truncateRisk(t, o);
  if (risk) {
    ctx.track(`truncate-blocked:${objectKey(o)}`);
    const { form, close } = openDialog('Run stopped', `<p class="guide-lead">${esc(risk)}</p>
      <div class="guide-actions"><button class="btn primary" type="submit">OK</button></div>`);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      close();
    });
    return null;
  }
  const run = await runFlow(t, o);
  ctx.track(`run:${objectKey(o)}:${run.status}`);
  ctx.save();
  toast(run.status === 'Failed' ? `${o.name} failed. Open the run in the Data Integration Monitor.` : `${o.name}: ${run.records.toLocaleString('en-US')} records loaded`, run.status === 'Failed' ? 'error' : 'ok');
  return run;
}

function flowsTab(host: HTMLElement, redraw: () => void) {
  const t = ctx.tenant();
  const list = t.objects.filter((o) => o.space === t.activeSpace && o.kind === 'Replication Flow' && o.deployed);
  if (!list.some((o) => o.name === selectedFlow)) selectedFlow = '';
  const sel = list.find((o) => o.name === selectedFlow);
  const runs = sel ? runsOf(t, objectKey(sel)) : [];
  if (!runs.some((r) => r.id === selectedRun)) selectedRun = runs[0]?.id ?? '';
  const run = runs.find((r) => r.id === selectedRun);
  host.innerHTML = `
    <section class="panel">
      <div class="table-head"><h3>Flows</h3><span class="muted">Deployed data flows, replication flows and transformation flows of this space</span></div>
      <div class="table-scroll"><table class="grid" id="flow-list">
        <thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Last Run</th><th>Records</th><th>Schedule</th></tr></thead>
        <tbody>${list.length ? list.map((o) => {
          const r = lastRun(t, objectKey(o));
          return `<tr class="${o.name === selectedFlow ? 'selected' : ''}">
            <td><button type="button" class="link-btn mono" data-flow="${esc(o.name)}">${esc(o.name)}</button></td><td>Replication Flow</td>
            <td>${runChip(r)}</td><td class="muted">${r ? fmtDate(r.start) : '–'}</td><td class="num">${r ? r.records.toLocaleString('en-US') : '–'}</td>
            <td>${o.deployed!.flow?.schedule ? esc(o.deployed!.flow.schedule) : o.deployed!.flow?.objects.some((x) => x.loadType === 'Initial and Delta') ? '<span class="muted">Delta runs continuously</span>' : 'None'}</td></tr>`;
        }).join('') : `<tr><td colspan="6" class="muted">No deployed flows in this space yet.</td></tr>`}</tbody>
      </table></div>
    </section>
    ${sel ? `<section class="panel flow-detail" id="flow-detail">
      <div class="table-head"><h3>${esc(sel.name)} <small class="muted">${esc(sel.businessName)}</small></h3>
        <div class="toolbar">
          <button class="btn small primary" type="button" id="flow-run">Run</button>
          <button class="btn small" type="button" id="flow-schedule">Schedule</button>
        </div></div>
      <div class="runs-layout">
        <table class="grid" id="run-list"><thead><tr><th>Runs</th><th>Status</th><th>Records</th></tr></thead>
          <tbody>${runs.length ? runs.map((r) => `<tr class="${r.id === selectedRun ? 'selected' : ''}">
            <td><button type="button" class="link-btn" data-run="${esc(r.id)}">${fmtDate(r.start)}</button></td><td>${runChip(r)}</td><td class="num">${r.records.toLocaleString('en-US')}</td></tr>`).join('')
            : '<tr><td colspan="3" class="muted">No runs yet.</td></tr>'}</tbody></table>
        <div class="run-log" id="run-log">${run ? `<h4>Messages <small class="muted">${fmtDate(run.start)}</small></h4>
          <ol>${run.messages.map((m) => `<li class="${/fail|locked|not valid|stopped/i.test(m) ? 'err' : ''}">${esc(m)}</li>`).join('')}</ol>` : '<p class="muted">Select a run to see its messages.</p>'}</div>
      </div></section>` : ''}`;
  host.querySelectorAll<HTMLButtonElement>('[data-flow]').forEach((b) =>
    b.addEventListener('click', () => {
      selectedFlow = b.dataset.flow!;
      selectedRun = '';
      ctx.track(`monitor-open:${t.activeSpace}.${selectedFlow}`);
      redraw();
    }),
  );
  host.querySelectorAll<HTMLButtonElement>('[data-run]').forEach((b) =>
    b.addEventListener('click', () => {
      selectedRun = b.dataset.run!;
      ctx.track(`monitor-run:${selectedRun}`);
      redraw();
    }),
  );
  host.querySelector('#flow-run')?.addEventListener('click', async () => {
    if (!sel) return;
    const r = await startFlowRun(sel);
    if (r) selectedRun = r.id;
    redraw();
  });
  host.querySelector('#flow-schedule')?.addEventListener('click', () =>
    sel && scheduleDialog(sel.name, sel.deployed!.flow!.schedule, (f) => {
      sel.deployed!.flow!.schedule = f;
      if (sel.flow) sel.flow.schedule = f;
      ctx.track(`schedule:${objectKey(sel)}:${f ?? 'none'}`);
    }, redraw),
  );
}

// ---------------------------------------------------------------- remote queries, local tables

function queriesTab(host: HTMLElement) {
  const t = ctx.tenant();
  const list = remoteQueries.filter((q) => q.space === t.activeSpace);
  host.innerHTML = `<section class="panel">
    <div class="table-head"><h3>Remote Queries</h3><span class="muted">Statements this space sent to source systems in this session</span></div>
    <div class="table-scroll"><table class="grid" id="query-list">
      <thead><tr><th>Start</th><th>Connection</th><th>Remote Table</th><th>Remote Statement</th><th>Records</th><th>Duration</th></tr></thead>
      <tbody>${list.length ? list.map((q) => `<tr><td class="muted">${fmtDate(q.at)}</td><td class="mono">${esc(q.connection)}</td><td class="mono">${esc(q.object)}</td>
        <td class="mono small">${esc(q.statement)}</td><td class="num">${q.records}</td><td class="num">${q.ms} ms</td></tr>`).join('')
        : '<tr><td colspan="6" class="muted">No remote queries yet. Previewing a remote table with data access Remote sends one.</td></tr>'}</tbody>
    </table></div></section>`;
}

async function localTab(host: HTMLElement) {
  const t = ctx.tenant();
  const list = t.objects.filter((o) => o.space === t.activeSpace && o.kind === 'Local Table');
  host.innerHTML = `<section class="panel"><div class="table-head"><h3>Local Tables</h3><span class="muted">Delete data and run housekeeping, for example on delta tables</span></div>
    <div class="table-scroll"><table class="grid" id="local-list"><thead><tr><th>Name</th><th>Number of Records</th><th>Filled by</th></tr></thead>
    <tbody>${list.map((o) => `<tr><td class="mono">${esc(o.name)}</td><td class="num" data-count="${esc(o.name)}">…</td>
      <td>${o.loadFrom ? `Flow from ${esc(o.loadFrom.connection)}` : o.source ? 'Pilot load by IT' : '–'}</td></tr>`).join('')}</tbody></table></div></section>`;
  for (const o of list) {
    const cell = host.querySelector<HTMLElement>(`[data-count="${o.name}"]`);
    const n = await countRows(o.space, o.name).catch(() => NaN);
    if (cell) cell.textContent = Number.isNaN(n) ? '–' : n.toLocaleString('en-US');
  }
}
