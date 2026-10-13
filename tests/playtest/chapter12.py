"""Chapter 12 (Excursions): Power BI (dimension exposed in RHN_DSL and a write user first, then a consumption view), transport (invalid export, missing target,
then valid), catalog (publish without description, unpublished term), Business Builder (perspectives not read first).
Start state: chapter12_data.py."""
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before
from chapter12_data import TENANT12

S = sys.argv[1] if len(sys.argv) > 1 else '.'
AM_CONS = 'RHN_PRES.RHN_PR_AM_CONSUMPTION'

with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg

    def expose(key, on=True):
        g.space(key.split('.')[0])
        pg.click(f'#object-list [data-open="{key}"]'); pg.wait_for_selector('#editor')
        pg.set_checked('#prop-expose', on)
        pg.click('#ed-deploy'); pg.wait_for_timeout(600)
        print('   deploy:', g.toast()[:100])

    def db_access():
        g.nav('spaces')
        pg.click('[data-dbaccess="RHN_PRES"]'); pg.wait_for_selector('.dialog')

    def transport(page):
        if not pg.locator(f'.nav [data-tsub="{page}"]').count():
            pg.click('.nav [data-group="transport"]')
        pg.click(f'.nav [data-tsub="{page}"]'); pg.wait_for_timeout(250)

    def dialog_pick(values):
        for v in values:
            pg.check(f'.dialog input[value="{v}"]')
        pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(200)

    def validation():
        return pg.inner_text('#pkg-validation').replace('\n', ' | ')[:400]

    g.start(save_before(12, 'c12-m01', TENANT12))
    g.walk_tutorial(show=False)

    # ---------------- m01: dimension exposed in RHN_DSL, a user with write access; then a consumption view in RHN_PRES
    expose('RHN_DSL.RHN_DS_D_TARIFF')
    db_access()
    pg.fill('.dialog [name="suffix"]', 'PRICING'); pg.check('.dialog [name="read"]'); pg.check('.dialog [name="write"]')
    pg.click('#db-create'); pg.wait_for_timeout(300)
    g.shot('c12-dbaccess')
    print('   users:', pg.inner_text('#db-users').replace('\n', ' | ')[:200])
    pg.click('.dialog [data-act="cancel"]')
    g.answer('odbc-model', 0); g.answer('user-name', 1); g.answer('why-pres', 1)
    g.check('m01 dimension exposed in RHN_DSL, write access, wrong answer')
    expose('RHN_DSL.RHN_DS_D_TARIFF', False)
    g.space('RHN_PRES')
    g.new_view('SELECT TARIFF, TARIFF_NAME, COMMODITY FROM RHN_DSL.RHN_DS_D_TARIFF', 'RHN_PR_V_TARIFFS', 'Tariffs for Power BI')
    pg.set_checked('#prop-expose', True); pg.click('#ed-deploy'); pg.wait_for_timeout(600)
    g.shot('c12-expose')
    db_access()
    pg.click('.dialog [data-dbdel="PRICING"]'); pg.wait_for_timeout(200)
    pg.fill('.dialog [name="suffix"]', 'PRICING'); pg.check('.dialog [name="read"]')
    pg.click('#db-create'); pg.wait_for_timeout(300)
    print('   dialog:', pg.inner_text('.dialog .guide-lead')[:200])
    pg.click('.dialog [data-act="cancel"]')
    g.answer('odbc-model', 1)
    g.check('m01 solved')
    g.next_mission()

    # ---------------- m02: model only, export fails; then dependencies; first only production
    transport('packages')
    print('   packages:', [r.replace('\t', ' | ')[:90] for r in pg.locator('#package-list tbody tr').all_inner_texts()])
    pg.click('#pkg-create')
    pg.fill('#pkg-business', 'Board package'); pg.fill('#pkg-name', 'RHN_PR_PKG_BOARD'); pg.select_option('#pkg-space', 'RHN_PRES')
    pg.click('#pkg-add'); dialog_pick([AM_CONS])
    pg.click('#pkg-save'); pg.wait_for_timeout(300)
    print('   validation 1:', validation())
    transport('export')
    pg.check('input[name="exp"][value="RHN_PR_PKG_BOARD"]'); pg.click('#exp-open'); dialog_pick(['RHN-PROD'])
    print('   export 1:', g.toast()[:140])
    g.check('m02 invalid package')
    transport('packages')
    pg.click('[data-pkg="RHN_PR_PKG_BOARD"]'); pg.wait_for_selector('#pkg-validation')
    pg.click('#pkg-req'); dialog_pick(['RHN_DS_PKG_MODEL'])
    print('   validation 3:', validation())
    pg.click('#pkg-validate'); pg.click('#pkg-save'); pg.wait_for_timeout(300)
    g.shot('c12-package')
    transport('export')
    pg.check('input[name="exp"][value="RHN_PR_PKG_BOARD"]'); pg.click('#exp-open'); dialog_pick([])
    print('   export 2:', g.toast()[:140])
    g.answer('overwrite', 1); g.answer('order', 1)
    g.check('m02 only production')
    transport('export')
    pg.check('input[name="exp"][value="RHN_PR_PKG_BOARD"]'); pg.click('#exp-open'); dialog_pick(['RHN-TEST'])
    print('   export 3:', g.toast()[:140])
    transport('import')
    pg.check('input[name="imp"][value="RHN_PR_PKG_BOARD"]'); pg.click('#imp-open'); pg.wait_for_selector('.dialog')
    pg.click('.dialog [data-act="cancel"]')
    transport('monitor')
    print('   jobs:', [r.replace('\t', ' | ')[:80] for r in pg.locator('#transport-jobs tbody tr').all_inner_texts()][:4])
    pg.click('[data-job]'); pg.wait_for_selector('#job-log')
    g.shot('c12-monitor')
    g.check('m02 solved')
    g.next_mission()

    # ---------------- m03: publish without description, term not published
    g.nav('catalog')
    pg.fill('#cat-q', 'consumption'); pg.press('#cat-q', 'Enter'); pg.wait_for_timeout(200)
    print('   results:', pg.locator('#cat-results .cat-card').count())
    pg.click(f'[data-open-asset="{AM_CONS}"]'); pg.wait_for_selector('#asset-desc')
    pg.click('#asset-publish'); print('   publish empty:', g.toast()[:100])
    pg.fill('#asset-desc', 'The official consumption figures for reporting: kWh per contract, grid area and tariff, from deduplicated meter readings. Owner: Reporting team.')
    pg.check('#asset-tags input[value="Subject Area/Consumption"]')
    pg.click('#asset-save'); pg.click('#asset-publish'); pg.wait_for_timeout(200)
    g.answer('metadata', 1)
    g.check('m03 no term')
    pg.click('#asset-term-new')
    pg.fill('.dialog [name="name"]', 'Energy consumption')
    pg.fill('.dialog [name="definition"]', 'Delivered energy in kWh per contract and reading date, from meter readings converted to kWh and without duplicate readings.')
    pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(200)
    pg.check('#asset-terms input[value="energy-consumption"]'); pg.click('#asset-save'); pg.wait_for_timeout(200)
    g.check('m03 term not published')
    pg.click('#cat-back')
    pg.click('[data-open-term="energy-consumption"]'); pg.click('#term-publish'); pg.wait_for_timeout(200)
    g.shot('c12-term')
    pg.click('#cat-back')
    g.shot('c12-catalog')
    g.check('m03 solved')
    g.next_mission()

    # ---------------- m04: consumption model without perspectives first
    g.nav('business')
    g.shot('c12-business-welcome')
    pg.click('[data-bb-space="RHN_PRES"]'); pg.click('[data-bb-open="RHN_CM_REVENUE"]'); pg.wait_for_timeout(200)
    g.answer('chain', 1); g.answer('today', 1); g.answer('ads', 1)
    g.check('m04 no perspectives')
    pg.click('[data-bb-tab="Perspectives"]'); pg.wait_for_timeout(200)
    g.shot('c12-business')
    g.check('m04 solved')
    print('   new badges:', pg.locator('#badge-new b').all_inner_texts())
    g.done()
