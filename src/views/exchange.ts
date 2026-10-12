import { ctx } from '../ctx';
import {
  MARKET, marketProducts, installProduct, uninstallProduct, LANGS, translatable, translationStatus, licenseKey, listError,
  type MarketProduct, type OwnProduct,
} from '../extras';
import { objectKey, findObject } from '../repo';
import { welcomeSpacesHtml, bindSpaceSearch } from './welcome';
import { esc, openDialog, toast, ask } from '../ui';

/**
 * Catalog & Marketplace › Marketplace Data Products (Handbuch 8.3), Translation (not in the Handbuch: simplified),
 * Data Sharing Cockpit (Handbuch 8.4). Installed products become local tables in the target space; own products need a
 * provider profile and deployed objects before they can be listed.
 */

// ---------------------------------------------------------------- Marketplace Data Products

let mpTab: 'browse' | 'installed' | 'licenses' = 'browse';
let mpSelected = MARKET[0].id;

export function renderMarketplace(main: HTMLElement) {
  const t = ctx.tenant();
  const x = t.extras;
  const products = marketProducts(t);
  const sel = products.find((p) => p.id === mpSelected) ?? products[0];
  main.innerHTML = `
    <div class="ext-page">
      <div class="ext-head"><div><h1 class="view-title">Marketplace Data Products</h1>
        <p class="view-lead">Data products from providers, ready to install into a space. Some are free, others need a license key from the provider.
          Installed products appear in the catalog collection “Data Products (Marketplace)”.</p></div></div>
      <div class="tabs" role="tablist" id="mp-tabs">
        ${(['browse', 'installed', 'licenses'] as const).map((k) => `<button type="button" role="tab" data-mp-tab="${k}" aria-selected="${mpTab === k}">${{ browse: 'Browse', installed: `Installed (${x.installed.length})`, licenses: 'Licenses' }[k]}</button>`).join('')}
      </div>
      ${mpTab === 'browse' ? `<div class="ext-split">
          <ul class="ext-cardlist" id="mp-list">${products.map((p) => `<li><button type="button" class="ext-pcard ${p === sel ? 'selected' : ''}" data-mp="${esc(p.id)}">
            <b>${esc(p.name)}</b><small>${esc(p.provider)} · ${esc(p.category)}</small>
            <span class="ext-tags"><span class="ext-status ${p.contract === 'Free' ? 'ok' : ''}">${p.contract}</span>${x.installed.some((i) => i.product === p.id) ? '<span class="ext-status ok">Installed</span>' : ''}${p.own ? '<span class="ext-status">Yours</span>' : ''}</span></button></li>`).join('')}</ul>
          ${sel ? productDetail(sel) : ''}</div>`
      : mpTab === 'installed' ? `<section class="panel"><div class="table-scroll"><table class="grid" id="mp-installed">
          <thead><tr><th>Data Product</th><th>Space</th><th>Objects</th><th>Installed On</th><th></th></tr></thead>
          <tbody>${x.installed.length ? x.installed.map((i, n) => `<tr><td>${esc(MARKET.find((p) => p.id === i.product)?.name ?? i.product)}</td><td class="mono">${esc(i.space)}</td>
            <td class="mono small">${i.objects.map((k) => esc(k.split('.')[1])).join(', ')}</td><td class="muted">${new Date(i.at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
            <td class="actions"><button class="btn small" type="button" data-mp-open="${esc(i.space)}">Open in Data Builder</button> <button class="btn link small" type="button" data-mp-uninstall="${n}">Uninstall</button></td></tr>`).join('')
            : '<tr><td colspan="5" class="muted">Nothing installed yet. Browse the products and install one into a space.</td></tr>'}</tbody></table></div></section>`
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

export function renderTranslation(main: HTMLElement) {
  const t = ctx.tenant();
  if (!trSpace || !t.spaces.some((s) => s.id === trSpace)) {
    main.classList.add('flush');
    main.innerHTML = welcomeSpacesHtml({
      title: 'Welcome to the Translation Dashboard', text: 'Translate the business names of your models and views, so business users see them in their own language.',
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
  const objs = t.objects.filter((o) => o.space === trSpace && translatable(o));
  main.innerHTML = `
    <div class="ext-page">
      <div class="ext-head"><div><h1 class="view-title">Translation</h1><p class="view-lead">Space <span class="mono">${esc(trSpace)}</span>: add views and analytic models to translation,
        then maintain their business names per language (source language: English). A translation becomes outdated when the English business name changes.</p></div>
        <button class="btn" type="button" id="tr-back">Change Space</button></div>
      <section class="panel"><div class="table-scroll"><table class="grid" id="tr-list">
        <thead><tr><th>Business Name</th><th>Technical Name</th><th>Type</th><th>Languages</th><th>Status</th><th></th></tr></thead>
        <tbody>${objs.length ? objs.map((o) => {
          const key = objectKey(o);
          const list = x.translations[key];
          const st = translationStatus(o, list);
          return `<tr data-tr="${esc(key)}"><td>${esc(o.businessName)}</td><td class="mono">${esc(o.name)}</td><td>${esc(o.kind)}</td>
            <td>${list?.map((l) => esc(l.lang)).join(', ') || '<span class="muted">—</span>'}</td>
            <td><span class="ext-status ${st === 'Translated' ? 'ok' : st === 'Outdated' ? 'bad' : ''}">${st}</span></td>
            <td class="actions">${list ? `<button class="btn small" type="button" data-tr-edit="${esc(key)}">Translate</button> <button class="btn link small" type="button" data-tr-remove="${esc(key)}">Remove</button>`
              : `<button class="btn small" type="button" data-tr-add="${esc(key)}">Add</button>`}</td></tr>`;
        }).join('') : '<tr><td colspan="6" class="muted">No views or analytic models in this space.</td></tr>'}</tbody></table></div></section>
      <p class="muted ext-note">Simplified: the Handbuch does not cover translation. In a real tenant texts are often exported as XLIFF files and translated outside; here you type them in.</p>
    </div>`;
  main.querySelector('#tr-back')!.addEventListener('click', () => { trSpace = ''; renderTranslation(main); });
  main.querySelectorAll<HTMLButtonElement>('[data-tr-add]').forEach((b) => b.addEventListener('click', () => {
    x.translations[b.dataset.trAdd!] = [];
    ctx.track(`translation-add:${b.dataset.trAdd}`);
    ctx.save();
    renderTranslation(main);
  }));
  main.querySelectorAll<HTMLButtonElement>('[data-tr-remove]').forEach((b) => b.addEventListener('click', async () => {
    if (!(await ask('Remove this object from translation? Its translations are deleted.', 'Remove'))) return;
    delete x.translations[b.dataset.trRemove!];
    ctx.save();
    renderTranslation(main);
  }));
  main.querySelectorAll<HTMLButtonElement>('[data-tr-edit]').forEach((b) => b.addEventListener('click', () => translateDialog(main, b.dataset.trEdit!)));
}

function translateDialog(main: HTMLElement, key: string) {
  const t = ctx.tenant();
  const o = findObject(t, key)!;
  const list = t.extras.translations[key] ?? [];
  const { form, close } = openDialog(`Translate ${o.name}`, `
    <p class="guide-lead">English (source): <b>${esc(o.businessName)}</b></p>
    <div class="form-grid">${LANGS.map((g) => {
      const tr = list.find((l) => l.lang === g.code);
      const outdated = tr && tr.source !== o.businessName;
      return `<label>${g.label} <small>${outdated ? `outdated: made for “${esc(tr!.source)}”` : tr ? 'translated' : 'empty = not translated'}</small>
        <input name="${g.code}" value="${esc(tr?.businessName ?? '')}" autocomplete="off"></label>`;
    }).join('')}</div>
    <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button><button class="btn primary" type="submit">Save</button></div>`, 'wide');
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = new FormData(form);
    t.extras.translations[key] = LANGS.map((g) => ({ lang: g.code, businessName: String(f.get(g.code) ?? '').trim(), source: o.businessName }))
      .filter((l) => l.businessName);
    ctx.track(`translation-save:${key}`);
    ctx.save();
    close();
    renderTranslation(main);
  });
}

// ---------------------------------------------------------------- Data Sharing Cockpit

let dsTab: 'profile' | 'products' | 'licenses' = 'profile';

export function renderSharing(main: HTMLElement) {
  const t = ctx.tenant();
  const x = t.extras;
  if (!x.provider && dsTab !== 'profile') dsTab = 'profile';
  const keyed = x.products.filter((p) => p.contract === 'License Key');
  main.innerHTML = `
    <div class="ext-page">
      <div class="ext-head"><div><h1 class="view-title">Data Sharing Cockpit</h1>
        <p class="view-lead">The provider side of the Marketplace: describe your organization, bundle deployed objects into data products, list them,
          and hand out license keys to consumers.</p></div></div>
      <div class="tabs" role="tablist" id="ds-tabs">
        <button type="button" role="tab" data-ds-tab="profile" aria-selected="${dsTab === 'profile'}">Data Provider Profile</button>
        <button type="button" role="tab" data-ds-tab="products" aria-selected="${dsTab === 'products'}" ${x.provider ? '' : 'disabled title="Create your profile first"'}>Data Products (${x.products.length})</button>
        <button type="button" role="tab" data-ds-tab="licenses" aria-selected="${dsTab === 'licenses'}" ${x.provider ? '' : 'disabled title="Create your profile first"'}>License Management</button></div>
      ${dsTab === 'profile' ? `<section class="panel ext-form" id="ds-profile">
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
      <p class="muted ext-note">Handbuch 8.4: the input fields are not verified, so this is simplified. Listed products appear in Catalog & Marketplace › Marketplace Data Products.</p>
    </div>`;
  main.querySelectorAll<HTMLButtonElement>('[data-ds-tab]').forEach((b) => b.addEventListener('click', () => { dsTab = b.dataset.dsTab as typeof dsTab; renderSharing(main); }));
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
