import { ctx } from '../ctx';
import { CAPACITY } from '../tenant';
import { esc, icon, openDialog, readUiPref, writeUiPref } from '../ui';

/**
 * Settings dialog and user menu, as in the real tenant (Bild 20): the avatar in the shellbar opens a menu with
 * Settings, About and Sign Out. Settings lists its areas on the left (User Account, Appearance, Home Screen,
 * Language & Region, Notifications, UI Settings, Privacy, Authorized Consent Settings; Bild 25, 29, 43–45) and shows the chosen one
 * on the right; Close at the bottom.
 * In the game, Appearance (light/dark theme) and UI Settings (business or technical names) work; the rest explains.
 */

type Section = 'account' | 'appearance' | 'home' | 'language' | 'notifications' | 'ui' | 'privacy' | 'consent';
let section: Section = 'account';

export type ThemeChoice = 'light' | 'dark' | 'system';
const THEMES: { id: ThemeChoice; label: string }[] = [
  { id: 'light', label: 'Horizon' },
  { id: 'dark', label: 'Horizon Dark (game)' },
  { id: 'system', label: 'Use operating system setting (game)' },
];

export function themeChoice(): ThemeChoice {
  const t = readUiPref('dsg-theme');
  return t === 'light' || t === 'dark' ? t : 'system';
}
function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === 'system') delete root.dataset.theme;
  else root.dataset.theme = choice;
  writeUiPref('dsg-theme', choice === 'system' ? '' : choice);
}

const ICON = {
  account: '<circle cx="6.5" cy="5" r="2.5"/><path d="M2 13.5a4.5 4.5 0 019 0M11 9h3.5M11 11.5h3.5"/>',
  appearance: '<path d="M8 2a6 6 0 100 12c1 0 1.3-.8 1-1.6-.4-.9.2-1.9 1.2-1.9H12a2 2 0 002-2A6 6 0 008 2z"/><circle cx="5" cy="7" r=".8"/><circle cx="8" cy="5" r=".8"/><circle cx="11" cy="7" r=".8"/>',
  home: '<path d="M2.5 7.5L8 3l5.5 4.5V13H2.5z"/><path d="M6.5 13V9.5h3V13"/>',
  language: '<circle cx="8" cy="8" r="5.5"/><path d="M2.5 8h11M8 2.5c1.6 1.6 2.4 3.4 2.4 5.5S9.6 11.9 8 13.5M8 2.5C6.4 4.1 5.6 5.9 5.6 8s.8 3.9 2.4 5.5"/>',
  notifications: '<path d="M3 6.5h2.5L11 3.5v9l-5.5-3H3z"/><path d="M5.5 9.5l1 3.5"/>',
  ui: '<path d="M2.5 4h4M9.5 4h4M2.5 8h7M12.5 8h1M2.5 12h2M7.5 12h6"/><circle cx="8" cy="4" r="1.5"/><circle cx="11" cy="8" r="1.5"/><circle cx="6" cy="12" r="1.5"/>',
  consent: '<rect x="3.5" y="3" width="9" height="11" rx="1"/><path d="M6 2.5h4v1.5H6zM6 9l1.5 1.5L10.5 7"/>',
  privacy: '<circle cx="6" cy="5" r="2.5"/><path d="M1.5 13.5a4.5 4.5 0 017.5-3.4"/><rect x="10" y="10" width="4.5" height="4" rx=".8"/><path d="M11 10V8.8a1.25 1.25 0 012.5 0V10"/>',
};

const nameChoice = () => (readUiPref('dsg-names') === 'technical' ? 'technical' : 'business');

function sections(): { id: Section; label: string; sub: string }[] {
  return [
    { id: 'account', label: 'User Account', sub: 'Data Architect' },
    { id: 'appearance', label: 'Appearance', sub: THEMES.find((t) => t.id === themeChoice())!.label },
    { id: 'home', label: 'Home Screen', sub: 'Manage cards for your home screen' },
    { id: 'language', label: 'Language & Region', sub: 'English | 24 h | MMM d, yyyy | 1,234.56' },
    { id: 'notifications', label: 'Notifications', sub: '' },
    { id: 'ui', label: 'UI Settings', sub: nameChoice() === 'technical' ? 'Show Technical Name' : 'Show Business Name' },
    { id: 'privacy', label: 'Privacy', sub: '' },
    { id: 'consent', label: 'Authorized Consent Settings', sub: 'Not Authorized' },
  ];
}

