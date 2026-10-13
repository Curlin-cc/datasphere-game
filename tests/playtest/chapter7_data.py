"""Start state for the chapter 7 playtests: chapters 0–6 solved, dimensions and facts deployed in RHN_DSL (nothing shared with RHN_PRES yet)."""
import copy
from chapter6_data import TENANT6, view

D_GRID, D_TARIFF, D_CUST = 'RHN_DSL.RHN_DS_D_GRID_AREA', 'RHN_DSL.RHN_DS_D_TARIFF', 'RHN_DSL.RHN_DS_D_CUSTOMER'
CONS = ("SELECT r.CONTRACT_ID, c.CUSTOMER_ID, c.GRID_AREA, c.TARIFF, r.READING_DATE, r.CONSUMPTION_KWH "
        "FROM RHN_DSL.RHN_DS_V_METER_READINGS r JOIN RHN_DSL.RHN_DS_V_CONTRACTS c ON r.CONTRACT_ID = c.CONTRACT_ID")
INV = ("SELECT i.INVOICE_ID, i.CONTRACT_ID, c.CUSTOMER_ID, c.GRID_AREA, c.TARIFF, i.INVOICE_DATE, i.DUE_DATE, i.STATUS, i.NET_AMOUNT, i.TAX_AMOUNT "
       "FROM RHN_DSL.RHN_DS_V_INVOICES i JOIN RHN_DSL.RHN_DS_V_CONTRACTS c ON i.CONTRACT_ID = c.CONTRACT_ID")
ASSOC = [{"target": D_GRID, "mapping": [{"from": "GRID_AREA", "to": "GRID_AREA"}]},
         {"target": D_TARIFF, "mapping": [{"from": "TARIFF", "to": "TARIFF"}]},
         {"target": D_CUST, "mapping": [{"from": "CUSTOMER_ID", "to": "CUSTOMER_ID"}]}]


def sem(space, name, business, sql, usage, roles, assoc=None):
    v = view(space, name, business, sql)
    s = {"semanticUsage": usage, "columnRoles": roles}
    if assoc:
        s["associations"] = assoc
    v.update(s)
    v["deployed"].update(copy.deepcopy(s))
    return v


def roles(cols, special):
    return {c: special.get(c, 'Attribute') for c in cols}


TENANT7 = copy.deepcopy(TENANT6)
TENANT7["shares"] += [{"object": f"RHN_ENTRY.{t}", "to": "RHN_DSL"} for t in ["TARIFFS", "BILLING_INVOICES"]]
TENANT7["objects"] += [
    view("RHN_DSL", "RHN_DS_V_GRID_AREAS", "Grid Areas (clean)", "SELECT GRID_AREA, GRID_AREA_NAME, REGION, SRC_SYS_ID FROM RHN_ENTRY.GRID_AREAS"),
    view("RHN_DSL", "RHN_DS_V_TARIFFS", "Tariffs (clean)",
         "SELECT TARIFF, COMMODITY, TARIFF_NAME, PRICE_PER_KWH, BASE_FEE_MONTH, SRC_SYS_ID FROM RHN_ENTRY.TARIFFS"),
    view("RHN_DSL", "RHN_DS_V_INVOICES", "Invoices (clean)",
         "SELECT INVOICE_ID, CONTRACT_ID, INVOICE_DATE, PERIOD_FROM, PERIOD_TO, NET_AMOUNT, TAX_AMOUNT, CURRENCY, STATUS, DUE_DATE, PAID_DATE, SRC_SYS_ID "
         "FROM RHN_ENTRY.BILLING_INVOICES"),
    sem("RHN_DSL", "RHN_DS_D_GRID_AREA", "Grid Area", "SELECT GRID_AREA, GRID_AREA_NAME, REGION FROM RHN_DSL.RHN_DS_V_GRID_AREAS", "Dimension",
        roles(['GRID_AREA', 'GRID_AREA_NAME', 'REGION'], {'GRID_AREA': 'Key'})),
    sem("RHN_DSL", "RHN_DS_D_TARIFF", "Tariff", "SELECT TARIFF, TARIFF_NAME, COMMODITY FROM RHN_DSL.RHN_DS_V_TARIFFS", "Dimension",
        roles(['TARIFF', 'TARIFF_NAME', 'COMMODITY'], {'TARIFF': 'Key'})),
    sem("RHN_DSL", "RHN_DS_D_CUSTOMER", "Customer", "SELECT CUSTOMER_ID, NAME, ZIP, CITY FROM RHN_DSL.RHN_DS_V_CUSTOMERS", "Dimension",
        roles(['CUSTOMER_ID', 'NAME', 'ZIP', 'CITY'], {'CUSTOMER_ID': 'Key'})),
    sem("RHN_DSL", "RHN_DS_F_CONSUMPTION", "Consumption", CONS, "Fact",
        roles(['CONTRACT_ID', 'CUSTOMER_ID', 'GRID_AREA', 'TARIFF', 'READING_DATE', 'CONSUMPTION_KWH'], {'CONSUMPTION_KWH': 'Measure'}), ASSOC),
    sem("RHN_DSL", "RHN_DS_F_INVOICES", "Invoices", INV, "Fact",
        roles(['INVOICE_ID', 'CONTRACT_ID', 'CUSTOMER_ID', 'GRID_AREA', 'TARIFF', 'INVOICE_DATE', 'DUE_DATE', 'STATUS', 'NET_AMOUNT', 'TAX_AMOUNT'],
              {'NET_AMOUNT': 'Measure', 'TAX_AMOUNT': 'Measure'}), ASSOC),
]
