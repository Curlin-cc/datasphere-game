"""Chapter 12, version history (c12-m07): Tim's deployed clean-up drops the legacy contracts. First a check without doing anything,
then a hand-written fix (works, but not from the history), then the hands-on tutorial: Versions, compare, Restore, Deploy.
Also checks that the history survives a reload. Start state: chapter12_data.py with c12-m01..m06 solved."""
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before
from chapter12_data import TENANT12

S = sys.argv[1] if len(sys.argv) > 1 else '.'
C = 'RHN_DSL.RHN_DS_V_CONTRACTS'
save = save_before(12, 'c12-m07', TENANT12)
for m in ['c12-m01', 'c12-m02', 'c12-m03', 'c12-m04', 'c12-m05', 'c12-m06']:
    save["missions"][m] = {"hintsOpen": 0, "answers": {}, "attempts": 1, "done": True, "xpEarned": 40, "events": []}


def tour(pg, t):
    pg.wait_for_function("t => document.querySelector('.tour-card h2')?.textContent === t", arg=t, timeout=8000)
    print('   step:', t)


with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg
    g.start(save)
    g.skip_tutorial()
    pg.wait_for_timeout(800)   # the set-up deploys Tim's version

    g.answer('production', 1)
    g.check('m07 nothing done')

    # A fix typed by hand: the result is right, but the history was not used
    g.space('RHN_DSL')
    pg.click(f'#object-list [data-open="{C}"]'); pg.wait_for_selector('#editor')
    tim = pg.inner_text('.cm-content')
    print('   Tim\'s SQL starts:', tim.splitlines()[0][:80])
    g.sql(tim.replace("WHERE x.SRC_SYS_ID = 'S4U'", ''))
    pg.click('#ed-deploy'); pg.wait_for_timeout(600)
    g.check('m07 fixed by hand')

    # Back to Tim's version for the real exercise: restore it from the history (the newest but one)
    pg.click('#ed-versions'); pg.wait_for_selector('#version-list')
    print('   versions:', pg.locator('[data-version]').count(), '|', pg.inner_text('#version-list').replace('\n', ' ')[:160])
    pg.locator('[data-version]').nth(1).click(); pg.click('#version-restore'); pg.wait_for_timeout(300)
    pg.click('#ed-deploy'); pg.wait_for_timeout(600)
    print('   status:', pg.inner_text('.ed-toolbar .status'))

    # The tutorial, hands-on
    pg.click('#tutorial-open'); pg.wait_for_timeout(300)
    tour(pg, 'Every deployment is a version'); pg.click('.tour-card [data-act="next"]')
    tour(pg, 'Open the view'); pg.click(f'#object-list [data-open="{C}"]')
    tour(pg, 'Versions'); pg.click('#ed-versions')
    tour(pg, 'Compare')
    n = pg.locator('[data-version]').count()
    # The version directly below Tim's (in a full playthrough the history holds older versions of your own too)
    vs = pg.locator('[data-version]').all_inner_texts()
    ti = max(i for i, t in enumerate(vs) if 'TSCHULZ' in t)
    pg.locator('[data-version]').nth(ti + 1).click()
    print('   diff:', pg.inner_text('#version-diff').replace('\n', ' ⏎ ')[:220])
    g.shot('c12-versions')
    tour(pg, 'Restore'); pg.click('#version-restore')
    tour(pg, 'Deploy'); pg.click('#ed-deploy')
    pg.wait_for_timeout(900)
    g.skip_tutorial()
    g.check('m07 solved')

    g.reload()
    g.space('RHN_DSL')
    pg.click(f'#object-list [data-open="{C}"]'); pg.wait_for_selector('#editor')
    pg.click('#ed-versions'); pg.wait_for_selector('#version-list')
    print('   versions after reload:', pg.locator('[data-version]').count(), '(before:', n, '+1)')
    g.done()
