import { runSql, listObjects, type QueryResult } from '../db';
import { review, type ReviewNote } from './review';
import type { Mission, ResultCheck, StructureCheck, QuestionCheck, RuleCheck, RuleContext } from './types';
import { accessError, type TenantState } from '../tenant';

/**
 * Check engine: result check (result set vs. reference solution, independent of writing style),
 * structure check (objects in spaces) and question checks. The review adds best-practice notes.
 */

export interface CheckOutcome {
  label: string;
  ok: boolean;
  message: string;
}

export interface CheckReport {
  passed: boolean;
  outcomes: CheckOutcome[];
  notes: ReviewNote[];
}

export interface CheckInput {
  /** Everything in the editor. The last statement is the player's answer query. */
  sql: string;
  /** Question ID → chosen option index. */
  answers: Record<string, number | undefined>;
  tenant: TenantState;
}

export async function checkMission(mission: Mission, input: CheckInput): Promise<CheckReport> {
  const outcomes: CheckOutcome[] = [];
  let notes: ReviewNote[] = [];

  const needsQuery = mission.checks.some((c) => c.type === 'result');
  let player: QueryResult | null = null;
  let playerError = '';
  const query = lastStatement(input.sql);
  if (needsQuery) {
    if (!query) playerError = 'The editor is empty. Write the query that answers the ticket, then check again.';
    else if (!/^\s*(select|with|from|values|\()/i.test(query))
      playerError = 'The last statement in the editor must be the query that answers the ticket (a SELECT).';
    else if ((playerError = accessError(query, input.tenant.activeSpace, input.tenant) ?? '')) {
      /* the sharing guard explains what is missing */
    } else {
      try {
        player = await runSql(query);
      } catch (err) {
        playerError = `Your query does not run: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  }

  for (const check of mission.checks) {
    if (check.type === 'result') {
      if (player && check.space && input.tenant.activeSpace !== check.space) {
        outcomes.push({
          label: check.label,
          ok: false,
          message: `Your query ran in space ${input.tenant.activeSpace}. The ticket needs it to run in ${check.space}: switch the Data Builder to ${check.space}.`,
        });
      } else {
        outcomes.push(player ? await checkResult(check, player) : { label: check.label, ok: false, message: playerError });
      }
    } else if (check.type === 'structure') {
      outcomes.push(await checkStructure(check));
    } else if (check.type === 'rule') {
      outcomes.push(checkRule(check, { tenant: input.tenant }));
    } else {
      outcomes.push(checkQuestion(check, input.answers[check.id]));
    }
  }

  if (player && query) notes = review(query, player.columns, mission.review);
  return { passed: outcomes.every((o) => o.ok), outcomes, notes };
}

// ---------------------------------------------------------------- result

async function checkResult(check: ResultCheck, player: QueryResult): Promise<CheckOutcome> {
  const tol = check.tolerance ?? 0.01;
  const refs = Array.isArray(check.expected) ? check.expected : [check.expected];
  let best: Comparison | null = null;
  for (const sql of refs) {
    const cmp = compare(player, await runSql(sql), !!check.ordered, tol);
    if (cmp.match) return { label: check.label, ok: true, message: 'Your result matches what the ticket asks for.' };
    if (!best || cmp.score > best.score) best = cmp;
  }
  for (const d of check.diagnose ?? []) {
    if (compare(player, await runSql(d.sql), !!check.ordered, tol).match) return { label: check.label, ok: false, message: d.message };
  }
  return { label: check.label, ok: false, message: best!.reason };
}

interface Comparison {
  match: boolean;
  /** Higher is closer; used to pick the most helpful message when several references exist. */
  score: number;
  reason: string;
}

function compare(player: QueryResult, expected: QueryResult, ordered: boolean, tol: number): Comparison {
  const pc = player.columns.length;
  const ec = expected.columns.length;
  const pr = player.rows.length;
  const er = expected.rows.length;
  if (pc !== ec) {
    return {
      match: false,
      score: 0,
      reason: `Your result has ${pc} ${pc === 1 ? 'column' : 'columns'}, the ticket needs ${ec}. Check what you list after SELECT.`,
    };
  }
  if (pr !== er) {
    const more = pr > er;
    return {
      match: false,
      score: 1,
      reason: `Your query returns ${pr} ${pr === 1 ? 'row' : 'rows'}, the ticket needs ${er}. ${
        more ? 'You have too many rows: check your filter (WHERE), your grouping (GROUP BY) or a LIMIT.' : 'Rows are missing: check your filter (WHERE) or your joins.'
      }`,
    };
  }

  // Column order and names are the player's choice: try every column order (at most 6 columns, 720 orders).
  const key = (v: unknown) => cellKey(v, tol);
  const expRows = expected.rows.map((r) => r.map(key));
  let bestMatched = -1;
  let orderOnly = false;
  for (const perm of permutations(pc)) {
    const rows = player.rows.map((r) => perm.map((i) => key(r[i])));
    const matched = countMultisetMatches(rows, expRows);
    if (matched === er) {
      if (!ordered || rows.every((r, i) => r.join('\u0001') === expRows[i].join('\u0001'))) {
        return { match: true, score: 3, reason: '' };
      }
      orderOnly = true;
    }
    bestMatched = Math.max(bestMatched, matched);
  }
  if (orderOnly) {
    return { match: false, score: 2.5, reason: 'You have exactly the right rows, but not in the order the ticket asks for. Check your ORDER BY.' };
  }
  return {
    match: false,
    score: 2 + bestMatched / Math.max(1, er),
    reason: `The shape is right (${er} rows, ${ec} columns), but only ${bestMatched} of ${er} rows have the right values. Check your filter, what you count or add up, and which column you group by.`,
  };
}

function cellKey(v: unknown, tol: number): string {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'bigint') v = Number(v);
  if (typeof v === 'number') return `n${Math.round(v / tol)}`;
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) return `n${Math.round(Number(v) / tol)}`;
  return `s${typeof v === 'object' ? JSON.stringify(v) : String(v)}`;
}

function countMultisetMatches(rows: string[][], expected: string[][]): number {
  const bag = new Map<string, number>();
  for (const r of expected) {
    const k = r.join('\u0001');
    bag.set(k, (bag.get(k) ?? 0) + 1);
  }
  let n = 0;
  for (const r of rows) {
    const k = r.join('\u0001');
    const left = bag.get(k) ?? 0;
    if (left > 0) {
      n++;
      bag.set(k, left - 1);
    }
  }
  return n;
}

function* permutations(n: number): Generator<number[]> {
  const idx = [...Array(n).keys()];
  if (n > 6) {
    yield idx; // too many columns to try every order; compare as written
    return;
  }
  function* rec(prefix: number[], rest: number[]): Generator<number[]> {
    if (!rest.length) yield prefix;
    for (let i = 0; i < rest.length; i++) yield* rec([...prefix, rest[i]], [...rest.slice(0, i), ...rest.slice(i + 1)]);
  }
  yield* rec([], idx);
}

// ---------------------------------------------------------------- structure

async function checkStructure(check: StructureCheck): Promise<CheckOutcome> {
  const objects = await listObjects();
  const name = check.object.toUpperCase();
  const found = objects.find((o) => o.name.toUpperCase() === name);
  if (!found) return { label: check.label, ok: false, message: `There is no object called ${check.object} yet.` };
  if (found.schema.toUpperCase() !== check.space.toUpperCase()) {
    return { label: check.label, ok: false, message: `${check.object} exists, but in ${found.schema}. It belongs in ${check.space}.` };
  }
  if (check.kind && found.type !== check.kind) {
    return { label: check.label, ok: false, message: `${check.object} is a ${found.type.toLowerCase()}, the ticket needs a ${check.kind.toLowerCase()}.` };
  }
  const have = new Set(found.columns.map((c) => c.toUpperCase()));
  const missing = (check.columns ?? []).filter((c) => !have.has(c.toUpperCase()));
  if (missing.length) return { label: check.label, ok: false, message: `${check.object} is missing the column ${missing.join(', ')}.` };
  return { label: check.label, ok: true, message: `${check.space}.${check.object} is in place.` };
}

// ---------------------------------------------------------------- rule

function checkRule(check: RuleCheck, ctx: RuleContext): CheckOutcome {
  const problem = check.test(ctx);
  return problem ? { label: check.label, ok: false, message: problem } : { label: check.label, ok: true, message: check.ok ?? 'Done.' };
}

// ---------------------------------------------------------------- question

function checkQuestion(check: QuestionCheck, chosen: number | undefined): CheckOutcome {
  if (chosen === undefined) return { label: check.label, ok: false, message: 'Pick an answer in the mission panel.' };
  if (chosen === check.answer) return { label: check.label, ok: true, message: 'Correct.' };
  return { label: check.label, ok: false, message: check.nudge };
}

// ---------------------------------------------------------------- helpers

/** Last non-empty statement; ignores semicolons inside quotes and comments. */
export function lastStatement(sql: string): string {
  const parts: string[] = [];
  let cur = '';
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === "'" || ch === '"') {
      const end = sql.indexOf(ch, i + 1);
      const stop = end === -1 ? sql.length : end + 1;
      cur += sql.slice(i, stop);
      i = stop;
    } else if (ch === '-' && sql[i + 1] === '-') {
      const end = sql.indexOf('\n', i);
      i = end === -1 ? sql.length : end;
    } else if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? sql.length : end + 2;
    } else if (ch === ';') {
      parts.push(cur);
      cur = '';
      i++;
    } else {
      cur += ch;
      i++;
    }
  }
  parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean).pop() ?? '';
}
