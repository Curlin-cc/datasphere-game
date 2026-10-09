import type { Mission, RuleContext } from '../../missions/types';
import { isShared } from '../../tenant';
import { findObject, readsFrom, type ColumnRole, type RepoObject, type SemanticUsage } from '../../repo';

/**
 * Chapter 6, Semantics. The reporting layer RHN_REP gets dimensions and facts on top of the shared harmonized views:
 * semantic usage, key / attribute / measure per column, associations from facts to dimensions.
 * Handbuch 6.4.1 (column roles), 6.5.3 (semantic usage), 6.5.4 (associations), 6.10.4 (dimensions come from associations).
 *
 * Semantic checks read what is deployed (o.deployed), like the data checks. Simplified in the game: cardinality is always
 * many to one; hierarchies can be typed but are not part of a mission yet (see docs/DECISIONS.md).
 * Numbers from generator v1, checked with DuckDB on 2026-10-09.
 */

const CALIN = { name: 'Calin Mucea', role: 'Senior Data Architect, your mentor', initials: 'CM' };
const CFO = { name: 'Petra Lindner', role: 'CFO, Stadtwerke Rheinau', initials: 'PL' };
const AUDIT = { name: 'Sabine Wolf', role: 'Internal Auditor', initials: 'SW' };

const D_GRID = 'RHN_REP.RHN_REP_D_GRID_AREA';
const D_TARIFF = 'RHN_REP.RHN_REP_D_TARIFF';
const D_CUSTOMER = 'RHN_REP.RHN_REP_D_CUSTOMER';
const F_CONS = 'RHN_REP.RHN_REP_F_CONSUMPTION';
const F_INV = 'RHN_REP.RHN_REP_F_INVOICES';

// ---------------------------------------------------------------- reference logic (never shown)

const REF_CONTRACTS = `SELECT c.CONTRACT_ID, COALESCE(m.CUSTOMER_ID, c.CUSTOMER_ID) AS CUSTOMER_ID,
  CASE c.GRID_AREA WHEN 'Nord' THEN 'NORTH' WHEN 'Ost' THEN 'EAST' WHEN 'Süd' THEN 'SOUTH' WHEN 'West' THEN 'WEST' ELSE c.GRID_AREA END AS GRID_AREA,
  CASE c.TARIFF WHEN 'STROM_BASIS' THEN 'POWER_BASIC' WHEN 'STROM_OEKO' THEN 'POWER_GREEN' WHEN 'STROM_WAERME' THEN 'POWER_HEAT'
    WHEN 'GAS_KOMFORT' THEN 'GAS_COMFORT' ELSE c.TARIFF END AS TARIFF
  FROM RHN_IN.BILLING_CONTRACTS c LEFT JOIN RHN_IN.LEGACY_CUSTOMER_MAP m ON c.CUSTOMER_ID = m.LEGACY_CUSTOMER_ID`;
const REF_READINGS = `SELECT DISTINCT METER_ID, CONTRACT_ID, READING_DATE,
  CASE WHEN UNIT = 'MWh' THEN VALUE * 1000 ELSE VALUE END AS CONSUMPTION_KWH FROM RHN_IN.METER_READINGS`;
const REF_CUSTOMERS = `SELECT CUSTOMER_ID, trim(NAME) AS NAME, ZIP, CITY FROM (
  SELECT k.*, ROW_NUMBER() OVER (PARTITION BY lower(EMAIL), STREET, ZIP ORDER BY CREATED_AT) AS RN FROM RHN_IN.CRM_CUSTOMERS k) x WHERE RN = 1`;
const REF_F_CONS = `SELECT r.CONTRACT_ID, c.CUSTOMER_ID, c.GRID_AREA, c.TARIFF, r.READING_DATE, r.CONSUMPTION_KWH
  FROM (${REF_READINGS}) r JOIN (${REF_CONTRACTS}) c ON r.CONTRACT_ID = c.CONTRACT_ID`;
const REF_F_INV = `SELECT i.INVOICE_ID, i.CONTRACT_ID, c.CUSTOMER_ID, c.GRID_AREA, c.TARIFF, i.INVOICE_DATE, i.DUE_DATE, i.STATUS,
  i.NET_AMOUNT, i.TAX_AMOUNT FROM RHN_IN.BILLING_INVOICES i JOIN (${REF_CONTRACTS}) c ON i.CONTRACT_ID = c.CONTRACT_ID`;

