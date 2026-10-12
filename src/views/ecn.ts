import { ctx } from '../ctx';
import { isRunning, stopEcn, usedBlockHours, BLOCK_HOURS, PERF_INFO, type Ecn, type ExtrasState } from '../extras';
import { esc, openDialog, toast, ask, spaceChip } from '../ui';

/**
 * Elastic compute nodes after SAP help (Curlin's tenant has none, 12.10.2026):
 * - managed in Space Management: the left column has an area "Elastic Compute Nodes" with Create; a node page shows its
 *   status and the actions Start · Stop · Update · Schedule · Configure · Delete · View Logs, the tab Spaces (Add Spaces /
 *   Remove Spaces, each tile "All Exposed Objects") and the tab Exposed Objects ("Create an Elastic Compute Node",
 *   "Run an Elastic Compute Node").
 * - monitored in Monitoring › Elastic Compute Nodes: a node dropdown and the cards Configuration, Run Details,
 *   Monthly Uptime, Average CPU, Average Memory, Total Uptime, Top 5 Statements by Processing Memory Consumption,
 *   Out-of-Memory Errors, Memory Distribution ("Monitoring Elastic Compute Nodes").
 * Statuses in the game: Not Ready (no spaces), Ready, Running. Starting/Stopping happen at once. A run is billed by the full hour
 * (block-hours = hours × compute blocks); CPU and memory figures are simulated.
 */

export const BLOCK_CHOICES = [4, 8, 12, 16];
export const ecnLabel = (e: Ecn) => e.businessName || e.name;
export const ecnStatus = (e: Ecn) => (isRunning(e) ? 'Running' : e.spaces.length ? 'Ready' : 'Not Ready');

let monitorSel = '';

/** Exposed objects of the node's spaces: analytic models, and views exposed for consumption with semantic usage Fact. */
export function exposedObjects(e: Ecn) {
  const t = ctx.tenant();
  return t.objects.filter((o) => e.spaces.includes(o.space) && !!o.deployed
    && (o.kind === 'Analytic Model' || (o.kind === 'SQL View' && !!o.deployed.exposed && o.semanticUsage === 'Fact')));
}

/** Starts a node; returns an error message or null. */
export function startEcn(x: ExtrasState, e: Ecn): string | null {
  if (!e.spaces.length) return `${ecnLabel(e)} is Not Ready: add at least one space first.`;
  if (x.ecns.filter(isRunning).length >= 4) return 'Up to 4 elastic compute nodes can run at the same time.';
  const left = BLOCK_HOURS - usedBlockHours(x);
  if (left < e.blocks) return `Not enough block-hours left this month (${left}). One hour of ${ecnLabel(e)} needs ${e.blocks}.`;
  e.runs.unshift({ start: new Date().toISOString() });
  e.runs.splice(30);
  return null;
}

// ---------------------------------------------------------------- Space Management: left column and node page

/** The "Elastic Compute Nodes" area of the Space Management side column. */
export function ecnSideHtml(selected: string, enabled: boolean) {
  const x = ctx.tenant().extras;
  return `<div class="sm-box" id="ecn-side"><div class="sm-box-head"><h3>Elastic Compute Nodes</h3>
      <button type="button" class="btn small link" id="ecn-create" ${enabled ? '' : 'disabled title="Unlocks in chapter 9"'}>Create</button></div>
    ${x.ecns.map((e) => `<button type="button" class="sm-row ${selected === e.name ? 'on' : ''}" data-ecn-node="${esc(e.name)}">
        <span>${esc(ecnLabel(e))}<small class="ecn-st ${isRunning(e) ? 'run' : ''}">${ecnStatus(e)}</small></span><b title="Spaces">${e.spaces.length}</b></button>`).join('')
      || '<p class="muted small-note">No nodes yet.</p>'}
    <button type="button" class="btn small link" id="ecn-logs-all" ${x.ecns.length ? '' : 'disabled'}>View Logs</button></div>`;
}

export function bindEcnSide(main: HTMLElement, open: (name: string) => void, rerender: () => void) {
  main.querySelector('#ecn-create')?.addEventListener('click', () => ecnDialog(undefined, (n) => open(n)));
  main.querySelectorAll<HTMLButtonElement>('[data-ecn-node]').forEach((b) => b.addEventListener('click', () => open(b.dataset.ecnNode!)));
  main.querySelector('#ecn-logs-all')?.addEventListener('click', () => ctx.setView('tasklogs'));
  void rerender;
}

