"""Chapter 1 (Space concept): spaces with near misses, sizing, sharing, naming quiz."""
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before

S = sys.argv[1] if len(sys.argv) > 1 else '.'
with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg
    g.start(save_before(1, 'c01-m01'))
    g.walk_tutorial()

    def create(name, id=None, disk=None, mem=None, prio=None):
        pg.click('#create-space'); pg.fill('[name="name"]', name)
        if id is not None: pg.fill('[name="id"]', id)
        if disk is not None: pg.fill('[name="disk"]', str(disk))
        if mem is not None: pg.fill('[name="memory"]', str(mem))
        if prio is not None: pg.select_option('[name="priority"]', str(prio))
        pg.click('.dialog [type="submit"]'); pg.wait_for_timeout(300)
        e = pg.locator('.form-error')
        if e.count() and e.inner_text().strip():
            print('   FORM ERROR:', e.inner_text()); pg.click('[data-act="cancel"]')

    def edit(id, disk=None, mem=None, prio=None, name=None):
        pg.click(f'[data-edit="{id}"]')
        if name is not None: pg.fill('[name="name"]', name)
        if disk is not None: pg.fill('[name="disk"]', str(disk))
        if mem is not None: pg.fill('[name="memory"]', str(mem))
        if prio is not None: pg.select_option('[name="priority"]', str(prio))
        pg.click('.dialog [type="submit"]'); pg.wait_for_timeout(300)
        e = pg.locator('.form-error')
        if e.count() and e.inner_text().strip():
            print('   FORM ERROR:', e.inner_text()); pg.click('[data-act="cancel"]')

    g.nav('spaces')
    create('Rheinau Harmonization')            # suggested ID is cut to 20 characters
    create('Harm', 'rhn harm')                 # invalid characters
    create('Rheinau Harmonization', 'RHN_HARMONIZATION')
    create('RHN_REP', 'RHN_REP')               # only the technical ID as name
    create('Test', 'SAP_TEST')                 # reserved prefix
    create('Big', 'RHN_BIG', 200, 2)           # beyond capacity
    g.check('m01 near misses')
    for sp in ['RHN_HARMONIZATION', 'RHEINAU_HARMONIZATIO']:
        pg.click(f'[data-delete="{sp}"]'); pg.wait_for_timeout(300)
    create('Rheinau Harmonization', 'RHN_HARM')
    edit('RHN_REP', name='Rheinau Reporting')
    g.answer('why', 1)
    g.check('m01 solved')
    g.shot('c1-spaces')
    g.next_mission()

    edit('RHN_HARM', 40, 10, 5); edit('RHN_REP', 40, 10, 5)
    g.answer('priority', 2)
    g.check('m02 too much, priority tie')
    edit('RHN_HARM', 36, 8, 3); edit('RHN_REP', 20, 10, 5)
    g.check('m02 solved')
    g.next_mission()

    g.nav('builder')
    pg.click('[data-space="RHN_HARM"]'); pg.wait_for_selector('#object-list')
    print('   HARM start page:', pg.inner_text('#object-list tbody'))
    pg.click('#space-switch'); pg.click('[data-space="RHN_IN"]'); pg.wait_for_selector('#object-list')
    for obj, targets in [('RHN_IN.BILLING_CONTRACTS', ['RHN_HARM', 'RHN_REP']), ('RHN_IN.GRID_AREAS', ['RHN_HARM'])]:
        pg.click(f'#object-list [data-share="{obj}"]')
        for t in targets: pg.check(f'[name="to"][value="{t}"]')
        pg.click('.dialog [type="submit"]'); pg.wait_for_timeout(300)
    g.answer('share', 2)
    g.check('m03 leak, nothing read from HARM')
    pg.click('#object-list [data-share="RHN_IN.BILLING_CONTRACTS"]'); pg.uncheck('[name="to"][value="RHN_REP"]')
    pg.click('.dialog [type="submit"]'); pg.wait_for_timeout(300)
    pg.click('#space-switch'); pg.click('[data-space="RHN_HARM"]'); pg.wait_for_selector('#shared-list')
    pg.click('#shared-list [data-open="RHN_IN.BILLING_CONTRACTS"]'); pg.wait_for_selector('#column-list')
    print('   read-only toolbar:', pg.inner_text('.ed-toolbar').replace('\n', ' '))
    pg.click('#run'); pg.wait_for_selector('.result-status')
    g.shot('c1-shared')
    g.check('m03 solved')
    g.next_mission()

    for q, v in [('view', 2), ('fact', 1), ('break', 0), ('why', 1)]: g.answer(q, v)
    g.check('m04 one wrong')
    g.answer('break', 2)
    g.check('m04 solved')
    g.reload()
    g.nav('spaces')
    print('AFTER RELOAD:', ' / '.join(t.replace('\n', ' ') for t in pg.locator('.space-tile h3').all_inner_texts()))
    g.done()
