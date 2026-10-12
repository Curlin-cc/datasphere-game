import { ctx } from '../ctx';
import { CAPACITY, assigned } from '../tenant';
import {
  diskBreakdown, memoryUsedGB, failedRuns, dailyCU, monthDays, isRunning, stopEcn, usedBlockHours, BLOCK_HOURS, PERF_INFO, type Ecn, type PerfClass,
} from '../extras';
import { usedMB, fmtSize } from './welcome';
import { esc, openDialog, toast, ask } from '../ui';

/**
 * Monitoring › System and Spaces (Bild 5), Capacities (Bild 4) and Elastic Compute Nodes (Handbuch 10.4, 3.3.2).
 * Figures come from the tenant in the save game (spaces, objects, runs); what the training tenant cannot know
 * (system data, out-of-memory events, CU rates) is simulated and the pages say so.
 */

const gb = (v: number) => `${v.toFixed(2)} GB`;
const pct = (a: number, b: number) => (b ? Math.min(100, (a / b) * 100) : 0);

/** A ring like the dashboard tiles: share used, with the value inside. */
function ring(share: number, size = 74) {
  const r = 28;
  const c = 2 * Math.PI * r;
  return `<svg class="ext-ring" viewBox="0 0 70 70" width="${size}" height="${size}" aria-hidden="true">
    <circle cx="35" cy="35" r="${r}" class="ext-ring-bg"/>
    <circle cx="35" cy="35" r="${r}" class="ext-ring-fg" stroke-dasharray="${(c * Math.min(1, share)).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 35 35)"/></svg>`;
}

/** Donut with several parts (Disk Storage Used). */
function donut(parts: { value: number; cls: string }[]) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const r = 52;
  const c = 2 * Math.PI * r;
  let off = 0;
  const arcs = parts.map((p) => {
    const len = (p.value / total) * c;
    const a = `<circle cx="70" cy="70" r="${r}" class="ext-donut ${p.cls}" stroke-dasharray="${len.toFixed(2)} ${c.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 70 70)"/>`;
    off += len;
    return a;
  });
  return `<svg viewBox="0 0 140 140" width="150" height="150" aria-hidden="true">${arcs.join('')}</svg>`;
}

// ---------------------------------------------------------------- System and Spaces

let sysTab: 'dashboard' | 'spaces' | 'objectstore' = 'dashboard';

