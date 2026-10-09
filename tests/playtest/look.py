"""Design check: screenshots of the main pages for comparison with docs/design/screenshots (no assertions).
Usage: python3 look.py <folder> [dark]"""
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before
from chapter7_data import TENANT7

S = sys.argv[1] if len(sys.argv) > 1 else '.'
DARK = len(sys.argv) > 2 and sys.argv[2] == 'dark'

with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg
    pg.set_viewport_size({'width': 1910, 'height': 915})
    if DARK:
        pg.add_init_script("localStorage.setItem('dsg-theme','dark')")
    g.start(save_before(7, 'c07-m01', TENANT7))
    g.skip_tutorial()
    sfx = '-dark' if DARK else ''
    g.shot('look-home' + sfx)
    g.nav('builder'); pg.wait_for_selector('#space-picker'); g.shot('look-builder-spaces' + sfx)
    pg.click('[data-space="RHN_REP"]'); pg.wait_for_selector('#new-tiles'); g.shot('look-builder-start' + sfx)
    pg.click('#object-list [data-open="RHN_REP.RHN_REP_F_INVOICES"]'); pg.wait_for_selector('#editor'); pg.click('#run'); pg.wait_for_timeout(500)
    g.shot('look-sql-editor' + sfx)
    pg.click('#ed-back'); pg.wait_for_selector('#new-tiles')
    pg.click('[data-new="analytic"]'); pg.wait_for_selector('#am-fact-picker'); pg.click('[data-fact="RHN_REP.RHN_REP_F_INVOICES"]')
    pg.wait_for_selector('#am-canvas'); g.shot('look-analytic' + sfx)
    for app in ['repository', 'spaces', 'monitor', 'connections', 'security', 'system', 'tasklogs']:
        g.nav(app); pg.wait_for_timeout(300); g.shot(f'look-{app}' + sfx)
    g.done()