const project = (cols: string[], sql: string) => `SELECT ${cols.join(', ')} FROM (${sql}) ref`;

// ---------------------------------------------------------------- semantic rule helpers

type Found = { o: RepoObject; problem: null } | { o: null; problem: string };

/** The deployed object, or why it cannot be checked yet. */
function deployedObject({ tenant }: RuleContext, key: string): Found {
  const [space, name] = key.split('.');
  const o = findObject(tenant, key);
  if (!o) {
    const elsewhere = tenant.objects.find((x) => x.name === name);
    return { o: null, problem: elsewhere ? `${name} is in ${elsewhere.space}; it belongs in ${space}.` : `There is no ${name} in ${space} yet.` };
  }
  if (!o.deployed) return { o: null, problem: `${name} is saved, but not deployed.` };
  if (o.status === 'changes') return { o: null, problem: `${name} has saved changes that are not deployed yet. Deploy them.` };
  return { o, problem: null };
}

const rolesWith = (o: RepoObject, role: ColumnRole) =>
  Object.entries(o.deployed?.columnRoles ?? {}).filter(([, r]) => r === role).map(([c]) => c.toUpperCase()).sort();

const list = (cols: string[]) => (cols.length ? cols.join(', ') : 'none');

/** Semantic usage plus the exact set of columns with one role (keys of a dimension, measures of a fact). */
function typed(key: string, usage: SemanticUsage, role: ColumnRole, expected: string[]) {
  return (ctx: RuleContext): string | null => {
    const f = deployedObject(ctx, key);
    if (!f.o) return f.problem;
    const name = key.split('.')[1];
    const u = f.o.deployed!.semanticUsage ?? 'Relational Dataset';
    if (u !== usage) return `${name} is deployed as ${u}. Set its Semantic Usage to ${usage}, save and deploy.`;
    const have = rolesWith(f.o, role);
    const want = [...expected].sort();
    if (have.join() === want.join()) return null;
    const plural = role === 'Key' ? 'keys' : 'measures';
    return `${name} has these ${plural}: ${list(have)}. It needs exactly ${list(want)}.${
      role === 'Measure' && have.some((c) => !want.includes(c))
        ? ' A measure is a number you aggregate. IDs, codes and dates are attributes: summing them means nothing.'
        : role === 'Key' && !have.length ? ' Mark the column that identifies one row as Key in the properties.' : ''}`;
  };
}

/** An association from `key` to `target` that maps `from` to the target's key column(s). */
function associated(key: string, target: string, mapping: Record<string, string>) {
  return (ctx: RuleContext): string | null => {
    const f = deployedObject(ctx, key);
    if (!f.o) return f.problem;
    const name = key.split('.')[1];
    const tname = target.split('.')[1];
    const a = (f.o.deployed!.associations ?? []).find((x) => x.target === target);
    if (!a) return `${name} has no association to ${tname} yet. Add it in the properties (Associations), save and deploy.`;
    const wrong = Object.entries(mapping).filter(([from, to]) => !a.mapping.some((m) => m.from.toUpperCase() === from && m.to.toUpperCase() === to));
    return wrong.length
      ? `The association ${name} → ${tname} maps the wrong columns. ${wrong.map(([from, to]) => `${from} must point to ${to}`).join('; ')}.`
      : null;
  };
}

/** A reporting object reads only the harmonization layer. */
function readsHarmonization(key: string) {
  return ({ tenant }: RuleContext): string | null => {
    const o = findObject(tenant, key);
    if (!o) return `There is no ${key.split('.')[1]} yet.`;
    const bad = readsFrom(o, tenant).filter((k) => !k.startsWith('RHN_HARM.'));
    return bad.length ? `${o.name} reads ${bad.join(', ')}. Reporting objects read only shared harmonization views.` : null;
  };
}

const shared = (objects: string[], to: string, owner: string) => ({ tenant }: RuleContext) => {
  const missing = objects.filter((o) => !isShared(tenant, `${owner}.${o}`, to));
  return missing.length ? `Not shared with ${to} yet: ${missing.join(', ')}.` : null;
};

/** 1:1 pass-through view in RHN_HARM on one inbound table: exists, deployed, reads only that table. */
function passThrough(name: string, source: string) {
  return (ctx: RuleContext): string | null => {
    const f = deployedObject(ctx, `RHN_HARM.${name}`);
    if (!f.o) return f.problem;
    const reads = readsFrom(f.o, ctx.tenant);
    return reads.length === 1 && reads[0] === `RHN_IN.${source}` ? null : `${name} should read RHN_IN.${source} and nothing else. Now it reads ${list(reads)}.`;
  };
}

