import { ctx } from '../ctx';
import { runSql, listObjects, describeColumns } from '../db';
import { createSqlEditor } from '../editor';
import { NEW_TILES, type NewTile } from '../content/apps';
import {
  STATUS_LABEL, STATUS_HELP, SEMANTIC_USAGES, findObject, objectKey, objectNameError, suggestTechnicalName,
  touch, deploy, dropObject, readsFrom, usedBy, type RepoObject, type SemanticUsage,
} from '../repo';
import { accessError, isShared } from '../tenant';
import { lockError, remoteQueries, findConnection, sourceObject, sourceSql } from '../integration';
import { openImportRemote, renderFlowEditor } from './flow';
import { mountSemantics, viewColumns, type SemanticsDraft } from './semantics';
import { statements } from '../missions/engine';
import { missionProgress } from '../progress';
import { esc, spaceChip, layerName, icon, ICONS, openDialog, toast, resultTable, fmtDate } from '../ui';

/**
 * Data Builder, modelled on SAP Datasphere:
 *  1. select a space  →  2. start page with "New" tiles and the objects of the space  →  3. editor of one object
 * Editors have Save (design time), Deploy (runtime), Share and Data Preview, and a properties panel.
 */

type Page = { kind: 'spaces' } | { kind: 'landing' } | { kind: 'object'; key: string } | { kind: 'new-view' } | { kind: 'new-flow' };
type ListTab = 'all' | 'tables' | 'views' | 'flows';

/** "New" tiles that work in this build of the game, from their chapter on. */
const BUILT_TILES = new Set(['sqlview', 'remote', 'replication']);

let page: Page = { kind: 'spaces' };
/** The space picker shows once per visit, like choosing a space when you open the Data Builder. */
let spaceChosen = false;
let listTab: ListTab = 'all';
const inTab = (o: RepoObject, tab: ListTab) =>
  tab === 'all' || (tab === 'tables' && (o.kind === 'Local Table' || o.kind === 'Remote Table')) || (tab === 'views' && o.kind === 'SQL View') || (tab === 'flows' && o.kind === 'Replication Flow');

export const NEW_VIEW_SQL = `-- Write a SELECT statement. Ctrl+Enter shows the Data Preview.\nSELECT\n  \nFROM `;

/** Called when the Data Builder is opened from the side navigation. */
export function enterBuilder() {
  page = spaceChosen ? { kind: 'landing' } : { kind: 'spaces' };
}

export function openObjectInBuilder(key: string) {
  const o = findObject(ctx.tenant(), key);
  if (!o) return;
  ctx.tenant().activeSpace = o.space;
  spaceChosen = true;
  page = { kind: 'object', key };
  ctx.save();
}

/** For tutorials: open the start page or a new SQL view, choosing a space if none is chosen yet. */
export function builderTo(target: 'landing' | 'new-view' | 'spaces' | 'new-flow', space?: string) {
  const t = ctx.tenant();
  if (space && t.spaces.some((s) => s.id === space)) {
    t.activeSpace = space;
    spaceChosen = true;
  }
  if (target !== 'spaces' && !spaceChosen) {
    t.activeSpace = t.spaces.some((s) => s.id === t.activeSpace) ? t.activeSpace : t.spaces[0].id;
    spaceChosen = true;
  }
  page = { kind: target } as Page;
}

/** Keeps the text of the SQL editor in ctx, and as a mission draft for new views. */
export function rememberEditor() {
  if (!ctx.editor) return;
  ctx.sql = ctx.editor.getValue();
  if (ctx.sqlOwner === 'draft') missionProgress(ctx.progress, ctx.progress.currentMission).sql = ctx.sql;
}

export async function renderBuilder(main: HTMLElement) {
  rememberEditor();
  ctx.editor = null;
  main.classList.toggle('flush', page.kind === 'object' || page.kind === 'new-view' || page.kind === 'new-flow');
  if (page.kind === 'spaces') return renderSpacePicker(main);
  if (page.kind === 'landing') return renderLanding(main);
  if (page.kind === 'new-view') return renderEditor(main, null);
  const flowNav = { back: () => go({ kind: 'landing' }), opened: (key: string) => (page = { kind: 'object', key }) };
  if (page.kind === 'new-flow') return renderFlowEditor(main, null, flowNav);
  const o = findObject(ctx.tenant(), page.key);
  if (!o) {
    page = { kind: 'landing' };
    return renderLanding(main);
  }
  if (o.kind === 'Replication Flow') return renderFlowEditor(main, o, flowNav);
  return renderEditor(main, o);
}

