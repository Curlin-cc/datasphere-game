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
  | 'spaces' | 'sysmonitor' | 'security' | 'transport' | 'system';

export interface AppInfo {
  id: AppId;
  label: string;
  /** SVG path content, 16×16. */
  icon: string;
  group: 'top' | 'bottom';
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
    id: 'home', label: 'Home', group: 'top', interactive: 0,
    icon: '<path d="M2.5 7.5L8 3l5.5 4.5V13h-3.5V9.5h-4V13H2.5z"/>',
    summary: 'Start page: recent objects, news and quick links.',
    does: ['Shows what you worked on recently', 'Links to the apps you use most', 'Shows news and system messages from the administrator'],
    who: 'Everyone',
  },
  {
    id: 'repository', label: 'Repository Explorer', group: 'top', interactive: 0,
    icon: '<circle cx="7" cy="7" r="4"/><path d="M10 10l3.5 3.5"/>',
    summary: 'Search every object in all spaces you are a member of.',
    does: ['Searches tables, views, flows and models across all your spaces at once', 'Filters by type, space and status', 'Opens an object in its editor'],
    who: 'Modelers, integrators, anyone looking for data',
  },
  {
    id: 'catalog', label: 'Catalog & Marketplace', group: 'top', chapter: 11,
    icon: '<path d="M3 3.5h4.5v9H3zM8.5 3.5H13v9H8.5z"/>',
    summary: 'Find, describe and govern data assets; get data products.',
    does: ['Catalog: business descriptions, glossary terms, tags and KPIs for data assets, also from other systems', 'Shows lineage: where data comes from and where it is used', 'Marketplace: install data products from SAP and partners'],
    who: 'Data stewards, analysts, catalog administrators',
  },
  {
    id: 'semantic', label: 'Semantic Onboarding', group: 'top', chapter: 3,
    icon: '<path d="M8 2.5v7M5 6.5l3 3 3-3M3 12.5h10"/>',
    summary: 'Import objects with their semantics from SAP systems.',
    does: ['Imports entities from S/4HANA, BW/4HANA or SAP BW bridge with labels, associations and hierarchies', 'Installs SAP business content packages', 'Saves rebuilding semantics by hand'],
    who: 'Modelers, integrators',
  },
  {
    id: 'business', label: 'Business Builder', group: 'top',
    icon: '<rect x="2.5" y="3" width="11" height="10" rx="1"/><path d="M5 6.5h6M5 9.5h4"/>',
    summary: 'Former business layer. Replaced by the Analytic Model.',
    does: ['Business entities, fact models and consumption models on top of Data Builder objects', 'Perspectives for SAP Analytics Cloud'],
    who: 'Only in older tenants',
    note: 'SAP recommends the Analytic Model in the Data Builder for new work. You meet the Business Builder in existing projects, not in new ones.',
  },
  {
    id: 'builder', label: 'Data Builder', group: 'top', interactive: 0, chapter: 0,
    icon: '<rect x="2.5" y="2.5" width="4.5" height="4.5"/><rect x="9" y="2.5" width="4.5" height="4.5"/><rect x="2.5" y="9" width="4.5" height="4.5"/><path d="M9 11.25h4.5M11.25 9v4.5"/>',
    summary: 'Build tables, views, analytic models, flows and task chains, always inside one space.',
    does: ['Tables, graphical and SQL views, E/R models, analytic models', 'Replication flows, data flows, transformation flows, task chains', 'Data access controls for row-level security', 'Save, deploy and share objects'],
    who: 'Modelers and integrators',
  },
  {
    id: 'monitor', label: 'Data Integration Monitor', group: 'top', chapter: 3,
    icon: '<path d="M2 12l3-4 3 2 3-5 3 3"/>',
    summary: 'Run, schedule and watch everything that moves data.',
    does: ['Remote tables: switch between remote access and replication', 'Persisted views, flows and task chains: run, schedule, read logs', 'Find out why last night\'s load failed'],
    who: 'Integrators, operations',
  },
  {
    id: 'connections', label: 'Connections', group: 'top', chapter: 3,
    icon: '<path d="M6.5 9.5l3-3M5 11a2.1 2.1 0 01-3-3l2-2a2.1 2.1 0 013 0M11 5a2.1 2.1 0 013 3l-2 2a2.1 2.1 0 01-3 0"/>',
    summary: 'Connect source systems to a space.',
    does: ['Creates connections to S/4HANA, BW, databases, cloud storage and more', 'Each connection belongs to one space', 'Validates that the source can be reached'],
    who: 'Integrators, space administrators',
  },
  {
    id: 'spaces', label: 'Space Management', group: 'bottom', interactive: 0, chapter: 1,
    icon: '<rect x="2.5" y="2.5" width="11" height="11" rx="1.5"/><path d="M2.5 7h11M7 7v6.5"/>',
    summary: 'Create spaces, assign storage, priority and members.',
    does: ['Creates and deletes spaces', 'Assigns disk and in-memory storage and the workload priority', 'Manages the members of a space', 'Database access for external tools (Open SQL schemas)'],
    who: 'Administrators, space administrators',
  },
  {
    id: 'sysmonitor', label: 'System Monitor', group: 'bottom', chapter: 9,
    icon: '<rect x="2.5" y="3" width="11" height="8" rx="1"/><path d="M6 13.5h4M5 8l2-2 2 1.5 2-2.5"/>',
    summary: 'Tenant health: storage, memory, expensive statements, task logs.',
    does: ['Shows disk and memory use per space', 'Lists expensive statements and failed tasks', 'Monitors elastic compute nodes'],
    who: 'Administrators, operations',
  },
  {
    id: 'security', label: 'Security', group: 'bottom', interactive: 2, chapter: 2,
    icon: '<path d="M8 2l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V4z"/>',
    summary: 'Users, roles and who may do what.',
    does: ['Users: create users and assign roles', 'Roles: global and scoped roles', 'Authorization Overview: who can do what where', 'Activities: audit log of changes'],
    who: 'Administrators',
  },
  {
    id: 'transport', label: 'Transport', group: 'bottom', chapter: 10,
    icon: '<path d="M2.5 5.5h9l-2.5-2.5M13.5 10.5h-9l2.5 2.5"/>',
    summary: 'Move content between tenants: development, test, production.',
    does: ['Exports packages of objects', 'Imports them into another tenant', 'Keeps dependencies together'],
    who: 'Administrators, lead modelers',
  },
  {
    id: 'system', label: 'System', group: 'bottom',
    icon: '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.8v2M8 12.2v2M1.8 8h2M12.2 8h2M3.6 3.6L5 5M11 11l1.4 1.4M3.6 12.4L5 11M11 5l1.4-1.4"/>',
    summary: 'Tenant configuration, administration and version.',
    does: ['Configuration: tenant settings, IP allowlists, workload settings', 'Administration: system information and maintenance', 'About: tenant version and URL'],
    who: 'Administrators',
  },
];

