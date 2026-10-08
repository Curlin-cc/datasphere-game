import './styles.css';
import { initDb, exec, runSql, listObjects } from './db';
import { generateDataset, datasetToSql } from './data/generator';
import { createSqlEditor, type SqlEditor } from './editor';
import { CHAPTERS, GLOSSARY, GUIDANCE_INFO } from './content/chapters';
import { TUTORIALS, TASK_TOURS } from './content/tutorials';
import { MISSIONS, missionById, missionsOfChapter } from './content/missions';
import { checkMission, type CheckReport } from './missions/engine';
import type { QuestionCheck } from './missions/types';
import { startTour } from './tutorial';
import {
  loadProgress, saveProgress, missionProgress, isUnlocked, reachedChapter, rankOf,
  exportProgress, importProgress, freshProgress, CLEAN_BONUS,
} from './progress';
import {
  CAPACITY, NEW_SPACE_DEFAULTS, assigned, spaceIdError, storageError, accessError, sharedWith, isShared, round1, type Space,
} from './tenant';

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

const LAYER_ORDER = ['in', 'ha', 'rep', undefined];

/** Space name → layer key for colour coding. */
function layerOf(space: string): 'in' | 'ha' | 'rep' | undefined {
  if (space.endsWith('_IN')) return 'in';
  if (space.endsWith('_HARM')) return 'ha';
  if (space.endsWith('_REP')) return 'rep';
  return undefined;
}

const DEFAULT_SQL = `-- Ctrl+Enter runs the query\nSELECT *\nFROM RHN_IN.BILLING_CONTRACTS\nLIMIT 20;`;

const progress = loadProgress();

const state = {
  view: 'builder' as ViewId,
  sql: missionProgress(progress, progress.currentMission).sql ?? DEFAULT_SQL,
  progress,
  /** Last check result for the current mission, cleared when the mission changes. */
  report: null as CheckReport | null,
  checking: false,
  /** Set right after a mission is solved, for the success message. */
  solved: null as { xp: number; bonus: boolean; promotedTo?: string } | null,
};

const save = () => saveProgress(state.progress);
const currentMission = () => missionById(state.progress.currentMission) ?? MISSIONS[0];
const currentChapter = () => reachedChapter(state.progress);
const tenant = () => state.progress.tenant;

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
        <span class="active-space" id="active-space" title="The space the Data Builder works in">${activeSpaceHtml()}</span>
        <span class="rank" id="rank" title="Earn XP by solving missions. Hints cost XP.">${rankHtml()}</span>
        <button class="icon-btn" id="guide-open" type="button">How to play</button>
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
      setView(b.dataset.view as ViewId);
    }),
  );
  app.querySelector('#theme-toggle')!.addEventListener('click', toggleTheme);
  app.querySelector('#guide-open')!.addEventListener('click', openGuide);
  renderView();
  renderMission();
}

function setView(view: ViewId) {
  if (state.view === view) return;
  if (editor) state.sql = editor.getValue();
  state.view = view;
  renderFrame();
}

function openTaskTour(missionId: string, task: number) {
  const steps = TASK_TOURS[missionId]?.[task];
  if (!steps) return;
  startTour(steps, tourHooks(() => undefined), 'Got it');
}

function tourHooks(onFinish: () => void) {
  return {
    setView: (v: string) => setView(v as ViewId),
    insertExample: (sql: string) => {
      state.sql = sql;
      editor?.setValue(sql);
    },
    onFinish,
  };
}

function openTutorial(missionId: string) {
  const steps = TUTORIALS[missionId];
  if (!steps) return;
  startTour(
    steps,
    tourHooks(() => {
      if (!state.progress.tutorialsSeen.includes(missionId)) {
        state.progress.tutorialsSeen.push(missionId);
        save();
      }
    }),
  );
}

function activeSpaceHtml() {
  const id = tenant().activeSpace;
  return `<small>Space</small><span class="chip" data-layer="${layerOf(id) ?? ''}">${esc(id)}</span>`;
}