let nodeTab: 'spaces' | 'objects' = 'spaces';

/** The page of one node inside Space Management. */
export function ecnNodeHtml(e: Ecn) {
  const t = ctx.tenant();
  const info = PERF_INFO[e.perf];
  const run = isRunning(e);
  const objs = exposedObjects(e);
  const st = ecnStatus(e);
  return `<div class="sm-head"><h1>${esc(ecnLabel(e))} <span class="mono">${esc(e.name)}</span></h1>
      <span class="ecn-status ${st === 'Running' ? 'run' : st === 'Ready' ? 'ready' : ''}" id="ecn-status">${st}</span></div>
    <div class="sm-toolbar" id="ecn-toolbar">
      <button class="btn small link" type="button" data-ecn-start="${esc(e.name)}" ${!run && st === 'Ready' ? '' : 'disabled'}>Start</button>
      <button class="btn small link" type="button" data-ecn-stop="${esc(e.name)}" ${run ? '' : 'disabled'}>Stop</button>
      <button class="btn small link" type="button" disabled title="Update replicates tables or persisted views that failed while the node runs; never needed in the game">Update</button>
      <button class="btn small link" type="button" disabled title="Schedule a run with a duration, like any data integration task; not in this game">Schedule</button>
      <button class="btn small link" type="button" id="ecn-edit" ${run ? 'disabled title="Stop the node to configure it"' : ''}>Configure</button>
      <button class="btn small link" type="button" data-ecn-delete="${esc(e.name)}" ${run ? 'disabled title="A running node cannot be deleted"' : ''}>Delete</button>
      <span class="spacer"></span>
      <button class="btn small link" type="button" id="ecn-logs">View Logs</button>
      <button class="btn small link" type="button" id="ecn-monitor">Monitor</button>
    </div>
    <dl class="props-list wide-dl ecn-conf"><dt>Performance Class</dt><dd>${e.perf}</dd><dt>Compute Blocks</dt><dd>${e.blocks}</dd>
      <dt>Resources</dt><dd>${info.vcpu * e.blocks} vCPUs · ${info.memGB * e.blocks} GB memory</dd></dl>
    <div class="tabs" role="tablist">
      <button type="button" role="tab" data-ecn-tab="spaces" aria-selected="${nodeTab === 'spaces'}">Spaces (${e.spaces.length})</button>
      <button type="button" role="tab" data-ecn-tab="objects" aria-selected="${nodeTab === 'objects'}">Exposed Objects (${objs.length})</button>
    </div>
    ${nodeTab === 'spaces' ? `<div class="sm-toolbar"><button class="btn small link" type="button" id="ecn-add-spaces" ${run ? 'disabled' : ''}>Add Spaces</button>
        <button class="btn small link" type="button" id="ecn-remove-spaces" ${run || !e.spaces.length ? 'disabled' : ''}>Remove Spaces</button></div>
      <div class="space-tiles" id="ecn-spaces">${e.spaces.map((s) => {
        const sp = t.spaces.find((x) => x.id === s);
        return `<article class="space-tile"><div class="st-top"><div><h3>${esc(sp?.name ?? s)}</h3><span class="sc-id">${spaceChip(s)}</span></div>
          <input type="checkbox" name="ecn-space" value="${esc(s)}" aria-label="Select ${esc(s)}"></div>
          <span class="muted st-meta">All Exposed Objects</span></article>`;
      }).join('') || '<p class="muted">No spaces yet. Add the spaces whose exposed objects the node should serve; the node is Not Ready until then.</p>'}</div>`
    : `<div class="table-scroll"><table class="grid" id="ecn-objects"><thead><tr><th>Business Name</th><th>Technical Name</th><th>Type</th><th>Space</th></tr></thead><tbody>
        ${objs.map((o) => `<tr><td>${esc(o.businessName)}</td><td class="mono">${esc(o.name)}</td><td>${o.kind === 'SQL View' ? 'View (Fact, exposed)' : esc(o.kind)}</td><td>${spaceChip(o.space)}</td></tr>`).join('')
          || '<tr><td colspan="4" class="muted">No exposed objects: analytic models and views of type fact with Expose for Consumption.</td></tr>'}</tbody></table></div>`}
    <p class="muted ext-note">While the node runs, the local tables and persisted views behind these objects are copied to it, and SAP Analytics Cloud
      reads them there. The node is billed in block-hours: run hours × compute blocks (the game bills full hours).</p>`;
}

