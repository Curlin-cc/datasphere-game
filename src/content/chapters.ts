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
  { nr: 0, title: 'Onboarding', summary: 'Find your way around and query the raw data', guidance: 'full' },
  { nr: 1, title: 'Space concept', summary: 'Design spaces per layer with storage and naming rules', guidance: 'full' },
  { nr: 2, title: 'Users and roles', summary: 'Give eight people exactly the access they need', guidance: 'light' },
  { nr: 3, title: 'Data integration', summary: 'Connect sources, choose remote or replicated', guidance: 'light' },
  { nr: 4, title: 'Inbound layer', summary: 'Land data 1:1 and profile its quality', guidance: 'light' },
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
];
