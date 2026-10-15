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
  { nr: 1, title: 'Space concept', summary: 'Three layers, three spaces: entry, data & semantic, presentation; storage and naming rules', guidance: 'full' },
  { nr: 2, title: 'Users and roles', summary: 'Give eight people exactly the access they need', guidance: 'light' },
  { nr: 3, title: 'Data integration', summary: 'Connect sources into the entry layer, read live or replicate, load by delta, repair a failed load, import S/4HANA entities', guidance: 'light' },
  { nr: 4, title: 'Entry layer', summary: 'Profile the raw data with SQL and find its defects', guidance: 'light' },
  { nr: 5, title: 'Base views', summary: 'Data & semantic layer, part 1: clean duplicates, units and legacy keys in views', guidance: 'paid' },
  { nr: 6, title: 'Semantics', summary: 'Data & semantic layer, part 2: facts, dimensions, associations', guidance: 'paid' },
  { nr: 7, title: 'Analytic model', summary: 'Presentation layer: share facts and dimensions, measures and variables for the CFO', guidance: 'paid' },
  { nr: 8, title: 'Data access controls', summary: 'Regional managers see only their grid area, protected in the data & semantic layer', guidance: 'paid' },
  { nr: 9, title: 'Persistence and performance', summary: 'Decide what to persist and why', guidance: 'paid' },
  { nr: 10, title: 'Operations', summary: 'Task chains, monitoring and failed loads', guidance: 'paid' },
  { nr: 11, title: 'Board request', summary: 'An end-to-end change, no hints', guidance: 'none' },
  { nr: 12, title: 'Excursions', summary: 'Power BI and database users, transport, catalog, the old Business Builder, hierarchies, version history, OData, Content Network', guidance: 'light' },
];

/** Chapter of the excursions after the main game (Handbuch 7, 8, 11, 12). */
export const EXCURSIONS = 12;

export const RANKS = ['Junior Data Architect', 'Data Architect', 'Senior Data Architect', 'Lead Data Architect'];

