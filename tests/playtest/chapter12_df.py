"""Chapter 12, data flow (c12-m10): projection without aggregation and mode Append first (one row per reading, doubled),
then aggregated but still Append (every month twice), then Truncate (right after two runs). Reload keeps the table.
Start state: chapter12_data.py with c12-m01..m09 solved."""
import os
import sys

# Plays a hands-on tutorial whose steps open their pages, which happens only in Guided mode.
os.environ.setdefault('DSG_MODE', 'guided')
from playwright.sync_api import sync_playwright
from common import Game, save_before
from chapter12_data import TENANT12

S = sys.argv[1] if len(sys.argv) > 1 else '.'
F = 'RHN_DSL.RHN_DS_DF_MONTHLY'
save = save_before(12, 'c12-m10', TENANT12)
for m in ['c12-m01', 'c12-m02', 'c12-m03', 'c12-m04', 'c12-m05', 'c12-m06', 'c12-m07', 'c12-m08', 'c12-m09']:
    save["missions"][m] = {"hintsOpen": 0, "answers": {}, "attempts": 1, "done": True, "xpEarned": 40, "events": []}

with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg

    def node(n):
        pg.click(f'[data-node="{n}"]'); pg.wait_for_timeout(250)

    def deploy():
        pg.click('#ed-deploy'); pg.wait_for_timeout(700)
        print('   deploy:', g.toast())

    def run_twice():
        for _ in range(2):
            pg.click('#df-run'); pg.wait_for_timeout(900)
        print('   runs:', pg.inner_text('#df-runs').replace('\n', ' | ')[:300])

    g.start(save)
    g.skip_tutorial()
    g.space('RHN_DSL')
    pg.click('[data-new="dataflow"]'); pg.wait_for_selector('#df-canvas')
    pg.select_option('#df-source', 'RHN_DSL.RHN_DS_V_METER_READINGS'); pg.wait_for_timeout(300)
    node('join'); pg.click('#df-join-add'); pg.wait_for_timeout(200)
    pg.select_option('#df-join-source', 'RHN_DSL.RHN_DS_V_CONTRACTS'); pg.wait_for_timeout(300)
    pg.select_option('#df-join-left', 'CONTRACT_ID'); pg.wait_for_timeout(200)
    pg.select_option('#df-join-right', 'CONTRACT_ID'); pg.wait_for_timeout(200)
    node('projection')
    for i, (n, e) in enumerate([('READING_MONTH', "strftime(a.READING_DATE, '%Y-%m')"), ('GRID_AREA', 'b.GRID_AREA'), ('CONSUMPTION_KWH', 'a.CONSUMPTION_KWH')]):
        pg.click('#df-col-add'); pg.wait_for_timeout(150)
        pg.fill(f'[data-col-name="{i}"]', n); pg.fill(f'[data-col-expr="{i}"]', e)
    node('target'); pg.fill('#df-target', 'RHN_DS_T_MONTHLY_CONSUMPTION'); pg.keyboard.press('Tab'); pg.wait_for_timeout(200)
    pg.click('#df-general'); pg.wait_for_timeout(200)
    pg.fill('#prop-business', 'Monthly consumption for Excel'); pg.fill('#prop-technical', 'RHN_DS_DF_MONTHLY')
    deploy()
    print('   SQL:', pg.inner_text('#df-sql').replace('\n', ' ')[:200])
    g.shot('c12-dataflow')
    run_twice()
    g.answer('append', 1)
    g.check('m10 no aggregation, append')

    node('aggregation'); pg.click('#df-agg-add'); pg.wait_for_timeout(200)
    pg.select_option('[data-agg="CONSUMPTION_KWH"]', 'SUM'); pg.wait_for_timeout(200)
    deploy()
    # Too many rows from the first two runs would block Append: start the table over by running Truncate once, then Append twice
    node('target'); pg.check('[name="df-mode"][value="Truncate"]'); pg.wait_for_timeout(200); deploy()
    pg.click('#df-run'); pg.wait_for_timeout(900)
    node('target'); pg.check('[name="df-mode"][value="Append"]'); pg.wait_for_timeout(200); deploy()
    pg.click('#df-run'); pg.wait_for_timeout(900)
    g.check('m10 aggregated, append')

    node('target'); pg.check('[name="df-mode"][value="Truncate"]'); pg.wait_for_timeout(200); deploy()
    run_twice()
    g.check('m10 solved')
    g.shot('c12-dataflow-done')
    g.reload()
    g.space('RHN_DSL')
    pg.click('#object-list [data-open="RHN_DSL.RHN_DS_T_MONTHLY_CONSUMPTION"]'); pg.wait_for_selector('#ed-deploy')
    print('   table after reload:', pg.locator('[data-del-row]').count(), 'rows in the data editor')
    g.nav('monitor'); pg.click('[data-mon-tab="flows"]'); pg.wait_for_selector('#flow-list')
    print('   monitor flows:', pg.inner_text('#flow-list tbody').replace('\n', ' | ')[:160])
    g.done()

