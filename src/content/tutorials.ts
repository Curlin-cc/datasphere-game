import type { TourStep } from '../tutorial';
import { GUIDED_INTROS, GUIDED_TOURS } from './guided';

/**
 * One tutorial per mission ID. It opens automatically the first time a mission starts
 * and can be reopened from the mission panel. Explains everything the mission needs,
 * but never shows the exact solution query.
 */
export const TUTORIALS: Record<string, TourStep[]> = {
  ...GUIDED_INTROS,
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
};

/**
 * Quick tutorials: two or three pop-ups per task step, opened with "Show me" next to the step.
 * Index = position in the mission's task list.
 */
export const TASK_TOURS: Record<string, TourStep[][]> = {
  ...GUIDED_TOURS,
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
};
