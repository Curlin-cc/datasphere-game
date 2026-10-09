import type { Mission } from '../../missions/types';
import type { TenantState } from '../../tenant';
import { isShared } from '../../tenant';
import { findObject, type RepoObject } from '../../repo';
import { findConnection, validateConnection, lastRun, addRun, type Run } from '../../integration';
import { runChain, type ChainDef } from '../../taskchain';
import { M03_COLS, project, refCustomers } from './c05';

/**
 * Chapter 10, Operations (Handbuch 6.8, 10.3.6, 10.3.8, 10.5, 10.6 Ablauf C). Task chains: a chain in RHN_IN that loads the
 * daily CRM file, shared with RHN_HARM and nested in the nightly chain there, which then persists the customers and the
 * meter readings; one schedule instead of three, a failure email to the on-call integrator. Then a real failure: a deployed
 * change that only breaks at run time, found from the chain run down to the step's own monitor. Finally the cross-space view
 * in Task Logs.
 */

const CALIN = { name: 'Calin Mucea', role: 'Senior Data Architect, your mentor', initials: 'CM' };
const LENA = { name: 'Lena Hoffmann', role: 'Integration Engineer, on call for loads', initials: 'LH' };
const IT = { name: 'Jonas Becker', role: 'Head of IT, tenant owner', initials: 'JB' };

const CRM_FLOW = 'RHN_IN.RHN_IN_RF_CRM';
const MDM_FLOW = 'RHN_IN.RHN_IN_RF_MDM';
const S4_FLOW = 'RHN_IN.RHN_IN_RF_S4U';
const IN_CHAIN = 'RHN_IN.RHN_IN_TC_CRM';
const NIGHTLY = 'RHN_HARM.RHN_HARM_TC_NIGHTLY';
const CUSTOMERS = 'RHN_HARM.RHN_HA_V_CUSTOMERS';
const READINGS = 'RHN_HARM.RHN_HA_V_METER_READINGS';

const nameOf = (key: string) => key.split('.')[1];

/** The deployed definition of a chain, or why it cannot be checked. */
function chainOf(t: TenantState, key: string): { def: ChainDef | null; o?: RepoObject; problem: string | null } {
  const o = findObject(t, key);
  const name = nameOf(key);
  if (!o) {
    const elsewhere = t.objects.find((x) => x.name === name);
    return { def: null, problem: elsewhere ? `${name} is in ${elsewhere.space}; it belongs in ${key.split('.')[0]}.` : `There is no task chain ${name} in ${key.split('.')[0]} yet.` };
  }
  if (o.kind !== 'Task Chain') return { def: null, problem: `${name} is a ${o.kind}. Create it from the tile Task Chain.` };
  if (!o.deployed?.chain) return { def: null, problem: `${name} is saved, but not deployed.` };
  if (o.status === 'changes') return { def: null, problem: `${name} has saved changes that are not deployed yet.` };
  return { def: o.deployed.chain, o, problem: null };
}

/** The last run of an object is completed and started after `since` (ISO), if given. */
function ranOk(t: TenantState, key: string, since?: string): string | null {
  const r = lastRun(t, key);
  if (!r) return `${nameOf(key)} has not run yet. Run it in the Data Integration Monitor (tab Task Chains) or in its editor.`;
  if (r.status === 'Failed') return `The last run of ${nameOf(key)} failed. Open it in the Data Integration Monitor and read the step that failed.`;
  if (since && r.start < since) return `The last completed run of ${nameOf(key)} is older than the failure. Run it again after the fix.`;
  return null;
}

