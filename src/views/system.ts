import { ctx } from '../ctx';
import { CAPACITY, assigned } from '../tenant';
import { CLOUD_CONNECTORS, CERTIFICATE_FILES } from '../integration';
import { esc, openDialog, toast, ask } from '../ui';
import { THRESHOLDS, simulateStories } from '../perf';
import { EXCURSIONS } from '../content/chapters';
import { objectKey } from '../repo';
import {
  OAUTH_PURPOSES, OAUTH_ENDPOINTS, SAC_PLANNING, oauthClientError, newClientId, odataRequest, odataUrl, type OAuthPurpose, type OAuthClient,
  TIME_UNITS, formatLifetime,
} from '../consumption';
import { GLOBAL_ADMIN, TEMPLATES, TEMPLATE_ORDER } from '../security';
import { registerLocation } from '../nav';

/**
 * System app with its pages in the side navigation (System ›, Bild 20): Configuration (tenant-wide settings) and Administration. About sits in the user menu (src/views/settings.ts). In the game, Configuration > Security
 * (trusted certificates) and Configuration > Data Integration (Cloud Connectors, agents) are interactive;
 * the other areas explain what they are for.
 */

type Tab = 'integration' | 'security' | 'audit' | 'monitoring' | 'ip' | 'tasklogs' | 'dbaccess' | 'tenant' | 'workload';
let tab: Tab = 'integration';
export type SystemArea = 'configuration' | 'administration';
export const SYSTEM_PAGES: { id: SystemArea; label: string }[] = [
  { id: 'configuration', label: 'Configuration' },
  { id: 'administration', label: 'Administration' },
];
let area: SystemArea = 'configuration';
/** Current page; with an argument, switch to that page (navigation). */
export function systemArea(next?: SystemArea) {
  if (next) area = next;
  return area;
}

