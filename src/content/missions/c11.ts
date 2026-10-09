import type { Mission } from '../../missions/types';
import { findObject } from '../../repo';
import { lastRun } from '../../integration';
import { REF_F_CONS } from './c06';
import { assigned } from './c08';
import { ensureInbound } from './c10';

/**
 * Chapter 11, Board request (no hints): one change from the fact to the story, with security, performance and operations
 * in mind. The board wants kWh per month and commodity. The player extends the deployed fact RHN_REP_F_CONSUMPTION by
 * READING_MONTH (text YYYY-MM), keeps its semantics and data access control, adds the attribute to the analytic model,
 * checks it as a regional manager, and makes sure the board pack is fast and fresh.
 * Figures checked with the playtest state on 2026-10-09 (see docs/DATA.md).
 */

const CFO = { name: 'Petra Lindner', role: 'CFO, Stadtwerke Rheinau', initials: 'PL' };
const NORTH_MGR = { name: 'Markus Brandt', role: 'Regional Manager North', initials: 'MB' };
const CALIN = { name: 'Calin Mucea', role: 'Senior Data Architect, your mentor', initials: 'CM' };

const F_CONS = 'RHN_REP.RHN_REP_F_CONSUMPTION';
const AM_CONS = 'RHN_REP.RHN_REP_AM_CONSUMPTION';
const NIGHTLY = 'RHN_HARM.RHN_HARM_TC_NIGHTLY';
const COMMODITY = 'RHN_REP_D_TARIFF.COMMODITY';

const MONTH = `strftime(READING_DATE, '%Y-%m')`;
const FACT_COLS = ['CONTRACT_ID', 'READING_DATE', 'READING_MONTH', 'CONSUMPTION_KWH'];
const REF_FACT = `SELECT CONTRACT_ID, READING_DATE, ${MONTH} AS READING_MONTH, CONSUMPTION_KWH FROM (${REF_F_CONS}) f`;
const BY_MONTH = (filter = '') => `SELECT ${MONTH} AS READING_MONTH, t.COMMODITY, SUM(f.CONSUMPTION_KWH)
  FROM (${REF_F_CONS}) f JOIN RHN_IN.TARIFFS t ON f.TARIFF = t.TARIFF ${filter} GROUP BY 1, 2`;
const MONTH_ONLY = (areas: string) => `SELECT ${MONTH} AS READING_MONTH, SUM(f.CONSUMPTION_KWH) FROM (${REF_F_CONS}) f
  WHERE f.GRID_AREA IN (${areas}) GROUP BY 1`;

/** Below this simulated runtime the board story counts as fast (see chapter 9). */
const FAST_MS = 3000;

