import { ctx } from '../ctx';
import { runSql } from '../db';
import { accessError, isShared } from '../tenant';
import {
  ROLES_FOR, objectKey, findObject, type RepoObject, type SemanticUsage, type ColumnRole, type Association,
} from '../repo';
import { esc, spaceChip, openDialog, icon, ICONS } from '../ui';
import { dacCandidates, type DacAssignment } from '../dac';

/**
 * Semantic part of the SQL view editor (chapter 6+, Handbuch 6.5.3, 6.5.4):
 * the role of each output column (Attribute / Key / Measure / Parent / Child) and the associations to other entities.
 * Edits stay a draft until Save, like every other property; Deploy makes them active.
 */

export interface SemanticsDraft {
  /** Current role per column, for the columns the view returns now. */
  roles(): Record<string, ColumnRole>;
  associations(): Association[];
  /** Data access controls assigned to the view (chapter 8). */
  dacs(): DacAssignment[];
  /** New columns after a Data Preview: keep known roles, new columns become Attributes. */
  setColumns(columns: string[]): void;
  /** Semantic usage changed: roles that do not fit fall back to Attribute. */
  setUsage(usage: SemanticUsage): void;
}

/** Roles that identify an entity: what an association maps to. */
export const keyRoleOf = (usage: SemanticUsage): ColumnRole => (usage === 'Hierarchy' ? 'Child' : 'Key');

/** Entities an association may point to: deployed dimensions, texts and hierarchies of this space or shared with it. */
export function associationTargets(space: string, self?: string): RepoObject[] {
  const t = ctx.tenant();
  return t.objects.filter((o) => {
    const key = objectKey(o);
    if (key === self || !o.deployed) return false;
    if (o.space !== space && !isShared(t, key, space)) return false;
    return ['Dimension', 'Text', 'Hierarchy'].includes(o.deployed.semanticUsage ?? '');
  });
}