export function bindEcnNode(main: HTMLElement, e: Ecn, rerender: () => void, closeNode: () => void) {
  const t = ctx.tenant();
  const x = t.extras;
  main.querySelectorAll<HTMLButtonElement>('[data-ecn-tab]').forEach((b) => b.addEventListener('click', () => {
    nodeTab = b.dataset.ecnTab as typeof nodeTab;
    rerender();
  }));
  main.querySelector('[data-ecn-start]')?.addEventListener('click', () => {
    const err = startEcn(x, e);
    if (err) return toast(err, 'error');
    ctx.track(`ecn-start:${e.name}`);
    ctx.save();
    toast(`${ecnLabel(e)} is running. Exposed objects of ${e.spaces.join(', ')} are now read from the node.`);
    rerender();
  });
  main.querySelector('[data-ecn-stop]')?.addEventListener('click', () => {
    stopEcn(e);
    ctx.track(`ecn-stop:${e.name}`);
    ctx.save();
    toast(`${ecnLabel(e)} stopped. Billed ${e.runs[0].blockHours} block-hours.`);
    rerender();
  });
  main.querySelector('[data-ecn-delete]')?.addEventListener('click', async () => {
    if (!(await ask(`Delete the elastic compute node ${ecnLabel(e)}? Its run history is removed too.`, 'Delete'))) return;
    x.ecns = x.ecns.filter((n) => n !== e);
    ctx.save();
    closeNode();
  });
  main.querySelector('#ecn-edit')?.addEventListener('click', () => ecnDialog(e, () => rerender()));
  main.querySelector('#ecn-logs')?.addEventListener('click', () => ctx.setView('tasklogs'));
  main.querySelector('#ecn-monitor')?.addEventListener('click', () => {
    monitorSel = e.name;
    ctx.setView('ecn');
  });
  main.querySelector('#ecn-add-spaces')?.addEventListener('click', () => addSpacesDialog(e, rerender));
  main.querySelector('#ecn-remove-spaces')?.addEventListener('click', () => {
    const picked = [...main.querySelectorAll<HTMLInputElement>('[name="ecn-space"]:checked')].map((c) => c.value);
    if (!picked.length) return toast('Select the spaces to remove first.', 'error');
    e.spaces = e.spaces.filter((s) => !picked.includes(s));
    ctx.track(`ecn-spaces:${e.name}`);
    ctx.save();
    rerender();
  });
}

function addSpacesDialog(e: Ecn, done: () => void) {
  const t = ctx.tenant();
  const free = t.spaces.filter((s) => !e.spaces.includes(s.id));
  const { form, close } = openDialog('Add Spaces', `
    <p class="guide-lead">Choose the spaces whose exposed objects the node should serve. By default all current and future exposed objects of a space are added.</p>
    <fieldset class="question share-targets"><legend>Spaces</legend>${free.map((s) => `<label><input type="checkbox" name="space" value="${esc(s.id)}"> ${esc(s.id)} · ${esc(s.name)}</label>`).join('') || '<p class="muted">All spaces are added already.</p>'}</fieldset>
    <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button><button class="btn primary" type="submit">Add Spaces</button></div>`);
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const add = new FormData(form).getAll('space').map(String);
    e.spaces.push(...add.filter((s) => !e.spaces.includes(s)));
    ctx.track(`ecn-spaces:${e.name}`);
    ctx.save();
    close();
    done();
  });
}

