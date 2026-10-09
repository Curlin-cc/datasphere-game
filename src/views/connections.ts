import { ctx } from '../ctx';
import { suggestTechnicalName } from '../repo';
import {
  CONN_TYPES, FEATURES, connType, validateConnection, dependents, findConnection, type Connection, type ConnType,
} from '../integration';
import { esc, spaceChip, openDialog, toast, fmtDate } from '../ui';
import { welcomeSpacesHtml, bindSpaceSearch } from './welcome';

/**
 * Connections app: one list per space. Create from a connection type, Edit, Validate, Delete.
 * Validate tells you which features (remote tables, flows, model import) the connection offers.
 */

let selected = '';
/** The space cards show once per visit (page type A, docs/design/README.md). */
let spaceChosen = false;

export function spaceSelect(id: string, current: string) {
  const t = ctx.tenant();
  return `<label class="space-select">Space
    <select id="${id}">${t.spaces.map((s) => `<option value="${esc(s.id)}" ${s.id === current ? 'selected' : ''}>${esc(s.id)} · ${esc(s.name)}</option>`).join('')}</select></label>`;
}

export const featureList = (features: string[]) =>
  `<span class="features">${FEATURES.map((f) => `<span class="feature ${features.includes(f) ? 'on' : ''}" title="${esc(f)}${features.includes(f) ? '' : ': not available'}">${esc(f)}</span>`).join('')}</span>`;

export function renderConnections(main: HTMLElement) {
  const t = ctx.tenant();
  main.classList.toggle('bleed', !spaceChosen);
  if (!spaceChosen) {
    main.innerHTML = welcomeSpacesHtml({
      title: 'Welcome to Connections',
      text: 'Create and manage connections to source and target systems. Each connection belongs to one space.',
      emptyTitle: 'Select a space',
      emptyText: 'Connections are created and used inside a space. Only its members can use them in remote tables, flows and imports.',
      cardAttrs: (id) => `data-conn-card="${esc(id)}" ${id === t.activeSpace ? 'aria-current="true"' : ''}`,
      gridId: 'conn-spaces',
    });
    bindSpaceSearch(main);
    main.querySelectorAll<HTMLButtonElement>('[data-conn-card]').forEach((b) => b.addEventListener('click', () => {
      t.activeSpace = b.dataset.connCard!;
      spaceChosen = true;
      ctx.track(`space:connections:${t.activeSpace}`);
      ctx.save();
      renderConnections(main);
    }));
    return;
  }
  const space = t.activeSpace;
  const list = t.connections.filter((c) => c.space === space);
  if (!list.some((c) => c.name === selected)) selected = '';
  const sel = list.find((c) => c.name === selected);

  main.innerHTML = `
    <div class="view-head">
      <div><h1 class="view-title">Connections</h1>
        <p class="view-lead">A connection links one space to a source or target system. Only the members of that space can use it,
          in remote tables, flows and imports. Validate a connection to see which of these it supports.</p></div>
      ${spaceSelect('conn-space', space)}
    </div>
    <div class="panel">
      <div class="table-head">
        <h3>Connections in ${esc(space)} <small class="muted">${list.length}</small></h3>
        <div class="toolbar" id="conn-toolbar">
          <button class="btn primary small" type="button" id="conn-create">Create</button>
          <button class="btn small" type="button" id="conn-edit" ${sel ? '' : 'disabled'}>Edit</button>
          <button class="btn small" type="button" id="conn-validate" ${sel ? '' : 'disabled'}>Validate</button>
          <button class="btn small link" type="button" id="conn-delete" ${sel ? '' : 'disabled'}>Delete</button>
        </div>
      </div>
      <div class="table-scroll"><table class="grid" id="conn-list">
        <thead><tr><th></th><th>Business Name</th><th>Technical Name</th><th>Connection Type</th><th>Validation</th><th>Features</th><th>Changed On</th></tr></thead>
        <tbody>${list.length ? list.map((c) => `<tr class="${c.name === selected ? 'selected' : ''}">
            <td><input type="radio" name="conn-sel" value="${esc(c.name)}" ${c.name === selected ? 'checked' : ''} aria-label="Select ${esc(c.name)}"></td>
            <td>${esc(c.businessName)}</td><td class="mono">${esc(c.name)}</td><td>${esc(connType(c.type)?.label ?? c.type)}</td>
            <td>${c.validation ? `<span class="status" data-status="${c.validation.ok ? 'deployed' : 'failed'}">${c.validation.ok ? 'Valid' : 'Failed'}</span>` : '<span class="status" data-status="not_deployed">Not validated</span>'}</td>
            <td>${c.validation?.ok ? featureList(c.validation.features) : '<span class="muted">Validate to see</span>'}</td>
            <td class="muted">${fmtDate(c.changedAt)}</td></tr>`).join('')
          : `<tr><td colspan="7" class="muted">No connections in this space yet. Create one to reach a source system.</td></tr>`}</tbody>
      </table></div>
      ${sel?.validation && !sel.validation.ok ? `<p class="form-error conn-error" id="conn-message">${esc(sel.validation.message)}</p>` : ''}
    </div>
    <p class="muted">Connectivity for on-premise sources (Cloud Connector, Data Provisioning Agent), the IP allowlist and certificates
      are set up tenant-wide by an administrator under <b>System › Configuration</b>.</p>`;

  main.querySelector<HTMLSelectElement>('#conn-space')!.addEventListener('change', (e) => {
    t.activeSpace = (e.target as HTMLSelectElement).value;
    ctx.track(`space:connections:${t.activeSpace}`);
    ctx.save();
    renderConnections(main);
  });
  main.querySelectorAll<HTMLInputElement>('[name="conn-sel"]').forEach((r) =>
    r.addEventListener('change', () => {
      selected = r.value;
      renderConnections(main);
    }),
  );
  main.querySelector('#conn-create')!.addEventListener('click', () => chooseType(main));
  main.querySelector('#conn-edit')!.addEventListener('click', () => sel && openForm(main, connType(sel.type)!, sel));
  main.querySelector('#conn-validate')!.addEventListener('click', () => sel && runValidation(main, sel));
  main.querySelector('#conn-delete')!.addEventListener('click', () => {
    if (!sel) return;
    const deps = dependents(t, sel);
    if (deps.length) return toast(`${sel.name} is used by ${deps.map((d) => d.name).join(', ')}. Delete those objects first.`, 'error');
    if (!confirm(`Delete connection ${sel.name}?`)) return;
    t.connections = t.connections.filter((c) => c !== sel);
    selected = '';
    ctx.save();
    renderConnections(main);
  });
}

