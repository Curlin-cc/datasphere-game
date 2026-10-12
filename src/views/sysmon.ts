import { ctx } from '../ctx';
import { CAPACITY, assigned } from '../tenant';
import { diskBreakdown, memoryUsedGB, failedRuns, dailyCU, monthDays } from '../extras';
import { usedMB, fmtSize } from './welcome';
import { esc } from '../ui';

/**
 * Monitoring › System and Spaces (Bild 5) and Capacities (Bild 4). Elastic compute nodes: views/ecn.ts.
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
      : `<div id="sm-objectstore">
          <label class="ext-field">Spaces <select disabled><option>No file spaces</option></select></label>
          <div class="ext-kpis">
            <section class="panel ext-kpi"><b>SAP HANA Data Lake Files: Storage Utilization</b><p class="ext-kpi-value">0 <small>TB</small></p><p class="muted small">selected file space</p></section>
            <section class="panel ext-kpi"><b>SAP HANA Data Lake Files: Storage Utilization of All Spaces</b><p class="ext-kpi-value">0 <small>TB</small></p></section>
          </div>
          <section class="panel"><div class="ext-list-head"><h3>Apache Spark: Tasks</h3><span class="spacer"></span>
              <label class="ext-field">Date and Time Range <select disabled><option>Last 7 Days</option></select></label></div>
            <div class="table-scroll"><table class="grid"><thead><tr><th>Application Name</th><th>Object Type</th><th>Task Activity</th><th class="num">Number of Tasks</th></tr></thead>
              <tbody><tr><td colspan="4" class="muted">No data</td></tr></tbody></table></div></section>
          <p class="muted ext-note">The object store keeps the data of <b>file spaces</b> (SAP HANA data lake files) instead of SAP HANA; local tables (file) and
            transformation flows there run on Apache Spark. This tenant has only SAP HANA spaces, so the tab stays empty, as in a real tenant without file spaces.</p>
        </div>`}
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

/**
 * Capacities › Spaces after SAP help ("Monitoring Capacity Unit Consumption"): per space the premium outbound volume, the object
 * store figures and the capacity units. The game has no premium outbound and no file spaces, so those stay 0; the CU share is
 * derived from the space's assigned storage. Two game columns explain where the CU come from.
 */
function spacesTable(t: ReturnType<typeof ctx.tenant>, ds: Date[]) {
  const used = assigned(t);
  const memoryCU = ds.reduce((s, d) => s + dailyCU(t, d).memory, 0);
  const diskCU = ds.reduce((s, d) => s + dailyCU(t, d).disk, 0);
  return `<section class="panel" id="cap-spaces"><div class="ext-list-head"><h3>Spaces (${t.spaces.length})</h3><span class="spacer"></span>
      <button class="btn small link" type="button" disabled title="Downloads the hourly CU measurements as CSV; not in this game">Download Capacity Metrics as CSV</button></div>
    <div class="table-scroll"><table class="grid">
    <thead><tr><th>Technical Name</th><th class="num">Premium Outbound Volume Consumption</th><th class="num">Object Store Storage Consumption</th>
      <th class="num">Object Store Compute Consumption</th><th class="num">Object Store Control Plane Requests</th><th class="num">Object Store Category 1 (Read) Requests</th>
      <th class="num">Object Store Category 2 (Write) Requests</th><th class="num">Capacity Unit Consumption</th>
      <th class="num">In-Memory / Disk Assigned (game)</th><th class="num">Share (game)</th></tr></thead>
    <tbody>${t.spaces.map((sp) => {
      const m = memoryCU * (sp.memoryGB / Math.max(1, used.memoryGB));
      const dk = diskCU * (sp.diskGB / Math.max(1, used.diskGB));
      return `<tr><td class="mono">${esc(sp.id)}</td><td class="num">0 GB</td><td class="num">0 TBh</td><td class="num">0 GBh</td><td class="num">0</td><td class="num">0</td><td class="num">0</td>
        <td class="num"><b>${(m + dk).toFixed(2)}</b></td><td class="num">${sp.memoryGB} GB / ${sp.diskGB} GB</td><td class="num">${pct(m + dk, memoryCU + diskCU).toFixed(0)}%</td></tr>`;
    }).join('')}</tbody></table></div>
    <p class="muted">Object store figures only count for file spaces (SAP HANA data lake files); premium outbound for replication flows to non-SAP targets.
      Lowering the in-memory assignment of a space that does not need it is the quickest way to save capacity units.</p></section>`;
}
