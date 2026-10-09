import type { Progress } from './progress';
import type { SqlEditor } from './editor';
import type { AppId } from './content/apps';
import type { TenantState } from './tenant';

/**
 * Shared app state and callbacks. main.ts fills in the functions; views import ctx instead of main,
 * so there are no import cycles.
 */

export type ViewId = AppId | 'glossary';

export const ctx = {
  progress: null as unknown as Progress,
  view: 'home' as ViewId,
  /** SQL of the SQL view editor (the open one, or the last one). Mission checks read it. */
  sql: '',
  /** 'draft' = a new, unsaved SQL view; otherwise the key SPACE.NAME of the open view. */
  sqlOwner: 'draft' as string,
  editor: null as SqlEditor | null,
  tenant(): TenantState {
    return ctx.progress.tenant;
  },
  save: () => {},
  /** Records something the player did, for mission checks. */
  track: (_event: string) => {},
  setView: (_view: ViewId) => {},
  renderView: () => {},
  renderMission: () => {},
  currentChapter: () => 0,
};
