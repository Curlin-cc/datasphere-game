import type { Mission, RuleContext } from '../../missions/types';
import { findObject, type RepoObject } from '../../repo';
import { isShared } from '../../tenant';
import type { AnalyticModelDef, Measure } from '../../analytic';
import { REF_F_CONS, REF_F_INV } from './c06';

/**
 * Chapter 7, Analytic Model (Handbuch 6.10, 6.12.5). The presentation layer RHN_PRES gets its first objects: the facts and the
 * dimensions a model needs are shared from RHN_DSL (supporting entities, SAP help "Share Supporting Entities"; the customer
 * dimension stays unshared). The CFO gets a model on the invoice fact: fact source measures,
 * the dimensions from the fact's associations, a calculated measure (gross, promised in c04-m02), a restricted measure
 * (unpaid gross), a filter variable (invoice date) and a count distinct (customers). Then a second, lean model on
 * the consumption fact: one model per fact and use case.
 *
 * Model checks query the deployed model like SAP Analytics Cloud would (type 'model', see engine.ts).
 * Numbers from generator v1, checked with DuckDB on 2026-10-09.
 */

const CALIN = { name: 'Calin Mucea', role: 'Senior Data Architect, your mentor', initials: 'CM' };
const CFO = { name: 'Petra Lindner', role: 'CFO, Stadtwerke Rheinau', initials: 'PL' };
const NORTH_MGR = { name: 'Markus Brandt', role: 'Regional Manager North', initials: 'MB' };

const F_INV = 'RHN_DSL.RHN_DS_F_INVOICES';
const F_CONS = 'RHN_DSL.RHN_DS_F_CONSUMPTION';
const D_GRID = 'RHN_DSL.RHN_DS_D_GRID_AREA';
const D_TARIFF = 'RHN_DSL.RHN_DS_D_TARIFF';
const D_CUST = 'RHN_DSL.RHN_DS_D_CUSTOMER';
const AM_INV = 'RHN_PRES.RHN_PR_AM_INVOICES';
const AM_CONS = 'RHN_PRES.RHN_PR_AM_CONSUMPTION';

const REGION = 'RHN_DS_D_GRID_AREA.REGION';

// ---------------------------------------------------------------- reference figures (never shown)

const INV = `(${REF_F_INV}) f`;
const BY_REGION = `JOIN RHN_ENTRY.GRID_AREAS g ON f.GRID_AREA = g.GRID_AREA`;
const ref = {
  netByRegion: `SELECT g.REGION, SUM(f.NET_AMOUNT) FROM ${INV} ${BY_REGION} GROUP BY 1`,
  grossByStatus: `SELECT f.STATUS, SUM(f.NET_AMOUNT + f.TAX_AMOUNT) FROM ${INV} GROUP BY 1`,
  netByStatus: `SELECT f.STATUS, SUM(f.NET_AMOUNT) FROM ${INV} GROUP BY 1`,
  taxByStatus: `SELECT f.STATUS, SUM(f.TAX_AMOUNT) FROM ${INV} GROUP BY 1`,
  unpaid: (statuses: string, amount = 'f.NET_AMOUNT + f.TAX_AMOUNT') =>
    `SELECT g.REGION, SUM(CASE WHEN f.STATUS IN (${statuses}) THEN ${amount} END) FROM ${INV} ${BY_REGION} GROUP BY 1`,
  customersByRegion: `SELECT g.REGION, COUNT(DISTINCT f.CUSTOMER_ID) FROM ${INV} ${BY_REGION} GROUP BY 1`,
  invoicesByRegion: `SELECT g.REGION, COUNT(f.CUSTOMER_ID) FROM ${INV} ${BY_REGION} GROUP BY 1`,
  kwhByRegion: `SELECT g.REGION, SUM(f.CONSUMPTION_KWH) FROM (${REF_F_CONS}) f ${BY_REGION} GROUP BY 1`,
};

// ---------------------------------------------------------------- rule helpers

type Found = { o: RepoObject; def: AnalyticModelDef; problem: null } | { o: null; def: null; problem: string };

