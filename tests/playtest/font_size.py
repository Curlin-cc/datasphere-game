"""Font size (Curlin, 14.10.2026): Settings › Appearance › Font Size (Small / Normal / Large / Extra Large), kept after reload,
applied app-wide; at Extra Large and 1280x800 no page may scroll sideways more than at Normal. Usage: python3 font_size.py <folder>"""
import os
import sys
from playwright.sync_api import sync_playwright
import common
from common import Game, save_before

common.URL = os.environ.get('DSG_URL', common.URL)
S = sys.argv[1] if len(sys.argv) > 1 else '.'
SCALE = {'small': .9, 'normal': 1, 'large': 1.15, 'xlarge': 1.3}
fails = []

OVERFLOW = """() => { const w = (e) => e ? Math.max(0, e.scrollWidth - e.clientWidth) : 0;
  return { page: w(document.documentElement), main: w(document.querySelector('#main')), mission: w(document.querySelector('#mission')),
    shell: w(document.querySelector('.shellbar, header')) }; }"""


def ok(cond, label):
    print('  ', 'PASS' if cond else 'FAIL', label)
    if not cond:
        fails.append(label)


def set_font(g, f):
    g.pg.click('#shell-user'); g.pg.click('[data-um="settings"]'); g.pg.click('[data-set="appearance"]')
    g.pg.check(f'[name="set-font"][value="{f}"]'); g.pg.wait_for_timeout(150)
    g.pg.keyboard.press('Escape')


def pages(g):
    """A tour through busy pages; returns the worst overflow per page."""
    pg = g.pg
    out = {}

    def measure(name):
        pg.wait_for_timeout(300)
        out[name] = pg.evaluate(OVERFLOW)

    g.nav('home'); measure('home')
    g.space('RHN_DSL'); measure('builder')
    pg.click('#object-list [data-open="RHN_DSL.RHN_DS_V_CONTRACTS"]'); pg.wait_for_selector('#editor'); measure('sql-editor')
    g.nav('monitor')
    if pg.locator('#mon-spaces').count():
        pg.click('#mon-spaces [aria-current="true"]')
    measure('monitor')
    g.nav('security'); measure('security')
    g.nav('spaces'); measure('spaces')
    pg.click('#shell-user'); pg.click('[data-um="settings"]'); measure('settings'); pg.keyboard.press('Escape')
    return out


with sync_playwright() as p:
    g = Game(p, S); pg = g.pg
    pg.set_viewport_size({'width': 1280, 'height': 800})
    g.start(); g.skip_tutorial(); pg.wait_for_timeout(1000)
    g.nav('home'); pg.click('#save-sandbox'); pg.wait_for_timeout(2500)
    g.skip_tutorial()

    base = None
    for f in ['normal', 'small', 'large', 'xlarge']:
        set_font(g, f)
        size = pg.evaluate("parseFloat(getComputedStyle(document.body).fontSize)")
        ok(abs(size - 14 * SCALE[f]) < 0.2, f'{f}: body text {size}px')
        res = pages(g)
        print('   ', f, res)
        if f == 'normal':
            base = res
            continue
        for name, o in res.items():
            for k, v in o.items():
                ok(v <= base[name][k] + 2, f'{f}: {name} {k} overflow {v}px (normal {base[name][k]}px)')
        g.nav('builder'); g.shot(f'font-{f}-editor') if f == 'xlarge' else None

    # Stays after a reload and is applied before the first paint.
    g.reload()
    ok(pg.evaluate("document.documentElement.dataset.font") == 'xlarge', 'xlarge kept after reload')
    pg.set_viewport_size({'width': 1280, 'height': 800}); g.nav('home'); g.shot('font-xlarge-home')
    set_font(g, 'normal')
    ok(pg.evaluate("document.documentElement.dataset.font") is None, 'back to normal clears the setting')
    print('ERRORS', g.errors)

    # Johnny's FAIL: at Extra Large, 1280x800, the card of c01-m01 step 2 'Three layers' was 854 px tall and its buttons sat off screen.
    g2 = Game(p, S); pg2 = g2.pg
    pg2.set_viewport_size({'width': 1280, 'height': 800})
    pg2.add_init_script("try{localStorage.setItem('dsg-font','xlarge')}catch(e){}")
    g2.start(save_before(1, 'c01-m01'))
    pg2.wait_for_selector('.tour-card')
    seen = 0
    for _ in range(12):
        pg2.wait_for_timeout(400)
        t = pg2.inner_text('.tour-card h2')
        card = pg2.locator('.tour-card').bounding_box()
        btns = pg2.evaluate("""() => [...document.querySelectorAll('.tour-card .tour-actions button')].map(b => {
            const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            return { act: b.dataset.act, top: r.top, bottom: r.bottom, hit: b === e || b.contains(e) }; })""")
        inside = all(b['top'] >= 0 and b['bottom'] <= 800 and b['hit'] for b in btns)
        ok(card['y'] >= 0 and card['y'] + card['height'] <= 800 and inside,
           f'xlarge 1280x800: card {t!r} {int(card["height"])} px, buttons on screen and clickable {[int(b["bottom"]) for b in btns]}')
        seen += t == 'Three layers'
        if pg2.locator('.tour-card.acting').count() or not pg2.locator('.tour-card [data-act="next"]').count():
            break
        pg2.click('.tour-card [data-act="next"]')
    ok(seen == 1, "reached step 'Three layers'")
    banner = pg2.evaluate("() => { const b = document.querySelector('.tenant-banner'); return [b.clientHeight, b.scrollHeight, parseFloat(getComputedStyle(b).fontSize)]; }")
    ok(banner[2] > 13.5 * 1.25 and banner[1] <= banner[0] + 1, f'banner scales with the font size {banner}')
    g2.shot('font-xlarge-tour')
    print('ERRORS', g2.errors)

print('font_size:', 'all passed' if not fails else f'FAILED {len(fails)}')
if not fails:
    print('   GAIN font_size')
if fails:
    raise SystemExit(1)