/** Create Elastic Compute Node / Configure (SAP help: Business Name, Technical Name with prefix ds, Performance Class, Compute Blocks). */
export function ecnDialog(existing: Ecn | undefined, done: (name: string) => void) {
  const t = ctx.tenant();
  const perf = existing?.perf ?? t.extras.ecns[0]?.perf ?? 'Memory';
  const { form, close } = openDialog(existing ? `Configure ${ecnLabel(existing)}` : 'Create Elastic Compute Node', `
    <div class="form-grid">
      <label>Business Name <small>up to 30 characters</small><input name="business" value="${esc(existing?.businessName ?? '')}" maxlength="30" autocomplete="off"></label>
      <label>Technical Name <small>lowercase letters and digits, starts with the prefix ds</small><input name="name" value="${esc(existing?.name ?? 'ds')}" ${existing ? 'readonly' : ''} maxlength="9" autocomplete="off" spellcheck="false"></label>
      <label>Performance Class <small>chosen for all nodes when the resources were purchased (System › Configuration › Tenant Configuration)</small>
        <input name="perf" value="${esc(perf)}" readonly></label>
      <label>Compute Blocks <small>${esc(perf)}: ${PERF_INFO[perf].vcpu} vCPU and ${PERF_INFO[perf].memGB} GB RAM per block</small>
        <select name="blocks">${BLOCK_CHOICES.map((b) => `<option ${(existing?.blocks ?? 4) === b ? 'selected' : ''}>${b}</option>`).join('')}</select></label>
    </div>
    <p class="form-error" role="alert"></p>
    <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button><button class="btn primary" type="submit">${existing ? 'Save' : 'Create'}</button></div>`);
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = new FormData(form);
    const name = String(f.get('name') ?? '').trim();
    const err = form.querySelector<HTMLElement>('.form-error')!;
    if (!existing && !/^ds[a-z0-9]{1,7}$/.test(name)) return void (err.textContent = 'Use the prefix ds, then 1 to 7 lowercase letters or digits, e.g. dsmonthend.');
    if (!existing && t.extras.ecns.some((e) => e.name === name)) return void (err.textContent = `${name} exists already.`);
    const node: Ecn = existing ?? { name, perf, blocks: 4, spaces: [], runs: [] };
    const business = String(f.get('business') ?? '').trim();
    if (business) node.businessName = business;
    node.blocks = BLOCK_CHOICES.includes(Number(f.get('blocks'))) ? Number(f.get('blocks')) : 4;
    if (!existing) t.extras.ecns.push(node);
    ctx.track(`ecn-save:${node.name}`);
    ctx.save();
    close();
    done(node.name);
  });
}

// ---------------------------------------------------------------- Monitoring › Elastic Compute Nodes

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const hours = (e: Ecn, from?: Date) => e.runs.filter((r) => r.end && (!from || new Date(r.start) >= from))
  .reduce((s, r) => s + Math.max(1, Math.ceil((new Date(r.end!).getTime() - new Date(r.start).getTime()) / 3_600_000)), 0);