/** Makes sure the chapter-3 objects exist (connections, flows), for players who skipped parts or for test saves. */
export function ensureInbound(t: TenantState) {
  const at = new Date().toISOString();
  if (!findConnection(t, 'RHN_IN', 'RHN_CRM')) {
    const c = { space: 'RHN_IN', name: 'RHN_CRM', businessName: 'CRM Export', type: 'S3', host: 'rheinau-crm-export', onprem: false, locationId: '', tls: true, auth: 'Access Key', changedAt: at };
    t.connections.push(c);
  }
  const crm = findConnection(t, 'RHN_IN', 'RHN_CRM')!;
  if (!crm.validation?.ok) crm.validation = validateConnection(t, crm);
  if (!findObject(t, CRM_FLOW)) {
    const flow = { connection: 'RHN_CRM', objects: [{ source: 'customers/CRM_CUSTOMERS.csv', target: 'CRM_CUSTOMERS', loadType: 'Initial Only' as const, truncate: true, extra: [{ name: 'SRC_SYS_ID', value: 'CRM' }] }], schedule: 'Daily' as const };
    t.objects.push({ space: 'RHN_IN', name: 'RHN_IN_RF_CRM', kind: 'Replication Flow', businessName: 'CRM customer file', semanticUsage: 'Relational Dataset', flow, deployed: { businessName: 'CRM customer file', flow: structuredClone(flow) }, status: 'deployed', changedAt: at });
  }
  if (!findConnection(t, 'RHN_IN', 'RHN_MDM')) {
    const c = { space: 'RHN_IN', name: 'RHN_MDM', businessName: 'Meter Data (MDM)', type: 'HANA', host: 'mdm-db.rheinau.local', onprem: true, locationId: 'RHEINAU_DC', tls: true, auth: 'User Name and Password', changedAt: at };
    t.connections.push(c);
    if (!t.certificates.includes('Rheinau Root CA')) t.certificates.push('Rheinau Root CA');
  }
  const mdm = findConnection(t, 'RHN_IN', 'RHN_MDM')!;
  if (!mdm.validation?.ok) mdm.validation = validateConnection(t, mdm);
  if (!findObject(t, MDM_FLOW)) {
    const flow = { connection: 'RHN_MDM', objects: [{ source: 'METER_READINGS', target: 'METER_READINGS', loadType: 'Initial and Delta' as const, truncate: false, extra: [] }] };
    t.objects.push({ space: 'RHN_IN', name: 'RHN_IN_RF_MDM', kind: 'Replication Flow', businessName: 'Meter readings from MDM (Lena)', semanticUsage: 'Relational Dataset', flow, deployed: { businessName: 'Meter readings from MDM (Lena)', flow: structuredClone(flow) }, status: 'deployed', changedAt: at });
  }
  t.consent = true;
}

/** Tim's change from yesterday: a customer number as integer. Deploys fine, fails on the first 'K-…' ID at run time. */
export const TIM_SUFFIX = 'CAST(x.CUSTOMER_ID AS INTEGER) AS CUSTOMER_NO';

