import { ctx } from '../ctx';
import {
  STATUS_LABEL, STATUS_HELP, objectKey, objectNameError, suggestTechnicalName, touch, deploy, type RepoObject,
} from '../repo';
import {
  findConnection, sourceOf, supports, createRemoteView, lockError, connType, type FlowDef, type FlowObject, type LoadType,
} from '../integration';
import { startFlowRun } from './monitor';
import { monitorTo } from './monitor';
import { objectToolbar, bindDetails, propsHead } from './toolbar';
import { esc, spaceChip, ICONS, openDialog, toast, ask } from '../ui';

/**
 * Data Builder, chapter 3: "Import Remote Tables" wizard and the replication flow editor.
 * Target of a replication flow is always SAP Datasphere itself: local tables in the space of the flow.
 */

export interface FlowNav {
  back: () => void;
  opened: (key: string) => void;
}

// ---------------------------------------------------------------- import remote tables

export function openImportRemote(onDone: () => void) {
  const t = ctx.tenant();
  const space = t.activeSpace;
  const conns = t.connections.filter((c) => c.space === space);
  const { form, close } = openDialog('Import Remote Tables', `
    <p class="guide-lead">Step 1: choose a connection of ${spaceChip(space)}. Only validated connections that support remote tables can be used.</p>
    <label>Connection <select name="conn"><option value="">Select a connection</option>
      ${conns.map((c) => `<option value="${esc(c.name)}" ${supports(c, 'Remote Tables') ? '' : 'disabled'}>${esc(c.name)} · ${esc(c.businessName)}${supports(c, 'Remote Tables') ? '' : c.validation?.ok ? ' (no remote tables)' : ' (not validated)'}</option>`).join('')}
    </select></label>
    ${conns.length ? '' : `<p class="muted">${esc(space)} has no connections. Create one in the Connections app first.</p>`}
    <div id="rt-objects"></div>
    <p class="form-error" role="alert"></p>
    <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button>
      <button class="btn primary" type="submit">Import and Deploy</button></div>`, 'wide');
  const sel = form.querySelector<HTMLSelectElement>('[name="conn"]')!;
  const objects = form.querySelector<HTMLElement>('#rt-objects')!;
  sel.addEventListener('change', () => {
    const c = findConnection(t, space, sel.value);
    const src = c && sourceOf(c);
    objects.innerHTML = src ? `<p>Step 2: select source objects and name the remote tables.</p>
      <table class="grid"><thead><tr><th></th><th>Source Object</th><th>Container</th><th>Technical Name in ${esc(space)}</th></tr></thead>
      <tbody>${src.objects.map((o, i) => `<tr><td><input type="checkbox" name="obj" value="${i}" aria-label="Import ${esc(o.name)}"></td>
        <td class="mono">${esc(o.name)}<br><small class="muted">${esc(o.description)}</small></td><td>${esc(o.container)}</td>
        <td><input class="mono" name="tn-${i}" value="RHN_EN_RT_${esc(suggestTechnicalName(o.name))}" maxlength="50" spellcheck="false"></td></tr>`).join('')}</tbody></table>
      <p class="muted">Our convention for remote tables: <code>RHN_EN_RT_&lt;NAME&gt;</code>.</p>` : '';
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = (m: string) => (form.querySelector('.form-error')!.textContent = m);
    const c = findConnection(t, space, sel.value);
    if (!c) return err('Choose a connection.');
    const src = sourceOf(c)!;
    const picked = [...form.querySelectorAll<HTMLInputElement>('[name="obj"]:checked')].map((i) => Number(i.value));
    if (!picked.length) return err('Select at least one source object.');
    const locked = lockError(t, space);
    if (locked) return err(locked);
    const names = picked.map((i) => form.querySelector<HTMLInputElement>(`[name="tn-${i}"]`)!.value.trim().toUpperCase());
    for (const n of names) {
      const ne = objectNameError(n, space, t);
      if (ne) return err(ne);
    }
    if (new Set(names).size !== names.length) return err('Two remote tables would get the same technical name.');
    for (const [j, i] of picked.entries()) {
      const so = src.objects[i];
      const o: RepoObject = {
        space, name: names[j], kind: 'Remote Table', businessName: so.description, semanticUsage: 'Relational Dataset',
        remote: { connection: c.name, source: so.name, access: 'Remote' }, status: 'deployed', changedAt: new Date().toISOString(),
      };
      o.deployed = { businessName: o.businessName };
      t.objects.push(o);
      await createRemoteView(t, o);
      ctx.track(`import-remote:${objectKey(o)}:${so.name}`);
    }
    ctx.save();
    close();
    toast(`${names.length} remote ${names.length === 1 ? 'table' : 'tables'} imported and deployed`);
    onDone();
  });
}

