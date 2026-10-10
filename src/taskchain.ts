import type { TenantState } from './tenant';
import { isShared } from './tenant';
import { findObject, objectKey, type RepoObject } from './repo';
import { addRun, runFlow, lockError, createRemoteView, countRows, type Run, type StepResult } from './integration';
import { persistView, persistError } from './perf';
import { runDataFlow } from './dataflow';

/**
 * Task chains (chapter 10, Handbuch 6.8, 10.3.6, 10.5): several integration tasks run as one unit, in a fixed order,
 * on demand or on a schedule, with an email notification when the chain fails or completes.
 *
 * Steps (simplified, docs/DECISIONS.md): replication flows with load type Initial Only, view persistence, remote table
 * snapshots and other task chains (nested). Steps are objects of the chain's own space; a chain of another space can be
 * nested once it is shared with this space (global task chains, since 2024). Steps run one after another; parallel
 * branches with ALL/ANY are explained, not simulated. A failed step stops the chain; the rest is not run.
 */

export type StepType = 'Replication Flow' | 'View Persistence' | 'Remote Table Replication' | 'Task Chain' | 'Data Flow';

export interface ChainStep {
  /** SPACE.NAME of the object. */
  object: string;
  type: StepType;
}

export interface ChainDef {
  steps: ChainStep[];
  /** Email notification (simulated: the message appears in the run log and as a notice). */
  notify: { onFailure: boolean; onSuccess: boolean; recipients: string };
}

export const emptyChain = (): ChainDef => ({ steps: [], notify: { onFailure: false, onSuccess: false, recipients: '' } });

const stepTypeOf = (o: RepoObject): StepType | null =>
  o.kind === 'Replication Flow' ? 'Replication Flow'
    : o.kind === 'SQL View' ? 'View Persistence'
      : o.kind === 'Remote Table' ? 'Remote Table Replication'
        : o.kind === 'Task Chain' ? 'Task Chain'
          : o.kind === 'Data Flow' ? 'Data Flow' : null;

/** Objects that can be added as a step to a chain of this space (deployed; chains also when shared with the space). */
export function stepCandidates(t: TenantState, space: string, self?: string): { o: RepoObject; type: StepType }[] {
  return t.objects
    .filter((o) => !!o.deployed && objectKey(o) !== self && (o.space === space || (o.kind === 'Task Chain' && isShared(t, objectKey(o), space))))
    .map((o) => ({ o, type: stepTypeOf(o) }))
    .filter((x): x is { o: RepoObject; type: StepType } => x.type !== null);
}

/** Why an object cannot be a step of a chain in this space, or null. */
export function stepError(t: TenantState, space: string, step: ChainStep, self?: string): string | null {
  const o = findObject(t, step.object);
  const name = step.object.split('.')[1];
  if (!o) return `${name} does not exist any more.`;
  if (!o.deployed) return `${name} is not deployed.`;
  if (o.space !== space && !(o.kind === 'Task Chain' && isShared(t, step.object, space))) {
    return o.kind === 'Task Chain'
      ? `${name} belongs to ${o.space} and is not shared with ${space}. Share the task chain with ${space} to nest it here.`
      : `${name} belongs to ${o.space}. A task chain runs objects of its own space; nest a task chain of ${o.space} instead.`;
  }
  if (o.kind === 'Replication Flow' && o.deployed.flow?.objects.some((x) => x.loadType === 'Initial and Delta')) {
    return `${name} has load type Initial and Delta: once started, it keeps replicating changes and never ends. A task chain can only run replication flows with load type Initial Only.`;
  }
  if (o.kind === 'SQL View') {
    const blocked = persistError(t, o);
    if (blocked) return blocked;
  }
  if (o.kind === 'Task Chain' && self && reaches(t, step.object, self)) return `${name} contains this task chain itself. A chain cannot run itself.`;
  return null;
}

