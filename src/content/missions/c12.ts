import type { Mission, RuleContext } from '../../missions/types';
import type { TenantState } from '../../tenant';
import { findObject, objectKey, addVersion } from '../../repo';
import { REF_CONTRACTS_KEYS, M02_COLS, project } from './c05';
import { SAC_PLANNING } from '../../consumption';
import { packageStatus, presetPackage, validatePackage, validationMessages } from '../../transport';
import { findAsset } from '../../catalog';
import { values, netAs, NOTHING, DAC as DAC_VALUES } from './c08';

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
const CONTRACTS = 'RHN_HARM.RHN_HA_V_CONTRACTS';
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
];