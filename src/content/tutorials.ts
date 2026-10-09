import type { TourStep } from '../tutorial';
import { GUIDED_INTROS, GUIDED_TOURS } from './guided';

/**
 * Since 2026-10-09 every chapter's tutorials live in guided.ts (hands-on). These maps stay as the place to add
 * passive tutorials if a mission ever needs one.
 *
 * One tutorial per mission ID. It opens automatically the first time a mission starts
 * and can be reopened from the mission panel. Explains everything the mission needs,
 * but never shows the exact solution query.
 */
export const TUTORIALS: Record<string, TourStep[]> = {
  ...GUIDED_INTROS,
};

/**
 * Quick tutorials: two or three pop-ups per task step, opened with "Show me" next to the step.
 * Index = position in the mission's task list.
 */
export const TASK_TOURS: Record<string, TourStep[][]> = {
  ...GUIDED_TOURS,
};
