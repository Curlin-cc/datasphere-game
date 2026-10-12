import { ctx } from '../ctx';
import {
  STATUS_LABEL, STATUS_HELP, objectKey, objectNameError, suggestTechnicalName, touch, deploy, findObject, type RepoObject,
} from '../repo';
import { lockError, runsOf } from '../integration';
import { runSql } from '../db';
import { createSqlEditor, type SqlEditor } from '../editor';
import { esc, spaceChip, ICONS, toast, fmtDate, resultTable } from '../ui';
import { objectToolbar, bindDetails, propsHead } from './toolbar';
import { startTransformRun } from './monitor';
import {
  TF_LOADS, deltaSources, emptyTransform, transformError, transformReads, type TfLoad, type TransformFlowDef,
} from '../transformflow';

/**
 * Transformation Flow editor (excursion c12-m11, Handbuch 6.7.3). The real canvas has a View Transform node (graphical or SQL)
 * and a Target Table node; the game shows both as boxes. The view transform is written in SQL (the game builds no graphical
 * views). The load type sits in the flow's own properties: Initial Only, or Initial and Delta for a source with Delta Capture.
 */

export interface TransformNav {
  back: () => void;
  opened: (key: string) => void;
}

type Node = 'general' | 'transform' | 'target';
let node: Node = 'general';
let fresh: { space: string; def: TransformFlowDef; business: string; technical: string; touched: boolean } | null = null;

export function newTransformDraft() {
  fresh = null;
  node = 'transform';
}

const LOAD_TEXT: Record<TfLoad, string> = {
  'Initial Only': 'Every run reads all source rows. With Delete All Before Loading = Yes on the target (the game\'s setting) it replaces the target; with No it appends and updates rows by key (UPSERT). Simple, but the whole source is processed each night.',
  'Initial and Delta': 'The first run loads everything. Later runs read only what changed in the source since the last run (inserts, updates, deletes) and update the target by key. Needs a source table with Delta Capture.',
};