function go(p: Page) {
  page = p;
  ctx.renderView();
}

// ---------------------------------------------------------------- 1. space picker

function renderSpacePicker(main: HTMLElement) {
  const t = ctx.tenant();
  main.innerHTML = `
    <h1 class="view-title">Data Builder</h1>
    <p class="view-lead">Select a space. Everything you build in the Data Builder lives in exactly one space,
      and you only see the spaces you are a member of.</p>
    <div class="space-picker" id="space-picker">
      ${t.spaces.map((s) => {
        const n = t.objects.filter((o) => o.space === s.id).length;
        return `<button type="button" class="panel space-card" data-space="${esc(s.id)}">
          ${spaceChip(s.id)}<b>${esc(s.name)}</b><span>${layerName(s.id)} layer · ${n} ${n === 1 ? 'object' : 'objects'}</span>
        </button>`;
      }).join('')}
    </div>`;
  main.querySelectorAll<HTMLButtonElement>('[data-space]').forEach((b) =>
    b.addEventListener('click', () => {
      t.activeSpace = b.dataset.space!;
      spaceChosen = true;
      ctx.track(`space:builder:${t.activeSpace}`);
      ctx.save();
      go({ kind: 'landing' });
    }),
  );
}

// ---------------------------------------------------------------- 2. start page

function spaceSwitch() {
  const t = ctx.tenant();
  const s = t.spaces.find((x) => x.id === t.activeSpace);
  return `<button type="button" class="space-switch" id="space-switch" title="Change space">
      ${spaceChip(t.activeSpace)}<span>${esc(s?.name ?? '')}</span>${icon(ICONS.down)}</button>`;
}

function renderLanding(main: HTMLElement) {
  const t = ctx.tenant();
  const space = t.activeSpace;
  const chapter = ctx.currentChapter();
  const own = t.objects.filter((o) => o.space === space);
  const shown = own.filter((o) => inTab(o, listTab));
  const shared = t.objects.filter((o) => o.space !== space && isShared(t, objectKey(o), space));
  const canShare = t.spaces.length > 1;
  const groups = ['Model', 'Integrate', 'Secure'] as const;

  main.innerHTML = `
    <div class="db-crumbs"><span>Data Builder</span><span class="sep">/</span>${spaceSwitch()}</div>
    <section class="new-tiles" id="new-tiles" aria-label="Create new objects">
      ${groups.map((g) => `<div class="tile-group"><h3>${g}</h3><div class="tile-row">
        ${NEW_TILES.filter((n) => n.group === g).map((n) => {
          const on = n.chapter !== undefined && BUILT_TILES.has(n.id) && chapter >= n.chapter;
          return `<button type="button" class="new-tile ${on ? '' : 'off'}" data-new="${n.id}" title="${esc(n.text)}">
            <span class="plus">+</span><span>${esc(n.verb ?? 'New')} ${esc(n.label)}</span></button>`;
        }).join('')}
      </div></div>`).join('')}
    </section>
    <div class="panel">
      <div class="table-head">
        <h3>Objects in ${esc(space)}</h3>
        <div class="tabs small" role="tablist">
          ${(['all', 'tables', 'views', 'flows'] as const).map((k) => `<button type="button" role="tab" data-list="${k}" aria-selected="${listTab === k}">${k === 'all' ? 'All' : k[0].toUpperCase() + k.slice(1)} <small>${own.filter((o) => inTab(o, k)).length}</small></button>`).join('')}
        </div>
      </div>
      <div class="table-scroll"><table class="grid" id="object-list">
        <thead><tr><th>Business Name</th><th>Technical Name</th><th>Type</th><th>Semantic Usage</th><th>Status</th><th>Changed On</th><th></th></tr></thead>
        <tbody>${shown.length ? shown.map((o) => objectRow(o, canShare)).join('') : `<tr><td colspan="7" class="muted">No objects here yet.</td></tr>`}</tbody>
      </table></div>
    </div>
    ${shared.length ? `<div class="panel shared-panel">
      <div class="table-head"><h3>Shared with ${esc(space)}</h3><span class="muted">Objects of other spaces you can use as sources here. They stay read-only.</span></div>
      <div class="table-scroll"><table class="grid" id="shared-list">
        <thead><tr><th>Business Name</th><th>Technical Name</th><th>Type</th><th>From space</th></tr></thead>
        <tbody>${shared.map((o) => `<tr><td><button type="button" class="link-btn" data-open="${esc(objectKey(o))}">${esc(o.businessName)}</button></td>
          <td class="mono">${esc(o.name)}</td><td>${typeIcon(o)}${o.kind}</td><td>${spaceChip(o.space)}</td></tr>`).join('')}</tbody>
      </table></div></div>` : ''}`;

  main.querySelector('#space-switch')!.addEventListener('click', () => go({ kind: 'spaces' }));
  main.querySelectorAll<HTMLButtonElement>('[data-list]').forEach((b) =>
    b.addEventListener('click', () => {
      listTab = b.dataset.list as typeof listTab;
      renderLanding(main);
    }),
  );
  main.querySelectorAll<HTMLButtonElement>('[data-new]').forEach((b) =>
    b.addEventListener('click', () => {
      const tile = NEW_TILES.find((n) => n.id === b.dataset.new)!;
      ctx.track(`new:${tile.id}`);
      if (b.classList.contains('off')) return tileInfo(tile);
      if (tile.id === 'remote') return openImportRemote(() => renderLanding(main));
      if (tile.id === 'replication') return go({ kind: 'new-flow' });
      ctx.sqlOwner = 'draft';
      go({ kind: 'new-view' });
    }),
  );
  main.querySelectorAll<HTMLButtonElement>('[data-open]').forEach((b) =>
    b.addEventListener('click', () => {
      ctx.track(`open:${b.dataset.open}`);
      go({ kind: 'object', key: b.dataset.open! });
    }),
  );
  main.querySelectorAll<HTMLButtonElement>('[data-share]').forEach((b) => b.addEventListener('click', () => openShareDialog(b.dataset.share!)));
  main.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach((b) =>
    b.addEventListener('click', async () => {
      const o = findObject(t, b.dataset.delete!);
      if (!o || !confirm(`Delete ${o.name}? Objects built on it stop working.`)) return;
      await dropObject(o);
      t.objects = t.objects.filter((x) => x !== o);
      t.shares = t.shares.filter((s) => s.object !== objectKey(o));
      ctx.save();
      renderLanding(main);
    }),
  );
}

