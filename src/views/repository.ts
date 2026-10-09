import { ctx } from '../ctx';
import { objectKey, STATUS_LABEL } from '../repo';
import { esc, spaceChip, icon, ICONS, fmtDate } from '../ui';
import { openObjectInBuilder } from './builder';

/** Repository Explorer: search all objects of all spaces you are a member of, open them in their editor. */

const filter = { text: '', type: 'all', space: 'all' };

export function renderRepository(main: HTMLElement) {
  const t = ctx.tenant();
  main.innerHTML = `
    <h1 class="view-title">Repository Explorer</h1>
    <p class="view-lead">Every object in every space you are a member of, in one list. Search by business or technical name,
      filter, and open an object in its editor.</p>
    <div class="repo-filters">
      <label class="search">${icon('<circle cx="7" cy="7" r="4"/><path d="M10 10l3.5 3.5"/>')}
        <input id="repo-search" type="search" placeholder="Search business or technical name" value="${esc(filter.text)}" autocomplete="off"></label>
      <label>Type <select id="repo-type">
        ${[['all', 'All types'], ['Local Table', 'Local Table'], ['SQL View', 'SQL View']].map(([v, l]) => `<option value="${v}" ${filter.type === v ? 'selected' : ''}>${l}</option>`).join('')}
      </select></label>
      <label>Space <select id="repo-space">
        <option value="all">All spaces</option>
        ${t.spaces.map((s) => `<option ${filter.space === s.id ? 'selected' : ''}>${esc(s.id)}</option>`).join('')}
      </select></label>
      <span class="spacer"></span>
      <span class="muted" id="repo-count"></span>
    </div>
    <div class="panel">
      <div class="table-scroll"><table class="grid" id="repo-list">
        <thead><tr><th>Business Name</th><th>Technical Name</th><th>Type</th><th>Space</th><th>Status</th><th>Changed On</th></tr></thead>
        <tbody></tbody>
      </table></div>
    </div>`;

  const body = main.querySelector<HTMLElement>('#repo-list tbody')!;
  const count = main.querySelector<HTMLElement>('#repo-count')!;
  const draw = () => {
    const q = filter.text.trim().toLowerCase();
    const rows = t.objects.filter(
      (o) =>
        (filter.type === 'all' || o.kind === filter.type) &&
        (filter.space === 'all' || o.space === filter.space) &&
        (!q || o.name.toLowerCase().includes(q) || o.businessName.toLowerCase().includes(q)),
    );
    count.textContent = `${rows.length} of ${t.objects.length} objects`;
    body.innerHTML = rows.length
      ? rows.map((o) => `<tr>
          <td><button type="button" class="link-btn" data-open="${esc(objectKey(o))}">${esc(o.businessName)}</button></td>
          <td class="mono">${esc(o.name)}</td>
          <td>${icon(o.kind === 'SQL View' ? ICONS.view : ICONS.table, 'type-ic')}${o.kind}</td>
          <td>${spaceChip(o.space)}</td>
          <td><span class="status" data-status="${o.status}">${STATUS_LABEL[o.status]}</span></td>
          <td class="muted">${fmtDate(o.changedAt)}</td></tr>`).join('')
      : `<tr><td colspan="6" class="muted">Nothing matches your search.</td></tr>`;
    body.querySelectorAll<HTMLButtonElement>('[data-open]').forEach((b) =>
      b.addEventListener('click', () => {
        ctx.track(`open:${b.dataset.open}`);
        ctx.track(`repository-open:${b.dataset.open}`);
        openObjectInBuilder(b.dataset.open!);
        ctx.setView('builder');
      }),
    );
  };
  draw();

  let timer = 0;
  main.querySelector<HTMLInputElement>('#repo-search')!.addEventListener('input', (e) => {
    filter.text = (e.target as HTMLInputElement).value;
    draw();
    clearTimeout(timer);
    timer = window.setTimeout(() => filter.text.trim().length >= 2 && ctx.track(`search:repository:${filter.text.trim().toLowerCase()}`), 400);
  });
  main.querySelector<HTMLSelectElement>('#repo-type')!.addEventListener('change', (e) => {
    filter.type = (e.target as HTMLSelectElement).value;
    ctx.track(`filter:repository:type:${filter.type}`);
    draw();
  });
  main.querySelector<HTMLSelectElement>('#repo-space')!.addEventListener('change', (e) => {
    filter.space = (e.target as HTMLSelectElement).value;
    ctx.track(`filter:repository:space:${filter.space}`);
    draw();
  });
}
