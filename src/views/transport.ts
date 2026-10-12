import { ctx } from '../ctx';
import { findObject, objectKey } from '../repo';
import {
  TARGET_TENANTS, packageStatus, validatePackage, validationMessages, exportPackage, packageNameError, dependencies, type Package,
} from '../transport';
import { esc, spaceChip, icon, ICONS, openDialog, toast, setCrumb, fmtDate } from '../ui';
import { registerLocation } from '../nav';

/**
 * Transport app (excursion, Handbuch 11; design: Bild 13 Import, Bild 16 Monitor). Sub-pages as in the side navigation:
 * Packages (create and fill packages), Export, Import, Monitor.
 */

export type TransportPage = 'packages' | 'export' | 'import' | 'monitor';
export const TRANSPORT_PAGES: { id: TransportPage; label: string }[] = [
  { id: 'packages', label: 'Packages' }, { id: 'export', label: 'Export' }, { id: 'import', label: 'Import' }, { id: 'monitor', label: 'Monitor' },
];

let page: TransportPage = 'packages';
/** Package open in the editor: a technical name, 'new', or null for the list. */
let editing: string | null = null;
let draft: Package | null = null;
let selectedJob: number | null = null;
let selectedExport: string | null = null;
registerLocation('transport', {
  get: () => ({ page, editing }),
  set: (l: { page: TransportPage; editing: string | null }) => {
    page = l.page;
    editing = l.editing === 'new' ? null : l.editing;
    draft = null;
  },
  transient: (l: { editing: string | null }) => l.editing === 'new',
});

export const transportPage = () => page;
export function transportTo(p: TransportPage) {
  page = p;
  editing = null;
  draft = null;
}

const YOU = 'You (Data Architect)';
const statusHtml = (s: string) => {
  const cls = s === 'Exported' || s === 'Success' ? 'ok' : s === 'Failed' ? 'bad' : s === 'Changes To Export' ? 'warn' : 'muted';
  const ic = s === 'Exported' || s === 'Success' ? ICONS.check : s === 'Failed' ? '<path d="M4 4l8 8M12 4l-8 8"/>' : ICONS.info;
  return `<span class="tr-status ${cls}">${icon(ic)}${esc(s)}</span>`;
};

export function renderTransport(main: HTMLElement) {
  const label = TRANSPORT_PAGES.find((p) => p.id === page)!.label;
  setCrumb(`<span class="crumb-sep">/</span><span>${esc(label)}</span>`);
  ctx.track(`transport:${page}`);
  if (page === 'packages') return editing ? renderEditor(main) : renderPackages(main);
  if (page === 'export') return renderExport(main);
  if (page === 'import') return renderImport(main);
  return renderMonitor(main);
}

const toolbar = (extra = '', search = true) => `<div class="tr-toolbar">${extra}<span class="spacer"></span>
  ${search ? `<label class="tr-search">${icon(ICONS.search)}<input type="search" placeholder="Search" id="tr-search" aria-label="Search"></label>` : ''}</div>`;

function bindSearch(main: HTMLElement) {
  main.querySelector<HTMLInputElement>('#tr-search')?.addEventListener('input', (e) => {
    const q = (e.target as HTMLInputElement).value.toLowerCase();
    main.querySelectorAll<HTMLElement>('tbody tr[data-row]').forEach((r) => (r.hidden = !!q && !r.dataset.row!.toLowerCase().includes(q)));
  });
}

// ---------------------------------------------------------------- Packages

let pkgFilter = '';