function pane(id: Section) {
  const field = (label: string, value: string) => `<label class="set-field"><span>${esc(label)}</span><input value="${esc(value)}" readonly></label>`;
  switch (id) {
    case 'account':
      return `<div class="set-hero"><span class="avatar big" aria-hidden="true">DA</span><div><b>Data Architect</b><span>Stadtwerke Rheinau</span></div></div>
        <div class="set-body">${field('First Name', 'Data')}${field('Last Name', 'Architect')}${field('E-Mail', 'data.architect@stadtwerke-rheinau.example')}
          <p class="muted">Your user name and e-mail come from the identity provider (System › Administration › Security).</p></div>`;
    case 'appearance':
      return `<div class="set-hero"><b>Appearance</b></div><div class="set-body"><fieldset class="set-radios"><legend>Theme</legend>
        ${THEMES.map((t) => `<label><input type="radio" name="set-theme" value="${t.id}" ${themeChoice() === t.id ? 'checked' : ''}> ${esc(t.label)}</label>`).join('')}
        </fieldset>
        <p class="muted">A real tenant offers Horizon, Horizon High Contrast Black and Horizon High Contrast White in a Theme dropdown.
          The dark theme is an addition of the game.</p></div>`;
    case 'ui':
      return `<div class="set-hero"><b>UI Settings</b></div><div class="set-body"><fieldset class="set-radios"><legend>Display Name</legend>
        <label><input type="radio" name="set-names" value="business" ${nameChoice() === 'business' ? 'checked' : ''}> Show Business Name</label>
        <label><input type="radio" name="set-names" value="technical" ${nameChoice() === 'technical' ? 'checked' : ''}> Show Technical Name</label>
        </fieldset>
        <p class="muted">By default you see business names. Show Technical Name switches lists, monitors and view builders to the technical names,
          which SQL, transports and tools use; some editors show both. Modelers often switch.</p></div>`;
    case 'language':
      return `<div class="set-hero"><b>Language & Region</b></div><div class="set-body">${field('Language', 'English')}${field('Data Access Language', 'English')}
        ${field('Date Formatting', 'MMM d, yyyy (Oct 1, 2019)')}${field('Time Formatting', '24 h')}${field('Number Formatting', '1,234.56')}
        ${field('Scale Formatting', 'System Default')}${field('Currency Position', '$1234 Million')}
        <p class="muted">The game is in English, like most tenants. Data Access Language decides the language of texts in your data (text entities).</p></div>`;
    case 'home':
      return `<div class="set-hero"><b>Home Screen</b></div><div class="set-body"><p class="muted">Choose the cards and tools Home shows.</p>
        <ul class="set-toggles">${['Welcome Card', 'SAP Datasphere Blog', 'Spaces', 'Data Builder', 'Business Builder', 'Data Integration Tasks', 'Quick Actions']
          .map((c) => `<li><span>${esc(c)}</span><span class="pill-toggle on" aria-label="${esc(c)}: on">ON</span></li>`).join('')}</ul>
        <p class="muted">In the game, Home always shows the cards of your learning path; the switches only show what a real tenant offers.</p></div>`;
    case 'notifications':
      return `<div class="set-hero"><b>Notifications</b></div><div class="set-body"><p>Whether failed task chains and finished jobs also send you an e-mail. The game shows them as messages on screen.</p></div>`;
    case 'consent':
      return `<div class="set-hero"><b>Authorized Consent Settings</b></div><div class="set-body"><p>Scheduled tasks run under your user. A real tenant asks you
        once to authorize this; the consent is valid for 365 days and you get an e-mail before it expires. Without it, schedules you own do not run.</p>
        <p class="muted">The game runs schedules without asking.</p></div>`;
    default:
      return `<div class="set-hero"><b>Privacy</b></div><div class="set-body"><p>Consent to usage tracking. Nothing is tracked in the game; your save stays in this browser.</p></div>`;
  }
}

