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
  /**
   * Check a deployed object instead of the editor (chapter 5+): SPACE.NAME of a view. Its runtime version is read,
   * so saved but undeployed changes do not count. Needs `columns`.
   */
  object?: string;
  /** With `object`: the columns to compare, by name and in this order. `expected` must return exactly these. */
  columns?: string[];
  /** Messages for a known wrong number of rows, e.g. { 897: 'Namesakes merged…' }. */
  counts?: Record<number, string>;
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
  /** Columns that must not exist, with the reason shown when one does (e.g. personal data in reporting). */
  absent?: { columns: string[]; message: string };
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

/**
 * Runs a query that returns one number (first column of the first row) and tests it, e.g. "contracts without a customer".
 * If the query fails (an object is missing), `missing` is shown.
 */
export interface MetricCheck {
  type: 'metric';
  label: string;
  sql: string;
  ok?: string;
  missing?: string;
  test: (value: number) => string | null;
}

/**
 * Queries a deployed analytic model (chapter 7) like a consumer would: rows (attribute IDs) and measures (names),
 * and compares the result with a reference query, by column name. Variables are not applied.
 */
export interface ModelCheck {
  type: 'model';
  label: string;
  /** SPACE.NAME of the analytic model. */
  object: string;
  /** Attribute IDs in the rows, e.g. 'RHN_REP_D_GRID_AREA.REGION' or 'STATUS'. */
  rows: string[];
  /** Measure names, e.g. ['GROSS_AMOUNT']. */
  measures: string[];
  /** Reference query returning the row attributes (by their column name) and the measures, in this order. */
  expected: string;
  /** Known wrong results with a targeted message. */
  diagnose?: { sql: string; message: string }[];
  ok?: string;
  /** Chapter 8: query as this user (data access controls apply), e.g. 'MBRANDT'. */
  asUser?: string;
}

export type Check = ResultCheck | StructureCheck | QuestionCheck | RuleCheck | MetricCheck | ModelCheck;

/** Rule IDs of the senior architect's review, see review.ts. */
export type ReviewRule = 'no_select_star' | 'alias_aggregates' | 'explicit_join' | 'no_logic_in_inbound' | 'case_else';

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
  /** Runs after `setup` once the database has the set-up objects, e.g. last night's scheduled run (chapter 10). */
  setupAsync?: (tenant: TenantState) => Promise<void>;
}
