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
};
