import { ctx } from '../ctx';
import {
  STATUS_LABEL, STATUS_HELP, objectKey, objectNameError, suggestTechnicalName, touch, deploy, findObject, type RepoObject,
} from '../repo';
import { lockError, runsOf } from '../integration';
import { runSql } from '../db';
import { esc, spaceChip, ICONS, toast, fmtDate } from '../ui';
import { objectToolbar, bindDetails, propsHead } from './toolbar';
import { startDataFlowRun } from './monitor';
import {
  AGG_FNS, dataFlowError, dataFlowSelect, emptyDataFlow, type AggFn, type DataFlowDef, type JoinType, type TargetMode,
} from '../dataflow';

/**
 * Data Flow editor (excursion c12-m10, Handbuch 6.7.1). The real editor is a canvas; the game shows the nodes as a fixed row
 * (Source → Join → Projection → Aggregation → Target). Clicking a node opens its properties on the right. Union and the
 * Python script operator are shown as greyed nodes that only explain themselves.
 */

export interface DataFlowNav {
  back: () => void;
  opened: (key: string) => void;
}

type Node = 'general' | 'source' | 'join' | 'projection' | 'aggregation' | 'target';
let node: Node = 'general';
let fresh: { space: string; def: DataFlowDef; business: string; technical: string; touched: boolean } | null = null;
const colCache = new Map<string, string[]>();

export function newDataFlowDraft() {
  fresh = null;
  node = 'source';
}

/** Objects a data flow of this space may read: its own deployed views and tables, and objects shared with it. */
function sourceKeys(space: string): string[] {
  const t = ctx.tenant();
  const own = t.objects.filter((o) => o.space === space && o.deployed && ['SQL View', 'Local Table', 'Remote Table'].includes(o.kind)).map(objectKey);
  const shared = t.shares.filter((s) => s.to === space).map((s) => s.object);
  return [...own, ...shared.filter((k) => !own.includes(k))].sort();
}

async function columnsOf(key: string): Promise<string[]> {
  if (!key) return [];
  if (colCache.has(key)) return colCache.get(key)!;
  try {
    const d = await runSql(`DESCRIBE SELECT * FROM ${key.split('.').map((p) => `"${p}"`).join('.')}`);
    const cols = d.rows.map((r) => String(r[0]));
    colCache.set(key, cols);
    return cols;
  } catch {
    return [];
  }
}

const MODE_TEXT: Record<TargetMode, string> = {
  Append: 'Adds the rows of this run to what is already in the target. Right when each run brings new rows only.',
  Truncate: 'Empties the target first, then writes the rows of this run. Right when each run delivers the complete result.',
  Delete: 'Removes the target rows whose key matches a row of this run. For clean-ups, not for loading.',
};