function renderPackages(main: HTMLElement) {
  const t = ctx.tenant();
  const shown = t.packages.filter((p) => !pkgFilter || p.space === pkgFilter);
  main.innerHTML = `
    <div class="tr-page">
      <div class="tr-listhead"><label class="space-select">Space:
          <select id="pkg-filter"><option value="">All Spaces</option>${t.spaces.map((s) => `<option value="${esc(s.id)}" ${pkgFilter === s.id ? 'selected' : ''}>${esc(s.id)}</option>`).join('')}</select></label>
        <h1 class="view-title">Packages (${shown.length})</h1></div>
      <p class="view-lead">A package bundles objects of one space for the move to another tenant. Add everything the objects need,
        or a required package that contains it; then export it in <b>Export</b>.</p>
      <section class="panel tr-panel">
        ${toolbar(`<button class="btn small primary" type="button" id="pkg-create">${icon(ICONS.plus)} Create</button>`)}
        <table class="grid" id="package-list"><thead><tr><th>Business Name</th><th>Technical Name</th><th>Space</th><th>Version</th><th>Objects</th>
          <th>Required Packages</th><th>Changed On</th><th>Result</th></tr></thead><tbody>
          ${shown.map((p) => `<tr data-row="${esc(p.name + ' ' + p.businessName)}">
            <td><button class="link-btn" type="button" data-pkg="${esc(p.name)}">${icon(ICONS.cube)} ${esc(p.businessName)}</button></td>
            <td class="mono">${esc(p.name)}</td><td>${spaceChip(p.space)}</td><td>${esc(p.version)}</td><td class="num">${p.objects.length}</td>
            <td>${p.required.map((r) => `<code>${esc(r)}</code>`).join(', ') || '–'}</td>
            <td>${fmtDate(p.changedAt)}</td><td>${statusHtml(packageStatus(p))}</td></tr>`).join('') || '<tr><td colspan="8" class="placeholder">No packages yet.</td></tr>'}
        </tbody></table>
      </section>
    </div>`;
  bindSearch(main);
  main.querySelector<HTMLSelectElement>('#pkg-filter')!.addEventListener('change', (e) => {
    pkgFilter = (e.target as HTMLSelectElement).value;
    renderPackages(main);
  });
  main.querySelector('#pkg-create')!.addEventListener('click', () => {
    editing = 'new';
    draft = { name: '', businessName: '', space: 'RHN_REP', description: '', version: '1.0.0', objects: [], required: [], targets: [], createdBy: YOU, changedAt: '' };
    renderTransport(main);
  });
  main.querySelectorAll<HTMLButtonElement>('[data-pkg]').forEach((b) => b.addEventListener('click', () => {
    editing = b.dataset.pkg!;
    draft = structuredClone(t.packages.find((p) => p.name === editing)!);
    ctx.track(`package-open:${editing}`);
    renderTransport(main);
  }));
}

