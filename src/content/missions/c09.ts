import type { Mission, RuleContext } from '../../missions/types';
import { findObject } from '../../repo';

/**
 * Chapter 9, Persistence and Performance (Handbuch 6.5.6, 10.3.4, 10.4, 9.3.7).
 * Month-end: the consumption model is slow. Measure first (expensive statement tracing, Expensive Statement Logs), find the
 * expensive layer with the View Analyzer, persist the cleaned meter readings (base view), keep the snapshot fresh with a schedule,
 * and learn the limits: a view that reads a protected view cannot be persisted; small views are not worth a snapshot.
 *
 * Runtimes are simulated by src/perf.ts (production volume). Figures checked with the playtest state on 2026-10-09:
 * consumption model about 7 s virtual, about 1.5 s with RHN_DS_V_METER_READINGS persisted; invoice model under 2 s.
 */

const CALIN = { name: 'Calin Mucea', role: 'Senior Data Architect, your mentor', initials: 'CM' };
const CFO = { name: 'Petra Lindner', role: 'CFO, Stadtwerke Rheinau', initials: 'PL' };
const NORTH_MGR = { name: 'Markus Brandt', role: 'Regional Manager North', initials: 'MB' };

const READINGS = 'RHN_DSL.RHN_DS_V_METER_READINGS';
const F_CONS = 'RHN_DSL.RHN_DS_F_CONSUMPTION';
const AM_CONS = 'RHN_PRES.RHN_PR_AM_CONSUMPTION';
const TARIFFS = 'RHN_DSL.RHN_DS_V_TARIFFS';
const REVENUE = 'RHN_PRES.RHN_PR_V_REGION_REVENUE';

/** Below this simulated runtime the consumption model counts as fast (with the readings persisted it is about 1.5 s). */
export const FAST_MS = 3000;

const tracingOn = ({ tenant }: RuleContext) =>
  tenant.tracing.enabled ? null : 'Expensive statement tracing is off. Enable it in System › Configuration › Monitoring and save.';

/** The readings base view is persisted, with a current deployment. */
const readingsPersisted = ({ tenant }: RuleContext): string | null => {
  const o = findObject(tenant, READINGS);
  if (!o?.deployed) return 'RHN_DS_V_METER_READINGS is missing or not deployed.';
  if (!o.persisted) {
    const fact = findObject(tenant, F_CONS);
    return fact?.persisted
      ? 'You persisted the fact. It is fast now, but the expensive work is the duplicate removal in RHN_DS_V_METER_READINGS: persist that view and remove the persistence of the fact.'
      : 'RHN_DS_V_METER_READINGS is still virtual. Persist it in the Data Integration Monitor of RHN_DSL, tab Views.';
  }
  if (o.status === 'changes') return 'RHN_DS_V_METER_READINGS has saved changes that are not deployed.';
  return null;
};

