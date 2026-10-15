/**
 * The apps in the side navigation, modelled on SAP Datasphere's side navigation.
 * Names follow the real product; the order and grouping are close to the real tenant (checked 2026-10-09,
 * verify against your own tenant: SAP adds and moves apps regularly, and you only see apps your roles allow).
 *
 * `interactive` = the chapter from which the app does something in the game. Before that, and for apps the
 * game never builds, the app opens an info page that explains what it is for.
 */

export type AppId =
  | 'home' | 'repository' | 'catalog' | 'semantic' | 'business' | 'builder' | 'monitor' | 'connections'
  | 'spaces' | 'sysmonitor' | 'security' | 'transport' | 'system'
  | 'capacities' | 'tasklogs' | 'statements' | 'ecn' | 'marketplace' | 'translation' | 'sharing';

/**
 * Where an app sits in the side navigation (docs/design/README.md, section 1):
 * top entries, the expandable Monitoring and Catalog & Marketplace entries, the groups Apps and Utilities, and the bottom.
 */
export type NavSection = 'top' | 'monitoring' | 'catalog' | 'apps' | 'utilities' | 'bottom';

export interface AppInfo {
  id: AppId;
  label: string;
  /** SVG path content, 16×16. */
  icon: string;
  section: NavSection;
  /** Label in the side navigation when it differs (e.g. "Data Integration" under Monitoring). */
  navLabel?: string;
  /** One line, shown as tooltip in the navigation. */
  summary: string;
  /** What you do there, shown on the info page and in the app guide. */
  does: string[];
  /** Who typically works there. */
  who: string;
  /** Chapter from which the app is interactive in the game; undefined = info only. */
  interactive?: number;
  /** Chapter in which the game explains the app in depth, if any. */
  chapter?: number;
  /** Extra remark, e.g. that an app is being phased out. */
  note?: string;
}

