import { ctx } from '../ctx';
import { CAPACITY, assigned } from '../tenant';
import { CLOUD_CONNECTORS, CERTIFICATE_FILES } from '../integration';
import { esc, openDialog, toast } from '../ui';
import { THRESHOLDS, simulateStories } from '../perf';

/**
 * System app: Configuration (tenant-wide settings) and About. In the game, Configuration > Security
 * (trusted certificates) and Configuration > Data Integration (Cloud Connectors, agents) are interactive;
 * the other areas explain what they are for.
 */

type Tab = 'integration' | 'security' | 'audit' | 'monitoring' | 'ip' | 'tasklogs' | 'dbaccess' | 'tenant' | 'workload';
let tab: Tab = 'integration';
let area: 'configuration' | 'about' = 'configuration';

/** Configuration tabs in the order of the real tenant (Bild 15). */
const TABS: { id: Tab; label: string; text: string }[] = [
  { id: 'integration', label: 'Data Integration', text: 'Cloud Connectors and Data Provisioning Agents that reach systems in the company network.' },
  { id: 'security', label: 'Security', text: 'Trusted certificates for TLS connections to source systems.' },
  { id: 'audit', label: 'Audit', text: 'Which space keeps the audit logs and how long they are kept.' },
  { id: 'monitoring', label: 'Monitoring', text: 'What the monitoring apps record, for example expensive statements: SQL statements that exceed a threshold of runtime or memory.' },
  { id: 'ip', label: 'IP Allowlist', text: 'Which public IPv4 ranges may connect to the database of the tenant directly, for example a Data Provisioning Agent or a BI tool.' },
  { id: 'tasklogs', label: 'Tasks', text: 'How long the logs of loads, flows and task chains are kept before they are deleted.' },
  { id: 'dbaccess', label: 'Database Access', text: 'Database analysis users and other tenant-wide database users for support and analysis. Database users for tools are created per space in Space Management.' },
  { id: 'tenant', label: 'Tenant Configuration', text: 'How much disk, memory and compute the tenant has, and how it is split up. Changes here change what the tenant costs.' },
  { id: 'workload', label: 'Workload Management', text: 'Priorities and statement limits, per space or per group of processes (for example analytic consumption versus modeling).' },
];

export function renderSystem(main: HTMLElement) {
  const t = ctx.tenant();
  const used = assigned(t);
  const info = TABS.find((x) => x.id === tab)!;
  main.classList.add('bleed');
  main.innerHTML = `
    <div class="sys-page">
      <nav class="sys-tabs sub-nav" aria-label="Configuration areas">
        ${TABS.map((x) => `<button type="button" data-tab="${x.id}" ${area === 'configuration' && x.id === tab ? 'aria-current="page"' : ''}>${esc(x.label)}</button>`).join('')}
        <span class="spacer"></span>
        <button type="button" class="sys-more" data-area="${area === 'about' ? 'configuration' : 'about'}" ${area === 'about' ? 'aria-current="page"' : ''}>About</button>
      </nav>
      ${area === 'about' ? `<section class="sys-section"><h2>About</h2><div class="sys-content panel">
          <dl class="props-list wide-dl"><dt>Tenant</dt><dd>Stadtwerke Rheinau, training tenant</dd>
            <dt>Capacity</dt><dd>${CAPACITY.diskGB} GB disk, ${CAPACITY.memoryGB} GB in-memory</dd>
            <dt>Version</dt><dd>Datasphere Game, simulated</dd></dl>
          <p class="muted">In a real tenant, About shows the version, the tenant URL and the license figures.</p></div></section>`
      : `<section class="sys-section"><h2>${esc(info.label)}</h2>
          <div class="sys-content system-body" id="system-body">${body(tab, used)}</div></section>`}
    </div>`;

  main.querySelectorAll<HTMLButtonElement>('[data-area]').forEach((b) =>
    b.addEventListener('click', () => {
      area = b.dataset.area as typeof area;
      ctx.track(`system:${area}`);
      renderSystem(main);
    }),
  );
  main.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      tab = b.dataset.tab as Tab;
      area = 'configuration';
      ctx.track(`system:${tab}`);
      renderSystem(main);
    }),
  );
  main.querySelector('#cert-upload')?.addEventListener('click', () => uploadDialog(main));
  main.querySelector<HTMLFormElement>('#tracing-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const was = t.tracing.enabled;
    const changedThreshold = t.tracing.thresholdMs !== Number(main.querySelector<HTMLSelectElement>('#tracing-threshold')!.value);
    t.tracing.enabled = main.querySelector<HTMLInputElement>('#tracing-on')!.checked;
    t.tracing.thresholdMs = Number(main.querySelector<HTMLSelectElement>('#tracing-threshold')!.value);
    ctx.track(`tracing:${t.tracing.enabled ? 'on' : 'off'}:${t.tracing.thresholdMs}`);
    if (t.tracing.enabled && (!was || changedThreshold)) {
      // The month-end close starts: the controllers open their stories.
      await simulateStories(t);
      toast('Tracing is on. The controllers just opened their month-end stories; see Monitoring › Expensive Statement Logs.', 'ok');
    } else toast(t.tracing.enabled ? 'Tracing settings saved' : 'Expensive statement tracing is off', 'ok');
    ctx.save();
    renderSystem(main);
  });
  main.querySelectorAll<HTMLButtonElement>('[data-cert-delete]').forEach((b) =>
    b.addEventListener('click', () => {
      if (!confirm(`Delete the certificate ${b.dataset.certDelete}? TLS connections that rely on it stop validating.`)) return;
      t.certificates = t.certificates.filter((c) => c !== b.dataset.certDelete);
      ctx.save();
      renderSystem(main);
    }),
  );
}

