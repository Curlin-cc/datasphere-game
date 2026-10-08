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
        <p>We go through each step now.</p>`,
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
      body: `<p>Stuck? Hints help in three levels: a direction, the concept, then a skeleton of the query.</p>
        <p>Each hint costs XP, and you can only buy one when you have enough. With 0 XP they stay locked for now. That is fine:
        this tutorial already explained everything for this mission.</p>`,
    },
    {
      title: 'Check your solution',
      target: '.feedback',
      body: `<p>When you are done, you will check your solution here and get feedback plus XP.</p>
        <p>Automatic checks arrive with the next build. Until then, compare your result with the ticket yourself.</p>`,
    },
    {
      title: 'Your turn',
      body: `<p>Count the contracts per grid area and find out what is wrong with the grid areas.</p>
        <p>You can reopen this tutorial any time with <b>Show tutorial</b> in the mission panel.</p>`,
    },
  ],
};
