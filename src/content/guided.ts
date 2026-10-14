import type { TourStep } from '../tutorial';

/**
 * Strongly guided, hands-on tutorials for chapters 0 to 3 and 5 to 8.
 *
 * GUIDED_INTROS: the concepts of a mission (read, then Next).
 * GUIDED_TOURS: one list of steps per task of the mission (index = task). Steps with `action` wait until the player
 * has done it. The "Show me" button next to a task plays its list; the mission tutorial plays the intro, then all
 * task lists in order, then "Check my solution" (see main.ts).
 *
 * Rule for the amount of help: chapters 0 and 1 give the exact clicks and values. From chapter 2 on, the tutorial
 * still guides every click, but decisions (which role, which load type, Truncate or not) stay passive steps:
 * the tour explains the options and the player decides.
 */

// ---------------------------------------------------------------- helpers for conditions (DOM only)

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s);
const val = (s: string) => ($<HTMLInputElement>(s)?.value ?? '').trim();
/** The app is open: its entry is selected, or (Security, System) it is expanded with its pages below. */
const appOpen = (id: string) => !!$(`.nav [data-view="${id}"][aria-current="page"], .nav [data-view="${id}"][aria-expanded="true"]`);
const builderSpace = (space: string) => !!$('#space-switch')?.textContent?.includes(space) && !!$('#new-tiles');
const editorOf = (key: string) => !!$('.ed-title small')?.textContent?.includes(key);
const noDialog = () => !$('.guide-overlay');
const tabOn = (sel: string) => !!$(`${sel}[aria-selected="true"]`);
/** SQL in the open editor (upper case, spaces collapsed), for chapter 4 steps that wait for a query. */
const sqlText = () => ($('.cm-content')?.textContent ?? '').toUpperCase().replace(/\s+/g, ' ');
/** The editor contains every word, and the Data Preview shows a result. */
/** c12-m11: the Data Editor shows today's bank message (new PAY-0096, PAY-0012 corrected, PAY-0007 deleted). */
const bankEntered = () => {
  const rows = [...document.querySelectorAll<HTMLTableRowElement>('#tbl-data tbody tr')].map((tr) =>
    [...tr.querySelectorAll<HTMLInputElement>('[data-cell]')].map((i) => i.value.trim()));
  const id = (k: string) => rows.find((r) => r[0] === k);
  return !!id('PAY-0096') && Number(id('PAY-0012')?.[3]) === 286.38 && !id('PAY-0007');
};
const ranWith = (...words: string[]) => () => !!$('#results-body .result-status.ok') && words.every((w) => sqlText().includes(w));
const answered = () => {
  const sets = [...document.querySelectorAll('#questions fieldset')];
  return sets.length > 0 && sets.every((f) => f.querySelector('input:checked'));
};

/** Apps inside the expandable Monitoring entry: the tour first points at Monitoring, then the entry opens. */
const IN_MONITORING: Record<string, string> = { monitor: 'Data Integration', sysmonitor: 'System and Spaces', statements: 'Expensive Statement Logs', tasklogs: 'Task Logs' };

/** Apps that start with the space cards (page type A) until a space is chosen in this visit. */
const SPACE_CARDS: Record<string, string> = { monitor: '#mon-spaces', connections: '#conn-spaces' };

const nav = (id: string, label: string, body: string): TourStep => ({
  title: `Open ${label}`,
  target: IN_MONITORING[id] ? `.nav [data-view="${id}"] || .nav [data-group="monitoring"]` : `.nav [data-view="${id}"]`,
  body,
  action: {
    do: (IN_MONITORING[id]
      ? `Click <b>Monitoring</b> in the side navigation, then <b>${IN_MONITORING[id]}</b>.`
      : `Click <b>${label}</b> in the side navigation.`)
      + (SPACE_CARDS[id] ? ' If it shows the space cards, click the space of the ticket.' : ''),
    check: () => appOpen(id) && !(SPACE_CARDS[id] && $(SPACE_CARDS[id])),
  },
});

const questions = (hint: string): TourStep[] => [
  {
    title: 'Your answers',
    target: '#questions',
    body: `<p>${hint}</p><p>Your choice is saved at once; you can change it until you check.</p>`,
    action: { do: 'Answer every question in the mission panel.', check: answered },
  },
];

// ---------------------------------------------------------------- layer logic

type Layer = 'en' | 'ds' | 'pr';
const LAYERS: Record<Layer, { id: string; name: string; holds: string }> = {
  en: { id: 'RHN_ENTRY', name: 'Entry', holds: 'Source data 1:1: remote tables, replicated tables, files, imported S/4HANA entities. Connections live here. No logic.' },
  ds: { id: 'RHN_DSL', name: 'Data &amp; Semantic', holds: 'Base views (<code>RHN_DS_V_</code>) clean and combine. Facts, dimensions, hierarchies and associations give meaning; data access controls protect it.' },
  pr: { id: 'RHN_PRES', name: 'Presentation', holds: 'Only what consumers see: analytic models (<code>RHN_PR_AM_</code>) and consumption views (<code>RHN_PR_V_</code>) on shared facts and dimensions.' },
};

/** The three layers as a small stack (presentation on top), the layers of this step highlighted. */
const layerStack = (on: Layer[]) => `<div class="tour-layers">${(['pr', 'ds', 'en'] as Layer[]).map((k) => `
  <div class="tl ${on.includes(k) ? 'on' : ''}" data-layer="${k}"><b>${LAYERS[k].name} <code>${LAYERS[k].id}</code></b><small>${LAYERS[k].holds}</small></div>`).join('')}
  <p class="tl-rule">Data moves up one layer at a time, by sharing. Nothing skips a layer.</p></div>`;

/** A read-only step that shows where the mission's work happens in the three-layer landscape. */
const layerStep = (on: Layer[], text: string, title = 'Where we are'): TourStep => ({ title, body: `${layerStack(on)}${text}` });

const closeDialog = (title: string, body: string): TourStep => ({
  title,
  target: '.dialog',
  body,
  action: { do: 'Read it, then close the dialog.', check: noDialog },
});

/** Switch the Data Builder to a space (picker or switch). */
const toSpace = (space: string, body: string): TourStep => ({
  title: `Space ${space}`,
  view: 'builder:landing',
  target: '#space-picker, #space-switch',
  body,
  action: { do: `Select the space <b>${space}</b>.`, check: () => builderSpace(space) },
});

/** Share one object of the current space with another space. */
const shareStep = (object: string, to: string, owner = 'RHN_ENTRY'): TourStep => ({
  title: `Share ${object}`,
  target: `[data-share="${owner}.${object}"]`,
  body: `<p>The share icon at the end of the row. Tick <b>${to}</b> and save.</p>`,
  action: { do: `Share <b>${object}</b> with <b>${to}</b>.`, event: `share:${owner}.${object}->${to}` },
});

/** Open a new SQL view from the start page. */
const newView = (body: string): TourStep => ({
  title: 'New SQL View',
  target: '[data-new="sqlview"]',
  body,
  action: { do: 'Click <b>New SQL View</b>.', check: () => !!$('#editor') && !!$('.ed-title small')?.textContent?.includes('…') },
});

/** Name, save and deploy a new view in RHN_DSL. */
const nameSaveDeploy = (name: string, business: string, space = 'RHN_DSL', deployToo = true): TourStep[] => [
  {
    title: 'Names',
    target: '#properties',
    body: `<p>A business name for people, for example <i>${business}</i>. The technical name follows the convention and is fixed after saving.</p>`,
    action: {
      do: `Enter a business name and the technical name <code>${name}</code>.`,
      check: () => val('#prop-technical') === name && val('#prop-business').length > 2,
    },
  },
  {
    title: 'Save',
    target: '#ed-save',
    body: `<p>Save creates the object in the repository: status <b>Not Deployed</b>.</p>`,
    action: { do: 'Press <b>Save</b>.', event: `save:${space}.${name}` },
  },
  ...(deployToo ? [deployStep(`${space}.${name}`, '<p>Only a deployed view exists in the database. The check reads what is deployed.</p>')] : []),
];

function deployStep(key: string, body: string): TourStep {
  return { title: 'Deploy', target: '#ed-deploy', body, action: { do: 'Press <b>Deploy</b>.', event: `deploy:${key}` } };
}

/** Chapter 6: set the semantic usage of the open view. */
const usageStep = (usage: string, body: string): TourStep => ({
  title: 'Semantic Usage',
  target: '#prop-semantic',
  body,
  action: { do: `Set <b>Semantic Usage</b> to <i>${usage}</i>.`, check: () => val('#prop-semantic') === usage },
});

/** Chapter 6: mark the key column of a dimension. */
const keyStep = (column: string): TourStep => ({
  title: 'The key',
  target: '#column-roles',
  body: `<p>Each column of the view is listed with its role. The key identifies one row: here <code>${column}</code>.
    If the list is empty, run the Data Preview once.</p>`,
  action: { do: `Set the role of <code>${column}</code> to <b>Key</b>.`, check: () => val(`#column-roles select[data-col="${column}"]`) === 'Key' },
});

/** Chapter 6: add one association from the open fact to a dimension. */
const assocStep = (fact: string, dim: string): TourStep[] => [
  {
    title: `Associate ${dim.split('.')[1]}`,
    target: '#assoc-add',
    body: `<p>Opens the dialog for a new association.</p>`,
    action: { do: 'Press <b>Add Association</b>.', appear: '#assoc-target' },
  },
  {
    title: 'Target and key mapping',
    target: '.dialog',
    body: `<p>Pick the target. The dialog then lists the key of the target and proposes the fact column with the same name. Check it, then add.</p>`,
    action: { do: `Choose <code>${dim.split('.')[1]}</code>, check the mapping and press <b>Add</b>.`, event: `assoc:${fact}->${dim}` },
  },
];

// ---------------------------------------------------------------- chapter 7 helpers

const AM_INV = 'RHN_PRES.RHN_PR_AM_INVOICES';

/** Chapter 7: the New Analytic Model tile and the fact picker. */
const newModel = (fact: string, body: string): TourStep[] => [
  {
    title: 'New Analytic Model',
    target: '[data-new="analytic"]',
    body,
    action: { do: 'Click <b>New Analytic Model</b>.', appear: '#am-fact-picker' },
  },
  {
    title: 'The fact source',
    target: '#am-fact-picker',
    body: `<p>Only deployed entities with semantic usage <b>Fact</b> are offered: an analytic model is built on exactly one fact.</p>`,
    action: { do: `Choose <code>${fact.split('.')[1]}</code>.`, event: `am-fact:${fact}` },
  },
];

/** Chapter 7: add dimensions from the fact's associations. */
const addDims = (dims: string[], body: string): TourStep => ({
  title: 'Dimensions from associations',
  target: '#am-canvas',
  body,
  action: {
    do: `Add ${dims.map((d) => `<b>${d}</b>`).join(' and ')} to the model.`,
    check: () => dims.every((d) => !!$(`[data-node="RHN_DSL.RHN_DS_D_${d.toUpperCase().replace(' ', '_')}"]`)),
  },
});

/** Chapter 7: select the whole model to see its measures and variables. */
const modelBg: TourStep = {
  title: 'The whole model',
  target: '#am-canvas',
  body: `<p>Click an empty spot of the canvas, for example the grey hint below the nodes. The properties then show the whole model:
    its measures and variables.</p>`,
  action: { do: 'Click the canvas background.', appear: '#am-measures' },
};

/** Chapter 7: open an existing model in RHN_PRES. */
const openModel = (name: string): TourStep => ({
  title: `Open ${name}`,
  view: 'builder:landing:RHN_PRES',
  target: '#object-list',
  body: `<p>Analytic models are listed with the other objects of the space (tab <b>Models</b>).</p>`,
  action: { do: `Open <b>${name}</b>.`, check: () => editorOf(`RHN_PRES.${name}`) },
});

/** Chapter 7: a measure dialog. */
const addMeasure = (type: string, label: string, name: string, body: string): TourStep[] => [
  {
    title: `+ ${label}`,
    target: '#am-add-measure',
    body: `<p>The Measures section of the model offers the measure types.</p>`,
    action: { do: `Click <b>+ ${label}</b>.`, appear: '#am-m-name' },
  },
  {
    title: type,
    target: '.dialog',
    body,
    action: { do: `Fill it in for <code>${name}</code> and press <b>Add</b>.`, event: `am-measure:${type}:${name}` },
  },
];

/** Chapter 7: the Data Preview of a model with certain rows. */
const amPreview = (key: string, row: string, body: string): TourStep => ({
  title: 'Data Preview',
  target: '#am-pivot',
  body,
  action: { do: `Tick <b>${row}</b> in the rows, choose the measures and press <b>Data Preview</b>.`, event: `^am-rows:${key.replace('.', '\\.')}:.*${row.split(' ').pop()}` },
});

// ---------------------------------------------------------------- chapter 8 helpers

const DAC_KEY = 'RHN_DSL.RHN_DS_DAC_GRID_AREA';
const $$ = (sel: string) => [...document.querySelectorAll<HTMLInputElement>(sel)];

/** Chapter 8: open a fact, run its preview, assign the grid area control and deploy. */
const assignDac = (view: string, intro: string): TourStep[] => [
  {
    title: `Open ${view.split('.')[1]}`,
    view: `builder:landing:${view.split('.')[0]}`,
    target: '#object-list',
    body: `<p>${intro}</p>`,
    action: { do: `Open <b>${view.split('.')[1]}</b>.`, check: () => editorOf(view) },
  },
  {
    title: 'Columns first',
    target: '#run',
    body: `<p>The properties need the view's columns to map the criterion. A Data Preview reads them.</p>`,
    action: { do: 'Press <b>Data Preview</b>.', event: `preview:${view}` },
  },
  {
    title: 'Data Access Controls',
    target: '#dac-assign',
    body: `<p>The last section of the properties, after the associations. A view can have several controls.</p>`,
    action: { do: 'Press <b>Assign</b>.', appear: '#dac-pick' },
  },
  {
    title: 'Control and mapping',
    target: '.dialog',
    body: `<p>Pick the control. For each criterion, choose the column of this view that holds the same values.</p>`,
    action: { do: 'Choose <code>RHN_DS_DAC_GRID_AREA</code>, check the mapping and press <b>Assign</b>.', event: `dac-assign:${view}->${DAC_KEY}` },
  },
  deployStep(view, `<p>Until you deploy, everyone still sees every row: the control is only in the saved design.</p>`),
];

// ---------------------------------------------------------------- grand tour (c00-m00)

/** Where an app sits in the side navigation, for the grand tour: the group to open first, if any. */
const TOUR_GROUP: Record<string, [string, string]> = {
  sysmonitor: ['monitoring', 'Monitoring'], capacities: ['monitoring', 'Monitoring'], tasklogs: ['monitoring', 'Monitoring'],
  statements: ['monitoring', 'Monitoring'], ecn: ['monitoring', 'Monitoring'], monitor: ['monitoring', 'Monitoring'],
  catalog: ['catalog', 'Catalog &amp; Marketplace'], marketplace: ['catalog', 'Catalog &amp; Marketplace'],
  semantic: ['apps', 'Apps'], business: ['apps', 'Apps'], builder: ['apps', 'Apps'], connections: ['apps', 'Apps'],
  spaces: ['utilities', 'Utilities'], translation: ['utilities', 'Utilities'], transport: ['utilities', 'Utilities'], sharing: ['utilities', 'Utilities'],
};

/**
 * One app of the grand tour: the player opens it, the page appears next to the card, and the card stays until Next,
 * so what it does, why it exists and when we need it can be read with the page in view.
 */
const visit = (id: string, label: string, what: string, why: string, when: string): TourStep => {
  const g = TOUR_GROUP[id];
  return {
    title: label,
    target: g ? `.nav [data-view="${id}"] || .nav [data-group="${g[0]}"]` : `.nav [data-view="${id}"]`,
    body: `<p>${what}</p><p><b>Why it exists:</b> ${why}</p><p><b>At Stadtwerke Rheinau:</b> ${when}</p>`,
    action: {
      do: g
        ? `Click <b>${label}</b> in the side navigation. If you cannot see it, open <b>${g[1]}</b> first.`
        : `Click <b>${label}</b> in the side navigation.`,
      check: () => appOpen(id),
      stay: true,
    },
  };
};

/** Grand tour: every card sits on the mission panel, so the page it explains stays in view (questions excepted, they live there). */
const docked = (lists: TourStep[][]): TourStep[][] => lists.map((l) => l.map((st) => (st.target === '#questions' ? st : { ...st, dock: true })));

/** A passive step of the grand tour that points at something on the screen. */
const look = (title: string, target: string, body: string): TourStep => ({ title, target, body });

/** A hands-on step of the grand tour that waits for Next after it is done. */
const tryIt = (title: string, target: string, body: string, action: Omit<NonNullable<TourStep['action']>, 'stay'>): TourStep =>
  ({ title, target, body, action: { ...action, stay: true } });

// ---------------------------------------------------------------- intros

