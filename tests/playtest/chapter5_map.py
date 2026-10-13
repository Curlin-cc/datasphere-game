"""Chapter 5, mission 1 the other way: a mapping table RHN_DS_T_CODE_MAP in RHN_DSL (New Table, Data Editor) joined in the view.
Plays an inner join first (drops every S4U contract), then LEFT JOIN without COALESCE (S4U codes NULL), then right."""
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before
from chapter5_data import TENANT5 as TENANT

S = sys.argv[1] if len(sys.argv) > 1 else '.'
ROWS = [('GRID_AREA', 'Nord', 'NORTH'), ('GRID_AREA', 'Ost', 'EAST'), ('GRID_AREA', 'Süd', 'SOUTH'), ('GRID_AREA', 'West', 'WEST'),
        ('TARIFF', 'STROM_BASIS', 'POWER_BASIC'), ('TARIFF', 'STROM_OEKO', 'POWER_GREEN'), ('TARIFF', 'STROM_WAERME', 'POWER_HEAT'),
        ('TARIFF', 'GAS_KOMFORT', 'GAS_COMFORT')]
JOINS = ("FROM RHN_ENTRY.BILLING_CONTRACTS c {j} RHN_DSL.RHN_DS_T_CODE_MAP g ON g.CODE_TYPE = 'GRID_AREA' AND g.LEGACY_CODE = c.GRID_AREA "
         "{j} RHN_DSL.RHN_DS_T_CODE_MAP t ON t.CODE_TYPE = 'TARIFF' AND t.LEGACY_CODE = c.TARIFF")
RIGHT = ("SELECT c.CONTRACT_ID, c.CUSTOMER_ID, COALESCE(g.S4_CODE, c.GRID_AREA) AS GRID_AREA, COALESCE(t.S4_CODE, c.TARIFF) AS TARIFF, "
         "c.START_DATE, c.END_DATE, c.SRC_SYS_ID " + JOINS.format(j='LEFT JOIN'))
NO_COALESCE = ("SELECT c.CONTRACT_ID, c.CUSTOMER_ID, g.S4_CODE AS GRID_AREA, t.S4_CODE AS TARIFF, c.START_DATE, c.END_DATE, c.SRC_SYS_ID "
               + JOINS.format(j='LEFT JOIN'))
INNER = RIGHT.replace('LEFT JOIN', 'JOIN')

with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg
    g.start(save_before(5, 'c05-m01', TENANT))
    g.walk_tutorial(show=False)

    g.space('RHN_DSL')
    pg.click('[data-new="table"]'); pg.wait_for_selector('#tbl-columns')
    pg.fill('[data-col-name="0"]', 'CODE_TYPE'); pg.keyboard.press('Tab'); pg.wait_for_timeout(100)
    pg.click('#tbl-add-col'); pg.fill('[data-col-name="1"]', 'LEGACY_CODE'); pg.keyboard.press('Tab'); pg.wait_for_timeout(100)
    pg.check('[data-col-key="1"]'); pg.wait_for_timeout(100)
    pg.click('#tbl-add-col'); pg.fill('[data-col-name="2"]', 'S4_CODE'); pg.keyboard.press('Tab'); pg.wait_for_timeout(100)
    for i, row in enumerate(ROWS):
        pg.click('#tbl-add-row')
        for j, v in enumerate(row):
            pg.fill(f'[data-cell="{i}:{j}"]', v)
    pg.fill('#prop-business', 'Code mapping'); pg.fill('#prop-technical', 'RHN_DS_T_CODE_MAP')
    pg.click('#ed-deploy'); pg.wait_for_timeout(600)
    print('   table deploy:', g.toast())
    g.shot('c5-map-table')
    pg.click('#ed-back'); pg.wait_for_selector('#new-tiles')

    g.new_view(INNER, 'RHN_DS_V_CONTRACTS', 'Contracts (clean)')
    g.check('m01 map: inner join')
    g.sql(NO_COALESCE); pg.click('#ed-deploy'); pg.wait_for_timeout(600)
    g.check('m01 map: no COALESCE')
    g.sql(RIGHT); pg.click('#run'); pg.wait_for_selector('.result-status')
    print('   preview:', pg.inner_text('.result-status'))
    pg.click('#ed-deploy'); pg.wait_for_timeout(600)
    g.answer('where', 1)
    g.check('m01 map: solved')
    print('   lineage:', pg.inner_text('#lineage').replace('\n', ' | ') if pg.locator('#lineage').count() else '-')
    g.reload()
    g.space('RHN_DSL')
    print('   objects after reload:', pg.inner_text('#object-list tbody').replace('\n', ' | ')[:200])
    g.done()