export function openSettings() {
  const { form } = openDialog('Settings', `
    <div class="set-wrap">
      <ul class="set-list" role="listbox" aria-label="Settings areas"></ul>
      <div class="set-pane" id="set-pane"></div>
    </div>
    <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Close</button></div>`, 'settings-dlg');
  const draw = () => {
    form.querySelector('.set-list')!.innerHTML = sections().map((s) => `<li><button type="button" data-set="${s.id}" ${s.id === section ? 'aria-current="true"' : ''}>
        ${icon(ICON[s.id])}<span><b>${esc(s.label)}</b>${s.sub ? `<small>${esc(s.sub)}</small>` : ''}</span></button></li>`).join('');
    form.querySelector('#set-pane')!.innerHTML = pane(section);
    form.querySelectorAll<HTMLButtonElement>('[data-set]').forEach((b) =>
      b.addEventListener('click', () => {
        section = b.dataset.set as Section;
        ctx.track(`settings:${section}`);
        draw();
      }),
    );
    form.querySelectorAll<HTMLInputElement>('[name="set-theme"]').forEach((r) =>
      r.addEventListener('change', () => {
        applyTheme(r.value as ThemeChoice);
        ctx.track(`theme:${r.value}`);
        draw();
      }),
    );
    form.querySelectorAll<HTMLInputElement>('[name="set-names"]').forEach((r) =>
      r.addEventListener('change', () => {
        writeUiPref('dsg-names', r.value);
        ctx.track(`names:${r.value}`);
        ctx.renderView();
        draw();
      }),
    );
  };
  form.addEventListener('submit', (e) => e.preventDefault());
  ctx.track('settings:open');
  draw();
}

function openAbout() {
  openDialog('About', `
    <dl class="props-list wide-dl"><dt>Tenant</dt><dd>Stadtwerke Rheinau, training tenant</dd>
      <dt>Capacity</dt><dd>${CAPACITY.diskGB} GB disk, ${CAPACITY.memoryGB} GB in-memory</dd>
      <dt>Version</dt><dd>Datasphere Game, simulated</dd></dl>
    <p class="muted">In a real tenant, About shows the version, the tenant URL and the license figures.</p>
    <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Close</button></div>`);
}

/** The menu under the avatar in the shellbar. */
export function openUserMenu(anchor: HTMLElement) {
  document.querySelector('.user-menu')?.remove();
  const menu = document.createElement('div');
  menu.className = 'user-menu panel';
  menu.setAttribute('role', 'menu');
  menu.innerHTML = `<div class="um-head"><span class="avatar" aria-hidden="true">DA</span><div><b>Data Architect</b><span>data.architect@stadtwerke-rheinau.example</span></div></div>
    <button type="button" role="menuitem" data-um="settings">Settings</button>
    <button type="button" role="menuitem" data-um="about">About</button>
    <button type="button" role="menuitem" disabled title="Not in this game">Sign Out</button>`;
  document.body.append(menu);
  ctx.track('user-menu');
  const r = anchor.getBoundingClientRect();
  menu.style.top = `${r.bottom + 6}px`;
  menu.style.right = `${Math.max(8, window.innerWidth - r.right)}px`;
  const close = () => {
    menu.remove();
    document.removeEventListener('mousedown', outside, true);
    document.removeEventListener('keydown', onKey);
  };
  const outside = (e: MouseEvent) => !menu.contains(e.target as Node) && e.target !== anchor && close();
  const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
  document.addEventListener('mousedown', outside, true);
  document.addEventListener('keydown', onKey);
  menu.querySelector('[data-um="settings"]')!.addEventListener('click', () => {
    close();
    openSettings();
  });
  menu.querySelector('[data-um="about"]')!.addEventListener('click', () => {
    close();
    ctx.track('about');
    openAbout();
  });
}
