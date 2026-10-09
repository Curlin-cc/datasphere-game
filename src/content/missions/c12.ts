import type { Mission, RuleContext } from '../../missions/types';
import type { TenantState } from '../../tenant';
import { findObject, objectKey } from '../../repo';
import { packageStatus, presetPackage, validatePackage, validationMessages } from '../../transport';
import { findAsset } from '../../catalog';

/**
 * Chapter 12, Excursions (Handbuch 12, 11, 8, 7): four short side trips after the main game, one per app the main game
 * only mentioned. Consumption (Expose for Consumption, database user for Power BI), Transport (package with dependencies,
 * export to test and production), Catalog (describe, tag, glossary term, publish), Business Builder (read the old chain,
 * decide what replaces it). Parts the handbook marks as "nicht verifiziert" are simplified, see docs/HANDBUCH_ABGLEICH.md.
 */

const JONAS = { name: 'Jonas Becker', role: 'Head of IT', initials: 'JB' };
const CALIN = { name: 'Calin Mucea', role: 'Senior Data Architect, your mentor', initials: 'CM' };
const SABINE = { name: 'Sabine Wolf', role: 'Internal Auditor', initials: 'SW' };
const CFO = { name: 'Petra Lindner', role: 'CFO, Stadtwerke Rheinau', initials: 'PL' };

const D_TARIFF = 'RHN_REP.RHN_REP_D_TARIFF';
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
];
