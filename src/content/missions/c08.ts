import type { Mission, RuleContext } from '../../missions/types';
import { findObject } from '../../repo';
import { REF_F_CONS, REF_F_INV } from './c06';

/**
 * Chapter 8, Data Access Controls (Handbuch 9.3, 9.9 Ablauf A, 6.5.7). Row-level security for the regional managers:
 * a permissions table (user → grid area) maintained in the Data Editor of a local table, a data access control of type
 * Single Values on it, assigned to both facts. The analytic models take the controls over.
 *
 * Users (Security › Users): PLINDNER (CFO, everything), MBRANDT (NORTH, EAST), ADEMIR (SOUTH, WEST); NKRUEGER has no entry.
 * Model checks query the deployed analytic models as a user (type 'model' with asUser).
 * Numbers from generator v1, checked with DuckDB on 2026-10-09.
 */

const CALIN = { name: 'Calin Mucea', role: 'Senior Data Architect, your mentor', initials: 'CM' };
const AUDIT = { name: 'Sabine Wolf', role: 'Internal Auditor', initials: 'SW' };
const SOUTH_MGR = { name: 'Aylin Demir', role: 'Regional Manager South', initials: 'AD' };

const T_PERM = 'RHN_REP.RHN_REP_T_PERMISSIONS';
export const DAC = 'RHN_REP.RHN_REP_DAC_GRID_AREA';
const F_INV = 'RHN_REP.RHN_REP_F_INVOICES';
const F_CONS = 'RHN_REP.RHN_REP_F_CONSUMPTION';
const D_GRID = 'RHN_REP.RHN_REP_D_GRID_AREA';
const AM_INV = 'RHN_REP.RHN_REP_AM_INVOICES';
const AM_CONS = 'RHN_REP.RHN_REP_AM_CONSUMPTION';
const REGION = 'RHN_REP_D_GRID_AREA.REGION';

const PERMISSIONS: [string, string][] = [
  ['PLINDNER', 'NORTH'], ['PLINDNER', 'EAST'], ['PLINDNER', 'SOUTH'], ['PLINDNER', 'WEST'],
  ['MBRANDT', 'NORTH'], ['MBRANDT', 'EAST'], ['ADEMIR', 'SOUTH'], ['ADEMIR', 'WEST'],
];
export const values = (rows: [string, string][]) => rows.map(([u, g]) => `SELECT '${u}' AS USER_ID, '${g}' AS GRID_AREA`).join(' UNION ALL ');

// ---------------------------------------------------------------- reference figures (never shown)

const AREAS: Record<string, string> = { MBRANDT: `'NORTH', 'EAST'`, ADEMIR: `'SOUTH', 'WEST'`, PLINDNER: `'NORTH', 'EAST', 'SOUTH', 'WEST'` };
const BY_REGION = `JOIN RHN_IN.GRID_AREAS g ON f.GRID_AREA = g.GRID_AREA`;
export const netAs = (user: string) => `SELECT g.REGION, SUM(f.NET_AMOUNT) FROM (${REF_F_INV}) f ${BY_REGION} WHERE f.GRID_AREA IN (${AREAS[user]}) GROUP BY 1`;
const kwhAs = (user: string) => `SELECT g.REGION, SUM(f.CONSUMPTION_KWH) FROM (${REF_F_CONS}) f ${BY_REGION} WHERE f.GRID_AREA IN (${AREAS[user]}) GROUP BY 1`;
export const NOTHING = `SELECT 'x' AS REGION, 0 AS V WHERE FALSE`;
const OPEN_INV = (who: string) => [{ sql: netAs('PLINDNER'), message: `${who} still sees every region. The deployed fact RHN_REP_F_INVOICES has no data access control yet.` }];
/** Control only on the dimension: the fact rows stay, the hidden grid areas just lose their region. */
const dimOnly = (user: string) => `SELECT CASE WHEN f.GRID_AREA IN (${AREAS[user]}) THEN g.REGION END, SUM(f.CONSUMPTION_KWH) FROM (${REF_F_CONS}) f ${BY_REGION} GROUP BY 1`;
const OPEN_CONS = (who: string, user: string) => [
  { sql: kwhAs('PLINDNER'), message: `${who} still sees every region in the consumption model. The deployed fact RHN_REP_F_CONSUMPTION has no data access control yet.` },
  { sql: dimOnly(user), message: `${who} still sees the kWh of every grid area; the others only lost their region (empty REGION row). A control on the dimension hides names, not numbers: protect the fact.` },
];

