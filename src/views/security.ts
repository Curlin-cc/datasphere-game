import { ctx } from '../ctx';
import { isUnlocked } from '../progress';
import { PEOPLE } from '../content/people';
import {
  GLOBAL_ADMIN, TEMPLATES, ADMIN_INFO, TEMPLATE_ORDER, roleIdError, templateLabel, type ScopedRole, type Template, type RoleInfo,
} from '../security';
import { esc, spaceChip, openDialog } from '../ui';

/** Security app: Roles (global role, templates, scoped roles) and Users (role assignment per space). */


let securityTab: 'users' | 'roles' = 'roles';

const visiblePeople = () => PEOPLE.filter((p) => !p.from || isUnlocked(ctx.progress, p.from));


export function renderSecurity(main: HTMLElement) {
  const t = ctx.tenant();
  main.innerHTML = `
    <h1 class="view-title">Security</h1>
    <p class="view-lead">Who may do what, and where. One global role runs the tenant; everything else is a scoped role:
      a template plus the spaces it applies to.</p>
    <div class="tabs" role="tablist">
      <button type="button" role="tab" data-tab="roles" aria-selected="${securityTab === 'roles'}">Roles</button>
      <button type="button" role="tab" data-tab="users" aria-selected="${securityTab === 'users'}">Users</button>
    </div>
    <div id="security-body"></div>`;
  main.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      securityTab = b.dataset.tab as typeof securityTab;
      renderSecurity(main);
    }),
  );
  const body = main.querySelector<HTMLElement>('#security-body')!;
  if (securityTab === 'roles') {
    const card = (info: RoleInfo, kind: string) => `<article class="panel role-card">
        <div class="role-kind">${kind}</div><h3>${esc(info.name)}</h3><p>${esc(info.short)}</p>
        <ul>${info.can.map((c) => `<li>${esc(c)}</li>`).join('')}</ul><p class="muted">${esc(info.cannot)}</p></article>`;
    body.innerHTML = `
      <div class="panel">
        <div class="table-head"><h3>Scoped roles</h3><span class="spacer"></span>
          <button class="btn primary" type="button" id="create-role">Create scoped role</button></div>
        <div class="table-scroll"><table class="grid" id="role-list">
          <thead><tr><th>Role</th><th>Template</th><th>Scope</th><th class="num">Users</th><th></th></tr></thead>
          <tbody>${t.roles.length ? t.roles.map((r) => `<tr>
              <td><b>${esc(r.id)}</b></td><td>${esc(templateLabel(r.template))}</td>
              <td class="chips">${r.scope.map(spaceChip).join(' ') || '<span class="muted">no spaces</span>'}</td>
              <td class="num">${new Set(t.assignments.filter((a) => a.role === r.id && a.spaces.length).map((a) => a.user)).size}</td>
              <td class="row-actions"><button class="btn small" type="button" data-role-edit="${esc(r.id)}">Edit</button>
                <button class="btn small link" type="button" data-role-delete="${esc(r.id)}">Delete</button></td></tr>`).join('')
            : '<tr><td colspan="5" class="muted">No scoped roles yet. Create one from a template below.</td></tr>'}</tbody>
        </table></div>
      </div>
      <h2 class="section-title">Standard role</h2>
      <div class="role-cards">${card(ADMIN_INFO, 'Global role')}</div>
      <h2 class="section-title">Templates for scoped roles</h2>
      <div class="role-cards" id="templates">${TEMPLATE_ORDER.map((tp) => card(TEMPLATES[tp], 'Template')).join('')}</div>`;
    body.querySelector('#create-role')!.addEventListener('click', () => openRoleDialog());
    body.querySelectorAll<HTMLButtonElement>('[data-role-edit]').forEach((b) =>
      b.addEventListener('click', () => openRoleDialog(t.roles.find((r) => r.id === b.dataset.roleEdit))),
    );
    body.querySelectorAll<HTMLButtonElement>('[data-role-delete]').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.roleDelete!;
        if (!confirm(`Delete role ${id}? Everyone loses it.`)) return;
        t.roles = t.roles.filter((r) => r.id !== id);
        t.assignments = t.assignments.filter((a) => a.role !== id);
        ctx.save();
        renderSecurity(main);
      }),
    );
  } else {
    body.innerHTML = `
      <div class="panel">
        <div class="table-scroll"><table class="grid" id="user-list">
          <thead><tr><th>User</th><th>What they do</th><th>Roles</th><th></th></tr></thead>
          <tbody>${visiblePeople().map((p) => `<tr>
              <td><div class="person"><span class="avatar" aria-hidden="true">${esc(p.initials)}</span><div><b>${esc(p.name)}</b><span>${esc(p.title)}</span></div></div></td>
              <td class="job">${esc(p.job)}</td>
              <td class="chips">${userRolesHtml(p.id)}</td>
              <td class="row-actions"><button class="btn small" type="button" data-user="${esc(p.id)}">Edit roles</button></td>
            </tr>`).join('')}</tbody>
        </table></div>
      </div>`;
    body.querySelectorAll<HTMLButtonElement>('[data-user]').forEach((b) => b.addEventListener('click', () => openUserDialog(b.dataset.user!)));
  }
}

