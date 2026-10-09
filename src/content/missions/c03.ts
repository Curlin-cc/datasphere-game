import type { Mission, RuleContext } from '../../missions/types';
import type { TenantState } from '../../tenant';
import { objectKey, type RepoObject } from '../../repo';
import { findConnection, lastRun, runsOf, validateConnection, addRun, type Connection } from '../../integration';
import { round1 } from '../../tenant';

/**
 * Chapter 3, Data integration. Connections per space, on-premise connectivity, remote tables versus
 * replication, replication flows with delta, extra columns while loading, and a failed load.
 * Content follows the SAP Datasphere handbook, chapters 5, 6 and 10 (see src/integration.ts).
 */

const CALIN = { name: 'Calin Mucea', role: 'Senior Data Architect, your mentor', initials: 'CM' };
const IT = { name: 'Jonas Becker', role: 'Head of IT, tenant owner', initials: 'JB' };
const LENA = { name: 'Lena Hoffmann', role: 'Integration Engineer', initials: 'LH' };

const S4_HOST = 'billing.rheinau-s4.example';
const MDM_HOST = 'mdm-db.rheinau.local';
const CRM_BUCKET = 'rheinau-crm-export';

const conn = (t: TenantState, name: string) => findConnection(t, 'RHN_IN', name);
const byHost = (t: TenantState, host: string) => t.connections.filter((c) => c.host.toLowerCase() === host);
const flowIn = (t: TenantState, name: string) => t.objects.find((o) => o.space === 'RHN_IN' && o.name === name && o.kind === 'Replication Flow');
const remoteFor = (t: TenantState, source: string) =>
  t.objects.filter((o) => o.space === 'RHN_IN' && o.kind === 'Remote Table' && o.remote?.connection === 'RHN_S4U' && o.remote.source === source);

/** Common feedback for "the connection X is right". */
function connectionRule(ctx: RuleContext, name: string, host: string, type: string, typeLabel: string): string | null {
  const t = ctx.tenant;
  const c = conn(t, name);
  const elsewhere = byHost(t, host).filter((x) => x.space !== 'RHN_IN');
  if (!c) {
    if (elsewhere.length) return `There is a connection to ${host} in ${elsewhere[0].space}, but all loads land in RHN_IN. A connection belongs to exactly one space: create it in RHN_IN.`;
    const other = byHost(t, host).find((x) => x.space === 'RHN_IN');
    if (other) return `The connection to ${host} is called ${other.name}. The ticket asks for ${name}; the technical name cannot be changed, so create it again with the right name and delete ${other.name}.`;
    return `There is no connection ${name} in RHN_IN yet. Open Connections, select RHN_IN and press Create.`;
  }
  if (c.type !== type) return `${name} has the wrong connection type. The source is ${typeLabel}.`;
  if (c.host.toLowerCase() !== host) return `${name} points to ${c.host || 'no host'}, but the source is ${host}.`;
  return null;
}

function validRule(t: TenantState, name: string): string | null {
  const c = conn(t, name);
  if (!c) return `Create ${name} first.`;
  if (!c.validation) return `${name} has not been validated since its last change. Select it and press Validate.`;
  return c.validation.ok ? null : `The last validation of ${name} failed: ${c.validation.message}`;
}

const flowDeployed = (f: RepoObject | undefined, name: string): string | null => {
  if (!f) return `There is no replication flow ${name} in RHN_IN yet.`;
  if (!f.deployed) return `${name} is saved but not deployed. Deploy it, then run it.`;
  if (f.status === 'changes') return `${name} has saved changes that are not deployed. The run uses the deployed version: deploy again.`;
  return null;
};

const noStray = (c: Connection[]) => c.filter((x) => x.space !== 'RHN_IN');