// ---------------------------------------------------------------- rule helpers

/** The deployed DAC, or why it cannot be checked. */
function dacOf({ tenant }: RuleContext) {
  const o = findObject(tenant, DAC);
  if (!o) {
    const elsewhere = tenant.objects.find((x) => x.name === DAC.split('.')[1]);
    return { def: null, problem: elsewhere ? `${elsewhere.name} is in ${elsewhere.space}; it belongs in RHN_REP.` : 'There is no data access control RHN_REP_DAC_GRID_AREA in RHN_REP yet.' };
  }
  if (o.kind !== 'Data Access Control') return { def: null, problem: `RHN_REP_DAC_GRID_AREA is a ${o.kind}. Create it from the tile New Data Access Control.` };
  if (!o.deployed?.dac) return { def: null, problem: 'RHN_REP_DAC_GRID_AREA is saved, but not deployed.' };
  if (o.status === 'changes') return { def: null, problem: 'RHN_REP_DAC_GRID_AREA has saved changes that are not deployed yet.' };
  return { def: o.deployed.dac, problem: null };
}

/** A view has the DAC assigned in its deployed version, criterion GRID_AREA → column GRID_AREA. */
export const assigned = (view: string) => ({ tenant }: RuleContext): string | null => {
  const name = view.split('.')[1];
  const o = findObject(tenant, view);
  if (!o?.deployed) return `${name} is not deployed.`;
  const a = (o.deployed.dacs ?? []).find((x) => x.dac === DAC);
  if (!a) {
    return (o.dacs ?? []).some((x) => x.dac === DAC)
      ? `${name} has the data access control in its saved version only. Deploy it: until then everyone sees every row.`
      : `${name} has no data access control yet. Open it, assign RHN_REP_DAC_GRID_AREA in its properties, save and deploy.`;
  }
  if (o.status === 'changes') return `${name} has saved changes that are not deployed yet.`;
  return a.mapping.GRID_AREA === 'GRID_AREA' ? null : `${name} maps GRID_AREA to ${a.mapping.GRID_AREA}. The criterion must point to the view's GRID_AREA column.`;
};

// ---------------------------------------------------------------- missions

