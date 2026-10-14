"""Intro: the first three tutorial windows of a new game are large, centred and carry the MSC logo; then normal cards."""
import sys
from playwright.sync_api import sync_playwright
from common import Game

S = sys.argv[1] if len(sys.argv) > 1 else '.'
with sync_playwright() as p:
    g = Game(p, S); pg = g.pg
    pg.set_viewport_size({'width': 1280, 'height': 800})
    g.start()
    pg.wait_for_selector('.tour-card')
    for i, t in enumerate(['Welcome to the training tenant', 'Why a grand tour', 'The project in one picture']):
        pg.wait_for_function("t => document.querySelector('.tour-card h2')?.textContent === t", arg=t)
        pg.wait_for_timeout(300)
        box = pg.locator('.tour-card').bounding_box()
        assert pg.locator('.tour-card.hero .tour-hero-logo svg.msc-logo').count() == 1, t
        assert box['width'] >= 700, box
        assert box['y'] >= 0 and box['y'] + box['height'] <= 800, box
        assert abs(box['x'] + box['width'] / 2 - 640) < 20, box
        print('   intro', t, int(box['width']), 'x', int(box['height']))
        if i == 0:
            g.shot('intro-1')
        pg.click('.tour-card [data-act="next"]')
    pg.wait_for_function("document.querySelector('.tour-card h2')?.textContent === 'The ticket'")
    assert pg.locator('.tour-card.hero').count() == 0 and pg.locator('.tour-hero-logo').count() == 0
    # Intro text scales with the font size setting (--fs, PR #14).
    pg.click('.tour-card [data-act="back"]'); pg.wait_for_function("document.querySelector('.tour-card h2')?.textContent === 'The project in one picture'")
    sizes = pg.evaluate("() => { const e = document.querySelector('.tour-card.hero .tour-body'); const a = parseFloat(getComputedStyle(e).fontSize);"
                        " document.documentElement.style.setProperty('--fs', '1.3'); const b = parseFloat(getComputedStyle(e).fontSize);"
                        " document.documentElement.style.removeProperty('--fs'); return [a, b]; }")
    print('   intro text sizes', sizes)
    assert abs(sizes[1] - sizes[0] * 1.3) < 0.3, sizes
    print('   GAIN intro')
    print('ERRORS', g.errors)
