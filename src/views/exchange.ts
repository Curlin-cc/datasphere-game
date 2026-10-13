import { ctx } from '../ctx';
import {
  MARKET, marketProducts, installProduct, uninstallProduct, LANGS, translatable, translationStatus, licenseKey, listError,
  type MarketProduct, type OwnProduct,
} from '../extras';
import { objectKey, findObject, readsFrom } from '../repo';
import { welcomeSpacesHtml, bindSpaceSearch } from './welcome';
import { esc, openDialog, toast, ask } from '../ui';
import { registerLocation } from '../nav';

/**
 * Catalog & Marketplace › Marketplace Data Products (Handbuch 8.3), Translation (not in the Handbuch: simplified),
 * Data Sharing Cockpit (Handbuch 8.4). Installed products become local tables in the target space; own products need a
 * provider profile and deployed objects before they can be listed.
 */

// ---------------------------------------------------------------- Marketplace Data Products

/**
 * After SAP help ("Managing Marketplace Data Products", "Installing Marketplace Data Products"): the page tracks installed products
 * with the charts Installations by Month, Top Data Providers and License Validity, the tab Data Products (installed: Name, Data Provider,
 * Space, Data Product Details, Installation Details, Actions with Delivery Details; toolbar Install · Update · Uninstall · Reinitialize)
 * and the license activation. Browsing and installing happens in the catalog collection Data Products (Marketplace); the game shows
 * that collection as the tab "Catalog". Contexts are not part of the game.
 */
let mpTab: 'browse' | 'installed' | 'licenses' = 'installed';
let mpSelected = MARKET[0].id;