export const CHAPTER_8: Mission[] = [
  {
    id: 'c08-m01',
    chapter: 8,
    title: 'Who may see what',
    from: AUDIT,
    ticket: `<p>Sabine Wolf, internal audit. The regional managers now open the invoice and consumption models in SAP Analytics Cloud,
      and today <b>each of them sees everything</b>. That has to change:</p>
      <ul><li><b>Markus Brandt</b> (MBRANDT): grid areas NORTH and EAST</li>
        <li><b>Aylin Demir</b> (ADEMIR): grid areas SOUTH and WEST</li>
        <li><b>Petra Lindner</b> (PLINDNER), CFO: all four grid areas</li></ul>
      <p><i>Calin adds:</i> Row-level security starts with a <b>permissions table</b>: one row per user and grid area. Create the local table
      <code>RHN_REP_T_PERMISSIONS</code> in <code>RHN_REP</code> with the columns <code>USER_ID</code> and <code>GRID_AREA</code> (both String, both key)
      and type the rows in its Data Editor. The user IDs are in Security › Users.</p>`,
    tasks: [
      'In <code>RHN_REP</code>, create a <b>New Table</b> <code>RHN_REP_T_PERMISSIONS</code> with the columns <code>USER_ID</code> and <code>GRID_AREA</code>.',
      'Add one row per user and grid area in the <b>Data Editor</b>. Save and deploy.',
      'Answer the questions below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'New Table is the first tile on the Data Builder start page of RHN_REP. Columns on top, Data Editor below.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'Each row grants one user one grid area. A user who should see four grid areas needs four rows. Use the grid area codes of the fact (NORTH, EAST, SOUTH, WEST), not the region.' },
      { label: 'Hint 3: the rows', cost: 25, text: 'PLINDNER × NORTH, EAST, SOUTH, WEST; MBRANDT × NORTH, EAST; ADEMIR × SOUTH, WEST. Eight rows in total.' },
    ],
    checks: [
      { type: 'structure', label: 'The permissions table', space: 'RHN_REP', object: 'RHN_REP_T_PERMISSIONS', kind: 'Table', columns: ['USER_ID', 'GRID_AREA'] },
      {
        type: 'result', label: 'One row per user and grid area', object: T_PERM, columns: ['USER_ID', 'GRID_AREA'], expected: values(PERMISSIONS),
        diagnose: [
          { sql: values(PERMISSIONS.filter(([u]) => u !== 'PLINDNER')), message: 'Petra has no rows. A user without an entry sees nothing at all, and the CFO needs every grid area.' },
          { sql: values([['PLINDNER', 'NORTH'], ['PLINDNER', 'SOUTH'], ['MBRANDT', 'NORTH'], ['ADEMIR', 'SOUTH']]), message: 'These are regions, not grid areas. The facts hold GRID_AREA (NORTH, EAST, SOUTH, WEST); region NORTH covers NORTH and EAST.' },
        ],
        counts: { 3: 'Three rows: one per user. Someone who may see two grid areas needs two rows.', 4: 'Four rows look like regions per user. Write one row per user and grid area.' },
      },
      {
        type: 'question', id: 'why-area', label: 'Grid area, not region',
        prompt: 'Why does the permissions table hold grid areas, although Markus is responsible for region NORTH?',
        options: [
          'Regions cannot be stored in a local table',
          'The control compares the permitted values with a column of the protected view. The facts have GRID_AREA, not REGION',
          'Grid areas are shorter',
          'Regions change every year',
        ],
        answer: 1,
        nudge: 'Not quite. Which column of RHN_REP_F_INVOICES could the control compare the values with?',
      },
      {
        type: 'question', id: 'who', label: 'Who maintains it',
        prompt: 'In a real project, who should maintain such a permissions table?',
        options: [
          'Every regional manager edits his own rows',
          'The business side that decides about access (here: controlling with audit), ideally in its own space that shares the table with the modeling space; modelers only use it',
          'Nobody: it is filled once and never changes',
          'SAP Analytics Cloud fills it automatically',
        ],
        answer: 1,
        nudge: 'Not quite. Who decides who may see which numbers, and who must not be able to give himself more rights?',
      },
    ],
    xp: 45,
    realTenant: `In a real tenant: <b>Data Builder › New Table</b>, define the columns, then edit the rows in the table's <b>Data Editor</b>,
      or upload a CSV file. SAP describes the split: business users maintain the permissions entity in their own space and share it;
      the modeling space builds the data access controls on it.`,
    debrief: `<p>Thank you. Eight rows, and anyone can read who may see what. That is what I want to show in the next audit.</p>
      <p><i>Calin adds:</i> The table alone protects nothing yet. Next ticket: the control that reads it.</p>`,
  },
  {
    id: 'c08-m02',
    chapter: 8,
    title: 'The access control',
    from: CALIN,
    ticket: `<p>Now the <b>data access control</b> itself: <code>RHN_REP_DAC_GRID_AREA</code> in <code>RHN_REP</code>, type <b>Single Values</b>,
      on the permissions table. The <b>identifier column</b> is the one with the user IDs, the <b>criterion</b> the one with the values a
      user may see.</p>`,
    tasks: [
      'Create a <b>New Data Access Control</b> <code>RHN_REP_DAC_GRID_AREA</code>: Single Values, permissions entity <code>RHN_REP_T_PERMISSIONS</code>.',
      'Choose the identifier column and the criterion. Check the Data Preview, save and deploy.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'New Data Access Control is the last tile before the import tiles. Its Data Preview lists each user with his values.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'Identifier = who (user ID). Criterion = what (the value that must match a column of the protected view).' },
      { label: 'Hint 3: the setup', cost: 25, text: 'Permissions entity RHN_REP_T_PERMISSIONS, identifier USER_ID, criterion GRID_AREA.' },
    ],
    checks: [
      {
        type: 'rule', label: 'Single Values on the permissions table', ok: 'RHN_REP_DAC_GRID_AREA reads RHN_REP_T_PERMISSIONS.',
        test: (ctx) => {
          const d = dacOf(ctx);
          if (!d.def) return d.problem;
          return d.def.entity === T_PERM ? null : `The control reads ${d.def.entity.split('.')[1]}. Its permissions entity must be RHN_REP_T_PERMISSIONS.`;
        },
      },
      {
        type: 'rule', label: 'User ID and grid area', ok: 'Identifier USER_ID, criterion GRID_AREA.',
        test: (ctx) => {
          const d = dacOf(ctx);
          if (!d.def) return d.problem;
          if (d.def.identifier !== 'USER_ID') return `The identifier column is ${d.def.identifier}. It must hold the user IDs.`;
          return d.def.criteria.join() === 'GRID_AREA' ? null : `The criteria are ${d.def.criteria.join(', ') || 'empty'}. The control should check exactly GRID_AREA.`;
        },
      },
      {
        type: 'question', id: 'nina', label: 'No entry',
        prompt: 'Nina Krüger (NKRUEGER) joined the team and has no row in the permissions table. What will she see in a view protected by this control?',
        options: ['Every row, because nothing restricts her', 'No rows at all', 'Only the rows of region NORTH', 'An error message'],
        answer: 1,
        nudge: 'Not quite. A protected view shows the rows that match an entry of the user. How many entries does Nina have?',
      },
    ],
    xp: 40,
    realTenant: `In a real tenant: <b>Data Builder › New Data Access Control</b>, choose the criteria type, the permissions entity, the identifier
      column and the criteria. The identifier can also be a custom attribute from the identity provider, e.g. a department.`,
    debrief: `<p>The control exists, but it is not attached to anything. A data access control only works where it is assigned.</p>`,
  },
  {
    id: 'c08-m03',
    chapter: 8,
    title: 'Protect the invoices',
    from: CALIN,
    ticket: `<p>Assign <code>RHN_REP_DAC_GRID_AREA</code> to the fact <code>RHN_REP_F_INVOICES</code>: its criterion <code>GRID_AREA</code> maps to
      the fact's <code>GRID_AREA</code> column. Deploy the fact.</p>
      <p>Then check it the way the real users will see it: open <code>RHN_REP_AM_INVOICES</code> and use <b>View as</b> in the Data Preview.
      The analytic model takes the control of its fact over; nothing to change there.</p>`,
    tasks: [
      'Open <code>RHN_REP_F_INVOICES</code> and assign the data access control in its properties (section Data Access Controls). Save and deploy.',
      'Preview the fact as <code>MBRANDT</code>, then the invoice model as Markus, Aylin and Petra.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'The section Data Access Controls is at the end of the fact\'s properties, after the associations. View as appears above the Data Preview once the fact is deployed with a control.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'Protect the fact, because the fact holds the amounts. The analytic model reads the fact, so it is filtered too.' },
      { label: 'Hint 3: the setup', cost: 25, text: 'Assign → RHN_REP_DAC_GRID_AREA, GRID_AREA → GRID_AREA, Deploy. In the model: REGION in the rows, View as MBRANDT, variable 2025-01-01 to 2025-12-31.' },
    ],
    checks: [
      { type: 'rule', label: 'The fact is protected', ok: 'RHN_REP_F_INVOICES is deployed with the control.', test: assigned(F_INV) },
      { type: 'model', label: 'Markus sees the North', object: AM_INV, rows: [REGION], measures: ['NET_AMOUNT'], asUser: 'MBRANDT', expected: netAs('MBRANDT'), ok: 'MBRANDT sees region NORTH only.', diagnose: OPEN_INV('Markus') },
      { type: 'model', label: 'Aylin sees the South', object: AM_INV, rows: [REGION], measures: ['NET_AMOUNT'], asUser: 'ADEMIR', expected: netAs('ADEMIR'), ok: 'ADEMIR sees region SOUTH only.', diagnose: OPEN_INV('Aylin') },
      {
        type: 'model', label: 'Petra sees everything', object: AM_INV, rows: [REGION], measures: ['NET_AMOUNT'], asUser: 'PLINDNER', expected: netAs('PLINDNER'),
        ok: 'PLINDNER sees both regions.', diagnose: [{ sql: NOTHING, message: 'Petra sees nothing. Does she have rows in the permissions table?' }],
      },
      { type: 'model', label: 'Nina sees nothing', object: AM_INV, rows: [REGION], measures: ['NET_AMOUNT'], asUser: 'NKRUEGER', expected: NOTHING, ok: 'NKRUEGER has no entry and sees no rows.', diagnose: OPEN_INV('Nina') },
      {
        type: 'question', id: 'markus', label: 'Markus in 2025',
        prompt: 'As MBRANDT, with the invoice date set to 2025: how much net revenue does the invoice model show him in total?',
        options: ['About 531 thousand EUR', 'About 746 thousand EUR', 'About 871 thousand EUR', 'About 1.62 million EUR'],
        answer: 2,
        nudge: 'Not quite. View as MBRANDT, V_INVOICE_DATE from 2025-01-01 to 2025-12-31, NET_AMOUNT. Markus has two grid areas.',
      },
    ],
    xp: 50,
    realTenant: `In a real tenant: open the view, section <b>Data Access Controls</b>, add the control and map its criteria to view columns,
      deploy. Users then see only their rows in the view, in views built on it, and in SAP Analytics Cloud. To test, log on as a test user
      (the game's "View as" is a shortcut for that).`,
    debrief: `<p>Same model, three users, three different results. And the model itself was not touched.</p>
      <p><i>Calin adds:</i> Roles decide <b>what</b> someone may open, the data access control decides <b>which rows</b> he sees there.
      Aylin just wrote: she still sees the North in the consumption model.</p>`,
  },
  {
    id: 'c08-m04',
    chapter: 8,
    title: 'Consumption, and a shortcut',
    from: SOUTH_MGR,
    ticket: `<p>Aylin Demir here. In the consumption model I can still see the North. I am sure Markus would not like that.</p>
      <p><i>Calin adds:</i> Protect <code>RHN_REP_F_CONSUMPTION</code> the same way. And before you ask: someone suggested to put the control
      only on the grid area dimension <code>RHN_REP_D_GRID_AREA</code>, "then it works for both facts at once". Think about that
      in the question below.</p>`,
    tasks: [
      'Assign <code>RHN_REP_DAC_GRID_AREA</code> to <code>RHN_REP_F_CONSUMPTION</code>, save and deploy.',
      'Check <code>RHN_REP_AM_CONSUMPTION</code> as <code>ADEMIR</code>.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Same steps as for the invoice fact: properties of the fact, section Data Access Controls.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'A control filters the rows of the view it is assigned to. Which view holds the kWh?' },
      { label: 'Hint 3: the setup', cost: 25, text: 'RHN_REP_F_CONSUMPTION: Assign → RHN_REP_DAC_GRID_AREA, GRID_AREA → GRID_AREA, Deploy.' },
    ],
    checks: [
      { type: 'rule', label: 'Consumption is protected', ok: 'RHN_REP_F_CONSUMPTION is deployed with the control.', test: assigned(F_CONS) },
      { type: 'rule', label: 'Invoices stay protected', ok: 'RHN_REP_F_INVOICES still has the control.', test: assigned(F_INV) },
      { type: 'model', label: 'Aylin sees the South', object: AM_CONS, rows: [REGION], measures: ['CONSUMPTION_KWH'], asUser: 'ADEMIR', expected: kwhAs('ADEMIR'), ok: 'ADEMIR sees region SOUTH only.', diagnose: OPEN_CONS('Aylin', 'ADEMIR') },
      { type: 'model', label: 'Markus sees the North', object: AM_CONS, rows: [REGION], measures: ['CONSUMPTION_KWH'], asUser: 'MBRANDT', expected: kwhAs('MBRANDT'), ok: 'MBRANDT sees region NORTH only.', diagnose: OPEN_CONS('Markus', 'MBRANDT') },
      {
        type: 'rule', label: 'The dimension stays open', ok: 'The grid area dimension has no control; it describes, the facts hold the numbers.',
        test: ({ tenant }) => (findObject(tenant, D_GRID)?.deployed?.dacs?.length
          ? 'RHN_REP_D_GRID_AREA has a data access control. Names and regions of grid areas are not secret, and a control there would not filter a single kWh. Remove it.'
          : null),
      },
      {
        type: 'question', id: 'shortcut', label: 'Only on the dimension?',
        prompt: 'Why is a control only on RHN_REP_D_GRID_AREA not enough?',
        options: [
          'Dimensions cannot have data access controls',
          'It hides grid area rows of the dimension, but the fact rows with their amounts and kWh stay visible, just without names: the numbers leak',
          'It would work, it is just slower',
          'Analytic models ignore controls on dimensions',
        ],
        answer: 1,
        nudge: 'Not quite. Which object holds the numbers, and what happens to a fact row whose dimension row is hidden?',
      },
    ],
    xp: 50,
    realTenant: `Protect the entities that hold the sensitive numbers, usually the facts, or a view all consumers must go through.
      A control is inherited by everything built on the protected view. Note: views that read a protected view cannot be persisted
      (Handbuch 9.3.7) – something to remember for chapter 9.`,
    debrief: `<p>Thank you, now I only see my grid areas.</p>
      <p><i>Calin adds:</i> That closes the reporting layer: facts, dimensions, models, and rows per user. Next we look at speed:
      what to persist, and why.</p>`,
  },
];