function renderEditor(main: HTMLElement) {
  const t = ctx.tenant();
  const p = draft!;
  const isNew = editing === 'new';
  const own = p.createdBy === YOU;
  const v = validatePackage(p, t);
  const problems = validationMessages(v, p);
  const objRows = p.objects.map((k) => {
    const o = findObject(t, k);
    return `<tr><td>${esc(o?.businessName ?? '')}</td><td class="mono">${esc(k.split('.')[1])}</td><td>${esc(o?.kind ?? 'missing')}</td>
      <td>${o ? (o.deployed ? 'Deployed' : 'Not Deployed') : ''}</td><td>${o ? `${icon(ICONS.check)} Added` : '<span class="bad">missing</span>'}</td>
      <td>${o ? dependencies(o, t).map((d) => `<code>${esc(d)}</code>`).join(' ') || '–' : ''}</td>
      <td>${own ? `<button class="btn small link" type="button" data-remove="${esc(k)}">Remove</button>` : ''}</td></tr>`;
  }).join('');
  main.innerHTML = `
    <div class="tr-page">
      <div class="tr-edhead"><button class="btn small link" type="button" id="pkg-back">${icon(ICONS.back)} Packages</button>
        <h1 class="view-title">${esc(p.businessName || 'New Package')}</h1>${isNew ? '' : statusHtml(packageStatus(t.packages.find((x) => x.name === p.name)!))}
        <span class="spacer"></span>
        ${own ? `<button class="btn small" type="button" id="pkg-validate">Validate</button><button class="btn small primary" type="button" id="pkg-save">${icon(ICONS.save)} Save</button>` : `<span class="muted">Created by ${esc(p.createdBy)} · read-only</span>`}</div>
      <div class="tabs pkg-tabs" role="tablist">
        <button type="button" role="tab" aria-selected="true" data-pkgtab="pkg-general">General</button>
        <button type="button" role="tab" aria-selected="false" data-pkgtab="pkg-required">Required Packages (${p.required.length})</button>
        <button type="button" role="tab" aria-selected="false" data-pkgtab="pkg-objsec">Objects (${p.objects.length})</button>
      </div>
      <div class="tr-editor stacked">
        <section class="panel tr-props" id="pkg-general">
          <label>Business Name <input id="pkg-business" value="${esc(p.businessName)}" maxlength="120" ${own ? '' : 'readonly'}></label>
          <label>Technical Name * <small>fixed once saved</small><input id="pkg-name" class="mono" value="${esc(p.name)}" maxlength="50" ${isNew ? '' : 'readonly'} spellcheck="false"></label>
          <label>Space <small>a package holds objects of one space</small>
            <select id="pkg-space" ${isNew && !p.objects.length ? '' : 'disabled'}>${t.spaces.map((s) => `<option ${s.id === p.space ? 'selected' : ''}>${esc(s.id)}</option>`).join('')}</select></label>
          <label>Business Purpose <textarea id="pkg-desc" rows="3" maxlength="500" ${own ? '' : 'readonly'}>${esc(p.description)}</textarea></label>
          <label>Category <select disabled><option>My Content</option></select></label>
          <label>Target Location <input value="My Content/" readonly></label>
          <label>Version * <input value="${esc(p.version)}" readonly></label>
          <dl class="props-list"><dt>Status</dt><dd>${isNew ? 'Not Exported' : esc(packageStatus(t.packages.find((x) => x.name === p.name)!))}</dd>
            <dt>Current Exported Version</dt><dd>${esc(p.exported?.version ?? '–')}</dd><dt>Created By</dt><dd>${esc(p.createdBy)}</dd></dl>
        </section>
        <div class="tr-sections">
          <section class="panel tr-panel" id="pkg-required">
            <div class="tr-sechead"><h3>Required Packages (${p.required.length})</h3><span class="spacer"></span>
              ${own ? `<button class="btn small" type="button" id="pkg-req">${icon(ICONS.plus)} Add</button>` : ''}</div>
            ${p.required.length ? `<ul class="tr-req">${p.required.map((r) => {
              const rp = t.packages.find((x) => x.name === r);
              return `<li><code>${esc(r)}</code> ${rp ? `${spaceChip(rp.space)} ${rp.objects.length} objects · ${statusHtml(packageStatus(rp))}` : '<span class="bad">missing</span>'}
                ${own ? `<button class="btn small link" type="button" data-unreq="${esc(r)}">Remove</button>` : ''}</li>`;
            }).join('')}</ul>` : '<p class="muted">None. Objects of other spaces that your objects read must come from a required package.</p>'}
          </section>
          <section class="panel tr-panel" id="pkg-objsec">
            <div class="tr-sechead"><h3>Objects (${p.objects.length})</h3><span class="spacer"></span>
              ${own ? `<button class="btn small" type="button" id="pkg-add">${icon(ICONS.plus)} Add</button>` : ''}</div>
            <table class="grid compact" id="pkg-objects"><thead><tr><th>Business Name</th><th>Technical Name</th><th>Type</th><th>Status</th><th>Result</th><th>Needs</th><th></th></tr></thead>
              <tbody>${objRows || '<tr><td colspan="7" class="placeholder">No objects yet. Add the objects you want to move.</td></tr>'}</tbody></table>
          </section>
          <section class="panel tr-panel" id="pkg-validation">
            <div class="tr-sechead"><h3>Validation</h3></div>
            ${problems.length ? `<ul class="tr-problems">${problems.map((m) => `<li>${icon(ICONS.info)} ${esc(m)}</li>`).join('')}</ul>`
              : `<p class="tr-ok">${icon(ICONS.check)} Everything the objects need is in the package or in a required package.</p>`}
            ${v.notes.length ? `<ul class="tr-notes">${v.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
          </section>
        </div>
      </div>
    </div>`;

  const read = () => {
    p.businessName = main.querySelector<HTMLInputElement>('#pkg-business')!.value.trim();
    p.description = main.querySelector<HTMLTextAreaElement>('#pkg-desc')!.value.trim();
    if (isNew) {
      p.name = main.querySelector<HTMLInputElement>('#pkg-name')!.value.trim().toUpperCase();
      p.space = main.querySelector<HTMLSelectElement>('#pkg-space')!.value;
    }
  };
  main.querySelectorAll<HTMLButtonElement>('[data-pkgtab]').forEach((b) => b.addEventListener('click', () => {
    main.querySelectorAll('[data-pkgtab]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    main.querySelector(`#${b.dataset.pkgtab}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }));
  main.querySelector('#pkg-back')!.addEventListener('click', () => {
    transportTo('packages');
    renderTransport(main);
  });
  main.querySelector<HTMLInputElement>('#pkg-name')?.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement;
    el.value = el.value.toUpperCase();
  });
  main.querySelector('#pkg-space')?.addEventListener('change', () => { read(); renderEditor(main); });
  main.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach((b) => b.addEventListener('click', () => {
    read();
    p.objects = p.objects.filter((k) => k !== b.dataset.remove);
    renderEditor(main);
  }));
  main.querySelectorAll<HTMLButtonElement>('[data-unreq]').forEach((b) => b.addEventListener('click', () => {
    read();
    p.required = p.required.filter((r) => r !== b.dataset.unreq);
    renderEditor(main);
  }));
  main.querySelector('#pkg-validate')?.addEventListener('click', () => {
    read();
    ctx.track(`package-validate:${p.name || 'new'}:${problems.length ? 'fail' : 'ok'}`);
    toast(problems.length ? `${problems.length} ${problems.length === 1 ? 'problem' : 'problems'}: see Validation.` : 'The package is valid.', problems.length ? 'error' : 'ok');
    main.querySelector('#pkg-validation')?.scrollIntoView({ block: 'nearest' });
  });
  main.querySelector('#pkg-add')?.addEventListener('click', () => {
    read();
    const candidates = t.objects.filter((o) => o.space === p.space && (o.deployed || o.source) && !p.objects.includes(objectKey(o)));
    const { form, close } = openDialog('Add Objects', `
      <p class="guide-lead">Deployed objects of ${esc(p.space)}. The column <b>Needs</b> in the package shows what each object reads, its
        associations and data access controls.</p>
      <div class="pick-list" id="pkg-pick">${candidates.map((o) => `<label class="check-line"><input type="checkbox" value="${esc(objectKey(o))}">
        <span class="mono">${esc(o.name)}</span><small class="muted">${esc(o.kind)} · ${esc(o.businessName)}</small></label>`).join('') || '<p class="muted">All deployed objects of the space are in the package.</p>'}</div>
      <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button><button class="btn primary" type="submit">Add</button></div>`);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const picked = [...form.querySelectorAll<HTMLInputElement>('#pkg-pick input:checked')].map((i) => i.value);
      p.objects.push(...picked);
      picked.forEach((k) => ctx.track(`package-add:${k}`));
      close();
      renderEditor(main);
    });
  });
  main.querySelector('#pkg-req')?.addEventListener('click', () => {
    read();
    const candidates = t.packages.filter((x) => x.name !== p.name && !p.required.includes(x.name));
    const { form, close } = openDialog('Add Required Packages', `
      <p class="guide-lead">Packages whose objects this package needs. In the target tenant they must be imported first, or together with it.</p>
      <div class="pick-list" id="req-pick">${candidates.map((x) => `<label class="check-line"><input type="checkbox" value="${esc(x.name)}">
        <span class="mono">${esc(x.name)}</span><small class="muted">${esc(x.space)} · ${x.objects.length} objects · ${esc(x.createdBy)}</small></label>`).join('') || '<p class="muted">No other packages.</p>'}</div>
      <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button><button class="btn primary" type="submit">Add</button></div>`);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const picked = [...form.querySelectorAll<HTMLInputElement>('#req-pick input:checked')].map((i) => i.value);
      p.required.push(...picked);
      picked.forEach((n) => ctx.track(`package-require:${n}`));
      close();
      renderEditor(main);
    });
  });
  main.querySelector('#pkg-save')?.addEventListener('click', () => {
    read();
    if (!p.businessName) return toast('Enter a business name.', 'error');
    if (isNew) {
      const err = packageNameError(p.name, t);
      if (err) return toast(err, 'error');
    }
    p.changedAt = new Date().toISOString();
    const i = t.packages.findIndex((x) => x.name === p.name);
    if (i >= 0) t.packages[i] = { ...structuredClone(p), exported: t.packages[i].exported, version: t.packages[i].version };
    else t.packages.push(structuredClone(p));
    editing = p.name;
    draft = structuredClone(t.packages.find((x) => x.name === p.name)!);
    ctx.track(`package-save:${p.name}`);
    ctx.save();
    toast(isNew ? 'Package created' : 'Package saved');
    renderTransport(main);
  });
}

