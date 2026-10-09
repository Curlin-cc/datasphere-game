import './styles.css';
import { initDb, exec } from './db';
import { generateDataset, datasetToSql } from './data/generator';
import { CHAPTERS, GLOSSARY, GUIDANCE_INFO } from './content/chapters';
import { APPS, appById, type AppInfo } from './content/apps';
import { TUTORIALS, TASK_TOURS } from './content/tutorials';
import { MISSIONS, missionById, missionsOfChapter } from './content/missions';
import { checkMission, type CheckReport } from './missions/engine';
import type { QuestionCheck } from './missions/types';
import { startTour } from './tutorial';
import {
  loadProgress, saveProgress, missionProgress, isUnlocked, reachedChapter, unlockedChapter, rankOf,
  exportProgress, importProgress, freshProgress, CLEAN_BONUS,
} from './progress';
import { seedSourceTables, restoreViews } from './repo';
import { ctx, type ViewId } from './ctx';
import { esc, icon, ICONS } from './ui';
import { renderBuilder, enterBuilder, builderTo, rememberEditor } from './views/builder';
import { renderRepository } from './views/repository';
import { renderSpaces } from './views/spaces';
import { renderSecurity } from './views/security';

/** Business names of the tables IT loaded. BILLING_CONTRACTS has none on purpose (mission c00-m04). */
const SOURCE_BUSINESS_NAMES: Record<string, string> = {
  BILLING_CONTRACTS: 'BILLING_CONTRACTS',
  BILLING_INVOICES: 'Billing Invoices',
  TARIFFS: 'Tariffs',
  GRID_AREAS: 'Grid Areas',
  METER_READINGS: 'Meter Readings',
  CRM_CUSTOMERS: 'CRM Customers',
  LEGACY_CUSTOMER_MAP: 'Legacy Customer Map',
};

const state = {
  report: null as CheckReport | null,
  checking: false,
  solved: null as { xp: number; bonus: boolean; promotedTo?: string } | null,
  navCollapsed: readPref('dsg-nav') === 'collapsed',
};

ctx.progress = loadProgress();
const save = () => saveProgress(ctx.progress);
const currentMission = () => missionById(ctx.progress.currentMission) ?? MISSIONS[0];
/** For unlocking apps and features. The learning path on Home uses reachedChapter. */
const currentChapter = () => unlockedChapter(ctx.progress);

ctx.save = save;
ctx.currentChapter = currentChapter;
ctx.track = (event: string) => {
  const mp = missionProgress(ctx.progress, ctx.progress.currentMission);
  if (mp.events.includes(event)) return;
  mp.events.push(event);
  if (mp.events.length > 300) mp.events.shift();
  save();
};
ctx.setView = setView;
ctx.renderView = renderView;
ctx.renderMission = renderMission;

const app = document.querySelector<HTMLDivElement>('#app')!;

function readPref(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: lasts for this visit only */
  }
}

// ---------------------------------------------------------------- shell

function renderFrame() {
  app.innerHTML = `
    <div class="app ${state.navCollapsed ? 'nav-collapsed' : ''}">
      <header class="shellbar">
        <button class="shell-btn menu" id="nav-toggle" type="button" aria-label="${state.navCollapsed ? 'Expand' : 'Collapse'} navigation"
          title="Expand or collapse the side navigation">${icon(ICONS.menu)}</button>
        <span class="brand"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>Datasphere Game</span>
        <span class="tenant">Stadtwerke Rheinau<small>training tenant</small></span>
        <span class="spacer"></span>
        <span class="rank" id="rank" title="Earn XP by solving missions. Hints cost XP.">${rankHtml()}</span>
        <button class="shell-btn" id="glossary-open" type="button">Glossary</button>
        <button class="shell-btn" id="guide-open" type="button">How to play</button>
        <button class="shell-btn" id="theme-toggle" type="button">Theme</button>
      </header>
      <nav class="nav" aria-label="Side navigation">${navHtml()}</nav>
      <main class="main" id="main"></main>
      <aside class="mission" id="mission" aria-label="Current mission"></aside>
    </div>`;

  bindNav();
  app.querySelector('#nav-toggle')!.addEventListener('click', () => {
    state.navCollapsed = !state.navCollapsed;
    writePref('dsg-nav', state.navCollapsed ? 'collapsed' : 'expanded');
    app.querySelector('.app')!.classList.toggle('nav-collapsed', state.navCollapsed);
  });
  app.querySelector('#theme-toggle')!.addEventListener('click', toggleTheme);
  app.querySelector('#guide-open')!.addEventListener('click', openGuide);
  app.querySelector('#glossary-open')!.addEventListener('click', () => setView('glossary'));
  renderView();
  renderMission();
}

