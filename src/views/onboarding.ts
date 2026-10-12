import { ctx } from '../ctx';
import { esc, icon, ICONS, openDialog, toast, spaceChip } from '../ui';
import { CONN_TYPES } from '../integration';
import {
  PACKAGES, CONTENT_AREAS, importPackage, packageById, type ContentArea, type ContentPackage, type ImportLog,
} from '../onboarding';
import { registerLocation } from '../nav';

/**
 * Semantic Onboarding (Bild 10, excursion c12-m09): hero banner, "SAP Systems" with one card per system type and its connections,
 * "Content Network" with Samples, Business Content and 3rd Party Business Content. A content area lists packages; a package shows
 * its description, prerequisites and objects and can be imported. "Open Import Logs" lists every import with its messages.
 * Import Entities from SAP systems is not part of the game (cards explain it).
 */

type Page = { kind: 'home' } | { kind: 'area'; area: ContentArea } | { kind: 'pkg'; id: string } | { kind: 'logs'; open?: number };
let page: Page = { kind: 'home' };
registerLocation('semantic', { get: () => page, set: (p: Page) => (page = p) });
const openGroups = { systems: true, content: true };

export function onboardingReset() {
  page = { kind: 'home' };
}

const SYSTEMS: { label: string; type?: string; enabled?: boolean }[] = [
  { label: 'SAP S/4HANA Cloud', type: 'S4HANA_CLOUD' },
  { label: 'SAP S/4HANA On Premise', type: 'S4HANA_OP' },
  { label: 'SAP BW/4HANA' },
  { label: 'SAP BW Bridge', enabled: false },
  { label: 'SAP HANA', type: 'HANA' },
];

