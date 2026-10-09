import { ctx } from '../ctx';
import { objectKey, STATUS_LABEL, OBJECT_KINDS } from '../repo';
import { esc, spaceChip, icon, ICONS } from '../ui';
import { openObjectInBuilder, typeIcon, fmtStamp } from './builder';

/** Repository Explorer: search all objects of all spaces you are a member of, open them in their editor. */

const filter = { text: '', type: 'all', space: 'all' };

export function renderRepository(main: HTMLElement) {
  const t = ctx.tenant();
  main.classList.add('bleed');
  main.innerHTML = `
    <div class="re-page">
      <div class="re-top">
        <label class="search-field wide">${icon(ICONS.search)}<input id="repo-search" type="search" placeholder='Search in: "All"' value="${esc(filter.text)}" autocomplete="off" aria-label="Search business or technical name"></label>
      </div>
      <div class="re-body">
        <aside class="re-side" aria-label="Filters">
          <h3>Collection</h3>
          <button type="button" class="re-row on">${icon(ICONS.globe)} All</button>
          <button type="button" class="re-row" disabled>${icon(ICONS.sort)} Recent</button>
          <button type="button" class="re-row" disabled>${icon(ICONS.edit)} My Objects</button>
          <button type="button" class="re-row" disabled>${icon(ICONS.share)} Shared</button>
          <button type="button" class="re-row" disabled>${icon(ICONS.star)} Favorites</button>
          <h3>Space</h3>
          <button type="button" class="re-row ${filter.space === 'all' ? 'on' : ''}" data-space-filter="all">All spaces</button>
          ${t.spaces.map((s) => `<button type="button" class="re-row ${filter.space === s.id ? 'on' : ''}" data-space-filter="${esc(s.id)}">${spaceChip(s.id)}</button>`).join('')}
        </aside>
        <section class="re-main db-list">
          <div class="list-toolbar repo-filters">
            <label>Type <select id="repo-type">
              ${[['all', 'All types'], ...OBJECT_KINDS.map((k) => [k, k])].map(([v, l]) => `<option value="${v}" ${filter.type === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select></label>
            <label>Space <select id="repo-space">
              <option value="all">All spaces</option>
              ${t.spaces.map((s) => `<option ${filter.space === s.id ? 'selected' : ''}>${esc(s.id)}</option>`).join('')}
            </select></label>
            <span class="spacer"></span>
            <button type="button" class="tb-icon" disabled title="Sort">${icon(ICONS.sort)}</button>
            <button type="button" class="tb-icon" disabled title="Settings">${icon(ICONS.gear)}</button>
          </div>
          <div class="list-in">Search In: <span class="globe">${icon(ICONS.globe)}</span><b>All</b> <span class="muted" id="repo-count"></span></div>
          <div class="table-scroll"><table class="grid object-table" id="repo-list">
            <thead><tr><th>Business Name</th><th>Technical Name</th><th>Type (Semantic Usage)</th><th>Space</th><th>Status</th><th>Changed On</th></tr></thead>
            <tbody></tbody>
          </table></div>
        </section>
      </div>
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
    count.textContent = `(${rows.length} of ${t.objects.length})`;
    body.innerHTML = rows.length
      ? rows.map((o) => `<tr>
          <td><button type="button" class="link-btn" data-open="${esc(objectKey(o))}">${typeIcon(o)}${esc(o.businessName)}</button></td>
          <td>${esc(o.name)}</td>
          <td>${esc(o.kind)}${o.kind === 'Analytic Model' || o.kind === 'Replication Flow' ? '' : ` <span class="muted">(${esc(o.semanticUsage)})</span>`}</td>
          <td>${esc(o.space)}</td>
          <td><span class="status" data-status="${o.status}">${STATUS_LABEL[o.status]}</span></td>
          <td>${fmtStamp(o.changedAt)}</td></tr>`).join('')
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
  const setSpace = (v: string) => {
    filter.space = v;
    ctx.track(`filter:repository:space:${filter.space}`);
    main.querySelector<HTMLSelectElement>('#repo-space')!.value = v;
    main.querySelectorAll<HTMLElement>('[data-space-filter]').forEach((b) => b.classList.toggle('on', b.dataset.spaceFilter === v));
    draw();
  };
  main.querySelector<HTMLSelectElement>('#repo-space')!.addEventListener('change', (e) => setSpace((e.target as HTMLSelectElement).value));
  main.querySelectorAll<HTMLButtonElement>('[data-space-filter]').forEach((b) => b.addEventListener('click', () => setSpace(b.dataset.spaceFilter!)));
}
