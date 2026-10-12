"""Back button in the shellbar: goes back one page (inside an app too), not straight to Home.
Start state: the sandbox (all missions solved). Usage: python3 back.py <folder>"""
import json
import os
import sys
from playwright.sync_api import sync_playwright
from common import Game

S = sys.argv[1] if len(sys.argv) > 1 else '.'
with open(os.path.join(os.path.dirname(__file__), '../../src/content/sandbox.json')) as f:
    SAVE = json.load(f)
SAVE['tutorialsSeen'] = sorted(SAVE['missions'].keys())


def where(pg):
    """A short label for the page that is open now."""
    if pg.locator('#editor').count():
        return 'editor'
    if pg.locator('#new-tiles').count():
        return 'builder-start'
    if pg.locator('#space-picker').count():
        return 'space-picker'
    title = pg.locator('#main .view-title')
    return 'title:' + (title.first.inner_text().strip() if title.count() else pg.inner_text('#main')[:30].strip())


with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg
    g.start(SAVE)
    g.skip_tutorial()
    g.nav('home')
    start = where(pg)
    trail = [start]

    g.nav('builder')
    if pg.locator('#space-switch').count():
        pg.click('#space-switch'); pg.wait_for_selector('#space-picker')
    trail.append(where(pg))
    pg.click('[data-space="RHN_HARM"]'); pg.wait_for_selector('#new-tiles')
    trail.append(where(pg))
    pg.click('#object-list [data-open]')
    pg.wait_for_selector('#editor'); pg.wait_for_timeout(300)
    trail.append(where(pg))
    if not pg.locator('.nav [data-sec="users"]').count():
        pg.click('.nav [data-view="security"]'); pg.wait_for_timeout(300)
        trail.append(where(pg))
    pg.click('.nav [data-sec="users"]'); pg.wait_for_timeout(300)
    trail.append(where(pg))
    pg.click('.nav [data-sec="roles"]'); pg.wait_for_timeout(300)
    trail.append(where(pg))
    print('   forward:', ' → '.join(trail))
    assert trail[3] == 'editor' and trail[-1] != trail[-2], trail

    # Back walks the same pages in reverse, one at a time, down to the start page
    back = []
    for _ in range(len(trail) - 1):
        pg.click('#shell-back'); pg.wait_for_timeout(400)
        back.append(where(pg))
    print('   back:   ', ' → '.join(back))
    assert back == trail[-2::-1], f'expected {trail[-2::-1]}'

    # Transport: package editor → back → package list
    if not pg.locator('.nav [data-view="transport"]').count():
        pg.click('.nav [data-group="transport"]'); pg.wait_for_timeout(200)
    pg.click('.nav [data-view="transport"]'); pg.wait_for_timeout(300)
    if pg.locator('[data-pkg]').count():
        lst = where(pg)
        pg.click('[data-pkg]'); pg.wait_for_timeout(300)
        assert pg.locator('[data-pkgtab]').count()
        pg.click('#shell-back'); pg.wait_for_timeout(300)
        print('   transport back:', where(pg))
        assert where(pg) == lst and pg.locator('[data-pkg]').count()
    g.shot('back')
    print('   back: GAIN' if not g.errors else '')
    print('ERRORS', g.errors)
    g.b.close()