/** The deployed analytic model, or why it cannot be checked yet. */
function model({ tenant }: RuleContext, key: string): Found {
  const [space, name] = key.split('.');
  const o = findObject(tenant, key);
  const none = (problem: string): Found => ({ o: null, def: null, problem });
  if (!o) {
    const elsewhere = tenant.objects.find((x) => x.name === name);
    return none(elsewhere ? `${name} is in ${elsewhere.space}; it belongs in ${space}.` : `There is no analytic model ${name} in ${space} yet.`);
  }
  if (o.kind !== 'Analytic Model') return none(`${name} is a ${o.kind}. Create an Analytic Model with this technical name.`);
  if (!o.deployed?.model) return none(`${name} is saved, but not deployed.`);
  if (o.status === 'changes') return none(`${name} has saved changes that are not deployed yet. Deploy them.`);
  return { o, def: o.deployed.model, problem: null };
}

const measure = (def: AnalyticModelDef, name: string) => def.measures.find((m) => m.name === name);

/** Built on the right fact. */
const onFact = (key: string, fact: string) => (ctx: RuleContext) => {
  const f = model(ctx, key);
  if (!f.def) return f.problem;
  return f.def.fact === fact ? null : `${key.split('.')[1]} is built on ${f.def.fact.split('.')[1]}. The ticket needs ${fact.split('.')[1]} as its fact source.`;
};

/** Fact source measures with SUM, by name and column. */
const factMeasures = (key: string, columns: string[]) => (ctx: RuleContext) => {
  const f = model(ctx, key);
  if (!f.def) return f.problem;
  for (const c of columns) {
    const m = measure(f.def, c);
    if (!m) return `The model has no measure ${c}. Tick it in the properties of the fact.`;
    if (m.type !== 'Fact Source Measure' || m.column !== c) return `${c} should be the fact source measure ${c}, now it is a ${m.type}.`;
    if (m.aggregation !== 'SUM') return `${c} is aggregated with ${m.aggregation}. Amounts and kWh add up: use SUM.`;
  }
  return null;
};

/** Which dimensions the model offers: these yes, the customer dimension no. */
const dimensions = (key: string, need: string[], leaveOut: string, why: string) => (ctx: RuleContext) => {
  const f = model(ctx, key);
  if (!f.def) return f.problem;
  const missing = need.filter((d) => !f.def!.dimensions.includes(d));
  if (missing.length) return `The model does not offer ${missing.map((d) => d.split('.')[1]).join(', ')} yet. Add it on the canvas.`;
  if (f.def.dimensions.includes(leaveOut)) return `The model offers ${leaveOut.split('.')[1]}. ${why}`;
  return null;
};

/** These attributes are visible to consumers. */
const visible = (key: string, attrs: string[]) => (ctx: RuleContext) => {
  const f = model(ctx, key);
  if (!f.def) return f.problem;
  const hidden = attrs.filter((a) => !f.def!.attributes.includes(a));
  return hidden.length ? `Not visible in the model: ${hidden.map((a) => a.split('.').pop()).join(', ')}. Tick it in the properties of its dimension.` : null;
};

const ofType = (key: string, name: string, type: Measure['type'], hint: string) => (ctx: RuleContext) => {
  const f = model(ctx, key);
  if (!f.def) return f.problem;
  const m = measure(f.def, name);
  if (!m) return `The model has no measure ${name} yet.`;
  return m.type === type ? null : `${name} is a ${m.type}. ${hint}`;
};

/** A filter variable on an attribute with interval selection. */
const intervalVariable = (key: string, name: string, attribute: string, mandatory: boolean) => (ctx: RuleContext) => {
  const f = model(ctx, key);
  if (!f.def) return f.problem;
  const v = f.def.variables.find((x) => x.name === name);
  if (!v) {
    const other = f.def.variables.find((x) => x.attribute === attribute);
    return other ? `The variable on ${attribute} is called ${other.name}. The ticket names it ${name}.` : `The model has no variable ${name} yet. Click the canvas background, then Add Variable.`;
  }
  if (v.attribute !== attribute) return `${name} filters ${v.attribute}. It should filter ${attribute}.`;
  if (v.selection !== 'Interval') return `${name} asks for a single value: one day. A year is a range from the first to the last day, so use Interval.`;
  if (v.mandatory !== mandatory) return mandatory ? `${name} is optional. Without a date range the report would add up all years; make it mandatory.` : `${name} is mandatory. The ticket wants it optional.`;
  return null;
};

