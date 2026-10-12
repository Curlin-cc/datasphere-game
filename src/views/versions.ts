import { ctx } from '../ctx';
import { objectKey, restoreVersion, type ObjectVersion, type RepoObject } from '../repo';
import { PEOPLE } from '../content/people';
import { esc, openDialog, toast } from '../ui';

/**
 * Versions of a SQL view (excursions, Handbuch 11.4.9): "Versions" in the editor toolbar opens the version history.
 * Every deployment is a version. A version can be viewed, compared with the deployed one, and restored; a restored version
 * is the design-time state and is completed with Save or Deploy (SAP help). SAP has no compare: a version opens read-only in a new
 * tab. The line diff is a game aid.
 */

/** Line diff (longest common subsequence): which lines of `a` are gone and which of `b` are new. */
export function lineDiff(a: string, b: string): { kind: 'same' | 'del' | 'add'; text: string }[] {
  const x = a.replace(/\r/g, '').split('\n');
  const y = b.replace(/\r/g, '').split('\n');
  const n = x.length, m = y.length;
  const L = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = x[i] === y[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out: { kind: 'same' | 'del' | 'add'; text: string }[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) out.push({ kind: 'same', text: x[i++] }), j++;
    else if (L[i + 1][j] >= L[i][j + 1]) out.push({ kind: 'del', text: x[i++] });
    else out.push({ kind: 'add', text: y[j++] });
  }
  while (i < n) out.push({ kind: 'del', text: x[i++] });
  while (j < m) out.push({ kind: 'add', text: y[j++] });
  return out;
}

const who = (id: string) => {
  const p = PEOPLE.find((x) => x.id.toUpperCase() === id);
  return p ? `${p.name} (${id})` : id === 'DATA_ARCHITECT' ? 'You (DATA_ARCHITECT)' : id;
};
const when = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: false });
};

/** Opens the version history of a SQL view. `canRestore` is false for shared (read-only) views. */
export function openVersions(o: RepoObject, canRestore: boolean, onRestored: () => void) {
  const key = objectKey(o);
  const list = [...(o.versions ?? [])].reverse();
  const deployedSql = o.deployed?.sql ?? '';
  const active = list.find((v) => v.sql === deployedSql);
  let selected: ObjectVersion | undefined = list[0];
  ctx.track(`versions:${key}`);
  const { form, close } = openDialog(`Version History: ${o.name}`, `
    <p class="guide-lead">Every deployment is a version (a real tenant lists up to the last 500). Restore one if a change went wrong, then deploy it.
      The comparison with what runs now is a game aid: a real tenant opens a version read-only in a new tab instead.
      Versions stay in this tenant; other tenants get changes by transport.</p>
    <div class="ver-wrap">
      <ul class="ver-list" id="version-list"></ul>
      <div class="ver-pane" id="version-pane"></div>
    </div>
    <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Close</button>
      <button class="btn primary" type="button" id="version-restore" ${canRestore ? '' : 'disabled title="Shared from another space: read-only"'}>Restore</button></div>`, 'versions-dlg');
  const draw = () => {
    form.querySelector('#version-list')!.innerHTML = list.length
      ? list.map((v) => `<li><button type="button" data-version="${v.no}" ${v === selected ? 'aria-current="true"' : ''}>
          <b>Version ${v.no}</b>${v === active ? ' <span class="ver-tag">Deployed</span>' : ''}
          <small>${esc(when(v.at))}</small><small>${esc(who(v.by))}</small></button></li>`).join('')
      : '<li class="muted">No versions yet. The first deployment creates version 1.</li>';
    const pane = form.querySelector<HTMLElement>('#version-pane')!;
    if (!selected) {
      pane.innerHTML = '<p class="muted">Deploy the view to start its history.</p>';
    } else {
      const diff = lineDiff(deployedSql.trim(), selected.sql.trim());
      const same = diff.every((d) => d.kind === 'same');
      pane.innerHTML = `<h3>Version ${selected.no} <small class="muted">${esc(selected.businessName)}</small></h3>
        <p class="muted">${same ? 'Same SQL as the deployed version.' : 'Compared with the deployed version: <span class="diff-del">− deployed now</span> <span class="diff-add">+ this version</span>'}</p>
        <pre class="ver-diff" id="version-diff">${diff.map((d) => `<span class="dl ${d.kind}">${d.kind === 'add' ? '+' : d.kind === 'del' ? '−' : ' '} ${esc(d.text)}</span>`).join('')}</pre>`;
    }
    const restore = form.querySelector<HTMLButtonElement>('#version-restore')!;
    if (canRestore) restore.disabled = !selected || selected === active;
    form.querySelectorAll<HTMLButtonElement>('[data-version]').forEach((b) =>
      b.addEventListener('click', () => {
        selected = list.find((v) => v.no === Number(b.dataset.version));
        ctx.track(`version-view:${key}:${b.dataset.version}`);
        draw();
      }),
    );
  };
  form.addEventListener('submit', (e) => e.preventDefault());
  form.querySelector('#version-restore')!.addEventListener('click', () => {
    if (!selected || !canRestore) return;
    restoreVersion(o, selected);
    if (ctx.sqlOwner === key) ctx.sql = o.sql ?? '';
    ctx.track(`version-restore:${key}:${selected.no}`);
    ctx.save();
    close();
    toast(`Version ${selected.no} restored into the editor. Deploy to make it active.`);
    onRestored();
  });
  draw();
}