// ---------------------------------------------------------------- Export

function renderExport(main: HTMLElement) {
  const t = ctx.tenant();
  const own = t.packages.filter((p) => p.createdBy === YOU);
  const sel = own.find((p) => p.name === selectedExport) ?? null;
  const last = sel ? t.transportJobs.find((j) => j.package === sel.name) : undefined;
  main.innerHTML = `
    <div class="tr-page">
      <h1 class="view-title">Export</h1>
      <p class="view-lead">Exports a saved package to the Content Network and decides which tenants may import it. Only a valid package exports.</p>
      <section class="panel tr-panel">
        ${toolbar(`<button class="btn small primary" type="button" id="exp-open" ${sel ? '' : 'disabled'}>${icon(ICONS.deploy)} Export</button>`)}
        <table class="grid" id="export-list"><thead><tr><th class="cb"></th><th>Package</th><th>Space</th><th>Version</th><th>Objects</th><th>Target Tenants</th><th>Status</th><th>Last Export</th></tr></thead><tbody>
          ${own.map((p) => `<tr data-row="${esc(p.name)}" class="${p === sel ? 'selected' : ''}">
            <td class="cb"><input type="radio" name="exp" value="${esc(p.name)}" ${p === sel ? 'checked' : ''} aria-label="Select ${esc(p.name)}"></td>
            <td class="mono">${esc(p.name)}</td><td>${spaceChip(p.space)}</td><td>${esc(p.version)}</td><td class="num">${p.objects.length}</td>
            <td>${p.targets.map((id) => esc(TARGET_TENANTS.find((x) => x.id === id)?.name ?? id)).join(', ') || '–'}</td>
            <td>${statusHtml(packageStatus(p))}</td><td>${p.exported ? fmtDate(p.exported.at) : '–'}</td></tr>`).join('')
            || '<tr><td colspan="8" class="placeholder">You have no packages yet. Create one under Transport › Packages.</td></tr>'}
        </tbody></table>
      </section>
      ${last ? `<section class="panel tr-panel" id="export-summary"><div class="tr-sechead"><h3>Export Summary · ${esc(last.package)} ${esc(last.version)}</h3>${statusHtml(last.status)}</div>
        <ul class="tr-problems">${last.messages.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></section>` : ''}
    </div>`;
  bindSearch(main);
  main.querySelectorAll<HTMLInputElement>('input[name="exp"]').forEach((r) => r.addEventListener('change', () => {
    selectedExport = r.value;
    renderExport(main);
  }));
  main.querySelector('#exp-open')?.addEventListener('click', () => {
    if (!sel) return;
    const { form, close } = openDialog(`Export ${sel.name}`, `
      <p class="guide-lead">Which tenants may import this package? It is stored in the Content Network; each target tenant imports it there.</p>
      <div class="pick-list" id="exp-targets">${TARGET_TENANTS.map((x) => `<label class="check-line"><input type="checkbox" value="${x.id}" ${sel.targets.includes(x.id) ? 'checked' : ''}>
        <b>${esc(x.name)}</b><small class="muted">${x.id}</small></label>`).join('')}</div>
      <p class="muted">${sel.objects.length} objects, required packages: ${sel.required.map(esc).join(', ') || 'none'}.</p>
      <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button><button class="btn primary" type="submit">Export</button></div>`);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      sel.targets = [...form.querySelectorAll<HTMLInputElement>('#exp-targets input:checked')].map((i) => i.value);
      const job = exportPackage(sel, t, YOU);
      ctx.track(`export:${sel.name}:${job.status}`);
      ctx.save();
      close();
      toast(job.status === 'Success' ? `${sel.name} ${job.version} exported` : `Export failed: ${job.messages[0]}`, job.status === 'Success' ? 'ok' : 'error');
      renderExport(main);
    });
  });
}