/** Shared from RHN_DSL with the presentation layer. */
const sharedWithPres = (keys: string[]) => ({ tenant }: RuleContext) => {
  const missing = keys.filter((k) => !isShared(tenant, k, 'RHN_PRES'));
  return missing.length ? `Not shared with RHN_PRES yet: ${missing.map((k) => k.split('.')[1]).join(', ')}. Share them in RHN_DSL (Data Builder, select, Share).` : null;
};

/** The customer dimension stays in the data & semantic layer. */
const customerStaysHome = ({ tenant }: RuleContext) =>
  isShared(tenant, D_CUST, 'RHN_PRES')
    ? 'RHN_DS_D_CUSTOMER is shared with RHN_PRES. No presentation model needs customer names: stop sharing it in RHN_DSL.'
    : null;

// ---------------------------------------------------------------- missions

export const CHAPTER_7: Mission[] = [
  {
    id: 'c07-m01',
    chapter: 7,
    title: 'A model for the CFO',
    from: CFO,
    ticket: `<p>Calin says the invoice data is modeled now. Our board reports in SAP Analytics Cloud need one model to build on:
      <b>net</b> and <b>tax</b> amounts by <b>region</b>, <b>grid area</b> and <b>tariff</b>.</p>
      <p><i>Calin adds:</i> That is an <b>analytic model</b>, and it lives in the <b>presentation layer</b> <code>RHN_PRES</code>: what consumers see,
      nothing else. The fact and its dimensions stay in <code>RHN_DSL</code>; share <code>RHN_DS_F_INVOICES</code> together with the dimensions
      the model needs, <code>RHN_DS_D_GRID_AREA</code> and <code>RHN_DS_D_TARIFF</code>, with <code>RHN_PRES</code>. Petra reports on regions and
      tariffs, not on single customers: the customer dimension is <b>not</b> shared. Then build <code>RHN_PR_AM_INVOICES</code> on the shared fact:
      measures <code>NET_AMOUNT</code> and <code>TAX_AMOUNT</code>, the grid area and tariff dimensions with <code>REGION</code> and
      <code>TARIFF_NAME</code> visible.</p>`,
    tasks: [
      'In <code>RHN_DSL</code>, share <code>RHN_DS_F_INVOICES</code>, <code>RHN_DS_D_GRID_AREA</code> and <code>RHN_DS_D_TARIFF</code> with <code>RHN_PRES</code>.',
      'In <code>RHN_PRES</code>, create a <b>New Analytic Model</b> on the shared fact <code>RHN_DS_F_INVOICES</code>.',
      'Check the measures of the fact, and add the grid area and tariff dimensions from its associations.',
      'Name it <code>RHN_PR_AM_INVOICES</code>, save and deploy.',
      'Open the <b>Data Preview</b> with tariff names in the rows and answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Share in the space the objects live in: RHN_DSL. The Analytic Model tile is on the Data Builder start page of RHN_PRES; it asks for a fact source first and lists shared facts too.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'The model offers exactly the dimensions the fact is associated with. Click a dashed dimension node to add it; click a node to see its attributes.' },
      { label: 'Hint 3: the setup', cost: 25, text: 'Fact RHN_DS_F_INVOICES, measures NET_AMOUNT and TAX_AMOUNT (SUM), dimensions RHN_DS_D_GRID_AREA and RHN_DS_D_TARIFF, nothing else. Business name e.g. "Invoices Model".' },
    ],
    checks: [
      { type: 'rule', label: 'Fact and dimensions shared', ok: 'The invoice fact, grid areas and tariffs are shared with RHN_PRES.', test: sharedWithPres([F_INV, D_GRID, D_TARIFF]) },
      { type: 'rule', label: 'Customers stay in RHN_DSL', ok: 'The customer dimension is not shared with the presentation layer.', test: customerStaysHome },
      { type: 'rule', label: 'Built on the invoice fact', ok: 'RHN_PR_AM_INVOICES is deployed on RHN_DS_F_INVOICES.', test: onFact(AM_INV, F_INV) },
      { type: 'rule', label: 'Net and tax as measures', ok: 'NET_AMOUNT and TAX_AMOUNT, both summed.', test: factMeasures(AM_INV, ['NET_AMOUNT', 'TAX_AMOUNT']) },
      {
        type: 'rule', label: 'Grid area and tariff, no customers', ok: 'Grid area and tariff dimensions, no customer dimension.',
        test: dimensions(AM_INV, [D_GRID, D_TARIFF], D_CUST, 'Petra reports on regions and tariffs. Whatever the model offers, every report user can see: leave the customer dimension out.'),
      },
      { type: 'rule', label: 'Region and tariff name visible', ok: 'REGION and TARIFF_NAME are visible.', test: visible(AM_INV, [REGION, 'RHN_DS_D_TARIFF.TARIFF_NAME']) },
      { type: 'model', label: 'Net revenue by region', object: AM_INV, rows: [REGION], measures: ['NET_AMOUNT'], expected: ref.netByRegion },
      {
        type: 'question', id: 'tariff', label: 'Top tariff',
        prompt: 'Which tariff brought the most net revenue over all invoices?',
        options: ['Rheinau Gas Komfort', 'Rheinau Strom Basis', 'Rheinau Strom Öko', 'Rheinau Wärmestrom'],
        answer: 1,
        nudge: 'Not quite. Put the tariff name in the rows of the Data Preview and compare NET_AMOUNT. It is close.',
      },
      {
        type: 'question', id: 'layer', label: 'Why a presentation layer',
        prompt: 'Why does the model live in RHN_PRES on a shared fact, and not next to the fact in RHN_DSL?',
        options: [
          'Analytic models cannot be created in a space that has views',
          'RHN_PRES holds only what consumers see. Report users get access to that space alone, and the share decides what they can reach: the customer dimension, the base views and the entry tables stay out of their sight',
          'Shared facts are faster than local ones',
          'A space can hold only one kind of object',
        ],
        answer: 1,
        nudge: 'Not quite. Who gets access to which space, and what does sharing decide?',
      },
    ],
    xp: 45,
    realTenant: `In a real tenant: share the fact with its <b>supporting entities</b> (the dimensions, texts and hierarchies it is associated with)
      so their services work in the target space; SAP recommends sharing exactly those, not the source tables or the data access control.
      Then <b>Data Builder › New Analytic Model</b>, choose the fact source, and the canvas shows the fact with its associated dimensions. The properties panel lists measures and attributes per source. After deploying, the model appears in
      SAP Analytics Cloud as a data source for stories.`,
    debrief: `<p>Thank you. That is what I will see in our stories from now on, with the names, not the codes.</p>
      <p><i>Calin adds:</i> Notice that you wrote no SQL and no join. The model followed the associations you built in chapter 6, and the
      Data Preview joined a dimension only when you put one of its attributes in the rows. All three layers are in use now:
      entry holds the sources, data &amp; semantic gives them shape and meaning, presentation shows them.</p>`,
  },
  {
    id: 'c07-m02',
    chapter: 7,
    title: 'Gross, defined once',
    from: CALIN,
    ticket: `<p>Remember the very first CFO ticket? Gross is net plus tax, and every query had to know that. Not any more: give
      <code>RHN_PR_AM_INVOICES</code> a <b>calculated measure</b> <code>GROSS_AMOUNT</code> = <code>NET_AMOUNT + TAX_AMOUNT</code>.
      Every report then gets gross from one formula.</p>`,
    tasks: [
      'Open <code>RHN_PR_AM_INVOICES</code>, click the canvas background and add a <b>Calculated Measure</b> <code>GROSS_AMOUNT</code>.',
      'Save and deploy.',
      'Check it in the Data Preview by <code>STATUS</code> and answer the questions below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Measures of the whole model are in the properties when nothing on the canvas is selected: click the background.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'A calculated measure is a formula over other measures of the model, calculated after aggregation. Its formula uses measure names, not columns.' },
      { label: 'Hint 3: the setup', cost: 25, text: '+ Calculated, technical name GROSS_AMOUNT, formula NET_AMOUNT + TAX_AMOUNT.' },
    ],
    checks: [
      {
        type: 'rule', label: 'A calculated measure', ok: 'GROSS_AMOUNT is a calculated measure.',
        test: ofType(AM_INV, 'GROSS_AMOUNT', 'Calculated Measure', 'Gross is a formula over the measures NET_AMOUNT and TAX_AMOUNT.'),
      },
      {
        type: 'model', label: 'Gross by status', object: AM_INV, rows: ['STATUS'], measures: ['GROSS_AMOUNT'], expected: ref.grossByStatus,
        ok: 'Gross by status matches the first CFO ticket.',
        diagnose: [
          { sql: ref.netByStatus, message: 'GROSS_AMOUNT returns the net amounts. Gross is net plus tax.' },
          { sql: ref.taxByStatus, message: 'GROSS_AMOUNT returns only the tax. Gross is net plus tax.' },
        ],
      },
      {
        type: 'question', id: 'overdue', label: 'Overdue gross',
        prompt: 'What is the gross amount of all OVERDUE invoices?',
        options: ['About 69 thousand EUR', 'About 82 thousand EUR', 'About 1.07 million EUR', 'About 104 thousand EUR'],
        answer: 1,
        nudge: 'Not quite. Put STATUS in the rows and only GROSS_AMOUNT in the measures.',
      },
      {
        type: 'question', id: 'why', label: 'Why a calculated measure',
        prompt: 'Why is gross a calculated measure in the model, and not a GROSS_AMOUNT column in the fact view?',
        options: [
          'Fact views cannot add two columns',
          'Both work the same; it is only a matter of taste',
          'The fact stays a narrow interface of stored values; the formula lives once in the model where reports consume it, and formulas such as ratios must be calculated after aggregation anyway',
          'Calculated measures are stored and therefore faster',
        ],
        answer: 2,
        nudge: 'Not quite. Think about a ratio like tax / net: does it make sense to add up row-level ratios?',
      },
    ],
    xp: 40,
    realTenant: `In a real tenant: in the analytic model, <b>Measures › + › Calculated Measure</b>, then build the expression in the formula
      editor. Calculated measures are evaluated after aggregation, so ratios and shares come out right in every drill-down.`,
    debrief: `<p>The board formula from your first week now lives in one place. If tax rules ever change how gross is defined, one measure changes,
      and every story follows.</p>`,
  },
  {
    id: 'c07-m03',
    chapter: 7,
    title: 'Unpaid invoices',
    from: CFO,
    ticket: `<p>I want to see the <b>unpaid</b> gross amount next to the total gross, in the same table, by region. Unpaid means
      status <code>OPEN</code> or <code>OVERDUE</code>.</p>
      <p><i>Calin adds:</i> A filter on the report would hide the paid invoices from the total too. What Petra needs is a
      <b>restricted measure</b> <code>UNPAID_GROSS</code>: gross, restricted to those two statuses.</p>`,
    tasks: [
      'In <code>RHN_PR_AM_INVOICES</code>, add a <b>Restricted Measure</b> <code>UNPAID_GROSS</code> on <code>GROSS_AMOUNT</code>.',
      'Save, deploy and compare gross and unpaid gross by region in the Data Preview.',
      'Answer the questions below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Click the canvas background, then + Restricted in the Measures section.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'A restricted measure takes another measure and keeps only the rows where an attribute has certain values. The rest of the report is not filtered.' },
      { label: 'Hint 3: the setup', cost: 25, text: 'Name UNPAID_GROSS, measure GROSS_AMOUNT, restrict by STATUS, values OPEN and OVERDUE.' },
    ],
    checks: [
      {
        type: 'rule', label: 'A restricted measure', ok: 'UNPAID_GROSS is a restricted measure.',
        test: ofType(AM_INV, 'UNPAID_GROSS', 'Restricted Measure', 'Use + Restricted: it restricts another measure to some values of an attribute.'),
      },
      {
        type: 'model', label: 'Unpaid gross by region', object: AM_INV, rows: [REGION], measures: ['UNPAID_GROSS'], expected: ref.unpaid(`'OPEN', 'OVERDUE'`),
        diagnose: [
          { sql: ref.unpaid(`'OPEN'`), message: 'UNPAID_GROSS has only the OPEN invoices. Overdue invoices are unpaid too.' },
          { sql: ref.unpaid(`'OVERDUE'`), message: 'UNPAID_GROSS has only the OVERDUE invoices. Open invoices are unpaid too.' },
          { sql: ref.unpaid(`'OPEN', 'OVERDUE'`, 'f.NET_AMOUNT'), message: 'UNPAID_GROSS restricts the net amount. Petra asked for gross: restrict GROSS_AMOUNT.' },
          { sql: ref.unpaid(`'PAID'`), message: 'UNPAID_GROSS has the PAID invoices, the opposite of unpaid.' },
        ],
      },
      { type: 'model', label: 'Gross is still complete', object: AM_INV, rows: [REGION], measures: ['GROSS_AMOUNT'], expected: ref.unpaid(`'OPEN', 'OVERDUE', 'PAID'`), ok: 'GROSS_AMOUNT still has all invoices.' },
      {
        type: 'question', id: 'north', label: 'Unpaid North',
        prompt: 'How much gross is unpaid in region NORTH?',
        options: ['About 51 thousand EUR', 'About 521 thousand EUR', 'About 631 thousand EUR', 'About 2.6 million EUR'],
        answer: 2,
        nudge: 'Not quite. REGION in the rows, UNPAID_GROSS in the measures. Open and overdue together.',
      },
      {
        type: 'question', id: 'filter', label: 'Restricted vs. filter',
        prompt: 'Why a restricted measure, and not a filter STATUS in (OPEN, OVERDUE) on the report?',
        options: [
          'A filter would apply to every measure: total gross would shrink to the unpaid part as well',
          'Filters are not possible on analytic models',
          'Restricted measures are faster than filters',
          'A filter cannot use two values',
        ],
        answer: 0,
        nudge: 'Not quite. Petra wants both numbers in one table. What would a filter do to the total gross?',
      },
    ],
    xp: 45,
    realTenant: `In a real tenant: <b>Measures › + › Restricted Measure</b>, pick the base measure and an expression on dimension values.
      A <b>Restricted Measure Variable</b> can let the report user choose the restriction at runtime.`,
    debrief: `<p>631 thousand unpaid in the North, of 2.6 million gross. Now I can see both at a glance.</p>
      <p><i>Calin adds:</i> The restriction lives inside the measure, so it works in any drill-down: by region, by tariff, by status.</p>`,
  },
  {
    id: 'c07-m04',
    chapter: 7,
    title: 'Year on request',
    from: CFO,
    ticket: `<p>Two more things for the board:</p>
      <ul>
        <li>When a story opens, it should <b>ask for a period</b> of invoice dates. Without a period it is meaningless, so it must not open without one.</li>
        <li>I want the <b>number of customers</b> we invoiced, by region and by commodity.</li>
      </ul>
      <p><i>Calin adds:</i> A filter variable <code>V_INVOICE_DATE</code> on <code>INVOICE_DATE</code>, as an interval, mandatory. And a
      <b>count distinct</b> measure <code>CUSTOMERS</code> on <code>CUSTOMER_ID</code>. Then try it: customers by commodity, and in total.</p>`,
    tasks: [
      'In <code>RHN_PR_AM_INVOICES</code>, add the filter variable <code>V_INVOICE_DATE</code>.',
      'Add the count distinct measure <code>CUSTOMERS</code>. Save and deploy.',
      'In the Data Preview, set the variable and look at <code>CUSTOMERS</code> by commodity and without rows. Answer the questions below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Variables and measures of the model are in the properties when you click the canvas background. Variable values are set left of the preview table.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'Count distinct counts different values, so a customer with power and gas counts once in the total. Adding up the rows of a count distinct can count customers twice.' },
      { label: 'Hint 3: the setup', cost: 25, text: 'Variable: Filter Variable, V_INVOICE_DATE, attribute INVOICE_DATE, Interval, Mandatory. Measure: + Count Distinct, CUSTOMERS, attribute CUSTOMER_ID. Year 2025: 2025-01-01 to 2025-12-31.' },
    ],
    checks: [
      { type: 'rule', label: 'Mandatory date range', ok: 'V_INVOICE_DATE asks for an invoice date range.', test: intervalVariable(AM_INV, 'V_INVOICE_DATE', 'INVOICE_DATE', true) },
      {
        type: 'rule', label: 'Count distinct customers', ok: 'CUSTOMERS counts different customer IDs.',
        test: (ctx) => {
          const f = model(ctx, AM_INV);
          if (!f.def) return f.problem;
          const m = measure(f.def, 'CUSTOMERS');
          if (!m) return 'The model has no measure CUSTOMERS yet.';
          if (m.type !== 'Count Distinct') return `CUSTOMERS is a ${m.type}. Use + Count Distinct.`;
          return m.attribute === 'CUSTOMER_ID' ? null : `CUSTOMERS counts ${m.attribute}. It should count CUSTOMER_ID.`;
        },
      },
      {
        type: 'model', label: 'Customers by region', object: AM_INV, rows: [REGION], measures: ['CUSTOMERS'], expected: ref.customersByRegion,
        diagnose: [{ sql: ref.invoicesByRegion, message: 'CUSTOMERS counts invoices, not different customers.' }],
      },
      {
        type: 'question', id: 'gross2025', label: 'Gross North 2025',
        prompt: 'With the variable set to 2025 (2025-01-01 to 2025-12-31): what is the gross amount in region NORTH?',
        options: ['About 871 thousand EUR', 'About 888 thousand EUR', 'About 1.04 million EUR', 'About 2.6 million EUR'],
        answer: 2,
        nudge: 'Not quite. Set both ends of the interval, REGION in the rows, GROSS_AMOUNT in the measures.',
      },
      {
        type: 'question', id: 'total', label: 'Customers in total',
        prompt: 'Over the whole period (2024-01-01 to 2026-12-31): CUSTOMERS by commodity shows 361 for gas and 817 for power. How many different customers were invoiced in total?',
        options: ['1,178: gas plus power', '848', '817', '900: all customers'],
        answer: 1,
        nudge: 'Not quite. Remove all rows in the preview, so CUSTOMERS is counted over everything at once.',
      },
    ],
    xp: 45,
    realTenant: `In a real tenant: click the canvas background, <b>+ Variable › Filter Variable</b>, choose the dimension or attribute,
      selection type and whether it is mandatory. SAP Analytics Cloud shows the variable as a prompt when the story opens.
      Count distinct is its own measure type, <b>Count Distinct</b>.`,
    debrief: `<p>848 customers, not 1,178. I would have added up the two rows myself.</p>
      <p><i>Calin adds:</i> Exactly why the count belongs in the model: 330 customers have power and gas. A count distinct is not
      additive, so it has to be counted again for every combination of rows, which only the model can do.</p>`,
  },
  {
    id: 'c07-m05',
    chapter: 7,
    title: 'One model per use case',
    from: NORTH_MGR,
    ticket: `<p>Markus Brandt, regional manager North. I plan grid capacity: I need <b>consumption in kWh</b> by region, grid area
      and commodity, for a period I choose. Customer names are none of my business.</p>
      <p><i>Calin adds:</i> Not in Petra's model: an analytic model has exactly one fact. Build a second, lean one,
      <code>RHN_PR_AM_CONSUMPTION</code> on <code>RHN_DS_F_CONSUMPTION</code>: measure <code>CONSUMPTION_KWH</code>, the grid area and tariff
      dimensions, no customer dimension, and an optional interval variable <code>V_READING_DATE</code> on <code>READING_DATE</code>.</p>`,
    tasks: [
      'Share <code>RHN_DS_F_CONSUMPTION</code> with <code>RHN_PRES</code> (its dimensions are shared already).',
      'Create <code>RHN_PR_AM_CONSUMPTION</code> on the consumption fact with the measure and the two dimensions.',
      'Add the optional variable <code>V_READING_DATE</code>, save and deploy.',
      'Look at 2025 by region and commodity in the Data Preview and answer the questions below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Same steps as the invoice model, from the New Analytic Model tile in RHN_PRES.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'Each fact gets its own model, built for one group of consumers. Optional variables can stay empty: then the model shows all dates.' },
      { label: 'Hint 3: the setup', cost: 25, text: 'Fact RHN_DS_F_CONSUMPTION, measure CONSUMPTION_KWH (SUM), dimensions RHN_DS_D_GRID_AREA and RHN_DS_D_TARIFF. Variable V_READING_DATE: READING_DATE, Interval, not mandatory.' },
    ],
    checks: [
      { type: 'rule', label: 'Consumption fact shared', ok: 'RHN_DS_F_CONSUMPTION is shared with RHN_PRES.', test: sharedWithPres([F_CONS, D_GRID, D_TARIFF]) },
      { type: 'rule', label: 'Customers stay in RHN_DSL', ok: 'The customer dimension is still not shared.', test: customerStaysHome },
      { type: 'rule', label: 'Built on the consumption fact', ok: 'RHN_PR_AM_CONSUMPTION is deployed on RHN_DS_F_CONSUMPTION.', test: onFact(AM_CONS, F_CONS) },
      { type: 'rule', label: 'kWh as measure', ok: 'CONSUMPTION_KWH, summed.', test: factMeasures(AM_CONS, ['CONSUMPTION_KWH']) },
      {
        type: 'rule', label: 'Grid area and tariff, no customers', ok: 'Grid area and tariff dimensions, no customer dimension.',
        test: dimensions(AM_CONS, [D_GRID, D_TARIFF], D_CUST, 'Markus plans capacity per grid area. Customer names stay out of a model the regional managers read.'),
      },
      { type: 'rule', label: 'Optional date range', ok: 'V_READING_DATE is an optional interval on READING_DATE.', test: intervalVariable(AM_CONS, 'V_READING_DATE', 'READING_DATE', false) },
      { type: 'model', label: 'kWh by region', object: AM_CONS, rows: [REGION], measures: ['CONSUMPTION_KWH'], expected: ref.kwhByRegion },
      {
        type: 'question', id: 'gas', label: 'Gas South 2025',
        prompt: 'How many kWh of gas were read in region SOUTH in 2025?',
        options: ['About 1.20 GWh', 'About 2.42 GWh', 'About 2.63 GWh', 'About 3.62 GWh'],
        answer: 1,
        nudge: 'Not quite. Set V_READING_DATE to 2025, REGION and COMMODITY in the rows.',
      },
      {
        type: 'question', id: 'lean', label: 'Why a second model',
        prompt: 'Why a second model instead of adding consumption to the invoice model?',
        options: [
          'A model can only have three dimensions',
          'An analytic model has exactly one fact source; and a lean model per use case shows each group of consumers only what it needs',
          'Two facts in one model would be slower',
          'The invoice model is locked once deployed',
        ],
        answer: 1,
        nudge: 'Not quite. How many fact sources does an analytic model have, and who reads each model?',
      },
    ],
    xp: 45,
    realTenant: `In a real tenant you build one analytic model per fact and use case, and give each group of consumers access to its model.
      Who sees which <b>rows</b> (Markus only the North) is the next topic: <b>data access controls</b> in chapter 8.`,
    debrief: `<p>Thank you, that is exactly my planning view. And I really do not need the customers.</p>
      <p><i>Calin adds:</i> One gap is left: Markus can still see the South. In chapter 8 the rows themselves get protected.</p>`,
  },
];
