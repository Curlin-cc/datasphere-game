import type { Mission, RuleContext } from '../../missions/types';
import type { TenantState } from '../../tenant';
import { findObject, objectKey, addVersion } from '../../repo';
import { REF_CONTRACTS_KEYS, M02_COLS, project } from './c05';
import { SAC_PLANNING } from '../../consumption';
import { packageById } from '../../onboarding';
import { packageStatus, presetPackage, validatePackage, validationMessages } from '../../transport';
import { findAsset } from '../../catalog';
import { values, netAs, NOTHING, DAC as DAC_VALUES } from './c08';
import { exec, runSql } from '../../db';
import { tableStatements } from '../../localtable';
import { isDeltaRun } from '../../transformflow';
import { ensureInbound } from './c10';

/**
 * Chapter 12, Excursions (Handbuch 12, 11, 8, 7): four short side trips after the main game, one per app the main game
 * only mentioned. Consumption (Expose for Consumption, database user for Power BI), Transport (package with dependencies,
 * export to test and production), Catalog (describe, tag, glossary term, publish), Business Builder (read the old chain,
 * decide what replaces it). Then two missions on hierarchies (Handbuch 6.5.3, 6.5.4, 9.3.4, 9.9 Ablauf B): a parent-child hierarchy
 * company → region → grid area, associated with the grid area dimension, and a data access control of type Hierarchy that
 * grants a region node instead of single grid areas. Parts the handbook marks as "nicht verifiziert" are simplified,
 * see docs/HANDBUCH_ABGLEICH.md.
 */

const JONAS = { name: 'Jonas Becker', role: 'Head of IT', initials: 'JB' };
const CALIN = { name: 'Calin Mucea', role: 'Senior Data Architect, your mentor', initials: 'CM' };
const SABINE = { name: 'Sabine Wolf', role: 'Internal Auditor', initials: 'SW' };
const CFO = { name: 'Petra Lindner', role: 'CFO, Stadtwerke Rheinau', initials: 'PL' };

const D_TARIFF = 'RHN_REP.RHN_REP_D_TARIFF';
const DF_MONTHLY = 'RHN_REP.RHN_REP_DF_MONTHLY';
const T_MONTHLY = 'RHN_REP.RHN_REP_T_MONTHLY_CONSUMPTION';
const MONTHLY_COLS = ['READING_MONTH', 'GRID_AREA', 'CONSUMPTION_KWH'];
/** One row per month and grid area (c12-m10), from the deployed harmonized views the flow reads (they passed chapter 5). */
const READINGS_X_CONTRACTS = `SELECT r.READING_DATE, c.GRID_AREA, r.CONSUMPTION_KWH
  FROM RHN_HARM.RHN_HA_V_METER_READINGS r JOIN RHN_HARM.RHN_HA_V_CONTRACTS c ON r.CONTRACT_ID = c.CONTRACT_ID`;
const REF_MONTHLY = `SELECT strftime(READING_DATE, '%Y-%m') AS READING_MONTH, GRID_AREA, SUM(CONSUMPTION_KWH) AS CONSUMPTION_KWH
  FROM (${READINGS_X_CONTRACTS}) f GROUP BY 1, 2`;
const CONTRACTS = 'RHN_HARM.RHN_HA_V_CONTRACTS';
/** c12-m11: bank payments with Delta Capture, loaded into harmonization by a transformation flow. */
const PAYMENTS = 'RHN_IN.RHN_IN_T_PAYMENTS';
const TF_PAYMENTS = 'RHN_HARM.RHN_HA_TF_PAYMENTS';
const T_PAYMENTS = 'RHN_HARM.RHN_HA_T_PAYMENTS';
const PAYMENT_COLS = ['PAYMENT_ID', 'INVOICE_ID', 'CONTRACT_ID', 'PAID_ON', 'AMOUNT'];
const REF_PAYMENTS = `SELECT p.PAYMENT_ID, p.INVOICE_ID, i.CONTRACT_ID, p.PAID_ON, p.AMOUNT
  FROM RHN_IN.RHN_IN_T_PAYMENTS p JOIN RHN_HARM.RHN_HA_V_INVOICES i ON p.INVOICE_ID = i.INVOICE_ID`;
/** Today's bank message (c12-m11): one new payment, one corrected amount, one returned direct debit. */
export const BANK = { add: ['PAY-0096', 'INV-4000080', '2026-07-15', '874.39'], fix: ['PAY-0012', '286.38'], drop: 'PAY-0007' };
/** c12-m12: the nightly chain of the harmonization layer, and today's new payment after Tim's clean-up. */
const NIGHTLY = 'RHN_HARM.RHN_HARM_TC_NIGHTLY';
export const NEW_PAYMENT = ['PAY-0097', 'INV-4000172', '2026-07-16', '994.69'];
const LOST_DAY = '2026-02-12';
const AM_CONS = 'RHN_REP.RHN_REP_AM_CONSUMPTION';
export const IN_PKG = 'RHN_IN_PKG_INBOUND';
export const HARM_PKG = 'RHN_HARM_PKG_HARMONIZED';

// ---------------------------------------------------------------- m01 consumption

const exposedIn = (t: TenantState, space: string) => t.objects.filter((o) => o.space === space && o.kind === 'SQL View' && o.deployed?.exposed);

function tariffsExposed({ tenant }: RuleContext): string | null {
  const o = findObject(tenant, D_TARIFF);
  if (!o?.deployed) return 'RHN_REP_D_TARIFF is not deployed.';
  if (o.deployed.exposed) return o.status === 'changes' ? 'RHN_REP_D_TARIFF has saved changes that are not deployed yet.' : null;
  return o.exposed ? 'Expose for Consumption is switched on in the saved version only. Deploy the view: tools read the deployed version.'
    : 'Power BI cannot see RHN_REP_D_TARIFF yet: switch on Expose for Consumption in its properties and deploy.';
}

function onlyTariffs({ tenant }: RuleContext): string | null {
  const extra = exposedIn(tenant, 'RHN_REP').filter((o) => objectKey(o) !== D_TARIFF);
  if (!extra.length) return null;
  const cust = extra.find((o) => o.name === 'RHN_REP_D_CUSTOMER');
  if (cust) return 'RHN_REP_D_CUSTOMER is exposed: every database user of RHN_REP can now read customer names and cities. Switch it off and deploy.';
  return `${extra.map((o) => o.name).join(', ')} ${extra.length === 1 ? 'is' : 'are'} exposed as well. Every database user of the space reads every exposed view: expose only what the ticket asks for.`;
}

function powerBiUser({ tenant }: RuleContext): string | null {
  const rep = tenant.dbUsers.filter((u) => u.space === 'RHN_REP');
  if (!rep.length) {
    return tenant.dbUsers.length
      ? `${tenant.dbUsers[0].space}#${tenant.dbUsers[0].suffix} belongs to ${tenant.dbUsers[0].space}. A database user reads the exposed views of its own space: create it in RHN_REP.`
      : 'There is no database user in RHN_REP yet: Space Management › RHN_REP › Database Access.';
  }
  if (rep.some((u) => u.read && !u.write)) return null;
  if (rep.some((u) => u.write)) return 'The Power BI user has write access: it could create and fill tables in its own Open SQL schema. The pricing team only reads.';
  return 'The database user in RHN_REP has no read access, so Power BI sees nothing.';
}

// ---------------------------------------------------------------- m02 transport

const boardPackage = (t: TenantState) => t.packages.find((p) => p.space === 'RHN_REP' && p.objects.includes(AM_CONS));

function packageValid({ tenant }: RuleContext): string | null {
  const p = boardPackage(tenant);
  if (!p) return 'No package in RHN_REP contains RHN_REP_AM_CONSUMPTION yet: Transport › Packages › Create.';
  const msgs = validationMessages(validatePackage(p, tenant), p);
  return msgs.length ? `${p.name}: ${msgs[0]}${msgs.length > 1 ? ` (and ${msgs.length - 1} more, see Validation)` : ''}` : null;
}

function packageExported({ tenant }: RuleContext): string | null {
  const p = boardPackage(tenant);
  if (!p) return 'Create the package first.';
  const st = packageStatus(p);
  if (st === 'Not Exported') return `${p.name} is not exported yet: Transport › Export.`;
  if (st === 'Changes to Export') return `${p.name} changed after its last export. Export it again so that the targets get this version.`;
  const missing = ['RHN-TEST', 'RHN-PROD'].filter((id) => !p.targets.includes(id));
  return missing.length ? `${p.name} is not shared with ${missing.join(' and ')}. Test first, then production: both need it.` : null;
}

function transportSetup(t: TenantState) {
  presetPackage(t, 'RHN_IN', IN_PKG, 'Inbound layer', 'Jonas Becker');
  presetPackage(t, 'RHN_HARM', HARM_PKG, 'Harmonized layer', 'Calin Mucea', [IN_PKG]);
}

// ---------------------------------------------------------------- m03 catalog

function assetReady({ tenant }: RuleContext): string | null {
  const a = findAsset(tenant, AM_CONS);
  if (!a) return 'Find RHN_REP_AM_CONSUMPTION in the catalog and open it.';
  if (a.description.length < 30) return 'The asset needs a description that tells people what it is and when to use it (a sentence or two).';
  if (!a.tags.includes('Subject Area/Consumption')) return 'Tag the asset with Subject Area › Consumption, so that a filter finds it.';
  return a.published ? null : 'The asset is not published: catalog users do not see it yet.';
}

