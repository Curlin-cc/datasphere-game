import type { Mission, RuleContext } from '../../missions/types';
import { isShared } from '../../tenant';
import { readsFrom } from '../../repo';

/**
 * Chapter 5, Harmonization. The player builds deployed SQL views in RHN_HARM on shared inbound tables:
 * map legacy codes, replace legacy customer keys, merge CRM duplicates, convert MWh and drop duplicate readings,
 * then share the result with reporting. Handbuch 6.5.2 (SQL views), 6.11.2 (impact and lineage), 6.11.4 (sharing).
 *
 * Checks read the deployed views (result checks with `object`), so Save without Deploy does not count.
 * Numbers come from generator v1 (docs/DATA.md), checked with DuckDB on 2026-10-09. Reference SQL is never shown.
 */

const CALIN = { name: 'Calin Mucea', role: 'Senior Data Architect, your mentor', initials: 'CM' };
const CFO = { name: 'Petra Lindner', role: 'CFO, Stadtwerke Rheinau', initials: 'PL' };
const FRANK = { name: 'Frank Weber', role: 'Receivables management', initials: 'FW' };

const CONTRACTS = 'RHN_HARM.RHN_HA_V_CONTRACTS';
const CUSTOMERS = 'RHN_HARM.RHN_HA_V_CUSTOMERS';
const READINGS = 'RHN_HARM.RHN_HA_V_METER_READINGS';

// ---------------------------------------------------------------- reference logic (never shown)

const GRID_CASE = `CASE c.GRID_AREA WHEN 'Nord' THEN 'NORTH' WHEN 'Ost' THEN 'EAST' WHEN 'Süd' THEN 'SOUTH' WHEN 'West' THEN 'WEST' ELSE c.GRID_AREA END`;
const TARIFF_CASE = `CASE c.TARIFF WHEN 'STROM_BASIS' THEN 'POWER_BASIC' WHEN 'STROM_OEKO' THEN 'POWER_GREEN'
  WHEN 'STROM_WAERME' THEN 'POWER_HEAT' WHEN 'GAS_KOMFORT' THEN 'GAS_COMFORT' ELSE c.TARIFF END`;

/** Contracts with one code per grid area and tariff (mission 1). */
const REF_CONTRACTS_CODES = `SELECT c.CONTRACT_ID, c.CUSTOMER_ID, ${GRID_CASE} AS GRID_AREA, ${TARIFF_CASE} AS TARIFF,
  c.START_DATE, c.END_DATE, c.SRC_SYS_ID FROM RHN_IN.BILLING_CONTRACTS c`;

/** Contracts with CRM customer IDs (mission 2). */
const REF_CONTRACTS_KEYS = `SELECT c.CONTRACT_ID, COALESCE(m.CUSTOMER_ID, c.CUSTOMER_ID) AS CUSTOMER_ID, m.LEGACY_CUSTOMER_ID,
  ${GRID_CASE} AS GRID_AREA, ${TARIFF_CASE} AS TARIFF, c.START_DATE, c.END_DATE, c.SRC_SYS_ID
  FROM RHN_IN.BILLING_CONTRACTS c LEFT JOIN RHN_IN.LEGACY_CUSTOMER_MAP m ON c.CUSTOMER_ID = m.LEGACY_CUSTOMER_ID`;

/** One row per person, the oldest record wins (mission 3). A person = same e-mail (any case) at the same address. */
export const refCustomers = (order: 'ASC' | 'DESC' = 'ASC', partition = 'lower(EMAIL), STREET, ZIP') => `
  SELECT CUSTOMER_ID, trim(NAME) AS NAME, STREET, ZIP, CITY, lower(EMAIL) AS EMAIL FROM (
    SELECT k.*, ROW_NUMBER() OVER (PARTITION BY ${partition} ORDER BY CREATED_AT ${order}) AS RN FROM RHN_IN.CRM_CUSTOMERS k
  ) x WHERE RN = 1`;

/** Readings without duplicates, all in kWh (mission 4). */
const REF_READINGS = `SELECT DISTINCT METER_ID, CONTRACT_ID, READING_DATE,
  CASE WHEN UNIT = 'MWh' THEN VALUE * 1000 ELSE VALUE END AS CONSUMPTION_KWH, SRC_SYS_ID FROM RHN_IN.METER_READINGS`;

export const project = (cols: string[], sql: string) => `SELECT ${cols.join(', ')} FROM (${sql}) ref`;

// ---------------------------------------------------------------- rule helpers

const shared = (ctx: RuleContext, objects: string[], to: string, owner = 'RHN_IN') => {
  const missing = objects.filter((o) => !isShared(ctx.tenant, `${owner}.${o}`, to));
  return missing.length ? `Not shared with ${to} yet: ${missing.join(', ')}. Share ${missing.length > 1 ? 'them' : 'it'} from ${owner} with the share icon in the object list.` : null;
};