export function renderMarketplace(main: HTMLElement) {
  const t = ctx.tenant();
  const x = t.extras;
  const products = marketProducts(t);
  const sel = products.find((p) => p.id === mpSelected) ?? products[0];
  main.innerHTML = `
    <div class="ext-page">
      <div class="ext-head"><div><h1 class="view-title">Marketplace Data Products</h1>
        <p class="view-lead">Keep track of the data products installed in your spaces and activate licenses. You find and install products in the catalog
          collection “Data Products (Marketplace)”: free ones directly, others with a license key from the provider.</p></div></div>
      <div class="ext-kpis three" id="mp-charts">
        <section class="panel ext-kpi"><b>Installations by Month</b><p class="ext-kpi-value">${x.installed.filter((i) => i.at.slice(0, 7) === new Date().toISOString().slice(0, 7)).length}</p><p class="muted small">this month · ${x.installed.length} in total</p></section>
        <section class="panel ext-kpi"><b>Top Data Providers</b><p class="small">${[...new Set(x.installed.map((i) => MARKET.find((p) => p.id === i.product)?.provider ?? ''))].filter(Boolean).map(esc).join('<br>') || '<span class="muted">No data</span>'}</p></section>
        <section class="panel ext-kpi"><b>License Validity</b><p class="ext-kpi-value">0</p><p class="muted small">expiring or expired licenses</p></section>
      </div>
      <div class="tabs" role="tablist" id="mp-tabs">
        ${(['installed', 'licenses', 'browse'] as const).map((k) => `<button type="button" role="tab" data-mp-tab="${k}" aria-selected="${mpTab === k}">${{ browse: 'Catalog: Data Products (Marketplace)', installed: `Data Products (${x.installed.length})`, licenses: 'Licenses' }[k]}</button>`).join('')}
        <button type="button" role="tab" disabled title="Contexts limit which data products you see; not in this game">Contexts</button>
      </div>
      ${mpTab === 'browse' ? `<div class="ext-split">
          <ul class="ext-cardlist" id="mp-list">${products.map((p) => `<li><button type="button" class="ext-pcard ${p === sel ? 'selected' : ''}" data-mp="${esc(p.id)}">
            <b>${esc(p.name)}</b><small>${esc(p.provider)} · ${esc(p.category)}</small>
            <span class="ext-tags"><span class="ext-status ${p.contract === 'Free' ? 'ok' : ''}">${p.contract}</span>${x.installed.some((i) => i.product === p.id) ? '<span class="ext-status ok">Installed</span>' : ''}${p.own ? '<span class="ext-status">Yours</span>' : ''}</span></button></li>`).join('')}</ul>
          ${sel ? productDetail(sel) : ''}</div>`
      : mpTab === 'installed' ? `<section class="panel"><div class="ext-list-head"><h3>Installed Data Products (${x.installed.length})</h3><span class="spacer"></span>
          <button class="btn small link" type="button" disabled title="Installs a data product with status uninstalled">Install</button>
          <button class="btn small link" type="button" disabled title="Installs the latest minor version; no update available">Update</button>
          <button class="btn small link" type="button" disabled title="Use Uninstall in the row">Uninstall</button>
          <button class="btn small link" type="button" disabled title="Re-initializes a product with connection issues (status failed)">Reinitialize</button></div>
          <div class="table-scroll"><table class="grid" id="mp-installed">
          <thead><tr><th>Name</th><th>Data Provider</th><th>Space</th><th>Data Product Details</th><th>Installation Details</th><th>Actions</th></tr></thead>
          <tbody>${x.installed.length ? x.installed.map((i, n) => {
            const p = MARKET.find((m) => m.id === i.product);
            return `<tr><td><b>${esc(p?.name ?? i.product)}</b><br><small class="mono muted">${i.objects.map((k) => esc(k.split('.')[1])).join(', ')}</small></td><td>${esc(p?.provider ?? '')}</td><td class="mono">${esc(i.space)}</td>
            <td class="small">Released · Direct · ${esc(p?.contract ?? '')}</td>
            <td class="small"><span class="ext-status ok">Up-to-date</span><br><span class="muted">${new Date(i.at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span></td>
            <td class="actions"><button class="btn small link" type="button" data-mp-delivery="${n}">Delivery Details</button> <button class="btn small" type="button" data-mp-open="${esc(i.space)}">Open in Data Builder</button> <button class="btn link small" type="button" data-mp-uninstall="${n}">Uninstall</button></td></tr>`;
          }).join('')
            : '<tr><td colspan="6" class="muted">Nothing installed yet. Find a product in the catalog (tab Catalog) and install it into a space.</td></tr>'}</tbody></table></div></section>`
      : `<section class="panel" id="mp-licenses"><div class="ext-list-head"><h3>Activated Licenses</h3><span class="spacer"></span>
          <button class="btn small" type="button" id="mp-activate">Activate License</button></div>
          <div class="table-scroll"><table class="grid"><thead><tr><th>Data Product</th><th>License Key</th><th>Installed In</th></tr></thead>
          <tbody>${Object.keys(x.licenses).length ? Object.entries(x.licenses).map(([pid, key]) => `<tr><td>${esc(MARKET.find((p) => p.id === pid)?.name ?? pid)}</td><td class="mono">${esc(key)}</td>
            <td class="mono">${x.installed.filter((i) => i.product === pid).map((i) => esc(i.space)).join(', ') || '<span class="muted">not installed</span>'}</td></tr>`).join('')
            : '<tr><td colspan="3" class="muted">No license activated. You can activate a key here without installing the product.</td></tr>'}</tbody></table></div></section>`}
      <p class="muted ext-note">Providers, products and keys are made up for the game. The real Marketplace needs a tenant provisioned after 25 January 2021 (Handbuch 8.3.1); contexts are not part of this game.</p>
    </div>`;
  main.querySelectorAll<HTMLButtonElement>('[data-mp-tab]').forEach((b) => b.addEventListener('click', () => { mpTab = b.dataset.mpTab as typeof mpTab; renderMarketplace(main); }));
  main.querySelectorAll<HTMLButtonElement>('[data-mp]').forEach((b) => b.addEventListener('click', () => { mpSelected = b.dataset.mp!; ctx.track(`marketplace-open:${mpSelected}`); renderMarketplace(main); }));
  main.querySelector('#mp-install')?.addEventListener('click', () => installDialog(main, sel as MarketProduct));
  main.querySelector('#mp-request')?.addEventListener('click', () => {
    x.requested = [...new Set([...x.requested, sel.id])];
    ctx.track(`marketplace-request:${sel.id}`);
    ctx.save();
    toast(`${sel.provider} sent you a license key.`);
    renderMarketplace(main);
  });
  main.querySelector('#mp-activate')?.addEventListener('click', () => activateDialog(main));
  main.querySelectorAll<HTMLButtonElement>('[data-mp-delivery]').forEach((b) => b.addEventListener('click', () => {
    const i = x.installed[Number(b.dataset.mpDelivery)];
    openDialog('Delivery Details', `<table class="grid compact"><thead><tr><th>Installation</th><th>Status</th><th>Data Artifacts</th></tr></thead>
      <tbody><tr><td>${new Date(i.at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td><td><span class="ext-status ok">Successful</span></td>
        <td class="mono small">${i.objects.map((k) => esc(k.split('.')[1])).join(', ')}</td></tr></tbody></table>
      <p class="muted">A failed installation shows its message here, for the overview and for each data artifact.</p>
      <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Close</button></div>`);
  }));
  main.querySelectorAll<HTMLButtonElement>('[data-mp-open]').forEach((b) => b.addEventListener('click', () => {
    t.activeSpace = b.dataset.mpOpen!;
    ctx.setView('builder');
  }));
  main.querySelectorAll<HTMLButtonElement>('[data-mp-uninstall]').forEach((b) => b.addEventListener('click', async () => {
    const inst = x.installed[Number(b.dataset.mpUninstall)];
    if (!(await ask(`Uninstall from ${inst.space}? The tables ${inst.objects.map((k) => k.split('.')[1]).join(', ')} are deleted, and every view built on them stops working.`, 'Uninstall'))) return;
    await uninstallProduct(t, inst);
    ctx.save();
    renderMarketplace(main);
  }));
}