// ---------------------------------------------------------------- Import

function renderImport(main: HTMLElement) {
  const t = ctx.tenant();
  const shared = t.packages.filter((p) => p.exported);
  main.innerHTML = `
    <div class="tr-page">
      <h1 class="view-title">Import</h1>
      <p class="view-lead">Packages in the Content Network that this tenant can see. This training tenant is the <b>development</b> tenant:
        its packages are imported in Test and Production.</p>
      <section class="panel tr-panel">
        <div class="tr-toolbar"><span class="spacer"></span>
          <button class="tb-icon" type="button" title="Settings" disabled>${icon(ICONS.gear)}</button>
          <button class="tb-icon" type="button" id="imp-open" title="Import" ${shared.length ? '' : 'disabled'}>${icon(ICONS.deploy)}</button>
          <label class="tr-search">${icon(ICONS.search)}<input type="search" placeholder="Search" id="tr-search" aria-label="Search"></label></div>
        <table class="grid" id="import-list"><thead><tr><th class="cb"></th><th>Name</th><th>Version</th><th>Description</th><th>Shared By</th><th>Import Status</th><th>Created On</th><th>Changed On</th></tr></thead><tbody>
          ${shared.map((p) => `<tr data-row="${esc(p.name)}"><td class="cb"><input type="radio" name="imp" value="${esc(p.name)}" aria-label="Select ${esc(p.name)}"></td>
            <td>${icon(ICONS.cube)} ${esc(p.businessName)}</td><td>${esc(p.exported!.version)}</td><td>${esc(p.description)}</td>
            <td>${esc(p.createdBy)} · Stadtwerke Rheinau · Training</td><td class="muted">Not imported here</td><td>${fmtDate(p.changedAt)}</td><td>${fmtDate(p.exported!.at)}</td></tr>`).join('')
            || '<tr><td colspan="8" class="placeholder">Nothing shared yet.</td></tr>'}
        </tbody></table>
      </section>
    </div>`;
  bindSearch(main);
  main.querySelector('#imp-open')?.addEventListener('click', () => {
    const name = main.querySelector<HTMLInputElement>('input[name="imp"]:checked')?.value;
    if (!name) return toast('Select a package first.', 'info');
    ctx.track(`import-dialog:${name}`);
    openDialog(`Import ${name}`, `
      <p class="guide-lead">This is what the import looks like in the <b>target tenant</b>. In the training tenant you only look.</p>
      <label class="check-line"><input type="checkbox" disabled> <b>Overwrite objects and data</b></label>
      <p class="muted">Replaces objects that already exist in the target. It also overwrites their <b>schedules</b> there (SAP note 3609213).
        Without it, existing objects stay as they are. A local table whose Delta Capture setting differs cannot be overwritten at all
        (SAP note 3700359).</p>
      <p class="muted">Required packages must already be in the target tenant, or be imported together. Connections, users, roles and space
        settings are maintained in each tenant separately.</p>
      <div class="guide-actions"><button class="btn primary" type="button" data-act="cancel">Close</button></div>`);
  });
}