export const CHAPTER_10: Mission[] = [
  {
    id: 'c10-m01',
    chapter: 10,
    title: 'One chain per space',
    from: CALIN,
    ticket: `<p>Three schedules run our nights today: the CRM file flow, the persisted readings, and soon the customers. Nobody sees the
      order, and when one fails the next runs anyway. Time for <b>task chains</b>: several tasks as one unit, in a fixed order, one schedule.</p>
      <p>A chain runs the objects of its own space. Start in <code>RHN_IN</code>: a task chain <code>RHN_IN_TC_CRM</code> that runs the
      replication flow <code>RHN_IN_RF_CRM</code>. Try to add Lena's <code>RHN_IN_RF_MDM</code> too, and see what happens. Then share the chain
      with <code>RHN_HARM</code>, where the nightly chain will call it, and remove the flow's own schedule: the chains take over.</p>`,
    tasks: [
      'In <code>RHN_IN</code>, create a <b>Task Chain</b> <code>RHN_IN_TC_CRM</code> with the step <code>RHN_IN_RF_CRM</code>. Try to add <code>RHN_IN_RF_MDM</code>.',
      'Deploy the chain and <b>run</b> it once.',
      'Share it with <code>RHN_HARM</code>, and remove the schedule of <code>RHN_IN_RF_CRM</code> (Data Integration Monitor › Flows).',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Task Chain is a tile on the Data Builder start page. Add Step lists the deployed objects of the space. Run is in the toolbar of the editor once the chain is deployed.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'A task chain waits for each step to end before the next starts. Which of the two flows never ends?' },
      { label: 'Hint 3: the setup', cost: 25, text: 'RHN_IN_TC_CRM: one step RHN_IN_RF_CRM, Deploy, Run. Share icon in the object list → RHN_HARM. Monitor › RHN_IN › Flows › RHN_IN_RF_CRM › Schedule → No schedule.' },
    ],
    setup: ensureInbound,
    checks: [
      {
        type: 'rule', label: 'The chain', ok: 'RHN_IN_TC_CRM runs RHN_IN_RF_CRM.',
        test: ({ tenant }) => {
          const c = chainOf(tenant, IN_CHAIN);
          if (!c.def) return c.problem;
          const steps = c.def.steps.map((s) => s.object);
          if (!steps.includes(CRM_FLOW)) return 'RHN_IN_TC_CRM has no step RHN_IN_RF_CRM.';
          return steps.length === 1 ? null : `RHN_IN_TC_CRM has ${steps.length} steps. For now it runs the CRM flow only.`;
        },
      },
      {
        type: 'rule', label: 'You tried the delta flow', ok: 'You saw why the delta flow cannot be a step.',
        test: ({ events }) => (events.has(`chain-refused:${MDM_FLOW}`) ? null : 'Try to add RHN_IN_RF_MDM as a step and read the message.'),
      },
      { type: 'rule', label: 'Run once', ok: 'The chain ran and completed.', test: ({ tenant }) => ranOk(tenant, IN_CHAIN) },
      {
        type: 'rule', label: 'Shared with RHN_HARM', ok: 'RHN_HARM can nest the chain.',
        test: ({ tenant }) => (isShared(tenant, IN_CHAIN, 'RHN_HARM') ? null : 'RHN_IN_TC_CRM is not shared with RHN_HARM yet.'),
      },
      {
        type: 'rule', label: 'One schedule, not two', ok: 'RHN_IN_RF_CRM has no schedule of its own any more.',
        test: ({ tenant }) => {
          const f = findObject(tenant, CRM_FLOW);
          return f?.deployed?.flow?.schedule ? `RHN_IN_RF_CRM still runs ${f.deployed.flow.schedule.toLowerCase()} on its own. Remove that schedule: the chain will run it.` : null;
        },
      },
      {
        type: 'question', id: 'delta', label: 'Why not the delta flow',
        prompt: 'Why can RHN_IN_RF_MDM not be a step of the chain?',
        options: [
          'Flows from on-premise sources cannot be in task chains',
          'It has load type Initial and Delta: it keeps replicating and never ends, so the chain would wait forever. Chains run flows with Initial Only',
          'It belongs to Lena',
          'A chain may only have one step per connection',
        ],
        answer: 1,
        nudge: 'Not quite. A step starts when the one before it has ended. When does a delta replication end?',
      },
    ],
    xp: 50,
    realTenant: `In a real tenant: <b>Data Builder › New Task Chain</b>, drag objects from the repository onto the canvas, deploy, then
      <b>Run</b> or <b>Schedule</b>. Replication flows in a chain usually have load type Initial Only. Since 2024 task chains can be
      shared with other spaces and nested there ("global" task chains).`,
    debrief: `<p>The inbound part of the night is one object now. Next: the chain in RHN_HARM that calls it and then persists.</p>`,
  },
  {
    id: 'c10-m02',
    chapter: 10,
    title: 'The night in order',
    from: CALIN,
    ticket: `<p>Now the chain that runs the whole night: <code>RHN_HARM_TC_NIGHTLY</code> in <code>RHN_HARM</code>.</p>
      <ol><li>Load the CRM file: the chain <code>RHN_IN_TC_CRM</code> from RHN_IN.</li>
        <li>Persist <code>RHN_HA_V_CUSTOMERS</code>: removing duplicates from all customers is expensive too, and the controllers read it every day.</li>
        <li>Persist <code>RHN_HA_V_METER_READINGS</code>.</li></ol>
      <p>The order matters. <b>Email notification</b> on failure to Lena (<code>LHOFFMANN</code>), who is on call. Schedule the chain
      <b>daily</b>, remove the separate schedule of the readings from chapter 9, and run it once.</p>`,
    tasks: [
      'In <code>RHN_HARM</code>, create <code>RHN_HARM_TC_NIGHTLY</code> with the three steps in the right order.',
      'Email notification when the chain fails, to <code>LHOFFMANN</code>. Deploy.',
      'Schedule it <b>daily</b> and run it once. Remove the schedule of <code>RHN_HA_V_METER_READINGS</code> (Data Integration Monitor › Views).',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Add Step lists the views of RHN_HARM under View Persistence and the shared chain under Task Chain. Arrows move a step up or down.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'The customer view reads the CRM table. Which step must be done before it can be persisted?' },
      { label: 'Hint 3: the setup', cost: 25, text: '1 RHN_IN_TC_CRM, 2 RHN_HA_V_CUSTOMERS, 3 RHN_HA_V_METER_READINGS · When the task chain fails ✓, recipients LHOFFMANN · Deploy · Schedule Daily · Run.' },
    ],
    checks: [
      {
        type: 'rule', label: 'Three steps', ok: 'The nightly chain loads the file, then persists customers and readings.',
        test: ({ tenant }) => {
          const c = chainOf(tenant, NIGHTLY);
          if (!c.def) return c.problem;
          const steps = c.def.steps.map((s) => s.object);
          const missing = [IN_CHAIN, CUSTOMERS, READINGS].filter((k) => !steps.includes(k));
          if (missing.length) return `RHN_HARM_TC_NIGHTLY has no step ${missing.map(nameOf).join(', ')}.`;
          return steps.length === 3 ? null : `RHN_HARM_TC_NIGHTLY has ${steps.length} steps; the night needs exactly these three.`;
        },
      },
      {
        type: 'rule', label: 'In the right order', ok: 'The CRM file is loaded before the customers are persisted.',
        test: ({ tenant }) => {
          const steps = chainOf(tenant, NIGHTLY).def?.steps.map((s) => s.object) ?? [];
          if (!steps.length) return 'Build the chain first.';
          return steps.indexOf(IN_CHAIN) < steps.indexOf(CUSTOMERS) ? null
            : 'RHN_HA_V_CUSTOMERS is persisted before the CRM file is loaded. The snapshot would hold yesterday\'s customers until the next night.';
        },
      },
      {
        type: 'rule', label: 'Lena hears about failures', ok: 'A failed run sends an email to LHOFFMANN.',
        test: ({ tenant }) => {
          const n = chainOf(tenant, NIGHTLY).def?.notify;
          if (!n) return 'Build the chain first.';
          if (!n.onFailure) return 'The chain sends no email when it fails. Tick "When the task chain fails" and deploy.';
          return /lhoffmann/i.test(n.recipients) ? null : `The failure email goes to "${n.recipients}". Lena (LHOFFMANN) is on call.`;
        },
      },
      {
        type: 'rule', label: 'Daily, one schedule', ok: 'The chain runs daily; the readings have no schedule of their own.',
        test: ({ tenant }) => {
          const c = findObject(tenant, NIGHTLY);
          if (!c?.chainSchedule) return 'RHN_HARM_TC_NIGHTLY has no schedule yet.';
          if (c.chainSchedule !== 'Daily') return `The chain runs ${c.chainSchedule.toLowerCase()}. The controllers want fresh data every morning.`;
          return findObject(tenant, READINGS)?.persistSchedule
            ? 'RHN_HA_V_METER_READINGS still has its own schedule from chapter 9. Remove it: two schedules for one snapshot run it twice a night.'
            : null;
        },
      },
      { type: 'rule', label: 'Run once', ok: 'The nightly chain completed.', test: ({ tenant }) => ranOk(tenant, NIGHTLY) },
      {
        type: 'question', id: 'order', label: 'Why the order',
        prompt: 'What happens if RHN_HA_V_CUSTOMERS is persisted before the CRM file is loaded?',
        options: [
          'Nothing, persistence always waits for new data',
          'The snapshot is built from yesterday\'s file: new customers appear only a day later',
          'The persistence fails',
          'The CRM flow overwrites the snapshot',
        ],
        answer: 1,
        nudge: 'Not quite. What does the customer view read, and when is its snapshot computed?',
      },
    ],
    xp: 55,
    realTenant: `In a real tenant: the nightly chain nests the shared chain of the inbound space, followed by two persistence tasks. Parallel
      branches (here: customers and readings could run side by side) are joined by an ALL or ANY operator; the game runs steps in sequence.
      The email notification is set in the chain's editor.`,
    debrief: `<p>One schedule, one order, one email if something goes wrong. Lena says thank you in advance.</p>
      <p><i>Calin adds:</i> Let's hope she does not need it. Good night.</p>`,
  },
  {
    id: 'c10-m03',
    chapter: 10,
    title: 'The failure email',
    from: LENA,
    ticket: `<p>Lena here. The email came in: the scheduled run of <code>RHN_HARM_TC_NIGHTLY</code> failed. The controllers' customer
      numbers are from yesterday.</p>
      <p>Tim says he deployed a small change yesterday afternoon, "it deployed without errors". Please find the step that failed, read its
      own log, fix the cause, and run the chain again.</p>`,
    tasks: [
      'Data Integration Monitor › <code>RHN_HARM</code> › Task Chains: open the failed run of <code>RHN_HARM_TC_NIGHTLY</code> and the step that failed.',
      'Find the cause in the step\'s own log and fix the view in the Data Builder. Deploy.',
      'Run the chain again. Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'The failed step is a link: it opens the Views monitor with the view selected and its run log.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'Customer IDs look like K-100501. What happens when such a value is converted to a number?' },
      { label: 'Hint 3: the fix', cost: 25, text: 'In RHN_HA_V_CUSTOMERS, remove Tim\'s CAST line, or convert only the digits: CAST(SUBSTR(x.CUSTOMER_ID, 3) AS INTEGER). Deploy, then Run the chain.' },
    ],
    setup: (t) => {
      ensureInbound(t);
      const v = findObject(t, CUSTOMERS);
      if (v?.deployed?.sql && !v.deployed.sql.includes('CUSTOMER_NO')) {
        const sql = `SELECT x.*, ${TIM_SUFFIX}\nFROM (\n${v.deployed.sql.trim().replace(/;\s*$/, '')}\n) x`;
        v.sql = sql;
        v.deployed.sql = sql;
        v.status = 'deployed';
        v.changedAt = new Date(Date.now() - 12 * 3600_000).toISOString();
      }
    },
    setupAsync: async (t) => {
      const chain = findObject(t, NIGHTLY);
      // The scheduled run (the game's clock does not move, so it is logged now).
      if (chain?.deployed?.chain) await runChain(t, chain, 'Scheduled');
    },
    checks: [
      {
        type: 'rule', label: 'You followed the trail', ok: 'From the chain run to the step\'s own log.',
        test: ({ events }) => (events.has(`chain-step-open:${CUSTOMERS}`) || events.has(`monitor-open:${CUSTOMERS}`)
          ? null : 'Open the failed run of RHN_HARM_TC_NIGHTLY and click the step that failed to see its own log.'),
      },
      {
        type: 'result', label: 'Customers are right again', object: CUSTOMERS, columns: M03_COLS, expected: project(M03_COLS, refCustomers()),
      },
      {
        type: 'rule', label: 'The night runs again', ok: 'RHN_HARM_TC_NIGHTLY completed after the fix.',
        test: ({ tenant }) => {
          const failed = tenant.runs.find((r: Run) => r.object === NIGHTLY && r.status === 'Failed');
          return ranOk(tenant, NIGHTLY, failed?.start);
        },
      },
      {
        type: 'rule', label: 'Customers persisted', ok: 'RHN_HA_V_CUSTOMERS reads a fresh snapshot.',
        test: ({ tenant }) => (findObject(tenant, CUSTOMERS)?.persisted ? null : 'RHN_HA_V_CUSTOMERS is not persisted. Deploying removed its snapshot: run the chain again.'),
      },
      {
        type: 'question', id: 'why-deploy', label: 'Deployed, yet failed',
        prompt: 'Why did Tim\'s change deploy without errors, but fail at night?',
        options: [
          'The night runs with fewer rights than Tim',
          'Deploy checks the structure (columns, types, references). The conversion of the data is only done when the view runs, and the first value K-… cannot become a number',
          'The CRM file was broken last night',
          'Persistence does not support CAST',
        ],
        answer: 1,
        nudge: 'Not quite. Read the error in the step\'s log. Which value could not be converted, and when is a value converted?',
      },
    ],
    xp: 55,
    realTenant: `Handbuch 10.6, Ablauf C: get the email or open the Task Chains monitor, open the failed run, find the failing step, switch to its
      detail monitor (Views or Flows), read the messages, fix the cause, run again. Run a Data Preview on the whole view before deploying a
      change: it would have shown the conversion error.`,
    debrief: `<p>Customers are back, and I learnt that "deployed" is not the same as "works". Thank you!</p>
      <p><i>Calin adds:</i> Tim will preview his views from now on. One more thing: Jonas wants his weekly look at all spaces.</p>`,
  },
  {
    id: 'c10-m04',
    chapter: 10,
    title: 'The weekly look',
    from: IT,
    ticket: `<p>Jonas Becker. Every Friday I look at what failed in the tenant this week, across all spaces. The Data Integration Monitor shows
      one space at a time; for my look there is <b>Monitoring › Task Logs</b>.</p>
      <p>Please filter the failed runs of all spaces, open them, and tell me which object keeps failing and why.</p>`,
    tasks: [
      'Open <b>Monitoring › Task Logs</b>, filter status <b>Failed</b> in all spaces.',
      'Open the failed runs and read their messages.',
      'Answer the questions below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Task Logs is in the Monitoring group of the side navigation. Click the start time of a run to see its messages.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'Count the failed runs per object. The messages of the same object tell the same story.' },
      { label: 'Hint 3: the answer', cost: 25, text: 'RHN_IN_RF_S4U failed three times: the password of the technical user expired.' },
    ],
    setup: (t) => {
      ensureInbound(t);
      if (!findObject(t, S4_FLOW)) {
        const flow = { connection: 'RHN_S4U', objects: [{ source: 'BILLING_CONTRACTS', target: 'BILLING_CONTRACTS', loadType: 'Initial and Delta' as const, truncate: false, extra: [] }, { source: 'BILLING_INVOICES', target: 'BILLING_INVOICES', loadType: 'Initial and Delta' as const, truncate: false, extra: [] }] };
        t.objects.push({ space: 'RHN_IN', name: 'RHN_IN_RF_S4U', kind: 'Replication Flow', businessName: 'Contracts and invoices from S/4HANA', semanticUsage: 'Relational Dataset', flow, deployed: { businessName: 'Contracts and invoices from S/4HANA', flow: structuredClone(flow) }, status: 'deployed', changedAt: new Date().toISOString() });
      }
      const day = (d: number, h: number) => {
        const x = new Date();
        x.setDate(x.getDate() - d);
        x.setHours(h, 7, 0, 0);
        return x.toISOString();
      };
      const s4fail = (d: number) => addRun(t, {
        object: S4_FLOW, kind: 'Replication Flow', start: day(d, 3), status: 'Failed', records: 0, ms: 4100,
        messages: ['Delta replication: reconnecting to RHN_S4U.', 'Connection RHN_S4U: logon failed for the technical user RHN_REPL. Its password expired on the S/4HANA side.', 'Delta replication stopped. Changes are not replicated until the connection works again.'],
      });
      s4fail(4); s4fail(3); s4fail(1);
      addRun(t, { object: 'RHN_REP.RHN_REP_V_REGION_REVENUE', kind: 'View', start: day(2, 14), status: 'Failed', records: 0, ms: 0,
        messages: ['Manual run: Persist RHN_REP_V_REGION_REVENUE.', 'RHN_REP_V_REGION_REVENUE reads RHN_REP_F_INVOICES, which has a data access control. A view that uses a view with a data access control cannot be persisted.', 'Run stopped. Nothing was persisted.'] });
      addRun(t, { object: 'RHN_HARM.RHN_HA_V_METER_READINGS', kind: 'View', start: day(2, 2), status: 'Completed', records: 5726, ms: 72_200, messages: ['Scheduled run: Persist RHN_HA_V_METER_READINGS.', 'View executed, 5,726 records stored.'] });
      t.runs.sort((a, b) => b.start.localeCompare(a.start));
    },
    checks: [
      {
        type: 'rule', label: 'Failed runs, all spaces', ok: 'You filtered the failed runs of the whole tenant.',
        test: ({ events }) => (events.has('tasklogs-status:Failed') ? null : 'Open Monitoring › Task Logs and filter the status Failed.'),
      },
      {
        type: 'rule', label: 'You read the messages', ok: 'You opened the failed S/4HANA replication.',
        test: ({ events }) => (events.has(`tasklog-open:${S4_FLOW}`) ? null : 'Open one of the failed runs of the object that fails most often and read its messages.'),
      },
      {
        type: 'question', id: 'which', label: 'Which object',
        prompt: 'Which object failed most often this week?',
        options: ['RHN_HARM_TC_NIGHTLY', 'RHN_IN_RF_S4U', 'RHN_REP_V_REGION_REVENUE', 'RHN_HA_V_METER_READINGS'],
        answer: 1,
        nudge: 'Not quite. Count the failed rows per object.',
      },
      {
        type: 'question', id: 'cause', label: 'Why',
        prompt: 'Why does it fail, and who fixes it?',
        options: [
          'The space RHN_IN is full; Jonas assigns more storage',
          'The password of the technical user RHN_REPL expired in S/4HANA; the S/4HANA basis team renews it, then the connection is validated and the replication restarted',
          'A data access control blocks it; audit removes the control',
          'The view is too slow; it needs persistence',
        ],
        answer: 1,
        nudge: 'Not quite. Read the second message of one of those runs.',
      },
      {
        type: 'question', id: 'why-logs', label: 'Why Task Logs',
        prompt: 'Why does Jonas use Task Logs for his weekly look, and not the Data Integration Monitor?',
        options: [
          'Task Logs keeps logs forever',
          'The Data Integration Monitor always shows one space; Task Logs lists the runs of all spaces in one list',
          'Only Task Logs shows failed runs',
          'The Data Integration Monitor is for SAP support only',
        ],
        answer: 1,
        nudge: 'Not quite. How many spaces does the Data Integration Monitor show at once?',
      },
    ],
    xp: 45,
    realTenant: `In a real tenant: <b>Monitoring › Task Logs</b> lists the runs of all spaces, with filters for date range, space and status.
      How long logs are kept is set in <b>System › Configuration › Task Logs</b>. The System Monitor adds storage, memory and out-of-memory
      events per space; external monitoring works through SAP Cloud ALM (license-dependent).`,
    debrief: `<p>Good. I'll call the S/4HANA basis team. Three nights without contract changes is three too many.</p>
      <p><i>Calin adds:</i> That is operations: chains in the right order, one schedule, an email when it breaks, and a weekly look across all
      spaces. One chapter left: the board's request, end to end, on your own.</p>`,
  },
];