function productDetail(p: MarketProduct & { own?: boolean }) {
  const x = ctx.tenant().extras;
  const hasKey = x.licenses[p.id] === p.key;
  const requested = x.requested.includes(p.id);
  return `<section class="panel ext-detail" id="mp-detail">
    <h2>${esc(p.name)}</h2><p class="muted">${esc(p.provider)} · ${esc(p.category)}</p>
    <p>${esc(p.description)}</p>
    <dl class="ext-dl"><div><dt>Contract Type</dt><dd>${p.contract}</dd></div><div><dt>Data Shipment</dt><dd>Direct</dd></div>
      <div><dt>Objects</dt><dd>${p.own ? 'Listed by your organization' : p.tables.map((tb) => `<span class="mono">${esc(tb.name)}</span> (${tb.table.columns.length} columns, ${tb.table.rows.length} rows)`).join('<br>')}</dd></div></dl>
    ${p.own ? '<p class="note">This is your own data product. Consumers in other tenants install it; you manage it in the Data Sharing Cockpit.</p>'
      : `<div class="ext-actions">${p.contract === 'Free' ? '<button class="btn primary" type="button" id="mp-install">Install</button>'
        : `<button class="btn primary" type="button" id="mp-install">Install with License Key</button>
           ${hasKey ? '<span class="ext-status ok">License activated</span>' : `<button class="btn" type="button" id="mp-request" ${requested ? 'disabled' : ''}>Request License</button>`}`}</div>
        ${p.contract === 'License Key' && requested && !hasKey ? `<div class="ext-mail" id="mp-mail"><b>Message from ${esc(p.provider)}</b>
          <p>Thank you for your order. Your activation key is <span class="mono">${esc(p.key!)}</span>. Enter it when you install the product.</p></div>` : ''}`}
  </section>`;
}

function installDialog(main: HTMLElement, p: MarketProduct) {
  const t = ctx.tenant();
  const x = t.extras;
  const already = x.installed.filter((i) => i.product === p.id).map((i) => i.space);
  const { form, close } = openDialog(p.contract === 'License Key' ? 'Install with License Key' : `Install ${p.name}`, `
    <div class="form-grid">
      ${p.contract === 'License Key' ? `<label>License Key <small>from the provider</small><input name="key" value="${esc(x.licenses[p.id] ?? '')}" autocomplete="off" spellcheck="false" placeholder="XXX-XXXX-XXXX"></label>` : ''}
      <label>Target Space <small>where the tables are created</small><select name="space">${t.spaces.map((s) => `<option value="${esc(s.id)}" ${s.id === t.activeSpace ? 'selected' : ''}>${esc(s.id)} · ${esc(s.name)}</option>`).join('')}</select></label>
    </div>
    ${already.length ? `<p class="hint">Already installed in: ${already.map(esc).join(', ')}. Installing again replaces the tables there.</p>` : ''}
    <p class="form-error" role="alert"></p>
    <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button><button class="btn primary" type="submit">Install</button></div>`);
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = new FormData(form);
    const err = form.querySelector<HTMLElement>('.form-error')!;
    if (p.contract === 'License Key') {
      const key = String(f.get('key') ?? '').trim().toUpperCase();
      if (key !== p.key) return void (err.textContent = key ? 'This key is not valid for this data product.' : 'Enter the license key. Request one from the provider on the product page.');
      x.licenses[p.id] = key;
    }
    const space = String(f.get('space'));
    const e = await installProduct(t, p, space);
    if (e) return void (err.textContent = e);
    ctx.track(`marketplace-install:${p.id}:${space}`);
    ctx.save();
    close();
    toast(`${p.name} installed in ${space}: ${p.tables.map((tb) => tb.name).join(', ')}.`);
    renderMarketplace(main);
  });
}

function activateDialog(main: HTMLElement) {
  const x = ctx.tenant().extras;
  const keyed = MARKET.filter((p) => p.contract === 'License Key');
  const { form, close } = openDialog('Activate License', `
    <div class="form-grid">
      <label>Data Product<select name="product">${keyed.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label>
      <label>License Key<input name="key" autocomplete="off" spellcheck="false"></label></div>
    <p class="form-error" role="alert"></p>
    <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button><button class="btn primary" type="submit">Activate</button></div>`);
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = new FormData(form);
    const p = keyed.find((k) => k.id === f.get('product'))!;
    const key = String(f.get('key') ?? '').trim().toUpperCase();
    if (key !== p.key) return void (form.querySelector<HTMLElement>('.form-error')!.textContent = 'This key is not valid for this data product.');
    x.licenses[p.id] = key;
    ctx.save();
    close();
    renderMarketplace(main);
  });
}

// ---------------------------------------------------------------- Translation

let trSpace = '';

/**
 * Translation tool after SAP help ("Translating Metadata for SAP Analytics Cloud"): pick a space, then the list of objects selected for
 * translation. Add opens "Add Objects", where only analytic models can be chosen; their dimensions (and hierarchies) come along.
 * Edit translates in-line per target language; Delete removes the object and its strings; Download/Upload (XLIFF) are shown but
 * not part of the game. Columns: Business Name / Technical Name, Type, Creator, Status. Source language: English.
 */