/** Views in RHN_HARM other than `keep` that read `source`: a second copy of logic that should exist once. */
function secondCopy(ctx: RuleContext, keep: string, source: string): string | null {
  const copies = ctx.tenant.objects.filter(
    (o) => o.space === 'RHN_HARM' && o.kind === 'SQL View' && `${o.space}.${o.name}` !== keep && readsFrom(o, ctx.tenant).includes(source),
  );
  return copies.length
    ? `${copies.map((o) => o.name).join(', ')} also read${copies.length > 1 ? '' : 's'} ${source}. The logic belongs in ${keep.split('.')[1]} only: change that view and delete the copy, so there is one version of the truth.`
    : null;
}

// ---------------------------------------------------------------- missions

const M01_COLS = ['CONTRACT_ID', 'GRID_AREA', 'TARIFF', 'START_DATE', 'END_DATE', 'SRC_SYS_ID'];
const M02_COLS = ['CONTRACT_ID', 'CUSTOMER_ID', 'LEGACY_CUSTOMER_ID', 'GRID_AREA', 'TARIFF', 'SRC_SYS_ID'];
export const M03_COLS = ['CUSTOMER_ID', 'NAME', 'STREET', 'ZIP', 'CITY', 'EMAIL'];
const M04_COLS = ['METER_ID', 'CONTRACT_ID', 'READING_DATE', 'CONSUMPTION_KWH', 'SRC_SYS_ID'];

