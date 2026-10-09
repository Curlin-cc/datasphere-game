/**
 * How much help a chapter gives for free. The game gets harder as the player learns:
 *  - full:  all hints are open from the start, nothing to buy
 *  - light: only the first, vague hint (the direction) is open; concept and skeleton cost XP
 *  - paid:  no free hints; every hint costs XP
 *  - none:  no hints at all (board request at the end)
 * Tutorials stay free in every chapter.
 */
export type Guidance = 'full' | 'light' | 'paid' | 'none';

export const GUIDANCE_INFO: Record<Guidance, { label: string; text: string }> = {
  full: { label: 'Guided', text: 'All hints are open in this chapter. Read them whenever you like.' },
  light: { label: 'Light hints', text: 'The first hint is open. The concept and the skeleton cost XP.' },
  paid: { label: 'On your own', text: 'No free hints any more. Every hint costs XP.' },
  none: { label: 'No hints', text: 'This mission has no hints. Show what you have learned.' },
};

export interface Chapter {
  nr: number;
  title: string;
  summary: string;
  guidance: Guidance;
}

/** Learning path, see docs/PLAN.md section 3. */
export const CHAPTERS: Chapter[] = [
  { nr: 0, title: 'Find your way', summary: 'The apps of the tenant, spaces, objects, save and deploy', guidance: 'full' },
  { nr: 1, title: 'Space concept', summary: 'Design spaces per layer with storage and naming rules', guidance: 'full' },
  { nr: 2, title: 'Users and roles', summary: 'Give eight people exactly the access they need', guidance: 'light' },
  { nr: 3, title: 'Data integration', summary: 'Connect sources, read live or replicate, load by delta, repair a failed load', guidance: 'light' },
  { nr: 4, title: 'Inbound layer', summary: 'Profile the raw data with SQL and find its defects', guidance: 'light' },
  { nr: 5, title: 'Harmonization', summary: 'Clean duplicates, units and legacy keys in views', guidance: 'paid' },
  { nr: 6, title: 'Semantics', summary: 'Facts, dimensions, texts, hierarchies, associations', guidance: 'paid' },
  { nr: 7, title: 'Analytic model', summary: 'Measures and variables for the CFO', guidance: 'paid' },
  { nr: 8, title: 'Data access controls', summary: 'Regional managers see only their grid area', guidance: 'paid' },
  { nr: 9, title: 'Persistence and performance', summary: 'Decide what to persist and why', guidance: 'paid' },
  { nr: 10, title: 'Operations', summary: 'Task chains, monitoring and failed loads', guidance: 'paid' },
  { nr: 11, title: 'Board request', summary: 'An end-to-end change, no hints', guidance: 'none' },
];

export const RANKS = ['Junior Data Architect', 'Data Architect', 'Senior Data Architect', 'Lead Data Architect'];