let trSel = '';
let trFilter: 'all' | 'Translated' | 'Partially Translated' | 'Not Translated' = 'all';

export function renderTranslation(main: HTMLElement) {
  const t = ctx.tenant();
  if (!trSpace || !t.spaces.some((s) => s.id === trSpace)) {
    main.classList.add('flush');
    main.innerHTML = welcomeSpacesHtml({
      title: 'Welcome to the Translation Dashboard', text: 'Translate the business names of your models and their dimensions, so business users see them in their own language in SAP Analytics Cloud.',
      emptyTitle: 'It looks like you haven’t selected a space.', emptyText: 'Texts are managed per space. Select a space to add objects to translation and maintain their translations.',
      cardAttrs: (id) => `data-tr-space="${id}"`, gridId: 'tr-spaces',
    });
    bindSpaceSearch(main);
    main.querySelectorAll<HTMLButtonElement>('[data-tr-space]').forEach((b) => b.addEventListener('click', () => {
      trSpace = b.dataset.trSpace!;
      ctx.track(`translation-space:${trSpace}`);
      renderTranslation(main);
    }));
    return;
  }
  main.classList.remove('flush');
  const x = t.extras;
  const added = Object.keys(x.translations).filter((k) => k.split('.')[0] === trSpace).map((k) => findObject(t, k)).filter((o): o is NonNullable<typeof o> => !!o);
  const rows = added.filter((o) => trFilter === 'all' || translationStatus(o, x.translations[objectKey(o)]) === trFilter);
  if (!added.some((o) => objectKey(o) === trSel)) trSel = '';
  main.innerHTML = `
    <div class="ext-page">
      <div class="ext-head"><div><h1 class="view-title">Translation</h1><p class="view-lead">Space <span class="mono">${esc(trSpace)}</span> · Source Language: English.
        Add analytic models; their dimensions come along. Then translate their business names per target language.</p></div>
        <button class="btn" type="button" id="tr-back">Change Space</button></div>
      <section class="panel">
        <div class="ext-list-head"><h3>Objects (${rows.length})</h3><span class="spacer"></span>
          <button class="btn small link" type="button" id="tr-add" title="Add Objects">+ Add</button>
          <button class="btn small link" type="button" id="tr-refresh">Refresh</button>
          <button class="btn small link" type="button" id="tr-edit" ${trSel ? '' : 'disabled'}>Edit</button>
          <button class="btn small link" type="button" id="tr-delete" ${trSel ? '' : 'disabled'}>Delete</button>
          <button class="btn small link" type="button" disabled title="Download the strings as XLIFF files (All Strings or Outstanding Strings); not in this game">Download</button>
          <button class="btn small link" type="button" disabled title="Import Translations: upload translated XLIFF files; not in this game">Upload</button>
          <label class="ext-field">Filter <select id="tr-filter">${(['all', 'Translated', 'Partially Translated', 'Not Translated'] as const).map((f) => `<option value="${f}" ${trFilter === f ? 'selected' : ''}>${f === 'all' ? 'All' : f}</option>`).join('')}</select></label></div>
        <div class="table-scroll"><table class="grid" id="tr-list">
        <thead><tr><th></th><th>Business Name</th><th>Technical Name</th><th>Type</th><th>Creator</th><th>Languages</th><th>Status</th></tr></thead>
        <tbody>${rows.length ? rows.map((o) => {
          const key = objectKey(o);
          const list = x.translations[key];
          const st = translationStatus(o, list);
          return `<tr data-tr="${esc(key)}" class="${key === trSel ? 'selected' : ''}"><td><input type="radio" name="tr-sel" value="${esc(key)}" ${key === trSel ? 'checked' : ''} aria-label="Select ${esc(o.name)}"></td>
            <td>${esc(o.businessName)}</td><td class="mono">${esc(o.name)}</td><td>${o.kind === 'SQL View' ? 'View' : esc(o.kind)}</td><td>DATA_ARCHITECT</td>
            <td>${list?.filter((l) => l.businessName).map((l) => `${esc(l.lang)}${l.source !== o.businessName ? ' (expired)' : ''}`).join(', ') || '<span class="muted">—</span>'}</td>
            <td><span class="ext-status ${st === 'Translated' ? 'ok' : st === 'Partially Translated' ? 'warn' : ''}">${st}</span></td></tr>`;
        }).join('') : `<tr><td colspan="7" class="muted">${added.length ? 'No object matches the filter.' : 'No objects selected for translation yet. Add an analytic model.'}</td></tr>`}</tbody></table></div></section>
      <p class="muted ext-note">A string made for an older business name is expired: the object falls back to Not Translated or Partially Translated until you translate it again.</p>
    </div>`;
  main.querySelector('#tr-back')!.addEventListener('click', () => { trSpace = ''; trSel = ''; renderTranslation(main); });
  main.querySelector('#tr-refresh')!.addEventListener('click', () => renderTranslation(main));
  main.querySelector<HTMLSelectElement>('#tr-filter')!.addEventListener('change', (e) => { trFilter = (e.target as HTMLSelectElement).value as typeof trFilter; renderTranslation(main); });
  main.querySelectorAll<HTMLInputElement>('[name="tr-sel"]').forEach((r) => r.addEventListener('change', () => { trSel = r.value; renderTranslation(main); }));
  main.querySelector('#tr-add')!.addEventListener('click', () => addObjectsDialog(main));
  main.querySelector('#tr-edit')!.addEventListener('click', () => trSel && translateDialog(main, trSel));
  main.querySelector('#tr-delete')!.addEventListener('click', async () => {
    if (!trSel || !(await ask('Delete the translations of this object? It leaves the Translation tool; you can add it again, but without its strings.', 'Delete'))) return;
    delete x.translations[trSel];
    trSel = '';
    ctx.save();
    renderTranslation(main);
  });
}

