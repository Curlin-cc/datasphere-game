"""Shared parts of the transformation flow playtests (c12-m11, c12-m12)."""
F = 'RHN_HARM.RHN_HA_TF_PAYMENTS'
P = 'RHN_IN.RHN_IN_T_PAYMENTS'
SQL = ("SELECT p.PAYMENT_ID, p.INVOICE_ID, i.CONTRACT_ID, p.PAID_ON, p.AMOUNT\n"
       "FROM RHN_IN.RHN_IN_T_PAYMENTS p\nJOIN RHN_HARM.RHN_HA_V_INVOICES i ON p.INVOICE_ID = i.INVOICE_ID")


def bank_message(pg, deploy=True):
    """Today's bank message in the Data Editor of the payments table (must be open)."""
    pg.fill('[data-cell="11:3"]', '286.38')
    pg.click('#tbl-add-row'); pg.wait_for_timeout(200)
    for c, v in enumerate(['PAY-0096', 'INV-4000080', '2026-07-15', '874.39']):
        pg.fill(f'[data-cell="95:{c}"]', v)
    pg.click('[data-del-row="6"]'); pg.wait_for_timeout(200)
    pg.click('#ed-deploy' if deploy else '#ed-save'); pg.wait_for_timeout(700)
