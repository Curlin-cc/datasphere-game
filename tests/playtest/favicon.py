"""Favicon: the MSC ring (MSC_SYMBOL, src/brand.ts) instead of the old 'DG' tile; renders as an image without errors."""
import sys
from playwright.sync_api import sync_playwright
from common import Game

S = sys.argv[1] if len(sys.argv) > 1 else '.'
with sync_playwright() as p:
    g = Game(p, S); pg = g.pg
    g.start()
    href = pg.get_attribute('link[rel="icon"]', 'href')
    assert href.startswith('data:image/svg+xml'), href[:40]
    assert 'DG' not in href.split('%3C/text')[0][-20:] and '%3Ctext' not in href, 'old DG favicon still there'
    for colour in ['47245C', '6B0F2D', 'B7203C', 'FB842F']:
        assert colour in href, colour
    size = pg.evaluate("""h => new Promise(r => { const i = new Image(); i.onload = () => r([i.naturalWidth, i.naturalHeight]); i.onerror = () => r(null); i.src = h; })""", href)
    assert size and size[0] > 0, size
    print('   favicon MSC ring renders', size)
    print('   GAIN favicon')
    print('ERRORS', g.errors)