function navHtml() {
  const item = (a: AppInfo) => {
    const infoOnly = a.interactive === undefined || a.interactive > currentChapter();
    return `<button type="button" data-view="${a.id}" ${ctx.view === a.id ? 'aria-current="page"' : ''} title="${esc(a.label)}: ${esc(a.summary)}">
      ${icon(a.icon)}<span class="label">${esc(a.label)}</span>
      ${infoOnly ? `<span class="info-only" aria-label="Info page only">${icon(ICONS.info)}</span>` : ''}
    </button>`;
  };
  return `${APPS.filter((a) => a.group === 'top').map(item).join('')}
    <div class="nav-spacer"></div><div class="nav-sep"></div>
    ${APPS.filter((a) => a.group === 'bottom').map(item).join('')}`;
}

function bindNav() {
  app.querySelectorAll<HTMLButtonElement>('.nav button[data-view]').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.dataset.view === 'builder') enterBuilder();
      setView(b.dataset.view as ViewId, true);
    }),
  );
}

function refreshNav() {
  const nav = app.querySelector('.nav');
  if (!nav) return;
  nav.innerHTML = navHtml();
  bindNav();
}

/** Switches the app. `force` re-renders even when the app is already open (e.g. back to the Data Builder start). */
function setView(view: ViewId, force = false) {
  if (ctx.view === view && !force) return;
  rememberEditor();
  ctx.view = view;
  ctx.track(`app:${view}`);
  refreshNav();
  renderView();
}

function renderView() {
  const main = document.querySelector<HTMLElement>('#main');
  if (!main) return;
  main.classList.remove('flush');
  main.scrollTop = 0;
  if (ctx.view !== 'builder') {
    rememberEditor();
    ctx.editor = null;
  }
  const a = appById(ctx.view);
  switch (ctx.view) {
    case 'home':
      return renderHome(main);
    case 'builder':
      return renderBuilder(main);
    case 'repository':
      return renderRepository(main);
    case 'spaces':
      return renderSpaces(main);
    case 'glossary':
      return renderGlossary(main);
    case 'security':
      return currentChapter() >= 2 ? renderSecurity(main) : renderAppInfo(main, a!);
    default:
      return renderAppInfo(main, a!);
  }
}