function rankHtml() {
  const xp = state.progress.xp;
  const r = rankOf(xp);
  const label = r.next ? `${xp} of ${r.next} XP to the next rank` : `${xp} XP, highest rank`;
  return `<strong>${esc(r.name)}</strong>
    <span class="xp-bar" aria-label="${label}" title="${label}"><span style="width:${Math.min(100, Math.max(0, r.fill))}%"></span></span>
    <span>${xp} XP</span>`;
}

function renderRank() {
  const el = document.querySelector('#rank');
  if (el) el.innerHTML = rankHtml();
}

// ---------------------------------------------------------------- how to play

const GUIDE_STEPS = [
  {
    title: 'Read the ticket',
    text: 'Each mission starts with a ticket on the right and a tutorial that walks you through it. The ticket describes what the business needs; how to build it is your job.',
  },
  {
    title: 'Explore and build in the Data Builder',
    text: 'Click a table on the left to preview it. Write SQL in the editor and press Run or Ctrl+Enter. The data is a real database in your browser, so nothing you do can break the tenant.',
  },
  {
    title: 'Use hints when you are stuck',
    text: 'Each task step has a Show me button with a quick tutorial. Hints come in three levels. In the first chapters they are open for free; later you buy them with XP you earned. You start with 0 XP.',
  },
  {
    title: 'Check your solution',
    text: 'Press "Check my solution" when you are done. You get feedback on the result, the structure and best practices, and earn XP for the mission.',
  },
];

function guideList() {
  return `<ol class="guide-steps">${GUIDE_STEPS.map(
    (g, i) => `<li><span class="num">${i + 1}</span><div><b>${esc(g.title)}</b><p>${esc(g.text)}</p></div></li>`,
  ).join('')}</ol>`;
}