def tour(pg, t):
    pg.wait_for_function("t => document.querySelector('.tour-card h2')?.textContent === t", arg=t, timeout=8000)
    print('   step:', t)


with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg
    g.start(save)
    tour(pg, 'Data flows'); pg.click('.tour-card [data-act="next"]')
    tour(pg, 'Where we are'); pg.click('.tour-card [data-act="next"]')
    tour(pg, 'New Data Flow'); pg.click('[data-new="dataflow"]')
    tour(pg, 'The canvas'); pg.click('.tour-card [data-act="next"]')
    tour(pg, 'Source'); pg.select_option('#df-source', 'RHN_DSL.RHN_DS_V_METER_READINGS')
    tour(pg, 'Join'); pg.click('[data-node="join"]'); pg.click('#df-join-add'); pg.wait_for_timeout(200)
    pg.select_option('#df-join-source', 'RHN_DSL.RHN_DS_V_CONTRACTS'); pg.wait_for_timeout(300)
    pg.select_option('#df-join-left', 'CONTRACT_ID'); pg.wait_for_timeout(150); pg.select_option('#df-join-right', 'CONTRACT_ID')
    tour(pg, 'Projection'); pg.click('[data-node="projection"]')
    for i, (n, e) in enumerate([('READING_MONTH', "strftime(a.READING_DATE, '%Y-%m')"), ('GRID_AREA', 'b.GRID_AREA'), ('CONSUMPTION_KWH', 'a.CONSUMPTION_KWH')]):
        pg.click('#df-col-add'); pg.wait_for_timeout(150); pg.fill(f'[data-col-name="{i}"]', n); pg.fill(f'[data-col-expr="{i}"]', e)
    tour(pg, 'Aggregation'); pg.click('[data-node="aggregation"]'); pg.click('#df-agg-add'); pg.wait_for_timeout(200)
    pg.select_option('[data-agg="CONSUMPTION_KWH"]', 'SUM')
    tour(pg, 'Target and mode'); pg.click('[data-node="target"]'); pg.fill('#df-target', 'RHN_DS_T_MONTHLY_CONSUMPTION'); pg.keyboard.press('Tab')
    pg.wait_for_timeout(200); pg.check('[name="df-mode"][value="Truncate"]')
    tour(pg, 'Name, save, deploy'); pg.click('#df-general'); pg.wait_for_timeout(200)
    pg.fill('#prop-business', 'Monthly consumption for Excel'); pg.fill('#prop-technical', 'RHN_DS_DF_MONTHLY'); pg.click('#ed-deploy')
    tour(pg, 'Two nights'); pg.click('#df-run'); pg.wait_for_timeout(800); pg.click('#df-run'); pg.wait_for_timeout(800)
    tour(pg, 'Your answers')
    g.shot('c12-dataflow-tour')
    g.done()
