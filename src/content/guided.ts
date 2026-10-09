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
const appOpen = (id: string) => !!$(`.nav [data-view="${id}"][aria-current="page"]`);
const builderSpace = (space: string) => !!$('#space-switch')?.textContent?.includes(space) && !!$('#new-tiles');
const editorOf = (key: string) => !!$('.ed-title small')?.textContent?.includes(key);
const noDialog = () => !$('.guide-overlay');
const tabOn = (sel: string) => !!$(`${sel}[aria-selected="true"]`);
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
const shareStep = (object: string, to: string, owner = 'RHN_IN'): TourStep => ({
  title: `Share ${object}`,
  target: `[data-share="${owner}.${object}"]`,
  body: `<p>The share icon at the end of the row. Tick <b>${to}</b> and save.</p>`,
  action: { do: `Share <b>${object}</b> with <b>${to}</b>.`, event: `share:${owner}.${object}` },
});

/** Open a new SQL view from the start page. */
const newView = (body: string): TourStep => ({
  title: 'New SQL View',
  target: '[data-new="sqlview"]',
  body,
  action: { do: 'Click <b>New SQL View</b>.', check: () => !!$('#editor') && !!$('.ed-title small')?.textContent?.includes('…') },
});

/** Name, save and deploy a new view in RHN_HARM. */
const nameSaveDeploy = (name: string, business: string, space = 'RHN_HARM', deployToo = true): TourStep[] => [
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

const AM_INV = 'RHN_REP.RHN_REP_AM_INVOICES';

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
    check: () => dims.every((d) => !!$(`[data-node="RHN_REP.RHN_REP_D_${d.toUpperCase().replace(' ', '_')}"]`)),
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

/** Chapter 7: open an existing model in RHN_REP. */
const openModel = (name: string): TourStep => ({
  title: `Open ${name}`,
  view: 'builder:landing:RHN_REP',
  target: '#object-list',
  body: `<p>Analytic models are listed with the other objects of the space (tab <b>Models</b>).</p>`,
  action: { do: `Open <b>${name}</b>.`, check: () => editorOf(`RHN_REP.${name}`) },
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

const DAC_KEY = 'RHN_REP.RHN_REP_DAC_GRID_AREA';
const $$ = (sel: string) => [...document.querySelectorAll<HTMLInputElement>(sel)];

/** Chapter 8: open a fact, run its preview, assign the grid area control and deploy. */
const assignDac = (view: string, intro: string): TourStep[] => [
  {
    title: `Open ${view.split('.')[1]}`,
    view: 'builder:landing:RHN_REP',
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
    action: { do: 'Choose <code>RHN_REP_DAC_GRID_AREA</code>, check the mapping and press <b>Assign</b>.', event: `dac-assign:${view}->${DAC_KEY}` },
  },
  deployStep(view, `<p>Until you deploy, everyone still sees every row: the control is only in the saved design.</p>`),
];

// ---------------------------------------------------------------- intros

export const GUIDED_INTROS: Record<string, TourStep[]> = {
  'c00-m01': [
    {
      title: 'Welcome to the training tenant',
      body: `<p>This game works like <b>SAP Datasphere</b>: the same apps, the same names, the same way of working. You learn where things are
        and what they are for, then you build a small data warehouse for Stadtwerke Rheinau.</p>
        <p>Every mission starts with a tutorial like this one. It shows you each step, and in steps marked <b>Your turn</b>
        you do it yourself; the tutorial waits and goes on by itself. You start with <b>0 XP</b>.</p>`,
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
    {
      title: 'The side navigation',
      target: '.nav',
      body: `<p>On the left are the <b>apps</b>, in the same order as in a real tenant. <b>Monitoring</b> and <b>Catalog &amp; Marketplace</b>
        open a list when you click them. Under <b>Apps</b> you model and integrate data, under <b>Utilities</b> you run spaces, translation and transport.
        <b>Security</b> and <b>System</b> sit at the bottom.</p>
        <p>Some apps only show an info page in this game for now (an <b>ⓘ</b> appears when you point at them). The <b>☰</b> button folds the navigation to icons.</p>`,
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
        <p>The rule of the landscape: <b>RHN_IN</b> → shared with → <b>RHN_HARM</b> → shared with → <b>RHN_REP</b>. Never skip a layer.</p>`,
    },
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
      body: `<p>So far the data in <code>RHN_IN</code> was a one-off copy IT made for the pilot. Now you connect the real source systems and decide
        how their data gets in: read live, copied once, or kept up to date by delta.</p>
        <p>Three apps work together: <b>Connections</b> (where a system is and how to log on), the <b>Data Builder</b> (remote tables and flows),
        and the <b>Data Integration Monitor</b> (runs, schedules, logs).</p>`,
    },
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
        <p>Every inbound row should say which system it came from. If the source does not deliver that, the load adds it:
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
  'c05-m01': [
    {
      title: 'Chapter 5: Harmonization',
      body: `<p>In chapter 4 you found what is wrong with the raw data. Now you fix it, in the right place: <b>views in RHN_HARM</b>
        that read the shared inbound tables and deliver clean, uniform data. The inbound tables stay exactly as the sources sent them.</p>
        <p>From now on your work is <b>deployed views</b>: the check reads what runs in the database, not the editor.
        Hints cost XP from the first one; the tutorials stay free.</p>`,
    },
    {
      title: 'Translate values with CASE',
      body: `<p><code>CASE</code> turns one value into another, row by row:</p>
        <pre>CASE REGION WHEN 'NORTH' THEN 'Nord'
             WHEN 'SOUTH' THEN 'Süd'
             ELSE REGION END AS REGION_DE</pre>
        <p>Every value you do not list goes to <code>ELSE</code>. Without <code>ELSE</code> it becomes <code>NULL</code>, and rows silently lose
        their value. <code>AS</code> names the result column.</p>`,
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
      title: 'One layer up',
      body: `<p>Reporting builds only on harmonization. You share the harmonized views with <code>RHN_REP</code>, and the reporting query
        uses them as they are: no mapping, no unit conversion, no deduplication. That work is done once.</p>`,
    },
  ],
  'c06-m01': [
    {
      title: 'Chapter 6: Semantics',
      body: `<p>Up to now every view was a <b>Relational Dataset</b>: rows and columns, nothing more. The reporting layer tells consumers
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
  ],
  'c06-m02': [
    {
      title: 'Only what reports need',
      body: `<p>A reporting view does not have to pass on every column of its source. Picking columns is the simplest data protection:
        what never reaches the reporting layer cannot leak to the people who read it.</p>`,
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
      body: `<p>Assign the control to the view that holds the numbers: the fact. Everything built on it, such as the analytic model,
        takes the control over. To check it, preview the data <b>as a user</b>.</p>`,
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
    {
      title: 'Measure first',
      body: `<p><b>Expensive statement tracing</b> records SQL statements that exceed a threshold, with duration, peak memory and CPU time.
        It is off by default; an administrator switches it on in System › Configuration › Monitoring.</p>
        <p>In the game, runtimes are simulated for production volume: the training tenant only holds a sample.</p>`,
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
  'c11-m01': [
    {
      title: 'Chapter 11: The board request',
      body: `<p>One request, the whole stack: change a deployed fact without breaking anyone, offer the change in the model, keep the
        protection, and make sure it is fast and fresh on the day it counts.</p>
        <p>This chapter has <b>no hints and no Show me</b>. Everything you need, you have done before. The checks still tell you what is
        missing.</p>`,
    },
  ],
  'c10-m01': [
    {
      title: 'Chapter 10: Operations',
      body: `<p>Loads and persistence run every night, and someone has to know when they fail. A <b>task chain</b> runs several tasks
        as one unit: in a fixed order, with one schedule and an email when it fails.</p>
        <p>A chain runs objects of its own space. To combine spaces, share a chain with another space and nest it there.</p>`,
    },
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
        title: 'Select RHN_IN',
        target: '#space-picker, #space-switch',
        body: `<p>You only see the spaces you are a member of. Right now there is one: <b>RHN_IN</b>, where IT loaded the source data.</p>`,
        action: { do: 'Click the space <b>RHN_IN</b>.', event: 'space:builder:RHN_IN', check: () => builderSpace('RHN_IN') },
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
        action: { do: 'Click the business name <b>BILLING_CONTRACTS</b> in the list.', event: 'open:RHN_IN.BILLING_CONTRACTS', check: () => editorOf('RHN_IN.BILLING_CONTRACTS') },
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
        action: { do: 'Press <b>Data Preview</b>.', event: 'preview:RHN_IN.BILLING_CONTRACTS' },
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
        action: { do: 'Click <b>Meter Readings</b> in the result list.', event: 'repository-open:RHN_IN.METER_READINGS' },
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
        action: { do: 'Set <b>Space</b> to <code>RHN_IN</code>.', check: () => val('#repo-space') === 'RHN_IN' },
      },
      ...questions('Space, type and the counter answer the three questions.'),
    ],
  ],
  'c00-m04': [
    [
      {
        title: 'Open the contracts',
        view: 'builder:landing:RHN_IN',
        target: '#object-list',
        body: `<p>Same table as before: <code>BILLING_CONTRACTS</code> in <code>RHN_IN</code>.</p>`,
        action: { do: 'Open <b>BILLING_CONTRACTS</b> from the list.', check: () => editorOf('RHN_IN.BILLING_CONTRACTS') },
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
        action: { do: 'Press <b>Save</b>.', event: 'save:RHN_IN.BILLING_CONTRACTS' },
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
        action: { do: 'Press <b>Deploy</b>.', event: 'deploy:RHN_IN.BILLING_CONTRACTS' },
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
        body: `<p>Only <b>RHN_IN</b>, the inbound space. The layer on the tile comes from the space ID: inbound IDs end in <code>_IN</code>,
          harmonization in <code>_HARM</code>, reporting in <code>_REP</code>.</p>`,
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
        body: `<p>First the harmonization space.</p>`,
        action: { do: 'Press <b>Create space</b>.', appear: '.dialog [name="id"]' },
      },
      {
        title: 'The space name',
        target: '.dialog [name="name"]',
        body: `<p>A name a business user understands. Typing it suggests an ID.</p>`,
        action: { do: 'Type <code>Rheinau Harmonization</code> as the space name.', check: () => val('.dialog [name="name"]').toLowerCase() === 'rheinau harmonization' },
      },
      {
        title: 'The space ID',
        target: '.dialog [name="id"]',
        body: `<p>Look at the suggested ID: it is cut at 20 characters and does not follow our convention. Fix it before you create the space.</p>`,
        action: { do: 'Change the space ID to <code>RHN_HARM</code>.', check: () => val('.dialog [name="id"]') === 'RHN_HARM' },
      },
      {
        title: 'Create',
        target: '.dialog [type="submit"]',
        body: `<p>Leave storage and priority as they are; the next ticket sizes them.</p>`,
        action: { do: 'Press <b>Create</b>.', appear: '[data-space-tile="RHN_HARM"]' },
      },
    ],
    [
      {
        title: 'Now the reporting space',
        target: '#create-space',
        body: `<p>Same steps: name <code>Rheinau Reporting</code>, ID <code>RHN_REP</code>.</p>`,
        action: { do: 'Create the space <code>RHN_REP</code> with a readable name.', appear: '[data-space-tile="RHN_REP"]' },
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
          <ul><li>Disk: 128 capacity − 16 reserve − 40 for RHN_IN = <b>72 GB</b> for RHN_HARM and RHN_REP together.</li>
          <li>In-memory: 32 − 4 − 8 = <b>20 GB</b> for both together.</li></ul>
          <p>Check the minimums of the ticket: they must fit into these totals. For example HARM 36/8 and REP 20/10.</p>`,
      },
    ],
    [
      nav('spaces', 'Space Management', `<p>Each tile has an <b>Edit</b> button.</p>`),
      {
        title: 'Edit RHN_HARM',
        target: '[data-edit="RHN_HARM"]',
        body: `<p>The ID stays fixed; storage and priority can change.</p>`,
        action: { do: 'Press <b>Edit</b> on RHN_HARM.', appear: '.dialog [name="disk"]' },
      },
      {
        title: 'Storage and priority',
        target: '.dialog',
        body: `<p>For example 36 GB disk, 8 GB in-memory, priority 3. Reporting must get a higher priority later.</p>`,
        action: { do: 'Enter disk, in-memory and priority for RHN_HARM, then press <b>Save</b>.', event: 'edit-space:RHN_HARM' },
      },
    ],
    [
      {
        title: 'Edit RHN_REP',
        target: '[data-edit="RHN_REP"]',
        body: `<p>The board dashboards read from memory, and they must stay fast while the nightly load runs.</p>`,
        action: { do: 'Press <b>Edit</b> on RHN_REP.', appear: '.dialog [name="disk"]' },
      },
      {
        title: 'Highest priority',
        target: '.dialog',
        body: `<p>For example 20 GB disk, 10 GB in-memory, and priority <b>5</b>, higher than every other space.</p>`,
        action: { do: 'Enter the values for RHN_REP, then press <b>Save</b>.', event: 'edit-space:RHN_REP' },
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
        title: 'Select RHN_HARM',
        target: '#space-picker, #space-switch',
        body: `<p>If a space is already selected, the switch next to "Data Builder" changes it.</p>`,
        action: { do: 'Select the space <b>RHN_HARM</b>.', check: () => builderSpace('RHN_HARM') },
      },
      {
        title: 'An empty space',
        target: '#object-list',
        body: `<p>No objects, and nothing from RHN_IN. The walls work.</p>`,
      },
    ],
    [
      {
        title: 'Back to RHN_IN',
        target: '#space-switch, #space-picker',
        body: `<p>Sharing is set in the space the object belongs to.</p>`,
        action: { do: 'Switch the Data Builder to <b>RHN_IN</b>.', check: () => builderSpace('RHN_IN') },
      },
      {
        title: 'Share the contracts',
        target: '[data-share="RHN_IN.BILLING_CONTRACTS"]',
        body: `<p>The share icon at the end of the row opens the sharing dialog.</p>`,
        action: { do: 'Click the share icon of <b>BILLING_CONTRACTS</b>.', appear: '.share-targets' },
      },
      {
        title: 'Pick the target',
        target: '.dialog',
        body: `<p>Only the layer directly above: harmonization. Never reporting.</p>`,
        action: { do: 'Tick <b>RHN_HARM</b> and press <b>Save sharing</b>.', event: 'share:RHN_IN.BILLING_CONTRACTS' },
      },
      {
        title: 'Share the grid areas',
        target: '[data-share="RHN_IN.GRID_AREAS"]',
        body: `<p>Same for the second table.</p>`,
        action: { do: 'Share <b>GRID_AREAS</b> with RHN_HARM.', event: 'share:RHN_IN.GRID_AREAS' },
      },
    ],
    [
      {
        title: 'Back to harmonization',
        target: '#space-switch, #space-picker',
        body: `<p>Now look at RHN_HARM again.</p>`,
        action: { do: 'Switch the Data Builder to <b>RHN_HARM</b>.', check: () => builderSpace('RHN_HARM') },
      },
      {
        title: 'Shared with RHN_HARM',
        target: '#shared-list',
        body: `<p>A new list: the objects of other spaces this space may read. They stay read-only.</p>`,
        action: { do: 'Open <b>BILLING_CONTRACTS</b> from this list.', check: () => editorOf('RHN_IN.BILLING_CONTRACTS') },
      },
      {
        title: 'Read it from here',
        target: '#run',
        body: `<p>The toolbar says "read-only": you cannot change it from RHN_HARM, only read it.</p>`,
        action: { do: 'Press <b>Data Preview</b>.', event: 'preview-in:RHN_HARM:RHN_IN.BILLING_CONTRACTS' },
      },
    ],
    questions('What would happen to a copy when the inbound table gets new data tomorrow?'),
  ],
  'c01-m04': [
    [
      {
        title: 'The convention',
        target: '.ticket',
        body: `<p>Split each name at the underscores and check part by part:</p>
          <p><code>RHN</code> · <code>HA</code> · <code>V</code> · <code>CONSUMPTION</code><br>company · layer · type · what it holds</p>
          <p>A <b>fact</b> holds numbers you add up, a <b>dimension</b> describes them.</p>`,
      },
    ],
    questions('Check every part of every name: prefix, layer, type, name in English capitals.'),
  ],

  // ================================================================ chapter 2
  'c02-m01': [
    [
      nav('security', 'Security', `<p>Users, roles and who may do what.</p>`),
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
        target: '#create-role',
        body: `<p>One role per template, so five roles. Names start with <code>RHN_</code>, for example <code>RHN_MODELER</code>.</p>`,
        action: { do: 'Press <b>Create scoped role</b>.', appear: '.dialog [name="template"]' },
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
      nav('security', 'Security', `<p>People are on the second tab.</p>`),
      {
        title: 'Users',
        target: '[data-tab="users"]',
        body: `<p>Eight people need access. Each row says what the person does, in their own words.</p>`,
        action: { do: 'Open the <b>Users</b> tab.', check: () => tabOn('[data-tab="users"]') },
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
        target: '[data-tab="users"]',
        body: `<p>Find Nina Krüger, starting on Monday.</p>`,
        action: { do: 'Open the <b>Users</b> tab.', check: () => tabOn('[data-tab="users"]') },
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
        body: `<p>Like the Data Builder, Connections always works in one space. All loads land in the inbound layer, so its connections live there too.</p>`,
        action: { do: 'Select the space <code>RHN_IN</code>.', check: () => val('#conn-space') === 'RHN_IN' },
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
        action: { do: 'Fill in the form from the ticket and press <b>Create</b>.', event: 'create-connection:RHN_IN.' },
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
        action: { do: 'Press <b>Validate</b>.', event: 'validate:RHN_IN.' },
      },
      closeDialog('Read the result', `<p>Valid, and four features. Note them; one question asks about Model Import.</p>
        <p>Changed something after validating? Then validate again: a change resets it.</p>`),
    ],
    questions('Where does a connection live, and who else lives there?'),
  ],
  'c03-m02': [
    [
      nav('connections', 'Connections', `<p>Still in <code>RHN_IN</code>.</p>`),
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
        action: { do: 'Fill in the form from Jonas\'s ticket and press <b>Create</b>.', event: 'create-connection:RHN_IN.' },
      },
    ],
    [
      {
        title: 'Validate',
        target: '#conn-list',
        body: `<p>Select the new connection, then press <b>Validate</b> in the toolbar.</p>`,
        action: { do: 'Select <code>RHN_MDM</code> and press <b>Validate</b>.', event: 'validate:RHN_IN.RHN_MDM' },
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
        action: { do: 'Get <code>RHN_MDM</code> to a valid validation.', event: 'validate:RHN_IN.RHN_MDM:ok' },
      },
      closeDialog('Valid', `<p>Through the Cloud Connector, encrypted, with a trusted certificate.</p>`),
    ],
    questions('Why could the cloud not reach the host at first?'),
  ],
  'c03-m03': [
    [
      {
        title: 'Import Remote Tables',
        view: 'builder:landing:RHN_IN',
        target: '[data-new="remote"]',
        body: `<p>Remote tables are created from the Data Builder of the space that owns the connection.</p>`,
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
        body: `<p>Tick only the objects the ticket asks for. The suggested names follow our convention <code>RHN_IN_RT_&lt;NAME&gt;</code>.</p>`,
        action: { do: 'Tick the two objects and press <b>Import and Deploy</b>.', event: 'import-remote:' },
      },
    ],
    [
      {
        title: 'Open the tariffs',
        target: '#object-list',
        body: `<p>The remote tables are in the object list now, with their own type icon.</p>`,
        action: { do: 'Open the tariffs remote table.', event: '^open:RHN_IN\\..*TARIFF' },
      },
      {
        title: 'Preview it live',
        target: '#run',
        body: `<p>The properties say <b>Data Access: Remote</b>. This preview goes to S/4HANA.</p>`,
        action: { do: 'Press <b>Data Preview</b>.', event: '^preview:RHN_IN\\..*TARIFF' },
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
        view: 'builder:landing:RHN_IN',
        target: '[data-new="replication"]',
        body: `<p>Flows are built in the Data Builder of the target space.</p>`,
        action: { do: 'Click <b>New Replication Flow</b>.', appear: '#flow-conn' },
      },
      {
        title: 'Source connection',
        target: '.flow-source',
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
        body: `<p>Business name for people, technical name <code>RHN_IN_RF_S4U</code> from the ticket.</p>`,
        action: { do: 'Enter both names.', check: () => val('#prop-business') !== '' && val('#prop-technical') !== '' },
      },
      {
        title: 'Deploy',
        target: '#ed-deploy',
        body: `<p>Deploy saves and checks the flow: connection valid, targets are local tables, load types possible.</p>`,
        action: { do: 'Press <b>Deploy</b>.', event: 'deploy:RHN_IN.' },
      },
      {
        title: 'Run',
        target: '#flow-run-ed',
        body: `<p>Run starts the deployed flow. If someone stops it, read why.</p>`,
        action: { do: 'Press <b>Run</b>.', event: '^(run|truncate-blocked):RHN_IN\\.' },
      },
      nav('monitor', 'Data Integration Monitor', `<p>Every run is listed here with its messages.</p>`),
      {
        title: 'Flows',
        target: '[data-mon-tab="flows"]',
        body: `<p>Deployed flows of the space.</p>`,
        action: { do: 'Open <b>Flows</b> and click your flow.', event: 'monitor-open:RHN_IN.' },
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
      nav('connections', 'Connections', `<p>A third connection in <code>RHN_IN</code>.</p>`),
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
        action: { do: 'Fill in the form and press <b>Create</b>.', event: 'create-connection:RHN_IN.' },
      },
      {
        title: 'Validate',
        target: '#conn-list',
        body: `<p>Look at the features this time: what is missing?</p>`,
        action: { do: 'Select <code>RHN_CRM</code> and press <b>Validate</b>.', event: 'validate:RHN_IN.RHN_CRM' },
      },
      closeDialog('No remote tables', `<p>Cloud storage offers flows only. Remember this for the question.</p>`),
    ],
    [
      {
        title: 'New Replication Flow',
        view: 'builder:landing:RHN_IN',
        target: '[data-new="replication"]',
        body: `<p>Same editor as before.</p>`,
        action: { do: 'Click <b>New Replication Flow</b>.', appear: '#flow-conn' },
      },
      {
        title: 'Source',
        target: '.flow-source',
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
        body: `<p>Column name and value: the same column every inbound table has, with the code for this source. Calin's ticket names both.</p>`,
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
        body: `<p>Technical name <code>RHN_IN_RF_CRM</code>. Then <b>Deploy</b> and <b>Run</b> in the toolbar.</p>`,
        action: { do: 'Enter the names, deploy and run the flow.', event: '^run:RHN_IN\\.' },
      },
      nav('monitor', 'Data Integration Monitor', `<p>Schedules for flows are set in the monitor.</p>`),
      {
        title: 'Open the flow',
        target: '[data-mon-tab="flows"]',
        body: `<p>Flows, then your CRM flow.</p>`,
        action: { do: 'Open <b>Flows</b> and click <code>RHN_IN_RF_CRM</code>.', event: 'monitor-open:RHN_IN.RHN_IN_RF_CRM' },
      },
      {
        title: 'Schedule',
        target: '#flow-schedule',
        body: `<p>The file arrives every night, so the flow should run as often.</p>`,
        action: { do: 'Press <b>Schedule</b> and save the frequency.', event: 'schedule:RHN_IN.RHN_IN_RF_CRM' },
      },
    ],
    [
      {
        title: 'Look at the table',
        view: 'builder:landing:RHN_IN',
        target: '#object-list',
        body: `<p>The run added the column to the table.</p>`,
        action: { do: 'Open <b>CRM_CUSTOMERS</b> and look at its last column.', check: () => editorOf('RHN_IN.CRM_CUSTOMERS') },
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
        action: { do: 'Open <b>Flows</b> and click <code>RHN_IN_RF_MDM</code>.', event: 'monitor-open:RHN_IN.RHN_IN_RF_MDM' },
      },
      {
        title: 'Read the messages',
        target: '#run-log',
        body: `<p>Top to bottom: read, then fail. The last message names the cause and the numbers you need: assigned and used storage.</p>`,
      },
    ],
    [
      nav('spaces', 'Space Management', `<p>The tile of RHN_IN is red and says Locked.</p>`),
      {
        title: 'More storage',
        target: '[data-edit="RHN_IN"]',
        body: `<p>Jonas wants 6 GB headroom above what the space uses now. Used plus 6 is the new disk size.</p>`,
        action: { do: 'Press <b>Edit</b> on RHN_IN, set the disk and save.', event: 'edit-space:RHN_IN' },
      },
      {
        title: 'Unlock',
        target: '[data-space-tile="RHN_IN"]',
        body: `<p>More storage alone does not unlock the space.</p>`,
        action: { do: 'Press <b>Unlock</b>.', event: 'unlock:RHN_IN' },
      },
    ],
    [
      nav('monitor', 'Data Integration Monitor', `<p>Now the load can write again.</p>`),
      {
        title: 'Run again',
        target: '[data-mon-tab="flows"]',
        body: `<p>Open the flow again and press <b>Run</b> in its detail panel.</p>`,
        action: { do: 'Run <code>RHN_IN_RF_MDM</code> again.', event: 'run:RHN_IN.RHN_IN_RF_MDM' },
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
  'c05-m01': [
    [
      nav('builder', 'Data Builder', `<p>Harmonization views live in RHN_HARM.</p>`),
      toSpace('RHN_HARM', `<p>Calin's modeling space.</p>`),
      {
        title: 'Shared with RHN_HARM',
        target: '#shared-list',
        body: `<p>These inbound tables may be read here. <code>BILLING_CONTRACTS</code> was shared in chapter 1, so you can build on it.</p>`,
      },
    ],
    [
      newView(`<p>A new SQL view in RHN_HARM. On the left, the sources: own objects and <b>Shared Objects</b>.</p>`),
      {
        title: 'An example to start from',
        target: '#editor',
        example: `SELECT GRID_AREA,\n  CASE REGION WHEN 'NORTH' THEN 'Nord' WHEN 'SOUTH' THEN 'Süd' ELSE REGION END AS REGION_DE\nFROM RHN_IN.GRID_AREAS`,
        body: `<p>Put the example into the editor and preview it: CASE with ELSE, on the grid areas. Then replace it with your contracts view:
          every column of the ticket, with a CASE for the grid area and one for the tariff.</p>`,
        action: { do: 'Write your SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_HARM\\.)' },
      },
      {
        title: 'Check before you save',
        target: '#results',
        body: `<p>1,178 rows? Only S/4 codes in GRID_AREA and TARIFF? Scroll through or add a quick <code>GROUP BY</code> in a second scratch view.</p>`,
      },
    ],
    nameSaveDeploy('RHN_HA_V_CONTRACTS', 'Contracts (harmonized)'),
    questions('Think about the next load from the legacy system, and about how many reports need the codes.'),
  ],
  'c05-m02': [
    [
      toSpace('RHN_IN', `<p>Sharing is set where the object lives.</p>`),
      shareStep('LEGACY_CUSTOMER_MAP', 'RHN_HARM'),
    ],
    [
      toSpace('RHN_HARM', `<p>Back to harmonization.</p>`),
      {
        title: 'Open the view',
        target: '#object-list',
        body: `<p>Your view from the last mission, status <b>Deployed</b>.</p>`,
        action: { do: 'Open <b>RHN_HA_V_CONTRACTS</b>.', check: () => editorOf('RHN_HARM.RHN_HA_V_CONTRACTS') },
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
        action: { do: 'Change the SQL and press <b>Data Preview</b>.', event: 'preview:RHN_HARM.RHN_HA_V_CONTRACTS' },
      },
    ],
    [
      {
        title: 'Save',
        target: '#ed-save',
        body: `<p>Save stores your change as design.</p>`,
        action: { do: 'Press <b>Save</b>.', event: 'save:RHN_HARM.RHN_HA_V_CONTRACTS' },
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
        action: { do: 'Press <b>Deploy</b>.', event: 'deploy:RHN_HARM.RHN_HA_V_CONTRACTS' },
      },
      ...questions('Count contracts, not customers.'),
    ],
  ],
  'c05-m03': [
    [
      toSpace('RHN_IN', `<p>Sharing is set where the object lives.</p>`),
      shareStep('CRM_CUSTOMERS', 'RHN_HARM'),
    ],
    [
      toSpace('RHN_HARM', `<p>Now explore the CRM data from harmonization.</p>`),
      newView(`<p>A scratch view to explore first. You turn it into the real view in the next step.</p>`),
      {
        title: 'Find the duplicates',
        target: '#editor',
        body: `<p>Group by the e-mail in lower case and keep the groups with <code>HAVING COUNT(*) > 1</code>. Then look inside some groups:
          same street? same person?</p>`,
        action: { do: 'Write the query and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_HARM\\.)' },
      },
    ],
    [
      {
        title: 'Number per person',
        target: '#editor',
        example: `SELECT GRID_AREA, REGION,\n  ROW_NUMBER() OVER (PARTITION BY REGION ORDER BY GRID_AREA) AS RN\nFROM RHN_IN.GRID_AREAS`,
        body: `<p>The example numbers the grid areas per region. For the customers: partition by what makes a person, order by
          <code>CREATED_AT</code>, keep number 1 in an outer query.</p>`,
        action: { do: 'Write the deduplicating SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_HARM\\.)' },
      },
      ...nameSaveDeploy('RHN_HA_V_CUSTOMERS', 'Customers (harmonized)'),
    ],
    questions('Compare row counts, and think about the next CRM export.'),
  ],
  'c05-m04': [
    [
      toSpace('RHN_IN', `<p>Sharing is set where the object lives.</p>`),
      shareStep('METER_READINGS', 'RHN_HARM'),
    ],
    [
      toSpace('RHN_HARM', `<p>Back to harmonization.</p>`),
      newView(`<p>A new view for the readings.</p>`),
      {
        title: 'Convert and deduplicate',
        target: '#editor',
        body: `<p>One <code>CASE</code> for the unit, named <code>CONSUMPTION_KWH</code>, and <code>DISTINCT</code> for the exact copies.
          The status bar of the preview shows the row count.</p>`,
        action: { do: 'Write the SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_HARM\\.)' },
      },
    ],
    nameSaveDeploy('RHN_HA_V_METER_READINGS', 'Meter Readings (harmonized)'),
    questions('A second scratch view can sum your deployed view for 2025.'),
  ],
  'c05-m05': [
    [
      toSpace('RHN_HARM', `<p>The views belong to RHN_HARM, so you share them from here.</p>`),
      shareStep('RHN_HA_V_CONTRACTS', 'RHN_REP', 'RHN_HARM'),
      shareStep('RHN_HA_V_METER_READINGS', 'RHN_REP', 'RHN_HARM'),
    ],
    [
      toSpace('RHN_REP', `<p>The reporting space.</p>`),
      newView(`<p>A scratch view in RHN_REP. The sources list shows only the shared harmonized views.</p>`),
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
      toSpace('RHN_HARM', `<p>First the 1:1 view in harmonization.</p>`),
      newView(`<p>A view on the inbound table, without any logic.</p>`),
      {
        title: 'All columns, no logic',
        target: '#editor',
        body: `<p>List the columns of <code>RHN_IN.GRID_AREAS</code>; the Sources list inserts names for you.</p>`,
        action: { do: 'Write the SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_HARM\\.)' },
      },
      ...nameSaveDeploy('RHN_HA_V_GRID_AREAS', 'Grid Areas (harmonized)'),
      {
        title: 'Back to the start page',
        target: '#ed-back',
        body: `<p>Sharing is done in the object list.</p>`,
        action: { do: 'Go back to the start page of RHN_HARM.', check: () => builderSpace('RHN_HARM') },
      },
      shareStep('RHN_HA_V_GRID_AREAS', 'RHN_REP', 'RHN_HARM'),
    ],
    [
      toSpace('RHN_REP', `<p>The reporting space.</p>`),
      newView(`<p>The dimension view.</p>`),
      {
        title: 'Three columns',
        target: '#editor',
        body: `<p>Read the shared harmonized view, with exactly the columns of the ticket.</p>`,
        action: { do: 'Write the SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_REP\\.)' },
      },
      ...nameSaveDeploy('RHN_REP_D_GRID_AREA', 'Grid Area', 'RHN_REP', false),
    ],
    [
      usageStep('Dimension', `<p>Now that the view is saved, its semantic usage can be set.</p>`),
      keyStep('GRID_AREA'),
      deployStep('RHN_REP.RHN_REP_D_GRID_AREA', `<p>Deploy saves the roles and makes them active.</p>`),
    ],
    questions('Does the data describe something or hold numbers to add up? And remember the layer rule from chapter 1.'),
  ],
  'c06-m02': [
    [
      toSpace('RHN_IN', `<p>TARIFFS is not shared with harmonization yet.</p>`),
      shareStep('TARIFFS', 'RHN_HARM'),
      toSpace('RHN_HARM', `<p>The 1:1 view for the tariffs, like the grid areas.</p>`),
      newView(`<p>All columns of TARIFFS, no logic.</p>`),
      {
        title: 'Write and preview',
        target: '#editor',
        body: `<p>Same pattern as <code>RHN_HA_V_GRID_AREAS</code>.</p>`,
        action: { do: 'Write the SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_HARM\\.)' },
      },
      ...nameSaveDeploy('RHN_HA_V_TARIFFS', 'Tariffs (harmonized)'),
      {
        title: 'Back to the start page',
        target: '#ed-back',
        body: `<p>Now share both views with reporting.</p>`,
        action: { do: 'Go back to the start page of RHN_HARM.', check: () => builderSpace('RHN_HARM') },
      },
      shareStep('RHN_HA_V_TARIFFS', 'RHN_REP', 'RHN_HARM'),
      shareStep('RHN_HA_V_CUSTOMERS', 'RHN_REP', 'RHN_HARM'),
    ],
    [
      toSpace('RHN_REP', `<p>The tariff dimension.</p>`),
      newView(`<p>Columns as in the ticket.</p>`),
      {
        title: 'Write and preview',
        target: '#editor',
        body: `<p>Read <code>RHN_HA_V_TARIFFS</code>.</p>`,
        action: { do: 'Write the SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_REP\\.)' },
      },
      ...nameSaveDeploy('RHN_REP_D_TARIFF', 'Tariff', 'RHN_REP', false),
      usageStep('Dimension', `<p>A dimension again.</p>`),
      keyStep('TARIFF'),
      deployStep('RHN_REP.RHN_REP_D_TARIFF', `<p>Deploy it.</p>`),
    ],
    [
      {
        title: 'Back to the start page',
        target: '#ed-back',
        body: `<p>One more dimension.</p>`,
        action: { do: 'Go back to the start page of RHN_REP.', check: () => builderSpace('RHN_REP') },
      },
      newView(`<p>The customer dimension.</p>`),
      {
        title: 'Which columns?',
        target: '#editor',
        body: `<p>Read <code>RHN_HA_V_CUSTOMERS</code>. Decide with the ticket which columns the board needs, and which stay in harmonization.</p>`,
        action: { do: 'Write the SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_REP\\.)' },
      },
      ...nameSaveDeploy('RHN_REP_D_CUSTOMER', 'Customer', 'RHN_REP', false),
      usageStep('Dimension', `<p>And the third dimension.</p>`),
      keyStep('CUSTOMER_ID'),
      deployStep('RHN_REP.RHN_REP_D_CUSTOMER', `<p>Deploy it.</p>`),
    ],
    questions('Who reads the reporting layer, and what did audit ask for?'),
  ],
  'c06-m03': [
    [
      toSpace('RHN_REP', `<p>Facts live in reporting too.</p>`),
      newView(`<p>The consumption fact.</p>`),
      {
        title: 'Readings plus keys',
        target: '#sources',
        body: `<p>Both harmonized views are under <b>Shared Objects</b>. Join them on <code>CONTRACT_ID</code> and take the keys from the contracts.</p>`,
      },
      {
        title: 'Write and preview',
        target: '#editor',
        body: `<p>Exactly the six columns of the ticket: no names, no regions.</p>`,
        action: { do: 'Write the SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_REP\\.)' },
      },
      ...nameSaveDeploy('RHN_REP_F_CONSUMPTION', 'Consumption', 'RHN_REP', false),
    ],
    [
      usageStep('Fact', `<p>A fact: it holds the measure.</p>`),
      {
        title: 'Measure or attribute',
        target: '#column-roles',
        body: `<p>For each column ask: does adding it up mean something? Only those are measures; everything else stays an attribute.</p>`,
        action: { do: 'Give each column its role.', check: () => [...document.querySelectorAll<HTMLSelectElement>('#column-roles select')].some((x) => x.value === 'Measure') },
      },
      deployStep('RHN_REP.RHN_REP_F_CONSUMPTION', `<p>Deploy saves the roles and makes them active.</p>`),
    ],
    questions('Think about two facts that both need the region, and a grid area that is renamed.'),
  ],
  'c06-m04': [
    [
      {
        title: 'A gap check',
        view: 'builder:new-view:RHN_REP',
        target: '#editor',
        body: `<p>A scratch view: <code>LEFT JOIN</code> the fact to a dimension on its key and count the rows <code>WHERE d.key IS NULL</code>.
          Zero means every key has its dimension row. Try it for all three.</p>`,
        action: { do: 'Write a gap check and press <b>Data Preview</b>.', event: '^preview:draft' },
      },
    ],
    [
      {
        title: 'Open the fact',
        view: 'builder:landing:RHN_REP',
        target: '#object-list',
        body: `<p>The associations belong to the fact.</p>`,
        action: { do: 'Open <b>RHN_REP_F_CONSUMPTION</b>.', check: () => editorOf('RHN_REP.RHN_REP_F_CONSUMPTION') },
      },
      ...assocStep('RHN_REP.RHN_REP_F_CONSUMPTION', 'RHN_REP.RHN_REP_D_GRID_AREA'),
      ...assocStep('RHN_REP.RHN_REP_F_CONSUMPTION', 'RHN_REP.RHN_REP_D_TARIFF'),
      ...assocStep('RHN_REP.RHN_REP_F_CONSUMPTION', 'RHN_REP.RHN_REP_D_CUSTOMER'),
    ],
    [
      {
        title: 'Save',
        target: '#ed-save',
        body: `<p>The associations are part of the design: status <b>Changes to Deploy</b> after saving.</p>`,
        action: { do: 'Press <b>Save</b>.', event: 'save:RHN_REP.RHN_REP_F_CONSUMPTION' },
      },
      deployStep('RHN_REP.RHN_REP_F_CONSUMPTION', `<p>Now they are active.</p>`),
      ...questions('When does an association turn into a join?'),
    ],
  ],
  'c06-m05': [
    [
      toSpace('RHN_IN', `<p>The invoices are not shared with harmonization yet.</p>`),
      shareStep('BILLING_INVOICES', 'RHN_HARM'),
      toSpace('RHN_HARM', `<p>The 1:1 view.</p>`),
      newView(`<p>All columns of BILLING_INVOICES, no logic.</p>`),
      {
        title: 'Write and preview',
        target: '#editor',
        body: `<p>Same pattern as the other 1:1 views.</p>`,
        action: { do: 'Write the SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_HARM\\.)' },
      },
      ...nameSaveDeploy('RHN_HA_V_INVOICES', 'Invoices (harmonized)'),
      {
        title: 'Back to the start page',
        target: '#ed-back',
        body: `<p>Share it with reporting.</p>`,
        action: { do: 'Go back to the start page of RHN_HARM.', check: () => builderSpace('RHN_HARM') },
      },
      shareStep('RHN_HA_V_INVOICES', 'RHN_REP', 'RHN_HARM'),
    ],
    [
      toSpace('RHN_REP', `<p>The invoice fact.</p>`),
      newView(`<p>Invoices joined with the harmonized contracts for the keys.</p>`),
      {
        title: 'Write and preview',
        target: '#editor',
        body: `<p>The ten columns of the ticket. Gross is not one of them.</p>`,
        action: { do: 'Write the SELECT and press <b>Data Preview</b>.', event: '^preview:(draft|RHN_REP\\.)' },
      },
      ...nameSaveDeploy('RHN_REP_F_INVOICES', 'Invoices', 'RHN_REP', false),
      usageStep('Fact', `<p>A fact again.</p>`),
      {
        title: 'Measures',
        target: '#column-roles',
        body: `<p>Which columns make sense to add up?</p>`,
        action: { do: 'Give each column its role.', check: () => [...document.querySelectorAll<HTMLSelectElement>('#column-roles select')].some((x) => x.value === 'Measure') },
      },
    ],
    [
      ...assocStep('RHN_REP.RHN_REP_F_INVOICES', 'RHN_REP.RHN_REP_D_GRID_AREA'),
      ...assocStep('RHN_REP.RHN_REP_F_INVOICES', 'RHN_REP.RHN_REP_D_TARIFF'),
      ...assocStep('RHN_REP.RHN_REP_F_INVOICES', 'RHN_REP.RHN_REP_D_CUSTOMER'),
      deployStep('RHN_REP.RHN_REP_F_INVOICES', `<p>Deploy saves the roles and associations and makes them active.</p>`),
    ],
    [
      {
        title: 'Region from the dimension',
        view: 'builder:new-view:RHN_REP',
        target: '#editor',
        body: `<p>Join the fact with <code>RHN_REP_D_GRID_AREA</code>, filter the invoice year and group by <code>REGION</code>.</p>`,
        action: { do: 'Write the query and press <b>Data Preview</b>.', event: '^preview:draft' },
      },
      ...questions('Region NORTH has two grid areas. Sum NET_AMOUNT.'),
    ],
  ],
  // ================================================================ chapter 7
  'c07-m01': [
    [
      toSpace('RHN_REP', `<p>Analytic models live in the reporting space, next to the facts they are built on.</p>`),
      ...newModel('RHN_REP.RHN_REP_F_INVOICES', `<p>The tile in the <b>Model</b> group.</p>`),
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
        target: '[data-node="RHN_REP.RHN_REP_D_GRID_AREA"]',
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
          do: 'Enter a business name and the technical name <code>RHN_REP_AM_INVOICES</code>.',
          check: () => val('#prop-technical') === 'RHN_REP_AM_INVOICES' && val('#prop-business').length > 2,
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
      openModel('RHN_REP_AM_INVOICES'),
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
      openModel('RHN_REP_AM_INVOICES'),
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
      openModel('RHN_REP_AM_INVOICES'),
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
      toSpace('RHN_REP', `<p>A second model, on the other fact.</p>`),
      ...newModel('RHN_REP.RHN_REP_F_CONSUMPTION', `<p>Same tile, different fact.</p>`),
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
          do: 'Enter a business name and the technical name <code>RHN_REP_AM_CONSUMPTION</code>.',
          check: () => val('#prop-technical') === 'RHN_REP_AM_CONSUMPTION' && val('#prop-business').length > 2,
        },
      },
      deployStep('RHN_REP.RHN_REP_AM_CONSUMPTION', `<p>Deploy saves and activates the model in one step.</p>`),
    ],
    [
      amPreview('RHN_REP.RHN_REP_AM_CONSUMPTION', 'Tariff › COMMODITY', `<p>Set the variable to 2025, REGION and COMMODITY in the rows.</p>`),
      ...questions('How many fact sources does an analytic model have?'),
    ],
  ],
  // ================================================================ chapter 8
  'c08-m01': [
    [
      toSpace('RHN_REP', `<p>The permissions table lives in the reporting space, next to the facts it protects.</p>`),
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
        action: { do: 'Enter a business name and the technical name <code>RHN_REP_T_PERMISSIONS</code>.', check: () => val('#prop-technical') === 'RHN_REP_T_PERMISSIONS' && val('#prop-business').length > 2 },
      },
      deployStep('RHN_REP.RHN_REP_T_PERMISSIONS', `<p>Deploy creates the table and writes the rows.</p>`),
    ],
    questions('Which column of the fact could the control compare the values with?'),
  ],
  'c08-m02': [
    [
      toSpace('RHN_REP', `<p>Controls live where the views they protect live.</p>`),
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
        action: { do: 'Choose <code>RHN_REP_T_PERMISSIONS</code>.', event: 'dac-entity:RHN_REP.RHN_REP_T_PERMISSIONS' },
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
        action: { do: 'Enter a business name and the technical name <code>RHN_REP_DAC_GRID_AREA</code>.', check: () => val('#prop-technical') === 'RHN_REP_DAC_GRID_AREA' && val('#prop-business').length > 2 },
      },
      deployStep(DAC_KEY, `<p>Only a deployed control can be assigned.</p>`),
    ],
    questions('How many entries does Nina have?'),
  ],
  'c08-m03': [
    assignDac('RHN_REP.RHN_REP_F_INVOICES', 'The invoice fact holds the amounts. That is where the control belongs.'),
    [
      {
        title: 'View as a user',
        target: '#preview-as-bar',
        body: `<p>Since the deployed fact has a control, the Data Preview can show it as one of the users.</p>`,
        action: { do: 'Choose <b>MBRANDT</b> in <b>View as</b>.', event: '^preview-as:RHN_REP\\.RHN_REP_F_INVOICES:MBRANDT' },
      },
      {
        title: 'The model as Markus',
        view: 'builder:landing:RHN_REP',
        target: '#object-list',
        body: `<p>The analytic model reads the fact, so it is filtered too. Open it.</p>`,
        action: { do: 'Open <b>RHN_REP_AM_INVOICES</b> (tab Analytic Models).', check: () => editorOf('RHN_REP.RHN_REP_AM_INVOICES') },
      },
      {
        title: 'View as in the model',
        target: '#am-pivot',
        body: `<p>REGION in the rows, set the date variable, choose a user under <b>View as</b>, then Data Preview.</p>`,
        action: { do: 'Preview the model as <b>MBRANDT</b>.', event: '^am-preview-as:RHN_REP\\.RHN_REP_AM_INVOICES:MBRANDT' },
      },
    ],
    questions('Markus has two grid areas. Set the variable to 2025.'),
  ],
  'c08-m04': [
    assignDac('RHN_REP.RHN_REP_F_CONSUMPTION', 'The consumption fact holds the kWh.'),
    [
      {
        title: 'The model as Aylin',
        view: 'builder:landing:RHN_REP',
        target: '#object-list',
        body: `<p>Check what Aylin sees now.</p>`,
        action: { do: 'Open <b>RHN_REP_AM_CONSUMPTION</b>.', check: () => editorOf('RHN_REP.RHN_REP_AM_CONSUMPTION') },
      },
      {
        title: 'View as in the model',
        target: '#am-pivot',
        body: `<p>REGION in the rows, View as ADEMIR.</p>`,
        action: { do: 'Preview the model as <b>ADEMIR</b>.', event: '^am-preview-as:RHN_REP\\.RHN_REP_AM_CONSUMPTION:ADEMIR' },
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
        title: 'Views in RHN_REP',
        view: 'monitor:views:RHN_REP',
        target: '#view-list',
        body: `<p>The tab <b>Views</b> lists the deployed views of the space. Data Access shows whether a view is virtual or persisted.</p>`,
        action: { do: 'Click <b>RHN_REP_F_CONSUMPTION</b>.', event: '^monitor-open:RHN_REP\\.RHN_REP_F_CONSUMPTION$' },
      },
      {
        title: 'View Analyzer',
        target: '#vw-analyzer',
        body: `<p>The analyzer walks down the stack below the fact.</p>`,
        action: { do: 'Press <b>View Analyzer</b>.', event: '^analyzer:RHN_REP\\.RHN_REP_F_CONSUMPTION$' },
      },
      {
        title: 'Read the stack',
        target: '#analyzer-panel',
        body: `<p>Each row is one level. <b>Own runtime</b> is what that level's own SQL costs. Which level does the heavy lifting?</p>`,
      },
    ],
    [
      {
        title: 'Change the space',
        target: '#mon-space',
        body: `<p>The monitor shows one space. The expensive view lives in a different space than the fact.</p>`,
        action: { do: 'Switch to the space of the expensive view.', event: '^space:monitor:' },
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
        view: 'builder:landing:RHN_REP',
        target: '#object-list',
        body: `<p>Check what the controllers feel now.</p>`,
        action: { do: 'Open <b>RHN_REP_AM_CONSUMPTION</b>.', check: () => editorOf('RHN_REP.RHN_REP_AM_CONSUMPTION') },
      },
      {
        title: 'Runtime at production volume',
        target: '#am-pivot',
        body: `<p>Run the Data Preview. Its status line shows the simulated runtime at production volume.</p>`,
        action: { do: 'Run the <b>Data Preview</b>.', event: '^am-runtime:RHN_REP\\.RHN_REP_AM_CONSUMPTION:' },
      },
    ],
    questions('Compare the own runtimes in the analyzer, and read the runtime in the preview.'),
  ],
  'c09-m03': [
    [
      {
        title: 'Views in RHN_HARM',
        view: 'monitor:views:RHN_HARM',
        target: '#view-list',
        body: `<p>Select the persisted readings, then <b>Schedule</b>.</p>`,
        action: { do: 'Schedule <b>RHN_HA_V_METER_READINGS</b> daily.', event: '^schedule:RHN_HARM\\.RHN_HA_V_METER_READINGS:Daily' },
      },
    ],
    questions('When is the stored result computed, and where is it stored?'),
  ],
  'c09-m04': [
    [
      {
        title: 'Markus\'s view',
        view: 'monitor:views:RHN_REP',
        target: '#view-list',
        body: `<p>Select <code>RHN_REP_V_REGION_REVENUE</code> and start the persistence. Then read the messages of the run.</p>`,
        action: { do: 'Start Data Persistence on <b>RHN_REP_V_REGION_REVENUE</b>.', event: '^persist-fail:RHN_REP\\.RHN_REP_V_REGION_REVENUE' },
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
        view: 'monitor:views:RHN_HARM',
        target: '#view-list',
        body: `<p>Five rows, refreshed daily. The analyzer shows what computing them costs.</p>`,
        action: { do: 'Remove the persisted data of <b>RHN_HA_V_TARIFFS</b> and set its schedule to <b>No schedule</b>.', event: '^schedule:RHN_HARM\\.RHN_HA_V_TARIFFS:none' },
      },
    ],
    questions('What does the view read, and what does that object have?'),
  ],
  // ================================================================ chapter 12 (excursions)
  'c12-m01': [
    [
      {
        title: 'The tariff dimension',
        view: 'builder:landing:RHN_REP',
        target: '#object-list',
        body: `<p>Open the tariff dimension of the reporting space.</p>`,
        action: { do: 'Open <b>RHN_REP_D_TARIFF</b>.', event: '^open:RHN_REP\\.RHN_REP_D_TARIFF$' },
      },
      {
        title: 'Expose for Consumption',
        target: '#prop-expose',
        body: `<p>Off by default: nothing leaves the space by accident. Switch it on, then Deploy; tools read the deployed version.</p>`,
        action: { do: 'Switch <b>Expose for Consumption</b> on and press <b>Deploy</b>.', event: '^deploy:RHN_REP\\.RHN_REP_D_TARIFF$' },
      },
    ],
    [
      nav('spaces', 'Space Management', `<p>Database users belong to a space and are managed with it.</p>`),
      {
        title: 'Database Access',
        target: '[data-dbaccess="RHN_REP"]',
        body: `<p>Each space card has <b>Database Access</b> from this chapter on.</p>`,
        action: { do: 'Click <b>Database Access</b> on the RHN_REP card.', event: 'dbaccess:RHN_REP' },
      },
      {
        title: 'Create the user',
        target: '.dialog',
        body: `<p>The suffix names the user: <code>RHN_REP#</code> plus your suffix. Decide which access the pricing team needs.</p>`,
        action: { do: 'Create the database user for Power BI.', event: '^dbuser:RHN_REP#' },
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
        body: `<p>A business name, a technical name such as <code>RHN_REP_PKG_BOARD</code>, and the space <b>RHN_REP</b>. The space cannot change once objects are in.</p>`,
      },
      {
        title: 'Add the model',
        target: '#pkg-add',
        body: `<p>The list shows the deployed objects of the space. Start with the model; the table then shows what it needs.</p>`,
        action: { do: 'Add <b>RHN_REP_AM_CONSUMPTION</b>.', event: '^package-add:RHN_REP\\.RHN_REP_AM_CONSUMPTION$' },
      },
    ],
    [
      {
        title: 'Validation',
        target: '#pkg-validation',
        body: `<p>Each line names a missing object and who needs it. Objects of RHN_REP go into the package; objects of other spaces come from a required package.</p>`,
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
        body: `<p>Add objects, validate again, until the Validation panel is green. Then Save.</p>`,
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
        action: { do: 'Open <b>RHN_REP_AM_CONSUMPTION</b>.', event: '^catalog-open:RHN_REP\\.RHN_REP_AM_CONSUMPTION$' },
      },
      {
        title: 'Describe and tag',
        target: '#asset-desc',
        body: `<p>What is it, who owns it, when to use it. Then tick the tag <b>Consumption</b> under Subject Area and Save.</p>`,
        action: { do: 'Write the description, tick the tag, <b>Save</b>.', event: '^asset-tag:RHN_REP\\.RHN_REP_AM_CONSUMPTION:Subject Area/Consumption' },
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
        action: { do: 'Link the term to the asset and <b>Save</b>.', event: '^asset-term:RHN_REP\\.RHN_REP_AM_CONSUMPTION:' },
      },
    ],
    [
      {
        title: 'Publish the asset',
        target: '#asset-publish',
        body: `<p>Until now only you, the catalog administrator, see it.</p>`,
        action: { do: 'Press <b>Publish</b>.', event: '^asset-publish:RHN_REP\\.RHN_REP_AM_CONSUMPTION$' },
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
        title: 'Space RHN_REP',
        target: '#bb-spaces',
        body: `<p>The Business Builder works per space, like the Data Builder.</p>`,
        action: { do: 'Select <b>RHN_REP</b>.', event: 'bb-space:RHN_REP' },
      },
      {
        title: 'The consumption model',
        target: '#bb-list',
        body: `<p>The column Type tells you which object SAP Analytics Cloud stories were built on.</p>`,
        action: { do: 'Open the <b>consumption model</b>.', event: '^bb-open:RHN_REP\\.RHN_CM_REVENUE$' },
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
  // ================================================================ chapter 10
  'c10-m01': [
    [
      {
        title: 'New Task Chain',
        view: 'builder:landing:RHN_IN',
        target: '[data-new="taskchain"]',
        body: `<p>A task chain belongs to one space, like everything in the Data Builder.</p>`,
        action: { do: 'Click <b>Task Chain</b>.', appear: '#chain-steps' },
      },
      {
        title: 'Add the CRM flow',
        target: '#chain-add',
        body: `<p><b>Add Step</b> lists the deployed objects of the space, grouped by what the step does.</p>`,
        action: { do: 'Add <b>RHN_IN_RF_CRM</b>.', event: '^chain-add:RHN_IN\\.RHN_IN_RF_CRM$' },
      },
      {
        title: 'And the meter readings?',
        target: '#chain-add',
        body: `<p>Try Lena's delta flow as well. The dialog tells you whether it can be a step.</p>`,
        action: { do: 'Try to add <b>RHN_IN_RF_MDM</b>, read the message, cancel.', event: '^chain-refused:RHN_IN\\.RHN_IN_RF_MDM$' },
      },
    ],
    [
      {
        title: 'Names and Deploy',
        target: '#properties',
        body: `<p>Business name for people, technical name <code>RHN_IN_TC_CRM</code>. Then Deploy: only a deployed chain can run.</p>`,
        action: { do: 'Enter the names and press <b>Deploy</b>.', event: '^deploy:RHN_IN\\.RHN_IN_TC_CRM$' },
      },
      {
        title: 'Run',
        target: '#chain-run',
        body: `<p>Run starts the deployed version now. The result of each step appears below.</p>`,
        action: { do: 'Press <b>Run</b>.', event: '^chain-run:RHN_IN\\.RHN_IN_TC_CRM:' },
      },
    ],
    [
      {
        title: 'Share with RHN_HARM',
        view: 'builder:landing:RHN_IN',
        target: '#object-list',
        body: `<p>The share icon in the object list shares the chain. RHN_HARM can then nest it in its own chain.</p>`,
        action: { do: 'Share <b>RHN_IN_TC_CRM</b> with <b>RHN_HARM</b>.', event: '^share:RHN_IN\\.RHN_IN_TC_CRM$' },
      },
      {
        title: 'Remove the old schedule',
        view: 'monitor:flows:RHN_IN',
        target: '#flow-list',
        body: `<p>The flow still has its own daily schedule from chapter 3. Open it and set <b>Schedule</b> to No schedule.</p>`,
        action: { do: 'Remove the schedule of <b>RHN_IN_RF_CRM</b>.', event: '^schedule:RHN_IN\\.RHN_IN_RF_CRM:none' },
      },
    ],
    questions('When does a delta replication end?'),
  ],
  'c10-m02': [
    [
      {
        title: 'The nightly chain',
        view: 'builder:landing:RHN_HARM',
        target: '[data-new="taskchain"]',
        body: `<p>This chain lives in RHN_HARM: it persists views of RHN_HARM and calls the shared chain of RHN_IN.</p>`,
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
        action: { do: 'Set the failure email, then name and <b>Deploy</b> the chain.', event: '^deploy:RHN_HARM\\.RHN_HARM_TC_NIGHTLY$' },
      },
    ],
    [
      {
        title: 'Schedule and run',
        target: '#chain-schedule',
        body: `<p>Schedule it daily, then run it once to see that every step completes.</p>`,
        action: { do: 'Schedule <b>Daily</b> and press <b>Run</b>.', event: '^chain-run:RHN_HARM\\.RHN_HARM_TC_NIGHTLY:' },
      },
      {
        title: 'The second schedule',
        view: 'monitor:views:RHN_HARM',
        target: '#view-list',
        body: `<p>The readings still have their own schedule from chapter 9. The chain runs them now.</p>`,
        action: { do: 'Remove the schedule of <b>RHN_HA_V_METER_READINGS</b>.', event: '^schedule:RHN_HARM\\.RHN_HA_V_METER_READINGS:none' },
      },
    ],
    questions('What does the customer view read?'),
  ],
  'c10-m03': [
    [
      {
        title: 'The failed run',
        view: 'monitor:chains:RHN_HARM',
        target: '#chain-list',
        body: `<p>Open the nightly chain. Its last run failed; the steps show where.</p>`,
        action: { do: 'Click <b>RHN_HARM_TC_NIGHTLY</b>.', event: '^monitor-open:RHN_HARM\\.RHN_HARM_TC_NIGHTLY$' },
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
        view: 'builder:landing:RHN_HARM',
        target: '#object-list',
        body: `<p>Open the view, correct Tim's line, run the Data Preview to see it works on all rows, then Deploy.</p>`,
        action: { do: 'Fix and deploy <b>RHN_HA_V_CUSTOMERS</b>.', event: '^deploy:RHN_HARM\\.RHN_HA_V_CUSTOMERS$' },
      },
    ],
    [
      {
        title: 'Run again',
        view: 'monitor:chains:RHN_HARM',
        target: '#chain-list',
        body: `<p>Open the chain and run it. Deploying removed the snapshot of the view; the run builds it again.</p>`,
        action: { do: 'Run <b>RHN_HARM_TC_NIGHTLY</b>.', event: '^chain-run:RHN_HARM\\.RHN_HARM_TC_NIGHTLY:Completed' },
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
        action: { do: 'Open a run of the object that fails most often.', event: '^tasklog-open:RHN_IN\\.RHN_IN_RF_S4U$' },
      },
    ],
    questions('Count per object, and read the second message.'),
  ],
};
