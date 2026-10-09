"""Chapter 8 (Data Access Controls): permissions table in the Data Editor, DAC of type Single Values, assignment to both
facts, checks as users. Plays typical mistakes first. Start state: chapter8_data.py."""
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before
from chapter8_data import TENANT8

S = sys.argv[1] if len(sys.argv) > 1 else '.'
F_INV, F_CONS, D_GRID = 'RHN_REP.RHN_REP_F_INVOICES', 'RHN_REP.RHN_REP_F_CONSUMPTION', 'RHN_REP.RHN_REP_D_GRID_AREA'
DAC = 'RHN_REP.RHN_REP_DAC_GRID_AREA'

with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg

    def add_rows(rows):
        for u, a in rows:
            pg.click('#tbl-add-row')
            n = pg.locator('[data-del-row]').count() - 1
            pg.fill(f'[data-cell="{n}:0"]', u); pg.fill(f'[data-cell="{n}:1"]', a)

    def deploy():
        pg.click('#ed-deploy'); pg.wait_for_timeout(500)
        t = g.toast()
        if 'fail' in t.lower() or 'enter' in t.lower():
            print('   DEPLOY:', t)

    def assign(view):
        pg.click(f'#object-list [data-open="{view}"]'); pg.wait_for_selector('#editor')
        pg.click('#run'); pg.wait_for_selector('#dac-assign')
        pg.click('#dac-assign'); pg.select_option('#dac-pick', DAC)
        pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(150)

    g.start(save_before(8, 'c08-m01', TENANT8))
    g.walk_tutorial(show=False)

    # ---------------- m01: permissions table without Petra, then right
    g.space('RHN_REP')
    pg.click('[data-new="table"]'); pg.wait_for_selector('#tbl-columns')
    pg.fill('[data-col-name="0"]', 'USER_ID'); pg.keyboard.press('Tab'); pg.wait_for_timeout(100)
    pg.click('#tbl-add-col'); pg.fill('[data-col-name="1"]', 'GRID_AREA'); pg.keyboard.press('Tab'); pg.wait_for_timeout(100)
    pg.check('[data-col-key="1"]'); pg.wait_for_timeout(100)
    add_rows([('MBRANDT', 'NORTH'), ('MBRANDT', 'EAST'), ('ADEMIR', 'SOUTH'), ('ADEMIR', 'WEST')])
    pg.fill('#prop-business', 'Permissions'); pg.fill('#prop-technical', 'RHN_REP_T_PERMISSIONS')
    deploy()
    g.shot('c8-table')
    g.answer('why-area', 1); g.answer('who', 1)
    g.check('m01 Petra missing')
    add_rows([('PLINDNER', 'NORTH'), ('PLINDNER', 'EAST'), ('PLINDNER', 'SOUTH'), ('PLINDNER', 'WEST'), ('ADEMIR', 'WEST')])
    deploy()   # duplicate key: refused
    pg.click('[data-del-row="8"]'); pg.wait_for_timeout(100)
    deploy()
    pg.click('#run'); pg.wait_for_selector('#results .result-status')
    print('   preview:', pg.inner_text('#results .result-status'))
    g.check('m01 solved')
    g.next_mission()

    # ---------------- m02: DAC without criterion, then right
    g.space('RHN_REP')
    pg.click('[data-new="dac"]'); pg.wait_for_selector('#dac-entity')
    pg.select_option('#dac-entity', 'RHN_REP.RHN_REP_T_PERMISSIONS'); pg.wait_for_selector('#dac-identifier:not([disabled])')
    pg.select_option('#dac-identifier', 'USER_ID'); pg.wait_for_timeout(100)
    pg.fill('#prop-business', 'Grid Area Access'); pg.fill('#prop-technical', 'RHN_REP_DAC_GRID_AREA')
    deploy()
    pg.check('[data-criterion="GRID_AREA"]')
    pg.click('#run'); pg.wait_for_selector('#results .result-status')
    print('   DAC preview:', [r.replace('\t', ' | ') for r in pg.locator('#results tbody tr').all_inner_texts()])
    g.shot('c8-dac')
    deploy()
    g.answer('nina', 1)
    g.check('m02 solved')
    g.next_mission()

    # ---------------- m03: assigned but only saved, then deployed; preview as Markus
    g.space('RHN_REP')
    assign(F_INV)
    pg.click('#ed-save'); pg.wait_for_timeout(300)
    g.answer('markus', 2)
    g.check('m03 saved only')
    deploy()
    pg.wait_for_selector('#preview-as')
    pg.select_option('#preview-as', 'MBRANDT'); pg.wait_for_timeout(500)
    print('   fact as MBRANDT:', pg.inner_text('#results .result-status'))
    g.shot('c8-view-as')
    g.check('m03 solved')
    g.next_mission()

    # ---------------- m04: control on the dimension (shortcut), then on the fact
    g.space('RHN_REP')
    assign(D_GRID); deploy()
    g.answer('shortcut', 1)
    g.check('m04 dimension only')
    pg.click('[data-dac-del="0"]'); deploy()
    pg.click('#ed-back'); pg.wait_for_selector('#object-list')
    assign(F_CONS); deploy()
    g.check('m04 solved')

    # ---------------- analytic model preview as Aylin, reload survives
    g.reload()
    g.space('RHN_REP')
    pg.click('[data-list="models"]')
    pg.click('#object-list [data-open="RHN_REP.RHN_REP_AM_CONSUMPTION"]'); pg.wait_for_selector('#am-pivot')
    pg.check('[data-prow="RHN_REP_D_GRID_AREA.REGION"]'); pg.select_option('#am-as', 'ADEMIR'); pg.click('#run')
    pg.wait_for_selector('#am-out .result-status')
    print('   model as ADEMIR:', pg.locator('#am-out tbody tr').all_inner_texts())
    pg.click('[data-list="all"]') if pg.locator('[data-list="all"]').count() else None
    g.done()
