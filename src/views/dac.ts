import { ctx } from '../ctx';
import { runSql, describeColumns } from '../db';
import {
  STATUS_LABEL, STATUS_HELP, objectKey, findObject, objectNameError, suggestTechnicalName, touch, deploy, type RepoObject,
} from '../repo';
import { dacError, entityCandidates, type DacDef } from '../dac';
import { lockError } from '../integration';
import { esc, spaceChip, icon, ICONS, toast, resultTable, openDialog } from '../ui';
import { objectToolbar, bindDetails, propsHead } from './toolbar';

/**
 * Data Access Control editor (chapter 8, Handbuch 9.3): criteria type, permissions entity, identifier column (user IDs)
 * and criteria columns. Only "Single Values" works in the game; the other types explain themselves.
 */

export interface DacNav {
  back: () => void;
  opened: (key: string) => void;
}

let fresh: { space: string; def: DacDef; business: string; technical: string; touched: boolean } | null = null;

export function newDacDraft() {
  fresh = null;
}

const emptyDac = (): DacDef => ({ type: 'Single Values', entity: '', identifier: '', criteria: [] });

export async function renderDacEditor(main: HTMLElement, o: RepoObject | null, nav: DacNav) {
  const t = ctx.tenant();
  const space = o?.space ?? t.activeSpace;
  if (!o && (!fresh || fresh.space !== space)) fresh = { space, def: emptyDac(), business: '', technical: '', touched: false };
  const def: DacDef = o ? structuredClone(o.dac ?? emptyDac()) : fresh!.def;
  let business = o?.businessName ?? fresh!.business;
  let technical = o?.name ?? fresh!.technical;
  let techTouched = o ? true : fresh!.touched;
  const keep = () => {
    if (!o && fresh) Object.assign(fresh, { def, business, technical, touched: techTouched });
  };
  const entities = entityCandidates(t, space);
  let columns: string[] | null = null;

  const loadColumns = async () => {
    const e = def.entity ? findObject(t, def.entity) : undefined;
    columns = e?.deployed ? (await describeColumns(e.space, e.name)).map((c) => c.name) : null;
  };
  await loadColumns();

  const draw = () => {
    keep();
    const cols = columns ?? [];
    main.innerHTML = `
      <div class="editor-page is-dac">
        ${objectToolbar({
          space,
          title: business || 'New Data Access Control',
          sub: `Data Access Control · ${space}.${technical || '…'}`,
          statusHtml: o ? `<span class="status" data-status="${o.status}">${STATUS_LABEL[o.status]}</span>` : `<span class="status" data-status="new">New</span>`,
          groups: [
            { label: 'General', buttons: [
              { id: 'ed-save', icon: ICONS.save, label: 'Save', title: 'Save (design time)' },
              { id: 'ed-deploy', icon: ICONS.deploy, label: 'Deploy', title: 'Deploy (runtime)' },
            ] },
            { label: 'View', buttons: [{ id: 'run', icon: ICONS.preview, label: 'Data Preview', title: 'Who may see which values' }] },
          ],
        })}
        <div class="ed-body">
          <section class="ed-center dac-center">
            <div class="tbl-section">
              <h3>Criteria Type</h3>
              <div class="dac-types" id="dac-type">
                <label class="dac-type on"><input type="radio" name="dac-type" checked> <b>Single Values</b>
                  <small>A user sees the rows that match one of the values listed for him, e.g. his grid areas.</small></label>
                <button type="button" class="dac-type off" data-dac-info="operator"><b>Operator and Values</b><small>Ranges and patterns, like BW analysis authorizations. Not in this game.</small></button>
                <button type="button" class="dac-type off" data-dac-info="hierarchy"><b>Hierarchy</b><small>A node and everything below it. Not in this game yet.</small></button>
              </div>
            </div>
            <div class="tbl-section">
              <h3>Permissions Entity</h3>
              <p class="muted">The table or view that says which user may see which values: one row per user and value.</p>
              <div class="form-grid">
                <label>Permissions Entity
                  <select id="dac-entity"><option value="">Select a table or view…</option>
                    ${entities.map((e) => `<option value="${esc(objectKey(e))}" ${objectKey(e) === def.entity ? 'selected' : ''}>${esc(e.name)} · ${esc(e.kind)}${e.space !== space ? ` · ${esc(e.space)}` : ''}</option>`).join('')}
                  </select></label>
                <label>Identifier Column <small>holds the user IDs</small>
                  <select id="dac-identifier" ${cols.length ? '' : 'disabled'}><option value="">Select…</option>
                    ${cols.map((c) => `<option ${c === def.identifier ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
              </div>
              ${!entities.length ? `<p class="form-error">No deployed table or view in ${esc(space)} yet. Build the permissions table first.</p>` : ''}
            </div>
            <div class="tbl-section">
              <h3>Criteria</h3>
              <p class="muted">The columns whose values decide what a user sees. They are mapped to columns of the protected view later.</p>
              <div class="am-chips" id="dac-criteria">${cols.filter((c) => c !== def.identifier).map((c) => `<label><input type="checkbox" data-criterion="${esc(c)}" ${def.criteria.includes(c) ? 'checked' : ''}> ${esc(c)}</label>`).join('') || '<span class="muted">Choose the permissions entity first.</span>'}</div>
            </div>
          </section>
          <aside class="props" id="properties" aria-label="Properties">
            ${propsHead('Model Properties', ICONS.lock, `Data Access Control ${technical || ''}`)}
            <label>Business Name <small>for people</small><input id="prop-business" value="${esc(business)}" maxlength="120" autocomplete="off"></label>
            <label>Technical Name <small>${o ? 'fixed once saved' : 'A–Z, 0–9, _; fixed once saved'}</small>
              <input id="prop-technical" class="mono" value="${esc(technical)}" ${o ? 'readonly' : ''} maxlength="50" spellcheck="false" autocomplete="off"></label>
            <dl class="props-list">
              <dt>Type</dt><dd>Data Access Control</dd>
              <dt>Space</dt><dd>${spaceChip(space)}</dd>
              <dt>Status</dt><dd>${o ? `<span class="status" data-status="${o.status}">${STATUS_LABEL[o.status]}</span><p class="muted">${STATUS_HELP[o.status]}</p>` : 'New, not saved'}</dd>
            </dl>
            <p class="muted">Assign it to a view in the view's properties (section Data Access Controls). Users without an entry see no rows.</p>
          </aside>
        </div>
        <div class="results" id="results"><div class="placeholder"><b>Data Preview</b> lists, per user, the values this control lets him see.</div></div>
      </div>`;
    bind();
  };

  function bind() {
    bindDetails(main);
    const bn = main.querySelector<HTMLInputElement>('#prop-business')!;
    const tn = main.querySelector<HTMLInputElement>('#prop-technical')!;
    bn.addEventListener('input', () => {
      business = bn.value;
      if (!techTouched && !o) tn.value = technical = suggestTechnicalName(bn.value);
      keep();
    });
    tn.addEventListener('input', () => {
      techTouched = true;
      tn.value = technical = tn.value.toUpperCase();
      keep();
    });
    main.querySelector('#ed-back')!.addEventListener('click', nav.back);
    main.querySelector<HTMLSelectElement>('#dac-entity')!.addEventListener('change', async (e) => {
      def.entity = (e.target as HTMLSelectElement).value;
      def.identifier = '';
      def.criteria = [];
      await loadColumns();
      ctx.track(`dac-entity:${def.entity}`);
      draw();
    });
    main.querySelector<HTMLSelectElement>('#dac-identifier')!.addEventListener('change', (e) => {
      def.identifier = (e.target as HTMLSelectElement).value;
      def.criteria = def.criteria.filter((c) => c !== def.identifier);
      draw();
    });
    main.querySelectorAll<HTMLInputElement>('[data-criterion]').forEach((c) =>
      c.addEventListener('change', () => {
        def.criteria = c.checked ? [...new Set([...def.criteria, c.dataset.criterion!])] : def.criteria.filter((x) => x !== c.dataset.criterion);
        keep();
      }),
    );
    main.querySelectorAll<HTMLButtonElement>('[data-dac-info]').forEach((b) =>
      b.addEventListener('click', () => {
        const text = b.dataset.dacInfo === 'operator'
          ? 'Operator and Values: each entry is a pair of operator and value (for example between, contains pattern), combined with AND and OR, like analysis authorizations in SAP BW. The handbook marks the details as not verified, so the game leaves it out.'
          : 'Hierarchy: an entry names a node of a hierarchy; the user sees that node and everything below it, for example a region and all its grid areas. It needs a hierarchy view, which the game does not model yet.';
        const d = openDialog(b.querySelector('b')!.textContent!, `<p class="guide-lead">${esc(text)}</p><div class="guide-actions"><button class="btn primary" type="submit">Got it</button></div>`);
        d.form.addEventListener('submit', (ev) => {
          ev.preventDefault();
          d.close();
        });
      }),
    );
    main.querySelector('#ed-save')!.addEventListener('click', () => {
      if (save()) ctx.renderView();
    });
    main.querySelector('#ed-deploy')!.addEventListener('click', async () => {
      const err = dacError(def, t, space, columns);
      if (err) return toast(`Deployment failed. ${err}`, 'error');
      const saved = save(true);
      if (!saved) return;
      const locked = lockError(t, saved.space);
      if (locked) return toast(`Deployment failed. ${locked}`, 'error');
      await deploy(saved);
      ctx.track(`deploy:${objectKey(saved)}`);
      ctx.save();
      toast(`${saved.name} deployed`);
      ctx.renderView();
    });
    main.querySelector('#run')!.addEventListener('click', async () => {
      const out = main.querySelector<HTMLElement>('#results')!;
      const err = dacError(def, t, space, columns);
      if (err) {
        out.innerHTML = `<div class="result-status error">${esc(err)}</div>`;
        return;
      }
      ctx.track(`preview:${o ? objectKey(o) : 'draft'}`);
      const [es, en] = def.entity.split('.');
      const crit = def.criteria.map((c) => `"${c}"`).join(` || ' · ' || `);
      try {
        const res = await runSql(`SELECT "${def.identifier}" AS USER_ID, count(*) AS ENTRIES, string_agg(${crit}, ', ' ORDER BY ${crit}) AS ALLOWED_VALUES
          FROM "${es}"."${en}" GROUP BY 1 ORDER BY 1`);
        out.innerHTML = `<div class="result-status ok">${res.rows.length} ${res.rows.length === 1 ? 'user' : 'users'} with entries. Everyone else sees nothing in a protected view.</div>${resultTable(res.columns, res.rows)}`;
      } catch (e) {
        out.innerHTML = `<div class="result-status error">${esc(e instanceof Error ? e.message : String(e))}</div>`;
      }
    });
  }

  function save(quiet = false): RepoObject | null {
    const bn = business.trim();
    if (!bn) {
      toast('Enter a business name before you save.', 'error');
      return null;
    }
    if (!o) {
      const name = technical.trim();
      const err = objectNameError(name, space, t);
      if (err) {
        toast(err, 'error');
        return null;
      }
      const created: RepoObject = {
        space, name, kind: 'Data Access Control', businessName: bn, semanticUsage: 'Relational Dataset',
        dac: structuredClone(def), status: 'not_deployed', changedAt: new Date().toISOString(),
      };
      t.objects.push(created);
      fresh = null;
      ctx.track(`save:${objectKey(created)}`);
      ctx.save();
      nav.opened(objectKey(created));
      if (!quiet) toast('Saved. The data access control is not deployed yet.');
      return created;
    }
    o.businessName = bn;
    o.dac = structuredClone(def);
    touch(o);
    ctx.track(`save:${objectKey(o)}`);
    ctx.save();
    if (!quiet) toast(o.status === 'changes' ? 'Saved. Deploy to make the changes active.' : 'Saved');
    return o;
  }

  draw();
}

/** Small icon helper re-export for the builder list. */
export const dacIcon = () => icon(ICONS.lock, 'type-ic');
