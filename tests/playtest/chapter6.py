"""Chapter 6 (Semantics): dimensions, facts, column roles and associations in RHN_REP, with typical mistakes.
Starts with chapters 0–5 solved and the harmonized views of chapter 5 deployed (chapter6_data.py)."""
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before
from chapter6_data import TENANT6

S = sys.argv[1] if len(sys.argv) > 1 else '.'
D_GRID, D_TARIFF, D_CUST = 'RHN_REP.RHN_REP_D_GRID_AREA', 'RHN_REP.RHN_REP_D_TARIFF', 'RHN_REP.RHN_REP_D_CUSTOMER'
CONS = ("SELECT r.CONTRACT_ID, c.CUSTOMER_ID, c.GRID_AREA, c.TARIFF, r.READING_DATE, r.CONSUMPTION_KWH "
        "FROM RHN_HARM.RHN_HA_V_METER_READINGS r JOIN RHN_HARM.RHN_HA_V_CONTRACTS c ON r.CONTRACT_ID = c.CONTRACT_ID")
INV = ("SELECT i.INVOICE_ID, i.CONTRACT_ID, c.CUSTOMER_ID, c.GRID_AREA, c.TARIFF, i.INVOICE_DATE, i.DUE_DATE, i.STATUS, i.NET_AMOUNT, i.TAX_AMOUNT "
       "FROM RHN_HARM.RHN_HA_V_INVOICES i JOIN RHN_HARM.RHN_HA_V_CONTRACTS c ON i.CONTRACT_ID = c.CONTRACT_ID")

