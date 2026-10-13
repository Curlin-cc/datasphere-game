import type { Mission, RuleContext } from '../../missions/types';
import { effectiveAccess, templateLabel, GLOBAL_ADMIN, type Template } from '../../security';
import { PEOPLE } from '../people';

/**
 * Chapter 2, Users and roles. Scoped roles per function, least privilege for eight people,
 * joiner and mover handled by the space administrator.
 */

const CALIN = { name: 'Calin Mucea', role: 'Senior Data Architect, your mentor', initials: 'CM' };
const IT = { name: 'Jonas Becker', role: 'Head of IT, tenant owner', initials: 'JB' };

const IN = 'RHN_ENTRY';
const HA = 'RHN_DSL';
const REP = 'RHN_PRES';

/** Which function lives in which layer. One scoped role per function, scope = these spaces. */
const ROLE_PLAN: { template: Template; scope: string[] }[] = [
  { template: 'SPACE_ADMIN', scope: [HA, REP] },
  { template: 'INTEGRATOR', scope: [IN] },
  { template: 'MODELER', scope: [IN, HA, REP] },
  { template: 'VIEWER', scope: [IN, HA, REP] },
  { template: 'CONSUMER', scope: [REP] },
];

const list = (xs: string[]) => xs.join(', ');

function roleRule(template: Template, scope: string[]) {
  return ({ tenant }: RuleContext): string | null => {
    const roles = tenant.roles.filter((r) => r.template === template);
    const label = templateLabel(template);
    if (!roles.length) return `There is no scoped role based on ${label} yet.`;
    if (roles.length > 1) return `There are ${roles.length} roles based on ${label}: ${list(roles.map((r) => r.id))}. One role per function is enough; the spaces are chosen per user.`;
    const r = roles[0];
    if (!r.id.startsWith('RHN_')) return `${r.id} does not follow our naming: role names start with RHN_.`;
    const extra = r.scope.filter((s) => !scope.includes(s));
    const missing = scope.filter((s) => !r.scope.includes(s));
    if (extra.length) return `${r.id} reaches into ${list(extra)}. That function does not happen there, so the space does not belong in the scope.`;
    if (missing.length) return `${r.id} is missing ${list(missing)} in its scope. That function is needed there too.`;
    return null;
  };
}

/** Least privilege per person: what they need, and what is allowed on top without being too much. */
interface Need {
  admin?: boolean;
  need: string[]; // TEMPLATE@SPACE
  allow?: string[];
  why: string;
}

const NEEDS: Record<string, Need> = {
  jbecker: { admin: true, need: [], why: 'runs the tenant' },
  cmucea: {
    need: [`SPACE_ADMIN@${HA}`, `SPACE_ADMIN@${REP}`],
    allow: [`MODELER@${HA}`, `MODELER@${REP}`],
    why: 'runs the data & semantic and presentation spaces',
  },
  lhoffmann: { need: [`INTEGRATOR@${IN}`], allow: [`MODELER@${IN}`], why: 'loads data into the entry layer' },
  tschulz: { need: [`MODELER@${HA}`], why: 'builds views in the data & semantic layer' },
  swolf: { need: [`VIEWER@${IN}`, `VIEWER@${HA}`, `VIEWER@${REP}`], why: 'reads every layer without changing anything' },
  plindner: { need: [`CONSUMER@${REP}`], why: 'reads reports in SAP Analytics Cloud' },
  mbrandt: { need: [`CONSUMER@${REP}`], why: 'reads reports in SAP Analytics Cloud' },
  ademir: { need: [`CONSUMER@${REP}`], why: 'reads reports in SAP Analytics Cloud' },
};

const pretty = (pair: string) => {
  const [t, s] = pair.split('@');
  return `${templateLabel(t as Template)} in ${s}`;
};

function personRule(id: string, need: Need = NEEDS[id]) {
  const person = PEOPLE.find((p) => p.id === id)!;
  return ({ tenant }: RuleContext): string | null => {
    const { admin, pairs } = effectiveAccess(id, tenant.roles, tenant.assignments);
    const first = person.name.split(' ')[0];
    if (admin && !need.admin) return `${first} has ${GLOBAL_ADMIN}. That is the whole tenant; ${first} only ${need.why}.`;
    if (need.admin && !admin) return `${first} ${need.why} and needs the global role ${GLOBAL_ADMIN}.`;
    const missing = need.need.filter((p) => !pairs.has(p));
    if (missing.length) return `${first} ${need.why}, but is missing: ${list(missing.map(pretty))}.`;
    const extra = [...pairs].filter((p) => !need.need.includes(p) && !(need.allow ?? []).includes(p));
    if (extra.length) return `${first} has more than needed: ${list(extra.map(pretty))}. ${first} only ${need.why}.`;
    return null;
  };
}

