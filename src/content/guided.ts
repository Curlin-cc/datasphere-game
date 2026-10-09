import type { TourStep } from '../tutorial';

/**
 * Strongly guided, hands-on tutorials for chapters 0 to 3 and 5.
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

const nav = (id: string, label: string, body: string): TourStep => ({
  title: `Open ${label}`,
  target: `.nav [data-view="${id}"]`,
  body,
  action: { do: `Click <b>${label}</b> in the side navigation.`, check: () => appOpen(id) },
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
const nameSaveDeploy = (name: string, business: string): TourStep[] => [
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
    action: { do: 'Press <b>Save</b>.', event: `save:RHN_HARM.${name}` },
  },
  {
    title: 'Deploy',
    target: '#ed-deploy',
    body: `<p>Only a deployed view exists in the database. The check reads what is deployed.</p>`,
    action: { do: 'Press <b>Deploy</b>.', event: `deploy:RHN_HARM.${name}` },
  },
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
      body: `<p>On the left are the <b>apps</b>. Each one does one job. The upper group is about data: finding, modeling, integrating.
        The lower group runs the tenant: spaces, monitoring, security, transport, system.</p>
        <p>An <b>ⓘ</b> means the app only shows an info page in this game, for now. The <b>☰</b> button folds the navigation to icons.</p>`,
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
};