function userRolesHtml(user: string) {
  const list = ctx.tenant().assignments.filter((a) => a.user === user && (a.role === GLOBAL_ADMIN || a.spaces.length));
  if (!list.length) return '<span class="muted">No roles</span>';
  return list
    .map((a) => a.role === GLOBAL_ADMIN
      ? `<span class="role-tag global">${GLOBAL_ADMIN}</span>`
      : `<span class="role-tag">${esc(a.role)}</span> ${a.spaces.map(spaceChip).join(' ')}`)
    .join('<br>');
}

function openRoleDialog(existing?: ScopedRole) {
  const t = ctx.tenant();
  const v = existing ?? { id: '', template: 'MODELER' as Template, scope: [] as string[] };
  const { form, close } = openDialog(existing ? `Edit role ${existing.id}` : 'Create scoped role', `
    <p class="guide-lead">A scoped role is a template plus a scope. When you assign it to a user, you pick for which of these spaces.</p>
    <div class="form-grid">
      <label>Role name <small>e.g. RHN_MODELER</small><input name="id" maxlength="30" value="${esc(v.id)}" ${existing ? 'readonly' : ''} autocomplete="off" spellcheck="false"></label>
      <label>Template <small>what the role may do</small>
        <select name="template">${TEMPLATE_ORDER.map((tp) => `<option value="${tp}" ${tp === v.template ? 'selected' : ''}>${esc(TEMPLATES[tp].name)}</option>`).join('')}</select></label>
    </div>
    <fieldset class="question share-targets"><legend>Scope: the spaces this role can be used in</legend>
      ${t.spaces.map((sp) => `<label><input type="checkbox" name="scope" value="${esc(sp.id)}" ${v.scope.includes(sp.id) ? 'checked' : ''}> ${spaceChip(sp.id)} ${esc(sp.name)}</label>`).join('')}
    </fieldset>
    <p class="form-error" role="alert"></p>
    <div class="guide-actions">
      <button class="btn link" type="button" data-act="cancel">Cancel</button>
      <button class="btn primary" type="submit">${existing ? 'Save' : 'Create'}</button>
    </div>`);
  const idField = form.querySelector<HTMLInputElement>('[name="id"]')!;
  idField.addEventListener('input', () => (idField.value = idField.value.toUpperCase()));
  idField.focus();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = idField.value.trim();
    const template = form.querySelector<HTMLSelectElement>('[name="template"]')!.value as Template;
    const scope = [...form.querySelectorAll<HTMLInputElement>('[name="scope"]:checked')].map((i) => i.value);
    const err = roleIdError(id, t.roles, existing?.id) ?? (scope.length ? null : 'Pick at least one space for the scope.');
    if (err) {
      form.querySelector('.form-error')!.textContent = err;
      return;
    }
    if (existing) {
      existing.template = template;
      existing.scope = scope;
      // Assignments can never reach beyond the scope.
      t.assignments.filter((a) => a.role === id).forEach((a) => (a.spaces = a.spaces.filter((s) => scope.includes(s))));
    } else t.roles.push({ id, template, scope });
    ctx.track(`${existing ? 'edit' : 'create'}-role:${id}`);
    ctx.save();
    close();
    ctx.renderView();
  });
}

function openUserDialog(user: string) {
  const t = ctx.tenant();
  const person = PEOPLE.find((p) => p.id === user)!;
  const has = (role: string, space?: string) =>
    t.assignments.some((a) => a.user === user && a.role === role && (space === undefined || a.spaces.includes(space)));
  const { form, close } = openDialog(`Roles of ${person.name}`, `
    <p class="guide-lead"><b>${esc(person.title)}.</b> ${esc(person.job)}</p>
    <fieldset class="question"><legend>Global role</legend>
      <label><input type="checkbox" name="admin" ${has(GLOBAL_ADMIN) ? 'checked' : ''}> ${GLOBAL_ADMIN} <small class="muted">whole tenant</small></label>
    </fieldset>
    ${t.roles.length ? t.roles.map((r) => `<fieldset class="question"><legend>${esc(r.id)} <small class="muted">${esc(templateLabel(r.template))}</small></legend>
        ${r.scope.map((sp) => `<label><input type="checkbox" name="r:${esc(r.id)}" value="${esc(sp)}" ${has(r.id, sp) ? 'checked' : ''}> ${spaceChip(sp)}</label>`).join('') || '<span class="muted">This role has no spaces in its scope.</span>'}
      </fieldset>`).join('') : '<p class="muted">There are no scoped roles yet. Create them under Roles first.</p>'}
    <div class="guide-actions">
      <button class="btn link" type="button" data-act="cancel">Cancel</button>
      <button class="btn primary" type="submit">Save</button>
    </div>`);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const next = t.assignments.filter((a) => a.user !== user);
    if (form.querySelector<HTMLInputElement>('[name="admin"]')!.checked) next.push({ user, role: GLOBAL_ADMIN, spaces: [] });
    for (const r of t.roles) {
      const spaces = [...form.querySelectorAll<HTMLInputElement>(`[name="r:${CSS.escape(r.id)}"]:checked`)].map((i) => i.value);
      if (spaces.length) next.push({ user, role: r.id, spaces });
    }
    t.assignments = next;
    ctx.track(`assign:${user}`);
    ctx.save();
    close();
    ctx.renderView();
  });
}

