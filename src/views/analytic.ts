import { ctx } from '../ctx';
import { runSql } from '../db';
import {
  STATUS_LABEL, STATUS_HELP, objectKey, findObject, objectNameError, suggestTechnicalName, touch, deploy, type RepoObject,
} from '../repo';
import {
  AGGREGATIONS, attributeCatalog, dimLabel, factCandidates, measureError, modelError, modelSources, modelSql, newModel, valuesSql,
  type AnalyticModelDef, type Measure, type MeasureType, type ModelSources, type Selection, type Variable, type VariableValue, type Aggregation,
} from '../analytic';
import { lockError } from '../integration';
import { esc, spaceChip, icon, ICONS, openDialog, toast, resultTable } from '../ui';

/**
 * Analytic Model editor (chapter 7, Handbuch 6.10.2): canvas with the fact source in the middle and its associated
 * dimensions around it; the properties panel shows the whole model (background), the fact or one dimension;
 * the Data Preview below shows the model as a pivot table with rows, measures and variable values.
 * Everything is a draft until Save; Deploy makes it what SAP Analytics Cloud would consume.
 */

export interface ModelNav {
  back: () => void;
  opened: (key: string) => void;
}

/** What the properties panel shows: the whole model, the fact, or one dimension (SPACE.NAME). */
type Selected = 'model' | 'fact' | string;

/** Draft of a new, unsaved model; survives switching views like a half-written SQL view. */
let fresh: { space: string; def: AnalyticModelDef | null; business: string; technical: string; touched: boolean } | null = null;
/** Preview settings per model (key or 'draft'). */
const previews = new Map<string, { rows: string[]; measures: string[] | null; vars: Record<string, VariableValue> }>();
let selected: Selected = 'model';
let lastKey = '';

/** The New Analytic Model tile: start over with the fact picker. */
export function newModelDraft() {
  fresh = null;
  previews.delete('draft');
}