with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg
    g.start(save_before(6, 'c06-m01', TENANT6))
    g.walk_tutorial(show=False)

    # ---------------- m01: dimension straight on inbound (blocked), no key, then right
    g.space('RHN_HARM')
    g.new_view('SELECT GRID_AREA, GRID_AREA_NAME, REGION, SRC_SYS_ID FROM RHN_IN.GRID_AREAS', 'RHN_HA_V_GRID_AREAS', 'Grid Areas (harmonized)')
    pg.click('#ed-back'); pg.wait_for_selector('#new-tiles')
    g.share('RHN_HARM.RHN_HA_V_GRID_AREAS', 'RHN_REP')
    g.space('RHN_REP')
    g.new_view('SELECT GRID_AREA, GRID_AREA_NAME, REGION FROM RHN_HARM.RHN_HA_V_GRID_AREAS', 'RHN_REP_D_GRID_AREA', 'Grid Area', deploy=False)
    g.semantics('Dimension')
    g.check('m01 dimension without key')
    g.shot('c6-dimension')
    g.semantics('Dimension', {'GRID_AREA': 'Key'})
    g.answer('usage', 1); g.answer('layer', 1)
    g.check('m01 solved')
    g.next_mission()

    # ---------------- m02: customer with e-mail, then right
    g.space('RHN_IN'); g.share('RHN_IN.TARIFFS', 'RHN_HARM')
    g.space('RHN_HARM')
    g.new_view('SELECT TARIFF, COMMODITY, TARIFF_NAME, PRICE_PER_KWH, BASE_FEE_MONTH, SRC_SYS_ID FROM RHN_IN.TARIFFS', 'RHN_HA_V_TARIFFS', 'Tariffs (harmonized)')
    pg.click('#ed-back'); pg.wait_for_selector('#new-tiles')
    g.share('RHN_HARM.RHN_HA_V_TARIFFS', 'RHN_REP'); g.share('RHN_HARM.RHN_HA_V_CUSTOMERS', 'RHN_REP')
    g.space('RHN_REP')
    g.new_view('SELECT TARIFF, TARIFF_NAME, COMMODITY FROM RHN_HARM.RHN_HA_V_TARIFFS', 'RHN_REP_D_TARIFF', 'Tariff', deploy=False)
    g.semantics('Dimension', {'TARIFF': 'Key'})
    pg.click('#ed-back'); pg.wait_for_selector('#new-tiles')
    g.new_view('SELECT CUSTOMER_ID, NAME, STREET, ZIP, CITY, EMAIL FROM RHN_HARM.RHN_HA_V_CUSTOMERS', 'RHN_REP_D_CUSTOMER', 'Customer', deploy=False)
    g.semantics('Dimension', {'CUSTOMER_ID': 'Key'})
    g.answer('minimize', 1)
    g.check('m02 personal data')
    g.sql('SELECT CUSTOMER_ID, NAME, ZIP, CITY FROM RHN_HARM.RHN_HA_V_CUSTOMERS')
    pg.click('#run'); pg.wait_for_selector('.result-status')
    pg.click('#ed-deploy'); pg.wait_for_timeout(600)
    g.check('m02 solved')
    g.next_mission()

    # ---------------- m03: names in the fact, IDs as measures, then right
    g.space('RHN_REP')
    g.new_view(CONS.replace('c.TARIFF,', 'c.TARIFF, g.REGION,').replace(' FROM RHN_HARM.RHN_HA_V_METER_READINGS r', ' FROM RHN_HARM.RHN_HA_V_METER_READINGS r')
               .replace('JOIN RHN_HARM.RHN_HA_V_CONTRACTS c ON r.CONTRACT_ID = c.CONTRACT_ID',
                        'JOIN RHN_HARM.RHN_HA_V_CONTRACTS c ON r.CONTRACT_ID = c.CONTRACT_ID JOIN RHN_HARM.RHN_HA_V_GRID_AREAS g ON c.GRID_AREA = g.GRID_AREA'),
               'RHN_REP_F_CONSUMPTION', 'Consumption', deploy=False)
    g.semantics('Fact', {'CONSUMPTION_KWH': 'Measure', 'CUSTOMER_ID': 'Measure'})
    g.answer('names', 1)
    g.check('m03 region in fact, id as measure')
    g.sql(CONS); pg.click('#run'); pg.wait_for_selector('.result-status')
    g.semantics('Fact', {'CUSTOMER_ID': 'Attribute'})
    g.check('m03 solved')
    g.next_mission()

    # ---------------- m04: one association with a wrong mapping, then right
    g.space('RHN_REP')
    pg.click('#object-list [data-open="RHN_REP.RHN_REP_F_CONSUMPTION"]'); pg.wait_for_selector('#column-roles')
    pg.click('#assoc-add'); pg.select_option('#assoc-target', D_CUST)
    pg.select_option('#assoc-mapping select[data-to="CUSTOMER_ID"]', 'CONTRACT_ID')
    g.shot('c6-assoc-dialog')
    pg.click('.dialog button[type="submit"]')
    pg.click('#ed-deploy'); pg.wait_for_timeout(600)
    g.answer('runtime', 1)
    g.check('m04 wrong mapping, two missing')
    g.semantics('Fact', assoc=[D_GRID, D_TARIFF, D_CUST])
    g.shot('c6-associations')
    g.check('m04 solved')
    g.next_mission()

    # ---------------- m05: keys from raw contracts (blocked by sharing), then right
    g.space('RHN_IN'); g.share('RHN_IN.BILLING_INVOICES', 'RHN_HARM')
    g.space('RHN_HARM')
    g.new_view('SELECT INVOICE_ID, CONTRACT_ID, INVOICE_DATE, PERIOD_FROM, PERIOD_TO, NET_AMOUNT, TAX_AMOUNT, CURRENCY, STATUS, DUE_DATE, PAID_DATE, SRC_SYS_ID FROM RHN_IN.BILLING_INVOICES',
               'RHN_HA_V_INVOICES', 'Invoices (harmonized)')
    pg.click('#ed-back'); pg.wait_for_selector('#new-tiles')
    g.share('RHN_HARM.RHN_HA_V_INVOICES', 'RHN_REP')
    g.space('RHN_REP')
    g.new_view(INV.replace('i.TAX_AMOUNT ', 'i.TAX_AMOUNT, i.NET_AMOUNT + i.TAX_AMOUNT AS GROSS_AMOUNT '), 'RHN_REP_F_INVOICES', 'Invoices', deploy=False)
    g.semantics('Fact', {'NET_AMOUNT': 'Measure', 'TAX_AMOUNT': 'Measure', 'GROSS_AMOUNT': 'Measure'}, [D_GRID, D_TARIFF, D_CUST])
    g.check('m05 gross column')
    g.sql(INV); pg.click('#run'); pg.wait_for_selector('.result-status')
    pg.click('#ed-deploy'); pg.wait_for_timeout(600)
    pg.click('#ed-back'); pg.wait_for_selector('#new-tiles')
    g.new_view("SELECT d.REGION, SUM(f.NET_AMOUNT) AS NET FROM RHN_REP.RHN_REP_F_INVOICES f JOIN RHN_REP.RHN_REP_D_GRID_AREA d ON f.GRID_AREA = d.GRID_AREA "
               "WHERE year(f.INVOICE_DATE) = 2025 GROUP BY d.REGION")
    pg.click('#run'); pg.wait_for_selector('.result-status')
    print('   net by region 2025:', pg.locator('#results tbody tr').all_inner_texts())
    g.answer('north', 2)
    g.check('m05 solved')

    # ---------------- reload: semantics survive
    g.reload()
    g.space('RHN_REP')
    print('   objects:', [r.split('\t')[1:5] for r in pg.locator('#object-list tbody tr').all_inner_texts()])
    pg.click('#object-list [data-open="RHN_REP.RHN_REP_F_INVOICES"]'); pg.wait_for_selector('#column-roles')
    print('   assoc after reload:', pg.locator('#assoc-list li').all_inner_texts())
    print('   status:', pg.inner_text('.ed-toolbar .status'))
    g.done()
