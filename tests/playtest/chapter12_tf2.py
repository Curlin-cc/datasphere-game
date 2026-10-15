"""Chapter 12, nightly transformation flow (c12-m12): solves c12-m11 through the UI first, then the next mission's setup removes the
payments of 12 Feb from the target and adds PAY-0097 to the source. Delta run only (still missing), reset + run (complete),
chain step saved but not deployed, deployed, run; reload. Second pass: the hands-on tutorial.
Start state: chapter12_data.py with c12-m01..m10 solved."""
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before
from chapter12_data import TENANT12
from chapter12_tf_data import SQL, F, P, bank_message, returns_with_delta

S = sys.argv[1] if len(sys.argv) > 1 else '.'
C = 'RHN_DSL.RHN_DS_TC_NIGHTLY'
save = save_before(12, 'c12-m11', TENANT12)
for m in ['c12-m01', 'c12-m02', 'c12-m03', 'c12-m04', 'c12-m05', 'c12-m06', 'c12-m07', 'c12-m08', 'c12-m09', 'c12-m10']:
    save["missions"][m] = {"hintsOpen": 0, "answers": {}, "attempts": 1, "done": True, "xpEarned": 40, "events": []}


def open_obj(g, space, key):
    g.space(space)
    g.pg.click(f'#object-list [data-open="{key}"]'); g.pg.wait_for_selector('#ed-deploy')


def solve_m11(g):
    pg = g.pg
    returns_with_delta(g)
    g.space('RHN_DSL')
    pg.click('[data-new="transformation"]'); pg.wait_for_selector('#tf-canvas')
    g.sql(SQL)
    pg.click('[data-node="target"]'); pg.fill('#tf-target', 'RHN_DS_T_PAYMENTS'); pg.keyboard.press('Tab'); pg.wait_for_timeout(200)
    pg.click('#tf-general'); pg.select_option('#tf-load', 'Initial and Delta'); pg.wait_for_timeout(200)
    pg.fill('#prop-business', 'Payments (clean)'); pg.fill('#prop-technical', 'RHN_DS_TF_PAYMENTS')
    pg.click('#ed-deploy'); pg.wait_for_timeout(800)
    pg.click('#tf-run'); pg.wait_for_timeout(1000)
    open_obj(g, 'RHN_ENTRY', P)
    bank_message(pg)
    open_obj(g, 'RHN_DSL', F)
    pg.click('#tf-run'); pg.wait_for_timeout(1000)
    g.answer('delta-run', 1)
    return g.check('m11 (setup for m12)')


def monitor_flow(g):
    pg = g.pg
    g.space('RHN_DSL')
    g.nav('monitor'); pg.click('[data-mon-tab="flows"]'); pg.wait_for_selector('#flow-list')
    pg.click('[data-flow="RHN_DS_TF_PAYMENTS"]'); pg.wait_for_selector('#flow-run')


with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg
    g.start(save)
    g.skip_tutorial()
    pg.wait_for_timeout(1500)
    assert solve_m11(g)
    g.next_mission(); pg.wait_for_timeout(1500)
    open_obj(g, 'RHN_DSL', 'RHN_DSL.RHN_DS_T_PAYMENTS')
    print('   target after Tim:', pg.locator('[data-del-row]').count(), 'rows')
    g.check('m12 nothing done')

    monitor_flow(g)
    print('   reset button before run:', pg.locator('#flow-reset').is_enabled())
    pg.click('#flow-run'); pg.wait_for_timeout(1000)
    print('   delta run:', pg.inner_text('#run-log').replace('\n', ' | ')[:260])
    g.check('m12 delta run only')

    pg.click('#flow-reset'); pg.wait_for_timeout(400)
    print('   reset:', g.toast(), '| button now enabled:', pg.locator('#flow-reset').is_enabled())
    pg.click('#flow-run'); pg.wait_for_timeout(1000)
    print('   after reset:', pg.inner_text('#run-log').replace('\n', ' | ')[:260])
    g.shot('c12-tf-reset')
    g.answer('why-reset', 1)
    g.check('m12 repaired, no chain')

    open_obj(g, 'RHN_DSL', C)
    pg.click('#chain-add'); pg.wait_for_timeout(300)
    pg.check('.dialog [name="step"][value="RHN_DSL.RHN_DS_TF_PAYMENTS"]'); pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(300)
    pg.click('#ed-save'); pg.wait_for_timeout(400)
    g.check('m12 step saved only')
    pg.click('#ed-deploy'); pg.wait_for_timeout(600)
    g.check('m12 deployed, not run')
    pg.click('#chain-run'); pg.wait_for_timeout(2500)
    g.shot('c12-tf-chain')
    g.check('m12 solved')
    g.reload()
    monitor_flow(g)
    print('   after reload:', pg.inner_text('#flow-list tbody').replace('\n', ' | ')[:200])
    g.done()


def tour(pg, t):
    pg.wait_for_function("t => document.querySelector('.tour-card h2')?.textContent === t", arg=t, timeout=8000)
    print('   step:', t)


with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg
    g.start(save)
    g.skip_tutorial()
    pg.wait_for_timeout(1500)
    assert solve_m11(g)
    pg.click('#next-mission'); pg.wait_for_timeout(500)
    tour(pg, 'When a delta cannot help'); pg.click('.tour-card [data-act="next"]')
    tour(pg, 'The flows of RHN_DSL'); pg.click('[data-flow="RHN_DS_TF_PAYMENTS"]')
    tour(pg, 'Reset Watermark'); pg.click('#flow-reset')
    tour(pg, 'Run'); pg.click('#flow-run')
    tour(pg, 'Open the nightly chain'); pg.click(f'#object-list [data-open="{C}"]')
    tour(pg, 'Add Step'); pg.click('#chain-add'); pg.wait_for_timeout(300)
    pg.check('.dialog [name="step"][value="RHN_DSL.RHN_DS_TF_PAYMENTS"]'); pg.click('.dialog button[type="submit"]')
    tour(pg, 'Deploy'); pg.click('#ed-deploy')
    tour(pg, 'Run the chain'); pg.click('#chain-run')
    tour(pg, 'Your answers'); g.answer('why-reset', 1)
    pg.wait_for_timeout(2500)
    g.check('m12 via tutorial')
    g.done()