export const appById = (id: string) => APPS.find((a) => a.id === id);

/** Object types offered on the Data Builder start page, with what they are for. */
export interface NewTile {
  id: string;
  label: string;
  group: 'Model' | 'Integrate' | 'Secure';
  text: string;
  /** Chapter from which the tile works; undefined = never in this game. */
  chapter?: number;
}

export const NEW_TILES: NewTile[] = [
  { id: 'table', label: 'Table', group: 'Model', chapter: 3, text: 'A local table: data stored in the space, filled by upload, replication or a flow.' },
  { id: 'graphical', label: 'Graphical View', group: 'Model', text: 'A view built by dragging sources, joins and filters onto a canvas. This game uses SQL views instead.' },
  { id: 'sqlview', label: 'SQL View', group: 'Model', chapter: 0, text: 'A view defined in SQL or SQLScript. Reads tables and views of the space and objects shared with it.' },
  { id: 'er', label: 'E/R Model', group: 'Model', text: 'Draws tables, views and their associations as an entity-relationship diagram.' },
  { id: 'analytic', label: 'Analytic Model', group: 'Model', chapter: 7, text: 'The model SAP Analytics Cloud consumes: measures, dimensions, variables, built on a fact.' },
  { id: 'replication', label: 'Replication Flow', group: 'Integrate', chapter: 3, text: 'Copies tables from a source system into local tables, initially and then by delta.' },
  { id: 'dataflow', label: 'Data Flow', group: 'Integrate', chapter: 3, text: 'Moves and transforms data between sources and targets, with joins, filters and scripts.' },
  { id: 'transformation', label: 'Transformation Flow', group: 'Integrate', chapter: 10, text: 'Loads the result of a view into a table, fully or by delta.' },
  { id: 'taskchain', label: 'Task Chain', group: 'Integrate', chapter: 10, text: 'Runs several loads in a fixed order, e.g. every night.' },
  { id: 'csv', label: 'Import CSV File', group: 'Integrate', chapter: 3, text: 'Uploads a CSV file into a new or existing local table.' },
  { id: 'dac', label: 'Data Access Control', group: 'Secure', chapter: 8, text: 'Row-level security: decides which users see which rows of a view.' },
];