/** Add Objects: only analytic models; their dimension views come along (SAP help). */
function addObjectsDialog(main: HTMLElement) {
  const t = ctx.tenant();
  const x = t.extras;
  const models = t.objects.filter((o) => o.space === trSpace && o.kind === 'Analytic Model' && translatable(o));
  const { form, close } = openDialog('Add Objects', `
    <p class="guide-lead">Only analytic models can be selected. Their dimensions of this space are added automatically; dimensions shared from
      another space (in this game: from RHN_DSL) are translated in their own space.</p>
    <fieldset class="question share-targets"><legend>Analytic Models in ${esc(trSpace)}</legend>${models.map((o) => `<label><input type="checkbox" name="am" value="${esc(objectKey(o))}" ${x.translations[objectKey(o)] ? 'checked disabled' : ''}>
      ${esc(o.businessName)} <span class="mono muted">${esc(o.name)}</span></label>`).join('') || '<p class="muted">No analytic models in this space.</p>'}</fieldset>
    <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button><button class="btn primary" type="submit">Add Objects</button></div>`);
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    for (const key of new FormData(form).getAll('am').map(String)) {
      const am = findObject(t, key);
      x.translations[key] ??= [];
      ctx.track(`translation-add:${key}`);
      for (const k of am ? readsFrom(am, t) : []) {
        const d = findObject(t, k);
        if (d && d.space === trSpace && translatable(d) && (d.semanticUsage === 'Dimension' || d.semanticUsage === 'Hierarchy')) x.translations[k] ??= [];
      }
    }
    ctx.save();
    close();
    renderTranslation(main);
  });
}

function translateDialog(main: HTMLElement, key: string) {
  const t = ctx.tenant();
  const o = findObject(t, key)!;
  const list = t.extras.translations[key] ?? [];
  const { form, close } = openDialog(`Translate ${o.name}`, `
    <label class="ext-field">Target Language <select id="tr-lang">${LANGS.map((g) => `<option value="${g.code}">${g.label}</option>`).join('')}</select></label>
    <table class="grid compact"><thead><tr><th>Source Text (English)</th><th>Translated Text</th></tr></thead><tbody>
      <tr><td><b>${esc(o.businessName)}</b><br><small class="muted">Business Name</small></td><td>${LANGS.map((g, i) => {
        const tr = list.find((l) => l.lang === g.code);
        const outdated = tr && tr.source !== o.businessName;
        return `<label class="tr-lang-input" data-lang="${g.code}" ${i ? 'hidden' : ''}><input name="${g.code}" value="${esc(tr?.businessName ?? '')}" autocomplete="off" aria-label="${g.label}">
          <small class="muted">${outdated ? `expired: made for “${esc(tr!.source)}”` : tr ? 'translated' : 'Not Translated'}</small></label>`;
      }).join('')}</td></tr></tbody></table>
    <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button><button class="btn primary" type="submit">Save</button></div>`, 'wide');
  form.querySelector<HTMLSelectElement>('#tr-lang')!.addEventListener('change', (e) => {
    const lang = (e.target as HTMLSelectElement).value;
    form.querySelectorAll<HTMLElement>('.tr-lang-input').forEach((l) => (l.hidden = l.dataset.lang !== lang));
  });
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = new FormData(form);
    t.extras.translations[key] = LANGS.map((g) => {
      const v = String(f.get(g.code) ?? '').trim();
      const old = list.find((l) => l.lang === g.code);
      return { lang: g.code, businessName: v, source: old && old.businessName === v ? old.source : o.businessName };
    }).filter((l) => l.businessName);
    ctx.track(`translation-save:${key}`);
    ctx.save();
    toast('Translation updated successfully');
    close();
    renderTranslation(main);
  });
}

// ---------------------------------------------------------------- Data Sharing Cockpit

/**
 * Data Sharing Cockpit after Curlin's screenshot 42 (12.10.2026; his tenant has no provider profile, so the pages behind the tiles
 * follow SAP help and the Handbuch, simplified): the navigation opens Data Sharing Cockpit (overview with tiles), Publishing Management,
 * My Data Provider Profile, My Data Products, License Management and Context Management. Until a provider profile exists only
 * "Create Data Provider Profile" is active.
 */
