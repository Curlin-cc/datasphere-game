import { RANKS } from './content/chapters';
import { MISSIONS } from './content/missions';
import { defaultTenant, sanitizeTenant, type TenantState } from './tenant';
import SANDBOX from './content/sandbox.json';

/**
 * Save game: localStorage plus JSON export/import.
 * v5 stores progress per mission in the three-layer landscape RHN_ENTRY / RHN_DSL / RHN_PRES (2026-10-13).
 * Saves v2 to v4 were built on the old spaces RHN_IN / RHN_HARM / RHN_REP. Their tenant cannot be carried over (facts and
 * dimensions moved to another space), so they are discarded and the player starts fresh; `oldSaveDiscarded` tells the UI.
 */

export const SAVE_KEY = 'dsg-progress-v3';
const OLD_KEY = 'dsg-progress-v2';

export interface MissionProgress {
  /** Hints the player bought (free hints of the chapter are not counted here). */
  hintsOpen: number;
  /** Question ID → chosen option. */
  answers: Record<string, number>;
  /** Last SQL the player had in the editor for this mission. */
  sql?: string;
  attempts: number;
  done: boolean;
  /** XP earned for this mission including the clean-review bonus. */
  xpEarned: number;
  /** What the player did in the tenant while this mission was open, e.g. app:builder, open:RHN_ENTRY.TARIFFS. */
  events: string[];
}

export interface Progress {
  version: 5;
  xp: number;
  currentMission: string;
  missions: Record<string, MissionProgress>;
  tutorialsSeen: string[];
  /** Version of the tutorials the player has seen. When the tutorials are rebuilt, older saves see them again. */
  tutorialVersion?: number;
  /** Spaces, storage and shares the player set up (chapter 1+). */
  tenant: TenantState;
  /**
   * Where the open mission tutorial is (Bug 1, 14.10.2026): a reload resumes there instead of at step 1.
   * Cleared when the tutorial ends (finished, skipped, Escape).
   */
  tourAt?: { mission: string; step: number };
}

/** Raise when the tutorials change a lot: every save then sees them again (2 = hands-on tutorials, 2026-10-09; 3 = three-layer architecture, 2026-10-13). */
export const TUTORIAL_VERSION = 3;

/** Bonus for a solution without review notes. */
export const CLEAN_BONUS = 5;

/** XP needed for each rank in RANKS. */
export const RANK_XP = [0, 100, 350, 750];

export function freshProgress(): Progress {
  return { version: 5, xp: 0, currentMission: MISSIONS[0].id, missions: {}, tutorialsSeen: [], tutorialVersion: TUTORIAL_VERSION, tenant: defaultTenant() };
}

export function missionProgress(p: Progress, id: string): MissionProgress {
  return (p.missions[id] ??= { hintsOpen: 0, answers: {}, attempts: 0, done: false, xpEarned: 0, events: [] });
}

/** True when the stored save was from the old layer design (v2 to v4) and was replaced by a fresh start. */
export let oldSaveDiscarded = false;

/** A save of the old landscape (RHN_IN / RHN_HARM / RHN_REP). */
export const isOldLayout = (data: unknown) => {
  const v = (data as { version?: unknown } | null)?.version;
  return typeof v === 'number' && v >= 2 && v <= 4;
};

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (isOldLayout(data)) oldSaveDiscarded = true;
      return sanitize(data) ?? freshProgress();
    }
    if (localStorage.getItem(OLD_KEY)) oldSaveDiscarded = true;
  } catch {
    /* unreadable or blocked storage: start fresh */
  }
  return freshProgress();
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: progress lasts for this visit only */
  }
}