// ---------------------------------------------------------------- Monitor

function renderMonitor(main: HTMLElement) {
  const t = ctx.tenant();
  const job = t.transportJobs.find((j) => j.id === selectedJob);
  main.innerHTML = `
    <div class="tr-page">
      <h1 class="view-title">Monitor</h1>
      <p class="view-lead">Every export and import job of the tenant with its status and messages.</p>
      <section class="panel tr-panel">
        ${toolbar()}
        <table class="grid" id="transport-jobs"><thead><tr><th>Package Name</th><th>Version</th><th>Created By</th><th>Job ID</th><th>Status</th><th>Creation Time</th></tr></thead><tbody>
          ${t.transportJobs.map((j) => `<tr data-row="${esc(j.package)}" class="${j.id === selectedJob ? 'selected' : ''}">
            <td class="mono">${esc(j.package)}</td><td>${esc(j.version)}</td><td>${esc(j.by)}</td><td>${j.id}</td>
            <td><button class="link-btn" type="button" data-job="${j.id}">${statusHtml(j.status)}</button></td><td>${fmtDate(j.at)}</td></tr>`).join('')
            || '<tr><td colspan="6" class="placeholder">No jobs yet.</td></tr>'}
        </tbody></table>
      </section>
      ${job ? `<section class="panel tr-panel" id="job-log"><div class="tr-sechead"><h3>Job ${job.id} · ${esc(job.package)}</h3>${statusHtml(job.status)}</div>
        <ul class="tr-problems">${job.messages.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></section>` : ''}
    </div>`;
  bindSearch(main);
  main.querySelectorAll<HTMLButtonElement>('[data-job]').forEach((b) => b.addEventListener('click', () => {
    selectedJob = Number(b.dataset.job);
    ctx.track(`transport-job:${t.transportJobs.find((j) => j.id === selectedJob)?.package}`);
    renderMonitor(main);
  }));
}