const AREA_ICON: Record<ContentArea, string> = {
  samples: '<rect x="3" y="3" width="11" height="13" rx="1.5"/><path d="M6 7h5M6 10h3"/><circle cx="17" cy="17" r="4"/>',
  business: '<rect x="3" y="3" width="11" height="13" rx="1.5"/><path d="M6 7h5M6 10h5"/><rect x="11" y="13" width="9" height="7" rx="1"/><path d="M14 13v-1.5h3V13"/>',
  partner: '<rect x="3" y="3" width="11" height="13" rx="1.5"/><path d="M6 7h5M6 10h3"/><circle cx="17" cy="14" r="2.5"/><path d="M12.5 21a4.5 4.5 0 019 0"/>',
};
const bigIcon = (paths: string) => `<svg class="onb-ic" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
const when = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: false });
const SYS_ICON = '<rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M7 7h.01M7 17h.01"/>';

export function renderOnboarding(main: HTMLElement) {
  main.classList.add('bleed');
  const t = ctx.tenant();
  const hero = `<header class="onb-hero"><h1>${icon('<circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c1.8 1.7 2.6 3.7 2.6 6S9.8 12.3 8 14M8 2C6.2 3.7 5.4 5.7 5.4 8s.8 4.3 2.6 6"/>')} Semantic Onboarding</h1>
      <p>Acquire data and semantically-rich modeling objects from SAP systems, the SAP Content Network, and the Public Data Marketplace and other data product contexts.</p></header>`;
  if (page.kind === 'home') {
    main.innerHTML = `<div class="onb-page">${hero}
      <section class="onb-group panel">
        <div class="onb-group-head"><button type="button" class="onb-toggle" data-group="systems" aria-expanded="${openGroups.systems}">${icon(openGroups.systems ? ICONS.down : ICONS.right)}</button>
          ${icon(ICONS.importIc)}<h2>SAP Systems</h2><span class="spacer"></span><button type="button" class="text-act" id="onb-logs">Open Import Logs</button></div>
        ${openGroups.systems ? `<div class="onb-cards systems">${SYSTEMS.map((s, i) => {
          const n = s.type ? t.connections.filter((c) => c.type === s.type).length : 0;
          return `<button type="button" class="onb-card" data-system="${i}"><span class="onb-card-head"><b>${esc(s.label)}</b>${bigIcon(SYS_ICON)}</span>
            <span class="onb-num">${s.enabled === false ? '' : n || '–'}</span><span class="muted">${s.enabled === false ? 'Not Enabled' : 'Connections'}</span></button>`;
        }).join('')}</div>` : ''}
      </section>
      <section class="onb-group panel">
        <div class="onb-group-head"><button type="button" class="onb-toggle" data-group="content" aria-expanded="${openGroups.content}">${icon(openGroups.content ? ICONS.down : ICONS.right)}</button>
          ${icon(ICONS.book)}<h2>Content Network</h2></div>
        ${openGroups.content ? `<div class="onb-cards content" id="content-areas">${CONTENT_AREAS.map((a) => `<button type="button" class="onb-card" data-area="${a.id}">
            <span class="onb-card-head"><b>${esc(a.label)}</b>${bigIcon(AREA_ICON[a.id])}</span><span class="onb-text">${esc(a.text)}</span></button>`).join('')}</div>` : ''}
      </section></div>`;
    main.querySelectorAll<HTMLButtonElement>('[data-group]').forEach((b) => b.addEventListener('click', () => {
      const g = b.dataset.group as keyof typeof openGroups;
      openGroups[g] = !openGroups[g];
      renderOnboarding(main);
    }));
    main.querySelectorAll<HTMLButtonElement>('[data-system]').forEach((b) => b.addEventListener('click', () => systemInfo(SYSTEMS[Number(b.dataset.system)])));
    main.querySelectorAll<HTMLButtonElement>('[data-area]').forEach((b) => b.addEventListener('click', () => {
      page = { kind: 'area', area: b.dataset.area as ContentArea };
      ctx.track(`onboarding:${b.dataset.area}`);
      renderOnboarding(main);
    }));
    main.querySelector('#onb-logs')!.addEventListener('click', () => {
      page = { kind: 'logs' };
      ctx.track('import-logs');
      renderOnboarding(main);
    });
    return;
  }

  const back = (label: string) => `<button type="button" class="tb-back" id="onb-back" aria-label="Back">${icon(ICONS.back)}</button><span class="muted">${esc(label)}</span>`;
  if (page.kind === 'area') {
    const area = CONTENT_AREAS.find((a) => a.id === (page as { area: ContentArea }).area)!;
    const list = PACKAGES.filter((p) => p.area === area.id);
    main.innerHTML = `<div class="onb-page"><div class="onb-sub">${back('Content Network')}<h1 class="view-title">${esc(area.label)}</h1></div>
      <section class="onb-body"><div class="onb-pkgs" id="package-list">${list.map((p) => `<button type="button" class="onb-pkg panel" data-pkg="${esc(p.id)}">
          <b>${esc(p.title)}</b><small class="muted">${esc(p.provider)} · Version ${esc(p.version)}</small><span>${esc(p.description)}</span></button>`).join('')
        || '<p class="muted">No packages in this area.</p>'}</div></section></div>`;
    main.querySelector('#onb-back')!.addEventListener('click', () => go(main, { kind: 'home' }));
    main.querySelectorAll<HTMLButtonElement>('[data-pkg]').forEach((b) => b.addEventListener('click', () => {
      ctx.track(`content-open:${b.dataset.pkg}`);
      go(main, { kind: 'pkg', id: b.dataset.pkg! });
    }));
    return;
  }

  if (page.kind === 'pkg') {
    const p = packageById(page.id)!;
    const imported = t.importLogs.find((l) => l.pkg === p.id);
    main.innerHTML = `<div class="onb-page"><div class="onb-sub">${back(CONTENT_AREAS.find((a) => a.id === p.area)!.label)}<h1 class="view-title">${esc(p.title)}</h1>
        <span class="spacer"></span><button class="btn primary" type="button" id="pkg-import">Import</button></div>
      <section class="onb-body">
        <div class="panel onb-detail">
          <dl class="props-list wide-dl"><dt>Provider</dt><dd>${esc(p.provider)}</dd><dt>Version</dt><dd>${esc(p.version)}</dd>
            <dt>Target space</dt><dd>${spaceChip(p.space.id)} ${esc(p.space.name)}</dd>
            <dt>Last import</dt><dd>${imported ? esc(when(imported.at)) : 'never'}</dd></dl>
          <p>${esc(p.description)}</p>
          <h3>Prerequisites</h3><ul id="pkg-prereq">${p.prerequisites.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          <h3>Content (${p.objects.length})</h3>
          ${p.objects.length ? `<table class="grid" id="pkg-objects"><thead><tr><th>Technical Name</th><th>Business Name</th><th>Type</th></tr></thead>
            <tbody>${p.objects.map((o) => `<tr><td class="mono">${esc(o.name)}</td><td>${esc(o.businessName)}</td><td>${esc(o.kind)} <span class="muted">(${esc(o.semanticUsage)})</span></td></tr>`).join('')}</tbody></table>`
            : '<p class="muted">Shown after the license key is entered.</p>'}
        </div></section></div>`;
    main.querySelector('#onb-back')!.addEventListener('click', () => go(main, { kind: 'area', area: p.area }));
    main.querySelector('#pkg-import')!.addEventListener('click', () => importDialog(main, p));
    return;
  }

  // Import logs
  const logs = t.importLogs;
  const openIdx = page.kind === 'logs' ? page.open : undefined;
  const sel = openIdx !== undefined ? logs[openIdx] : undefined;
  const status = (l: ImportLog) => !l.lines.some((x) => x.text.startsWith('Import of')) ? ['bad', 'FAILED']
    : l.lines.some((x) => x.level === 'error') ? ['bad', 'COMPLETED WITH ERRORS'] : l.lines.some((x) => x.level === 'warn') ? ['run', 'COMPLETED WITH WARNINGS'] : ['ok', 'COMPLETED'];
  main.innerHTML = `<div class="onb-page"><div class="onb-sub">${back('Semantic Onboarding')}<h1 class="view-title">Import Logs</h1></div>
    <section class="onb-body">
      <div class="panel mon-table"><div class="mon-table-head"><h3>Imports (${logs.length})</h3></div>
        <div class="table-scroll"><table class="grid" id="import-log-list"><thead><tr><th>Started</th><th>Package</th><th>Options</th><th>Status</th></tr></thead>
          <tbody>${logs.length ? logs.map((l, i) => `<tr class="${i === openIdx ? 'selected' : ''}">
              <td><button type="button" class="link-btn" data-log="${i}">${esc(when(l.at))}</button></td>
              <td>${esc(packageById(l.pkg)!.title)}</td><td class="muted">${l.options.overwrite ? 'Overwrite' : 'Keep existing'} · ${l.options.deploy ? 'Deploy' : 'No deploy'}</td>
              <td><span class="st-text ${status(l)[0]}">${status(l)[1]}</span></td></tr>`).join('')
            : '<tr><td colspan="4" class="muted">No imports yet.</td></tr>'}</tbody></table></div></div>
      ${sel ? `<div class="panel mon-table" id="import-log-detail"><div class="mon-table-head"><h3>${esc(packageById(sel.pkg)!.title)} <small class="muted">messages</small></h3></div>
        <ol class="run-log onb-log">${sel.lines.map((x) => `<li class="${x.level === 'error' ? 'err' : x.level}">${esc(x.text)}</li>`).join('')}</ol></div>` : ''}
    </section></div>`;
  main.querySelector('#onb-back')!.addEventListener('click', () => go(main, { kind: 'home' }));
  main.querySelectorAll<HTMLButtonElement>('[data-log]').forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.dataset.log);
    ctx.track(`import-log-open:${logs[i].pkg}`);
    go(main, { kind: 'logs', open: i });
  }));
}

function go(main: HTMLElement, p: Page) {
  page = p;
  renderOnboarding(main);
}

function systemInfo(s: (typeof SYSTEMS)[number]) {
  const type = s.type ? CONN_TYPES.find((c) => c.id === s.type) : undefined;
  const { form, close } = openDialog(s.label, `
    <p class="guide-lead">From here, <b>Import Entities</b> brings objects of this system into a space with their semantics: remote tables on CDS views,
      plus views with labels, associations and hierarchies (Handbuch 5.7). It needs a connection that supports <b>Model Import</b>.</p>
    <p class="muted">${s.enabled === false ? 'Not enabled in this tenant.' : type ? `${ctx.tenant().connections.filter((c) => c.type === s.type).length} connection(s) of type ${esc(type.label)}.` : 'No connection type of this kind in the game.'}
      In the game you build these objects by hand (chapters 3 and 6), so Import Entities is not part of it.</p>
    <div class="guide-actions"><button class="btn primary" type="submit">Got it</button></div>`);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    close();
  });
}

function importDialog(main: HTMLElement, p: ContentPackage) {
  const { form, close } = openDialog(`Import ${p.title}`, `
    <p class="guide-lead">Imports into the space <b>${esc(p.space.id)}</b>. A missing space is created with the storage the package needs.</p>
    <fieldset class="question"><legend>Import options</legend>
      <p class="muted"><b>Import Schedule</b>: None <small>(a real tenant can also notify you of new content)</small></p>
      <label><input type="checkbox" name="overwrite"> <b>Overwrite Preferences</b>: overwrite objects and data <small class="muted">otherwise existing objects stay; your changes to them would be lost</small></label>
      <label><input type="checkbox" name="deploy" checked> <b>Deployment Preference</b>: Deploy after import <small class="muted">with no overwrite only the new objects are deployed</small></label>
    </fieldset>
    <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button>
      <button class="btn primary" type="submit">Import</button></div>`);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const options = { overwrite: form.querySelector<HTMLInputElement>('[name="overwrite"]')!.checked, deploy: form.querySelector<HTMLInputElement>('[name="deploy"]')!.checked };
    close();
    const t = ctx.tenant();
    const log = await importPackage(t, p, options);
    ctx.track(`content-import:${p.id}:${options.overwrite ? 'overwrite' : 'keep'}:${options.deploy ? 'deploy' : 'nodeploy'}`);
    ctx.save();
    const errors = log.lines.filter((x) => x.level === 'error').length;
    const warns = log.lines.filter((x) => x.level === 'warn').length;
    toast(errors || warns ? `Import finished with ${errors} error(s) and ${warns} warning(s). See Open Import Logs.` : 'Import finished.', errors ? 'error' : 'ok');
    renderOnboarding(main);
  });
}
