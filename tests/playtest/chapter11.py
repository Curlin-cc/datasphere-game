"""Chapter 11 (Board request, no hints): READING_MONTH in the consumption fact (date first, then text), attribute in the
model, check as Markus, run the night, fast preview. Start state: chapter11_data.py."""
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before
from chapter11_data import TENANT11
from chapter7_data import CONS

S = sys.argv[1] if len(sys.argv) > 1 else '.'
F_CONS, AM_CONS = 'RHN_DSL.RHN_DS_F_CONSUMPTION', 'RHN_PRES.RHN_PR_AM_CONSUMPTION'
WITH_MONTH = CONS.replace('r.READING_DATE, r.CONSUMPTION_KWH', "r.READING_DATE, {m} AS READING_MONTH, r.CONSUMPTION_KWH")

with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg

    def open_model():
        g.space('RHN_PRES')
        pg.click('[data-list="models"]')
        pg.click(f'#object-list [data-open="{AM_CONS}"]'); pg.wait_for_selector('#am-pivot')

    def preview(rows, user=''):
        open_model()
        for r in rows:
            pg.check(f'[data-prow="{r}"]')
        if user:
            pg.select_option('#am-as', user)
        pg.click('#run'); pg.wait_for_selector('#am-out .result-status')
        print('   preview:', pg.inner_text('#am-out .result-status'))
        return [r.replace('\t', ' | ') for r in pg.locator('#am-out tbody tr').all_inner_texts()]

    g.start(save_before(11, 'c11-m01', TENANT11))
    g.walk_tutorial(show=False)

    # ---------------- m01: date first, then text; attribute in the model
    g.space('RHN_DSL')
    g.edit_view(F_CONS, WITH_MONTH.format(m="date_trunc('month', r.READING_DATE)"))
    print('   deploy:', g.toast()[:120])
    g.check('m01 month as date, model unchanged')
    g.space('RHN_DSL')
    g.edit_view(F_CONS, WITH_MONTH.format(m="strftime(r.READING_DATE, '%Y-%m')"))
    print('   roles:', pg.locator('#column-roles select[data-col="READING_MONTH"]').input_value() if pg.locator('#column-roles select[data-col="READING_MONTH"]').count() else 'no role select')
    open_model()
    pg.click('[data-node="fact"]'); pg.wait_for_timeout(200)
    pg.check('[data-attr="READING_MONTH"]'); pg.wait_for_timeout(100)
    pg.click('#ed-deploy'); pg.wait_for_timeout(600)
    print('   model deploy:', g.toast()[:120])
    rows = preview(['READING_MONTH', 'RHN_DS_D_TARIFF.COMMODITY'])
    print('   rows:', [r for r in rows if r.startswith('2025')])
    g.shot('c11-board')
    g.answer('gas-jun', 2)
    g.check('m01 solved')
    g.next_mission()

    # ---------------- m02: an extra view first, then remove it; as Markus
    g.space('RHN_PRES')
    g.new_view("SELECT READING_MONTH, SUM(CONSUMPTION_KWH) AS KWH FROM RHN_DSL.RHN_DS_F_CONSUMPTION WHERE GRID_AREA IN ('NORTH', 'EAST') GROUP BY READING_MONTH",
               'RHN_PR_V_NORTH_MONTHLY', 'North monthly')
    rows = preview(['READING_MONTH'], 'MBRANDT')
    print('   MBRANDT:', [r for r in rows if r.startswith('2025')])
    g.answer('why-nothing', 1); g.answer('north-total', 2)
    g.check('m02 extra view')
    g.space('RHN_PRES')
    pg.click('[data-list="all"]')
    pg.click('[data-delete="RHN_PRES.RHN_PR_V_NORTH_MONTHLY"]'); pg.wait_for_timeout(800)
    print('   after delete:', g.toast())
    g.check('m02 after delete')
    g.next_mission()

    # ---------------- m03: preview before the night, then run the chain
    preview(['READING_MONTH'])
    g.check('m03 night not run')
    g.nav('monitor'); pg.select_option('#mon-space', 'RHN_DSL'); pg.click('[data-mon-tab="chains"]'); pg.wait_for_timeout(200)
    pg.click('[data-chain="RHN_DS_TC_NIGHTLY"]'); pg.click('#chain-run'); pg.wait_for_timeout(2500)
    print('   chain:', g.toast()[:100])
    g.answer('fresh', 1)
    g.check('m03 solved')
    g.done()