export function renderSystemSpaces(main: HTMLElement) {
  const t = ctx.tenant();
  const d = diskBreakdown(t, usedMB);
  const usedDisk = d.spaces + d.other + d.admin + d.audit;
  const spaceDisk = t.spaces.reduce((s, sp) => s + sp.diskGB, 0);
  const memUsed = t.spaces.reduce((s, sp) => s + memoryUsedGB(t, sp.id), 0);
  const memAssigned = assigned(t).memoryGB;
  const failed = failedRuns(t, 24);
  main.innerHTML = `
    <div class="ext-page">
      <div class="ext-head"><h1 class="view-title">System and Spaces Monitoring</h1>
        <button class="btn link" type="button" id="sm-config">Open System Configuration</button></div>
      <div class="tabs" role="tablist" id="sm-tabs">
        ${(['dashboard', 'spaces', 'objectstore'] as const).map((x) => `<button type="button" role="tab" data-sm-tab="${x}" aria-selected="${sysTab === x}">${{ dashboard: 'Dashboard', spaces: 'Spaces', objectstore: 'Object Store' }[x]}</button>`).join('')}
      </div>
      ${sysTab === 'dashboard' ? `<div class="ext-cards" id="sm-dashboard">
        <section class="panel ext-card"><h3>Disk Storage Usage</h3><small>Now</small>
          <dl class="ext-usage"><div><dt>Type</dt><dd>DATA | LOG | TRACE</dd></div>
            <div class="full"><dt>Usage</dt><dd><span class="bar"><i style="width:${Math.max(2, pct(usedDisk, d.total)).toFixed(1)}%"></i></span></dd></div>
            <div><dt>Used</dt><dd>${gb(usedDisk)}</dd></div><div><dt>Usable</dt><dd>${gb(d.total * 0.95)}</dd></div><div><dt>Total</dt><dd>${d.total} GB</dd></div></dl></section>
        <section class="panel ext-card tall"><h3>Disk Storage Used</h3><small>Now</small>
          <div class="ext-donut-row">${donut([{ value: d.other, cls: 'p1' }, { value: d.spaces, cls: 'p2' }, { value: d.admin, cls: 'p3' }, { value: d.audit, cls: 'p4' }])}
            <ul class="ext-legend">
              <li><i class="p1"></i>Other Data (${gb(d.other)})<b>${pct(d.other, usedDisk).toFixed(0)}%</b></li>
              <li><i class="p2"></i>Data in Spaces (${fmtSize(d.spaces * 1024)})<b>${pct(d.spaces, usedDisk).toFixed(0)}%</b></li>
              <li><i class="p3"></i>Administrative Data (${gb(d.admin)})<b>${pct(d.admin, usedDisk).toFixed(0)}%</b></li>
              <li><i class="p4"></i>Audit Log Data (${fmtSize(d.audit * 1024)})<b>${pct(d.audit, usedDisk).toFixed(0)}%</b></li></ul></div></section>
        <section class="panel ext-card"><h3>Disk Used by Spaces for Storage</h3><small>Now</small>
          <div class="ext-ring-row">${ring(d.spaces / Math.max(1, spaceDisk))}<span><b>${fmtSize(d.spaces * 1024)}</b><small>of ${spaceDisk} GB assigned</small></span></div></section>
        <section class="panel ext-card"><h3>Memory Used by Spaces for Storage</h3><small>Now</small>
          <div class="ext-ring-row">${ring(memUsed / Math.max(1, memAssigned))}<span><b>${gb(memUsed)}</b><small>of ${memAssigned} GB assigned</small></span></div></section>
        <section class="panel ext-card"><h3>Failed Tasks</h3><small>Last 24 Hours</small>
          <p class="ext-big ${failed.length ? 'bad' : ''}" id="sm-failed">${failed.length || '---'}</p>
          <div class="ext-card-foot"><button class="btn link" type="button" data-to="tasklogs">View Logs</button></div></section>
        <section class="panel ext-card"><h3>Out-of-Memory Errors</h3><small>Last 24 Hours</small><p class="ext-big">---</p>
          <div class="ext-card-foot"><button class="btn link" type="button" data-to="statements">View Logs</button></div></section>
        <section class="panel ext-card wide"><h3>Top 5 Spaces by Memory Used</h3><small>Now</small>
          ${topSpaces(t)}</section>
        <section class="panel ext-card"><h3>Admission Control Rejection Events</h3><small>Last 24 Hours</small><p class="ext-big">---</p></section>
        <section class="panel ext-card"><h3>Admission Control Queuing Events</h3><small>Last 24 Hours</small><p class="ext-big">---</p></section>
      </div>
      <p class="muted ext-note">Data in spaces, memory and failed tasks come from your tenant. System, administrative and audit data, out-of-memory and admission control events are simulated: the training tenant never runs out of memory. The tiles in a real tenant are not verified in the Handbuch (10.4.2).</p>`
      : sysTab === 'spaces' ? `<section class="panel" id="sm-spaces"><div class="table-scroll"><table class="grid">
          <thead><tr><th>Space</th><th>Status</th><th class="num">Priority</th><th>Disk Used for Storage</th><th class="num">Disk Assigned</th><th>Memory Used for Storage</th><th class="num">Memory Assigned</th><th class="num">Objects</th></tr></thead>
          <tbody>${t.spaces.map((sp) => {
            const du = usedMB(t, sp.id); const mu = memoryUsedGB(t, sp.id);
            return `<tr data-space-row="${esc(sp.id)}"><td class="mono">${esc(sp.id)}</td><td>${sp.locked ? '<span class="ext-status bad">Locked</span>' : '<span class="ext-status ok">Active</span>'}</td>
              <td class="num">${sp.priority}</td><td><span class="bar"><i style="width:${Math.max(2, pct(du, sp.diskGB * 1024)).toFixed(1)}%"></i></span> ${fmtSize(du)}</td><td class="num">${sp.diskGB} GB</td>
              <td><span class="bar"><i style="width:${Math.max(2, pct(mu, sp.memoryGB)).toFixed(1)}%"></i></span> ${gb(mu)}</td><td class="num">${sp.memoryGB} GB</td>
              <td class="num">${t.objects.filter((o) => o.space === sp.id).length}</td></tr>`;
          }).join('')}</tbody></table></div>
          <p class="muted">Assigned: ${assigned(t).diskGB} of ${CAPACITY.diskGB} GB disk and ${assigned(t).memoryGB} of ${CAPACITY.memoryGB} GB in-memory. Change the assignment in Space Management.</p></section>`
      : `<section class="panel ext-empty" id="sm-objectstore"><h3>Object Store</h3><p>The object store keeps data of file spaces in the data lake instead of SAP HANA. This tenant has no file spaces, so there is nothing to show. In this game all spaces are SAP HANA spaces.</p></section>`}
    </div>`;
  main.querySelectorAll<HTMLButtonElement>('[data-sm-tab]').forEach((b) => b.addEventListener('click', () => {
    sysTab = b.dataset.smTab as typeof sysTab;
    ctx.track(`sysmon:${sysTab}`);
    renderSystemSpaces(main);
  }));
  main.querySelectorAll<HTMLButtonElement>('[data-to]').forEach((b) => b.addEventListener('click', () => ctx.setView(b.dataset.to as 'tasklogs')));
  main.querySelector('#sm-config')!.addEventListener('click', () => ctx.setView('system'));
}

