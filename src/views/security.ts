import { ctx } from '../ctx';
import { isUnlocked } from '../progress';
import { PEOPLE } from '../content/people';
import { MISSIONS } from '../content/missions';
import {
  GLOBAL_ADMIN, TEMPLATES, ADMIN_INFO, TEMPLATE_ORDER, roleIdError, templateLabel, type ScopedRole, type Template, type RoleInfo,
} from '../security';
import { esc, spaceChip, openDialog, ask } from '../ui';

/**
 * Security app (Bild 1 style, page type D): in the real tenant, Security opens sub-pages in the side navigation
 * (Users, Roles, Authorization Overview). Each page is a monitoring-style list: white head with filters, table "Name (n)"
 * with text actions on grey ground.
 */

export type SecurityPage = 'users' | 'roles' | 'authorization' | 'activities';
export const SECURITY_PAGES: { id: SecurityPage; label: string }[] = [
  { id: 'users', label: 'Users' },
  { id: 'roles', label: 'Roles' },
  { id: 'authorization', label: 'Authorization Overview' },
  { id: 'activities', label: 'Activities' },
];
let page: SecurityPage = 'roles';
export const securityPage = () => page;
export function securityTo(p: SecurityPage) {
  page = p;
}

/** Filters of the Users and Authorization Overview pages. */
let userFilter: 'all' | 'none' | 'some' = 'all';
let authUser = 'all';
let authSpace = 'all';

const visiblePeople = () => PEOPLE.filter((p) => !p.from || isUnlocked(ctx.progress, p.from));

const pageHead = (title: string, lead: string, filters = '') => `
  <header class="mon-head">
    <h1 class="view-title">${title}</h1>
    <p class="mon-lead">${lead}</p>
    ${filters ? `<div class="mon-filters">${filters}</div>` : ''}
  </header>`;

export function renderSecurity(main: HTMLElement) {
  main.classList.add('bleed');
  if (page === 'roles') renderRoles(main);
  else if (page === 'users') renderUsers(main);
  else if (page === 'activities') renderActivities(main);
  else renderAuthorization(main);
}

function renderRoles(main: HTMLElement) {
  const t = ctx.tenant();
  const card = (info: RoleInfo, kind: string) => `<article class="panel role-card">
      <div class="role-kind">${kind}</div><h3>${esc(info.name)}</h3><p>${esc(info.short)}</p>
      <ul>${info.can.map((c) => `<li>${esc(c)}</li>`).join('')}</ul><p class="muted">${esc(info.cannot)}</p></article>`;
  main.innerHTML = `<div class="mon-page">
    ${pageHead('Roles', 'One global role runs the tenant; everything else is a scoped role: a template plus the spaces it applies to.')}
    <section class="mon-body">
      <div class="panel mon-table">
        <div class="mon-table-head"><h3>Scoped Roles (${t.roles.length})</h3><span class="spacer"></span>
          <button class="text-act" type="button" id="create-role">Create scoped role</button></div>
        <div class="table-scroll"><table class="grid" id="role-list">
          <thead><tr><th>Role Name</th><th>Template</th><th>Scope</th><th class="num">Users</th><th></th></tr></thead>
          <tbody>${t.roles.length ? t.roles.map((r) => `<tr>
              <td class="mono"><b>${esc(r.id)}</b></td><td>${esc(templateLabel(r.template))}</td>
              <td class="chips">${r.scope.map(spaceChip).join(' ') || '<span class="muted">no spaces</span>'}</td>
              <td class="num">${new Set(t.assignments.filter((a) => a.role === r.id && a.spaces.length).map((a) => a.user)).size}</td>
              <td class="row-actions"><button class="text-act" type="button" data-role-edit="${esc(r.id)}">Edit</button>
                <button class="text-act" type="button" data-role-delete="${esc(r.id)}">Delete</button></td></tr>`).join('')
            : '<tr><td colspan="5" class="muted">No scoped roles yet. Create one from a template below.</td></tr>'}</tbody>
        </table></div>
      </div>
      <div class="panel mon-table">
        <div class="mon-table-head"><h3>Standard Role</h3></div>
        <div class="role-cards mon-cards">${card(ADMIN_INFO, 'Global role')}</div>
      </div>
      <div class="panel mon-table">
        <div class="mon-table-head"><h3>Templates for Scoped Roles (${TEMPLATE_ORDER.length})</h3></div>
        <div class="role-cards mon-cards" id="templates">${TEMPLATE_ORDER.map((tp) => card(TEMPLATES[tp], 'Template')).join('')}</div>
      </div>
    </section></div>`;
  main.querySelector('#create-role')!.addEventListener('click', () => openRoleDialog());
  main.querySelectorAll<HTMLButtonElement>('[data-role-edit]').forEach((b) =>
    b.addEventListener('click', () => openRoleDialog(t.roles.find((r) => r.id === b.dataset.roleEdit))),
  );
  main.querySelectorAll<HTMLButtonElement>('[data-role-delete]').forEach((b) =>
    b.addEventListener('click', async () => {
      const id = b.dataset.roleDelete!;
      if (!await ask(`Delete role ${id}? Everyone loses it.`)) return;
      t.roles = t.roles.filter((r) => r.id !== id);
      t.assignments = t.assignments.filter((a) => a.role !== id);
      ctx.save();
      renderSecurity(main);
    }),
  );
}