type AdminTab = 'system' | 'sources' | 'security' | 'apps' | 'notifications';
let adminTab: AdminTab = 'system';
registerLocation('system', { get: () => ({ area, tab, adminTab }), set: (l: { area: SystemArea; tab: Tab; adminTab: AdminTab }) => ({ area, tab, adminTab } = l) });
/** Administration tabs as in the real tenant. Only explained in the game. */
const ADMIN_TABS: { id: AdminTab; label: string; sections: [string, string][] }[] = [
  { id: 'system', label: 'System Configuration', sections: [
    ['Session Timeout', 'How long an idle browser session stays logged on.'],
    ['Allow SAP support user creation', 'Lets SAP support log on to analyse an incident, only for as long as the incident is open.'],
  ] },
  { id: 'sources', label: 'Data Source Configuration', sections: [
    ['SAP BTP Core Account', 'The subaccount the Cloud Connectors register in. Needed before any on-premise source can be reached.'],
    ['Live Data Sources', 'Which Cloud Connector location carries live connections to on-premise systems.'],
  ] },
  { id: 'security', label: 'Security', sections: [
    ['Authentication Method', 'Who checks the passwords: SAP Cloud Identity Services by default, or the company\'s own identity provider (SAML single sign-on).'],
    ['User ID', 'Which attribute of the identity provider becomes the user name in Security › Users.'],
  ] },
  { id: 'apps', label: 'App Integration', sections: [
    ['OAuth Clients', 'Technical clients for tools and scripts that call the tenant, for example an OData consumer or the command line interface.'],
    ['Trusted Identity Providers', 'Identity providers whose tokens the tenant accepts for OAuth clients.'],
  ] },
  { id: 'notifications', label: 'Notifications', sections: [
    ['Email Notifications', 'Whether users get an email in addition to the bell in the shellbar, for example when a task chain fails.'],
  ] },
];

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
      ${area === 'administration' ? `<nav class="sys-tabs sub-nav" aria-label="Administration areas">
          ${ADMIN_TABS.map((x) => `<button type="button" data-admin="${x.id}" ${x.id === adminTab ? 'aria-current="page"' : ''}>${esc(x.label)}</button>`).join('')}
        </nav>
        ${adminTab === 'apps' && ctx.currentChapter() >= EXCURSIONS ? appIntegration()
          : ADMIN_TABS.find((x) => x.id === adminTab)!.sections.map(([h, text]) => `<section class="sys-section"><h2>${esc(h)}</h2>
          <div class="sys-content panel"><p class="sys-lead">${esc(text)}</p><p class="muted">Set up by the tenant owner; not part of this game.</p></div></section>`).join('')}`
      : `<nav class="sys-tabs sub-nav" aria-label="Configuration areas">
          ${TABS.map((x) => `<button type="button" data-tab="${x.id}" ${x.id === tab ? 'aria-current="page"' : ''}>${esc(x.label)}</button>`).join('')}
        </nav>
        <section class="sys-section"><h2>${esc(info.label)}</h2>
          <div class="sys-content system-body" id="system-body">${body(tab, used)}</div></section>`}
    </div>`;

  main.querySelectorAll<HTMLButtonElement>('[data-admin]').forEach((b) =>
    b.addEventListener('click', () => {
      adminTab = b.dataset.admin as AdminTab;
      ctx.track(`admin:${adminTab}`);
      renderSystem(main);
    }),
  );
  main.querySelector('#oauth-add')?.addEventListener('click', () => oauthDialog(main));
  main.querySelectorAll<HTMLButtonElement>('[data-oauth-test]').forEach((b) => b.addEventListener('click', () => odataDialog(b.dataset.oauthTest!)));
  main.querySelectorAll<HTMLButtonElement>('[data-oauth-delete]').forEach((b) =>
    b.addEventListener('click', async () => {
      const name = b.dataset.oauthDelete!;
      if (!await ask(`Delete the OAuth client ${name}? Every tool that uses it stops working.`)) return;
      t.oauthClients = t.oauthClients.filter((c) => c.name !== name);
      ctx.track(`oauth-delete:${name}`);
      ctx.save();
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
    b.addEventListener('click', async () => {
      if (!await ask(`Delete the certificate ${b.dataset.certDelete}? TLS connections that rely on it stop validating.`)) return;
      t.certificates = t.certificates.filter((c) => c !== b.dataset.certDelete);
      ctx.save();
      renderSystem(main);
    }),
  );
}

/** For tutorials: open one configuration area. */
export function systemTo(target: Tab | 'admin-apps') {
  if (target === 'admin-apps') {
    area = 'administration';
    adminTab = 'apps';
    return;
  }
  area = 'configuration';
  tab = target;
}

// ---------------------------------------------------------------- Administration › App Integration (excursions, Handbuch 12.7)

function appIntegration() {
  const t = ctx.tenant();
  return `<section class="sys-section stacked"><h2>OAuth Clients</h2>
      <div class="sys-content">
        <p class="sys-lead">Tools that call the tenant's APIs, for example an OData client or an SAP Analytics Cloud import connection, sign in through an OAuth client.</p>
        <div class="table-head"><h4>OAuth Clients (${t.oauthClients.length})</h4><span class="spacer"></span><button class="btn small primary" type="button" id="oauth-add">Add a New OAuth Client</button></div>
        <table class="grid" id="oauth-list"><thead><tr><th>Name</th><th>Purpose</th><th>Grant</th><th>Redirect URI / User ID</th><th>Token Lifetime</th><th>Client ID</th><th></th></tr></thead>
          <tbody>${t.oauthClients.length ? t.oauthClients.map((c) => `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.purpose)}</td>
              <td>${esc(OAUTH_PURPOSES.find((p) => p.id === c.purpose)!.grant)}</td><td class="mono wrap">${esc(c.technical ? c.technical.userId : c.redirectUri || '–')}</td>
              <td>${esc(formatLifetime(c.lifetimeS))}</td><td class="mono wrap">${esc(c.clientId)}</td>
              <td class="row-actions"><button class="btn small" type="button" data-oauth-test="${esc(c.name)}" title="Simulated: call the OData API the way a tool would">Test</button>
                <button class="btn small link" type="button" data-oauth-delete="${esc(c.name)}">Delete</button></td></tr>`).join('')
            : '<tr><td colspan="7" class="muted">No OAuth clients yet.</td></tr>'}</tbody></table>
      </div></section>
    <section class="sys-section"><h2>OAuth Endpoints</h2><div class="sys-content panel">
      <dl class="props-list wide-dl"><dt>Authorization URL</dt><dd class="mono wrap">${esc(OAUTH_ENDPOINTS.authorization)}</dd>
        <dt>Token URL</dt><dd class="mono wrap">${esc(OAUTH_ENDPOINTS.token)}</dd></dl>
      <p class="muted">The developer of the tool needs these two URLs plus client ID and secret.</p></div></section>
    <section class="sys-section"><h2>Trusted Identity Providers</h2><div class="sys-content panel">
      <p class="sys-lead">Identity providers whose tokens the tenant accepts for OAuth clients. Not part of this game.</p></div></section>`;
}

function oauthDialog(main: HTMLElement) {
  const t = ctx.tenant();
  const unitSel = (name: string, units: string[], cur: string) =>
    `<select name="${name}">${units.map((u) => `<option ${u === cur ? 'selected' : ''}>${u}</option>`).join('')}</select>`;
  const roleNames = [GLOBAL_ADMIN, ...TEMPLATE_ORDER.map((tp) => TEMPLATES[tp].name), ...t.roles.map((r) => r.id)];
  const inYear = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  const { form, close } = openDialog('Add a New OAuth Client', `
    <div class="form-grid">
      <label>Name <small>who uses it, e.g. the tool</small><input name="name" maxlength="60" autocomplete="off"></label>
      <label>OAuth Client ID <small>generated when you add the client</small><input name="clientid" readonly placeholder="(after Add)"></label>
      <label>Purpose
        <select name="purpose">${OAUTH_PURPOSES.map((p) => `<option value="${esc(p.id)}">${esc(p.id)}</option>`).join('')}</select></label>
      <label>Authorization Grant <small>follows from the purpose</small><input name="grant" readonly></label>
    </div>
    <p class="muted" id="oauth-purpose-text"></p>
    <label class="wide-field" data-for="Interactive Usage">Redirect URI <small>where the tool receives the sign-in result; copy it exactly from the tool</small>
      <input name="redirect" class="mono" autocomplete="off" spellcheck="false" placeholder="https://…"></label>
    <div class="form-grid" data-for="Technical User">
      <label>User ID <small>the technical user the program acts as</small><input name="userid" class="mono" maxlength="40" autocomplete="off" placeholder="CATALOG_TECH_USER"></label>
      <label>Expiry Date <small>Expiry Details</small><input name="expires" type="date" value="${inYear}"></label>
    </div>
    <fieldset class="wide-field oauth-roles" data-for="Technical User"><legend>Roles <small>Select Roles: the user can do exactly this</small></legend>
      ${roleNames.map((r) => `<label class="check"><input type="checkbox" name="role" value="${esc(r)}"> ${esc(r)}</label>`).join('')}</fieldset>
    <div class="form-grid">
      <label>Token Lifetime <small>60 seconds to 1 day</small><span class="input-unit"><input name="lifetime" type="number" min="1" value="60">${unitSel('lifetime-unit', ['Seconds', 'Minutes', 'Hours'], 'Minutes')}</span></label>
      <label data-for="Interactive Usage">Refresh Token Lifetime <small>60 seconds to 180 days</small><span class="input-unit"><input name="refresh" type="number" min="1" value="30">${unitSel('refresh-unit', ['Seconds', 'Minutes', 'Hours', 'Days'], 'Days')}</span></label>
    </div>
    <p class="form-error" role="alert"></p>
    <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button>
      <button class="btn primary" type="submit">Add</button></div>`);
  const purpose = form.querySelector<HTMLSelectElement>('[name="purpose"]')!;
  const val = (n: string) => form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${n}"]`)!.value;
  const secs = (n: string) => (Number(val(n)) || 0) * TIME_UNITS.find((u) => u.id === val(`${n}-unit`))!.s;
  const sync = () => {
    const p = OAUTH_PURPOSES.find((x) => x.id === purpose.value)!;
    form.querySelector<HTMLInputElement>('[name="grant"]')!.value = p.grant;
    form.querySelector('#oauth-purpose-text')!.textContent = p.text;
    form.querySelectorAll<HTMLElement>('[data-for]').forEach((el) => (el.hidden = el.dataset.for !== p.id));
  };
  purpose.addEventListener('change', sync);
  sync();
  form.querySelector<HTMLInputElement>('[name="name"]')!.focus();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const p = purpose.value as OAuthPurpose;
    const c: OAuthClient = {
      name: val('name').trim(), purpose: p, redirectUri: p === 'Interactive Usage' ? val('redirect').trim() : '',
      lifetimeS: secs('lifetime'),
      ...(p === 'Interactive Usage' ? { refreshS: secs('refresh') } : {}),
      ...(p === 'Technical User' ? { technical: {
        userId: val('userid').trim().toUpperCase(), expires: val('expires'),
        roles: [...form.querySelectorAll<HTMLInputElement>('[name="role"]:checked')].map((x) => x.value),
      } } : {}),
      clientId: newClientId(t), createdAt: new Date().toISOString(),
    };
    const err = oauthClientError(c, t);
    if (err) {
      form.querySelector('.form-error')!.textContent = err;
      return;
    }
    t.oauthClients.push(c);
    ctx.track(`oauth-create:${c.name}:${p}`);
    ctx.save();
    close();
    renderSystem(main);
    const secret = `${c.clientId.slice(3, 9)}$${(c.name.length * 7919).toString(36)}Rh!${c.lifetimeS % 97}`;
    openDialog(`OAuth client ${c.name} added`, `
      <p class="guide-lead">Hand these to the developer of the tool. <b>Copy the secret now:</b> it is shown only once.</p>
      <dl class="props-list wide-dl"><dt>Client ID</dt><dd class="mono wrap">${esc(c.clientId)}</dd>
        <dt>Secret</dt><dd class="mono wrap">${esc(secret)}</dd>
        <dt>Authorization URL</dt><dd class="mono wrap">${esc(OAUTH_ENDPOINTS.authorization)}</dd>
        <dt>Token URL</dt><dd class="mono wrap">${esc(OAUTH_ENDPOINTS.token)}</dd>
        <dt>Token Lifetime</dt><dd>${esc(formatLifetime(c.lifetimeS))}${c.refreshS ? ` · refresh token ${esc(formatLifetime(c.refreshS))}` : ''}</dd>
        ${c.technical ? `<dt>Technical User</dt><dd>${esc(c.technical.userId)} · ${esc(c.technical.roles.join(', '))} · expires ${esc(c.technical.expires)}</dd>` : ''}</dl>
      <div class="guide-actions"><button class="btn primary" type="button" data-act="cancel">Done</button></div>`);
  });
}

