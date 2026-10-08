export interface Chapter {
  nr: number;
  title: string;
  summary: string;
}

/** Learning path, see docs/PLAN.md section 3. */
export const CHAPTERS: Chapter[] = [
  { nr: 0, title: 'Onboarding', summary: 'Find your way around and query the raw data' },
  { nr: 1, title: 'Space concept', summary: 'Design spaces per layer with storage and naming rules' },
  { nr: 2, title: 'Users and roles', summary: 'Give eight people exactly the access they need' },
  { nr: 3, title: 'Data integration', summary: 'Connect sources, choose remote or replicated' },
  { nr: 4, title: 'Inbound layer', summary: 'Land data 1:1 and profile its quality' },
  { nr: 5, title: 'Harmonization', summary: 'Clean duplicates, units and legacy keys in views' },
  { nr: 6, title: 'Semantics', summary: 'Facts, dimensions, texts, hierarchies, associations' },
  { nr: 7, title: 'Analytic model', summary: 'Measures and variables for the CFO' },
  { nr: 8, title: 'Data access controls', summary: 'Regional managers see only their grid area' },
  { nr: 9, title: 'Persistence and performance', summary: 'Decide what to persist and why' },
  { nr: 10, title: 'Operations', summary: 'Task chains, monitoring and failed loads' },
  { nr: 11, title: 'Board request', summary: 'An end-to-end change, no hints' },
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
];
