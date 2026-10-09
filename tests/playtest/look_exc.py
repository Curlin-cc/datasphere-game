"""Design check for the excursion pages (chapter 12 state): Semantic Onboarding, App Integration, Version History, Security pages,
Settings. Usage: python3 look_exc.py <folder> [dark] [WIDTHxHEIGHT]. No assertions; prints horizontal overflow per page."""
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before
from chapter12_data import TENANT12

S = sys.argv[1] if len(sys.argv) > 1 else '.'
DARK = 'dark' in sys.argv[2:]
SIZE = next((a for a in sys.argv[2:] if 'x' in a), '1910x915')
W, H = (int(v) for v in SIZE.split('x'))
SFX = ('-dark' if DARK else '') + ('' if SIZE == '1910x915' else f'-{W}')
save = save_before(12, 'c12-m09', TENANT12)
for m in ['c12-m01', 'c12-m02', 'c12-m03', 'c12-m04', 'c12-m05', 'c12-m06', 'c12-m07', 'c12-m08']:
    save["missions"][m] = {"hintsOpen": 0, "answers": {}, "attempts": 1, "done": True, "xpEarned": 40, "events": []}

OVERFLOW = """() => { const m = document.querySelector('#main'); const a = document.querySelector('.app');
  return { main: m ? m.scrollWidth - m.clientWidth : 0, page: document.documentElement.scrollWidth - document.documentElement.clientWidth }; }"""

with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg
    pg.set_viewport_size({'width': W, 'height': H})
    if DARK:
        pg.add_init_script("localStorage.setItem('dsg-theme','dark')")
    g.start(save)
    g.skip_tutorial()

    def shot(name):
        pg.wait_for_timeout(250)
        o = pg.evaluate(OVERFLOW)
        print(f'   {name}: overflow main {o["main"]}px, page {o["page"]}px')
        g.shot(f'exc-{name}{SFX}')

    g.nav('semantic'); pg.wait_for_selector('.onb-page'); shot('onboarding')
    pg.click('[data-area="business"]'); pg.click('[data-pkg="SAP_UTIL_BILLING"]'); shot('package')
    g.nav('system'); pg.click('.nav [data-sys="administration"]'); pg.click('[data-admin="apps"]'); shot('app-integration')
    pg.click('#oauth-add'); shot('oauth-dialog'); pg.keyboard.press('Escape')
    for sub in ['users', 'roles', 'authorization', 'activities']:
        g.nav('security'); pg.click(f'.nav [data-sec="{sub}"]'); shot(f'security-{sub}')
    g.space('RHN_HARM'); pg.click('#object-list [data-open="RHN_HARM.RHN_HA_V_CONTRACTS"]'); pg.wait_for_selector('#editor')
    shot('editor'); pg.click('#ed-versions'); shot('versions'); pg.keyboard.press('Escape')
    pg.click('#shell-user'); pg.click('[data-um="settings"]'); shot('settings'); pg.keyboard.press('Escape')
    g.done()
