import './styles.css';
import { initDb, exec, runSql, listObjects } from './db';
import { generateDataset, datasetToSql } from './data/generator';
import { createSqlEditor, type SqlEditor } from './editor';
import { CHAPTERS, RANKS, GLOSSARY } from './content/chapters';

type ViewId = 'home' | 'spaces' | 'builder' | 'security' | 'monitor' | 'glossary';

interface NavItem {
  id: ViewId;
  label: string;
  icon: string;
  unlockChapter?: number;
}

const NAV: NavItem[] = [
  { id: 'home', label: 'Home', icon: '<path d="M3 8l5-4 5 4v5H3z"/>' },
  { id: 'spaces', label: 'Space Management', icon: '<rect x="2.5" y="2.5" width="11" height="11" rx="1.5"/><path d="M2.5 7h11"/>', unlockChapter: 1 },
  { id: 'builder', label: 'Data Builder', icon: '<path d="M3 4h10M3 8h10M3 12h6"/>' },
  { id: 'security', label: 'Security', icon: '<path d="M8 2l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V4z"/>', unlockChapter: 2 },
  { id: 'monitor', label: 'Data Integration Monitor', icon: '<path d="M2 12l3-4 3 2 3-5 3 3"/>', unlockChapter: 3 },
];
const NAV_BOTTOM: NavItem[] = [{ id: 'glossary', label: 'Glossary', icon: '<path d="M4 2.5h7.5v11H4a1.5 1.5 0 010-3h7.5"/>' }];

/** Space name → layer key for colour coding. */
function layerOf(space: string): 'in' | 'ha' | 'rep' | undefined {
  if (space.endsWith('_IN')) return 'in';
  if (space.endsWith('_HARM')) return 'ha';
  if (space.endsWith('_REP')) return 'rep';
  return undefined;
}

const state = {
  view: 'builder' as ViewId,
  currentChapter: 0,
  xp: 0,
  sql: `-- Ctrl+Enter runs the query\nSELECT *\nFROM RHN_IN.BILLING_CONTRACTS\nLIMIT 20;`,
  hintsOpen: 0,
};

let editor: SqlEditor | null = null;
const app = document.querySelector<HTMLDivElement>('#app')!;

const esc = (v: unknown) =>
  String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

// ---------------------------------------------------------------- frame

function renderFrame() {
  app.innerHTML = `
    <div class="app">
      <div class="brand"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>Datasphere Game</div>
      <header class="topbar">
        <span class="tenant">Stadtwerke Rheinau<small>training tenant</small></span>
        <span class="spacer"></span>
        <span class="rank" title="Earn experience by solving missions with few hints">
          <strong>${esc(RANKS[0])}</strong>
          <span class="xp-bar" aria-label="Experience ${state.xp} of 100"><span style="width:${state.xp}%"></span></span>
          <span>${state.xp} XP</span>
        </span>
        <button class="icon-btn" id="theme-toggle" type="button">Theme</button>
      </header>
      <nav class="nav" aria-label="Main">
        ${NAV.map(navButton).join('')}
        <div class="nav-sep"></div>
        ${NAV_BOTTOM.map(navButton).join('')}
      </nav>
      <main class="main" id="main"></main>
      <aside class="mission" id="mission" aria-label="Current mission"></aside>
    </div>`;

  app.querySelectorAll<HTMLButtonElement>('.nav button').forEach((b) =>
    b.addEventListener('click', () => {
      if (editor) state.sql = editor.getValue();
      state.view = b.dataset.view as ViewId;
      renderFrame();
    }),
  );
  app.querySelector('#theme-toggle')!.addEventListener('click', toggleTheme);
  renderView();
  renderMission();
}

