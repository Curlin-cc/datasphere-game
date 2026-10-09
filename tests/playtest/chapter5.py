"""Chapter 5 (Harmonization): deployed SQL views in RHN_HARM, typical mistakes and right solutions.
Starts with chapters 0–4 solved and the shares of c01-m03 (BILLING_CONTRACTS, GRID_AREAS → RHN_HARM)."""
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before, SPACES

S = sys.argv[1] if len(sys.argv) > 1 else '.'
from chapter5_data import TENANT5 as TENANT, GRID, TARIFF, CONTRACTS, KEYS


def customers(partition, order='CREATED_AT'):
    return ("SELECT CUSTOMER_ID, trim(NAME) AS NAME, STREET, ZIP, CITY, lower(EMAIL) AS EMAIL FROM ("
            f"SELECT k.*, ROW_NUMBER() OVER (PARTITION BY {partition} ORDER BY {order}) AS RN FROM RHN_IN.CRM_CUSTOMERS k) x WHERE RN = 1")


with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg
    g.start(save_before(5, 'c05-m01', TENANT))
    g.walk_tutorial()

    # ---------------- m01: grid only, then CASE without ELSE, then save without deploy, then right
    g.space('RHN_HARM')
    g.new_view(f"SELECT c.CONTRACT_ID, c.CUSTOMER_ID, {GRID}, c.TARIFF, c.START_DATE, c.END_DATE, c.SRC_SYS_ID FROM RHN_IN.BILLING_CONTRACTS c",
               'RHN_HA_V_CONTRACTS', 'Contracts (harmonized)')
    print('   status:', pg.inner_text('.ed-toolbar .status'), '|', g.toast())
    g.check('m01 tariffs raw')
    g.sql(CONTRACTS.replace(' ELSE c.GRID_AREA', '').replace(' ELSE c.TARIFF', ''))
    pg.click('#ed-save'); pg.wait_for_timeout(300)
    print('   status after save:', pg.inner_text('.ed-toolbar .status'))
    g.check('m01 saved, not deployed')
    pg.click('#ed-deploy'); pg.wait_for_timeout(600)
    g.check('m01 case without else')
    g.sql(CONTRACTS); pg.click('#run'); pg.wait_for_selector('.result-status')
    print('   preview:', pg.inner_text('.result-status'))
    pg.click('#ed-deploy'); pg.wait_for_timeout(600)
    g.check('m01 wrong answer')
    g.answer('where', 1)
    g.check('m01 solved')
    g.shot('c5-m01')
    g.next_mission()

    # ---------------- m02: deploy without sharing, inner join, a second view, then right
    g.space('RHN_HARM')
    g.edit_view('RHN_HARM.RHN_HA_V_CONTRACTS', KEYS)
    print('   deploy without share:', g.toast())
    g.space('RHN_IN')
    g.share('RHN_IN.LEGACY_CUSTOMER_MAP', 'RHN_HARM')
    g.space('RHN_HARM')
    g.edit_view('RHN_HARM.RHN_HA_V_CONTRACTS', KEYS.replace('LEFT JOIN', 'JOIN'))
    print('   lineage:', pg.inner_text('#lineage').replace('\n', ' | '))
    g.check('m02 inner join')
    g.sql(KEYS); pg.click('#ed-deploy'); pg.wait_for_timeout(600)
    pg.click('#ed-back'); pg.wait_for_selector('#new-tiles')
    g.new_view(CONTRACTS, 'RHN_HA_V_CONTRACTS_NEW', 'Contracts new')
    g.answer('orphans', 3)
    g.check('m02 second view')
    pg.click('#ed-back'); pg.wait_for_selector('#new-tiles')
    pg.click('[data-delete="RHN_HARM.RHN_HA_V_CONTRACTS_NEW"]'); pg.wait_for_timeout(300)
    g.check('m02 solved')
    g.next_mission()

    # ---------------- m03: e-mail only (namesakes), newest kept, right
    g.space('RHN_IN')
    g.share('RHN_IN.CRM_CUSTOMERS', 'RHN_HARM')
    g.space('RHN_HARM')
    g.new_view("SELECT lower(EMAIL) AS E, COUNT(*) AS N, COUNT(DISTINCT STREET) AS STREETS FROM RHN_IN.CRM_CUSTOMERS GROUP BY lower(EMAIL) HAVING COUNT(*) > 1")
    pg.click('#run'); pg.wait_for_selector('.result-status')
    print('   duplicate groups:', pg.inner_text('.result-status'))
    g.sql(customers('lower(EMAIL)'))
    pg.fill('#prop-business', 'Customers (harmonized)'); pg.fill('#prop-technical', 'RHN_HA_V_CUSTOMERS')
    pg.click('#ed-deploy'); pg.wait_for_timeout(600)
    g.check('m03 email only')
    g.sql(customers('lower(EMAIL), STREET, ZIP', 'CREATED_AT DESC')); pg.click('#ed-deploy'); pg.wait_for_timeout(600)
    g.check('m03 newest kept')
    g.sql(customers('lower(EMAIL), STREET, ZIP')); pg.click('#ed-deploy'); pg.wait_for_timeout(600)
    g.answer('removed', 1); g.answer('source', 1)
    g.check('m03 solved')
    g.next_mission()

    # ---------------- m04: duplicates kept, divided, right
    g.space('RHN_IN')
    g.share('RHN_IN.METER_READINGS', 'RHN_HARM')
    g.space('RHN_HARM')
    conv = "CASE WHEN UNIT = 'MWh' THEN VALUE * 1000 ELSE VALUE END AS CONSUMPTION_KWH"
    g.new_view(f"SELECT METER_ID, CONTRACT_ID, READING_DATE, {conv}, SRC_SYS_ID FROM RHN_IN.METER_READINGS",
               'RHN_HA_V_METER_READINGS', 'Meter Readings (harmonized)')
    g.check('m04 duplicates kept')
    g.sql(f"SELECT DISTINCT METER_ID, CONTRACT_ID, READING_DATE, {conv.replace('* 1000', '/ 1000')}, SRC_SYS_ID FROM RHN_IN.METER_READINGS")
    pg.click('#ed-deploy'); pg.wait_for_timeout(600)
    g.check('m04 divided')
    g.sql(f"SELECT DISTINCT METER_ID, CONTRACT_ID, READING_DATE, {conv}, SRC_SYS_ID FROM RHN_IN.METER_READINGS")
    pg.click('#ed-deploy'); pg.wait_for_timeout(600)
    g.answer('gwh', 2)
    g.check('m04 solved')
    g.next_mission()

    # ---------------- m05: inbound shared with reporting, then right
    g.space('RHN_IN')
    g.share('RHN_IN.GRID_AREAS', 'RHN_REP')
    g.space('RHN_HARM')
    g.share('RHN_HARM.RHN_HA_V_CONTRACTS', 'RHN_REP')
    g.share('RHN_HARM.RHN_HA_V_METER_READINGS', 'RHN_REP')
    g.space('RHN_REP')
    g.new_view("SELECT c.GRID_AREA, COUNT(*) AS N FROM RHN_HARM.RHN_HA_V_METER_READINGS r JOIN RHN_HARM.RHN_HA_V_CONTRACTS c ON r.CONTRACT_ID = c.CONTRACT_ID GROUP BY c.GRID_AREA")
    g.answer('change', 1)
    g.check('m05 counted, inbound leak')
    g.space('RHN_IN')
    pg.click('[data-share="RHN_IN.GRID_AREAS"]'); pg.uncheck('.share-targets input[value="RHN_REP"]'); pg.click('.dialog button[type="submit"]')
    g.space('RHN_REP')
    g.new_view("SELECT c.GRID_AREA, SUM(r.CONSUMPTION_KWH) AS CONSUMPTION_KWH FROM RHN_HARM.RHN_HA_V_METER_READINGS r "
               "JOIN RHN_HARM.RHN_HA_V_CONTRACTS c ON r.CONTRACT_ID = c.CONTRACT_ID GROUP BY c.GRID_AREA")
    pg.click('#run'); pg.wait_for_selector('.result-status')
    g.shot('c5-m05')
    g.check('m05 solved')

    # ---------------- reload: the three views come back and still run
    g.reload()
    g.space('RHN_HARM')
    print('   objects:', pg.locator('#object-list tbody tr').all_inner_texts())
    pg.click('#object-list [data-open="RHN_HARM.RHN_HA_V_CONTRACTS"]'); pg.wait_for_selector('#editor')
    pg.click('#run'); pg.wait_for_selector('.result-status')
    print('   contracts after reload:', pg.inner_text('.result-status'))
    print('   lineage:', pg.inner_text('#lineage').replace('\n', ' | '))
    g.shot('c5-lineage')
    g.done()