export const APPS: AppInfo[] = [
  {
    id: 'home', label: 'Home', section: 'top', interactive: 0,
    icon: '<path d="M2.5 7.5L8 3l5.5 4.5V13h-3.5V9.5h-4V13H2.5z"/>',
    summary: 'Start page: recent objects, news and quick links.',
    does: ['Shows what you worked on recently', 'Links to the apps you use most', 'Shows news and system messages from the administrator'],
    who: 'Everyone',
  },
  {
    id: 'repository', label: 'Repository Explorer', section: 'top', interactive: 0,
    icon: '<circle cx="7" cy="7" r="4"/><path d="M10 10l3.5 3.5"/>',
    summary: 'Search every object in all spaces you are a member of.',
    does: ['Searches tables, views, flows and models across all your spaces at once', 'Filters by type, space and status', 'Opens an object in its editor'],
    who: 'Modelers, integrators, anyone looking for data',
  },
  {
    id: 'catalog', label: 'Catalog & Marketplace', section: 'catalog', navLabel: 'Search', interactive: 12, chapter: 12,
    icon: '<path d="M3 3.5h4.5v9H3zM8.5 3.5H13v9H8.5z"/>',
    summary: 'Find, describe and govern data assets; get data products.',
    does: ['Catalog: business descriptions, glossary terms, tags and KPIs for data assets, also from other systems', 'Shows lineage: where data comes from and where it is used', 'Marketplace: install data products from SAP and partners'],
    who: 'Data stewards, analysts, catalog administrators',
  },
  {
    id: 'semantic', label: 'Semantic Onboarding', section: 'apps', chapter: 3, interactive: 3,
    icon: '<path d="M8 2.5v7M5 6.5l3 3 3-3M3 12.5h10"/>',
    summary: 'Import objects with their semantics from SAP systems.',
    does: ['Imports entities from S/4HANA, BW/4HANA or SAP BW bridge with labels, associations and hierarchies', 'Installs SAP business content packages', 'Saves rebuilding semantics by hand'],
    who: 'Modelers, integrators',
  },
  {
    id: 'business', label: 'Business Builder', section: 'apps', interactive: 12, chapter: 12,
    icon: '<rect x="2.5" y="3" width="11" height="10" rx="1"/><path d="M5 6.5h6M5 9.5h4"/>',
    summary: 'The older business layer, labeled Deprecated in current tenants. New models are analytic models.',
    does: ['Business entities (dimension or fact) on top of Data Builder objects', 'Fact models and consumption models with perspectives for SAP Analytics Cloud', 'Authorization scenarios based on data access controls'],
    who: 'Existing projects; new work goes into analytic models',
    note: 'Current tenants title it "Welcome to the Business Builder (Deprecated)". Build new models as analytic models in the Data Builder; you meet the Business Builder in existing projects.',
  },
  {
    id: 'builder', label: 'Data Builder', section: 'apps', interactive: 0, chapter: 0,
    icon: '<rect x="2.5" y="2.5" width="4.5" height="4.5"/><rect x="9" y="2.5" width="4.5" height="4.5"/><rect x="2.5" y="9" width="4.5" height="4.5"/><path d="M9 11.25h4.5M11.25 9v4.5"/>',
    summary: 'Build tables, views, analytic models, flows and task chains, always inside one space.',
    does: ['Tables, graphical and SQL views, E/R models, analytic models', 'Replication flows, data flows, transformation flows, task chains', 'Data access controls for row-level security', 'Save, deploy and share objects'],
    who: 'Modelers and integrators',
  },
  {
    id: 'monitor', label: 'Data Integration Monitor', section: 'monitoring', navLabel: 'Data Integration', interactive: 3, chapter: 3,
    icon: '<path d="M2 12l3-4 3 2 3-5 3 3"/>',
    summary: 'Monitoring > Data Integration: run, schedule and watch everything that moves data.',
    does: ['Remote tables: switch between remote access and snapshot replication, load snapshots, schedule them', 'Views: persist a view as a snapshot, remove it, schedule it, and find the expensive layer with the View Analyzer', 'Flows and task chains: run, schedule, read the messages of each run', 'Remote queries: what this space asked the source systems', 'Find out why last night\'s load failed'],
    who: 'Integrators, operations',
  },
  {
    id: 'connections', label: 'Connections', section: 'apps', interactive: 3, chapter: 3,
    icon: '<path d="M6.5 9.5l3-3M5 11a2.1 2.1 0 01-3-3l2-2a2.1 2.1 0 013 0M11 5a2.1 2.1 0 013 3l-2 2a2.1 2.1 0 01-3 0"/>',
    summary: 'Connect source systems to a space.',
    does: ['Creates connections from a connection type: S/4HANA, HANA, ABAP, databases, cloud storage and more', 'Each connection belongs to exactly one space; only its members use it', 'Validate shows which features the connection supports: remote tables, data flows, replication flows, model import'],
    who: 'Integrators, space administrators',
  },
  {
    id: 'spaces', label: 'Space Management', section: 'utilities', interactive: 0, chapter: 1,
    icon: '<rect x="2.5" y="2.5" width="11" height="11" rx="1.5"/><path d="M2.5 7h11M7 7v6.5"/>',
    summary: 'Create spaces, assign storage, priority and members.',
    does: ['Creates and deletes spaces', 'Assigns disk and in-memory storage and the workload priority', 'Manages the members of a space', 'Database access for external tools (Open SQL schemas)'],
    who: 'Administrators, space administrators',
  },
  {
    id: 'sysmonitor', label: 'System and Spaces', section: 'monitoring', navLabel: 'System and Spaces', interactive: 9, chapter: 9,
    icon: '<rect x="2.5" y="3" width="11" height="8" rx="1"/><path d="M6 13.5h4M5 8l2-2 2 1.5 2-2.5"/>',
    summary: 'Tenant health: storage, memory, expensive statements, task logs.',
    does: ['Shows disk and memory use per space', 'Lists expensive statements and failed tasks', 'Monitors elastic compute nodes'],
    who: 'Administrators, operations',
  },
  {
    id: 'security', label: 'Security', section: 'bottom', interactive: 2, chapter: 2,
    icon: '<path d="M8 2l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V4z"/>',
    summary: 'Users, roles and who may do what.',
    does: ['Users: create users and assign roles', 'Roles: global and scoped roles', 'Authorization Overview: who can do what where', 'Activities: audit log of changes'],
    who: 'Administrators',
  },
  {
    id: 'transport', label: 'Transport', section: 'utilities', interactive: 12, chapter: 12,
    icon: '<path d="M2.5 5.5h9l-2.5-2.5M13.5 10.5h-9l2.5 2.5"/>',
    summary: 'Move content between tenants: development, test, production.',
    does: ['Packages: bundle the objects of a space, with required packages for what they need from other spaces', 'Export: share a valid package with target tenants through the Content Network', 'Import: bring a package into this tenant, optionally overwriting objects, data and schedules', 'Monitor: every export and import job with its messages'],
    who: 'Administrators, lead modelers',
  },
  {
    id: 'system', label: 'System', section: 'bottom', interactive: 3, chapter: 3,
    icon: '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.8v2M8 12.2v2M1.8 8h2M12.2 8h2M3.6 3.6L5 5M11 11l1.4 1.4M3.6 12.4L5 11M11 5l1.4-1.4"/>',
    summary: 'Tenant configuration, administration and version.',
    does: ['Configuration: tenant capacity, workload management, audit, task log retention', 'Configuration › Security: trusted certificates for TLS connections', 'Configuration › Data Integration: Cloud Connectors and Data Provisioning Agents', 'IP allowlist, OAuth clients, About: version and URL'],
    who: 'Administrators',
  },
  // ---- apps that complete the real navigation (docs/design/README.md, section 1); interactive since 2026-10-12 (src/views/sysmon.ts, exchange.ts)
  {
    id: 'capacities', label: 'Capacities', section: 'monitoring', interactive: 9, chapter: 9,
    icon: '<path d="M3 13V8M6.5 13V5M10 13V9.5M13.5 13V3"/>',
    summary: 'Consumption of capacity units over time: compute, memory, disk.',
    does: ['Shows total capacity unit (CU) consumption per month', 'Splits it into memory and compute, disk storage and other blocks', 'Daily and cumulative consumption charts'],
    who: 'Administrators, cost owners',
  },
  {
    id: 'tasklogs', label: 'Task Logs', section: 'monitoring', interactive: 10, chapter: 10,
    icon: '<path d="M3 4h10M3 8h10M3 12h6"/>',
    summary: 'Every task run of the tenant: flows, task chains, persistence, with status and duration.',
    does: ['Lists runs across all spaces: start time, object, type, activity, status, records, duration', 'Filters by date range, space, status and storage type', 'Cancel a running task'],
    who: 'Administrators, operations',
  },
  {
    id: 'statements', label: 'Expensive Statement Logs', section: 'monitoring', interactive: 9, chapter: 9,
    icon: '<circle cx="8" cy="8" r="5.5"/><path d="M8 5v3l2 1.5"/>',
    summary: 'Statements that used a lot of time or memory.',
    does: ['Lists SQL statements above the tracing threshold with duration, peak memory and CPU time', 'Only filled while expensive statement tracing is on (System › Configuration › Monitoring)', 'Helps find the models and views worth persisting or rewriting'],
    who: 'Administrators, lead modelers',
  },
  {
    id: 'ecn', label: 'Elastic Compute Nodes', section: 'monitoring', interactive: 9, chapter: 9,
    icon: '<rect x="2.5" y="3" width="11" height="4" rx="1"/><rect x="2.5" y="9" width="11" height="4" rx="1"/>',
    summary: 'Extra compute for peak loads, run for a limited number of block-hours.',
    does: ['Starts and stops elastic compute nodes', 'Shows remaining block-hours and usage logs'],
    who: 'Administrators',
  },
  {
    id: 'marketplace', interactive: 12, chapter: 12, label: 'Marketplace Data Products', section: 'catalog',
    icon: '<path d="M3 5h10l-1 8H4zM5.5 5a2.5 2.5 0 015 0"/>',
    summary: 'Data products from SAP and partners, ready to install into a space.',
    does: ['Browse and install data products', 'Manage licenses and updates of installed products'],
    who: 'Data stewards, modelers',
  },
  {
    id: 'translation', interactive: 12, chapter: 12, label: 'Translation', section: 'utilities',
    icon: '<path d="M2.5 4h6M5.5 3v1c0 3-1.5 5-3 6M4 7c1 1.5 2.5 2.5 4 3M9 13l2.5-6 2.5 6M9.8 11h3.4"/>',
    summary: 'Translate business names and descriptions of objects.',
    does: ['Exports texts of analytic models and views for translation', 'Imports translated texts, shown in the user\'s language in SAP Analytics Cloud'],
    who: 'Modelers, translators',
  },
  {
    id: 'sharing', interactive: 12, chapter: 12, label: 'Data Sharing Cockpit', section: 'utilities',
    icon: '<circle cx="4" cy="8" r="1.8"/><circle cx="12" cy="4" r="1.8"/><circle cx="12" cy="12" r="1.8"/><path d="M5.6 7.1l4.8-2.3M5.6 8.9l4.8 2.3"/>',
    summary: 'Offer your own data products to others as a data provider.',
    does: ['Create a data provider profile', 'Publish data products and manage licenses and contracts'],
    who: 'Data providers',
  },
];