function openGuide() {
  document.querySelector('.guide-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'guide-overlay';
  overlay.innerHTML = `
    <div class="guide panel" role="dialog" aria-modal="true" aria-labelledby="guide-title">
      <h2 id="guide-title">How to play</h2>
      <p class="guide-lead">You are the new data architect at Stadtwerke Rheinau. Your mentor Calin Mucea sends you tickets.
        Solve them with SQL, one layer at a time, until the board gets its reporting.</p>
      ${guideList()}
      <div class="guide-actions"><button class="btn primary" type="button" id="guide-close">Close</button></div>
    </div>`;
  document.body.append(overlay);
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', (e) => e.target === overlay && close());
  overlay.querySelector<HTMLButtonElement>('#guide-close')!.addEventListener('click', close);
  overlay.querySelector<HTMLButtonElement>('#guide-close')!.focus();
}

function navButton(item: NavItem) {
  const locked = item.unlockChapter !== undefined && item.unlockChapter > currentChapter();
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
  const reached = currentChapter();
  const solved = MISSIONS.filter((m) => state.progress.missions[m.id]?.done).length;
  const r = rankOf(state.progress.xp);
  main.innerHTML = `
    <h1 class="view-title">Welcome to Stadtwerke Rheinau</h1>
    <p class="view-lead">The board wants one trusted view of revenue, consumption and receivables per grid area.
      You are the new data architect. Build the Datasphere landscape that delivers it, one ticket at a time.</p>
    <section class="panel how" aria-label="How to play">
      <h3>How to play</h3>
      ${guideList()}
    </section>
    <section class="panel progress" aria-label="Your progress">
      <h3>Your progress</h3>
      <div class="progress-row">
        <div class="stat"><b>${esc(r.name)}</b><span>Rank</span></div>
        <div class="stat"><b>${state.progress.xp}</b><span>XP${r.next ? `, ${r.next - state.progress.xp} to the next rank` : ''}</span></div>
        <div class="stat"><b>${solved} of ${MISSIONS.length}</b><span>Missions solved</span></div>
        <span class="spacer"></span>
        <div class="save-actions">
          <button class="btn" type="button" id="save-export">Export save</button>
          <button class="btn" type="button" id="save-import">Import save</button>
          <button class="btn link" type="button" id="save-reset">Start over</button>
        </div>
      </div>
      <p class="save-note" id="save-note">Your progress is saved in this browser. Export it to move to another PC or browser.</p>
    </section>
    <div class="home-grid">
      <section class="panel" aria-label="Learning path">
        <ol class="path">
          ${CHAPTERS.map((c) => {
            const missions = missionsOfChapter(c.nr);
            const done = missions.filter((m) => state.progress.missions[m.id]?.done).length;
            const label = c.nr < reached ? 'Done' : c.nr > reached ? 'Locked' : missions.length ? `${done} of ${missions.length}` : 'Coming soon';
            return `<li class="${c.nr === reached ? 'current' : ''}">
              <span class="num">${c.nr}</span>
              <span><span class="t">${esc(c.title)}</span><br><span class="d">${esc(c.summary)}</span>
                ${c.nr <= reached && missions.length ? `<span class="path-missions">${missions
                  .map((m) => `<button type="button" class="mission-link ${state.progress.missions[m.id]?.done ? 'done' : ''}" data-mission="${m.id}" ${isUnlocked(state.progress, m.id) ? '' : 'disabled'}>${esc(m.title)}</button>`)
                  .join('')}</span>` : ''}</span>
              <span class="state">${label}</span>
            </li>`;
          }).join('')}
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

  main.querySelectorAll<HTMLButtonElement>('[data-mission]').forEach((b) =>
    b.addEventListener('click', () => {
      openMission(b.dataset.mission!);
      setView('builder');
    }),
  );
  const note = main.querySelector<HTMLElement>('#save-note')!;
  main.querySelector('#save-export')!.addEventListener('click', () => {
    persistEditor();
    exportProgress(state.progress);
    note.textContent = 'Save exported. Keep the file; Import save loads it again.';
  });
  main.querySelector('#save-import')!.addEventListener('click', async () => {
    try {
      state.progress = await importProgress();
      afterProgressReplaced();
    } catch (err) {
      note.textContent = err instanceof Error ? err.message : String(err);
    }
  });
  main.querySelector('#save-reset')!.addEventListener('click', () => {
    if (!confirm('Start over? Your XP and all solved missions are deleted. Export your save first if you want to keep it.')) return;
    state.progress = freshProgress();
    afterProgressReplaced();
  });
}

/** After import or reset: load the mission's SQL and redraw everything. */
function afterProgressReplaced() {
  save();
  state.report = null;
  state.solved = null;
  state.sql = missionProgress(state.progress, state.progress.currentMission).sql ?? DEFAULT_SQL;
  // Recreate the imported spaces as schemas, then redraw.
  Promise.all(tenant().spaces.map((sp) => exec(`CREATE SCHEMA IF NOT EXISTS "${sp.id}"`))).finally(renderFrame);
}

async function renderSpaces(main: HTMLElement) {
  const objects = await listObjects();
  const t = tenant();
  const canCreate = currentChapter() >= 1;
  const used = assigned(t);
  const bar = (label: string, used: number, cap: number) => `
    <div class="capacity-item">
      <div class="capacity-head"><b>${label}</b><span>${used} of ${cap} GB assigned, ${round1(cap - used)} GB free</span></div>
      <div class="capacity-bar"><span style="width:${Math.min(100, (used / cap) * 100)}%"></span></div>
    </div>`;
  main.innerHTML = `
    <h1 class="view-title">Space Management</h1>
    <p class="view-lead">Each space has its own members, storage and priority. Objects in one space are invisible to the others
      until you share them.${canCreate ? '' : ' Creating spaces unlocks in chapter 1. For now you can look at the space IT prepared.'}</p>
    <section class="panel capacity" aria-label="Tenant capacity">
      ${bar('Disk', used.diskGB, CAPACITY.diskGB)}
      ${bar('In-memory', used.memoryGB, CAPACITY.memoryGB)}
    </section>
    <div class="panel">
      <div class="table-head">
        <h3>Spaces</h3>
        <span class="spacer"></span>
        <button class="btn primary" type="button" id="create-space" ${canCreate ? '' : 'disabled title="Unlocks in chapter 1"'}>Create space</button>
      </div>
      <div class="table-scroll"><table class="grid" id="space-list">
        <thead><tr><th>Space ID</th><th>Space name</th><th>Layer</th><th class="num">Disk</th><th class="num">In-memory</th><th class="num">Priority</th><th class="num">Objects</th><th></th></tr></thead>
        <tbody>${[...t.spaces]
          .sort((x, y) => LAYER_ORDER.indexOf(layerOf(x.id)) - LAYER_ORDER.indexOf(layerOf(y.id)) || x.id.localeCompare(y.id))
          .map((sp) => {
            const l = layerOf(sp.id);
            const layer = l === 'in' ? 'Inbound' : l === 'ha' ? 'Harmonization' : l === 'rep' ? 'Reporting' : 'Unassigned';
            const own = objects.filter((o) => o.schema === sp.id).length;
            const sharedIn = sharedWith(t, sp.id).length;
            return `<tr>
              <td><span class="chip" data-layer="${l ?? ''}">${esc(sp.id)}</span></td>
              <td>${esc(sp.name)}</td><td>${layer}</td>
              <td class="num">${sp.diskGB} GB</td><td class="num">${sp.memoryGB} GB</td><td class="num">${sp.priority}</td>
              <td class="num" title="${sharedIn} shared with this space">${own}${sharedIn ? ` <small class="muted">+${sharedIn} shared</small>` : ''}</td>
              <td class="row-actions">${canCreate ? `<button class="btn small" type="button" data-edit="${esc(sp.id)}">Edit</button>` : ''}
                ${canCreate && !sp.system ? `<button class="btn small link" type="button" data-delete="${esc(sp.id)}">Delete</button>` : ''}</td>
            </tr>`;
          })
          .join('')}</tbody>
      </table></div>
    </div>`;
  main.querySelector('#create-space')?.addEventListener('click', () => openSpaceDialog());
  main.querySelectorAll<HTMLButtonElement>('[data-edit]').forEach((b) =>
    b.addEventListener('click', () => openSpaceDialog(t.spaces.find((x) => x.id === b.dataset.edit))),
  );
  main.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach((b) =>
    b.addEventListener('click', () => deleteSpace(b.dataset.delete!, objects.filter((o) => o.schema === b.dataset.delete).length)),
  );
}

/** Small modal used by the space and share dialogs. Returns the dialog element and a close function. */
function openDialog(title: string, body: string) {
  document.querySelector('.guide-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'guide-overlay';
  overlay.innerHTML = `<form class="guide panel dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title" novalidate>
      <h2 id="dlg-title">${esc(title)}</h2>${body}</form>`;
  document.body.append(overlay);
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', (e) => e.target === overlay && close());
  overlay.querySelector('[data-act="cancel"]')?.addEventListener('click', close);
  return { form: overlay.querySelector<HTMLFormElement>('form')!, close };
}

function openSpaceDialog(existing?: Space) {
  const t = tenant();
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
  (existing ? field('name') : field('name')).focus();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const sp: Space = {
      id: field('id').value.trim(),
      name: field('name').value.trim(),
      diskGB: round1(Number(field('disk').value)),
      memoryGB: round1(Number(field('memory').value)),
      priority: Number(form.querySelector<HTMLSelectElement>('[name="priority"]')!.value),
    };
    const err =
      (!sp.name ? 'Enter a space name.' : null) ?? (existing ? null : spaceIdError(sp.id, t)) ?? storageError(sp, t);
    if (err) {
      form.querySelector('.form-error')!.textContent = err;
      return;
    }
    if (existing) Object.assign(existing, { name: sp.name, diskGB: sp.diskGB, memoryGB: sp.memoryGB, priority: sp.priority });
    else {
      await exec(`CREATE SCHEMA IF NOT EXISTS "${sp.id}"`);
      t.spaces.push(sp);
    }
    save();
    close();
    renderFrame();
  });
}

async function deleteSpace(id: string, objectCount: number) {
  if (objectCount > 0) {
    alert(`${id} still contains ${objectCount} objects. Delete them first.`);
    return;
  }
  if (!confirm(`Delete space ${id}? Shares into this space are removed too.`)) return;
  const t = tenant();
  await exec(`DROP SCHEMA IF EXISTS "${id}"`);
  t.spaces = t.spaces.filter((s) => s.id !== id);
  t.shares = t.shares.filter((s) => s.to !== id && !s.object.startsWith(`${id}.`));
  if (t.activeSpace === id) t.activeSpace = 'RHN_IN';
  save();
  renderFrame();
}

function openShareDialog(object: string) {
  const t = tenant();
  const owner = object.split('.')[0];
  const targets = t.spaces.filter((s) => s.id !== owner);
  const { form, close } = openDialog(`Share ${object.split('.')[1]}`, `
    <p class="guide-lead">Shared objects can be read in the target space, as a source for its own views. The data stays in ${esc(owner)}, nothing is copied.</p>
    <fieldset class="question share-targets"><legend>Share with these spaces</legend>
      ${targets.map((s) => `<label><input type="checkbox" name="to" value="${esc(s.id)}" ${isShared(t, object, s.id) ? 'checked' : ''}>
        <span class="chip" data-layer="${layerOf(s.id) ?? ''}">${esc(s.id)}</span> ${esc(s.name)}</label>`).join('')}
    </fieldset>
    <div class="guide-actions">
      <button class="btn link" type="button" data-act="cancel">Cancel</button>
      <button class="btn primary" type="submit">Save sharing</button>
    </div>`);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const chosen = [...form.querySelectorAll<HTMLInputElement>('[name="to"]:checked')].map((i) => i.value);
    t.shares = t.shares.filter((s) => s.object !== object).concat(chosen.map((to) => ({ object, to })));
    save();
    close();
    refreshObjects();
  });
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
          ${tenant().spaces.length > 1 ? `<label class="space-select">Space
            <select id="space-select">${tenant().spaces.map((sp) => `<option ${sp.id === tenant().activeSpace ? 'selected' : ''}>${esc(sp.id)}</option>`).join('')}</select></label>` : ''}
          <span class="obj-name">New SQL query</span>
          <button class="btn primary" id="run" type="button">Run</button>
          <span class="hint">Ctrl+Enter runs the query. Standard SQL, not HANA.</span>
        </div>
        <div class="editor-host" id="editor"></div>
        <div class="results" id="results"><div class="placeholder">
          <b>Start here.</b> Click a table on the left to preview its first 100 rows,
          or write your own SQL above and press Run. Tables are addressed as SPACE.TABLE, for example RHN_IN.BILLING_CONTRACTS.
        </div></div>
      </section>
    </div>`;

  const run = () => runQuery();
  editor = createSqlEditor(document.querySelector('#editor')!, state.sql, run);
  document.querySelector('#run')!.addEventListener('click', run);
  document.querySelector<HTMLSelectElement>('#space-select')?.addEventListener('change', (e) => {
    tenant().activeSpace = (e.target as HTMLSelectElement).value;
    save();
    document.querySelector('#active-space')!.innerHTML = activeSpaceHtml();
    refreshObjects();
  });
  await refreshObjects();
  editor?.focus();
}

async function refreshObjects() {
  const host = document.querySelector<HTMLElement>('#object-list');
  if (!host) return;
  const t = tenant();
  const space = t.activeSpace;
  const objects = await listObjects();
  const own = objects.filter((o) => o.schema === space);
  const shared = objects.filter((o) => isShared(t, `${o.schema}.${o.name}`, space));
  const canShare = t.spaces.length > 1;
  const item = (o: (typeof objects)[number], sharedFrom?: string) => `<li>
      <button type="button" data-obj="${esc(o.schema)}.${esc(o.name)}"><span class="oname" title="${esc(o.name)}">${esc(o.name)}</span><span class="otype">${sharedFrom ? esc(sharedFrom) : o.type}</span></button>
      ${!sharedFrom && canShare ? `<button type="button" class="share-btn" data-share="${esc(o.schema)}.${esc(o.name)}" title="Share ${esc(o.name)} with other spaces" aria-label="Share ${esc(o.name)}">
        <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="4" cy="8" r="1.8"/><circle cx="12" cy="4" r="1.8"/><circle cx="12" cy="12" r="1.8"/><path d="M5.6 7.1l4.8-2.3M5.6 8.9l4.8 2.3"/></svg>
        ${t.shares.some((x) => x.object === `${o.schema}.${o.name}`) ? '<span class="share-dot"></span>' : ''}</button>` : ''}
    </li>`;

  host.innerHTML = `
    <div class="space-head"><span class="chip" data-layer="${layerOf(space) ?? ''}">${esc(space)}</span></div>
    ${own.length ? `<ul>${own.map((o) => item(o)).join('')}</ul>` : '<p class="repo-empty">No objects in this space yet.</p>'}
    ${shared.length ? `<div class="space-head shared-head">Shared with ${esc(space)}</div><ul>${shared.map((o) => item(o, o.schema)).join('')}</ul>` : ''}`;

  host.querySelectorAll<HTMLButtonElement>('button[data-obj]').forEach((b) =>
    b.addEventListener('click', () => {
      editor?.setValue(`SELECT *\nFROM ${b.dataset.obj}\nLIMIT 100;`);
      runQuery();
    }),
  );
  host.querySelectorAll<HTMLButtonElement>('button[data-share]').forEach((b) =>
    b.addEventListener('click', () => openShareDialog(b.dataset.share!)),
  );

  // Autocomplete: "SPACE.OBJECT" → columns, only for what this space can read.
  const schema: Record<string, string[]> = {};
  [...own, ...shared].forEach((o) => (schema[`${o.schema}.${o.name}`] = o.columns));
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
  const denied = accessError(state.sql, tenant().activeSpace, tenant());
  if (denied) {
    out.innerHTML = `<div class="result-status error">${esc(denied)}</div>`;
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

// ---------------------------------------------------------------- mission panel

/** Hints that are open for free in this chapter, before anything is bought. */
const FREE_HINTS = { full: 3, light: 1, paid: 0, none: 0 } as const;

/** Keeps the editor text with the mission, so it is still there after a reload. */
function persistEditor() {
  if (editor) state.sql = editor.getValue();
  missionProgress(state.progress, state.progress.currentMission).sql = state.sql;
  save();
}

function openMission(id: string) {
  if (!isUnlocked(state.progress, id) || id === state.progress.currentMission) return;
  persistEditor();
  state.progress.currentMission = id;
  state.report = null;
  state.solved = null;
  state.sql = missionProgress(state.progress, id).sql ?? DEFAULT_SQL;
  editor?.setValue(state.sql);
  save();
  renderMission();
  if (!state.progress.tutorialsSeen.includes(id)) openTutorial(id);
}

function renderMission() {
  const panel = document.querySelector<HTMLElement>('#mission');
  if (!panel) return;
  const m = currentMission();
  const mp = missionProgress(state.progress, m.id);
  const chapter = CHAPTERS[m.chapter];
  const inChapter = missionsOfChapter(m.chapter);
  const pos = inChapter.indexOf(m);
  const guidance = chapter.guidance;
  const openHints = Math.max(FREE_HINTS[guidance], mp.hintsOpen);
  const xp = state.progress.xp;
  const questions = m.checks.filter((c): c is QuestionCheck => c.type === 'question');
  const all = MISSIONS.indexOf(m);
  const prev = MISSIONS[all - 1];
  const next = MISSIONS[all + 1];

  panel.innerHTML = `
    <div class="mission-head">
      <div class="where">Chapter ${chapter.nr}, ${esc(chapter.title)}. Mission ${pos + 1} of ${inChapter.length}</div>
      <h2>${esc(m.title)}${mp.done ? ' <span class="chip solved">Solved</span>' : ''}</h2>
      <div class="mission-nav">
        <button class="btn small" type="button" id="tutorial-open">Show tutorial</button>
        <span class="spacer"></span>
        <button class="btn small" type="button" data-goto="${prev?.id ?? ''}" ${prev ? '' : 'disabled'} aria-label="Previous mission">‹ Prev</button>
        <button class="btn small" type="button" data-goto="${next?.id ?? ''}" ${next && isUnlocked(state.progress, next.id) ? '' : 'disabled'}
          ${next && !isUnlocked(state.progress, next.id) ? 'title="Solve this mission first"' : ''} aria-label="Next mission">Next ›</button>
      </div>
    </div>
    <div class="ticket">
      <div class="ticket-from">
        <span class="avatar" aria-hidden="true">${esc(m.from.initials)}</span>
        <div><b>${esc(m.from.name)}</b><span>${esc(m.from.role)}</span></div>
      </div>
      <div class="ticket-body">${m.ticket}</div>
    </div>
    <div class="section" id="task">
      <h3>Your task</h3>
      <ol class="task-steps">
        ${m.tasks.map(
          (t, i) => `<li><span>${t}</span>${TASK_TOURS[m.id]?.[i] ? `<button class="btn small show-me" type="button" data-task="${i}">Show me</button>` : ''}</li>`,
        ).join('')}
      </ol>
    </div>
    ${questions.length ? `<div class="section" id="questions">
      <h3>Your answers</h3>
      ${questions.map((q) => `<fieldset class="question">
          <legend>${esc(q.prompt)}</legend>
          ${q.options.map((o, i) => `<label><input type="radio" name="q-${q.id}" value="${i}" ${mp.answers[q.id] === i ? 'checked' : ''}> ${esc(o)}</label>`).join('')}
        </fieldset>`).join('')}
    </div>` : ''}
    <div class="section" id="hints">
      <h3>Hints <span class="balance">You have ${xp} XP</span></h3>
      <p class="guidance"><span class="chip" data-guidance="${guidance}">${GUIDANCE_INFO[guidance].label}</span> ${esc(GUIDANCE_INFO[guidance].text)}</p>
      <div class="hints">
        ${guidance === 'none' ? '' : m.hints.map((h, i) => {
          if (i < openHints) return `<div class="hint-open"><b>${esc(h.label)}</b>${esc(h.text)}</div>`;
          const isNext = i === openHints;
          const affordable = xp >= h.cost;
          const note = !isNext ? 'Open the previous hint first' : !affordable ? `Not enough XP, you need ${h.cost}` : '';
          return `<button class="hint-btn" type="button" data-hint="${i}" ${isNext && affordable ? '' : 'disabled'} ${note ? `title="${esc(note)}"` : ''}>
                 <span>${esc(h.label)}${isNext && !affordable ? `<small>Not enough XP</small>` : ''}</span><span class="cost">−${h.cost} XP</span>
               </button>`;
        }).join('')}
      </div>
    </div>
    <div class="feedback">
      <button class="btn primary" type="button" id="check" ${state.checking ? 'disabled' : ''}>${state.checking ? 'Checking…' : 'Check my solution'}</button>
      <p>Checks the last query in the editor${questions.length ? ' and your answers' : ''}.${mp.done ? ' You already earned the XP for this mission.' : ` Worth ${m.xp} XP, plus ${CLEAN_BONUS} for a clean review.`}</p>
      ${reportHtml()}
    </div>`;

  panel.querySelector('#tutorial-open')!.addEventListener('click', () => openTutorial(m.id));
  panel.querySelectorAll<HTMLButtonElement>('[data-goto]').forEach((b) =>
    b.addEventListener('click', () => b.dataset.goto && openMission(b.dataset.goto)),
  );
  panel.querySelectorAll<HTMLButtonElement>('[data-task]').forEach((b) =>
    b.addEventListener('click', () => openTaskTour(m.id, Number(b.dataset.task))),
  );
  panel.querySelectorAll<HTMLInputElement>('.question input').forEach((input) =>
    input.addEventListener('change', () => {
      mp.answers[input.name.slice(2)] = Number(input.value);
      save();
    }),
  );
  panel.querySelectorAll<HTMLButtonElement>('[data-hint]').forEach((b) =>
    b.addEventListener('click', () => {
      const i = Number(b.dataset.hint);
      const hint = m.hints[i];
      // Never go below zero: a hint is only bought when the XP is there.
      if (i !== openHints || state.progress.xp < hint.cost) return;
      state.progress.xp -= hint.cost;
      mp.hintsOpen = i + 1;
      save();
      renderRank();
      renderMission();
    }),
  );
  panel.querySelector('#check')!.addEventListener('click', runCheck);
  panel.querySelector('#next-mission')?.addEventListener('click', () => next && openMission(next.id));
}

function reportHtml() {
  const report = state.report;
  if (!report) return '';
  const m = currentMission();
  const next = MISSIONS[MISSIONS.indexOf(m) + 1];
  const list = `<ul class="check-list">${report.outcomes
    .map((o) => `<li class="${o.ok ? 'ok' : 'fail'}"><b>${o.ok ? '✓' : '✗'} ${esc(o.label)}</b><span>${esc(o.message)}</span></li>`)
    .join('')}</ul>`;
  const notes = report.notes.length
    ? `<div class="review"><b>Calin's review</b>${report.notes.map((n) => `<p>${esc(n.text)}</p>`).join('')}
        ${report.passed ? '' : '<p class="muted">Review notes do not fail the mission, but a clean solution earns a bonus.</p>'}</div>`
    : '';
  if (!report.passed) return list + notes;

  const s = state.solved;
  return `${list}
    <div class="success" role="status">
      ${s ? `<div class="gain">+${s.xp} XP${s.bonus ? ` <small>incl. ${CLEAN_BONUS} for a clean review</small>` : ''}</div>` : ''}
      ${s?.promotedTo ? `<div class="promotion">Promoted to <b>${esc(s.promotedTo)}</b></div>` : ''}
      <div class="debrief"><span class="avatar" aria-hidden="true">${esc(m.from.initials)}</span><div>${m.debrief}</div></div>
    </div>
    ${notes}
    <div class="real-tenant"><b>In the real tenant</b><p>${m.realTenant}</p></div>
    ${next
      ? `<button class="btn primary" type="button" id="next-mission">Next mission: ${esc(next.title)}</button>`
      : `<p class="muted">That was the last mission built so far. Chapter ${m.chapter + 1} is in the making; your progress is saved.</p>`}`;
}

async function runCheck() {
  if (state.checking) return;
  const m = currentMission();
  const mp = missionProgress(state.progress, m.id);
  persistEditor();
  state.checking = true;
  state.solved = null;
  renderMission();
  const chapterBefore = currentChapter();
  try {
    state.report = await checkMission(m, { sql: state.sql, answers: mp.answers, tenant: tenant() });
  } catch (err) {
    state.report = { passed: false, notes: [], outcomes: [{ label: 'Check', ok: false, message: err instanceof Error ? err.message : String(err) }] };
  }
  mp.attempts++;
  if (state.report.passed && !mp.done) {
    const bonus = state.report.notes.length === 0;
    const gained = m.xp + (bonus ? CLEAN_BONUS : 0);
    const before = rankOf(state.progress.xp).name;
    mp.done = true;
    mp.xpEarned = gained;
    state.progress.xp += gained;
    const after = rankOf(state.progress.xp).name;
    state.solved = { xp: gained, bonus, promotedTo: after !== before ? after : undefined };
  }
  state.checking = false;
  save();
  renderRank();
  renderMission();
  // A new chapter may unlock views in the navigation.
  if (currentChapter() !== chapterBefore) {
    document.querySelector('.nav')!.innerHTML = `${NAV.map(navButton).join('')}<div class="nav-sep"></div>${NAV_BOTTOM.map(navButton).join('')}`;
    document.querySelectorAll<HTMLButtonElement>('.nav button').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view as ViewId)));
  }
  document.querySelector('.feedback')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// ---------------------------------------------------------------- boot

async function boot() {
  app.innerHTML = `<div class="boot">Starting the training tenant…</div>`;
  try {
    await initDb();
    // Same seed on every start, so every player sees the same Stadtwerke Rheinau.
    for (const stmt of datasetToSql(generateDataset())) await exec(stmt);
    // Spaces the player created live in the save game; recreate them as schemas.
    for (const sp of tenant().spaces) await exec(`CREATE SCHEMA IF NOT EXISTS "${sp.id}"`);
    renderFrame();
    const id = state.progress.currentMission;
    if (!state.progress.tutorialsSeen.includes(id)) openTutorial(id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    app.innerHTML = `<div class="boot">The database could not start: ${esc(msg)}. Reload the page; if it keeps failing, try a current Chrome, Edge or Firefox.</div>`;
  }
}

window.addEventListener('beforeunload', persistEditor);

boot();