function termReady({ tenant }: RuleContext): string | null {
  const a = findAsset(tenant, AM_CONS);
  const own = tenant.catalog.terms.filter((x) => x.createdBy === 'You');
  if (!own.length) return 'Create a glossary term for the consumption figure, with a definition.';
  const linked = own.filter((x) => a?.terms.includes(x.id));
  if (!linked.length) return 'Your glossary term is not linked to RHN_REP_AM_CONSUMPTION yet.';
  return linked.some((x) => x.published) ? null : `"${linked[0].name}" is not published. Terms are published on their own.`;
}

// ---------------------------------------------------------------- m05/m06 hierarchies

const H_GRID = 'RHN_REP.RHN_REP_H_GRID_AREA';
const D_GRID = 'RHN_REP.RHN_REP_D_GRID_AREA';
const T_NODES = 'RHN_REP.RHN_REP_T_PERMISSION_NODES';
const DAC_REGION = 'RHN_REP.RHN_REP_DAC_REGION';
const F_INV = 'RHN_REP.RHN_REP_F_INVOICES';
const AM_INV = 'RHN_REP.RHN_REP_AM_INVOICES';
const REGION = 'RHN_REP_D_GRID_AREA.REGION';

/** Company → regions → grid areas. Region nodes get a prefix: their codes NORTH and SOUTH are also grid area codes. */
const REF_HIERARCHY = `SELECT 'RHEINAU' AS NODE_ID, NULL AS PARENT_ID
  UNION ALL SELECT DISTINCT 'R_' || REGION, 'RHEINAU' FROM RHN_IN.GRID_AREAS
  UNION ALL SELECT GRID_AREA, 'R_' || REGION FROM RHN_IN.GRID_AREAS`;
const NO_PREFIX = `SELECT 'RHEINAU' AS NODE_ID, NULL AS PARENT_ID
  UNION ALL SELECT DISTINCT REGION, 'RHEINAU' FROM RHN_IN.GRID_AREAS
  UNION ALL SELECT GRID_AREA, REGION FROM RHN_IN.GRID_AREAS`;
const NODES: [string, string][] = [['PLINDNER', 'RHEINAU'], ['MBRANDT', 'R_NORTH'], ['ADEMIR', 'R_SOUTH']];

function hierarchySemantics({ tenant }: RuleContext): string | null {
  const d = findObject(tenant, H_GRID)?.deployed;
  if (!d) return 'RHN_REP_H_GRID_AREA is not deployed yet.';
  if (d.semanticUsage !== 'Hierarchy') return `RHN_REP_H_GRID_AREA is deployed as ${d.semanticUsage}. Set the semantic usage to Hierarchy and deploy.`;
  const roles = d.columnRoles ?? {};
  if (roles.PARENT_ID !== 'Parent') return 'PARENT_ID needs the role Parent in the deployed hierarchy.';
  return roles.NODE_ID === 'Child' ? null : 'NODE_ID needs the role Child in the deployed hierarchy.';
}

function dimensionHasHierarchy({ tenant }: RuleContext): string | null {
  const o = findObject(tenant, D_GRID);
  const a = (o?.deployed?.associations ?? []).find((x) => x.target === H_GRID);
  if (!a) {
    return (o?.associations ?? []).some((x) => x.target === H_GRID)
      ? 'The association to the hierarchy is only saved. Deploy RHN_REP_D_GRID_AREA.'
      : 'RHN_REP_D_GRID_AREA has no association to RHN_REP_H_GRID_AREA yet: the dimension does not know its hierarchy.';
  }
  return a.mapping.some((m) => m.from === 'GRID_AREA' && m.to === 'NODE_ID') ? null : 'Map GRID_AREA of the dimension to NODE_ID of the hierarchy.';
}

function regionControl({ tenant }: RuleContext): string | null {
  const o = findObject(tenant, DAC_REGION);
  if (!o) return 'There is no data access control RHN_REP_DAC_REGION in RHN_REP yet.';
  const d = o.deployed?.dac;
  if (!d) return 'RHN_REP_DAC_REGION is saved, but not deployed.';
  if (d.type !== 'Hierarchy') return 'RHN_REP_DAC_REGION has the criteria type Single Values. A region node only covers its grid areas with the type Hierarchy.';
  if (d.entity !== T_NODES) return `RHN_REP_DAC_REGION reads ${d.entity.split('.')[1] ?? 'nothing'}. Its permissions entity is RHN_REP_T_PERMISSION_NODES.`;
  if (d.identifier !== 'USER_ID' || d.criteria.join() !== 'NODE_ID') return 'Identifier USER_ID, criterion NODE_ID.';
  return d.hierarchy === H_GRID ? null : 'Choose RHN_REP_H_GRID_AREA as the hierarchy.';
}

function invoicesByRegion({ tenant }: RuleContext): string | null {
  const o = findObject(tenant, F_INV);
  const dacs = o?.deployed?.dacs ?? [];
  const a = dacs.find((x) => x.dac === DAC_REGION);
  if (!a) return (o?.dacs ?? []).some((x) => x.dac === DAC_REGION) ? 'The new control is only saved on RHN_REP_F_INVOICES. Deploy it.' : 'Assign RHN_REP_DAC_REGION to RHN_REP_F_INVOICES.';
  if (a.mapping.NODE_ID !== 'GRID_AREA') return 'Map the criterion NODE_ID to the column GRID_AREA of the fact: the leaves of the hierarchy are grid areas.';
  return dacs.some((x) => x.dac === DAC_VALUES)
    ? 'RHN_REP_DAC_GRID_AREA is still assigned as well. Two controls are combined with AND; remove the old one from the invoices so that the node table alone decides.'
    : null;
}

// ---------------------------------------------------------------- missions

