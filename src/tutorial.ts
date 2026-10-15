import { MSC_LOGO } from './brand';

/**
 * Step-by-step tutorial ("tour") that walks the player through a mission.
 * Each step can switch the view, spotlight one element and explain it.
 *
 * Hands-on steps (`action`): the spotlight stays, but the page underneath can be used. The card says what to do
 * ("Your turn"), and the tour moves on by itself as soon as the player has done it: a tracked event happened,
 * an element appeared, or a check function returns true. Conditions that already hold count as done.
 *
 * Content lives in src/content/tutorials.ts, one tutorial per mission ID.
 */

export interface TourAction {
  /** What the player does, one short imperative sentence (HTML). */
  do: string;
  /** Done when a tracked event (ctx.track) starts with this text. A leading ^ makes it a regular expression. */
  event?: string;
  /** Done when an element matching this selector is visible. */
  appear?: string;
  /** Done when this returns true. Checked several times a second. */
  check?: () => boolean;
  /**
   * After it is done, wait for Next instead of moving on by itself: the player reads the rest of the card
   * next to what the click opened (the grand tour, c00-m00).
   */
  stay?: boolean;
  /**
   * Guided mode only: the tour view (see TourHooks.setView) the game opens by itself after a moment, e.g. 'builder' or
   * 'builder:landing:RHN_DSL'. Never while an editor has unsaved changes; then the target only pulses.
   */
  autoOpen?: string;
}

export interface TourStep {
  title: string;
  /** Trusted HTML from our own content files. */
  body: string;
  /** CSS selector of the element to spotlight; "A || B" falls back to B. Without it the card sits in the centre. */
  target?: string;
  /** View to open before the step is shown, e.g. 'builder'. */
  view?: string;
  /** SQL example the player can put into the editor with one click. */
  example?: string;
  /** Hands-on step: the player does it, the tour waits. */
  action?: TourAction;
  /**
   * The card sits on the mission panel at the right instead of next to the target, so the page in the middle stays
   * readable (grand tour, c00-m00). Once a `stay` action is done, the spotlight moves to the page that opened.
   */
  dock?: boolean;
  /** Intro window: a large centred card with the MSC logo on top (first steps of the game, c00-m00). Needs no target. */
  hero?: boolean;
}

export interface TourHooks {
  setView: (view: string) => void;
  insertExample: (sql: string) => void;
  /** Readable place of a tour view, e.g. 'Data Builder › RHN_DSL', for the self-directed note. */
  describeView?: (view: string) => string;
  onFinish: () => void;
}

/**
 * Guided mode (chosen at the start, changeable in Settings): steps with a condition always go on by themselves, including
 * `stay` steps after a reading pause; the target pulses also in passive steps, the page stays clickable; navigation steps
 * open the app or space by themselves. Every automatic move is labelled as a learning aid of the game.
 */
export interface GuidedOptions {
  guided: () => boolean;
  /** True when an open editor has unsaved changes: then nothing is opened automatically. */
  unsaved: () => boolean;
}

let guidedOpts: GuidedOptions = { guided: () => false, unsaved: () => false };
export function setGuidedOptions(o: GuidedOptions) {
  guidedOpts = o;
}

/** Shown in the card whenever guided mode moves or opens something, so it is not taken for SAP Datasphere behaviour. */
export const AID_NOTE = 'Learning aid of the game: in the real SAP Datasphere you choose the space and the app yourself, and nothing opens or moves on by itself.';

/** Shown while unsaved work keeps the tutorial from opening a page (both modes). */
const UNSAVED_NOTE = 'You have unsaved changes (editor or form), so the game did not open the next page. Save or close your work; it opens then.';

/** Delay before guided mode opens the app/space of a navigation step, and the reading pause of a done `stay` step. */
export const GUIDED_OPEN_MS = 900;
/**
 * When the player last clicked or typed on the page (not on the tutorial card). Guided mode does not open a page while the player
 * is busy there: the redraw would swallow a click in progress (an open space picker, a button about to be pressed).
 */
let lastPageInput = -Infinity;
const notePageInput = (e: Event) => {
  if (!(e.target instanceof Element) || !e.target.closest('.tour-card')) lastPageInput = performance.now();
};
const playerBusy = () => performance.now() - lastPageInput < GUIDED_OPEN_MS;
const readingPause = (step: TourStep) => Math.min(12000, Math.max(4000, step.body.replace(/<[^>]+>/g, '').length * 45));