function topSpaces(t: ReturnType<typeof ctx.tenant>) {
  const list = t.spaces.map((s) => ({ id: s.id, mem: memoryUsedGB(t, s.id) })).sort((a, b) => b.mem - a.mem).slice(0, 5);
  const max = Math.max(...list.map((x) => x.mem), 0.01);
  return `<ul class="ext-hbars">${list.map((x) => `<li><span class="mono">${esc(x.id)}</span><span class="bar"><i style="width:${pct(x.mem, max).toFixed(1)}%"></i></span><b>${gb(x.mem)}</b></li>`).join('')}</ul>`;
}

// ---------------------------------------------------------------- Capacities

let capRange: 'this' | 'last' = 'this';
let capTab: 'units' | 'spaces' = 'units';
let capChart: 'daily' | 'cumulative' = 'daily';

export function renderCapacities(main: HTMLElement) {
  const t = ctx.tenant();
  const daysThis = monthDays('this');
  const daysLast = monthDays('last');
  const sum = (ds: Date[], k: 'total' | 'memory' | 'disk' | 'foundation') => ds.reduce((s, d) => s + dailyCU(t, d)[k], 0);
  const ds = capRange === 'this' ? daysThis : daysLast;
  const range = `${ds[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} to ${ds.at(-1)!.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;
  const card = (badge: string, title: string, k: 'total' | 'memory' | 'disk' | 'foundation') => `
    <section class="panel ext-kpi"><div class="ext-kpi-head"><span class="ext-badge ${k}">${badge}</span><span><b>${title}</b><small>${range}</small></span></div>
      <p class="ext-kpi-value">${sum(ds, k).toFixed(2)} <small>CU</small></p>
      <p class="muted small">Consumption this month: ${sum(daysThis, k).toFixed(2)} CU<br>Consumption last month: ${sum(daysLast, k).toFixed(2)} CU</p></section>`;
  main.innerHTML = `
    <div class="ext-page">
      <div class="ext-head"><h1 class="view-title">Capacities Monitoring</h1>
        <button class="btn link" type="button" id="cap-config">Open System Configuration</button></div>
      <label class="ext-field">Date and Time Range:<select id="cap-range">
        <option value="this" ${capRange === 'this' ? 'selected' : ''}>This Month</option><option value="last" ${capRange === 'last' ? 'selected' : ''}>Last Month</option></select></label>
      <div class="tabs" role="tablist" id="cap-tabs">
        <button type="button" role="tab" data-cap-tab="units" aria-selected="${capTab === 'units'}">Capacity Units</button>
        <button type="button" role="tab" data-cap-tab="spaces" aria-selected="${capTab === 'spaces'}">Spaces</button></div>
      ${capTab === 'units' ? `<div class="ext-kpis" id="cap-kpis">
          ${card('TS', 'Total CU Consumption', 'total')}${card('HA', 'SAP HANA Cloud: Memory and Compute CU Consumption', 'memory')}
          ${card('HA', 'SAP HANA Cloud: Disk Storage CU Consumption', 'disk')}${card('FB', 'Foundation Block: CU Consumption', 'foundation')}</div>
        <section class="panel ext-chart">
          <div class="tabs small seg" role="tablist"><button type="button" role="tab" data-cap-chart="daily" aria-selected="${capChart === 'daily'}">Total CU Daily Consumption</button>
            <button type="button" role="tab" data-cap-chart="cumulative" aria-selected="${capChart === 'cumulative'}">Cumulative Consumption</button></div>
          ${barChart(ds.map((d) => dailyCU(t, d).total), ds, capChart === 'cumulative')}
          <p class="ext-legend-line"><i></i>Total Consumption</p></section>`
      : spacesTable(t, ds)}
      <p class="muted ext-note">Capacity units (CU) are the billing unit of SAP Datasphere (Handbuch 1.6, 3.3.2). The rates here are simulated from your tenant:
        assigned in-memory storage drives most of it, every task run and running elastic compute node adds compute, disk adds a little, the foundation block is a fixed amount per day.</p>
    </div>`;
  main.querySelector<HTMLSelectElement>('#cap-range')!.addEventListener('change', (e) => {
    capRange = (e.target as HTMLSelectElement).value as typeof capRange;
    ctx.track(`capacities-range:${capRange}`);
    renderCapacities(main);
  });
  main.querySelectorAll<HTMLButtonElement>('[data-cap-tab]').forEach((b) => b.addEventListener('click', () => { capTab = b.dataset.capTab as typeof capTab; renderCapacities(main); }));
  main.querySelectorAll<HTMLButtonElement>('[data-cap-chart]').forEach((b) => b.addEventListener('click', () => { capChart = b.dataset.capChart as typeof capChart; renderCapacities(main); }));
  main.querySelector('#cap-config')!.addEventListener('click', () => ctx.setView('system'));
}

function barChart(values: number[], ds: Date[], cumulative: boolean) {
  const vals = cumulative ? values.map((_, i) => values.slice(0, i + 1).reduce((s, v) => s + v, 0)) : values;
  const max = Math.max(...vals, 1);
  const top = Math.ceil(max / 20) * 20;
  const w = 720, h = 200, left = 40, bottom = 24;
  const bw = (w - left) / vals.length;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f));
  return `<svg class="ext-bars" viewBox="0 0 ${w} ${h + bottom}" role="img" aria-label="${cumulative ? 'Cumulative' : 'Daily'} CU consumption">
    ${ticks.map((v) => { const y = h - (v / top) * (h - 10); return `<line x1="${left}" x2="${w}" y1="${y}" y2="${y}" class="ext-grid"/><text x="${left - 6}" y="${y + 4}" class="ext-tick" text-anchor="end">${v}</text>`; }).join('')}
    ${vals.map((v, i) => { const bh = (v / top) * (h - 10); const x = left + i * bw + bw * 0.18;
      return `<rect x="${x.toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${bh.toFixed(1)}" class="ext-bar"><title>${ds[i].toISOString().slice(0, 10)}: ${v.toFixed(2)} CU</title></rect>
        ${vals.length <= 16 || i % 3 === 0 ? `<text x="${(x + bw * 0.32).toFixed(1)}" y="${h + 16}" class="ext-tick" text-anchor="middle">${ds[i].getUTCDate()}</text>` : ''}`; }).join('')}
  </svg>`;
}

function spacesTable(t: ReturnType<typeof ctx.tenant>, ds: Date[]) {
  const used = assigned(t);
  const memoryCU = ds.reduce((s, d) => s + dailyCU(t, d).memory, 0);
  const diskCU = ds.reduce((s, d) => s + dailyCU(t, d).disk, 0);
  return `<section class="panel" id="cap-spaces"><div class="table-scroll"><table class="grid">
    <thead><tr><th>Space</th><th class="num">In-Memory Assigned</th><th class="num">Disk Assigned</th><th class="num">Memory and Compute CU</th><th class="num">Disk CU</th><th class="num">Share</th></tr></thead>
    <tbody>${t.spaces.map((sp) => {
      const m = memoryCU * (sp.memoryGB / Math.max(1, used.memoryGB));
      const dk = diskCU * (sp.diskGB / Math.max(1, used.diskGB));
      return `<tr><td class="mono">${esc(sp.id)}</td><td class="num">${sp.memoryGB} GB</td><td class="num">${sp.diskGB} GB</td><td class="num">${m.toFixed(2)}</td><td class="num">${dk.toFixed(2)}</td>
        <td class="num">${pct(m + dk, memoryCU + diskCU).toFixed(0)}%</td></tr>`;
    }).join('')}</tbody></table></div>
    <p class="muted">Lowering the in-memory assignment of a space that does not need it is the quickest way to save capacity units.</p></section>`;
}

// ---------------------------------------------------------------- Elastic Compute Nodes

let selectedEcn = '';

export function renderEcn(main: HTMLElement) {
  const t = ctx.tenant();
  const x = t.extras;
  const sel = x.ecns.find((e) => e.name === selectedEcn) ?? x.ecns[0];
  const used = usedBlockHours(x);
  main.innerHTML = `
    <div class="ext-page">
      <div class="ext-head"><div><h1 class="view-title">Elastic Compute Nodes</h1>
        <p class="view-lead">Extra compute for peak loads, such as the month-end close. A running node takes over the persisted views and local tables of its spaces,
          so heavy reads do not slow down everyone else. It is billed in block-hours while it runs.</p></div></div>
      <div class="ext-kpis three">
        <section class="panel ext-kpi"><b>Block-Hours Used</b><p class="ext-kpi-value" id="ecn-used">${used} <small>of ${BLOCK_HOURS}</small></p>
          <span class="bar"><i style="width:${Math.max(1, pct(used, BLOCK_HOURS)).toFixed(1)}%"></i></span></section>
        <section class="panel ext-kpi"><b>Running Nodes</b><p class="ext-kpi-value">${x.ecns.filter(isRunning).length}</p></section>
        <section class="panel ext-kpi"><b>Nodes</b><p class="ext-kpi-value">${x.ecns.length}</p></section>
      </div>
      <section class="panel">
        <div class="ext-list-head"><h3>Elastic Compute Nodes (${x.ecns.length})</h3>
          <span class="spacer"></span><button class="btn primary small" type="button" id="ecn-create">Create</button></div>
        <div class="table-scroll"><table class="grid" id="ecn-list">
          <thead><tr><th>Name</th><th>Performance Class</th><th class="num">Compute Blocks</th><th>Spaces</th><th>Status</th><th>Last Run</th><th></th></tr></thead>
          <tbody>${x.ecns.length ? x.ecns.map((e) => `<tr data-ecn="${esc(e.name)}" class="${e === sel ? 'selected' : ''}">
            <td class="mono"><button class="btn link" type="button" data-ecn-open="${esc(e.name)}">${esc(e.name)}</button></td><td>${e.perf}</td><td class="num">${e.blocks}</td>
            <td class="mono small">${e.spaces.map(esc).join(', ') || '<span class="muted">none</span>'}</td>
            <td>${isRunning(e) ? '<span class="ext-status run">Running</span>' : '<span class="ext-status">Ready</span>'}</td>
            <td class="muted">${e.runs[0] ? new Date(e.runs[0].start).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</td>
            <td class="actions">${isRunning(e) ? `<button class="btn small" type="button" data-ecn-stop="${esc(e.name)}">Stop</button>`
              : `<button class="btn small" type="button" data-ecn-start="${esc(e.name)}">Start</button> <button class="btn link small" type="button" data-ecn-delete="${esc(e.name)}">Delete</button>`}</td></tr>`).join('')
            : '<tr><td colspan="7" class="muted">No elastic compute node yet. Create one, assign spaces, then start it before the peak.</td></tr>'}</tbody></table></div>
      </section>
      ${sel ? ecnDetail(sel) : ''}
      <p class="muted ext-note">Simplified: the Handbuch marks the setup as dependent on license (10.4.5, 3.3.2). In this game a run is billed by the full hour
        (at least one hour times the compute blocks), performance figures are simulated.</p>
    </div>`;
  main.querySelector('#ecn-create')!.addEventListener('click', () => ecnDialog(main));
  main.querySelectorAll<HTMLButtonElement>('[data-ecn-open]').forEach((b) => b.addEventListener('click', () => { selectedEcn = b.dataset.ecnOpen!; renderEcn(main); }));
  main.querySelectorAll<HTMLButtonElement>('[data-ecn-start]').forEach((b) => b.addEventListener('click', () => {
    const e = x.ecns.find((n) => n.name === b.dataset.ecnStart)!;
    if (!e.spaces.length) return toast(`${e.name} serves no space yet. Edit it and assign at least one space.`, 'error');
    const left = BLOCK_HOURS - usedBlockHours(x);
    if (left < e.blocks) return toast(`Not enough block-hours left this month (${left}). One hour of ${e.name} needs ${e.blocks}.`, 'error');
    e.runs.unshift({ start: new Date().toISOString() });
    e.runs.splice(30);
    selectedEcn = e.name;
    ctx.track(`ecn-start:${e.name}`);
    ctx.save();
    toast(`${e.name} is starting. Persisted views of ${e.spaces.join(', ')} are now read from the node.`);
    renderEcn(main);
  }));
  main.querySelectorAll<HTMLButtonElement>('[data-ecn-stop]').forEach((b) => b.addEventListener('click', () => {
    const e = x.ecns.find((n) => n.name === b.dataset.ecnStop)!;
    stopEcn(e);
    ctx.track(`ecn-stop:${e.name}`);
    ctx.save();
    toast(`${e.name} stopped. Billed ${e.runs[0].blockHours} block-hours.`);
    renderEcn(main);
  }));
  main.querySelectorAll<HTMLButtonElement>('[data-ecn-delete]').forEach((b) => b.addEventListener('click', async () => {
    const name = b.dataset.ecnDelete!;
    if (!(await ask(`Delete the elastic compute node ${name}? Its run history is removed too.`, 'Delete'))) return;
    x.ecns = x.ecns.filter((n) => n.name !== name);
    ctx.save();
    renderEcn(main);
  }));
  main.querySelector('#ecn-edit')?.addEventListener('click', () => ecnDialog(main, sel));
}

function ecnDetail(e: Ecn) {
  const info = PERF_INFO[e.perf];
  const run = isRunning(e);
  const mins = run ? Math.max(1, Math.round((Date.now() - new Date(e.runs[0].start).getTime()) / 60000)) : 0;
  return `<section class="panel ext-detail" id="ecn-detail"><div class="ext-list-head"><h3>${esc(e.name)}</h3><span class="spacer"></span>
      <button class="btn small" type="button" id="ecn-edit" ${run ? 'disabled title="Stop the node to change it"' : ''}>Edit</button></div>
    <dl class="ext-dl"><div><dt>Configuration</dt><dd>${e.perf}, ${e.blocks} compute blocks = ${info.vcpu * e.blocks} vCPUs, ${info.memGB * e.blocks} GB memory</dd></div>
      <div><dt>Status</dt><dd>${run ? `Running for ${mins} min` : 'Ready (not running)'}</dd></div>
      <div><dt>CPU</dt><dd>${run ? `${18 + (e.blocks * 7) % 40} %` : '—'}</dd></div>
      <div><dt>Memory (incl. replicated data)</dt><dd>${run ? `${(e.spaces.length * 1.7 + 0.4).toFixed(1)} GB` : '—'}</dd></div>
      <div><dt>Runs</dt><dd>${e.runs.length ? e.runs.slice(0, 5).map((r) => `${new Date(r.start).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}${r.end ? ` · ${r.blockHours} block-hours` : ' · running'}`).join('<br>') : 'Not started yet'}</dd></div>
      <div><dt>Errors</dt><dd>None</dd></div></dl></section>`;
}

function ecnDialog(main: HTMLElement, existing?: Ecn) {
  const t = ctx.tenant();
  const { form, close } = openDialog(existing ? `Edit ${existing.name}` : 'Create Elastic Compute Node', `
    <div class="form-grid">
      <label>Technical Name <small>3 to 9 lowercase letters and digits (simplified)</small><input name="name" value="${esc(existing?.name ?? '')}" ${existing ? 'readonly' : ''} placeholder="e.g. monthend" maxlength="9" autocomplete="off" spellcheck="false"></label>
      <label>Performance Class <small>memory-heavy reads or calculations</small><select name="perf">${(['Memory', 'Compute', 'High Compute'] as PerfClass[]).map((p) =>
        `<option ${existing?.perf === p ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
      <label>Compute Blocks <small>1 to 32; each block costs one block-hour per hour</small><input name="blocks" type="number" min="1" max="32" value="${existing?.blocks ?? 4}"></label>
    </div>
    <fieldset class="question share-targets"><legend>Spaces the node serves</legend>${t.spaces.map((s) => `<label><input type="checkbox" name="space" value="${esc(s.id)}" ${existing?.spaces.includes(s.id) ? 'checked' : ''}> ${esc(s.id)}</label>`).join('')}</fieldset>
    <p class="form-error" role="alert"></p>
    <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button><button class="btn primary" type="submit">${existing ? 'Save' : 'Create'}</button></div>`);
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = new FormData(form);
    const name = String(f.get('name') ?? '').trim();
    const err = form.querySelector<HTMLElement>('.form-error')!;
    if (!existing && !/^[a-z][a-z0-9]{2,8}$/.test(name)) return void (err.textContent = 'Use 3 to 9 lowercase letters and digits, starting with a letter.');
    if (!existing && t.extras.ecns.some((e) => e.name === name)) return void (err.textContent = `${name} exists already.`);
    const node: Ecn = existing ?? { name, perf: 'Memory', blocks: 4, spaces: [], runs: [] };
    node.perf = String(f.get('perf')) as PerfClass;
    node.blocks = Math.min(32, Math.max(1, Math.round(Number(f.get('blocks')) || 4)));
    node.spaces = f.getAll('space').map(String);
    if (!existing) t.extras.ecns.push(node);
    selectedEcn = node.name;
    ctx.track(`ecn-save:${node.name}`);
    ctx.save();
    close();
    renderEcn(main);
  });
}
