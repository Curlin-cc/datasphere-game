import { ctx } from '../ctx';
import { esc, icon, ICONS, spaceChip, toast } from '../ui';
import { CDS_ENTITIES, connType, supports, type CdsEntity, type Connection, type ModelingPattern } from '../integration';
import { ACCESS_OPTIONS, ENTITY_IMPORT, importEntities, planImport, type EntityAccess, type ImportLog } from '../onboarding';

/**
 * Import Entities wizard (Semantic Onboarding › SAP Systems › SAP S/4HANA Cloud, c03-m07), after SAP help "Importing Entities with
 * Semantics from SAP S/4HANA": 1 Configuration (connection = target space, data access), 2 Select Entities (search by label, filters
 * Application Component, Modeling Pattern, Release Contract), 3 Review Entities (tabs Business Builder and Data Builder with the
 * import status), then Import and Deploy. Not in Curlin's screenshots: layout after the help text in Horizon style.
 */

export interface WizardState {
  /** Connection type of the system card (S4HANA_CLOUD, S4HANA_OP). */
  type: string;
  step: 1 | 2 | 3;
  /** SPACE.NAME of the chosen connection. */
  conn?: string;
  access: EntityAccess;
  selected: string[];
  search: string;
  filters: { component: string[]; pattern: string[]; release: string[] };
  tab: 'data' | 'business';
  /** Only connections of this space (wizard opened from the Data Builder). */
  onlySpace?: string;
}

export const newWizard = (type: string, onlySpace?: string): WizardState => ({
  type, step: 1, access: 'Replication Flow to Local Tables', selected: [], search: '', filters: { component: [], pattern: [], release: [] }, tab: 'data', onlySpace,
});

const PATTERN_LABEL: Record<ModelingPattern, string> = {
  ANALYTICAL_DIMENSION: 'ANALYTICAL_DIMENSION', LANGUAGE_DEPENDENT_TEXT: 'LANGUAGE_DEPENDENT_TEXT', NONE: '(none)',
};

const connKey = (c: Connection) => `${c.space}.${c.name}`;

/** Connections a wizard of this type can use. */
const candidates = (w: WizardState) => ctx.tenant().connections.filter((c) => c.type === w.type && (!w.onlySpace || c.space === w.onlySpace));