function chooseType(main: HTMLElement) {
  const { form, close } = openDialog('Create connection: select a connection type', `
    <p class="guide-lead">Each connection type supports its own features. A type can only use what its source offers;
      validation tells you what this connection really supports.</p>
    ${(['SAP', 'Non-SAP'] as const).map((g) => `<h3 class="type-group">${g} sources</h3><div class="type-grid">
      ${CONN_TYPES.filter((c) => c.group === g).map((c) => `<button type="button" class="type-card" data-type="${c.id}">
        <b>${esc(c.label)}</b><small>${c.deployment === 'onprem' ? 'On-premise' : c.deployment === 'cloud' ? 'Cloud' : 'Cloud or on-premise'}</small>
        ${featureList(c.features)}</button>`).join('')}</div>`).join('')}
    <p class="muted small-note">Feature sets are simplified for the game. A real tenant lists many more types.</p>
    <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button></div>`, 'wide');
  form.querySelectorAll<HTMLButtonElement>('[data-type]').forEach((b) =>
    b.addEventListener('click', () => {
      close();
      openForm(main, connType(b.dataset.type!)!);
    }),
  );
  form.addEventListener('submit', (e) => e.preventDefault());
}

function openForm(main: HTMLElement, type: ConnType, existing?: Connection) {
  const t = ctx.tenant();
  const space = existing?.space ?? t.activeSpace;
  const v = existing ?? { businessName: '', name: '', host: '', onprem: type.deployment === 'onprem', locationId: '', tls: false, auth: type.auth[0] };
  const { form, close } = openDialog(existing ? `Edit connection ${existing.name}` : `New connection: ${type.label}`, `
    <p class="guide-lead">Space ${spaceChip(space)}. ${existing ? 'The technical name cannot be changed. After a change, validate again.' : 'Enter the connection properties, then a business and a technical name.'}</p>
    <div class="form-grid">
      <label class="span2">${esc(type.hostLabel)} <small>${type.id === 'S3' ? 'name of the bucket' : 'address of the source system'}</small>
        <input name="host" value="${esc(v.host)}" autocomplete="off" spellcheck="false"></label>
      ${type.deployment === 'both' ? `<fieldset class="span2 inline-radios"><legend>Deployment</legend>
          <label><input type="radio" name="deploy" value="cloud" ${v.onprem ? '' : 'checked'}> Cloud</label>
          <label><input type="radio" name="deploy" value="onprem" ${v.onprem ? 'checked' : ''}> On-Premise</label></fieldset>` : ''}
      <label class="span2 onprem-only">Cloud Connector Location ID <small>which Cloud Connector reaches the host</small>
        <input name="location" value="${esc(v.locationId)}" autocomplete="off" spellcheck="false"></label>
      ${type.id === 'S3' ? '' : `<label class="span2 check"><input type="checkbox" name="tls" ${v.tls ? 'checked' : ''}> Use TLS encryption</label>`}
      <label>Authentication <select name="auth">${type.auth.map((a) => `<option ${a === v.auth ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select></label>
      <label>Credentials <small>not simulated</small><input value="••••••••" disabled></label>
      <label>Business Name <small>for people</small><input name="business" value="${esc(v.businessName)}" maxlength="120" autocomplete="off"></label>
      <label>Technical Name <small>A–Z, 0–9, _; fixed once created</small>
        <input name="technical" class="mono" value="${esc(v.name)}" ${existing ? 'readonly' : ''} maxlength="50" autocomplete="off" spellcheck="false"></label>
    </div>
    <p class="form-error" role="alert"></p>
    <div class="guide-actions">
      <button class="btn link" type="button" data-act="cancel">Cancel</button>
      <button class="btn primary" type="submit">${existing ? 'Save' : 'Create'}</button>
    </div>`, 'wide');
  const field = (n: string) => form.querySelector<HTMLInputElement>(`[name="${n}"]`)!;
  const onprem = () => type.deployment === 'onprem' || form.querySelector<HTMLInputElement>('[name="deploy"][value="onprem"]')?.checked === true;
  const toggle = () => form.querySelector<HTMLElement>('.onprem-only')!.toggleAttribute('hidden', !onprem());
  toggle();
  form.querySelectorAll('[name="deploy"]').forEach((r) => r.addEventListener('change', toggle));
  let techTouched = !!existing;
  field('technical').addEventListener('input', () => {
    techTouched = true;
    field('technical').value = field('technical').value.toUpperCase();
  });
  field('business').addEventListener('input', () => {
    if (!techTouched) field('technical').value = suggestTechnicalName(field('business').value);
  });
  field('host').focus();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const err = (msg: string) => (form.querySelector('.form-error')!.textContent = msg);
    const name = field('technical').value.trim();
    const business = field('business').value.trim();
    if (!field('host').value.trim()) return err(`Enter the ${type.hostLabel.toLowerCase()}.`);
    if (!business) return err('Enter a business name.');
    if (!existing) {
      if (!/^[A-Z_][A-Z0-9_]{0,49}$/.test(name)) return err('The technical name may only contain capital letters, digits and underscores, and must not start with a digit.');
      if (findConnection(t, space, name)) return err(`${space} already has a connection ${name}.`);
    }
    const data = {
      businessName: business,
      host: field('host').value.trim(),
      onprem: onprem(),
      locationId: onprem() ? field('location').value.trim() : '',
      tls: type.id === 'S3' ? true : field('tls').checked,
      auth: form.querySelector<HTMLSelectElement>('[name="auth"]')!.value,
      changedAt: new Date().toISOString(),
    };
    if (existing) {
      Object.assign(existing, data);
      existing.validation = undefined;
      selected = existing.name;
      ctx.track(`edit-connection:${space}.${existing.name}`);
      toast('Saved. Validate the connection again.');
    } else {
      t.connections.push({ space, name, type: type.id, ...data });
      selected = name;
      ctx.track(`create-connection:${space}.${name}`);
      toast(`Connection ${name} created. Validate it next.`);
    }
    ctx.save();
    close();
    renderConnections(main);
  });
}

function runValidation(main: HTMLElement, c: Connection) {
  const t = ctx.tenant();
  c.validation = validateConnection(t, c);
  ctx.track(`validate:${c.space}.${c.name}:${c.validation.ok ? 'ok' : 'fail'}`);
  ctx.save();
  const v = c.validation;
  const { form, close } = openDialog(`Validate ${c.name}`, `
    <p class="guide-lead ${v.ok ? '' : 'form-error'}">${esc(v.message)}</p>
    ${v.ok ? `<p>Available features:</p><ul class="feature-check">${FEATURES.map((f) => `<li class="${v.features.includes(f) ? 'ok' : 'off'}">${v.features.includes(f) ? '✓' : '–'} ${esc(f)}</li>`).join('')}</ul>` : ''}
    <div class="guide-actions"><button class="btn primary" type="submit">Close</button></div>`);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    close();
    renderConnections(main);
  });
}
