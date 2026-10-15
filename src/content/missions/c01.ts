import type { Mission, RuleContext } from '../../missions/types';
import { CAPACITY, assigned, isShared } from '../../tenant';

/**
 * Chapter 1, Space concept. Spaces per layer, storage and priority, sharing instead of copying, naming.
 * Space rules follow SAP Datasphere, see src/tenant.ts.
 */

const CALIN = { name: 'Calin Mucea', role: 'Senior Data Architect, your mentor', initials: 'CM' };
const IT = { name: 'Jonas Becker', role: 'Head of IT, tenant owner', initials: 'JB' };

const space = ({ tenant }: RuleContext, id: string) => tenant.spaces.find((s) => s.id === id);

/** Points the player to a near miss, e.g. RHN_DATA_SEMANTIC instead of RHN_DSL. */
function missingSpace(ctx: RuleContext, id: string, part: string): string | null {
  if (space(ctx, id)) return null;
  const near = ctx.tenant.spaces.find((s) => s.id !== id && s.id.includes(part));
  return near
    ? `There is no space ${id}, but there is ${near.id}. A space ID cannot be renamed: delete ${near.id} and create ${id}.`
    : `There is no space ${id} yet. Create it in Space Management.`;
}


export const CHAPTER_1: Mission[] = [
  {
    id: 'c01-m01',
    chapter: 1,
    title: 'A space per layer',
    from: IT,
    ticket: `<p>Hi, Jonas from IT. Calin showed me his architecture, three layers from bottom to top:</p>
      <ul>
        <li><b>Entry layer</b>: the data arrives here 1:1 from the source systems, without any business logic.</li>
        <li><b>Data &amp; semantic layer</b>: the data is cleaned and combined in base views, then gets its meaning: facts, dimensions,
          associations, and the access controls that protect it.</li>
        <li><b>Presentation layer</b>: only what consumers see, the analytic models and consumption views for SAP Analytics Cloud, Excel and Power BI.</li>
      </ul>
      <p>I set up <code>RHN_ENTRY</code> for the entry layer. Please create the other two spaces yourself.
      Our convention for space IDs: the company prefix <code>RHN_</code>, then the layer: <code>DSL</code> for the data &amp; semantic layer and
      <code>PRES</code> for the presentation layer. Give each space a name a business user understands. Leave storage and priority as they are,
      we size them in the next ticket.</p>`,
    tasks: [
      'Open <b>Space Management</b> and look at the space IT prepared and the tenant capacity.',
      'Create the data &amp; semantic space.',
      'Create the presentation space.',
      'Answer the questions below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 5, text: 'Space Management in the navigation has a Create space button above the list.' },
      { label: 'Hint 2: the concept', cost: 10, text: 'The space ID is the technical name: capitals, digits, underscore, max. 20 characters, and it can never be changed. The space name is for people and can be changed any time.' },
      { label: 'Hint 3: a skeleton', cost: 20, text: 'Space IDs: RHN_ + DSL and RHN_ + PRES. Names like "Rheinau ______".' },
    ],
    checks: [
      { type: 'rule', label: 'Data & semantic space', ok: 'RHN_DSL is there.', test: (ctx) => missingSpace(ctx, 'RHN_DSL', 'DS') },
      { type: 'rule', label: 'Presentation space', ok: 'RHN_PRES is there.', test: (ctx) => missingSpace(ctx, 'RHN_PRES', 'PR') },
      {
        type: 'rule',
        label: 'Names for business users',
        ok: 'Both spaces have a readable name.',
        test: (ctx) => {
          const bad = ['RHN_DSL', 'RHN_PRES'].map((id) => space(ctx, id)).filter((s) => s && (s.name.toUpperCase() === s.id || s.name.length < 5));
          return bad.length
            ? `${bad.map((s) => s!.id).join(' and ')} ${bad.length > 1 ? 'have' : 'has'} only the technical ID as name. Edit the space and give it a name a business user understands.`
            : null;
        },
      },
      {
        type: 'rule',
        label: 'Only the three layer spaces',
        ok: 'No extra spaces.',
        test: ({ tenant }) => {
          const extra = tenant.spaces.filter((s) => !['RHN_ENTRY', 'RHN_DSL', 'RHN_PRES'].includes(s.id));
          return extra.length ? `Delete ${extra.map((s) => s.id).join(', ')}. Every space takes storage from the tenant, even when it is empty.` : null;
        },
      },
      {
        type: 'question',
        id: 'why',
        label: 'Why one space per layer',
        prompt: 'Why does each layer get its own space instead of one big space for everything?',
        options: [
          'Views can only be created in a space with a single layer',
          'Each layer gets its own members, storage and priority, and data moves between layers only where you share it',
          'A space can hold at most ten objects',
          'Queries get faster automatically when they are spread over several spaces',
        ],
        answer: 1,
        nudge: 'Not quite. Think about who works in which layer, and what Space Management lets you set per space.',
      },
      {
        type: 'question',
        id: 'where',
        label: 'Which layer',
        prompt: 'Calin builds a fact with the invoice amounts and marks its measures. In which layer does it live?',
        options: [
          'Entry: the invoices arrive there',
          'Data & semantic: facts and dimensions give the cleaned data its meaning',
          'Presentation: the CFO reads it',
          'In all three, as copies',
        ],
        answer: 1,
        nudge: 'Not quite. Read the three layers in the ticket again: where does data get its meaning?',
      },
    ],
    xp: 30,
    realTenant: `In a real tenant: <b>Space Management</b> → <b>Create</b>. You enter the space name, the space ID is suggested from it and
      can be adjusted until you save. After creating, you assign storage and members and press <b>Deploy</b>.`,
    debrief: `<p>Thanks, both spaces are there. Calin will bring his team into RHN_DSL; the report users will only ever see RHN_PRES.</p>
      <p>One thing you will notice in real projects: once a space ID is out there, it stays. Transports, connections and scripts refer to it.</p>`,
  },
  {
    id: 'c01-m02',
    chapter: 1,
    title: 'Size the spaces',
    from: IT,
    ticket: `<p>Now storage and priority. Our tenant has <b>${CAPACITY.diskGB} GB disk</b> and <b>${CAPACITY.memoryGB} GB in-memory</b>. My rules:</p>
      <ul>
        <li>Keep a reserve of at least <b>16 GB disk</b> and <b>4 GB in-memory</b> unassigned, for new projects and emergencies.</li>
        <li><code>RHN_ENTRY</code> keeps its 40 GB disk and 8 GB in-memory.</li>
        <li><code>RHN_DSL</code> needs at least 30 GB disk and 6 GB in-memory. Calin wants to persist some views there later.</li>
        <li><code>RHN_PRES</code> needs at least 10 GB disk and 8 GB in-memory. The board dashboards read from memory.</li>
        <li>The dashboards must stay fast while the nightly load runs: <code>RHN_PRES</code> gets the <b>highest priority</b> of all spaces.</li>
      </ul>`,
    tasks: [
      'Work out how much disk and in-memory you can give the two new spaces without touching the reserve.',
      'Edit <code>RHN_DSL</code>: storage and priority.',
      'Edit <code>RHN_PRES</code>: storage and priority.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 5, text: 'Space Management shows the capacity bars on top and an Edit button per space.' },
      { label: 'Hint 2: the concept', cost: 10, text: 'Free for the two new spaces = capacity − reserve − RHN_ENTRY. Priority 8 is the highest (default 5); it must be higher than the priority of every other space.' },
      { label: 'Hint 3: a skeleton', cost: 20, text: 'Disk: 128 − 16 − 40 = __ GB for DSL + PRES. In-memory: 32 − 4 − 8 = __ GB. Then e.g. DSL priority 5, PRES priority _.' },
    ],
    checks: [
      {
        type: 'rule',
        label: 'Reserve kept',
        ok: 'At least 16 GB disk and 4 GB in-memory stay free.',
        test: ({ tenant }) => {
          const used = assigned(tenant);
          const disk = CAPACITY.diskGB - used.diskGB;
          const mem = CAPACITY.memoryGB - used.memoryGB;
          if (disk < 16) return `Only ${disk} GB disk are left unassigned, IT wants at least 16.`;
          if (mem < 4) return `Only ${mem} GB in-memory are left unassigned, IT wants at least 4.`;
          return null;
        },
      },
      {
        type: 'rule',
        label: 'Entry unchanged',
        ok: 'RHN_ENTRY still has 40 GB disk and 8 GB in-memory.',
        test: (ctx) => {
          const s = space(ctx, 'RHN_ENTRY')!;
          return s.diskGB === 40 && s.memoryGB === 8 ? null : `RHN_ENTRY has ${s.diskGB} GB disk and ${s.memoryGB} GB in-memory. IT wants it to keep 40 and 8.`;
        },
      },
      {
        type: 'rule',
        label: 'Data & semantic storage',
        ok: 'RHN_DSL has enough storage.',
        test: (ctx) => {
          const s = space(ctx, 'RHN_DSL');
          if (!s) return 'RHN_DSL is missing. Create it first (previous mission).';
          if (s.diskGB < 30) return `RHN_DSL has ${s.diskGB} GB disk, it needs at least 30.`;
          if (s.memoryGB < 6) return `RHN_DSL has ${s.memoryGB} GB in-memory, it needs at least 6.`;
          return null;
        },
      },
      {
        type: 'rule',
        label: 'Presentation storage',
        ok: 'RHN_PRES has enough storage.',
        test: (ctx) => {
          const s = space(ctx, 'RHN_PRES');
          if (!s) return 'RHN_PRES is missing. Create it first (previous mission).';
          if (s.diskGB < 10) return `RHN_PRES has ${s.diskGB} GB disk, it needs at least 10.`;
          if (s.memoryGB < 8) return `RHN_PRES has ${s.memoryGB} GB in-memory, it needs at least 8.`;
          return null;
        },
      },
      {
        type: 'rule',
        label: 'Presentation comes first',
        ok: 'RHN_PRES has the highest priority in the tenant.',
        test: (ctx) => {
          const rep = space(ctx, 'RHN_PRES');
          if (!rep) return 'RHN_PRES is missing.';
          const rival = ctx.tenant.spaces.find((s) => s.id !== 'RHN_PRES' && s.priority >= rep.priority);
          return rival
            ? `${rival.id} has priority ${rival.priority}, RHN_PRES has ${rep.priority}. The presentation space must be strictly higher than every other space.`
            : null;
        },
      },
      {
        type: 'question',
        id: 'priority',
        label: 'What priority does',
        prompt: 'What does the space priority decide?',
        options: [
          'In which order the spaces are listed in the navigation',
          'Which space gets its storage first when the tenant is full',
          'Whose statements are favored when the database is busy',
          'In which order the nightly loads start',
        ],
        answer: 2,
        nudge: 'Not quite. The ticket gives a hint: what should happen to the dashboards while the nightly load runs?',
      },
    ],
    xp: 30,
    realTenant: `In a real tenant: open the space in <b>Space Management</b>. Storage is under <b>Space Storage</b> (disk and in-memory),
      the priority under <b>Workload Management</b>, where you can also limit threads and memory per space. Changes take effect when you <b>Deploy</b> the space.`,
    debrief: `<p>Looks good, and we still have a reserve. If a load runs wild at night, the board's dashboards stay responsive.</p>
      <p><i>Calin adds:</i> In-memory is expensive. Give it to the spaces whose data is read often and fast, not to the ones that only store.</p>`,
  },
  {
    id: 'c01-m03',
    chapter: 1,
    title: 'Share, do not copy',
    from: CALIN,
    ticket: `<p>The data &amp; semantic layer builds on the entry tables. We do not copy that data, we <b>share</b> it: the tables stay in <code>RHN_ENTRY</code>,
      and <code>RHN_DSL</code> may read them.</p>
      <p>For our first views we need <code>BILLING_CONTRACTS</code> and <code>GRID_AREAS</code> in <code>RHN_DSL</code>.
      The presentation layer must <b>never</b> read entry data directly; it only gets what the data &amp; semantic layer prepares and shares.</p>
      <p>To prove it works, open the contracts from inside <code>RHN_DSL</code> and look at the data there.</p>`,
    tasks: [
      'In the Data Builder, select the space <code>RHN_DSL</code>. Look at its start page: what can you see from there?',
      'Switch to <code>RHN_ENTRY</code> and share the two tables with <code>RHN_DSL</code>, using the share icon in the object list.',
      'Switch back to <code>RHN_DSL</code>, open <code>BILLING_CONTRACTS</code> under "Shared with RHN_DSL" and run <b>Data Preview</b>.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 5, text: 'The space switch is next to "Data Builder" at the top of the start page. Each object in the list has a share icon on the right.' },
      { label: 'Hint 2: the concept', cost: 10, text: 'Sharing is set on the object, in the space it belongs to. Afterwards it appears in the target space under "Shared with …" and can be used there as a source.' },
      { label: 'Hint 3: a skeleton', cost: 20, text: 'Share in RHN_ENTRY: BILLING_CONTRACTS → RHN_DSL, GRID_AREAS → RHN_DSL. Then RHN_DSL → Shared with RHN_DSL → BILLING_CONTRACTS → Data Preview.' },
    ],
    checks: [
      {
        type: 'rule',
        label: 'Shared with the data & semantic layer',
        ok: 'BILLING_CONTRACTS and GRID_AREAS are shared with RHN_DSL.',
        test: ({ tenant }) => {
          if (!tenant.spaces.some((s) => s.id === 'RHN_DSL')) return 'RHN_DSL is missing. Create it first.';
          const missing = ['BILLING_CONTRACTS', 'GRID_AREAS'].filter((o) => !isShared(tenant, `RHN_ENTRY.${o}`, 'RHN_DSL'));
          return missing.length ? `Not shared with RHN_DSL yet: ${missing.join(', ')}.` : null;
        },
      },
      {
        type: 'rule',
        label: 'Presentation does not skip a layer',
        ok: 'Nothing from RHN_ENTRY is shared with RHN_PRES.',
        test: ({ tenant }) => {
          const leak = tenant.shares.filter((s) => s.to === 'RHN_PRES' && s.object.startsWith('RHN_ENTRY.'));
          return leak.length
            ? `${leak.map((s) => s.object).join(', ')} ${leak.length > 1 ? 'are' : 'is'} shared with RHN_PRES. The presentation layer only reads what RHN_DSL prepares: remove that share.`
            : null;
        },
      },
      {
        type: 'rule',
        label: 'Read from RHN_DSL',
        ok: 'You read the contracts from inside RHN_DSL.',
        test: ({ events }) =>
          events.has('preview-in:RHN_DSL:RHN_ENTRY.BILLING_CONTRACTS')
            ? null
            : 'In the Data Builder of RHN_DSL, open BILLING_CONTRACTS under "Shared with RHN_DSL" and run Data Preview.',
      },
      {
        type: 'question',
        id: 'share',
        label: 'Why share instead of copy',
        prompt: 'Why do we share the entry tables instead of copying them into RHN_DSL?',
        options: [
          'Copying is not possible in SAP Datasphere',
          'Shared tables load faster than copies',
          'The data exists once: one load, no extra storage, and no copies that drift apart',
          'Shared tables can be changed from both spaces',
        ],
        answer: 2,
        nudge: 'Not quite. Think about what happens with a copy when the entry table gets new data tomorrow.',
      },
    ],
    xp: 30,
    realTenant: `In a real tenant: open the table in the <b>Data Builder</b> of its space and choose <b>Share</b>, then pick the target spaces.
      In the target space the object shows up in the source browser under <b>Shared Objects</b> and can be used in views.
      Sharing gives read access only; the object can still only be changed in its own space.`,
    debrief: `<p>That is the pattern for the whole landscape: each layer reads from the layer below through sharing, never across two layers.</p>
      <p>Did you notice the start page of RHN_DSL? Only its own objects and what was shared with it. A modeler there never sees the rest of the entry layer.</p>`,
  },
  {
    id: 'c01-m04',
    chapter: 1,
    title: 'Names that tell a story',
    from: CALIN,
    ticket: `<p>Before we build the first views, we agree on object names. Here is our convention:</p>
      <p><code>RHN_&lt;layer&gt;_&lt;type&gt;_&lt;NAME&gt;</code></p>
      <ul>
        <li>Layer: <code>EN</code> entry, <code>DS</code> data &amp; semantic, <code>PR</code> presentation</li>
        <li>Type: <code>T</code> local table, <code>V</code> view, <code>F</code> fact, <code>D</code> dimension, <code>AM</code> analytic model</li>
        <li>Name: English, capital letters, words separated by underscores</li>
      </ul>
      <p>Show me you can apply it. Pick the right names below.</p>`,
    tasks: ['Read the convention in the ticket.', 'Answer the four questions below.'],
    hints: [
      { label: 'Hint 1: where to look', cost: 5, text: 'Read each name part by part: prefix, layer, type, name. Every part must fit.' },
      { label: 'Hint 2: the concept', cost: 10, text: 'The layer part names the layer the object lives in. A fact holds measures you add up (amounts, kWh); a dimension describes them (who, where, which tariff).' },
      { label: 'Hint 3: a skeleton', cost: 20, text: 'Base views and facts both live in the data & semantic layer: RHN_DS_V_… and RHN_DS_F_…  Models: RHN_PR_AM_…  Check for lower case and umlauts.' },
    ],
    checks: [
      {
        type: 'question',
        id: 'view',
        label: 'Contracts base view',
        prompt: 'A view in RHN_DSL that returns the contracts with clean grid area codes:',
        options: ['RHN_DSL_CONTRACTS_VIEW', 'RHN_EN_V_CONTRACTS', 'RHN_DS_V_CONTRACTS', 'V_CONTRACTS_CLEAN'],
        answer: 2,
        nudge: 'Not quite. Check the layer part (the short form) and where the type letter goes.',
      },
      {
        type: 'question',
        id: 'fact',
        label: 'Revenue fact',
        prompt: 'The fact with the invoice amounts for the CFO, in RHN_DSL:',
        options: ['RHN_DS_D_REVENUE', 'RHN_DS_F_REVENUE', 'RHN_PR_F_REVENUE', 'REVENUE_FACT'],
        answer: 1,
        nudge: 'Not quite. Amounts you add up are measures. Which type holds measures, and which layer gives the data its meaning?',
      },
      {
        type: 'question',
        id: 'break',
        label: 'Spot the rule breaker',
        prompt: 'Which name breaks the convention?',
        options: ['RHN_DS_V_METER_READINGS', 'RHN_PR_AM_RECEIVABLES', 'RHN_DS_V_Zählerstände', 'RHN_DS_D_TARIFF'],
        answer: 2,
        nudge: 'Not quite. Look at the last part of each name: language, letters, case.',
      },
      {
        type: 'question',
        id: 'why',
        label: 'Why a convention',
        prompt: 'What is the main benefit of this convention?',
        options: [
          'Datasphere refuses names without a prefix',
          'Layer and type are visible at a glance, and names stay unique when objects are shared between spaces',
          'Short names make queries faster',
          'Only objects with RHN_ can be shared',
        ],
        answer: 1,
        nudge: 'Not quite. Think about a list of 200 objects in the source browser of RHN_PRES, some of them shared from RHN_DSL.',
      },
    ],
    xp: 25,
    realTenant: `Datasphere does not enforce a naming convention; it is a team agreement. Each object has a <b>technical name</b>
      (fixed after the first deploy) and a <b>business name</b> for users. Put the convention in your project wiki and check it in reviews.`,
    debrief: `<p>Perfect. From the next chapter on I will look at your object names in every review.</p>
      <p>Our landscape stands: three spaces, sized and prioritized, with clean sharing between the layers. Next, Jonas needs your help with
      people: who may do what in which space. That is chapter 2.</p>`,
  },
];
