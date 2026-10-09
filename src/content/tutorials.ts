import type { TourStep } from '../tutorial';

/**
 * One tutorial per mission ID. It opens automatically the first time a mission starts
 * and can be reopened from the mission panel. Explains everything the mission needs,
 * but never shows the exact solution query.
 */
export const TUTORIALS: Record<string, TourStep[]> = {
  'c00-m01': [
    {
      title: 'Welcome to the training tenant',
      body: `<p>This game works like <b>SAP Datasphere</b>: the same apps, the same names, the same way of working. You learn where things are
        and what they are for, then you build a small data warehouse for Stadtwerke Rheinau.</p>
        <p>Every mission has a free tutorial like this one. You start with <b>0 XP</b>.</p>`,
    },
    {
      title: 'The side navigation',
      target: '.nav',
      body: `<p>On the left are the <b>apps</b>. Each one does one job. The upper group is about data: finding, modeling, integrating.
        The lower group is about running the tenant: spaces, monitoring, security, transport, system.</p>
        <p>Hover an entry to see what it does. An <b>ⓘ</b> means the app only shows an info page in this game, for now.</p>`,
    },
    {
      title: 'Collapse and expand',
      target: '#nav-toggle',
      body: `<p>The <b>☰</b> button folds the navigation to icons and back, like in a real tenant. Handy when you need room.</p>`,
    },
    {
      title: 'Your tenant at a glance',
      view: 'home',
      target: '#app-guide',
      body: `<p>The Home page groups all apps by what you do with them. Use it as your map.</p>`,
    },
    {
      title: 'The ticket',
      target: '.ticket',
      body: `<p>Work arrives as tickets. This one is from your mentor Calin Mucea. A ticket says what is needed; how you do it is up to you.</p>`,
    },
    {
      title: 'Your task',
      target: '#task',
      body: `<p>The task breaks the ticket into steps. Every step has a <b>Show me</b> button with a short tour for just that step.</p>`,
    },
    {
      title: 'Answers and hints',
      target: '#questions',
      body: `<p>Some missions ask questions. Your answers are saved right away.</p>
        <p>Below are hints in three levels. In the first chapters they are free; later you buy them with XP.</p>`,
    },
    {
      title: 'Check your solution',
      target: '.feedback',
      body: `<p><b>Check my solution</b> looks at what you did in the tenant and at your answers, and gives feedback for each part.
        Check as often as you like; it costs nothing.</p>`,
    },
  ],
  'c00-m02': [
    {
      title: 'Spaces first',
      body: `<p>In SAP Datasphere everything you build lives in a <b>space</b>: an isolated area with its own members, storage and objects.
        That is why the Data Builder asks for a space before anything else.</p>`,
    },
    {
      title: 'Select a space',
      view: 'builder:spaces',
      target: '#space-picker',
      body: `<p>You only see the spaces you are a member of. Right now there is one: <b>RHN_IN</b>, where IT loaded the source data.</p>`,
    },
    {
      title: 'The start page',
      view: 'builder:landing:RHN_IN',
      target: '#new-tiles',
      body: `<p>On top: tiles to <b>create</b> new objects, grouped into modeling, integration and security. A click on a grey tile explains what it is.</p>`,
    },
    {
      title: 'The object list',
      target: '#object-list',
      body: `<p>Below: every object of the space with its <b>business name</b>, <b>technical name</b>, type and <b>status</b>.
        Click a business name to open the object.</p>`,
    },
  ],
  'c00-m03': [
    {
      title: 'Find things without knowing the space',
      body: `<p>Clicking through spaces gets slow once there are many. The <b>Repository Explorer</b> searches all spaces you are a member of at once.</p>`,
    },
    {
      title: 'Search and filter',
      view: 'repository',
      target: '.repo-filters',
      body: `<p>Type part of a business or technical name. The filters narrow the list by type and space; the counter on the right says how many objects match.</p>`,
    },
    {
      title: 'Open from the result',
      target: '#repo-list',
      body: `<p>Clicking a result opens the object in its editor in the Data Builder, in the right space.</p>`,
    },
  ],
  'c00-m04': [
    {
      title: 'Two names',
      target: '.ticket',
      body: `<p>The <b>technical name</b> is how SQL and other objects refer to an object. It never changes.
        The <b>business name</b> is what people read, in Datasphere and in SAP Analytics Cloud. You can change it any time.</p>`,
    },
    {
      title: 'Design time and runtime',
      body: `<p>Every Data Builder editor has <b>Save</b> and <b>Deploy</b>.</p>
        <ul>
          <li><b>Save</b> stores your design. Nothing changes for anyone else yet.</li>
          <li><b>Deploy</b> makes it active in the database. Views and reports now use this version.</li>
        </ul>
        <p>The status shows where an object stands: <b>Not Deployed</b>, <b>Changes to Deploy</b> or <b>Deployed</b>.</p>`,
    },
  ],
  'c04-m01': [
    {
      title: 'Chapter 4: Profile the inbound data',
      body: `<p>Before anyone models, a data architect looks at the raw data. In this chapter you <b>profile</b> the inbound tables with SQL:
        count, group, sum and join, and find what is wrong.</p>
        <p>As in chapter 3, only the first hint is free. The tutorials stay free, so read them carefully.</p>`,
    },
    {
      title: 'A scratch SQL view',
      view: 'builder:landing:RHN_IN',
      target: '#new-tiles',
      body: `<p>For profiling you open a <b>New SQL View</b> in the Data Builder of <b>RHN_IN</b> and only use <b>Data Preview</b>.
        You do not save or deploy it: the inbound layer holds source data 1:1, without logic.</p>`,
    },
    {
      title: 'Sources',
      view: 'builder:new-view:RHN_IN',
      target: '#sources',
      body: `<p>The <b>Sources</b> list shows what this view may read: the deployed objects of the space and what is shared with it.
        A click inserts the full name, for example <code>RHN_IN.BILLING_CONTRACTS</code>.</p>`,
    },
    {
      title: 'Write SQL',
      target: '#editor',
      body: `<p>You address a table as <code>SPACE.TABLE</code>. Type <code>RHN_IN.</code> and the editor suggests tables and columns.</p>
        <p>To count rows per value, combine two things:</p>
        <ul>
          <li><code>COUNT(*)</code> counts rows.</li>
          <li><code>GROUP BY column</code> makes one group per distinct value, so <code>COUNT(*)</code> counts per group.</li>
        </ul>
        <p>Here is the pattern on a different table: customers per city.</p>`,
      example: `SELECT CITY, COUNT(*) AS CUSTOMERS
FROM RHN_IN.CRM_CUSTOMERS
GROUP BY CITY
ORDER BY CUSTOMERS DESC`,
    },
    {
      title: 'Data Preview',
      target: '#run',
      body: `<p><b>Data Preview</b> runs your SELECT and shows the result below. <b>Ctrl+Enter</b> does the same.</p>
        <p>Use the pattern for the contracts and the column <code>GRID_AREA</code>.</p>`,
    },
    {
      title: 'Read the result',
      target: '#results',
      body: `<p>Look closely at the grid area values. Are they all spelled the same way? Then look at
        <code>SRC_SYS_ID</code>: it names the source system of each row. <b>S4U</b> is the current billing system.</p>`,
    },
    {
      title: 'Check',
      target: '.feedback',
      body: `<p><b>Check my solution</b> runs the SQL in your editor and compares the result with what the ticket needs.
        Column names and order are up to you; only the result counts.</p>`,
    },
  ],
  'c04-m02': [
    {
      title: 'A ticket from the CFO',
      target: '.ticket',
      body: `<p>Your first ticket from the business. Petra Lindner, the CFO, wants to know how much money sits in each invoice status.</p>
        <p>Business people speak in business terms. "Gross amount" is not a column, you have to calculate it: <b>net plus tax</b>.</p>`,
    },
    {
      title: 'The invoices',
      view: 'builder:landing:RHN_IN',
      target: '#object-list',
      body: `<p>Invoices are in <b>RHN_IN.BILLING_INVOICES</b>. Open it, use Data Preview and find <code>STATUS</code>, <code>NET_AMOUNT</code> and <code>TAX_AMOUNT</code>.</p>
        <p>The tenant's business "today" is 15 July 2026. That decides which invoices are open and which are overdue.</p>`,
    },
    {
      title: 'Several numbers per group',
      target: '#editor',
      body: `<p>You already know <code>COUNT(*)</code> with <code>GROUP BY</code>. A query can return several aggregates per group:</p>
        <ul>
          <li><code>SUM(column)</code> adds up values per group.</li>
          <li>You can calculate inside it, for example <code>SUM(a + b)</code>.</li>
          <li><code>AS NAME</code> gives each column a readable name.</li>
        </ul>
        <p>The same idea on the meter readings: readings and total value per unit.</p>`,
      example: `SELECT UNIT,
       COUNT(*)   AS READINGS,
       SUM(VALUE) AS TOTAL_VALUE
FROM RHN_IN.METER_READINGS
GROUP BY UNIT;`,
    },
    {
      title: 'Answer and check',
      target: '#questions',
      body: `<p>Read the unpaid amount from your own result: open and overdue together. Then press <b>Check my solution</b>.</p>
        <p>Name your calculated columns with <code>AS</code>. Calin's review notices when you forget it.</p>`,
    },
  ],
  'c04-m03': [
    {
      title: 'A list instead of a summary',
      target: '.ticket',
      body: `<p>This time the CFO does not want totals but single invoices: the 10 biggest overdue ones, biggest first.</p>
        <p>You need three new pieces of SQL: a <b>filter</b>, a <b>sort</b> and a <b>limit</b>.</p>`,
    },
    {
      title: 'Filter with WHERE',
      view: 'builder:new-view:RHN_IN',
      target: '#editor',
      body: `<p><code>WHERE</code> keeps only the rows that match a condition. Text goes in single quotes, and the value must be spelled exactly as in the data.</p>
        <p><code>ORDER BY column DESC</code> sorts biggest first; without <code>DESC</code> it sorts smallest first.
        <code>LIMIT n</code> keeps the first n rows.</p>
        <p>The same three steps on the meter readings: the 5 biggest readings in MWh.</p>`,
      example: `SELECT METER_ID, READING_DATE, VALUE
FROM RHN_IN.METER_READINGS
WHERE UNIT = 'MWh'
ORDER BY VALUE DESC
LIMIT 5;`,
    },
    {
      title: 'A calculated column',
      target: '#editor',
      body: `<p>A column in <code>SELECT</code> can be a calculation, for example <code>PRICE * QUANTITY AS TOTAL</code>.
        You can sort by the calculation too.</p>
        <p>The ticket needs four columns: invoice ID, contract ID, due date and gross amount. Order matters this time, so the check also looks at the row order.</p>`,
    },
  ],
  'c04-m04': [
    {
      title: 'Data from two tables',
      target: '.ticket',
      body: `<p>The contracts know their grid area, but not the region. The region is in a second table, <b>RHN_IN.GRID_AREAS</b>.</p>
        <p>To bring both together you need a <b>join</b>.</p>`,
    },
    {
      title: 'How a join works',
      view: 'builder:new-view:RHN_IN',
      target: '#editor',
      body: `<p><code>JOIN … ON …</code> puts a row of one table next to the matching row of another. The <code>ON</code> condition says what "matching" means.</p>
        <ul>
          <li>Give each table a short alias: <code>FROM RHN_IN.BILLING_INVOICES i</code>.</li>
          <li>Then address columns as <code>i.CONTRACT_ID</code>.</li>
          <li>A plain <code>JOIN</code> (inner join) keeps only rows that found a partner.</li>
        </ul>
        <p>Here invoices get the tariff of their contract, then are counted per tariff:</p>`,
      example: `SELECT c.TARIFF, COUNT(*) AS INVOICES
FROM RHN_IN.BILLING_INVOICES i
JOIN RHN_IN.BILLING_CONTRACTS c
  ON i.CONTRACT_ID = c.CONTRACT_ID
GROUP BY c.TARIFF;`,
    },
    {
      title: 'Always check the total',
      target: '#results',
      body: `<p>A good habit after every join: add up your counts and compare with the source table. If the numbers differ, rows were lost or duplicated.</p>
        <p>A <code>LEFT JOIN</code> keeps every row of the first table, even without a partner. The missing values then show up as <code>null</code>.
        Both answers are accepted here.</p>`,
    },
  ],
  'c01-m01': [
    {
      title: 'Chapter 1: Space concept',
      body: `<p>Welcome to chapter 1. Until now you worked in one space that IT prepared. Now you design the landscape yourself.</p>
        <p>A <b>space</b> is an isolated area in the tenant: its own members, its own storage, its own priority, its own objects.
        Objects in one space are invisible to the others until you share them.</p>`,
    },
    {
      title: 'Space Management',
      view: 'spaces',
      target: '#space-list',
      body: `<p>Each tile is one space with its storage and priority. Right now there is only <b>RHN_IN</b>, the inbound space.</p>
        <p>The layer on the tile comes from the space ID: our convention ends inbound spaces in <code>_IN</code>, harmonization in <code>_HARM</code>, reporting in <code>_REP</code>.</p>`,
    },
    {
      title: 'Tenant capacity',
      target: '.capacity',
      body: `<p>All spaces share the tenant's disk and in-memory storage. The bars show how much is already given to spaces.</p>`,
    },
    {
      title: 'Space ID and space name',
      target: '#create-space',
      body: `<p><b>Create space</b> opens a form with two names:</p>
        <ul>
          <li><b>Space name</b>: for people, up to 30 characters, can be changed any time.</li>
          <li><b>Space ID</b>: the technical name, up to 20 characters, only <code>A–Z</code>, <code>0–9</code> and <code>_</code>.
            It <b>cannot be changed</b> after the space is created.</li>
        </ul>
        <p>Typing the name suggests an ID. Check it before you press Create.</p>`,
    },
    {
      title: 'Your turn',
      target: '.ticket',
      body: `<p>Create the two spaces the ticket asks for, then answer the question in the mission panel and press <b>Check my solution</b>.</p>
        <p>Made a typo in an ID? Delete the space and create it again. That is what you would do in a real tenant too.</p>`,
    },
  ],
  'c01-m02': [
    {
      title: 'Storage and priority',
      target: '.ticket',
      body: `<p>Jonas gives you the budget and a list of rules. This mission is about planning, not SQL: work out the numbers first, then edit the spaces.</p>`,
    },
    {
      title: 'Disk and in-memory',
      view: 'spaces',
      target: '.capacity',
      body: `<p><b>Disk</b> stores data. <b>In-memory</b> keeps data in RAM so it can be read very fast; it is smaller and more expensive.
        A space can never have more in-memory than disk.</p>
        <p>The tenant refuses assignments beyond its capacity, but the reserve IT wants is your job to keep.</p>`,
    },
    {
      title: 'Priority',
      target: '#space-list',
      body: `<p>Priority goes from <b>1</b> (lowest) to <b>5</b> (highest). When the database is busy, statements from spaces with a higher priority are favored.</p>
        <p>Use <b>Edit</b> on a tile to change storage and priority. The space ID stays fixed.</p>`,
    },
    {
      title: 'A planning trick',
      body: `<p>Write the budget down before you click: capacity minus reserve minus what is already assigned is what you can hand out.
        Then check the minimum each space needs. If the minimums fit, give the rest where it helps most.</p>`,
    },
  ],
  'c01-m03': [
    {
      title: 'Spaces are walls',
      target: '.ticket',
      body: `<p>Data in one space is invisible to every other space. That is the point: a modeler in harmonization should not stumble over everything in inbound.</p>
        <p>To let a layer build on the layer below, you <b>share</b> objects. The data stays where it is, nothing is copied.</p>`,
    },
    {
      title: 'The space you work in',
      view: 'builder:landing',
      target: '#space-switch',
      body: `<p>The Data Builder always works <b>in one space</b>. This switch shows which one, and changes it.</p>
        <p>The start page lists the objects of that space, and below them the objects <b>shared with</b> it. Views in this space may only read those.</p>`,
    },
    {
      title: 'Sharing an object',
      view: 'builder:landing:RHN_IN',
      target: '#object-list',
      body: `<p>In the space an object belongs to, the share icon in its row opens the sharing dialog. Tick the spaces that may read it.
        The editor of an object has a Share button too.</p>
        <p>A dot on the icon means the object is already shared somewhere.</p>`,
    },
    {
      title: 'Layers in order',
      body: `<p>The rule of the landscape: each layer reads from the layer directly below.</p>
        <p><b>RHN_IN</b> → shared with → <b>RHN_HARM</b> → shared with → <b>RHN_REP</b></p>
        <p>If reporting read inbound directly, uncleaned source data would land in the board's reports.</p>`,
    },
  ],
  'c01-m04': [
    {
      title: 'Why names matter',
      target: '.ticket',
      body: `<p>A landscape grows to hundreds of objects. A good name tells you, without opening the object, which layer it lives in and what kind of object it is.</p>
        <p>Datasphere does not enforce names. Teams agree on a convention and check it in reviews, like Calin does.</p>`,
    },
    {
      title: 'Read a name in parts',
      target: '#questions',
      body: `<p>Split each name at the underscores and check part by part:</p>
        <p><code>RHN</code> · <code>HA</code> · <code>V</code> · <code>CONSUMPTION</code><br>
        company · layer · type · what it holds</p>
        <p>A <b>fact</b> holds numbers you add up, a <b>dimension</b> describes them. You build both in chapter 6.</p>`,
    },
  ],
  'c02-m01': [
    {
      title: 'Chapter 2: Users and roles',
      body: `<p>Spaces separate the data. Roles decide what people may <b>do</b> with it, and where.</p>
        <p>From this chapter on, only the first hint is free. The others cost XP, so read the tutorials carefully.</p>`,
    },
    {
      title: 'Templates',
      view: 'security',
      target: '#templates',
      body: `<p>SAP Datasphere ships role <b>templates</b>. Each describes a job: run a space, load data, build models, look at models, or consume reports.</p>
        <p>Read the cards: what can each one do, and what not?</p>`,
    },
    {
      title: 'Global versus scoped',
      target: '.role-cards',
      body: `<p><b>DW Administrator</b> is a <b>global</b> role: it applies to the whole tenant.</p>
        <p>All other roles are <b>scoped</b>: a template plus a <b>scope</b>, the list of spaces the role can be used in.
        When a user gets the role, you choose which of those spaces they get it for.</p>`,
    },
    {
      title: 'Create a scoped role',
      target: '#create-role',
      body: `<p>This button opens the form: role name, template, scope. The ticket asks for one role per function, so five roles in total.</p>
        <p>Think layer by layer: in which spaces does this function happen at all?</p>`,
    },
  ],
  'c02-m02': [
    {
      title: 'The people',
      view: 'security',
      target: '.tabs',
      body: `<p>Switch to the <b>Users</b> tab. Eight people need access, each with a short description of their job.</p>`,
    },
    {
      title: 'Least privilege',
      body: `<p>The rule for this mission: <b>least privilege</b>. Everyone gets the smallest set of rights that lets them do their job.</p>
        <ul>
          <li>Someone who only reads reports in SAP Analytics Cloud does not need to open Datasphere: <b>Consumer</b>.</li>
          <li>Someone who must look at models without changing them: <b>Viewer</b>.</li>
          <li>Someone who builds: <b>Modeler</b>, in the spaces where they build.</li>
        </ul>`,
    },
    {
      title: 'Assigning roles',
      target: '#security-body',
      body: `<p><b>Edit roles</b> opens a dialog per person. Tick a role's spaces to assign it; untick to remove.</p>
        <p>The check gives you feedback per person: missing rights and rights that are too much.</p>`,
    },
  ],
  'c02-m03': [
    {
      title: 'Joiners, movers, leavers',
      target: '.ticket',
      body: `<p>Access is not a one-time job. People join, change teams and leave. Each change needs two steps:
        give what the new job needs, and take away what the old job needed.</p>`,
    },
    {
      title: 'Delegation',
      view: 'security',
      target: '#security-body',
      body: `<p>In a real tenant the space administrator of a space can manage its members without the tenant owner.
        That keeps the tenant owner from becoming a bottleneck.</p>`,
    },
  ],
  'c03-m01': [
    {
      title: 'Chapter 3: Data integration',
      body: `<p>So far the data in <code>RHN_IN</code> was a one-off copy IT made for the pilot. Now you connect the real source systems and decide
        how their data gets in: read live, copied once, or kept up to date by delta.</p>
        <p>Three apps work together: <b>Connections</b> (where a system is), the <b>Data Builder</b> (remote tables and flows),
        and the <b>Data Integration Monitor</b> (runs, schedules, logs). Only the first hint is free in this chapter.</p>`,
    },
    {
      title: 'The Connections app',
      view: 'connections',
      target: '.nav [data-view="connections"]',
      body: `<p>Connections link <b>one space</b> to a source or target system. Everybody in that space can use the connection; nobody else can.</p>`,
    },
    {
      title: 'Space first',
      target: '#conn-space',
      body: `<p>Like the Data Builder, Connections always works in one space. All loads land in the inbound layer, so its connections live there too.</p>`,
    },
    {
      title: 'Connection types',
      target: '#conn-create',
      body: `<p><b>Create</b> starts with the <b>connection type</b>: SAP S/4HANA Cloud, SAP HANA, Amazon S3 and many more.
        Each type supports a set of <b>features</b>:</p>
        <ul><li><b>Remote Tables</b>: read objects of the source without copying them</li>
        <li><b>Data Flows</b> and <b>Replication Flows</b>: copy data into tables</li>
        <li><b>Model Import</b>: import entities with their semantics</li></ul>`,
    },
    {
      title: 'Validate',
      target: '#conn-toolbar',
      body: `<p>After creating, select the connection and press <b>Validate</b>. It tries to reach the source and tells you which features
        really work, or what failed. It is the first step of every troubleshooting.</p>`,
    },
  ],
  'c03-m02': [
    {
      title: 'Cloud and on-premise',
      body: `<p>Datasphere runs in the cloud. Systems in your own data center are not reachable from the internet, on purpose.
        The <b>SAP Cloud Connector</b>, installed in the company network, links the two. A connection names it by its <b>location ID</b>.</p>`,
    },
    {
      title: 'Tenant-wide prerequisites',
      view: 'system:integration',
      target: '#system-body',
      body: `<p><b>System › Configuration</b> holds what all spaces share. <b>Data Integration</b> lists the Cloud Connectors (and Data
        Provisioning Agents) connected to this tenant.</p>`,
    },
    {
      title: 'Trusted certificates',
      view: 'system:security',
      target: '#system-body',
      body: `<p>With TLS, the server shows a certificate. The tenant accepts it only if it trusts that certificate, or the authority (CA) that
        signed it. You upload trusted certificates here. Trust only what a connection needs.</p>`,
    },
    {
      title: 'Read the validation',
      view: 'connections',
      target: '#conn-toolbar',
      body: `<p>Create the connection, then validate. If it fails, the message names <b>one</b> missing piece. Fix it, validate again.</p>`,
    },
  ],
  'c03-m03': [
    {
      title: 'Remote tables',
      view: 'builder:landing:RHN_IN',
      target: '#new-tiles',
      body: `<p>A <b>remote table</b> brings an object of a connection into the space: its structure lives here, its data stays in the source.
        You import remote tables with the <b>Import Remote Tables</b> tile.</p>`,
    },
    {
      title: 'Data access',
      body: `<p>Each remote table has a <b>data access</b>:</p>
        <ul><li><b>Remote</b>: every query is sent to the source. Always current, but each query costs the source and depends on it.</li>
        <li><b>Replicated (Snapshot)</b>: a full copy is stored in the space. Fast and independent, but only as fresh as the last load.</li></ul>
        <p>Real-time replication exists for suitable sources; this game does not simulate it.</p>`,
    },
    {
      title: 'The Data Integration Monitor',
      view: 'monitor:remote',
      target: '#mon-tabs',
      body: `<p>You change the data access here, not in the editor: <b>Load New Snapshot</b>, <b>Remove Replicated Data</b> and <b>Schedule</b>.
        <b>Remote Queries</b> shows what this space sent to the sources.</p>`,
    },
    {
      title: 'Schedules and consent',
      target: '#mon-tabs',
      body: `<p>Scheduled tasks run in <b>your</b> name, even at night. So the tenant asks for your <b>consent</b> to job scheduling first.
        Without it, schedules cannot run.</p>`,
    },
  ],
  'c03-m04': [
    {
      title: 'Replication flows',
      view: 'builder:landing:RHN_IN',
      target: '[data-new="replication"]',
      body: `<p>A <b>replication flow</b> copies objects of one source connection into local tables, with little modeling: no joins, no logic,
        only projections (filters, column mapping, extra columns).</p>`,
    },
    {
      title: 'Load types',
      body: `<ul><li><b>Initial Only</b>: everything is loaded once.</li>
        <li><b>Initial and Delta</b>: everything once, then the flow keeps checking the source and transfers only the changes.
        Only delta-capable sources offer it.</li></ul>
        <p><b>Truncate</b> empties the target table before the initial load, completely.</p>`,
    },
    {
      title: 'The editor',
      view: 'builder:new-flow:RHN_IN',
      target: '.ed-body',
      body: `<p>Left: the source connection, <b>Add Source Objects</b>, the target and the names. Right: one row per object with target table,
        load type, Truncate and projection. Save, Deploy, then <b>Run</b>.</p>`,
    },
    {
      title: 'Watch it run',
      view: 'monitor:flows',
      target: '#mon-tabs',
      body: `<p>Every run appears in <b>Flows</b> with its status and messages. A delta flow stays <b>Running</b>: it keeps watching the source.</p>`,
    },
  ],
  'c03-m05': [
    {
      title: 'Files as a source',
      body: `<p>Some systems cannot be connected directly and drop files instead, for example into an Amazon S3 bucket. A connection to
        cloud storage offers flows, not remote tables.</p>`,
    },
    {
      title: 'Set the source system while loading',
      body: `<p>Every inbound row should say which system it came from. If the source does not deliver that, the load adds it: in a replication
        flow, the <b>projection</b> of an object can add columns with a constant value.</p>`,
    },
    {
      title: 'Full export, every night',
      body: `<p>A file that holds <b>all</b> customers each night replaces yesterday's content. Think about what Truncate does here, and what
        loads the file tomorrow without you.</p>`,
    },
  ],
  'c03-m06': [
    {
      title: 'Something broke at night',
      view: 'monitor:flows',
      target: '#flow-list',
      body: `<p>Failed loads show up in the <b>Data Integration Monitor</b>. Open the flow, pick the failed run, read the messages from top to bottom.
        The last one usually names the cause.</p>`,
    },
    {
      title: 'Locked spaces',
      view: 'spaces',
      target: '#space-list',
      body: `<p>Each space has a disk quota. If it uses more than assigned, it is <b>locked</b>: no loads, no deployments.
        It stays locked until it has enough storage again and someone presses <b>Unlock</b>.</p>`,
    },
  ],
};