export const CHAPTER_11: Mission[] = [
  {
    id: 'c11-m01',
    chapter: 11,
    title: 'The board pack',
    from: CFO,
    ticket: `<p>Petra Lindner. The supervisory board meets next week. They want one chart: <b>consumption in kWh per month, split into
      electricity and gas</b>, in SAP Analytics Cloud, on the consumption model.</p>
      <p>The month must be text like <code>2025-03</code>, as in the rest of the board pack, in a column <code>READING_MONTH</code>.
      Nothing else may change for the people already using the model: same numbers, same protection.</p>
      <p><i>Calin adds:</i> From here on you work without hints. You know every step; think about the whole stack before you deploy.</p>`,
    tasks: [
      'Give the consumption data a month in the format the board pack uses.',
      'Make the month and the commodity available in <code>RHN_REP_AM_CONSUMPTION</code>.',
      'Answer the question below.',
    ],
    hints: [],
    checks: [
      {
        type: 'result', label: 'The month in the fact', object: F_CONS, columns: FACT_COLS, expected: REF_FACT,
        diagnose: [{
          sql: `SELECT CONTRACT_ID, READING_DATE, date_trunc('month', READING_DATE) AS READING_MONTH, CONSUMPTION_KWH FROM (${REF_F_CONS}) f`,
          message: 'READING_MONTH holds dates such as 2025-03-01. The board pack wants text like 2025-03.',
        }],
      },
      {
        type: 'rule', label: 'Still a fact', ok: 'RHN_REP_F_CONSUMPTION is still a Fact with CONSUMPTION_KWH as measure, READING_MONTH is an attribute.',
        test: ({ tenant }) => {
          const d = findObject(tenant, F_CONS)?.deployed;
          if (!d) return 'RHN_REP_F_CONSUMPTION is not deployed.';
          if (d.semanticUsage !== 'Fact') return `RHN_REP_F_CONSUMPTION is deployed as ${d.semanticUsage}. The model needs a Fact.`;
          if (d.columnRoles?.CONSUMPTION_KWH !== 'Measure') return 'CONSUMPTION_KWH is no longer a measure in the deployed fact.';
          return d.columnRoles?.READING_MONTH === 'Attribute' ? null : 'READING_MONTH has no role Attribute in the deployed fact, so the model cannot offer it.';
        },
      },
      { type: 'rule', label: 'Still protected', ok: 'The data access control is still assigned.', test: assigned(F_CONS) },
      {
        type: 'model', label: 'kWh per month and commodity', object: AM_CONS, rows: ['READING_MONTH', COMMODITY], measures: ['CONSUMPTION_KWH'],
        expected: BY_MONTH(), ok: 'The model answers the board\'s question.',
      },
      {
        type: 'question', id: 'gas-jun', label: 'Gas in June 2025',
        prompt: 'Most meters are read at the end of June and December. How much gas (kWh) does the model show for 2025-06?',
        options: ['About 1.4 million kWh', 'About 1.6 million kWh', 'About 3.4 million kWh', 'About 4.8 million kWh'],
        answer: 2,
        nudge: 'Not quite. In the Data Preview of the model: READING_MONTH and COMMODITY in the rows, CONSUMPTION_KWH, then read the row 2025-06 · GAS.',
      },
    ],
    xp: 70,
    realTenant: `In a real tenant you would extend the fact the same way: change the SQL view, check the impact on the model (Impact and
      Lineage), keep semantic usage and data access control, deploy, then add the attribute to the analytic model and deploy it. With a
      time dimension (generated in Space Management) the month, quarter and year come from an association instead of a column.`,
    debrief: `<p>That is the chart I wanted. Thank you.</p>
      <p><i>Calin adds:</i> And nobody else noticed a thing. That is how a change should feel.</p>`,
  },
  {
    id: 'c11-m02',
    chapter: 11,
    title: 'The same chart for the North',
    from: NORTH_MGR,
    ticket: `<p>Markus Brandt. Petra showed me the new monthly chart. I want the same for my region, in my own story on the same model.</p>
      <p><i>Calin adds:</i> Decide what needs to be built for Markus, if anything, and prove that he sees exactly his grid areas.</p>`,
    tasks: [
      'Make sure Markus gets the monthly kWh of his grid areas, and nothing more.',
      'Answer the questions below.',
    ],
    hints: [],
    checks: [
      {
        type: 'rule', label: 'Checked as Markus', ok: 'You previewed the model as MBRANDT.',
        test: ({ events }) => (events.has(`am-preview-as:${AM_CONS}:MBRANDT`) ? null : 'Prove it: preview the consumption model as MBRANDT.'),
      },
      { type: 'model', label: 'Markus sees his months', object: AM_CONS, rows: ['READING_MONTH'], measures: ['CONSUMPTION_KWH'], asUser: 'MBRANDT', expected: MONTH_ONLY(`'NORTH', 'EAST'`), ok: 'MBRANDT sees NORTH and EAST only.' },
      { type: 'model', label: 'Aylin sees hers', object: AM_CONS, rows: ['READING_MONTH'], measures: ['CONSUMPTION_KWH'], asUser: 'ADEMIR', expected: MONTH_ONLY(`'SOUTH', 'WEST'`), ok: 'ADEMIR sees SOUTH and WEST only.' },
      {
        type: 'rule', label: 'Nothing extra', ok: 'No second model or copy of the data for Markus.',
        test: ({ tenant }) => {
          const extra = tenant.objects.filter((o) => o.space === 'RHN_REP' && (o.kind === 'Analytic Model' || o.kind === 'SQL View')
            && !['RHN_REP_AM_INVOICES', 'RHN_REP_AM_CONSUMPTION', 'RHN_REP_V_REGION_REVENUE'].includes(o.name) && !/^RHN_REP_[DF]_/.test(o.name));
          return extra.length ? `${extra.map((o) => o.name).join(', ')} is new in RHN_REP. Markus needs no object of his own: the protected model already shows him his rows.` : null;
        },
      },
      {
        type: 'question', id: 'why-nothing', label: 'Why nothing new',
        prompt: 'Why does Markus need no new model or view?',
        options: [
          'Because he is a manager',
          'The control sits on the fact; the model and the new column inherit it, so the same model shows each user only his rows',
          'SAP Analytics Cloud filters the regions itself',
          'Because the month is text',
        ],
        answer: 1,
        nudge: 'Not quite. Where is the data access control assigned, and what reads that object?',
      },
      {
        type: 'question', id: 'north-total', label: 'The North in June 2025',
        prompt: 'As MBRANDT: how many kWh does the model show for 2025-06 (electricity and gas together)?',
        options: ['About 0.8 million kWh', 'About 1.75 million kWh', 'About 2.5 million kWh', 'About 4.8 million kWh'],
        answer: 2,
        nudge: 'Not quite. View as MBRANDT, only READING_MONTH in the rows, CONSUMPTION_KWH, read 2025-06.',
      },
    ],
    xp: 55,
    realTenant: `One model, many users: the data access control on the fact decides the rows per user in every story. Copies per region would
      have to be maintained and secured one by one.`,
    debrief: `<p>Perfect, and I see nothing of Aylin's. Fair is fair.</p>`,
  },
  {
    id: 'c11-m03',
    chapter: 11,
    title: 'Fast and fresh on board day',
    from: CALIN,
    ticket: `<p>Last step before the board meeting: the chart must open fast for twelve board members at once, and show the readings of
      last night. Prove both: the night must have run with your change in place, and the model must open in under three seconds at
      production volume.</p>`,
    tasks: [
      'Make sure the nightly processing ran after your change and completed.',
      'Prove that the board chart opens fast.',
      'Answer the question below.',
    ],
    hints: [],
    setup: ensureInbound,
    checks: [
      {
        type: 'rule', label: 'The night ran', ok: 'RHN_HARM_TC_NIGHTLY completed after the change.',
        test: ({ tenant }) => {
          const r = lastRun(tenant, NIGHTLY);
          if (!r) return 'RHN_HARM_TC_NIGHTLY has not run. Run it.';
          if (r.status === 'Failed') return 'The last run of RHN_HARM_TC_NIGHTLY failed. Find the step and fix it.';
          const changed = findObject(tenant, F_CONS)?.changedAt ?? '';
          return r.start >= changed ? null : 'The last run of RHN_HARM_TC_NIGHTLY is older than your change of the fact. Run the chain.';
        },
      },
      {
        type: 'rule', label: 'Fast enough', ok: 'The board chart opens in under three seconds at production volume.',
        test: ({ events, tenant }) => {
          if (!findObject(tenant, 'RHN_HARM.RHN_HA_V_METER_READINGS')?.persisted) return 'RHN_HA_V_METER_READINGS is not persisted: the model computes the duplicate removal on every read.';
          const runs = [...events].filter((e) => e.startsWith(`am-runtime:${AM_CONS}:`)).map((e) => Number(e.split(':').pop()));
          if (!runs.length) return 'Run the Data Preview of RHN_REP_AM_CONSUMPTION to see its runtime at production volume.';
          return runs.some((ms) => ms < FAST_MS) ? null : 'The consumption model still takes longer than three seconds.';
        },
      },
      {
        type: 'question', id: 'fresh', label: 'What decides freshness',
        prompt: 'The board looks at the chart at 08:00. What decides how fresh its numbers are?',
        options: [
          'The time the board opens the story',
          'When the nightly chain last persisted the meter readings; the delta replication alone does not reach the persisted snapshot',
          'The data access control',
          'The expensive statement threshold',
        ],
        answer: 1,
        nudge: 'Not quite. The model reads the fact, the fact reads a persisted view. When was that snapshot built?',
      },
    ],
    xp: 60,
    realTenant: `The full path of a change in a real landscape continues with <b>Transport</b>: the fact and the model move from the
      development tenant to production as a package, with their dependencies, and the task chain runs there on its own schedule.`,
    debrief: `<p><i>Calin:</i> Fact, model, security, performance, operations: one request, all of it, without a single hint.
      You built a Datasphere landscape for a whole utility. From here on, you teach the next one.</p>
      <p><b>Congratulations: the main game is complete.</b> The excursions (Business Builder, Catalog, Transport, consumption) follow.</p>`,
  },
];
