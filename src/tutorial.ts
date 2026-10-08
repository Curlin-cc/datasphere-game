/**
 * Step-by-step tutorial ("tour") that walks the player through a mission.
 * Each step can switch the view, spotlight one element and explain it.
 * Content lives in src/content/tutorials.ts, one tutorial per mission ID.
 */

export interface TourStep {
  title: string;
  /** Trusted HTML from our own content files. */
  body: string;
  /** CSS selector of the element to spotlight. Without it the card sits in the centre. */
  target?: string;
  /** View to open before the step is shown, e.g. 'builder'. */
  view?: string;
  /** SQL example the player can put into the editor with one click. */
  example?: string;
}

export interface TourHooks {
  setView: (view: string) => void;
  insertExample: (sql: string) => void;
  onFinish: () => void;
}

let active: { close: () => void } | null = null;

/** finishLabel names the last button, e.g. 'Start the mission' or 'Got it'. */
export function startTour(steps: TourStep[], hooks: TourHooks, finishLabel = 'Start the mission') {
  active?.close();
  let index = 0;

  const root = document.createElement('div');
  root.className = 'tour';
  root.innerHTML = `<div class="tour-block"></div><div class="tour-spot" hidden></div>
    <div class="tour-card panel" role="dialog" aria-modal="true" aria-labelledby="tour-title"></div>`;
  document.body.append(root);
  const spot = root.querySelector<HTMLElement>('.tour-spot')!;
  const card = root.querySelector<HTMLElement>('.tour-card')!;

  const close = (finished: boolean) => {
    root.remove();
    window.removeEventListener('resize', place);
    document.removeEventListener('keydown', onKey);
    active = null;
    if (finished) hooks.onFinish();
  };
  active = { close: () => close(false) };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close(true);
    if (e.key === 'ArrowRight') go(index + 1);
    if (e.key === 'ArrowLeft') go(index - 1);
  };
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', place);

  async function go(i: number) {
    if (i < 0) return;
    if (i >= steps.length) return close(true);
    index = i;
    const step = steps[i];
    if (step.view) hooks.setView(step.view);
    const target = step.target ? await waitFor(step.target) : null;
    target?.scrollIntoView({ block: 'nearest' });
    render(step);
    place();
  }

  function render(step: TourStep) {
    const last = index === steps.length - 1;
    card.innerHTML = `
      <div class="tour-count">Step ${index + 1} of ${steps.length}</div>
      <h2 id="tour-title">${step.title}</h2>
      <div class="tour-body">${step.body}</div>
      ${step.example ? `<pre class="tour-example"><code></code></pre>
        <button class="btn" type="button" data-act="example">Put this example in the editor</button>` : ''}
      <div class="tour-actions">
        <button class="btn link" type="button" data-act="skip">Skip tutorial</button>
        <span class="spacer"></span>
        <button class="btn" type="button" data-act="back" ${index === 0 ? 'disabled' : ''}>Back</button>
        <button class="btn primary" type="button" data-act="next">${last ? finishLabel : 'Next'}</button>
      </div>`;
    if (step.example) card.querySelector('.tour-example code')!.textContent = step.example;
    card.querySelector('[data-act="skip"]')!.addEventListener('click', () => close(true));
    card.querySelector('[data-act="back"]')!.addEventListener('click', () => go(index - 1));
    card.querySelector('[data-act="next"]')!.addEventListener('click', () => go(index + 1));
    card.querySelector('[data-act="example"]')?.addEventListener('click', (e) => {
      hooks.insertExample(step.example!);
      (e.currentTarget as HTMLButtonElement).textContent = 'Added. Press Run after the tutorial';
    });
    card.querySelector<HTMLButtonElement>('[data-act="next"]')!.focus();
  }

  /** Spotlights the target and puts the card next to it where there is room. */
  function place() {
    const step = steps[index];
    const target = step.target ? document.querySelector<HTMLElement>(step.target) : null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const gap = 14;

    if (!target) {
      spot.hidden = true;
      root.classList.add('centered');
      card.style.left = `${Math.max(16, (vw - cw) / 2)}px`;
      card.style.top = `${Math.max(16, (vh - ch) / 2)}px`;
      return;
    }
    root.classList.remove('centered');
    const r = target.getBoundingClientRect();
    const pad = 6;
    spot.hidden = false;
    spot.style.left = `${r.left - pad}px`;
    spot.style.top = `${r.top - pad}px`;
    spot.style.width = `${r.width + pad * 2}px`;
    spot.style.height = `${r.height + pad * 2}px`;

    const clampY = (y: number) => Math.min(Math.max(16, y), vh - ch - 16);
    const clampX = (x: number) => Math.min(Math.max(16, x), vw - cw - 16);
    let left: number;
    let top: number;
    if (r.left - cw - gap >= 16) {
      left = r.left - cw - gap;
      top = clampY(r.top);
    } else if (r.right + cw + gap <= vw - 16) {
      left = r.right + gap;
      top = clampY(r.top);
    } else if (r.bottom + ch + gap <= vh - 16) {
      left = clampX(r.left);
      top = r.bottom + gap;
    } else {
      left = clampX(r.left);
      top = clampY(r.top - ch - gap);
    }
    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }

  go(0);
}

/** Views render asynchronously; give the target a moment to appear. */
async function waitFor(selector: string): Promise<HTMLElement | null> {
  for (let i = 0; i < 40; i++) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el && el.getBoundingClientRect().height > 0) return el;
    await new Promise((r) => setTimeout(r, 50));
  }
  return null;
}