/** Fired by ctx.track for every action, also repeated ones. */
export const TRACK_EVENT = 'dsg:track';

let active: { close: () => void } | null = null;

export const tourRunning = () => active !== null;

/** finishLabel names the last button, e.g. 'Start the mission' or 'Got it'. */
/**
 * `start` resumes at a step (after a reload, see openTutorial in main.ts); `onStep` hears every step shown and,
 * with -1, the end of the tour, so the caller can remember where the player is.
 */
export function startTour(steps: TourStep[], hooks: TourHooks, finishLabel = 'Start the mission',
  opts: { start?: number; onStep?: (index: number) => void } = {}) {
  active?.close();
  let index = 0;
  let timer = 0;
  let doneTimer = 0;
  let stepDone = false;
  let lastRect = '';
  /** A docked stay step is done: light up the page that opened instead of the navigation entry. */
  let spotPage = false;
  let openTimer = 0;
  let guardTimer = 0;
  let stayTimer = 0;
  /** Ends the click-through while the card slides to a new place (CSS transition .2s). */
  let moveTimer = 0;

  const root = document.createElement('div');
  root.className = 'tour';
  root.innerHTML = `<div class="tour-block"></div><div class="tour-spot" hidden></div>
    <div class="tour-card panel" role="dialog" aria-labelledby="tour-title"></div>`;
  document.body.append(root);
  const spot = root.querySelector<HTMLElement>('.tour-spot')!;
  const card = root.querySelector<HTMLElement>('.tour-card')!;

  const stopWaiting = () => {
    clearInterval(timer);
    clearTimeout(doneTimer);
    clearTimeout(openTimer);
    clearTimeout(stayTimer);
    clearInterval(guardTimer);
    timer = 0;
  };

  const close = (finished: boolean) => {
    stopWaiting();
    root.remove();
    opts.onStep?.(-1);
    window.removeEventListener('resize', place);
    window.removeEventListener(TRACK_EVENT, onTrack);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('pointerdown', notePageInput, true);
    document.removeEventListener('keydown', notePageInput, true);
    active = null;
    if (finished) hooks.onFinish();
  };
  active = { close: () => close(false) };

  const onKey = (e: KeyboardEvent) => {
    const acting = !!steps[index]?.action;
    // In hands-on steps the keyboard belongs to the page (forms, editor); only Escape leaves the tour.
    if (e.key === 'Escape' && !document.querySelector('.guide-overlay')) close(true);
    if (acting) return;
    if (e.key === 'ArrowRight') go(index + 1);
    if (e.key === 'ArrowLeft') go(index - 1);
  };
  const onTrack = (e: Event) => {
    const a = steps[index]?.action;
    const ev = (e as CustomEvent<string>).detail;
    if (!a?.event || stepDone) return;
    const hit = a.event.startsWith('^') ? new RegExp(a.event).test(ev) : ev.startsWith(a.event);
    if (hit) complete();
  };
  document.addEventListener('keydown', onKey);
  document.addEventListener('pointerdown', notePageInput, true);
  document.addEventListener('keydown', notePageInput, true);
  window.addEventListener('resize', place);
  window.addEventListener(TRACK_EVENT, onTrack);

  async function go(i: number) {
    if (i < 0) return;
    stopWaiting();
    if (i >= steps.length) return close(true);
    index = i;
    opts.onStep?.(i);
    stepDone = false;
    spotPage = false;
    lastRect = '';
    const step = steps[i];
    root.classList.toggle('acting', !!step.action);
    root.classList.toggle('docked', !!step.dock);
    root.classList.toggle('guided', guidedOpts.guided());
    // Self-directed (Calin, 14.10.2026): the tutorial never opens or switches an app or space. The card says where to go
    // and, if the step points at something there, waits (Next disabled) until the player has arrived.
    // Guided: the step's page opens, but never over unsaved work (editor or form); it opens once the work is saved or closed.
    const isGuided = guidedOpts.guided();
    let held = !!step.view && isGuided && guidedOpts.unsaved();
    if (step.view && isGuided && !held) hooks.setView(step.view);
    const target = step.target ? await waitFor(step.target, isGuided ? 40 : 4) : null;
    if (index !== i) return;
    target?.scrollIntoView({ block: 'nearest' });
    render(step);
    if (step.view && !isGuided && !target) {
      const where = hooks.describeView?.(step.view) ?? step.view;
      aid(`Go to ${where} yourself; the tutorial waits until you are there.`, false, 'goto');
      const next = !step.action && step.target ? card.querySelector<HTMLButtonElement>('[data-act="next"]') : null;
      if (next) next.disabled = true;
      if (step.target) {
        clearInterval(guardTimer);
        guardTimer = window.setInterval(() => {
          if (index !== i) return clearInterval(guardTimer);
          if (!visible(step.target!)) return;
          clearInterval(guardTimer);
          card.querySelector('.tour-aid.goto')?.remove();
          if (next) {
            next.disabled = false;
            next.focus();
          }
          lastRect = '';
          place();
        }, 300);
      }
    }
    let blockedOpen = false;
    const guard = () => {
      clearInterval(guardTimer);
      guardTimer = window.setInterval(() => {
        if (index !== i) return clearInterval(guardTimer);
        if (guidedOpts.unsaved()) return;
        clearInterval(guardTimer);
        card.querySelector('.tour-aid.unsaved')?.remove();
        lastRect = '';
        if (held) {
          held = false;
          hooks.setView(step.view!);
        }
        if (blockedOpen && !stepDone && !conditionHolds(step.action!)) {
          blockedOpen = false;
          hooks.setView(step.action!.autoOpen!);
          aid(`Opened for you. ${AID_NOTE}`);
        }
        place();
      }, 300);
    };
    if (held) {
      aid(UNSAVED_NOTE, true);
      guard();
    }
    place();
    if (step.action?.autoOpen && guidedOpts.guided()) {
      const autoOpen = () => {
        if (index !== i || stepDone || conditionHolds(step.action!)) return;
        // The player is clicking on the page right now (for example the space picker is open): wait, try again shortly.
        if (playerBusy()) {
          openTimer = window.setTimeout(autoOpen, GUIDED_OPEN_MS);
          return;
        }
        if (guidedOpts.unsaved()) {
          blockedOpen = true;
          aid(UNSAVED_NOTE, true);
          guard();
          return;
        }
        hooks.setView(step.action!.autoOpen!);
        aid(`Opened for you. ${AID_NOTE}`);
      };
      openTimer = window.setTimeout(autoOpen, GUIDED_OPEN_MS);
    }
    if (step.action) {
      // Already done (for example the right app is open)? Count it, but give the player a moment to read.
      timer = window.setInterval(() => {
        place();
        if (!stepDone && conditionHolds(step.action!)) complete();
      }, 250);
    }
  }

  function conditionHolds(a: TourAction) {
    if (a.appear && visible(a.appear)) return true;
    try {
      if (a.check && a.check()) return true;
    } catch {
      /* the page is re-rendering; try again on the next tick */
    }
    return false;
  }

  /** A small labelled note in the card: what guided mode just did (or did not do). */
  function aid(text: string, unsaved = false, kind = '') {
    let el = card.querySelector<HTMLElement>('.tour-aid');
    if (!el) {
      el = document.createElement('p');
      el.className = 'tour-aid';
      card.querySelector('.tour-actions')?.before(el);
    }
    el.textContent = text;
    el.classList.toggle('unsaved', unsaved);
    el.classList.toggle('goto', kind === 'goto');
    lastRect = '';
    place();
  }

  function complete() {
    if (stepDone) return;
    stepDone = true;
    card.classList.add('done');
    const status = card.querySelector('.tour-do');
    if (status) status.innerHTML = `<span class="tour-check">✓</span> Done`;
    const at = index;
    if (steps[index]?.action?.stay) {
      if (steps[index].dock) {
        spotPage = true;
        lastRect = '';
        place();
      }
      card.querySelector('.tour-wait')?.remove();
      const next = card.querySelector<HTMLButtonElement>('[data-act="next"]');
      if (next) {
        next.classList.add('primary');
        next.textContent = index === steps.length - 1 ? finishLabel : 'Next';
        next.removeAttribute('title');
      }
      if (guidedOpts.guided()) {
        // Guided: the card goes on by itself after a reading pause; Stay here keeps it.
        stayTimer = window.setTimeout(() => index === at && go(index + 1), readingPause(steps[index]));
        aid(`Goes on by itself in a moment. ${AID_NOTE}`);
        const keep = document.createElement('button');
        keep.type = 'button';
        keep.className = 'btn link';
        keep.dataset.act = 'stay';
        keep.textContent = 'Stay here';
        keep.addEventListener('click', () => {
          clearTimeout(stayTimer);
          keep.remove();
          card.querySelector('.tour-aid')?.remove();
        });
        next?.before(keep);
      }
      return;
    }
    doneTimer = window.setTimeout(() => index === at && go(index + 1), 750);
  }

  function render(step: TourStep) {
    const last = index === steps.length - 1;
    card.classList.remove('done');
    card.classList.toggle('acting', !!step.action);
    card.classList.toggle('hero', !!step.hero);
    root.classList.toggle('hero', !!step.hero);
    card.innerHTML = `${step.hero ? `<div class="tour-hero-logo">${MSC_LOGO}</div>` : ''}
      <div class="tour-count">Step ${index + 1} of ${steps.length}${step.action ? ' · <span class="your-turn">Your turn</span>' : ''}</div>
      <h2 id="tour-title">${step.title}</h2>
      <div class="tour-body">${step.body}</div>
      ${step.action ? `<div class="tour-do" role="status"><span class="tour-arrow">▶</span><span>${step.action.do}</span></div>
        <p class="tour-wait">${step.action.stay ? (guidedOpts.guided() ? 'Then read on here; the tutorial goes on by itself.' : 'Then read on here and press Next.') : 'The tutorial goes on by itself when you have done it.'}</p>` : ''}
      ${step.example ? `<pre class="tour-example"><code></code></pre>
        <button class="btn" type="button" data-act="example">Put this example in the editor</button>` : ''}
      <div class="tour-actions">
        <button class="btn link" type="button" data-act="skip">Skip tutorial</button>
        <span class="spacer"></span>
        <button class="btn" type="button" data-act="back" ${index === 0 ? 'disabled' : ''}>Back</button>
        ${step.action
          ? `<button class="btn" type="button" data-act="next" title="Go on without doing this step">Skip step</button>`
          : `<button class="btn primary" type="button" data-act="next">${last ? finishLabel : 'Next'}</button>`}
      </div>`;
    if (step.example) card.querySelector('.tour-example code')!.textContent = step.example;
    card.querySelector('[data-act="skip"]')!.addEventListener('click', () => close(true));
    // Back/Next belong to the step this card shows: if the tour already moved on (auto-advance), a late click must not skip a step.
    const shown = index;
    card.querySelector('[data-act="back"]')!.addEventListener('click', () => index === shown && go(shown - 1));
    card.querySelector('[data-act="next"]')!.addEventListener('click', () => index === shown && go(shown + 1));
    card.querySelector('[data-act="example"]')?.addEventListener('click', (e) => {
      hooks.insertExample(step.example!);
      (e.currentTarget as HTMLButtonElement).textContent = 'Added. Press Run after the tutorial';
    });
    if (!step.action) card.querySelector<HTMLButtonElement>('[data-act="next"]')!.focus();
  }

  /** Grand tour: the card lies on the mission panel at the right. */
  function dockCard(dock: HTMLElement) {
    const m = dock.getBoundingClientRect();
    card.style.width = `${m.width - 16}px`;
    card.style.left = `${m.left + 8}px`;
    card.style.top = `${Math.min(m.top + 8, Math.max(16, window.innerHeight - card.offsetHeight - 16))}px`;
  }

  /** Spotlights the target and puts the card next to it where there is room. */
  function place() {
    const step = steps[index];
    const dockEl = step?.dock ? firstVisible('#mission') : null;
    if (spotPage && dockEl) {
      // Done: no spotlight, no dimming. The page that opened is fully visible; the card waits on the mission panel.
      spot.hidden = true;
      root.classList.remove('centered');
      lastRect = 'page';
      return dockCard(dockEl);
    }
    let target = step?.target ? firstVisible(step.target) : null;
    // A dialog opened by the player's click (e.g. Upload) is where the work goes on: follow it instead of covering it.
    const dialog = step?.action ? firstVisible('.guide-overlay .dialog') : null;
    if (dialog && (!target || !dialog.contains(target))) target = dialog;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Measure the card at its natural size, wherever it stands now: a fixed card near the right edge shrinks to the room left
    // there, and placing it by that smaller width let it grow back over its own target on the next tick (it flipped every
    // 250 ms and swallowed clicks on buttons such as View Analyzer).
    const prevLeft = card.style.left;
    const prevWidth = card.style.width;
    card.style.left = '0px';
    card.style.width = '';
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    card.style.left = prevLeft;
    card.style.width = prevWidth;
    const gap = 14;

    if (!target && dockEl) {
      spot.hidden = true;
      lastRect = 'none';
      return dockCard(dockEl);
    }
    if (!target) {
      if (lastRect === 'none') return;
      lastRect = 'none';
      spot.hidden = true;
      root.classList.toggle('centered', !step?.action);
      // Hands-on step without a visible target (e.g. a dialog was closed): keep the card out of the way.
      card.style.left = step?.action ? `${vw - cw - 24}px` : `${Math.max(16, (vw - cw) / 2)}px`;
      card.style.top = step?.action ? `${vh - ch - 24}px` : `${Math.max(16, (vh - ch) / 2)}px`;
      return;
    }
    const r = target.getBoundingClientRect();
    const key = `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)},${cw},${ch}`;
    if (key === lastRect) return;
    lastRect = key;
    root.classList.remove('centered');
    const pad = 6;
    spot.hidden = false;
    spot.style.left = `${r.left - pad}px`;
    spot.style.top = `${r.top - pad}px`;
    spot.style.width = `${r.width + pad * 2}px`;
    spot.style.height = `${r.height + pad * 2}px`;

    // Docked: the card covers the mission panel (game only), never the page or the navigation.
    if (dockEl) return dockCard(dockEl);

    const clampY = (y: number) => Math.min(Math.max(16, y), vh - card.offsetHeight - 16);
    const clampX = (x: number) => Math.min(Math.max(16, x), vw - cw - 16);
    const leftRoom = r.left - gap - 16;
    const rightRoom = vw - r.right - gap - 16;
    let left: number;
    let top: number;
    card.style.width = '';
    if (leftRoom >= cw) {
      left = r.left - cw - gap;
      top = clampY(r.top);
    } else if (rightRoom >= cw) {
      left = r.right + gap;
      top = clampY(r.top);
    } else if (Math.max(leftRoom, rightRoom) >= 250) {
      // A wide target such as a dialog: a narrower card still fits beside it.
      const w = Math.min(cw, Math.max(leftRoom, rightRoom));
      card.style.width = `${w}px`;
      left = leftRoom >= rightRoom ? r.left - w - gap : r.right + gap;
      top = clampY(r.top);
    } else if (r.bottom + ch + gap <= vh - 16) {
      left = clampX(r.left);
      top = r.bottom + gap;
    } else if (r.top - ch - gap >= 16) {
      left = clampX(r.left);
      top = r.top - ch - gap;
    } else {
      // The target fills the screen: park the card top left, away from the buttons of a dialog.
      left = 16;
      top = 16;
    }
    if (card.style.left !== `${left}px` || card.style.top !== `${top}px`) {
      card.classList.add('moving');
      clearTimeout(moveTimer);
      moveTimer = window.setTimeout(() => card.classList.remove('moving'), 260);
    }
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }

  go(Math.min(Math.max(0, opts.start ?? 0), steps.length - 1));
}

/** First visible match. "A || B" tries A first, then B (e.g. a nav entry, else its closed group). */
const firstVisible = (selector: string): HTMLElement | null => {
  for (const part of selector.split(' || ')) {
    const el = [...document.querySelectorAll<HTMLElement>(part)].find((x) => x.getBoundingClientRect().height > 0);
    if (el) return el;
  }
  return null;
};

const visible = (selector: string) => firstVisible(selector) !== null;

/** Views render asynchronously; give the target a moment to appear. */
async function waitFor(selector: string, tries = 40): Promise<HTMLElement | null> {
  for (let i = 0; i < tries; i++) {
    const el = firstVisible(selector);
    if (el) return el;
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
}