export const appById = (id: string) => APPS.find((a) => a.id === id);

/** Object types offered on the Data Builder start page (tile strip, docs/design/README.md B.3), with what they are for. */
export interface NewTile {
  id: string;
  label: string;
  /** Word on the tile, default "New". */
  verb?: string;
  /** Import entries are not tiles: they sit in the Import menu of the object list toolbar (Bild 19). */
  importTile?: boolean;
  /** Text in the Import menu, e.g. "Import CSV File". */
  menuLabel?: string;
  /** 32×32 line icon, drawn large and grey on the tile. */
  icon: string;
  text: string;
  /** Chapter from which the tile works; undefined = never in this game. */
  chapter?: number;
}

export const NEW_TILES: NewTile[] = [
  { id: 'table', label: 'Table', chapter: 5, text: 'A local table: data stored in the space, filled by upload, replication or a flow.',
    icon: '<rect x="4" y="5" width="24" height="22" rx="2.5"/><path d="M4 12h24M4 19.5h24M12 12v15M20 12v15"/>' },
  { id: 'graphical', label: 'Graphical View', text: 'A view built by dragging sources, joins and filters onto a canvas. This game uses SQL views instead.',
    icon: '<rect x="4" y="4" width="16" height="15" rx="2.5"/><path d="M4 9.5h16M9.5 9.5V19"/><rect x="15" y="15" width="13" height="13" rx="3"/><path d="M18.5 21.5h6M21.5 18.5v6"/>' },
  { id: 'sqlview', label: 'SQL View', chapter: 0, text: 'A view defined in SQL or SQLScript. Reads tables and views of the space and objects shared with it.',
    icon: '<ellipse cx="16" cy="7" rx="7" ry="3"/><path d="M9 7v6c0 1.7 3.1 3 7 3s7-1.3 7-3V7"/><path d="M8.5 27c.6.6 1.4 1 2.4 1 1.5 0 2.5-.8 2.5-2s-1-1.7-2.4-2.1-2.3-.9-2.3-2 .9-1.9 2.2-1.9c.9 0 1.6.3 2.1.9M19.5 19a3.3 4.5 0 110 9 3.3 4.5 0 010-9zM21 26.5l1.5 2M25.5 19v9h3.5"/>' },
  { id: 'er', label: 'Entity - Relationship Model', text: 'Draws tables, views and their associations as an entity-relationship diagram.',
    icon: '<rect x="4" y="4" width="8" height="8" rx="1.5"/><rect x="20" y="4" width="8" height="8" rx="1.5"/><rect x="4" y="20" width="8" height="8" rx="1.5"/><rect x="20" y="20" width="8" height="8" rx="1.5"/><path d="M12 8h8M8 12v8M24 12v8M12 24h8M13 13l6 6"/>' },
  { id: 'analytic', label: 'Analytic Model', chapter: 7, text: 'The model SAP Analytics Cloud consumes: measures, dimensions, variables, built on a fact.',
    icon: '<path d="M16 3l11 6.3v13.4L16 29 5 22.7V9.3z"/><path d="M5 9.3l11 6.4 11-6.4M16 15.7V29"/><path d="M10.5 6.2l11 6.3"/>' },
  { id: 'dataflow', label: 'Data Flow', chapter: 12, text: 'An ETL process on a canvas: sources, operators such as join, union, projection, aggregation and Python script, and a target table with mode Append, Truncate or Delete. You build one in the excursions.',
    icon: '<rect x="4" y="9" width="17" height="15" rx="2.5"/><path d="M8 18l3-3 3 3 3-3"/><circle cx="23" cy="10" r="6"/><path d="M23 7v3l2 1.5"/>' },
  { id: 'replication', label: 'Replication Flow', chapter: 3, text: 'Copies objects from a source connection into local tables: once (Initial Only) or once and then by delta (Initial and Delta). Filters and extra columns, no complex logic.',
    icon: '<rect x="4" y="5" width="24" height="5" rx="2"/><rect x="4" y="13.5" width="24" height="5" rx="2"/><rect x="4" y="22" width="24" height="5" rx="2"/><path d="M10 10v3.5M22 18.5V22"/>' },
  { id: 'transformation', label: 'Transformation Flow', chapter: 12, text: 'Loads the result of a view transform into a table: in full, or after the first load only the changes of a source with Delta Capture. You build one in the excursions.',
    icon: '<path d="M10 28V18l6-6 6 6v10M4 22h6M22 22h6"/><path d="M16 4v8M13 7l3-3 3 3"/>' },
  { id: 'lookup', label: 'Intelligent Lookup', text: 'Matches records of two entities by fuzzy rules, e.g. customer names with typos, and lets you confirm the matches.',
    icon: '<rect x="4" y="4" width="10" height="10" rx="2"/><rect x="4" y="18" width="10" height="10" rx="2"/><path d="M14 9h4v14h-4M18 16h3"/><path d="M22 16l2.5 2.5L29 13"/>' },
  { id: 'taskchain', label: 'Task Chain', chapter: 10, text: 'Runs several loads in a fixed order, e.g. every night.',
    icon: '<rect x="4" y="5" width="9" height="9" rx="2"/><path d="M6.5 9.5l1.7 1.7 3-3.2"/><rect x="4" y="19" width="9" height="9" rx="2"/><circle cx="24" cy="9.5" r="4.5"/><circle cx="24" cy="23.5" r="4.5"/><path d="M13 9.5h6.5M13 23.5h6.5M8.5 14v5"/>' },
  { id: 'dac', label: 'Data Access Control', chapter: 8, text: 'Row-level security: decides which users see which rows of a view.',
    icon: '<path d="M8 4h11l6 6v6M8 4v24h8"/><path d="M19 4v6h6"/><rect x="17.5" y="21" width="10" height="7" rx="1.5"/><path d="M20 21v-2.5a2.5 2.5 0 015 0V21"/>' },
  { id: 'csv', label: 'CSV File', verb: 'Import', importTile: true, menuLabel: 'Import CSV File', text: 'Uploads a CSV file into a new local table, with delimiter and column types detected. Good for one-off files; recurring files come in through a flow.',
    icon: '<path d="M8 4h11l6 6v18H8z"/><path d="M19 4v6h6M12 17h9M12 21h9M12 25h6"/>' },
  { id: 'csn', label: 'Objects from CSN/JSON File', verb: 'Import', importTile: true, menuLabel: 'Import Objects from CSN/JSON File', text: 'Creates objects from a CSN/JSON definition file, for example one exported from another tenant or written by a tool. Definitions only, no data.',
    icon: '<path d="M8 4h11l6 6v18H8z"/><path d="M19 4v6h6M16 14v9M12.5 19.5L16 23l3.5-3.5"/>' },
  { id: 'entities', label: 'Entities', verb: 'Import', importTile: true, menuLabel: 'Import Entities', chapter: 3, text: 'Imports entities with their semantics from an SAP source system (for example CDS views of S/4HANA): tables plus views with semantic usage, and their texts. Opens the same wizard as Semantic Onboarding, for the connections of this space.',
    icon: '<path d="M8 4h11l6 6v18H8z"/><path d="M19 4v6h6M16 14v9M12.5 19.5L16 23l3.5-3.5"/>' },
  { id: 'remote', label: 'Remote Tables', verb: 'Import', importTile: true, menuLabel: 'Import Remote Tables', chapter: 3, text: 'Makes objects of a connection available in the space without copying them. Data access is remote (live) or a replicated snapshot.',
    icon: '<rect x="4" y="5" width="24" height="22" rx="2.5"/><path d="M4 12h24M16 15.5v8M12.5 20l3.5 3.5 3.5-3.5"/>' },
  { id: 'validate', label: 'Remote Tables', verb: 'Validate', importTile: true, menuLabel: 'Validate Remote Tables', text: 'Compares remote tables with their source: whether columns were added, removed or changed since the import. Run it after a source system upgrade.',
    icon: '<path d="M8 4h11l6 6v18H8z"/><path d="M19 4v6h6M16 14v9M12.5 19.5L16 23l3.5-3.5"/>' },
  { id: 'permissions', label: 'Permissions', verb: 'Import', importTile: true, menuLabel: 'Import Permissions', text: 'Imports analysis authorizations from SAP BW or SAP BW/4HANA as permissions tables and data access controls, instead of maintaining them twice.',
    icon: '<path d="M8 4h11l6 6v18H8z"/><path d="M19 4v6h6M16 14v9M12.5 19.5L16 23l3.5-3.5"/>' },
];

/** Order of the side navigation, as in the real tenant (docs/design/README.md, section 1). */
export const NAV_ORDER: Record<NavSection, AppId[]> = {
  top: ['home', 'repository'],
  monitoring: ['sysmonitor', 'capacities', 'tasklogs', 'statements', 'ecn', 'monitor'],
  catalog: ['catalog', 'marketplace'],
  apps: ['semantic', 'business', 'builder', 'connections'],
  utilities: ['spaces', 'translation', 'transport', 'sharing'],
  bottom: ['security', 'system'],
};