/** Does the chain `from` (transitively) contain the chain `target`? */
function reaches(t: TenantState, from: string, target: string, seen = new Set<string>()): boolean {
  if (from === target) return true;
  if (seen.has(from)) return false;
  seen.add(from);
  const def = findObject(t, from)?.deployed?.chain;
  return !!def?.steps.some((s) => s.type === 'Task Chain' && reaches(t, s.object, target, seen));
}

/** Everything that must be right before a chain can be deployed. Null if fine. */
export function chainError(t: TenantState, space: string, def: ChainDef, self?: string): string | null {
  if (!def.steps.length) return 'Add at least one step.';
  const dup = def.steps.find((s, i) => def.steps.findIndex((x) => x.object === s.object) !== i);
  if (dup) return `${dup.object.split('.')[1]} is in the chain twice.`;
  for (const [i, s] of def.steps.entries()) {
    const err = stepError(t, space, s, self);
    if (err) return `Step ${i + 1}: ${err}`;
  }
  if ((def.notify.onFailure || def.notify.onSuccess) && !def.notify.recipients.trim()) return 'Enter at least one recipient for the email notification.';
  return null;
}

const now = () => new Date().toISOString();
const fmt = (n: number) => n.toLocaleString('en-US');

/** Simulated duration of a task at production volume (ms). */
const durationOf = (records: number) => Math.round(1200 + records * 3.1);

async function runStep(t: TenantState, step: ChainStep, depth: number): Promise<StepResult> {
  const o = findObject(t, step.object);
  const name = step.object.split('.')[1];
  const base = { object: step.object, type: step.type };
  if (!o?.deployed) return { ...base, status: 'Failed', records: 0, ms: 0, message: `${name} is not deployed.` };
  if (step.type === 'Replication Flow') {
    const r = await runFlow(t, o);
    r.ms = durationOf(r.records);
    const status = r.status === 'Failed' ? 'Failed' : 'Completed';
    return { ...base, status, records: r.records, ms: r.ms, runId: r.id, message: r.messages[r.messages.length - 1] ?? '' };
  }
  if (step.type === 'Data Flow') {
    const r = await runDataFlow(t, o);
    r.ms = durationOf(r.records * 6);
    return { ...base, status: r.status === 'Failed' ? 'Failed' : 'Completed', records: r.records, ms: r.ms, runId: r.id, message: r.messages[r.messages.length - 1] ?? '' };
  }
  if (step.type === 'View Persistence') {
    const res = await persistView(t, o, 'Task Chain');
    const r = t.runs.find((x) => x.object === step.object);
    if (r) r.ms = durationOf(r.records * 4);
    return { ...base, status: res.ok ? 'Completed' : 'Failed', records: o.persisted?.records ?? 0, ms: r?.ms ?? 0, runId: r?.id, message: res.message };
  }
  if (step.type === 'Remote Table Replication') {
    const locked = lockError(t, o.space);
    if (locked) {
      const r = addRun(t, { object: step.object, kind: 'Remote Table', start: now(), status: 'Failed', records: 0, messages: ['Task chain run: Load New Snapshot.', locked] });
      return { ...base, status: 'Failed', records: 0, ms: 0, runId: r.id, message: locked };
    }
    await createRemoteView(t, o);
    const n = await countRows(o.space, o.name);
    o.remote!.access = 'Replicated (Snapshot)';
    o.remote!.lastRefresh = now();
    o.remote!.records = n;
    const r = addRun(t, { object: step.object, kind: 'Remote Table', start: now(), status: 'Completed', records: n, ms: durationOf(n), messages: [`Task chain run: snapshot of ${o.remote!.source} loaded: ${fmt(n)} records.`] });
    return { ...base, status: 'Completed', records: n, ms: r.ms ?? 0, runId: r.id, message: `Snapshot loaded, ${fmt(n)} records.` };
  }
  if (depth > 4) return { ...base, status: 'Failed', records: 0, ms: 0, message: 'Task chains are nested too deeply.' };
  const r = await runChain(t, o, 'Task Chain', depth + 1);
  return { ...base, status: r.status === 'Failed' ? 'Failed' : 'Completed', records: r.records, ms: r.ms ?? 0, runId: r.id, message: r.messages[r.messages.length - 1] ?? '' };
}

