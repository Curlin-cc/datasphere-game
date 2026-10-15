import { ctx } from '../ctx';
import type { Guidance } from '../progress';
import { openDialog } from '../ui';

/**
 * Guided or self-directed (Curlin, 14.10.2026): asked once at the start of a new game, changeable in Settings › Guidance.
 * The submit button is "Self-directed" (the behaviour before), so closing the dialog keeps the old way of playing.
 */
export const GUIDANCE_TEXT: Record<Guidance, { label: string; text: string }> = {
  guided: {
    label: 'Guided',
    text: 'The tutorial moves on by itself as soon as you have done a step, highlights the next thing to click and opens the next app or space for you. Good for your first run.',
  },
  self: {
    label: 'Self-directed',
    text: 'You navigate yourself and press Next in the tutorial, like working in a real tenant. The tutorial still waits for every click you make.',
  },
};

export const GUIDANCE_AID = 'Guided mode is a learning aid of the game. In the real SAP Datasphere you choose the space and the app yourself, and nothing opens or moves on by itself.';

export const guided = () => ctx.progress.guidance === 'guided';

export function setGuidance(g: Guidance) {
  ctx.progress.guidance = g;
  ctx.track(`guidance:${g}`);
  ctx.save();
}

/** Saves that already have progress keep the old behaviour without asking; a new game asks once. */
export async function ensureGuidance(): Promise<void> {
  if (ctx.progress.guidance) return;
  if (Object.values(ctx.progress.missions).some((m) => m.done)) {
    ctx.progress.guidance = 'self';
    ctx.save();
    return;
  }
  setGuidance(await chooseGuidance());
}

function chooseGuidance(): Promise<Guidance> {
  return new Promise((resolve) => {
    let choice: Guidance = 'self';
    const { form, close } = openDialog('How do you want to play?', `
      <p class="ask-text">You can change this any time under Settings › Guidance (avatar at the top right).</p>
      <div class="mode-choice">
        <button type="button" data-mode="guided"><b>${GUIDANCE_TEXT.guided.label}</b><small>${GUIDANCE_TEXT.guided.text}</small></button>
        <button type="submit" data-mode="self"><b>${GUIDANCE_TEXT.self.label}</b><small>${GUIDANCE_TEXT.self.text}</small></button>
      </div>
      <p class="tour-aid">${GUIDANCE_AID}</p>`, 'ask-dlg mode-dlg');
    const overlay = form.parentElement!;
    new MutationObserver((_, obs) => {
      if (!overlay.isConnected) {
        obs.disconnect();
        resolve(choice);
      }
    }).observe(document.body, { childList: true, subtree: true });
    form.querySelector('[data-mode="guided"]')!.addEventListener('click', () => {
      choice = 'guided';
      close();
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      choice = 'self';
      close();
    });
  });
}
