import { ctx } from '../ctx';
import { runSql } from '../db';
import {
  STATUS_LABEL, STATUS_HELP, SEMANTIC_USAGES, objectKey, usedBy, findObject, objectNameError, suggestTechnicalName, touch, deploy,
  type RepoObject, type SemanticUsage,
} from '../repo';
import { COL_TYPES, emptyTable, tableError, type TableDef, type ColType } from '../localtable';
import { lockError } from '../integration';
import { esc, spaceChip, icon, ICONS, toast, resultTable } from '../ui';
import { objectToolbar, objectPage, bindObjectPage } from './toolbar';
import { EXCURSIONS } from '../content/chapters';

/**
 * Local table editor (chapter 8, Handbuch 6.4.1): columns with data type and key, and a Data Editor for the rows.
 * Like every editor: Save keeps the design, Deploy creates the table in the space with its rows.
 */

export interface TableNav {
  back: () => void;
  opened: (key: string) => void;
}

/** Draft of a new table, kept while switching views. */
let fresh: { space: string; def: TableDef; business: string; technical: string; touched: boolean } | null = null;

export function newTableDraft() {
  fresh = null;
}

export function renderTableEditor(main: HTMLElement, o: RepoObject | null, nav: TableNav) {
  const t = ctx.tenant();
  const space = o?.space ?? t.activeSpace;
  if (!o && (!fresh || fresh.space !== space)) fresh = { space, def: emptyTable(), business: '', technical: '', touched: false };
  const def: TableDef = o ? structuredClone(o.table ?? emptyTable()) : fresh!.def;
  let business = o?.businessName ?? fresh!.business;
  let technical = o?.name ?? fresh!.technical;
  let techTouched = o ? true : fresh!.touched;
  let usage: SemanticUsage = o?.semanticUsage ?? 'Relational Dataset';
  const chapter = ctx.currentChapter();
  /** Delta Capture is chosen before the first deployment and fixed afterwards (SAP Help, Create a Local Table). */
  const lockedDelta = !!o?.deployed?.table;
  /** As in the tenant, the Data Editor only works on a deployed table; row changes are written with Save (SAP Help, Maintain Table Data). */
  const editable = !!o?.deployed?.table;
  const keep = () => {
    if (!o && fresh) Object.assign(fresh, { def, business, technical, touched: techTouched });
  };

  const draw = () => {
    keep();
    const key = o ? objectKey(o) : '';
    const deps = o ? usedBy(key, t) : [];
    const columnsHtml = `<div class="tbl-section">
              <div class="tbl-head"><h3 class="sr-only">Columns</h3><span class="spacer"></span>
                <button class="btn small" type="button" id="tbl-add-col">${icon(ICONS.plus)} Add Column</button>
                <label class="inline-field muted">Index Type: <select disabled title="Not part of the game"><option>None</option></select></label></div>
              <table class="grid compact" id="tbl-columns">
                <thead><tr><th>Key</th><th>Technical Name</th><th>Data Type</th><th></th></tr></thead>
                <tbody>${def.columns.map((c, i) => `<tr>
                  <td><input type="checkbox" data-col-key="${i}" ${c.key ? 'checked' : ''} aria-label="${esc(c.name)} is a key column"></td>
                  <td><input class="mono" data-col-name="${i}" value="${esc(c.name)}" maxlength="50" spellcheck="false" aria-label="Column name"></td>
                  <td><select data-col-type="${i}" aria-label="Data type of ${esc(c.name)}">${COL_TYPES.map((ty) => `<option ${ty === c.type ? 'selected' : ''}>${ty}</option>`).join('')}</select></td>
                  <td><button class="btn small link" type="button" data-del-col="${i}" aria-label="Remove column ${esc(c.name)}">Remove</button></td>
                </tr>`).join('') || '<tr><td colspan="4" class="empty-row">No columns yet. Press Add Column.</td></tr>'}</tbody>
              </table>
            </div>`;
    const dataHtml = `<div class="tbl-section">
              <div class="tbl-head"><h3>${def.rows.length} ${def.rows.length === 1 ? 'row' : 'rows'}</h3>
                ${editable ? `<button class="btn small" type="button" id="tbl-add-row">${icon(ICONS.plus)} Add Row</button>` : ''}</div>
              ${editable ? '' : `<p class="muted" id="tbl-not-deployed">The table is not deployed, so it holds no data yet and the Data Editor is read-only. Deploy it first; then add or change rows here and press Save.${def.rows.length
                ? ` The ${def.rows.length} prepared ${def.rows.length === 1 ? 'row is' : 'rows are'} written at the first deploy.` : ''}</p>`}
              <div class="table-scroll"><table class="grid compact" id="tbl-data">
                <thead><tr>${def.columns.map((c) => `<th>${esc(c.name)}${c.key ? ' <span class="key-mark" title="Key">●</span>' : ''}<small>${c.type}</small></th>`).join('')}<th></th></tr></thead>
                <tbody>${def.rows.length ? def.rows.map((r, ri) => `<tr>${def.columns.map((c, ci) => `<td><input data-cell="${ri}:${ci}" value="${esc(r[ci] ?? '')}"
                    ${c.type === 'Date' ? 'placeholder="YYYY-MM-DD"' : ''} spellcheck="false" ${editable ? '' : 'disabled'} aria-label="Row ${ri + 1}, ${esc(c.name)}"></td>`).join('')}
                    <td>${editable ? `<button class="btn small link" type="button" data-del-row="${ri}" aria-label="Delete row ${ri + 1}">Delete</button>` : ''}</td></tr>`).join('')
                  : `<tr><td colspan="${def.columns.length + 1}" class="empty-row">${editable ? 'No rows yet. Press Add Row.' : 'No rows yet. Deploy the table first; then add rows here and press Save.'}</td></tr>`}</tbody>
              </table></div>
              <p class="muted tbl-note">In the tenant the Data Editor opens from the toolbar (Tools). ${editable
                ? 'It works on the deployed table: Save writes your row changes into it.' : 'It only works on a deployed table: deploy first, then change rows and press Save.'}${o?.deployed?.table?.deltaCapture
                ? ' Delta Capture records what each save changed.' : ''}</p>
            </div>
            ${o?.deployed?.table?.deltaCapture ? deltaHtml(o) : ''}`;
    const general = `<div class="obj-form" id="properties">
            <label>Business Name:<input id="prop-business" value="${esc(business)}" maxlength="120" autocomplete="off"></label>
            <label>Technical Name: * <small>${o ? 'fixed once saved' : 'A–Z, 0–9, _; fixed once saved'}</small>
              <input id="prop-technical" class="mono" value="${esc(technical)}" ${o ? 'readonly' : ''} maxlength="50" spellcheck="false" autocomplete="off"></label>
            <label>Semantic Usage:
              <select id="prop-semantic" ${chapter >= 6 ? '' : 'disabled'}>${SEMANTIC_USAGES.map((u) => `<option ${u === usage ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
            <label>Storage: <small>Disk by default; In-Memory keeps it in memory (more speed, more memory). The game keeps every table on disk.</small>
              <select disabled><option>Disk</option><option>In-Memory</option></select></label>
            ${chapter >= EXCURSIONS || def.deltaCapture ? `<label class="switch-line">Delta Capture: <small>${!lockedDelta ? 'records inserts, updates and deletes in a delta table, for delta loads. Choose it before the first deploy: it cannot be changed later'
                : def.deltaCapture ? 'on: the table records its changes; it cannot be switched off after deployment' : 'off: it can only be switched on before the first deploy'}</small>
              <span class="switch"><input type="checkbox" id="prop-delta" ${def.deltaCapture ? 'checked' : ''} ${lockedDelta ? 'disabled' : ''}></span></label>` : ''}
            <div class="obj-status"><span class="muted">Status:</span> ${o ? `<span class="status" data-status="${o.status}">${STATUS_LABEL[o.status]}</span> <small class="muted">${STATUS_HELP[o.status]}</small>` : 'New, not saved'}
              <span class="muted">· Space</span> ${spaceChip(space)}</div>
          </div>`;
    main.innerHTML = `
      <div class="editor-page is-tableed is-objpage">
        ${objectToolbar({
          space,
          title: business || 'New Table',
          sub: `Local Table · ${space}.${technical || '…'}`,
          statusHtml: o ? `<span class="status" data-status="${o.status}">${STATUS_LABEL[o.status]}</span>` : `<span class="status" data-status="new">New</span>`,
          groups: [
            { label: 'General', buttons: [
              { id: 'ed-save', icon: ICONS.save, label: 'Save', title: 'Save (design time)' },
              { id: 'ed-deploy', icon: ICONS.deploy, label: 'Deploy', title: 'Deploy: create the table with its rows' },
            ] },
            { label: 'View', buttons: [{ id: 'run', icon: ICONS.preview, label: 'Data Preview', title: o?.deployed ? 'Data Preview' : 'Deploy first' }] },
            { label: 'Tools', buttons: [{ id: 'tbl-data-editor', icon: ICONS.table, label: 'Data Editor', title: 'Data Editor: the rows of the table' }] },
          ],
          details: false,
        })}
        <div class="ed-body">
          ${objectPage(ICONS.table, business || 'New Table', technical || '…', [
            { id: 'tsec-general', label: 'General', html: general },
            { id: 'tsec-columns', label: `Columns (${def.columns.length})`, html: columnsHtml },
            { id: 'tsec-assoc', label: 'Associations (0)', html: '<p class="muted">Associations of a local table point to other tables or views. In the game, associations live on the views (chapter 6).</p>' },
            { id: 'tsec-purpose', label: 'Business Purpose', html: `<div class="obj-form"><label>Description:<textarea rows="2" disabled placeholder="Not part of the game"></textarea></label>
                <label>Business Contacts:<input disabled></label><label>Responsible Team:<input disabled></label><label>Tags:<input disabled></label></div>` },
            { id: 'tsec-partitions', label: 'Partitions (0)', html: '<p class="muted">Partitions split a large table by a column, e.g. by year, for faster loads. Not used in the game.</p>' },
            { id: 'tsec-deps', label: 'Dependent Objects', html: deps.length
              ? `<ul class="dep-list" id="tbl-deps">${deps.map((k) => `<li><code>${esc(k)}</code> <small class="muted">${esc(findObject(t, k)?.kind ?? '')}</small></li>`).join('')}</ul>`
              : '<p class="muted" id="tbl-deps">No object reads this table yet.</p>' },
            { id: 'tsec-data', label: 'Data Editor', html: dataHtml },
          ])}
        </div>
        <div class="results" id="results"><div class="placeholder"><b>Data Preview</b> shows the deployed table. Deploy it, then press the button above.</div></div>
      </div>`;
    bind();
  };

  const readInputs = () => {
    main.querySelectorAll<HTMLInputElement>('[data-col-name]').forEach((i) => (def.columns[+i.dataset.colName!].name = i.value.trim().toUpperCase()));
    main.querySelectorAll<HTMLSelectElement>('[data-col-type]').forEach((s) => (def.columns[+s.dataset.colType!].type = s.value as ColType));
    main.querySelectorAll<HTMLInputElement>('[data-col-key]').forEach((c) => (def.columns[+c.dataset.colKey!].key = c.checked));
    main.querySelectorAll<HTMLInputElement>('[data-cell]').forEach((i) => {
      const [r, c] = i.dataset.cell!.split(':').map(Number);
      def.rows[r][c] = i.value;
    });
    keep();
  };

  function bind() {
    bindObjectPage(main);
    main.querySelector('#tbl-data-editor')!.addEventListener('click', () => main.querySelector<HTMLButtonElement>('[data-anchor="tsec-data"]')!.click());
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
    main.querySelector<HTMLInputElement>('#prop-delta')?.addEventListener('change', (e) => {
      readInputs();
      def.deltaCapture = (e.target as HTMLInputElement).checked || undefined;
      ctx.track(`table-delta:${o ? objectKey(o) : 'draft'}:${def.deltaCapture ? 'on' : 'off'}`);
      draw();
    });
    main.querySelector<HTMLSelectElement>('#prop-semantic')!.addEventListener('change', (e) => (usage = (e.target as HTMLSelectElement).value as SemanticUsage));
    main.querySelector('#ed-back')!.addEventListener('click', () => {
      readInputs();
      nav.back();
    });
    main.querySelectorAll<HTMLInputElement>('[data-col-name]').forEach((i) => i.addEventListener('input', () => (i.value = i.value.toUpperCase())));
    main.querySelectorAll('[data-col-name], [data-col-type], [data-col-key]').forEach((el) => el.addEventListener('change', () => {
      readInputs();
      draw();
    }));
    main.querySelectorAll('[data-cell]').forEach((el) => el.addEventListener('input', readInputs));
    main.querySelector('#tbl-add-col')!.addEventListener('click', () => {
      readInputs();
      def.columns.push({ name: `COLUMN_${def.columns.length + 1}`, type: 'String', key: false });
      def.rows.forEach((r) => r.push(''));
      draw();
    });
    main.querySelector('#tbl-add-row')?.addEventListener('click', () => {
      readInputs();
      def.rows.push(def.columns.map(() => ''));
      ctx.track(`table-row:${o ? objectKey(o) : 'draft'}`);
      draw();
      main.querySelector<HTMLInputElement>(`[data-cell="${def.rows.length - 1}:0"]`)?.focus();
    });
    main.querySelectorAll<HTMLButtonElement>('[data-del-col]').forEach((b) => b.addEventListener('click', () => {
      readInputs();
      const i = +b.dataset.delCol!;
      def.columns.splice(i, 1);
      def.rows.forEach((r) => r.splice(i, 1));
      draw();
    }));
    main.querySelectorAll<HTMLButtonElement>('[data-del-row]').forEach((b) => b.addEventListener('click', () => {
      readInputs();
      def.rows.splice(+b.dataset.delRow!, 1);
      draw();
    }));
    main.querySelector('#ed-save')!.addEventListener('click', async () => {
      readInputs();
      // Data Editor: on a deployed table whose structure is unchanged, Save writes the rows (no deploy needed).
      const dep = o?.deployed?.table;
      const rowsOnly = !!dep && sameStructure(dep, def) && JSON.stringify(dep.rows) !== JSON.stringify(def.rows);
      if (!rowsOnly) {
        if (save()) ctx.renderView();
        return;
      }
      const err = tableError(def, dep);
      if (err) return toast(err, 'error');
      const saved = save(true);
      if (!saved) return;
      const locked = lockError(t, saved.space);
      if (locked) return toast(`Saving the data failed. ${locked}`, 'error');
      const failed = await deploy(saved);
      ctx.save();
      if (failed) toast(failed, 'error');
      else {
        // A data save is not a deployment: only table-data is tracked, so missions waiting for a deploy stay open.
        ctx.track(`table-data:${objectKey(saved)}`);
        toast(`Saved. ${def.rows.length} ${def.rows.length === 1 ? 'row' : 'rows'} in ${saved.name}`);
      }
      ctx.renderView();
    });
    main.querySelector('#ed-deploy')!.addEventListener('click', async () => {
      readInputs();
      const err = tableError(def, o?.deployed?.table);
      if (err) return toast(err, 'error');
      const saved = save(true);
      if (!saved) return;
      const locked = lockError(t, saved.space);
      if (locked) return toast(`Deployment failed. ${locked}`, 'error');
      const failed = await deploy(saved);
      ctx.save();
      if (failed) toast(failed, 'error');
      else {
        ctx.track(`deploy:${objectKey(saved)}`);
        toast(`${saved.name} deployed with ${def.rows.length} ${def.rows.length === 1 ? 'row' : 'rows'}`);
      }
      ctx.renderView();
    });
    main.querySelector('#run')!.addEventListener('click', async () => {
      const out = main.querySelector<HTMLElement>('#results')!;
      if (!o?.deployed) {
        out.innerHTML = `<div class="result-status error">Deploy the table first. The Data Preview reads what is in the database.</div>`;
        return;
      }
      ctx.track(`preview:${objectKey(o)}`);
      try {
        const res = await runSql(`SELECT * FROM "${o.space}"."${o.name}" LIMIT 100`);
        out.innerHTML = `<div class="result-status ok">${res.rows.length} ${res.rows.length === 1 ? 'row' : 'rows'}${o.status === 'changes' ? ' (deployed version; your saved changes are not deployed yet)' : ''}</div>${resultTable(res.columns, res.rows)}`;
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
        space, name, kind: 'Local Table', businessName: bn, semanticUsage: usage,
        table: structuredClone(def), status: 'not_deployed', changedAt: new Date().toISOString(),
      };
      t.objects.push(created);
      fresh = null;
      ctx.track(`save:${objectKey(created)}`);
      ctx.save();
      nav.opened(objectKey(created));
      if (!quiet) toast('Saved. The table is not deployed yet.');
      return created;
    }
    o.businessName = bn;
    o.semanticUsage = usage;
    o.table = structuredClone(def);
    touch(o);
    ctx.track(`save:${objectKey(o)}`);
    ctx.save();
    if (!quiet) toast(o.status === 'changes' ? 'Saved. Deploy to make the changes active.' : 'Saved');
    return o;
  }

  draw();
}

/** Same structure (columns with name, type and key, in order; Delta Capture), independent of the key order inside each column object. */
export function sameStructure(a: TableDef, b: TableDef): boolean {
  const cols = (d: TableDef) => d.columns.map((c) => [c.name, c.type, !!c.key]);
  return JSON.stringify(cols(a)) === JSON.stringify(cols(b)) && !!a.deltaCapture === !!b.deltaCapture;
}

/** The delta table of a table with Delta Capture: change records, newest first (Handbuch 6.4.2). */
function deltaHtml(o: RepoObject): string {
  const def = o.deployed!.table!;
  const keys = def.columns.map((c, i) => (c.key ? i : -1)).filter((i) => i >= 0);
  const log = [...(o.deltaLog ?? [])].reverse();
  const shown = log.slice(0, 30);
  return `<div class="tbl-section" id="tbl-delta">
      <div class="tbl-head"><h3>Delta Table <small class="muted mono">${esc(o.name)}_Delta · ${log.length} ${log.length === 1 ? 'record' : 'records'}</small></h3></div>
      ${shown.length ? `<div class="table-scroll"><table class="grid compact"><thead><tr><th>#</th><th>Change_Type</th><th>Change_Date</th>${keys.map((i) => `<th>${esc(def.columns[i].name)}</th>`).join('')}<th>Row</th></tr></thead>
        <tbody>${shown.map((r) => `<tr><td class="num">${r.seq}</td><td><span class="delta-type" data-type="${r.type}">${r.type}</span></td><td>${esc(fmtStampShort(r.at))}</td>
          ${keys.map((i) => `<td class="mono">${esc(r.row[i] ?? '')}</td>`).join('')}<td class="muted">${esc(r.row.filter((_, i) => !keys.includes(i)).join(' · '))}</td></tr>`).join('')}</tbody></table></div>`
        : '<p class="muted">No changes recorded yet. Change rows in the Data Editor and save: every insert, update and delete lands here.</p>'}
      <p class="muted tbl-note">I = insert, U = update, D = delete. Transformation flows with Initial and Delta read these records; a SQL view cannot query the delta table.</p>
    </div>`;
}

const fmtStampShort = (iso: string) => (iso ? iso.slice(0, 19).replace('T', ' ') : '');