/** Runs the deployed version of a chain, step by step. Logs one run for the chain and one per step in its own monitor. */
export async function runChain(t: TenantState, o: RepoObject, trigger: 'Manual' | 'Scheduled' | 'Task Chain' = 'Manual', depth = 0): Promise<Run> {
  const key = objectKey(o);
  const start = now();
  const def = o.deployed?.chain;
  if (!def) return addRun(t, { object: key, kind: 'Task Chain', start, status: 'Failed', records: 0, messages: ['The task chain is not deployed.'] });
  const steps: StepResult[] = [];
  const messages = [`${trigger === 'Task Chain' ? 'Started by a parent task chain' : `${trigger} run`}: ${def.steps.length} step${def.steps.length === 1 ? '' : 's'}.`];
  let failed = false;
  for (const [i, s] of def.steps.entries()) {
    if (failed) {
      steps.push({ object: s.object, type: s.type, status: 'Not Run', records: 0, ms: 0, message: 'Not run: an earlier step failed.' });
      continue;
    }
    const pre = stepError(t, o.space, s, key);
    const res = pre ? { object: s.object, type: s.type, status: 'Failed' as const, records: 0, ms: 0, message: pre } : await runStep(t, s, depth);
    steps.push(res);
    messages.push(`Step ${i + 1} ${s.object.split('.')[1]} (${s.type}): ${res.status}${res.status === 'Completed' ? `, ${fmt(res.records)} records` : ''}.`);
    if (res.status === 'Failed') {
      failed = true;
      messages.push(`Step ${i + 1} failed: ${res.message}`);
    }
  }
  const total = steps.reduce((sum, s) => sum + s.ms, 0);
  const records = steps.reduce((sum, s) => sum + s.records, 0);
  messages.push(failed ? `Task chain ${o.name} failed. The remaining steps were not run.` : `Task chain ${o.name} completed.`);
  const mail = def.notify.recipients.trim();
  if (mail && ((failed && def.notify.onFailure) || (!failed && def.notify.onSuccess))) {
    messages.push(`Email sent to ${mail}: task chain ${o.name} ${failed ? 'failed' : 'completed'}.`);
  }
  return addRun(t, { object: key, kind: 'Task Chain', start, status: failed ? 'Failed' : 'Completed', records, ms: total, messages, steps });
}

/** Did the last run of this chain send a failure email? */
export const mailedOnFailure = (r?: Run) => !!r?.messages.some((m) => m.startsWith('Email sent to') && m.endsWith('failed.'));

const KEY = /^[A-Z0-9_]{1,20}\.[A-Z_][A-Z0-9_]{0,49}$/;
const TYPES: StepType[] = ['Replication Flow', 'View Persistence', 'Remote Table Replication', 'Task Chain', 'Data Flow'];

export function sanitizeChain(d: unknown): ChainDef | undefined {
  if (!d || typeof d !== 'object') return undefined;
  const x = d as Record<string, unknown>;
  const steps = (Array.isArray(x.steps) ? x.steps : [])
    .filter((s) => s && typeof s.object === 'string' && KEY.test(s.object) && TYPES.includes(s.type))
    .slice(0, 20)
    .map((s) => ({ object: s.object as string, type: s.type as StepType }));
  const n = (x.notify && typeof x.notify === 'object' ? x.notify : {}) as Record<string, unknown>;
  return { steps, notify: { onFailure: !!n.onFailure, onSuccess: !!n.onSuccess, recipients: String(n.recipients ?? '').slice(0, 200) } };
}