export const CHAPTER_12: Mission[] = [
  {
    id: 'c12-m01',
    chapter: 12,
    title: 'Tariffs for Power BI',
    from: JONAS,
    ticket: `<p>Jonas Becker. The pricing team builds its tariff comparisons in <b>Power BI</b>. They want to read our tariff list
      directly from Datasphere over ODBC instead of getting an Excel file every month.</p>
      <p>Give them the tariff dimension of the reporting layer, read-only, and nothing else. Their tool logs on with a technical user.</p>`,
    tasks: [
      'Make <code>RHN_REP_D_TARIFF</code> readable for external tools, and only that view.',
      'Create a database user in <code>RHN_REP</code> for Power BI that can read, not write.',
      'Answer the questions below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'An external tool sees only views that are exposed for consumption, and only through a database user of the same space.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'The switch Expose for Consumption is in the properties of the view (then Deploy). Database users are in Space Management › RHN_REP › Database Access.' },
      { label: 'Hint 3: the options', cost: 25, text: 'Enable Read Access (SQL) only. Write access would give Power BI its own schema to create tables in.' },
    ],
    checks: [
      { type: 'rule', label: 'Tariffs exposed', ok: 'RHN_REP_D_TARIFF is exposed for consumption and deployed.', test: tariffsExposed },
      { type: 'rule', label: 'Nothing else exposed', ok: 'Only the tariffs are exposed in RHN_REP.', test: onlyTariffs },
      { type: 'rule', label: 'Database user', ok: 'A database user of RHN_REP with read access only.', test: powerBiUser },
      {
        type: 'question', id: 'odbc-model', label: 'The model over ODBC',
        prompt: 'Next month the pricing team also wants RHN_REP_AM_CONSUMPTION in Power BI through the same database user. What do you tell them?',
        options: [
          'Switch on Expose for Consumption for the model, then it works',
          'ODBC reads exposed views; analytic models are consumed by SAP Analytics Cloud, its Excel add-in or the analytic OData API',
          'Give the user write access',
          'Copy the model into a table',
        ],
        answer: 1,
        nudge: 'Not quite. Which objects can a database user read, and which tools read analytic models?',
      },
      {
        type: 'question', id: 'user-name', label: 'The logon',
        prompt: 'Under which name does Power BI log on to the database?',
        options: ['The space ID RHN_REP', 'The space ID, a # and your suffix, e.g. RHN_REP#PRICING', 'Jonas\' SAP user', 'DWC_TENANT_OWNER'],
        answer: 1,
        nudge: 'Not quite. Look at the column Database User Name in the Database Access dialog.',
      },
    ],
    xp: 40,
    realTenant: `Same steps in a real tenant: Expose for Consumption in the view's properties, deploy; Space Management › the space ›
      Database Access › Database Users › Create, with Enable Read Access (SQL). Host, port and the one-time password come from the user's
      details. Many tenants also need the client's IP address in System › Configuration › IP Allowlist (handbook: not verified).`,
    debrief: `<p>The pricing team is reading the tariffs live. No more monthly Excel.</p>
      <p><i>Calin adds:</i> Remember the rule: views go out over SQL, models go out through SAP Analytics Cloud. And every exposed view is
      readable for every database user of the space, so expose deliberately.</p>`,
  },
  {
    id: 'c12-m02',
    chapter: 12,
    title: 'Ship the board model',
    from: CALIN,
    ticket: `<p>The landscape is complete: next to this development tenant there is now <b>Test</b> and <b>Production</b>. The board model
      <code>RHN_REP_AM_CONSUMPTION</code> goes to both, with everything it needs.</p>
      <p>Jonas has packed the inbound layer (<code>${IN_PKG}</code>), I packed harmonization (<code>${HARM_PKG}</code>); both are exported.
      You pack the reporting part in a package of <code>RHN_REP</code>, validate it and export it to Test and Production.</p>`,
    tasks: [
      'Create a package in <code>RHN_REP</code> with <code>RHN_REP_AM_CONSUMPTION</code> and everything it needs.',
      'Validate it until it has no problems, and save it.',
      'Export it to Test and Production.',
      'Answer the questions below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Transport › Packages. The editor shows what each object needs; Validate lists what is missing.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'The model needs its fact and dimensions; the fact needs its associated dimensions and its data access control, which needs its permissions table. Views of RHN_HARM come from a required package.' },
      { label: 'Hint 3: the export', cost: 25, text: 'Transport › Export: select the package, Export, tick both target tenants.' },
    ],
    setup: transportSetup,
    checks: [
      { type: 'rule', label: 'A valid package', ok: 'The package contains the model and everything it needs.', test: packageValid },
      { type: 'rule', label: 'Exported', ok: 'Exported to Test and Production.', test: packageExported },
      {
        type: 'question', id: 'overwrite', label: 'Importing again',
        prompt: 'Next month you export version 1.1.0. In production, someone imports it with "Overwrite objects and data". What else changes there?',
        options: [
          'Nothing else',
          'The schedules of the imported objects in production are overwritten as well',
          'The users and roles of production',
          'The connections of production',
        ],
        answer: 1,
        nudge: 'Not quite. Open Transport › Import and read what the import option does.',
      },
      {
        type: 'question', id: 'order', label: 'The order',
        prompt: 'Production has not imported anything yet. In which order do the packages go in?',
        options: [
          'Yours first, the others when someone needs them',
          'Inbound, then harmonization, then yours: a package needs its required packages in the target first, or imported together',
          'Any order; the tenant sorts it out',
          'Only yours: required packages are copied automatically',
        ],
        answer: 1,
        nudge: 'Not quite. What does your package expect to find in the target?',
      },
    ],
    xp: 50,
    realTenant: `In a real tenant: Transport › Packages (space administrator) creates the package, modelers assign objects in their editors
      (field Package), Transport › Export shares it with target tenants through the Content Network, Transport › Import brings it in there,
      Transport › Monitor shows the jobs. Connections, users and roles are maintained in each tenant. SAP Cloud Transport Management adds
      routes and approvals (licence-dependent).`,
    debrief: `<p>Test imported it this morning and the board chart looks the same there. Production follows after the test sign-off.</p>
      <p>Base packages first, then what builds on them: that order is the whole secret of a calm go-live.</p>`,
  },
  {
    id: 'c12-m03',
    chapter: 12,
    title: 'One definition of consumption',
    from: SABINE,
    ticket: `<p>Sabine Wolf. In every audit I get three different "consumption" numbers from three departments. I want to look up in one
      place which model is the official one and what exactly it counts.</p>
      <p>Please put <code>RHN_REP_AM_CONSUMPTION</code> into the catalog with a proper description, tag it, and add a glossary term that
      defines the figure. Publish both, so that I find them.</p>`,
    tasks: [
      'Find <code>RHN_REP_AM_CONSUMPTION</code> in the catalog, describe it and tag it with Subject Area › Consumption.',
      'Create a glossary term that defines the consumption figure and link it to the asset.',
      'Publish the asset and the term.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Catalog & Marketplace › Search. Assets and glossary terms are both there; only published entries are visible to others.' },
      { label: 'Hint 2: the asset', cost: 15, text: 'Open the asset, write the description, tick the tag and the term, Save, then Publish.' },
      { label: 'Hint 3: the term', cost: 25, text: 'New Glossary Term: a name like "Energy consumption" and a definition (kWh from meter readings, without duplicates). Open it from the search results and Publish it.' },
    ],
    checks: [
      { type: 'rule', label: 'The asset', ok: 'Described, tagged and published.', test: assetReady },
      { type: 'rule', label: 'The glossary term', ok: 'Defined, linked and published.', test: termReady },
      {
        type: 'question', id: 'metadata', label: 'What Sabine sees',
        prompt: 'Sabine finds the asset in the catalog. Does she see the kWh figures there?',
        options: [
          'Yes, the catalog shows the data of published assets',
          'No: the catalog holds metadata. Reading the data still needs access to the space and passes the data access control',
          'Only if she is a catalog administrator',
          'Only the first 1,000 rows',
        ],
        answer: 1,
        nudge: 'Not quite. What did the catalog extract from the tenant?',
      },
    ],
    xp: 40,
    realTenant: `In a real tenant the catalog administrator connects source systems (in a Business Data Cloud formation SAP Datasphere is
      connected automatically), enriches the extracted assets with descriptions, tags from tag hierarchies, glossary terms and KPIs, and publishes
      them. Catalog users search and filter; the Marketplace adds data products (licence-dependent).`,
    debrief: `<p>Found it in ten seconds, definition included. Next audit, I will ask everyone to show me their number against this one.</p>
      <p><i>Calin adds:</i> A catalog is only as good as its descriptions. You just wrote the first one; the other 30 assets are waiting.</p>`,
  },
  {
    id: 'c12-m04',
    chapter: 12,
    title: 'The old revenue perspective',
    from: CFO,
    ticket: `<p>Petra Lindner. In 2023 I had a story "Revenue 2023" with revenue by region. IT says it ran on a <b>perspective</b> in
      something called the Business Builder, and that it still exists in RHN_REP.</p>
      <p>Should we bring it back? Please have a look and tell me what we would build today.</p>`,
    tasks: [
      'Open the Business Builder in <code>RHN_REP</code> and find the consumption model behind the old story.',
      'Look at its perspectives and follow its sources back to the business entities.',
      'Answer the questions below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Business Builder › RHN_REP. The type column tells you which object is the consumption model.' },
      { label: 'Hint 2: the chain', cost: 15, text: 'Consumption model → fact model → business entity (fact) → Data Builder view. Each object\'s General tab names its source.' },
    ],
    checks: [
      {
        type: 'rule', label: 'The consumption model', ok: 'You read the consumption model and its perspectives.',
        test: ({ events }) => (!events.has('bb-open:RHN_REP.RHN_CM_REVENUE') ? 'Open the consumption model in the Business Builder of RHN_REP.'
          : events.has('bb-tab:RHN_CM_REVENUE:Perspectives') ? null : 'Look at the tab Perspectives of the consumption model.'),
      },
      {
        type: 'question', id: 'chain', label: 'The chain',
        prompt: 'In which order do the objects build on each other, from the data to the story?',
        options: [
          'Perspective → consumption model → fact model → business entity',
          'Data Builder view → business entity → fact model → consumption model with perspective → story',
          'Business entity → perspective → fact model → consumption model',
          'Analytic model → business entity → perspective',
        ],
        answer: 1,
        nudge: 'Not quite. Start where the data is and follow the General tabs upwards.',
      },
      {
        type: 'question', id: 'today', label: 'What we build today',
        prompt: 'What do you recommend to Petra?',
        options: [
          'Rebuild the consumption model and perspective in the Business Builder',
          'Nothing new in the Business Builder: RHN_REP_AM_INVOICES already offers net and tax by region; a new story on the analytic model replaces the perspective',
          'Copy the fact model into RHN_HARM',
          'Expose the old perspective for Power BI',
        ],
        answer: 1,
        nudge: 'Not quite. Which app is labeled Deprecated, and what did you build in chapter 7?',
      },
      {
        type: 'question', id: 'ads', label: 'Analytical Dataset',
        prompt: 'The old invoice entity reads a view with semantic usage Analytical Dataset. What does SAP recommend for such views?',
        options: ['Keep them as they are', 'Switch the semantic usage to Fact', 'Switch them to Dimension', 'Delete them at once'],
        answer: 1,
        nudge: 'Not quite. Read the Source line of the invoice entity again.',
      },
    ],
    xp: 35,
    realTenant: `Current tenants show "Welcome to the Business Builder (Deprecated)". Existing business entities, fact models, consumption models
      and perspectives keep working, and SAP Analytics Cloud still reads perspectives, but new models are analytic models in the Data Builder.
      The semantic usage Analytical Dataset is deprecated; SAP recommends Fact.`,
    debrief: `<p>So the chart I want already exists in a newer form. Then please build me a new story on the invoice model, not a museum piece.</p>
      <p><i>Calin:</i> That was the last excursion. You have seen every app of the tenant now, and built most of them. Well done.</p>`,
  },
  {
    id: 'c12-m05',
    chapter: 12,
    title: 'Regions as a hierarchy',
    from: CALIN,
    ticket: `<p>The board thinks in a tree: <b>Stadtwerke Rheinau</b> → <b>regions</b> North and South → <b>grid areas</b>. Today the region is
      just a column. Build the tree as a parent-child <b>hierarchy</b> and attach it to the grid area dimension.</p>
      <p>The view <code>RHN_REP_H_GRID_AREA</code> in <code>RHN_REP</code> has one row per node with <code>NODE_ID</code> and <code>PARENT_ID</code>:
      the root <code>RHEINAU</code> without parent, one node per region, one node per grid area. Careful: the region codes NORTH and
      SOUTH are also grid area codes, and a node ID may appear only once. Give the regions the IDs <code>R_NORTH</code> and <code>R_SOUTH</code>.</p>`,
    tasks: [
      'Create the SQL view <code>RHN_REP_H_GRID_AREA</code> with <code>NODE_ID</code> and <code>PARENT_ID</code> (and a name if you like) from the harmonized grid areas.',
      'Set its semantic usage to <b>Hierarchy</b>: <code>PARENT_ID</code> is the Parent, <code>NODE_ID</code> the Child. Deploy.',
      'Associate <code>RHN_REP_D_GRID_AREA</code> with the hierarchy (GRID_AREA → NODE_ID) and deploy the dimension.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Data Builder › RHN_REP › New SQL View. RHN_HARM.RHN_HA_V_GRID_AREAS has GRID_AREA, GRID_AREA_NAME and REGION.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'Three groups of rows stacked with UNION ALL: the root, the regions (DISTINCT, prefixed with R_), the grid areas with their region node as parent.' },
      { label: 'Hint 3: a skeleton', cost: 25, text: "SELECT 'RHEINAU' AS NODE_ID, NULL AS PARENT_ID UNION ALL SELECT DISTINCT 'R_' || REGION, ______ FROM ______ UNION ALL SELECT GRID_AREA, ______ FROM ______" },
    ],
    checks: [
      {
        type: 'result', label: 'The tree', object: H_GRID, columns: ['NODE_ID', 'PARENT_ID'], expected: REF_HIERARCHY,
        diagnose: [{ sql: NO_PREFIX, message: 'NORTH and SOUTH appear twice: once as region, once as grid area. A node ID must be unique; prefix the regions (R_NORTH, R_SOUTH).' }],
        counts: { 5: 'Five nodes: the root or the regions are missing. The tree has 1 root, 2 regions and 4 grid areas.', 6: 'Six nodes: one level is incomplete. The tree has 1 root, 2 regions and 4 grid areas.' },
      },
      { type: 'rule', label: 'A hierarchy', ok: 'Deployed as Hierarchy: PARENT_ID is the Parent, NODE_ID the Child.', test: hierarchySemantics },
      { type: 'rule', label: 'Attached to the dimension', ok: 'RHN_REP_D_GRID_AREA is associated with the hierarchy.', test: dimensionHasHierarchy },
      {
        type: 'question', id: 'why-tree', label: 'Why a tree',
        prompt: 'The dimension already has a REGION column. What does the hierarchy add?',
        options: [
          'Nothing; it is only a different display',
          'Levels that can be drilled from company to region to grid area, and nodes that stand for everything below them, which access controls can use',
          'It makes the fact faster',
          'It replaces the dimension',
        ],
        answer: 1,
        nudge: 'Not quite. What does a node R_NORTH stand for, compared with the text NORTH in a column?',
      },
    ],
    xp: 50,
    realTenant: `In a real tenant: a SQL or graphical view with semantic usage <b>Hierarchy</b> (Parent and Child columns), or <b>Hierarchy with
      Directory</b> for several hierarchies in one entity; then an association from the dimension to the hierarchy. The analytic model and
      SAP Analytics Cloud offer the hierarchy for drill-down. The game does not show the drill-down.`,
    debrief: `<p>Seven nodes, one root. That is the tree the board draws on its slides.</p>
      <p>And now something useful: the next ticket uses the nodes for access.</p>`,
  },
  {
    id: 'c12-m06',
    chapter: 12,
    title: 'One row per region',
    from: { name: 'Sabine Wolf', role: 'Internal Auditor', initials: 'SW' },
    ticket: `<p>Sabine Wolf. The permissions table has eight rows for three people, and next year a fifth grid area comes to the North.
      Then someone has to remember to give Markus an extra row.</p>
      <p><i>Calin adds:</i> Grant nodes instead of values. A local table <code>RHN_REP_T_PERMISSION_NODES</code> (<code>USER_ID</code>, <code>NODE_ID</code>)
      with one row per person: Petra the whole company, Markus region North, Aylin region South. A data access control
      <code>RHN_REP_DAC_REGION</code> of type <b>Hierarchy</b> on it, assigned to <code>RHN_REP_F_INVOICES</code> instead of the old control.
      Same people, same numbers, three rows.</p>`,
    tasks: [
      'Create the table <code>RHN_REP_T_PERMISSION_NODES</code> with one row per user and node. Deploy it.',
      'Create the data access control <code>RHN_REP_DAC_REGION</code>: type Hierarchy, hierarchy <code>RHN_REP_H_GRID_AREA</code>. Deploy it.',
      'Assign it to <code>RHN_REP_F_INVOICES</code> in place of <code>RHN_REP_DAC_GRID_AREA</code> and deploy. Check the invoice model as MBRANDT.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'New Table and New Data Access Control on the start page of RHN_REP; the assignment is in the properties of the fact.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'A Hierarchy control resolves each node to itself and everything below it. The leaves are grid areas, so the criterion maps to GRID_AREA of the fact.' },
      { label: 'Hint 3: the rows', cost: 25, text: 'PLINDNER × RHEINAU, MBRANDT × R_NORTH, ADEMIR × R_SOUTH. Control: identifier USER_ID, criterion NODE_ID, hierarchy RHN_REP_H_GRID_AREA.' },
    ],
    checks: [
      { type: 'structure', label: 'The node table', space: 'RHN_REP', object: 'RHN_REP_T_PERMISSION_NODES', kind: 'Table', columns: ['USER_ID', 'NODE_ID'] },
      {
        type: 'result', label: 'One row per person', object: T_NODES, columns: ['USER_ID', 'NODE_ID'], expected: values(NODES).replace(/GRID_AREA/g, 'NODE_ID'),
        diagnose: [{ sql: values([['PLINDNER', 'RHEINAU'], ['MBRANDT', 'NORTH'], ['ADEMIR', 'SOUTH']]).replace(/GRID_AREA/g, 'NODE_ID'), message: 'NORTH and SOUTH are grid area nodes. Markus and Aylin need the region nodes R_NORTH and R_SOUTH.' }],
        counts: { 8: 'Eight rows: that is the old table with grid areas. One row per person, one node each.' },
      },
      { type: 'rule', label: 'The hierarchy control', ok: 'RHN_REP_DAC_REGION: Hierarchy on the node table.', test: regionControl },
      { type: 'rule', label: 'The invoices use it', ok: 'RHN_REP_F_INVOICES is protected by the region control alone.', test: invoicesByRegion },
      { type: 'model', label: 'Markus sees the North', object: AM_INV, rows: [REGION], measures: ['NET_AMOUNT'], asUser: 'MBRANDT', expected: netAs('MBRANDT'), ok: 'MBRANDT sees region NORTH only.' },
      { type: 'model', label: 'Aylin sees the South', object: AM_INV, rows: [REGION], measures: ['NET_AMOUNT'], asUser: 'ADEMIR', expected: netAs('ADEMIR'), ok: 'ADEMIR sees region SOUTH only.' },
      { type: 'model', label: 'Petra sees everything', object: AM_INV, rows: [REGION], measures: ['NET_AMOUNT'], asUser: 'PLINDNER', expected: netAs('PLINDNER'), ok: 'PLINDNER sees both regions.' },
      { type: 'model', label: 'Nina sees nothing', object: AM_INV, rows: [REGION], measures: ['NET_AMOUNT'], asUser: 'NKRUEGER', expected: NOTHING, ok: 'NKRUEGER has no node and sees no rows.' },
      {
        type: 'question', id: 'new-area', label: 'A fifth grid area',
        prompt: 'Next year grid area CENTRAL joins region North. What has to change so that Markus sees it?',
        options: [
          'A new row MBRANDT × CENTRAL in the node table',
          'Only the hierarchy: CENTRAL gets R_NORTH as parent; Markus\'s entry R_NORTH covers it',
          'A new data access control',
          'Nothing at all, not even the hierarchy',
        ],
        answer: 1,
        nudge: 'Not quite. What does the control resolve R_NORTH to?',
      },
    ],
    xp: 55,
    realTenant: `In a real tenant: Data Builder › New Data Access Control, criteria type <b>Hierarchy</b>, the permissions entity with user IDs and nodes,
      the hierarchy view; assigned in the view's properties (Handbuch 9.9, Ablauf B). A user sees the rows of his nodes and all their descendants;
      without an entry he sees nothing.`,
    debrief: `<p>Three rows I can read in ten seconds, and next year nobody has to remember Markus. That is an audit finding closed.</p>
      <p><i>Calin adds:</i> The consumption fact still uses the old control. Migrating it is the same three clicks, whenever Sabine retires the old table.</p>`,
  },
  {
    id: 'c12-m07',
    chapter: 12,
    title: 'Roll it back',
    from: CFO,
    ticket: `<p>Petra Lindner. This morning's board figures show 91 contracts fewer than yesterday, and the revenue of region West dropped.
      Nobody told me about a change.</p>
      <p><i>Calin adds:</i> Tim deployed a "clean-up" of <code>RHN_HA_V_CONTRACTS</code> yesterday afternoon. Do not rewrite the view from memory:
      every deployment is a version. Open the <b>version history</b>, compare Tim's version with the one before, <b>restore</b> the good one
      and deploy it. Everything built on the view gets the contracts back.</p>`,
    tasks: [
      'In <code>RHN_HARM</code>, open <code>RHN_HA_V_CONTRACTS</code> and press <b>Versions</b> in the toolbar.',
      'Look at Tim\'s version and the one before it: what did he change?',
      '<b>Restore</b> the version before Tim\'s change and <b>Deploy</b> it.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Versions is next to Details in the toolbar of the SQL view editor. Selecting a version shows it compared with the deployed one.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'Restore puts the old version into the editor (status Changes to Deploy). It runs only after you deploy it, and the deployment becomes a new version.' },
    ],
    setup: (t) => {
      const v = findObject(t, CONTRACTS);
      if (!v?.deployed?.sql || v.deployed.sql.includes('T. Schulz')) return;
      const day = 24 * 3600_000;
      const good = v.deployed.sql.trim().replace(/;\s*$/, '');
      // History before Tim: the version that runs now, deployed by you (older saves have no versions yet).
      if (v.versions?.at(-1)?.sql !== v.deployed.sql) addVersion(v, 'DATA_ARCHITECT', new Date(Date.now() - 3 * day).toISOString());
      const tim = `-- T. Schulz: legacy contracts are migrated to S/4 anyway, so only S4U contracts are kept\nSELECT x.*\nFROM (\n${good}\n) x\nWHERE x.SRC_SYS_ID = 'S4U'`;
      v.sql = tim;
      v.deployed.sql = tim;
      v.status = 'deployed';
      v.changedAt = new Date(Date.now() - 0.7 * day).toISOString();
      addVersion(v, 'TSCHULZ', v.changedAt);
    },
    checks: [
      {
        type: 'rule', label: 'You used the version history', ok: 'The good version was restored from the history, not typed again.',
        test: ({ events }) => ([...events].some((e) => e.startsWith(`version-restore:${CONTRACTS}:`))
          ? null : 'Open Versions in the editor of RHN_HA_V_CONTRACTS, select the version before Tim\'s and press Restore.'),
      },
      {
        type: 'result', label: 'All contracts are back', object: CONTRACTS, columns: M02_COLS, expected: project(M02_COLS, REF_CONTRACTS_KEYS),
        counts: { 1087: 'Still only the S4U contracts: Tim\'s version is deployed. Restore the version before it, then Deploy.' },
      },
      {
        type: 'question', id: 'production', label: 'And in production?',
        prompt: 'Tim deployed the same change in the production tenant last week through a transport. Does restoring the version here fix production too?',
        options: [
          'Yes, the version history is shared by all tenants',
          'No: versions exist only inside one tenant. The restored view has to reach production by transport again (export a new package version, import it there)',
          'Yes, as soon as you deploy here',
          'No, production can never get the old version back',
        ],
        answer: 1,
        nudge: 'Not quite. Where does the version history live, and how do changes travel between tenants?',
      },
    ],
    review: ['no_select_star'],
    xp: 45,
    realTenant: `In a real tenant: open the object in the Data Builder, <b>Versions</b> (version history) in the toolbar; each deployment is a version.
      You can view and restore an earlier version (Handbuch 11.4.9, SAP: "Reviewing and Restoring Object Versions"). Whether a restored version must be deployed
      again and how many versions are kept is not verified; the game asks for a deployment and keeps the last 15.`,
    debrief: `<p>1,178 contracts again, and region West is back where it was. Thank you, and please tell me before the next clean-up.</p>
      <p><i>Calin adds:</i> Tim's version is still in the history, so nothing is lost. Next time a change like that goes through the test tenant first.</p>`,
  },
  {
    id: 'c12-m08',
    chapter: 12,
    title: 'A feed for the planners',
    from: JONAS,
    ticket: `<p>Jonas here. The planning team runs its own SAP Analytics Cloud tenant and wants our grid areas there, refreshed every week through an
      <b>import connection</b> that reads the <b>OData API</b>. They gave me the redirect URI of their tenant:</p>
      <p><code>${SAC_PLANNING.redirectUri}</code></p>
      <p><i>Calin adds:</i> Two things on our side. The grid area dimension <code>RHN_REP_D_GRID_AREA</code> must be readable from outside, and the
      planners need an <b>OAuth client</b> to sign in with (System › Administration › App Integration). Choose its purpose with care: OData reads
      data in the name of a person. Then test the call before you send them client ID and secret.</p>`,
    tasks: [
      'Make <code>RHN_REP_D_GRID_AREA</code> readable for external tools and deploy it.',
      'System › Administration › <b>App Integration</b>: add an OAuth client for the planners with the right purpose and their redirect URI.',
      '<b>Test</b> the client: read <code>RHN_REP.RHN_REP_D_GRID_AREA</code> the way their import connection would, until it answers with HTTP 200.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Expose for Consumption is in the properties of the view, as in the first excursion. OAuth clients: System in the side navigation, Administration, tab App Integration.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'An import connection signs in as a planner (Authorization Code) and comes back to the redirect URI. A client without a user (Client Credentials) cannot read data through OData.' },
    ],
    checks: [
      {
        type: 'rule', label: 'The grid areas are exposed', ok: 'RHN_REP_D_GRID_AREA is deployed with Expose for Consumption on.',
        test: ({ tenant }) => (findObject(tenant, D_GRID)?.deployed?.exposed ? null
          : 'RHN_REP_D_GRID_AREA is not exposed in its deployed version. Switch on Expose for Consumption and deploy.'),
      },
      {
        type: 'rule', label: 'An OAuth client for the planners', ok: 'Interactive Usage, Authorization Code, with the redirect URI of the planning tenant.',
        test: ({ tenant }) => {
          const c = tenant.oauthClients.find((x) => x.redirectUri.trim() === SAC_PLANNING.redirectUri);
          if (c) return c.purpose === 'Interactive Usage' ? null : `${c.name} has purpose ${c.purpose}. OData reads data in a user's name: Interactive Usage.`;
          const other = tenant.oauthClients.find((x) => x.purpose === 'Interactive Usage');
          if (other) return `${other.name} has the redirect URI ${other.redirectUri || '(none)'}. It must be exactly the one in the ticket, or the sign-in never comes back.`;
          return tenant.oauthClients.length ? 'None of the clients has purpose Interactive Usage.' : 'There is no OAuth client yet. System › Administration › App Integration › Add a New OAuth Client.';
        },
      },
      {
        type: 'rule', label: 'The call works', ok: 'The test call read the grid areas with HTTP 200.',
        test: ({ events }) => ([...events].some((e) => e.startsWith('odata-test:') && e.endsWith(`:${D_GRID}:200`)) ? null
          : 'Use Test on the client and read RHN_REP.RHN_REP_D_GRID_AREA until the answer is HTTP 200. The message of a failed call says what is missing.'),
      },
      {
        type: 'question', id: 'purpose', label: 'Why this purpose',
        prompt: 'Why does the planners\' client need the purpose Interactive Usage and not API Access?',
        options: [
          'API Access is only for SAP-internal tools',
          'OData consumption needs a signed-in user (Authorization Code with a redirect URI); API Access signs in as a program without a user (Client Credentials)',
          'Interactive Usage tokens never expire',
          'Interactive Usage bypasses Expose for Consumption',
        ],
        answer: 1,
        nudge: 'Not quite. Who is signed in when the import connection reads the data?',
      },
    ],
    xp: 45,
    realTenant: `In a real tenant: expose the view and deploy (Handbuch 12.3); System › Administration › App Integration › Add a New OAuth Client
      with purpose <b>Interactive Usage</b> and the redirect URI of the tool (Handbuch 12.7.3, SAP KBA 3563695); give client ID, secret, authorization and
      token URL to the tool. Field names, the secret shown once and the service URL structure are simplified (not verified in the handbook).`,
    debrief: `<p>Thanks, client ID and secret are on their way to the planners. They see what they would see in our tenant, nothing more.</p>
      <p><i>Calin adds:</i> One client per tool, so you can switch one off without breaking the others. And the secret goes in a password manager,
      not in an email.</p>`,
  },
  {
    id: 'c12-m09',
    chapter: 12,
    title: 'What SAP already built',
    from: CALIN,
    ticket: `<p>Before we model billing for the second supplier we take over next year, I want to see what SAP already ships for utilities.</p>
      <p>Import the business content package <b>Utilities – Billing Analysis</b> from the <b>Content Network</b> (app Semantic Onboarding).
      It brings its own space, so our spaces stay as they are. Deploy what can be deployed.</p>
      <p>Then read the <b>import log</b> and look at the billing fact <code>SAP_UTIL_V_BILLING</code> in the Repository Explorer: what does it read, and why
      does it not run yet?</p>`,
    tasks: [
      'Semantic Onboarding › Content Network › Business Content: open <b>Utilities – Billing Analysis</b>, read its prerequisites and import it.',
      'Open Import Logs and read the messages of your import.',
      'Find <code>SAP_UTIL_V_BILLING</code> in the Repository Explorer and open it: what does it read?',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Semantic Onboarding is in the Apps group of the side navigation. Open Import Logs is on the right of the SAP Systems section.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'A content package brings definitions, not data. Remote tables read through a connection of their own space, and the package cannot bring yours.' },
    ],
    checks: [
      {
        type: 'rule', label: 'The package is imported', ok: 'Space SAP_UTIL with the remote tables and views of the package.',
        test: ({ tenant }) => {
          if (!tenant.importLogs.some((l) => l.pkg === 'SAP_UTIL_BILLING' && l.lines.some((x) => x.text.startsWith('Import of'))))
            return 'Utilities – Billing Analysis is not imported yet. Semantic Onboarding › Content Network › Business Content.';
          const missing = packageById('SAP_UTIL_BILLING')!.objects.filter((o) => !findObject(tenant, `SAP_UTIL.${o.name}`));
          return missing.length ? `Missing after the import: ${missing.map((o) => o.name).join(', ')}. Import the package again with Overwrite on.` : null;
        },
      },
      {
        type: 'rule', label: 'You read the import log', ok: 'The log says what worked and what did not.',
        test: ({ events }) => (events.has('import-log-open:SAP_UTIL_BILLING') ? null : 'Open Import Logs on the Semantic Onboarding page and click your import to read its messages.'),
      },
      {
        type: 'rule', label: 'You looked at the fact', ok: 'SAP_UTIL_V_BILLING reads the remote tables of the package.',
        test: ({ events }) => (events.has('repository-open:SAP_UTIL.SAP_UTIL_V_BILLING') ? null : 'Search for SAP_UTIL_V_BILLING in the Repository Explorer and open it from there.'),
      },
      {
        type: 'question', id: 'not-running', label: 'Why it does not run',
        prompt: 'The remote tables are there, but the two views were not deployed. What is missing, and what is the next step?',
        options: [
          'The package is broken; ask SAP for a new version',
          'The connection SAP_S4H in space SAP_UTIL: the package brings definitions, not data or connections. Create and validate the connection, then deploy the views',
          'Our RHN_IN space has to be shared with SAP_UTIL',
          'Nothing: content packages are only meant to be read, never deployed',
        ],
        answer: 1,
        nudge: 'Not quite. Read the warnings of the remote tables in the import log.',
      },
    ],
    xp: 40,
    realTenant: `In a real tenant: Semantic Onboarding › Content Network, choose the package, read its description and prerequisites, import it
      (Handbuch 8.6.2). Then check the created spaces and objects and add the connections (Handbuch chapter 5). Package names and import options in the
      game are invented or simplified; the handbook marks the options as not verified.`,
    debrief: `<p>Good: five objects we did not have to build, in a space of their own, and we know exactly what is missing to run them.</p>
      <p><i>Calin adds:</i> I will compare their billing fact with ours. Where SAP models something better, we copy the idea into our own spaces;
      we do not build our reports on top of content that a re-import could overwrite.</p>`,
  },
  {
    id: 'c12-m10',
    chapter: 12,
    title: 'A table for Excel',
    from: { name: 'Sabine Wolf', role: 'Internal Auditor', initials: 'SW' },
    ticket: `<p>Sabine again. For the yearly audit I compare our consumption with the grid operator's figures in Excel, every month.
      I need a plain <b>table</b>, not a model: <code>RHN_REP_T_MONTHLY_CONSUMPTION</code> with <code>READING_MONTH</code> (text YYYY-MM),
      <code>GRID_AREA</code> and <code>CONSUMPTION_KWH</code> (sum), one row per month and grid area.</p>
      <p><i>Calin adds:</i> A table that gets filled is a job for a <b>data flow</b>: <code>RHN_REP_DF_MONTHLY</code> in <code>RHN_REP</code>, reading the
      harmonized readings joined with the contracts, aggregating, and writing the target. It will run every night. Run it at least twice before you
      tell Sabine it is ready: the numbers must be the same after the second night.</p>`,
    tasks: [
      'In <code>RHN_REP</code>, create a <b>New Data Flow</b>: source <code>RHN_HA_V_METER_READINGS</code>, join <code>RHN_HA_V_CONTRACTS</code> on <code>CONTRACT_ID</code>.',
      'Projection: <code>READING_MONTH</code>, <code>GRID_AREA</code>, <code>CONSUMPTION_KWH</code>; Aggregation: sum of the kWh. Target <code>RHN_REP_T_MONTHLY_CONSUMPTION</code> with the right mode.',
      'Name it <code>RHN_REP_DF_MONTHLY</code>, save, deploy, and <b>Run</b> it twice.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'New Data Flow is a tile of the Data Builder in RHN_REP. Click the nodes of the canvas to set them up; the SQL below shows what the flow runs.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'Every night the flow delivers the complete result again. Which target mode makes the second run replace the first instead of adding to it?' },
    ],
    checks: [
      {
        type: 'rule', label: 'The data flow', ok: 'RHN_REP_DF_MONTHLY is deployed and writes RHN_REP_T_MONTHLY_CONSUMPTION with mode Truncate.',
        test: ({ tenant }) => {
          const f = findObject(tenant, DF_MONTHLY);
          if (!f) return 'There is no data flow RHN_REP_DF_MONTHLY in RHN_REP yet.';
          const d = f.deployed?.dataflow;
          if (!d) return 'RHN_REP_DF_MONTHLY is not deployed.';
          if (f.status === 'changes') return 'RHN_REP_DF_MONTHLY has saved changes that are not deployed.';
          if (d.target.table !== 'RHN_REP_T_MONTHLY_CONSUMPTION') return `The flow writes ${d.target.table}; Sabine needs RHN_REP_T_MONTHLY_CONSUMPTION.`;
          if (d.target.mode === 'Append') return 'Mode Append: every night adds the complete result again, and the second night doubles every month. The flow delivers everything each time: Truncate.';
          if (d.target.mode === 'Delete') return 'Mode Delete removes rows from the target; it does not load. The flow delivers everything each time: Truncate.';
          return null;
        },
      },
      {
        type: 'rule', label: 'Two nights', ok: 'The flow ran twice without errors.',
        test: ({ tenant }) => (tenant.runs.filter((r) => r.object === DF_MONTHLY && r.status === 'Completed').length >= 2 ? null
          : 'Run the deployed flow twice (button Run in its editor, or in the Data Integration Monitor › Flows), as two nights would.'),
      },
      {
        type: 'result', label: 'The table for Excel', object: T_MONTHLY, columns: MONTHLY_COLS, expected: REF_MONTHLY,
        counts: { 116: 'Every month is in the table twice: the runs added up. Switch the target to Truncate, deploy and run again.' },
        diagnose: [
          { sql: `${REF_MONTHLY} UNION ALL ${REF_MONTHLY}`, message: 'Every month is in the table twice: the runs added up. Switch the target to Truncate, deploy and run again.' },
          { sql: `SELECT strftime(READING_DATE, '%Y-%m') AS READING_MONTH, GRID_AREA, CONSUMPTION_KWH FROM (${READINGS_X_CONTRACTS}) f`, message: 'One row per reading: the aggregation is missing. Sum CONSUMPTION_KWH per month and grid area.' },
        ],
      },
      {
        type: 'question', id: 'append', label: 'When Append is right',
        prompt: 'When would Append be the right mode for a flow like this?',
        options: [
          'Never; Truncate is always safer',
          'When each run delivers only new rows, for example only last month, so the table grows by one month per run',
          'When the target table has no key',
          'When the flow has an aggregation',
        ],
        answer: 1,
        nudge: 'Not quite. Append adds what the run delivers. When is adding exactly right?',
      },
    ],
    xp: 50,
    realTenant: `In a real tenant: Data Builder › New Data Flow, drag the sources onto the canvas, connect Join, Projection and Aggregation, and a target
      table with mode Append, Truncate or Delete (Handbuch 6.7.1). Deploy, then Run or schedule it; runs are in the Data Integration Monitor.
      The game shows the canvas as a fixed row of nodes, and Union and Script only explain themselves.`,
    debrief: `<p>Same numbers after two nights, one row per month and grid area. That goes straight into my audit workbook.</p>
      <p><i>Calin adds:</i> Put the flow into a task chain of RHN_REP after the nightly load, and Sabine's table is always one day old at most.</p>`,
  },
  {
    id: 'c12-m11',
    chapter: 12,
    title: 'Only what changed',
    from: CFO,
    ticket: `<p>Since February, Accounts Receivable types the bank's payment advice into <code>RHN_IN_T_PAYMENTS</code> in <code>RHN_IN</code>
      (one row per payment, key <code>PAYMENT_ID</code>). For my cash report I need the payments in harmonization with their contract:
      <code>RHN_HA_T_PAYMENTS</code> with <code>PAYMENT_ID</code>, <code>INVOICE_ID</code>, <code>CONTRACT_ID</code>, <code>PAID_ON</code> and <code>AMOUNT</code>, every night.</p>
      <p><i>Calin adds:</i> The table will grow to thousands of payments while only a handful change each day. Do not reload everything every night:
      a <b>transformation flow</b> <code>RHN_HA_TF_PAYMENTS</code> in <code>RHN_HARM</code> with load type <b>Initial and Delta</b>. For that the source has to record its
      changes, so switch on <b>Delta Capture</b> first. Run the initial load, then enter today's bank message and run again: the second run must process the changes only.</p>
      <p><b>Today's bank message</b></p>
      <ul><li>New payment <code>PAY-0096</code>: invoice <code>INV-4000080</code>, paid on <code>2026-07-15</code>, <code>874.39</code></li>
        <li>Correction: <code>PAY-0012</code> was a partial payment, the amount is <code>286.38</code></li>
        <li>Returned direct debit: <code>PAY-0007</code> did not go through. Delete the row.</li></ul>`,
    tasks: [
      'In <code>RHN_IN</code>, open <code>RHN_IN_T_PAYMENTS</code>, switch on <b>Delta Capture</b> and deploy the table.',
      'In <code>RHN_HARM</code>, create a <b>New Transformation Flow</b>: a SQL view transform that adds <code>CONTRACT_ID</code> from <code>RHN_HA_V_INVOICES</code>, target <code>RHN_HA_T_PAYMENTS</code>, load type <b>Initial and Delta</b>.',
      'Name it <code>RHN_HA_TF_PAYMENTS</code>, deploy it and <b>Run</b> it: the initial load.',
      'Enter today\'s bank message in the Data Editor of <code>RHN_IN_T_PAYMENTS</code>, deploy the table, and <b>Run</b> the flow again.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Delta Capture is a switch in the properties of the table editor. New Transformation Flow is a tile of the Data Builder; the load type sits in the flow\'s own properties.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'Order matters: Delta Capture records only changes deployed after it is on, and the initial run loads everything up to then. The bank message belongs after the initial run, otherwise the second run finds nothing new.' },
    ],
    setup: (t) => {
      if (findObject(t, PAYMENTS)) return;
      const table = {
        columns: [{ name: 'PAYMENT_ID', type: 'String' as const, key: true }, { name: 'INVOICE_ID', type: 'String' as const, key: false },
          { name: 'PAID_ON', type: 'Date' as const, key: false }, { name: 'AMOUNT', type: 'Decimal' as const, key: false }],
        rows: [] as string[][],
      };
      t.objects.push({ space: 'RHN_IN', name: 'RHN_IN_T_PAYMENTS', kind: 'Local Table', businessName: 'Bank payments', semanticUsage: 'Relational Dataset',
        table, status: 'deployed', changedAt: new Date(Date.now() - 2 * 24 * 3600_000).toISOString(), deployed: { businessName: 'Bank payments', table: structuredClone(table) } });
      if (!t.shares.some((x) => x.object === PAYMENTS && x.to === 'RHN_HARM')) t.shares.push({ object: PAYMENTS, to: 'RHN_HARM' });
    },
    setupAsync: async (t) => {
      const o = findObject(t, PAYMENTS);
      if (!o?.table || o.table.rows.length) return;
      // The payments of the invoices paid from 12 February 2026 on: PAY-0001 … PAY-0095.
      const res = await runSql(`SELECT INVOICE_ID, CAST(PAID_DATE AS VARCHAR), CAST(NET_AMOUNT + TAX_AMOUNT AS VARCHAR)
        FROM RHN_IN.BILLING_INVOICES WHERE PAID_DATE >= DATE '2026-02-12' ORDER BY PAID_DATE, INVOICE_ID`);
      o.table.rows = res.rows.map((r, i) => [`PAY-${String(i + 1).padStart(4, '0')}`, String(r[0]), String(r[1]), String(r[2])]);
      o.deployed = { businessName: o.businessName, table: structuredClone(o.table) };
      for (const stmt of tableStatements(o.space, o.name, o.table)) await exec(stmt);
    },
    checks: [
      {
        type: 'rule', label: 'The source records its changes', ok: 'RHN_IN_T_PAYMENTS is deployed with Delta Capture.',
        test: ({ tenant }) => {
          const o = findObject(tenant, PAYMENTS);
          if (!o) return 'RHN_IN_T_PAYMENTS is missing in RHN_IN.';
          if (o.deployed?.table?.deltaCapture) return null;
          return o.table?.deltaCapture ? 'Delta Capture is switched on but not deployed. Deploy RHN_IN_T_PAYMENTS.'
            : 'RHN_IN_T_PAYMENTS records no changes. Open it in RHN_IN, switch on Delta Capture in its properties and deploy.';
        },
      },
      {
        type: 'rule', label: 'The transformation flow', ok: 'RHN_HA_TF_PAYMENTS is deployed in RHN_HARM and loads RHN_HA_T_PAYMENTS by delta.',
        test: ({ tenant }) => {
          const f = findObject(tenant, TF_PAYMENTS);
          if (!f) {
            const elsewhere = tenant.objects.find((x) => x.name === 'RHN_HA_TF_PAYMENTS');
            return elsewhere ? `RHN_HA_TF_PAYMENTS is in ${elsewhere.space}; it belongs in RHN_HARM, the harmonization layer.` : 'There is no transformation flow RHN_HA_TF_PAYMENTS in RHN_HARM yet.';
          }
          const d = f.deployed?.transform;
          if (!d) return 'RHN_HA_TF_PAYMENTS is not deployed.';
          if (f.status === 'changes') return 'RHN_HA_TF_PAYMENTS has saved changes that are not deployed.';
          if (d.target !== 'RHN_HA_T_PAYMENTS') return `The flow writes ${d.target}; Petra needs RHN_HA_T_PAYMENTS.`;
          if (d.loadType !== 'Initial and Delta') return 'Load type Initial Only: every night reads all payments again and replaces the target. Switch to Initial and Delta, so later runs read only the changes.';
          return null;
        },
      },
      {
        type: 'rule', label: 'Today\'s bank message', ok: 'PAY-0096 added, PAY-0012 corrected, PAY-0007 deleted, and deployed.',
        test: ({ tenant }) => {
          const o = findObject(tenant, PAYMENTS);
          const rows = o?.deployed?.table?.rows ?? [];
          const byId = new Map(rows.map((r) => [r[0].trim(), r]));
          const saved = new Map((o?.table?.rows ?? []).map((r) => [r[0].trim(), r]));
          const ok = (m: Map<string, string[]>) => {
            const add = m.get(BANK.add[0]);
            if (!add) return `${BANK.add[0]} is missing: add the new payment (invoice ${BANK.add[1]}, ${BANK.add[2]}, ${BANK.add[3]}).`;
            if (add[1].trim() !== BANK.add[1] || add[2].trim() !== BANK.add[2] || Number(add[3]) !== Number(BANK.add[3])) return `${BANK.add[0]} has other values than the bank message (${BANK.add.slice(1).join(', ')}).`;
            if (Number(m.get(BANK.fix[0])?.[3]) !== Number(BANK.fix[1])) return `${BANK.fix[0]} still has the old amount; the bank says ${BANK.fix[1]}.`;
            if (m.has(BANK.drop)) return `${BANK.drop} is still there: the direct debit was returned, delete the row.`;
            return null;
          };
          const live = ok(byId);
          if (!live) return null;
          return ok(saved) ? live : 'The bank message is in the Data Editor but not deployed. Deploy RHN_IN_T_PAYMENTS: only deployed changes reach the delta table.';
        },
      },
      {
        type: 'rule', label: 'The second night', ok: 'After the initial load, the last run processed only the changes.',
        test: ({ tenant }) => {
          const runs = tenant.runs.filter((r) => r.object === TF_PAYMENTS && r.status === 'Completed');
          if (!runs.length) return 'The flow has not run yet. Deploy it, then Run: the first run is the initial load.';
          const last = runs[0];
          if (!isDeltaRun(last.messages)) {
            return last.messages[0]?.startsWith('Initial load') ? 'The last run was the initial load. Enter the bank message, deploy the table, then Run the flow again: that run reads only the changes.'
              : 'The last run was a full load (Initial Only). With Initial and Delta deployed, the first run loads everything and the next one reads only the changes.';
          }
          if (!last.records) return 'The last run found no change records. Either nothing changed since the run before, or the changes went in before the initial load, which already had them. Change rows after an initial load, deploy the table, Run again.';
          return null;
        },
      },
      {
        type: 'result', label: 'The payments in harmonization', object: T_PAYMENTS, columns: PAYMENT_COLS, expected: REF_PAYMENTS,
      },
      {
        type: 'question', id: 'delta-run', label: 'What the second night reads',
        prompt: 'The flow runs every night with Initial and Delta. What does the run of the second night read from RHN_IN_T_PAYMENTS?',
        options: [
          'All payments again, but it writes only the changed ones',
          'The change records since the last run, including deletions, and only the rows of those keys',
          'Only new payments: corrections and deletions wait for the next full load',
          'Nothing, unless someone resets the delta first',
        ],
        answer: 1,
        nudge: 'Not quite. Look at the messages of your second run: how many records did it read, and of which kinds?',
      },
    ],
    xp: 55,
    realTenant: `In a real tenant: switch on <i>Delta Capture</i> in the table editor of a local table (Handbuch 6.4.2); the system adds the delta table
      with <i>Change_Type</i> and <i>Change_Date</i>. Then Data Builder › New Transformation Flow, model the view transform graphically or in SQL,
      add the target table and set the load type <i>Initial and Delta</i> (6.7.3, 6.12.4). Deploy, run, and add it to a task chain; runs are in the
      Data Integration Monitor › Flows, where the delta can be reset. Simplified in the game: SQL only, one delta source per flow, Initial Only replaces
      the target, and a changed flow starts over with an initial load.`,
    debrief: `<p>95 payments, the returned direct debit is gone and the partial payment shows the right amount. The second run touched three keys, not all of them.</p>
      <p><i>Calin adds:</i> Add the flow to the nightly chain of RHN_HARM after the inbound load. When the table holds a hundred thousand payments, the night still processes only the day's changes.</p>`,
  },
  {
    id: 'c12-m12',
    chapter: 12,
    title: 'The night shift',
    from: { name: 'Lena Hoffmann', role: 'Integration Engineer', initials: 'LH' },
    ticket: `<p>Petra's cash report is short this morning: <code>RHN_HA_T_PAYMENTS</code> lacks all payments of 12 February. Tim tested something in the
      Data Editor of the target table yesterday and deleted that day. The delta run of the flow brings in today's new payment, but not the lost ones.</p>
      <p>Please repair the table, and make sure the flow runs every night: it should be a step of our nightly chain <code>RHN_HARM_TC_NIGHTLY</code>
      (I get the failure emails).</p>
      <p><i>Calin adds:</i> A delta only carries what changed in the <b>source</b>. Nothing changed there; the target was damaged. In the Data Integration Monitor
      you can <b>reset the delta</b> of a transformation flow: the next run is an initial load again, and the delta continues from there.</p>`,
    tasks: [
      'In the <b>Data Integration Monitor › Flows</b> of <code>RHN_HARM</code>, select <code>RHN_HA_TF_PAYMENTS</code>, press <b>Reset Delta</b> and <b>Run</b> it.',
      'Open <code>RHN_HARM_TC_NIGHTLY</code>, add <code>RHN_HA_TF_PAYMENTS</code> as its last step and deploy the chain.',
      '<b>Run</b> the chain once, as tonight would.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 10, text: 'Monitoring › Data Integration › Flows, space RHN_HARM: the flow\'s detail has Run and Reset Delta. The chain is a Task Chain of RHN_HARM in the Data Builder; Add Step lists transformation flows too.' },
      { label: 'Hint 2: the concept', cost: 15, text: 'A delta run reads the change records of the source since the last run. The lost rows never changed in the source, so only a full read brings them back: reset, then run.' },
    ],
    setup: (t) => {
      ensureInbound(t);
      const target = findObject(t, T_PAYMENTS);
      const src = findObject(t, PAYMENTS);
      const flow = findObject(t, TF_PAYMENTS);
      if (!target?.table || !src?.table || !src.deployed?.table?.deltaCapture || !flow?.deployed) return;
      // Tim's clean-up in the target: the payments of one day are gone.
      const iPaid = target.table.columns.findIndex((c) => c.name === 'PAID_ON');
      if (iPaid >= 0) {
        target.table.rows = target.table.rows.filter((r) => r[iPaid] !== LOST_DAY);
        if (target.deployed?.table) target.deployed.table.rows = target.table.rows.map((r) => [...r]);
      }
      // Today's bank message: one new payment, recorded by Delta Capture.
      if (!src.table.rows.some((r) => r[0] === NEW_PAYMENT[0])) {
        src.table.rows.push([...NEW_PAYMENT]);
        src.deployed.table.rows.push([...NEW_PAYMENT]);
        const log = (src.deltaLog ??= []);
        log.push({ seq: (log.at(-1)?.seq ?? 0) + 1, type: 'I', at: new Date().toISOString(), row: [...NEW_PAYMENT] });
      }
      // The flow had already done its initial load (c12-m11); if not, the next run is the initial load anyway.
      if (flow.tfPointer === undefined) flow.tfPointer = Math.max(0, ...(src.deltaLog ?? []).slice(0, -1).map((r) => r.seq));
    },
    setupAsync: async (t) => {
      for (const key of [PAYMENTS, T_PAYMENTS]) {
        const o = findObject(t, key);
        if (o?.deployed?.table) for (const stmt of tableStatements(o.space, o.name, o.deployed.table)) await exec(stmt);
      }
    },
    checks: [
      {
        type: 'rule', label: 'All payments are back', ok: 'RHN_HA_T_PAYMENTS holds every payment of the source again.',
        test: ({ tenant }) => {
          const src = findObject(tenant, PAYMENTS)?.deployed?.table?.rows ?? [];
          const tgt = findObject(tenant, T_PAYMENTS)?.deployed?.table?.rows;
          if (!tgt) return 'RHN_HA_T_PAYMENTS is missing in RHN_HARM. Solve "Only what changed" first.';
          const have = new Set(tgt.map((r) => r[0]));
          const missing = src.filter((r) => !have.has(r[0])).length;
          if (!missing) return null;
          return missing === 1 && !have.has(NEW_PAYMENT[0])
            ? `Today's payment ${NEW_PAYMENT[0]} is not in the target yet. Run the flow.`
            : `${missing} payments are still missing in RHN_HA_T_PAYMENTS. A delta run only brings what changed in the source; reset the delta, then run.`;
        },
      },
      {
        type: 'rule', label: 'Reset, not rebuilt', ok: 'The delta was reset in the monitor, and the next run was an initial load.',
        test: ({ tenant, events }) => {
          if (![...events].some((e) => e === `tf-reset:${TF_PAYMENTS}`)) return 'Reset the delta of RHN_HA_TF_PAYMENTS in the Data Integration Monitor › Flows (RHN_HARM), then run it.';
          const f = findObject(tenant, TF_PAYMENTS);
          if (f?.deployed?.transform?.loadType !== 'Initial and Delta') return 'RHN_HA_TF_PAYMENTS no longer loads by delta. Keep Initial and Delta: tonight should process the changes only.';
          return tenant.runs.some((r) => r.object === TF_PAYMENTS && r.status === 'Completed' && r.messages[0]?.startsWith('Initial load'))
            ? null : 'After the reset, run the flow (or the chain): that run is the initial load.';
        },
      },
      {
        type: 'rule', label: 'A step of the night', ok: 'RHN_HARM_TC_NIGHTLY runs the flow, deployed.',
        test: ({ tenant }) => {
          const c = findObject(tenant, NIGHTLY);
          if (!c) return 'RHN_HARM_TC_NIGHTLY is missing in RHN_HARM.';
          if (!c.chain?.steps.some((s) => s.object === TF_PAYMENTS)) return 'Add RHN_HA_TF_PAYMENTS as a step of RHN_HARM_TC_NIGHTLY (Add Step › Transformation Flow).';
          if (!c.deployed?.chain?.steps.some((s) => s.object === TF_PAYMENTS)) return 'The step is saved but the chain is not deployed. Deploy RHN_HARM_TC_NIGHTLY.';
          if (c.status === 'changes') return 'RHN_HARM_TC_NIGHTLY has saved changes that are not deployed.';
          const steps = c.deployed.chain.steps;
          if (steps[steps.length - 1]?.object !== TF_PAYMENTS) return 'Put the flow at the end of the chain: the steps before it load the inbound data of the night.';
          return null;
        },
      },
      {
        type: 'rule', label: 'The chain ran', ok: 'The chain ran with the flow as a step, without errors.',
        test: ({ tenant }) => {
          const r = tenant.runs.find((x) => x.object === NIGHTLY && x.status !== 'Running');
          const step = r?.steps?.find((s) => s.object === TF_PAYMENTS);
          if (!r || !step) return 'Run RHN_HARM_TC_NIGHTLY once after deploying it with the new step.';
          if (r.status === 'Failed') return `The last run of RHN_HARM_TC_NIGHTLY failed: ${r.steps?.find((s) => s.status === 'Failed')?.message ?? 'see the Task Chains monitor'}.`;
          return step.status === 'Completed' ? null : 'The flow step did not complete. Open the run in the Task Chains monitor.';
        },
      },
      {
        type: 'result', label: 'The payments in harmonization', object: T_PAYMENTS, columns: PAYMENT_COLS, expected: REF_PAYMENTS,
      },
      {
        type: 'question', id: 'why-reset', label: 'Why the delta did not repair it',
        prompt: 'Why did the delta run of the morning bring PAY-0097 but not the payments Tim deleted?',
        options: [
          'Delta runs ignore deletions',
          'The delta reads the change records of the source; the lost payments never changed in the source, only the target was damaged',
          'The delta pointer was broken by Tim and had to be repaired',
          'Delta runs process at most one change per night',
        ],
        answer: 1,
        nudge: 'Not quite. Where does a delta run look for changes, and where did Tim delete the rows?',
      },
    ],
    xp: 50,
    realTenant: `In a real tenant: Data Integration Monitor › Flows, select the transformation flow; the monitor lets you reset the delta so the next run loads
      everything again (Handbuch 6.7.3, name of the action not verified; the game calls it Reset Delta). Task chains run transformation flows as steps (6.8);
      the chain's schedule then runs the flow every night.`,
    debrief: `<p>The report is complete again, and tonight the flow runs after the inbound load. If it fails, I get the email.</p>
      <p><i>Calin adds:</i> Targets of a flow are no place for manual edits. If you need test data, copy the table; and if a target is damaged, a delta reset is the repair.</p>`,
  },
];