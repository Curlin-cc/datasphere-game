import { ctx } from '../ctx';
import { esc, icon, ICONS, setCrumb, spaceChip } from '../ui';
import { welcomeSpacesHtml, bindSpaceSearch } from './welcome';
import { registerLocation } from '../nav';

/**
 * Business Builder (excursion, Handbuch 7; design: Bild 8 "Welcome to the Business Builder (Deprecated)").
 * Read-only in the game: RHN_PRES holds the objects a predecessor built in 2023 (imported for reference). The player learns
 * the object chain (business entity → fact model → consumption model → perspective) and why new work uses the analytic model.
 * Versions and statuses: only "Ready to Use" is verified in the handbook (7.4.7); other details are simplified.
 */

export type BbType = 'Dimension' | 'Fact' | 'Fact Model' | 'Consumption Model' | 'Authorization Scenario';

interface BbObject {
  name: string;
  businessName: string;
  type: BbType;
  version: number;
  status: 'Ready to Use';
  changedOn: string;
  /** Tabs of the read-only editor: title → rows (label, value). */
  tabs: Record<string, [string, string][]>;
}

const LEGACY: BbObject[] = [
  {
    name: 'RHN_BE_CUSTOMER', businessName: 'Customer (2023)', type: 'Dimension', version: 2, status: 'Ready to Use', changedOn: 'May 4, 2023',
    tabs: {
      General: [['Source', 'RHN_PR_V_CUSTOMER_2023 (SQL View, Dimension)'], ['Key', 'CUSTOMER_ID'], ['Attributes', 'CUSTOMER_NAME, CITY, SEGMENT']],
      'Authorization Scenario': [['Scenarios', 'none']],
    },
  },
  {
    name: 'RHN_BE_INVOICE', businessName: 'Invoice (2023)', type: 'Fact', version: 3, status: 'Ready to Use', changedOn: 'Jun 12, 2023',
    tabs: {
      General: [['Source', 'RHN_PR_V_REVENUE_2023 (SQL View, semantic usage Analytical Dataset: deprecated, SAP recommends Fact)'],
        ['Measures', 'NET_AMOUNT, TAX_AMOUNT'], ['Attributes', 'INVOICE_DATE, STATUS, GRID_AREA']],
      Associations: [['Customer (2023)', 'CUSTOMER_ID → RHN_BE_CUSTOMER.CUSTOMER_ID']],
      'Authorization Scenario': [['Scenarios', 'RHN_AS_REGION (Region managers 2023)']],
    },
  },
  {
    name: 'RHN_AS_REGION', businessName: 'Region managers 2023', type: 'Authorization Scenario', version: 1, status: 'Ready to Use', changedOn: 'Jun 12, 2023',
    tabs: { General: [['Based on', 'a data access control of the Data Builder (RHN_PR_DAC_REGION_2023)'], ['Used by', 'RHN_BE_INVOICE']] },
  },
  {
    name: 'RHN_FM_REVENUE', businessName: 'Revenue', type: 'Fact Model', version: 1, status: 'Ready to Use', changedOn: 'Jun 14, 2023',
    tabs: {
      General: [['First fact source', 'RHN_BE_INVOICE, alias INV'], ['Measures', 'NET_AMOUNT, TAX_AMOUNT'], ['Calculated attributes', 'INVOICE_YEAR = YEAR(INVOICE_DATE)']],
      'Used by': [['Consumption models', 'RHN_CM_REVENUE']],
    },
  },
  {
    name: 'RHN_CM_REVENUE', businessName: 'Revenue Reporting', type: 'Consumption Model', version: 1, status: 'Ready to Use', changedOn: 'Jun 15, 2023',
    tabs: {
      General: [['Fact source', 'RHN_FM_REVENUE (fact model)'], ['Dimension sources', 'Customer (2023), through the association of the invoice']],
      Perspectives: [['Revenue by Region', 'NET_AMOUNT, TAX_AMOUNT by GRID_AREA and INVOICE_YEAR; story "Revenue 2023" in SAP Analytics Cloud (switched off)'],
        ['Open Items', 'NET_AMOUNT of invoices with STATUS OPEN or OVERDUE']],
    },
  },
];

let space: string | null = null;
let openName: string | null = null;
let tab = 'General';
registerLocation('business', { get: () => ({ space, openName }), set: (l: { space: string | null; openName: string | null }) => ({ space, openName } = l) });

export const businessReset = () => {
  space = null;
  openName = null;
};

export function renderBusiness(main: HTMLElement) {
  main.classList.toggle('bleed', !space);
  if (!space) return renderWelcome(main);
  return openName ? renderObject(main) : renderStart(main);
}

