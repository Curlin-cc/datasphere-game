"""Chapter 7 (Analytic Model): invoice model for the CFO with calculated, restricted and count distinct measures and a
filter variable, then a lean consumption model. Plays typical mistakes first. Start state: chapter7_data.py."""
import sys
from playwright.sync_api import sync_playwright
from common import Game, save_before
from chapter7_data import TENANT7, D_GRID, D_TARIFF, D_CUST

S = sys.argv[1] if len(sys.argv) > 1 else '.'
F_INV, F_CONS = 'RHN_DSL.RHN_DS_F_INVOICES', 'RHN_DSL.RHN_DS_F_CONSUMPTION'
REGION, COMMODITY = 'RHN_DS_D_GRID_AREA.REGION', 'RHN_DS_D_TARIFF.COMMODITY'


with sync_playwright() as p:
    g = Game(p, S)
    pg = g.pg

    def model_bg():
        """Select the whole model (canvas background) so the properties show measures and variables."""
        pg.click('.am-canvas-hint'); pg.wait_for_selector('#am-measures')

    def new_model(fact, dims, technical, business):
        g.space('RHN_PRES')
        pg.click('[data-new="analytic"]'); pg.wait_for_selector('#am-fact-picker')
        pg.click(f'[data-fact="{fact}"]'); pg.wait_for_selector('#am-canvas')
        for d in dims:
            pg.click(f'[data-add-dim="{d}"]'); pg.wait_for_timeout(100)
        model_bg()
        pg.fill('#prop-business', business)
        pg.fill('#prop-technical', technical)

    def open_model(key):
        g.space('RHN_PRES')
        pg.click(f'#object-list [data-open="{key}"]'); pg.wait_for_selector('#am-canvas')
        model_bg()

    def deploy():
        pg.click('#ed-deploy'); pg.wait_for_timeout(500)
        t = g.toast()
        if 'failed' in t.lower():
            print('   DEPLOY:', t)

    def measure(kind, name, **kw):
        model_bg()
        pg.click(f'[data-new-m="{kind}"]'); pg.wait_for_selector('#am-m-name')
        pg.fill('#am-m-name', name)
        if kind == 'Calculated Measure':
            pg.fill('#am-formula', kw['formula'])
        if kind == 'Restricted Measure':
            pg.select_option('#am-base', kw['base'])
            pg.select_option('#am-r-attr', kw['attribute'])
            for v in kw['values']:
                pg.check(f'#am-values input[value="{v}"]')
        if kind == 'Count Distinct':
            pg.select_option('#am-cd-attr', kw['attribute'])
        pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(150)
        err = pg.locator('.dialog .form-error').all_inner_texts()
        if err and err[0]:
            print('   DIALOG:', err[0])

    def edit_measure(i, **kw):
        model_bg()
        pg.click(f'[data-edit-m="{i}"]'); pg.wait_for_selector('#am-m-name')
        if 'formula' in kw:
            pg.fill('#am-formula', kw['formula'])
        for v in kw.get('check', []):
            pg.check(f'#am-values input[value="{v}"]')
        pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(150)

    def variable(name, attribute, selection, mandatory, edit=None):
        model_bg()
        pg.click(f'[data-edit-v="{edit}"]' if edit is not None else '#am-add-var'); pg.wait_for_selector('#am-v-name')
        pg.fill('#am-v-name', name)
        pg.select_option('#am-v-attr', attribute)
        pg.select_option('#am-v-sel', selection)
        pg.set_checked('#am-v-mand', mandatory)
        pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(150)

    def preview(rows, measures=None, vars=None, label=''):
        for i in pg.locator('[data-prow]').all():
            i.set_checked(i.get_attribute('data-prow') in rows)
        if measures is not None:
            for i in pg.locator('[data-pmeas]').all():
                i.set_checked(i.get_attribute('data-pmeas') in measures)
        for k, v in (vars or {}).items():
            if isinstance(v, tuple):
                pg.fill(f'[data-var-from="{k}"]', v[0]); pg.fill(f'[data-var-to="{k}"]', v[1])
            else:
                pg.fill(f'[data-var="{k}"]', v)
        pg.click('#run'); pg.wait_for_selector('#am-out .result-status')
        status = pg.inner_text('#am-out .result-status')
        rows_out = pg.locator('#am-out tbody tr').all_inner_texts()
        print(f'   preview {label}: {status} {[r.replace(chr(9), " | ") for r in rows_out[:8]]}')

    g.start(save_before(7, 'c07-m01', TENANT7))
    g.walk_tutorial(show=False)

    # ---------------- m01: no fact in RHN_PRES yet; customers shared and in the model; unshared, then right
    g.space('RHN_PRES')
    pg.click('[data-new="analytic"]'); pg.wait_for_selector('#am-fact-picker')
    print('   fact picker before sharing:', pg.inner_text('#am-fact-picker').replace('\n', ' ')[:200])
    g.space('RHN_DSL')
    for v in ['RHN_DS_F_INVOICES', 'RHN_DS_D_GRID_AREA', 'RHN_DS_D_TARIFF', 'RHN_DS_D_CUSTOMER']:
        g.share(f'RHN_DSL.{v}', 'RHN_PRES')
    new_model(F_INV, [D_GRID, D_TARIFF, D_CUST], 'RHN_PR_AM_INVOICES', 'Invoices Model')
    g.shot('c7-canvas')
    deploy()
    g.answer('tariff', 1); g.answer('layer', 1)
    g.check('m01 with customer dimension, customers shared')
    g.space('RHN_DSL')
    pg.click('[data-share="RHN_DSL.RHN_DS_D_CUSTOMER"]'); pg.uncheck('.share-targets input[value="RHN_PRES"]'); pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(200)
    open_model('RHN_PRES.RHN_PR_AM_INVOICES')
    deploy()
    g.shot('c7-not-shared')
    pg.click(f'[data-drop-dim="{D_CUST}"]'); pg.wait_for_timeout(100)
    deploy()
    preview(['RHN_DS_D_TARIFF.TARIFF_NAME'], ['NET_AMOUNT'], label='net by tariff')
    g.shot('c7-preview')
    g.check('m01 solved')
    g.next_mission()

    # ---------------- m02: gross = net only, then right
    open_model('RHN_PRES.RHN_PR_AM_INVOICES')
    measure('Calculated Measure', 'GROSS_AMOUNT', formula='NET_AMOUNT +')       # incomplete formula: dialog error
    pg.fill('#am-formula', 'NET_AMOUNT'); pg.click('.dialog button[type="submit"]'); pg.wait_for_timeout(150)
    deploy()
    g.answer('overdue', 1); g.answer('why', 2)
    g.check('m02 gross is net')
    edit_measure(2, formula='NET_AMOUNT + TAX_AMOUNT')
    deploy()
    preview(['STATUS'], ['GROSS_AMOUNT'], label='gross by status')
    g.check('m02 solved')
    g.next_mission()

    # ---------------- m03: only OPEN, then right
    open_model('RHN_PRES.RHN_PR_AM_INVOICES')
    measure('Restricted Measure', 'UNPAID_GROSS', base='GROSS_AMOUNT', attribute='STATUS', values=['OPEN'])
    deploy()
    g.answer('north', 2); g.answer('filter', 0)
    g.check('m03 only open')
    edit_measure(3, check=['OVERDUE'])
    g.shot('c7-measures')
    deploy()
    preview([REGION], ['GROSS_AMOUNT', 'UNPAID_GROSS'], label='gross vs unpaid')
    g.check('m03 solved')
    g.next_mission()

    # ---------------- m04: single value, optional; then interval, mandatory; count distinct
    open_model('RHN_PRES.RHN_PR_AM_INVOICES')
    variable('V_INVOICE_DATE', 'INVOICE_DATE', 'Single Value', False)
    measure('Count Distinct', 'CUSTOMERS', attribute='CUSTOMER_ID')
    deploy()
    g.answer('gross2025', 2); g.answer('total', 1)
    g.check('m04 single value variable')
    variable('V_INVOICE_DATE', 'INVOICE_DATE', 'Interval', True, edit=0)
    deploy()
    preview([REGION], ['GROSS_AMOUNT'], label='no variable value')
    preview([REGION], ['GROSS_AMOUNT', 'CUSTOMERS'], {'V_INVOICE_DATE': ('2025-01-01', '2025-12-31')}, '2025')
    preview([COMMODITY], ['CUSTOMERS'], {'V_INVOICE_DATE': ('2024-01-01', '2026-12-31')}, 'customers by commodity')
    preview([], ['CUSTOMERS'], label='customers total')
    g.shot('c7-variable')
    g.check('m04 solved')
    g.next_mission()

    # ---------------- m05: consumption model (share the fact first)
    g.space('RHN_DSL'); g.share('RHN_DSL.RHN_DS_F_CONSUMPTION', 'RHN_PRES')
    new_model(F_CONS, [D_GRID, D_TARIFF], 'RHN_PR_AM_CONSUMPTION', 'Consumption Model')
    variable('V_READING_DATE', 'READING_DATE', 'Interval', False)
    deploy()
    preview([REGION, COMMODITY], ['CONSUMPTION_KWH'], {'V_READING_DATE': ('2025-01-01', '2025-12-31')}, 'kwh 2025')
    g.answer('gas', 1); g.answer('lean', 1)
    g.check('m05 solved')

    # ---------------- reload: models survive, preview still works
    g.reload()
    g.space('RHN_PRES')
    pg.click('[data-list="models"]')
    print('   models:', [r.split('\t')[1:5] for r in pg.locator('#object-list tbody tr').all_inner_texts()])
    pg.click('#object-list [data-open="RHN_PRES.RHN_PR_AM_INVOICES"]'); pg.wait_for_selector('#am-canvas')
    print('   status:', pg.inner_text('.ed-toolbar .status'))
    print('   measures:', [m.replace('\n', ' ') for m in pg.locator('#am-measures li').all_inner_texts()])
    g.done()
