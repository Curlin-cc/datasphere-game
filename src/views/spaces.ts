import { ctx } from '../ctx';
import { exec, listObjects } from '../db';
import { CAPACITY, NEW_SPACE_DEFAULTS, assigned, spaceIdError, storageError, sharedWith, round1, type Space } from '../tenant';
import { esc, spaceChip, layerOf, layerName, LAYER_ORDER, openDialog, toast, icon, ICONS, ask, tell } from '../ui';
import { usedMB, fmtSize } from './welcome';
import { EXCURSIONS } from '../content/chapters';
import { dbUserError, dbUserName, readableByDbUser, DB_HOST, DB_PORT } from '../consumption';
import { ecnSideHtml, bindEcnSide, ecnNodeHtml, bindEcnNode, takeEcnRequest } from './ecn';

/** Elastic compute node opened in the side column ('' = the space list). */
let openNode = '';

/** Space Management: one tile per space with storage and priority, create, edit and delete. */

export async function renderSpaces(main: HTMLElement) {
  const t = ctx.tenant();
  const req = takeEcnRequest();
  if (req) openNode = req;
  const node = t.extras.ecns.find((e) => e.name === openNode);
  if (!node) openNode = '';
  const deployed = await listObjects();
  const canCreate = ctx.currentChapter() >= 1;
  const used = assigned(t);
  const bar = (label: string, used: number, cap: number) => `
    <div class="capacity-item">
      <div class="capacity-head"><b>${label}</b><span>${used} of ${cap} GB assigned, ${round1(cap - used)} GB free</span></div>
      <div class="capacity-bar"><span style="width:${Math.min(100, (used / cap) * 100)}%"></span></div>
    </div>`;
  const spaces = [...t.spaces].sort(
    (x, y) => LAYER_ORDER.indexOf(layerOf(x.id)) - LAYER_ORDER.indexOf(layerOf(y.id)) || x.id.localeCompare(y.id),
  );
  const objectsIn = (id: string) => Math.max(t.objects.filter((o) => o.space === id).length, deployed.filter((o) => o.schema === id).length);

  const healthy = spaces.filter((sp) => !sp.locked).length;
  const locked = spaces.length - healthy;
  const barRow = (label: string, usedMb: number, capGb: number) => {
    const pct = Math.min(100, (usedMb / (capGb * 1024)) * 100);
    return `<small>${label}</small><span>${fmtSize(usedMb)} of ${capGb} GB</span>
      <span class="bar ${pct >= 100 ? 'over' : ''}"><i style="width:${Math.max(2, pct).toFixed(1)}%"></i></span>`;
  };
  main.classList.add('bleed');
  main.innerHTML = `
    <div class="sm-page">
      <aside class="sm-side" aria-label="Spaces overview">
        ${canCreate ? '' : `<div class="msg warn">${icon(ICONS.info)}<span>Creating spaces unlocks in chapter 1. For now you can look at the space IT prepared.</span></div>`}
        <div class="sm-box"><h3>Spaces</h3>
          <button type="button" class="sm-row ${node ? '' : 'on'}" id="sm-all">All Spaces<b>${spaces.length}</b>${icon(ICONS.right)}</button>
          <button type="button" class="sm-row" disabled>Recycle Bin<b>0</b>${icon(ICONS.right)}</button></div>
        ${ctx.currentChapter() >= 9 || t.extras.ecns.length ? ecnSideHtml(openNode, ctx.currentChapter() >= 9) : ''}
        <section class="sm-box capacity" aria-label="Tenant capacity"><h3>Tenant Capacity</h3>
          ${bar('Disk', used.diskGB, CAPACITY.diskGB)}
          ${bar('In-memory', used.memoryGB, CAPACITY.memoryGB)}
        </section>
      </aside>
      <section class="sm-main">${node ? `<div class="ecn-node" id="ecn-node">${ecnNodeHtml(node)}</div>` : `
        <div class="sm-head"><h1>Spaces <span>(${spaces.length})</span></h1>
          <span class="sm-counts"><span class="ok" title="Healthy">${icon(ICONS.check)} ${healthy}</span><span class="bad" title="Locked">${icon(ICONS.lock)} ${locked}</span></span></div>
        <div class="sm-toolbar">
          <button class="btn small link" type="button" id="create-space" ${canCreate ? '' : 'disabled title="Unlocks in chapter 1"'}>${icon(ICONS.plus)} Create</button>
          <span class="spacer"></span>
          <button class="btn small link" type="button" disabled>Edit</button><button class="btn small link" type="button" disabled>Delete</button>
          <button class="btn small link" type="button" disabled>Lock</button><button class="btn small link" type="button" disabled>Unlock</button>
          <button class="btn small link" type="button" disabled>Monitor</button>
        </div>
        <p class="muted sm-lead">Each space has its own members, storage and priority. Objects in one space are invisible to the others until you share them.</p>
        <div class="space-tiles" id="space-list">
          ${spaces.map((sp) => {
            const sharedIn = sharedWith(t, sp.id).length;
            const n = objectsIn(sp.id);
            const mb = usedMB(t, sp.id);
            return `<article class="space-tile ${sp.locked ? 'is-locked' : ''}" data-space-tile="${esc(sp.id)}">
              <div class="st-top"><div><h3>${esc(sp.name)}</h3><span class="sc-id">${spaceChip(sp.id)}${layerName(sp.id)} layer${sp.system ? ' · prepared by IT' : ''}</span></div>
                <input type="checkbox" aria-label="Select ${esc(sp.id)}"></div>
              <span class="st-status ${sp.locked ? 'bad' : 'ok'}">${sp.locked ? `${icon(ICONS.lock)} Locked` : 'Healthy'}</span>
              <span class="muted st-meta">Priority ${sp.priority} · ${n} ${n === 1 ? 'object' : 'objects'}${sharedIn ? `, +${sharedIn} shared in` : ''}</span>
              <div class="sc-body">${barRow('Disk for Storage:', sp.usedDiskGB !== undefined ? sp.usedDiskGB * 1024 : mb, sp.diskGB)}</div>
              <div class="sc-body">${barRow('Memory for Storage:', Math.round(mb * 0.35), sp.memoryGB)}</div>
              ${sp.locked ? `<p class="lock-note">Exceeds its disk storage. No data can be loaded or deployed until it has enough storage and is unlocked.</p>` : ''}
              <div class="st-foot"><span class="chip">Datasphere Game</span><span class="spacer"></span>
                ${canCreate ? `${sp.system ? '' : `<button class="btn small link" type="button" data-delete="${esc(sp.id)}">Delete</button>`}
                ${sp.locked ? `<button class="btn small primary" type="button" data-unlock="${esc(sp.id)}">Unlock</button>` : ''}
                ${ctx.currentChapter() >= EXCURSIONS ? `<button class="btn small" type="button" data-dbaccess="${esc(sp.id)}">Database Access</button>` : ''}
                <button class="btn small" type="button" data-edit="${esc(sp.id)}">Edit</button>` : ''}</div>
            </article>`;
          }).join('')}
        </div>`}
      </section>
    </div>`;
  const rerender = () => renderSpaces(main);
  main.querySelector('#sm-all')?.addEventListener('click', () => { openNode = ''; rerender(); });
  bindEcnSide(main, (n) => { openNode = n; rerender(); }, rerender);
  if (node) bindEcnNode(main, node, rerender, () => { openNode = ''; rerender(); });
  main.querySelector('#create-space')?.addEventListener('click', () => openSpaceDialog());
  main.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach((b) =>
    b.addEventListener('click', () => openSpaceDialog(t.spaces.find((x) => x.id === b.dataset.edit))),
  );
  main.querySelectorAll<HTMLButtonElement>('[data-dbaccess]').forEach((b) => b.addEventListener('click', () => openDbAccess(b.dataset.dbaccess!)));
  main.querySelectorAll<HTMLButtonElement>('[data-unlock]').forEach((b) =>
    b.addEventListener('click', () => {
      const sp = t.spaces.find((x) => x.id === b.dataset.unlock)!;
      if ((sp.usedDiskGB ?? 0) > sp.diskGB) {
        toast(`${sp.id} still uses ${sp.usedDiskGB} GB of ${sp.diskGB} GB disk. Assign more storage first (or delete data), then unlock.`, 'error');
        return;
      }
      sp.locked = false;
      ctx.track(`unlock:${sp.id}`);
      ctx.save();
      toast(`${sp.id} unlocked`);
      renderSpaces(main);
    }),
  );
  main.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach((b) =>
    b.addEventListener('click', () => deleteSpace(b.dataset.delete!, objectsIn(b.dataset.delete!))),
  );
}

