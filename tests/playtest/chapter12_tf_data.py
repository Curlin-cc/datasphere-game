"""Shared parts of the transformation flow playtests (c12-m11, c12-m12)."""
F = 'RHN_DSL.RHN_DS_TF_PAYMENTS'
P = 'RHN_ENTRY.RHN_EN_T_PAYMENTS'
R = 'RHN_ENTRY.RHN_EN_T_DD_RETURNS'
SQL = ("SELECT p.PAYMENT_ID, p.INVOICE_ID, i.CONTRACT_ID, p.PAID_ON, p.AMOUNT\n"
       "FROM RHN_ENTRY.RHN_EN_T_PAYMENTS p\nJOIN RHN_DSL.RHN_DS_V_INVOICES i ON p.INVOICE_ID = i.INVOICE_ID")


def bank_message(pg):
    """Today's bank message in the Data Editor of the payments table (must be open and deployed); Save writes it."""
    pg.fill('[data-cell="11:3"]', '286.38')
    pg.click('#tbl-add-row'); pg.wait_for_timeout(200)
    for c, v in enumerate(['PAY-0096', 'INV-4000080', '2026-07-15', '874.39']):
        pg.fill(f'[data-cell="95:{c}"]', v)
    pg.click('[data-del-row="6"]'); pg.wait_for_timeout(200)
    pg.click('#ed-save'); pg.wait_for_timeout(700)


def returns_with_delta(g):
    """c12-m11: open the returns table (saved, not deployed), switch Delta Capture on, first deploy."""
    pg = g.pg
    g.space('RHN_ENTRY')
    pg.click(f'#object-list [data-open="{R}"]'); pg.wait_for_selector('#ed-deploy')
    pg.check('#prop-delta'); pg.wait_for_timeout(200)
    pg.click('#ed-deploy'); pg.wait_for_timeout(800)
