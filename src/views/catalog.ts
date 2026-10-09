import { ctx } from '../ctx';
import { findObject, objectKey } from '../repo';
import {
  TAG_HIERARCHIES, GLOSSARY_NAME, catalogObjects, assetMeta, findAsset, assetType, matches, termSlug,
} from '../catalog';
import { esc, spaceChip, icon, ICONS, openDialog, toast, setCrumb } from '../ui';

/**
 * Catalog & Marketplace › Search (excursion, Handbuch 8.2): the catalog search page with filters, asset details and
 * the business glossary. You act as catalog administrator: enrich, publish. Catalog users only see published entries.
 */

type Filter = 'all' | 'assets' | 'terms';
const state = { q: '', type: 'all' as Filter, status: 'all' as 'all' | 'published' | 'draft', tag: '', open: null as null | { kind: 'asset' | 'term'; id: string } };

export const catalogReset = () => (state.open = null);

export function renderCatalog(main: HTMLElement) {
  if (state.open?.kind === 'asset') return renderAsset(main, state.open.id);
  if (state.open?.kind === 'term') return renderTerm(main, state.open.id);
  return renderSearch(main);
}

const pub = (on: boolean) => `<span class="tr-status ${on ? 'ok' : 'muted'}">${on ? icon(ICONS.check) : icon(ICONS.info)}${on ? 'Published' : 'Not Published'}</span>`;