export function mountSemantics(host: HTMLElement, o: RepoObject, usage: SemanticUsage, readOnly: boolean): SemanticsDraft {
  let current = usage;
  let columns: string[] = Object.keys(o.columnRoles ?? {});
  const roles: Record<string, ColumnRole> = { ...(o.columnRoles ?? {}) };
  let assoc: Association[] = structuredClone(o.associations ?? []);
  let dacs: DacAssignment[] = structuredClone(o.dacs ?? []);
  const withDac = ctx.currentChapter() >= 8;
  const self = objectKey(o);

  const fit = () => {
    const allowed = ROLES_FOR[current];
    for (const c of columns) if (!roles[c] || !allowed.includes(roles[c])) roles[c] = 'Attribute';
  };

  function render() {
    fit();
    const allowed = ROLES_FOR[current];
    const title = current === 'Fact' ? 'Attributes and Measures' : current === 'Hierarchy' ? 'Hierarchy Columns' : 'Attributes';
    const canAssoc = current === 'Fact' || current === 'Dimension';
    host.innerHTML = `
      <h3>${title}</h3>
      ${columns.length
        ? `<table class="grid compact" id="column-roles"><thead><tr><th>Column</th><th>${allowed.length > 1 ? 'Role' : ''}</th></tr></thead><tbody>
          ${columns.map((c) => `<tr><td class="mono">${esc(c)}</td><td>${allowed.length > 1
            ? `<select data-col="${esc(c)}" ${readOnly ? 'disabled' : ''} aria-label="Role of ${esc(c)}">${allowed.map((r) => `<option ${roles[c] === r ? 'selected' : ''}>${r}</option>`).join('')}</select>`
            : '<span class="muted">Attribute</span>'}</td></tr>`).join('')}</tbody></table>`
        : '<p class="muted">Run the Data Preview to see the columns of this view.</p>'}
      ${current === 'Relational Dataset' ? '<p class="muted">Set the semantic usage to Fact, Dimension or Hierarchy to give columns a role.</p>' : ''}
      ${canAssoc ? `<h3 class="sem-sub">Associations</h3>
        ${assoc.length ? `<ul class="assoc-list" id="assoc-list">${assoc.map((a, i) => `<li>
            <div>${spaceChip(a.target.split('.')[0])}<span class="mono">${esc(a.target.split('.')[1])}</span></div>
            <small class="mono">${a.mapping.map((m) => `${esc(m.from)} → ${esc(m.to)}`).join(', ')}</small>
            ${readOnly ? '' : `<button type="button" class="btn small link" data-assoc-del="${i}" aria-label="Remove association to ${esc(a.target)}">Remove</button>`}
          </li>`).join('')}</ul>` : '<p class="muted">No associations yet.</p>'}
        ${readOnly ? '' : `<button type="button" class="btn small" id="assoc-add">${icon(ICONS.share)} Add Association</button>`}` : ''}
      ${withDac ? `<h3 class="sem-sub">Data Access Controls</h3>
        ${dacs.length ? `<ul class="assoc-list" id="dac-list">${dacs.map((a, i) => `<li>
            <div>${icon(ICONS.lock)}<span class="mono">${esc(a.dac.split('.')[1])}</span></div>
            <small class="mono">${Object.entries(a.mapping).map(([c, v]) => `${esc(c)} → ${esc(v)}`).join(', ')}</small>
            ${readOnly ? '' : `<button type="button" class="btn small link" data-dac-del="${i}" aria-label="Remove ${esc(a.dac)}">Remove</button>`}
          </li>`).join('')}</ul>` : '<p class="muted">No data access control. Everyone who may use the view sees all rows.</p>'}
        ${readOnly ? '' : `<button type="button" class="btn small" id="dac-assign">${icon(ICONS.lock)} Assign</button>`}` : ''}`;

    host.querySelectorAll<HTMLSelectElement>('[data-col]').forEach((sel) =>
      sel.addEventListener('change', () => {
        roles[sel.dataset.col!] = sel.value as ColumnRole;
      }),
    );
    host.querySelectorAll<HTMLButtonElement>('[data-assoc-del]').forEach((b) =>
      b.addEventListener('click', () => {
        assoc.splice(Number(b.dataset.assocDel), 1);
        render();
      }),
    );
    host.querySelector('#assoc-add')?.addEventListener('click', openAssociationDialog);
    host.querySelector('#dac-assign')?.addEventListener('click', openDacDialog);
    host.querySelectorAll<HTMLButtonElement>('[data-dac-del]').forEach((b) =>
      b.addEventListener('click', () => {
        dacs.splice(Number(b.dataset.dacDel), 1);
        render();
      }),
    );
  }

  function openAssociationDialog() {
    const targets = associationTargets(o.space, self);
    if (!columns.length) {
      const d = openDialog('Add Association', `<p class="guide-lead">Run the Data Preview first, so the view knows its columns.</p>
        <div class="guide-actions"><button class="btn primary" type="submit">OK</button></div>`);
      d.form.addEventListener('submit', (e) => {
        e.preventDefault();
        d.close();
      });
      return;
    }
    const { form, close } = openDialog('Add Association', `
      <p class="guide-lead">An association points from this view to another entity. It is not a join yet: consumers such as the
        analytic model join along it when they need the target. Cardinality: many to one (simplified in this game).</p>
      <div class="form-grid one"><label>Target
        <select name="target" id="assoc-target">
          <option value="">Select a dimension, text or hierarchy…</option>
          ${targets.map((x) => `<option value="${esc(objectKey(x))}">${esc(x.name)} · ${esc(x.deployed!.semanticUsage ?? '')} · ${esc(x.space)}</option>`).join('')}
        </select></label></div>
      ${targets.length ? '' : '<p class="muted">No deployed dimension, text or hierarchy is visible in this space yet. Share or build one first.</p>'}
      <div id="assoc-mapping"></div>
      <div class="guide-actions">
        <button class="btn link" type="button" data-act="cancel">Cancel</button>
        <button class="btn primary" type="submit">Add</button>
      </div>`);
    const mapHost = form.querySelector<HTMLElement>('#assoc-mapping')!;
    const targetSel = form.querySelector<HTMLSelectElement>('#assoc-target')!;
    const targetKeys = () => {
      const tg = findObject(ctx.tenant(), targetSel.value);
      if (!tg?.deployed) return [];
      const keyRole = keyRoleOf(tg.deployed.semanticUsage ?? 'Dimension');
      return Object.entries(tg.deployed.columnRoles ?? {}).filter(([, r]) => r === keyRole).map(([c]) => c);
    };
    targetSel.addEventListener('change', () => {
      const keys = targetKeys();
      mapHost.innerHTML = !targetSel.value ? '' : keys.length
        ? `<p class="muted">Key mapping: which column of this view holds the key of the target?</p>
           <div class="form-grid one">${keys.map((k) => `<label>${esc(k)} <small>key of the target</small>
             <select name="from" data-to="${esc(k)}">${columns.map((c) => `<option ${c.toUpperCase() === k.toUpperCase() ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>`).join('')}</div>`
        : `<p class="form-error">${esc(targetSel.value)} has no key column in its deployed version. Open it, mark its key and deploy it.</p>`;
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const keys = targetKeys();
      if (!targetSel.value || !keys.length) return;
      const mapping = [...form.querySelectorAll<HTMLSelectElement>('[name="from"]')].map((s) => ({ from: s.value, to: s.dataset.to! }));
      assoc = assoc.filter((a) => a.target !== targetSel.value).concat({ target: targetSel.value, mapping });
      ctx.track(`assoc:${self}->${targetSel.value}`);
      close();
      render();
    });
  }

  function openDacDialog() {
    const t = ctx.tenant();
    const options = dacCandidates(t, o.space);
    if (!columns.length) {
      const d = openDialog('Assign Data Access Control', `<p class="guide-lead">Run the Data Preview first, so the view knows its columns.</p>
        <div class="guide-actions"><button class="btn primary" type="submit">OK</button></div>`);
      d.form.addEventListener('submit', (e) => {
        e.preventDefault();
        d.close();
      });
      return;
    }
    const { form, close } = openDialog('Assign Data Access Control', `
      <p class="guide-lead">Map each criterion of the control to a column of this view. After deploying, a user sees only the rows
        whose values match his entries in the permissions entity. A user without entries sees nothing.</p>
      <div class="form-grid one"><label>Data Access Control
        <select id="dac-pick"><option value="">Select a deployed data access control…</option>
          ${options.map((d) => `<option value="${esc(objectKey(d))}">${esc(d.name)} · ${esc(d.deployed!.dac!.criteria.join(', '))}</option>`).join('')}
        </select></label></div>
      ${options.length ? '' : `<p class="muted">No deployed data access control in ${esc(o.space)} yet.</p>`}
      <div id="dac-mapping"></div>
      <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button><button class="btn primary" type="submit">Assign</button></div>`);
    const pick = form.querySelector<HTMLSelectElement>('#dac-pick')!;
    const host2 = form.querySelector<HTMLElement>('#dac-mapping')!;
    pick.addEventListener('change', () => {
      const def = findObject(t, pick.value)?.deployed?.dac;
      host2.innerHTML = def ? `<p class="muted">Criterion → column of this view</p><div class="form-grid one">${def.criteria.map((c) => `<label>${esc(c)}
          <select data-map="${esc(c)}" required><option value="">Select a column…</option>${columns.map((col) => `<option ${col.toUpperCase() === c.toUpperCase() ? 'selected' : ''}>${esc(col)}</option>`).join('')}</select></label>`).join('')}</div>` : '';
      update();
    });
    // No silent guess: a criterion without a column of the same name stays empty, and Assign waits until every one is mapped.
    const assign = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
    const complete = () => !!pick.value && [...form.querySelectorAll<HTMLSelectElement>('[data-map]')].every((sel) => sel.value);
    const update = () => {
      assign.disabled = !complete();
      assign.title = assign.disabled ? 'Choose a control and a column for every criterion' : '';
    };
    host2.addEventListener('change', update);
    update();
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!complete()) return;
      const mapping: Record<string, string> = {};
      form.querySelectorAll<HTMLSelectElement>('[data-map]').forEach((sel) => (mapping[sel.dataset.map!] = sel.value));
      dacs = dacs.filter((a) => a.dac !== pick.value).concat({ dac: pick.value, mapping });
      ctx.track(`dac-assign:${self}->${pick.value}`);
      close();
      render();
    });
  }

  render();
  return {
    dacs: () => dacs,
    roles: () => {
      fit();
      return Object.fromEntries(columns.map((c) => [c, roles[c]]));
    },
    associations: () => (current === 'Fact' || current === 'Dimension' ? assoc : []),
    setColumns(next) {
      if (next.join('\u0001') === columns.join('\u0001')) return;
      columns = next;
      render();
    },
    setUsage(u) {
      current = u;
      render();
    },
  };
}

/** Output columns of a view's SQL without reading data (like Validate in the real editor). Null if it does not run. */
export async function viewColumns(sql: string, space: string): Promise<string[] | null> {
  if (accessError(sql, space, ctx.tenant())) return null;
  try {
    const res = await runSql(`SELECT * FROM (${sql.trim().replace(/;\s*$/, '')}) q LIMIT 0`);
    return res.columns;
  } catch {
    return null;
  }
}