// ---------------------------------------------------------------- replication flow editor

export function renderFlowEditor(main: HTMLElement, o: RepoObject | null, nav: FlowNav) {
  const t = ctx.tenant();
  const space = o?.space ?? t.activeSpace;
  const draft: FlowDef = o?.flow ? structuredClone(o.flow) : { connection: '', objects: [] };
  const conns = t.connections.filter((c) => c.space === space);
  const localTables = t.objects.filter((x) => x.space === space && x.kind === 'Local Table').map((x) => x.name);
  let business = o?.businessName ?? '';
  let technical = o?.name ?? '';
  let techTouched = !!o;

  const draw = () => {
    const lastRun = o ? t.runs.find((r) => r.object === objectKey(o)) : undefined;
    const conn = findConnection(t, space, draft.connection);
    const src = conn ? sourceOf(conn) : undefined;
    main.innerHTML = `
      <div class="editor-page is-flow">
        ${objectToolbar({
          space,
          title: business || 'New Replication Flow',
          sub: `Replication Flow · ${space}.${technical || '…'}`,
          statusHtml: o ? `<span class="status" data-status="${o.status}">${STATUS_LABEL[o.status]}</span>` : `<span class="status" data-status="new">New</span>`,
          groups: [
            { label: 'General', buttons: [
              { id: 'ed-save', icon: ICONS.save, label: 'Save', title: 'Save (design time)' },
              { id: 'ed-deploy', icon: ICONS.deploy, label: 'Deploy', title: 'Deploy (runtime)' },
            ] },
            { label: 'Run', buttons: [{ id: 'flow-run-ed', icon: ICONS.flow, label: 'Run', disabled: !o?.deployed, title: o?.deployed ? 'Run the flow' : 'Deploy first' }] },
          ],
        })}
        <div class="ed-body">
          <section class="ed-center flow-center">
            <div class="flow-ends">
              <div class="flow-end" aria-label="Source">
                <label>Source Connection
                  <select id="flow-conn"><option value="">Select Source Connection</option>
                    ${conns.map((c) => `<option value="${esc(c.name)}" ${c.name === draft.connection ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
                ${conn ? `<small class="muted">${esc(connType(conn.type)?.label ?? '')}${supports(conn, 'Replication Flows') ? '' : conn.validation?.ok ? ' · <b>does not support replication flows</b>' : ' · not validated'}</small>` : ''}
                <button class="btn small" type="button" id="flow-add" ${src ? '' : 'disabled'}>Add Source Objects</button>
              </div>
              <span class="flow-arrow" aria-hidden="true">→</span>
              <div class="flow-end target" aria-label="Target">
                <span class="muted">Target Connection</span><b>SAP Datasphere</b><small class="muted">Local tables in ${esc(space)}</small>
              </div>
            </div>
            ${draft.objects.length ? `<h3>Replication Objects <small class="muted">${draft.objects.length}</small></h3>` : `<div class="flow-empty">
              <h2>It looks like you haven’t added any data yet.</h2>
              <p class="muted">To start your replication flow, select a connection and a source object above on the left side.</p></div>`}
            <div class="table-scroll" ${draft.objects.length ? '' : 'hidden'}><table class="grid" id="flow-objects">
              <thead><tr><th>Source Object</th><th>Target Table</th><th>Load Type</th><th>Truncate</th><th>Projection</th><th></th></tr></thead>
              <tbody>${draft.objects.map((fo, i) => {
                const so = src?.objects.find((s) => s.name === fo.source);
                const exists = localTables.includes(fo.target);
                return `<tr>
                  <td class="mono">${esc(fo.source)}${so ? `<br><small class="muted">${so.delta ? 'delta-capable' : 'no delta'}</small>` : ''}</td>
                  <td><input class="mono" data-target="${i}" value="${esc(fo.target)}" list="flow-tables" maxlength="50" spellcheck="false">
                    <br><small class="muted">${fo.target ? (exists ? 'existing local table' : 'new local table') : 'choose a target'}</small></td>
                  <td><select data-load="${i}">
                    <option ${fo.loadType === 'Initial Only' ? 'selected' : ''}>Initial Only</option>
                    <option ${fo.loadType === 'Initial and Delta' ? 'selected' : ''} ${so && !so.delta ? 'disabled' : ''}>Initial and Delta</option></select></td>
                  <td><input type="checkbox" data-truncate="${i}" ${fo.truncate ? 'checked' : ''} aria-label="Truncate ${esc(fo.target)}"></td>
                  <td><button class="btn small" type="button" data-proj="${i}">${fo.extra.length ? `${fo.extra.length} added column${fo.extra.length > 1 ? 's' : ''}` : 'Edit'}</button></td>
                  <td><button class="btn small link" type="button" data-remove="${i}" aria-label="Remove ${esc(fo.source)}" title="Remove">✕</button></td></tr>`;
              }).join('')}</tbody>
            </table></div>
            <datalist id="flow-tables">${localTables.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
            <p class="muted flow-note"><b>Initial Only</b> loads everything once. <b>Initial and Delta</b> loads everything once, then keeps checking the source
              for changes and transfers only those; it needs a delta-capable source. <b>Truncate</b> empties the target table before the initial load.</p>
          </section>
          <aside class="props flow-props" id="properties" aria-label="Properties">
            ${propsHead('Replication Flow Properties', ICONS.flow, technical || 'New Replication Flow')}
            <h4 class="props-sec">General</h4>
            <label>Business Name <small>for people</small><input id="prop-business" value="${esc(business)}" maxlength="120" autocomplete="off"></label>
            <label>Technical Name <small>${o ? 'fixed once saved' : 'A–Z, 0–9, _; fixed once saved'}</small>
              <input id="prop-technical" class="mono" value="${esc(technical)}" ${o ? 'readonly' : ''} maxlength="50" spellcheck="false" autocomplete="off"></label>
            <dl class="props-list">
              <dt>Space</dt><dd>${spaceChip(space)}</dd>
              <dt>Status</dt><dd>${o ? `<span class="status" data-status="${o.status}">${STATUS_LABEL[o.status]}</span><p class="muted">${STATUS_HELP[o.status]}</p>` : 'Not Deployed'}</dd>
            </dl>
            <h4 class="props-sec">Settings</h4>
            <label class="switch-line">Skip Unmapped Columns <small>target columns without a source column stay empty; not changeable in the game</small>
              <span class="switch"><input type="checkbox" checked disabled></span></label>
            <h4 class="props-sec">Run Status</h4>
            <dl class="props-list">
              <dt>Status</dt><dd>${lastRun ? esc(lastRun.status) : 'Not Run Yet'}</dd>
              <dt>Frequency</dt><dd>${draft.objects.some((fo) => fo.loadType === 'Initial and Delta') ? 'Delta Load Interval: 60 minutes' : '–'}</dd>
            </dl>
            ${o?.deployed ? `<button class="btn small" type="button" id="to-monitor">Open in Data Integration Monitor</button>` : ''}
            <h4 class="props-sec">Run Settings</h4>
            <label>Thread Limit for Initial Load <small>parallel transfers of the initial load; fixed in the game</small><input value="10" disabled></label>
          </aside>
        </div>
      </div>`;
    bind();
  };

  const bind = () => {
    const bn = main.querySelector<HTMLInputElement>('#prop-business')!;
    const tn = main.querySelector<HTMLInputElement>('#prop-technical')!;
    bn.addEventListener('input', () => {
      business = bn.value;
      if (!techTouched) tn.value = technical = suggestTechnicalName(bn.value);
    });
    tn.addEventListener('input', () => {
      techTouched = true;
      tn.value = technical = tn.value.toUpperCase();
    });
    main.querySelector('#ed-back')!.addEventListener('click', nav.back);
    bindDetails(main);
    main.querySelector<HTMLSelectElement>('#flow-conn')!.addEventListener('change', async (e) => {
      const v = (e.target as HTMLSelectElement).value;
      if (v !== draft.connection && draft.objects.length && !await ask('A flow has one source connection. Changing it removes the replication objects. Continue?')) return draw();
      if (v !== draft.connection) draft.objects = [];
      draft.connection = v;
      draw();
    });
    main.querySelector('#flow-add')!.addEventListener('click', addObjects);
    main.querySelectorAll<HTMLInputElement>('[data-target]').forEach((i) =>
      i.addEventListener('change', () => {
        draft.objects[Number(i.dataset.target)].target = i.value.trim().toUpperCase();
        draw();
      }),
    );
    main.querySelectorAll<HTMLSelectElement>('[data-load]').forEach((s) =>
      s.addEventListener('change', () => (draft.objects[Number(s.dataset.load)].loadType = s.value as LoadType)),
    );
    main.querySelectorAll<HTMLInputElement>('[data-truncate]').forEach((c) =>
      c.addEventListener('change', () => (draft.objects[Number(c.dataset.truncate)].truncate = c.checked)),
    );
    main.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach((b) =>
      b.addEventListener('click', () => {
        draft.objects.splice(Number(b.dataset.remove), 1);
        draw();
      }),
    );
    main.querySelectorAll<HTMLButtonElement>('[data-proj]').forEach((b) => b.addEventListener('click', () => projection(draft.objects[Number(b.dataset.proj)])));
    main.querySelector('#ed-save')!.addEventListener('click', () => {
      if (save()) toast(o && o.status === 'changes' ? 'Saved. Deploy to make the changes active.' : 'Saved. The flow is not deployed yet.');
    });
    main.querySelector('#ed-deploy')!.addEventListener('click', async () => {
      const saved = save(true);
      if (!saved) return;
      const err = flowError(saved);
      if (err) return toast(err, 'error');
      await deploy(saved);
      ctx.track(`deploy:${objectKey(saved)}`);
      ctx.save();
      toast(`${saved.name} deployed`);
      ctx.renderView();
    });
    main.querySelector('#flow-run-ed')!.addEventListener('click', async () => {
      if (!o) return;
      await startFlowRun(o);
      ctx.renderView();
    });
    main.querySelector('#to-monitor')?.addEventListener('click', () => {
      if (!o) return;
      monitorTo('flows', o.name);
      ctx.setView('monitor');
    });
  };

  function addObjects() {
    const conn = findConnection(t, space, draft.connection);
    const src = conn && sourceOf(conn);
    if (!src) return;
    const { form, close } = openDialog(`Add source objects from ${conn.name}`, `
      <table class="grid"><thead><tr><th></th><th>Source Object</th><th>Container</th><th>Delta</th></tr></thead>
        <tbody>${src.objects.map((so, i) => `<tr><td><input type="checkbox" name="so" value="${i}" ${draft.objects.some((x) => x.source === so.name) ? 'checked disabled' : ''} aria-label="Add ${esc(so.name)}"></td>
          <td class="mono">${esc(so.name)}<br><small class="muted">${esc(so.description)}</small></td><td>${esc(so.container)}</td><td>${so.delta ? 'Yes' : 'No'}</td></tr>`).join('')}</tbody></table>
      <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button><button class="btn primary" type="submit">Add Selection</button></div>`, 'wide');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      for (const i of form.querySelectorAll<HTMLInputElement>('[name="so"]:checked:not([disabled])')) {
        const so = src.objects[Number(i.value)];
        const base = so.name.split('/').pop()!.replace(/\.csv$/i, '');
        draft.objects.push({ source: so.name, target: suggestTechnicalName(base), loadType: 'Initial Only', truncate: false, extra: [] });
      }
      close();
      draw();
    });
  }

  function projection(fo: FlowObject) {
    const rows = () => fo.extra.map((e, i) => `<tr><td class="mono">${esc(e.name)}</td><td class="mono">'${esc(e.value)}'</td>
      <td><button class="btn small link" type="button" data-x="${i}">Remove</button></td></tr>`).join('');
    const { form, close } = openDialog(`Projection: ${fo.source}`, `
      <p class="guide-lead">A projection filters rows, maps columns and can add columns. Here you add columns with a constant value that every record gets.</p>
      <table class="grid" id="proj-list"><thead><tr><th>Column</th><th>Value</th><th></th></tr></thead><tbody>${rows() || '<tr><td colspan="3" class="muted">No added columns.</td></tr>'}</tbody></table>
      <div class="form-grid"><label>New column <small>A–Z, 0–9, _</small><input name="col" class="mono" maxlength="30" spellcheck="false" autocomplete="off"></label>
        <label>Constant value<input name="val" maxlength="30" autocomplete="off"></label></div>
      <p class="form-error" role="alert"></p>
      <div class="guide-actions"><button class="btn" type="button" id="proj-add">Add column</button><button class="btn primary" type="submit">Done</button></div>`);
    const refresh = () => {
      form.querySelector('#proj-list tbody')!.innerHTML = rows() || '<tr><td colspan="3" class="muted">No added columns.</td></tr>';
      form.querySelectorAll<HTMLButtonElement>('[data-x]').forEach((b) =>
        b.addEventListener('click', () => {
          fo.extra.splice(Number(b.dataset.x), 1);
          refresh();
        }),
      );
    };
    refresh();
    form.querySelector('#proj-add')!.addEventListener('click', () => {
      const col = form.querySelector<HTMLInputElement>('[name="col"]')!.value.trim().toUpperCase();
      const val = form.querySelector<HTMLInputElement>('[name="val"]')!.value.trim();
      const err = form.querySelector('.form-error')!;
      if (!/^[A-Z_][A-Z0-9_]{0,29}$/.test(col)) return (err.textContent = 'Column names use capital letters, digits and underscores.');
      if (!val) return (err.textContent = 'Enter the value every record gets.');
      if (fo.extra.some((e) => e.name === col)) return (err.textContent = `${col} is already added.`);
      fo.extra.push({ name: col, value: val });
      err.textContent = '';
      form.querySelector<HTMLInputElement>('[name="col"]')!.value = '';
      form.querySelector<HTMLInputElement>('[name="val"]')!.value = '';
      refresh();
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      close();
      draw();
    });
  }

  function save(quiet = false): RepoObject | null {
    const bn = business.trim();
    if (!bn) {
      toast('Enter a business name before you save.', 'error');
      return null;
    }
    if (!o) {
      const err = objectNameError(technical.trim(), space, t);
      if (err) {
        toast(err, 'error');
        return null;
      }
      const created: RepoObject = {
        space, name: technical.trim(), kind: 'Replication Flow', businessName: bn, semanticUsage: 'Relational Dataset',
        flow: structuredClone(draft), status: 'not_deployed', changedAt: new Date().toISOString(),
      };
      t.objects.push(created);
      ctx.track(`save:${objectKey(created)}`);
      ctx.save();
      nav.opened(objectKey(created));
      if (!quiet) ctx.renderView();
      return created;
    }
    o.businessName = bn;
    o.flow = structuredClone(draft);
    touch(o);
    ctx.track(`save:${objectKey(o)}`);
    ctx.save();
    if (!quiet) ctx.renderView();
    return o;
  }

  draw();
}

/** What has to be right before a replication flow can be deployed. */
export function flowError(o: RepoObject): string | null {
  const t = ctx.tenant();
  const def = o.flow!;
  const locked = lockError(t, o.space);
  if (locked) return `Deployment failed. ${locked}`;
  const conn = findConnection(t, o.space, def.connection);
  if (!conn) return 'Choose a source connection.';
  if (!supports(conn, 'Replication Flows')) {
    return conn.validation?.ok
      ? `${conn.name} does not support replication flows. Validate shows which features a connection offers.`
      : `${conn.name} is not validated. Validate it in the Connections app first.`;
  }
  if (!def.objects.length) return 'Add at least one source object.';
  const src = sourceOf(conn)!;
  const targets = new Set<string>();
  for (const fo of def.objects) {
    if (!fo.target) return `Choose a target table for ${fo.source}.`;
    if (!/^[A-Z_][A-Z0-9_]{0,49}$/.test(fo.target)) return `${fo.target} is not a valid technical name.`;
    if (targets.has(fo.target)) return `Two objects write into ${fo.target}. Each target table gets one source.`;
    targets.add(fo.target);
    const existing = t.objects.find((x) => x.space === o.space && x.name === fo.target);
    if (existing && existing.kind !== 'Local Table') return `${fo.target} is a ${existing.kind}. A replication flow writes into local tables only.`;
    const so = src.objects.find((s) => s.name === fo.source);
    if (fo.loadType === 'Initial and Delta' && !so?.delta) return `${fo.source} is not delta-capable. Use Initial Only.`;
  }
  return null;
}
