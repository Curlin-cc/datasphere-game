"""Design check against Curlin's screenshots 22–46 (12.10.2026): Connections, Transport (Packages, Export), Settings,
editors for table, data flow, transformation flow, replication flow, data access control, analytic model; Data Sharing Cockpit.
Usage: python3 look_new.py <folder>. No assertions; takes one screenshot per page (prefix new-)."""
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before
from chapter12_data import TENANT12

S = sys.argv[1] if len(sys.argv) > 1 else '.'
save = save_before(12, 'c12-m12', TENANT12)
for i in range(1, 12):
    save["missions"][f'c12-m{i:02d}'] = {"hintsOpen": 0, "answers": {}, "attempts": 1, "done": True, "xpEarned": 40, "events": []}

with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg
    pg.set_viewport_size({'width': 1910, 'height': 915})
    g.start(save)
    g.skip_tutorial()

    def shot(name):
        pg.wait_for_timeout(300)
        g.shot(f'new-{name}')

    def safe(name, fn):
        try:
            fn(); shot(name)
        except Exception as e:  # keep going: this is a look script
            print(f'   {name}: {type(e).__name__} {str(e)[:120]}')
            pg.keyboard.press('Escape')

    g.nav('connections'); shot('connections')
    for sub in ['packages', 'export']:
        safe(f'transport-{sub}', lambda sub=sub: (g.nav('transport'), pg.click(f'.nav [data-tsub="{sub}"]')))
    safe('settings', lambda: (pg.click('#shell-user'), pg.click('[data-um="settings"]')))
    pg.keyboard.press('Escape')
    safe('sharing', lambda: g.nav('sharing'))
    g.space('RHN_DSL')
    for tile in ['table', 'dataflow', 'transformation', 'replication', 'dac', 'analytic']:
        def open_tile(tile=tile):
            g.space('RHN_DSL') if not pg.locator('#new-tiles').count() else None
            pg.click(f'#new-tiles [data-new="{tile}"]')
            pg.wait_for_timeout(500)
        safe(f'editor-{tile}', open_tile)
        g.space('RHN_DSL')
    g.done()