export const CHAPTER_5: Mission[] = [
  {
    id: 'c05-m01',
    chapter: 5,
    title: 'Speak one language',
    from: CALIN,
    ticket: `<p>Remember the 91 legacy contracts that fell out of the regional count? Time to fix that, in the right place.</p>
      <p>Build the central contracts view of our harmonization layer: <code>RHN_HA_V_CONTRACTS</code> in <code>RHN_HARM</code>.
      It returns <b>every</b> contract, with the columns <code>CONTRACT_ID</code>, <code>CUSTOMER_ID</code>, <code>GRID_AREA</code>,
      <code>TARIFF</code>, <code>START_DATE</code>, <code>END_DATE</code> and <code>SRC_SYS_ID</code>.</p>
      <p>The legacy system uses German grid areas and its own tariff codes. In our view, every contract carries the S/4 codes:</p>
      <ul>
        <li>Grid areas <code>Nord</code>, <code>Ost</code>, <code>Süd</code>, <code>West</code> → <code>NORTH</code>, <code>EAST</code>, <code>SOUTH</code>, <code>WEST</code></li>
        <li>Tariffs <code>STROM_BASIS</code> → <code>POWER_BASIC</code>, <code>STROM_OEKO</code> → <code>POWER_GREEN</code>,
          <code>STROM_WAERME</code> → <code>POWER_HEAT</code>, <code>GAS_KOMFORT</code> → <code>GAS_COMFORT</code>; <code>GAS_FLEX</code> stays</li>
      </ul>
      <p>Customer IDs stay as they are for now; that is the next ticket.</p>`,
    tasks: [
      'In the Data Builder of <code>RHN_HARM</code>, check under "Shared with RHN_HARM" that <code>BILLING_CONTRACTS</code> is there.',
      'Create a <b>New SQL View</b> in <code>RHN_HARM</code>. Write the SELECT with the mapping and look at it in the Data Preview.',
      'Give it the technical name <code>RHN_HA_V_CONTRACTS</code> and a business name, then <b>Save</b> and <b>Deploy</b>.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Data Builder, space RHN_HARM, New SQL View. BILLING_CONTRACTS is in the Sources list under Shared Objects; a click inserts RHN_IN.BILLING_CONTRACTS.' },
      { label: 'Hint 2: the concept', cost: 15, text: "CASE column WHEN 'old' THEN 'new' … ELSE column END translates values; without ELSE every value you did not list becomes NULL. Name the result with AS so the column keeps its name." },
      { label: 'Hint 3: a skeleton', cost: 25, text: "SELECT CONTRACT_ID, CUSTOMER_ID, CASE GRID_AREA WHEN 'Nord' THEN 'NORTH' WHEN ____ THEN ____ … ELSE GRID_AREA END AS GRID_AREA, CASE TARIFF WHEN ____ THEN ____ … ELSE ____ END AS ______, START_DATE, END_DATE, SRC_SYS_ID FROM RHN_IN.BILLING_CONTRACTS" },
    ],
    checks: [
      { type: 'structure', label: 'The view and its columns', space: 'RHN_HARM', object: 'RHN_HA_V_CONTRACTS', kind: 'View',
        columns: ['CONTRACT_ID', 'CUSTOMER_ID', 'GRID_AREA', 'TARIFF', 'START_DATE', 'END_DATE', 'SRC_SYS_ID'] },
      {
        type: 'result',
        label: 'Every contract with S/4 codes',
        object: CONTRACTS,
        columns: M01_COLS,
        expected: project(M01_COLS, REF_CONTRACTS_CODES),
        counts: {
          1087: 'Only the S4U contracts are in your view. The 91 legacy contracts must stay; translate their codes instead of filtering them out.',
          91: 'Only the legacy contracts are in your view. It must hold every contract, from both source systems.',
        },
        diagnose: [
          {
            sql: project(M01_COLS, `SELECT c.CONTRACT_ID, ${GRID_CASE} AS GRID_AREA, c.TARIFF, c.START_DATE, c.END_DATE, c.SRC_SYS_ID FROM RHN_IN.BILLING_CONTRACTS c`),
            message: 'The grid areas are right. The legacy tariff codes (STROM_BASIS, …) are not translated yet.',
          },
          {
            sql: project(M01_COLS, `SELECT c.CONTRACT_ID, c.GRID_AREA, ${TARIFF_CASE} AS TARIFF, c.START_DATE, c.END_DATE, c.SRC_SYS_ID FROM RHN_IN.BILLING_CONTRACTS c`),
            message: 'The tariffs are right. The German grid areas (Nord, Ost, …) are not translated yet.',
          },
          {
            sql: project(M01_COLS, `SELECT c.CONTRACT_ID, CASE c.GRID_AREA WHEN 'Nord' THEN 'NORTH' WHEN 'Ost' THEN 'EAST' WHEN 'Süd' THEN 'SOUTH' ELSE c.GRID_AREA END AS GRID_AREA,
              ${TARIFF_CASE} AS TARIFF, c.START_DATE, c.END_DATE, c.SRC_SYS_ID FROM RHN_IN.BILLING_CONTRACTS c`),
            message: 'Almost. Some legacy contracts still say "West": it only differs from WEST in upper and lower case, but for a join that is a different value.',
          },
          {
            sql: project(M01_COLS, `SELECT c.CONTRACT_ID, CASE c.GRID_AREA WHEN 'Nord' THEN 'NORTH' WHEN 'Ost' THEN 'EAST' WHEN 'Süd' THEN 'SOUTH' WHEN 'West' THEN 'WEST' END AS GRID_AREA,
              CASE c.TARIFF WHEN 'STROM_BASIS' THEN 'POWER_BASIC' WHEN 'STROM_OEKO' THEN 'POWER_GREEN' WHEN 'STROM_WAERME' THEN 'POWER_HEAT' WHEN 'GAS_KOMFORT' THEN 'GAS_COMFORT' END AS TARIFF,
              c.START_DATE, c.END_DATE, c.SRC_SYS_ID FROM RHN_IN.BILLING_CONTRACTS c`),
            message: 'Your legacy codes are translated, but the S4U contracts lost their grid area and tariff: a CASE without ELSE returns NULL for every value you did not list.',
          },
          {
            sql: project(M01_COLS, `SELECT c.CONTRACT_ID, upper(c.GRID_AREA) AS GRID_AREA, ${TARIFF_CASE} AS TARIFF, c.START_DATE, c.END_DATE, c.SRC_SYS_ID FROM RHN_IN.BILLING_CONTRACTS c`),
            message: 'Upper case fixes "West", but turns Nord into NORD and Süd into SÜD, which are still not S/4 codes. Translate each value.',
          },
        ],
      },
      {
        type: 'metric',
        label: 'Every contract finds its grid area and tariff',
        sql: `SELECT count(*) FROM ${CONTRACTS} c LEFT JOIN RHN_IN.GRID_AREAS g ON c.GRID_AREA = g.GRID_AREA
          LEFT JOIN RHN_IN.TARIFFS t ON c.TARIFF = t.TARIFF WHERE g.GRID_AREA IS NULL OR t.TARIFF IS NULL`,
        missing: 'Deploy RHN_HA_V_CONTRACTS in RHN_HARM first.',
        ok: 'All 1,178 contracts join to GRID_AREAS and TARIFFS. No contract falls out of a report by region or tariff any more.',
        test: (n) => (n ? `${n} contracts still have a grid area or tariff that is not in GRID_AREAS or TARIFFS. Preview your view grouped by GRID_AREA and TARIFF.` : null),
      },
      {
        type: 'question',
        id: 'where',
        label: 'Why harmonization',
        prompt: 'Why do we translate the codes in a view in RHN_HARM, instead of correcting the values in RHN_IN.BILLING_CONTRACTS?',
        options: [
          'Tables in the inbound space cannot be changed at all',
          'Inbound keeps what the source sent, so every load can be traced and repeated; the mapping lives once in harmonization, and everything built on the view gets the same codes',
          'Views are always faster than tables',
          'The legacy system will be switched off next week anyway',
        ],
        answer: 1,
        nudge: 'Not quite. Think about the next load from the legacy system, and about how many reports would need the mapping otherwise.',
      },
    ],
    review: ['case_else', 'no_select_star', 'explicit_join'],
    xp: 35,
    realTenant: `In a real tenant: <b>Data Builder</b> → space of the harmonization layer → <b>New SQL View</b>. Shared inbound tables are in the
      source browser under <b>Shared Objects</b>. Larger mappings usually live in a small <b>mapping table</b> (uploaded from CSV and joined),
      so the business can maintain them without changing SQL.`,
    debrief: `<p>That is the heart of harmonization: the raw data stays untouched, and one view speaks one language.
      Every report built on <code>RHN_HA_V_CONTRACTS</code> now counts all 1,178 contracts by region and tariff.</p>
      <p>A tip for real projects: once there are more than a handful of codes, put them into a mapping table instead of a long CASE.
      Same idea, but the business can maintain it.</p>`,
  },
  {
    id: 'c05-m02',
    chapter: 5,
    title: 'One customer, one key',
    from: FRANK,
    ticket: `<p>Hi, Frank from receivables management. When I look up the customer of a legacy contract, I find nothing:
      their customer numbers look like <code>OLD-0710</code>, and the CRM does not know them.</p>
      <p>IT maintains a key mapping in <code>RHN_IN.LEGACY_CUSTOMER_MAP</code>: old number → CRM customer ID.</p>
      <p><i>Calin adds:</i> Do not build a second view. Change <code>RHN_HA_V_CONTRACTS</code> itself, so everything that uses it gets the fix.
      <code>CUSTOMER_ID</code> becomes the CRM ID for <b>every</b> contract. Keep the old number in a new column <code>LEGACY_CUSTOMER_ID</code>
      (empty for S4U contracts), so we can always trace where a key came from.</p>`,
    tasks: [
      'In <code>RHN_IN</code>, share <code>LEGACY_CUSTOMER_MAP</code> with <code>RHN_HARM</code>.',
      'In <code>RHN_HARM</code>, open <code>RHN_HA_V_CONTRACTS</code>. Look at <b>Impact and Lineage</b> in the properties: what does it read, who uses it?',
      'Change the SQL: join the key mapping, set <code>CUSTOMER_ID</code> and add <code>LEGACY_CUSTOMER_ID</code>. Check the Data Preview.',
      '<b>Save</b> (watch the status) and <b>Deploy</b>. Then answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Share in RHN_IN with the share icon. Then open RHN_HA_V_CONTRACTS from the object list of RHN_HARM and edit its SQL.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'A LEFT JOIN keeps every contract, also those without a partner in the mapping; their mapping columns are NULL. COALESCE(a, b) takes a, or b if a is NULL.' },
      { label: 'Hint 3: a skeleton', cost: 25, text: 'SELECT c.CONTRACT_ID, COALESCE(m.______, c.CUSTOMER_ID) AS CUSTOMER_ID, m.______ AS LEGACY_CUSTOMER_ID, … FROM RHN_IN.BILLING_CONTRACTS c LEFT JOIN RHN_IN.LEGACY_CUSTOMER_MAP m ON c.______ = m.______' },
    ],
    checks: [
      {
        type: 'rule',
        label: 'Key mapping shared with harmonization',
        ok: 'LEGACY_CUSTOMER_MAP is shared with RHN_HARM.',
        test: (ctx) => shared(ctx, ['LEGACY_CUSTOMER_MAP'], 'RHN_HARM'),
      },
      {
        type: 'result',
        label: 'CRM customer IDs for every contract',
        object: CONTRACTS,
        columns: M02_COLS,
        expected: project(M02_COLS, REF_CONTRACTS_KEYS),
        counts: {
          91: 'Only the 91 legacy contracts are left. An inner JOIN drops every contract without a partner in the mapping, so all S4U contracts are gone. Use a LEFT JOIN.',
        },
        diagnose: [
          {
            sql: project(M02_COLS, `SELECT c.CONTRACT_ID, m.CUSTOMER_ID, m.LEGACY_CUSTOMER_ID, ${GRID_CASE} AS GRID_AREA, ${TARIFF_CASE} AS TARIFF, c.SRC_SYS_ID
              FROM RHN_IN.BILLING_CONTRACTS c LEFT JOIN RHN_IN.LEGACY_CUSTOMER_MAP m ON c.CUSTOMER_ID = m.LEGACY_CUSTOMER_ID`),
            message: 'The legacy contracts have their CRM IDs now, but the S4U contracts lost theirs: the mapping has no row for them, so its column is NULL. Fall back to the original ID.',
          },
          {
            sql: project(M02_COLS, `SELECT c.CONTRACT_ID, COALESCE(m.CUSTOMER_ID, c.CUSTOMER_ID) AS CUSTOMER_ID, c.CUSTOMER_ID AS LEGACY_CUSTOMER_ID, ${GRID_CASE} AS GRID_AREA, ${TARIFF_CASE} AS TARIFF, c.SRC_SYS_ID
              FROM RHN_IN.BILLING_CONTRACTS c LEFT JOIN RHN_IN.LEGACY_CUSTOMER_MAP m ON c.CUSTOMER_ID = m.LEGACY_CUSTOMER_ID`),
            message: 'CUSTOMER_ID is right. LEGACY_CUSTOMER_ID should only hold an old OLD-… number, and stay empty (NULL) for S4U contracts.',
          },
          {
            sql: project(M02_COLS, `SELECT c.CONTRACT_ID, c.CUSTOMER_ID, m.LEGACY_CUSTOMER_ID, ${GRID_CASE} AS GRID_AREA, ${TARIFF_CASE} AS TARIFF, c.SRC_SYS_ID
              FROM RHN_IN.BILLING_CONTRACTS c LEFT JOIN RHN_IN.LEGACY_CUSTOMER_MAP m ON c.CUSTOMER_ID = m.LEGACY_CUSTOMER_ID`),
            message: 'LEGACY_CUSTOMER_ID is right, but CUSTOMER_ID still holds the OLD-… numbers for legacy contracts. Take the CRM ID from the mapping.',
          },
          {
            sql: project(M02_COLS, `SELECT c.CONTRACT_ID, COALESCE(m.CUSTOMER_ID, c.CUSTOMER_ID) AS CUSTOMER_ID, m.LEGACY_CUSTOMER_ID, c.GRID_AREA, c.TARIFF, c.SRC_SYS_ID
              FROM RHN_IN.BILLING_CONTRACTS c LEFT JOIN RHN_IN.LEGACY_CUSTOMER_MAP m ON c.CUSTOMER_ID = m.LEGACY_CUSTOMER_ID`),
            message: 'The customer keys are right, but the grid areas and tariffs are raw again. Keep the mapping from the last mission when you change the view.',
          },
        ],
      },
      {
        type: 'metric',
        label: 'Every contract finds its customer in the CRM',
        sql: `SELECT count(*) FROM ${CONTRACTS} c LEFT JOIN RHN_IN.CRM_CUSTOMERS k ON c.CUSTOMER_ID = k.CUSTOMER_ID WHERE k.CUSTOMER_ID IS NULL`,
        missing: 'Deploy RHN_HA_V_CONTRACTS in RHN_HARM first.',
        ok: 'No contract without a customer any more.',
        test: (n) => (n ? `${n} contracts still have a customer ID the CRM does not know.` : null),
      },
      {
        type: 'rule',
        label: 'One central contracts view',
        ok: 'The fix is in RHN_HA_V_CONTRACTS, the only contracts view.',
        test: (ctx) => secondCopy(ctx, CONTRACTS, 'RHN_IN.BILLING_CONTRACTS'),
      },
      {
        type: 'question',
        id: 'orphans',
        label: 'Contracts without a customer before',
        prompt: 'Before your change, how many contracts had a customer ID that the CRM did not know?',
        options: ['0', '46', '69', '91'],
        answer: 3,
        nudge: 'Not quite. Count contracts, not customers: one legacy customer can have a power and a gas contract.',
      },
    ],
    review: ['case_else', 'no_select_star', 'explicit_join'],
    xp: 35,
    realTenant: `In a real tenant you open the deployed view, change it, <b>Save</b> (status <i>Changes to Deploy</i>) and <b>Deploy</b>.
      Before you deploy a change to a view others build on, open <b>Impact and Lineage Analysis</b> in the toolbar: it shows every object
      upstream and downstream, also in other spaces.`,
    debrief: `<p>Thanks! I can now find the customer for every contract, also the old ones.</p>
      <p><i>Calin adds:</i> Did you notice? You changed the view, and its technical name and everything built on it stayed the same.
      Consumers just get better data with the next deploy. That is why we keep one central view per business object.</p>`,
  },
  {
    id: 'c05-m03',
    chapter: 5,
    title: 'Duplicates in the CRM',
    from: CALIN,
    ticket: `<p>The CRM export has <b>946</b> records, but we do not have 946 customers. The call centre creates people a second time:
      a new customer ID, sometimes a typo in the name, the e-mail in capitals.</p>
      <p>Build <code>RHN_HA_V_CUSTOMERS</code> in <code>RHN_HARM</code>: <b>one row per person</b>, with the columns <code>CUSTOMER_ID</code>,
      <code>NAME</code>, <code>STREET</code>, <code>ZIP</code>, <code>CITY</code>, <code>EMAIL</code>.</p>
      <ul>
        <li>A duplicate has the same e-mail address (ignoring upper and lower case) <b>and</b> the same address. Careful: e-mail alone is not enough,
          check it in the data.</li>
        <li>Keep the <b>oldest</b> record of a person (earliest <code>CREATED_AT</code>): that is the ID the contracts use.</li>
        <li>Names without leading or trailing spaces, e-mails in lower case.</li>
      </ul>`,
    tasks: [
      'Share <code>CRM_CUSTOMERS</code> with <code>RHN_HARM</code>.',
      'In a new SQL view in <code>RHN_HARM</code>, find the duplicates first: group by the e-mail in lower case and look at the groups with more than one record.',
      'Write the view that keeps one record per person, then save it as <code>RHN_HA_V_CUSTOMERS</code> and deploy.',
      'Answer the questions below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'GROUP BY lower(EMAIL) HAVING COUNT(*) > 1 shows the groups. Compare STREET within each group: are they always the same person?' },
      { label: 'Hint 2: the concept', cost: 15, text: 'ROW_NUMBER() OVER (PARTITION BY … ORDER BY CREATED_AT) numbers the records of each person, oldest first. Number them in a subquery, then keep the rows with number 1 outside.' },
      { label: 'Hint 3: a skeleton', cost: 25, text: 'SELECT CUSTOMER_ID, trim(NAME) AS NAME, …, lower(EMAIL) AS EMAIL FROM (SELECT k.*, ROW_NUMBER() OVER (PARTITION BY lower(EMAIL), ______, ______ ORDER BY ______) AS RN FROM RHN_IN.CRM_CUSTOMERS k) x WHERE RN = 1' },
    ],
    checks: [
      {
        type: 'rule',
        label: 'CRM shared with harmonization',
        ok: 'CRM_CUSTOMERS is shared with RHN_HARM.',
        test: (ctx) => shared(ctx, ['CRM_CUSTOMERS'], 'RHN_HARM'),
      },
      {
        type: 'result',
        label: 'One row per person',
        object: CUSTOMERS,
        columns: M03_COLS,
        expected: project(M03_COLS, refCustomers()),
        counts: {
          946: 'All 946 records are still there. Each person must appear once.',
          897: 'Your view has 897 rows, 3 too few. Three pairs of different people share an e-mail address: namesakes in different streets. A duplicate also has the same address.',
        },
        diagnose: [
          {
            sql: project(M03_COLS, refCustomers('DESC')),
            message: 'One row per person, but you kept the newest record. The contracts refer to the oldest customer ID, so keep the earliest CREATED_AT.',
          },
          {
            sql: project(M03_COLS, refCustomers().replace('trim(NAME) AS NAME', 'NAME')),
            message: 'The right people with the right IDs. Some names still start with a space: trim them.',
          },
        ],
      },
      {
        type: 'metric',
        label: 'Every contract finds its customer',
        sql: `SELECT count(*) FROM ${CONTRACTS} c LEFT JOIN ${CUSTOMERS} k ON c.CUSTOMER_ID = k.CUSTOMER_ID WHERE k.CUSTOMER_ID IS NULL`,
        missing: 'Deploy RHN_HA_V_CUSTOMERS (and RHN_HA_V_CONTRACTS from the last missions) in RHN_HARM first.',
        ok: 'All 1,178 contracts find their customer in RHN_HA_V_CUSTOMERS.',
        test: (n) => (n ? `${n} contracts point to a customer ID that is not in your view. Check which record of a person you keep, and that you do not merge different people.` : null),
      },
      {
        type: 'question',
        id: 'removed',
        label: 'Records merged',
        prompt: 'How many duplicate records did your view remove?',
        options: ['3', '46', '49', '900'],
        answer: 1,
        nudge: 'Not quite. Compare the rows of the CRM export with the rows of your view.',
      },
      {
        type: 'question',
        id: 'source',
        label: 'Where the real fix belongs',
        prompt: 'Why do we not simply delete the duplicates in RHN_IN.CRM_CUSTOMERS?',
        options: [
          'Deleting rows is not allowed in SAP Datasphere',
          'The next load from the CRM would bring them back. Inbound stays as delivered, harmonization cleans what we report on, and the CRM team gets the list to fix the source',
          'The duplicates do not hurt any report',
          'Only the DW Administrator can delete rows',
        ],
        answer: 1,
        nudge: 'Not quite. Think about what happens with the next CRM export.',
      },
    ],
    review: ['no_select_star', 'explicit_join'],
    xp: 40,
    realTenant: `SAP HANA supports window functions such as <code>ROW_NUMBER() OVER (PARTITION BY … ORDER BY …)</code> in SQL views.
      For fuzzy matching (typos, different spellings) Datasphere offers <b>Intelligent Lookup</b> in the Data Builder; the business confirms
      uncertain matches there. Exact rules like ours stay in SQL.`,
    debrief: `<p>900 customers, and every contract finds its customer. You also avoided the trap: an e-mail alone would have merged three pairs of namesakes,
      and two contracts would have lost their customer.</p>
      <p>I sent the list of duplicates to the CRM team. Harmonization fixes our copy; the source has to be fixed at the source.</p>`,
  },
  {
    id: 'c05-m04',
    chapter: 5,
    title: 'Everything in kWh',
    from: CALIN,
    ticket: `<p>The meter readings have two problems you found in chapter 4: some gas meters report in <b>MWh</b>, and an interface hiccup sent some readings <b>twice</b>.</p>
      <p>Build <code>RHN_HA_V_METER_READINGS</code> in <code>RHN_HARM</code> with the columns <code>METER_ID</code>, <code>CONTRACT_ID</code>,
      <code>READING_DATE</code>, <code>CONSUMPTION_KWH</code> and <code>SRC_SYS_ID</code>:</p>
      <ul>
        <li>every reading exactly once,</li>
        <li><code>CONSUMPTION_KWH</code> always in kWh (1 MWh = 1,000 kWh). The column name says the unit, so the unit column is not needed any more.</li>
      </ul>`,
    tasks: [
      'Share <code>METER_READINGS</code> with <code>RHN_HARM</code>.',
      'In a new SQL view in <code>RHN_HARM</code>, convert the values to kWh and remove the duplicate rows. Check the row count in the Data Preview.',
      'Save as <code>RHN_HA_V_METER_READINGS</code> and deploy.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'UNIT tells you how to read VALUE. The duplicates are exact copies: every column is the same.' },
      { label: 'Hint 2: the concept', cost: 15, text: "SELECT DISTINCT returns each different row once. CASE WHEN UNIT = 'MWh' THEN … ELSE … END converts per row." },
      { label: 'Hint 3: a skeleton', cost: 25, text: "SELECT DISTINCT METER_ID, CONTRACT_ID, READING_DATE, CASE WHEN UNIT = '___' THEN VALUE * ____ ELSE VALUE END AS CONSUMPTION_KWH, SRC_SYS_ID FROM RHN_IN.______" },
    ],
    checks: [
      {
        type: 'rule',
        label: 'Readings shared with harmonization',
        ok: 'METER_READINGS is shared with RHN_HARM.',
        test: (ctx) => shared(ctx, ['METER_READINGS'], 'RHN_HARM'),
      },
      {
        type: 'result',
        label: 'Each reading once, in kWh',
        object: READINGS,
        columns: M04_COLS,
        expected: project(M04_COLS, REF_READINGS),
        counts: {
          5824: 'Your view has 5,824 rows: the 98 duplicate readings are still in it. Each reading must appear once.',
        },
        diagnose: [
          {
            sql: project(M04_COLS, `SELECT DISTINCT METER_ID, CONTRACT_ID, READING_DATE, VALUE AS CONSUMPTION_KWH, SRC_SYS_ID FROM RHN_IN.METER_READINGS`),
            message: 'The duplicates are gone, but the MWh values are not converted yet.',
          },
          {
            sql: project(M04_COLS, `SELECT DISTINCT METER_ID, CONTRACT_ID, READING_DATE, CASE WHEN UNIT = 'MWh' THEN VALUE / 1000 ELSE VALUE END AS CONSUMPTION_KWH, SRC_SYS_ID FROM RHN_IN.METER_READINGS`),
            message: 'The MWh values got smaller, they should get bigger: 1 MWh is 1,000 kWh, so multiply.',
          },
          {
            sql: project(M04_COLS, `SELECT DISTINCT METER_ID, CONTRACT_ID, READING_DATE, CASE WHEN UNIT = 'kWh' THEN VALUE * 1000 ELSE VALUE END AS CONSUMPTION_KWH, SRC_SYS_ID FROM RHN_IN.METER_READINGS`),
            message: 'You converted the wrong rows: the kWh values are now 1,000 times too big. Only MWh needs converting.',
          },
        ],
      },
      {
        type: 'metric',
        label: 'One reading per meter and date',
        sql: `SELECT count(*) FROM (SELECT METER_ID, READING_DATE FROM ${READINGS} GROUP BY METER_ID, READING_DATE HAVING count(*) > 1) d`,
        missing: 'Deploy RHN_HA_V_METER_READINGS in RHN_HARM first.',
        ok: 'No meter has two readings for the same date.',
        test: (n) => (n ? `${n} meters still have more than one reading for the same date.` : null),
      },
      {
        type: 'question',
        id: 'gwh',
        label: 'Consumption 2025',
        prompt: 'How much did all customers consume in 2025 (readings dated in 2025)? 1 GWh = 1,000,000 kWh.',
        options: ['About 7.0 GWh', 'About 7.1 GWh', 'About 7.7 GWh', 'About 7.9 GWh'],
        answer: 2,
        nudge: 'Not quite. Sum CONSUMPTION_KWH of your deployed view for 2025, for example with year(READING_DATE) = 2025. The wrong options are what you get with duplicates or without the conversion.',
      },
    ],
    review: ['case_else', 'no_select_star'],
    xp: 35,
    realTenant: `Unit conversion in a SQL view is fine for a fixed factor like MWh → kWh. For currencies and units that depend on dates and rates,
      SAP Datasphere has <b>currency and unit conversion</b> in views and analytic models, based on conversion tables replicated from the source.`,
    debrief: `<p>5,726 readings, one per meter and period, and all in kWh. Funny coincidence? Not at all: there is exactly one invoice per reading,
      5,726 of them. When two independent sources agree like that, you can trust the cleaning.</p>
      <p>Without your view, 2025 would have been off by about 0.6 GWh: too low without the conversion, too high with the duplicates.</p>`,
  },
  {
    id: 'c05-m05',
    chapter: 5,
    title: 'Ready for reporting',
    from: CFO,
    ticket: `<p>Calin tells me the data is clean now. For the board I need the <b>consumption per grid area in kWh</b>, over all readings.</p>
      <p><i>Calin adds:</i> Reporting reads only what harmonization prepares. Share our contracts and readings views with <code>RHN_REP</code>,
      nothing from the inbound space. Then write the query in a scratch SQL view in <code>RHN_REP</code>, without any unit conversion or
      code mapping: that work is done once, in harmonization.</p>`,
    tasks: [
      'In <code>RHN_HARM</code>, share <code>RHN_HA_V_CONTRACTS</code> and <code>RHN_HA_V_METER_READINGS</code> with <code>RHN_REP</code>.',
      'In <code>RHN_REP</code>, create a New SQL View: join the readings with the contracts and sum the consumption per grid area. Leave the query in the editor.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Sharing is set in the space the object belongs to: RHN_HARM. Afterwards both views show up in RHN_REP under Shared Objects.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'Readings carry the CONTRACT_ID, contracts carry the GRID_AREA. JOIN on CONTRACT_ID, then GROUP BY the grid area and SUM the kWh.' },
      { label: 'Hint 3: a skeleton', cost: 25, text: 'SELECT c.GRID_AREA, SUM(r.______) AS CONSUMPTION_KWH FROM RHN_HARM.RHN_HA_V_METER_READINGS r JOIN RHN_HARM.______ c ON r.______ = c.______ GROUP BY c.GRID_AREA' },
    ],
    checks: [
      {
        type: 'rule',
        label: 'Harmonized views shared with reporting',
        ok: 'RHN_HA_V_CONTRACTS and RHN_HA_V_METER_READINGS are shared with RHN_REP.',
        test: (ctx) => shared(ctx, ['RHN_HA_V_CONTRACTS', 'RHN_HA_V_METER_READINGS'], 'RHN_REP', 'RHN_HARM'),
      },
      {
        type: 'rule',
        label: 'Reporting never reads inbound',
        ok: 'Nothing from RHN_IN is shared with RHN_REP.',
        test: ({ tenant }) => {
          const leak = tenant.shares.filter((s) => s.to === 'RHN_REP' && s.object.startsWith('RHN_IN.'));
          return leak.length ? `${leak.map((s) => s.object).join(', ')} ${leak.length > 1 ? 'are' : 'is'} shared with RHN_REP. Reporting reads only harmonized views: remove that share in RHN_IN.` : null;
        },
      },
      {
        type: 'result',
        label: 'Consumption per grid area',
        space: 'RHN_REP',
        expected: `SELECT c.GRID_AREA, SUM(r.CONSUMPTION_KWH) FROM (${REF_READINGS}) r JOIN (${REF_CONTRACTS_CODES}) c ON r.CONTRACT_ID = c.CONTRACT_ID GROUP BY c.GRID_AREA`,
        diagnose: [
          {
            sql: `SELECT c.GRID_AREA, COUNT(*) FROM (${REF_READINGS}) r JOIN (${REF_CONTRACTS_CODES}) c ON r.CONTRACT_ID = c.CONTRACT_ID GROUP BY c.GRID_AREA`,
            message: 'You counted the readings. The CFO asked for the consumption: sum CONSUMPTION_KWH.',
          },
          {
            sql: `SELECT c.GRID_AREA, COUNT(*) FROM (${REF_CONTRACTS_CODES}) c GROUP BY c.GRID_AREA`,
            message: 'These are contracts per grid area. The CFO asked for the consumption from the readings: join them and sum CONSUMPTION_KWH.',
          },
        ],
      },
      {
        type: 'question',
        id: 'change',
        label: 'Where a change goes',
        prompt: 'Next year the legacy system sends a new grid area "Mitte" that belongs to NORTH. Where do you add it?',
        options: [
          'In every report query in RHN_REP that groups by grid area',
          'Once, in the mapping of RHN_HA_V_CONTRACTS: every view and report built on it gets the new code with the next deploy',
          'In RHN_IN.BILLING_CONTRACTS, by updating the rows',
          'Nowhere: the CASE puts it into NORTH automatically',
        ],
        answer: 1,
        nudge: 'Not quite. Where does the mapping live, and what does ELSE do with a code it does not know?',
      },
    ],
    review: ['alias_aggregates', 'explicit_join', 'no_select_star'],
    xp: 30,
    realTenant: `In a real tenant the reporting space builds a <b>Fact</b> view on the shared harmonized views and an <b>Analytic Model</b> on top,
      which SAP Analytics Cloud consumes. Sharing goes one layer up at a time; the source browser of the reporting space shows the views
      under <b>Shared Objects</b>.`,
    debrief: `<p>Thank you, that is the first number for the board that I fully trust.</p>
      <p><i>Calin adds:</i> Your reporting query has no CASE and no × 1,000 in it. All the cleaning lives in three views in harmonization,
      and every consumer builds on them. Next chapter we give those views meaning: facts, dimensions and associations.</p>`,
  },
];