export type SharingPage = 'overview' | 'publishing' | 'profile' | 'products' | 'licenses' | 'context';
export const SHARING_PAGES: { id: SharingPage; label: string }[] = [
  { id: 'overview', label: 'Data Sharing Cockpit' }, { id: 'publishing', label: 'Publishing Management' },
  { id: 'profile', label: 'My Data Provider Profile' }, { id: 'products', label: 'My Data Products' },
  { id: 'licenses', label: 'License Management' }, { id: 'context', label: 'Context Management' },
];
let dsTab: SharingPage = 'overview';
registerLocation('sharing', { get: () => dsTab, set: (p: SharingPage) => (dsTab = p) });
export const sharingPage = () => dsTab;
export function sharingTo(p: SharingPage) {
  dsTab = p;
}

export function renderSharing(main: HTMLElement) {
  const t = ctx.tenant();
  const x = t.extras;
  if (!x.provider && dsTab !== 'profile' && dsTab !== 'overview') dsTab = 'overview';
  const keyed = x.products.filter((p) => p.contract === 'License Key');
  const listed = x.products.filter((p) => p.status === 'Listed');
  const tile = (id: SharingPage, title: string, text: string, enabled = !!x.provider) => `<button type="button" class="ds-tile" data-ds-tab="${id}" ${enabled ? '' : 'disabled'}>
      <b>${esc(title)}</b><span>${esc(text)}</span></button>`;
  const pageTitle = SHARING_PAGES.find((p) => p.id === dsTab)!.label;
  main.innerHTML = `
    <div class="ext-page">
      <div class="ds-banner"><b>Data Marketplace</b><span>${esc(pageTitle)}</span>
        ${dsTab === 'overview' ? '<button class="btn small" type="button" disabled title="For users who manage several provider profiles">Switch Data Provider</button>' : ''}</div>
      ${dsTab === 'overview' ? `<h2 class="section-title">Overview</h2>
        <div class="ds-tiles" id="ds-overview">
          <section class="ds-tile chart"><b>Product Views Over Time</b><span class="muted">${listed.length ? `${listed.length * 7} views of your listed products this month (simulated)` : 'No data'}</span></section>
          ${tile('products', 'Data Product Listing', 'Prepare your data products to list them in the Data Marketplace of SAP Datasphere.')}
          ${tile('products', 'My Data Products', 'Access your listed data products and start your data product lifecycle management tasks.')}
          ${tile('publishing', 'Publishing Management', 'Manage the initial and ongoing delivery of your offered data products.')}
          ${tile('profile', 'My Data Provider Profile', 'Make sure the Data Marketplace users see the most relevant information about you.')}
          ${tile('licenses', 'License Management', 'Manage your license keys to ensure compliant access to your data products.')}
          ${tile('context', 'Context Management', 'Create and manage a Data Marketplace environment with its own visibility and interaction.', false)}
          ${x.provider ? '' : tile('profile', 'Create Data Provider Profile', 'Create a Data Provider profile to start using the Data Marketplace.', true)}
        </div>`
      : !x.provider && dsTab !== 'profile' ? '<p class="muted">Create your data provider profile first.</p>'
      : dsTab === 'context' ? `<section class="panel"><p>Contexts are private marketplaces: only invited consumers see the products listed in them. Not part of this game.</p></section>`
      : dsTab === 'publishing' ? `<section class="panel"><div class="ext-list-head"><h3>Listed Data Products (${listed.length})</h3></div>
          <div class="table-scroll"><table class="grid" id="ds-publishing"><thead><tr><th>Name</th><th>Delivery</th><th>Contract Type</th><th class="num">Licenses</th><th>Status</th></tr></thead>
          <tbody>${listed.map((p) => `<tr><td>${esc(p.name)}</td><td>Direct (from space ${esc(p.space)})</td><td>${p.contract}</td><td class="num">${p.licenses.length}</td>
            <td><span class="ext-status ok">Listed</span></td></tr>`).join('') || '<tr><td colspan="5" class="muted">Nothing listed yet. List a product in My Data Products.</td></tr>'}</tbody></table></div>
          <p class="muted">With direct delivery consumers read your deployed objects; there is nothing to ship. The real app also plans regular deliveries.</p></section>`
      : dsTab === 'profile' ? `<section class="panel ext-form" id="ds-profile">
          <h3>${x.provider ? 'Your Data Provider Profile' : 'Create a Data Provider Profile'}</h3>
          <form id="ds-profile-form" class="form-grid" novalidate>
            <label>Provider Name<input name="name" value="${esc(x.provider?.name ?? '')}" maxlength="60" placeholder="e.g. Stadtwerke Rheinau"></label>
            <label>Contact Email<input name="email" type="email" value="${esc(x.provider?.email ?? '')}" placeholder="data@stadtwerke-rheinau.example"></label>
            <label class="span2">Description<textarea name="description" rows="3" maxlength="500">${esc(x.provider?.description ?? '')}</textarea></label>
            <p class="form-error span2" role="alert"></p>
            <div class="span2"><button class="btn primary" type="submit">${x.provider ? 'Save' : 'Create Profile'}</button></div></form></section>`
      : dsTab === 'products' ? `<section class="panel"><div class="ext-list-head"><h3>Data Products (${x.products.length})</h3><span class="spacer"></span>
          <button class="btn primary small" type="button" id="ds-new">Create Data Product</button></div>
          <div class="table-scroll"><table class="grid" id="ds-products"><thead><tr><th>Name</th><th>Space</th><th>Objects</th><th>Contract Type</th><th>Status</th><th></th></tr></thead>
          <tbody>${x.products.length ? x.products.map((p) => `<tr data-ds-product="${esc(p.id)}"><td>${esc(p.name)}</td><td class="mono">${esc(p.space)}</td>
            <td class="mono small">${p.objects.map((k) => esc(k.split('.')[1])).join(', ') || '<span class="muted">none</span>'}</td><td>${p.contract}</td>
            <td><span class="ext-status ${p.status === 'Listed' ? 'ok' : ''}">${p.status}</span></td>
            <td class="actions">${p.status === 'Draft' ? `<button class="btn small" type="button" data-ds-edit="${esc(p.id)}">Edit</button> <button class="btn small primary" type="button" data-ds-list="${esc(p.id)}">List</button>`
              : `<button class="btn small" type="button" data-ds-unlist="${esc(p.id)}">Unlist</button>`} <button class="btn link small" type="button" data-ds-delete="${esc(p.id)}">Delete</button></td></tr>`).join('')
            : '<tr><td colspan="6" class="muted">No data product yet. Create one from deployed views or tables.</td></tr>'}</tbody></table></div></section>`
      : `<section class="panel" id="ds-licenses"><div class="ext-list-head"><h3>Licenses</h3><span class="spacer"></span>
          <button class="btn primary small" type="button" id="ds-license" ${keyed.length ? '' : 'disabled title="Only products with contract type License Key need licenses"'}>Create License</button></div>
          <div class="table-scroll"><table class="grid"><thead><tr><th>Data Product</th><th>Consumer</th><th>Activation Key</th><th>Created On</th></tr></thead>
          <tbody>${keyed.flatMap((p) => p.licenses.map((l) => `<tr><td>${esc(p.name)}</td><td>${esc(l.customer)}</td><td class="mono">${esc(l.key)}</td>
            <td class="muted">${new Date(l.at).toLocaleDateString('en-US', { dateStyle: 'medium' })}</td></tr>`)).join('')
            || `<tr><td colspan="4" class="muted">${keyed.length ? 'No license yet. Create one per consumer and send them the key.' : 'Licenses are for products with contract type License Key.'}</td></tr>`}</tbody></table></div></section>`}
      <p class="muted ext-note">Simplified after Handbuch 8.4 and SAP help. Listed products appear in the catalog collection Data Products (Marketplace).</p>
    </div>`;
  main.querySelectorAll<HTMLButtonElement>('[data-ds-tab]').forEach((b) => b.addEventListener('click', () => { dsTab = b.dataset.dsTab as SharingPage; ctx.refreshNav(); renderSharing(main); }));
  main.querySelector<HTMLFormElement>('#ds-profile-form')?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = new FormData(ev.target as HTMLFormElement);
    const name = String(f.get('name') ?? '').trim();
    const email = String(f.get('email') ?? '').trim();
    const err = main.querySelector<HTMLElement>('#ds-profile .form-error')!;
    if (name.length < 3) return void (err.textContent = 'Enter a provider name (at least 3 characters).');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return void (err.textContent = 'Enter a contact email consumers can write to.');
    const first = !x.provider;
    x.provider = { name, email, description: String(f.get('description') ?? '').trim() };
    ctx.track('sharing-profile');
    ctx.save();
    toast(first ? 'Profile created. Now create a data product.' : 'Profile saved.');
    if (first) dsTab = 'products';
    ctx.refreshNav();
    renderSharing(main);
  });
  main.querySelector('#ds-new')?.addEventListener('click', () => productDialog(main));
  main.querySelectorAll<HTMLButtonElement>('[data-ds-edit]').forEach((b) => b.addEventListener('click', () => productDialog(main, x.products.find((p) => p.id === b.dataset.dsEdit))));
  main.querySelectorAll<HTMLButtonElement>('[data-ds-list]').forEach((b) => b.addEventListener('click', () => {
    const p = x.products.find((q) => q.id === b.dataset.dsList)!;
    const err = listError(t, p);
    if (err) return toast(err, 'error');
    p.status = 'Listed';
    ctx.track(`sharing-list:${p.id}`);
    ctx.save();
    toast(`${p.name} is listed in the Marketplace.`);
    renderSharing(main);
  }));
  main.querySelectorAll<HTMLButtonElement>('[data-ds-unlist]').forEach((b) => b.addEventListener('click', () => {
    x.products.find((q) => q.id === b.dataset.dsUnlist)!.status = 'Draft';
    ctx.save();
    renderSharing(main);
  }));
  main.querySelectorAll<HTMLButtonElement>('[data-ds-delete]').forEach((b) => b.addEventListener('click', async () => {
    const p = x.products.find((q) => q.id === b.dataset.dsDelete)!;
    if (!(await ask(`Delete the data product ${p.name}? Consumers lose access, licenses are removed.`, 'Delete'))) return;
    x.products = x.products.filter((q) => q !== p);
    ctx.save();
    renderSharing(main);
  }));
  main.querySelector('#ds-license')?.addEventListener('click', () => licenseDialog(main));
}

