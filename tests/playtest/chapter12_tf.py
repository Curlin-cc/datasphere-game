"""Chapter 12, transformation flow with delta (c12-m11): the returns table deployed without Delta Capture first (locked, check explains,
delete, handed over again, switched on, deployed); the handed-over table deployed without Delta Capture (switch locked
afterwards, check explains), Initial and Delta without Delta Capture (deploy refused), Initial Only (full load each run), table deleted
and handed over again, Delta Capture on before the first deploy, initial load, bank message only saved (not deployed), then deployed and the delta run.
Reload keeps the delta table and the target; monitor and task logs list the flow. Second pass: the hands-on tutorial.
Start state: chapter12_data.py with c12-m01..m10 solved."""
import json
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before
from chapter12_data import TENANT12

S = sys.argv[1] if len(sys.argv) > 1 else '.'
from chapter12_tf_data import F, P, R, SQL, bank_message, returns_with_delta
save = save_before(12, 'c12-m11', TENANT12)
for m in ['c12-m01', 'c12-m02', 'c12-m03', 'c12-m04', 'c12-m05', 'c12-m06', 'c12-m07', 'c12-m08', 'c12-m09', 'c12-m10']:
    save["missions"][m] = {"hintsOpen": 0, "answers": {}, "attempts": 1, "done": True, "xpEarned": 40, "events": []}


