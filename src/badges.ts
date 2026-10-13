import { MISSIONS, missionsOfChapter } from './content/missions';
import { CLEAN_BONUS, type Progress } from './progress';

/**
 * Badges: milestones next to the ranks. They are derived from the save game (nothing extra is stored), so old saves
 * get the badges they have already earned. Shown on Home and, when new, after a successful check.
 */

export interface Badge {
  id: string;
  name: string;
  /** What it is for, shown on Home (also while locked, so the player knows how to earn it). */
  text: string;
  earned: (p: Progress) => boolean;
}

const chapterDone = (nr: number) => (p: Progress) => {
  const ms = missionsOfChapter(nr);
  return ms.length > 0 && ms.every((m) => p.missions[m.id]?.done);
};

/** Missions solved with the first press of Check my solution. */
export const firstTry = (p: Progress) => MISSIONS.filter((m) => p.missions[m.id]?.done && p.missions[m.id].attempts === 1).length;
/** Missions solved with the clean-review bonus. */
export const cleanSolved = (p: Progress) => MISSIONS.filter((m) => p.missions[m.id]?.done && p.missions[m.id].xpEarned >= m.xp + CLEAN_BONUS).length;
/** A chapter where hints cost XP (5–10), finished without buying one. */
const selfReliant = (p: Progress) => [5, 6, 7, 8, 9, 10].some((c) => chapterDone(c)(p) && missionsOfChapter(c).every((m) => (p.missions[m.id]?.hintsOpen ?? 0) === 0));

export const BADGES: Badge[] = [
  { id: 'pathfinder', name: 'Pathfinder', text: 'Finish chapter 0: you know your way around the tenant.', earned: chapterDone(0) },
  { id: 'key-keeper', name: 'Key Keeper', text: 'Finish chapter 2: everyone has exactly the access they need.', earned: chapterDone(2) },
  { id: 'pipeline', name: 'Pipeline Builder', text: 'Finish chapter 3: the sources flow into the entry space.', earned: chapterDone(3) },
  { id: 'clean-data', name: 'Clean Data', text: 'Finish chapter 5: codes, keys and duplicates harmonized.', earned: chapterDone(5) },
  { id: 'modeler', name: 'Model Maker', text: 'Finish chapter 7: the CFO reads your analytic models.', earned: chapterDone(7) },
  { id: 'gatekeeper', name: 'Gatekeeper', text: 'Finish chapter 8: every manager sees only his grid areas.', earned: chapterDone(8) },
  { id: 'night-shift', name: 'Night Shift', text: 'Finish chapter 10: the nightly chain runs, and someone hears when it fails.', earned: chapterDone(10) },
  { id: 'board-ready', name: 'Board Ready', text: 'Finish chapter 11 without a single hint.', earned: chapterDone(11) },
  { id: 'explorer', name: 'Explorer', text: 'Finish the excursions: consumption, transport, catalog, Business Builder, hierarchies, versions, OData, Content Network.', earned: chapterDone(12) },
  { id: 'first-try', name: 'First Try', text: 'Solve 5 missions with the first press of Check my solution.', earned: (p) => firstTry(p) >= 5 },
  { id: 'reviewer', name: 'Calin Approves', text: 'Solve 10 missions with a clean review (the +5 XP bonus).', earned: (p) => cleanSolved(p) >= 10 },
  { id: 'self-reliant', name: 'Self-Reliant', text: 'Finish one of chapters 5 to 10 without buying a hint.', earned: selfReliant },
];

export const earnedBadges = (p: Progress) => BADGES.filter((b) => b.earned(p));

/** A simple medal, drawn in the theme colours. */
export const BADGE_ICON = '<svg class="badge-ic" viewBox="0 0 32 32" aria-hidden="true"><path d="M11 3l5 8 5-8" /><circle cx="16" cy="19" r="8"/><path d="M16 15l1.3 2.7 2.9.4-2.1 2 .5 2.9-2.6-1.4-2.6 1.4.5-2.9-2.1-2 2.9-.4z"/></svg>';