function renderSearch(main: HTMLElement) {
  const t = ctx.tenant();
  setCrumb('<span class="crumb-sep">/</span><span>Search</span>');
  const assets = catalogObjects(t).filter((o) => {
    const a = findAsset(t, objectKey(o));
    if (state.status === 'published' && !a?.published) return false;
    if (state.status === 'draft' && a?.published) return false;
    if (state.tag && !a?.tags.includes(state.tag)) return false;
    return matches(t, o, state.q);
  });
  const terms = t.catalog.terms.filter((x) => (state.status === 'all' || (state.status === 'published') === x.published) && !state.tag
    && (!state.q || `${x.name} ${x.definition}`.toLowerCase().includes(state.q.toLowerCase())));
  const showAssets = state.type !== 'terms';
  const showTerms = state.type !== 'assets';
  const n = (showAssets ? assets.length : 0) + (showTerms ? terms.length : 0);
  main.innerHTML = `
    <div class="cat-page">
      <div class="cat-head">
        <h1 class="view-title">Catalog</h1>
        <p class="view-lead">Find data assets, glossary terms and KPIs. The catalog holds <b>metadata</b>: names, descriptions, terms and tags.
          The data itself stays in its space.</p>
        <label class="cat-search">${icon(ICONS.search)}<input type="search" id="cat-q" placeholder="Search assets, glossary terms and KPIs" value="${esc(state.q)}" aria-label="Search the catalog"></label>
      </div>
      <div class="cat-body">
        <aside class="cat-facets" aria-label="Filters">
          <h3>Type</h3>
          ${(['all', 'assets', 'terms'] as Filter[]).map((f) => `<button type="button" class="sm-row ${state.type === f ? 'on' : ''}" data-ctype="${f}">${{ all: 'All', assets: 'Assets', terms: 'Glossary Terms' }[f]}</button>`).join('')}
          <button type="button" class="sm-row" disabled title="Not in this game">KPIs</button>
          <h3>Publishing Status</h3>
          <select id="cat-status"><option value="all">All</option><option value="published" ${state.status === 'published' ? 'selected' : ''}>Published</option><option value="draft" ${state.status === 'draft' ? 'selected' : ''}>Not Published</option></select>
          <h3>Tags</h3>
          <select id="cat-tag"><option value="">Any tag</option>${TAG_HIERARCHIES.map((h) => `<optgroup label="${esc(h.name)}">${h.tags.map((tg) => `<option value="${esc(`${h.name}/${tg}`)}" ${state.tag === `${h.name}/${tg}` ? 'selected' : ''}>${esc(tg)}</option>`).join('')}</optgroup>`).join('')}</select>
          <h3>Glossary</h3>
          <p class="muted">${esc(GLOSSARY_NAME)}</p>
          <button class="btn small" type="button" id="term-new">${icon(ICONS.plus)} New Glossary Term</button>
        </aside>
        <section class="cat-results" id="cat-results" aria-label="Results">
          <p class="muted">${n} ${n === 1 ? 'result' : 'results'}</p>
          ${showAssets ? assets.map((o) => {
            const a = findAsset(t, objectKey(o));
            const termNames = (a?.terms ?? []).map((id) => t.catalog.terms.find((x) => x.id === id)?.name).filter(Boolean);
            return `<article class="cat-card" data-asset="${esc(objectKey(o))}"><div class="cat-card-head">${icon(o.kind === 'Analytic Model' ? ICONS.cube : ICONS.view)}
                <button class="link-btn" type="button" data-open-asset="${esc(objectKey(o))}"><b>${esc(o.businessName)}</b></button>${pub(!!a?.published)}</div>
              <p class="muted mono">${esc(o.name)} · ${esc(assetType(o))} · ${spaceChip(o.space)}</p>
              ${a?.description ? `<p>${esc(a.description)}</p>` : '<p class="muted">No description.</p>'}
              <p>${termNames.map((nm) => `<span class="chip">${icon(ICONS.book)} ${esc(nm)}</span>`).join(' ')} ${(a?.tags ?? []).map((tg) => `<span class="chip">${esc(tg.split('/')[1])}</span>`).join(' ')}</p></article>`;
          }).join('') : ''}
          ${showTerms ? terms.map((x) => `<article class="cat-card" data-term="${esc(x.id)}"><div class="cat-card-head">${icon(ICONS.book)}
              <button class="link-btn" type="button" data-open-term="${esc(x.id)}"><b>${esc(x.name)}</b></button>${pub(x.published)}</div>
              <p class="muted">Glossary Term · ${esc(GLOSSARY_NAME)}</p><p>${esc(x.definition)}</p></article>`).join('') : ''}
          ${n ? '' : '<p class="placeholder">Nothing found. Try fewer words or another filter.</p>'}
        </section>
      </div>
    </div>`;
  const q = main.querySelector<HTMLInputElement>('#cat-q')!;
  q.addEventListener('change', () => {
    state.q = q.value.trim();
    if (state.q) ctx.track(`catalog-search:${state.q.toLowerCase()}`);
    renderSearch(main);
    main.querySelector<HTMLInputElement>('#cat-q')?.focus();
  });
  main.querySelectorAll<HTMLButtonElement>('[data-ctype]').forEach((b) => b.addEventListener('click', () => {
    state.type = b.dataset.ctype as Filter;
    renderSearch(main);
  }));
  main.querySelector<HTMLSelectElement>('#cat-status')!.addEventListener('change', (e) => {
    state.status = (e.target as HTMLSelectElement).value as typeof state.status;
    renderSearch(main);
  });
  main.querySelector<HTMLSelectElement>('#cat-tag')!.addEventListener('change', (e) => {
    state.tag = (e.target as HTMLSelectElement).value;
    renderSearch(main);
  });
  main.querySelectorAll<HTMLButtonElement>('[data-open-asset]').forEach((b) => b.addEventListener('click', () => {
    state.open = { kind: 'asset', id: b.dataset.openAsset! };
    ctx.track(`catalog-open:${b.dataset.openAsset}`);
    renderCatalog(main);
  }));
  main.querySelectorAll<HTMLButtonElement>('[data-open-term]').forEach((b) => b.addEventListener('click', () => {
    state.open = { kind: 'term', id: b.dataset.openTerm! };
    renderCatalog(main);
  }));
  main.querySelector('#term-new')!.addEventListener('click', () => openTermDialog(() => renderCatalog(main)));
}

