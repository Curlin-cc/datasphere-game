import { ctx } from '../ctx';
import { simulateStories, fmtMs, type Statement } from '../perf';
import { systemTo } from './system';
import { esc, fmtDate, toast } from '../ui';

/**
 * Monitoring › Expensive Statement Logs (chapter 9, Handbuch 10.4.3/10.4.4): SQL statements above the tracing threshold
 * with duration, peak memory and CPU time. Filled only while expensive statement tracing is on (System › Configuration ›
 * Monitoring). In the game the statements come from simulated SAP Analytics Cloud stories and from Data Previews of
 * analytic models; runtimes are simulated for production volume.
 */

let sortBy: 'time' | 'duration' = 'time';

export function renderStatements(main: HTMLElement) {
  const t = ctx.tenant();
  const list = [...t.statements].sort((a, b) => (sortBy === 'time' ? b.at.localeCompare(a.at) : b.ms - a.ms));
  main.innerHTML = `
    <div class="view-head">
      <div><h1 class="view-title">Expensive Statement Logs</h1>
        <p class="view-lead">SQL statements of all spaces that took longer than ${t.tracing.thresholdMs.toLocaleString('en-US')} ms. Use them to find the views and models worth tuning.</p></div>
      <div class="head-actions">
        <label class="inline-select">Sort by <select id="st-sort">
          <option value="time" ${sortBy === 'time' ? 'selected' : ''}>Start time</option>
          <option value="duration" ${sortBy === 'duration' ? 'selected' : ''}>Duration</option></select></label>
        <button class="btn small" type="button" id="st-refresh" ${t.tracing.enabled ? '' : 'disabled'} title="Let the controllers open their stories again">Refresh</button>
      </div>
    </div>
    ${t.tracing.enabled ? '' : `<div class="consent-banner" id="tracing-banner" role="note">
        <span>Expensive statement tracing is off, so no statements are recorded. Enable it in System › Configuration › Monitoring.</span>
        <button class="btn small" type="button" id="to-tracing">Open Configuration</button></div>`}
    <section class="panel">
      <div class="table-scroll"><table class="grid" id="statement-list">
        <thead><tr><th>Start Time</th><th>Object</th><th class="num">Duration</th><th class="num">Peak Memory</th><th class="num">CPU Time</th>
          <th>User</th><th>Application</th><th>Space</th><th>Statement</th></tr></thead>
        <tbody>${list.length ? list.map(row).join('') : `<tr><td colspan="9" class="muted">${t.tracing.enabled
          ? 'No statement above the threshold yet.' : 'Nothing recorded: tracing is off.'}</td></tr>`}</tbody>
      </table></div>
      <p class="muted">Durations, memory and CPU time are simulated for production volume; the training tenant holds only a sample.
        Data Previews of analytic models in the Data Builder appear here too.</p>
    </section>`;
  main.querySelector<HTMLSelectElement>('#st-sort')!.addEventListener('change', (e) => {
    sortBy = (e.target as HTMLSelectElement).value as typeof sortBy;
    ctx.track(`statements-sort:${sortBy}`);
    renderStatements(main);
  });
  main.querySelector('#st-refresh')?.addEventListener('click', async () => {
    await simulateStories(t);
    ctx.track('statements-refresh');
    ctx.save();
    toast('The controllers opened their stories again.');
    renderStatements(main);
  });
  main.querySelector('#to-tracing')?.addEventListener('click', () => {
    systemTo('monitoring');
    ctx.setView('system');
  });
}

function row(s: Statement) {
  const [space, name] = s.object.split('.');
  return `<tr data-statement="${esc(s.object)}"><td class="muted">${fmtDate(s.at)}</td><td class="mono">${esc(name)}</td>
    <td class="num"><b>${fmtMs(s.ms)}</b></td><td class="num">${s.memMB.toLocaleString('en-US')} MB</td><td class="num">${fmtMs(s.cpuMs)}</td>
    <td>${esc(s.user)}</td><td>${esc(s.source)}</td><td class="mono">${esc(space)}</td><td class="mono small">${esc(s.statement)}</td></tr>`;
}