const hasRoles = (user: string) =>
  ctx.tenant().assignments.some((a) => a.user === user && (a.role === GLOBAL_ADMIN || a.spaces.length));

function renderUsers(main: HTMLElement) {
  const all = visiblePeople();
  const list = all.filter((p) => userFilter === 'all' || (userFilter === 'none') !== hasRoles(p.id));
  main.innerHTML = `<div class="mon-page">
    ${pageHead('Users', 'Everyone who can log on to the tenant. A user without a role sees nothing.',
      `<label>Roles <select id="user-filter">${(['all', 'none', 'some'] as const).map((f) => `<option value="${f}" ${userFilter === f ? 'selected' : ''}>${f === 'all' ? 'All' : f === 'none' ? 'Without roles' : 'With roles'}</option>`).join('')}</select></label>
       <label>Identity Provider <select disabled><option>SAP Cloud Identity Services</option></select></label>`)}
    <section class="mon-body">
      <div class="panel mon-table">
        <div class="mon-table-head"><h3>Users (${list.length})</h3><span class="spacer"></span>
          <button type="button" class="text-act" disabled title="New people join through the tickets">New</button>
          <button type="button" class="text-act" disabled>Delete</button></div>
        <div class="table-scroll"><table class="grid" id="user-list">
          <thead><tr><th>User Name</th><th>Display Name</th><th>What They Do</th><th>Roles</th><th></th></tr></thead>
          <tbody>${list.length ? list.map((p) => `<tr>
              <td class="mono">${esc(p.id.toUpperCase())}</td>
              <td><div class="person"><span class="avatar" aria-hidden="true">${esc(p.initials)}</span><div><b>${esc(p.name)}</b><span>${esc(p.title)}</span></div></div></td>
              <td class="job">${esc(p.job)}</td>
              <td class="chips">${userRolesHtml(p.id)}</td>
              <td class="row-actions"><button class="text-act" type="button" data-user="${esc(p.id)}">Edit roles</button></td>
            </tr>`).join('') : '<tr><td colspan="5" class="muted">No users match the filter.</td></tr>'}</tbody>
        </table></div>
      </div>
    </section></div>`;
  main.querySelector<HTMLSelectElement>('#user-filter')!.addEventListener('change', (e) => {
    userFilter = (e.target as HTMLSelectElement).value as typeof userFilter;
    renderSecurity(main);
  });
  main.querySelectorAll<HTMLButtonElement>('[data-user]').forEach((b) => b.addEventListener('click', () => openUserDialog(b.dataset.user!)));
}

