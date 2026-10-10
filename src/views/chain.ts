import { ctx } from '../ctx';
import {
  STATUS_LABEL, STATUS_HELP, objectKey, objectNameError, suggestTechnicalName, touch, deploy, type RepoObject,
} from '../repo';
import { chainError, stepCandidates, stepError, emptyChain, type ChainDef, type StepType } from '../taskchain';
import { lockError, lastRun } from '../integration';
import { esc, spaceChip, ICONS, toast, openDialog, fmtDate } from '../ui';
import { objectToolbar, bindDetails, propsHead } from './toolbar';
import { startChainRun, scheduleDialog, stepTable } from './monitor';

/**
 * Task Chain editor (chapter 10, Handbuch 6.8): steps in a fixed order, email notification, Save/Deploy, Run and Schedule.
 * The real editor is a canvas with drag and drop and parallel branches; the game shows the steps as a list (simplified).
 */

export interface ChainNav {
  back: () => void;
  opened: (key: string) => void;
}

let fresh: { space: string; def: ChainDef; business: string; technical: string; touched: boolean } | null = null;

export function newChainDraft() {
  fresh = null;
}

const TYPE_TEXT: Record<StepType, string> = {
  'Replication Flow': 'Runs the replication flow once',
  'View Persistence': 'Persists the view: runs it and stores the result',
  'Remote Table Replication': 'Loads a new snapshot of the remote table',
  'Data Flow': 'Runs the data flow and writes its target table',
  'Transformation Flow': 'Runs the transformation flow: the full load, or only the changes by delta',
  'Task Chain': 'Runs another task chain with all its steps',
};

