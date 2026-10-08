import type { TourStep } from '../tutorial';

/**
 * One tutorial per mission ID. It opens automatically the first time a mission starts
 * and can be reopened from the mission panel. Explains everything the mission needs,
 * but never shows the exact solution query.
 */
export const TUTORIALS: Record<string, TourStep[]> = {
  'c00-m01': [
    {
      title: 'Your first mission: Meet the raw data',
      body: `<p>This tutorial walks you through the mission step by step. Everything you need is explained here, and the tutorial is free.</p>
        <p>You start with <b>0 XP</b>. You earn XP by solving missions and can spend it later on hints.</p>`,
    },
    {
      title: 'The ticket',
      target: '.ticket',
      body: `<p>Work arrives as tickets. This one is from your mentor Calin Mucea.</p>
        <p>He wants to know <b>how many contracts exist per grid area</b>, and he suspects something about the grid areas is off.
        A ticket says what the business needs. How you build it is up to you.</p>`,
    },
    {
      title: 'Your task',
      target: '#task',
      body: `<p>The task breaks the ticket into steps. Work through them from top to bottom.</p>
        <p>Every step has a <b>Show me</b> button. It opens a quick tutorial with a few pop-ups for just that step.
        We go through all steps once now.</p>`,
    },
    {
      title: 'Step 1: Find the data',
      view: 'builder',
      target: '.objects',
      body: `<p>This is the <b>Repository</b> of the Data Builder. It lists every table and view, grouped by space.</p>
        <p><b>RHN_IN</b> is the <b>inbound space</b>. Raw data from the source systems lands here 1:1, without any business logic.
        The contracts are in <b>BILLING_CONTRACTS</b>. Clicking a table shows its first 100 rows.</p>`,
    },
    {
      title: 'Step 2: Write SQL',
      target: '#editor',
      body: `<p>This is the <b>SQL editor</b>. You address a table as <code>SPACE.TABLE</code>, for example <code>RHN_IN.BILLING_CONTRACTS</code>.
        Type <code>RHN_IN.</code> and the editor suggests tables and columns.</p>
        <p>To count rows per value, combine two things:</p>
        <ul>
          <li><code>COUNT(*)</code> counts rows.</li>
          <li><code>GROUP BY column</code> makes one group per distinct value, so <code>COUNT(*)</code> counts per group.</li>
        </ul>
        <p>Here is the pattern on a different table: customers per city.</p>`,
      example: `SELECT CITY, COUNT(*) AS CUSTOMERS
FROM RHN_IN.CRM_CUSTOMERS
GROUP BY CITY
ORDER BY CUSTOMERS DESC;`,
    },
    {
      title: 'Run the query',
      target: '#run',
      body: `<p><b>Run</b> executes everything in the editor. <b>Ctrl+Enter</b> does the same.</p>
        <p>Use the pattern from the previous step for the contracts and the column <code>GRID_AREA</code>.</p>`,
    },
    {
      title: 'Step 3: Read the result',
      target: '#results',
      body: `<p>The result appears here, with the number of rows on top.</p>
        <p>Look closely at the grid area values. Are they all spelled the same way? Then look at the column
        <code>SRC_SYS_ID</code>: it names the source system each row comes from. <b>S4U</b> is the current billing system.</p>
        <p>Where do the odd rows come from?</p>`,
    },
    {
      title: 'Hints',
      view: 'builder',
      target: '#hints',
      body: `<p>Hints come in three levels: a direction, the concept, then a skeleton of the query.</p>
        <p>In the first chapters all hints are <b>open for free</b>, so read them whenever you like.
        From chapter 2 only the first, vague hint is free. From chapter 5 there are no free hints:
        you buy them with XP you earned, and only if you have enough.</p>`,
    },
    {
      title: 'Answer the questions',
      target: '#questions',
      body: `<p>Some tickets ask what you found. Pick your answers here. They are saved right away.</p>`,
    },
    {
      title: 'Check your solution',
      target: '.feedback',
      body: `<p>When you are done, press <b>Check my solution</b>. The game runs the <b>last query in your editor</b> and compares its result
        with what the ticket needs. Column names and column order are up to you, only the result counts.</p>
        <p>You get feedback for each part, a review from Calin and XP when everything is right. Check as often as you like, it costs nothing.</p>`,
    },
    {
      title: 'Your turn',
      body: `<p>Count the contracts per grid area, find out what is wrong with the grid areas and answer the two questions.</p>
        <p>You can reopen this tutorial any time with <b>Show tutorial</b> in the mission panel.</p>`,
    },
  ],
  'c00-m02': [
    {
      title: 'A ticket from the CFO',
      target: '.ticket',
      body: `<p>Your first ticket from the business. Petra Lindner, the CFO, wants to know how much money sits in each invoice status.</p>
        <p>Business people speak in business terms. "Gross amount" is not a column, you have to calculate it: <b>net plus tax</b>.</p>`,
    },
    {
      title: 'The invoices',
      view: 'builder',
      target: '.objects',
      body: `<p>Invoices are in <b>RHN_IN.BILLING_INVOICES</b>. Preview it and find <code>STATUS</code>, <code>NET_AMOUNT</code> and <code>TAX_AMOUNT</code>.</p>
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
  'c00-m03': [
    {
      title: 'A list instead of a summary',
      target: '.ticket',
      body: `<p>This time the CFO does not want totals but single invoices: the 10 biggest overdue ones, biggest first.</p>
        <p>You need three new pieces of SQL: a <b>filter</b>, a <b>sort</b> and a <b>limit</b>.</p>`,
    },
    {
      title: 'Filter with WHERE',
      view: 'builder',
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
  'c00-m04': [
    {
      title: 'Data from two tables',
      target: '.ticket',
      body: `<p>The contracts know their grid area, but not the region. The region is in a second table, <b>RHN_IN.GRID_AREAS</b>.</p>
        <p>To bring both together you need a <b>join</b>.</p>`,
    },
    {
      title: 'How a join works',
      view: 'builder',
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
      body: `<p>This list shows every space with its storage and priority. Right now there is only <b>RHN_IN</b>, the inbound space.</p>
        <p>The layer column comes from the space ID: our convention ends inbound spaces in <code>_IN</code>, harmonization in <code>_HARM</code>, reporting in <code>_REP</code>.</p>`,
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
        <p>Use <b>Edit</b> in a row to change storage and priority. The space ID stays fixed.</p>`,
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
      title: 'The active space',
      view: 'builder',
      target: '#space-select',
      body: `<p>The Data Builder always works <b>in one space</b>. Choose it here; the top bar shows it too.</p>
        <p>The repository on the left lists the objects of that space, and below them the objects <b>shared with</b> it.
        Queries may only read those.</p>`,
    },
    {
      title: 'Sharing an object',
      target: '.objects',
      body: `<p>In the space an object belongs to, the share icon next to it opens the sharing dialog. Tick the spaces that may read it.</p>
        <p>A dot on the icon means the object is already shared somewhere.</p>`,
    },
    {
      title: 'Layers in order',
      body: `<p>The rule of the landscape: each layer reads from the layer directly below.</p>
        <p><b>RHN_IN</b> → shared with → <b>RHN_HARM</b> → shared with → <b>RHN_REP</b></p>
        <p>If reporting read inbound directly, the legacy grid areas from chapter 0 would land in the board's reports, uncleaned.</p>`,
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
};

/**
 * Quick tutorials: two or three pop-ups per task step, opened with "Show me" next to the step.
 * Index = position in the mission's task list.
 */
export const TASK_TOURS: Record<string, TourStep[][]> = {
  'c00-m01': [
    [
      {
        title: 'Find the contracts',
        view: 'builder',
        target: '.objects',
        body: `<p>The Repository lists everything in the tenant, grouped by space. Open <b>RHN_IN</b> and click <b>BILLING_CONTRACTS</b>.</p>`,
      },
      {
        title: 'What you see',
        target: '#results',
        body: `<p>The preview shows the first 100 rows. Each row is one supply contract: who, which <code>GRID_AREA</code>, which <code>TARIFF</code>,
          and in <code>SRC_SYS_ID</code> the system it came from.</p>`,
      },
    ],
    [
      {
        title: 'Count per value',
        view: 'builder',
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
        body: `<p>Swap in the contracts table and the column <code>GRID_AREA</code>, then press <b>Run</b> or <b>Ctrl+Enter</b>.</p>`,
      },
    ],
    [
      {
        title: 'Compare the values',
        view: 'builder',
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
  'c00-m02': [
    [
      {
        title: 'Find the invoices',
        view: 'builder',
        target: '.objects',
        body: `<p>Click <b>BILLING_INVOICES</b> in RHN_IN. Look for <code>STATUS</code> and the two amounts <code>NET_AMOUNT</code> and <code>TAX_AMOUNT</code>.</p>`,
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
        view: 'builder',
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
        view: 'builder',
        target: '#results',
        body: `<p>Not paid yet means OPEN and OVERDUE. Add their gross totals and pick the closest answer.</p>`,
      },
    ],
  ],
  'c00-m03': [
    [
      {
        title: 'Filter the rows',
        view: 'builder',
        target: '#editor',
        body: `<p><code>WHERE STATUS = '…'</code> keeps one status. Write the value exactly as in the data, in single quotes.</p>`,
      },
    ],
    [
      {
        title: 'Pick the columns',
        view: 'builder',
        target: '#editor',
        body: `<p>List four columns after <code>SELECT</code>. The fourth is a calculation: net plus tax. Name it with <code>AS</code>.</p>`,
      },
    ],
    [
      {
        title: 'Sort and cut',
        view: 'builder',
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
  'c00-m04': [
    [
      {
        title: 'The mapping table',
        view: 'builder',
        target: '.objects',
        body: `<p>Click <b>GRID_AREAS</b>. Four rows: each grid area with its name and <code>REGION</code>. Which column also exists in the contracts?</p>`,
      },
    ],
    [
      {
        title: 'Join and group',
        view: 'builder',
        target: '#editor',
        body: `<p><code>FROM contracts c JOIN grid_areas g ON c.… = g.…</code>, then <code>GROUP BY g.REGION</code> and count.</p>`,
      },
    ],
    [
      {
        title: 'Compare totals',
        view: 'builder',
        target: '#results',
        body: `<p>Add up the two regions. Then count all contracts with <code>SELECT COUNT(*) FROM RHN_IN.BILLING_CONTRACTS</code>. Run it, look, then put your region query back as the last statement before you check.</p>`,
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
      { title: 'Check the list', target: '#space-list', body: `<p>The layer column should now show Inbound, Harmonization and Reporting.</p>` },
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
      { title: 'Edit a space', view: 'spaces', target: '#space-list', body: `<p>Press <b>Edit</b> in the RHN_HARM row. The form shows how much is still free in the tenant.</p>` },
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
      { title: 'Switch space', view: 'builder', target: '#space-select', body: `<p>Choose <b>RHN_HARM</b>. The repository is empty: nothing lives there yet.</p>` },
      { title: 'Try it', target: '#editor', body: `<p>Run <code>SELECT * FROM RHN_IN.BILLING_CONTRACTS</code> and read the message in the result area.</p>` },
    ],
    [
      { title: 'Back to inbound', view: 'builder', target: '#space-select', body: `<p>Switch to <b>RHN_IN</b>. Objects are shared from the space they belong to.</p>` },
      { title: 'Share', target: '.objects', body: `<p>Click the share icon next to BILLING_CONTRACTS and tick RHN_HARM. Then the same for GRID_AREAS.</p>` },
    ],
    [
      { title: 'Count from harmonization', view: 'builder', target: '#space-select', body: `<p>Switch to RHN_HARM again. The two tables now appear under "Shared with RHN_HARM".</p>` },
      { title: 'Your join', target: '#editor', body: `<p>Write the region count from chapter 0 and run it here. Leave it in the editor for the check.</p>` },
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
};