function openTermDialog(after: () => void) {
  const t = ctx.tenant();
  const { form, close } = openDialog('New Glossary Term', `
    <p class="guide-lead">One business term, one agreed definition. Link it to the assets that implement it, then publish it.</p>
    <label>Name <input name="name" maxlength="80" autocomplete="off"></label>
    <label>Definition <textarea name="definition" rows="4" maxlength="1000"></textarea></label>
    <p class="form-error" role="alert"></p>
    <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button><button class="btn primary" type="submit">Create</button></div>`);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.querySelector<HTMLInputElement>('[name="name"]')!.value.trim();
    const definition = form.querySelector<HTMLTextAreaElement>('[name="definition"]')!.value.trim();
    const id = termSlug(name);
    const err = !name ? 'Enter a name.' : definition.length < 20 ? 'Write a definition people can rely on (at least a sentence).'
      : t.catalog.terms.some((x) => x.id === id) ? `The glossary already has "${name}".` : null;
    if (err) {
      form.querySelector('.form-error')!.textContent = err;
      return;
    }
    t.catalog.terms.push({ id, name, definition, published: false, createdBy: 'You' });
    ctx.track(`term-create:${id}`);
    ctx.save();
    close();
    toast(`Glossary term "${name}" created, not published yet`);
    after();
  });
}

function renderAsset(main: HTMLElement, key: string) {
  const t = ctx.tenant();
  const o = findObject(t, key);
  if (!o) {
    state.open = null;
    return renderSearch(main);
  }
  const a = assetMeta(t, key);
  setCrumb(`<span class="crumb-sep">/</span><span>${esc(o.businessName)}</span>`);
  main.innerHTML = `
    <div class="cat-page">
      <div class="tr-edhead"><button class="btn small link" type="button" id="cat-back">${icon(ICONS.back)} Search</button>
        <h1 class="view-title">${esc(o.businessName)}</h1>${pub(a.published)}<span class="spacer"></span>
        <button class="btn small" type="button" id="asset-save">${icon(ICONS.save)} Save</button>
        <button class="btn small primary" type="button" id="asset-publish">${a.published ? 'Unpublish' : 'Publish'}</button></div>
      <div class="cat-detail">
        <section class="panel tr-panel">
          <h3>Overview</h3>
          <dl class="props-list"><dt>Technical Name</dt><dd class="mono">${esc(o.name)}</dd><dt>Type</dt><dd>${esc(assetType(o))}</dd>
            <dt>Space</dt><dd>${spaceChip(o.space)}</dd><dt>Source System</dt><dd>Stadtwerke Rheinau · Training (SAP Datasphere)</dd>
            <dt>Extracted</dt><dd>names, columns and lineage of the deployed object; no data</dd></dl>
          <label class="cat-desc">Description <small>what it is, who owns it, when to use it</small>
            <textarea id="asset-desc" rows="5" maxlength="2000">${esc(a.description)}</textarea></label>
        </section>
        <section class="panel tr-panel">
          <h3>Glossary Terms</h3>
          <div id="asset-terms">${t.catalog.terms.map((x) => `<label class="check-line"><input type="checkbox" value="${esc(x.id)}" ${a.terms.includes(x.id) ? 'checked' : ''}>
            <b>${esc(x.name)}</b>${x.published ? '' : '<small class="muted">not published</small>'}</label>`).join('')}</div>
          <button class="btn small link" type="button" id="asset-term-new">${icon(ICONS.plus)} New Glossary Term</button>
          <h3>Tags</h3>
          <div id="asset-tags">${TAG_HIERARCHIES.map((h) => `<p class="muted">${esc(h.name)}</p>${h.tags.map((tg) => `<label class="check-line"><input type="checkbox" value="${esc(`${h.name}/${tg}`)}" ${a.tags.includes(`${h.name}/${tg}`) ? 'checked' : ''}> ${esc(tg)}</label>`).join('')}`).join('')}</div>
        </section>
      </div>
    </div>`;
  const collect = () => {
    a.description = main.querySelector<HTMLTextAreaElement>('#asset-desc')!.value.trim();
    a.terms = [...main.querySelectorAll<HTMLInputElement>('#asset-terms input:checked')].map((i) => i.value);
    a.tags = [...main.querySelectorAll<HTMLInputElement>('#asset-tags input:checked')].map((i) => i.value);
    a.terms.forEach((id) => ctx.track(`asset-term:${key}:${id}`));
    a.tags.forEach((tg) => ctx.track(`asset-tag:${key}:${tg}`));
  };
  main.querySelector('#cat-back')!.addEventListener('click', () => {
    state.open = null;
    renderCatalog(main);
  });
  main.querySelector('#asset-term-new')!.addEventListener('click', () => {
    collect();
    openTermDialog(() => renderAsset(main, key));
  });
  main.querySelector('#asset-save')!.addEventListener('click', () => {
    collect();
    ctx.track(`asset-save:${key}`);
    ctx.save();
    toast(a.published ? 'Saved. Catalog users see the change.' : 'Saved. Publish it so that catalog users find it.');
    renderAsset(main, key);
  });
  main.querySelector('#asset-publish')!.addEventListener('click', () => {
    collect();
    if (!a.published && !a.description) return toast('Write a description before you publish: an asset without one helps nobody.', 'error');
    a.published = !a.published;
    ctx.track(`asset-${a.published ? 'publish' : 'unpublish'}:${key}`);
    ctx.save();
    const draftTerms = a.terms.filter((id) => !t.catalog.terms.find((x) => x.id === id)?.published);
    toast(a.published ? (draftTerms.length ? 'Published. Its glossary term is not published yet, so catalog users do not see it.' : 'Published') : 'Unpublished', a.published && draftTerms.length ? 'info' : 'ok');
    renderAsset(main, key);
  });
}

