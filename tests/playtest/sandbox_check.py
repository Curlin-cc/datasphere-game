"""Sandbox: fresh game, Home › Sandbox, then every mission is solved and the built objects are there; reload keeps it.
Takes screenshots of a few apps. Usage: python3 sandbox_check.py <folder>"""
import sys
from playwright.sync_api import sync_playwright
from common import Game

S = sys.argv[1] if len(sys.argv) > 1 else '.'

with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg
    g.start()
    g.skip_tutorial()
    pg.wait_for_timeout(1500)
    g.nav('home')
    pg.click('#save-sandbox'); pg.wait_for_timeout(2500)
    g.nav('home')
    stats = pg.inner_text('.progress-row')
    print('   home:', stats.replace('\n', ' | '))
    assert '65 of 65' in stats, stats
    g.shot('sandbox-home')
    for sid in ['RHN_ENTRY', 'RHN_DSL', 'RHN_PRES']:
        g.space(sid)
        n = pg.locator('#object-list tbody tr').count()
        print(f'   {sid}: {n} objects')
        assert n > 0
    g.shot('sandbox-builder')
    g.reload()
    g.nav('home')
    assert '65 of 65' in pg.inner_text('.progress-row')
    print('   after reload: still 65 of 65')
    # Start over asks in the game's own dialog (browser confirm is blocked in the artifact)
    pg.click('#save-reset'); pg.wait_for_timeout(2500)
    g.skip_tutorial()
    g.nav('home')
    assert '0 of 65' in pg.inner_text('.progress-row'), pg.inner_text('.progress-row')
    print('   start over: 0 of 65')
    print('   GAIN sandbox')
    g.done()
