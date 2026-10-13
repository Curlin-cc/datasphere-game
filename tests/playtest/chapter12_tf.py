"""Chapter 12, transformation flow with delta (c12-m11): the handed-over table deployed without Delta Capture (switch locked
afterwards, check explains), Initial and Delta without Delta Capture (deploy refused), Initial Only (full load each run), table deleted
and handed over again, Delta Capture on before the first deploy, initial load, bank message only saved (not deployed), then deployed and the delta run.
Reload keeps the delta table and the target; monitor and task logs list the flow. Second pass: the hands-on tutorial.
Start state: chapter12_data.py with c12-m01..m10 solved."""
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before
from chapter12_data import TENANT12

S = sys.argv[1] if len(sys.argv) > 1 else '.'
from chapter12_tf_data import F, P, SQL, bank_message
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

    # Mistake: deploy the handed-over table without Delta Capture. Afterwards the switch is locked.
    open_obj('RHN_ENTRY', P)
    print('   status before deploy:', pg.inner_text('#prop-delta').strip() or 'switch', '| locked:', pg.is_disabled('#prop-delta'))
    assert not pg.is_disabled('#prop-delta')
    deploy()
    assert pg.is_disabled('#prop-delta'), 'Delta Capture must be locked after the first deploy'
    g.check('m11 deployed without delta capture')

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

    # Delete the table: Accounts Receivable hands it over again (saved, not deployed); now Delta Capture before the first deploy
    g.space('RHN_ENTRY')
    pg.click(f'#object-list [data-delete="{P}"]'); pg.wait_for_timeout(1500)
    print('   handed over again:', g.toast())
    open_obj('RHN_ENTRY', P)
    print('   rows again:', pg.locator('[data-del-row]').count(), '| locked:', pg.is_disabled('#prop-delta'))
    assert not pg.is_disabled('#prop-delta')
    pg.check('#prop-delta'); pg.wait_for_timeout(200)
    deploy()
    print('   delta section:', pg.inner_text('#tbl-delta .tbl-head').replace('\n', ' '))
    # Back to the flow: Initial and Delta, deploy (starts over), initial load
    open_obj('RHN_DSL', F)
    load('Initial and Delta')
    deploy()
    run()
    print('   pointer:', pg.inner_text('#tf-props').split('Watermark')[1].split('\n')[1] if 'Watermark' in pg.inner_text('#tf-props') else '?')
    g.check('m11 initial load only')

    # Bank message saved, not deployed
    open_obj('RHN_ENTRY', P)
    bank_message(pg, deploy=False)
    print('   saved:', g.toast())
    g.check('m11 bank message not deployed')
    deploy()
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
    tour(pg, 'Delta Capture'); pg.check('#prop-delta')
    tour(pg, 'Deploy'); pg.click('#ed-deploy')
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
    tour(pg, 'Deploy the changes'); pg.click('#ed-deploy')
    tour(pg, 'The delta table'); pg.click('.tour-card [data-act="next"]')
    tour(pg, 'Open the flow'); pg.click(f'#object-list [data-open="{F}"]')
    tour(pg, 'The delta run'); pg.click('#tf-run')
    tour(pg, 'Your answers'); g.answer('delta-run', 1)
    pg.wait_for_timeout(500)
    g.shot('c12-tf-tour')
    g.check('m11 via tutorial')
    g.done()