/** Accepts only a well-formed save; returns null otherwise. */
export function sanitize(data: unknown): Progress | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Partial<Omit<Progress, 'version'>> & { version?: number };
  if (d.version !== 5 || typeof d.xp !== 'number' || typeof d.missions !== 'object' || !d.missions) return null;
  const p = freshProgress();
  p.xp = Math.max(0, Math.round(d.xp));
  // Saves from before the current tutorials see every tutorial again; progress and XP stay.
  p.tutorialsSeen = (d as { tutorialVersion?: number }).tutorialVersion === TUTORIAL_VERSION && Array.isArray(d.tutorialsSeen) ? d.tutorialsSeen.map(String) : [];
  p.tenant = sanitizeTenant(d.tenant);
  const ta = (d as { tourAt?: { mission?: unknown; step?: unknown } }).tourAt;
  if (ta && typeof ta.mission === 'string' && Number.isInteger(ta.step) && (ta.step as number) >= 0) p.tourAt = { mission: ta.mission, step: ta.step as number };
  if (typeof d.currentMission === 'string' && MISSIONS.some((m) => m.id === d.currentMission)) p.currentMission = d.currentMission;
  for (const [id, mp] of Object.entries(d.missions)) {
    if (!MISSIONS.some((m) => m.id === id) || !mp || typeof mp !== 'object') continue;
    p.missions[id] = {
      hintsOpen: Math.max(0, Number(mp.hintsOpen) || 0),
      answers: mp.answers && typeof mp.answers === 'object' ? { ...mp.answers } : {},
      sql: typeof mp.sql === 'string' ? mp.sql : undefined,
      attempts: Math.max(0, Number(mp.attempts) || 0),
      done: !!mp.done,
      xpEarned: Math.max(0, Number(mp.xpEarned) || 0),
      events: Array.isArray(mp.events) ? mp.events.map(String).slice(-300) : [],
    };
  }
  // The grand tour c00-m00 came first on 13.10.2026: saves that already solved later missions count it as done
  // (no XP), so nothing locks again. The tour stays playable from the learning path.
  if (!p.missions['c00-m00']?.done && Object.entries(p.missions).some(([id, m]) => id !== 'c00-m00' && m.done)) {
    p.missions['c00-m00'] = { hintsOpen: 0, answers: {}, attempts: 0, done: true, xpEarned: 0, events: [] };
  }
  // Continue where the first open mission is, if the saved one is not open (e.g. after the v3 migration).
  if (!isUnlocked(p, p.currentMission)) p.currentMission = MISSIONS.find((m) => !p.missions[m.id]?.done)?.id ?? MISSIONS[0].id;
  return p;
}

/**
 * Sandbox: a save with every mission solved and the tenant built along the way (generated by tests/playtest/sandbox.sh).
 * For clicking through all apps without playing; plenty of XP, no tutorials pop up.
 */
export function sandboxProgress(): Progress {
  return sanitize(structuredClone(SANDBOX)) ?? freshProgress();
}

/** A mission is open when every mission before it is done. */
export function isUnlocked(p: Progress, id: string): boolean {
  const i = MISSIONS.findIndex((m) => m.id === id);
  return i >= 0 && MISSIONS.slice(0, i).every((m) => p.missions[m.id]?.done);
}

/** Chapter whose apps and features are unlocked: the reached chapter, or a later one already solved (e.g. after a migration). */
export function unlockedChapter(p: Progress): number {
  const chapters = [...new Set(MISSIONS.map((m) => m.chapter))];
  const fullySolved = chapters.filter((c) => MISSIONS.filter((m) => m.chapter === c).every((m) => p.missions[m.id]?.done));
  return Math.max(reachedChapter(p), ...fullySolved.map((c) => c + 1));
}

/** The chapter the player has reached: that of the first unsolved mission, or one past the last built mission. */
export function reachedChapter(p: Progress): number {
  const open = MISSIONS.find((m) => !p.missions[m.id]?.done);
  return open ? open.chapter : MISSIONS[MISSIONS.length - 1].chapter + 1;
}

export function rankOf(xp: number) {
  let i = 0;
  while (i + 1 < RANK_XP.length && xp >= RANK_XP[i + 1]) i++;
  const floor = RANK_XP[i];
  const next = RANK_XP[i + 1];
  return { name: RANKS[i], index: i, floor, next, fill: next ? ((xp - floor) / (next - floor)) * 100 : 100 };
}

export function exportProgress(p: Progress) {
  const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `datasphere-game-save-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Opens a file picker and resolves with the imported save, or rejects with a readable message. */
export function importProgress(): Promise<Progress> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('No file chosen.'));
      try {
        const data = JSON.parse(await file.text());
        const p = sanitize(data);
        if (p) resolve(p);
        else reject(new Error(isOldLayout(data)
          ? 'This save is from the old three spaces RHN_IN, RHN_HARM and RHN_REP. The game now uses RHN_ENTRY, RHN_DSL and RHN_PRES, so old saves cannot be loaded.'
          : 'This file is not a Datasphere Game save.'));
      } catch {
        reject(new Error('This file could not be read as a save.'));
      }
    });
    input.click();
  });
}