export function renderEcnMonitor(main: HTMLElement) {
  const x = ctx.tenant().extras;
  const e = x.ecns.find((n) => n.name === monitorSel) ?? x.ecns[0];
  const used = usedBlockHours(x);
  const card = (title: string, body: string, action = '') => `<section class="panel ext-kpi ecn-card"><b>${title}</b>${body}${action}</section>`;
  if (!e) {
    main.innerHTML = `<div class="ext-page"><div class="ext-head"><div><h1 class="view-title">Elastic Compute Nodes</h1>
      <p class="view-lead">Key figures of a node: configuration, runs, uptime, CPU and memory. Create a node in Space Management first.</p></div></div>
      <section class="panel"><p class="muted">No elastic compute node exists.</p>
        <button class="btn small" type="button" id="ecn-manage">Manage Elastic Compute Node</button>
        <p class="ext-kpi-value" id="ecn-used" hidden>${used}</p></section></div>`;
    main.querySelector('#ecn-manage')!.addEventListener('click', () => ctx.setView('spaces'));
    return;
  }
  const run = isRunning(e);
  const info = PERF_INFO[e.perf];
  const last = e.runs.find((r) => r.end) ?? e.runs[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthHours = hours(e, monthStart);
  const mem = info.memGB * e.blocks;
  const repl = run ? Math.min(mem * 0.6, e.spaces.length * 1.7 + 0.4) : 0;
  const proc = run ? Math.min(mem - repl, mem * 0.12) : 0;
  main.innerHTML = `
    <div class="ext-page">
      <div class="ext-head"><div><h1 class="view-title">Elastic Compute Nodes</h1>
        <p class="view-lead">Key figures of one node. Start, stop and assign spaces in Space Management.</p></div>
        <label class="space-select">Elastic Compute Node <select id="ecn-pick">${x.ecns.map((n) => `<option value="${esc(n.name)}" ${n === e ? 'selected' : ''}>${esc(ecnLabel(n))} (${esc(n.name)})</option>`).join('')}</select></label></div>
      <div class="ecn-actions"><button class="btn small" type="button" id="ecn-manage">Manage Elastic Compute Node</button>
        <button class="btn small link" type="button" disabled title="Opens the SAP HANA Cockpit; not in this game">Database Overview (SAP HANA Cockpit)</button></div>
      <div class="ecn-cards">
        ${card('Configuration', `<dl class="ext-dl"><div><dt>Technical Name</dt><dd class="mono">${esc(e.name)}</dd></div><div><dt>Status</dt><dd>${ecnStatus(e)}</dd></div>
          <div><dt>Performance Class</dt><dd>${e.perf}</dd></div><div><dt>Resources</dt><dd>${e.blocks} blocks · ${mem} GB memory · ${info.vcpu * e.blocks} vCPUs</dd></div></dl>`)}
        ${card('Run Details', last ? `<dl class="ext-dl"><div><dt>Started</dt><dd>${fmt(last.start)}</dd></div><div><dt>Stopped</dt><dd>${last.end ? fmt(last.end) : 'running'}</dd></div>
          <div><dt>Block-Hours</dt><dd>${last.blockHours ?? '—'}</dd></div></dl>` : '<p class="muted">No run yet.</p>')}
        ${card('Monthly Uptime', `<p class="ext-kpi-value">${monthHours} h</p><p class="muted">Block-hours used by all nodes this month: <b id="ecn-used">${used}</b> of ${BLOCK_HOURS}</p>
          <span class="bar"><i style="width:${Math.max(1, Math.min(100, (used / BLOCK_HOURS) * 100)).toFixed(1)}%"></i></span>`)}
        ${card('Average CPU', `<p class="ext-kpi-value">${last ? `${18 + (e.blocks * 7) % 40} %` : '—'}</p>`, '<button class="btn small link" type="button" disabled title="SAP HANA Cockpit; not in this game">Performance Monitor</button>')}
        ${card('Average Memory', `<p class="ext-kpi-value">${last ? `${(e.spaces.length * 1.7 + 0.4).toFixed(1)} GB` : '—'}</p>`, '<button class="btn small link" type="button" disabled title="SAP HANA Cockpit; not in this game">Performance Monitor</button>')}
        ${card('Total Uptime', `<p class="ext-kpi-value">${hours(e)} h</p>`)}
        ${card('Top 5 Statements by Processing Memory Consumption', `<p class="muted">${run || last ? 'Reads of the analytic models of ' + esc(e.spaces.join(', ') || '—') + ' from SAP Analytics Cloud.' : 'No data'}</p>`,
          '<button class="btn small link" type="button" data-ecn-view="statements">View Logs</button>')}
        ${card('Out-of-Memory Errors', '<p class="ext-kpi-value">0</p>', '<button class="btn small link" type="button" data-ecn-view="statements">View Logs</button>')}
        ${card('Memory Distribution', run ? `<dl class="ext-dl"><div><dt>Unused Memory</dt><dd>${(mem - repl - proc).toFixed(1)} GB</dd></div>
          <div><dt>Memory Used for Data Replication</dt><dd>${repl.toFixed(1)} GB</dd></div><div><dt>Memory Used for Processing</dt><dd>${proc.toFixed(1)} GB</dd></div></dl>`
          : '<p class="muted">No data: the node is not running.</p>')}
      </div>
      <p class="muted ext-note">CPU, memory and statements are simulated; runs and block-hours come from your nodes.</p>
    </div>`;
  main.querySelector<HTMLSelectElement>('#ecn-pick')!.addEventListener('change', (ev) => {
    monitorSel = (ev.target as HTMLSelectElement).value;
    renderEcnMonitor(main);
  });
  main.querySelector('#ecn-manage')!.addEventListener('click', () => {
    ecnOpenRequest = e.name;
    ctx.setView('spaces');
  });
  main.querySelectorAll<HTMLButtonElement>('[data-ecn-view]').forEach((b) => b.addEventListener('click', () => ctx.setView(b.dataset.ecnView as 'statements')));
}

/** Set by "Manage Elastic Compute Node": Space Management opens this node next. */
export let ecnOpenRequest = '';
export const takeEcnRequest = () => {
  const n = ecnOpenRequest;
  ecnOpenRequest = '';
  return n;
};
