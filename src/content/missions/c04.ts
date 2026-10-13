import type { Mission } from '../../missions/types';

/**
 * Chapter 4, Entry layer: profile the raw data with SQL before modeling anything.
 * Grouping, sums, filters, a first join. Played in a scratch SQL view in the Data Builder (no deploy needed).
 * Until 2026-10-09 this was chapter 0; old saves are migrated (c00-mN → c04-mN).
 * Numbers come from generator v1 (docs/DATA.md). Reference solutions are never shown to the player.
 */

const CALIN = { name: 'Calin Mucea', role: 'Senior Data Architect, your mentor', initials: 'CM' };
const CFO = { name: 'Petra Lindner', role: 'CFO, Stadtwerke Rheinau', initials: 'PL' };

export const CHAPTER_4: Mission[] = [
  {
    id: 'c04-m01',
    chapter: 4,
    title: 'Meet the raw data',
    from: CALIN,
    ticket: `<p>Before we model anything, we profile what IT loaded into our entry space. Raw data always has surprises.</p>
      <p>Start with the contracts: how many do we have per grid area? Something about the grid areas looks off to me. Tell me what you find.</p>`,
    tasks: [
      'In the <b>Data Builder</b>, open space <code>RHN_ENTRY</code> and create a <b>New SQL View</b>. It is a scratch view for profiling: no need to save or deploy it.',
      'Write a query that counts the contracts per grid area. Use Data Preview, and leave the query in the editor.',
      'Look at the grid areas you get back. Answer the two questions below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 5, text: 'Data Builder, space RHN_ENTRY, New SQL View. The Sources list on the left shows the tables you can read; a click inserts the name.' },
      { label: 'Hint 2: the concept', cost: 10, text: 'COUNT(*) counts rows. GROUP BY makes one group per distinct value. To see the source of a value, group by SRC_SYS_ID as well.' },
      { label: 'Hint 3: a skeleton', cost: 20, text: 'SELECT GRID_AREA, COUNT(*) AS ______ FROM RHN_ENTRY.______ GROUP BY ____;' },
    ],
    checks: [
      {
        type: 'result',
        label: 'Contracts per grid area',
        expected: 'SELECT GRID_AREA, COUNT(*) FROM RHN_ENTRY.BILLING_CONTRACTS GROUP BY GRID_AREA',
        diagnose: [
          {
            sql: 'SELECT GRID_AREA, SRC_SYS_ID, COUNT(*) FROM RHN_ENTRY.BILLING_CONTRACTS GROUP BY ALL',
            message: 'Grouping by source system as well was the right way to investigate. For the answer, group by the grid area only, so each value appears once.',
          },
          {
            sql: 'SELECT DISTINCT GRID_AREA FROM RHN_ENTRY.BILLING_CONTRACTS',
            message: 'You have every grid area once, but no count yet. Add COUNT(*) and a GROUP BY.',
          },
        ],
      },
      {
        type: 'question',
        id: 'source',
        label: 'Where the odd values come from',
        prompt: 'Which source system delivers the grid areas that do not fit?',
        options: ['S4U, the current billing system', 'LEGACY, the old billing system', 'MDM, the meter data system', 'The CRM export'],
        answer: 1,
        nudge: 'Not quite. Group by SRC_SYS_ID as well and look which system the odd spellings come from.',
      },
      {
        type: 'question',
        id: 'count',
        label: 'How many contracts are affected',
        prompt: 'How many contracts carry a grid area that does not match the codes NORTH, EAST, SOUTH, WEST exactly?',
        options: ['5', '86', '91', '1,178'],
        answer: 2,
        nudge: 'Not quite. Add up the counts of every value that is not exactly NORTH, EAST, SOUTH or WEST. Upper and lower case count.',
      },
    ],
    review: ['alias_aggregates'],
    xp: 20,
    realTenant: `In a real tenant you profile in the <b>Data Builder</b>: open a local table and use <b>Data Preview</b>, or write a <b>SQL View</b>
      and preview it without deploying. Teams with database access also use the SQL console of the space's database user.`,
    debrief: `<p>Good catch. The old billing system writes grid areas in German (Nord, Ost, Süd) and even "West" differs from "WEST" in case.
      That is 91 contracts that would fall out of every report by grid area.</p>
      <p>We will not fix this in the entry space. Raw data stays as it arrived. The clean-up comes later, in the data & semantic layer.</p>`,
  },
  {
    id: 'c04-m02',
    chapter: 4,
    title: 'Receivables at a glance',
    from: CFO,
    ticket: `<p>Hello, I am Petra Lindner, CFO. Calin tells me you can read our billing data now.</p>
      <p>For the board meeting I need a first overview: for each invoice status, how many invoices are there and what is their <b>gross amount</b> in total?
      Gross means net plus tax.</p>`,
    tasks: [
      'Look at <code>RHN_ENTRY.BILLING_INVOICES</code>. Find the status column and the two amount columns.',
      'Write a query with one row per status: the number of invoices and the total gross amount.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 5, text: 'Preview BILLING_INVOICES. STATUS has three values. NET_AMOUNT and TAX_AMOUNT hold the money.' },
      { label: 'Hint 2: the concept', cost: 10, text: 'SUM() adds up values per group, like COUNT(*) counts them. You can calculate inside it: SUM(a + b).' },
      { label: 'Hint 3: a skeleton', cost: 20, text: 'SELECT STATUS, COUNT(*) AS ______, SUM(______ + ______) AS ______ FROM RHN_ENTRY.BILLING_INVOICES GROUP BY ______;' },
    ],
    checks: [
      {
        type: 'result',
        label: 'Invoices and gross amount per status',
        expected: 'SELECT STATUS, COUNT(*), SUM(NET_AMOUNT + TAX_AMOUNT) FROM RHN_ENTRY.BILLING_INVOICES GROUP BY STATUS',
        diagnose: [
          {
            sql: 'SELECT STATUS, COUNT(*), SUM(NET_AMOUNT) FROM RHN_ENTRY.BILLING_INVOICES GROUP BY STATUS',
            message: 'Your totals are the net amounts. The CFO asked for gross: net plus tax.',
          },
          {
            sql: 'SELECT STATUS, COUNT(*), SUM(TAX_AMOUNT) FROM RHN_ENTRY.BILLING_INVOICES GROUP BY STATUS',
            message: 'Your totals are only the tax. The CFO asked for gross: net plus tax.',
          },
          {
            sql: 'SELECT STATUS, SUM(NET_AMOUNT + TAX_AMOUNT) FROM RHN_ENTRY.BILLING_INVOICES GROUP BY STATUS',
            message: 'The amounts are right. The number of invoices per status is still missing.',
          },
        ],
      },
      {
        type: 'question',
        id: 'unpaid',
        label: 'Unpaid gross amount',
        prompt: 'Roughly how much gross is not paid yet (open and overdue together)?',
        options: ['About 82 thousand EUR', 'About 968 thousand EUR', 'About 1.15 million EUR', 'About 4.8 million EUR'],
        answer: 2,
        nudge: 'Not quite. Add the gross totals of OPEN and OVERDUE from your result. Make sure you summed net plus tax.',
      },
    ],
    review: ['alias_aggregates', 'no_select_star'],
    xp: 25,
    realTenant: `In a real tenant this becomes a <b>Fact</b> view with measures such as <i>Gross Amount</i>, and the CFO reads it in an
      <b>Analytic Model</b> through SAP Analytics Cloud. You build that in chapters 6 and 7.`,
    debrief: `<p>Thank you, that is exactly what I needed. About 1.15 million EUR still unpaid, of which about 82 thousand EUR is overdue.</p>
      <p><i>Calin adds:</i> Notice you calculated gross in the query. Later we define it once as a measure, so every report uses the same formula.</p>`,
  },
  {
    id: 'c04-m03',
    chapter: 4,
    title: 'The overdue list',
    from: CFO,
    ticket: `<p>Receivables management wants to call the customers with the biggest overdue invoices first.</p>
      <p>Please give me the <b>10 overdue invoices with the highest gross amount</b>, biggest first. I need the invoice ID, the contract ID,
      the due date and the gross amount.</p>`,
    tasks: [
      'Keep only invoices with the status <code>OVERDUE</code>.',
      'Show invoice ID, contract ID, due date and gross amount (net plus tax).',
      'Sort by gross amount, biggest first, and keep only the first 10 rows.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 5, text: 'Everything is in BILLING_INVOICES. You need a filter, a calculated column, a sort and a limit.' },
      { label: 'Hint 2: the concept', cost: 10, text: "WHERE keeps matching rows (text in single quotes: 'OVERDUE'). ORDER BY ... DESC sorts biggest first. LIMIT 10 keeps the first 10 rows." },
      { label: 'Hint 3: a skeleton', cost: 20, text: "SELECT INVOICE_ID, ______, ______, ______ + ______ AS GROSS_AMOUNT FROM RHN_ENTRY.BILLING_INVOICES WHERE ______ = '______' ORDER BY ______ DESC LIMIT __;" },
    ],
    checks: [
      {
        type: 'result',
        label: 'Top 10 overdue invoices',
        ordered: true,
        expected: `SELECT INVOICE_ID, CONTRACT_ID, DUE_DATE, NET_AMOUNT + TAX_AMOUNT
          FROM RHN_ENTRY.BILLING_INVOICES WHERE STATUS = 'OVERDUE'
          ORDER BY NET_AMOUNT + TAX_AMOUNT DESC LIMIT 10`,
        diagnose: [
          {
            sql: `SELECT INVOICE_ID, CONTRACT_ID, DUE_DATE, NET_AMOUNT + TAX_AMOUNT FROM RHN_ENTRY.BILLING_INVOICES
              ORDER BY NET_AMOUNT + TAX_AMOUNT DESC LIMIT 10`,
            message: 'These are the biggest invoices overall, not only the overdue ones. Add a filter on STATUS.',
          },
          {
            sql: `SELECT INVOICE_ID, CONTRACT_ID, DUE_DATE, NET_AMOUNT FROM RHN_ENTRY.BILLING_INVOICES WHERE STATUS = 'OVERDUE'
              ORDER BY NET_AMOUNT DESC LIMIT 10`,
            message: 'You sorted and showed the net amount. The ticket asks for gross: net plus tax.',
          },
          {
            sql: `SELECT INVOICE_ID, CONTRACT_ID, DUE_DATE, NET_AMOUNT + TAX_AMOUNT FROM RHN_ENTRY.BILLING_INVOICES WHERE STATUS = 'OVERDUE'
              ORDER BY NET_AMOUNT + TAX_AMOUNT ASC LIMIT 10`,
            message: 'These are the 10 smallest overdue invoices. ORDER BY sorts ascending unless you add DESC.',
          },
        ],
      },
    ],
    review: ['no_select_star', 'alias_aggregates'],
    xp: 25,
    realTenant: `Lists like this are often consumed directly from a <b>SQL View</b> with an input parameter for the status.
      In the Data Builder, a SQL View can use <code>ORDER BY</code> and <code>LIMIT</code>, but in a shared model you leave sorting to the report.`,
    debrief: `<p>Perfect, receivables management starts calling tomorrow.</p>
      <p><i>Calin adds:</i> The biggest overdue invoice is from July 2024 and still unpaid. That is a question for the business, not for us,
      but a good data architect notices such things and passes them on.</p>`,
  },
  {
    id: 'c04-m04',
    chapter: 4,
    title: 'Contracts per region',
    from: CALIN,
    ticket: `<p>The two regional managers want their numbers soon. North looks after the grid areas NORTH and EAST, South after SOUTH and WEST.
      The mapping is in <code>RHN_ENTRY.GRID_AREAS</code>.</p>
      <p>Count the contracts per <b>region</b>. You need a join for that. Then compare your total with the number of contracts in the table. Do they match?</p>`,
    tasks: [
      'Preview <code>RHN_ENTRY.GRID_AREAS</code> and find the column that links it to the contracts.',
      'Join the contracts with the grid areas and count the contracts per region.',
      'Add up your counts, compare with the contracts table and answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 5, text: 'Both tables have a column GRID_AREA. GRID_AREAS adds the REGION for each grid area.' },
      { label: 'Hint 2: the concept', cost: 10, text: 'JOIN ... ON a.col = b.col puts matching rows side by side. Give each table a short alias (c, g). Then group by the region.' },
      { label: 'Hint 3: a skeleton', cost: 20, text: 'SELECT g.REGION, COUNT(*) AS ______ FROM RHN_ENTRY.BILLING_CONTRACTS c JOIN RHN_ENTRY.______ g ON c.______ = g.______ GROUP BY ______;' },
    ],
    checks: [
      {
        type: 'result',
        label: 'Contracts per region',
        expected: [
          `SELECT g.REGION, COUNT(*) FROM RHN_ENTRY.BILLING_CONTRACTS c
            JOIN RHN_ENTRY.GRID_AREAS g ON c.GRID_AREA = g.GRID_AREA GROUP BY g.REGION`,
          // A LEFT JOIN that shows the lost contracts as a NULL region is just as good.
          `SELECT g.REGION, COUNT(*) FROM RHN_ENTRY.BILLING_CONTRACTS c
            LEFT JOIN RHN_ENTRY.GRID_AREAS g ON c.GRID_AREA = g.GRID_AREA GROUP BY g.REGION`,
        ],
        diagnose: [
          {
            sql: `SELECT c.GRID_AREA, COUNT(*) FROM RHN_ENTRY.BILLING_CONTRACTS c
              JOIN RHN_ENTRY.GRID_AREAS g ON c.GRID_AREA = g.GRID_AREA GROUP BY c.GRID_AREA`,
            message: 'The join works, but you count per grid area. The regional managers need one row per region.',
          },
          {
            sql: 'SELECT g.REGION, COUNT(*) FROM RHN_ENTRY.BILLING_CONTRACTS c, RHN_ENTRY.GRID_AREAS g GROUP BY g.REGION',
            message: 'Each region has far too many contracts: every contract was paired with every grid area. The join needs a condition: ON c.GRID_AREA = g.GRID_AREA.',
          },
        ],
      },
      {
        type: 'question',
        id: 'lost',
        label: 'Why the total is lower',
        prompt: 'Your inner join counts 1,087 contracts, but the table has 1,178. What happened to the other 91?',
        options: [
          'They are ended contracts and drop out automatically',
          'Their grid area is written differently, so the join finds no partner and drops them',
          'The join counted some contracts twice, the table is wrong',
          'GRID_AREAS has no row for them because they are gas contracts',
        ],
        answer: 1,
        nudge: 'Not quite. Remember what you found in the first mission of this chapter about the grid area values of the legacy system.',
      },
    ],
    review: ['explicit_join', 'alias_aggregates', 'no_select_star'],
    xp: 30,
    realTenant: `In the Data Builder you join in a <b>SQL View</b> or graphically in a <b>Graphical View</b>. For reporting you would rather
      connect the fact to the grid area dimension with an <b>Association</b> (chapter 6).`,
    debrief: `<p>Exactly. An inner join silently drops rows without a partner. If we had built the regional report like this,
      91 legacy contracts would be missing and nobody would notice.</p>
      <p>That is the reason for a data & semantic layer: map the legacy codes once, centrally, and every report downstream is right.
      That is the next chapter.</p>`,
  },
];
