import { runSql, listObjects, describeColumns, type QueryResult } from '../db';
import { review, type ReviewNote } from './review';
import type { Mission, ResultCheck, StructureCheck, QuestionCheck, RuleCheck, RuleContext, MetricCheck, ModelCheck } from './types';
import { accessError, type TenantState } from '../tenant';
import { findObject } from '../repo';
import { attributeCatalog, modelSources, modelSql } from '../analytic';
import { securedFrom } from '../dac';

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
  events: string[];
}

export async function checkMission(mission: Mission, input: CheckInput): Promise<CheckReport> {
  const outcomes: CheckOutcome[] = [];
  let notes: ReviewNote[] = [];

  const needsQuery = mission.checks.some((c) => c.type === 'result' && !c.object);
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
    if (check.type === 'result' && check.object) {
      outcomes.push(await checkObject(check, input.tenant));
    } else if (check.type === 'result') {
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
      outcomes.push(checkRule(check, { tenant: input.tenant, events: new Set(input.events) }));
    } else if (check.type === 'metric') {
      outcomes.push(await checkMetric(check));
    } else if (check.type === 'model') {
      outcomes.push(await checkModel(check, input.tenant));
    } else {
      outcomes.push(checkQuestion(check, input.answers[check.id]));
    }
  }

  if (player && query) notes = review(query, player.columns, mission.review);
  else {
    // Missions about deployed views: review what runs, i.e. the deployed SQL of the first checked view.
    const first = mission.checks.find((c): c is ResultCheck => c.type === 'result' && !!c.object);
    const o = first && findObject(input.tenant, first.object!);
    if (o?.deployed?.sql) notes = review(o.deployed.sql, [], mission.review);
  }
  return { passed: outcomes.every((o) => o.ok), outcomes, notes };
}

// ---------------------------------------------------------------- result

async function checkResult(check: ResultCheck, player: QueryResult, named = false, table?: string): Promise<CheckOutcome> {
  const tol = check.tolerance ?? 0.01;
  const refs = Array.isArray(check.expected) ? check.expected : [check.expected];
  const subject = table ?? (named ? 'Your view' : 'Your query');
  let best: Comparison | null = null;
  for (const sql of refs) {
    const cmp = compare(player, await runSql(sql), !!check.ordered, tol, named, subject);
    if (cmp.match) return { label: check.label, ok: true, message: named ? `${check.object} delivers what the ticket asks for.` : 'Your result matches what the ticket asks for.' };
    if (!best || cmp.score > best.score) best = cmp;
  }
  for (const d of check.diagnose ?? []) {
    if (compare(player, await runSql(d.sql), !!check.ordered, tol, named, subject).match) return { label: check.label, ok: false, message: d.message };
  }
  const known = check.counts?.[player.rows.length];
  if (known) return { label: check.label, ok: false, message: known };
  return { label: check.label, ok: false, message: best!.reason };
}

/** Result check on a deployed view: reads its runtime version and compares the named columns. */
async function checkObject(check: ResultCheck, tenant: TenantState): Promise<CheckOutcome> {
  const fail = (message: string) => ({ label: check.label, ok: false, message });
  const [space, name] = check.object!.split('.');
  const o = findObject(tenant, check.object!);
  if (!o) {
    const elsewhere = tenant.objects.find((x) => x.name === name);
    return fail(elsewhere
      ? `${name} exists, but in ${elsewhere.space}. It belongs in ${space}: switch the Data Builder to ${space} and create it there.`
      : `There is no object ${name} in ${space} yet. Create a SQL view with exactly this technical name.`);
  }
  if (!o.deployed) return fail(`${name} is saved, but not deployed. Checks read what runs in the database: press Deploy.`);
  if (o.status === 'changes') return fail(`${name} has saved changes that are not deployed yet. The runtime still uses the old version: press Deploy.`);
  const have = await describeColumns(space, name);
  const byUpper = new Map(have.map((c) => [c.name.toUpperCase(), c.name]));
  const missing = (check.columns ?? []).filter((c) => !byUpper.has(c.toUpperCase()));
  if (missing.length) {
    return fail(`${name} has no column ${missing.join(', ')}. Name the output columns exactly as the ticket says, with AS where you calculate.`);
  }
  const cols = (check.columns ?? []).map((c) => `"${byUpper.get(c.toUpperCase())}"`).join(', ');
  let player: QueryResult;
  try {
    player = await runSql(`SELECT ${cols} FROM "${space}"."${name}"`);
  } catch (err) {
    return fail(`${name} does not run any more: ${err instanceof Error ? err.message : String(err)}`);
  }
  return checkResult(check, player, true, o.kind === 'Local Table' ? `Table ${name}` : undefined);
}

interface Comparison {
  match: boolean;
  /** Higher is closer; used to pick the most helpful message when several references exist. */
  score: number;
  reason: string;
}