function openSpaceDialog(existing?: Space) {
  const t = ctx.tenant();
  const v = existing ?? { id: '', name: '', ...NEW_SPACE_DEFAULTS };
  const free = (k: 'diskGB' | 'memoryGB') => round1(CAPACITY[k] - assigned(t, existing?.id)[k]);
  const { form, close } = openDialog(existing ? `Edit space ${existing.id}` : 'Create space', `
    <p class="guide-lead">${existing ? 'The space ID cannot be changed. Name, storage and priority can.' : 'The space ID is the technical name. It cannot be changed later, so choose it carefully.'}</p>
    <div class="form-grid">
      <label>Space name <small>max. 30 characters, shown to business users</small>
        <input name="name" maxlength="30" value="${esc(v.name)}" autocomplete="off"></label>
      <label>Space ID <small>max. 20 characters: A–Z, 0–9, _</small>
        <input name="id" maxlength="20" value="${esc(v.id)}" ${existing ? 'readonly' : ''} autocomplete="off" spellcheck="false"></label>
      <label>Disk (GB) <small>${free('diskGB')} GB free in the tenant</small>
        <input name="disk" type="number" min="0.1" step="0.1" value="${v.diskGB}"></label>
      <label>In-memory (GB) <small>${free('memoryGB')} GB free in the tenant</small>
        <input name="memory" type="number" min="0.1" step="0.1" value="${v.memoryGB}"></label>
      <label>Priority <small>1 lowest, 5 highest</small>
        <select name="priority">${[1, 2, 3, 4, 5].map((p) => `<option ${p === v.priority ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
    </div>
    <p class="form-error" role="alert"></p>
    <div class="guide-actions">
      <button class="btn link" type="button" data-act="cancel">Cancel</button>
      <button class="btn primary" type="submit">${existing ? 'Save' : 'Create'}</button>
    </div>`);
  const field = (n: string) => form.querySelector<HTMLInputElement>(`[name="${n}"]`)!;
  // Suggest the ID from the name, the way the real dialog does, until the player edits the ID.
  let idTouched = !!existing;
  field('id').addEventListener('input', () => {
    idTouched = true;
    field('id').value = field('id').value.toUpperCase();
  });
  field('name').addEventListener('input', () => {
    if (!idTouched) field('id').value = field('name').value.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 20);
  });
  field('name').focus();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const sp: Space = {
      id: field('id').value.trim(),
      name: field('name').value.trim(),
      diskGB: round1(Number(field('disk').value)),
      memoryGB: round1(Number(field('memory').value)),
      priority: Number(form.querySelector<HTMLSelectElement>('[name="priority"]')!.value),
    };
    const err = (!sp.name ? 'Enter a space name.' : null) ?? (existing ? null : spaceIdError(sp.id, t)) ?? storageError(sp, t);
    if (err) {
      form.querySelector('.form-error')!.textContent = err;
      return;
    }
    if (existing && existing.usedDiskGB !== undefined && sp.diskGB < existing.usedDiskGB && !existing.locked) {
      form.querySelector('.form-error')!.textContent = `${existing.id} already uses ${existing.usedDiskGB} GB. Less disk would lock the space.`;
      return;
    }
    if (existing) {
      Object.assign(existing, { name: sp.name, diskGB: sp.diskGB, memoryGB: sp.memoryGB, priority: sp.priority });
      ctx.track(`edit-space:${existing.id}`);
      // With the values, so a tutorial step can wait for a sizing that fits the ticket.
      ctx.track(`edit-space-values:${existing.id}:${sp.diskGB}:${sp.memoryGB}:${sp.priority}`);
    }
    else {
      await exec(`CREATE SCHEMA IF NOT EXISTS "${sp.id}"`);
      t.spaces.push(sp);
      ctx.track(`create-space:${sp.id}`);
    }
    ctx.save();
    close();
    ctx.renderView();
  });
}

async function deleteSpace(id: string, objectCount: number) {
  if (objectCount > 0) {
    await tell(`${id} still contains ${objectCount} objects. Delete them first.`);
    return;
  }
  if (!await ask(`Delete space ${id}? Shares into this space are removed too.`)) return;
  const t = ctx.tenant();
  await exec(`DROP SCHEMA IF EXISTS "${id}"`);
  t.spaces = t.spaces.filter((s) => s.id !== id);
  t.shares = t.shares.filter((s) => s.to !== id && !s.object.startsWith(`${id}.`));
  t.roles.forEach((r) => (r.scope = r.scope.filter((x) => x !== id)));
  t.assignments.forEach((a) => (a.spaces = a.spaces.filter((x) => x !== id)));
  if (t.activeSpace === id) t.activeSpace = 'RHN_ENTRY';
  ctx.save();
  ctx.renderView();
}

/**
 * Database Access of a space (excursions, Handbuch 12.6): database users for external tools.
 * Read access reads the exposed views of the space; write access adds an Open SQL schema the tool can write to.
 */
function openDbAccess(space: string) {
  const t = ctx.tenant();
  ctx.track(`dbaccess:${space}`);
  const users = t.dbUsers.filter((u) => u.space === space);
  const readable = readableByDbUser(t, space);
  const { form, close } = openDialog(`Database Access · ${space}`, `
    <p class="guide-lead">Database users let tools outside SAP, such as Power BI or Excel via ODBC, log on to the database of this space.
      They read only the views of ${esc(space)} that are <b>exposed for consumption</b> and deployed${readable.length ? `: ${readable.map((o) => `<code>${esc(o.name)}</code>`).join(', ')}` : ' (none yet)'}.
      If such a view has a data access control, the database user counts as a user too: it sees only the rows its name (${esc(space)}#SUFFIX) has in the permissions table, and no rows without an entry.</p>
    <h3>Database Users (${users.length})</h3>
    ${users.length ? `<table class="grid compact" id="db-users"><thead><tr><th>Database User Name</th><th>Read Access</th><th>Write Access</th><th></th></tr></thead><tbody>
      ${users.map((u) => `<tr><td class="mono">${esc(dbUserName(u))}</td><td>${u.read ? 'Yes' : 'No'}</td><td>${u.write ? 'Yes' : 'No'}</td>
        <td><button class="btn small link" type="button" data-dbdel="${esc(u.suffix)}">Delete</button></td></tr>`).join('')}</tbody></table>
      <p class="muted">Connection details for the tool: host <code>${DB_HOST}</code>, port <code>${DB_PORT}</code>, the user name above and its password
        (shown once after creation; simulated here). Many tenants also need the tool's IP address in the IP allowlist.</p>`
    : '<p class="muted">No database users yet.</p>'}
    <h3>Create Database User</h3>
    <div class="form-grid">
      <label>Database User Name Suffix <small>A–Z, 0–9, _; the user is called ${esc(space)}#SUFFIX</small>
        <input name="suffix" maxlength="30" autocomplete="off" spellcheck="false"></label>
    </div>
    <div class="db-opts">
      <label class="check-line"><input type="checkbox" name="read"><span><b>Enable Read Access (SQL)</b><small>reads the exposed views of the space</small></span></label>
      <label class="check-line"><input type="checkbox" name="write"><span><b>Enable Write Access (SQL, DDL, DML)</b><small>creates and fills tables in its own Open SQL schema</small></span></label>
    </div>
    <p class="form-error" role="alert"></p>
    <div class="guide-actions">
      <button class="btn link" type="button" data-act="cancel">Close</button>
      <button class="btn primary" type="submit" id="db-create">Create</button>
    </div>`);
  const suffix = form.querySelector<HTMLInputElement>('[name="suffix"]')!;
  suffix.addEventListener('input', () => (suffix.value = suffix.value.toUpperCase()));
  form.querySelectorAll<HTMLButtonElement>('[data-dbdel]').forEach((b) => b.addEventListener('click', () => {
    t.dbUsers = t.dbUsers.filter((u) => !(u.space === space && u.suffix === b.dataset.dbdel));
    ctx.track(`dbuser-delete:${space}#${b.dataset.dbdel}`);
    ctx.save();
    close();
    openDbAccess(space);
  }));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const sfx = suffix.value.trim();
    const read = form.querySelector<HTMLInputElement>('[name="read"]')!.checked;
    const write = form.querySelector<HTMLInputElement>('[name="write"]')!.checked;
    const err = dbUserError(space, sfx, t) ?? (read || write ? null : 'Give the user read access, write access or both; without either it can do nothing.');
    if (err) {
      form.querySelector('.form-error')!.textContent = err;
      return;
    }
    t.dbUsers.push({ space, suffix: sfx, read, write, createdAt: new Date().toISOString() });
    ctx.track(`dbuser:${space}#${sfx}:${read ? 'r' : ''}${write ? 'w' : ''}`);
    ctx.save();
    toast(`Database user ${space}#${sfx} created`);
    close();
    openDbAccess(space);
  });
}
