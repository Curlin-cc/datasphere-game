import type { TenantState } from '../tenant';

/**
 * Mission format. One file per chapter in src/content/missions/, registered in index.ts.
 * Texts are English (game language). HTML fields are trusted content from this repo.
 */

export interface Hint {
  label: string;
  cost: number;
  text: string;
}

/** Compares the result of the player's query with one or more reference queries. */
export interface ResultCheck {
  type: 'result';
  /** Short name shown in the feedback list, e.g. "Contracts per grid area". */
  label: string;
  /** The query must run in this space (the Data Builder's active space). */
  space?: string;
  /** Reference solution(s). The player passes if the result matches any of them. Never shown. */
  expected: string | string[];
  /** Row order matters (ORDER BY tasks). Default false. */
  ordered?: boolean;
  /** Absolute tolerance for numbers. Default 0.01. */
  tolerance?: number;
  /**
   * Known wrong answers with a targeted message. If the player's result matches one of
   * these queries, the message is shown instead of the generic feedback.
   */
  diagnose?: { sql: string; message: string }[];
}

/** Checks that an object exists in the right space (chapters 1+). */
export interface StructureCheck {
  type: 'structure';
  label: string;
  space: string;
  object: string;
  kind?: 'Table' | 'View';
  /** Columns that must exist (case-insensitive). */
  columns?: string[];
}

/** A question about what the player found. Rendered as choices in the mission panel. */
export interface QuestionCheck {
  type: 'question';
  id: string;
  label: string;
  prompt: string;
  options: string[];
  /** Index into options. */
  answer: number;
  /** Shown after a wrong answer: a nudge, not the answer. */
  nudge: string;
}

/** What a rule check can look at. */
export interface RuleContext {
  tenant: TenantState;
  /** What the player did while the mission was open, e.g. app:builder, open:RHN_IN.TARIFFS. */
  events: Set<string>;
}

/**
 * A rule on the tenant state (spaces, storage, sharing). The test returns null when the rule holds,
 * otherwise the feedback text. Functions are fine here because missions are TypeScript modules.
 */
export interface RuleCheck {
  type: 'rule';
  label: string;
  /** Feedback when the rule holds. */
  ok?: string;
  test: (ctx: RuleContext) => string | null;
}

export type Check = ResultCheck | StructureCheck | QuestionCheck | RuleCheck;

/** Rule IDs of the senior architect's review, see review.ts. */
export type ReviewRule = 'no_select_star' | 'alias_aggregates' | 'explicit_join' | 'no_logic_in_inbound';

export interface Mission {
  /** c<chapter>-m<nr>, e.g. c00-m02 */
  id: string;
  chapter: number;
  title: string;
  /** Who sends the ticket. */
  from: { name: string; role: string; initials: string };
  /** Ticket text (HTML). */
  ticket: string;
  /** Task steps (HTML). Each step should have a TASK_TOURS entry. */
  tasks: string[];
  hints: Hint[];
  checks: Check[];
  /** Best-practice review rules applied to the player's SQL. Notes do not fail the mission. */
  review?: ReviewRule[];
  xp: number;
  /** Shown after solving: where the same work lives in a real tenant (HTML). */
  realTenant: string;
  /** Mentor's closing words after solving (HTML). */
  debrief: string;
  /** Starting situation, applied once when the mission is first opened (e.g. a failed load to repair). */
  setup?: (tenant: TenantState) => void;
}