/** Rows of a fact whose key has no partner in a dimension. */
const orphans = (fact: string, column: string, dim: string, key = column) =>
  `SELECT count(*) FROM ${fact} f LEFT JOIN ${dim} d ON f.${column} = d.${key} WHERE d.${key} IS NULL`;

// ---------------------------------------------------------------- missions

const D_GRID_COLS = ['GRID_AREA', 'GRID_AREA_NAME', 'REGION'];
const D_TARIFF_COLS = ['TARIFF', 'TARIFF_NAME', 'COMMODITY'];
const D_CUSTOMER_COLS = ['CUSTOMER_ID', 'NAME', 'ZIP', 'CITY'];
const F_CONS_COLS = ['CONTRACT_ID', 'CUSTOMER_ID', 'GRID_AREA', 'TARIFF', 'READING_DATE', 'CONSUMPTION_KWH'];
const F_INV_COLS = ['INVOICE_ID', 'CONTRACT_ID', 'CUSTOMER_ID', 'GRID_AREA', 'TARIFF', 'INVOICE_DATE', 'DUE_DATE', 'STATUS', 'NET_AMOUNT', 'TAX_AMOUNT'];

export const CHAPTER_6: Mission[] = [
  {
    id: 'c06-m01',
    chapter: 6,
    title: 'The first dimension',
    from: CALIN,
    ticket: `<p>Harmonization delivers clean data. Now the reporting layer gives it <b>meaning</b>: which entity holds numbers to add up
      (a <b>fact</b>) and which describes them (a <b>dimension</b>).</p>
      <p>We start with the grid areas. Reporting reads only harmonization, so first build a 1:1 view <code>RHN_HA_V_GRID_AREAS</code> in
      <code>RHN_HARM</code> on the inbound table and share it with <code>RHN_REP</code>. Then build the dimension
      <code>RHN_REP_D_GRID_AREA</code> in <code>RHN_REP</code> with the columns <code>GRID_AREA</code>, <code>GRID_AREA_NAME</code> and
      <code>REGION</code>: semantic usage <b>Dimension</b>, <code>GRID_AREA</code> as its <b>key</b>.</p>`,
    tasks: [
      'In <code>RHN_HARM</code>, build and deploy <code>RHN_HA_V_GRID_AREAS</code>: all columns of <code>GRID_AREAS</code>, no logic. Share it with <code>RHN_REP</code>.',
      'In <code>RHN_REP</code>, build <code>RHN_REP_D_GRID_AREA</code> on the shared view. Save it once.',
      'In its properties, set <b>Semantic Usage</b> to <i>Dimension</i>, run the Data Preview and mark <code>GRID_AREA</code> as <b>Key</b>. Save and deploy.',
      'Answer the questions below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'GRID_AREAS is already shared with RHN_HARM (chapter 1). Semantic usage and column roles are in the properties panel of the view, on the right.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'A dimension has a key: the column that identifies one row. The analytic model later joins facts to it on that key. Roles only appear for a saved view whose columns are known (Data Preview).' },
      { label: 'Hint 3: a skeleton', cost: 25, text: 'RHN_HARM: SELECT GRID_AREA, GRID_AREA_NAME, REGION, SRC_SYS_ID FROM RHN_IN.GRID_AREAS. RHN_REP: SELECT GRID_AREA, GRID_AREA_NAME, REGION FROM RHN_HARM.______. Usage Dimension, GRID_AREA = Key.' },
    ],
    checks: [
      { type: 'rule', label: 'Pass-through view in harmonization', ok: 'RHN_HA_V_GRID_AREAS reads the inbound table 1:1.', test: passThrough('RHN_HA_V_GRID_AREAS', 'GRID_AREAS') },
      { type: 'rule', label: 'Shared with reporting', ok: 'RHN_HA_V_GRID_AREAS is shared with RHN_REP.', test: shared(['RHN_HA_V_GRID_AREAS'], 'RHN_REP', 'RHN_HARM') },
      {
        type: 'result', label: 'The grid area dimension', object: D_GRID, columns: D_GRID_COLS,
        expected: project(D_GRID_COLS, 'SELECT * FROM RHN_IN.GRID_AREAS'),
      },
      { type: 'rule', label: 'Reads only harmonization', ok: 'RHN_REP_D_GRID_AREA builds on the shared harmonized view.', test: readsHarmonization(D_GRID) },
      { type: 'rule', label: 'Dimension with key GRID_AREA', ok: 'Deployed as Dimension with the key GRID_AREA.', test: typed(D_GRID, 'Dimension', 'Key', ['GRID_AREA']) },
      {
        type: 'question', id: 'usage', label: 'Fact or dimension',
        prompt: 'RHN_HA_V_METER_READINGS has one row per meter and reading date with the kWh consumed. Which semantic usage fits such data in reporting?',
        options: ['Dimension', 'Fact', 'Text', 'Relational Dataset'],
        answer: 1,
        nudge: 'Not quite. Does it describe something, or does it hold numbers you add up?',
      },
      {
        type: 'question', id: 'layer', label: 'Why a 1:1 view',
        prompt: 'GRID_AREAS needs no cleaning. Why not simply share RHN_IN.GRID_AREAS with RHN_REP?',
        options: [
          'A table cannot be shared with more than one space',
          'Reporting reads only harmonization. The 1:1 view keeps that rule, and if the grid areas ever need cleaning, it happens in one place without touching reporting',
          'Dimensions must always be views, never tables',
          'Shared tables cannot have a key',
        ],
        answer: 1,
        nudge: 'Not quite. Think about the layer rule from chapter 1, and about what happens when the source changes one day.',
      },
    ],
    review: ['no_select_star'],
    xp: 35,
    realTenant: `In a real tenant: open the view in the <b>Data Builder</b>, set <b>Semantic Usage</b> in the properties of the output, and mark
      key columns in the <b>Attributes</b> section. A dimension can also get <b>Text</b> and <b>Hierarchy</b> associations for language-dependent
      names and drill-down paths.`,
    debrief: `<p>Our first dimension. Notice what the key does: it tells every consumer what one row is. Without a key a dimension cannot be joined reliably.</p>
      <p>Grid area names are the same in every language here. If they were not, a separate entity with semantic usage <b>Text</b> would hold
      one name per language, associated to the dimension.</p>`,
  },
  {
    id: 'c06-m02',
    chapter: 6,
    title: 'Tariffs and customers',
    from: AUDIT,
    ticket: `<p>Sabine Wolf, internal audit. I hear the reporting layer gets customer data. One condition from my side: reporting holds
      <b>only what reports need</b>. The board does not need e-mail addresses or streets, and whatever reaches reporting can reach SAP Analytics Cloud.</p>
      <p><i>Calin adds:</i> Two dimensions, same pattern as the grid areas:</p>
      <ul>
        <li><code>RHN_REP_D_TARIFF</code>: <code>TARIFF</code> (key), <code>TARIFF_NAME</code>, <code>COMMODITY</code>. Build a 1:1 view
          <code>RHN_HA_V_TARIFFS</code> in harmonization first; share <code>TARIFFS</code> with <code>RHN_HARM</code> for that.</li>
        <li><code>RHN_REP_D_CUSTOMER</code>: <code>CUSTOMER_ID</code> (key), <code>NAME</code>, <code>ZIP</code>, <code>CITY</code>,
          on our deduplicated <code>RHN_HA_V_CUSTOMERS</code>. No e-mail, no street.</li>
      </ul>`,
    tasks: [
      'Share <code>TARIFFS</code> with <code>RHN_HARM</code>, build and deploy <code>RHN_HA_V_TARIFFS</code>, share it with <code>RHN_REP</code>. Share <code>RHN_HA_V_CUSTOMERS</code> with <code>RHN_REP</code> as well.',
      'In <code>RHN_REP</code>, build <code>RHN_REP_D_TARIFF</code> as a dimension with its key.',
      'Build <code>RHN_REP_D_CUSTOMER</code> as a dimension with its key, without personal data the board does not need.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Sharing is set in the space the object lives in: TARIFFS in RHN_IN, the RHN_HA_V_ views in RHN_HARM.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'Pick the columns in the SELECT: a reporting view does not have to pass on every column of its source. Leaving columns out is how you keep personal data in its layer.' },
      { label: 'Hint 3: a skeleton', cost: 25, text: 'SELECT TARIFF, TARIFF_NAME, COMMODITY FROM RHN_HARM.RHN_HA_V_TARIFFS   ·   SELECT CUSTOMER_ID, NAME, ZIP, CITY FROM RHN_HARM.______. Both: Dimension, key = the ID column.' },
    ],
    checks: [
      { type: 'rule', label: 'Tariffs in harmonization', ok: 'RHN_HA_V_TARIFFS reads TARIFFS 1:1.', test: passThrough('RHN_HA_V_TARIFFS', 'TARIFFS') },
      { type: 'rule', label: 'Shared with reporting', ok: 'Both harmonized views are shared with RHN_REP.', test: shared(['RHN_HA_V_TARIFFS', 'RHN_HA_V_CUSTOMERS'], 'RHN_REP', 'RHN_HARM') },
      { type: 'result', label: 'The tariff dimension', object: D_TARIFF, columns: D_TARIFF_COLS, expected: project(D_TARIFF_COLS, 'SELECT * FROM RHN_IN.TARIFFS') },
      { type: 'rule', label: 'Tariff: dimension with key', ok: 'RHN_REP_D_TARIFF is a dimension with the key TARIFF.', test: typed(D_TARIFF, 'Dimension', 'Key', ['TARIFF']) },
      {
        type: 'structure', label: 'Customer: only what reports need', space: 'RHN_REP', object: 'RHN_REP_D_CUSTOMER', kind: 'View', columns: D_CUSTOMER_COLS,
        absent: { columns: ['EMAIL', 'STREET'], message: 'The board reports do not need it; leave personal data in harmonization.' },
      },
      {
        type: 'result', label: 'The customer dimension', object: D_CUSTOMER, columns: D_CUSTOMER_COLS, expected: project(D_CUSTOMER_COLS, REF_CUSTOMERS),
        counts: { 946: 'Your dimension has 946 rows, the duplicates are back. Build it on RHN_HA_V_CUSTOMERS, not on the raw CRM data.' },
      },
      { type: 'rule', label: 'Customer: dimension with key', ok: 'RHN_REP_D_CUSTOMER is a dimension with the key CUSTOMER_ID.', test: typed(D_CUSTOMER, 'Dimension', 'Key', ['CUSTOMER_ID']) },
      { type: 'rule', label: 'Reads only harmonization', ok: 'Both dimensions build on harmonized views.', test: (ctx) => readsHarmonization(D_TARIFF)(ctx) ?? readsHarmonization(D_CUSTOMER)(ctx) },
      {
        type: 'question', id: 'minimize', label: 'Data minimization',
        prompt: 'Why leave e-mail and street out of the reporting dimension, although they are clean in harmonization?',
        options: [
          'Datasphere cannot share text columns',
          'Reporting is consumed by many people in SAP Analytics Cloud. Personal data only goes where a report needs it; it stays available in harmonization for those who do',
          'E-mail addresses change too often',
          'It makes the dimension faster, nothing else',
        ],
        answer: 1,
        nudge: 'Not quite. Think about who reads the reporting layer, and what audit asked for.',
      },
    ],
    review: ['no_select_star'],
    xp: 40,
    realTenant: `Datasphere also protects data with <b>Data Access Controls</b> (rows, chapter 8) and space membership (spaces, chapter 2).
      Leaving columns out is the simplest protection of all: what never reaches the reporting layer cannot leak from it.`,
    debrief: `<p>Thank you, that is how I like to see it. Personal data stays where the people working on it are.</p>
      <p><i>Calin adds:</i> Three dimensions are ready. Next we build the first fact and see why it does not need any of the names you just modeled.</p>`,
  },
  {
    id: 'c06-m03',
    chapter: 6,
    title: 'The consumption fact',
    from: CALIN,
    ticket: `<p>Now the first <b>fact</b>: <code>RHN_REP_F_CONSUMPTION</code> in <code>RHN_REP</code>, one row per reading, with the columns
      <code>CONTRACT_ID</code>, <code>CUSTOMER_ID</code>, <code>GRID_AREA</code>, <code>TARIFF</code>, <code>READING_DATE</code> and
      <code>CONSUMPTION_KWH</code>. The keys come from our harmonized contracts.</p>
      <p>Two rules for a fact:</p>
      <ul>
        <li>It holds <b>keys</b>, not descriptions: no grid area names, no regions, no tariff names. Those come from the dimensions.</li>
        <li>Only real <b>measures</b> are measures: values that make sense to add up.</li>
      </ul>`,
    tasks: [
      'In <code>RHN_REP</code>, build <code>RHN_REP_F_CONSUMPTION</code>: join the readings with the contracts (both shared from harmonization since chapter 5).',
      'Set the semantic usage to <i>Fact</i> and give each column its role: measure or attribute. Save and deploy.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'RHN_HA_V_METER_READINGS and RHN_HA_V_CONTRACTS are in the Sources of RHN_REP under Shared Objects.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'A measure is aggregated (summed) in reports. Everything you group or filter by is an attribute: IDs, codes, dates.' },
      { label: 'Hint 3: a skeleton', cost: 25, text: 'SELECT r.CONTRACT_ID, c.CUSTOMER_ID, c.______, c.______, r.READING_DATE, r.CONSUMPTION_KWH FROM RHN_HARM.RHN_HA_V_METER_READINGS r JOIN RHN_HARM.RHN_HA_V_CONTRACTS c ON r.______ = c.______' },
    ],
    checks: [
      {
        type: 'structure', label: 'Keys, not descriptions', space: 'RHN_REP', object: 'RHN_REP_F_CONSUMPTION', kind: 'View', columns: F_CONS_COLS,
        absent: { columns: ['REGION', 'GRID_AREA_NAME', 'TARIFF_NAME', 'NAME', 'COMMODITY'], message: 'A fact holds keys; names and regions come from the dimensions through associations.' },
      },
      {
        type: 'result', label: 'One row per reading', object: F_CONS, columns: F_CONS_COLS, expected: project(F_CONS_COLS, REF_F_CONS),
        counts: { 5824: 'Your fact has 5,824 rows: the duplicate readings are back. Build it on RHN_HA_V_METER_READINGS.' },
      },
      { type: 'rule', label: 'Reads only harmonization', ok: 'The fact builds on harmonized views.', test: readsHarmonization(F_CONS) },
      { type: 'rule', label: 'Fact with one measure', ok: 'Deployed as Fact; CONSUMPTION_KWH is the only measure.', test: typed(F_CONS, 'Fact', 'Measure', ['CONSUMPTION_KWH']) },
      {
        type: 'question', id: 'names', label: 'Why no names in the fact',
        prompt: 'Why does the fact hold GRID_AREA, but not REGION or GRID_AREA_NAME?',
        options: [
          'Facts may only have six columns',
          'The dimension holds them once and every fact reaches them through an association; a renamed grid area changes in one place, and the fact stays narrow',
          'Text columns cannot be stored in a fact',
          'REGION is not available in RHN_REP',
        ],
        answer: 1,
        nudge: 'Not quite. Think about two facts (consumption and invoices) that both need the region, and a grid area that is renamed.',
      },
    ],
    review: ['no_select_star', 'explicit_join'],
    xp: 40,
    realTenant: `In a real tenant the fact is usually a view with semantic usage <b>Fact</b>, its measures marked in the <b>Measures</b> section
      (with aggregation, usually SUM). SAP recommends <b>Fact + Analytic Model</b> over the older Analytical Dataset.`,
    debrief: `<p>A narrow fact: keys, a date and one measure. It will never need a change when a tariff gets a new name.</p>
      <p>Right now nothing connects it to the dimensions though. That is the next ticket.</p>`,
  },
  {
    id: 'c06-m04',
    chapter: 6,
    title: 'Connect the fact',
    from: CALIN,
    ticket: `<p>An analytic model only offers the dimensions a fact is <b>associated</b> with. Give <code>RHN_REP_F_CONSUMPTION</code> three associations:
      to <code>RHN_REP_D_GRID_AREA</code>, <code>RHN_REP_D_TARIFF</code> and <code>RHN_REP_D_CUSTOMER</code>, each with the right key mapping.</p>
      <p>Before that, make sure every key in the fact finds its partner in the dimension. An association to a dimension with gaps
      gives "unassigned" rows in every report.</p>`,
    tasks: [
      'Check in a scratch view in <code>RHN_REP</code> that every <code>GRID_AREA</code>, <code>TARIFF</code> and <code>CUSTOMER_ID</code> of the fact exists in its dimension.',
      'Open <code>RHN_REP_F_CONSUMPTION</code> and add the three associations under <b>Associations</b>, with the key mapping.',
      '<b>Save</b> and <b>Deploy</b>. Then answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Associations are in the properties of the fact, under the column roles. Only deployed dimensions with a key can be targets.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'The key mapping says which column of the fact holds the key of the target. A LEFT JOIN from fact to dimension with WHERE d.key IS NULL finds gaps.' },
      { label: 'Hint 3: a skeleton', cost: 25, text: 'Associations: GRID_AREA → RHN_REP_D_GRID_AREA.GRID_AREA, TARIFF → RHN_REP_D_TARIFF.TARIFF, CUSTOMER_ID → RHN_REP_D_CUSTOMER.______' },
    ],
    checks: [
      { type: 'rule', label: 'Association to grid areas', ok: 'GRID_AREA → RHN_REP_D_GRID_AREA.', test: associated(F_CONS, D_GRID, { GRID_AREA: 'GRID_AREA' }) },
      { type: 'rule', label: 'Association to tariffs', ok: 'TARIFF → RHN_REP_D_TARIFF.', test: associated(F_CONS, D_TARIFF, { TARIFF: 'TARIFF' }) },
      { type: 'rule', label: 'Association to customers', ok: 'CUSTOMER_ID → RHN_REP_D_CUSTOMER.', test: associated(F_CONS, D_CUSTOMER, { CUSTOMER_ID: 'CUSTOMER_ID' }) },
      { type: 'rule', label: 'Still a fact with one measure', ok: 'Fact and measure unchanged.', test: typed(F_CONS, 'Fact', 'Measure', ['CONSUMPTION_KWH']) },
      {
        type: 'metric', label: 'Every key finds its dimension row',
        sql: `SELECT (${orphans(F_CONS, 'GRID_AREA', D_GRID)}) + (${orphans(F_CONS, 'TARIFF', D_TARIFF)}) + (${orphans(F_CONS, 'CUSTOMER_ID', D_CUSTOMER)})`,
        missing: 'The fact and all three dimensions must be deployed in RHN_REP.',
        ok: 'No unassigned rows: every reading finds its grid area, tariff and customer.',
        test: (n) => (n ? `${n} key values of the fact have no row in their dimension. Check that the dimensions are built on the harmonized views.` : null),
      },
      {
        type: 'question', id: 'runtime', label: 'What an association does',
        prompt: 'What happens in the database when you deploy the fact with its three associations?',
        options: [
          'The fact is joined with all three dimensions on every read',
          'Nothing is joined yet; a consumer such as the analytic model joins along an association only when a query needs that dimension',
          'The dimension columns are copied into the fact',
          'The dimensions are locked so their keys cannot change',
        ],
        answer: 1,
        nudge: 'Not quite. An association is a semantic relation: when does it turn into a join?',
      },
    ],
    xp: 40,
    realTenant: `In a real tenant you add associations in the <b>Associations</b> section of the fact (or by drawing them in an
      <b>Entity-Relationship Model</b>) and map the columns. The analytic model then offers exactly these dimensions.
      Associations from a dimension to a <b>Text</b> or <b>Hierarchy</b> entity work the same way.`,
    debrief: `<p>The fact now knows its dimensions without a single join in its SQL. A report on consumption per region asks the grid area
      dimension for REGION only when someone actually groups by region.</p>
      <p>And because the dimensions are separate, the next fact can reuse all three. Petra is already waiting for it.</p>`,
  },
  {
    id: 'c06-m05',
    chapter: 6,
    title: 'The invoice fact',
    from: CFO,
    ticket: `<p>For revenue and receivables I need the invoices in reporting, by grid area, tariff and customer.</p>
      <p><i>Calin adds:</i> Same path as before. A 1:1 view <code>RHN_HA_V_INVOICES</code> in harmonization (share <code>BILLING_INVOICES</code>
      with <code>RHN_HARM</code> first), shared with <code>RHN_REP</code>. Then the fact <code>RHN_REP_F_INVOICES</code> with
      <code>INVOICE_ID</code>, <code>CONTRACT_ID</code>, <code>CUSTOMER_ID</code>, <code>GRID_AREA</code>, <code>TARIFF</code>,
      <code>INVOICE_DATE</code>, <code>DUE_DATE</code>, <code>STATUS</code>, <code>NET_AMOUNT</code> and <code>TAX_AMOUNT</code>,
      associated with the same three dimensions. Gross is not a column: it becomes a calculated measure in the analytic model.</p>`,
    tasks: [
      'Share <code>BILLING_INVOICES</code> with <code>RHN_HARM</code>, build and deploy <code>RHN_HA_V_INVOICES</code>, share it with <code>RHN_REP</code>.',
      'In <code>RHN_REP</code>, build <code>RHN_REP_F_INVOICES</code> on invoices and contracts: Fact, with its measures.',
      'Add the associations to the three dimensions, save and deploy.',
      'In a scratch view in <code>RHN_REP</code>, join the fact with the grid area dimension and answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'The fact needs RHN_HA_V_INVOICES for the amounts and RHN_HA_V_CONTRACTS for the keys; both are shared harmonized views.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'NET_AMOUNT and TAX_AMOUNT are measures. The dimensions are reused as they are: an association per key column.' },
      { label: 'Hint 3: a skeleton', cost: 25, text: 'SELECT i.INVOICE_ID, i.CONTRACT_ID, c.CUSTOMER_ID, c.GRID_AREA, c.TARIFF, i.INVOICE_DATE, i.DUE_DATE, i.STATUS, i.NET_AMOUNT, i.TAX_AMOUNT FROM RHN_HARM.______ i JOIN RHN_HARM.______ c ON …' },
    ],
    checks: [
      { type: 'rule', label: 'Invoices in harmonization', ok: 'RHN_HA_V_INVOICES reads BILLING_INVOICES 1:1.', test: passThrough('RHN_HA_V_INVOICES', 'BILLING_INVOICES') },
      { type: 'rule', label: 'Shared with reporting', ok: 'RHN_HA_V_INVOICES is shared with RHN_REP.', test: shared(['RHN_HA_V_INVOICES'], 'RHN_REP', 'RHN_HARM') },
      {
        type: 'structure', label: 'Keys and amounts', space: 'RHN_REP', object: 'RHN_REP_F_INVOICES', kind: 'View', columns: F_INV_COLS,
        absent: { columns: ['REGION', 'GRID_AREA_NAME', 'TARIFF_NAME', 'NAME', 'GROSS_AMOUNT'], message: 'Names come from the dimensions, and gross becomes a calculated measure in the analytic model.' },
      },
      {
        type: 'result', label: 'One row per invoice', object: F_INV, columns: F_INV_COLS, expected: project(F_INV_COLS, REF_F_INV),
        diagnose: [
          {
            sql: project(F_INV_COLS, REF_F_INV.replace(`(${REF_CONTRACTS}) c`, 'RHN_IN.BILLING_CONTRACTS c')),
            message: 'The keys come from the raw contracts: legacy grid areas, tariffs and customer numbers are back. Take them from RHN_HA_V_CONTRACTS.',
          },
        ],
      },
      { type: 'rule', label: 'Reads only harmonization', ok: 'The fact builds on harmonized views.', test: readsHarmonization(F_INV) },
      { type: 'rule', label: 'Fact with two measures', ok: 'NET_AMOUNT and TAX_AMOUNT are the measures.', test: typed(F_INV, 'Fact', 'Measure', ['NET_AMOUNT', 'TAX_AMOUNT']) },
      {
        type: 'rule', label: 'Reuses the three dimensions', ok: 'Associated with grid area, tariff and customer.',
        test: (ctx) => associated(F_INV, D_GRID, { GRID_AREA: 'GRID_AREA' })(ctx) ?? associated(F_INV, D_TARIFF, { TARIFF: 'TARIFF' })(ctx)
          ?? associated(F_INV, D_CUSTOMER, { CUSTOMER_ID: 'CUSTOMER_ID' })(ctx),
      },
      {
        type: 'question', id: 'north', label: 'Net revenue North 2025',
        prompt: 'How much net was invoiced in 2025 (invoice date) in region NORTH?',
        options: ['About 531 thousand EUR', 'About 785 thousand EUR', 'About 871 thousand EUR', 'About 1.04 million EUR'],
        answer: 2,
        nudge: 'Not quite. Region NORTH has two grid areas; the region is in the dimension. Sum NET_AMOUNT, not gross.',
      },
    ],
    review: ['no_select_star', 'explicit_join'],
    xp: 45,
    realTenant: `Two facts sharing the same dimensions is the classic <b>star schema</b>. In the analytic model (chapter 7) each fact is the
      center of its own model, and both get the same grid areas, tariffs and customers.`,
    debrief: `<p>About 871 thousand EUR net for the North in 2025. Thank you!</p>
      <p><i>Calin adds:</i> Did you notice the trap in the question? Grid area NORTH alone is 531 thousand; region NORTH also includes EAST.
      Without the dimension, every report would have to know that by heart. Next chapter: the analytic model for Petra.</p>`,
  },
];