export const typeIcon = (o: Pick<RepoObject, 'kind'>) =>
  icon(o.kind === 'SQL View' ? ICONS.view : o.kind === 'Remote Table' ? ICONS.remote : o.kind === 'Replication Flow' ? ICONS.flow : ICONS.table, 'type-ic');

function statusChip(o: Pick<RepoObject, 'status'>) {
  return `<span class="status" data-status="${o.status}">${STATUS_LABEL[o.status]}</span>`;
}

function objectRow(o: RepoObject, canShare: boolean) {
  const key = objectKey(o);
  return `<tr>
    <td><button type="button" class="link-btn" data-open="${esc(key)}">${esc(o.businessName)}</button></td>
    <td class="mono">${esc(o.name)}</td>
    <td>${typeIcon(o)}${o.kind}</td><td>${o.semanticUsage}</td><td>${statusChip(o)}</td>
    <td class="muted">${fmtDate(o.changedAt)}</td>
    <td class="row-actions">
      ${canShare ? `<button type="button" class="share-btn" data-share="${esc(key)}" title="Share ${esc(o.name)} with other spaces" aria-label="Share ${esc(o.name)}">
        ${icon(ICONS.share)}${ctx.tenant().shares.some((s) => s.object === key) ? '<span class="share-dot"></span>' : ''}</button>` : ''}
      ${o.source ? '' : `<button type="button" class="btn small link" data-delete="${esc(key)}">Delete</button>`}
    </td></tr>`;
}

function tileInfo(tile: NewTile) {
  const when = tile.chapter === undefined
    ? 'Not part of this game. In a real tenant you find it here on the Data Builder start page.'
    : tile.chapter > ctx.currentChapter()
      ? `You build your first one in chapter ${tile.chapter}.`
      : 'Coming in a later build of the game.';
  const { form, close } = openDialog(`New ${tile.label}`, `
    <p class="guide-lead">${esc(tile.text)}</p>
    <p class="muted">${esc(when)}</p>
    <div class="guide-actions"><button class="btn primary" type="submit">Got it</button></div>`);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    close();
  });
}

