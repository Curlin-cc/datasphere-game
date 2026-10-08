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
};