/** Authorization Overview: one row per user, space and template, i.e. what a user may really do where. */
function renderAuthorization(main: HTMLElement) {
  const t = ctx.tenant();
  const people = visiblePeople();
  const rows: { user: string; name: string; role: string; template: string; space: string; short: string }[] = [];
  for (const p of people) {
    for (const a of t.assignments.filter((x) => x.user === p.id)) {
      if (a.role === GLOBAL_ADMIN) {
        rows.push({ user: p.id, name: p.name, role: GLOBAL_ADMIN, template: 'Global', space: '*', short: ADMIN_INFO.short });
        continue;
      }
      const role = t.roles.find((r) => r.id === a.role);
      if (!role) continue;
      for (const s of a.spaces.filter((x) => role.scope.includes(x)))
        rows.push({ user: p.id, name: p.name, role: role.id, template: templateLabel(role.template), space: s, short: TEMPLATES[role.template].short });
    }
  }
  const list = rows.filter((r) => (authUser === 'all' || r.user === authUser) && (authSpace === 'all' || r.space === authSpace || r.space === '*'));
  main.innerHTML = `<div class="mon-page">
    ${pageHead('Authorization Overview', 'What each user may do in which space, resolved from scoped roles and their assignments. Rows of data are not covered here: those are data access controls.',
      `<label>User <select id="auth-user"><option value="all">All</option>${people.map((p) => `<option value="${esc(p.id)}" ${authUser === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
       <label>Space <select id="auth-space"><option value="all">All</option>${t.spaces.map((s) => `<option value="${esc(s.id)}" ${authSpace === s.id ? 'selected' : ''}>${esc(s.id)}</option>`).join('')}</select></label>`)}
    <section class="mon-body">
      <div class="panel mon-table">
        <div class="mon-table-head"><h3>Authorizations (${list.length})</h3><span class="spacer"></span>
          <button type="button" class="text-act" id="auth-refresh">Refresh</button></div>
        <div class="table-scroll"><table class="grid" id="auth-list">
          <thead><tr><th>User</th><th>Role</th><th>Template</th><th>Space</th><th>May</th></tr></thead>
          <tbody>${list.length ? list.map((r) => `<tr>
              <td><b>${esc(r.name)}</b> <span class="mono muted">${esc(r.user.toUpperCase())}</span></td>
              <td class="mono">${esc(r.role)}</td><td>${esc(r.template)}</td>
              <td>${r.space === '*' ? '<span class="role-tag global">all spaces</span>' : spaceChip(r.space)}</td>
              <td class="job">${esc(r.short)}</td></tr>`).join('')
            : '<tr><td colspan="5" class="muted">No authorizations. Assign roles under Security › Users.</td></tr>'}</tbody>
        </table></div>
        <p class="muted mon-note">Read-only. Change roles under Users or Roles; this list follows.</p>
      </div>
    </section></div>`;
  main.querySelector<HTMLSelectElement>('#auth-user')!.addEventListener('change', (e) => {
    authUser = (e.target as HTMLSelectElement).value;
    renderSecurity(main);
  });
  main.querySelector<HTMLSelectElement>('#auth-space')!.addEventListener('change', (e) => {
    authSpace = (e.target as HTMLSelectElement).value;
    renderSecurity(main);
  });
  main.querySelector('#auth-refresh')!.addEventListener('click', () => renderSecurity(main));
}

/** Which recorded events count as activities, and how the log names them (object type, activity). */
const ACTIVITY_OF: [RegExp, string, string][] = [
  [/^create-space:(.+)$/, 'SPACE', 'CREATE'],
  [/^edit-space:(.+)$/, 'SPACE', 'UPDATE'],
  [/^unlock:(.+)$/, 'SPACE', 'UNLOCK'],
  [/^create-role:(.+)$/, 'ROLE', 'CREATE'],
  [/^edit-role:(.+)$/, 'ROLE', 'UPDATE'],
  [/^assign:(.+)$/, 'USER', 'ASSIGN_ROLES'],
  [/^create-connection:(.+)$/, 'CONNECTION', 'CREATE'],
  [/^upload-cert:(.+)$/, 'CERTIFICATE', 'UPLOAD'],
  [/^save:(.+)$/, 'REPOSITORY_OBJECT', 'SAVE'],
  [/^deploy:(.+)$/, 'REPOSITORY_OBJECT', 'DEPLOY'],
];
let activityType = 'all';

/**
 * Activities: who changed what, as the tenant logs it. The game has no clock, so the log is ordered by mission:
 * every change you made while working on a mission, newest mission first.
 */
function renderActivities(main: HTMLElement) {
  const rows: { mission: string; type: string; name: string; act: string }[] = [];
  for (const m of MISSIONS) {
    const mp = ctx.progress.missions[m.id];
    if (!mp) continue;
    const seen = new Set<string>();
    for (const ev of mp.events) {
      for (const [re, type, act] of ACTIVITY_OF) {
        const hit = re.exec(ev);
        if (!hit || seen.has(ev)) continue;
        seen.add(ev);
        rows.push({ mission: m.title, type, act, name: type === 'USER' ? hit[1].toUpperCase() : hit[1] });
      }
    }
  }
  rows.reverse();
  const types = [...new Set(ACTIVITY_OF.map((a) => a[1]))];
  const list = rows.filter((r) => activityType === 'all' || r.type === activityType);
  main.innerHTML = `<div class="mon-page">
    ${pageHead('Activities', 'Who created, changed or deployed what. Auditors read this log; you find out here who changed a role or a view before a load broke.',
      `<label>Object Type <select id="act-type"><option value="all">All</option>${types.map((t) => `<option ${activityType === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
       <label>User <select disabled><option>DATA_ARCHITECT (you)</option></select></label>`)}
    <section class="mon-body">
      <div class="panel mon-table">
        <div class="mon-table-head"><h3>Activities (${list.length})</h3><span class="spacer"></span>
          <button type="button" class="text-act" id="act-refresh">Refresh</button></div>
        <div class="table-scroll"><table class="grid" id="activity-list">
          <thead><tr><th>Mission</th><th>User</th><th>Object Type</th><th>Object Name</th><th>Activity</th></tr></thead>
          <tbody>${list.length ? list.map((r) => `<tr><td>${esc(r.mission)}</td><td class="mono">DATA_ARCHITECT</td><td>${r.type}</td>
              <td class="mono">${esc(r.name)}</td><td class="act">${r.act}</td></tr>`).join('')
            : '<tr><td colspan="5" class="muted">No activities yet.</td></tr>'}</tbody>
        </table></div>
        <p class="muted mon-note">The game keeps no clock: changes are grouped by the mission you worked on, newest first. Saves from before the activity log only show what was recorded for each mission.</p>
      </div>
    </section></div>`;
  main.querySelector<HTMLSelectElement>('#act-type')!.addEventListener('change', (e) => {
    activityType = (e.target as HTMLSelectElement).value;
    renderSecurity(main);
  });
  main.querySelector('#act-refresh')!.addEventListener('click', () => renderSecurity(main));
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