// ---------------------------------------------------------------- sharing

export function openShareDialog(key: string) {
  const t = ctx.tenant();
  const [owner, name] = key.split('.');
  const targets = t.spaces.filter((s) => s.id !== owner);
  const { form, close } = openDialog(`Share ${name}`, `
    <p class="guide-lead">Shared objects can be read in the target space, as a source for its own views. The data stays in ${esc(owner)}, nothing is copied.</p>
    <fieldset class="question share-targets"><legend>Share with these spaces</legend>
      ${targets.map((s) => `<label><input type="checkbox" name="to" value="${esc(s.id)}" ${isShared(t, key, s.id) ? 'checked' : ''}>
        ${spaceChip(s.id)} ${esc(s.name)}</label>`).join('') || '<span class="muted">There is no other space yet.</span>'}
    </fieldset>
    <div class="guide-actions">
      <button class="btn link" type="button" data-act="cancel">Cancel</button>
      <button class="btn primary" type="submit">Save sharing</button>
    </div>`);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const chosen = [...form.querySelectorAll<HTMLInputElement>('[name="to"]:checked')].map((i) => i.value);
    t.shares = t.shares.filter((s) => s.object !== key).concat(chosen.map((to) => ({ object: key, to })));
    ctx.track(`share:${key}`);
    ctx.save();
    close();
    ctx.renderView();
  });
}

// ---------------------------------------------------------------- 3. editors