/** Simulated client: calls the OData API with one OAuth client, the way the planning team's SAC import connection would. */
function odataDialog(clientName: string) {
  const t = ctx.tenant();
  const objects = t.objects.filter((o) => o.deployed && (o.kind === 'SQL View' || o.kind === 'Analytic Model'));
  const { form } = openDialog(`Test ${clientName}`, `
    <p class="guide-lead">A simulated call to the OData Consumption API, as a tool would make it: sign in with this client, then read one object.</p>
    <div class="form-grid">
      <label>Calling tool <select name="tool"><option value="sac">${esc(SAC_PLANNING.label)}</option></select></label>
      <label>Object <select name="object">${objects.map((o) => `<option value="${esc(objectKey(o))}">${esc(objectKey(o))}</option>`).join('')}</select></label>
    </div>
    <p class="muted mono wrap" id="odata-url"></p>
    <div id="odata-result"></div>
    <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Close</button>
      <button class="btn primary" type="submit">Send Request</button></div>`, 'odata-dlg');
  const pick = form.querySelector<HTMLSelectElement>('[name="object"]')!;
  const showUrl = () => {
    const o = objects.find((x) => objectKey(x) === pick.value);
    form.querySelector('#odata-url')!.textContent = o ? `GET ${odataUrl(o)}` : '';
  };
  pick.addEventListener('change', showUrl);
  showUrl();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const res = await odataRequest(t, clientName, pick.value, SAC_PLANNING.redirectUri);
    ctx.track(`odata-test:${clientName}:${pick.value}:${res.status}`);
    ctx.save();
    form.querySelector('#odata-result')!.innerHTML = `<div class="odata-status ${res.status === 200 ? 'ok' : 'bad'}"><b>HTTP ${res.status}</b> ${esc(res.message)}</div>
      ${res.columns ? `<div class="table-scroll"><table class="grid"><thead><tr>${res.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${res.rows!.map((r) => `<tr>${r.map((v) => `<td>${esc(v ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}`;
  });
}

function body(id: Tab, used: { diskGB: number; memoryGB: number }) {
  const t = ctx.tenant();
  const info = TABS.find((x) => x.id === id)!;
  const head = `<p class="sys-lead">${esc(info.text)}</p>`;
  if (id === 'security') {
    return `${head}
      <div class="table-head"><h4>Trusted certificates</h4><button class="btn small primary" type="button" id="cert-upload">Add Certificate</button></div>
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