export const CHAPTER_2: Mission[] = [
  {
    id: 'c02-m01',
    chapter: 2,
    title: 'One role per function',
    from: IT,
    ticket: `<p>The spaces are ready, now people need access. I do not want a separate role per person or per department.
      Please create <b>one scoped role per function</b>, named <code>RHN_&lt;FUNCTION&gt;</code>, for example <code>RHN_MODELER</code>.
      The scope of each role contains the spaces where that function happens:</p>
      <ul>
        <li><b>Space administration</b> happens in the spaces Calin's team runs: data &amp; semantic, and presentation.</li>
        <li><b>Integration</b> only where data lands.</li>
        <li><b>Modeling</b> and <b>viewing</b> can happen in every layer.</li>
        <li><b>Consuming</b> only where the reports come from.</li>
      </ul>
      <p>When I assign a role to someone, I pick which of the scope's spaces they get. So the scope is the maximum, not what everyone gets.</p>`,
    tasks: [
      'Open <b>Security</b> and read the role templates.',
      'Create one scoped role per template, with the scope from the ticket.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 5, text: 'Security > Roles. + › Create a Scoped Role asks for a name, a template and the spaces of the scope.' },
      { label: 'Hint 2: the concept', cost: 10, text: 'Five templates, five roles. Data lands in RHN_ENTRY, reports come from RHN_PRES, Calin runs RHN_DSL and RHN_PRES.' },
      { label: 'Hint 3: a skeleton', cost: 20, text: 'RHN_SPACE_ADMIN: DSL + PRES · RHN_INTEGRATOR: ENTRY · RHN_MODELER: all three · RHN_VIEWER: __ · RHN_CONSUMER: __' },
    ],
    checks: [
      ...ROLE_PLAN.map((p) => ({
        type: 'rule' as const,
        label: `${templateLabel(p.template)} role`,
        ok: `Scope: ${list(p.scope)}.`,
        test: roleRule(p.template, p.scope),
      })),
      {
        type: 'question',
        id: 'global',
        label: 'Global and scoped',
        prompt: 'What is the difference between DW Administrator and a scoped role?',
        options: [
          'DW Administrator applies to the whole tenant; a scoped role only applies to the spaces it is assigned for',
          'A scoped role is stronger, because it can be assigned for several spaces',
          'There is none, scoped roles are just renamed standard roles',
          'DW Administrator can only be assigned for one space',
        ],
        answer: 0,
        nudge: 'Not quite. Look at the role cards: which one is marked as global, and what does "scope" mean?',
      },
    ],
    xp: 30,
    realTenant: `In a real tenant: <b>Security</b> → <b>Roles</b> → create a <b>scoped role</b> from a template, add the spaces to its <b>scope</b>,
      then add users and pick their spaces. Roles can also be copied with <i>Save As</i>, which takes the privileges but not users or scopes.`,
    debrief: `<p>Five roles, and they will still be five when we have twenty spaces. That is the point of scoped roles: the role says <i>what</i>,
      the assignment says <i>where</i>.</p>`,
  },
  {
    id: 'c02-m02',
    chapter: 2,
    title: 'Eight people, least privilege',
    from: IT,
    ticket: `<p>Here is the list of people who need access. You find them under <b>Security → Users</b>, each with a short description of what they do.</p>
      <p>Give every one of them <b>exactly</b> what they need for their job. Not less, because then they call me. And not more, because the auditor will ask why.
      Lena asked to be made admin. Decide for yourself.</p>`,
    tasks: [
      'Open <b>Security → Users</b> and read what each person does.',
      'Assign roles to everyone, with the right spaces.',
      'Answer the question below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 5, text: 'Edit roles opens a dialog per person. Each role shows only the spaces of its scope.' },
      { label: 'Hint 2: the concept', cost: 10, text: 'Least privilege: the smallest set of rights that lets a person do their job. Reading reports in a BI tool needs Consumer; reading models in Datasphere needs Viewer.' },
      { label: 'Hint 3: a skeleton', cost: 20, text: 'Jonas: global admin · Calin: space admin DSL + PRES · Lena: integrator ENTRY · Tim: modeler __ · Sabine: viewer __ · Petra, Markus, Aylin: consumer __' },
    ],
    checks: [
      ...Object.keys(NEEDS).map((id) => {
        const p = PEOPLE.find((x) => x.id === id)!;
        return { type: 'rule' as const, label: p.name, ok: 'Exactly what the job needs.', test: personRule(id) };
      }),
      {
        type: 'question',
        id: 'lena',
        label: 'Lena wants admin',
        prompt: 'Why does Lena not get DW Administrator, even though it would save tickets?',
        options: [
          'Only one person may have DW Administrator',
          'Integrators are not allowed to have more than one role',
          'Every extra right is a risk: a mistake or a stolen login could then change the whole tenant, not just the loads',
          'DW Administrator cannot run loads',
        ],
        answer: 2,
        nudge: 'Not quite. Think about what could go wrong if her account is misused, and how big the damage could be.',
      },
    ],
    xp: 40,
    realTenant: `In a real tenant you assign roles under <b>Security → Users</b> or in the role itself. Larger companies map roles automatically
      from groups in their identity provider (SAML attributes) or provision users via SCIM. <b>Security → Authorization Overview</b> shows who can do what where.`,
    debrief: `<p>Clean. Sabine will like this: everyone can do their job, nobody can do more.</p>
      <p><i>Calin adds:</i> Notice that the regional managers now see all of RHN_PRES. Markus can read the figures of the south.
      Roles decide <i>what</i> someone may do; <i>which rows</i> they see is a different tool. We get there in chapter 8.</p>`,
  },
  {
    id: 'c02-m03',
    chapter: 2,
    title: 'Joiner and mover',
    from: CALIN,
    ticket: `<p>Two changes in my team:</p>
      <ul>
        <li><b>Nina Krüger</b> starts on Monday as a modeler in the data &amp; semantic layer.</li>
        <li><b>Tim Schulz</b> moves to the presentation side. From now on he builds analytic models and consumption views in the presentation layer and no longer works in the data &amp; semantic layer.</li>
      </ul>
      <p>Please set both up. And think about it: in a real tenant, who could do this without waiting for Jonas?</p>`,
    tasks: [
      'In <b>Security → Users</b>, give Nina what she needs.',
      'Change Tim\'s access: presentation yes, data &amp; semantic no.',
      'Answer the two questions below.',
    ],
    hints: [
      { label: 'Hint 1: where to look', cost: 5, text: 'Nina appears in the user list now. Tim keeps his role, only the spaces change.' },
      { label: 'Hint 2: the concept', cost: 10, text: 'A mover gets the new access and loses the old one. Forgetting the second part is how rights pile up over the years.' },
      { label: 'Hint 3: a skeleton', cost: 20, text: 'Nina: RHN_MODELER in ______. Tim: RHN_MODELER in ______ only.' },
    ],
    checks: [
      { type: 'rule', label: 'Nina Krüger', ok: 'Nina can start on Monday.', test: personRule('nkrueger', { need: [`MODELER@${HA}`], why: 'builds views in the data & semantic layer' }) },
      { type: 'rule', label: 'Tim Schulz', ok: 'Tim moved cleanly.', test: personRule('tschulz', { need: [`MODELER@${REP}`], why: 'builds models and consumption views in the presentation layer' }) },
      ...['jbecker', 'cmucea', 'lhoffmann', 'swolf', 'plindner', 'mbrandt', 'ademir'].map((id) => ({
        type: 'rule' as const,
        label: `${PEOPLE.find((p) => p.id === id)!.name} unchanged`,
        ok: 'Still exactly what the job needs.',
        test: personRule(id),
      })),
      {
        type: 'question',
        id: 'who',
        label: 'Who can do this',
        prompt: 'In a real tenant, who could add Nina to RHN_DSL without asking Jonas?',
        options: ['Tim, because he is a modeler in RHN_DSL', 'Calin, because he is space administrator of RHN_DSL', 'Sabine, because she can see all spaces', 'Nobody, only DW Administrator can change members'],
        answer: 1,
        nudge: 'Not quite. Look at the role cards: which template manages the members of a space?',
      },
      {
        type: 'question',
        id: 'rows',
        label: 'Rows, not roles',
        prompt: 'Markus should only see NORTH and EAST. Which tool restricts that?',
        options: ['A separate scoped role per region', 'A separate presentation space per region', 'A data access control on the facts he reads', 'Removing CONSUMER from Markus'],
        answer: 2,
        nudge: 'Not quite. Roles and spaces decide what someone may do and where. Which tool filters the rows inside the same view?',
      },
    ],
    xp: 35,
    realTenant: `In a real tenant a <b>space administrator</b> can manage the members of their own spaces in <b>Space Management → Users</b>,
      using the scoped roles the administrator gave them. Joiners, movers and leavers are often automated from HR systems through the identity provider.`,
    debrief: `<p>Good. Nina has her access, and Tim lost what he no longer needs. That second step is the one people forget.</p>
      <p>Our access concept stands. And you were right about the regional managers: separate spaces or roles per region would explode.
      We solve that with data access controls in chapter 8. Next up: getting the source data in properly, chapter 3.</p>`,
  },
];