function renderTerm(main: HTMLElement, id: string) {
  const t = ctx.tenant();
  const x = t.catalog.terms.find((y) => y.id === id);
  if (!x) {
    state.open = null;
    return renderSearch(main);
  }
  const linked = t.catalog.assets.filter((a) => a.terms.includes(id));
  setCrumb(`<span class="crumb-sep">/</span><span>${esc(x.name)}</span>`);
  main.innerHTML = `
    <div class="cat-page">
      <div class="tr-edhead"><button class="btn small link" type="button" id="cat-back">${icon(ICONS.back)} Search</button>
        <h1 class="view-title">${esc(x.name)}</h1>${pub(x.published)}<span class="spacer"></span>
        <button class="btn small primary" type="button" id="term-publish">${x.published ? 'Unpublish' : 'Publish'}</button></div>
      <section class="panel tr-panel">
        <dl class="props-list"><dt>Glossary</dt><dd>${esc(GLOSSARY_NAME)}</dd><dt>Created By</dt><dd>${esc(x.createdBy)}</dd></dl>
        <label class="cat-desc">Definition <textarea id="term-def" rows="4" maxlength="1000" ${x.createdBy === 'You' ? '' : 'readonly'}>${esc(x.definition)}</textarea></label>
        <h3>Linked Assets (${linked.length})</h3>
        <ul>${linked.map((a) => `<li class="mono">${esc(a.key)}</li>`).join('') || '<li class="muted">None yet. Link the term on an asset.</li>'}</ul>
      </section>
    </div>`;
  main.querySelector('#cat-back')!.addEventListener('click', () => {
    state.open = null;
    renderCatalog(main);
  });
  main.querySelector('#term-publish')!.addEventListener('click', () => {
    const def = main.querySelector<HTMLTextAreaElement>('#term-def')!.value.trim();
    if (def.length >= 20) x.definition = def;
    x.published = !x.published;
    ctx.track(`term-${x.published ? 'publish' : 'unpublish'}:${id}`);
    ctx.save();
    toast(x.published ? 'Glossary term published' : 'Glossary term unpublished');
    renderTerm(main, id);
  });
}