/** Draws the wizard into `main`. `done` is called with the log after Import and Deploy, `cancel` when the player leaves. */
export function renderImportWizard(main: HTMLElement, w: WizardState, done: (log: ImportLog) => void, cancel: () => void) {
  const t = ctx.tenant();
  const label = connType(w.type)?.label ?? w.type;
  const conn = t.connections.find((c) => connKey(c) === w.conn);
  const steps = ['Configuration', 'Select Entities', 'Review Entities'];
  const stepper = `<ol class="ie-steps" aria-label="Steps">${steps.map((s, i) => `<li class="${i + 1 === w.step ? 'on' : i + 1 < w.step ? 'done' : ''}"><span>${i + 1 < w.step ? icon(ICONS.check) : i + 1}</span>${esc(s)}</li>`).join('')}</ol>`;
  let body = '';

  if (w.step === 1) {
    const list = candidates(w);
    const rf = conn && supports(conn, 'Replication Flows');
    body = `<section class="panel ie-panel">
        <h2>Select the connection</h2>
        <p class="muted">The entities are imported into the space of the connection. ${w.onlySpace ? `Opened from the Data Builder: only connections of ${esc(w.onlySpace)}.` : ''}</p>
        <div class="table-scroll"><table class="grid" id="ie-connections"><thead><tr><th></th><th>Connection</th><th>Space</th><th>Model Import</th></tr></thead><tbody>
        ${list.map((c) => `<tr class="${connKey(c) === w.conn ? 'selected' : ''}"><td><input type="radio" name="ie-conn" value="${esc(connKey(c))}" ${connKey(c) === w.conn ? 'checked' : ''} aria-label="${esc(c.name)}"></td>
            <td><b>${esc(c.businessName)}</b><br><span class="mono muted">${esc(c.name)}</span></td><td>${spaceChip(c.space)}</td>
            <td>${supports(c, 'Model Import') ? '<span class="st-text ok">Supported</span>' : `<span class="st-text bad">${c.validation?.ok ? 'Not supported' : 'Not validated'}</span>`}</td></tr>`).join('')
          || `<tr><td colspan="4" class="muted">No ${esc(label)} connection${w.onlySpace ? ` in ${esc(w.onlySpace)}` : ''}. Create and validate one in the Connections app first.</td></tr>`}
        </tbody></table></div>
        ${conn ? `<div class="ie-access">
          <label for="ie-access"><b>Data Access</b></label>
          ${rf ? `<select id="ie-access">${ACCESS_OPTIONS.map((a) => `<option ${a === w.access ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select>
            <p class="muted">Defaults to <b>Replication Flow to Local Tables</b>: SAP recommends it to optimize load times. <b>Remote Tables</b> read the source live instead.</p>`
          : '<span>Remote Tables</span>'}
        </div>` : ''}
      </section>`;
  }

  if (w.step === 2) {
    const all = CDS_ENTITIES;
    const facet = (key: keyof WizardState['filters'], title: string, value: (e: CdsEntity) => string) => {
      const vals = [...new Set(all.map(value))].sort();
      return `<fieldset class="ie-facet"><legend>${esc(title)}</legend>${vals.map((v) => `<label class="check-line"><input type="checkbox" data-facet="${key}" value="${esc(v)}" ${w.filters[key].includes(v) ? 'checked' : ''}> ${esc(v)}</label>`).join('')}</fieldset>`;
    };
    const q = w.search.trim().toLowerCase();
    const shown = all.filter((e) => (!q || e.label.toLowerCase().includes(q))
      && (!w.filters.component.length || w.filters.component.includes(e.component))
      && (!w.filters.pattern.length || w.filters.pattern.includes(PATTERN_LABEL[e.pattern]))
      && (!w.filters.release.length || w.filters.release.includes(e.release)));
    body = `<div class="ie-select">
        <aside class="panel ie-filters" aria-label="Filter By"><h3>Filter By</h3>
          ${facet('component', 'Application Component', (e) => e.component)}
          ${facet('pattern', 'Modeling Pattern', (e) => PATTERN_LABEL[e.pattern])}
          ${facet('release', 'Release Contract', (e) => e.release)}
        </aside>
        <section class="panel ie-panel">
          <div class="ie-search"><input type="search" id="ie-search" placeholder="Search by label" value="${esc(w.search)}" aria-label="Search by label"></div>
          <h3>Results (${shown.length})</h3>
          <div class="table-scroll"><table class="grid" id="ie-results"><thead><tr><th></th><th>Label</th><th>ID</th><th>Modeling Pattern</th><th>Release Contract</th><th>Application Component</th></tr></thead><tbody>
            ${shown.map((e) => `<tr class="${w.selected.includes(e.id) ? 'selected' : ''}"><td><input type="checkbox" data-entity="${e.id}" ${w.selected.includes(e.id) ? 'checked' : ''} aria-label="${esc(e.label)}"></td>
              <td>${esc(e.label)}</td><td class="mono">${esc(e.id)}</td><td>${esc(PATTERN_LABEL[e.pattern])}</td><td>${esc(e.release)}</td><td>${esc(e.component)}</td></tr>`).join('')
              || '<tr><td colspan="6" class="muted">No entity matches.</td></tr>'}
          </tbody></table></div>
          <p class="muted">Entities with release contract <b>C1</b> (extraction-enabled) come with their data access and follow associations to texts and dimensions.
            Others can only be imported as local tables, and you load their data yourself with a data flow.</p>
        </section></div>`;
  }

  if (w.step === 3 && conn) {
    const plan = planImport(t, conn.space, w.access, w.selected);
    const rows = w.tab === 'data'
      ? plan.data.map((o) => `<tr><td>${esc(o.businessName)}</td><td class="mono">${esc(o.name)}</td><td>${esc(o.kind)}</td><td>${esc(o.semanticUsage)}</td>
          <td>${o.supporting ? 'Supporting' : 'Selected'}</td><td><span class="st-text ${o.status === 'Already Imported' ? 'run' : 'ok'}">${esc(o.status)}</span></td></tr>`).join('')
      : plan.business.map((o) => `<tr><td>${esc(o.businessName)}</td><td class="mono">${esc(o.cds)}</td><td>${esc(o.type)}</td><td>–</td><td>Selected</td><td><span class="st-text muted">Not created in the game</span></td></tr>`).join('');
    body = `<div class="ie-select">
        <aside class="panel ie-filters" aria-label="Selected entities"><h3>Selected (${w.selected.length})</h3>
          <ul class="ie-chosen">${w.selected.map((id) => `<li class="mono">${esc(id)}</li>`).join('')}</ul>
          <p class="muted">Target space ${spaceChip(conn.space)}<br>Connection <span class="mono">${esc(conn.name)}</span><br>Data access: ${esc(w.access)}</p></aside>
        <section class="panel ie-panel">
          <div class="tabs" role="tablist">
            <button type="button" role="tab" id="ie-tab-business" aria-selected="${w.tab === 'business'}">Business Builder (${plan.business.length})</button>
            <button type="button" role="tab" id="ie-tab-data" aria-selected="${w.tab === 'data'}">Data Builder (${plan.data.length})</button></div>
          <div class="table-scroll"><table class="grid" id="ie-review"><thead><tr><th>Business Name</th><th>Technical Name</th><th>Type</th><th>Semantic Usage</th><th>Entity</th><th>Import Status</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="6" class="muted">Nothing.</td></tr>'}</tbody></table></div>
          ${w.tab === 'business' ? '<p class="muted">A real tenant also creates these Business Builder objects. The game skips them: the Business Builder is deprecated (excursion in chapter 12).</p>'
            : '<p class="muted"><b>Ready for Import</b> objects are created. <b>Already Imported</b> objects are updated and redeployed, so your changes to imported objects do not last.</p>'}
        </section></div>`;
  }

  const canNext = w.step === 1 ? !!conn && supports(conn, 'Model Import') : w.step === 2 ? w.selected.length > 0 : true;
  main.innerHTML = `<div class="onb-page"><div class="onb-sub"><button type="button" class="tb-back" id="ie-cancel-x" aria-label="Back">${icon(ICONS.back)}</button>
      <span class="muted">${esc(label)}</span><h1 class="view-title">Import Entities</h1></div>
    ${stepper}
    <section class="onb-body">${body}</section>
    <footer class="ie-foot"><span class="spacer"></span>
      <button type="button" class="btn link" id="ie-cancel">Cancel</button>
      ${w.step > 1 ? '<button type="button" class="btn" id="ie-prev">Previous Step</button>' : ''}
      ${w.step < 3 ? `<button type="button" class="btn primary" id="ie-next" ${canNext ? '' : 'disabled'}>Next Step</button>`
        : '<button type="button" class="btn primary" id="ie-import">Import and Deploy</button>'}
    </footer></div>`;

  const redraw = () => renderImportWizard(main, w, done, cancel);
  main.querySelector('#ie-cancel')!.addEventListener('click', cancel);
  main.querySelector('#ie-cancel-x')!.addEventListener('click', cancel);
  main.querySelector('#ie-prev')?.addEventListener('click', () => {
    w.step = (w.step - 1) as WizardState['step'];
    redraw();
  });
  main.querySelector('#ie-next')?.addEventListener('click', () => {
    w.step = (w.step + 1) as WizardState['step'];
    if (w.step === 3) ctx.track(`ie-review:${w.selected.join(',')}`);
    redraw();
  });
  main.querySelectorAll<HTMLInputElement>('[name="ie-conn"]').forEach((r) => r.addEventListener('change', () => {
    w.conn = r.value;
    ctx.track(`ie-connection:${r.value}`);
    redraw();
  }));
  main.querySelector<HTMLSelectElement>('#ie-access')?.addEventListener('change', (e) => {
    w.access = (e.target as HTMLSelectElement).value as EntityAccess;
    ctx.track(`ie-access:${w.access}`);
  });
  const search = main.querySelector<HTMLInputElement>('#ie-search');
  search?.addEventListener('change', () => {
    w.search = search.value;
    ctx.track(`ie-search:${w.search}`);
    redraw();
  });
  main.querySelectorAll<HTMLInputElement>('[data-facet]').forEach((c) => c.addEventListener('change', () => {
    const key = c.dataset.facet as keyof WizardState['filters'];
    w.filters[key] = c.checked ? [...w.filters[key], c.value] : w.filters[key].filter((x) => x !== c.value);
    redraw();
  }));
  main.querySelectorAll<HTMLInputElement>('[data-entity]').forEach((c) => c.addEventListener('change', () => {
    const id = c.dataset.entity!;
    w.selected = c.checked ? [...w.selected, id] : w.selected.filter((x) => x !== id);
    ctx.track(`ie-select:${id}:${c.checked ? 'on' : 'off'}`);
    redraw();
  }));
  main.querySelector('#ie-tab-data')?.addEventListener('click', () => {
    w.tab = 'data';
    redraw();
  });
  main.querySelector('#ie-tab-business')?.addEventListener('click', () => {
    w.tab = 'business';
    ctx.track('ie-tab:business');
    redraw();
  });
  main.querySelector('#ie-import')?.addEventListener('click', async () => {
    if (!conn) return;
    const btn = main.querySelector<HTMLButtonElement>('#ie-import')!;
    btn.disabled = true;
    const log = await importEntities(t, conn, w.access, w.selected);
    ctx.track(`ie-import:${conn.space}:${w.access}:${[...w.selected].sort().join(',')}`);
    ctx.save();
    const errors = log.lines.filter((x) => x.level === 'error').length;
    toast(errors ? `Import of entities finished with ${errors} error(s). Open Import Logs shows the messages.`
      : 'Entities imported and deployed. Open Import Logs in Semantic Onboarding shows the messages.', errors ? 'error' : 'ok');
    done(log);
  });
}

/** Result of an Import Entities log, like the import monitor shows it. */
export function entityLogStatus(l: ImportLog): [string, string] {
  if (l.lines.some((x) => x.level === 'error')) return ['bad', l.lines.some((x) => x.text.startsWith('Import of')) ? 'COMPLETED WITH ERRORS' : 'FAILED'];
  if (l.lines.some((x) => x.level === 'warn')) return ['run', 'COMPLETED WITH WARNINGS'];
  return ['ok', 'COMPLETED'];
}

/** Import Entities logs of a space, newest first (importLogs is kept newest first). */
export const entityLogs = (space: string) => ctx.tenant().importLogs.map((l, i) => ({ l, i })).filter((x) => x.l.pkg === ENTITY_IMPORT && x.l.entities?.space === space);