export const CHAPTER_9: Mission[] = [
  {
    id: 'c09-m01',
    chapter: 9,
    title: 'Slow at month-end',
    from: CFO,
    ticket: `<p>Petra Lindner. First working day of the month, and the consumption story in SAP Analytics Cloud takes ages to open.
      The invoice story is fine. Please make it fast before the board meeting.</p>
      <p><i>Calin adds:</i> Don't guess, measure. Switch on <b>expensive statement tracing</b> (System › Configuration › Monitoring), then let
      the controllers open their stories and look at <b>Monitoring › Expensive Statement Logs</b>. It lists every statement above the threshold,
      in all spaces.</p>`,
    tasks: [
      'In <b>System › Configuration › Monitoring</b>, enable expensive statement tracing with a threshold of 1,000 ms and save.',
      'Open <b>Monitoring › Expensive Statement Logs</b> and sort by duration.',
      'Answer the questions below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'System is at the bottom of the side navigation, Configuration has an area Monitoring. Expensive Statement Logs is in the Monitoring group at the top.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'Without tracing, nothing is recorded. The log shows the object each statement read; compare the durations per object.' },
      { label: 'Hint 3: the answer', cost: 25, text: 'The statements on RHN_PR_AM_CONSUMPTION take around seven seconds, those on the invoice model under two.' },
    ],
    checks: [
      { type: 'rule', label: 'Tracing is on', ok: 'Expensive statement tracing records statements above the threshold.', test: tracingOn },
      {
        type: 'rule', label: 'Threshold', ok: 'Threshold 1,000 ms.',
        test: ({ tenant }) => (tenant.tracing.thresholdMs === 1000 ? null : `The threshold is ${tenant.tracing.thresholdMs.toLocaleString('en-US')} ms. Calin wants 1,000 ms: lower floods the log, higher hides the slow stories.`),
      },
      {
        type: 'rule', label: 'You read the log', ok: 'You opened the Expensive Statement Logs.',
        test: ({ events }) => (events.has('app:statements') ? null : 'Open Monitoring › Expensive Statement Logs.'),
      },
      {
        type: 'question', id: 'slowest', label: 'Which object',
        prompt: 'Which object do the slowest statements read?',
        options: ['RHN_PR_AM_INVOICES', 'RHN_PR_AM_CONSUMPTION', 'RHN_DS_D_CUSTOMER', 'RHN_ENTRY.METER_READINGS'],
        answer: 1,
        nudge: 'Not quite. Sort the log by duration and look at the column Object of the top rows.',
      },
      {
        type: 'question', id: 'howlong', label: 'How long',
        prompt: 'About how long does one of those statements take?',
        options: ['About 0.7 seconds', 'About 2 seconds', 'About 7 seconds', 'About 70 seconds'],
        answer: 2,
        nudge: 'Not quite. Read the column Duration of the slowest rows.',
      },
    ],
    xp: 40,
    realTenant: `In a real tenant: <b>System › Configuration › Monitoring</b>, <i>Enable Expensive Statement Tracing</i>, with thresholds for
      duration, memory and CPU time. The statements appear in the System Monitor (Logs › Statements) and in Expensive Statement Logs.
      Leave tracing on only as long as you need it, with sensible thresholds.`,
    debrief: `<p>So it is the consumption model, and it is not a little slow: seven seconds before a story even shows a number.</p>
      <p><i>Calin adds:</i> The log tells you <b>which</b> model is slow, not <b>why</b>. A model reads a fact, the fact reads views, those read
      tables. Next we look into that stack.</p>`,
  },
  {
    id: 'c09-m02',
    chapter: 9,
    title: 'Persist the expensive layer',
    from: CALIN,
    ticket: `<p>The consumption model in <code>RHN_PRES</code> reads a shared fact, so the work happens in <code>RHN_DSL</code>. Open the
      <b>Data Integration Monitor</b> in <code>RHN_DSL</code>, tab <b>Views</b>, select the fact <code>RHN_DS_F_CONSUMPTION</code>
      and start the <b>View Analyzer</b>. It shows the fact with everything below it and what each level costs.</p>
      <p>Then <b>persist</b> the view where the expensive work happens: its result is stored as a snapshot, and nothing below it is computed
      when someone reads it. Check the consumption model afterwards: its Data Preview shows the runtime at production volume.</p>`,
    tasks: [
      'Data Integration Monitor › <code>RHN_DSL</code> › Views: select <code>RHN_DS_F_CONSUMPTION</code> and start the <b>View Analyzer</b>.',
      'Persist the view that does the expensive work: <b>Start Data Persistence</b> in the monitor of its space.',
      'Open <code>RHN_PR_AM_CONSUMPTION</code> in the Data Builder, run its Data Preview and answer the questions below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'The monitor shows one space; change it with the space selector at the top right. View Analyzer is the last button above the list of views.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'Look at the column Own runtime. The fact only joins; one level below, a view removes duplicates from all meter readings.' },
      { label: 'Hint 3: the setup', cost: 25, text: 'Space RHN_DSL, tab Views, select RHN_DS_V_METER_READINGS, Start Data Persistence. Then the Data Preview of RHN_PR_AM_CONSUMPTION.' },
    ],
    checks: [
      {
        type: 'rule', label: 'You analyzed the fact', ok: 'The View Analyzer showed the stack below RHN_DS_F_CONSUMPTION.',
        test: ({ events }) => (events.has(`analyzer:${F_CONS}`) ? null : 'Start the View Analyzer on RHN_DS_F_CONSUMPTION (Data Integration Monitor, space RHN_DSL, tab Views).'),
      },
      { type: 'rule', label: 'The readings are persisted', ok: 'RHN_DS_V_METER_READINGS reads its snapshot.', test: readingsPersisted },
      {
        type: 'rule', label: 'Only where it pays', ok: 'The fact stays virtual and reads the persisted readings.',
        test: ({ tenant }) => (findObject(tenant, F_CONS)?.persisted
          ? 'RHN_DS_F_CONSUMPTION is persisted. Its snapshot also freezes the contract join, and with the readings persisted it would be a second copy of the same data. Remove its persisted data.'
          : null),
      },
      {
        type: 'rule', label: 'The model is fast now', ok: 'The Data Preview of the consumption model runs in under three seconds at production volume.',
        test: ({ events }) => {
          const runs = [...events].filter((e) => e.startsWith(`am-runtime:${AM_CONS}:`)).map((e) => Number(e.split(':').pop()));
          if (!runs.length) return 'Run the Data Preview of RHN_PR_AM_CONSUMPTION after persisting.';
          return runs.some((ms) => ms < FAST_MS) ? null : 'The last Data Preview of RHN_PR_AM_CONSUMPTION was still slow. Persist first, then run the preview again.';
        },
      },
      {
        type: 'question', id: 'why-here', label: 'Why this level',
        prompt: 'Why persist RHN_DS_V_METER_READINGS and not the fact RHN_DS_F_CONSUMPTION?',
        options: [
          'Facts can never be persisted',
          'The expensive work (duplicate removal on all readings) happens there; the fact then only joins, keeps reading current contracts, and every other view on readings profits too',
          'The data & semantic space has more memory',
          'It makes no difference where you persist',
        ],
        answer: 1,
        nudge: 'Not quite. Where does the View Analyzer show the biggest own runtime, and who else could read that view?',
      },
      {
        type: 'question', id: 'after', label: 'The new runtime',
        prompt: 'About how long does the consumption model take now at production volume?',
        options: ['About 7 seconds, persisting changes nothing for the model', 'About 1.5 seconds', 'About 50 milliseconds', 'It fails, because the fact has a data access control'],
        answer: 1,
        nudge: 'Not quite. Run the Data Preview of RHN_PR_AM_CONSUMPTION and read the runtime at production volume in its status line.',
      },
    ],
    xp: 55,
    realTenant: `In a real tenant: <b>Data Integration Monitor › Views</b> lists the views of the space. <i>Start Data Persistence</i> runs the
      view and stores the result; the View Analyzer simulates the persistence and shows memory figures per view. In the view editor, the
      section Persistency offers the same actions. Persisting needs in-memory or disk storage of the space.`,
    debrief: `<p>Petra wrote: "Opened in a second and a half. Thank you."</p>
      <p><i>Calin adds:</i> And here is the catch: a snapshot is a copy. New meter readings arrive every day; the snapshot does not see them.</p>`,
  },
  {
    id: 'c09-m03',
    chapter: 9,
    title: 'Fresh every morning',
    from: CALIN,
    ticket: `<p>The MDM replication delivers new meter readings continuously. The persisted readings only change when the persistence runs.
      The controllers want yesterday's readings in the morning, not last month's.</p>
      <p>Schedule the persistence of <code>RHN_DS_V_METER_READINGS</code> <b>daily</b>. Scheduled tasks run in your name, so your consent
      for job scheduling must be valid.</p>`,
    tasks: [
      'Data Integration Monitor › <code>RHN_DSL</code> › Views: <b>Schedule</b> the persistence of <code>RHN_DS_V_METER_READINGS</code> daily.',
      'Answer the questions below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Same list as before: select the view, then Schedule above the list.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'Between two runs the snapshot shows the state of the last run. The schedule decides how old the data can get.' },
      { label: 'Hint 3: the setup', cost: 25, text: 'RHN_DS_V_METER_READINGS → Schedule → Daily → Save schedule. Questions: last snapshot; memory of RHN_DSL.' },
    ],
    checks: [
      { type: 'rule', label: 'Still persisted', ok: 'RHN_DS_V_METER_READINGS is persisted.', test: readingsPersisted },
      {
        type: 'rule', label: 'Daily schedule', ok: 'The persistence runs daily.',
        test: ({ tenant }) => {
          const s = findObject(tenant, READINGS)?.persistSchedule;
          if (!s) return 'RHN_DS_V_METER_READINGS has no schedule yet.';
          return s === 'Daily' ? null : `The persistence runs ${s.toLowerCase()}. The controllers want yesterday's readings every morning.`;
        },
      },
      {
        type: 'question', id: 'between', label: 'Between two runs',
        prompt: 'New readings are replicated at 10:00. What does the consumption model show at 11:00, if the persistence ran at 06:00?',
        options: ['The new readings, the replication updates the snapshot', 'The readings as of 06:00: the new ones appear after the next persistence run', 'Nothing, the snapshot is locked', 'An error until the next run'],
        answer: 1,
        nudge: 'Not quite. A persisted view returns its stored result. When is that result computed?',
      },
      {
        type: 'question', id: 'cost', label: 'The price',
        prompt: 'What does the persistence cost?',
        options: ['Nothing, a snapshot is free', 'Storage (in-memory or disk) of the space RHN_DSL, plus a run of the full view every day', 'A license per persisted view', 'The data access controls of the space'],
        answer: 1,
        nudge: 'Not quite. Where is the snapshot stored, and what happens at every run?',
      },
    ],
    xp: 40,
    realTenant: `In a real tenant: <b>Data Integration Monitor › Views › Schedule</b> (simple schedule or cron expression), or in a task chain
      after the replication, so the snapshot is built after the newest data arrived. Chapter 10 builds such a chain.`,
    debrief: `<p>Persisted, scheduled, fast. And you know what it costs.</p>
      <p><i>Calin adds:</i> Not every view can be persisted, and not every persisted view should stay persisted. Markus has a request.</p>`,
  },
  {
    id: 'c09-m04',
    chapter: 9,
    title: 'Not everything, not everywhere',
    from: NORTH_MGR,
    ticket: `<p>Markus Brandt. Tim built me the view <code>RHN_PR_V_REGION_REVENUE</code>: net revenue per region and year, read from the
      invoice fact. It is slow, too. Please persist it like the readings.</p>
      <p><i>Calin adds:</i> It is a consumption view in the presentation layer, on the shared fact. Try it, and read the run's messages. While you are in the monitor: someone persisted <code>RHN_DS_V_TARIFFS</code>
      in <code>RHN_DSL</code>, five rows, refreshed daily. Look at what it costs and what it saves, and clean up.</p>`,
    tasks: [
      'Data Integration Monitor › <code>RHN_PRES</code> › Views: try <b>Start Data Persistence</b> on <code>RHN_PR_V_REGION_REVENUE</code> and read the messages of the run.',
      'In <code>RHN_DSL</code>, <b>Remove Persisted Data</b> of <code>RHN_DS_V_TARIFFS</code> and remove its schedule.',
      'Answer the questions below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Click the view name to see its runs; the messages are on the right. Remove Persisted Data and Schedule are in the toolbar of the list.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'Which object below RHN_PR_V_REGION_REVENUE has a data access control? And how much work is it to compute five tariffs?' },
      { label: 'Hint 3: the setup', cost: 25, text: 'RHN_PR_V_REGION_REVENUE fails because it reads RHN_DS_F_INVOICES (protected). RHN_DS_V_TARIFFS: Remove Persisted Data, Schedule → No schedule.' },
    ],
    checks: [
      {
        type: 'rule', label: 'You tried it', ok: 'The run stopped with the reason in its messages.',
        test: ({ events, tenant }) => (findObject(tenant, REVENUE)?.persisted
          ? 'RHN_PR_V_REGION_REVENUE is persisted. That must not happen: it reads a protected fact.'
          : events.has(`persist-fail:${REVENUE}`) ? null : 'Start Data Persistence on RHN_PR_V_REGION_REVENUE in the monitor of RHN_PRES and read the run.'),
      },
      {
        type: 'rule', label: 'Tariffs read virtually', ok: 'RHN_DS_V_TARIFFS is virtual again, without a schedule.',
        test: ({ tenant }) => {
          const o = findObject(tenant, TARIFFS);
          if (!o) return 'RHN_DS_V_TARIFFS is missing.';
          if (o.persisted) return 'RHN_DS_V_TARIFFS is still persisted. Remove Persisted Data in the monitor of RHN_DSL.';
          return o.persistSchedule ? `RHN_DS_V_TARIFFS still has a ${o.persistSchedule.toLowerCase()} schedule. Set it to No schedule.` : null;
        },
      },
      { type: 'rule', label: 'The readings stay', ok: 'RHN_DS_V_METER_READINGS is still persisted.', test: readingsPersisted },
      {
        type: 'question', id: 'why-fail', label: 'Why it failed',
        prompt: 'Why can RHN_PR_V_REGION_REVENUE not be persisted?',
        options: [
          'Views with GROUP BY cannot be persisted',
          'It reads RHN_DS_F_INVOICES, which has a data access control. A snapshot would store rows of all users and bypass the control, so a view that uses a protected view cannot be persisted',
          'RHN_PRES has no memory left',
          'Only views in RHN_DSL can be persisted',
        ],
        answer: 1,
        nudge: 'Not quite. Read the messages of the failed run. What does the view read?',
      },
      {
        type: 'question', id: 'instead', label: 'What Markus can get instead',
        prompt: 'How can Markus\'s view still get faster, without losing the protection?',
        options: [
          'Remove the data access control from the invoice fact',
          'Persist the expensive work below the protected fact (e.g. a base view in RHN_DSL), so the protected fact and the view on it stay virtual',
          'Copy the data into a local table every night',
          'Give Markus the CFO\'s user',
        ],
        answer: 1,
        nudge: 'Not quite. The control must stay on the fact. Where else can a snapshot help without storing protected rows?',
      },
    ],
    xp: 50,
    realTenant: `SAP documents the limit in "Persisted Views and Data Access Control": a view that consumes a view with a data access control
      cannot be persisted (Handbuch 9.3.7). A view with its own data access control can be persisted; the control still filters when users read it. A redeploy with structural changes may delete the persistence (Data Access back to Virtual).
      Small views on small tables are cheap to compute; their snapshot only adds runs and memory.`,
    debrief: `<p>Fair enough. I would rather wait two seconds than see Aylin's numbers.</p>
      <p><i>Calin adds:</i> That is chapter 9: measure, analyze, persist where the work is, schedule it, and know the limits. Next: operations,
      with task chains that persist after the replication finished.</p>`,
    setup: (t) => {
      if (!t.objects.some((o) => o.space === 'RHN_PRES' && o.name === 'RHN_PR_V_REGION_REVENUE')) {
        const sql = `SELECT g.REGION, YEAR(f.INVOICE_DATE) AS INVOICE_YEAR, SUM(f.NET_AMOUNT) AS NET_AMOUNT
FROM RHN_DSL.RHN_DS_F_INVOICES f
JOIN RHN_DSL.RHN_DS_D_GRID_AREA g ON g.GRID_AREA = f.GRID_AREA
GROUP BY g.REGION, YEAR(f.INVOICE_DATE)`;
        t.objects.push({
          space: 'RHN_PRES', name: 'RHN_PR_V_REGION_REVENUE', kind: 'SQL View', businessName: 'Revenue per Region (Tim)', semanticUsage: 'Relational Dataset',
          sql, deployed: { businessName: 'Revenue per Region (Tim)', sql, semanticUsage: 'Relational Dataset' }, status: 'deployed', changedAt: new Date().toISOString(),
        });
      }
      const tariffs = t.objects.find((o) => o.space === 'RHN_DSL' && o.name === 'RHN_DS_V_TARIFFS');
      if (tariffs?.deployed?.sql && !tariffs.persisted) {
        tariffs.persisted = { lastRefresh: new Date(Date.now() - 6 * 3600_000).toISOString(), records: 5, columns: 6 };
        tariffs.persistSchedule = 'Daily';
      }
    },
  },
];