export const GUIDED_INTROS: Record<string, TourStep[]> = {
  'c00-m00': [
    {
      title: 'Welcome to the training tenant',
      hero: true,
      body: `<p>This game works like <b>SAP Datasphere</b>: the same apps, the same names, the same way of working. You learn where things are
        and what they are for, then you build a small data warehouse for Stadtwerke Rheinau.</p>
        <p>Every mission starts with a tutorial like this one. It shows you each step, and in steps marked <b>Your turn</b>
        you do it yourself; the tutorial waits and goes on by itself. You start with <b>0 XP</b>.</p>`,
    },
    {
      title: 'Why a grand tour',
      hero: true,
      body: `<p>SAP Datasphere has about twenty apps. In a project you use six of them every day and the rest a few times a year,
        but you must know that they exist, or you rebuild by hand what an app already does.</p>
        <p>So before the first real ticket you click through <b>every function</b> once: the shellbar, then every app from the top of the side navigation to the bottom.
        For each app the card says what it does, why it exists and when you need it at Stadtwerke Rheinau.</p>
        <p>The cards sit on the right, where the mission panel is, so the app they explain stays in view. It takes about fifteen minutes. You can leave with <b>Skip tutorial</b> and come back with <b>Show tutorial</b>; the <b>Show me</b>
        button next to each task replays just that part.</p>`,
    },
    {
      title: 'The project in one picture',
      hero: true,
      body: `<p>The board wants one trusted view of revenue, consumption and receivables per grid area. You build it in three layers:</p>
        ${layerStack(['en', 'ds', 'pr'])}
        <p>Keep the picture in mind during the tour: most apps either bring data <b>in</b> (bottom), shape it in the <b>middle</b>,
        hand it <b>out</b> to consumers (top), or run the tenant around all three.</p>`,
    },
    {
      title: 'The ticket',
      target: '.ticket',
      body: `<p>Work arrives as tickets. This one is from your mentor Calin Mucea. A ticket says what is needed.</p>`,
    },
    {
      title: 'Your task',
      target: '#task',
      body: `<p>The task breaks the ticket into steps. The <b>Show me</b> button next to a step plays the guided part for just that step,
        whenever you need it again.</p>`,
    },
    {
      title: 'Hints',
      target: '#hints',
      body: `<p>Below are hints in three levels. In the first chapters they are free; later you buy them with XP.</p>`,
    },
  ],
  'c00-m01': [
    {
      title: 'Now on your own',
      body: `<p>The tour showed you every app. This mission asks for the six you will use most: open them once more yourself
        and answer five everyday questions. The tutorial still points at each one, but the answers are yours.</p>`,
    },
    {
      title: 'The side navigation',
      target: '.nav',
      body: `<p>Remember the order: <b>Monitoring</b> and <b>Catalog &amp; Marketplace</b> open a list, under <b>Apps</b> you model and integrate,
        under <b>Utilities</b> you run spaces, translation and transport, and <b>Security</b> and <b>System</b> sit at the bottom.</p>`,
    },
  ],
  'c00-m02': [
    {
      title: 'Spaces first',
      body: `<p>In SAP Datasphere everything you build lives in a <b>space</b>: an isolated area with its own members, storage and objects.
        That is why the Data Builder asks for a space before anything else.</p>`,
    },
  ],
  'c00-m03': [
    {
      title: 'Find things without knowing the space',
      body: `<p>Clicking through spaces gets slow once there are many. The <b>Repository Explorer</b> searches all spaces you are a member of at once,
        by business name and technical name.</p>`,
    },
  ],
  'c00-m04': [
    {
      title: 'Two names',
      body: `<p>The <b>technical name</b> is how SQL and other objects refer to an object. It never changes.
        The <b>business name</b> is what people read, in Datasphere and in SAP Analytics Cloud. You can change it any time.</p>`,
    },
    {
      title: 'Design time and runtime',
      body: `<p>Every Data Builder editor has <b>Save</b> and <b>Deploy</b>.</p>
        <ul><li><b>Save</b> stores your design. Nothing changes for anyone else yet.</li>
        <li><b>Deploy</b> makes it active in the database. Views and reports now use this version.</li></ul>
        <p>The status shows where an object stands: <b>Not Deployed</b>, <b>Changes to Deploy</b> or <b>Deployed</b>. Watch it change.</p>`,
    },
  ],
  'c01-m01': [
    {
      title: 'Chapter 1: Space concept',
      body: `<p>Until now you worked in one space that IT prepared. Now you design the landscape yourself.</p>
        <p>A <b>space</b> is an isolated area in the tenant: its own members, storage, priority and objects.
        Objects in one space are invisible to the others until you share them.</p>`,
    },
    layerStep(['en', 'ds', 'pr'], `<p>Calin's architecture has <b>three layers</b>, one space each. Read it from the bottom up:
        data enters 1:1, gets cleaned and gets its meaning, and only then is shown to consumers.</p>
      <p>Why split it? Each layer has its own people, storage and priority, and each layer only sees what the layer below shares.
        A report user never touches the raw data; a load never breaks a model.</p>`, 'Three layers'),
    {
      title: 'What lives where',
      body: `<p>A quick rule for every object you will build:</p>
        <ul><li>Does it <b>bring data in</b> (connection, remote table, replication flow, imported entity)? <b>Entry</b>.</li>
        <li>Does it <b>clean or combine</b> data, or say what the data <b>means</b> (fact, dimension, association, access control)? <b>Data &amp; Semantic</b>.</li>
        <li>Is it what a <b>consumer opens</b> (analytic model, view for Excel or Power BI)? <b>Presentation</b>.</li></ul>
        <p>The space ID carries the layer: <code>RHN_ENTRY</code>, <code>RHN_DSL</code>, <code>RHN_PRES</code>.</p>`,
    },
    {
      title: 'Space ID and space name',
      body: `<p>A space has two names:</p>
        <ul><li><b>Space name</b>: for people, up to 30 characters, can be changed any time.</li>
        <li><b>Space ID</b>: the technical name, up to 20 characters, only <code>A–Z</code>, <code>0–9</code> and <code>_</code>.
          It <b>cannot be changed</b> after the space is created.</li></ul>
        <p>Made a typo in an ID? Delete the space and create it again. That is what you would do in a real tenant too.</p>`,
    },
  ],
  'c01-m02': [
    {
      title: 'Disk, in-memory, priority',
      body: `<p><b>Disk</b> stores data. <b>In-memory</b> keeps data in RAM so it can be read very fast; it is smaller and more expensive.
        A space can never have more in-memory than disk.</p>
        <p><b>Priority</b> goes from 1 (lowest) to 5 (highest). When the database is busy, statements from spaces with a higher priority are favored.</p>`,
    },
  ],
  'c01-m03': [
    {
      title: 'Spaces are walls',
      body: `<p>Data in one space is invisible to every other space. To let a layer build on the layer below, you <b>share</b> objects.
        The data stays where it is, nothing is copied.</p>
        <p>The rule of the landscape: <b>RHN_ENTRY</b> → shared with → <b>RHN_DSL</b> → shared with → <b>RHN_PRES</b>. Never skip a layer.</p>`,
    },
    layerStep(['en', 'ds'], `<p>Today the first share: two entry tables go up to the data &amp; semantic layer. The presentation layer gets nothing from the
        entry layer, ever. Its turn comes in chapter 7, with facts and dimensions.</p>`),
  ],
  'c01-m04': [
    {
      title: 'Why names matter',
      body: `<p>A landscape grows to hundreds of objects. A good name tells you, without opening the object, which layer it lives in and what kind of object it is.
        Datasphere does not enforce names; teams agree on a convention and check it in reviews.</p>`,
    },
  ],
  'c02-m01': [
    {
      title: 'Chapter 2: Users and roles',
      body: `<p>Spaces separate the data. Roles decide what people may <b>do</b> with it, and where.</p>
        <p><b>DW Administrator</b> is a <b>global</b> role: the whole tenant. All other roles here are <b>scoped</b>: a template
        (what the role may do) plus a <b>scope</b> (the spaces it can be used in).</p>
        <p>From this chapter on the tutorial still shows every click, but the decisions are yours. Only the first hint is free.</p>`,
    },
  ],
  'c02-m02': [
    {
      title: 'Least privilege',
      body: `<p>The rule for this mission: everyone gets the smallest set of rights that lets them do their job.</p>
        <ul><li>Only reads reports in SAP Analytics Cloud: <b>Consumer</b>.</li>
        <li>Must look at models without changing them: <b>Viewer</b>.</li>
        <li>Builds: <b>Modeler</b>, in the spaces where they build. Loads data: <b>Integrator</b>.</li></ul>`,
    },
  ],
  'c02-m03': [
    {
      title: 'Joiners, movers, leavers',
      body: `<p>Access is not a one-time job. Each change needs two steps: give what the new job needs, and take away what the old job needed.</p>`,
    },
  ],
  'c03-m01': [
    {
      title: 'Chapter 3: Data integration',
      body: `<p>So far the data in <code>RHN_ENTRY</code> was a one-off copy IT made for the pilot. Now you connect the real source systems and decide
        how their data gets in: read live, copied once, or kept up to date by delta.</p>
        <p>Three apps work together: <b>Connections</b> (where a system is and how to log on), the <b>Data Builder</b> (remote tables and flows),
        and the <b>Data Integration Monitor</b> (runs, schedules, logs).</p>`,
    },
    layerStep(['en'], `<p>The whole chapter happens in the <b>entry layer</b>. Connections, remote tables, replication flows and imported entities
        all live in <code>RHN_ENTRY</code>: the layers above never talk to a source system, they read what the entry layer shares.</p>`),
    {
      title: 'Connection types and features',
      body: `<p>A connection is created from a <b>connection type</b>: SAP S/4HANA Cloud, SAP HANA, Amazon S3 and many more.
        Each type supports a set of <b>features</b>:</p>
        <ul><li><b>Remote Tables</b>: read objects of the source without copying them</li>
        <li><b>Data Flows</b> and <b>Replication Flows</b>: copy data into tables</li>
        <li><b>Model Import</b>: import entities with their semantics</li></ul>
        <p>A connection belongs to <b>one space</b>. Its members can use it; nobody else.</p>`,
    },
  ],
  'c03-m02': [
    {
      title: 'Cloud and on-premise',
      body: `<p>Datasphere runs in the cloud. Systems in your own data center are not reachable from the internet, on purpose.
        The <b>SAP Cloud Connector</b>, installed in the company network, links the two. A connection names it by its <b>location ID</b>.</p>
        <p>With <b>TLS</b>, the server shows a certificate. The tenant accepts it only if it trusts that certificate or the authority (CA) that signed it.</p>
        <p>In this mission, validation will fail a few times. That is planned: each failure names one missing piece.</p>`,
    },
  ],
  'c03-m03': [
    {
      title: 'Remote tables and data access',
      body: `<p>A <b>remote table</b> brings an object of a connection into the space: its structure lives here, its data in the source.
        Each remote table has a <b>data access</b>:</p>
        <ul><li><b>Remote</b>: every query is sent to the source. Always current, but each query costs the source and depends on it.</li>
        <li><b>Replicated (Snapshot)</b>: a full copy is stored in the space. Fast and independent, but only as fresh as the last load.</li></ul>
        <p>Scheduled tasks run in <b>your</b> name, so the tenant asks for your <b>consent</b> to job scheduling first.</p>`,
    },
  ],
  'c03-m04': [
    {
      title: 'Replication flows',
      body: `<p>A <b>replication flow</b> copies objects of one source connection into local tables, with little modeling: no joins, no logic,
        only projections (filters, column mapping, extra columns).</p>
        <ul><li><b>Initial Only</b>: everything is loaded once.</li>
        <li><b>Initial and Delta</b>: everything once, then only the changes. Needs a delta-capable source.</li>
        <li><b>Truncate</b>: empties the target table before the load, completely.</li></ul>`,
    },
  ],
  'c03-m05': [
    {
      title: 'Files as a source',
      body: `<p>Some systems cannot be connected directly and drop files instead, for example into an Amazon S3 bucket.
        A connection to cloud storage offers flows, not remote tables.</p>
        <p>Every entry row should say which system it came from. If the source does not deliver that, the load adds it:
        the <b>projection</b> of a replication object can add columns with a constant value.</p>`,
    },
  ],
  'c03-m06': [
    {
      title: 'Something broke at night',
      body: `<p>Failed loads show up in the <b>Data Integration Monitor</b>: open the flow, pick the failed run, read its messages from top to bottom.
        The last one usually names the cause.</p>
        <p>Each space has a disk quota. A space that uses more than assigned is <b>locked</b>: no loads, no deployments,
        until it has enough storage again and someone presses <b>Unlock</b>.</p>`,
    },
  ],
  'c03-m07': [
    {
      title: 'Import Entities',
      body: `<p>Remote tables and replication flows bring <b>data</b>. <b>Import Entities</b> brings data <b>with its meaning</b>: for a CDS view of
        S/4HANA it creates the tables, a view with the right <b>semantic usage</b> (Dimension), and follows the associations to its
        <b>supporting entities</b>, such as a text entity with one name per language.</p>
        <p>The wizard has three steps: <b>Configuration</b> (connection, target space, data access), <b>Select Entities</b> (search by label,
        filter by application component, modeling pattern and release contract) and <b>Review Entities</b> (what will be created).</p>`,
    },
    {
      title: 'Release contract C1',
      body: `<p>Only CDS views SAP released for extraction (release contract <b>C1</b>) come with their data access and follow associations.
        A custom view without release is imported as an empty local table; you would load it with a data flow.</p>
        <p>Data access: <b>Replication Flow to Local Tables</b> is proposed and recommended by SAP. The tables stay empty until the flow runs.</p>`,
    },
    layerStep(['en'], `<p>An import always lands in the space of its connection: for <code>RHN_S4U</code> that is the entry layer. The imported
        objects keep SAP's names and are updated by every new import, so you leave them as delivered and use them from <code>RHN_DSL</code>,
        through sharing, like every other entry table.</p>`),
  ],
  'c05-m01': [
    {
      title: 'Chapter 5: Base views',
      body: `<p>In chapter 4 you found what is wrong with the raw data. Now you fix it, in the right place: <b>base views in RHN_DSL</b>
        (<code>RHN_DS_V_</code>) that read the shared entry tables and deliver clean, uniform data. The entry tables stay exactly as the sources sent them.</p>
        <p>From now on your work is <b>deployed views</b>: the check reads what runs in the database, not the editor.
        Hints cost XP from the first one; the tutorials stay free.</p>`,
    },
    layerStep(['ds'], `<p>The data &amp; semantic layer has two halves. This chapter builds the lower one: <b>base views</b> that clean and combine.
        Chapter 6 builds the upper one on top of them, in the same space: facts and dimensions that say what the data <b>means</b>.</p>`),
    {
      title: 'Translate values with CASE',
      body: `<p><code>CASE</code> turns one value into another, row by row:</p>
        <pre>CASE REGION WHEN 'NORTH' THEN 'Nord'
             WHEN 'SOUTH' THEN 'Süd'
             ELSE REGION END AS REGION_DE</pre>
        <p>Every value you do not list goes to <code>ELSE</code>. Without <code>ELSE</code> it becomes <code>NULL</code>, and rows silently lose
        their value. <code>AS</code> names the result column.</p>`,
    },
    {
      title: 'Or: a mapping table',
      body: `<p>The same translation can live in a small <b>table</b> in RHN_DSL: one row per legacy code and its S/4 code, typed in the
        <b>Data Editor</b>. The view joins it with <code>LEFT JOIN</code> and keeps the original value with <code>COALESCE</code>.</p>
        <p>The tutorial shows CASE. The mapping table is the way for longer lists; Hint 4 describes it.</p>`,
    },
  ],
  'c05-m02': [
    {
      title: 'Change a deployed view',
      body: `<p>Views others build on are changed, not copied. You open the view, change it, <b>Save</b> (status <i>Changes to Deploy</i>:
        the database still runs the old version) and <b>Deploy</b>. The technical name stays, so everything built on it keeps working.</p>
        <p>Before you change it, look at <b>Impact and Lineage</b>: what the view reads, and who reads the view.</p>`,
    },
    {
      title: 'Keep every row: LEFT JOIN',
      body: `<p>An inner <code>JOIN</code> keeps only rows with a partner on both sides. A <code>LEFT JOIN</code> keeps every row of the first
        table; where there is no partner, the columns of the second table are <code>NULL</code>.</p>
        <p><code>COALESCE(a, b)</code> returns <code>a</code>, or <code>b</code> when <code>a</code> is <code>NULL</code>: a fallback.</p>`,
    },
  ],
  'c05-m03': [
    {
      title: 'What is a duplicate?',
      body: `<p>Before you remove duplicates, define what makes two records the <b>same person</b>, and test that rule on the data.
        A rule that is too loose merges different people; one that is too strict misses duplicates.</p>
        <p>Then decide which record <b>survives</b>. The contracts point to one of the IDs; that one must stay.</p>`,
    },
    {
      title: 'Number the rows per group',
      body: `<p><code>ROW_NUMBER() OVER (PARTITION BY … ORDER BY …)</code> numbers rows inside each group, starting at 1:</p>
        <pre>ROW_NUMBER() OVER (PARTITION BY REGION
                   ORDER BY GRID_AREA) AS RN</pre>
        <p>Number the rows in a subquery, then keep <code>WHERE RN = 1</code> outside. That works in SAP HANA SQL too.</p>`,
    },
  ],
  'c05-m04': [
    {
      title: 'Units and exact copies',
      body: `<p>Two classic cleanings in one view:</p>
        <ul><li><b>Units</b>: convert per row with <code>CASE WHEN UNIT = … THEN … ELSE … END</code>, and name the column after the unit.</li>
        <li><b>Exact duplicates</b>: <code>SELECT DISTINCT</code> returns each different row once.</li></ul>
        <p>Compare the row count in the Data Preview with what you expect.</p>`,
    },
  ],
  'c05-m05': [
    {
      title: 'Built once, used everywhere',
      body: `<p>The CFO's question is answered from the base views as they are: no mapping, no unit conversion, no deduplication.
        That work is done once, in the base views.</p>`,
    },
    layerStep(['ds'], `<p>Your query stays in <code>RHN_DSL</code>. Base views are building blocks; the presentation layer will never see them.
        It gets facts and dimensions with meaning, shared in chapter 7. So nothing is shared with <code>RHN_PRES</code> today.</p>`, 'Not yet presentation'),
  ],
  'c06-m01': [
    {
      title: 'Chapter 6: Semantics',
      body: `<p>Up to now every view was a <b>Relational Dataset</b>: rows and columns, nothing more. Now the data &amp; semantic layer says
        what the data <b>means</b>:</p>
        <ul><li><b>Fact</b>: holds measures, numbers you add up (kWh, amounts).</li>
        <li><b>Dimension</b>: describes them (grid area, tariff, customer) and has a <b>key</b>.</li>
        <li><b>Text</b> and <b>Hierarchy</b>: language-dependent names and drill-down paths for a dimension.</li></ul>`,
    },
    {
      title: 'Where you set it',
      body: `<p>In the properties of a saved view: <b>Semantic Usage</b>, then a role per column: <b>Key</b> or <b>Attribute</b> in a dimension,
        <b>Measure</b> or <b>Attribute</b> in a fact. Like everything else: Save, then Deploy. The checks read what is deployed.</p>`,
    },
    layerStep(['ds'], `<p>Semantic objects live in the same space as the base views, on top of them: <code>RHN_DS_D_</code> for dimensions,
        <code>RHN_DS_F_</code> for facts. Their rule: they build only on base views, never directly on entry tables. If a source changes,
        one base view changes, and every fact and dimension above it keeps working.</p>`),
  ],
  'c06-m02': [
    {
      title: 'Only what reports need',
      body: `<p>A dimension does not have to pass on every column of its base view. Picking columns is the simplest data protection:
        what never reaches a dimension cannot reach a model in the presentation layer, nor the people who read it.</p>`,
    },
  ],
  'c06-m03': [
    {
      title: 'A narrow fact',
      body: `<p>A fact holds <b>keys</b> (GRID_AREA, TARIFF, CUSTOMER_ID), dates and <b>measures</b>. Names and regions stay in the dimensions.</p>
        <p>Measure or attribute? Ask: does adding it up mean something? kWh: yes. A customer ID or a date: no, you group and filter by those.</p>`,
    },
  ],
  'c06-m04': [
    {
      title: 'Associations',
      body: `<p>An <b>association</b> is a semantic link from the fact to a dimension: a target and a key mapping
        (fact column → key of the dimension). It is not a join in the fact's SQL. Consumers such as the analytic model join along it
        when a query needs the dimension.</p>
        <p>Only deployed dimensions with a key can be targets.</p>`,
    },
  ],
  'c06-m05': [
    {
      title: 'Reuse the dimensions',
      body: `<p>The second fact uses the same three dimensions. That is the point of keeping them separate: one grid area dimension,
        one tariff dimension, one customer dimension for every fact. This shape is called a <b>star schema</b>.</p>`,
    },
  ],
  'c07-m01': [
    {
      title: 'Chapter 7: Analytic Model',
      body: `<p>Facts and dimensions describe the data. The <b>analytic model</b> decides what consumers such as SAP Analytics Cloud
        <b>see</b> of it: which measures, which dimensions and attributes, which variables.</p>
        <ul><li>It is built on exactly <b>one fact</b>.</li>
        <li>Its dimensions come from the fact's <b>associations</b>: no joins to write.</li>
        <li>Its <b>Data Preview</b> shows it the way a story in SAP Analytics Cloud would.</li></ul>`,
    },
    layerStep(['ds', 'pr'], `<p>Now the top layer gets its first objects. The facts and dimensions stay in <code>RHN_DSL</code>; you <b>share</b> a fact
        together with the dimensions the model needs (SAP calls them its <b>supporting entities</b>) with <code>RHN_PRES</code>, and build the model there.</p>
      <p>What you do not share, the presentation layer cannot reach: the customer dimension, the base views, the entry tables.</p>`),
    {
      title: 'The editor',
      body: `<p>The canvas shows the fact in the middle and its associated dimensions next to it. Dashed ones are associated but not in the model yet.
        Click a node for its measures and attributes, click the background for the whole model. Save and Deploy as always.</p>`,
    },
  ],
  'c07-m02': [
    {
      title: 'Measure types',
      body: `<p>Besides the measures of the fact (<b>fact source measures</b>), a model can define its own:</p>
        <ul><li><b>Calculated</b>: a formula over other measures, e.g. gross = net + tax.</li>
        <li><b>Restricted</b>: a measure for some values only, e.g. open invoices.</li>
        <li><b>Count Distinct</b>: how many different values, e.g. customers.</li></ul>
        <p>Calculated measures are evaluated after aggregation, so the formula works on totals in every drill-down.</p>`,
    },
  ],
  'c07-m03': [
    {
      title: 'Restrict, do not filter',
      body: `<p>A filter applies to the whole report. A <b>restricted measure</b> applies only to itself: the report can show total gross and
        unpaid gross side by side.</p>`,
    },
  ],
  'c07-m04': [
    {
      title: 'Variables',
      body: `<p>A <b>filter variable</b> asks the consumer for a value when the report opens and filters the model by it: a single value or an interval,
        optional or mandatory. Other types (standard, restricted measure, reference date) exist in a real tenant.</p>
        <p>A <b>count distinct</b> is not additive: a customer with power and gas counts once in the total, but once per commodity in the rows.</p>`,
    },
  ],
  'c07-m05': [
    {
      title: 'One model per use case',
      body: `<p>Each fact gets its own model, and a model is built for one group of consumers: only the measures, dimensions and variables they need.
        Lean models are easier to understand and expose less data.</p>`,
    },
  ],
  'c08-m01': [
    {
      title: 'Chapter 8: Data access controls',
      body: `<p><b>Roles</b> (chapter 2) decide what someone may open. A <b>data access control</b> decides which <b>rows</b> he sees there.</p>
        <ul><li>A <b>permissions entity</b> lists, per user, the values he may see.</li>
        <li>A <b>data access control</b> reads it: identifier column = user ID, criteria = the values.</li>
        <li>Assigned to a view, it filters the rows for each user. No entry, no rows.</li></ul>`,
    },
    layerStep(['ds', 'pr'], `<p>Access controls protect the data where it lives: the permissions table, the control and its assignment are all in
        <code>RHN_DSL</code>, next to the facts. A shared fact keeps its control, so every model in <code>RHN_PRES</code> filters the rows without
        anyone having to remember it.</p>`),
    {
      title: 'A local table',
      body: `<p>The permissions entity here is a small <b>local table</b>. You define its columns and type the rows in its <b>Data Editor</b>,
        then deploy it like any other object.</p>`,
    },
  ],
  'c08-m02': [
    {
      title: 'Identifier and criteria',
      body: `<p>The <b>identifier column</b> says who a row is for (the user ID). The <b>criteria</b> say what he may see (here: a grid area).
        Type <b>Single Values</b>: a row of the protected view is visible when its value matches one of the user's entries.</p>`,
    },
  ],
  'c08-m03': [
    {
      title: 'Where the control sits',
      body: `<p>Assign the control to the view that holds the numbers: the fact in <code>RHN_DSL</code>. Everything built on it takes the control
        over, also across the share: the analytic model in <code>RHN_PRES</code> filters by it. To check it, preview the model <b>as a user</b>.</p>`,
    },
  ],
  'c09-m01': [
    {
      title: 'Chapter 9: Persistence and performance',
      body: `<p>Views are <b>virtual</b>: every time someone reads a model, the fact, the views below it and their joins are computed again.
        That keeps the data fresh, but a deep stack on many rows gets slow.</p>
        <p>The way out is <b>persistence</b>: a view stores its result as a snapshot. Fast to read, but it costs memory and is only as fresh as its
        last run. This chapter: measure, find the expensive layer, persist it, schedule it, and know the limits.</p>`,
    },
    layerStep(['ds', 'pr'], `<p>The slow story opens a model in <code>RHN_PRES</code>, but the model holds no data: it reads the shared fact, and the fact reads
        the base views. The expensive work is in <code>RHN_DSL</code>, so that is where you measure and persist. Presentation objects stay light.</p>`),
    {
      title: 'Measure first',
      body: `<p><b>Expensive statement tracing</b> records SQL statements that exceed a threshold, with duration, peak memory and CPU time.
        It is off by default; an administrator switches it on in System › Configuration › Monitoring.</p>
        <p>In the game, runtimes are simulated for production volume: the training tenant only holds a sample.</p>`,
    },
  ],
  // ================================================================ chapter 4 (SQL profiling)
  'c04-m01': [
    {
      title: 'Chapter 4: Profile the entry data',
      body: `<p>Before anyone models, a data architect looks at the raw data. In this chapter you <b>profile</b> the entry tables with SQL:
        count, group, sum and join, and find what is wrong.</p>
        <p>As in chapter 3, only the first hint is free. The tutorials stay free and walk you through every click; the SQL you write yourself.</p>`,
    },
    layerStep(['en'], `<p>You look, you do not change: profiling queries run in scratch views of <code>RHN_ENTRY</code> that are never saved.
        Whatever you find gets fixed one layer up, in the base views of <code>RHN_DSL</code> (chapter 5).</p>`),
    {
      title: 'A scratch SQL view',
      body: `<p>For profiling you open a <b>New SQL View</b> in the Data Builder of <b>RHN_ENTRY</b> and only use <b>Data Preview</b>.
        You do not save or deploy it: the entry layer holds source data 1:1, without logic.</p>
        <p><b>Check my solution</b> runs the SQL in your editor. Column names and order are up to you; only the result counts.</p>`,
    },
  ],
  'c04-m02': [
    {
      title: 'A ticket from the CFO',
      body: `<p>Your first ticket from the business. Petra Lindner, the CFO, wants to know how much money sits in each invoice status.</p>
        <p>Business people speak in business terms. "Gross amount" is not a column, you have to calculate it: <b>net plus tax</b>.
        The tenant's business "today" is 15 July 2026; it decides which invoices are open and which are overdue.</p>`,
    },
  ],
  'c04-m03': [
    {
      title: 'A list instead of a summary',
      body: `<p>This time the CFO does not want totals but single invoices: the 10 biggest overdue ones, biggest first.</p>
        <p>You need three new pieces of SQL: a <b>filter</b> (<code>WHERE</code>), a <b>sort</b> (<code>ORDER BY</code>) and a <b>limit</b> (<code>LIMIT</code>).
        Order matters this time, so the check also looks at the row order.</p>`,
    },
  ],
  'c04-m04': [
    {
      title: 'Data from two tables',
      body: `<p>The contracts know their grid area, but not the region. The region is in a second table, <b>RHN_ENTRY.GRID_AREAS</b>.
        To bring both together you need a <b>join</b>.</p>
        <p>A good habit after every join: add up your counts and compare with the source table. If the numbers differ, rows were lost or duplicated.</p>`,
    },
  ],
  'c12-m01': [
    {
      title: 'Chapter 12: Excursions',
      body: `<p>The main game is done. Four short side trips show the apps around it: how data leaves Datasphere, how content moves to
        production, how people find it in the catalog, and the old Business Builder you will meet in existing projects.</p>
        <p>Light hints again: the first is free, the rest cost XP.</p>`,
    },
    {
      title: 'Four ways out',
      body: `<p>SAP Analytics Cloud and its Excel add-in read <b>analytic models</b> live. Tools such as Power BI read <b>views</b> over SQL
        (ODBC/JDBC) through a <b>database user</b> of the space. Other clients use the OData API. Replication flows can push data out
        (licence-dependent).</p>
        <p>Whatever goes out over SQL must be <b>exposed for consumption</b> first: a switch on the view, active after Deploy.</p>`,
    },
    layerStep(['pr'], `<p>Every way out starts in the <b>presentation layer</b>. A tool that reads over SQL gets a <b>consumption view</b> in
        <code>RHN_PRES</code> (<code>RHN_PR_V_</code>) on a shared fact or dimension, and a database user of that space. Nothing in <code>RHN_DSL</code>
        is exposed: that space holds base views with personal data.</p>`),
  ],
  'c12-m02': [
    {
      title: 'Development, test, production',
      body: `<p>You model in development. Test and production get your work as a <b>package</b>: objects of one space plus what they need.
        What lives in another space comes from a <b>required package</b>. A valid package is exported to the Content Network for the
        target tenants, and imported there.</p>`,
    },
  ],
  'c12-m03': [
    {
      title: 'The catalog',
      body: `<p>The catalog extracts the objects of connected systems as <b>assets</b>: names, columns, lineage, never the data. You add what
        people need to trust an asset: a description, tags and <b>glossary terms</b>. Only published entries are visible to catalog users.</p>`,
    },
  ],
  'c12-m04': [
    {
      title: 'The Business Builder',
      body: `<p>Before the analytic model, business layers were built in the Business Builder: <b>business entities</b> on Data Builder
        views, <b>fact models</b> combining them, <b>consumption models</b> with <b>perspectives</b> for SAP Analytics Cloud. Current tenants
        label the app <b>Deprecated</b>; you meet it in existing projects.</p>`,
    },
  ],
  'c12-m05': [
    {
      title: 'Parent and child',
      body: `<p>A <b>hierarchy</b> view has one row per node: the node itself (Child) and the node above it (Parent). The root has no parent.
        Associated with a dimension, it gives reports a tree to drill through, and every node stands for everything below it.</p>`,
    },
    layerStep(['ds'], `<p>A hierarchy is semantics, so it lives next to its dimension in <code>RHN_DSL</code>: <code>RHN_DS_H_</code>, built on the grid
        areas base view. A model in the presentation layer gets it through the dimension; shared dimensions take their hierarchy along when it is shared too.</p>`),
  ],
  'c12-m12': [
    {
      title: 'When a delta cannot help',
      body: `<p>A delta run reads the change records of the <b>source</b>. If the <b>target</b> is damaged while the source did not change, no delta brings the rows back.</p>
        <p><b>Reset Watermark</b> in the Data Integration Monitor makes the next run an initial load: it reads everything and replaces the target, then the delta continues.
        After the repair, a step in the nightly task chain runs the flow every night.</p>`,
    },
  ],
  'c12-m11': [
    {
      title: 'Loading only what changed',
      body: `<p>A <b>transformation flow</b> writes the result of a <b>view transform</b> into one target table. With load type <b>Initial and Delta</b> the first run
        loads everything; every later run reads only what changed in the source since the last run and updates the target by key.</p>
        <p>To know what changed, the source table needs <b>Delta Capture</b>: it records every insert, update and delete in a delta table.
        Delta Capture is chosen <b>before a table's first deploy</b> and is fixed from then on. So the order is: Delta Capture on, first deploy, initial load, then the changes.</p>`,
    },
  ],
  'c12-m10': [
    {
      title: 'Data flows',
      body: `<p>A <b>data flow</b> reads sources, transforms the rows with operators (join, projection, aggregation, union, script) and writes them
        into one <b>target table</b>. Unlike a view, the result is stored: it is as fresh as the last run.</p>
        <p>The target <b>mode</b> decides what a run does with the rows already there: <b>Append</b> adds, <b>Truncate</b> replaces, <b>Delete</b> removes by key.</p>`,
    },
    layerStep(['ds'], `<p>The flow joins and aggregates base views, so it is data work: flow and target table go to <code>RHN_DSL</code>
        (<code>RHN_DS_DF_</code>, <code>RHN_DS_T_</code>), where the nightly chain can run it.</p>`),
  ],
  'c12-m09': [
    {
      title: 'Content from the Content Network',
      body: `<p>SAP and partners publish <b>business content</b> in the <b>Content Network</b>: ready-made spaces with remote tables, views and models
        for an industry. <b>Semantic Onboarding</b> imports a package into its own space.</p>
        <p>A package brings <b>definitions</b>, not data and not your connections. The import log says what is ready and what is still missing.</p>`,
    },
  ],
  'c12-m08': [
    {
      title: 'Data out through OData',
      body: `<p>The <b>OData Consumption API</b> lets SAP Analytics Cloud import connections and other tools read exposed views and analytic models over HTTPS.
        Before a tool may call it, it signs in through an <b>OAuth client</b> of the tenant.</p>
        <p>OData reads in the name of a person: the user signs in (grant <b>Authorization Code</b>), and the tenant sends the result back to the
        tool's <b>redirect URI</b>. That is the purpose <b>Interactive Usage</b>.</p>`,
    },
  ],
  'c12-m07': [
    {
      title: 'Every deployment is a version',
      body: `<p>Each <b>Deploy</b> of a view adds a version to its history: who, when, and the full definition. <b>Versions</b> in the editor
        toolbar lists them, compares one with what runs now, and <b>restores</b> an earlier one into the editor. Then you deploy it.</p>
        <p>The history lives in this tenant only. Other tenants get a change by transport, not from the history.</p>`,
    },
  ],
  'c12-m06': [
    {
      title: 'Grant a node',
      body: `<p>A data access control of type <b>Hierarchy</b> reads entries like the Single Values type, but each entry is a <b>node</b>:
        the user sees the rows of that node and of all its descendants. The tree decides what a region contains, not the permissions table.</p>`,
    },
  ],
  'c11-m01': [
    {
      title: 'Chapter 11: The board request',
      body: `<p>One request, the whole stack: change a deployed fact without breaking anyone, offer the change in the model, keep the
        protection, and make sure it is fast and fresh on the day it counts.</p>
        <p>This chapter has <b>no hints and no Show me</b>. Everything you need, you have done before. The checks still tell you what is
        missing.</p>`,
    },
    layerStep(['en', 'ds', 'pr'], `<p>Before you change anything, decide in which layer each part of the change belongs. A new column of a fact is
        semantic work in <code>RHN_DSL</code>; offering it to the board is presentation work in <code>RHN_PRES</code>.</p>`, 'Think in layers'),
  ],
  'c10-m01': [
    {
      title: 'Chapter 10: Operations',
      body: `<p>Loads and persistence run every night, and someone has to know when they fail. A <b>task chain</b> runs several tasks
        as one unit: in a fixed order, with one schedule and an email when it fails.</p>
        <p>A chain runs objects of its own space. To combine spaces, share a chain with another space and nest it there.</p>`,
    },
    layerStep(['en', 'ds'], `<p>The night follows the layers from the bottom up: the entry chain loads, then the chain of the data &amp; semantic layer
        persists what the morning needs. The presentation layer needs no chain: its models are virtual and read whatever lies below.</p>`),
    {
      title: 'What a chain can run',
      body: `<p>Replication flows (load type Initial Only), view persistence, remote table snapshots and other task chains. A step starts
        when the one before it has ended; a failed step stops the chain.</p>`,
    },
  ],
  'c10-m02': [
    {
      title: 'Order and one schedule',
      body: `<p>A snapshot is only as fresh as the data it was built from. Put the load before the persistence, give the whole night
        one schedule, and tell the person on call when it breaks.</p>`,
    },
  ],
  'c10-m03': [
    {
      title: 'From the email to the cause',
      body: `<p>The chain's run shows which step failed. Each step has its own run in its own monitor (Views, Flows) with the real
        error message. Fix the cause, then run the chain again.</p>`,
    },
  ],
  'c10-m04': [
    {
      title: 'All spaces at once',
      body: `<p>The Data Integration Monitor shows one space. <b>Monitoring › Task Logs</b> lists the runs of every space, with filters
        for status and space: the place for a weekly look.</p>`,
    },
  ],
  'c09-m02': [
    {
      title: 'The View Analyzer',
      body: `<p>The Data Integration Monitor has a tab <b>Views</b>: every deployed view of the space, virtual or persisted. Its <b>View Analyzer</b>
        shows a view with everything below it and what each level costs.</p>
        <p>Persist where the expensive work happens. Everything above keeps reading it virtually, so it still sees current master data.</p>`,
    },
  ],
  'c09-m03': [
    {
      title: 'A snapshot ages',
      body: `<p>A persisted view returns what was computed at its last run. New source rows appear after the next run. A <b>schedule</b>
        runs the persistence regularly; in chapter 10, a task chain runs it right after the replication.</p>`,
    },
  ],
  'c09-m04': [
    {
      title: 'Limits',
      body: `<p>Two things to weigh: some views cannot be persisted (for example when they read a view with a data access control), and
        some should not be (small, cheap views whose snapshot only adds runs and memory).</p>`,
    },
  ],
  'c08-m04': [
    {
      title: 'Protect the numbers',
      body: `<p>A control filters the rows of the view it is assigned to, nothing else. Each fact with sensitive numbers needs it.</p>`,
    },
  ],
};