/** For tutorials: open one configuration area. */
export function systemTo(target: Tab) {
  area = 'configuration';
  tab = target;
}

function body(id: Tab, used: { diskGB: number; memoryGB: number }) {
  const t = ctx.tenant();
  const info = TABS.find((x) => x.id === id)!;
  const head = `<p class="sys-lead">${esc(info.text)}</p>`;
  if (id === 'security') {
    return `${head}
      <div class="table-head"><h4>Trusted certificates</h4><button class="btn small primary" type="button" id="cert-upload">Upload Certificate</button></div>
      <table class="grid" id="cert-list"><thead><tr><th>Name</th><th>Uploaded</th><th></th></tr></thead>
        <tbody>${t.certificates.length ? t.certificates.map((c) => `<tr><td>${esc(c)}</td><td class="muted">by you</td>
          <td><button class="btn small link" type="button" data-cert-delete="${esc(c)}">Delete</button></td></tr>`).join('')
          : '<tr><td colspan="3" class="muted">No certificates uploaded. TLS connections to servers with their own certificates will not validate.</td></tr>'}</tbody></table>
      <p class="muted">Upload the server certificate of the source, or the certificate of the authority (CA) that signed it.
        A CA certificate covers every server it signed.</p>`;
  }
  if (id === 'integration') {
    return `${head}
      <h4>Cloud Connectors</h4>
      <table class="grid" id="cc-list"><thead><tr><th>Location ID</th><th>Subaccount</th><th>Status</th></tr></thead>
        <tbody>${CLOUD_CONNECTORS.map((c) => `<tr><td class="mono">${esc(c.location)}</td><td>${esc(c.subaccount)}</td>
          <td><span class="status" data-status="deployed">${esc(c.status)}</span></td></tr>`).join('')}</tbody></table>
      <p class="muted">The Cloud Connector runs in the company network and opens a secure tunnel to the tenant. A connection to an
        on-premise source names its <b>location ID</b>. IT installed this one in the Rheinau data center.</p>
      <h4>Data Provisioning Agents</h4>
      <p class="muted">None registered. An agent is installed on-premise for some remote table and real-time scenarios;
        only adapters with status CONNECTED can be used in connections.</p>`;
  }
  if (id === 'tenant') {
    return `${head}<dl class="props-list wide-dl"><dt>Disk</dt><dd>${CAPACITY.diskGB} GB, ${used.diskGB} GB assigned to spaces</dd>
      <dt>In-memory</dt><dd>${CAPACITY.memoryGB} GB, ${used.memoryGB} GB assigned to spaces</dd></dl>`;
  }
  if (id === 'monitoring') {
    const tr = t.tracing;
    if (ctx.currentChapter() < 9) return `${head}<p class="muted">You switch on expensive statement tracing in chapter 9.</p>`;
    return `${head}
      <form id="tracing-form" class="tracing-form">
        <label class="check-line"><input type="checkbox" id="tracing-on" ${tr.enabled ? 'checked' : ''}> <b>Enable Expensive Statement Tracing</b></label>
        <label class="field">Threshold: duration
          <select id="tracing-threshold">${THRESHOLDS.map((ms) => `<option value="${ms}" ${tr.thresholdMs === ms ? 'selected' : ''}>${ms.toLocaleString('en-US')} ms</option>`).join('')}</select></label>
        <div><button class="btn primary small" type="submit">Save</button></div>
      </form>
      <p class="muted">Statements that run longer than the threshold appear in <b>Monitoring › Expensive Statement Logs</b>, with duration,
        peak memory and CPU time. Without tracing, the logs stay empty and peak memory is missing. A real tenant also offers thresholds for memory and CPU time.</p>`;
  }
  if (id === 'dbaccess') {
    return `${head}<p class="muted">Not simulated in this game. ${ctx.currentChapter() >= 12 ? 'You create database users for Power BI and other tools in Space Management › Database Access.' : 'Database users for external tools come in the excursions (chapter 12).'}</p>`;
  }
  if (id === 'ip') {
    return `${head}<p class="muted">No entries. Two directions to keep apart: the allowlist here controls who may reach the tenant's database.
      Sources behind a firewall must in turn allow the tenant's outbound (egress) IP addresses for data and replication flows.</p>`;
  }
  return `${head}<p class="muted">Not simulated in this game.</p>`;
}

function uploadDialog(main: HTMLElement) {
  const t = ctx.tenant();
  const { form, close } = openDialog('Upload Certificate', `
    <p class="guide-lead">Choose a certificate file. Jonas put the files IT uses into your downloads folder.</p>
    <fieldset class="question"><legend>Downloads</legend>
      ${CERTIFICATE_FILES.map((f) => `<label><input type="radio" name="file" value="${esc(f.name)}"> <span class="mono">${esc(f.file)}</span> <small class="muted">${esc(f.text)}</small></label>`).join('')}
    </fieldset>
    <p class="form-error" role="alert"></p>
    <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button>
      <button class="btn primary" type="submit">Upload</button></div>`);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const chosen = form.querySelector<HTMLInputElement>('[name="file"]:checked')?.value;
    if (!chosen) {
      form.querySelector('.form-error')!.textContent = 'Choose a file.';
      return;
    }
    if (!t.certificates.includes(chosen)) t.certificates.push(chosen);
    ctx.track(`upload-cert:${chosen}`);
    ctx.save();
    close();
    toast(`Certificate "${chosen}" uploaded`);
    renderSystem(main);
  });
}