export interface GlossaryTerm {
  term: string;
  /** Chapter in which the player first meets the term; the glossary shows it from then on. */
  chapter: number;
  text: string;
  realTenant: string;
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    term: 'Space',
    chapter: 0,
    text: 'An isolated area in the tenant with its own storage, members and objects. Spaces separate layers, teams or both.',
    realTenant: 'Space Management in the side navigation.',
  },
  {
    term: 'Local table',
    chapter: 0,
    text: 'A table whose data is stored inside Datasphere, filled by upload, replication flow, data flow, or typed in its Data Editor (good for small mapping and permission tables).',
    realTenant: 'Data Builder > New Table (Data Editor for the rows), or created by a replication flow.',
  },
  {
    term: 'Entry layer',
    chapter: 1,
    text: 'The bottom layer: the landing zone for source data. Data arrives 1:1 with a source system ID and without business logic: remote tables, replicated tables, files, and entities imported from SAP systems.',
    realTenant: 'Usually its own space, e.g. one per source or one shared entry space. Connections live here.',
  },
  {
    term: 'SQL view',
    chapter: 0,
    text: 'A view defined in SQL. In Datasphere you can write plain SQL or SQLScript; this game uses standard SQL.',
    realTenant: 'Data Builder > New SQL View.',
  },
  {
    term: 'Space ID',
    chapter: 1,
    text: 'The technical name of a space: up to 20 characters, capital letters, digits and underscores. It cannot be changed after the space is created. The space name is for people and can be changed.',
    realTenant: 'Space Management > Create.',
  },
  {
    term: 'Space storage',
    chapter: 1,
    text: 'Each space gets a share of the tenant\'s disk and in-memory storage. In-memory is faster and more expensive; give it to data that is read often.',
    realTenant: 'Space Management > your space > Space Storage.',
  },
  {
    term: 'Space priority',
    chapter: 1,
    text: 'Decides whose statements are favored when the database is busy, from 1 (lowest) to 8 (highest); new spaces get 5. The presentation space usually ranks above loading.',
    realTenant: 'System > Configuration > Workload Management.',
  },
  {
    term: 'Sharing',
    chapter: 1,
    text: 'An object of one space can be shared with other spaces. They can read it as a source, but the data stays where it is and can only be changed in its own space.',
    realTenant: 'Data Builder > open the object > Share.',
  },
  {
    term: 'Naming convention',
    chapter: 1,
    text: 'A team agreement on object names, e.g. RHN_<layer>_<type>_<NAME>. Datasphere does not enforce it; reviews do.',
    realTenant: 'Technical name and business name of each object in the Data Builder.',
  },
  {
    term: 'Global role',
    chapter: 2,
    text: 'A role that applies to the whole tenant, such as DW Administrator. Give it to very few people.',
    realTenant: 'Security > Roles, standard roles.',
  },
  {
    term: 'Scoped role',
    chapter: 2,
    text: 'A role built from a template (Space Administrator, Integrator, Modeler, Viewer, Consumer) plus a scope of spaces. Each user gets it for some or all of those spaces.',
    realTenant: 'Security > Roles > create a scoped role.',
  },
  {
    term: 'Least privilege',
    chapter: 2,
    text: 'Everyone gets exactly the rights their job needs, no more. Movers lose their old rights when they get new ones.',
    realTenant: 'Security > Authorization Overview shows who can do what where.',
  },
  {
    term: 'Space administrator',
    chapter: 2,
    text: 'Runs a space: members, settings and objects. Lets the tenant owner delegate day-to-day access requests.',
    realTenant: 'Space Management > your space > Users.',
  },
  {
    term: 'Side navigation',
    chapter: 0,
    text: 'The column of apps on the left of every Datasphere screen. Each app does one job: build, integrate, monitor, administer. You only see the apps your roles allow.',
    realTenant: 'The ☰ button at the top left expands it to show labels.',
  },
  {
    term: 'Data Builder',
    chapter: 0,
    text: 'The app where modelers build tables, views, analytic models, flows and task chains. You always work inside one space.',
    realTenant: 'Side navigation > Data Builder, then select a space.',
  },
  {
    term: 'Repository Explorer',
    chapter: 0,
    text: 'Searches all objects of all spaces you are a member of, and opens them in their editor.',
    realTenant: 'Side navigation > Repository Explorer.',
  },
  {
    term: 'Technical name and business name',
    chapter: 0,
    text: 'The technical name identifies an object in SQL and for other objects; it cannot change. The business name is for people and can change any time.',
    realTenant: 'Properties panel of any object in the Data Builder.',
  },
  {
    term: 'Save and deploy',
    chapter: 0,
    text: 'Save stores the design. Deploy makes it active in the database. Statuses: Not Deployed, Changes to Deploy, Deployed.',
    realTenant: 'Toolbar of every Data Builder editor; the status column of the object list.',
  },
  {
    term: 'Connection',
    chapter: 3,
    text: 'Links one space to a source or target system, created from a connection type. Only members of that space can use it.',
    realTenant: 'Side navigation > Connections, select the space, Create.',
  },
  {
    term: 'Connection features',
    chapter: 3,
    text: 'What a connection can be used for: Remote Tables, Data Flows, Replication Flows, Model Import. The type decides what is possible; Validate shows what works.',
    realTenant: 'Connections > select a connection > Validate.',
  },
  {
    term: 'Cloud Connector',
    chapter: 3,
    text: 'Installed in the company network, it links the cloud tenant with on-premise systems. A connection names it by its location ID.',
    realTenant: 'System > Configuration > Data Integration; location ID in the connection properties.',
  },
  {
    term: 'Remote table',
    chapter: 3,
    text: 'An object of a connection, made available in a space. Data access Remote reads the source live on each query; Replicated (Snapshot) stores a copy that is refreshed when you start data replication or by a schedule.',
    realTenant: 'Data Builder > Import menu > Import Remote Tables; data access in Monitoring > Data Integration > Remote Tables.',
  },
  {
    term: 'Replication flow',
    chapter: 3,
    text: 'Copies objects from one source connection into local tables, with projections (filters, mapping, extra columns) but no complex logic. Load type Initial Only or Initial and Delta.',
    realTenant: 'Data Builder > New Replication Flow; runs in Monitoring > Data Integration > Flows.',
  },
  {
    term: 'Initial and Delta',
    chapter: 3,
    text: 'Loads everything once, then keeps checking the source and transfers only the changes. Needs a delta-capable source.',
    realTenant: 'Load type of each replication object in a replication flow.',
  },
  {
    term: 'Delete All Before Loading',
    chapter: 3,
    text: 'Formerly called Truncate. Empties the target table before the load. Right when one source owns the whole table; dangerous when a table collects rows from several sources.',
    realTenant: 'Setting per replication object in a replication flow. Not the same as the Data Flow target mode Truncate.',
  },
  {
    term: 'Data Integration Monitor',
    chapter: 3,
    text: 'Runs, schedules and logs of everything that moves data into one space: remote tables, local tables, views, flows, remote queries, task chains.',
    realTenant: 'Side navigation > Monitoring > Data Integration (app name: Data Integration Monitor), select the space.',
  },
  {
    term: 'Consent for scheduling',
    chapter: 3,
    text: 'Scheduled tasks run in the name of the user who scheduled them. That user has to authorize the job scheduling first.',
    realTenant: 'Profile settings > Authorized Consent Settings; the monitor asks if it is missing.',
  },
  {
    term: 'Locked space',
    chapter: 3,
    text: 'A space that uses more disk than assigned is locked: nothing can be written. It needs more storage (or less data) and an Unlock.',
    realTenant: 'Space Management > Unlock on the space.',
  },
  {
    term: 'Data & semantic layer',
    chapter: 5,
    text: 'The middle layer. Its base views (RHN_DS_V_) make data uniform: one code per value, one key per business object, one unit, no duplicates. On top of them, the same layer gives the data its meaning: facts, dimensions, hierarchies, associations, and the data access controls that protect them. The logic lives here once and every consumer builds on it.',
    realTenant: 'Usually its own space; base views read the entry tables through sharing, and facts and dimensions are shared upwards to the presentation layer.',
  },
  {
    term: 'Value mapping',
    chapter: 5,
    text: 'Translates the codes of one source into the codes of the target model, e.g. Nord → NORTH. Small mappings fit in a CASE; larger ones go into a mapping table the business maintains.',
    realTenant: 'SQL view with CASE, or a local table joined in a view.',
  },
  {
    term: 'Key mapping',
    chapter: 5,
    text: 'A table that links the keys of an old or second system to the leading key, e.g. a legacy customer number to the CRM ID. Joined with a LEFT JOIN so rows without an entry stay.',
    realTenant: 'Local table, often maintained by IT or replicated from a master data system.',
  },
  {
    term: 'Deduplication',
    chapter: 5,
    text: 'Keeps one record per real-world object. Needs a tested rule for "same object" and a rule for which record survives, e.g. the oldest.',
    realTenant: 'SQL view with ROW_NUMBER() OVER (PARTITION BY …); Intelligent Lookup for fuzzy matches.',
  },
  {
    term: 'Impact and lineage',
    chapter: 5,
    text: 'Lineage shows where an object gets its data from; impact shows which objects use it. Check both before you change or delete something others build on.',
    realTenant: 'Data Builder editor toolbar > Impact and Lineage Analysis; across spaces in the Catalog.',
  },
  {
    term: 'Semantic usage',
    chapter: 6,
    text: 'Says what an entity means for analytics: Relational Dataset (no special purpose), Fact, Dimension, Text or Hierarchy. It decides which properties the editor offers and how analytic models can use it.',
    realTenant: 'Properties of a table or view in the Data Builder > Semantic Usage.',
  },
  {
    term: 'Fact',
    chapter: 6,
    text: 'An entity with measures: numbers that are aggregated in reports, such as kWh or amounts. It holds keys to its dimensions, not their descriptions. The source of an analytic model.',
    realTenant: 'Semantic usage Fact; measures in the Measures section.',
  },
  {
    term: 'Dimension',
    chapter: 6,
    text: 'Master data that describes facts, such as grid areas, tariffs or customers. It has a key that identifies one row, and attributes.',
    realTenant: 'Semantic usage Dimension; key columns in the Attributes section.',
  },
  {
    term: 'Measure, attribute, key',
    chapter: 6,
    text: 'A measure is aggregated (summed). An attribute is used to group and filter: codes, IDs, dates. A key identifies one row of a dimension.',
    realTenant: 'Column roles in the properties of a fact or dimension.',
  },
  {
    term: 'Association',
    chapter: 6,
    text: 'A semantic link from one entity to another: target plus key mapping. It becomes a join only when a consumer needs the target, e.g. the analytic model offering a dimension.',
    realTenant: 'Associations section of a table or view, or drawn in an Entity-Relationship Model.',
  },
  {
    term: 'Star schema',
    chapter: 6,
    text: 'Facts in the middle, shared dimensions around them, connected by keys. Each dimension exists once and serves every fact.',
    realTenant: 'Facts and dimensions with associations in the data & semantic space, shared with the presentation space; analytic models on top.',
  },
  {
    term: 'Analytic model',
    chapter: 7,
    text: 'The object SAP Analytics Cloud consumes. Built on exactly one fact; its dimensions come from the fact\'s associations. Defines the visible measures, attributes and variables.',
    realTenant: 'Data Builder > New Analytic Model; consumed as a data source in SAP Analytics Cloud stories.',
  },
  {
    term: 'Calculated measure',
    chapter: 7,
    text: 'A formula over other measures of an analytic model, evaluated after aggregation, e.g. gross = net + tax. Defined once, the same in every report.',
    realTenant: 'Analytic model > Measures > Calculated Measure.',
  },
  {
    term: 'Restricted measure',
    chapter: 7,
    text: 'A measure restricted to some values of an attribute, e.g. gross of open and overdue invoices. Unlike a filter it leaves the other measures of the report alone.',
    realTenant: 'Analytic model > Measures > Restricted Measure; a restricted measure variable lets users choose the values.',
  },
  {
    term: 'Count distinct',
    chapter: 7,
    text: 'Counts the different values of an attribute, e.g. customers. Not additive: the rows of a breakdown can add up to more than the total.',
    realTenant: 'Analytic model > Measures > Count Distinct.',
  },
  {
    term: 'Data flow',
    chapter: 12,
    text: 'An ETL process: reads sources, transforms rows with operators (join, projection, aggregation, union, Python script) and writes one target table with mode Append (add), Truncate (replace) or Delete (remove by key). Stored result, as fresh as the last run.',
    realTenant: 'Data Builder > New Data Flow; runs in Monitoring > Data Integration > Flows (Handbuch 6.7.1).',
  },
  {
    term: 'Delta capture',
    chapter: 12,
    text: 'A switch on a local table: from then on every insert, update and delete is recorded in a delta table (suffix _Delta, technical columns Change_Type and Change_Date). Delta loads read these records; a SQL view cannot query the delta table. Needs a key.',
    realTenant: 'Table editor › Delta Capture (Handbuch 6.4.2).',
  },
  {
    term: 'Transformation flow',
    chapter: 12,
    text: 'Loads the result of a view transform (graphical or SQL) into one target table. Initial Only processes all source rows each run; Initial and Delta loads everything once, then only the changes of a source with delta capture, applied to the target by key.',
    realTenant: 'Data Builder > New Transformation Flow; runs in Monitoring > Data Integration > Flows (Handbuch 6.7.3, 6.12.4).',
  },
  {
    term: 'Content Network',
    chapter: 12,
    text: 'Where SAP and partners publish business content and samples: packages with their own space, remote tables, views and models for an industry. Imported through Semantic Onboarding; connections and data are not part of a package.',
    realTenant: 'Semantic Onboarding > Content Network (Handbuch 8.6).',
  },
  {
    term: 'OAuth client',
    chapter: 12,
    text: 'How a tool signs in to the tenant\'s APIs. Purpose Interactive Usage (grant Authorization Code, with the tool\'s redirect URI) acts in the name of a signed-in user, as OData consumption needs; API Access (Client Credentials) acts as a program without a user.',
    realTenant: 'System > Administration > App Integration > Add a New OAuth Client (Handbuch 12.7.3).',
  },
  {
    term: 'OData Consumption API',
    chapter: 12,
    text: 'HTTPS interface through which SAP Analytics Cloud import connections and other tools read exposed views (relational) and analytic models (analytical). Data is copied into the tool, unlike a live connection.',
    realTenant: 'Handbuch 12.7; the service URL is built from space and object name.',
  },
  {
    term: 'Version history',
    chapter: 12,
    text: 'Every deployment of an object is a version: who, when and the definition. An earlier version can be compared and restored; the restored version is deployed again. Works inside one tenant only; other tenants get changes by transport.',
    realTenant: 'Data Builder > open the object > Versions in the toolbar (Handbuch 11.4.9).',
  },
  {
    term: 'Mapping table',
    chapter: 5,
    text: 'A small local table that translates codes (legacy code → target code), joined in a view with LEFT JOIN and COALESCE. Replaces a long CASE; the business can maintain it in the Data Editor without changing SQL.',
    realTenant: 'Data Builder > New Table in the data & semantic space, rows in the Data Editor or uploaded from a CSV file.',
  },
  {
    term: 'Data access control',
    chapter: 8,
    text: 'Row-level security: decides which rows of a view a user sees. Reads a permissions entity (user → allowed values) and is assigned to a view by mapping its criteria to view columns. A user without an entry sees nothing.',
    realTenant: 'Data Builder > New Data Access Control; assigned in the view\'s properties, section Data Access Controls.',
  },
  {
    term: 'Permissions entity',
    chapter: 8,
    text: 'The table or view behind a data access control: one row per user and allowed value, with an identifier column (user ID) and criteria columns.',
    realTenant: 'Often a local table maintained by the business in its own space and shared with the modeling space.',
  },
  {
    term: 'Variable',
    chapter: 7,
    text: 'Asks the consumer for a value when a report opens. A filter variable filters the model by an attribute: single value or interval, optional or mandatory.',
    realTenant: 'Analytic model > click the canvas background > Add Variable. Shown as a prompt in SAP Analytics Cloud.',
  },
  {
    term: 'Expose for Consumption',
    chapter: 12,
    text: 'A switch on a view: only exposed, deployed views can be read by external tools through a database user (ODBC/JDBC) or the OData API. Analytic models are read by SAP Analytics Cloud and the Excel add-in.',
    realTenant: 'Data Builder > open the view > properties > Expose for Consumption, then Deploy.',
  },
  {
    term: 'Database user',
    chapter: 12,
    text: 'A technical user of one space, named SPACE#SUFFIX, for tools such as Power BI. With read access it reads the exposed views of its space; write access lets it create tables in its own Open SQL schema.',
    realTenant: 'Space Management > Edit space > Database Access > Database Users > Create.',
  },
  {
    term: 'Package',
    chapter: 12,
    text: 'Bundles objects for the move to another tenant (development > test > production). Validated, exported to the Content Network for chosen target tenants, imported there.',
    realTenant: 'Transport > Packages; exported in Transport > Export, imported in the target tenant under Transport > Import.',
  },
  {
    term: 'Required package',
    chapter: 12,
    text: 'A package another package depends on, e.g. the facts and dimensions below a presentation model. It must be in the target tenant first, or be imported together.',
    realTenant: 'Package editor > Required Packages.',
  },
  {
    term: 'Catalog asset',
    chapter: 12,
    text: 'The catalog entry of an object: metadata only (names, description, glossary terms, tags), no data. Catalog users find it after it is published; who may read the data is still decided by spaces and data access controls.',
    realTenant: 'Catalog & Marketplace > Search; the asset details page.',
  },
  {
    term: 'Glossary term',
    chapter: 12,
    text: 'A business term with one agreed definition, linked to the assets that implement it. Published separately from the assets.',
    realTenant: 'Catalog & Marketplace > Search > Glossaries.',
  },
  {
    term: 'Business Builder',
    chapter: 12,
    text: 'The older business layer: business entities (dimension or fact) on Data Builder objects, fact models, consumption models with perspectives for SAP Analytics Cloud. SAP has deprecated the Business Builder; use analytic models instead.',
    realTenant: 'Side navigation > Business Builder.',
  },
  {
    term: 'View persistence',
    chapter: 9,
    text: 'A deployed view stores its result as a snapshot. Reads get fast, but the data is only as fresh as the last run, and it costs memory. Not possible for a view that reads data protected by a data access control.',
    realTenant: 'Monitoring > Data Integration > Views > Start Data Persistence, Schedule, Remove Persisted Data.',
  },
  {
    term: 'View Analyzer',
    chapter: 9,
    text: 'Shows a view with everything below it and what each level costs, so you persist where the expensive work happens.',
    realTenant: 'Monitoring > Data Integration > Views > View Analyzer.',
  },
  {
    term: 'Expensive statement tracing',
    chapter: 9,
    text: 'Records SQL statements above a runtime or memory threshold. Off by default; without it the Expensive Statement Logs stay empty.',
    realTenant: 'System > Configuration > Monitoring; the log is under Monitoring > Expensive Statement Logs.',
  },
  {
    term: 'Task chain',
    chapter: 10,
    text: 'Runs several tasks as one unit in a fixed order: replication flows (Initial Only), view persistence, snapshots, other chains. One schedule, an email when it fails; a failed step stops the chain.',
    realTenant: 'Data Builder > New Task Chain; runs in Monitoring > Data Integration > Task Chains.',
  },
  {
    term: 'Task logs',
    chapter: 10,
    text: 'Every run of every space with status, records and duration. The Data Integration Monitor shows one space; the task logs show them all.',
    realTenant: 'Monitoring > Task Logs.',
  },
  {
    term: 'Hierarchy',
    chapter: 12,
    text: 'A view with semantic usage Hierarchy: one row per node with a Child (node) and a Parent column, e.g. company > region > grid area. Associated with a dimension, it offers drill-down; each node stands for everything below it. Node IDs must be unique.',
    realTenant: 'Data Builder > SQL or graphical view > Semantic Usage Hierarchy (or Hierarchy with Directory); association from the dimension.',
  },
  {
    term: 'Hierarchy data access control',
    chapter: 12,
    text: 'A data access control of type Hierarchy: each entry names a node, and the user sees the rows of that node and all its descendants. A new leaf below a granted node is covered without a new entry.',
    realTenant: 'Data Builder > New Data Access Control > Structure Hierarchy, with a hierarchy view.',
  },
];
