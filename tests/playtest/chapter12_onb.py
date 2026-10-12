"""Chapter 12, Semantic Onboarding (c12-m09): check before anything, the partner package (license error), the sample (works),
then the hands-on tutorial with the utilities package (remote tables without connection, views not deployed), import log,
Repository Explorer; a second import without Overwrite skips everything. Reload keeps space, objects and logs.
Start state: chapter12_data.py with c12-m01..m08 solved."""
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before
from chapter12_data import TENANT12

S = sys.argv[1] if len(sys.argv) > 1 else '.'
save = save_before(12, 'c12-m09', TENANT12)
for m in ['c12-m01', 'c12-m02', 'c12-m03', 'c12-m04', 'c12-m05', 'c12-m06', 'c12-m07', 'c12-m08']:
    save["missions"][m] = {"hintsOpen": 0, "answers": {}, "attempts": 1, "done": True, "xpEarned": 40, "events": []}


def tour(pg, t):
    pg.wait_for_function("t => document.querySelector('.tour-card h2')?.textContent === t", arg=t, timeout=8000)
    print('   step:', t)


with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg

    def onb():
        g.nav('semantic'); pg.wait_for_selector('.onb-page')

    def import_pkg(area, pkg, overwrite=False):
        onb()
        if pg.locator('#onb-back').count():
            pg.click('#onb-back'); pg.wait_for_timeout(100)
            if pg.locator('#onb-back').count(): pg.click('#onb-back')
        pg.click(f'[data-area="{area}"]'); pg.click(f'[data-pkg="{pkg}"]'); pg.click('#pkg-import')
        (pg.check if overwrite else pg.uncheck)('.dialog [name="overwrite"]')
        pg.click('.dialog [type="submit"]'); pg.wait_for_timeout(900)
        print('   import', pkg, '→', g.toast())

    # tutorial waits at the first step; walk past the intro, skip for the first part
    g.start(save)
    g.skip_tutorial()
    g.check('m09 nothing done')
    onb(); g.shot('c12-onboarding')
    import_pkg('partner', 'PARTNER_GRID_KPI')
    import_pkg('samples', 'SAP_SAMPLE_ENERGY')
    g.space('SAP_SAMPLE')
    pg.click('#object-list [data-open="SAP_SAMPLE.SAP_SAMPLE_V_CONSUMPTION"]'); pg.wait_for_selector('#editor'); pg.click('#run')
    pg.wait_for_selector('#results-body .result-status')
    print('   sample preview:', pg.inner_text('#results-body .result-status'))

    pg.click('#tutorial-open'); pg.wait_for_timeout(300)
    tour(pg, 'Content from the Content Network'); pg.click('.tour-card [data-act="next"]')
    tour(pg, 'Open Semantic Onboarding'); g.nav('semantic')
    if pg.locator('#onb-back').count():
        pg.click('#onb-back'); pg.wait_for_timeout(100)
        if pg.locator('#onb-back').count(): pg.click('#onb-back')
    tour(pg, 'Business Content'); pg.click('[data-area="business"]')
    tour(pg, 'The package'); pg.click('[data-pkg="SAP_UTIL_BILLING"]')
    tour(pg, 'Prerequisites'); pg.click('.tour-card [data-act="next"]')
    tour(pg, 'Import'); pg.click('#pkg-import'); pg.click('.dialog [type="submit"]'); pg.wait_for_timeout(900)
    print('   import →', g.toast())
    tour(pg, 'Import Overview'); pg.click('#pkg-tab-imports')
    tour(pg, 'Your import'); pg.locator('#import-log-list [data-log]').first.click()
    print('   log:', pg.inner_text('#import-log-detail').replace('\n', ' | ')[:500])
    g.shot('c12-import-log')
    tour(pg, 'Open Repository Explorer'); g.nav('repository')
    tour(pg, 'Find the fact'); pg.fill('#repo-search', 'SAP_UTIL_V'); pg.wait_for_timeout(500)
    pg.click('#repo-list [data-open="SAP_UTIL.SAP_UTIL_V_BILLING"]'); pg.wait_for_selector('#editor')
    print('   lineage:', pg.inner_text('#lineage').replace('\n', ' | ')[:200])
    pg.wait_for_timeout(900)
    g.skip_tutorial()
    g.answer('not-running', 1)
    g.check('m09 solved')

    import_pkg('business', 'SAP_UTIL_BILLING')       # again, Overwrite off: everything skipped
    g.reload()
    onb(); pg.click('#onb-logs'); pg.wait_for_selector('#entity-log-list')
    print('   Open Import Logs (Import Entities):', pg.inner_text('#entity-log-list tbody'))
    pg.click('#onb-back'); pg.click('[data-area="business"]'); pg.click('[data-pkg="SAP_UTIL_BILLING"]'); pg.click('#pkg-tab-imports')
    print('   imports of the package after reload:', pg.locator('#import-log-list [data-log]').count(), '| spaces:', pg.evaluate("JSON.parse(localStorage.getItem('dsg-progress-v3')).tenant.spaces.map(s => s.id).join(',')"))
    g.done()