function productDialog(main: HTMLElement, existing?: OwnProduct) {
  const t = ctx.tenant();
  const space = existing?.space ?? (t.spaces.find((s) => s.id.endsWith('_REP'))?.id ?? t.activeSpace);
  const candidates = (sp: string) => t.objects.filter((o) => o.space === sp && (o.kind === 'SQL View' || o.kind === 'Local Table'));
  const { form, close } = openDialog(existing ? `Edit ${existing.name}` : 'Create Data Product', `
    <div class="form-grid">
      <label>Name<input name="name" value="${esc(existing?.name ?? '')}" maxlength="60" placeholder="e.g. Consumption per Grid Area"></label>
      <label>Source Space<select name="space" id="dp-space">${t.spaces.map((s) => `<option ${s.id === space ? 'selected' : ''}>${esc(s.id)}</option>`).join('')}</select></label>
      <label class="span2">Description <small>what consumers get, how often it is updated</small><textarea name="description" rows="3" maxlength="600">${esc(existing?.description ?? '')}</textarea></label>
      <label>Contract Type<select name="contract"><option ${existing?.contract !== 'License Key' ? 'selected' : ''}>Free</option><option ${existing?.contract === 'License Key' ? 'selected' : ''}>License Key</option></select></label>
      <label>Data Shipment<select disabled><option>Direct</option></select></label>
    </div>
    <fieldset class="question share-targets" id="dp-objects"></fieldset>
    <p class="form-error" role="alert"></p>
    <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button><button class="btn primary" type="submit">Save as Draft</button></div>`, 'wide');
  const objBox = form.querySelector<HTMLElement>('#dp-objects')!;
  const drawObjects = (sp: string) => {
    const list = candidates(sp);
    objBox.innerHTML = `<legend>Objects (views and tables of ${esc(sp)})</legend>${list.length ? list.map((o) => `<label><input type="checkbox" name="obj" value="${esc(objectKey(o))}" ${existing?.objects.includes(objectKey(o)) ? 'checked' : ''}>
      <span class="mono">${esc(o.name)}</span> ${o.status === 'deployed' ? '' : '<small class="muted">(not deployed)</small>'}</label>`).join('') : '<p class="muted">No views or tables in this space.</p>'}`;
  };
  drawObjects(space);
  form.querySelector<HTMLSelectElement>('#dp-space')!.addEventListener('change', (e) => drawObjects((e.target as HTMLSelectElement).value));
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = new FormData(form);
    const name = String(f.get('name') ?? '').trim();
    const err = form.querySelector<HTMLElement>('.form-error')!;
    if (name.length < 3) return void (err.textContent = 'Give the data product a name.');
    const x = t.extras;
    const p: OwnProduct = existing ?? { id: `dp-${Date.now().toString(36)}`, name, description: '', space, objects: [], contract: 'Free', status: 'Draft', licenses: [] };
    p.name = name;
    p.space = String(f.get('space'));
    p.description = String(f.get('description') ?? '').trim();
    p.contract = f.get('contract') === 'License Key' ? 'License Key' : 'Free';
    p.objects = f.getAll('obj').map(String);
    if (!existing) x.products.push(p);
    ctx.track(`sharing-product:${p.id}`);
    ctx.save();
    close();
    renderSharing(main);
  });
}

