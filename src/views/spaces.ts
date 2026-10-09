import { ctx } from '../ctx';
import { exec, listObjects } from '../db';
import { CAPACITY, NEW_SPACE_DEFAULTS, assigned, spaceIdError, storageError, sharedWith, round1, type Space } from '../tenant';
import { esc, spaceChip, layerOf, layerName, LAYER_ORDER, openDialog } from '../ui';

/** Space Management: one tile per space with storage and priority, create, edit and delete. */

export async function renderSpaces(main: HTMLElement) {
  const t = ctx.tenant();
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

  main.innerHTML = `
    <div class="view-head">
      <div><h1 class="view-title">Space Management</h1>
        <p class="view-lead">Each space has its own members, storage and priority. Objects in one space are invisible to the others
          until you share them.${canCreate ? '' : ' Creating spaces unlocks in chapter 1. For now you can look at the space IT prepared.'}</p></div>
      <button class="btn primary" type="button" id="create-space" ${canCreate ? '' : 'disabled title="Unlocks in chapter 1"'}>Create space</button>
    </div>
    <section class="panel capacity" aria-label="Tenant capacity">
      ${bar('Disk', used.diskGB, CAPACITY.diskGB)}
      ${bar('In-memory', used.memoryGB, CAPACITY.memoryGB)}
    </section>
    <div class="space-tiles" id="space-list">
      ${spaces.map((sp) => {
        const sharedIn = sharedWith(t, sp.id).length;
        const n = objectsIn(sp.id);
        return `<article class="panel space-tile" data-space-tile="${esc(sp.id)}">
          <div class="space-tile-head">${spaceChip(sp.id)}<span class="spacer"></span><span class="prio" title="Priority, 1 lowest to 5 highest">Priority ${sp.priority}</span></div>
          <h3>${esc(sp.name)}</h3>
          <p class="muted">${layerName(sp.id)} layer${sp.system ? ' · prepared by IT' : ''}</p>
          <dl class="tile-facts">
            <div><dt>Disk</dt><dd>${sp.diskGB} GB</dd></div>
            <div><dt>In-memory</dt><dd>${sp.memoryGB} GB</dd></div>
            <div><dt>Objects</dt><dd>${n}${sharedIn ? ` <small class="muted">+${sharedIn} shared in</small>` : ''}</dd></div>
          </dl>
          ${canCreate ? `<div class="tile-actions"><button class="btn small" type="button" data-edit="${esc(sp.id)}">Edit</button>
            ${sp.system ? '' : `<button class="btn small link" type="button" data-delete="${esc(sp.id)}">Delete</button>`}</div>` : ''}
        </article>`;
      }).join('')}
    </div>`;
  main.querySelector('#create-space')?.addEventListener('click', () => openSpaceDialog());
  main.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach((b) =>
    b.addEventListener('click', () => openSpaceDialog(t.spaces.find((x) => x.id === b.dataset.edit))),
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
    if (existing) Object.assign(existing, { name: sp.name, diskGB: sp.diskGB, memoryGB: sp.memoryGB, priority: sp.priority });
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
    alert(`${id} still contains ${objectCount} objects. Delete them first.`);
    return;
  }
  if (!confirm(`Delete space ${id}? Shares into this space are removed too.`)) return;
  const t = ctx.tenant();
  await exec(`DROP SCHEMA IF EXISTS "${id}"`);
  t.spaces = t.spaces.filter((s) => s.id !== id);
  t.shares = t.shares.filter((s) => s.to !== id && !s.object.startsWith(`${id}.`));
  t.roles.forEach((r) => (r.scope = r.scope.filter((x) => x !== id)));
  t.assignments.forEach((a) => (a.spaces = a.spaces.filter((x) => x !== id)));
  if (t.activeSpace === id) t.activeSpace = 'RHN_IN';
  ctx.save();
  ctx.renderView();
}
