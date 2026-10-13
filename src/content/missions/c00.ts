import type { Mission, RuleContext } from '../../missions/types';
import { findObject, STATUS_LABEL } from '../../repo';
import { appById } from '../apps';

/**
 * Chapter 0, Find your way. No SQL: how the tenant is built, which app does what,
 * spaces in the Data Builder, the Repository Explorer, business vs. technical names, save vs. deploy.
 */

const CALIN = { name: 'Calin Mucea', role: 'Senior Data Architect, your mentor', initials: 'CM' };
const IT = { name: 'Jonas Becker', role: 'Head of IT, tenant owner', initials: 'JB' };

const APP_CHOICES = ['Data Builder', 'Space Management', 'Data Integration Monitor', 'Security', 'Connections', 'Repository Explorer'];
const choice = (label: string) => APP_CHOICES.indexOf(label);

function visited(apps: string[]) {
  return ({ events }: RuleContext) => {
    const missing = apps.filter((a) => !events.has(`app:${a}`));
    return missing.length ? `You have not opened ${missing.map((a) => appById(a)!.label).join(', ')} yet. Use the side navigation.` : null;
  };
}

function did(event: string, message: string) {
  return ({ events }: RuleContext) => (events.has(event) ? null : message);
}

/** Every app of the side navigation, in its real order: the grand tour (c00-m00) opens each of them once. */
export const TOUR_APPS = ['home', 'repository', 'sysmonitor', 'capacities', 'tasklogs', 'statements', 'ecn', 'monitor', 'catalog', 'marketplace',
  'semantic', 'business', 'builder', 'connections', 'spaces', 'translation', 'transport', 'sharing', 'security', 'system'];

const TOUR_JOBS = ['Capacities', 'Transport', 'Translation', 'Business Builder', 'Settings (user menu)', 'Expensive Statement Logs'];
const job = (label: string) => TOUR_JOBS.indexOf(label);