function licenseDialog(main: HTMLElement) {
  const t = ctx.tenant();
  const keyed = t.extras.products.filter((p) => p.contract === 'License Key');
  const { form, close } = openDialog('Create License', `
    <div class="form-grid">
      <label>Data Product<select name="product">${keyed.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}${p.status === 'Draft' ? ' (draft)' : ''}</option>`).join('')}</select></label>
      <label>Consumer<input name="customer" placeholder="e.g. Stadtwerke Lindenau" maxlength="60"></label></div>
    <p class="form-error" role="alert"></p>
    <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button><button class="btn primary" type="submit">Create and Generate Key</button></div>`);
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = new FormData(form);
    const customer = String(f.get('customer') ?? '').trim();
    if (customer.length < 2) return void (form.querySelector<HTMLElement>('.form-error')!.textContent = 'Name the consumer who gets this key.');
    const p = keyed.find((k) => k.id === f.get('product'))!;
    const at = new Date().toISOString();
    const key = licenseKey(`${p.id}|${customer}|${at}`);
    p.licenses.push({ customer, key, at });
    ctx.track(`sharing-license:${p.id}`);
    ctx.save();
    close();
    toast(`Key ${key} created for ${customer}. Send it to them; they enter it when installing.`);
    renderSharing(main);
  });
}
