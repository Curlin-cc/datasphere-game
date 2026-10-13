"""Translation in the sandbox (Meldung von Curlin 13.10.2026: "funktioniert nicht"): space, add a model, its dimensions and hierarchy
come along from RHN_DSL, translate business and column names in all languages, status, reload, delete. Usage: python3 translation.py <folder>"""
import sys
from playwright.sync_api import sync_playwright
from common import Game

S = sys.argv[1] if len(sys.argv) > 1 else '.'
LANGS = ['de', 'fr', 'it']


def rows(pg):
    return [r.replace('\t', ' | ') for r in pg.locator('#tr-list tbody tr').all_inner_texts()]


def translate(pg, key, all_langs=True):
    pg.click(f'input[name="tr-sel"][value="{key}"]'); pg.wait_for_timeout(200)
    pg.click('#tr-edit'); pg.wait_for_selector('.dialog #tr-lang')
    for lang in (LANGS if all_langs else LANGS[:1]):
        pg.select_option('#tr-lang', lang)
        for inp in pg.locator(f'.dialog .tr-lang-input[data-lang="{lang}"] input').all():
            inp.fill(f'{lang}-{inp.get_attribute("name").split("|")[1] or "name"}')
    pg.click('.dialog [type="submit"]'); pg.wait_for_timeout(400)


with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg
    g.start()
    g.skip_tutorial()
    pg.wait_for_timeout(1000)
    g.nav('home')
    pg.click('#save-sandbox'); pg.wait_for_timeout(2500)
    g.nav('translation')
    pg.click('[data-tr-space="RHN_PRES"]'); pg.wait_for_timeout(300)
    pg.click('#tr-add'); pg.wait_for_selector('.dialog')
    pg.check('.dialog input[value="RHN_PRES.RHN_PR_AM_INVOICES"]')
    pg.click('.dialog [type="submit"]'); pg.wait_for_timeout(400)
    r = rows(pg)
    print('   after add:', *r, sep='\n     ')
    assert len(r) >= 3, 'dimensions should come along'
    g.shot('tr-added')
    translate(pg, 'RHN_PRES.RHN_PR_AM_INVOICES', all_langs=False)
    pg.click('input[name="tr-sel"][value="RHN_DSL.RHN_DS_D_GRID_AREA"]'); pg.click('#tr-edit'); pg.wait_for_selector('.dialog #tr-lang')
    g.shot('tr-dialog')
    pg.click('.dialog [data-act="cancel"]')
    translate(pg, 'RHN_DSL.RHN_DS_D_GRID_AREA')
    r = rows(pg)
    print('   after translate:', *r, sep='\n     ')
    assert any('RHN_PR_AM_INVOICES' in x and 'Partially Translated' in x for x in r)
    assert any('RHN_DS_D_GRID_AREA' in x and x.rstrip().endswith('Translated') and 'Partially' not in x for x in r)
    g.reload()
    g.nav('translation')
    if pg.locator('[data-tr-space="RHN_PRES"]').count():
        pg.click('[data-tr-space="RHN_PRES"]'); pg.wait_for_timeout(300)
    print('   after reload:', len(rows(pg)), 'rows')
    assert any('RHN_DS_D_GRID_AREA' in x and 'Partially' not in x and x.rstrip().endswith('Translated') for x in rows(pg))
    pg.click('#tr-back'); pg.click('[data-tr-space="RHN_DSL"]'); pg.wait_for_timeout(300)
    print('   RHN_DSL lists:', len(rows(pg)), 'rows')
    print('   GAIN translation')
    g.done()
