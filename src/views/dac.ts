import { ctx } from '../ctx';
import { runSql, describeColumns } from '../db';
import {
  STATUS_LABEL, STATUS_HELP, objectKey, findObject, objectNameError, suggestTechnicalName, touch, deploy, type RepoObject,
} from '../repo';
import { dacError, entityCandidates, hierarchyCandidates, hierarchyColumns, type DacDef } from '../dac';
import { EXCURSIONS } from '../content/chapters';
import { lockError } from '../integration';
import { esc, spaceChip, icon, ICONS, toast, resultTable, openDialog } from '../ui';
import { objectToolbar, objectPage, bindObjectPage } from './toolbar';

/**
 * Data Access Control editor (chapter 8, Handbuch 9.3): criteria type, permissions entity, identifier column (user IDs)
 * and criteria columns. "Single Values" works from chapter 8, "Hierarchy" from the excursions (chapter 12); "Operator and Values"
 * explains itself.
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
  const hierarchyOn = ctx.currentChapter() >= EXCURSIONS;
  const hierarchies = hierarchyCandidates(t, space);
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
      <div class="editor-page is-objpage is-dac">
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
          details: false,
        })}
        <div class="ed-body dac-center">
          ${objectPage(ICONS.lock, business || 'New Data Access Control', technical || '…', [
            { id: 'dsec-general', label: 'General', html: `<div class="obj-two">
              <div class="obj-form" id="properties">
                <label>Business Name:<input id="prop-business" value="${esc(business)}" maxlength="120" autocomplete="off"></label>
                <label>Technical Name: * <small>${o ? 'fixed once saved' : 'A–Z, 0–9, _; fixed once saved'}</small>
                  <input id="prop-technical" class="mono" value="${esc(technical)}" ${o ? 'readonly' : ''} maxlength="50" spellcheck="false" autocomplete="off"></label>
                <label>Owner:<input disabled placeholder="Enter the Owner of This Data Access Control"></label>
                <div class="obj-status"><span class="muted">Status:</span> ${o ? `<span class="status" data-status="${o.status}">${STATUS_LABEL[o.status]}</span> <small class="muted">${STATUS_HELP[o.status]}</small>` : 'New, not saved'}
                  <span class="muted">· Space</span> ${spaceChip(space)}</div>
              </div>
              <div class="obj-form">
                <label>Structure: <small>how an entry describes what a user may see
                  <button type="button" class="link-btn" data-dac-info="operator">Operator and Values?</button>${hierarchyOn ? '' : ' · <button type="button" class="link-btn" data-dac-info="hierarchy">Hierarchy?</button>'}</small>
                  <select id="dac-structure">
                    <option value="Single Values" ${def.type === 'Single Values' ? 'selected' : ''}>Single Values</option>
                    <option disabled>Operator and Values</option>
                    <option value="Hierarchy" ${def.type === 'Hierarchy' ? 'selected' : ''} ${hierarchyOn ? '' : 'disabled'}>Hierarchy</option>
                  </select></label>
                <p class="muted dac-type-help">${def.type === 'Hierarchy'
                  ? 'An entry names a node; the user sees that node and everything below it, e.g. a region with all its grid areas.'
                  : 'A user sees the rows that match one of the values listed for him, e.g. his grid areas.'}</p>
                ${def.type === 'Hierarchy' ? `<label>Hierarchy: * <small>a deployed view with semantic usage Hierarchy; its Parent and Child columns decide what lies below a node</small>
                  <select id="dac-hierarchy"><option value="">Select a hierarchy…</option>
                    ${hierarchies.map((h) => `<option value="${esc(objectKey(h))}" ${objectKey(h) === def.hierarchy ? 'selected' : ''}>${esc(h.name)}${h.space !== space ? ` · ${esc(h.space)}` : ''}</option>`).join('')}
                  </select></label>
                  ${hierarchies.length ? '' : `<p class="form-error">No deployed hierarchy in ${esc(space)} yet. Build a view with semantic usage Hierarchy first.</p>`}` : ''}
                <label>Permissions Entity: * <small>the table or view that says which user may see which values: one row per user and value</small>
                  <select id="dac-entity"><option value="">Select a Table or View Containing User IDs and Criteria</option>
                    ${entities.map((e) => `<option value="${esc(objectKey(e))}" ${objectKey(e) === def.entity ? 'selected' : ''}>${esc(e.name)} · ${esc(e.kind)}${e.space !== space ? ` · ${esc(e.space)}` : ''}</option>`).join('')}
                  </select></label>
                ${!entities.length ? `<p class="form-error">No deployed table or view in ${esc(space)} yet. Build the permissions table first.</p>` : ''}
                <label class="switch-line">Allow IdP User Attributes as Identifiers <small>not part of the game</small><span class="switch"><input type="checkbox" disabled></span></label>
                <p class="muted">The permissions entity must include an identifier column with the user IDs your identity provider knows (here: the user IDs from Security › Users).</p>
                <label>Identifier Column: *
                  <select id="dac-identifier" ${cols.length ? '' : 'disabled'}><option value="">Select…</option>
                    ${cols.map((c) => `<option ${c === def.identifier ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
              </div></div>` },
            { id: 'dsec-criteria', label: 'Criteria', html: `<p class="muted">The columns whose values decide what a user sees. They are mapped to columns of the protected view when you assign the control.${def.type === 'Hierarchy' ? ' Hierarchy: exactly one criterion, the column with the node a user may see.' : ''}</p>
                <table class="grid compact" id="dac-criteria"><thead><tr><th></th><th>Business Name</th><th>Technical Name</th></tr></thead>
                  <tbody>${cols.filter((c) => c !== def.identifier).map((c) => `<tr><td><input type="${def.type === 'Hierarchy' ? 'radio' : 'checkbox'}" name="dac-crit" data-criterion="${esc(c)}" ${def.criteria.includes(c) ? 'checked' : ''} aria-label="${esc(c)} is a criterion"></td>
                    <td>${esc(c)}</td><td class="mono">${esc(c)}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Choose the permissions entity and the identifier column first.</td></tr>'}</tbody></table>
                <p class="muted">Assign the control to a view in the view's properties (section Data Access Controls). Users without an entry see no rows.</p>` },
          ])}
        </div>
        <div class="results" id="results"><div class="placeholder"><b>Data Preview</b> lists, per user, the values this control lets him see.</div></div>
      </div>`;
    bind();
  };

  function bind() {
    bindObjectPage(main);
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
        if (def.type === 'Hierarchy') def.criteria = c.checked ? [c.dataset.criterion!] : [];
        else def.criteria = c.checked ? [...new Set([...def.criteria, c.dataset.criterion!])] : def.criteria.filter((x) => x !== c.dataset.criterion);
        keep();
      }),
    );
    main.querySelector<HTMLSelectElement>('#dac-structure')?.addEventListener('change', (e) => {
      {
        def.type = (e.target as HTMLSelectElement).value as DacDef['type'];
        if (def.type === 'Hierarchy') def.criteria = def.criteria.slice(0, 1);
        else delete def.hierarchy;
        ctx.track(`dac-type:${def.type}`);
        draw();
      }
    });
    main.querySelector<HTMLSelectElement>('#dac-hierarchy')?.addEventListener('change', (e) => {
      def.hierarchy = (e.target as HTMLSelectElement).value;
      ctx.track(`dac-hierarchy:${def.hierarchy}`);
      keep();
    });
    main.querySelectorAll<HTMLButtonElement>('[data-dac-info]').forEach((b) =>
      b.addEventListener('click', () => {
        const text = b.dataset.dacInfo === 'operator'
          ? 'Operator and Values: each entry is a pair of operator and value (for example between, contains pattern), combined with AND and OR, like analysis authorizations in SAP BW. The handbook marks the details as not verified, so the game leaves it out.'
          : 'Hierarchy: an entry names a node of a hierarchy; the user sees that node and everything below it, for example a region and all its grid areas. It needs a hierarchy view; you build one in the excursions (chapter 12).';
        const d = openDialog(b.dataset.dacInfo === 'operator' ? 'Operator and Values' : 'Hierarchy', `<p class="guide-lead">${esc(text)}</p><div class="guide-actions"><button class="btn primary" type="submit">Got it</button></div>`);
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
      const hc = def.type === 'Hierarchy' && def.hierarchy ? hierarchyColumns(t, def.hierarchy) : null;
      const sql = hc
        ? `WITH RECURSIVE sub(u, n) AS (SELECT "${def.identifier}", ${crit} FROM "${es}"."${en}"
             UNION SELECT sub.u, h."${hc.child}" FROM ${def.hierarchy!.split('.').map((x) => `"${x}"`).join('.')} h JOIN sub ON h."${hc.parent}" = sub.n)
           SELECT p."${def.identifier}" AS USER_ID, string_agg(DISTINCT p.${crit}, ', ') AS NODES,
             (SELECT string_agg(n, ', ' ORDER BY n) FROM sub WHERE sub.u = p."${def.identifier}") AS NODES_AND_ALL_BELOW
           FROM "${es}"."${en}" p GROUP BY 1 ORDER BY 1`
        : `SELECT "${def.identifier}" AS USER_ID, count(*) AS ENTRIES, string_agg(${crit}, ', ' ORDER BY ${crit}) AS ALLOWED_VALUES
          FROM "${es}"."${en}" GROUP BY 1 ORDER BY 1`;
      try {
        const res = await runSql(sql);
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