export function renderModelEditor(main: HTMLElement, o: RepoObject | null, nav: ModelNav) {
  const t = ctx.tenant();
  const space = o?.space ?? t.activeSpace;
  if (!o && (!fresh || fresh.space !== space)) fresh = { space, def: null, business: '', technical: '', touched: false };
  const key = o ? objectKey(o) : 'draft';
  if (key !== lastKey) {
    selected = 'model';
    lastKey = key;
  }
  let def: AnalyticModelDef | null = o ? (o.model ? structuredClone(o.model) : null) : fresh!.def;
  let business = o?.businessName ?? fresh!.business;
  let technical = o?.name ?? fresh!.technical;
  let techTouched = o ? true : fresh!.touched;
  const pv = previews.get(key) ?? { rows: [], measures: null, vars: {} };
  previews.set(key, pv);

  const keepFresh = () => {
    if (!o && fresh) Object.assign(fresh, { def, business, technical, touched: techTouched });
  };

  // ------------------------------------------------------------ 0. no fact yet: pick one
  if (!def) {
    const facts = factCandidates(t, space);
    main.innerHTML = `
      <div class="editor-page is-model">
        ${toolbar()}
        <div class="am-start">
          <div class="panel am-picker" id="am-fact-picker">
            <h2>Select a fact source</h2>
            <p class="muted">An analytic model is built on exactly one fact: a deployed entity with semantic usage <b>Fact</b> in ${esc(space)}.
              Its measures and attributes come with it, its dimensions come from its associations.</p>
            ${facts.length ? `<div class="am-fact-list">${facts.map((f) => `<button type="button" class="am-fact-card" data-fact="${esc(objectKey(f))}">
                ${icon(ICONS.view, 'type-ic')}<b>${esc(f.businessName)}</b><span class="mono">${esc(f.name)}</span>
                <small>${Object.values(f.deployed?.columnRoles ?? {}).filter((r) => r === 'Measure').length} measures · ${(f.deployed?.associations ?? []).length} associations</small>
              </button>`).join('')}</div>`
              : `<p class="form-error">There is no deployed fact in ${esc(space)}. Set a view's semantic usage to Fact, mark its measures and deploy it.</p>`}
          </div>
        </div>
      </div>`;
    main.querySelector('#ed-back')!.addEventListener('click', nav.back);
    main.querySelectorAll<HTMLButtonElement>('[data-fact]').forEach((b) =>
      b.addEventListener('click', () => {
        const src = modelSources(t, b.dataset.fact!);
        if (typeof src === 'string') return toast(src, 'error');
        def = newModel(src);
        if (!business) {
          business = `${src.fact.businessName} Model`;
          if (!techTouched) technical = suggestTechnicalName(business);
        }
        ctx.track(`am-fact:${b.dataset.fact}`);
        keepFresh();
        renderModelEditor(main, o, nav);
      }),
    );
    bindToolbar();
    return;
  }

  const model = def;
  const srcOrError = modelSources(t, model.fact);
  const src: ModelSources | null = typeof srcOrError === 'string' ? null : srcOrError;

  // ------------------------------------------------------------ 1. page
  const draw = () => {
    keepFresh();
    main.innerHTML = `
      <div class="editor-page is-model">
        ${toolbar()}
        <div class="ed-body">
          <section class="ed-center am-canvas" id="am-canvas" aria-label="Canvas">${canvas()}</section>
          <aside class="props" id="properties" aria-label="Properties">${properties()}</aside>
        </div>
        <div class="results am-preview" id="results">${previewControls()}<div class="am-out" id="am-out">
          <div class="placeholder"><b>Data Preview</b> shows the model the way SAP Analytics Cloud users see it: pick attributes for the rows,
            measures for the columns, fill in the variables, then press <b>Data Preview</b>.</div></div></div>
      </div>`;
    bind();
  };

  function toolbar() {
    return `<div class="ed-toolbar">
        <button class="btn small link" type="button" id="ed-back">${icon(ICONS.back)} ${esc(space)}</button>
        <div class="ed-title"><b id="ed-title-text">${esc(business || 'New Analytic Model')}</b>
          <small>Analytic Model · ${esc(space)}.${esc(technical || '…')}</small></div>
        ${o ? `<span class="status" data-status="${o.status}">${STATUS_LABEL[o.status]}</span>` : `<span class="status" data-status="new">New</span>`}
        <span class="spacer"></span>
        <button class="btn" type="button" id="ed-save" ${def ? '' : 'disabled'}>Save</button>
        <button class="btn" type="button" id="ed-deploy" ${def ? '' : 'disabled'}>Deploy</button>
        <button class="btn primary" type="button" id="run" ${def ? '' : 'disabled'}>Data Preview</button>
      </div>`;
  }

  function canvas() {
    if (!src) return `<div class="placeholder form-error">${esc(srcOrError as string)}</div>`;
    const fact = src.fact;
    const nMeasures = model.measures.length;
    return `<div class="am-diagram">
        <button type="button" class="am-node fact ${selected === 'fact' ? 'on' : ''}" data-node="fact">
          <small>Fact</small><b>${esc(fact.businessName)}</b><span class="mono">${esc(fact.name)}</span>
          <em>${nMeasures} ${nMeasures === 1 ? 'measure' : 'measures'} · ${model.attributes.filter((a) => !a.includes('.')).length} attributes</em>
        </button>
        <div class="am-dims">
          ${src.dimensions.length ? src.dimensions.map((d) => {
            const inModel = model.dimensions.includes(d.key);
            return `<div class="am-dim-row ${inModel ? 'in' : 'out'}">
              <span class="am-link mono">${esc(d.association.mapping.map((m) => m.from).join(', '))}</span>
              ${inModel
                ? `<button type="button" class="am-node dim ${selected === d.key ? 'on' : ''}" data-node="${esc(d.key)}">
                    <small>Dimension</small><b>${esc(dimLabel(d.name))}</b><span class="mono">${esc(d.name)}</span>
                    <em>${model.attributes.filter((a) => a.startsWith(`${d.name}.`)).length} of ${d.attributes.length} attributes</em></button>`
                : `<div class="am-node dim ghost"><small>Associated dimension</small><b>${esc(dimLabel(d.name))}</b><span class="mono">${esc(d.name)}</span>
                    <button type="button" class="btn small" data-add-dim="${esc(d.key)}">+ Add to model</button></div>`}
            </div>`;
          }).join('') : '<p class="muted am-nodims">The fact has no associations, so the model has no dimensions. Add associations to the fact (chapter 6).</p>'}
        </div>
      </div>
      <p class="am-canvas-hint muted">Click a node to see its measures and attributes. Click the background for the whole model: measures, variables.</p>`;
  }

  // ------------------------------------------------------------ 2. properties
  function properties() {
    if (!src) return generalHtml();
    if (selected === 'fact') return factProps(src);
    const dim = src.dimensions.find((d) => d.key === selected && model.dimensions.includes(d.key));
    if (dim) {
      return `<h3>Dimension ${esc(dimLabel(dim.name))}</h3>
        <dl class="props-list"><dt>Entity</dt><dd>${spaceChip(dim.key.split('.')[0])} <span class="mono">${esc(dim.name)}</span></dd>
          <dt>Association</dt><dd class="mono">${dim.association.mapping.map((m) => `${esc(m.from)} → ${esc(m.to)}`).join(', ')}</dd></dl>
        <section class="sem"><h3>Attributes</h3>
          ${dim.attributes.length ? dim.attributes.map((c) => checkRow(`${dim.name}.${c}`, c)).join('') : '<p class="muted">This dimension has no attributes besides its key.</p>'}
          <p class="muted">Only ticked attributes are visible to consumers. The key comes from the fact (${esc(dim.association.mapping.map((m) => m.from).join(', '))}).</p>
        </section>
        <button type="button" class="btn small link" id="am-remove-dim" data-dim="${esc(dim.key)}">Remove from model</button>`;
    }
    selected = 'model';
    return `${generalHtml()}
      <section class="sem" id="am-measures"><h3>Measures</h3>
        ${model.measures.length ? `<ul class="am-list">${model.measures.map((m, i) => `<li>
            <div><b class="mono">${esc(m.name)}</b><small>${esc(m.type)}</small></div>
            <small class="mono">${esc(describe(m))}</small>
            <span>${m.type === 'Fact Source Measure' ? '' : `<button type="button" class="btn small link" data-edit-m="${i}">Edit</button>`}
              <button type="button" class="btn small link" data-del-m="${i}" aria-label="Remove ${esc(m.name)}">✕</button></span>
          </li>`).join('')}</ul>` : '<p class="muted">No measures. Tick the measures of the fact, or add one.</p>'}
        <div class="am-add" id="am-add-measure">
          <button type="button" class="btn small" data-new-m="Calculated Measure">+ Calculated</button>
          <button type="button" class="btn small" data-new-m="Restricted Measure">+ Restricted</button>
          <button type="button" class="btn small" data-new-m="Count Distinct">+ Count Distinct</button>
          <button type="button" class="btn small off" data-info="fixed">Fixed Value</button>
          <button type="button" class="btn small off" data-info="conversion">Conversion</button>
        </div>
      </section>
      <section class="sem" id="am-variables"><h3>Variables</h3>
        ${model.variables.length ? `<ul class="am-list">${model.variables.map((v, i) => `<li>
            <div><b class="mono">${esc(v.name)}</b><small>${esc(v.type)}</small></div>
            <small>${esc(attrLabel(v.attribute))} · ${esc(v.selection)} · ${v.mandatory ? 'mandatory' : 'optional'}</small>
            <span><button type="button" class="btn small link" data-edit-v="${i}">Edit</button>
              <button type="button" class="btn small link" data-del-v="${i}" aria-label="Remove ${esc(v.name)}">✕</button></span>
          </li>`).join('')}</ul>` : '<p class="muted">No variables. A variable asks the consumer for a value when the report opens.</p>'}
        <button type="button" class="btn small" id="am-add-var">+ Add Variable</button>
      </section>
      <section class="lineage"><h3>Impact and Lineage</h3><h4>Reads from</h4>
        <ul class="lineage-list">${[model.fact, ...model.dimensions].map((k) => `<li>${spaceChip(k.split('.')[0])}<span class="mono">${esc(k.split('.')[1])}</span></li>`).join('')}</ul>
        <p class="muted">Global filter and data access controls are set here too in a real tenant (data access: chapter 8).</p>
      </section>`;
  }

  function generalHtml() {
    return `<h3>General</h3>
      <label>Business Name <small>for people</small><input id="prop-business" value="${esc(business)}" maxlength="120" autocomplete="off"></label>
      <label>Technical Name <small>${o ? 'fixed once saved' : 'A–Z, 0–9, _; fixed once saved'}</small>
        <input id="prop-technical" class="mono" value="${esc(technical)}" ${o ? 'readonly' : ''} maxlength="50" spellcheck="false" autocomplete="off"></label>
      <dl class="props-list">
        <dt>Type</dt><dd>Analytic Model</dd>
        <dt>Space</dt><dd>${spaceChip(space)}</dd>
        <dt>Fact Source</dt><dd class="mono">${esc(model.fact.split('.')[1])}</dd>
        <dt>Status</dt><dd>${o ? `<span class="status" data-status="${o.status}">${STATUS_LABEL[o.status]}</span><p class="muted">${STATUS_HELP[o.status]}</p>` : 'New, not saved'}</dd>
      </dl>`;
  }

  function factProps(s: ModelSources) {
    return `<h3>Fact ${esc(s.fact.name)}</h3>
      <section class="sem" id="am-fact-measures"><h3>Measures</h3>
        ${s.measures.length ? `<table class="grid compact"><thead><tr><th></th><th>Column</th><th>Aggregation</th></tr></thead><tbody>
          ${s.measures.map((c) => {
            const m = model.measures.find((x) => x.type === 'Fact Source Measure' && x.column === c) as Extract<Measure, { type: 'Fact Source Measure' }> | undefined;
            return `<tr><td><input type="checkbox" data-fact-measure="${esc(c)}" ${m ? 'checked' : ''} aria-label="Use ${esc(c)}"></td><td class="mono">${esc(c)}</td>
              <td><select data-agg="${esc(c)}" ${m ? '' : 'disabled'} aria-label="Aggregation of ${esc(c)}">${AGGREGATIONS.map((a) => `<option ${m?.aggregation === a ? 'selected' : ''}>${a}</option>`).join('')}</select></td></tr>`;
          }).join('')}</tbody></table>` : '<p class="muted">The fact has no measures. Mark them in the fact view (role Measure) and deploy it.</p>'}
      </section>
      <section class="sem"><h3>Attributes</h3>
        ${s.attributes.map((c) => checkRow(c, c)).join('')}
        <p class="muted">Ticked attributes are visible to consumers: they can group and filter by them.</p>
      </section>`;
  }

  const checkRow = (id: string, label: string) =>
    `<label class="am-check"><input type="checkbox" data-attr="${esc(id)}" ${model.attributes.includes(id) ? 'checked' : ''}> <span class="mono">${esc(label)}</span></label>`;

  function attrLabel(id: string) {
    if (!src) return id;
    return attributeCatalog(model, src).find((a) => a.id === id)?.label ?? id;
  }

  function describe(m: Measure) {
    switch (m.type) {
      case 'Fact Source Measure':
        return `${m.aggregation}(${m.column})`;
      case 'Calculated Measure':
        return `= ${m.formula}`;
      case 'Restricted Measure':
        return `${m.base} where ${attrLabel(m.attribute)} in (${m.values.join(', ')})`;
      case 'Count Distinct':
        return `distinct ${attrLabel(m.attribute)}`;
    }
  }

  // ------------------------------------------------------------ 3. preview controls
  function previewControls() {
    if (!src) return '';
    const catalog = attributeCatalog(model, src).filter((a) => model.attributes.includes(a.id));
    pv.rows = pv.rows.filter((r) => catalog.some((a) => a.id === r));
    const measures = pv.measures?.filter((m) => model.measures.some((x) => x.name === m)) ?? model.measures.map((m) => m.name);
    pv.measures = measures;
    return `<aside class="am-pivot" id="am-pivot" aria-label="Preview settings">
        <h4>Rows</h4>
        <div class="am-chips">${catalog.map((a) => `<label><input type="checkbox" data-prow="${esc(a.id)}" ${pv.rows.includes(a.id) ? 'checked' : ''}> ${esc(a.label)}</label>`).join('') || '<span class="muted">No visible attributes.</span>'}</div>
        <h4>Measures</h4>
        <div class="am-chips">${model.measures.map((m) => `<label><input type="checkbox" data-pmeas="${esc(m.name)}" ${measures.includes(m.name) ? 'checked' : ''}> ${esc(m.name)}</label>`).join('')}</div>
        ${model.variables.length ? `<h4>Variables</h4>${model.variables.map((v) => varInput(v)).join('')}` : ''}
      </aside>`;
  }

  function varInput(v: Variable) {
    const val = pv.vars[v.name] ?? {};
    const date = /DATE$/i.test(v.attribute);
    const type = date ? 'date' : 'text';
    const label = `${esc(v.name)}${v.mandatory ? ' <b title="mandatory">*</b>' : ''} <small>${esc(attrLabel(v.attribute))}</small>`;
    return v.selection === 'Interval'
      ? `<div class="am-var"><span>${label}</span><div><input type="${type}" data-var-from="${esc(v.name)}" value="${esc(val.from ?? '')}" aria-label="${esc(v.name)} from">
          <span>to</span><input type="${type}" data-var-to="${esc(v.name)}" value="${esc(val.to ?? '')}" aria-label="${esc(v.name)} to"></div></div>`
      : `<div class="am-var"><span>${label}</span><div><input type="${type}" data-var="${esc(v.name)}" value="${esc(val.value ?? '')}" aria-label="${esc(v.name)}"></div></div>`;
  }

  async function runPreview() {
    const out = main.querySelector<HTMLElement>('#am-out')!;
    if (!src) return;
    readPreview();
    for (const v of model.variables) {
      const val = pv.vars[v.name] ?? {};
      const empty = v.selection === 'Interval' ? !val.from && !val.to : !val.value;
      if (v.mandatory && empty) {
        out.innerHTML = `<div class="result-status error">The variable ${esc(v.name)} is mandatory. Enter a value in the preview settings.</div>`;
        return;
      }
    }
    ctx.track(`am-preview:${key}`);
    if (pv.rows.length) ctx.track(`am-rows:${key}:${pv.rows.join(',')}`);
    try {
      const err = modelError(model, src, space);
      if (err) throw new Error(err);
      const sql = modelSql(model, src, { rows: pv.rows, measures: pv.measures ?? [], variables: pv.vars });
      const res = await runSql(sql);
      const rows = res.rows.length;
      out.innerHTML = `<div class="result-status ok">${rows} ${rows === 1 ? 'row' : 'rows'} in ${res.ms.toFixed(0)} ms</div>${resultTable(res.columns, res.rows.map((r) => r.map(round)))}`;
    } catch (err) {
      out.innerHTML = `<div class="result-status error">${esc(err instanceof Error ? err.message : String(err))}</div>`;
    }
  }

  function readPreview() {
    pv.rows = [...main.querySelectorAll<HTMLInputElement>('[data-prow]:checked')].map((i) => i.dataset.prow!);
    pv.measures = [...main.querySelectorAll<HTMLInputElement>('[data-pmeas]:checked')].map((i) => i.dataset.pmeas!);
    for (const v of model.variables) {
      const pick = (sel: string) => main.querySelector<HTMLInputElement>(sel)?.value.trim() || undefined;
      pv.vars[v.name] = v.selection === 'Interval'
        ? { from: pick(`[data-var-from="${v.name}"]`), to: pick(`[data-var-to="${v.name}"]`) }
        : { value: pick(`[data-var="${v.name}"]`) };
    }
  }

  // ------------------------------------------------------------ 4. events
  function titleText() {
    main.querySelector('#ed-title-text')!.textContent = business || 'New Analytic Model';
    main.querySelector('.ed-title small')!.textContent = `Analytic Model · ${space}.${technical || '…'}`;
    keepFresh();
  }

  function bindToolbar() {
    main.querySelector('#ed-back')?.addEventListener('click', () => {
      keepFresh();
      nav.back();
    });
  }

  function bind() {
    const bn = main.querySelector<HTMLInputElement>('#prop-business');
    const tn = main.querySelector<HTMLInputElement>('#prop-technical');
    bn?.addEventListener('input', () => {
      business = bn.value;
      if (!techTouched && tn) tn.value = technical = suggestTechnicalName(bn.value);
      titleText();
    });
    tn?.addEventListener('input', () => {
      techTouched = true;
      tn.value = technical = tn.value.toUpperCase();
      titleText();
    });
    bindToolbar();
    const canvasEl = main.querySelector<HTMLElement>('#am-canvas')!;
    canvasEl.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const add = target.closest<HTMLElement>('[data-add-dim]');
      if (add) {
        const d = src?.dimensions.find((x) => x.key === add.dataset.addDim);
        if (!d) return;
        model.dimensions.push(d.key);
        for (const c of d.attributes) if (!model.attributes.includes(`${d.name}.${c}`)) model.attributes.push(`${d.name}.${c}`);
        selected = d.key;
        ctx.track(`am-dim:${key}:${d.key}`);
        return draw();
      }
      const node = target.closest<HTMLElement>('[data-node]');
      selected = node ? node.dataset.node! : 'model';
      if (node) ctx.track(`am-node:${selected}`);
      draw();
    });
    main.querySelector('#am-remove-dim')?.addEventListener('click', (e) => {
      const k = (e.currentTarget as HTMLElement).dataset.dim!;
      const name = k.split('.')[1];
      model.dimensions = model.dimensions.filter((d) => d !== k);
      model.attributes = model.attributes.filter((a) => !a.startsWith(`${name}.`));
      selected = 'model';
      ctx.track(`am-dim-remove:${key}:${k}`);
      draw();
    });
    main.querySelectorAll<HTMLInputElement>('[data-attr]').forEach((i) =>
      i.addEventListener('change', () => {
        const id = i.dataset.attr!;
        model.attributes = i.checked ? [...new Set([...model.attributes, id])] : model.attributes.filter((a) => a !== id);
        draw();
      }),
    );
    main.querySelectorAll<HTMLInputElement>('[data-fact-measure]').forEach((i) =>
      i.addEventListener('change', () => {
        const c = i.dataset.factMeasure!;
        if (i.checked) {
          const name = model.measures.some((m) => m.name === c.toUpperCase()) ? `${c.toUpperCase()}_1` : c.toUpperCase();
          model.measures.push({ type: 'Fact Source Measure', name, column: c, aggregation: 'SUM' });
        } else model.measures = model.measures.filter((m) => !(m.type === 'Fact Source Measure' && m.column === c));
        draw();
      }),
    );
    main.querySelectorAll<HTMLSelectElement>('[data-agg]').forEach((s) =>
      s.addEventListener('change', () => {
        const m = model.measures.find((x) => x.type === 'Fact Source Measure' && x.column === s.dataset.agg);
        if (m && m.type === 'Fact Source Measure') m.aggregation = s.value as Aggregation;
        keepFresh();
      }),
    );
    main.querySelectorAll<HTMLButtonElement>('[data-new-m]').forEach((b) => b.addEventListener('click', () => measureDialog(b.dataset.newM as MeasureType)));
    main.querySelectorAll<HTMLButtonElement>('[data-edit-m]').forEach((b) => b.addEventListener('click', () => {
      const m = model.measures[Number(b.dataset.editM)];
      measureDialog(m.type, m);
    }));
    main.querySelectorAll<HTMLButtonElement>('[data-del-m]').forEach((b) => b.addEventListener('click', () => {
      model.measures.splice(Number(b.dataset.delM), 1);
      draw();
    }));
    main.querySelectorAll<HTMLButtonElement>('[data-info]').forEach((b) => b.addEventListener('click', () => infoDialog(b.dataset.info!)));
    main.querySelector('#am-add-var')?.addEventListener('click', () => variableDialog());
    main.querySelectorAll<HTMLButtonElement>('[data-edit-v]').forEach((b) => b.addEventListener('click', () => variableDialog(model.variables[Number(b.dataset.editV)])));
    main.querySelectorAll<HTMLButtonElement>('[data-del-v]').forEach((b) => b.addEventListener('click', () => {
      model.variables.splice(Number(b.dataset.delV), 1);
      draw();
    }));
    main.querySelector('#am-pivot')?.addEventListener('change', readPreview);
    main.querySelector('#run')!.addEventListener('click', runPreview);
    main.querySelector('#ed-save')!.addEventListener('click', () => {
      if (save()) ctx.renderView();
    });
    main.querySelector('#ed-deploy')!.addEventListener('click', async () => {
      const saved = save(true);
      if (!saved) return;
      const locked = lockError(t, saved.space);
      if (locked) return toast(`Deployment failed. ${locked}`, 'error');
      const s = modelSources(t, saved.model!.fact);
      const err = modelError(saved.model!, s, saved.space);
      if (err) {
        ctx.renderView();
        return toast(`Deployment failed. ${err}`, 'error');
      }
      try {
        await runSql(`SELECT * FROM (${modelSql(saved.model!, s as ModelSources, { rows: [], measures: saved.model!.measures.map((m) => m.name) })}) q LIMIT 0`);
      } catch (e) {
        ctx.renderView();
        return toast(`Deployment failed: ${e instanceof Error ? e.message : String(e)}`, 'error');
      }
      await deploy(saved);
      ctx.track(`deploy:${objectKey(saved)}`);
      ctx.save();
      toast(`${saved.name} deployed`);
      ctx.renderView();
    });
  }

  function save(quiet = false): RepoObject | null {
    const bn = business.trim();
    if (!bn) {
      toast('Enter a business name before you save.', 'error');
      selected = 'model';
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
        space, name, kind: 'Analytic Model', businessName: bn, semanticUsage: 'Relational Dataset',
        model: structuredClone(model), status: 'not_deployed', changedAt: new Date().toISOString(),
      };
      t.objects.push(created);
      fresh = null;
      previews.set(objectKey(created), pv);
      lastKey = objectKey(created);
      ctx.track(`save:${objectKey(created)}`);
      ctx.save();
      nav.opened(objectKey(created));
      if (!quiet) toast('Saved. The model is not deployed yet.');
      return created;
    }
    o.businessName = bn;
    o.model = structuredClone(model);
    touch(o);
    ctx.track(`save:${objectKey(o)}`);
    ctx.save();
    if (!quiet) toast(o.status === 'changes' ? 'Saved. Deploy to make the changes active.' : 'Saved');
    return o;
  }

  // ------------------------------------------------------------ 5. dialogs
  function measureDialog(type: MeasureType, existing?: Measure) {
    if (!src) return;
    const catalog = attributeCatalog(model, src);
    const others = model.measures.filter((m) => m !== existing);
    const name = existing?.name ?? '';
    const attrOptions = (sel?: string) => `<option value="">Select an attribute…</option>${catalog.map((a) =>
      `<option value="${esc(a.id)}" ${a.id === sel ? 'selected' : ''}>${esc(a.label)}</option>`).join('')}`;
    const help: Record<string, string> = {
      'Calculated Measure': 'A formula over other measures, calculated after aggregation: e.g. NET_AMOUNT + TAX_AMOUNT. Defined once in the model, every report gets the same result.',
      'Restricted Measure': 'Another measure, restricted to some values of an attribute: e.g. amounts of OPEN invoices only. Works in any drill-down, unlike a filter on the whole report.',
      'Count Distinct': 'Counts the different values of an attribute, e.g. how many customers. Summing such counts over rows would count a customer twice.',
    };
    const e = existing as Record<string, unknown> | undefined;
    const { form, close } = openDialog(`${existing ? 'Edit' : 'Add'} ${type}`, `
      <p class="guide-lead">${esc(help[type])}</p>
      <div class="form-grid one">
        <label>Technical Name <small>A–Z, 0–9, _</small><input name="name" id="am-m-name" class="mono" value="${esc(name)}" maxlength="50" spellcheck="false" autocomplete="off"></label>
        ${type === 'Calculated Measure' ? `<label>Formula <small>measure names, numbers, + − * / ( )</small>
            <input name="formula" id="am-formula" class="mono" value="${esc(String(e?.formula ?? ''))}" spellcheck="false" autocomplete="off"></label>
          <div class="am-chips" id="am-insert">${others.map((m) => `<button type="button" class="btn small" data-ins="${esc(m.name)}">${esc(m.name)}</button>`).join('')}</div>` : ''}
        ${type === 'Restricted Measure' ? `<label>Measure <small>the measure to restrict</small>
            <select name="base" id="am-base"><option value="">Select a measure…</option>${others.map((m) => `<option ${m.name === e?.base ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></label>
          <label>Restrict by <small>attribute of the fact or of a dimension in the model</small><select name="attribute" id="am-r-attr">${attrOptions(String(e?.attribute ?? ''))}</select></label>
          <fieldset class="question am-values" id="am-values"><legend>Values</legend><span class="muted">Choose an attribute.</span></fieldset>` : ''}
        ${type === 'Count Distinct' ? `<label>Attribute <small>whose different values are counted</small><select name="attribute" id="am-cd-attr">${attrOptions(String(e?.attribute ?? ''))}</select></label>` : ''}
      </div>
      <p class="form-error" role="alert"></p>
      <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button><button class="btn primary" type="submit">${existing ? 'Apply' : 'Add'}</button></div>`);
    const nameIn = form.querySelector<HTMLInputElement>('#am-m-name')!;
    nameIn.addEventListener('input', () => (nameIn.value = nameIn.value.toUpperCase()));
    form.querySelectorAll<HTMLButtonElement>('[data-ins]').forEach((b) => b.addEventListener('click', () => {
      const f = form.querySelector<HTMLInputElement>('#am-formula')!;
      f.value = `${f.value.trimEnd()}${f.value.trim() ? ' ' : ''}${b.dataset.ins}`;
      f.focus();
    }));
    const attrSel = form.querySelector<HTMLSelectElement>('#am-r-attr');
    const valuesBox = form.querySelector<HTMLElement>('#am-values');
    const loadValues = async (keep: string[]) => {
      if (!attrSel || !valuesBox) return;
      if (!attrSel.value) {
        valuesBox.innerHTML = '<legend>Values</legend><span class="muted">Choose an attribute.</span>';
        return;
      }
      try {
        const res = await runSql(valuesSql(model, src!, attrSel.value));
        const vals = res.rows.map((r) => String(r[0]));
        valuesBox.innerHTML = `<legend>Values</legend>${vals.map((v) => `<label><input type="checkbox" name="val" value="${esc(v)}" ${keep.includes(v) ? 'checked' : ''}> ${esc(v)}</label>`).join('')}`;
      } catch (err) {
        valuesBox.innerHTML = `<legend>Values</legend><span class="form-error">${esc(err instanceof Error ? err.message : String(err))}</span>`;
      }
    };
    attrSel?.addEventListener('change', () => loadValues([]));
    if (attrSel?.value) loadValues((e?.values as string[]) ?? []);
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const n = nameIn.value.trim().toUpperCase();
      let m: Measure;
      if (type === 'Calculated Measure') m = { type, name: n, formula: form.querySelector<HTMLInputElement>('#am-formula')!.value.trim().toUpperCase() };
      else if (type === 'Restricted Measure') {
        m = {
          type, name: n, base: form.querySelector<HTMLSelectElement>('#am-base')!.value, attribute: attrSel!.value,
          values: [...form.querySelectorAll<HTMLInputElement>('[name="val"]:checked')].map((i) => i.value),
        };
      } else m = { type: 'Count Distinct', name: n, attribute: form.querySelector<HTMLSelectElement>('#am-cd-attr')!.value };
      const trial: AnalyticModelDef = { ...model, measures: [...others, m] };
      const taken = others.some((x) => x.name === n) ? `There is already a measure ${n}.` : null;
      const problem = taken ?? measureError(m, trial, src!);
      if (problem) {
        form.querySelector('.form-error')!.textContent = problem;
        return;
      }
      if (existing) model.measures[model.measures.indexOf(existing)] = m;
      else model.measures.push(m);
      if (pv.measures && !existing) pv.measures.push(m.name);
      ctx.track(`am-measure:${type}:${n}`);
      close();
      draw();
    });
  }

  function variableDialog(existing?: Variable) {
    if (!src) return;
    const catalog = attributeCatalog(model, src).filter((a) => model.attributes.includes(a.id));
    const { form, close } = openDialog(existing ? `Edit Variable ${existing.name}` : 'Add Variable', `
      <p class="guide-lead">A variable asks the consumer for a value when the report opens. A <b>filter variable</b> filters the whole model by an attribute.</p>
      <div class="form-grid one">
        <label>Type <select name="type" id="am-v-type"><option>Filter Variable</option>
          <option disabled>Standard Variable (not in this game)</option><option disabled>Restricted Measure Variable (not in this game)</option>
          <option disabled>Reference Date Variable (not in this game)</option></select></label>
        <label>Technical Name <small>A–Z, 0–9, _</small><input name="name" id="am-v-name" class="mono" value="${esc(existing?.name ?? '')}" maxlength="50" spellcheck="false" autocomplete="off"></label>
        <label>Attribute <small>what the variable filters</small><select name="attribute" id="am-v-attr"><option value="">Select an attribute…</option>
          ${catalog.map((a) => `<option value="${esc(a.id)}" ${a.id === existing?.attribute ? 'selected' : ''}>${esc(a.label)}</option>`).join('')}</select></label>
        <label>Selection Type <select name="selection" id="am-v-sel">
          ${(['Single Value', 'Interval'] as Selection[]).map((s) => `<option ${s === existing?.selection ? 'selected' : ''}>${s}</option>`).join('')}</select>
          <small>Single Value: exactly one value. Interval: from–to, e.g. a date range.</small></label>
        <label class="am-check"><input type="checkbox" name="mandatory" id="am-v-mand" ${existing?.mandatory ? 'checked' : ''}> Mandatory <small>the report does not open without a value</small></label>
      </div>
      <p class="form-error" role="alert"></p>
      <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button><button class="btn primary" type="submit">${existing ? 'Apply' : 'Add'}</button></div>`);
    const nameIn = form.querySelector<HTMLInputElement>('#am-v-name')!;
    const attrSel = form.querySelector<HTMLSelectElement>('#am-v-attr')!;
    nameIn.addEventListener('input', () => (nameIn.value = nameIn.value.toUpperCase()));
    attrSel.addEventListener('change', () => {
      if (!nameIn.value) nameIn.value = `V_${(catalog.find((a) => a.id === attrSel.value)?.column ?? '').toUpperCase()}`;
    });
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const v: Variable = {
        name: nameIn.value.trim().toUpperCase(), type: 'Filter Variable', attribute: attrSel.value,
        selection: form.querySelector<HTMLSelectElement>('#am-v-sel')!.value as Selection, mandatory: form.querySelector<HTMLInputElement>('#am-v-mand')!.checked,
      };
      const err = form.querySelector('.form-error')!;
      if (!/^[A-Z_][A-Z0-9_]{0,49}$/.test(v.name)) return (err.textContent = 'Technical names use capital letters, digits and underscores.');
      if (!v.attribute) return (err.textContent = 'Choose the attribute the variable filters.');
      if (model.variables.some((x) => x !== existing && x.name === v.name)) return (err.textContent = `There is already a variable ${v.name}.`);
      if (existing) model.variables[model.variables.indexOf(existing)] = v;
      else model.variables.push(v);
      ctx.track(`am-variable:${v.name}`);
      close();
      draw();
    });
  }

  function infoDialog(which: string) {
    const text = which === 'fixed'
      ? 'A Fixed Value measure is a constant, e.g. a target value or a factor for other calculations. Not needed in this game.'
      : 'Currency and unit conversion measures convert amounts or quantities with conversion tables (e.g. EUR → USD, kWh → MWh). They need extra setup in the space; not simulated in this game.';
    const d = openDialog(which === 'fixed' ? 'Fixed Value' : 'Currency / Unit Conversion', `<p class="guide-lead">${esc(text)}</p>
      <div class="guide-actions"><button class="btn primary" type="submit">Got it</button></div>`);
    d.form.addEventListener('submit', (e) => {
      e.preventDefault();
      d.close();
    });
  }

  draw();
}

/** Two decimals for amounts in the preview. */
const round = (v: unknown) => (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 100) / 100 : v);

/** For mission checks and tutorials: the model a key points to, in its deployed version. */
export const deployedModel = (key: string) => findObject(ctx.tenant(), key)?.deployed?.model;