export function renderChainEditor(main: HTMLElement, o: RepoObject | null, nav: ChainNav) {
  const t = ctx.tenant();
  const space = o?.space ?? t.activeSpace;
  const readOnly = !!o && o.space !== t.activeSpace;
  if (!o && (!fresh || fresh.space !== space)) fresh = { space, def: emptyChain(), business: '', technical: '', touched: false };
  const def: ChainDef = o ? structuredClone(o.chain ?? emptyChain()) : fresh!.def;
  let business = o?.businessName ?? fresh!.business;
  let technical = o?.name ?? fresh!.technical;
  let techTouched = o ? true : fresh!.touched;
  const self = o ? objectKey(o) : undefined;
  const keep = () => {
    if (!o && fresh) Object.assign(fresh, { def, business, technical, touched: techTouched });
  };

  const draw = () => {
    keep();
    const run = o ? lastRun(t, objectKey(o)) : undefined;
    main.innerHTML = `
      <div class="editor-page is-chain">
        ${objectToolbar({
          space,
          title: business || 'New Task Chain',
          sub: `Task Chain · ${space}.${technical || '…'}`,
          statusHtml: o ? `<span class="status" data-status="${o.status}">${STATUS_LABEL[o.status]}</span>` : `<span class="status" data-status="new">New</span>`,
          groups: [
            { label: 'General', buttons: [
              { id: 'ed-save', icon: ICONS.save, label: 'Save', title: 'Save (design time)', disabled: readOnly },
              { id: 'ed-deploy', icon: ICONS.deploy, label: 'Deploy', title: 'Deploy (runtime)', disabled: readOnly },
            ] },
            { label: 'Run', buttons: [
              { id: 'chain-run', icon: ICONS.preview, label: 'Run', title: 'Run the deployed task chain now', disabled: readOnly || !o?.deployed },
              { id: 'chain-schedule', icon: ICONS.flow, label: 'Schedule', title: 'Run it regularly', disabled: readOnly || !o?.deployed },
            ] },
          ],
        })}
        <div class="ed-body">
          <section class="ed-center chain-center">
            ${readOnly ? `<p class="consent-banner" role="note"><span>This task chain belongs to ${esc(o!.space)} and is shared with ${esc(t.activeSpace)}: you can nest it in a chain of ${esc(t.activeSpace)}, but not change it here.</span></p>` : ''}
            <div class="tbl-section">
              <div class="table-head"><h3>Steps</h3>${readOnly ? '' : '<button class="btn small" type="button" id="chain-add">Add Step</button>'}</div>
              <p class="muted">The steps run one after another. A step starts when the one before it completed; if a step fails, the rest is not run.</p>
              <ol class="chain-steps" id="chain-steps">${def.steps.length ? def.steps.map((s, i) => {
                const err = stepError(t, space, s, self);
                const [sp, nm] = s.object.split('.');
                return `<li class="chain-step ${err ? 'bad' : ''}" data-step="${i}">
                  <span class="chain-nr">${i + 1}</span>
                  <div class="chain-body"><div class="chain-title"><b class="mono">${esc(nm)}</b>${sp !== space ? spaceChip(sp) : ''}</div><small>${esc(s.type)} · ${esc(TYPE_TEXT[s.type])}</small>
                    ${err ? `<small class="form-error">${esc(err)}</small>` : ''}</div>
                  ${readOnly ? '' : `<div class="chain-tools">
                    <button type="button" class="tb-icon" data-up="${i}" ${i === 0 ? 'disabled' : ''} title="Move up" aria-label="Move ${esc(nm)} up">↑</button>
                    <button type="button" class="tb-icon" data-down="${i}" ${i === def.steps.length - 1 ? 'disabled' : ''} title="Move down" aria-label="Move ${esc(nm)} down">↓</button>
                    <button type="button" class="tb-icon" data-remove="${i}" title="Remove" aria-label="Remove ${esc(nm)}">✕</button></div>`}
                </li>`;
              }).join('<li class="chain-arrow" aria-hidden="true">↓</li>') : '<li class="muted">No steps yet. Add the first one.</li>'}</ol>
              <p class="muted small-note">In a real tenant the steps sit on a canvas, and parallel branches are joined by an operator that waits for
                <b>ALL</b> or <b>ANY</b> of them. The game runs the steps in sequence.</p>
            </div>
            <div class="tbl-section">
              <h3>Email Notification</h3>
              <div class="chain-notify" id="chain-notify">
                <label class="check-line"><input type="checkbox" id="notify-fail" ${def.notify.onFailure ? 'checked' : ''} ${readOnly ? 'disabled' : ''}> When the task chain fails</label>
                <label class="check-line"><input type="checkbox" id="notify-ok" ${def.notify.onSuccess ? 'checked' : ''} ${readOnly ? 'disabled' : ''}> When the task chain completes</label>
                <label class="field">Recipients <small>tenant users or email addresses, separated by commas</small>
                  <input id="notify-to" value="${esc(def.notify.recipients)}" placeholder="e.g. you@rheinau.example" ${readOnly ? 'readonly' : ''} autocomplete="off"></label>
              </div>
            </div>
          </section>
          <aside class="props" id="properties" aria-label="Properties">
            ${propsHead('Model Properties', ICONS.flow, `Task Chain ${technical || ''}`)}
            <label>Business Name <small>for people</small><input id="prop-business" value="${esc(business)}" maxlength="120" autocomplete="off" ${readOnly ? 'readonly' : ''}></label>
            <label>Technical Name <small>${o ? 'fixed once saved' : 'A–Z, 0–9, _; fixed once saved'}</small>
              <input id="prop-technical" class="mono" value="${esc(technical)}" ${o ? 'readonly' : ''} maxlength="50" spellcheck="false" autocomplete="off"></label>
            <dl class="props-list">
              <dt>Type</dt><dd>Task Chain</dd>
              <dt>Space</dt><dd>${spaceChip(space)}</dd>
              <dt>Status</dt><dd>${o ? `<span class="status" data-status="${o.status}">${STATUS_LABEL[o.status]}</span><p class="muted">${STATUS_HELP[o.status]}</p>` : 'New, not saved'}</dd>
              <dt>Schedule</dt><dd>${o?.chainSchedule ? esc(o.chainSchedule) : 'None'}</dd>
            </dl>
            <p class="muted">Runs and schedules also live in the Data Integration Monitor, tab Task Chains. Scheduled runs need your consent.</p>
          </aside>
        </div>
        <div class="results" id="results">${run ? `<div class="result-status ${run.status === 'Failed' ? 'error' : 'ok'}">Last run ${fmtDate(run.start)}: ${esc(run.status)}</div>${stepTable(run)}`
          : '<div class="placeholder"><b>Runs</b> of the deployed chain appear here, with the result of each step.</div>'}</div>
      </div>`;
    bind();
  };

  function bind() {
    bindDetails(main);
    main.querySelector('#ed-back')!.addEventListener('click', nav.back);
    if (readOnly) return;
    const bn = main.querySelector<HTMLInputElement>('#prop-business')!;
    const tn = main.querySelector<HTMLInputElement>('#prop-technical')!;
    bn.addEventListener('input', () => {
      business = bn.value;
      if (!techTouched && !o) tn.value = technical = suggestTechnicalName(bn.value);
      keep();
    });
    tn.addEventListener('input', () => {
      techTouched = true;
      tn.value = technical = tn.value.toUpperCase();
      keep();
    });
    main.querySelector('#chain-add')!.addEventListener('click', addStepDialog);
    const move = (i: number, d: number) => {
      const [s] = def.steps.splice(i, 1);
      def.steps.splice(i + d, 0, s);
      draw();
    };
    main.querySelectorAll<HTMLButtonElement>('[data-up]').forEach((b) => b.addEventListener('click', () => move(Number(b.dataset.up), -1)));
    main.querySelectorAll<HTMLButtonElement>('[data-down]').forEach((b) => b.addEventListener('click', () => move(Number(b.dataset.down), 1)));
    main.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach((b) =>
      b.addEventListener('click', () => {
        def.steps.splice(Number(b.dataset.remove), 1);
        draw();
      }),
    );
    const fail = main.querySelector<HTMLInputElement>('#notify-fail')!;
    const ok = main.querySelector<HTMLInputElement>('#notify-ok')!;
    const to = main.querySelector<HTMLInputElement>('#notify-to')!;
    fail.addEventListener('change', () => { def.notify.onFailure = fail.checked; keep(); });
    ok.addEventListener('change', () => { def.notify.onSuccess = ok.checked; keep(); });
    to.addEventListener('input', () => { def.notify.recipients = to.value; keep(); });
    main.querySelector('#ed-save')!.addEventListener('click', () => {
      if (save()) ctx.renderView();
    });
    main.querySelector('#ed-deploy')!.addEventListener('click', async () => {
      const err = chainError(t, space, def, self);
      if (err) return toast(`Deployment failed. ${err}`, 'error');
      const saved = save(true);
      if (!saved) return;
      const locked = lockError(t, saved.space);
      if (locked) return toast(`Deployment failed. ${locked}`, 'error');
      await deploy(saved);
      ctx.track(`deploy:${objectKey(saved)}`);
      ctx.save();
      toast(`${saved.name} deployed`);
      ctx.renderView();
    });
    main.querySelector('#chain-run')?.addEventListener('click', async () => {
      if (!o) return;
      await startChainRun(o);
      draw();
    });
    main.querySelector('#chain-schedule')?.addEventListener('click', () => o && chainScheduleDialog(o, draw));
  }

  function addStepDialog() {
    const cands = stepCandidates(t, space, self).filter((c) => !def.steps.some((s) => s.object === objectKey(c.o)));
    const groups: StepType[] = ['Replication Flow', 'Data Flow', 'Transformation Flow', 'View Persistence', 'Remote Table Replication', 'Task Chain'];
    const { form, close } = openDialog('Add Step', `
      <p class="guide-lead">Deployed objects of ${esc(space)}, and task chains other spaces shared with it.</p>
      ${groups.map((g) => {
        const list = cands.filter((c) => c.type === g);
        return `<fieldset class="question"><legend>${esc(g)}</legend>${list.length ? list.map((c) => `<label><input type="radio" name="step" value="${esc(objectKey(c.o))}" data-type="${esc(g)}">
          <span class="mono">${esc(c.o.name)}</span> ${c.o.space !== space ? spaceChip(c.o.space) : ''}<small class="muted">${esc(c.o.businessName)}</small></label>`).join('')
          : '<span class="muted">None.</span>'}</fieldset>`;
      }).join('')}
      <p class="form-error" role="alert"></p>
      <div class="guide-actions"><button class="btn link" type="button" data-act="cancel">Cancel</button>
        <button class="btn primary" type="submit">Add</button></div>`);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const pick = form.querySelector<HTMLInputElement>('[name="step"]:checked');
      if (!pick) {
        form.querySelector('.form-error')!.textContent = 'Choose an object.';
        return;
      }
      const step = { object: pick.value, type: pick.dataset.type as StepType };
      const err = stepError(t, space, step, self);
      if (err) {
        ctx.track(`chain-refused:${step.object}`);
        form.querySelector('.form-error')!.textContent = err;
        return;
      }
      def.steps.push(step);
      ctx.track(`chain-add:${step.object}`);
      close();
      draw();
    });
  }

  function save(quiet = false): RepoObject | null {
    const bn = business.trim();
    if (!bn) {
      toast('Enter a business name before you save.', 'error');
      return null;
    }
    if (!o) {
      const name = technical.trim();
      const err = objectNameError(name, space, t);
      if (err) {
        toast(err, 'error');
        return null;
      }
      const created: RepoObject = {
        space, name, kind: 'Task Chain', businessName: bn, semanticUsage: 'Relational Dataset',
        chain: structuredClone(def), status: 'not_deployed', changedAt: new Date().toISOString(),
      };
      t.objects.push(created);
      fresh = null;
      ctx.track(`save:${objectKey(created)}`);
      ctx.save();
      nav.opened(objectKey(created));
      if (!quiet) toast('Saved. The task chain is not deployed yet.');
      return created;
    }
    o.businessName = bn;
    o.chain = structuredClone(def);
    touch(o);
    ctx.track(`save:${objectKey(o)}`);
    ctx.save();
    if (!quiet) toast(o.status === 'changes' ? 'Saved. Deploy to make the changes active.' : 'Saved');
    return o;
  }

  draw();
}

/** Schedule of a task chain, from the editor or the monitor. */
export function chainScheduleDialog(o: RepoObject, redraw: () => void) {
  scheduleDialog(o.name, o.chainSchedule, (f) => {
    o.chainSchedule = f;
    ctx.track(`schedule:${objectKey(o)}:${f ?? 'none'}`);
  }, redraw);
}