async function renderEditor(main: HTMLElement, o: RepoObject | null) {
  const t = ctx.tenant();
  const space = o?.space ?? t.activeSpace;
  const isView = !o || o.kind === 'SQL View';
  const remote = o?.kind === 'Remote Table' ? o.remote : undefined;
  const readOnly = !!o && o.space !== t.activeSpace;
  const key = o ? objectKey(o) : 'draft';
  const chapter = ctx.currentChapter();
  const status = o?.status ?? 'not_deployed';

  main.innerHTML = `
    <div class="editor-page ${isView ? 'is-view' : 'is-table'}">
      <div class="ed-toolbar">
        <button class="btn small link" type="button" id="ed-back">${icon(ICONS.back)} ${esc(t.activeSpace)}</button>
        <div class="ed-title"><b id="ed-title-text">${esc(o?.businessName || 'New SQL View')}</b>
          <small>${o ? o.kind : 'SQL View'} · ${esc(space)}.${esc(o?.name ?? '…')}</small></div>
        ${o ? statusChip(o) : `<span class="status" data-status="new">New</span>`}
        <span class="spacer"></span>
        ${readOnly
          ? `<span class="muted">Shared from ${esc(space)} · read-only</span>`
          : `<button class="btn" type="button" id="ed-save">Save</button>
             <button class="btn" type="button" id="ed-deploy">Deploy</button>
             ${o && t.spaces.length > 1 ? `<button class="btn" type="button" id="ed-share">${icon(ICONS.share)} Share</button>` : ''}`}
        <button class="btn primary" type="button" id="run" title="Ctrl+Enter">Data Preview</button>
      </div>
      <div class="ed-body">
        ${isView ? `<aside class="objects" id="sources" aria-label="Sources"><h3>Sources</h3><div id="source-list"></div></aside>` : ''}
        <section class="ed-center">
          ${isView ? '<div class="editor-host" id="editor"></div>' : '<div class="columns-panel" id="columns"><div class="placeholder">Loading columns…</div></div>'}
        </section>
        <aside class="props" id="properties" aria-label="Properties">
          <h3>General</h3>
          <label>Business Name <small>for people; can change any time</small>
            <input id="prop-business" value="${esc(o?.businessName ?? '')}" ${readOnly ? 'readonly' : ''} maxlength="120" autocomplete="off"></label>
          <label>Technical Name <small>${o ? 'fixed once saved' : 'A–Z, 0–9, _; fixed once saved'}</small>
            <input id="prop-technical" class="mono" value="${esc(o?.name ?? '')}" ${o ? 'readonly' : ''} maxlength="50" autocomplete="off" spellcheck="false"></label>
          <label>Semantic Usage <small>${chapter >= 6 ? 'what kind of data this is' : 'you set it in chapter 6'}</small>
            <select id="prop-semantic" ${chapter >= 6 && !readOnly ? '' : 'disabled'}>
              ${SEMANTIC_USAGES.map((u) => `<option ${u === (o?.semanticUsage ?? 'Relational Dataset') ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
          <dl class="props-list">
            <dt>Type</dt><dd>${o ? o.kind : 'SQL View'}</dd>
            <dt>Space</dt><dd>${spaceChip(space)}</dd>
            <dt>Status</dt><dd>${o ? statusChip(o) : 'New, not saved'}<p class="muted">${o ? STATUS_HELP[status] : 'Save it to create the object in the repository.'}</p></dd>
            ${o?.deployed && o.deployed.businessName !== o.businessName ? `<dt>Deployed name</dt><dd>${esc(o.deployed.businessName)}</dd>` : ''}
            ${remote ? `<dt>Connection</dt><dd class="mono">${esc(remote.connection)}</dd><dt>Source Object</dt><dd class="mono">${esc(remote.source)}</dd>
              <dt>Data Access</dt><dd>${esc(remote.access)}<p class="muted">${remote.access === 'Remote' ? 'Each query reads the source live.' : 'Reads the copy stored in this space.'} Change it in the Data Integration Monitor.</p></dd>` : ''}
            ${o?.loadFrom ? `<dt>Filled by</dt><dd>Replication from ${esc(o.loadFrom.connection)}</dd>` : ''}
          </dl>
          ${isView && chapter >= 6 ? `<section class="sem" id="semantics">${o ? '' : '<h3>Attributes</h3><p class="muted">Save the view to give its columns a role.</p>'}</section>` : ''}
          ${o ? lineageHtml(o) : ''}
        </aside>
      </div>
      <div class="results" id="results"><div class="placeholder">
        <b>Data Preview</b> shows the first rows of ${isView ? 'what your SQL returns' : 'this table'}. Press the button above${isView ? ' or Ctrl+Enter' : ''}.
      </div></div>
    </div>`;

  const business = main.querySelector<HTMLInputElement>('#prop-business')!;
  const technical = main.querySelector<HTMLInputElement>('#prop-technical')!;
  const semantic = main.querySelector<HTMLSelectElement>('#prop-semantic')!;
  let technicalTouched = !!o;
  technical.addEventListener('input', () => {
    technicalTouched = true;
    technical.value = technical.value.toUpperCase();
  });
  business.addEventListener('input', () => {
    if (!technicalTouched) technical.value = suggestTechnicalName(business.value);
  });

  // Chapter 6+: column roles and associations of a saved SQL view.
  let sem: SemanticsDraft | null = null;
  const semHost = main.querySelector<HTMLElement>('#semantics');
  if (semHost && o) {
    sem = mountSemantics(semHost, o, o.semanticUsage, readOnly);
    semantic.addEventListener('change', () => sem?.setUsage(semantic.value as SemanticUsage));
    viewColumns(o.sql ?? '', space).then((cols) => cols && sem?.setColumns(cols));
  }

  if (isView) {
    ctx.sqlOwner = key;
    const initial = o ? o.sql ?? '' : missionProgress(ctx.progress, ctx.progress.currentMission).sql ?? NEW_VIEW_SQL;
    ctx.sql = initial;
    ctx.editor = createSqlEditor(main.querySelector('#editor')!, initial, preview);
    renderSources(main, space);
  } else {
    renderColumns(main, o!);
  }

  main.querySelector('#ed-back')!.addEventListener('click', () => go({ kind: 'landing' }));
  main.querySelector('#run')!.addEventListener('click', preview);
  main.querySelector('#ed-share')?.addEventListener('click', () => o && openShareDialog(objectKey(o)));
  main.querySelector('#ed-save')?.addEventListener('click', async () => {
    if (saveObject()) ctx.renderView();
  });
  main.querySelector('#ed-deploy')?.addEventListener('click', async () => {
    const saved = saveObject(true);
    if (!saved) return;
    const locked = lockError(t, saved.space);
    if (locked) return toast(`Deployment failed. ${locked}`, 'error');
    if (saved.kind === 'SQL View') {
      const denied = accessError(saved.sql ?? '', saved.space, t);
      if (denied) return toast(denied, 'error');
      if (saved.space.endsWith('_IN') &&
        !confirm('Calin: "The inbound layer holds source data 1:1. A view with logic belongs in harmonization." Deploy it in the inbound space anyway?')) {
        ctx.renderView();
        return;
      }
    }
    const err = await deploy(saved);
    ctx.save();
    if (err) toast(err, 'error');
    else {
      ctx.track(`deploy:${objectKey(saved)}`);
      toast(`${saved.name} deployed`);
    }
    ctx.renderView();
  });

  /** Saves the editor into the repository. Returns the object, or null if something is missing. */
  function saveObject(quiet = false): RepoObject | null {
    const bn = business.value.trim();
    if (!bn) {
      toast('Enter a business name before you save.', 'error');
      business.focus();
      return null;
    }
    if (o && (o.kind === 'Local Table' || o.kind === 'Remote Table')) {
      o.businessName = bn;
      touch(o);
      ctx.track(`save:${objectKey(o)}`);
      ctx.save();
      if (!quiet) toast(o.status === 'changes' ? 'Saved. Deploy to make the change active.' : 'Saved');
      return o;
    }
    const sql = ctx.editor!.getValue();
    const stmts = statements(sql);
    if (stmts.length !== 1 || !/^(select|with)\b/i.test(stmts[0])) {
      toast('A SQL view needs exactly one SELECT statement.', 'error');
      return null;
    }
    if (!o) {
      const name = technical.value.trim();
      const err = objectNameError(name, space, t);
      if (err) {
        toast(err, 'error');
        technical.focus();
        return null;
      }
      const created: RepoObject = {
        space, name, kind: 'SQL View', businessName: bn, semanticUsage: semantic.value as SemanticUsage,
        sql, status: 'not_deployed', changedAt: new Date().toISOString(),
      };
      t.objects.push(created);
      missionProgress(ctx.progress, ctx.progress.currentMission).sql = undefined;
      page = { kind: 'object', key: objectKey(created) };
      ctx.sqlOwner = objectKey(created);
      ctx.track(`save:${objectKey(created)}`);
      ctx.save();
      if (!quiet) toast('Saved. The view is not deployed yet.');
      return created;
    }
    o.businessName = bn;
    o.sql = sql;
    o.semanticUsage = semantic.value as SemanticUsage;
    if (sem) {
      o.columnRoles = sem.roles();
      o.associations = sem.associations();
    }
    touch(o);
    ctx.sql = sql;
    ctx.track(`save:${objectKey(o)}`);
    ctx.save();
    if (!quiet) toast(o.status === 'changes' ? 'Saved. Deploy to make the changes active.' : 'Saved');
    return o;
  }

  async function preview() {
    const out = main.querySelector<HTMLElement>('#results')!;
    let sql: string;
    if (isView) {
      sql = ctx.editor!.getValue();
      ctx.sql = sql;
      rememberEditor();
      const stmts = statements(sql);
      if (!stmts.length) {
        out.innerHTML = `<div class="result-status">Write a SELECT statement first.</div>`;
        return;
      }
      const denied = accessError(sql, space, t);
      if (denied) {
        out.innerHTML = `<div class="result-status error">${esc(denied)}</div>`;
        return;
      }
    } else {
      sql = `SELECT * FROM "${o!.space}"."${o!.name}" LIMIT 100`;
    }
    ctx.track(`preview:${key}`);
    ctx.track(`preview-in:${t.activeSpace}:${key}`);
    ctx.save();
    try {
      const res = await runSql(sql);
      if (remote?.access === 'Remote') {
        const conn = findConnection(t, o!.space, remote.connection);
        const so = sourceObject(t, o!.space, remote.connection, remote.source);
        remoteQueries.unshift({
          at: new Date().toISOString(), space: o!.space, connection: remote.connection, object: o!.name,
          statement: so ? sourceSql(so).replace(`"RHN_IN"."${so.table}"`, `"${so.name}"`) + ' LIMIT 100' : '', records: res.rows.length, ms: Math.max(1, Math.round(res.ms * 6)),
        });
        if (!conn?.validation?.ok) toast('The connection of this remote table is not valid; the source may not answer in a real tenant.', 'info');
      }
      if (isView) sem?.setColumns(res.columns);
      const rows = res.rows.length;
      out.innerHTML = `
        <div class="result-status ok">${rows} ${rows === 1 ? 'row' : 'rows'}${isView ? '' : ' (first 100)'} in ${res.ms.toFixed(0)} ms</div>
        ${res.columns.length ? resultTable(res.columns, res.rows) : ''}`;
    } catch (err) {
      out.innerHTML = `<div class="result-status error">${esc(err instanceof Error ? err.message : String(err))}</div>`;
    }
  }
}

/** Impact and lineage of the open object: what it reads, and which views read it. */
function lineageHtml(o: RepoObject) {
  const t = ctx.tenant();
  const from = readsFrom(o, t);
  const by = usedBy(objectKey(o), t);
  const sharedTo = t.shares.filter((s) => s.object === objectKey(o)).map((s) => s.to);
  const list = (keys: string[], empty: string) =>
    keys.length ? `<ul class="lineage-list">${keys.map((k) => `<li>${spaceChip(k.split('.')[0])}<span class="mono">${esc(k.split('.')[1])}</span></li>`).join('')}</ul>` : `<p class="muted">${empty}</p>`;
  return `<section class="lineage" id="lineage">
      <h3>Impact and Lineage</h3>
      ${o.kind === 'SQL View' ? `<h4>Reads from</h4>${list(from, 'No sources yet.')}` : ''}
      <h4>Used by</h4>${list(by, 'No view uses this object yet.')}
      ${sharedTo.length ? `<h4>Shared with</h4><p>${sharedTo.map((s) => spaceChip(s)).join(' ')}</p>` : ''}
      ${by.length || sharedTo.length ? `<p class="muted">A change here reaches ${by.length ? 'these views' : 'these spaces'}${by.length && sharedTo.length ? ' and spaces' : ''} as soon as you deploy it.</p>` : ''}
    </section>`;
}

async function renderSources(main: HTMLElement, space: string) {
  const t = ctx.tenant();
  const host = main.querySelector<HTMLElement>('#source-list');
  if (!host) return;
  const deployed = await listObjects();
  const columns = new Map(deployed.map((d) => [`${d.schema}.${d.name}`, d.columns]));
  const usable = (o: RepoObject) => columns.has(objectKey(o));
  const own = t.objects.filter((o) => o.space === space && usable(o));
  const shared = t.objects.filter((o) => o.space !== space && isShared(t, objectKey(o), space) && usable(o));
  const item = (o: RepoObject) => `<li><button type="button" data-src="${esc(objectKey(o))}" title="Insert ${esc(objectKey(o))}">
      ${typeIcon(o)}<span class="oname">${esc(o.name)}</span>${o.space !== space ? `<span class="otype">${esc(o.space)}</span>` : ''}</button></li>`;
  host.innerHTML = `
    <div class="space-head">${spaceChip(space)}</div>
    ${own.length ? `<ul>${own.map(item).join('')}</ul>` : '<p class="repo-empty">No deployed objects in this space.</p>'}
    ${shared.length ? `<div class="space-head shared-head">Shared Objects</div><ul>${shared.map(item).join('')}</ul>` : ''}
    <p class="repo-empty hint-text">Click a source to insert its name. Only deployed objects can be used.</p>`;
  host.querySelectorAll<HTMLButtonElement>('[data-src]').forEach((b) => b.addEventListener('click', () => ctx.editor?.insert(b.dataset.src!)));
  const schema: Record<string, string[]> = {};
  [...own, ...shared].forEach((o) => (schema[objectKey(o)] = columns.get(objectKey(o)) ?? []));
  ctx.editor?.setSchema(schema);
}

async function renderColumns(main: HTMLElement, o: RepoObject) {
  const host = main.querySelector<HTMLElement>('#columns');
  if (!host) return;
  const cols = await describeColumns(o.space, o.name);
  host.innerHTML = `
    <h3>Columns <small class="muted">${cols.length}</small></h3>
    <table class="grid" id="column-list">
      <thead><tr><th>#</th><th>Technical Name</th><th>Data Type</th><th>Key</th></tr></thead>
      <tbody>${cols.map((c, i) => `<tr><td class="num muted">${i + 1}</td><td class="mono">${esc(c.name)}</td><td>${esc(c.type)}</td>
        <td>${i === 0 ? '<span class="key-mark" title="Key column">●</span>' : ''}</td></tr>`).join('')}</tbody>
    </table>
    ${o.source ? `<p class="muted source-note">Loaded by IT in the pilot, a one-off copy of the source systems. The data cannot be changed here; business name and sharing can.</p>` : ''}
    ${o.kind === 'Remote Table' ? `<p class="muted source-note">A remote table: the structure lives here, the data in ${esc(o.remote?.connection ?? '')}${o.remote?.access === 'Remote' ? ', read live on every query' : ', copied as a snapshot'}.</p>` : ''}`;
}