function rankHtml() {
  const xp = ctx.progress.xp;
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

function toggleTheme() {
  const root = document.documentElement;
  const isDark = root.dataset.theme === 'dark' || (!root.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.dataset.theme = isDark ? 'light' : 'dark';
  writePref('dsg-theme', root.dataset.theme);
}

// ---------------------------------------------------------------- tutorials

function tourHooks(onFinish: () => void) {
  return {
    /** Views for tutorials: an app ID, or builder:landing / builder:new-view / builder:spaces, optionally :SPACE. */
    setView: (v: string) => {
      const [view, target, space] = v.split(':');
      if (view === 'builder' && target) {
        builderTo(target as 'landing' | 'new-view' | 'spaces', space);
        setView('builder', true);
      } else setView(view as ViewId);
    },
    insertExample: (sql: string) => {
      if (ctx.view !== 'builder' || !ctx.editor) {
        builderTo('new-view');
        setView('builder', true);
      }
      ctx.editor?.setValue(sql);
      ctx.sql = sql;
    },
    onFinish,
  };
}

function openTaskTour(missionId: string, task: number) {
  const steps = TASK_TOURS[missionId]?.[task];
  if (steps) startTour(steps, tourHooks(() => undefined), 'Got it');
}

function openTutorial(missionId: string) {
  const steps = TUTORIALS[missionId];
  if (!steps) return;
  startTour(
    steps,
    tourHooks(() => {
      if (!ctx.progress.tutorialsSeen.includes(missionId)) {
        ctx.progress.tutorialsSeen.push(missionId);
        save();
      }
    }),
  );
}

// ---------------------------------------------------------------- how to play

const GUIDE_STEPS = [
  {
    title: 'Read the ticket',
    text: 'Each mission starts with a ticket on the right and a tutorial that walks you through it. The ticket says what the business needs; how to do it is your job.',
  },
  {
    title: 'Work in the tenant',
    text: 'The side navigation has the apps of SAP Datasphere. Pick a space in the Data Builder, open objects, save and deploy them, manage spaces and roles. Apps with an info icon only explain what they do, for now.',
  },
  {
    title: 'Use hints when you are stuck',
    text: 'Each task step has a Show me button with a quick tutorial. Hints come in three levels. In the first chapters they are free; later you buy them with XP. You start with 0 XP.',
  },
  {
    title: 'Check your solution',
    text: 'Press "Check my solution" when you are done. You get feedback per part, a review from your mentor, and XP.',
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
        You solve them in a training tenant that works like SAP Datasphere, one layer at a time, until the board gets its reporting.</p>
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

// ---------------------------------------------------------------- home

const APP_GROUPS: { title: string; text: string; apps: string[] }[] = [
  { title: 'Find', text: 'Look for data and objects', apps: ['home', 'repository', 'catalog'] },
  { title: 'Model', text: 'Build and describe data models', apps: ['builder', 'semantic', 'business'] },
  { title: 'Integrate', text: 'Get data in and keep it flowing', apps: ['connections', 'monitor'] },
  { title: 'Administer', text: 'Run the tenant', apps: ['spaces', 'security', 'sysmonitor', 'transport', 'system'] },
];

function renderHome(main: HTMLElement) {
  const reached = reachedChapter(ctx.progress);
  const solved = MISSIONS.filter((m) => ctx.progress.missions[m.id]?.done).length;
  const r = rankOf(ctx.progress.xp);
  main.innerHTML = `
    <h1 class="view-title">Welcome to Stadtwerke Rheinau</h1>
    <p class="view-lead">The board wants one trusted view of revenue, consumption and receivables per grid area.
      You are the new data architect. Build the Datasphere landscape that delivers it, one ticket at a time.</p>
    <section class="panel how" aria-label="How to play">
      <h3>How to play</h3>
      ${guideList()}
    </section>
    <section class="panel app-guide" id="app-guide" aria-label="Your tenant">
      <h3>Your tenant at a glance</h3>
      <p class="muted">The side navigation groups the apps by what you do. Click one to open it.</p>
      <div class="app-groups">
        ${APP_GROUPS.map((g) => `<div class="app-group"><h4>${g.title}<small>${g.text}</small></h4>
          ${g.apps.map((id) => {
            const a = appById(id)!;
            return `<button type="button" class="app-link" data-app="${a.id}">${icon(a.icon)}<span><b>${esc(a.label)}</b><small>${esc(a.summary)}</small></span></button>`;
          }).join('')}</div>`).join('')}
      </div>
    </section>
    <section class="panel progress" aria-label="Your progress">
      <h3>Your progress</h3>
      <div class="progress-row">
        <div class="stat"><b>${esc(r.name)}</b><span>Rank</span></div>
        <div class="stat"><b>${ctx.progress.xp}</b><span>XP${r.next ? `, ${r.next - ctx.progress.xp} to the next rank` : ''}</span></div>
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
            const done = missions.filter((m) => ctx.progress.missions[m.id]?.done).length;
            const label = !missions.length ? 'Coming soon' : done === missions.length ? 'Done' : c.nr > reached ? 'Locked' : `${done} of ${missions.length}`;
            return `<li class="${c.nr === reached ? 'current' : ''}">
              <span class="num">${c.nr}</span>
              <span><span class="t">${esc(c.title)}</span><br><span class="d">${esc(c.summary)}</span>
                ${missions.length && missions.some((m) => isUnlocked(ctx.progress, m.id)) ? `<span class="path-missions">${missions
                  .map((m) => `<button type="button" class="mission-link ${ctx.progress.missions[m.id]?.done ? 'done' : ''}" data-mission="${m.id}" ${isUnlocked(ctx.progress, m.id) ? '' : 'disabled'}>${esc(m.title)}</button>`)
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
        <p class="arch-note">Only the inbound space exists at the start. You create the others in chapter 1.</p>
      </section>
    </div>`;

  main.querySelectorAll<HTMLButtonElement>('[data-app]').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.dataset.app === 'builder') enterBuilder();
      setView(b.dataset.app as ViewId);
    }),
  );
  main.querySelectorAll<HTMLButtonElement>('[data-mission]').forEach((b) => b.addEventListener('click', () => openMission(b.dataset.mission!)));
  const note = main.querySelector<HTMLElement>('#save-note')!;
  main.querySelector('#save-export')!.addEventListener('click', () => {
    rememberEditor();
    save();
    exportProgress(ctx.progress);
    note.textContent = 'Save exported. Keep the file; Import save loads it again.';
  });
  main.querySelector('#save-import')!.addEventListener('click', async () => {
    try {
      ctx.progress = await importProgress();
      await afterProgressReplaced();
    } catch (err) {
      note.textContent = err instanceof Error ? err.message : String(err);
    }
  });
  main.querySelector('#save-reset')!.addEventListener('click', async () => {
    if (!confirm('Start over? Your XP and all solved missions are deleted. Export your save first if you want to keep it.')) return;
    ctx.progress = freshProgress();
    await afterProgressReplaced();
  });
}

/** After import or reset: rebuild the tenant in the database and redraw everything. */
async function afterProgressReplaced() {
  state.report = null;
  state.solved = null;
  ctx.sql = '';
  ctx.sqlOwner = 'draft';
  await prepareTenant();
  save();
  renderFrame();
}

// ---------------------------------------------------------------- app info pages and glossary

function renderAppInfo(main: HTMLElement, a: AppInfo) {
  const chapter = currentChapter();
  const status = a.note
    ? '<span class="chip warn">Being phased out</span>'
    : a.interactive !== undefined && a.interactive > chapter
      ? `<span class="chip">You work here from chapter ${a.interactive}</span>`
      : a.chapter !== undefined && a.chapter > chapter
        ? `<span class="chip">Explained in chapter ${a.chapter}</span>`
        : '<span class="chip">Info only in this game</span>';
  main.innerHTML = `
    <div class="app-info" id="app-info">
      <div class="app-info-head"><span class="app-icon">${icon(a.icon)}</span><div><h1 class="view-title">${esc(a.label)}</h1>${status}</div></div>
      <p class="view-lead">${esc(a.summary)}</p>
      <section class="panel app-info-card">
        <h3>What you do here</h3>
        <ul>${a.does.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
        <p><b>Who works here:</b> ${esc(a.who)}</p>
        ${a.note ? `<p class="note">${esc(a.note)}</p>` : ''}
      </section>
      <p class="muted">In a real tenant you only see this app if one of your roles allows it.</p>
    </div>`;
}

function renderGlossary(main: HTMLElement) {
  main.innerHTML = `
    <h1 class="view-title">Glossary</h1>
    <p class="view-lead">The terms you meet in the missions, and where to find them in a real tenant.</p>
    <div class="glossary">
      ${GLOSSARY.map(
        (g) => `<article class="panel term"><h3>${esc(g.term)}</h3><p>${esc(g.text)}</p><p class="real">In a real tenant: ${esc(g.realTenant)}</p></article>`,
      ).join('')}
    </div>`;
}

// ---------------------------------------------------------------- mission panel

/** Hints that are open for free in this chapter, before anything is bought. */
const FREE_HINTS = { full: 3, light: 1, paid: 0, none: 0 } as const;

function openMission(id: string) {
  if (!isUnlocked(ctx.progress, id) || id === ctx.progress.currentMission) return;
  rememberEditor();
  ctx.progress.currentMission = id;
  state.report = null;
  state.solved = null;
  save();
  renderMission();
  if (!ctx.progress.tutorialsSeen.includes(id)) openTutorial(id);
}

function renderMission() {
  const panel = document.querySelector<HTMLElement>('#mission');
  if (!panel) return;
  const m = currentMission();
  const mp = missionProgress(ctx.progress, m.id);
  const chapter = CHAPTERS[m.chapter];
  const inChapter = missionsOfChapter(m.chapter);
  const pos = inChapter.indexOf(m);
  const guidance = chapter.guidance;
  const openHints = Math.max(FREE_HINTS[guidance], mp.hintsOpen);
  const xp = ctx.progress.xp;
  const questions = m.checks.filter((c): c is QuestionCheck => c.type === 'question');
  const usesSql = m.checks.some((c) => c.type === 'result');
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
        <button class="btn small" type="button" data-goto="${prev?.id ?? ''}" ${prev && isUnlocked(ctx.progress, prev.id) ? '' : 'disabled'} aria-label="Previous mission">‹ Prev</button>
        <button class="btn small" type="button" data-goto="${next?.id ?? ''}" ${next && isUnlocked(ctx.progress, next.id) ? '' : 'disabled'}
          ${next && !isUnlocked(ctx.progress, next.id) ? 'title="Solve this mission first"' : ''} aria-label="Next mission">Next ›</button>
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
      <p>${usesSql ? 'Checks the SQL in the SQL view editor' : 'Checks what you did in the tenant'}${questions.length ? ' and your answers' : ''}.${mp.done ? ' You already earned the XP for this mission.' : ` Worth ${m.xp} XP, plus ${CLEAN_BONUS} for a clean review.`}</p>
      ${reportHtml()}
    </div>`;

  panel.querySelector('#tutorial-open')!.addEventListener('click', () => openTutorial(m.id));
  panel.querySelectorAll<HTMLButtonElement>('[data-goto]').forEach((b) => b.addEventListener('click', () => b.dataset.goto && openMission(b.dataset.goto)));
  panel.querySelectorAll<HTMLButtonElement>('[data-task]').forEach((b) => b.addEventListener('click', () => openTaskTour(m.id, Number(b.dataset.task))));
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
      if (i !== openHints || ctx.progress.xp < hint.cost) return;
      ctx.progress.xp -= hint.cost;
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
      : `<p class="muted">That was the last mission built so far. The next chapter is in the making; your progress is saved.</p>`}`;
}

async function runCheck() {
  if (state.checking) return;
  const m = currentMission();
  const mp = missionProgress(ctx.progress, m.id);
  rememberEditor();
  state.checking = true;
  state.solved = null;
  renderMission();
  const chapterBefore = currentChapter();
  try {
    state.report = await checkMission(m, { sql: ctx.sql, answers: mp.answers, tenant: ctx.tenant(), events: mp.events });
  } catch (err) {
    state.report = { passed: false, notes: [], outcomes: [{ label: 'Check', ok: false, message: err instanceof Error ? err.message : String(err) }] };
  }
  mp.attempts++;
  if (state.report.passed && !mp.done) {
    const bonus = state.report.notes.length === 0;
    const gained = m.xp + (bonus ? CLEAN_BONUS : 0);
    const before = rankOf(ctx.progress.xp).name;
    mp.done = true;
    mp.xpEarned = gained;
    ctx.progress.xp += gained;
    const after = rankOf(ctx.progress.xp).name;
    state.solved = { xp: gained, bonus, promotedTo: after !== before ? after : undefined };
  }
  state.checking = false;
  save();
  renderRank();
  renderMission();
  // A new chapter may make apps interactive.
  if (currentChapter() !== chapterBefore) {
    refreshNav();
    if (ctx.view !== 'builder') renderView();
  }
  document.querySelector('.feedback')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// ---------------------------------------------------------------- boot

/** Creates the spaces and deployed views of the save game in the database. */
async function prepareTenant() {
  const t = ctx.tenant();
  for (const sp of t.spaces) await exec(`CREATE SCHEMA IF NOT EXISTS "${sp.id}"`);
  seedSourceTables(
    t,
    generateDataset().tables.map((tb) => ({ space: tb.space, name: tb.name, businessName: SOURCE_BUSINESS_NAMES[tb.name] ?? tb.name })),
  );
  await restoreViews(t);
}

async function boot() {
  app.innerHTML = `<div class="boot">Starting the training tenant…</div>`;
  try {
    await initDb();
    // Same seed on every start, so every player sees the same Stadtwerke Rheinau.
    for (const stmt of datasetToSql(generateDataset())) await exec(stmt);
    await prepareTenant();
    save();
    renderFrame();
    const id = ctx.progress.currentMission;
    if (!ctx.progress.tutorialsSeen.includes(id)) openTutorial(id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    app.innerHTML = `<div class="boot">The database could not start: ${esc(msg)}. Reload the page; if it keeps failing, try a current Chrome, Edge or Firefox.</div>`;
  }
}

window.addEventListener('beforeunload', () => {
  rememberEditor();
  save();
});

boot();
