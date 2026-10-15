"""Bug 1 (Johnny Test, 14.10.2026): a reload in the middle of a mission tutorial (c08-m01) started it again at step 1, and the
centred card's tour-block caught every click. Now the tutorial resumes at the step it was on; after Skip it stays closed."""
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before
from chapter8_data import TENANT8

S = sys.argv[1] if len(sys.argv) > 1 else '.'


def title(pg):
    return pg.inner_text('.tour-card h2') if pg.locator('.tour-card').count() else None


def wait_title(pg, t):
    pg.wait_for_function("t => document.querySelector('.tour-card h2')?.textContent === t", arg=t, timeout=8000)


with sync_playwright() as p:
    g = Game(p, S); pg = g.pg
    g.start(save_before(8, 'c08-m01', TENANT8))
    wait_title(pg, 'Chapter 8: Data access controls')
    pg.click('.tour-card [data-act="next"]'); wait_title(pg, 'Where we are')
    pg.click('.tour-card [data-act="next"]'); pg.wait_for_timeout(300)
    before = title(pg)
    count = pg.inner_text('.tour-count')
    print('   before reload:', before, '|', count)
    pg.reload(); pg.wait_for_selector('.mission-head', timeout=60000)
    pg.wait_for_selector('.tour-card', timeout=8000); pg.wait_for_timeout(500)
    print('   after reload:', title(pg), '|', pg.inner_text('.tour-count'))
    assert title(pg) == before, f'resumed at {title(pg)!r}, expected {before!r}'
    assert pg.inner_text('.tour-count').split(' ·')[0] == count.split(' ·')[0]
    # Move on to a hands-on step: the page under the tour takes clicks.
    for _ in range(6):
        if pg.locator('.tour.acting').count():
            break
        pg.click('.tour-card [data-act="next"]'); pg.wait_for_timeout(300)
    assert pg.locator('.tour.acting').count() == 1, title(pg)
    pg.reload(); pg.wait_for_selector('.mission-head', timeout=60000); pg.wait_for_selector('.tour-card', timeout=8000); pg.wait_for_timeout(500)
    hit = pg.evaluate("() => { const r = document.querySelector('.nav [data-view=home]').getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!e && !e.closest('.tour'); }")
    print('   hands-on step after reload, page clickable:', hit, '|', title(pg))
    assert hit, 'tour blocks clicks after reload'
    # Skip, reload: the tutorial does not come back.
    pg.click('.tour-card [data-act="skip"]')
    pg.reload(); pg.wait_for_selector('.mission-head', timeout=60000); pg.wait_for_timeout(1500)
    assert pg.locator('.tour-card').count() == 0, 'tutorial came back after Skip'
    print('   GAIN tour_reload')
    print('ERRORS', g.errors)