with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg

    def open_obj(space, key):
        g.space(space)
        pg.click(f'#object-list [data-open="{key}"]'); pg.wait_for_selector('#ed-deploy')

    def deploy():
        pg.click('#ed-deploy'); pg.wait_for_timeout(800)
        print('   deploy:', g.toast())

    def load(lt):
        pg.click('#tf-general') if pg.locator('#tf-general').count() else None
        pg.wait_for_timeout(150)
        pg.select_option('#tf-load', lt); pg.wait_for_timeout(200)

    def run():
        pg.click('#tf-run'); pg.wait_for_timeout(1000)
        print('   run:', pg.inner_text('#tf-runs li:first-child').replace('\n', ' ')[:300])

    g.start(save)
    g.skip_tutorial()
    pg.wait_for_timeout(1500)
    g.check('m11 nothing done')

    # The payments table comes deployed with Delta Capture: the switch is locked, the Data Editor is editable
    open_obj('RHN_ENTRY', P)
    print('   rows:', pg.locator('[data-del-row]').count(), '| delta on:', pg.is_checked('#prop-delta'), '| locked:', pg.is_disabled('#prop-delta'))
    assert pg.is_checked('#prop-delta') and pg.is_disabled('#prop-delta'), 'RHN_EN_T_PAYMENTS must start deployed with Delta Capture'
    assert pg.locator('#tbl-add-row').count() == 1 and pg.locator('[data-del-row]').count() == 95, 'Data Editor must be editable from the start'

    # The returns table (Calin, 15.10.2026): handed over saved, not deployed, switch free. Deployed without Delta Capture first:
    # the switch locks, the check explains the repair; delete, handed over again, switch on, first deploy.
    open_obj('RHN_ENTRY', R)
    assert not pg.is_checked('#prop-delta') and not pg.is_disabled('#prop-delta'), 'RHN_EN_T_DD_RETURNS must start not deployed, switch free'
    deploy()
    assert pg.is_disabled('#prop-delta') and not pg.is_checked('#prop-delta'), 'switch must lock after the first deploy'
    g.check('m11 returns deployed without delta')
    g.space('RHN_ENTRY')
    pg.click(f'#object-list [data-delete="{R}"]'); pg.wait_for_timeout(1500)
    print('   returns handed over again:', g.toast())
    returns_with_delta(g)
    assert pg.is_checked('#prop-delta') and pg.is_disabled('#prop-delta'), 'returns must be deployed with Delta Capture'

    # The flow, with delta but without Delta Capture on the source
    g.space('RHN_DSL')
    pg.click('[data-new="transformation"]'); pg.wait_for_selector('#tf-canvas')
    g.sql(SQL)
    pg.click('#tf-preview'); pg.wait_for_timeout(600)
    print('   preview:', pg.inner_text('#tf-preview-out .result-status'))
    pg.click('[data-node="target"]'); pg.wait_for_timeout(200)
    pg.fill('#tf-target', 'RHN_DS_T_PAYMENTS'); pg.keyboard.press('Tab'); pg.wait_for_timeout(200)
    load('Initial and Delta')
    pg.fill('#prop-business', 'Payments (clean)'); pg.fill('#prop-technical', 'RHN_DS_TF_PAYMENTS')
    deploy()
    # Initial Only works without delta capture: full load twice
    load('Initial Only')
    deploy()
    run(); run()
    g.shot('c12-tf-initial-only')
    g.answer('delta-run', 1)
    g.check('m11 initial only')

    # Delete the table: Accounts Receivable hands it over again, deployed with Delta Capture
    g.space('RHN_ENTRY')
    pg.click(f'#object-list [data-delete="{P}"]'); pg.wait_for_timeout(1500)
    print('   handed over again:', g.toast())
    open_obj('RHN_ENTRY', P)
    print('   rows again:', pg.locator('[data-del-row]').count(), '| locked:', pg.is_disabled('#prop-delta'))
    assert pg.is_checked('#prop-delta') and pg.is_disabled('#prop-delta') and pg.locator('#tbl-add-row').count() == 1
    print('   delta section:', pg.inner_text('#tbl-delta .tbl-head').replace('\n', ' '))
    # Regression: the column objects of the deployed table with another key order still count as the same structure
    st = json.loads(pg.evaluate("localStorage.getItem('dsg-progress-v3')"))
    def reorder(o):
        for obj in o.get('objects', []):
            if obj.get('space') == 'RHN_ENTRY' and obj.get('name') == 'RHN_EN_T_PAYMENTS':
                for d in (obj.get('table'), (obj.get('deployed') or {}).get('table')):
                    if d: d['columns'] = [dict(reversed(list(c.items()))) for c in d['columns']]
                return True
        return any(reorder(v) for v in o.values() if isinstance(v, dict))
    assert reorder(st), 'payments table not found in the saved state'
    pg.evaluate("s => localStorage.setItem('dsg-progress-v3', s)", json.dumps(st))
    pg.reload(); pg.wait_for_timeout(2500)
    # Back to the flow: Initial and Delta, deploy (starts over), initial load
    open_obj('RHN_DSL', F)
    load('Initial and Delta')
    deploy()
    run()
    print('   pointer:', pg.inner_text('#tf-props').split('Watermark')[1].split('\n')[1] if 'Watermark' in pg.inner_text('#tf-props') else '?')
    g.check('m11 initial load only')

    # Bank message in the Data Editor: Save writes it (no deploy needed), flow not run yet
    open_obj('RHN_ENTRY', P)
    bank_message(pg)
    print('   saved:', g.toast())
    assert 'rows in' in g.toast() or pg.locator('#tbl-delta tbody tr').count() >= 3, 'Save must write the rows (key order of the columns must not matter)'
    print('   delta records after save:', pg.locator('#tbl-delta tbody tr').count())
    assert pg.locator('#tbl-delta tbody tr').count() >= 3, 'Save must write the bank message into the deployed table'
    # Regression: a data save is no deployment
    ev = pg.evaluate("JSON.stringify(Object.values(JSON.parse(localStorage.getItem('dsg-progress-v3')).missions).flatMap(m => m.events || []))")
    assert f'deploy:{P}' not in json.loads(ev) and f'table-data:{P}' in json.loads(ev), 'Save of rows must track table-data, not deploy'
    g.check('m11 bank message saved, flow not run')
    print('   delta table:', pg.inner_text('#tbl-delta tbody').replace('\n', ' | ')[:300])
    g.shot('c12-tf-delta-table')
    open_obj('RHN_DSL', F)
    run()
    g.shot('c12-tf-delta-run')
    run()  # a third night without changes
    g.check('m11 after a night without changes')
    # Change PAY-0001 and back would be two records; instead check the rule wants changes: undo nothing, rerun after a real change
    open_obj('RHN_ENTRY', P)
    pg.fill('[data-cell="0:2"]', '2026-02-13'); pg.click('#ed-deploy'); pg.wait_for_timeout(700)
    open_obj('RHN_DSL', F)
    run()
    g.check('m11 solved')

    # A SQL view on the delta table fails; a transform reading _Delta is refused
    g.reload()
    open_obj('RHN_ENTRY', P)
    print('   after reload, delta records:', pg.locator('#tbl-delta tbody tr').count(), '| rows:', pg.locator('[data-del-row]').count())
    open_obj('RHN_DSL', 'RHN_DSL.RHN_DS_T_PAYMENTS')
    print('   target after reload:', pg.locator('[data-del-row]').count(), 'rows; key:', pg.locator('[data-col-key]:checked').count())
    g.nav('monitor'); pg.click('[data-mon-tab="flows"]'); pg.wait_for_selector('#flow-list')
    print('   monitor flows:', pg.inner_text('#flow-list tbody').replace('\n', ' | ')[:200])
    g.nav('tasklogs'); pg.wait_for_timeout(500)
    print('   task logs:', 'TRANSFORMATION_FLOWS' in pg.inner_text('main'))
    # Task chain: the flow is a step candidate
    open_obj('RHN_DSL', 'RHN_DSL.RHN_DS_TC_NIGHTLY')
    pg.click('#chain-add'); pg.wait_for_timeout(300)
    print('   chain candidates:', 'RHN_DS_TF_PAYMENTS' in pg.inner_text('.dialog'))
    pg.keyboard.press('Escape')
    g.done()