export const CHAPTER_0: Mission[] = [
  {
    id: 'c00-m00',
    chapter: 0,
    title: 'The grand tour',
    from: CALIN,
    ticket: `<p>Welcome to Stadtwerke Rheinau! I am Calin, your mentor. Before you touch anything, I walk you through the
      <b>whole</b> tenant once: every part of the screen and every app in the side navigation, top to bottom.</p>
      <p>For each one you learn what it does, why it exists, and when you will need it in our project. You click everything yourself;
      the tutorial waits for you. Most apps are still locked and show an info page: that is fine, today you only look.</p>`,
    tasks: [
      '<b>The frame:</b> tenant banner, shellbar, your XP, glossary, How to play and the user menu with Settings.',
      '<b>Home</b> and the <b>Repository Explorer</b>.',
      '<b>Monitoring:</b> System and Spaces, Capacities, Task Logs, Expensive Statement Logs, Elastic Compute Nodes, Data Integration.',
      '<b>Catalog &amp; Marketplace:</b> Search and Marketplace Data Products.',
      '<b>Apps:</b> Semantic Onboarding, Business Builder, the <b>Data Builder</b> from the inside, Connections.',
      '<b>Utilities:</b> Space Management, Translation, Transport, Data Sharing Cockpit.',
      '<b>Security</b> and <b>System</b> at the bottom.',
      'Answer the questions below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 0, text: 'Press Show tutorial in the mission panel: it walks you through everything, one click at a time.' },
      { label: 'Hint 2: the concept', cost: 0, text: 'Every app sits in the side navigation. Monitoring and Catalog & Marketplace open a list; Apps and Utilities are groups; Security and System sit at the bottom.' },
      { label: 'Hint 3: a skeleton', cost: 0, text: 'Costs → Capacities · moving to production → Transport · other languages → Translation · deprecated → Business Builder · technical names → Settings · slow statements → Expensive Statement Logs.' },
    ],
    checks: [
      {
        type: 'rule', label: 'Every app opened', ok: 'You opened all twenty apps of the side navigation.',
        test: ({ events }) => {
          const missing = TOUR_APPS.filter((a) => !events.has(`app:${a}`));
          return missing.length ? `Still to open: ${missing.map((a) => appById(a)!.label).join(', ')}. Show tutorial walks you there.` : null;
        },
      },
      { type: 'rule', label: 'Glossary', ok: 'You found the glossary.', test: did('app:glossary', 'Open the glossary: the book icon in the shellbar.') },
      { type: 'rule', label: 'Settings', ok: 'You opened Settings from the user menu.', test: did('settings:open', 'Open Settings: click the avatar DA at the top right, then Settings.') },
      { type: 'rule', label: 'Inside the Data Builder', ok: 'You opened a table and looked at its data.', test: did('preview:RHN_ENTRY.BILLING_CONTRACTS', 'In the Data Builder, open BILLING_CONTRACTS in RHN_ENTRY and press Data Preview.') },
      { type: 'question', id: 'cost', label: 'The bill', prompt: 'Finance asks how many capacity units the tenant used this month. Where do you look?', options: TOUR_JOBS, answer: job('Capacities'), nudge: 'Not quite. Which Monitoring entry shows capacity units per month?' },
      { type: 'question', id: 'prod', label: 'To production', prompt: 'The finished CFO model must go from the development tenant to production. Which app moves it?', options: TOUR_JOBS, answer: job('Transport'), nudge: 'Not quite. Which utility bundles objects into packages and exports them to other tenants?' },
      { type: 'question', id: 'lang', label: 'French users', prompt: 'The French subsidiary wants French business names in SAP Analytics Cloud. Where?', options: TOUR_JOBS, answer: job('Translation'), nudge: 'Not quite. Which utility handles business names in other languages?' },
      { type: 'question', id: 'old', label: 'Old models', prompt: 'Where should you no longer build new models, because the app is deprecated?', options: TOUR_JOBS, answer: job('Business Builder'), nudge: 'Not quite. Which app did the tour call the older business layer?' },
      { type: 'question', id: 'names', label: 'Technical names', prompt: 'You want every list to show technical names instead of business names. Where do you switch?', options: TOUR_JOBS, answer: job('Settings (user menu)'), nudge: 'Not quite. It is a personal setting, behind your avatar.' },
    ],
    xp: 30,
    realTenant: `A real tenant has the same frame: banner with the tenant name, shellbar, side navigation. You only see the apps your roles
      allow, so a modeler's navigation is shorter than an administrator's. SAP adds and moves apps a few times a year.`,
    debrief: `<p>That was everything. You will not remember every app today, and you do not have to: the Home page has the map,
      and every app explains itself until you unlock it.</p>
      <p>Next: I give you five everyday jobs. Show me you know which app does them.</p>`,
  },
  {
    id: 'c00-m01',
    chapter: 0,
    title: 'Find your way',
    from: CALIN,
    ticket: `<p>The tour showed you every app. Now the six you will use most, once more and on your own: in SAP Datasphere every job
      has its own app, and a data architect must know without thinking where to go.</p>
      <p>Open each of these apps once and read what it is for: <b>Repository Explorer</b>, <b>Data Builder</b>, <b>Data Integration Monitor</b>,
      <b>Connections</b>, <b>Space Management</b> and <b>Security</b>. Then tell me where you would go for the jobs below.</p>`,
    tasks: [
      'Open the six apps from the ticket in the side navigation. The <b>Home</b> page also has an overview of all apps.',
      'Answer the five questions below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 5, text: 'The side navigation has two groups: modeling and integration apps on top, administration at the bottom. Hover an entry to see what it does.' },
      { label: 'Hint 2: the concept', cost: 10, text: 'Building happens in the Data Builder. Getting data in: Connections (the link to a source) and the Data Integration Monitor (runs and logs). Administration: Space Management and Security.' },
      { label: 'Hint 3: a skeleton', cost: 20, text: 'Space → Space Management · view → Data Builder · last night\'s load → Data Integration Monitor · role → Security · link to S/4HANA → ______' },
    ],
    checks: [
      { type: 'rule', label: 'Apps opened', ok: 'You have seen all six apps.', test: visited(['repository', 'builder', 'monitor', 'connections', 'spaces', 'security']) },
      { type: 'question', id: 'space', label: 'Create a space', prompt: 'Where do you create a new space for a project?', options: APP_CHOICES, answer: choice('Space Management'), nudge: 'Not quite. Which app lists the spaces with their storage and priority?' },
      { type: 'question', id: 'view', label: 'Build a view', prompt: 'Where do you build a view that joins contracts and grid areas?', options: APP_CHOICES, answer: choice('Data Builder'), nudge: 'Not quite. Which app creates tables, views and models?' },
      { type: 'question', id: 'load', label: 'Last night\'s load', prompt: 'The CFO says the numbers look old. Where do you check whether last night\'s replication ran?', options: APP_CHOICES, answer: choice('Data Integration Monitor'), nudge: 'Not quite. Which app shows runs, schedules and logs of everything that moves data?' },
      { type: 'question', id: 'role', label: 'A new colleague', prompt: 'A new colleague needs access. Where do you give her a role?', options: APP_CHOICES, answer: choice('Security'), nudge: 'Not quite. Which app manages users and roles?' },
      { type: 'question', id: 'source', label: 'A new source', prompt: 'Where do you set up the link to the S/4HANA billing system?', options: APP_CHOICES, answer: choice('Connections'), nudge: 'Not quite. Before any data can be replicated, the tenant needs a link to the source. Which app creates it?' },
    ],
    xp: 20,
    realTenant: `The real side navigation looks much like this one. You only see the apps your roles allow, and the
      <b>☰</b> button at the top left expands the icons to labels. SAP moves and renames apps now and then, so check your own tenant.`,
    debrief: `<p>Good. You now know where things live. Most of your work will happen in the Data Builder, but a data architect
      also needs Space Management, Security and the monitor.</p>
      <p>Next: everything in the Data Builder happens inside a space. Let us look at the one IT prepared.</p>`,
  },
  {
    id: 'c00-m02',
    chapter: 0,
    title: 'Pick a space',
    from: CALIN,
    ticket: `<p>IT has loaded the first extracts from billing, metering and the CRM into the space <code>RHN_ENTRY</code>.</p>
      <p>Open the <b>Data Builder</b>, pick that space, and open the table with the supply contracts. Look at its columns and use
      <b>Data Preview</b> to see real rows. Then answer my two questions.</p>`,
    tasks: [
      'Open the <b>Data Builder</b> and select the space <code>RHN_ENTRY</code>.',
      'Open the contracts table from the object list.',
      'Look at its columns, run <b>Data Preview</b>, and answer the questions below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 5, text: 'Data Builder in the side navigation. The first screen asks for a space. The start page lists the objects of the space.' },
      { label: 'Hint 2: the concept', cost: 10, text: 'An object opens in its editor: properties on the right, columns in the middle, Data Preview at the bottom.' },
      { label: 'Hint 3: a skeleton', cost: 20, text: 'Data Builder → RHN_ENTRY → BILLING_CONTRACTS → Data Preview. Count the rows of the column list.' },
    ],
    checks: [
      {
        type: 'rule', label: 'Space selected', ok: 'You picked RHN_ENTRY.',
        // After the grand tour the Data Builder may still have RHN_ENTRY selected: opening an object there counts too.
        test: ({ events }) => (events.has('space:builder:RHN_ENTRY') || [...events].some((e) => e.startsWith('open:RHN_ENTRY.'))
          ? null : 'Open the Data Builder from the side navigation and select the space RHN_ENTRY.'),
      },
      { type: 'rule', label: 'Table opened', ok: 'You opened BILLING_CONTRACTS.', test: did('open:RHN_ENTRY.BILLING_CONTRACTS', 'Open BILLING_CONTRACTS from the object list of RHN_ENTRY.') },
      { type: 'rule', label: 'Data previewed', ok: 'You looked at real rows.', test: did('preview:RHN_ENTRY.BILLING_CONTRACTS', 'In the editor of BILLING_CONTRACTS, press Data Preview.') },
      { type: 'question', id: 'cols', label: 'Columns', prompt: 'How many columns does BILLING_CONTRACTS have?', options: ['5', '7', '9', '12'], answer: 1, nudge: 'Not quite. Count the rows in the column list of the editor.' },
      {
        type: 'question', id: 'src', label: 'Source system', prompt: 'Which column tells you which source system a row came from?',
        options: ['CONTRACT_ID', 'TARIFF', 'SRC_SYS_ID', 'START_DATE'], answer: 2,
        nudge: 'Not quite. Look for the column whose values are system names like S4U.',
      },
    ],
    xp: 20,
    realTenant: `In a real tenant the <b>Data Builder</b> also starts with the space: you choose it at the top of the start page.
      The start page offers tiles to create new objects and lists the objects of the space. Data Preview shows the first rows of a table or view.`,
    debrief: `<p>Right: seven columns, and <code>SRC_SYS_ID</code> names the source system. That column will save us later, when we
      find odd values and need to know where they came from.</p>
      <p>Did you notice the tiles on the start page? Each one creates a different kind of object. Most are greyed out for now;
      you meet them chapter by chapter.</p>`,
  },
  {
    id: 'c00-m03',
    chapter: 0,
    title: 'Search the repository',
    from: IT,
    ticket: `<p>Hi, Jonas from IT. The metering team asks where the meter readings are and what kind of object holds them.</p>
      <p>When you do not know in which space something lives, do not click through every space. Use the <b>Repository Explorer</b>:
      it searches all spaces you are a member of at once. Find the meter readings, open them from there, and answer the team's questions.</p>`,
    tasks: [
      'Open the <b>Repository Explorer</b> and search for the meter readings.',
      'Open the object from the search result.',
      'Answer the questions below. The filters of the Repository Explorer help with the last one.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 5, text: 'Repository Explorer is near the top of the side navigation. Type part of a name into the search field.' },
      { label: 'Hint 2: the concept', cost: 10, text: 'The search looks at business names and technical names. Clicking a result opens it in its editor in the Data Builder.' },
      { label: 'Hint 3: a skeleton', cost: 20, text: 'Search "meter" → open METER_READINGS. For the count, filter Space = RHN_ENTRY.' },
    ],
    checks: [
      { type: 'rule', label: 'Searched', ok: 'You used the search.', test: ({ events }) => ([...events].some((e) => e.startsWith('search:repository:')) ? null : 'Type a search term into the Repository Explorer.') },
      { type: 'rule', label: 'Opened from the search', ok: 'You opened METER_READINGS from the Repository Explorer.', test: did('repository-open:RHN_ENTRY.METER_READINGS', 'Open the meter readings by clicking the result in the Repository Explorer.') },
      { type: 'question', id: 'space', label: 'Which space', prompt: 'In which space are the meter readings?', options: ['RHN_ENTRY', 'RHN_DSL', 'RHN_PRES', 'MDM'], answer: 0, nudge: 'Not quite. Look at the Space column of the search result.' },
      { type: 'question', id: 'kind', label: 'Which kind of object', prompt: 'What kind of object holds the meter readings?', options: ['SQL View', 'Local Table', 'Remote Table', 'Analytic Model'], answer: 1, nudge: 'Not quite. Look at the Type column.' },
      { type: 'question', id: 'count', label: 'Objects in RHN_ENTRY', prompt: 'How many objects does the space RHN_ENTRY contain?', options: ['4', '7', '12', '15'], answer: 1, nudge: 'Not quite. Filter the Repository Explorer by space and read the counter.' },
    ],
    xp: 20,
    realTenant: `The real <b>Repository Explorer</b> searches across all your spaces and also shows folders, dependencies and the impact
      of a change. For data assets beyond Datasphere, there is the <b>Catalog</b>.`,
    debrief: `<p>Thanks, I sent the metering team the answer. A Local Table in RHN_ENTRY: stored in the tenant, loaded from the meter data system.</p>`,
  },
  {
    id: 'c00-m04',
    chapter: 0,
    title: 'Save is not deploy',
    from: CALIN,
    ticket: `<p>Every object has two names. The <b>technical name</b> is what SQL and other objects refer to; it is fixed. The
      <b>business name</b> is what people see, for example in SAP Analytics Cloud; you can change it any time.</p>
      <p>IT left the business name of <code>BILLING_CONTRACTS</code> as the technical name. Please change it to <b>Billing Contracts</b>.
      Watch the status in the editor when you save, and when you deploy.</p>`,
    tasks: [
      'Open <code>BILLING_CONTRACTS</code> in the Data Builder.',
      'Change the business name in the properties panel and press <b>Save</b>. Look at the status.',
      'Press <b>Deploy</b>. Look at the status again, then answer the questions below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 5, text: 'The properties panel on the right of the editor has the business name. Save and Deploy are in the toolbar.' },
      { label: 'Hint 2: the concept', cost: 10, text: 'Save stores the design. Deploy makes it active in the runtime. Until you deploy, everyone still sees the old version.' },
      { label: 'Hint 3: a skeleton', cost: 20, text: 'Business Name: Billing Contracts → Save (status: Changes to Deploy) → Deploy (status: Deployed).' },
    ],
    checks: [
      {
        type: 'rule',
        label: 'Business name',
        ok: 'BILLING_CONTRACTS is called Billing Contracts, and that is deployed.',
        test: ({ tenant }) => {
          const o = findObject(tenant, 'RHN_ENTRY.BILLING_CONTRACTS');
          if (!o) return 'BILLING_CONTRACTS is missing.';
          if (o.businessName.trim().toLowerCase() !== 'billing contracts') return `The business name is "${o.businessName}". Set it to Billing Contracts and save.`;
          if (o.status !== 'deployed') return `You saved it, but the status is ${STATUS_LABEL[o.status]}. Everyone still sees the old name until you deploy.`;
          return null;
        },
      },
      {
        type: 'question', id: 'changes', label: 'Changes to Deploy', prompt: 'What does the status "Changes to Deploy" mean?',
        options: [
          'The object was never deployed',
          'There are saved changes that are not active yet; the runtime still uses the last deployed version',
          'The deployment failed and must be repeated',
          'Someone else is editing the object right now',
        ],
        answer: 1,
        nudge: 'Not quite. Save the change without deploying and read the status explanation in the properties panel.',
      },
      {
        type: 'question', id: 'names', label: 'Which name can change', prompt: 'Which name can you change later without breaking views that use the object?',
        options: ['The technical name', 'The business name', 'Both', 'Neither'], answer: 1,
        nudge: 'Not quite. Which name do SQL statements and other objects use to refer to the table?',
      },
    ],
    xp: 25,
    realTenant: `Same in a real tenant: <b>Save</b> stores the design-time object, <b>Deploy</b> creates or updates it in the
      database. The object list shows the status, and the technical name cannot be changed once the object exists.`,
    debrief: `<p>That is the rhythm of the Data Builder: change, save, deploy. In a real project you deploy on purpose,
      because other views and reports use the deployed version.</p>
      <p>You know your way around now. Next chapter: you design the spaces for our three layers yourself.</p>`,
  },
];