export const CHAPTER_3: Mission[] = [
  {
    id: 'c03-m01',
    chapter: 3,
    title: 'Connect the billing system',
    from: LENA,
    ticket: `<p>Hi, Lena from integration. Everything in <code>RHN_IN</code> so far is a one-off copy IT made for the pilot.
      Time to connect the real systems, starting with billing: our <b>SAP S/4HANA Cloud</b>.</p>
      <ul>
        <li>Create the connection in the inbound space; every load lands there.</li>
        <li>Host <code>${S4_HOST}</code>, authentication <b>OAuth 2.0</b>. I already set up the technical user.</li>
        <li>Technical name <code>RHN_S4U</code>: our prefix plus the source system ID, the same code you see in <code>SRC_SYS_ID</code>.
          Business name "S/4HANA Billing".</li>
      </ul>
      <p>Then validate it and tell me what we can use it for.</p>`,
    tasks: [
      'Open <b>Connections</b> and select the space <code>RHN_IN</code>.',
      'Create the connection: pick the connection type that matches the source, then enter the details from the ticket.',
      'Select the connection and press <b>Validate</b>. Read which features it offers.',
      'Answer the questions below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 5, text: 'Connections is in the upper group of the side navigation. The space selection is at the top right, Create above the list.' },
      { label: 'Hint 2: the concept', cost: 10, text: 'A connection belongs to one space; only that space can use it. The type decides which features are possible; Validate shows which ones really work.' },
      { label: 'Hint 3: a skeleton', cost: 20, text: 'RHN_IN → Create → SAP S/4HANA Cloud → Host billing.rheinau-s4.example, OAuth 2.0, business name S/4HANA Billing, technical name RHN_S4U → select → Validate.' },
    ],
    checks: [
      { type: 'rule', label: 'Connection in the inbound space', ok: 'RHN_S4U connects RHN_IN to S/4HANA Cloud.', test: (ctx) => connectionRule(ctx, 'RHN_S4U', S4_HOST, 'S4HANA_CLOUD', 'SAP S/4HANA Cloud') },
      {
        type: 'rule', label: 'Authentication', ok: 'OAuth 2.0, as Lena set it up.',
        test: ({ tenant }) => {
          const c = conn(tenant, 'RHN_S4U');
          return !c || c.auth === 'OAuth 2.0' ? null : `RHN_S4U uses ${c.auth}. Lena set up a technical user for OAuth 2.0: edit the connection.`;
        },
      },
      { type: 'rule', label: 'Validated', ok: 'Validation passed.', test: ({ tenant }) => validRule(tenant, 'RHN_S4U') },
      {
        type: 'rule', label: 'No connections in other spaces', ok: 'Only RHN_IN has connections.',
        test: ({ tenant }) => {
          const stray = noStray(tenant.connections);
          return stray.length ? `Delete ${stray.map((c) => `${c.space}.${c.name}`).join(', ')}. Sources are connected in the inbound space only; the other layers read what inbound shares.` : null;
        },
      },
      {
        type: 'question', id: 'who', label: 'Who can use it',
        prompt: 'Who can use RHN_S4U in remote tables and flows?',
        options: ['Everyone in the tenant', 'The members of RHN_IN', 'Only you, because you created it', 'Every space you share it with'],
        answer: 1,
        nudge: 'Not quite. Think about where the connection lives, and what is true for everything that lives in a space.',
      },
      {
        type: 'question', id: 'import', label: 'Model Import',
        prompt: 'Validation lists "Model Import". What is it for?',
        options: [
          'Importing entities from S/4HANA with their semantics (labels, associations), instead of rebuilding them by hand',
          'Uploading CSV files into a table',
          'Copying models to another tenant',
          'Importing users and roles from S/4HANA',
        ],
        answer: 0,
        nudge: 'Not quite. Think of the side navigation entry Semantic Onboarding.',
      },
    ],
    xp: 30,
    realTenant: `<b>Connections</b> → select the space → <b>Create</b> → choose the connection type → enter host, authentication and,
      for on-premise sources, the Cloud Connector → business and technical name → <b>Create</b>. Then select it and press <b>Validate</b>:
      the message lists the features that are available, or says what failed.`,
    debrief: `<p>That's the first door open. Notice what you did not do: copy anything. A connection only says where a system is and how to log on.</p>
      <p>Next comes the hard one: the meter data system sits in our own data center.</p>`,
  },
  {
    id: 'c03-m02',
    chapter: 3,
    title: 'Meter data from the data center',
    from: IT,
    ticket: `<p>The meter data management system (MDM) is not in the cloud. It runs on <b>SAP HANA in our own data center</b>:
      host <code>${MDM_HOST}</code>. The tenant cannot reach it directly.</p>
      <ul>
        <li>We installed the SAP Cloud Connector there; its location ID is <code>RHEINAU_DC</code>.</li>
        <li>Security policy: every connection is encrypted with <b>TLS</b>. Our servers carry certificates signed by the <b>Rheinau Root CA</b>;
          the file is in your downloads.</li>
        <li>Technical name <code>RHN_MDM</code> in <code>RHN_IN</code>, business name "Meter Data (MDM)".</li>
      </ul>
      <p>If validation complains, read what it says. It is usually right.</p>`,
    tasks: [
      'In <b>Connections</b> (<code>RHN_IN</code>), create the connection with the type that matches the source, as an on-premise source.',
      'Validate it. Each failed validation names one missing piece.',
      'In <b>System › Configuration</b>, look up the Cloud Connector and upload the certificate the server needs.',
      'Validate again until it passes.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 5, text: 'The type is SAP HANA; its form asks whether the source is in the cloud or on-premise. Certificates are in System › Configuration › Security.' },
      { label: 'Hint 2: the concept', cost: 10, text: 'On-premise sources are reached through the Cloud Connector (location ID). TLS only works if the tenant trusts the certificate the server shows, or the CA that signed it.' },
      { label: 'Hint 3: a skeleton', cost: 20, text: 'SAP HANA → On-Premise → host mdm-db.rheinau.local → location RHEINAU_DC → Use TLS ✓ → System › Configuration › Security → Upload rheinau-root-ca.crt → Validate.' },
    ],
    checks: [
      { type: 'rule', label: 'Connection to MDM', ok: 'RHN_MDM points to the HANA in the data center.', test: (ctx) => connectionRule(ctx, 'RHN_MDM', MDM_HOST, 'HANA', 'SAP HANA') },
      {
        type: 'rule', label: 'Through the Cloud Connector', ok: 'On-premise via location RHEINAU_DC.',
        test: ({ tenant }) => {
          const c = conn(tenant, 'RHN_MDM');
          if (!c) return 'Create RHN_MDM first.';
          if (!c.onprem) return 'RHN_MDM is set to Cloud. The server is in the data center: choose On-Premise.';
          return c.locationId === 'RHEINAU_DC' ? null : `The location ID is "${c.locationId}". Jonas named the Cloud Connector location in the ticket.`;
        },
      },
      {
        type: 'rule', label: 'Encrypted', ok: 'TLS is on.',
        test: ({ tenant }) => (conn(tenant, 'RHN_MDM')?.tls ? null : 'The security policy wants TLS on every connection. Edit RHN_MDM and switch on TLS.'),
      },
      {
        type: 'rule', label: 'Trusted certificates', ok: 'The tenant trusts the Rheinau Root CA, and nothing else.',
        test: ({ tenant }) => {
          if (!tenant.certificates.includes('Rheinau Root CA')) return 'The tenant does not trust the Rheinau Root CA yet. Upload it in System › Configuration › Security.';
          const extra = tenant.certificates.filter((c) => c !== 'Rheinau Root CA');
          return extra.length ? `You also trust ${extra.join(', ')}. No connection needs it; every trusted certificate is a door. Delete it.` : null;
        },
      },
      { type: 'rule', label: 'Validated', ok: 'Validation passed.', test: ({ tenant }) => validRule(tenant, 'RHN_MDM') },
      {
        type: 'question', id: 'cc', label: 'The Cloud Connector',
        prompt: 'What does the Cloud Connector do for RHN_MDM?',
        options: [
          'It copies the meter data into the cloud every night',
          'It links the tenant with systems in the company network, so the cloud can reach the HANA without it being exposed to the internet',
          'It encrypts the connection, so the certificate is not needed',
          'It validates the connection instead of the Connections app',
        ],
        answer: 1,
        nudge: 'Not quite. The validation said the host cannot be reached from the cloud directly. What closes that gap?',
      },
    ],
    xp: 35,
    realTenant: `Three tenant-wide prerequisites come first, set up by an administrator: the <b>Cloud Connector</b> (installed in the company network,
      connected to the subaccount, with the backend resources released), the server or CA certificate under <b>System › Configuration › Security</b>,
      and, for direct database access from outside, the <b>IP allowlist</b>. Then the connection names the location ID. Network and certificate
      errors usually only show up when you validate.`,
    debrief: `<p>Good. Most on-premise trouble in real projects looks exactly like this: unreachable host, wrong location, untrusted certificate.
      Validation tells you which one.</p>
      <p>Now we have two sources. Next question: do we copy their data, or read it live?</p>`,
  },
  {
    id: 'c03-m03',
    chapter: 3,
    title: 'Live or copied?',
    from: CALIN,
    ticket: `<p>Two master data sets from S/4HANA should be available in <code>RHN_IN</code> as <b>remote tables</b>: the structure lives here, the data in S/4.
      Our convention: <code>RHN_IN_RT_&lt;NAME&gt;</code>.</p>
      <ul>
        <li><b>Tariffs</b>: customer service quotes prices on the phone. A price change in S/4 must show up at once. The table is tiny.</li>
        <li><b>Grid areas</b>: change at most once a year, but every report reads them. Do not ask S/4 on every query:
          keep a copy here and refresh it <b>weekly</b>.</li>
      </ul>
      <p>Contracts and invoices do <b>not</b> become remote tables. They get their own load in the next ticket.</p>`,
    tasks: [
      'In the <b>Data Builder</b> of <code>RHN_IN</code>, use <b>Import Remote Tables</b> with <code>RHN_S4U</code> for the two objects.',
      'Open the tariffs remote table and run <b>Data Preview</b>. Then look at <b>Remote Queries</b> in the Data Integration Monitor.',
      'In the <b>Data Integration Monitor</b> › Remote Tables, give the grid areas the data access the ticket describes, with its schedule.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 5, text: 'Import Remote Tables is a tile in the Integrate group of the Data Builder. Data access and schedules are set in the Data Integration Monitor, not in the editor.' },
      { label: 'Hint 2: the concept', cost: 10, text: 'Remote reads the source on every query: always current, but every query loads the source. A snapshot is a copy: fast and independent, but only as fresh as the last load. A schedule refreshes it, and schedules need your consent.' },
      { label: 'Hint 3: a skeleton', cost: 20, text: 'Import TARIFFS and GRID_AREAS as RHN_IN_RT_… · Tariffs stay Remote · Grid areas: Load New Snapshot, then Schedule → Weekly (give consent first).' },
    ],
    checks: [
      {
        type: 'rule', label: 'Two remote tables', ok: 'Tariffs and grid areas are remote tables in RHN_IN.',
        test: ({ tenant }) => {
          const missing = ['TARIFFS', 'GRID_AREAS'].filter((s) => !remoteFor(tenant, s).length);
          return missing.length ? `No remote table on ${missing.join(' and ')} from RHN_S4U in RHN_IN yet. Use Import Remote Tables in the Data Builder.` : null;
        },
      },
      {
        type: 'rule', label: 'Names follow the convention', ok: 'RHN_IN_RT_… as agreed.',
        test: ({ tenant }) => {
          const bad = [...remoteFor(tenant, 'TARIFFS'), ...remoteFor(tenant, 'GRID_AREAS')].filter((o) => !o.name.startsWith('RHN_IN_RT_'));
          return bad.length ? `${bad.map((o) => o.name).join(', ')} does not follow RHN_IN_RT_<NAME>. Technical names cannot change: delete and import again.` : null;
        },
      },
      {
        type: 'rule', label: 'Tariffs read live', ok: 'Tariff prices come straight from S/4.',
        test: ({ tenant }) => {
          const o = remoteFor(tenant, 'TARIFFS')[0];
          if (!o) return 'Import the tariffs first.';
          return o.remote!.access === 'Remote' ? null : `${o.name} is a snapshot. A copy is only as fresh as its last load; customer service would quote yesterday's price. Remove the replicated data.`;
        },
      },
      {
        type: 'rule', label: 'Grid areas copied weekly', ok: 'A snapshot, refreshed every week.',
        test: ({ tenant }) => {
          const o = remoteFor(tenant, 'GRID_AREAS')[0];
          if (!o) return 'Import the grid areas first.';
          if (o.remote!.access !== 'Replicated (Snapshot)') return `${o.name} still reads S/4 on every query. Load a snapshot in the Data Integration Monitor.`;
          if (o.remote!.schedule !== 'Weekly') return o.remote!.schedule ? `The schedule is ${o.remote!.schedule.toLowerCase()}; the ticket says weekly.` : `${o.name} has a snapshot, but nothing refreshes it. Add a weekly schedule.`;
          return null;
        },
      },
      {
        type: 'rule', label: 'No remote tables for the big ones', ok: 'Contracts and invoices are left for the replication flow.',
        test: ({ tenant }) => {
          const big = [...remoteFor(tenant, 'BILLING_CONTRACTS'), ...remoteFor(tenant, 'BILLING_INVOICES')];
          return big.length ? `Delete ${big.map((o) => o.name).join(', ')}. Contracts and invoices get a replication flow next; the same data should not be copied twice.` : null;
        },
      },
      {
        type: 'rule', label: 'Saw a remote query', ok: 'You previewed the tariffs live.',
        test: ({ tenant, events }) => {
          const rt = remoteFor(tenant, 'TARIFFS')[0];
          if (!rt) return 'Import the tariffs first.';
          if (!events.has(`preview:${objectKey(rt)}`)) return `Open ${rt.name} in the Data Builder and run Data Preview while it reads live.`;
          return events.has('monitor:queries') ? null : 'Now open Remote Queries in the Data Integration Monitor and look at what was sent to S/4.';
        },
      },
      {
        type: 'question', id: 'big', label: 'Why not for contracts',
        prompt: 'Why do contracts and invoices not get remote tables with snapshots?',
        options: [
          'Remote tables cannot hold more than a thousand rows',
          'A snapshot copies everything every time. A replication flow loads once and then only the changes, and SAP recommends it so the same data is not copied twice',
          'Remote tables cannot be shared with other spaces',
          'Snapshots cannot be scheduled',
        ],
        answer: 1,
        nudge: 'Not quite. Contracts and invoices are big and change every day. What does each refresh of a snapshot cost?',
      },
    ],
    xp: 40,
    realTenant: `Data Builder → <b>Import Remote Tables</b> (or drag a source object from the source browser into a view). The data access is
      changed in the <b>Data Integration Monitor › Remote Tables</b>: load a new snapshot, remove the replicated data, schedule
      (simple schedule or cron expression), and, for suitable sources, real-time replication. Recurring tasks need your consent to job scheduling.
      If a connection offers both remote tables and replication flows, SAP recommends restricting it to remote access and replicating with flows only.`,
    debrief: `<p>Now you have felt the trade-off: live means always current but every query costs the source; a copy is fast but ages.</p>
      <p>Did you see the remote query in the monitor? In a real tenant that list is where you find out why a story is slow.</p>`,
  },
  {
    id: 'c03-m04',
    chapter: 3,
    title: 'Contracts and invoices by delta',
    from: LENA,
    ticket: `<p>Now the big ones. Please build a <b>replication flow</b> <code>RHN_IN_RF_S4U</code> from <code>RHN_S4U</code> that keeps
      <code>BILLING_CONTRACTS</code> and <code>BILLING_INVOICES</code> in <code>RHN_IN</code> up to date.</p>
      <ul>
        <li>Write into the <b>existing pilot tables</b>, so everything built on them keeps working.</li>
        <li>Load everything once, then <b>only the changes</b>.</li>
        <li>Careful: the pilot tables also hold the rows of our <b>old billing system</b> (<code>SRC_SYS_ID = LEGACY</code>). That system is switched off.
          Those rows must stay.</li>
      </ul>`,
    tasks: [
      'In the <b>Data Builder</b> of <code>RHN_IN</code>, create a <b>New Replication Flow</b> with the source connection <code>RHN_S4U</code>.',
      'Add the two source objects and point each to its existing table.',
      'Choose the load type and the Truncate option for each object.',
      'Save, deploy and run the flow. Look at the run in the <b>Data Integration Monitor</b> › Flows.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 5, text: 'New Replication Flow is in the Integrate group. The source connection is on the left, the replication objects in the middle.' },
      { label: 'Hint 2: the concept', cost: 10, text: 'Initial and Delta: one full load, then only changes, for delta-capable sources. Truncate empties the target before the load, all of it, whoever delivered it.' },
      { label: 'Hint 3: a skeleton', cost: 20, text: 'Source RHN_S4U · BILLING_CONTRACTS → BILLING_CONTRACTS, BILLING_INVOICES → BILLING_INVOICES · Initial and Delta · Truncate off · Save · Deploy · Run.' },
    ],
    checks: [
      {
        type: 'rule', label: 'Flow deployed', ok: 'RHN_IN_RF_S4U is deployed.',
        test: ({ tenant }) => {
          const f = flowIn(tenant, 'RHN_IN_RF_S4U');
          return flowDeployed(f, 'RHN_IN_RF_S4U') ?? (f!.deployed!.flow!.connection === 'RHN_S4U' ? null : 'The flow reads from the wrong connection. Its source is RHN_S4U.');
        },
      },
      {
        type: 'rule', label: 'Into the pilot tables', ok: 'Both objects write into the existing tables.',
        test: ({ tenant }) => {
          const objs = flowIn(tenant, 'RHN_IN_RF_S4U')?.deployed?.flow?.objects ?? [];
          for (const name of ['BILLING_CONTRACTS', 'BILLING_INVOICES']) {
            const o = objs.find((x) => x.source === name);
            if (!o) return `${name} is not part of the deployed flow. Add it as a source object.`;
            if (o.target !== name) return `${name} goes into ${o.target}. It belongs in the existing pilot table ${name}, so the views built on it keep working.`;
          }
          const extra = objs.filter((x) => !['BILLING_CONTRACTS', 'BILLING_INVOICES'].includes(x.source));
          return extra.length ? `The flow also replicates ${extra.map((x) => x.source).join(', ')}. The ticket only asks for contracts and invoices.` : null;
        },
      },
      {
        type: 'rule', label: 'Only the changes', ok: 'Initial and Delta for both.',
        test: ({ tenant }) => {
          const objs = flowIn(tenant, 'RHN_IN_RF_S4U')?.deployed?.flow?.objects ?? [];
          const full = objs.filter((o) => o.loadType !== 'Initial and Delta');
          return full.length ? `${full.map((o) => o.source).join(' and ')} ${full.length > 1 ? 'are' : 'is'} loaded once and never again. Lena wants the changes too.` : null;
        },
      },
      {
        type: 'rule', label: 'Legacy rows kept', ok: 'Truncate is off; the LEGACY rows stay.',
        test: ({ tenant }) => {
          const objs = flowIn(tenant, 'RHN_IN_RF_S4U')?.deployed?.flow?.objects ?? [];
          const t = objs.filter((o) => o.truncate);
          return t.length ? `Truncate is on for ${t.map((o) => o.target).join(' and ')}. It would empty the table, including the LEGACY rows nobody can load again.` : null;
        },
      },
      {
        type: 'rule', label: 'Flow running', ok: 'Initial load done, delta active.',
        test: ({ tenant }) => {
          const r = lastRun(tenant, 'RHN_IN.RHN_IN_RF_S4U');
          if (!r) return 'Run the deployed flow, from the editor or the Data Integration Monitor.';
          return r.status === 'Running' ? null : r.status === 'Failed' ? `The last run failed: ${r.messages[r.messages.length - 1]}` : 'The last run loaded once and stopped. Deploy the flow with delta and run it again.';
        },
      },
      {
        type: 'question', id: 'delta', label: 'What delta means',
        prompt: 'After the initial load, what does Initial and Delta transfer?',
        options: [
          'Everything again, every 60 minutes',
          'Only what changed in the source since the last check',
          'Nothing, until you press Run again',
          'Only new rows; changed rows are ignored',
        ],
        answer: 1,
        nudge: 'Not quite. Read the messages of your run in the monitor.',
      },
    ],
    xp: 45,
    realTenant: `Data Builder → <b>New Replication Flow</b> → source connection and source container → add source objects → target connection
      (SAP Datasphere, or other targets) → per object the projection (filters, mapping, extra columns), the load type and Truncate →
      Save → Deploy → <b>Run</b>. You watch it in the <b>Data Integration Monitor › Flows</b>, where you can also pause, resume, stop and schedule runs,
      and set up email notifications for failures. <i>Initial and Delta</i> needs a delta-capable source; CDS views without delta only offer <i>Initial Only</i>.`,
    debrief: `<p>Contracts and invoices now flow in by themselves, and the 91 legacy contracts are still there.</p>
      <p>That truncate trap catches real teams. Truncate is right when one source owns the whole table, and wrong when a table collects rows from several.</p>`,
  },
  {
    id: 'c03-m05',
    chapter: 3,
    title: 'The CRM file',
    from: CALIN,
    ticket: `<p>The CRM cannot be connected directly. Every night it drops a <b>full export of all customers</b> as a CSV file into an
      <b>Amazon S3</b> bucket: <code>${CRM_BUCKET}</code>.</p>
      <p>Remember that <code>CRM_CUSTOMERS</code> has no <code>SRC_SYS_ID</code>? Our rule: the source system is set <b>while loading</b>, never
      guessed later. So every customer row gets <code>SRC_SYS_ID = 'CRM'</code>.</p>
      <ul>
        <li>Connection <code>RHN_CRM</code> in <code>RHN_IN</code>, business name "CRM Export".</li>
        <li>Replication flow <code>RHN_IN_RF_CRM</code> into the existing <code>CRM_CUSTOMERS</code>. Each file is complete, so each run
          <b>replaces</b> the table content. Schedule it <b>daily</b>.</li>
      </ul>`,
    tasks: [
      'Create and validate the connection to the bucket.',
      'Create the replication flow: the export file into <code>CRM_CUSTOMERS</code>.',
      'Use the <b>projection</b> of the object to add the source system column.',
      'Set load type and Truncate, deploy, run, and schedule it daily in the <b>Data Integration Monitor</b>.',
      'Preview <code>CRM_CUSTOMERS</code> and answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 5, text: 'The connection type is Amazon Simple Storage Service; the bucket name goes where the form asks for it. Projection is a button per object in the flow editor.' },
      { label: 'Hint 2: the concept', cost: 10, text: 'A full export each night: without Truncate every run would append all customers again. A file has no delta, so Initial Only plus a schedule.' },
      { label: 'Hint 3: a skeleton', cost: 20, text: 'RHN_CRM (Amazon S3, bucket rheinau-crm-export) · Flow RHN_IN_RF_CRM: customers/CRM_CUSTOMERS.csv → CRM_CUSTOMERS, Initial Only, Truncate ✓, Projection SRC_SYS_ID = CRM · Deploy · Run · Monitor › Flows › Schedule › Daily.' },
    ],
    checks: [
      { type: 'rule', label: 'Connection to the bucket', ok: 'RHN_CRM reaches the export bucket.', test: (ctx) => connectionRule(ctx, 'RHN_CRM', CRM_BUCKET, 'S3', 'Amazon Simple Storage Service') },
      { type: 'rule', label: 'Validated', ok: 'Validation passed.', test: ({ tenant }) => validRule(tenant, 'RHN_CRM') },
      {
        type: 'rule', label: 'Flow into CRM_CUSTOMERS', ok: 'RHN_IN_RF_CRM loads the file into CRM_CUSTOMERS.',
        test: ({ tenant }) => {
          const f = flowIn(tenant, 'RHN_IN_RF_CRM');
          const err = flowDeployed(f, 'RHN_IN_RF_CRM');
          if (err) return err;
          const o = f!.deployed!.flow!.objects;
          if (o.length !== 1) return 'The flow should have exactly one object: the export file.';
          return o[0].target === 'CRM_CUSTOMERS' ? null : `The file goes into ${o[0].target}. It belongs in the existing CRM_CUSTOMERS.`;
        },
      },
      {
        type: 'rule', label: 'Source system set while loading', ok: "Every row gets SRC_SYS_ID = 'CRM'.",
        test: ({ tenant }) => {
          const o = flowIn(tenant, 'RHN_IN_RF_CRM')?.deployed?.flow?.objects[0];
          if (!o) return 'Build the flow first.';
          const e = o.extra.find((x) => x.name === 'SRC_SYS_ID');
          if (!e) return o.extra.length ? `The projection adds ${o.extra.map((x) => x.name).join(', ')}. The column is called SRC_SYS_ID, like in every other table.` : 'The projection adds no column yet. Add SRC_SYS_ID there.';
          return e.value === 'CRM' ? null : `SRC_SYS_ID gets '${e.value}'. The code for this source is CRM, in capitals, like S4U, MDM and LEGACY.`;
        },
      },
      {
        type: 'rule', label: 'Replace, do not append', ok: 'Truncate on: each run replaces the table.',
        test: ({ tenant }) => {
          const o = flowIn(tenant, 'RHN_IN_RF_CRM')?.deployed?.flow?.objects[0];
          return !o || o.truncate ? null : 'Truncate is off. Each file holds all customers; without Truncate every night adds them all again, and the table fills with duplicates.';
        },
      },
      {
        type: 'rule', label: 'Daily, and run once', ok: 'Scheduled daily; the first run completed.',
        test: ({ tenant }) => {
          const f = flowIn(tenant, 'RHN_IN_RF_CRM');
          if (!f?.deployed) return 'Deploy the flow first.';
          const r = runsOf(tenant, 'RHN_IN.RHN_IN_RF_CRM').find((x) => x.status === 'Completed');
          if (!r) return 'Run the flow once now, so the column arrives today and not tomorrow night.';
          if (!tenant.appliedColumns.some((a) => a.table === 'CRM_CUSTOMERS' && a.column === 'SRC_SYS_ID')) return 'The run completed without the projection. Deploy the flow with SRC_SYS_ID and run it again.';
          return f.deployed.flow?.schedule === 'Daily' ? null : 'Nothing runs the flow tomorrow. Schedule it daily in the Data Integration Monitor › Flows.';
        },
      },
      {
        type: 'question', id: 'remote', label: 'Why not a remote table',
        prompt: 'Why is the CRM file not read live through a remote table?',
        options: [
          'Files are too large for remote tables',
          'The Amazon S3 connection does not offer remote tables; validation listed only data flows and replication flows',
          'Remote tables cannot have a SRC_SYS_ID column',
          'Remote tables only work with SAP systems',
        ],
        answer: 1,
        nudge: 'Not quite. Look at what Validate said about RHN_CRM.',
      },
    ],
    xp: 45,
    realTenant: `Cloud storage like Amazon S3 is a source for <b>replication flows</b> and data flows. In the replication flow, the
      <b>projection</b> of each object can filter rows, map columns and add columns. For a one-off file, <b>Import CSV File</b> on the Data Builder
      start page is quicker, but someone would have to upload it again every day.`,
    debrief: `<p>Look at <code>CRM_CUSTOMERS</code> now: every row knows where it came from. When we merge customers with the legacy system in
      harmonization, that column will tell us which record wins.</p>
      <p>All three sources flow. Which means sooner or later one of them breaks at night.</p>`,
  },
  {
    id: 'c03-m06',
    chapter: 3,
    title: 'Last night\'s load failed',
    from: LENA,
    ticket: `<p>Help! Last night I started my new replication flow <code>RHN_IN_RF_MDM</code> for the meter readings, and this morning nothing works
      in <code>RHN_IN</code>: no loads, no deployments.</p>
      <p>Please find out in the Data Integration Monitor what happened, and fix it. Jonas says: take what is needed from the tenant's reserve,
      plan <b>6 GB headroom</b> above what <code>RHN_IN</code> uses now, and do not touch the other spaces. Then run my flow again.</p>`,
    tasks: [
      'In the <b>Data Integration Monitor</b> › Flows of <code>RHN_IN</code>, open <code>RHN_IN_RF_MDM</code> and read the messages of the failed run.',
      'In <b>Space Management</b>, give <code>RHN_IN</code> enough disk storage and unlock it.',
      'Run the flow again and check its status.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 5, text: 'The last message of the failed run names the cause. Space Management shows each space\'s storage, its use and an Unlock button when it is locked.' },
      { label: 'Hint 2: the concept', cost: 10, text: 'A space that uses more disk than it is assigned gets locked: nothing can be written until it has enough storage and is unlocked.' },
      { label: 'Hint 3: a skeleton', cost: 20, text: 'Used + 6 GB = new disk of RHN_IN · Edit → Disk · Unlock · Monitor › Flows › RHN_IN_RF_MDM › Run.' },
    ],
    setup: (t) => {
      let mdm = findConnection(t, 'RHN_IN', 'RHN_MDM');
      if (!mdm) {
        mdm = { space: 'RHN_IN', name: 'RHN_MDM', businessName: 'Meter Data (MDM)', type: 'HANA', host: MDM_HOST, onprem: true, locationId: 'RHEINAU_DC', tls: true, auth: 'User Name and Password', changedAt: new Date().toISOString() };
        t.connections.push(mdm);
        if (!t.certificates.includes('Rheinau Root CA')) t.certificates.push('Rheinau Root CA');
      }
      if (!mdm.validation?.ok) mdm.validation = validateConnection(t, mdm);
      if (!flowIn(t, 'RHN_IN_RF_MDM')) {
        const flow = { connection: 'RHN_MDM', objects: [{ source: 'METER_READINGS', target: 'METER_READINGS', loadType: 'Initial and Delta' as const, truncate: false, extra: [] }] };
        t.objects.push({
          space: 'RHN_IN', name: 'RHN_IN_RF_MDM', kind: 'Replication Flow', businessName: 'Meter readings from MDM (Lena)', semanticUsage: 'Relational Dataset',
          flow, deployed: { businessName: 'Meter readings from MDM (Lena)', flow: structuredClone(flow) }, status: 'deployed', changedAt: new Date().toISOString(),
        });
      }
      const inbound = t.spaces.find((s) => s.id === 'RHN_IN')!;
      inbound.usedDiskGB = round1(inbound.diskGB + 1.6);
      inbound.locked = true;
      const night = new Date();
      night.setHours(2, 13, 0, 0);
      addRun(t, {
        object: 'RHN_IN.RHN_IN_RF_MDM', kind: 'Replication Flow', start: night.toISOString(), status: 'Failed', records: 0,
        messages: [
          'METER_READINGS: initial load started from RHN_MDM.',
          'METER_READINGS: records read from RHN_MDM. First load: the source delivers its full history.',
          `Writing RHN_IN.METER_READINGS failed. Space RHN_IN exceeded its assigned disk storage (${inbound.diskGB} GB assigned, ${inbound.usedDiskGB} GB used) and was locked.`,
        ],
      });
    },
    checks: [
      {
        type: 'rule', label: 'Found the cause', ok: 'You read the log of the failed run.',
        test: ({ events }) => (events.has('monitor-open:RHN_IN.RHN_IN_RF_MDM') ? null : 'Open RHN_IN_RF_MDM in the Data Integration Monitor › Flows and read the messages of the failed run.'),
      },
      {
        type: 'rule', label: 'Enough storage', ok: 'RHN_IN has its 6 GB headroom.',
        test: ({ tenant }) => {
          const s = tenant.spaces.find((x) => x.id === 'RHN_IN')!;
          const need = round1((s.usedDiskGB ?? 0) + 6);
          return s.diskGB >= need ? null : `RHN_IN has ${s.diskGB} GB disk and uses ${s.usedDiskGB} GB. With 6 GB headroom it needs at least ${need} GB.`;
        },
      },
      {
        type: 'rule', label: 'Unlocked', ok: 'RHN_IN is open for loads again.',
        test: ({ tenant }) => (tenant.spaces.find((x) => x.id === 'RHN_IN')!.locked ? 'RHN_IN is still locked. More storage alone does not unlock it: press Unlock in Space Management.' : null),
      },
      {
        type: 'rule', label: 'Load repeated', ok: 'RHN_IN_RF_MDM runs again.',
        test: ({ tenant }) => {
          const r = lastRun(tenant, 'RHN_IN.RHN_IN_RF_MDM');
          return r && r.status !== 'Failed' ? null : 'The last run of RHN_IN_RF_MDM is still the failed one. Run the flow again in the Data Integration Monitor.';
        },
      },
      {
        type: 'question', id: 'notice', label: 'Notice it first',
        prompt: 'How do you hear about a failed replication flow before Lena does?',
        options: [
          'Set up email notifications for failures of the replication flow',
          'Look at the Home page every morning',
          'Datasphere retries failed loads until they work, so there is nothing to notice',
          'The System Monitor sends an email to every user',
        ],
        answer: 0,
        nudge: 'Not quite. Which of these is something you can set up once, for this flow?',
      },
    ],
    xp: 45,
    realTenant: `A space that exceeds its storage is <b>locked</b> until someone deletes data or an administrator assigns more storage; then a space
      administrator presses <b>Unlock</b> in Space Management. The <b>Data Integration Monitor</b> shows each run with its messages; the
      <b>System Monitor</b> shows storage and failed tasks across all spaces. Email notifications for failed replication flows and task chains
      are set up per object.`,
    debrief: `<p>Saved the morning. Lena's flow asked for the full history, which was more than the pilot ever loaded, and the space ran full at 2 a.m.</p>
      <p>That closes chapter 3: three sources connected, each loaded the way that fits it. Next we look closely at what arrived:
      the inbound layer, with SQL.</p>`,
  },
];