// ---------------------------------------------------------------- hands-on steps per task

export const GUIDED_TOURS: Record<string, TourStep[][]> = {
  // ================================================================ chapter 0
  'c00-m00': docked([
    // ---------------------------------------------------------------- task 1: functions in the shellbar
    [
      tryIt('Open the navigation', '#nav-toggle', `<p>The side navigation starts folded to icons. The <b>☰</b> button opens it with the names of all apps;
        click it again later to fold it, which gives big editors more width. Your choice is remembered.</p>`,
        { do: 'Click <b>☰</b>.', check: () => !$('.app.nav-collapsed') }),
      look('Back', '#shell-back', `<p>The arrow goes back one place, like the back button of a browser: from an editor to the object list,
        from a sub-page to the page before. You will use it all the time once you work in editors.</p>`),
      tryIt('The glossary', '#glossary-open', `<p>The book icon opens the <b>glossary</b>: every Datasphere term the game uses, grouped by chapter,
        with where to find it in a real tenant. New terms appear as you reach their chapter.</p>`, { do: 'Click the <b>book</b> icon.', event: 'app:glossary' }),
      tryIt('How to play', '#guide-open', `<p>The question mark explains the rules of the game in four steps: ticket, tenant, hints, check.</p>`,
        { do: 'Click the <b>?</b> icon.', event: 'guide' }),
      {
        title: 'How to play',
        target: '.guide-overlay .guide',
        body: `<p>Read it once. In a real tenant this icon opens SAP's help for the page you are on.</p>`,
        action: { do: 'Read it, then press <b>Close</b>.', check: () => !$('.guide-overlay') },
      },
      {
        title: 'The user menu',
        target: '#shell-user',
        body: `<p>The circle with your initials is the <b>user menu</b>: Settings, About, Sign Out. Personal settings live here, not in System.</p>`,
        action: { do: 'Click the avatar <b>DA</b>.', appear: '.user-menu' },
      },
      {
        title: 'Settings',
        target: '.user-menu',
        body: `<p><b>About</b> shows the tenant and its version, <b>Sign Out</b> ends the session. We want Settings.</p>`,
        action: { do: 'Click <b>Settings</b>.', event: 'settings:open' },
      },
      tryIt('Your settings', '.dialog', `<p>On the left the areas, on the right the chosen one. Two of them change the game:</p>
        <ul><li><b>Appearance</b>: light or dark theme.</li>
        <li><b>UI Settings</b>: show <b>business names</b> (for people) or <b>technical names</b> (what SQL uses) in every list.
        Modelers often switch to technical names.</li></ul>
        <p>The others (User Account, Home Screen, Language &amp; Region, Notifications, Privacy, Authorized Consent Settings) explain what a real tenant offers.</p>`,
        { do: 'Click <b>UI Settings</b>.', event: 'settings:ui' }),
      closeDialog('Close Settings', `<p>Leave the names on business names for now; the missions mention both.</p>`),
    ],
    // ---------------------------------------------------------------- task 2: Home and Repository Explorer
    [
      look('The side navigation', '.nav', `<p>Now the apps, top to bottom, in the same order as in a real tenant:</p>
        <ul><li><b>Home</b> and <b>Repository Explorer</b> on top,</li>
        <li><b>Monitoring</b> and <b>Catalog &amp; Marketplace</b>, which open a list,</li>
        <li>the groups <b>Apps</b> (model and integrate) and <b>Utilities</b> (run spaces, translation, transport),</li>
        <li><b>Security</b> and <b>System</b> pinned to the bottom.</li></ul>
        <p>An <b>ⓘ</b> after a name means: locked for now, the app opens an info page.</p>`),
      visit('home', 'Home', `Your start page. In a real tenant: welcome card, recently changed objects, spaces, news and quick actions.
        In the game it also holds your <b>learning path</b>, the target architecture, badges and your save.`,
        'everyone needs a place to land that shows what changed since yesterday.',
        'come back here to pick a mission, see what is next on the learning path, or export your progress.'),
      look('Your tenant at a glance', '#app-guide', `<p>The map of all apps, grouped by what you do: <b>Find</b>, <b>Model</b>, <b>Integrate</b>, <b>Administer</b>.
        Whenever you are unsure where something lives, come here.</p>`),
      look('Your progress', '#save-export', `<p><b>Export save</b> and <b>Import save</b> move your progress to another browser. <b>Sandbox</b> loads a save
        with every mission solved, to click through finished apps. <b>Start over</b> deletes everything.</p>`),
      visit('repository', 'Repository Explorer', `One search over <b>every object in every space</b> you are a member of: tables, views, flows, models.
        Filters by type and space; a click opens the object in its editor.`,
        'with dozens of spaces nobody clicks through them one by one. And before you change an object, you look here for who uses it.',
        'from chapter 0 on, whenever someone asks "where is the …?".'),
    ],
    // ---------------------------------------------------------------- task 3: Monitoring
    [
      look('Monitoring', '.nav [data-group="monitoring"]', `<p><b>Monitoring</b> collects everything that watches the tenant while it runs: health,
        costs, task runs, slow statements, extra compute and data loads. Six entries; you open each.</p>`),
      visit('sysmonitor', 'System and Spaces', `The health dashboard of the tenant: disk and memory used, per space, failed tasks,
        out-of-memory errors, statements waiting in the queue.`,
        'a full disk or a memory peak stops every load and every report at once. Administrators look here first when "everything is slow".',
        'chapter 9, when you decide what to persist and what that costs in memory.'),
      visit('capacities', 'Capacities', `How many <b>capacity units</b> the tenant consumed per month, split into memory, compute, storage and the rest.`,
        'SAP Datasphere is paid by capacity units. Whoever owns the budget wants to know where they go.',
        'chapter 9: persisting a view costs memory, and the CFO pays for it.'),
      visit('tasklogs', 'Task Logs', `Every run of every task in the whole tenant: replication, flows, task chains, persistence. Start, duration, status, records, messages.`,
        'operations needs one list across all spaces to see what failed last night, without opening each space.',
        'chapter 10, when the night run fails and you find out why.'),
      visit('statements', 'Expensive Statement Logs', `SQL statements that took long or used much memory, with duration, peak memory and CPU time.
        Only filled while tracing is switched on in System › Configuration.`,
        'a slow dashboard is usually one expensive statement. This is where you find which one.',
        'chapter 9: the CFO dashboard is slow, and you trace it to a view.'),
      visit('ecn', 'Elastic Compute Nodes', `Extra compute that you add for peak hours, for a number of block-hours, and remove again. Spaces are assigned to a node.`,
        'month-end reporting needs more power than the rest of the month; paying for it all year would be waste.',
        'Rheinau is small enough without one. From chapter 9 on you can create a node and start it, to see how it works.'),
      visit('monitor', 'Data Integration', `The <b>Data Integration Monitor</b>: runs, schedules and logs of everything that moves data,
        space by space. Remote tables, view persistence, flows, task chains, remote queries.`,
        'loads fail: a source is down, a password expired, a column changed. Here you see it, restart it and schedule it.',
        'one of your daily apps from chapter 3 on: replication into the entry layer, persistence in chapter 9, the night chain in chapter 10.'),
    ],
    // ---------------------------------------------------------------- task 4: Catalog & Marketplace
    [
      look('Catalog &amp; Marketplace', '.nav [data-group="catalog"]', `<p>Two entries about finding and getting data, beyond the objects you built yourself.</p>`),
      visit('catalog', 'Search', `The <b>Catalog</b>: data assets with business descriptions, tags, glossary terms and KPIs, also from other systems,
        and their lineage.`,
        'the Repository Explorer finds objects for modelers; the catalog explains data to everyone else, in business words.',
        'an excursion in chapter 12: you describe the consumption model, tag it and link a glossary term.'),
      visit('marketplace', 'Marketplace Data Products', `Data products from SAP and partners, ready to install into a space: free or with a licence key.`,
        'some data you buy instead of build, for example weather, market prices or reference data.',
        'open from chapter 12: install the public holidays, request a licence for weather data, compare market prices with our tariffs.'),
    ],
    // ---------------------------------------------------------------- task 5: Apps, with the Data Builder from the inside
    [
      look('Apps', '.nav [data-group="apps"]', `<p>The group <b>Apps</b> holds the tools you build with: two import and business apps, the
        <b>Data Builder</b>, and <b>Connections</b>. The group heading folds it.</p>`),
      visit('semantic', 'Semantic Onboarding', `Imports objects <b>with their meaning</b> from SAP systems: S/4HANA CDS views come in with labels,
        associations and texts. It also installs business content packages from the Content Network.`,
        'rebuilding the semantics of an SAP system by hand takes weeks; importing them takes minutes.',
        'chapter 3: you import the S/4HANA divisions into the entry layer; chapter 12: a content package.'),
      visit('business', 'Business Builder', `The <b>older</b> business layer: business entities, fact models and consumption models on top of
        Data Builder objects. Current tenants label it <b>Deprecated</b>.`,
        'many existing projects still use it, so you must be able to read it. New models are analytic models in the Data Builder.',
        'chapter 12: you read the 2023 models a former colleague left behind and replace them.'),
      visit('builder', 'Data Builder', `The workshop. Tables, views, analytic models, flows, task chains and access controls, always inside <b>one space</b>.`,
        'everything that turns raw data into something a report can use is built here, and only here.',
        'your main app from chapter 0 to the end. Let us go inside.'),
      {
        title: 'Pick a space',
        target: '#space-picker, #space-switch',
        body: `<p>The Data Builder first asks for a <b>space</b>. You only see spaces you are a member of; right now that is <b>RHN_ENTRY</b>,
          where IT loaded the source data. Later the space name next to the app name switches spaces.</p>`,
        action: { do: 'Click the space <b>RHN_ENTRY</b>.', check: () => builderSpace('RHN_ENTRY') },
      },
      look('Object types', '#list-tabs', `<p>The tabs filter the object list by type: tables, views, E/R models, analytic models, flows,
        intelligent lookups, task chains, data access controls.</p>`),
      look('Create something', '#new-tiles', `<p>Each tile creates one kind of object:</p>
        <ul><li><b>Table</b>, <b>SQL View</b>, <b>Graphical View</b>: store and prepare data (this game uses SQL views)</li>
        <li><b>E/R Model</b>: draw tables and their relations</li>
        <li><b>Analytic Model</b>: what SAP Analytics Cloud reads</li>
        <li><b>Replication</b>, <b>Data</b> and <b>Transformation Flow</b>: move and transform data</li>
        <li><b>Intelligent Lookup</b>: match records by fuzzy rules</li>
        <li><b>Task Chain</b>: run loads in order; <b>Data Access Control</b>: row-level security</li></ul>
        <p>Grey tiles open later.</p>`),
      {
        title: 'Try a grey tile',
        target: '[data-new="analytic"]',
        body: `<p>A grey tile explains what it creates and in which chapter you build your first one.</p>`,
        action: { do: 'Click <b>New Analytic Model</b>.', appear: '.dialog' },
      },
      closeDialog('What it said', `<p>Every grey tile works like this, so you can always find out what something is before you need it.</p>`),
      tryIt('The Import menu', '#import-menu-btn', `<p>Data from outside does not come in through tiles but through the <b>Import</b> menu:
        CSV files, objects from CSN/JSON files, entities from SAP systems, remote tables, permissions. <b>Validate Remote Tables</b>
        compares imported tables with their source after an upgrade.</p>`, { do: 'Click the <b>Import</b> button (arrow into a tray) above the list.', appear: '.import-menu' }),
      look('The object list', '#object-list', `<p>Every object of the space: business name, technical name, type, status and last change.
        The <b>+</b> menu next to Import offers the same objects as the tiles. Row icons share or delete an object.</p>`),
      {
        title: 'Open a table',
        target: '#object-list',
        body: `<p>A click on a name opens the object in its editor.</p>`,
        action: { do: 'Click <b>BILLING_CONTRACTS</b>.', check: () => editorOf('RHN_ENTRY.BILLING_CONTRACTS') },
      },
      look('The editor toolbar', '.ed-toolbar', `<p>Every editor has the same bar: the arrow back to the space, the object's name and <b>status</b>,
        then <b>Save</b> (store the design), <b>Deploy</b> (make it active in the database) and, once there are several spaces, <b>Share</b>.
        <b>Data Preview</b> shows real rows. <b>Versions</b> lists deployed versions, <b>Details</b> shows or hides the properties.</p>`),
      look('Properties', '#properties', `<p>On the right: the <b>business name</b> people read, the fixed <b>technical name</b> SQL uses,
        and the status. Views get more here later: semantic usage, associations, access controls.</p>`),
      look('Columns', '#column-list', `<p>In the middle: the columns with their data types. Behind every report number is one of these columns.</p>`),
      tryIt('Data Preview', '#run', `<p>Data Preview runs the object and shows the first rows below. Before you trust a table, look at it.</p>`,
        { do: 'Press <b>Data Preview</b>.', event: 'preview:RHN_ENTRY.BILLING_CONTRACTS' }),
      {
        title: 'Back to the space',
        target: '#ed-back',
        body: `<p>The arrow in the toolbar returns to the start page of the space.</p>`,
        action: { do: 'Click the <b>arrow</b> at the left of the toolbar.', appear: '#new-tiles' },
      },
      visit('connections', 'Connections', `The links from a space to <b>source systems</b>: S/4HANA, HANA databases, cloud storage, other databases.
        Each connection belongs to one space. <b>Validate</b> shows what it supports: remote tables, flows, model import.`,
        'without a connection no data reaches the tenant. The connection also decides whether data is read live or copied.',
        'chapter 3: you connect S/4HANA billing, the meter data system and the CRM to the entry layer.'),
    ],
    // ---------------------------------------------------------------- task 6: Utilities
    [
      look('Utilities', '.nav [data-group="utilities"]', `<p>The group <b>Utilities</b> runs the landscape around your models: spaces, languages,
        transport to other tenants and sharing data with other companies.</p>`),
      visit('spaces', 'Space Management', `Creates and deletes <b>spaces</b>, gives them disk and in-memory storage and a workload priority,
        manages members, database users and elastic compute nodes.`,
        'spaces separate layers and teams. Their storage limits stop one project from eating the whole tenant.',
        'chapter 1: you design the three spaces of our layers yourself.'),
      visit('translation', 'Translation', `Translates the <b>business names</b> and descriptions of analytic models and dimensions into other languages.`,
        'SAP Analytics Cloud shows each user the names in their own language; somebody has to provide them.',
        'open from chapter 12: give the analytic models German or French names and watch the translation status.'),
      visit('transport', 'Transport', `Moves content between tenants: <b>Packages</b> bundle objects of a space, <b>Export</b> sends them,
        <b>Import</b> brings them in, <b>Monitor</b> lists every job.`,
        'nobody builds in production. You build in development, test in test, then transport, so all tenants stay alike.',
        'chapter 12: you package the CFO model with everything it needs and export it to test and production.'),
      visit('sharing', 'Data Sharing Cockpit', `For <b>data providers</b>: a provider profile, data products you offer, licences and contracts.
        What you list here appears in other companies' Marketplace.`,
        'some companies sell or share their data. This is the other side of the Marketplace.',
        'open from chapter 12: create a provider profile for Rheinau and list one of your own data products.'),
    ],
    // ---------------------------------------------------------------- task 7: Security and System
    [
      visit('security', 'Security', `<b>Users</b>, <b>roles</b> and who may do what where. Global roles for the whole tenant, scoped roles per space,
        an <b>Authorization Overview</b>, and <b>Activities</b>, the log of who changed what.`,
        'least privilege: a planner reads, an integrator loads, an administrator administers, and nobody gets more by accident.',
        'chapter 2: you give eight colleagues exactly the access they need.'),
      visit('system', 'System', `The tenant itself. <b>Configuration</b>: capacity, workload, monitoring, certificates, Cloud Connector.
        <b>Administration</b>: identity provider, IP allowlist, OAuth clients for other apps.`,
        'some things exist once per tenant, not per space. Only administrators come here.',
        'chapter 3 (certificate and Cloud Connector for the on-premise database), chapter 9 (statement tracing), chapter 12 (OAuth for OData).'),
      look('That was everything', '.nav', `<p>Twenty apps. You will use the Data Builder, the Data Integration Monitor, Connections, Space Management,
        Security and the Repository Explorer every week; the others when a ticket needs them. Each app unlocks in the chapter where you first need it.</p>`),
    ],
    questions('Each job belongs to one place you saw on the tour. Think of what the card said under "Why it exists".'),
  ]),
  'c00-m01': [
    [
      nav('repository', 'Repository Explorer', `<p>Searches every object in every space you are a member of, in one list.</p>`),
      nav('builder', 'Data Builder', `<p>Where modelers build tables, views, analytic models, flows and task chains, always inside one space.</p>`),
      nav('monitor', 'Data Integration Monitor', `<p>Runs, schedules and logs of everything that moves data: replications, flows, task chains.</p>`),
      nav('connections', 'Connections', `<p>The links from a space to source systems such as S/4HANA, databases or cloud storage.</p>`),
      nav('spaces', 'Space Management', `<p>Creates spaces and gives them storage, priority and members. In the lower group: it runs the tenant.</p>`),
      nav('security', 'Security', `<p>Users and roles: who may do what, and where.</p>`),
      {
        title: 'Your map',
        view: 'home',
        target: '#app-guide',
        body: `<p>The Home page groups all apps by what you do with them. Come back here whenever you are unsure where something lives.</p>`,
      },
    ],
    questions('For each job, think: which app did the tour describe that way?'),
  ],
  'c00-m02': [
    [
      nav('builder', 'Data Builder', `<p>The Data Builder first asks for a space.</p>`),
      {
        title: 'Select RHN_ENTRY',
        target: '#space-picker, #space-switch',
        body: `<p>You only see the spaces you are a member of. Right now there is one: <b>RHN_ENTRY</b>, where IT loaded the source data.</p>`,
        action: { do: 'Click the space <b>RHN_ENTRY</b>.', event: 'space:builder:RHN_ENTRY', check: () => builderSpace('RHN_ENTRY') },
      },
    ],
    [
      {
        title: 'The start page',
        target: '#new-tiles',
        body: `<p>On top: tiles to <b>create</b> new objects. A click on a grey tile explains what it is. Below: every object of the space.</p>`,
      },
      {
        title: 'Open the contracts',
        target: '#object-list',
        body: `<p>Each row shows business name, technical name, type and status. The contracts table is <code>BILLING_CONTRACTS</code>.</p>`,
        action: { do: 'Click the business name <b>BILLING_CONTRACTS</b> in the list.', event: 'open:RHN_ENTRY.BILLING_CONTRACTS', check: () => editorOf('RHN_ENTRY.BILLING_CONTRACTS') },
      },
    ],
    [
      {
        title: 'The editor',
        target: '#column-list',
        body: `<p>In the middle: the <b>columns</b> of the table with their data types. On the right: the <b>properties</b> with both names and the status.</p>
          <p>Count the columns; the first question asks for it.</p>`,
      },
      {
        title: 'Data Preview',
        target: '#run',
        body: `<p><b>Data Preview</b> shows the first rows of the table at the bottom.</p>`,
        action: { do: 'Press <b>Data Preview</b>.', event: 'preview:RHN_ENTRY.BILLING_CONTRACTS' },
      },
      {
        title: 'Read the rows',
        target: '#results',
        body: `<p>Look at the last column. Its values are names of source systems: <b>S4U</b> is the current billing system, <b>LEGACY</b> the old one.</p>`,
      },
      ...questions('The column list and the preview answer both questions.'),
    ],
  ],
  'c00-m03': [
    [
      nav('repository', 'Repository Explorer', `<p>One list of all objects in all your spaces.</p>`),
      {
        title: 'Search',
        target: '#repo-search',
        body: `<p>The search looks at business names and technical names while you type.</p>`,
        action: { do: 'Type <code>meter</code> into the search field.', check: () => val('#repo-search').toLowerCase().includes('meter') },
      },
    ],
    [
      {
        title: 'Open from the result',
        target: '#repo-list',
        body: `<p>Clicking a result opens the object in its editor, in the Data Builder of the right space. Note its space and type first.</p>`,
        action: { do: 'Click <b>Meter Readings</b> in the result list.', event: 'repository-open:RHN_ENTRY.METER_READINGS' },
      },
    ],
    [
      nav('repository', 'Repository Explorer', `<p>Back to the explorer for the last question.</p>`),
      {
        title: 'Filter by space',
        target: '#repo-search',
        body: `<p>First empty the search field, otherwise you only count meter objects.</p>`,
        action: { do: 'Clear the search field.', check: () => val('#repo-search') === '' },
      },
      {
        title: 'Filter',
        target: '#repo-space',
        body: `<p>The filters narrow the list by type and space. The counter on the right says how many objects match.</p>`,
        action: { do: 'Set <b>Space</b> to <code>RHN_ENTRY</code>.', check: () => val('#repo-space') === 'RHN_ENTRY' },
      },
      ...questions('Space, type and the counter answer the three questions.'),
    ],
  ],
  'c00-m04': [
    [
      {
        title: 'Open the contracts',
        view: 'builder:landing:RHN_ENTRY',
        target: '#object-list',
        body: `<p>Same table as before: <code>BILLING_CONTRACTS</code> in <code>RHN_ENTRY</code>.</p>`,
        action: { do: 'Open <b>BILLING_CONTRACTS</b> from the list.', check: () => editorOf('RHN_ENTRY.BILLING_CONTRACTS') },
      },
    ],
    [
      {
        title: 'The business name',
        target: '#prop-business',
        body: `<p>The properties panel shows both names. The technical name is grey: it cannot change.</p>`,
        action: { do: 'Change the business name to <code>Billing Contracts</code>.', check: () => val('#prop-business').toLowerCase() === 'billing contracts' },
      },
      {
        title: 'Save',
        target: '#ed-save',
        body: `<p>Save stores the design.</p>`,
        action: { do: 'Press <b>Save</b>.', event: 'save:RHN_ENTRY.BILLING_CONTRACTS' },
      },
      {
        title: 'Look at the status',
        target: '.props-list',
        body: `<p>The status is now <b>Changes to Deploy</b>: your new name is saved, but everyone else still sees the old one. The text below the status says so too.</p>`,
      },
    ],
    [
      {
        title: 'Deploy',
        target: '#ed-deploy',
        body: `<p>Deploy makes the saved design active.</p>`,
        action: { do: 'Press <b>Deploy</b>.', event: 'deploy:RHN_ENTRY.BILLING_CONTRACTS' },
      },
      {
        title: 'Deployed',
        target: '.props-list',
        body: `<p>Now the status is <b>Deployed</b>: what you saved is what runs.</p>`,
      },
      ...questions('You just saw both statuses. And think: which name do SQL statements use?'),
    ],
  ],

  // ================================================================ chapter 1
  'c01-m01': [
    [
      nav('spaces', 'Space Management', `<p>Each tile is one space with its storage and priority.</p>`),
      {
        title: 'What is there',
        target: '#space-list',
        body: `<p>Only <b>RHN_ENTRY</b>, the entry space. The layer on the tile comes from the space ID: entry IDs end in <code>_ENTRY</code>,
          data &amp; semantic in <code>_DSL</code>, presentation in <code>_PRES</code>.</p>`,
      },
      {
        title: 'Tenant capacity',
        target: '.capacity',
        body: `<p>All spaces share the tenant's disk and in-memory storage. The bars show how much is already given to spaces.</p>`,
      },
    ],
    [
      {
        title: 'Create a space',
        target: '#create-space',
        body: `<p>First the middle layer: the data &amp; semantic space.</p>`,
        action: { do: 'Press <b>Create space</b>.', appear: '.dialog [name="id"]' },
      },
      {
        title: 'The space name',
        target: '.dialog [name="name"]',
        body: `<p>A name a business user understands. Typing it suggests an ID.</p>`,
        action: { do: 'Type <code>Rheinau Data &amp; Semantic</code> as the space name.', check: () => val('.dialog [name="name"]').toLowerCase() === 'rheinau data & semantic' },
      },
      {
        title: 'The space ID',
        target: '.dialog [name="id"]',
        body: `<p>Look at the suggested ID: it is cut at 20 characters and does not follow our convention. Fix it before you create the space.</p>`,
        action: { do: 'Change the space ID to <code>RHN_DSL</code>.', check: () => val('.dialog [name="id"]') === 'RHN_DSL' },
      },
      {
        title: 'Create',
        target: '.dialog [type="submit"]',
        body: `<p>Leave storage and priority as they are; the next ticket sizes them.</p>`,
        action: { do: 'Press <b>Create</b>.', appear: '[data-space-tile="RHN_DSL"]' },
      },
    ],
    [
      {
        title: 'Now the presentation space',
        target: '#create-space',
        body: `<p>Same steps for the top layer: name <code>Rheinau Presentation</code>, ID <code>RHN_PRES</code>.</p>`,
        action: { do: 'Create the space <code>RHN_PRES</code> with a readable name.', appear: '[data-space-tile="RHN_PRES"]' },
      },
    ],
    questions('Think about what you can set per space in Space Management.'),
  ],
  'c01-m02': [
    [
      {
        title: 'Work out the budget',
        target: '.ticket',
        body: `<p>Write it down before you click:</p>
          <ul><li>Disk: 128 capacity − 16 reserve − 40 for RHN_ENTRY = <b>72 GB</b> for RHN_DSL and RHN_PRES together.</li>
          <li>In-memory: 32 − 4 − 8 = <b>20 GB</b> for both together.</li></ul>
          <p>Check the minimums of the ticket: they must fit into these totals. For example DSL 36/8 and PRES 20/10.</p>`,
      },
    ],
    [
      nav('spaces', 'Space Management', `<p>Each tile has an <b>Edit</b> button.</p>`),
      {
        title: 'Edit RHN_DSL',
        target: '[data-edit="RHN_DSL"]',
        body: `<p>The ID stays fixed; storage and priority can change.</p>`,
        action: { do: 'Press <b>Edit</b> on RHN_DSL.', appear: '.dialog [name="disk"]' },
      },
      {
        title: 'Storage and priority',
        target: '.dialog',
        body: `<p>For example 36 GB disk, 8 GB in-memory, priority 3. The presentation space must get a higher priority later.</p>
          <p>The tutorial goes on once the values meet the ticket's minimums. If not, press <b>Edit</b> again.</p>`,
        // Waits for a sizing that fits the ticket: at least 30 GB disk and 6 GB in-memory, priority below 5.
        action: { do: 'Enter disk, in-memory and priority for RHN_DSL, then press <b>Save</b>.', event: '^edit-space-values:RHN_DSL:([3-9]\\d|\\d{3,})(\\.\\d+)?:([6-9]|\\d{2,})(\\.\\d+)?:[1-4]$' },
      },
    ],
    [
      {
        title: 'Edit RHN_PRES',
        target: '[data-edit="RHN_PRES"]',
        body: `<p>The board dashboards read from memory, and they must stay fast while the nightly load runs.</p>`,
        action: { do: 'Press <b>Edit</b> on RHN_PRES.', appear: '.dialog [name="disk"]' },
      },
      {
        title: 'Highest priority',
        target: '.dialog',
        body: `<p>For example 20 GB disk, 10 GB in-memory, and priority <b>5</b>, higher than every other space.</p>
          <p>The tutorial goes on once the values meet the ticket's minimums. If not, press <b>Edit</b> again.</p>`,
        // At least 10 GB disk and 8 GB in-memory, priority 5.
        action: { do: 'Enter the values for RHN_PRES, then press <b>Save</b>.', event: '^edit-space-values:RHN_PRES:\\d{2,}(\\.\\d+)?:([89]|\\d{2,})(\\.\\d+)?:5$' },
      },
      {
        title: 'Check the bars',
        target: '.capacity',
        body: `<p>At least 16 GB disk and 4 GB in-memory must stay free.</p>`,
      },
    ],
    questions('Priority decides who is favored when the database is busy.'),
  ],
  'c01-m03': [
    [
      nav('builder', 'Data Builder', `<p>The Data Builder always works in one space.</p>`),
      {
        title: 'Select RHN_DSL',
        target: '#space-picker, #space-switch',
        body: `<p>If a space is already selected, the switch next to "Data Builder" changes it.</p>`,
        action: { do: 'Select the space <b>RHN_DSL</b>.', check: () => builderSpace('RHN_DSL') },
      },
      {
        title: 'An empty space',
        target: '#object-list',
        body: `<p>No objects, and nothing from RHN_ENTRY. The walls work.</p>`,
      },
    ],
    [
      {
        title: 'Back to RHN_ENTRY',
        target: '#space-switch, #space-picker',
        body: `<p>Sharing is set in the space the object belongs to.</p>`,
        action: { do: 'Switch the Data Builder to <b>RHN_ENTRY</b>.', check: () => builderSpace('RHN_ENTRY') },
      },
      {
        title: 'Share the contracts',
        target: '[data-share="RHN_ENTRY.BILLING_CONTRACTS"]',
        body: `<p>The share icon at the end of the row opens the sharing dialog.</p>`,
        action: { do: 'Click the share icon of <b>BILLING_CONTRACTS</b>.', appear: '.share-targets' },
      },
      {
        title: 'Pick the target',
        target: '.dialog',
        body: `<p>Only the layer directly above: <b>RHN_DSL</b>. Never <b>RHN_PRES</b>: the presentation layer does not skip a layer.</p>`,
        action: { do: 'Tick <b>RHN_DSL</b> and press <b>Save sharing</b>.', event: 'share:RHN_ENTRY.BILLING_CONTRACTS->RHN_DSL' },
      },
      {
        title: 'Share the grid areas',
        target: '[data-share="RHN_ENTRY.GRID_AREAS"]',
        body: `<p>Same for the second table.</p>`,
        action: { do: 'Share <b>GRID_AREAS</b> with <b>RHN_DSL</b>.', event: 'share:RHN_ENTRY.GRID_AREAS->RHN_DSL' },
      },
    ],
    [
      {
        title: 'Back to RHN_DSL',
        target: '#space-switch, #space-picker',
        body: `<p>Now look at the data &amp; semantic space again.</p>`,
        action: { do: 'Switch the Data Builder to <b>RHN_DSL</b>.', check: () => builderSpace('RHN_DSL') },
      },
      {
        title: 'Shared with RHN_DSL',
        target: '#shared-list',
        body: `<p>A new list: the objects of other spaces this space may read. They stay read-only.</p>`,
        action: { do: 'Open <b>BILLING_CONTRACTS</b> from this list.', check: () => editorOf('RHN_ENTRY.BILLING_CONTRACTS') },
      },
      {
        title: 'Read it from here',
        target: '#run',
        body: `<p>The toolbar says "read-only": you cannot change it from RHN_DSL, only read it.</p>`,
        action: { do: 'Press <b>Data Preview</b>.', event: 'preview-in:RHN_DSL:RHN_ENTRY.BILLING_CONTRACTS' },
      },
    ],
    questions('What would happen to a copy when the entry table gets new data tomorrow?'),
  ],
  'c01-m04': [
    [
      {
        title: 'The convention',
        target: '.ticket',
        body: `<p>Split each name at the underscores and check part by part:</p>
          <p><code>RHN</code> · <code>DS</code> · <code>V</code> · <code>CONSUMPTION</code><br>company · layer · type · what it holds</p>
          <p>A <b>fact</b> holds numbers you add up, a <b>dimension</b> describes them. Both give data its meaning, so both carry <code>DS</code>;
          only what consumers open carries <code>PR</code>.</p>`,
      },
    ],
    questions('Check every part of every name: prefix, layer, type, name in English capitals.'),
  ],

  // ================================================================ chapter 2
  'c02-m01': [
    [
      nav('security', 'Security', `<p>Users, roles and who may do what. Security opens its pages below the entry.</p>`),
      {
        title: 'Roles',
        target: '.nav [data-sec="roles"]',
        body: `<p>Roles are built from templates. One role per job, valid in the spaces of its scope.</p>`,
        action: { do: 'Click <b>Roles</b> under Security in the side navigation.', check: () => !!$('.nav [data-sec="roles"][aria-current="page"]') },
      },
      {
        title: 'The templates',
        target: '#templates',
        body: `<p>Five templates, each describing a job: run a space, load data, build models, look at models, consume reports.
          Read what each one may do and what not.</p>`,
      },
    ],
    [
      {
        title: 'Create a scoped role',
        target: '#add-role',
        body: `<p>One role per template, so five roles. Names start with <code>RHN_</code>, for example <code>RHN_MODELER</code>.</p>`,
        action: { do: 'Press <b>+</b> (Add Role) and choose <b>Create a Scoped Role</b>.', appear: '.dialog [name="template"]' },
      },
      {
        title: 'Name, template, scope',
        target: '.dialog',
        body: `<p>The scope lists the spaces where this function happens at all. Think layer by layer; the ticket says which function works where.</p>`,
        action: { do: 'Fill in the first role and press <b>Create</b>.', event: 'create-role:' },
      },
      {
        title: 'The other four',
        target: '#role-list',
        body: `<p>Same dialog for each remaining template. The list shows each role with its scope; compare it with the ticket.</p>`,
        action: { do: 'Create the remaining roles until there are five.', check: () => document.querySelectorAll('#role-list [data-role-edit]').length >= 5 },
      },
    ],
    [
      {
        title: 'Global or scoped',
        target: '.role-cards',
        body: `<p>One card says "Global role". That role has no scope: it applies everywhere.</p>`,
      },
      ...questions('Which role card applies to the whole tenant?'),
    ],
  ],
  'c02-m02': [
    [
      nav('security', 'Security', `<p>Security has its own pages in the side navigation: Users, Roles and the Authorization Overview.</p>`),
      {
        title: 'Users',
        target: '.nav [data-sec="users"]',
        body: `<p>Eight people need access. Each row says what the person does, in their own words.</p>`,
        action: { do: 'Click <b>Users</b> under Security in the side navigation.', check: () => !!$('.nav [data-sec="users"][aria-current="page"]') },
      },
      {
        title: 'Read the jobs',
        target: '#user-list',
        body: `<p>For each person ask: do they build, load, look, or only read reports in SAP Analytics Cloud? And in which layers?</p>`,
      },
    ],
    [
      {
        title: 'Edit roles',
        target: '#user-list [data-user]',
        body: `<p>Start with anyone. <b>Edit roles</b> opens a dialog per person.</p>`,
        action: { do: 'Press <b>Edit roles</b> for one person.', appear: '.dialog [name="admin"]' },
      },
      {
        title: 'Tick the spaces',
        target: '.dialog',
        body: `<p>Each role shows the spaces of its scope. Tick a space to give the role there; untick to remove it. Global admin only for the tenant owner.</p>`,
        action: { do: 'Give this person what their job needs, then press <b>Save</b>.', event: 'assign:' },
      },
      {
        title: 'Everyone else',
        target: '#user-list',
        body: `<p>Do the same for every person. "No roles" disappears from the list as you go.</p>`,
        action: {
          do: 'Assign roles to all eight people.',
          check: () => !!$('#user-list') && ![...document.querySelectorAll('#user-list td')].some((td) => td.textContent?.includes('No roles')),
        },
      },
    ],
    questions('What is the worst that can happen with each right that is too much?'),
  ],
  'c02-m03': [
    [
      nav('security', 'Security', `<p>Nina is in the user list now.</p>`),
      {
        title: 'Users',
        target: '.nav [data-sec="users"]',
        body: `<p>Find Nina Krüger, starting on Monday.</p>`,
        action: { do: 'Click <b>Users</b> under Security in the side navigation.', check: () => !!$('.nav [data-sec="users"][aria-current="page"]') },
      },
      {
        title: 'The joiner',
        target: '[data-user="nkrueger"]',
        body: `<p>Give her the role and space her job needs, nothing more.</p>`,
        action: { do: 'Edit Nina\'s roles and save.', event: 'assign:nkrueger' },
      },
    ],
    [
      {
        title: 'The mover',
        target: '[data-user="tschulz"]',
        body: `<p>Tim keeps his role; only the spaces change. Two steps: the new space on, the old one off.</p>`,
        action: { do: 'Edit Tim\'s roles and save.', event: 'assign:tschulz' },
      },
    ],
    questions('Which template manages members? And which tool filters rows, not functions?'),
  ],

  // ================================================================ chapter 3
  'c03-m01': [
    [
      nav('connections', 'Connections', `<p>Connections lists the links of one space to source systems.</p>`),
      {
        title: 'Select the space',
        target: '#conn-space',
        body: `<p>Like the Data Builder, Connections always works in one space. All loads land in the entry layer, so its connections live there too.</p>`,
        action: { do: 'Select the space <code>RHN_ENTRY</code>.', check: () => val('#conn-space') === 'RHN_ENTRY' },
      },
    ],
    [
      {
        title: 'Create',
        target: '#conn-create',
        body: `<p>Creating starts with the connection type.</p>`,
        action: { do: 'Press <b>Create</b>.', appear: '.type-grid' },
      },
      {
        title: 'Pick the type',
        target: '.dialog',
        body: `<p>Each card shows the features of the type. The billing system is named in the ticket.</p>`,
        action: { do: 'Click the type that matches the billing system.', appear: '.dialog [name="host"]' },
      },
      {
        title: 'The properties',
        target: '.dialog',
        body: `<p>Host, authentication, business name and technical name are all in Lena's ticket. Credentials are not simulated.</p>`,
        action: { do: 'Fill in the form from the ticket and press <b>Create</b>.', event: 'create-connection:RHN_ENTRY.' },
      },
    ],
    [
      {
        title: 'Select it',
        target: '#conn-list',
        body: `<p>Edit, Validate and Delete work on the selected connection.</p>`,
        action: { do: 'Select the connection with the radio button.', check: () => !!$('[name="conn-sel"]:checked') },
      },
      {
        title: 'Validate',
        target: '#conn-validate',
        body: `<p>Validate tries to reach the source and lists the features that really work. It is the first step of every troubleshooting.</p>`,
        action: { do: 'Press <b>Validate</b>.', event: 'validate:RHN_ENTRY.' },
      },
      closeDialog('Read the result', `<p>Valid, and four features. Note them; one question asks about Model Import.</p>
        <p>Changed something after validating? Then validate again: a change resets it.</p>`),
    ],
    questions('Where does a connection live, and who else lives there?'),
  ],
  'c03-m02': [
    [
      nav('connections', 'Connections', `<p>Still in <code>RHN_ENTRY</code>.</p>`),
      {
        title: 'Create',
        target: '#conn-create',
        body: `<p>The meter data system runs on SAP HANA in the data center.</p>`,
        action: { do: 'Press <b>Create</b> and pick the type of the meter data system.', appear: '.dialog [name="host"]' },
      },
      {
        title: 'Cloud or on-premise',
        target: '.dialog',
        body: `<p>This type asks where the source runs. On-premise shows the field for the Cloud Connector location ID. The ticket also says TLS.</p>`,
        action: { do: 'Fill in the form from Jonas\'s ticket and press <b>Create</b>.', event: 'create-connection:RHN_ENTRY.' },
      },
    ],
    [
      {
        title: 'Validate',
        target: '#conn-list',
        body: `<p>Select the new connection, then press <b>Validate</b> in the toolbar.</p>`,
        action: { do: 'Select <code>RHN_MDM</code> and press <b>Validate</b>.', event: 'validate:RHN_ENTRY.RHN_MDM' },
      },
      closeDialog('Read the message', `<p>If it failed: the message names one missing piece. A missing certificate is fixed in the System app, the rest with <b>Edit</b>.</p>`),
    ],
    [
      nav('system', 'System', `<p>Tenant-wide settings, for administrators.</p>`),
      {
        title: 'Data Integration',
        target: '.sub-nav [data-tab="integration"]',
        body: `<p>Cloud Connectors and agents connected to this tenant.</p>`,
        action: { do: 'Open <b>Data Integration</b>.', check: () => !!$('.sub-nav [data-tab="integration"][aria-current="page"]') },
      },
      {
        title: 'The Cloud Connector',
        target: '#cc-list',
        body: `<p>Its location ID is what the connection needs. Compare it with what you typed.</p>`,
      },
      {
        title: 'Security',
        target: '.sub-nav [data-tab="security"]',
        body: `<p>Trusted certificates live here.</p>`,
        action: { do: 'Open <b>Security</b>.', check: () => !!$('.sub-nav [data-tab="security"][aria-current="page"]') },
      },
      {
        title: 'Upload',
        target: '#cert-upload',
        body: `<p>Trust only what a connection needs. The ticket names the file.</p>`,
        action: { do: 'Press <b>Upload Certificate</b>, pick the right file and upload it.', event: 'upload-cert:' },
      },
    ],
    [
      nav('connections', 'Connections', `<p>Back to the connection.</p>`),
      {
        title: 'Until it passes',
        target: '#conn-toolbar',
        body: `<p>Select <code>RHN_MDM</code>. Validate; if a message names something in the connection itself, fix it with <b>Edit</b> and validate again.</p>`,
        action: { do: 'Get <code>RHN_MDM</code> to a valid validation.', event: 'validate:RHN_ENTRY.RHN_MDM:ok' },
      },
      closeDialog('Valid', `<p>Through the Cloud Connector, encrypted, with a trusted certificate.</p>`),
    ],
    questions('Why could the cloud not reach the host at first?'),
  ],
  'c03-m03': [
    [
      {
        title: 'The Import menu',
        view: 'builder:landing:RHN_ENTRY',
        target: '#import-menu-btn',
        body: `<p>Remote tables are created from the Data Builder of the space that owns the connection. Everything that brings
          objects in from outside sits in the <b>Import</b> menu of the object list, next to <b>+</b>.</p>`,
        action: { do: 'Open the <b>Import</b> menu.', appear: '[data-menu-import="remote"]' },
      },
      {
        title: 'Import Remote Tables',
        target: '[data-menu-import="remote"]',
        body: `<p>CSV files, CSN/JSON definitions and permissions come in the same way; here you need remote tables.</p>`,
        action: { do: 'Click <b>Import Remote Tables</b>.', appear: '.dialog [name="conn"]' },
      },
      {
        title: 'Choose the connection',
        target: '.dialog [name="conn"]',
        body: `<p>Only validated connections that support remote tables can be chosen.</p>`,
        action: { do: 'Choose <code>RHN_S4U</code>.', check: () => val('.dialog [name="conn"]') === 'RHN_S4U' },
      },
      {
        title: 'Pick the objects',
        target: '.dialog',
        body: `<p>Tick only the objects the ticket asks for. The suggested names follow our convention <code>RHN_EN_RT_&lt;NAME&gt;</code>.</p>`,
        action: { do: 'Tick the two objects and press <b>Import and Deploy</b>.', event: 'import-remote:' },
      },
    ],
    [
      {
        title: 'Open the tariffs',
        target: '#object-list',
        body: `<p>The remote tables are in the object list now, with their own type icon.</p>`,
        action: { do: 'Open the tariffs remote table.', event: '^open:RHN_ENTRY\\..*TARIFF' },
      },
      {
        title: 'Preview it live',
        target: '#run',
        body: `<p>The properties say <b>Data Access: Remote</b>. This preview goes to S/4HANA.</p>`,
        action: { do: 'Press <b>Data Preview</b>.', event: '^preview:RHN_ENTRY\\..*TARIFF' },
      },
      nav('monitor', 'Data Integration Monitor', `<p>The monitor shows what this space sent to the sources.</p>`),
      {
        title: 'Remote Queries',
        target: '[data-mon-tab="queries"]',
        body: `<p>Each live read appears here with its statement, records and duration.</p>`,
        action: { do: 'Open <b>Remote Queries</b>.', event: 'monitor:queries', check: () => tabOn('[data-mon-tab="queries"]') },
      },
    ],
    [
      {
        title: 'Remote Tables',
        target: '[data-mon-tab="remote"]',
        body: `<p>Data access and schedules are changed here, not in the editor.</p>`,
        action: { do: 'Open <b>Remote Tables</b>.', check: () => tabOn('[data-mon-tab="remote"]') },
      },
      {
        title: 'Decide per table',
        target: '#rt-list',
        body: `<p>Read the ticket again: which table must always be current, and which may be a copy refreshed regularly?</p>
          <p>Select a row with its radio button. <b>Load New Snapshot</b> makes a copy, <b>Remove Replicated Data</b> goes back to live,
          <b>Schedule</b> refreshes a copy regularly.</p>`,
      },
      {
        title: 'Consent',
        target: '#consent-banner',
        body: `<p>Schedules run in your name. Without your consent nothing scheduled runs.</p>`,
        action: { do: 'Press <b>Give consent</b>.', check: () => !$('#consent-banner') },
      },
      {
        title: 'Set it up',
        target: '#rt-list',
        body: `<p>Now give each remote table the data access and schedule the ticket describes.</p>`,
        action: { do: 'Set data access and schedule for the table that should be a copy.', event: 'schedule:' },
      },
    ],
    questions('What does every snapshot refresh of a big, changing table cost?'),
  ],
  'c03-m04': [
    [
      {
        title: 'New Replication Flow',
        view: 'builder:landing:RHN_ENTRY',
        target: '[data-new="replication"]',
        body: `<p>Flows are built in the Data Builder of the target space.</p>`,
        action: { do: 'Click <b>New Replication Flow</b>.', appear: '#flow-conn' },
      },
      {
        title: 'Source connection',
        target: '.flow-end',
        body: `<p>A replication flow has exactly one source connection.</p>`,
        action: { do: 'Choose <code>RHN_S4U</code> as source connection.', check: () => val('#flow-conn') === 'RHN_S4U' },
      },
    ],
    [
      {
        title: 'Add source objects',
        target: '#flow-add',
        body: `<p>The dialog lists the objects of the connection and whether they are delta-capable.</p>`,
        action: { do: 'Press <b>Add Source Objects</b>, tick contracts and invoices, press <b>Add Selection</b>.', check: () => document.querySelectorAll('#flow-objects [data-target]').length >= 2 },
      },
      {
        title: 'Target tables',
        target: '#flow-objects',
        body: `<p>The target is suggested with the same name. "existing local table" means the flow writes into the pilot table, so everything built on it keeps working.</p>`,
      },
    ],
    [
      {
        title: 'Load type: your decision',
        target: '#flow-objects',
        body: `<p><b>Initial Only</b> loads once. <b>Initial and Delta</b> loads once, then only the changes.
          Which one does Lena's ticket describe? Set it per object.</p>`,
      },
      {
        title: 'Truncate: your decision',
        target: '#flow-objects',
        body: `<p>Truncate empties the target table completely before the load, whoever delivered the rows. Remember what else is in these tables.</p>`,
      },
    ],
    [
      {
        title: 'Names',
        target: '.flow-props',
        body: `<p>Business name for people, technical name <code>RHN_EN_RF_S4U</code> from the ticket.</p>`,
        action: { do: 'Enter both names.', check: () => val('#prop-business') !== '' && val('#prop-technical') !== '' },
      },
      {
        title: 'Deploy',
        target: '#ed-deploy',
        body: `<p>Deploy saves and checks the flow: connection valid, targets are local tables, load types possible.</p>`,
        action: { do: 'Press <b>Deploy</b>.', event: 'deploy:RHN_ENTRY.' },
      },
      {
        title: 'Run',
        target: '#flow-run-ed',
        body: `<p>Run starts the deployed flow. If someone stops it, read why.</p>`,
        action: { do: 'Press <b>Run</b>.', event: '^(run|truncate-blocked):RHN_ENTRY\\.' },
      },
      nav('monitor', 'Data Integration Monitor', `<p>Every run is listed here with its messages.</p>`),
      {
        title: 'Flows',
        target: '[data-mon-tab="flows"]',
        body: `<p>Deployed flows of the space.</p>`,
        action: { do: 'Open <b>Flows</b>.', check: () => tabOn('[data-mon-tab="flows"]') || !!$('#flow-list') },
      },
      {
        title: 'Open your flow',
        target: '[data-flow="RHN_EN_RF_S4U"] || #flow-list',
        body: `<p>A click on the name opens its runs and messages.</p>`,
        action: { do: 'Click <code>RHN_EN_RF_S4U</code>.', event: 'monitor-open:RHN_ENTRY.RHN_EN_RF_S4U' },
      },
      {
        title: 'Read the run',
        target: '#run-log',
        body: `<p>A delta flow stays <b>Running</b>: after the initial load it keeps watching the source. If the run did not start, fix the flow, deploy and run again.</p>`,
      },
    ],
    questions('The run messages say what delta does after the initial load.'),
  ],
  'c03-m05': [
    [
      nav('connections', 'Connections', `<p>A third connection in <code>RHN_ENTRY</code>.</p>`),
      {
        title: 'Create',
        target: '#conn-create',
        body: `<p>The CRM export lands in Amazon S3: the type is called Amazon Simple Storage Service.</p>`,
        action: { do: 'Press <b>Create</b> and pick the cloud storage type.', appear: '.dialog [name="host"]' },
      },
      {
        title: 'Bucket and names',
        target: '.dialog',
        body: `<p>The bucket name and both names are in Calin's ticket.</p>`,
        action: { do: 'Fill in the form and press <b>Create</b>.', event: 'create-connection:RHN_ENTRY.' },
      },
      {
        title: 'Validate',
        target: '#conn-list',
        body: `<p>Look at the features this time: what is missing?</p>`,
        action: { do: 'Select <code>RHN_CRM</code> and press <b>Validate</b>.', event: 'validate:RHN_ENTRY.RHN_CRM' },
      },
      closeDialog('No remote tables', `<p>Cloud storage offers flows only. Remember this for the question.</p>`),
    ],
    [
      {
        title: 'New Replication Flow',
        view: 'builder:landing:RHN_ENTRY',
        target: '[data-new="replication"]',
        body: `<p>Same editor as before.</p>`,
        action: { do: 'Click <b>New Replication Flow</b>.', appear: '#flow-conn' },
      },
      {
        title: 'Source',
        target: '.flow-end',
        body: `<p>The bucket connection.</p>`,
        action: { do: 'Choose <code>RHN_CRM</code>, then add the export file with <b>Add Source Objects</b>.', check: () => val('#flow-conn') === 'RHN_CRM' && !!$('#flow-objects [data-target]') },
      },
      {
        title: 'Target',
        target: '#flow-objects',
        body: `<p>The suggestion is <code>CRM_CUSTOMERS</code>, the existing table.</p>`,
      },
    ],
    [
      {
        title: 'Projection',
        target: '[data-proj="0"]',
        body: `<p>The projection of an object can add columns with a constant value.</p>`,
        action: { do: 'Press the projection button of the object.', appear: '.dialog [name="col"]' },
      },
      {
        title: 'Add the column',
        target: '.dialog',
        body: `<p>Column name and value: the same column every entry table has, with the code for this source. Calin's ticket names both.</p>`,
        action: { do: 'Add the column and its value with <b>Add column</b>.', check: () => !!$('#proj-list [data-x]') },
      },
      {
        title: 'Done',
        target: '.dialog [type="submit"]',
        body: `<p>The added column shows on the button in the flow editor.</p>`,
        action: { do: 'Press <b>Done</b>.', check: noDialog },
      },
    ],
    [
      {
        title: 'Load type and Truncate: your decision',
        target: '#flow-objects',
        body: `<p>A file has no delta: Initial Only. Each night's file holds <b>all</b> customers. What happens without Truncate when it runs every night?</p>`,
      },
      {
        title: 'Names, deploy, run',
        target: '.flow-props',
        body: `<p>Technical name <code>RHN_EN_RF_CRM</code>. Then <b>Deploy</b> and <b>Run</b> in the toolbar.</p>`,
        action: { do: 'Enter the names, deploy and run the flow.', event: '^run:RHN_ENTRY\\.' },
      },
      nav('monitor', 'Data Integration Monitor', `<p>Schedules for flows are set in the monitor.</p>`),
      {
        title: 'Flows',
        target: '[data-mon-tab="flows"]',
        body: `<p>Deployed flows of the space.</p>`,
        action: { do: 'Open <b>Flows</b>.', check: () => tabOn('[data-mon-tab="flows"]') || !!$('#flow-list') },
      },
      {
        title: 'Open RHN_EN_RF_CRM',
        target: '[data-flow="RHN_EN_RF_CRM"] || #flow-list',
        body: `<p>A click on the name opens its runs and messages.</p>`,
        action: { do: 'Click <code>RHN_EN_RF_CRM</code>.', event: 'monitor-open:RHN_ENTRY.RHN_EN_RF_CRM' },
      },
      {
        title: 'Schedule',
        target: '#flow-schedule',
        body: `<p>The file arrives every night, so the flow should run as often.</p>`,
        action: { do: 'Press <b>Schedule</b> and save the frequency.', event: 'schedule:RHN_ENTRY.RHN_EN_RF_CRM' },
      },
    ],
    [
      {
        title: 'Look at the table',
        view: 'builder:landing:RHN_ENTRY',
        target: '#object-list',
        body: `<p>The run added the column to the table.</p>`,
        action: { do: 'Open <b>CRM_CUSTOMERS</b> and look at its last column.', check: () => editorOf('RHN_ENTRY.CRM_CUSTOMERS') },
      },
      ...questions('What did Validate say about RHN_CRM?'),
    ],
  ],
  'c03-m06': [
    [
      nav('monitor', 'Data Integration Monitor', `<p>Lena's flow ran here last night.</p>`),
      {
        title: 'Flows',
        target: '[data-mon-tab="flows"]',
        body: `<p>The status column shows the failed run.</p>`,
        action: { do: 'Open <b>Flows</b>.', check: () => tabOn('[data-mon-tab="flows"]') || !!$('#flow-list') },
      },
      {
        title: 'Open RHN_EN_RF_MDM',
        target: '[data-flow="RHN_EN_RF_MDM"] || #flow-list',
        body: `<p>A click on the name opens its runs and messages.</p>`,
        action: { do: 'Click <code>RHN_EN_RF_MDM</code>.', event: 'monitor-open:RHN_ENTRY.RHN_EN_RF_MDM' },
      },
      {
        title: 'Read the messages',
        target: '#run-log',
        body: `<p>Top to bottom: read, then fail. The last message names the cause and the numbers you need: assigned and used storage.</p>`,
      },
    ],
    [
      nav('spaces', 'Space Management', `<p>The tile of RHN_ENTRY is red and says Locked.</p>`),
      {
        title: 'More storage',
        target: '[data-edit="RHN_ENTRY"]',
        body: `<p>Jonas wants 6 GB headroom above what the space uses now. Used plus 6 is the new disk size.</p>`,
        action: { do: 'Press <b>Edit</b> on RHN_ENTRY, set the disk and save.', event: 'edit-space:RHN_ENTRY' },
      },
      {
        title: 'Unlock',
        target: '[data-space-tile="RHN_ENTRY"]',
        body: `<p>More storage alone does not unlock the space.</p>`,
        action: { do: 'Press <b>Unlock</b>.', event: 'unlock:RHN_ENTRY' },
      },
    ],
    [
      nav('monitor', 'Data Integration Monitor', `<p>Now the load can write again.</p>`),
      {
        title: 'Run again',
        target: '[data-mon-tab="flows"]',
        body: `<p>Open the flow again and press <b>Run</b> in its detail panel.</p>`,
        action: { do: 'Run <code>RHN_EN_RF_MDM</code> again.', event: 'run:RHN_ENTRY.RHN_EN_RF_MDM' },
      },
      {
        title: 'The new run',
        target: '#run-log',
        body: `<p>The new run is at the top of the run list. Running means: initial load done, delta active.</p>`,
      },
    ],
    questions('What can you set up once, so the next failure reaches you first?'),
  ],

  // ================================================================ chapter 5
  'c03-m07': [
    [
      nav('semantic', 'Semantic Onboarding', `<p>The app for objects with semantics: SAP systems on top, the Content Network below.</p>`),
      {
        title: 'The S/4HANA Cloud card',
        target: '[data-system="0"]',
        body: `<p>Each card counts the connections of its system type. Yours is <code>RHN_S4U</code> from mission 1.</p>`,
        action: { do: 'Click the <b>SAP S/4HANA Cloud</b> card.', appear: '#ie-connections' },
      },
      {
        title: 'Connection and target space',
        target: '#ie-connections',
        body: `<p>The connection decides where the entities land: its own space. A connection must support <b>Model Import</b>.</p>`,
        action: { do: 'Select <b>RHN_S4U</b>.', event: 'ie-connection:RHN_ENTRY.RHN_S4U' },
      },
      {
        title: 'Data Access',
        target: '.ie-access',
        body: `<p>The proposal is <b>Replication Flow to Local Tables</b>. Keep it, as the ticket says.</p>`,
      },
      {
        title: 'Next Step',
        target: '#ie-next',
        body: `<p>On to the entities of the system.</p>`,
        action: { do: 'Press <b>Next Step</b>.', appear: '#ie-results' },
      },
    ],
    [
      {
        title: 'Search by label',
        target: '#ie-search',
        body: `<p>CDS views have technical IDs like <code>I_UTILSDIVISION</code>. People search by their <b>label</b>. The filters on the left narrow the list
          by application component, modeling pattern and release contract.</p>`,
        action: { do: 'Search for <b>Division</b> and press Enter.', event: '^ie-search:' },
      },
      {
        title: 'Select the entity',
        target: '#ie-results',
        body: `<p>Pick the released dimension, not the custom mapping view and not the text entity: texts come along by themselves.</p>`,
        action: { do: 'Tick <b>I_UTILSDIVISION</b>.', event: 'ie-select:I_UTILSDIVISION:on' },
      },
      {
        title: 'Next Step',
        target: '#ie-next',
        body: `<p>The review shows what will be created.</p>`,
        action: { do: 'Press <b>Next Step</b>.', appear: '#ie-review' },
      },
      {
        title: 'Review Entities',
        target: '#ie-review',
        body: `<p>Two tabs: <b>Data Builder</b> lists the tables, the dimension view and the replication flow; <b>Business Builder</b> the business entity
          a real tenant would add. <b>Supporting</b> marks the text entity the association brought in.</p>`,
      },
      {
        title: 'Import and Deploy',
        target: '#ie-import',
        body: `<p>Creates and deploys everything in RHN_ENTRY. Afterwards the import log opens.</p>`,
        action: { do: 'Press <b>Import and Deploy</b>.', event: '^ie-import:RHN_ENTRY:' },
      },
    ],
    [
      {
        title: 'The replication flow',
        view: 'builder:landing:RHN_ENTRY',
        target: '#object-list',
        body: `<p>The import created <code>RF_I_UTILSDIVISION</code>, deployed but not run: the local tables are still empty.</p>`,
        action: { do: 'Open <b>RF_I_UTILSDIVISION</b>.', check: () => editorOf('RHN_ENTRY.RF_I_UTILSDIVISION') },
      },
      {
        title: 'Run',
        target: '#flow-run-ed',
        body: `<p>One run loads both tables. In real life you would also schedule it.</p>`,
        action: { do: 'Press <b>Run</b>.', event: '^run:RHN_ENTRY\\.RF_I_UTILSDIVISION:Completed' },
      },
      {
        title: 'Open Import Logs',
        view: 'semantic:logs:RHN_ENTRY',
        target: '#entity-log-list',
        body: `<p>Every Import Entities run of the space, with its result. The messages say what was created and what is still to do.</p>`,
        action: { do: 'Open the import to read its messages.', event: '^entity-log-open:RHN_ENTRY' },
      },
    ],
    [
      toSpace('RHN_ENTRY', `<p>The imported objects live here, so they are shared from here.</p>`),
      shareStep('I_UTILSDIVISION_DIM', 'RHN_DSL', 'RHN_ENTRY'),
      shareStep('I_UTILSDIVISIONTEXT', 'RHN_DSL', 'RHN_ENTRY'),
    ],
    questions('Preview the text entity for the German names. And think about what a second import does to an Already Imported object.'),
  ],
  'c05-m01': [
    [
      nav('builder', 'Data Builder', `<p>Base views live in RHN_DSL.</p>`),
      toSpace('RHN_DSL', `<p>Calin's modeling space.</p>`),
      {
        title: 'Shared with RHN_DSL',
        target: '#shared-list',
        body: `<p>These entry tables may be read here. <code>BILLING_CONTRACTS</code> was shared in chapter 1, so you can build on it.</p>`,
      },
    ],
    [
      newView(`<p>A new SQL view in RHN_DSL. On the left, the sources: own objects and <b>Shared Objects</b>.</p>`),
      {
        title: 'An example to start from',
        target: '#editor',
        example: `SELECT GRID_AREA,\n  CASE REGION WHEN 'NORTH' THEN 'Nord' WHEN 'SOUTH' THEN 'Süd' ELSE REGION END AS REGION_DE\nFROM RHN_ENTRY.GRID_AREAS`,
        body: `<p>Put the example into the editor and preview it: CASE with ELSE, on the grid areas. Then replace it with your contracts view:
          every column of the ticket, with a CASE for the grid area and one for the tariff.</p>`,
        action: { do: 'Write your SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_DSL\\.)' },
      },
      {
        title: 'Check before you save',
        target: '#results',
        body: `<p>1,178 rows? Only S/4 codes in GRID_AREA and TARIFF? Scroll through or add a quick <code>GROUP BY</code> in a second scratch view.</p>`,
      },
    ],
    nameSaveDeploy('RHN_DS_V_CONTRACTS', 'Contracts (clean)'),
    questions('Think about the next load from the legacy system, and about how many reports need the codes.'),
  ],
  'c05-m02': [
    [
      toSpace('RHN_ENTRY', `<p>Sharing is set where the object lives.</p>`),
      shareStep('LEGACY_CUSTOMER_MAP', 'RHN_DSL'),
    ],
    [
      toSpace('RHN_DSL', `<p>Back to the data &amp; semantic space.</p>`),
      {
        title: 'Open the view',
        target: '#object-list',
        body: `<p>Your view from the last mission, status <b>Deployed</b>.</p>`,
        action: { do: 'Open <b>RHN_DS_V_CONTRACTS</b>.', check: () => editorOf('RHN_DSL.RHN_DS_V_CONTRACTS') },
      },
      {
        title: 'Impact and Lineage',
        target: '#lineage',
        body: `<p><b>Reads from</b>: the objects in its SQL. <b>Used by</b>: views that read this one. Whatever you deploy here reaches all of them.</p>`,
      },
      {
        title: 'Sources',
        target: '#sources',
        body: `<p>The key mapping now appears under <b>Shared Objects</b>. If not, it is not shared yet.</p>`,
      },
    ],
    [
      {
        title: 'Change the SQL',
        target: '#editor',
        body: `<p>Add a <code>LEFT JOIN</code> to the key mapping on the old customer number. <code>CUSTOMER_ID</code> becomes the CRM ID with a fallback,
          <code>LEGACY_CUSTOMER_ID</code> the old number. Keep the grid area and tariff mapping.</p>`,
        action: { do: 'Change the SQL and press <b>Data Preview</b>.', event: 'preview:RHN_DSL.RHN_DS_V_CONTRACTS' },
      },
    ],
    [
      {
        title: 'Save',
        target: '#ed-save',
        body: `<p>Save stores your change as design.</p>`,
        action: { do: 'Press <b>Save</b>.', event: 'save:RHN_DSL.RHN_DS_V_CONTRACTS' },
      },
      {
        title: 'Changes to Deploy',
        target: '.props-list',
        body: `<p>The status is now <b>Changes to Deploy</b>: anyone reading the view still gets the old version.</p>`,
      },
      {
        title: 'Deploy',
        target: '#ed-deploy',
        body: `<p>Now make it active.</p>`,
        action: { do: 'Press <b>Deploy</b>.', event: 'deploy:RHN_DSL.RHN_DS_V_CONTRACTS' },
      },
      ...questions('Count contracts, not customers.'),
    ],
  ],
  'c05-m03': [
    [
      toSpace('RHN_ENTRY', `<p>Sharing is set where the object lives.</p>`),
      shareStep('CRM_CUSTOMERS', 'RHN_DSL'),
    ],
    [
      toSpace('RHN_DSL', `<p>Now explore the CRM data from the data & semantic layer.</p>`),
      newView(`<p>A scratch view to explore first. You turn it into the real view in the next step.</p>`),
      {
        title: 'Find the duplicates',
        target: '#editor',
        body: `<p>Group by the e-mail in lower case and keep the groups with <code>HAVING COUNT(*) > 1</code>. Then look inside some groups:
          same street? same person?</p>`,
        action: { do: 'Write the query and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_DSL\\.)' },
      },
    ],
    [
      {
        title: 'Number per person',
        target: '#editor',
        example: `SELECT GRID_AREA, REGION,\n  ROW_NUMBER() OVER (PARTITION BY REGION ORDER BY GRID_AREA) AS RN\nFROM RHN_ENTRY.GRID_AREAS`,
        body: `<p>The example numbers the grid areas per region. For the customers: partition by what makes a person, order by
          <code>CREATED_AT</code>, keep number 1 in an outer query.</p>`,
        action: { do: 'Write the deduplicating SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_DSL\\.)' },
      },
      ...nameSaveDeploy('RHN_DS_V_CUSTOMERS', 'Customers (clean)'),
    ],
    questions('Compare row counts, and think about the next CRM export.'),
  ],
  'c05-m04': [
    [
      toSpace('RHN_ENTRY', `<p>Sharing is set where the object lives.</p>`),
      shareStep('METER_READINGS', 'RHN_DSL'),
    ],
    [
      toSpace('RHN_DSL', `<p>Back to the data &amp; semantic space.</p>`),
      newView(`<p>A new view for the readings.</p>`),
      {
        title: 'Convert and deduplicate',
        target: '#editor',
        body: `<p>One <code>CASE</code> for the unit, named <code>CONSUMPTION_KWH</code>, and <code>DISTINCT</code> for the exact copies.
          The status bar of the preview shows the row count.</p>`,
        action: { do: 'Write the SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_DSL\\.)' },
      },
    ],
    nameSaveDeploy('RHN_DS_V_METER_READINGS', 'Meter Readings (clean)'),
    questions('A second scratch view can sum your deployed view for 2025.'),
  ],
  'c05-m05': [
    [
      toSpace('RHN_DSL', `<p>The question is answered where the base views are. Nothing goes to RHN_PRES today.</p>`),
      newView(`<p>A scratch view in RHN_DSL. Your base views are in the Sources list under <b>Repository</b>.</p>`),
      {
        title: 'Consumption per grid area',
        target: '#editor',
        body: `<p>Join readings and contracts on <code>CONTRACT_ID</code>, group by the grid area and sum the kWh. No CASE, no conversion.</p>`,
        action: { do: 'Write the query and press <b>Data Preview</b>.', event: '^preview:draft' },
      },
    ],
    questions('Where does the mapping live, and what does ELSE do with a code it does not know?'),
  ],

  // ================================================================ chapter 6
  'c06-m01': [
    [
      toSpace('RHN_DSL', `<p>Everything of this chapter happens in the data &amp; semantic space. First the 1:1 base view.</p>`),
      newView(`<p>A base view on the entry table, without any logic.</p>`),
      {
        title: 'All columns, no logic',
        target: '#editor',
        body: `<p>List the columns of <code>RHN_ENTRY.GRID_AREAS</code>; the Sources list inserts names for you.</p>`,
        action: { do: 'Write the SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_DSL\\.)' },
      },
      ...nameSaveDeploy('RHN_DS_V_GRID_AREAS', 'Grid Areas (clean)'),
    ],
    [
      {
        title: 'Back to the start page',
        target: '#ed-back',
        body: `<p>The dimension goes into the same space, on top of the base view.</p>`,
        action: { do: 'Go back to the start page of RHN_DSL.', check: () => builderSpace('RHN_DSL') },
      },
      newView(`<p>The dimension view.</p>`),
      {
        title: 'Three columns',
        target: '#editor',
        body: `<p>Read the base view <code>RHN_DS_V_GRID_AREAS</code>, with exactly the columns of the ticket.</p>`,
        action: { do: 'Write the SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_DSL\\.)' },
      },
      ...nameSaveDeploy('RHN_DS_D_GRID_AREA', 'Grid Area', 'RHN_DSL', false),
    ],
    [
      usageStep('Dimension', `<p>Now that the view is saved, its semantic usage can be set.</p>`),
      keyStep('GRID_AREA'),
      deployStep('RHN_DSL.RHN_DS_D_GRID_AREA', `<p>Deploy saves the roles and makes them active.</p>`),
    ],
    questions('Does the data describe something or hold numbers to add up? And what do semantic objects build on?'),
  ],
  'c06-m02': [
    [
      toSpace('RHN_ENTRY', `<p>TARIFFS is not shared with the data &amp; semantic layer yet.</p>`),
      shareStep('TARIFFS', 'RHN_DSL'),
      toSpace('RHN_DSL', `<p>The 1:1 base view for the tariffs, like the grid areas.</p>`),
      newView(`<p>All columns of TARIFFS, no logic.</p>`),
      {
        title: 'Write and preview',
        target: '#editor',
        body: `<p>Same pattern as <code>RHN_DS_V_GRID_AREAS</code>.</p>`,
        action: { do: 'Write the SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_DSL\\.)' },
      },
      ...nameSaveDeploy('RHN_DS_V_TARIFFS', 'Tariffs (clean)'),
    ],
    [
      {
        title: 'Back to the start page',
        target: '#ed-back',
        body: `<p>Now the tariff dimension, in the same space.</p>`,
        action: { do: 'Go back to the start page of RHN_DSL.', check: () => builderSpace('RHN_DSL') },
      },
      newView(`<p>Columns as in the ticket.</p>`),
      {
        title: 'Write and preview',
        target: '#editor',
        body: `<p>Read <code>RHN_DS_V_TARIFFS</code>.</p>`,
        action: { do: 'Write the SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_DSL\\.)' },
      },
      ...nameSaveDeploy('RHN_DS_D_TARIFF', 'Tariff', 'RHN_DSL', false),
      usageStep('Dimension', `<p>A dimension again.</p>`),
      keyStep('TARIFF'),
      deployStep('RHN_DSL.RHN_DS_D_TARIFF', `<p>Deploy it.</p>`),
    ],
    [
      {
        title: 'Back to the start page',
        target: '#ed-back',
        body: `<p>One more dimension.</p>`,
        action: { do: 'Go back to the start page of RHN_DSL.', check: () => builderSpace('RHN_DSL') },
      },
      newView(`<p>The customer dimension.</p>`),
      {
        title: 'Which columns?',
        target: '#editor',
        body: `<p>Read <code>RHN_DS_V_CUSTOMERS</code>. Decide with the ticket which columns the board needs, and which stay in the base view.</p>`,
        action: { do: 'Write the SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_DSL\\.)' },
      },
      ...nameSaveDeploy('RHN_DS_D_CUSTOMER', 'Customer', 'RHN_DSL', false),
      usageStep('Dimension', `<p>And the third dimension.</p>`),
      keyStep('CUSTOMER_ID'),
      deployStep('RHN_DSL.RHN_DS_D_CUSTOMER', `<p>Deploy it.</p>`),
    ],
    questions('Who will read what a dimension offers, and what did audit ask for?'),
  ],
  'c06-m03': [
    [
      toSpace('RHN_DSL', `<p>Facts live in the data &amp; semantic layer too, next to the dimensions.</p>`),
      newView(`<p>The consumption fact.</p>`),
      {
        title: 'Readings plus keys',
        target: '#sources',
        body: `<p>Both base views are in the Sources list under <b>Repository</b>. Join them on <code>CONTRACT_ID</code> and take the keys from the contracts.</p>`,
      },
      {
        title: 'Write and preview',
        target: '#editor',
        body: `<p>Exactly the six columns of the ticket: no names, no regions.</p>`,
        action: { do: 'Write the SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_DSL\\.)' },
      },
      ...nameSaveDeploy('RHN_DS_F_CONSUMPTION', 'Consumption', 'RHN_DSL', false),
    ],
    [
      usageStep('Fact', `<p>A fact: it holds the measure.</p>`),
      {
        title: 'Measure or attribute',
        target: '#column-roles',
        body: `<p>For each column ask: does adding it up mean something? Only those are measures; everything else stays an attribute.</p>`,
        action: { do: 'Give each column its role.', check: () => [...document.querySelectorAll<HTMLSelectElement>('#column-roles select')].some((x) => x.value === 'Measure') },
      },
      deployStep('RHN_DSL.RHN_DS_F_CONSUMPTION', `<p>Deploy saves the roles and makes them active.</p>`),
    ],
    questions('Think about two facts that both need the region, and a grid area that is renamed.'),
  ],
  'c06-m04': [
    [
      {
        title: 'A gap check',
        view: 'builder:new-view:RHN_DSL',
        target: '#editor',
        body: `<p>A scratch view: <code>LEFT JOIN</code> the fact to a dimension on its key and count the rows <code>WHERE d.key IS NULL</code>.
          Zero means every key has its dimension row. Try it for all three.</p>`,
        action: { do: 'Write a gap check and press <b>Data Preview</b>.', event: '^preview:draft' },
      },
    ],
    [
      {
        title: 'Open the fact',
        view: 'builder:landing:RHN_DSL',
        target: '#object-list',
        body: `<p>The associations belong to the fact.</p>`,
        action: { do: 'Open <b>RHN_DS_F_CONSUMPTION</b>.', check: () => editorOf('RHN_DSL.RHN_DS_F_CONSUMPTION') },
      },
      ...assocStep('RHN_DSL.RHN_DS_F_CONSUMPTION', 'RHN_DSL.RHN_DS_D_GRID_AREA'),
      ...assocStep('RHN_DSL.RHN_DS_F_CONSUMPTION', 'RHN_DSL.RHN_DS_D_TARIFF'),
      ...assocStep('RHN_DSL.RHN_DS_F_CONSUMPTION', 'RHN_DSL.RHN_DS_D_CUSTOMER'),
    ],
    [
      {
        title: 'Save',
        target: '#ed-save',
        body: `<p>The associations are part of the design: status <b>Changes to Deploy</b> after saving.</p>`,
        action: { do: 'Press <b>Save</b>.', event: 'save:RHN_DSL.RHN_DS_F_CONSUMPTION' },
      },
      deployStep('RHN_DSL.RHN_DS_F_CONSUMPTION', `<p>Now they are active.</p>`),
      ...questions('When does an association turn into a join?'),
    ],
  ],
  'c06-m05': [
    [
      toSpace('RHN_ENTRY', `<p>The invoices are not shared with the data &amp; semantic layer yet.</p>`),
      shareStep('BILLING_INVOICES', 'RHN_DSL'),
      toSpace('RHN_DSL', `<p>The 1:1 base view.</p>`),
      newView(`<p>All columns of BILLING_INVOICES, no logic.</p>`),
      {
        title: 'Write and preview',
        target: '#editor',
        body: `<p>Same pattern as the other 1:1 base views.</p>`,
        action: { do: 'Write the SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_DSL\\.)' },
      },
      ...nameSaveDeploy('RHN_DS_V_INVOICES', 'Invoices (clean)'),
    ],
    [
      {
        title: 'Back to the start page',
        target: '#ed-back',
        body: `<p>Now the invoice fact, in the same space.</p>`,
        action: { do: 'Go back to the start page of RHN_DSL.', check: () => builderSpace('RHN_DSL') },
      },
      newView(`<p>Invoices joined with the contracts base view for the keys.</p>`),
      {
        title: 'Write and preview',
        target: '#editor',
        body: `<p>The ten columns of the ticket. Gross is not one of them.</p>`,
        action: { do: 'Write the SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_DSL\\.)' },
      },
      ...nameSaveDeploy('RHN_DS_F_INVOICES', 'Invoices', 'RHN_DSL', false),
      usageStep('Fact', `<p>A fact again.</p>`),
      {
        title: 'Measures',
        target: '#column-roles',
        body: `<p>Which columns make sense to add up?</p>`,
        action: { do: 'Give each column its role.', check: () => [...document.querySelectorAll<HTMLSelectElement>('#column-roles select')].some((x) => x.value === 'Measure') },
      },
    ],
    [
      ...assocStep('RHN_DSL.RHN_DS_F_INVOICES', 'RHN_DSL.RHN_DS_D_GRID_AREA'),
      ...assocStep('RHN_DSL.RHN_DS_F_INVOICES', 'RHN_DSL.RHN_DS_D_TARIFF'),
      ...assocStep('RHN_DSL.RHN_DS_F_INVOICES', 'RHN_DSL.RHN_DS_D_CUSTOMER'),
      deployStep('RHN_DSL.RHN_DS_F_INVOICES', `<p>Deploy saves the roles and associations and makes them active.</p>`),
    ],
    [
      {
        title: 'Region from the dimension',
        view: 'builder:new-view:RHN_DSL',
        target: '#editor',
        body: `<p>Join the fact with <code>RHN_DS_D_GRID_AREA</code>, filter the invoice year and group by <code>REGION</code>.</p>`,
        action: { do: 'Write the query and press <b>Data Preview</b>.', event: '^preview:draft' },
      },
      ...questions('Region NORTH has two grid areas. Sum NET_AMOUNT.'),
    ],
  ],
  // ================================================================ chapter 7
  'c07-m01': [
    [
      toSpace('RHN_DSL', `<p>The fact and its dimensions belong to RHN_DSL, so they are shared from here.</p>`),
      shareStep('RHN_DS_F_INVOICES', 'RHN_PRES', 'RHN_DSL'),
      shareStep('RHN_DS_D_GRID_AREA', 'RHN_PRES', 'RHN_DSL'),
      shareStep('RHN_DS_D_TARIFF', 'RHN_PRES', 'RHN_DSL'),
      {
        title: 'Not the customers',
        target: '[data-share="RHN_DSL.RHN_DS_D_CUSTOMER"]',
        body: `<p>The customer dimension stays unshared: no model in the presentation layer may offer customer names. What is not shared
          cannot be reached from RHN_PRES at all.</p>`,
      },
    ],
    [
      toSpace('RHN_PRES', `<p>Analytic models live in the presentation space. Its start page now lists the shared fact and dimensions.</p>`),
      ...newModel('RHN_DSL.RHN_DS_F_INVOICES', `<p>The tile in the <b>Model</b> group. The fact list shows shared facts too.</p>`),
    ],
    [
      {
        title: 'The fact',
        target: '[data-node="fact"]',
        body: `<p>Click the fact: the properties show the measures it brings (role <i>Measure</i> in chapter 6) with their aggregation, and its attributes.</p>`,
        action: { do: 'Click the fact node.', event: 'am-node:fact' },
      },
      {
        title: 'Measures of the fact',
        target: '#am-fact-measures',
        body: `<p>Ticked measures are in the model. Amounts add up, so <b>SUM</b> is right here.</p>`,
      },
      addDims(['Grid Area', 'Tariff'], `<p>The dashed nodes are the dimensions the fact is associated with. Add the ones the ticket needs.
        Whatever you add, every report user can see.</p>`),
      {
        title: 'Attributes of a dimension',
        target: '[data-node="RHN_DSL.RHN_DS_D_GRID_AREA"]',
        body: `<p>Click a dimension to choose which of its attributes are visible. Its key is not listed: it comes from the fact.</p>`,
      },
    ],
    [
      modelBg,
      {
        title: 'Names',
        target: '#properties',
        body: `<p>A business name for people, and the technical name from the ticket. <code>AM</code> marks analytic models.</p>`,
        action: {
          do: 'Enter a business name and the technical name <code>RHN_PR_AM_INVOICES</code>.',
          check: () => val('#prop-technical') === 'RHN_PR_AM_INVOICES' && val('#prop-business').length > 2,
        },
      },
      { title: 'Save', target: '#ed-save', body: `<p>Creates the model in the repository: <b>Not Deployed</b>.</p>`, action: { do: 'Press <b>Save</b>.', event: `save:${AM_INV}` } },
      deployStep(AM_INV, `<p>Only a deployed model can be consumed. The checks query what is deployed.</p>`),
    ],
    [
      amPreview(AM_INV, 'Tariff › TARIFF_NAME', `<p>Rows, measures and variable values for the preview. Only visible attributes are offered.</p>`),
      ...questions('Compare NET_AMOUNT by tariff name. It is close.'),
    ],
  ],
  'c07-m02': [
    [
      openModel('RHN_PR_AM_INVOICES'),
      modelBg,
      ...addMeasure('Calculated Measure', 'Calculated', 'GROSS_AMOUNT', `<p>The formula uses <b>measure names</b> of the model. The buttons below the formula insert them.</p>`),
    ],
    [deployStep(AM_INV, `<p>Deploy saves the new measure and makes it active.</p>`)],
    [
      amPreview(AM_INV, 'STATUS', `<p>STATUS in the rows, GROSS_AMOUNT in the measures: the same figures as in your first CFO ticket.</p>`),
      ...questions('Think about a ratio such as tax / net, summed over many rows.'),
    ],
  ],
  'c07-m03': [
    [
      openModel('RHN_PR_AM_INVOICES'),
      modelBg,
      ...addMeasure('Restricted Measure', 'Restricted', 'UNPAID_GROSS', `<p>Choose the measure to restrict, then the attribute and its values.
        The values are read from the data.</p>`),
    ],
    [
      deployStep(AM_INV, `<p>Make the new measure active.</p>`),
      amPreview(AM_INV, 'Grid Area › REGION', `<p>REGION in the rows, GROSS_AMOUNT and UNPAID_GROSS side by side.</p>`),
    ],
    questions('What would a filter on the report do to the total gross?'),
  ],
  'c07-m04': [
    [
      openModel('RHN_PR_AM_INVOICES'),
      modelBg,
      {
        title: 'Add Variable',
        target: '#am-add-var',
        body: `<p>Variables belong to the whole model.</p>`,
        action: { do: 'Click <b>+ Add Variable</b>.', appear: '#am-v-name' },
      },
      {
        title: 'Filter variable',
        target: '.dialog',
        body: `<p>Which attribute, a single value or an interval, optional or mandatory: decide from the ticket.</p>`,
        action: { do: 'Fill it in for <code>V_INVOICE_DATE</code> and press <b>Add</b>.', event: 'am-variable:V_INVOICE_DATE' },
      },
    ],
    [
      ...addMeasure('Count Distinct', 'Count Distinct', 'CUSTOMERS', `<p>Which attribute identifies a customer?</p>`),
      deployStep(AM_INV, `<p>Deploy the variable and the measure.</p>`),
    ],
    [
      {
        title: 'Variable values',
        target: '#am-pivot',
        body: `<p>The variable now appears below the measures. A mandatory variable must have a value before the preview runs.
          Then try CUSTOMERS with commodity in the rows, and with no rows at all.</p>`,
        action: { do: 'Set the variable and press <b>Data Preview</b>.', event: `am-preview:${AM_INV}` },
      },
      ...questions('Remove all rows to count customers over everything at once.'),
    ],
  ],
  'c07-m05': [
    [
      toSpace('RHN_DSL', `<p>The consumption fact is not shared yet. Its dimensions are, since the invoice model.</p>`),
      shareStep('RHN_DS_F_CONSUMPTION', 'RHN_PRES', 'RHN_DSL'),
    ],
    [
      toSpace('RHN_PRES', `<p>A second model, on the other fact.</p>`),
      ...newModel('RHN_DSL.RHN_DS_F_CONSUMPTION', `<p>Same tile, different fact.</p>`),
      addDims(['Grid Area', 'Tariff'], `<p>Which dimensions does Markus need, and which not?</p>`),
    ],
    [
      modelBg,
      {
        title: 'Add Variable',
        target: '#am-add-var',
        body: `<p>This time optional: without a value the model shows all dates.</p>`,
        action: { do: 'Click <b>+ Add Variable</b>.', appear: '#am-v-name' },
      },
      {
        title: 'Filter variable',
        target: '.dialog',
        body: `<p>The reading date, as an interval.</p>`,
        action: { do: 'Fill it in for <code>V_READING_DATE</code> and press <b>Add</b>.', event: 'am-variable:V_READING_DATE' },
      },
      {
        title: 'Names',
        target: '#properties',
        body: `<p>Business name and the technical name from the ticket.</p>`,
        action: {
          do: 'Enter a business name and the technical name <code>RHN_PR_AM_CONSUMPTION</code>.',
          check: () => val('#prop-technical') === 'RHN_PR_AM_CONSUMPTION' && val('#prop-business').length > 2,
        },
      },
      deployStep('RHN_PRES.RHN_PR_AM_CONSUMPTION', `<p>Deploy saves and activates the model in one step.</p>`),
    ],
    [
      amPreview('RHN_PRES.RHN_PR_AM_CONSUMPTION', 'Tariff › COMMODITY', `<p>Set the variable to 2025, REGION and COMMODITY in the rows.</p>`),
      ...questions('How many fact sources does an analytic model have?'),
    ],
  ],
  // ================================================================ chapter 8
  'c08-m01': [
    [
      toSpace('RHN_DSL', `<p>The permissions table lives in the data &amp; semantic space, next to the facts it protects.</p>`),
      {
        title: 'New Table',
        target: '[data-new="table"]',
        body: `<p>The first tile of the strip.</p>`,
        action: { do: 'Click <b>New Table</b>.', appear: '#tbl-columns' },
      },
      {
        title: 'Columns',
        target: '#tbl-columns',
        body: `<p>Rename the first column, add a second one. Both are keys: one user can have several grid areas, but each pair only once.</p>`,
        action: {
          do: 'Create the columns <code>USER_ID</code> and <code>GRID_AREA</code>, both String and key.',
          check: () => $$('[data-col-name]').map((x) => x.value).join() === 'USER_ID,GRID_AREA',
        },
      },
    ],
    [
      {
        title: 'Data Editor',
        target: '#tbl-data',
        body: `<p>One row per user and grid area. The user IDs are the ones in Security › Users.</p>`,
        action: { do: 'Add the rows from the ticket with <b>Add Row</b>.', check: () => $$('[data-del-row]').length >= 8 },
      },
      {
        title: 'Names',
        target: '#properties',
        body: `<p>A business name for people and the technical name from the ticket.</p>`,
        action: { do: 'Enter a business name and the technical name <code>RHN_DS_T_PERMISSIONS</code>.', check: () => val('#prop-technical') === 'RHN_DS_T_PERMISSIONS' && val('#prop-business').length > 2 },
      },
      deployStep('RHN_DSL.RHN_DS_T_PERMISSIONS', `<p>Deploy creates the table and writes the rows.</p>`),
    ],
    questions('Which column of the fact could the control compare the values with?'),
  ],
  'c08-m02': [
    [
      toSpace('RHN_DSL', `<p>Controls live where the views they protect live: next to the facts in RHN_DSL.</p>`),
      {
        title: 'New Data Access Control',
        target: '[data-new="dac"]',
        body: `<p>In the tile strip, after the task chain.</p>`,
        action: { do: 'Click <b>New Data Access Control</b>.', appear: '#dac-entity' },
      },
      {
        title: 'Permissions entity',
        target: '#dac-entity',
        body: `<p>The table that says who may see what.</p>`,
        action: { do: 'Choose <code>RHN_DS_T_PERMISSIONS</code>.', event: 'dac-entity:RHN_DSL.RHN_DS_T_PERMISSIONS' },
      },
      {
        title: 'Who and what',
        target: '.dac-center',
        body: `<p>Identifier column: who a row is for. Criteria: the values he may see.</p>`,
        action: { do: 'Choose the identifier column and the criterion.', check: () => !!val('#dac-identifier') && $$('[data-criterion]:checked').length > 0 },
      },
    ],
    [
      {
        title: 'Check it',
        target: '#run',
        body: `<p>The preview lists each user with his values. Everyone not listed sees nothing.</p>`,
        action: { do: 'Press <b>Data Preview</b>.', event: '^preview:' },
      },
      {
        title: 'Names',
        target: '#properties',
        body: `<p>Technical name from the ticket.</p>`,
        action: { do: 'Enter a business name and the technical name <code>RHN_DS_DAC_GRID_AREA</code>.', check: () => val('#prop-technical') === 'RHN_DS_DAC_GRID_AREA' && val('#prop-business').length > 2 },
      },
      deployStep(DAC_KEY, `<p>Only a deployed control can be assigned.</p>`),
    ],
    questions('How many entries does Nina have?'),
  ],
  'c08-m03': [
    assignDac('RHN_DSL.RHN_DS_F_INVOICES', 'The invoice fact holds the amounts. That is where the control belongs.'),
    [
      {
        title: 'View as a user',
        target: '#preview-as-bar',
        body: `<p>Since the deployed fact has a control, the Data Preview can show it as one of the users.</p>`,
        action: { do: 'Choose <b>MBRANDT</b> in <b>View as</b>.', event: '^preview-as:RHN_DSL\\.RHN_DS_F_INVOICES:MBRANDT' },
      },
      {
        title: 'The model as Markus',
        view: 'builder:landing:RHN_PRES',
        target: '#object-list',
        body: `<p>The analytic model in RHN_PRES reads the shared fact, and the control travels with the share. Open it.</p>`,
        action: { do: 'Open <b>RHN_PR_AM_INVOICES</b> (tab Analytic Models).', check: () => editorOf('RHN_PRES.RHN_PR_AM_INVOICES') },
      },
      {
        title: 'View as in the model',
        target: '#am-pivot',
        body: `<p>REGION in the rows, set the date variable, choose a user under <b>View as</b>, then Data Preview.</p>`,
        action: { do: 'Preview the model as <b>MBRANDT</b>.', event: '^am-preview-as:RHN_PRES\\.RHN_PR_AM_INVOICES:MBRANDT' },
      },
    ],
    questions('Markus has two grid areas. Set the variable to 2025.'),
  ],
  'c08-m04': [
    assignDac('RHN_DSL.RHN_DS_F_CONSUMPTION', 'The consumption fact holds the kWh.'),
    [
      {
        title: 'The model as Aylin',
        view: 'builder:landing:RHN_PRES',
        target: '#object-list',
        body: `<p>Check what Aylin sees now.</p>`,
        action: { do: 'Open <b>RHN_PR_AM_CONSUMPTION</b>.', check: () => editorOf('RHN_PRES.RHN_PR_AM_CONSUMPTION') },
      },
      {
        title: 'View as in the model',
        target: '#am-pivot',
        body: `<p>REGION in the rows, View as ADEMIR.</p>`,
        action: { do: 'Preview the model as <b>ADEMIR</b>.', event: '^am-preview-as:RHN_PRES\\.RHN_PR_AM_CONSUMPTION:ADEMIR' },
      },
    ],
    questions('Which object holds the numbers?'),
  ],
  // ================================================================ chapter 9
  'c09-m01': [
    [
      {
        title: 'System › Configuration',
        view: 'system:monitoring',
        target: '#system-body',
        body: `<p>Configuration has an area <b>Monitoring</b>. Here the administrator decides what the monitoring apps record.</p>`,
      },
      {
        title: 'Enable tracing',
        target: '#tracing-form',
        body: `<p>Tick <b>Enable Expensive Statement Tracing</b>, keep the threshold at 1,000 ms and save. The controllers then open their
          month-end stories.</p>`,
        action: { do: 'Enable tracing with 1,000 ms and press <b>Save</b>.', event: '^tracing:on:1000' },
      },
    ],
    [
      nav('statements', 'Expensive Statement Logs', `<p>Lists the expensive statements of all spaces.</p>`),
      {
        title: 'Sort by duration',
        target: '#st-sort',
        body: `<p>The slowest statements on top. The column <b>Object</b> names the model or view that was read.</p>`,
        action: { do: 'Sort by <b>Duration</b>.', event: 'statements-sort:duration' },
      },
    ],
    questions('Look at the top rows: object and duration.'),
  ],
  'c09-m02': [
    [
      {
        title: 'Views in RHN_DSL',
        view: 'monitor:views:RHN_DSL',
        target: '#view-list',
        body: `<p>The model lives in RHN_PRES, but its fact and everything below it live here, in the data &amp; semantic space. The tab <b>Views</b>
          lists the deployed views of the space. Data Access shows whether a view is virtual or persisted.</p>`,
        action: { do: 'Click <b>RHN_DS_F_CONSUMPTION</b>.', event: '^monitor-open:RHN_DSL\\.RHN_DS_F_CONSUMPTION$' },
      },
      {
        title: 'View Analyzer',
        target: '#vw-analyzer',
        body: `<p>The analyzer walks down the stack below the fact.</p>`,
        action: { do: 'Press <b>View Analyzer</b>.', event: '^analyzer:RHN_DSL\\.RHN_DS_F_CONSUMPTION$' },
      },
      {
        title: 'Read the stack',
        target: '#analyzer-panel',
        body: `<p>Each row is one level. <b>Own runtime</b> is what that level's own SQL costs. Which level does the heavy lifting?</p>`,
      },
    ],
    [
      {
        title: 'Same space',
        target: '#view-list',
        body: `<p>The expensive view is a base view of the same layer as the fact, so it is in this list too. Persisting in the data &amp; semantic
          layer keeps the presentation layer free of stored data.</p>`,
      },
      {
        title: 'Start Data Persistence',
        target: '#view-list',
        body: `<p>Select the view, then <b>Start Data Persistence</b>. The run log shows how many records were stored.</p>`,
        action: { do: 'Persist the expensive view.', event: '^persist:' },
      },
    ],
    [
      {
        title: 'Open the model',
        view: 'builder:landing:RHN_PRES',
        target: '#object-list',
        body: `<p>Check what the controllers feel now.</p>`,
        action: { do: 'Open <b>RHN_PR_AM_CONSUMPTION</b>.', check: () => editorOf('RHN_PRES.RHN_PR_AM_CONSUMPTION') },
      },
      {
        title: 'Runtime at production volume',
        target: '#am-pivot',
        body: `<p>Run the Data Preview. Its status line shows the simulated runtime at production volume.</p>`,
        action: { do: 'Run the <b>Data Preview</b>.', event: '^am-runtime:RHN_PRES\\.RHN_PR_AM_CONSUMPTION:' },
      },
    ],
    questions('Compare the own runtimes in the analyzer, and read the runtime in the preview.'),
  ],
  'c09-m03': [
    [
      {
        title: 'Views in RHN_DSL',
        view: 'monitor:views:RHN_DSL',
        target: '#view-list',
        body: `<p>Select the persisted readings, then <b>Schedule</b>.</p>`,
        action: { do: 'Schedule <b>RHN_DS_V_METER_READINGS</b> daily.', event: '^schedule:RHN_DSL\\.RHN_DS_V_METER_READINGS:Daily' },
      },
    ],
    questions('When is the stored result computed, and where is it stored?'),
  ],
  'c09-m04': [
    [
      {
        title: 'Markus\'s view',
        view: 'monitor:views:RHN_PRES',
        target: '#view-list',
        body: `<p>Select <code>RHN_PR_V_REGION_REVENUE</code> and start the persistence. Then read the messages of the run.</p>`,
        action: { do: 'Start Data Persistence on <b>RHN_PR_V_REGION_REVENUE</b>.', event: '^persist-fail:RHN_PRES\\.RHN_PR_V_REGION_REVENUE' },
      },
      {
        title: 'The run log',
        target: '#run-log',
        body: `<p>The messages say why the run stopped.</p>`,
      },
    ],
    [
      {
        title: 'The tariffs',
        view: 'monitor:views:RHN_DSL',
        target: '#view-list',
        body: `<p>Five rows, refreshed daily. The analyzer shows what computing them costs.</p>`,
        action: { do: 'Remove the persisted data of <b>RHN_DS_V_TARIFFS</b> and set its schedule to <b>No schedule</b>.', event: '^schedule:RHN_DSL\\.RHN_DS_V_TARIFFS:none' },
      },
    ],
    questions('What does the view read, and what does that object have?'),
  ],
  // ================================================================ chapter 4 (SQL profiling)
  'c04-m01': [
    [
      toSpace('RHN_ENTRY', `<p>Profiling happens where the raw data is: the entry space.</p>`),
      {
        title: 'Look at the contracts first',
        target: '#object-list',
        body: `<p>Open <b>BILLING_CONTRACTS</b> and press <b>Data Preview</b>: one row per supply contract, with <code>GRID_AREA</code>,
          <code>TARIFF</code> and in <code>SRC_SYS_ID</code> the system it came from.</p>`,
        action: { do: 'Open <b>BILLING_CONTRACTS</b> and press <b>Data Preview</b>.', event: '^preview:RHN_ENTRY\\.BILLING_CONTRACTS$' },
      },
      {
        title: 'Back to the start page',
        view: 'builder:landing:RHN_ENTRY',
        target: '[data-new="sqlview"]',
        body: `<p>Now the scratch view. It is never saved: it only exists while you profile.</p>`,
        action: { do: 'Click <b>New SQL View</b>.', check: () => !!$('#editor') && !!$('.ed-title small')?.textContent?.includes('…') },
      },
      {
        title: 'Sources',
        target: '#sources',
        body: `<p>The list on the left shows what this view may read: the deployed objects of the space and what is shared with it.
          A click inserts the full name, for example <code>RHN_ENTRY.BILLING_CONTRACTS</code>.</p>`,
      },
    ],
    [
      {
        title: 'Count per value',
        view: 'builder:new-view:RHN_ENTRY',
        target: '#editor',
        body: `<p><code>COUNT(*)</code> counts rows. <code>GROUP BY column</code> makes one group per distinct value, so the count runs per group.
          The example shows the pattern on another table; put it in and run it if you like.</p>`,
        example: `SELECT CITY, COUNT(*) AS CUSTOMERS
FROM RHN_ENTRY.CRM_CUSTOMERS
GROUP BY CITY
ORDER BY CUSTOMERS DESC`,
        action: {
          do: 'Write a query that counts the contracts per <code>GRID_AREA</code> and press <b>Data Preview</b> (Ctrl+Enter).',
          check: ranWith('BILLING_CONTRACTS', 'GROUP BY', 'GRID_AREA'),
        },
      },
    ],
    [
      {
        title: 'Read the result',
        target: '#results-body',
        body: `<p>Are all grid areas spelled the same way? Upper and lower case count.</p>`,
      },
      {
        title: 'Follow the source',
        target: '#editor',
        body: `<p>Add <code>SRC_SYS_ID</code> to the <code>SELECT</code> and to the <code>GROUP BY</code> to see which system delivers the odd values.
          Put your grid-area-only query back before you check.</p>`,
        action: { do: 'Group by <code>SRC_SYS_ID</code> as well and run it.', check: ranWith('BILLING_CONTRACTS', 'GROUP BY', 'SRC_SYS_ID') },
      },
      ...questions('Which system wrote the odd values, and how many contracts carry them?'),
    ],
  ],
  'c04-m02': [
    [
      toSpace('RHN_ENTRY', `<p>The invoices are in the entry space too.</p>`),
      {
        title: 'The invoices',
        target: '#object-list',
        body: `<p>Find <code>STATUS</code> and the two amounts <code>NET_AMOUNT</code> and <code>TAX_AMOUNT</code>.</p>`,
        action: { do: 'Open <b>BILLING_INVOICES</b> and press <b>Data Preview</b>.', event: '^preview:RHN_ENTRY\\.BILLING_INVOICES$' },
      },
    ],
    [
      { ...newView(`<p>A new scratch view for the query.</p>`), view: 'builder:landing:RHN_ENTRY' },
      {
        title: 'Several numbers per group',
        target: '#editor',
        body: `<p>A query can return several aggregates per group: <code>COUNT(*)</code> and <code>SUM(column)</code> side by side. You can calculate
          inside the sum, <code>SUM(a + b)</code>, and name each column with <code>AS</code>. The example works on the meter readings.</p>`,
        example: `SELECT UNIT,
       COUNT(*)   AS READINGS,
       SUM(VALUE) AS TOTAL_VALUE
FROM RHN_ENTRY.METER_READINGS
GROUP BY UNIT;`,
        action: {
          do: 'Write the query for the invoices: one row per status, the number of invoices and the gross amount. Run it.',
          check: ranWith('BILLING_INVOICES', 'GROUP BY', 'STATUS', 'SUM('),
        },
      },
    ],
    [
      {
        title: 'Read your result',
        target: '#results-body',
        body: `<p>Not paid yet means OPEN and OVERDUE. Add their gross totals.</p>`,
      },
      ...questions('Open and overdue together, gross.'),
    ],
  ],
  'c04-m03': [
    [
      toSpace('RHN_ENTRY', `<p>Still the invoices of the entry space.</p>`),
      { ...newView(`<p>A new scratch view.</p>`), view: 'builder:landing:RHN_ENTRY' },
      {
        title: 'Filter with WHERE',
        target: '#editor',
        body: `<p><code>WHERE</code> keeps only the rows that match a condition. Text goes in single quotes, spelled exactly as in the data.
          The example takes the 5 biggest readings in MWh: filter, sort, limit.</p>`,
        example: `SELECT METER_ID, READING_DATE, VALUE
FROM RHN_ENTRY.METER_READINGS
WHERE UNIT = 'MWh'
ORDER BY VALUE DESC
LIMIT 5;`,
        action: { do: 'Start your query on <code>BILLING_INVOICES</code> with a filter on the status, and run it.', check: ranWith('BILLING_INVOICES', 'WHERE', 'STATUS') },
      },
    ],
    [
      {
        title: 'Four columns',
        view: 'builder:new-view:RHN_ENTRY',
        target: '#editor',
        body: `<p>Invoice ID, contract ID, due date and gross amount. A column can be a calculation, for example <code>PRICE * QUANTITY AS TOTAL</code>.</p>`,
        action: { do: 'List the four columns of the ticket, the fourth calculated, and run it.', check: ranWith('BILLING_INVOICES', 'INVOICE_ID', 'CONTRACT_ID', 'DUE_DATE', '+') },
      },
    ],
    [
      {
        title: 'Sort and cut',
        view: 'builder:new-view:RHN_ENTRY',
        target: '#editor',
        body: `<p><code>ORDER BY … DESC</code> sorts biggest first; without <code>DESC</code> smallest first. <code>LIMIT n</code> at the very end keeps n rows.</p>`,
        action: { do: 'Sort by the gross amount, biggest first, keep 10 rows, and run it.', check: ranWith('ORDER BY', 'LIMIT') },
      },
      {
        title: 'Check the order',
        target: '#results-body',
        body: `<p>The first row must be the biggest amount. If it is the smallest, <code>DESC</code> is missing.</p>`,
      },
    ],
  ],
  'c04-m04': [
    [
      toSpace('RHN_ENTRY', `<p>The mapping table lives next to the contracts.</p>`),
      {
        title: 'The mapping table',
        target: '#object-list',
        body: `<p>Four rows: each grid area with its name and <code>REGION</code>. Which column also exists in the contracts?</p>`,
        action: { do: 'Open <b>GRID_AREAS</b> and press <b>Data Preview</b>.', event: '^preview:RHN_ENTRY\\.GRID_AREAS$' },
      },
    ],
    [
      { ...newView(`<p>A new scratch view for the join.</p>`), view: 'builder:landing:RHN_ENTRY' },
      {
        title: 'How a join works',
        target: '#editor',
        body: `<p><code>JOIN … ON …</code> puts a row of one table next to the matching row of another; <code>ON</code> says what matching means.
          Give each table a short alias (<code>FROM RHN_ENTRY.BILLING_INVOICES i</code>) and address columns as <code>i.CONTRACT_ID</code>.
          The example counts invoices per tariff of their contract.</p>`,
        example: `SELECT c.TARIFF, COUNT(*) AS INVOICES
FROM RHN_ENTRY.BILLING_INVOICES i
JOIN RHN_ENTRY.BILLING_CONTRACTS c
  ON i.CONTRACT_ID = c.CONTRACT_ID
GROUP BY c.TARIFF;`,
        action: {
          do: 'Join the contracts with the grid areas, count the contracts per region, and run it.',
          check: ranWith('BILLING_CONTRACTS', 'GRID_AREAS', 'JOIN', ' ON ', 'REGION', 'GROUP BY'),
        },
      },
    ],
    [
      {
        title: 'Compare totals',
        target: '#results-body',
        body: `<p>Add up the two regions and compare with all contracts (<code>SELECT COUNT(*) FROM RHN_ENTRY.BILLING_CONTRACTS</code>).
          A <code>LEFT JOIN</code> keeps contracts without a partner as <code>null</code>; both answers are accepted. Put your region query back before you check.</p>`,
      },
      ...questions('Remember mission 1: which contracts had grid area values that do not look like the codes in GRID_AREAS?'),
    ],
  ],
  // ================================================================ chapter 12 (excursions)
  'c12-m01': [
    [
      toSpace('RHN_PRES', `<p>Consumers are served from the presentation layer. The tariff dimension is shared with it since chapter 7.</p>`),
      newView(`<p>A <b>consumption view</b>: a thin view in RHN_PRES on the shared dimension. Power BI will read this view, never the dimension itself.</p>`),
      {
        title: 'Three columns',
        target: '#editor',
        body: `<p>Read <code>RHN_DSL.RHN_DS_D_TARIFF</code> (under <b>Shared Objects</b>) with the columns of the ticket.</p>`,
        action: { do: 'Write the SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_PRES\\.)' },
      },
      ...nameSaveDeploy('RHN_PR_V_TARIFFS', 'Tariffs for Power BI', 'RHN_PRES'),
    ],
    [
      {
        title: 'Expose for Consumption',
        target: '#prop-expose',
        body: `<p>Off by default: nothing leaves the space by accident. Switch it on, then Deploy; tools read the deployed version.</p>`,
        action: { do: 'Switch <b>Expose for Consumption</b> on and press <b>Deploy</b>.', event: '^deploy:RHN_PRES\\.RHN_PR_V_TARIFFS$' },
      },
    ],
    [
      nav('spaces', 'Space Management', `<p>Database users belong to a space and are managed with it.</p>`),
      {
        title: 'Database Access',
        target: '[data-dbaccess="RHN_PRES"]',
        body: `<p>Each space card has <b>Database Access</b> from this chapter on.</p>`,
        action: { do: 'Click <b>Database Access</b> on the RHN_PRES card.', event: 'dbaccess:RHN_PRES' },
      },
      {
        title: 'Create the user',
        target: '.dialog',
        body: `<p>The suffix names the user: <code>RHN_PRES#</code> plus your suffix. Decide which access the pricing team needs.</p>`,
        action: { do: 'Create the database user for Power BI.', event: '^dbuser:RHN_PRES#' },
      },
    ],
    questions('Which objects can a database user read at all?'),
  ],
  'c12-m02': [
    [
      {
        title: 'Transport › Packages',
        view: 'transport:packages',
        target: '#pkg-create',
        body: `<p>Transport has four pages in the navigation: Packages, Export, Import, Monitor.</p>`,
        action: { do: 'Click <b>Create</b>.', appear: '#pkg-name' },
      },
      {
        title: 'Name and space',
        target: '.tr-props',
        body: `<p>A business name, a technical name such as <code>RHN_PR_PKG_BOARD</code>, and the space <b>RHN_PRES</b>. The space cannot change once objects are in.</p>`,
      },
      {
        title: 'Add the model',
        target: '#pkg-add',
        body: `<p>The list shows the deployed objects of the space. Start with the model; the table then shows what it needs.</p>`,
        action: { do: 'Add <b>RHN_PR_AM_CONSUMPTION</b>.', event: '^package-add:RHN_PRES\\.RHN_PR_AM_CONSUMPTION$' },
      },
    ],
    [
      {
        title: 'Validation',
        target: '#pkg-validation',
        body: `<p>Each line names a missing object and who needs it. Objects of RHN_PRES go into the package; objects of other spaces come from a required package.</p>`,
      },
      {
        title: 'Required package',
        target: '#pkg-req',
        body: `<p>Calin's and Jonas' packages are exported already.</p>`,
        action: { do: 'Add the required package your objects need.', event: '^package-require:' },
      },
      {
        title: 'Until it is clean',
        target: '#pkg-validate',
        body: `<p>Validate again until the Validation panel is green. Objects of RHN_PRES go into your package; what lives in RHN_DSL or RHN_ENTRY
          comes from a required package. Then Save.</p>`,
        action: { do: 'Make the package valid and press <b>Save</b>.', event: '^package-save:' },
      },
    ],
    [
      {
        title: 'Export',
        view: 'transport:export',
        target: '#export-list',
        body: `<p>Select your package, press Export and choose the target tenants.</p>`,
        action: { do: 'Export the package.', event: '^export:.*:Success$' },
      },
    ],
    [
      {
        title: 'Import',
        view: 'transport:import',
        target: '#import-list',
        body: `<p>What the target tenants see. Select a package and press the import icon to read the import options.</p>`,
      },
      ...questions('The import options answer the first question; the required packages the second.'),
    ],
  ],
  'c12-m03': [
    [
      {
        title: 'Catalog & Marketplace › Search',
        view: 'catalog',
        target: '#cat-q',
        body: `<p>Search for <code>consumption</code> and press Enter.</p>`,
      },
      {
        title: 'Open the asset',
        target: '#cat-results',
        body: `<p>The analytic model is one of the assets extracted from this tenant.</p>`,
        action: { do: 'Open <b>RHN_PR_AM_CONSUMPTION</b>.', event: '^catalog-open:RHN_PRES\\.RHN_PR_AM_CONSUMPTION$' },
      },
      {
        title: 'Describe and tag',
        target: '#asset-desc',
        body: `<p>What is it, who owns it, when to use it. Then tick the tag <b>Consumption</b> under Subject Area and Save.</p>`,
        action: { do: 'Write the description, tick the tag, <b>Save</b>.', event: '^asset-tag:RHN_PRES\\.RHN_PR_AM_CONSUMPTION:Subject Area/Consumption' },
      },
    ],
    [
      {
        title: 'A glossary term',
        target: '#asset-term-new',
        body: `<p>One term, one definition everybody can rely on: what is counted, in which unit, from which source.</p>`,
        action: { do: 'Create the glossary term.', event: '^term-create:' },
      },
      {
        title: 'Link it',
        target: '#asset-terms',
        body: `<p>Tick your new term and Save.</p>`,
        action: { do: 'Link the term to the asset and <b>Save</b>.', event: '^asset-term:RHN_PRES\\.RHN_PR_AM_CONSUMPTION:' },
      },
    ],
    [
      {
        title: 'Publish the asset',
        target: '#asset-publish',
        body: `<p>Until now only you, the catalog administrator, see it.</p>`,
        action: { do: 'Press <b>Publish</b>.', event: '^asset-publish:RHN_PRES\\.RHN_PR_AM_CONSUMPTION$' },
      },
      {
        title: 'Publish the term',
        view: 'catalog',
        target: '#cat-results',
        body: `<p>Terms are published on their own: open your term from the results and publish it.</p>`,
        action: { do: 'Publish your glossary term.', event: '^term-publish:' },
      },
    ],
    questions('What does the catalog extract from a tenant?'),
  ],
  'c12-m04': [
    [
      nav('business', 'Business Builder', `<p>Look at the title of the welcome page.</p>`),
      {
        title: 'Space RHN_PRES',
        target: '#bb-spaces',
        body: `<p>The Business Builder works per space, like the Data Builder.</p>`,
        action: { do: 'Select <b>RHN_PRES</b>.', event: 'bb-space:RHN_PRES' },
      },
      {
        title: 'The consumption model',
        target: '#bb-list',
        body: `<p>The column Type tells you which object SAP Analytics Cloud stories were built on.</p>`,
        action: { do: 'Open the <b>consumption model</b>.', event: '^bb-open:RHN_PRES\\.RHN_CM_REVENUE$' },
      },
    ],
    [
      {
        title: 'Perspectives',
        target: '#bb-tabs',
        body: `<p>The perspective is what the story read.</p>`,
        action: { do: 'Open the tab <b>Perspectives</b>.', event: '^bb-tab:RHN_CM_REVENUE:Perspectives$' },
      },
      {
        title: 'Follow the sources',
        target: '#bb-tab-body',
        body: `<p>Go back to the list and open the fact model and the invoice entity: each General tab names its source.</p>`,
      },
    ],
    questions('What did you build in chapter 7 for net and tax by region?'),
  ],
  'c12-m05': [
    [
      { ...newView(`<p>A new SQL view in RHN_DSL, next to the dimension. The grid areas base view is in the Sources list.</p>`), view: 'builder:landing:RHN_DSL' },
      {
        title: 'Stack the levels',
        target: '#editor',
        body: `<p>Three groups of rows, stacked with <code>UNION ALL</code>: the root, the regions, the grid areas. Each group returns the same columns.
          The example stacks two levels of the tariffs: a commodity node above each tariff.</p>`,
        example: `SELECT DISTINCT 'C_' || COMMODITY AS NODE_ID, NULL AS PARENT_ID FROM RHN_DSL.RHN_DS_V_TARIFFS
UNION ALL
SELECT TARIFF, 'C_' || COMMODITY FROM RHN_DSL.RHN_DS_V_TARIFFS`,
        action: { do: 'Write the grid area tree and run <b>Data Preview</b>: seven rows, every node ID once.', check: ranWith('UNION ALL', 'NODE_ID', 'PARENT_ID', 'GRID_AREAS') },
      },
      ...nameSaveDeploy('RHN_DS_H_GRID_AREA', 'Grid Area Hierarchy', 'RHN_DSL', false),
    ],
    [
      {
        title: 'Semantic usage Hierarchy',
        target: '#prop-semantic',
        body: `<p>Choose <b>Hierarchy</b>. The columns then get the roles Parent and Child.</p>`,
        action: { do: 'Set Hierarchy, PARENT_ID → Parent, NODE_ID → Child, then <b>Deploy</b>.', event: '^deploy:RHN_DSL\\.RHN_DS_H_GRID_AREA$' },
      },
    ],
    [
      {
        title: 'The dimension',
        view: 'builder:landing:RHN_DSL',
        target: '#object-list',
        body: `<p>Open <b>RHN_DS_D_GRID_AREA</b>. In its properties, Associations › Add: target RHN_DS_H_GRID_AREA, GRID_AREA → NODE_ID.</p>`,
        action: { do: 'Add the association and <b>Deploy</b> the dimension.', event: '^deploy:RHN_DSL\\.RHN_DS_D_GRID_AREA$' },
      },
    ],
    questions('What does a node stand for?'),
  ],
  'c12-m06': [
    [
      {
        title: 'New Table',
        view: 'builder:landing:RHN_DSL',
        target: '[data-new="table"]',
        body: `<p>Like the permissions table of chapter 8, but with nodes: USER_ID and NODE_ID, three rows.</p>`,
        action: { do: 'Create, fill and deploy <b>RHN_DS_T_PERMISSION_NODES</b>.', event: '^deploy:RHN_DSL\\.RHN_DS_T_PERMISSION_NODES$' },
      },
    ],
    [
      {
        title: 'New Data Access Control',
        view: 'builder:landing:RHN_DSL',
        target: '[data-new="dac"]',
        body: `<p>Criteria type <b>Hierarchy</b>, then the hierarchy, the node table, USER_ID as identifier and NODE_ID as criterion.</p>`,
        action: { do: 'Create and deploy <b>RHN_DS_DAC_REGION</b>.', event: '^deploy:RHN_DSL\\.RHN_DS_DAC_REGION$' },
      },
    ],
    [
      {
        title: 'Swap the control',
        view: 'builder:landing:RHN_DSL',
        target: '#object-list',
        body: `<p>Open <b>RHN_DS_F_INVOICES</b>. In Data Access Controls remove the old one and assign the new one, NODE_ID → GRID_AREA.</p>`,
        action: { do: 'Swap the control and <b>Deploy</b> the fact.', event: '^deploy:RHN_DSL\\.RHN_DS_F_INVOICES$' },
      },
      {
        title: 'Check as Markus',
        view: 'builder:landing:RHN_PRES',
        target: '#object-list',
        body: `<p>Open the invoice model in RHN_PRES, REGION in the rows, View as MBRANDT, Data Preview: only the North. The new control came along with the shared fact.</p>`,
        action: { do: 'Preview <b>RHN_PR_AM_INVOICES</b> as MBRANDT.', event: '^am-preview-as:RHN_PRES\\.RHN_PR_AM_INVOICES:MBRANDT' },
      },
    ],
    questions('What does the control resolve R_NORTH to?'),
  ],
  'c12-m12': [
    [
      {
        title: 'The flows of RHN_DSL',
        view: 'monitor:flows:RHN_DSL',
        target: '#flow-list',
        body: `<p>Deployed flows of the space with their last run. The transformation flow's last run was a delta.</p>`,
        action: { do: 'Select <b>RHN_DS_TF_PAYMENTS</b>.', appear: '#flow-reset' },
      },
      {
        title: 'Reset Watermark',
        target: '#flow-reset',
        body: `<p>Only for flows with Initial and Delta. Nothing runs yet; the flow forgets its watermark, the point up to which it has read the delta table.</p>`,
        action: { do: 'Press <b>Reset Watermark</b>.', event: '^tf-reset:RHN_DSL\\.RHN_DS_TF_PAYMENTS$' },
      },
      {
        title: 'Run',
        target: '#flow-run',
        body: `<p>This run is an initial load: every payment, including today's PAY-0097. Read its messages on the right.</p>`,
        action: { do: 'Press <b>Run</b>.', event: '^tf-run:RHN_DSL\\.RHN_DS_TF_PAYMENTS:Completed$' },
      },
    ],
    [
      {
        title: 'Open the nightly chain',
        view: 'builder:landing:RHN_DSL',
        target: '#object-list',
        body: `<p>The chain from chapter 10: the CRM chain of RHN_ENTRY, then two view persistences.</p>`,
        action: { do: 'Open <b>RHN_DS_TC_NIGHTLY</b>.', check: () => editorOf('RHN_DSL.RHN_DS_TC_NIGHTLY') },
      },
      {
        title: 'Add Step',
        target: '#chain-add',
        body: `<p>Transformation flows have their own group in the dialog. New steps go to the end.</p>`,
        action: { do: 'Add <b>RHN_DS_TF_PAYMENTS</b>.', event: '^chain-add:RHN_DSL\\.RHN_DS_TF_PAYMENTS$' },
      },
      {
        title: 'Deploy',
        target: '#ed-deploy',
        body: `<p>The schedule of the chain runs the deployed version.</p>`,
        action: { do: 'Press <b>Deploy</b>.', event: '^deploy:RHN_DSL\\.RHN_DS_TC_NIGHTLY$' },
      },
    ],
    [
      {
        title: 'Run the chain',
        target: '#chain-run',
        body: `<p>As tonight would. The flow is the last step; after the reset and the initial load it reads only the changes.</p>`,
        action: { do: 'Press <b>Run</b>.', event: '^chain-run:RHN_DSL\\.RHN_DS_TC_NIGHTLY:' },
      },
    ],
    questions('Where does a delta run look for changes, and where did Tim delete the rows?'),
  ],
  'c12-m11': [
    [
      {
        title: 'Open the payments',
        view: 'builder:landing:RHN_ENTRY',
        target: '#object-list',
        body: `<p>Accounts Receivable's table in the entry layer: 95 payments, key PAYMENT_ID. Status <b>Not Deployed</b>: Jonas only saved it.</p>`,
        action: { do: 'Open <b>RHN_EN_T_PAYMENTS</b>.', check: () => editorOf('RHN_ENTRY.RHN_EN_T_PAYMENTS') },
      },
      {
        title: 'Delta Capture',
        target: '#prop-delta',
        body: `<p>In the properties on the right. Only possible now, before the first deploy: afterwards the switch is fixed. From then on the table records every change it gets deployed with.</p>`,
        action: { do: 'Switch <b>Delta Capture</b> on.', event: '^table-delta:RHN_ENTRY\\.RHN_EN_T_PAYMENTS:on$' },
      },
      {
        title: 'Deploy',
        target: '#ed-deploy',
        body: `<p>The first deploy creates the table with its 95 rows and the delta table <code>RHN_EN_T_PAYMENTS_Delta</code>.</p>`,
        action: { do: 'Press <b>Deploy</b>.', event: '^deploy:RHN_ENTRY\\.RHN_EN_T_PAYMENTS$' },
      },
    ],
    [
      {
        title: 'New Transformation Flow',
        view: 'builder:landing:RHN_DSL',
        target: '[data-new="transformation"]',
        body: `<p>The flow belongs to the data & semantic layer; the payments table is shared with RHN_DSL.</p>`,
        action: { do: 'Click <b>Transformation Flow</b>.', appear: '#tf-canvas' },
      },
      {
        title: 'The view transform',
        target: '#tf-editor',
        body: `<p>Two nodes: the view transform and the target table. Write the transform as one SELECT: the payment columns from
          <code>RHN_ENTRY.RHN_EN_T_PAYMENTS</code>, joined with <code>RHN_DSL.RHN_DS_V_INVOICES</code> on <code>INVOICE_ID</code> for the <code>CONTRACT_ID</code>.
          Read the table itself, not a delta table. <b>Data Preview</b> shows what it returns.</p>`,
        action: { do: 'Write the SELECT and press <b>Data Preview</b>.', check: () => !!$('#tf-preview-out .result-status.ok') && ['RHN_EN_T_PAYMENTS', 'RHN_DS_V_INVOICES', 'CONTRACT_ID'].every((w) => sqlText().includes(w)) },
      },
      {
        title: 'Target table',
        target: '[data-node="target"]',
        body: `<p>A new name creates the table on the first run, with the columns of the transform and the key of the delta source.</p>`,
        action: { do: 'Open the <b>Target</b> node and name it <b>RHN_DS_T_PAYMENTS</b>.', event: '^tf-target:RHN_DS_T_PAYMENTS$' },
      },
      {
        title: 'Load type',
        target: '#properties',
        body: `<p>The load type belongs to the flow itself: <b>‹ Transformation flow properties</b> at the top of the panel.</p>`,
        action: { do: 'Choose <b>Initial and Delta</b>.', event: '^tf-load:Initial and Delta$' },
      },
    ],
    [
      {
        title: 'Name and deploy',
        target: '#ed-deploy',
        body: `<p>Business name as you like, technical name <code>RHN_DS_TF_PAYMENTS</code>, in the same panel.</p>`,
        action: { do: 'Name the flow and press <b>Deploy</b>.', event: '^deploy:RHN_DSL\\.RHN_DS_TF_PAYMENTS$' },
      },
      {
        title: 'The initial load',
        target: '#tf-run',
        body: `<p>The first run of a delta flow reads all payments and remembers how far the delta table has been read.</p>`,
        action: { do: 'Press <b>Run</b>.', event: '^tf-run:RHN_DSL\\.RHN_DS_TF_PAYMENTS:Completed$' },
      },
    ],
    [
      {
        title: 'Back to the payments',
        view: 'builder:landing:RHN_ENTRY',
        target: '#object-list',
        body: `<p>Today's bank message goes into the Data Editor, as Accounts Receivable does every morning.</p>`,
        action: { do: 'Open <b>RHN_EN_T_PAYMENTS</b>.', check: () => editorOf('RHN_ENTRY.RHN_EN_T_PAYMENTS') },
      },
      {
        title: 'The bank message',
        target: '#tbl-data',
        body: `<p>Three changes from the ticket: <b>Add Row</b> for PAY-0096, the new amount in the AMOUNT cell of PAY-0012, and <b>Delete</b> on the row of PAY-0007.</p>`,
        action: { do: 'Enter the three changes.', check: bankEntered },
      },
      {
        title: 'Deploy the changes',
        target: '#ed-deploy',
        body: `<p>Deploying writes the rows, and Delta Capture records one change record per changed key.</p>`,
        action: { do: 'Press <b>Deploy</b>.', event: '^deploy:RHN_ENTRY\\.RHN_EN_T_PAYMENTS$' },
      },
      {
        title: 'The delta table',
        target: '#tbl-delta',
        body: `<p>RHN_EN_T_PAYMENTS_Delta: an I, a U and a D, each with its change date. This is what the next delta run reads.</p>`,
      },
      {
        title: 'Open the flow',
        view: 'builder:landing:RHN_DSL',
        target: '#object-list',
        body: `<p>The second night: run the flow again.</p>`,
        action: { do: 'Open <b>RHN_DS_TF_PAYMENTS</b>.', check: () => editorOf('RHN_DSL.RHN_DS_TF_PAYMENTS') },
      },
      {
        title: 'The delta run',
        target: '#tf-run',
        body: `<p>Compare the message of this run with the first one: how many records, and of which kinds?</p>`,
        action: { do: 'Press <b>Run</b>.', event: '^tf-run:RHN_DSL\\.RHN_DS_TF_PAYMENTS:Completed$' },
      },
    ],
    questions('Look at the messages of your second run: how many records did it read, and of which kinds?'),
  ],
  'c12-m10': [
    [
      {
        title: 'New Data Flow',
        view: 'builder:landing:RHN_DSL',
        target: '[data-new="dataflow"]',
        body: `<p>Data flows belong to a space. This one transforms base views, so it and Sabine's table live in the data &amp; semantic layer.</p>`,
        action: { do: 'Click <b>Data Flow</b>.', appear: '#df-canvas' },
      },
      {
        title: 'The canvas',
        target: '#df-canvas',
        body: `<p>Each box is a node: source, join, projection, aggregation, target. Dashed boxes are not used yet. Click a box to set it up on the right.</p>`,
      },
      {
        title: 'Source',
        target: '#properties',
        body: `<p>The readings base view of this space.</p>`,
        action: { do: 'Choose <b>RHN_DSL.RHN_DS_V_METER_READINGS</b> as source.', event: '^df-source:RHN_DSL\\.RHN_DS_V_METER_READINGS$' },
      },
      {
        title: 'Join',
        target: '[data-node="join"]',
        body: `<p>The grid area is on the contract. Add a join with the contracts view, CONTRACT_ID on both sides.</p>`,
        action: { do: 'Open <b>Join</b>, add it and choose <b>RHN_DSL.RHN_DS_V_CONTRACTS</b>.', event: '^df-join:RHN_DSL\\.RHN_DS_V_CONTRACTS$' },
      },
    ],
    [
      {
        title: 'Projection',
        target: '[data-node="projection"]',
        body: `<p>Three columns: the month as text (<code>strftime(a.READING_DATE, '%Y-%m')</code>), <code>b.GRID_AREA</code> and <code>a.CONSUMPTION_KWH</code>. The SQL below the canvas follows every change.</p>
          <p class="muted">The game runs on DuckDB, hence <code>strftime</code>. In SAP HANA the same is <code>TO_VARCHAR(READING_DATE, 'YYYY-MM')</code>.</p>`,
        action: { do: 'Open <b>Projection</b> and add the three columns.', check: () => (document.querySelectorAll('[data-col-name]').length >= 3) },
      },
      {
        title: 'Aggregation',
        target: '[data-node="aggregation"]',
        body: `<p>Columns without a function are the groups; CONSUMPTION_KWH gets SUM.</p>`,
        action: { do: 'Add the <b>Aggregation</b> and set SUM for CONSUMPTION_KWH.', check: () => !!document.querySelector('[data-agg="CONSUMPTION_KWH"]') && (document.querySelector('[data-agg="CONSUMPTION_KWH"]') as HTMLSelectElement).value === 'SUM' },
      },
      {
        title: 'Target and mode',
        target: '[data-node="target"]',
        body: `<p>A new name creates the table on the first run. Read what each mode does with the rows of last night.</p>`,
        action: { do: 'Name the target <b>RHN_DS_T_MONTHLY_CONSUMPTION</b> and choose a mode.', event: '^df-mode:' },
      },
    ],
    [
      {
        title: 'Name, save, deploy',
        target: '#ed-deploy',
        body: `<p>The flow's own names are under <b>‹ Data flow properties</b> on the right: technical name <code>RHN_DS_DF_MONTHLY</code>.</p>`,
        action: { do: 'Name the flow and press <b>Deploy</b>.', event: '^deploy:RHN_DSL\\.RHN_DS_DF_MONTHLY$' },
      },
      {
        title: 'Two nights',
        target: '#df-run',
        body: `<p>Run it, then run it again, as two nights would. Compare the row counts in the run messages.</p>`,
        action: { do: 'Press <b>Run</b> twice.', check: () => (document.querySelectorAll('#df-runs li').length >= 2) },
      },
    ],
    questions('Append adds what the run delivers. When is adding exactly right?'),
  ],
  'c12-m09': [
    [
      nav('semantic', 'Semantic Onboarding', `<p>In the Apps group: SAP systems on top, the Content Network below.</p>`),
      {
        title: 'Business Content',
        target: '#content-areas',
        body: `<p>Samples, SAP business content and partner content. The utilities package is SAP business content.</p>`,
        action: { do: 'Open <b>Business Content</b>.', event: '^onboarding:business$' },
      },
      {
        title: 'The package',
        target: '#package-list',
        body: `<p>Each card is one package with provider and version.</p>`,
        action: { do: 'Open <b>Utilities – Billing Analysis</b>.', event: '^content-open:SAP_UTIL_BILLING$' },
      },
      {
        title: 'Prerequisites',
        target: '#pkg-prereq',
        body: `<p>Read them before you import: the target space, the connection the remote tables expect, the storage.</p>`,
      },
      {
        title: 'Import',
        target: '#pkg-import',
        body: `<p>Overwrite stays off; Deploy after import stays on.</p>`,
        action: { do: 'Press <b>Import</b>, keep the options and confirm.', event: '^content-import:SAP_UTIL_BILLING:' },
      },
    ],
    [
      {
        title: 'Import Overview',
        view: 'semantic:pkg:SAP_UTIL_BILLING',
        target: '#pkg-tab-imports',
        body: `<p>Every import of a package is logged on the package, with its messages. (<b>Open Import Logs</b> on the start page is for importing entities from SAP systems.)</p>`,
        action: { do: 'Open the tab <b>Import Overview</b>.', event: '^import-overview:SAP_UTIL_BILLING$' },
      },
      {
        title: 'Your import',
        target: '#import-log-list',
        body: `<p>The status says it finished with errors. The start time opens the messages: green worked, orange is a warning, red failed.</p>`,
        action: { do: 'Open the messages of your import.', event: '^import-log-open:SAP_UTIL_BILLING$' },
      },
    ],
    [
      nav('repository', 'Repository Explorer', `<p>The imported objects are in the list like your own.</p>`),
      {
        title: 'Find the fact',
        target: '#repo-search',
        body: `<p>Search for the billing fact and open it. Its properties show what it reads.</p>`,
        action: { do: 'Open <b>SAP_UTIL_V_BILLING</b> from the list.', event: '^repository-open:SAP_UTIL\\.SAP_UTIL_V_BILLING$' },
      },
    ],
    questions('Read the warnings of the remote tables in the import log.'),
  ],
  'c12-m08': [
    [
      toSpace('RHN_PRES', `<p>Outside tools read the presentation layer. The grid area dimension is shared with it since chapter 7.</p>`),
      newView(`<p>A consumption view on the shared dimension, as for the tariffs in the first excursion.</p>`),
      {
        title: 'Three columns',
        target: '#editor',
        body: `<p>Read <code>RHN_DSL.RHN_DS_D_GRID_AREA</code> (under <b>Shared Objects</b>) with the columns of the ticket.</p>`,
        action: { do: 'Write the SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_PRES\\.)' },
      },
      ...nameSaveDeploy('RHN_PR_V_GRID_AREAS', 'Grid Areas for Planning', 'RHN_PRES'),
      {
        title: 'Expose and deploy',
        target: '#prop-expose',
        body: `<p>The same switch as for Power BI in the first excursion. Tools only see what is exposed, and only in its deployed version.</p>`,
        action: { do: 'Switch <b>Expose for Consumption</b> on and press <b>Deploy</b>.', event: '^deploy:RHN_PRES\\.RHN_PR_V_GRID_AREAS$' },
      },
    ],
    [
      {
        title: 'App Integration',
        view: 'system:admin-apps',
        target: '#oauth-add',
        body: `<p>System › Administration › App Integration lists the OAuth clients of the tenant.</p>`,
        action: { do: 'Press <b>Add a New OAuth Client</b>.', appear: '.dialog [name="purpose"]' },
      },
      {
        title: 'Purpose and redirect URI',
        target: '.dialog',
        body: `<p>Read what each purpose means; the grant follows from it. Copy the redirect URI from the ticket exactly.</p>`,
        action: { do: 'Fill in the client and press <b>Add</b>.', event: '^oauth-create:' },
      },
    ],
    [
      {
        title: 'Test the call',
        view: 'system:admin-apps',
        target: '#oauth-list',
        body: `<p><b>Test</b> calls the API like the planners' import connection: sign in with the client, then read one object. The answer says what is missing.</p>`,
        action: { do: 'Read <b>RHN_PRES.RHN_PR_V_GRID_AREAS</b> with HTTP 200.', event: '^odata-test:.*:RHN_PRES\\.RHN_PR_V_GRID_AREAS:200$' },
      },
    ],
    questions('Who is signed in when the import connection reads the data?'),
  ],
  'c12-m07': [
    [
      {
        title: 'Open the view',
        view: 'builder:landing:RHN_DSL',
        target: '#object-list',
        body: `<p>The contracts view of the data & semantic layer. Its status is Deployed: Tim's version is what runs.</p>`,
        action: { do: 'Open <b>RHN_DS_V_CONTRACTS</b>.', check: () => editorOf('RHN_DSL.RHN_DS_V_CONTRACTS') },
      },
      {
        title: 'Versions',
        target: '#ed-versions',
        body: `<p>Next to Details in the toolbar.</p>`,
        action: { do: 'Press <b>Versions</b>.', appear: '#version-list' },
      },
    ],
    [
      {
        title: 'Compare',
        target: '#version-list',
        body: `<p>The newest version is on top and marked Deployed. Select the one below it: the right side compares it with what runs now:
          red lines (−) are in the deployed version only, green lines (+) only in the selected one.</p>`,
        action: { do: 'Select the version before Tim\'s.', event: '^version-view:RHN_DSL\\.RHN_DS_V_CONTRACTS:' },
      },
    ],
    [
      {
        title: 'Restore',
        target: '#version-restore',
        body: `<p>Restore puts this version into the editor. Nothing runs yet: the status becomes Changes to Deploy.</p>`,
        action: { do: 'Press <b>Restore</b>.', event: '^version-restore:RHN_DSL\\.RHN_DS_V_CONTRACTS:' },
      },
      {
        title: 'Deploy',
        target: '#ed-deploy',
        body: `<p>Deploying the restored definition makes it active and adds it as a new version.</p>`,
        action: { do: 'Press <b>Deploy</b>.', event: '^deploy:RHN_DSL\\.RHN_DS_V_CONTRACTS$' },
      },
    ],
    questions('Where does the version history live, and how do changes travel between tenants?'),
  ],
  // ================================================================ chapter 10
  'c10-m01': [
    [
      {
        title: 'New Task Chain',
        view: 'builder:landing:RHN_ENTRY',
        target: '[data-new="taskchain"]',
        body: `<p>A task chain belongs to one space, like everything in the Data Builder.</p>`,
        action: { do: 'Click <b>Task Chain</b>.', appear: '#chain-steps' },
      },
      {
        title: 'Add the CRM flow',
        target: '#chain-add',
        body: `<p><b>Add Step</b> lists the deployed objects of the space, grouped by what the step does.</p>`,
        action: { do: 'Add <b>RHN_EN_RF_CRM</b>.', event: '^chain-add:RHN_ENTRY\\.RHN_EN_RF_CRM$' },
      },
      {
        title: 'And the meter readings?',
        target: '#chain-add',
        body: `<p>Try Lena's delta flow as well. The dialog tells you whether it can be a step.</p>`,
        action: { do: 'Try to add <b>RHN_EN_RF_MDM</b>, read the message, cancel.', event: '^chain-refused:RHN_ENTRY\\.RHN_EN_RF_MDM$' },
      },
    ],
    [
      {
        title: 'Names and Deploy',
        target: '#properties',
        body: `<p>Business name for people, technical name <code>RHN_EN_TC_CRM</code>. Then Deploy: only a deployed chain can run.</p>`,
        action: { do: 'Enter the names and press <b>Deploy</b>.', event: '^deploy:RHN_ENTRY\\.RHN_EN_TC_CRM$' },
      },
      {
        title: 'Run',
        target: '#chain-run',
        body: `<p>Run starts the deployed version now. The result of each step appears below.</p>`,
        action: { do: 'Press <b>Run</b>.', event: '^chain-run:RHN_ENTRY\\.RHN_EN_TC_CRM:' },
      },
    ],
    [
      {
        title: 'Share with RHN_DSL',
        view: 'builder:landing:RHN_ENTRY',
        target: '#object-list',
        body: `<p>The share icon in the object list shares the chain. RHN_DSL can then nest it in its own chain.</p>`,
        action: { do: 'Share <b>RHN_EN_TC_CRM</b> with <b>RHN_DSL</b>.', event: '^share:RHN_ENTRY\\.RHN_EN_TC_CRM$' },
      },
      {
        title: 'Remove the old schedule',
        view: 'monitor:flows:RHN_ENTRY',
        target: '#flow-list',
        body: `<p>The flow still has its own daily schedule from chapter 3. Open it and set <b>Schedule</b> to No schedule.</p>`,
        action: { do: 'Remove the schedule of <b>RHN_EN_RF_CRM</b>.', event: '^schedule:RHN_ENTRY\\.RHN_EN_RF_CRM:none' },
      },
    ],
    questions('When does a delta replication end?'),
  ],
  'c10-m02': [
    [
      {
        title: 'The nightly chain',
        view: 'builder:landing:RHN_DSL',
        target: '[data-new="taskchain"]',
        body: `<p>This chain lives in RHN_DSL: it persists views of RHN_DSL and calls the shared chain of RHN_ENTRY.</p>`,
        action: { do: 'Click <b>Task Chain</b>.', appear: '#chain-steps' },
      },
      {
        title: 'Three steps',
        target: '#chain-add',
        body: `<p>The shared chain is under Task Chain, the views under View Persistence. Use the arrows to fix the order.</p>`,
        action: { do: 'Add the three steps in the order of the ticket.', check: () => document.querySelectorAll('#chain-steps .chain-step').length >= 3 },
      },
    ],
    [
      {
        title: 'Email notification',
        target: '#chain-notify',
        body: `<p>Tick <b>When the task chain fails</b> and enter <code>LHOFFMANN</code> as recipient.</p>`,
        action: { do: 'Set the failure email, then name and <b>Deploy</b> the chain.', event: '^deploy:RHN_DSL\\.RHN_DS_TC_NIGHTLY$' },
      },
    ],
    [
      {
        title: 'Schedule',
        target: '#chain-schedule',
        body: `<p>One schedule for the whole night.</p>`,
        action: { do: 'Press <b>Schedule</b>, choose <b>Daily</b> and save.', event: 'schedule:RHN_DSL.RHN_DS_TC_NIGHTLY:Daily' },
      },
      {
        title: 'Run',
        target: '#chain-run',
        body: `<p>Run it once to see that every step completes.</p>`,
        action: { do: 'Press <b>Run</b>.', event: '^chain-run:RHN_DSL\\.RHN_DS_TC_NIGHTLY:' },
      },
      {
        title: 'The second schedule',
        view: 'monitor:views:RHN_DSL',
        target: '#view-list',
        body: `<p>The readings still have their own schedule from chapter 9. The chain runs them now.</p>`,
        action: { do: 'Remove the schedule of <b>RHN_DS_V_METER_READINGS</b>.', event: '^schedule:RHN_DSL\\.RHN_DS_V_METER_READINGS:none' },
      },
    ],
    questions('What does the customer view read?'),
  ],
  'c10-m03': [
    [
      {
        title: 'The failed run',
        view: 'monitor:chains:RHN_DSL',
        target: '#chain-list',
        body: `<p>Open the nightly chain. Its last run failed; the steps show where.</p>`,
        action: { do: 'Click <b>RHN_DS_TC_NIGHTLY</b>.', event: '^monitor-open:RHN_DSL\\.RHN_DS_TC_NIGHTLY$' },
      },
      {
        title: 'The failed step',
        target: '#run-log',
        body: `<p>Red is the step that failed, grey the ones that did not run. The step name opens its own monitor.</p>`,
        action: { do: 'Click the step that failed.', event: '^chain-step-open:' },
      },
      {
        title: 'Its own log',
        target: '#run-log',
        body: `<p>The view's run says exactly what went wrong. Fix it in the Data Builder, deploy, and run the chain again.</p>`,
      },
    ],
    [
      {
        title: 'Fix the view',
        view: 'builder:landing:RHN_DSL',
        target: '#object-list',
        body: `<p>Open the view, correct Tim's line, run the Data Preview to see it works on all rows, then Deploy.</p>`,
        action: { do: 'Fix and deploy <b>RHN_DS_V_CUSTOMERS</b>.', event: '^deploy:RHN_DSL\\.RHN_DS_V_CUSTOMERS$' },
      },
    ],
    [
      {
        title: 'Run again',
        view: 'monitor:chains:RHN_DSL',
        target: '#chain-list',
        body: `<p>Open the chain and run it. Deploying removed the snapshot of the view; the run builds it again.</p>`,
        action: { do: 'Run <b>RHN_DS_TC_NIGHTLY</b>.', event: '^chain-run:RHN_DSL\\.RHN_DS_TC_NIGHTLY:Completed' },
      },
    ],
    questions('When is a value converted: at deploy or at run time?'),
  ],
  'c10-m04': [
    [
      nav('tasklogs', 'Task Logs', `<p>Every run of every space in one list.</p>`),
      {
        title: 'Only the failures',
        target: '#tl-status',
        body: `<p>Filter the status. Keep all spaces.</p>`,
        action: { do: 'Choose <b>Failed</b>.', event: 'tasklogs-status:Failed' },
      },
    ],
    [
      {
        title: 'Read a run',
        target: '#tasklog-list',
        body: `<p>Click the start time of a run to see its messages below the list.</p>`,
        action: { do: 'Open a run of the object that fails most often.', event: '^tasklog-open:RHN_ENTRY\\.RHN_EN_RF_S4U$' },
      },
    ],
    questions('Count per object, and read the second message.'),
  ],
};