export function renderTransformEditor(main: HTMLElement, o: RepoObject | null, nav: TransformNav) {
  const t = ctx.tenant();
  const space = o?.space ?? t.activeSpace;
  const readOnly = !!o && o.space !== t.activeSpace;
  if (!o && (!fresh || fresh.space !== space)) {
    fresh = { space, def: { ...emptyTransform(), sql: '-- The view transform: one SELECT on the sources.\nSELECT\n  \nFROM ' }, business: '', technical: '', touched: false };
  }
  const def: TransformFlowDef = o ? structuredClone(o.transform ?? emptyTransform()) : fresh!.def;
  let business = o?.businessName ?? fresh!.business;
  let technical = o?.name ?? fresh!.technical;
  let techTouched = o ? true : fresh!.touched;
  let editor: SqlEditor | null = null;
  let preview = '';
  const keep = () => {
    if (editor) def.sql = editor.getValue();
    if (!o && fresh) Object.assign(fresh, { def, business, technical, touched: techTouched });
  };

  const draw = () => {
    keep();
    editor = null;
    const runs = o ? runsOf(t, objectKey(o)) : [];
    const target = def.target ? findObject(t, `${space}.${def.target}`) : undefined;
    const src = deltaSources(def.sql, t)[0];
    const reads = transformReads(def.sql, t);
    const box = (id: Node, title: string, sub: string, state: 'on' | 'off' = 'on') =>
      `<button type="button" class="df-node ${state} ${node === id ? 'sel' : ''}" data-node="${id}"><small>${esc(title)}</small><b>${esc(sub)}</b></button>`;
    main.innerHTML = `
      <div class="editor-page is-dataflow is-transform">
        ${objectToolbar({
          space,
          title: business || 'New Transformation Flow',
          sub: `Transformation Flow · ${space}.${technical || '…'}`,
          statusHtml: o ? `<span class="status" data-status="${o.status}">${STATUS_LABEL[o.status]}</span>` : `<span class="status" data-status="new">New</span>`,
          groups: [
            { label: 'General', buttons: [
              { id: 'ed-save', icon: ICONS.save, label: 'Save', title: 'Save (design time)', disabled: readOnly },
              { id: 'ed-deploy', icon: ICONS.deploy, label: 'Deploy', title: 'Deploy (runtime)', disabled: readOnly },
            ] },
            { label: 'Run', buttons: [{ id: 'tf-run', icon: ICONS.flow, label: 'Run', title: o?.deployed ? 'Run the deployed transformation flow' : 'Deploy first', disabled: readOnly || !o?.deployed }] },
          ],
        })}
        <div class="ed-body">
          <section class="ed-center df-center">
            <div class="df-canvas" id="tf-canvas" aria-label="Canvas">
              ${box('transform', 'View Transform', reads.length ? `SQL · ${reads.map((k) => k.split('.')[1]).join(', ')}` : 'SQL · write it', reads.length ? 'on' : 'off')}
              <span class="df-arrow" aria-hidden="true">→</span>
              ${box('target', 'Target', def.target || 'choose', def.target ? 'on' : 'off')}
              <span class="tf-load-chip" id="tf-load-chip">${esc(def.loadType)}</span>
            </div>
            ${node === 'transform' ? `<div class="tbl-section tf-sql-section"><div class="tbl-head"><h3>View Transform <small class="muted">SQL</small></h3>
                <button class="btn small" type="button" id="tf-preview">Data Preview</button></div>
              <div class="tf-editor" id="tf-editor"></div>
              <p class="muted small-note">Read the source table itself, not its <code>_Delta</code> table: with Initial and Delta the flow picks the changed rows for you.</p>
              <div id="tf-preview-out">${preview}</div></div>` : ''}
            ${node === 'target' ? `<div class="tbl-section"><h3>Target Table</h3>
              ${target?.table ? `<p class="muted">${esc(target.name)}: ${target.table.columns.length} columns${target.table.columns.some((c) => c.key) ? `, key ${esc(target.table.columns.filter((c) => c.key).map((c) => c.name).join(', '))}` : ', no key'}, ${target.table.rows.length} rows.</p>
                <p class="muted">${target.table.columns.map((c) => `<code>${esc(c.name)}</code>`).join(' ')}</p>`
                : def.target ? '<p class="muted">New table: the first run creates it with the columns of the view transform, and the key of the delta source.</p>' : '<p class="muted">Name the target on the right.</p>'}</div>` : ''}
            <div class="tbl-section"><h3>Runs</h3>
              ${runs.length ? `<ol class="run-log df-runs" id="tf-runs">${runs.slice(0, 5).map((r) => `<li class="${r.status === 'Failed' ? 'err' : ''}"><b>${fmtDate(r.start)} · ${esc(r.status)} · ${r.records.toLocaleString('en-US')}</b> ${esc(r.messages.join(' '))}</li>`).join('')}</ol>`
                : '<p class="muted">No runs yet. Deploy, then Run; nightly runs come from a task chain.</p>'}
            </div>
          </section>
          <aside class="props" id="properties" aria-label="Properties">
            ${propsHead('Model Properties', ICONS.flow, node === 'general' ? `Transformation Flow ${technical}` : node === 'transform' ? 'View Transform' : 'Target Table')}
            ${node !== 'general' ? '<button type="button" class="btn small link" id="tf-general">‹ Transformation flow properties</button>' : ''}
            <div id="tf-props">${propsHtml(target, src, reads)}</div>
          </aside>
        </div>
      </div>`;
    bind();
  };

  function propsHtml(target: RepoObject | undefined, src: RepoObject | undefined, reads: string[]) {
    const ro = readOnly ? 'disabled' : '';
    if (node === 'general') {
      return `<label>Business Name <small>for people</small><input id="prop-business" value="${esc(business)}" maxlength="120" autocomplete="off" ${readOnly ? 'readonly' : ''}></label>
        <label>Technical Name <small>${o ? 'fixed once saved' : 'A–Z, 0–9, _; fixed once saved'}</small>
          <input id="prop-technical" class="mono" value="${esc(technical)}" ${o ? 'readonly' : ''} maxlength="50" spellcheck="false" autocomplete="off"></label>
        <label>Load Type <small>${esc(LOAD_TEXT[def.loadType])}</small>
          <select id="tf-load" name="tf-load" ${ro}>${TF_LOADS.map((l) => `<option value="${l}" ${def.loadType === l ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <dl class="props-list"><dt>Runtime</dt><dd>SAP HANA</dd><dt>Type</dt><dd>Transformation Flow</dd><dt>Space</dt><dd>${spaceChip(space)}</dd>
          <dt>Delta source</dt><dd>${src ? `${esc(objectKey(src))} <small class="muted">Delta Capture on</small>` : '<span class="muted">none</span>'}</dd>
          ${o?.deployed?.transform?.loadType === 'Initial and Delta' ? `<dt>Watermark</dt><dd>${o.tfPointer === undefined ? 'Next run is the initial load' : o.tfPointer ? `Change records up to #${o.tfPointer} processed` : 'Initial load done; no change records processed yet'}</dd>` : ''}
          <dt>Status</dt><dd>${o ? `<span class="status" data-status="${o.status}">${STATUS_LABEL[o.status]}</span><p class="muted">${STATUS_HELP[o.status]}</p>` : 'New, not saved'}</dd></dl>
        <p class="muted">Click a node of the canvas to set it up.</p>`;
    }
    if (node === 'transform') {
      const tables = reads.map((k) => findObject(t, k)!).filter((x) => x.kind === 'Local Table');
      return `<p class="muted">Write one SELECT. It may read objects of ${esc(space)} and objects shared with it.</p>
        ${reads.length ? `<p><b>Sources</b></p><ul class="tf-sources">${reads.map((k) => {
          const x = findObject(t, k)!;
          const delta = !!x.deployed?.table?.deltaCapture;
          return `<li><code>${esc(k)}</code> <small class="muted">${esc(x.kind)}${x.kind === 'Local Table' ? (delta ? ' · Delta Capture on' : ' · no Delta Capture') : ''}</small></li>`;
        }).join('')}</ul>` : ''}
        ${def.loadType === 'Initial and Delta' && reads.length && !tables.some((x) => x.deployed?.table?.deltaCapture)
          ? '<p class="tf-warn">Initial and Delta needs a source table with Delta Capture. None of these records changes.</p>' : ''}`;
    }
    const tables = t.objects.filter((x) => x.space === space && x.kind === 'Local Table' && !x.source).map((x) => x.name);
    return `<label>Target table <small>a local table of ${esc(space)}; a new name creates it on the first run</small>
        <input class="mono" id="tf-target" list="tf-target-list" value="${esc(def.target)}" ${readOnly ? 'readonly' : ''} spellcheck="false" autocomplete="off">
        <datalist id="tf-target-list">${tables.map((n) => `<option value="${esc(n)}">`).join('')}</datalist></label>
      ${target && target.kind !== 'Local Table' ? `<p class="tf-warn">${esc(target.kind)}: not a valid target.</p>` : ''}
      <dl class="kv"><dt>Delete All Before Loading</dt><dd>${def.loadType === 'Initial Only' ? 'Yes: each run empties the target, then loads' : 'No: a target with Delta Capture cannot be emptied before loading'}</dd></dl>
      <p class="muted">Columns are mapped by name. With Initial and Delta, the target needs the key of the delta source.</p>`;
  }

  function bind() {
    bindDetails(main);
    main.querySelector('#ed-back')!.addEventListener('click', () => {
      keep();
      nav.back();
    });
    const host = main.querySelector<HTMLElement>('#tf-editor');
    if (host) {
      editor = createSqlEditor(host, def.sql, () => void runPreview());
      if (readOnly) host.classList.add('readonly');
    }
    main.querySelectorAll<HTMLButtonElement>('[data-node]').forEach((b) => b.addEventListener('click', () => {
      keep();
      node = b.dataset.node as Node;
      ctx.track(`tf-node:${node}`);
      draw();
    }));
    main.querySelector('#tf-general')?.addEventListener('click', () => {
      keep();
      node = 'general';
      draw();
    });
    main.querySelector('#tf-preview')?.addEventListener('click', () => void runPreview());
    if (readOnly) return;
    const on = (sel: string, ev: string, fn: () => void) => main.querySelector(sel)?.addEventListener(ev, fn);
    on('#prop-business', 'input', () => {
      business = main.querySelector<HTMLInputElement>('#prop-business')!.value;
      if (!techTouched && !o) main.querySelector<HTMLInputElement>('#prop-technical')!.value = technical = suggestTechnicalName(business);
      keep();
    });
    on('#prop-technical', 'input', () => {
      techTouched = true;
      const el = main.querySelector<HTMLInputElement>('#prop-technical')!;
      el.value = technical = el.value.toUpperCase();
      keep();
    });
    on('#tf-load', 'change', () => {
      def.loadType = main.querySelector<HTMLSelectElement>('#tf-load')!.value as TfLoad;
      ctx.track(`tf-load:${def.loadType}`);
      draw();
    });
    on('#tf-target', 'input', () => {
      const el = main.querySelector<HTMLInputElement>('#tf-target')!;
      el.value = def.target = el.value.toUpperCase();
      keep();
    });
    on('#tf-target', 'change', () => {
      ctx.track(`tf-target:${def.target}`);
      draw();
    });
    on('#ed-save', 'click', () => {
      keep();
      if (save()) ctx.renderView();
    });
    on('#ed-deploy', 'click', async () => {
      keep();
      const err = await transformError(def, space, t);
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
    on('#tf-run', 'click', async () => {
      if (!o) return;
      keep();
      await startTransformRun(o);
      draw();
    });
  }

  async function runPreview() {
    keep();
    const out = main.querySelector<HTMLElement>('#tf-preview-out');
    if (!out) return;
    ctx.track('tf-preview');
    try {
      const sql = def.sql.trim().replace(/;\s*$/, '');
      const res = await runSql(`SELECT * FROM (\n${sql}\n) x LIMIT 100`);
      preview = `<div class="result-status ok">${res.rows.length === 100 ? 'First 100 rows' : `${res.rows.length} rows`}</div>${resultTable(res.columns, res.rows)}`;
    } catch (e) {
      preview = `<div class="result-status error">${esc(e instanceof Error ? e.message.split('\n')[0] : String(e))}</div>`;
    }
    out.innerHTML = preview;
  }

  function save(quiet = false): RepoObject | null {
    const bn = business.trim();
    if (!bn) {
      toast('Enter a business name before you save.', 'error');
      node = 'general';
      draw();
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
        space, name, kind: 'Transformation Flow', businessName: bn, semanticUsage: 'Relational Dataset',
        transform: structuredClone(def), status: 'not_deployed', changedAt: new Date().toISOString(),
      };
      t.objects.push(created);
      fresh = null;
      ctx.track(`save:${objectKey(created)}`);
      ctx.save();
      nav.opened(objectKey(created));
      if (!quiet) toast('Saved. The transformation flow is not deployed yet.');
      return created;
    }
    o.businessName = bn;
    o.transform = structuredClone(def);
    touch(o);
    ctx.track(`save:${objectKey(o)}`);
    ctx.save();
    if (!quiet) toast(o.status === 'changes' ? 'Saved. Deploy to make the change active.' : 'Saved');
    return o;
  }

  draw();
}
