import { ctx } from '../ctx';
import { runSql } from '../db';
import {
  STATUS_LABEL, STATUS_HELP, SEMANTIC_USAGES, objectKey, objectNameError, suggestTechnicalName, touch, deploy,
  type RepoObject, type SemanticUsage,
} from '../repo';
import { COL_TYPES, emptyTable, tableError, type TableDef, type ColType } from '../localtable';
import { lockError } from '../integration';
import { esc, spaceChip, icon, ICONS, toast, resultTable } from '../ui';
import { objectToolbar, bindDetails, propsHead } from './toolbar';
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
  const keep = () => {
    if (!o && fresh) Object.assign(fresh, { def, business, technical, touched: techTouched });
  };

  const draw = () => {
    keep();
    main.innerHTML = `
      <div class="editor-page is-tableed">
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
          ],
        })}
        <div class="ed-body">
          <section class="ed-center tbl-center">
            <div class="tbl-section">
              <div class="tbl-head"><h3>Columns <small class="muted">${def.columns.length}</small></h3>
                <button class="btn small" type="button" id="tbl-add-col">${icon(ICONS.plus)} Add Column</button></div>
              <table class="grid compact" id="tbl-columns">
                <thead><tr><th>Key</th><th>Technical Name</th><th>Data Type</th><th></th></tr></thead>
                <tbody>${def.columns.map((c, i) => `<tr>
                  <td><input type="checkbox" data-col-key="${i}" ${c.key ? 'checked' : ''} aria-label="${esc(c.name)} is a key column"></td>
                  <td><input class="mono" data-col-name="${i}" value="${esc(c.name)}" maxlength="50" spellcheck="false" aria-label="Column name"></td>
                  <td><select data-col-type="${i}" aria-label="Data type of ${esc(c.name)}">${COL_TYPES.map((ty) => `<option ${ty === c.type ? 'selected' : ''}>${ty}</option>`).join('')}</select></td>
                  <td><button class="btn small link" type="button" data-del-col="${i}" aria-label="Remove column ${esc(c.name)}">Remove</button></td>
                </tr>`).join('')}</tbody>
              </table>
            </div>
            <div class="tbl-section">
              <div class="tbl-head"><h3>Data Editor <small class="muted">${def.rows.length} ${def.rows.length === 1 ? 'row' : 'rows'}</small></h3>
                <button class="btn small" type="button" id="tbl-add-row">${icon(ICONS.plus)} Add Row</button></div>
              <div class="table-scroll"><table class="grid compact" id="tbl-data">
                <thead><tr>${def.columns.map((c) => `<th>${esc(c.name)}${c.key ? ' <span class="key-mark" title="Key">●</span>' : ''}<small>${c.type}</small></th>`).join('')}<th></th></tr></thead>
                <tbody>${def.rows.length ? def.rows.map((r, ri) => `<tr>${def.columns.map((c, ci) => `<td><input data-cell="${ri}:${ci}" value="${esc(r[ci] ?? '')}"
                    ${c.type === 'Date' ? 'placeholder="YYYY-MM-DD"' : ''} spellcheck="false" aria-label="Row ${ri + 1}, ${esc(c.name)}"></td>`).join('')}
                    <td><button class="btn small link" type="button" data-del-row="${ri}" aria-label="Delete row ${ri + 1}">Delete</button></td></tr>`).join('')
                  : `<tr><td colspan="${def.columns.length + 1}" class="empty-row">No rows yet. Press Add Row.</td></tr>`}</tbody>
              </table></div>
              <p class="muted tbl-note">Rows are part of the design: Save keeps them, Deploy writes them into the table.${o?.deployed?.table?.deltaCapture
                ? ' Delta Capture records what each deployment changed.' : ''}</p>
            </div>
            ${o?.deployed?.table?.deltaCapture ? deltaHtml(o) : ''}
          </section>
          <aside class="props" id="properties" aria-label="Properties">
            ${propsHead('Model Properties', ICONS.table, `Local Table ${technical || ''}`)}
            <label>Business Name <small>for people</small><input id="prop-business" value="${esc(business)}" maxlength="120" autocomplete="off"></label>
            <label>Technical Name <small>${o ? 'fixed once saved' : 'A–Z, 0–9, _; fixed once saved'}</small>
              <input id="prop-technical" class="mono" value="${esc(technical)}" ${o ? 'readonly' : ''} maxlength="50" spellcheck="false" autocomplete="off"></label>
            <label>Semantic Usage <small>what kind of data this is</small>
              <select id="prop-semantic" ${chapter >= 6 ? '' : 'disabled'}>${SEMANTIC_USAGES.map((u) => `<option ${u === usage ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
            <label>Storage <small>Disk by default; In-Memory keeps it in memory (more speed, more memory)</small>
              <select disabled title="The game keeps every table on disk"><option>Disk</option><option>In-Memory</option></select></label>
            ${chapter >= EXCURSIONS || def.deltaCapture ? `<label class="switch-line">Delta Capture <small>${!lockedDelta ? 'records inserts, updates and deletes in a delta table, for delta loads. Choose it before the first deploy: it cannot be changed later'
                : def.deltaCapture ? 'on: the table records its changes; it cannot be switched off after deployment' : 'off: it can only be switched on before the first deploy'}</small>
              <span class="switch"><input type="checkbox" id="prop-delta" ${def.deltaCapture ? 'checked' : ''} ${lockedDelta ? 'disabled' : ''}></span></label>` : ''}
            <dl class="props-list">
              <dt>Type</dt><dd>Local Table</dd>
              <dt>Space</dt><dd>${spaceChip(space)}</dd>
              <dt>Status</dt><dd>${o ? `<span class="status" data-status="${o.status}">${STATUS_LABEL[o.status]}</span><p class="muted">${STATUS_HELP[o.status]}</p>` : 'New, not saved'}</dd>
            </dl>
          </aside>
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
    main.querySelector('#tbl-add-row')!.addEventListener('click', () => {
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
    main.querySelector('#ed-save')!.addEventListener('click', () => {
      readInputs();
      if (save()) ctx.renderView();
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
        : '<p class="muted">No changes recorded yet. Change rows in the Data Editor and deploy: every insert, update and delete lands here.</p>'}
      <p class="muted tbl-note">I = insert, U = update, D = delete. Transformation flows with Initial and Delta read these records; a SQL view cannot query the delta table.</p>
    </div>`;
}

const fmtStampShort = (iso: string) => (iso ? iso.slice(0, 19).replace('T', ' ') : '');