function navButton(item: NavItem) {
  const locked = item.unlockChapter !== undefined && item.unlockChapter > state.currentChapter;
  return `<button type="button" data-view="${item.id}" ${state.view === item.id ? 'aria-current="page"' : ''}>
    <svg viewBox="0 0 16 16" aria-hidden="true">${item.icon}</svg>${esc(item.label)}
    ${locked ? `<span class="lock" title="Unlocks in chapter ${item.unlockChapter}" aria-label="Locked until chapter ${item.unlockChapter}"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6.5" rx="1"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/></svg></span>` : ''}
  </button>`;
}

function toggleTheme() {
  const root = document.documentElement;
  const isDark =
    root.dataset.theme === 'dark' ||
    (!root.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = isDark ? 'light' : 'dark';
  try {
    localStorage.setItem('dsg-theme', root.dataset.theme);
  } catch {
    /* storage unavailable: theme lasts for this visit only */
  }
}

// ---------------------------------------------------------------- views

function renderView() {
  const main = document.querySelector<HTMLElement>('#main')!;
  main.classList.toggle('flush', state.view === 'builder');
  editor = null;
  switch (state.view) {
    case 'home':
      return renderHome(main);
    case 'builder':
      return renderBuilder(main);
    case 'spaces':
      return renderSpaces(main);
    case 'glossary':
      return renderGlossary(main);
    case 'security':
      return renderLocked(main, 'Security', 2, 'Users, scoped roles and data access controls live here. You set them up for the first time in chapter 2.');
    case 'monitor':
      return renderLocked(main, 'Data Integration Monitor', 3, 'Replication flows, persisted views and task chains report their runs here once you build them in chapter 3.');
  }
}

function renderHome(main: HTMLElement) {
  main.innerHTML = `
    <h1 class="view-title">Welcome to Stadtwerke Rheinau</h1>
    <p class="view-lead">The board wants one trusted view of revenue, consumption and receivables per grid area.
      You are the new data architect. Build the Datasphere landscape that delivers it, one ticket at a time.</p>
    <div class="home-grid">
      <section class="panel" aria-label="Learning path">
        <ol class="path">
          ${CHAPTERS.map(
            (c) => `<li class="${c.nr === state.currentChapter ? 'current' : ''}">
              <span class="num">${c.nr}</span>
              <span><span class="t">${esc(c.title)}</span><br><span class="d">${esc(c.summary)}</span></span>
              <span class="state">${c.nr === state.currentChapter ? 'Current' : c.nr < state.currentChapter ? 'Done' : 'Locked'}</span>
            </li>`,
          ).join('')}
        </ol>
      </section>
      <section class="panel arch" aria-label="Target architecture">
        <h3>What you will build</h3>
        <div class="arch-stack">
          <div class="arch-layer" style="--c:var(--layer-in)"><b>RHN_IN</b>Inbound layer<br><span>Source data 1:1, tagged with its source system</span></div>
          <div class="arch-layer dim" style="--c:var(--layer-ha)"><b>RHN_HARM</b>Harmonization layer<br><span>Cleaned, unified and reusable views</span></div>
          <div class="arch-layer dim" style="--c:var(--layer-rep)"><b>RHN_REP</b>Reporting layer<br><span>Facts, dimensions, analytic models and access controls</span></div>
        </div>
        <p class="arch-note">Only the inbound space exists so far. You create the others in chapter 1.</p>
      </section>
    </div>`;
}

async function renderSpaces(main: HTMLElement) {
  const objects = await listObjects();
  const spaces = [...new Set(objects.map((o) => o.schema))];
  main.innerHTML = `
    <h1 class="view-title">Space Management</h1>
    <p class="view-lead">Each space has its own members, storage and objects. Creating spaces unlocks in chapter 1.
      For now you can look at the one space IT prepared.</p>
    <div class="panel">
      <table class="grid">
        <thead><tr><th>Space</th><th>Layer</th><th>Objects</th></tr></thead>
        <tbody>${spaces
          .map((s) => {
            const l = layerOf(s);
            const name = l === 'in' ? 'Inbound' : l === 'ha' ? 'Harmonization' : l === 'rep' ? 'Reporting' : 'Unassigned';
            return `<tr><td><span class="chip" data-layer="${l ?? ''}">${esc(s)}</span></td><td>${name}</td><td class="num">${objects.filter((o) => o.schema === s).length}</td></tr>`;
          })
          .join('')}</tbody>
      </table>
    </div>`;
}

function renderGlossary(main: HTMLElement) {
  main.innerHTML = `
    <h1 class="view-title">Glossary</h1>
    <p class="view-lead">Terms unlock the first time you meet them in a mission.</p>
    <div class="glossary">
      ${GLOSSARY.map(
        (g) => `<article class="panel term"><h3>${esc(g.term)}</h3><p>${esc(g.text)}</p><p class="real">In a real tenant: ${esc(g.realTenant)}</p></article>`,
      ).join('')}
    </div>`;
}

function renderLocked(main: HTMLElement, title: string, chapter: number, text: string) {
  main.innerHTML = `
    <div class="locked">
      <span class="chip">Unlocks in chapter ${chapter}</span>
      <h2>${esc(title)}</h2>
      <p>${esc(text)}</p>
    </div>`;
}

// ---------------------------------------------------------------- data builder

async function renderBuilder(main: HTMLElement) {
  main.innerHTML = `
    <div class="builder">
      <aside class="objects" aria-label="Objects">
        <h3>Repository</h3>
        <div id="object-list"></div>
      </aside>
      <section class="work">
        <div class="toolbar">
          <span class="obj-name">New SQL query</span>
          <button class="btn primary" id="run" type="button">Run</button>
          <span class="hint">Ctrl+Enter runs the query. Standard SQL, not HANA.</span>
        </div>
        <div class="editor-host" id="editor"></div>
        <div class="results" id="results"><div class="placeholder">Run a query to see its result here.</div></div>
      </section>
    </div>`;

  const run = () => runQuery();
  editor = createSqlEditor(document.querySelector('#editor')!, state.sql, run);
  document.querySelector('#run')!.addEventListener('click', run);
  await refreshObjects();
  editor?.focus();
}

async function refreshObjects() {
  const host = document.querySelector<HTMLElement>('#object-list');
  if (!host) return;
  const objects = await listObjects();
  const bySpace = new Map<string, typeof objects>();
  objects.forEach((o) => bySpace.set(o.schema, [...(bySpace.get(o.schema) ?? []), o]));

  host.innerHTML = [...bySpace.entries()]
    .map(
      ([space, objs]) => `
      <div class="space-head"><span class="chip" data-layer="${layerOf(space) ?? ''}">${esc(space)}</span></div>
      <ul>${objs
        .map((o) => `<li><button type="button" data-obj="${esc(space)}.${esc(o.name)}">${esc(o.name)}<span class="otype">${o.type}</span></button></li>`)
        .join('')}</ul>`,
    )
    .join('');

  host.querySelectorAll<HTMLButtonElement>('button[data-obj]').forEach((b) =>
    b.addEventListener('click', () => {
      editor?.setValue(`SELECT *\nFROM ${b.dataset.obj}\nLIMIT 100;`);
      runQuery();
    }),
  );

  // Autocomplete: "SPACE.OBJECT" → columns
  const schema: Record<string, string[]> = {};
  objects.forEach((o) => (schema[`${o.schema}.${o.name}`] = o.columns));
  editor?.setSchema(schema);
}

async function runQuery() {
  if (!editor) return;
  state.sql = editor.getValue();
  const out = document.querySelector<HTMLElement>('#results')!;
  if (!state.sql.trim()) {
    out.innerHTML = `<div class="result-status">Write a query first, then run it.</div>`;
    return;
  }
  try {
    const res = await runSql(state.sql);
    const rows = res.rows.length;
    out.innerHTML = `
      <div class="result-status ok">${rows} ${rows === 1 ? 'row' : 'rows'} in ${res.ms.toFixed(0)} ms</div>
      ${res.columns.length ? resultTable(res.columns, res.rows) : ''}`;
    // A statement may have created or dropped objects.
    if (/\b(create|drop|alter)\b/i.test(state.sql)) refreshObjects();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    out.innerHTML = `<div class="result-status error">${esc(msg)}</div>`;
  }
}

function resultTable(columns: string[], rows: unknown[][]) {
  const MAX = 500;
  const shown = rows.slice(0, MAX);
  return `<table class="grid">
    <thead><tr>${columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${shown
      .map(
        (r) =>
          `<tr>${r
            .map((v) =>
              v === null || v === undefined
                ? '<td class="null">null</td>'
                : `<td class="${typeof v === 'number' ? 'num' : ''}">${esc(Array.isArray(v) ? JSON.stringify(v) : v)}</td>`,
            )
            .join('')}</tr>`,
      )
      .join('')}</tbody>
  </table>${rows.length > MAX ? `<div class="placeholder">Showing the first ${MAX} of ${rows.length} rows.</div>` : ''}`;
}

// ---------------------------------------------------------------- mission panel (preview)

const PREVIEW_HINTS = [
  { label: 'Hint 1: where to look', cost: 5, text: 'Open the Data Builder. The billing data sits in the space RHN_IN, click a table on the left to preview it.' },
  { label: 'Hint 2: the concept', cost: 10, text: 'COUNT(*) counts rows. SELECT DISTINCT returns each value once. Look closely at the values you get back.' },
  { label: 'Hint 3: a skeleton', cost: 20, text: 'SELECT GRID_AREA, COUNT(*) FROM RHN_IN.______ GROUP BY ____;' },
];

function renderMission() {
  const panel = document.querySelector<HTMLElement>('#mission')!;
  panel.innerHTML = `
    <div class="mission-head">
      <div class="where">Chapter 0, Onboarding. Mission 1 of 4</div>
      <h2>Meet the raw data</h2>
    </div>
    <div class="ticket">
      <div class="ticket-from">
        <span class="avatar" aria-hidden="true">JW</span>
        <div><b>Jana Weber</b><span>Senior Data Architect, your mentor</span></div>
      </div>
      <div class="ticket-body">
        <p>Welcome aboard! IT already loaded the first extracts from billing, metering and the CRM into our inbound space.</p>
        <p>Before we model anything: how many contracts do we have per grid area? Something about the grid areas looks off to me. Tell me what you find.</p>
      </div>
    </div>
    <div class="section">
      <h3>Hints</h3>
      <div class="hints">
        ${PREVIEW_HINTS.map((h, i) =>
          i < state.hintsOpen
            ? `<div class="hint-open">${esc(h.text)}</div>`
            : `<button class="hint-btn" type="button" data-hint="${i}" ${i > state.hintsOpen ? 'disabled' : ''}>
                 <span>${esc(h.label)}</span><span class="cost">−${h.cost} XP</span>
               </button>`,
        ).join('')}
      </div>
    </div>
    <div class="feedback">
      <button class="btn primary" type="button" disabled>Check my solution</button>
      <p>Automatic checks arrive with the next build. Hints are free during the preview.</p>
    </div>`;

  panel.querySelectorAll<HTMLButtonElement>('[data-hint]').forEach((b) =>
    b.addEventListener('click', () => {
      state.hintsOpen = Number(b.dataset.hint) + 1;
      renderMission();
    }),
  );
}

// ---------------------------------------------------------------- boot

async function boot() {
  app.innerHTML = `<div class="boot">Starting the training tenant…</div>`;
  try {
    await initDb();
    // Same seed on every start, so every player sees the same Stadtwerke Rheinau.
    for (const stmt of datasetToSql(generateDataset())) await exec(stmt);
    renderFrame();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    app.innerHTML = `<div class="boot">The database could not start: ${esc(msg)}. Reload the page; if it keeps failing, try a current Chrome, Edge or Firefox.</div>`;
  }
}

boot();