function compare(player: QueryResult, expected: QueryResult, ordered: boolean, tol: number, named = false, subject = 'Your query'): Comparison {
  const pc = player.columns.length;
  const ec = expected.columns.length;
  const pr = player.rows.length;
  const er = expected.rows.length;
  if (pc !== ec) {
    return {
      match: false,
      score: 0,
      reason: `${subject === 'Your query' ? 'Your result' : subject} has ${pc} ${pc === 1 ? 'column' : 'columns'}, the ticket needs ${ec}. Check what you list after SELECT.`,
    };
  }
  if (pr !== er) {
    const more = pr > er;
    return {
      match: false,
      score: 1,
      reason: `${subject} ${subject.startsWith('Your') ? 'returns' : 'holds'} ${pr} ${pr === 1 ? 'row' : 'rows'}, the ticket needs ${er}. ${
        !subject.startsWith('Your') ? `${more ? 'It has too many rows' : 'Rows are missing'}: look at how the table is loaded and when it last ran.`
          : more ? 'You have too many rows: check your filter (WHERE), your grouping (GROUP BY) or a LIMIT.' : 'Rows are missing: check your filter (WHERE) or your joins.'
      }`,
    };
  }

  // Column order and names are the player's choice: try every column order (at most 6 columns, 720 orders).
  const key = (v: unknown) => cellKey(v, tol);
  const expRows = expected.rows.map((r) => r.map(key));
  let bestMatched = -1;
  let orderOnly = false;
  // Views are compared by column name (the check selects the columns in order): no need to try other orders.
  for (const perm of named ? [[...Array(pc).keys()]] : permutations(pc)) {
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
    reason: named
      ? `The number of rows is right (${er}), but only ${bestMatched} of ${er} rows have the right values. Compare a few rows in the Data Preview with what the ticket asks for, column by column.`
      : `The shape is right (${er} rows, ${ec} columns), but only ${bestMatched} of ${er} rows have the right values. Check your filter, what you count or add up, and which column you group by.`,
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
  const extra = (check.absent?.columns ?? []).filter((c) => have.has(c.toUpperCase()));
  if (extra.length) return { label: check.label, ok: false, message: `${check.object} has the column ${extra.join(', ')}. ${check.absent!.message}` };
  return { label: check.label, ok: true, message: `${check.space}.${check.object} is in place.` };
}

// ---------------------------------------------------------------- rule

function checkRule(check: RuleCheck, ctx: RuleContext): CheckOutcome {
  const problem = check.test(ctx);
  return problem ? { label: check.label, ok: false, message: problem } : { label: check.label, ok: true, message: check.ok ?? 'Done.' };
}

// ---------------------------------------------------------------- metric

async function checkMetric(check: MetricCheck): Promise<CheckOutcome> {
  let value: number;
  try {
    const res = await runSql(check.sql);
    value = Number(res.rows[0]?.[0] ?? 0);
  } catch {
    return { label: check.label, ok: false, message: check.missing ?? 'Build and deploy the view first.' };
  }
  const problem = check.test(value);
  return problem ? { label: check.label, ok: false, message: problem } : { label: check.label, ok: true, message: check.ok ?? 'Done.' };
}

// ---------------------------------------------------------------- analytic model

async function checkModel(check: ModelCheck, tenant: TenantState): Promise<CheckOutcome> {
  const fail = (message: string) => ({ label: check.label, ok: false, message });
  const [space, name] = check.object.split('.');
  const o = findObject(tenant, check.object);
  if (!o || o.kind !== 'Analytic Model') {
    const elsewhere = tenant.objects.find((x) => x.name === name);
    if (elsewhere && elsewhere.kind !== 'Analytic Model') return fail(`${name} is a ${elsewhere.kind}. The ticket needs an analytic model with this name.`);
    return fail(elsewhere ? `${name} is in ${elsewhere.space}; it belongs in ${space}.` : `There is no analytic model ${name} in ${space} yet.`);
  }
  const def = o.deployed?.model;
  if (!def) return fail(`${name} is saved, but not deployed. SAP Analytics Cloud only sees deployed models: press Deploy.`);
  if (o.status === 'changes') return fail(`${name} has saved changes that are not deployed yet. Deploy them.`);
  const src = modelSources(tenant, def.fact);
  if (typeof src === 'string') return fail(src);
  const catalog = attributeCatalog(def, src);
  for (const r of check.rows) {
    if (!catalog.some((a) => a.id === r)) {
      const dim = r.includes('.') ? r.split('.')[0] : '';
      return fail(dim ? `The model does not offer ${r.split('.')[1]}: add the dimension ${dim} to the model.` : `The model does not offer the attribute ${r}.`);
    }
  }
  const missing = check.measures.filter((m) => !def.measures.some((x) => x.name === m));
  if (missing.length) return fail(`${name} has no measure ${missing.join(', ')}. Name the measures exactly as the ticket says.`);
  let player: QueryResult;
  try {
    player = await runSql(modelSql(def, src, { rows: check.rows, measures: check.measures, from: check.asUser ? (k) => securedFrom(tenant, k, check.asUser) : undefined }));
  } catch (err) {
    return fail(`${name} does not run: ${err instanceof Error ? err.message : String(err)}`);
  }
  const what = `${check.measures.join(', ')}${check.rows.length ? ` by ${check.rows.map((r) => r.split('.').pop()).join(', ')}` : ''}${check.asUser ? ` as ${check.asUser}` : ''}`;
  const tol = 0.01;
  if (compare(player, await runSql(check.expected), false, tol, true, 'The model').match) {
    return { label: check.label, ok: true, message: check.ok ?? `${what} is right.` };
  }
  for (const d of check.diagnose ?? []) {
    if (compare(player, await runSql(d.sql), false, tol, true, 'The model').match) return fail(d.message);
  }
  return fail(`${what} does not give the expected figures. Compare it in the Data Preview with what the ticket asks for.`);
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
  return statements(sql).pop() ?? '';
}

/** Non-empty statements without comments; semicolons inside quotes and comments do not split. */
export function statements(sql: string): string[] {
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
  return parts.map((p) => p.trim()).filter(Boolean);
}
