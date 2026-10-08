import { RANKS } from './content/chapters';
import { MISSIONS } from './content/missions';
import { defaultTenant, sanitizeTenant, type TenantState } from './tenant';

/**
 * Save game: localStorage plus JSON export/import.
 * v3 stores progress per mission. Older saves (v2: xp, hintsOpen, tutorialsSeen) are migrated.
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
}

export interface Progress {
  version: 3;
  xp: number;
  currentMission: string;
  missions: Record<string, MissionProgress>;
  tutorialsSeen: string[];
  /** Spaces, storage and shares the player set up (chapter 1+). */
  tenant: TenantState;
}

/** Bonus for a solution without review notes. */
export const CLEAN_BONUS = 5;

/** XP needed for each rank in RANKS. */
export const RANK_XP = [0, 100, 350, 750];

export function freshProgress(): Progress {
  return { version: 3, xp: 0, currentMission: MISSIONS[0].id, missions: {}, tutorialsSeen: [], tenant: defaultTenant() };
}

export function missionProgress(p: Progress, id: string): MissionProgress {
  return (p.missions[id] ??= { hintsOpen: 0, answers: {}, attempts: 0, done: false, xpEarned: 0 });
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return sanitize(JSON.parse(raw)) ?? freshProgress();
    const old = localStorage.getItem(OLD_KEY);
    if (old) {
      const v2 = JSON.parse(old) as { xp?: number; hintsOpen?: number; tutorialsSeen?: string[] };
      const p = freshProgress();
      p.xp = Math.max(0, Number(v2.xp) || 0);
      p.tutorialsSeen = Array.isArray(v2.tutorialsSeen) ? v2.tutorialsSeen.map(String) : [];
      missionProgress(p, 'c00-m01').hintsOpen = Number(v2.hintsOpen) || 0;
      return p;
    }
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
  const d = data as Partial<Progress>;
  if (d.version !== 3 || typeof d.xp !== 'number' || typeof d.missions !== 'object' || !d.missions) return null;
  const p = freshProgress();
  p.xp = Math.max(0, Math.round(d.xp));
  p.tutorialsSeen = Array.isArray(d.tutorialsSeen) ? d.tutorialsSeen.map(String) : [];
  p.tenant = sanitizeTenant(d.tenant);
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
    };
  }
  return p;
}

/** A mission is open when every mission before it is done. */
export function isUnlocked(p: Progress, id: string): boolean {
  const i = MISSIONS.findIndex((m) => m.id === id);
  return i >= 0 && MISSIONS.slice(0, i).every((m) => p.missions[m.id]?.done);
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
        const p = sanitize(JSON.parse(await file.text()));
        p ? resolve(p) : reject(new Error('This file is not a Datasphere Game save.'));
      } catch {
        reject(new Error('This file could not be read as a save.'));
      }
    });
    input.click();
  });
}