/**
 * Quick tutorials: two or three pop-ups per task step, opened with "Show me" next to the step.
 * Index = position in the mission's task list.
 */
export const TASK_TOURS: Record<string, TourStep[][]> = {
  'c00-m01': [
    [
      { title: 'Data apps', target: '.nav', body: `<p>Repository Explorer, Data Builder, Data Integration Monitor and Connections sit in the upper group. Click each once.</p>` },
      { title: 'Admin apps', target: '.nav', body: `<p>Space Management and Security sit in the lower group. Click both too.</p>` },
    ],
    [ { title: 'One job, one app', target: '#questions', body: `<p>For each question, think: is it about building, about getting data in, or about running the tenant?</p>` } ],
  ],
  'c00-m02': [
    [ { title: 'Select the space', view: 'builder:spaces', target: '#space-picker', body: `<p>Click the RHN_IN card.</p>` } ],
    [ { title: 'Open the contracts', view: 'builder:landing:RHN_IN', target: '#object-list', body: `<p>Click <b>BILLING_CONTRACTS</b> in the Business Name column.</p>` } ],
    [
      { title: 'Columns', target: '#main', body: `<p>The middle shows the columns of the table, the right side its properties.</p>` },
      { title: 'Data Preview', target: '#run', body: `<p>This button shows the first 100 rows at the bottom.</p>` },
    ],
  ],
  'c00-m03': [
    [ { title: 'Search', view: 'repository', target: '.repo-filters', body: `<p>Type <b>meter</b> into the search field.</p>` } ],
    [ { title: 'Open it', target: '#repo-list', body: `<p>Click the business name of the result.</p>` } ],
    [ { title: 'Count', view: 'repository', target: '.repo-filters', body: `<p>Clear the search, set Space to RHN_IN and read the counter on the right.</p>` } ],
  ],
  'c00-m04': [
    [ { title: 'Open it', view: 'builder:landing:RHN_IN', target: '#object-list', body: `<p>Open BILLING_CONTRACTS. Its business name is still the technical name.</p>` } ],
    [ { title: 'Change and save', target: '#main', body: `<p>Change <b>Business Name</b> in the properties panel on the right, then press <b>Save</b> in the toolbar. Read the status.</p>` } ],
    [ { title: 'Deploy', target: '#main', body: `<p>Press <b>Deploy</b>. The status turns to Deployed, and the object list shows the new name.</p>` } ],
  ],
  'c04-m01': [
    [
      {
        title: 'Find the contracts',
        view: 'builder:landing:RHN_IN',
        target: '#object-list',
        body: `<p>The start page of RHN_IN lists its objects. Open <b>BILLING_CONTRACTS</b> and press <b>Data Preview</b>.</p>`,
      },
      {
        title: 'What you see',
        target: '#results',
        body: `<p>Data Preview shows the first 100 rows. Each row is one supply contract: who, which <code>GRID_AREA</code>, which <code>TARIFF</code>,
          and in <code>SRC_SYS_ID</code> the system it came from.</p>`,
      },
    ],
    [
      {
        title: 'Count per value',
        view: 'builder:new-view:RHN_IN',
        target: '#editor',
        body: `<p><code>COUNT(*)</code> counts rows. <code>GROUP BY</code> splits the rows into one group per value, so the count runs per group.</p>
          <p>Same pattern, other table:</p>`,
        example: `SELECT CITY, COUNT(*) AS CUSTOMERS
FROM RHN_IN.CRM_CUSTOMERS
GROUP BY CITY;`,
      },
      {
        title: 'Run it',
        target: '#run',
        body: `<p>Swap in the contracts table and the column <code>GRID_AREA</code>, then press <b>Data Preview</b> or <b>Ctrl+Enter</b>.</p>`,
      },
    ],
    [
      {
        title: 'Compare the values',
        view: 'builder:new-view:RHN_IN',
        target: '#results',
        body: `<p>How many different grid areas do you get? Are some of them the same area, just spelled differently?</p>`,
      },
      {
        title: 'Follow the source',
        target: '#editor',
        body: `<p>Add <code>SRC_SYS_ID</code> to the <code>SELECT</code> and to the <code>GROUP BY</code>. Then you see which system delivers the odd values.</p>`,
      },
    ],
  ],
  'c04-m02': [
    [
      {
        title: 'Find the invoices',
        view: 'builder:landing:RHN_IN',
        target: '#object-list',
        body: `<p>Open <b>BILLING_INVOICES</b> in RHN_IN. Look for <code>STATUS</code> and the two amounts <code>NET_AMOUNT</code> and <code>TAX_AMOUNT</code>.</p>`,
      },
      {
        title: 'Which statuses exist?',
        target: '#editor',
        body: `<p><code>SELECT DISTINCT STATUS FROM …</code> lists every status once.</p>`,
      },
    ],
    [
      {
        title: 'Two aggregates at once',
        view: 'builder:new-view:RHN_IN',
        target: '#editor',
        body: `<p>Put <code>COUNT(*)</code> and <code>SUM(…)</code> next to each other in the <code>SELECT</code>, separated by a comma. Both are calculated per group.</p>`,
      },
      {
        title: 'Gross, not net',
        target: '#editor',
        body: `<p>Gross is net plus tax. You can add the two columns inside the sum: <code>SUM(a + b)</code>.</p>`,
      },
    ],
    [
      {
        title: 'Read your result',
        view: 'builder:new-view:RHN_IN',
        target: '#results',
        body: `<p>Not paid yet means OPEN and OVERDUE. Add their gross totals and pick the closest answer.</p>`,
      },
    ],
  ],
  'c04-m03': [
    [
      {
        title: 'Filter the rows',
        view: 'builder:new-view:RHN_IN',
        target: '#editor',
        body: `<p><code>WHERE STATUS = '…'</code> keeps one status. Write the value exactly as in the data, in single quotes.</p>`,
      },
    ],
    [
      {
        title: 'Pick the columns',
        view: 'builder:new-view:RHN_IN',
        target: '#editor',
        body: `<p>List four columns after <code>SELECT</code>. The fourth is a calculation: net plus tax. Name it with <code>AS</code>.</p>`,
      },
    ],
    [
      {
        title: 'Sort and cut',
        view: 'builder:new-view:RHN_IN',
        target: '#editor',
        body: `<p><code>ORDER BY … DESC</code> puts the biggest first. <code>LIMIT 10</code> at the very end keeps 10 rows.</p>`,
      },
      {
        title: 'Check the order',
        target: '#results',
        body: `<p>The first row must be the biggest amount. If it is the smallest, <code>DESC</code> is missing.</p>`,
      },
    ],
  ],
  'c04-m04': [
    [
      {
        title: 'The mapping table',
        view: 'builder:landing:RHN_IN',
        target: '#object-list',
        body: `<p>Open <b>GRID_AREAS</b> and use Data Preview. Four rows: each grid area with its name and <code>REGION</code>. Which column also exists in the contracts?</p>`,
      },
    ],
    [
      {
        title: 'Join and group',
        view: 'builder:new-view:RHN_IN',
        target: '#editor',
        body: `<p><code>FROM contracts c JOIN grid_areas g ON c.… = g.…</code>, then <code>GROUP BY g.REGION</code> and count.</p>`,
      },
    ],
    [
      {
        title: 'Compare totals',
        view: 'builder:new-view:RHN_IN',
        target: '#results',
        body: `<p>Add up the two regions. Then count all contracts with <code>SELECT COUNT(*) FROM RHN_IN.BILLING_CONTRACTS</code> in Data Preview, and put your region query back before you check.</p>`,
      },
      {
        title: 'Remember mission 1',
        target: '#questions',
        body: `<p>Which contracts had grid area values that do not look like the codes in GRID_AREAS?</p>`,
      },
    ],
  ],
  'c01-m01': [
    [
      { title: 'Space Management', view: 'spaces', target: '#space-list', body: `<p>Here are all spaces. RHN_IN has 40 GB disk and 8 GB in-memory.</p>` },
      { title: 'Capacity', target: '.capacity', body: `<p>The bars show how much of the tenant is already assigned.</p>` },
    ],
    [
      { title: 'Create a space', view: 'spaces', target: '#create-space', body: `<p>Press <b>Create space</b>. Enter a name for people; check the suggested ID against the convention: <code>RHN_</code> plus the layer.</p>` },
    ],
    [
      { title: 'Same again', view: 'spaces', target: '#create-space', body: `<p>One more space, this time for the reporting layer.</p>` },
      { title: 'Check the list', target: '#space-list', body: `<p>The tiles should now show the Inbound, Harmonization and Reporting layers.</p>` },
    ],
    [
      { title: 'Think about people', target: '#questions', body: `<p>Who works in harmonization, who in reporting? What can you set per space?</p>` },
    ],
  ],
  'c01-m02': [
    [
      { title: 'Do the maths', target: '.ticket', body: `<p>Disk: capacity − reserve − RHN_IN. In-memory: the same. Then compare with the minimums of HARM and REP.</p>` },
    ],
    [
      { title: 'Edit a space', view: 'spaces', target: '#space-list', body: `<p>Press <b>Edit</b> on the RHN_HARM tile. The form shows how much is still free in the tenant.</p>` },
    ],
    [
      { title: 'Reporting first', view: 'spaces', target: '#space-list', body: `<p>RHN_REP needs the most in-memory of the two and a priority higher than every other space.</p>` },
    ],
    [
      { title: 'The question', target: '#questions', body: `<p>Priority is about competition for resources at the same moment.</p>` },
    ],
  ],
  'c01-m03': [
    [
      { title: 'Select RHN_HARM', view: 'builder:spaces', target: '#space-picker', body: `<p>Pick <b>RHN_HARM</b>. Its start page is empty: nothing lives there, and nothing is shared with it yet.</p>` },
    ],
    [
      { title: 'Back to inbound', view: 'builder:landing:RHN_IN', target: '#space-switch', body: `<p>You are in <b>RHN_IN</b> now. Objects are shared from the space they belong to.</p>` },
      { title: 'Share', target: '#object-list', body: `<p>Click the share icon in the BILLING_CONTRACTS row and tick RHN_HARM. Then the same for GRID_AREAS.</p>` },
    ],
    [
      { title: 'Look from harmonization', view: 'builder:landing:RHN_HARM', target: '#space-switch', body: `<p>Back in RHN_HARM. Below the object list there is now a section "Shared with RHN_HARM".</p>` },
      { title: 'Preview', target: '#main', body: `<p>Open BILLING_CONTRACTS there and press <b>Data Preview</b>. The data still lives in RHN_IN; you only read it.</p>` },
    ],
    [
      { title: 'Copies', target: '#questions', body: `<p>What happens to a copy when the inbound table changes tomorrow?</p>` },
    ],
  ],
  'c01-m04': [
    [
      { title: 'The convention', target: '.ticket', body: `<p>Four parts: <code>RHN</code>, layer, type, name. Layer and type use short codes.</p>` },
    ],
    [
      { title: 'Check part by part', target: '#questions', body: `<p>For each option, check prefix, layer code, type code and the name part. One wrong part rules it out.</p>` },
    ],
  ],
  'c02-m01': [
    [ { title: 'Role templates', view: 'security', target: '#templates', body: `<p>Five templates. Each card says what the role may do and what not.</p>` } ],
    [
      { title: 'Create', view: 'security', target: '#create-role', body: `<p>Name it <code>RHN_</code> plus the function, pick the template, tick the scope spaces.</p>` },
      { title: 'Check the list', target: '#role-list', body: `<p>Five roles, one per template. Compare each scope with the ticket.</p>` },
    ],
    [ { title: 'Global or scoped', view: 'security', target: '.role-cards', body: `<p>Which role card says "Global role"?</p>` } ],
  ],
  'c02-m02': [
    [ { title: 'Users tab', view: 'security', target: '.tabs', body: `<p>Open <b>Users</b>. The middle column says what each person does.</p>` } ],
    [
      { title: 'One person at a time', view: 'security', target: '#security-body', body: `<p>Press <b>Edit roles</b>, tick the spaces for the role that matches the job. Reports in SAC only: Consumer. Reading models: Viewer.</p>` },
    ],
    [ { title: 'Risk', target: '#questions', body: `<p>What is the worst that can happen with each extra right?</p>` } ],
  ],
  'c02-m03': [
    [ { title: 'The new colleague', view: 'security', target: '#security-body', body: `<p>Nina is in the user list now. Give her the role and space she needs, nothing more.</p>` } ],
    [ { title: 'The mover', view: 'security', target: '#security-body', body: `<p>Edit Tim: tick the new space, untick the old one.</p>` } ],
    [ { title: 'Two questions', target: '#questions', body: `<p>Which template manages members? And which tool filters rows, not functions?</p>` } ],
  ],
  'c03-m01': [
    [ { title: 'Select the space', view: 'connections', target: '#conn-space', body: `<p>Choose <code>RHN_IN</code>. The list shows only this space's connections.</p>` } ],
    [
      { title: 'Create', view: 'connections', target: '#conn-create', body: `<p>Pick the type that matches the source system. Then the form asks for host, authentication and names.</p>` },
      { title: 'Names', body: `<p>Business name for people, technical name <code>RHN_S4U</code>. The technical name cannot change later.</p>` },
    ],
    [ { title: 'Validate', view: 'connections', target: '#conn-toolbar', body: `<p>Select the radio button of the connection, then <b>Validate</b>. Read the feature list.</p>` } ],
    [ { title: 'Two questions', target: '#questions', body: `<p>Where does a connection live? And what did validation list besides remote tables and flows?</p>` } ],
  ],
  'c03-m02': [
    [ { title: 'Type and deployment', view: 'connections', target: '#conn-create', body: `<p>The source is SAP HANA. Its form asks <b>Cloud</b> or <b>On-Premise</b>; the data center is on-premise.</p>` } ],
    [ { title: 'One error at a time', view: 'connections', target: '#conn-toolbar', body: `<p>Validate, read, fix with <b>Edit</b>, validate again.</p>` } ],
    [
      { title: 'Cloud Connector', view: 'system:integration', target: '#system-body', body: `<p>The location ID of the connected Cloud Connector is listed here.</p>` },
      { title: 'Certificate', view: 'system:security', target: '#system-body', body: `<p><b>Upload Certificate</b> and pick the CA file Jonas named. Only that one.</p>` },
    ],
    [ { title: 'Validate again', view: 'connections', target: '#conn-toolbar', body: `<p>A change resets the validation. Validate once more.</p>` } ],
    [ { title: 'The question', target: '#questions', body: `<p>Why could the cloud not reach the host at first?</p>` } ],
  ],
  'c03-m03': [
    [ { title: 'Import', view: 'builder:landing:RHN_IN', target: '[data-new="remote"]', body: `<p>Choose <code>RHN_S4U</code>, tick the two objects, keep the suggested <code>RHN_IN_RT_</code> names.</p>` } ],
    [
      { title: 'Preview', view: 'builder:landing:RHN_IN', target: '#object-list', body: `<p>Open the tariffs remote table and press <b>Data Preview</b>.</p>` },
      { title: 'Remote Queries', view: 'monitor:queries', target: '#mon-tabs', body: `<p>Here is the statement that went to S/4 for your preview.</p>` },
    ],
    [
      { title: 'Snapshot', view: 'monitor:remote', target: '#mon-tabs', body: `<p>Select the grid areas, <b>Load New Snapshot</b>, then <b>Schedule</b>. Give consent in the banner if asked.</p>` },
    ],
    [ { title: 'The question', target: '#questions', body: `<p>What does every snapshot refresh of a big table cost?</p>` } ],
  ],
  'c03-m04': [
    [ { title: 'New flow', view: 'builder:new-flow:RHN_IN', target: '.flow-source', body: `<p>Choose the source connection here.</p>` } ],
    [ { title: 'Objects', view: 'builder:new-flow:RHN_IN', target: '.flow-center', body: `<p><b>Add Source Objects</b>, then type the existing table name as target. The suggestion is already the same name.</p>` } ],
    [ { title: 'Load type and Truncate', target: '.flow-center', body: `<p>Delta for both. And think about the LEGACY rows before you tick Truncate.</p>` } ],
    [
      { title: 'Names, save, deploy', target: '.flow-props', body: `<p>Business name, technical name <code>RHN_IN_RF_S4U</code>, then Save, Deploy and Run in the toolbar.</p>` },
      { title: 'Monitor', view: 'monitor:flows', target: '#mon-tabs', body: `<p>Open the flow and read the messages of its run.</p>` },
    ],
    [ { title: 'The question', target: '#questions', body: `<p>The run messages say what delta does after the initial load.</p>` } ],
  ],
  'c03-m05': [
    [ { title: 'The bucket', view: 'connections', target: '#conn-create', body: `<p>Type Amazon Simple Storage Service. The bucket name goes into the Bucket field.</p>` } ],
    [ { title: 'Flow', view: 'builder:landing:RHN_IN', target: '[data-new="replication"]', body: `<p>Source <code>RHN_CRM</code>, add the export file, target <code>CRM_CUSTOMERS</code>.</p>` } ],
    [ { title: 'Projection', body: `<p>In the flow editor, press the <b>Projection</b> button of the object and add the column with its value.</p>` } ],
    [ { title: 'Schedule', view: 'monitor:flows', target: '#mon-tabs', body: `<p>After the run: open the flow here and press <b>Schedule</b>.</p>` } ],
    [ { title: 'Check the table', view: 'builder:landing:RHN_IN', target: '#object-list', body: `<p>Open <code>CRM_CUSTOMERS</code>: a new column at the end.</p>` } ],
  ],
  'c03-m06': [
    [ { title: 'The failed run', view: 'monitor:flows', target: '#flow-list', body: `<p>Click <code>RHN_IN_RF_MDM</code>, then the failed run. Read the last message.</p>` } ],
    [ { title: 'Storage and unlock', view: 'spaces', target: '#space-list', body: `<p>Edit <code>RHN_IN</code>: used plus 6 GB. Save, then <b>Unlock</b>.</p>` } ],
    [ { title: 'Run again', view: 'monitor:flows', target: '#flow-list', body: `<p>Open the flow and press <b>Run</b>.</p>` } ],
    [ { title: 'The question', target: '#questions', body: `<p>What can you set up once so the next failure reaches you first?</p>` } ],
  ],
};