export interface GlossaryTerm {
  term: string;
  text: string;
  realTenant: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    term: 'Space',
    text: 'An isolated area in the tenant with its own storage, members and objects. Spaces separate layers, teams or both.',
    realTenant: 'Space Management in the side navigation.',
  },
  {
    term: 'Local table',
    text: 'A table whose data is stored inside Datasphere, filled by upload, replication flow or data flow.',
    realTenant: 'Data Builder > New Table, or created by a replication flow.',
  },
  {
    term: 'Inbound layer',
    text: 'The landing zone for source data. Data arrives 1:1 with a source system ID and without business logic.',
    realTenant: 'Usually its own space, e.g. one per source or one shared inbound space.',
  },
  {
    term: 'SQL view',
    text: 'A view defined in SQL. In Datasphere you can write plain SQL or SQLScript; this game uses standard SQL.',
    realTenant: 'Data Builder > New SQL View.',
  },
  {
    term: 'Space ID',
    text: 'The technical name of a space: up to 20 characters, capital letters, digits and underscores. It cannot be changed after the space is created. The space name is for people and can be changed.',
    realTenant: 'Space Management > Create.',
  },
  {
    term: 'Space storage',
    text: 'Each space gets a share of the tenant\'s disk and in-memory storage. In-memory is faster and more expensive; give it to data that is read often.',
    realTenant: 'Space Management > your space > Space Storage.',
  },
  {
    term: 'Space priority',
    text: 'Decides whose statements are favored when the database is busy, from 1 (lowest) to 5 (highest). Reporting usually ranks above loading.',
    realTenant: 'Space Management > your space > Workload Management.',
  },
  {
    term: 'Sharing',
    text: 'An object of one space can be shared with other spaces. They can read it as a source, but the data stays where it is and can only be changed in its own space.',
    realTenant: 'Data Builder > open the object > Share.',
  },
  {
    term: 'Naming convention',
    text: 'A team agreement on object names, e.g. RHN_<layer>_<type>_<NAME>. Datasphere does not enforce it; reviews do.',
    realTenant: 'Technical name and business name of each object in the Data Builder.',
  },
  {
    term: 'Global role',
    text: 'A role that applies to the whole tenant, such as DW Administrator. Give it to very few people.',
    realTenant: 'Security > Roles, standard roles.',
  },
  {
    term: 'Scoped role',
    text: 'A role built from a template (Space Administrator, Integrator, Modeler, Viewer, Consumer) plus a scope of spaces. Each user gets it for some or all of those spaces.',
    realTenant: 'Security > Roles > create a scoped role.',
  },
  {
    term: 'Least privilege',
    text: 'Everyone gets exactly the rights their job needs, no more. Movers lose their old rights when they get new ones.',
    realTenant: 'Security > Authorization Overview shows who can do what where.',
  },
  {
    term: 'Space administrator',
    text: 'Runs a space: members, settings and objects. Lets the tenant owner delegate day-to-day access requests.',
    realTenant: 'Space Management > your space > Users.',
  },
  {
    term: 'Side navigation',
    text: 'The column of apps on the left of every Datasphere screen. Each app does one job: build, integrate, monitor, administer. You only see the apps your roles allow.',
    realTenant: 'The ☰ button at the top left expands it to show labels.',
  },
  {
    term: 'Data Builder',
    text: 'The app where modelers build tables, views, analytic models, flows and task chains. You always work inside one space.',
    realTenant: 'Side navigation > Data Builder, then select a space.',
  },
  {
    term: 'Repository Explorer',
    text: 'Searches all objects of all spaces you are a member of, and opens them in their editor.',
    realTenant: 'Side navigation > Repository Explorer.',
  },
  {
    term: 'Technical name and business name',
    text: 'The technical name identifies an object in SQL and for other objects; it cannot change. The business name is for people and can change any time.',
    realTenant: 'Properties panel of any object in the Data Builder.',
  },
  {
    term: 'Save and deploy',
    text: 'Save stores the design. Deploy makes it active in the database. Statuses: Not Deployed, Changes to Deploy, Deployed.',
    realTenant: 'Toolbar of every Data Builder editor; the status column of the object list.',
  },
  {
    term: 'Connection',
    text: 'Links one space to a source or target system, created from a connection type. Only members of that space can use it.',
    realTenant: 'Side navigation > Connections, select the space, Create.',
  },
  {
    term: 'Connection features',
    text: 'What a connection can be used for: Remote Tables, Data Flows, Replication Flows, Model Import. The type decides what is possible; Validate shows what works.',
    realTenant: 'Connections > select a connection > Validate.',
  },
  {
    term: 'Cloud Connector',
    text: 'Installed in the company network, it links the cloud tenant with on-premise systems. A connection names it by its location ID.',
    realTenant: 'System > Configuration > Data Integration; location ID in the connection properties.',
  },
  {
    term: 'Remote table',
    text: 'An object of a connection, made available in a space. Data access Remote reads the source live on each query; Replicated (Snapshot) stores a copy that is refreshed by a new snapshot or a schedule.',
    realTenant: 'Data Builder > Import Remote Tables; data access in the Data Integration Monitor > Remote Tables.',
  },
  {
    term: 'Replication flow',
    text: 'Copies objects from one source connection into local tables, with projections (filters, mapping, extra columns) but no complex logic. Load type Initial Only or Initial and Delta.',
    realTenant: 'Data Builder > New Replication Flow; runs in the Data Integration Monitor > Flows.',
  },
  {
    term: 'Initial and Delta',
    text: 'Loads everything once, then keeps checking the source and transfers only the changes. Needs a delta-capable source.',
    realTenant: 'Load type of each replication object in a replication flow.',
  },
  {
    term: 'Truncate',
    text: 'Empties the target table before the load. Right when one source owns the whole table; dangerous when a table collects rows from several sources.',
    realTenant: 'Option per replication object in a replication flow.',
  },
  {
    term: 'Data Integration Monitor',
    text: 'Runs, schedules and logs of everything that moves data into one space: remote tables, local tables, views, flows, remote queries, task chains.',
    realTenant: 'Side navigation > Data Integration Monitor, select the space.',
  },
  {
    term: 'Consent for scheduling',
    text: 'Scheduled tasks run in the name of the user who scheduled them. That user has to authorize the job scheduling first.',
    realTenant: 'Profile settings > Authorized Consent Settings; the monitor asks if it is missing.',
  },
  {
    term: 'Locked space',
    text: 'A space that uses more disk than assigned is locked: nothing can be written. It needs more storage (or less data) and an Unlock.',
    realTenant: 'Space Management > Unlock on the space.',
  },
];