export function renderDataFlowEditor(main: HTMLElement, o: RepoObject | null, nav: DataFlowNav) {
  const t = ctx.tenant();
  const space = o?.space ?? t.activeSpace;
  const readOnly = !!o && o.space !== t.activeSpace;
  if (!o && (!fresh || fresh.space !== space)) fresh = { space, def: emptyDataFlow(), business: '', technical: '', touched: false };
  const def: DataFlowDef = o ? structuredClone(o.dataflow ?? emptyDataFlow()) : fresh!.def;
  let business = o?.businessName ?? fresh!.business;
  let technical = o?.name ?? fresh!.technical;
  let techTouched = o ? true : fresh!.touched;
  const keep = () => {
    if (!o && fresh) Object.assign(fresh, { def, business, technical, touched: techTouched });
  };

  const draw = async () => {
    keep();
    const [colsA, colsB] = await Promise.all([columnsOf(def.source), columnsOf(def.join?.source ?? '')]);
    const runs = o ? runsOf(t, objectKey(o)) : [];
    const target = def.target.table ? findObject(t, `${space}.${def.target.table}`) : undefined;
    const box = (id: Node, title: string, sub: string, state: 'on' | 'off' | 'info' = 'on') =>
      `<button type="button" class="df-node ${state} ${node === id ? 'sel' : ''}" data-node="${id}"><small>${esc(title)}</small><b>${esc(sub)}</b></button>`;
    const arrow = '<span class="df-arrow" aria-hidden="true">→</span>';
    main.innerHTML = `
      <div class="editor-page is-dataflow">
        ${objectToolbar({
          space,
          title: business || 'New Data Flow',
          sub: `Data Flow · ${space}.${technical || '…'}`,
          statusHtml: o ? `<span class="status" data-status="${o.status}">${STATUS_LABEL[o.status]}</span>` : `<span class="status" data-status="new">New</span>`,
          groups: [
            { label: 'General', buttons: [
              { id: 'ed-save', icon: ICONS.save, label: 'Save', title: 'Save (design time)', disabled: readOnly },
              { id: 'ed-deploy', icon: ICONS.deploy, label: 'Deploy', title: 'Deploy (runtime)', disabled: readOnly },
            ] },
            { label: 'Run', buttons: [{ id: 'df-run', icon: ICONS.flow, label: 'Run', title: o?.deployed ? 'Run the deployed data flow' : 'Deploy first', disabled: readOnly || !o?.deployed }] },
          ],
        })}
        <div class="ed-banner" role="note" id="df-banner"><span class="ed-banner-i" aria-hidden="true">i</span>
          Replication flows and transformation flows are now the recommended way to load and transform data in SAP Datasphere
          (delta loads, more connectivity, scalable runs). Data flows stay supported for existing work.</div>
        <div class="ed-body">
          <section class="ed-center df-center">
            <div class="df-canvas" id="df-canvas" aria-label="Canvas">
              ${box('source', 'Source', def.source ? def.source.split('.')[1] : 'choose')}
              ${arrow}${box('join', 'Join', def.join ? `${def.join.type === 'LEFT' ? 'Left' : 'Inner'} · ${def.join.source.split('.')[1] || '…'}` : 'none', def.join ? 'on' : 'off')}
              ${arrow}<button type="button" class="df-node info" data-info="union"><small>Union</small><b>not used</b></button>
              ${arrow}${box('projection', 'Projection', `${def.columns.length} column${def.columns.length === 1 ? '' : 's'}${def.filter.trim() ? ' · filter' : ''}`)}
              ${arrow}<button type="button" class="df-node info" data-info="calc"><small>Calculated Column</small><b>in Projection</b></button>
              ${arrow}${box('aggregation', 'Aggregation', def.aggregation ? `${def.aggregation.measures.length} measure${def.aggregation.measures.length === 1 ? '' : 's'}` : 'none', def.aggregation ? 'on' : 'off')}
              ${arrow}<button type="button" class="df-node info" data-info="script"><small>Script</small><b>not used</b></button>
              ${arrow}${box('target', 'Target', def.target.table ? `${def.target.table} · ${def.target.mode}` : 'choose')}
            </div>
            <div class="tbl-section"><h3>What the flow runs</h3>
              <pre class="df-sql" id="df-sql">${def.source && def.columns.length ? esc(dataFlowSelect(def)) : 'Choose a source and the projection columns.'}</pre>
              <p class="muted small-note">Then it writes the rows into <b>${esc(def.target.table || 'the target')}</b> with mode <b>${esc(def.target.mode)}</b>. In a real tenant you draw this on a canvas; the operators are the same.</p>
            </div>
            <div class="tbl-section"><h3>Runs</h3>
              ${runs.length ? `<ol class="run-log df-runs" id="df-runs">${runs.slice(0, 5).map((r) => `<li class="${r.status === 'Failed' ? 'err' : ''}"><b>${fmtDate(r.start)} · ${esc(r.status)}</b> ${esc(r.messages.join(' '))}</li>`).join('')}</ol>`
                : '<p class="muted">No runs yet. Deploy, then Run; nightly runs come from a task chain.</p>'}
              ${target?.table ? `<p class="muted">Target ${esc(target.name)} now holds ${target.table.rows.length} rows.</p>` : ''}
            </div>
          </section>
          <aside class="props" id="properties" aria-label="Properties">
            ${propsHead('Model Properties', ICONS.flow, node === 'general' ? `Data Flow ${technical}` : node[0].toUpperCase() + node.slice(1))}
            ${node !== 'general' ? '<button type="button" class="btn small link" id="df-general">‹ Data flow properties</button>' : ''}
            <div id="df-props">${propsHtml(colsA, colsB, target)}</div>
          </aside>
        </div>
      </div>`;
    bind(colsA, colsB);
  };

  function propsHtml(colsA: string[], colsB: string[], target: RepoObject | undefined) {
    const ro = readOnly ? 'disabled' : '';
    if (node === 'general') {
      return `<label>Business Name <small>for people</small><input id="prop-business" value="${esc(business)}" maxlength="120" autocomplete="off" ${readOnly ? 'readonly' : ''}></label>
        <label>Technical Name <small>${o ? 'fixed once saved' : 'A–Z, 0–9, _; fixed once saved'}</small>
          <input id="prop-technical" class="mono" value="${esc(technical)}" ${o ? 'readonly' : ''} maxlength="50" spellcheck="false" autocomplete="off"></label>
        <dl class="props-list"><dt>Type</dt><dd>Data Flow</dd><dt>Space</dt><dd>${spaceChip(space)}</dd>
          <dt>Status</dt><dd>${o ? `<span class="status" data-status="${o.status}">${STATUS_LABEL[o.status]}</span><p class="muted">${STATUS_HELP[o.status]}</p>` : 'New, not saved'}</dd></dl>
        <p class="muted">Click a node of the canvas to set it up.</p>`;
    }
    if (node === 'source') {
      return `<label>Source <small>views and tables of ${esc(space)}, and objects shared with it</small>
          <select id="df-source" ${ro}><option value="">Select</option>${sourceKeys(space).map((k) => `<option ${k === def.source ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></label>
        ${def.source ? (() => {
          const so = findObject(t, def.source);
          return `<h4 class="props-sec">General</h4><dl class="props-list"><dt>Label</dt><dd>${esc(def.source.split('.')[1])}</dd><dt>Connection</dt><dd>Datasphere</dd>
            <dt>Business Name</dt><dd>${esc(so?.businessName ?? '')}</dd><dt>Type</dt><dd>${esc(so?.kind === 'SQL View' ? 'View' : so?.kind ?? '')}</dd>
            <dt>Space Name</dt><dd>${esc(def.source.split('.')[0])}</dd><dt>Status</dt><dd>${so?.deployed ? 'Deployed' : 'Not Deployed'}</dd></dl>`;
        })() : ''}
        ${colsA.length ? `<h4 class="props-sec">Columns (${colsA.length})</h4><p class="muted">Alias <code>a</code>: ${colsA.map((c) => `<code>${esc(c)}</code>`).join(' ')}</p>` : ''}`;
    }
    if (node === 'join') {
      if (!def.join) return `<p>No join. A join adds the columns of a second source, matched on a key.</p>
        <button class="btn small" type="button" id="df-join-add" ${ro || (!def.source ? 'disabled' : '')}>Add Join</button>`;
      return `<label>Second source <select id="df-join-source" ${ro}><option value="">Select</option>${sourceKeys(space).filter((k) => k !== def.source).map((k) => `<option ${k === def.join!.source ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></label>
        <label>Join type <select id="df-join-type" ${ro}>${(['INNER', 'LEFT'] as JoinType[]).map((j) => `<option value="${j}" ${def.join!.type === j ? 'selected' : ''}>${j === 'INNER' ? 'Inner' : 'Left Outer'}</option>`).join('')}</select></label>
        <label>Column of the source (a) <select id="df-join-left" ${ro}><option value="">Select</option>${colsA.map((c) => `<option ${c === def.join!.left ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
        <label>Column of the second source (b) <select id="df-join-right" ${ro}><option value="">Select</option>${colsB.map((c) => `<option ${c === def.join!.right ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
        ${colsB.length ? `<p class="muted">Columns (alias <code>b</code>): ${colsB.map((c) => `<code>${esc(c)}</code>`).join(' ')}</p>` : ''}
        <button class="btn small link" type="button" id="df-join-remove" ${ro}>Remove Join</button>`;
    }
    if (node === 'projection') {
      return `<p class="muted">One row per output column: a name and an expression on <code>a</code>${def.join ? ' and <code>b</code>' : ''}, e.g. <code>a.GRID_AREA</code> or <code>strftime(a.READING_DATE, '%Y-%m')</code>.</p>
        <div class="df-cols" id="df-cols">${def.columns.map((c, i) => `<div class="df-col"><input class="mono" data-col-name="${i}" value="${esc(c.name)}" placeholder="NAME" ${readOnly ? 'readonly' : ''} spellcheck="false">
          <input class="mono" data-col-expr="${i}" value="${esc(c.expr)}" placeholder="a.COLUMN" ${readOnly ? 'readonly' : ''} spellcheck="false">
          <button type="button" class="tb-icon" data-col-del="${i}" aria-label="Remove ${esc(c.name)}" ${ro}>✕</button></div>`).join('') || '<p class="muted">No columns yet.</p>'}</div>
        <div class="df-col-actions"><button class="btn small" type="button" id="df-col-add" ${ro}>Add Column</button>
          ${colsA.length ? `<button class="btn small link" type="button" id="df-col-all" ${ro}>Add all of a</button>` : ''}</div>
        <label>Filter <small>optional SQL condition, e.g. <code>a.SRC_SYS_ID = 'S4U'</code></small><input class="mono" id="df-filter" value="${esc(def.filter)}" ${readOnly ? 'readonly' : ''} spellcheck="false"></label>`;
    }
    if (node === 'aggregation') {
      if (!def.aggregation) return `<p>No aggregation. It groups the rows by the columns without a function and adds up the others.</p>
        <button class="btn small" type="button" id="df-agg-add" ${ro || (!def.columns.length ? 'disabled' : '')}>Add Aggregation</button>`;
      const fnOf = (c: string) => def.aggregation!.measures.find((m) => m.column === c)?.fn ?? '';
      return `<p class="muted">Columns without a function are the groups.</p>
        <table class="grid"><thead><tr><th>Column</th><th>Aggregation</th></tr></thead><tbody>${def.columns.map((c) => `<tr><td class="mono">${esc(c.name)}</td>
          <td><select data-agg="${esc(c.name)}" ${ro}><option value="">Group by</option>${AGG_FNS.map((f) => `<option ${fnOf(c.name) === f ? 'selected' : ''}>${f}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table>
        <button class="btn small link" type="button" id="df-agg-remove" ${ro}>Remove Aggregation</button>`;
    }
    const tables = t.objects.filter((x) => x.space === space && x.kind === 'Local Table' && !x.source).map((x) => x.name);
    return `<label>Target table <small>a local table of ${esc(space)}; a new name creates it on the first run</small>
        <input class="mono" id="df-target" list="df-target-list" value="${esc(def.target.table)}" ${readOnly ? 'readonly' : ''} spellcheck="false" autocomplete="off">
        <datalist id="df-target-list">${tables.map((n) => `<option value="${esc(n)}">`).join('')}</datalist></label>
      ${target ? `<p class="muted">${target.kind === 'Local Table' ? `Existing table, ${target.table?.columns.length ?? 0} columns. Columns are mapped by name.` : `${esc(target.kind)}: not a valid target.`}</p>` : def.target.table ? '<p class="muted">New table: created with the columns of the flow on the first run.</p>' : ''}
      <h4 class="props-sec">General</h4>
      <dl class="props-list"><dt>Label</dt><dd>${esc(def.target.table || '…')}</dd><dt>Type</dt><dd>Local Table</dd><dt>Use As</dt><dd>Target</dd>
        <dt>Status</dt><dd>${target?.deployed ? 'Deployed' : def.target.table ? 'New (created on the first run)' : '—'}</dd></dl>
      <fieldset class="df-modes" id="df-mode"><legend>Mode</legend>${(['Append', 'Truncate', 'Delete'] as TargetMode[]).map((m) => `<label><input type="radio" name="df-mode" value="${m}" ${def.target.mode === m ? 'checked' : ''} ${ro}> <b>${m}</b> <small class="muted">${esc(MODE_TEXT[m])}</small></label>`).join('')}</fieldset>
      <h4 class="props-sec">Mappings</h4>
      ${def.columns.length ? `<table class="grid compact"><thead><tr><th>Incoming</th><th>Target Column</th></tr></thead><tbody>${def.columns.map((c) => {
        const hit = !target?.table || target.table.columns.some((x) => x.name === c.name);
        return `<tr><td class="mono">${esc(c.name)}</td><td class="mono ${hit ? '' : 'bad'}">${hit ? esc(c.name) : 'not in the table'}</td></tr>`;
      }).join('')}</tbody></table>` : '<p class="muted">No incoming columns yet (projection).</p>'}
      ${target?.table ? `<h4 class="props-sec">Columns (${target.table.columns.length})</h4><p class="muted">${target.table.columns.map((c) => `<code>${esc(c.name)}</code>`).join(' ')}</p>` : ''}
      <h4 class="props-sec">Advanced</h4><dl class="props-list"><dt>Control Batch Size</dt><dd>off</dd><dt>Enable ODBC Tracing</dt><dd>off</dd></dl>`;
  }

  function bind(colsA: string[], _colsB: string[]) {
    bindDetails(main);
    main.querySelector('#ed-back')!.addEventListener('click', nav.back);
    main.querySelectorAll<HTMLButtonElement>('[data-node]').forEach((b) => b.addEventListener('click', () => {
      node = b.dataset.node as Node;
      ctx.track(`df-node:${node}`);
      void draw();
    }));
    main.querySelector('#df-general')?.addEventListener('click', () => {
      node = 'general';
      void draw();
    });
    const INFO: Record<string, string> = {
      union: 'Union stacks the rows of two inputs with the same columns. Not needed here; the game explains it only.',
      calc: 'Calculated Column is its own operator in the real tenant: it adds columns computed with SQL expressions. In the game you write such expressions directly in the Projection (e.g. QUANTITY * 1000 for kWh).',
      script: 'Script runs Python (NumPy, Pandas) on the rows. The game explains it only; use the projection for calculations.',
    };
    main.querySelectorAll<HTMLButtonElement>('[data-info]').forEach((b) => b.addEventListener('click', () => toast(INFO[b.dataset.info!] ?? '', 'info')));
    if (readOnly) return;
    const val = (sel: string) => main.querySelector<HTMLInputElement | HTMLSelectElement>(sel)?.value ?? '';
    const on = (sel: string, ev: string, fn: () => void) => main.querySelector(sel)?.addEventListener(ev, fn);
    on('#prop-business', 'input', () => {
      business = val('#prop-business');
      if (!techTouched && !o) main.querySelector<HTMLInputElement>('#prop-technical')!.value = technical = suggestTechnicalName(business);
      keep();
    });
    on('#prop-technical', 'input', () => {
      techTouched = true;
      const el = main.querySelector<HTMLInputElement>('#prop-technical')!;
      el.value = technical = el.value.toUpperCase();
      keep();
    });
    on('#df-source', 'change', () => {
      def.source = val('#df-source');
      ctx.track(`df-source:${def.source}`);
      void draw();
    });
    on('#df-join-add', 'click', () => {
      def.join = { source: '', type: 'INNER', left: '', right: '' };
      void draw();
    });
    on('#df-join-remove', 'click', () => {
      def.join = undefined;
      void draw();
    });
    for (const [sel, key] of [['#df-join-source', 'source'], ['#df-join-type', 'type'], ['#df-join-left', 'left'], ['#df-join-right', 'right']] as const) {
      on(sel, 'change', () => {
        (def.join as Record<string, string>)[key] = val(sel);
        if (key === 'source') ctx.track(`df-join:${def.join!.source}`);
        void draw();
      });
    }
    main.querySelectorAll<HTMLInputElement>('[data-col-name]').forEach((inp) => inp.addEventListener('input', () => {
      const i = Number(inp.dataset.colName);
      const old = def.columns[i].name;
      inp.value = inp.value.toUpperCase();
      def.columns[i].name = inp.value;
      def.aggregation?.measures.forEach((m) => m.column === old && (m.column = inp.value));
      refreshSql();
    }));
    main.querySelectorAll<HTMLInputElement>('[data-col-expr]').forEach((inp) => inp.addEventListener('input', () => {
      def.columns[Number(inp.dataset.colExpr)].expr = inp.value;
      refreshSql();
    }));
    main.querySelectorAll<HTMLButtonElement>('[data-col-del]').forEach((b) => b.addEventListener('click', () => {
      const [gone] = def.columns.splice(Number(b.dataset.colDel), 1);
      if (def.aggregation) def.aggregation.measures = def.aggregation.measures.filter((m) => m.column !== gone.name);
      void draw();
    }));
    on('#df-col-add', 'click', () => {
      def.columns.push({ name: '', expr: '' });
      void draw();
    });
    on('#df-col-all', 'click', () => {
      for (const c of colsA) if (!def.columns.some((x) => x.name === c)) def.columns.push({ name: c, expr: `a.${c}` });
      void draw();
    });
    on('#df-filter', 'input', () => {
      def.filter = val('#df-filter');
      refreshSql();
    });
    on('#df-agg-add', 'click', () => {
      def.aggregation = { measures: [] };
      ctx.track('df-agg:on');
      void draw();
    });
    on('#df-agg-remove', 'click', () => {
      def.aggregation = undefined;
      ctx.track('df-agg:off');
      void draw();
    });
    main.querySelectorAll<HTMLSelectElement>('[data-agg]').forEach((s) => s.addEventListener('change', () => {
      const c = s.dataset.agg!;
      def.aggregation!.measures = def.aggregation!.measures.filter((m) => m.column !== c);
      if (s.value) def.aggregation!.measures.push({ column: c, fn: s.value as AggFn });
      void draw();
    }));
    on('#df-target', 'input', () => {
      const el = main.querySelector<HTMLInputElement>('#df-target')!;
      el.value = def.target.table = el.value.toUpperCase();
      keep();
    });
    on('#df-target', 'change', () => void draw());
    main.querySelectorAll<HTMLInputElement>('[name="df-mode"]').forEach((r) => r.addEventListener('change', () => {
      def.target.mode = r.value as TargetMode;
      ctx.track(`df-mode:${def.target.mode}`);
      void draw();
    }));
    on('#ed-save', 'click', () => {
      if (save()) ctx.renderView();
    });
    on('#ed-deploy', 'click', async () => {
      const err = await dataFlowError(def, space, t);
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
    on('#df-run', 'click', async () => {
      if (!o) return;
      await startDataFlowRun(o);
      void draw();
    });
  }

  function refreshSql() {
    keep();
    const pre = main.querySelector('#df-sql');
    if (pre) pre.textContent = def.source && def.columns.length ? dataFlowSelect(def) : 'Choose a source and the projection columns.';
  }

  function save(quiet = false): RepoObject | null {
    const bn = business.trim();
    if (!bn) {
      toast('Enter a business name before you save.', 'error');
      node = 'general';
      void draw();
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
        space, name, kind: 'Data Flow', businessName: bn, semanticUsage: 'Relational Dataset',
        dataflow: structuredClone(def), status: 'not_deployed', changedAt: new Date().toISOString(),
      };
      t.objects.push(created);
      fresh = null;
      ctx.track(`save:${objectKey(created)}`);
      ctx.save();
      nav.opened(objectKey(created));
      if (!quiet) toast('Saved. The data flow is not deployed yet.');
      return created;
    }
    o.businessName = bn;
    o.dataflow = structuredClone(def);
    touch(o);
    ctx.track(`save:${objectKey(o)}`);
    ctx.save();
    if (!quiet) toast(o.status === 'changes' ? 'Saved. Deploy to make the change active.' : 'Saved');
    return o;
  }

  void draw();
}