function renderWelcome(main: HTMLElement) {
  main.innerHTML = welcomeSpacesHtml({
    title: 'Welcome to the Business Builder (Deprecated)',
    text: 'Create business entities and fact models as the foundation for consumption models and protect them by creating authorization scenarios',
    emptyTitle: 'Select a space',
    emptyText: 'The Business Builder works on top of the Data Builder objects of a space. New models are built as analytic models in the Data Builder.',
    cardAttrs: (id) => `data-bb-space="${esc(id)}"`,
    gridId: 'bb-spaces',
  });
  bindSpaceSearch(main);
  main.querySelectorAll<HTMLButtonElement>('[data-bb-space]').forEach((b) => b.addEventListener('click', () => {
    space = b.dataset.bbSpace!;
    ctx.track(`bb-space:${space}`);
    renderBusiness(main);
  }));
}

const crumb = () => setCrumb(`<button type="button" class="space-switch" id="bb-switch" title="Change space">${spaceChip(space!)}${icon(ICONS.down)}</button>`
  + (openName ? `<span class="crumb-sep">/</span><span>${esc(openName)}</span>` : ''));

function renderStart(main: HTMLElement) {
  const objects = space === 'RHN_PRES' ? LEGACY : [];
  crumb();
  main.innerHTML = `
    <div class="tr-page">
      <h1 class="view-title">Business Builder <span class="chip warn">Deprecated</span></h1>
      <p class="view-lead">Objects of ${esc(space!)}. ${objects.length ? 'Built in 2023 by your predecessor and imported for reference; read-only in the game.' : 'This space has no Business Builder objects.'}</p>
      <section class="panel tr-panel">
        <div class="tr-toolbar">
          ${['New Dimension', 'New Fact', 'New Fact Model', 'New Consumption Model', 'New Authorization Scenario'].map((l) =>
            `<button class="btn small" type="button" disabled title="Deprecated: build an analytic model in the Data Builder instead">${icon(ICONS.plus)} ${l}</button>`).join('')}
          <span class="spacer"></span></div>
        <table class="grid" id="bb-list"><thead><tr><th>Business Name</th><th>Technical Name</th><th>Type</th><th>Version</th><th>Status</th><th>Changed On</th></tr></thead><tbody>
          ${objects.map((o) => `<tr><td><button class="link-btn" type="button" data-bb-open="${esc(o.name)}">${esc(o.businessName)}</button></td>
            <td class="mono">${esc(o.name)}</td><td>${esc(o.type)}</td><td>${o.version}</td><td><span class="tr-status ok">${icon(ICONS.check)}${o.status}</span></td><td>${esc(o.changedOn)}</td></tr>`).join('')
            || '<tr><td colspan="6" class="placeholder">No objects.</td></tr>'}
        </tbody></table>
      </section>
      <p class="note">The chain: <b>business entity</b> (dimension or fact, on a Data Builder view) → optional <b>fact model</b> → <b>consumption model</b>
        with <b>perspectives</b>, which SAP Analytics Cloud reads. Today one <b>analytic model</b> in the Data Builder does that job.</p>
    </div>`;
  main.querySelector('#bb-switch')?.addEventListener('click', () => { businessReset(); renderBusiness(main); });
  main.querySelectorAll<HTMLButtonElement>('[data-bb-open]').forEach((b) => b.addEventListener('click', () => {
    openName = b.dataset.bbOpen!;
    tab = 'General';
    ctx.track(`bb-open:${space}.${openName}`);
    renderBusiness(main);
  }));
}

function renderObject(main: HTMLElement) {
  const o = LEGACY.find((x) => x.name === openName)!;
  crumb();
  const tabs = Object.keys(o.tabs);
  if (!tabs.includes(tab)) tab = tabs[0];
  main.innerHTML = `
    <div class="tr-page">
      <div class="tr-edhead"><button class="btn small link" type="button" id="bb-back">${icon(ICONS.back)} ${esc(space!)}</button>
        <h1 class="view-title">${esc(o.businessName)}</h1><span class="chip">${esc(o.type)}</span>
        <span class="tr-status ok">${icon(ICONS.check)}Version ${o.version} · ${o.status}</span><span class="spacer"></span><span class="muted">read-only</span></div>
      <div class="tabs" role="tablist" id="bb-tabs">${tabs.map((x) => `<button type="button" role="tab" aria-selected="${x === tab}" data-bb-tab="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      <section class="panel tr-panel" id="bb-tab-body">
        <dl class="props-list">${o.tabs[tab].map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      </section>
    </div>`;
  main.querySelector('#bb-switch')?.addEventListener('click', () => { businessReset(); renderBusiness(main); });
  main.querySelector('#bb-back')!.addEventListener('click', () => {
    openName = null;
    renderBusiness(main);
  });
  main.querySelectorAll<HTMLButtonElement>('[data-bb-tab]').forEach((b) => b.addEventListener('click', () => {
    tab = b.dataset.bbTab!;
    ctx.track(`bb-tab:${o.name}:${tab}`);
    renderObject(main);
  }));
}