def tour(pg, t):
    pg.wait_for_function("t => document.querySelector('.tour-card h2')?.textContent === t", arg=t, timeout=8000)
    print('   step:', t)


with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg
    g.start(save)
    tour(pg, 'Loading only what changed'); pg.click('.tour-card [data-act="next"]')
    tour(pg, 'Open the payments'); pg.click(f'#object-list [data-open="{P}"]')
    tour(pg, 'Delta Capture'); assert pg.is_disabled('#prop-delta'); pg.click('.tour-card [data-act="next"]')
    tour(pg, 'Your turn: the returns'); pg.click(f'#object-list [data-open="{R}"]')
    tour(pg, 'Switch it on'); pg.check('#prop-delta')
    tour(pg, 'The first deploy'); pg.click('#ed-deploy')
    tour(pg, 'New Transformation Flow'); pg.click('[data-new="transformation"]')
    tour(pg, 'The view transform'); g.sql(SQL); pg.click('#tf-preview')
    tour(pg, 'Target table'); pg.click('[data-node="target"]'); pg.fill('#tf-target', 'RHN_DS_T_PAYMENTS'); pg.keyboard.press('Tab')
    tour(pg, 'Load type'); pg.click('#tf-general'); pg.select_option('#tf-load', 'Initial and Delta')
    tour(pg, 'Name and deploy'); pg.fill('#prop-business', 'Payments (clean)'); pg.fill('#prop-technical', 'RHN_DS_TF_PAYMENTS'); pg.click('#ed-deploy')
    tour(pg, 'The initial load'); pg.click('#tf-run')
    tour(pg, 'Back to the payments'); pg.click(f'#object-list [data-open="{P}"]')
    tour(pg, 'The bank message')
    pg.fill('[data-cell="11:3"]', '286.38')
    pg.click('#tbl-add-row'); pg.wait_for_timeout(200)
    for c, v in enumerate(['PAY-0096', 'INV-4000080', '2026-07-15', '874.39']):
        pg.fill(f'[data-cell="95:{c}"]', v)
    pg.click('[data-del-row="6"]')
    tour(pg, 'Save the changes'); pg.click('#ed-save')
    tour(pg, 'The delta table'); pg.click('.tour-card [data-act="next"]')
    tour(pg, 'Open the flow'); pg.click(f'#object-list [data-open="{F}"]')
    tour(pg, 'The delta run'); pg.click('#tf-run')
    tour(pg, 'Your answers'); g.answer('delta-run', 1)
    pg.wait_for_timeout(500)
    g.shot('c12-tf-tour')
    g.check('m11 via tutorial')
    g.done()
