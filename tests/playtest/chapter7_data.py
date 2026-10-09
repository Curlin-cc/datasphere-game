"""Start state for the chapter 7 playtests: chapters 0–6 solved, reporting layer with dimensions and facts deployed."""
import copy
from chapter6_data import TENANT6, view

D_GRID, D_TARIFF, D_CUST = 'RHN_REP.RHN_REP_D_GRID_AREA', 'RHN_REP.RHN_REP_D_TARIFF', 'RHN_REP.RHN_REP_D_CUSTOMER'
CONS = ("SELECT r.CONTRACT_ID, c.CUSTOMER_ID, c.GRID_AREA, c.TARIFF, r.READING_DATE, r.CONSUMPTION_KWH "
        "FROM RHN_HARM.RHN_HA_V_METER_READINGS r JOIN RHN_HARM.RHN_HA_V_CONTRACTS c ON r.CONTRACT_ID = c.CONTRACT_ID")
INV = ("SELECT i.INVOICE_ID, i.CONTRACT_ID, c.CUSTOMER_ID, c.GRID_AREA, c.TARIFF, i.INVOICE_DATE, i.DUE_DATE, i.STATUS, i.NET_AMOUNT, i.TAX_AMOUNT "
       "FROM RHN_HARM.RHN_HA_V_INVOICES i JOIN RHN_HARM.RHN_HA_V_CONTRACTS c ON i.CONTRACT_ID = c.CONTRACT_ID")
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
TENANT7["shares"] += [{"object": f"RHN_IN.{t}", "to": "RHN_HARM"} for t in ["TARIFFS", "BILLING_INVOICES"]]
TENANT7["shares"] += [{"object": f"RHN_HARM.{v}", "to": "RHN_REP"} for v in
                      ["RHN_HA_V_GRID_AREAS", "RHN_HA_V_TARIFFS", "RHN_HA_V_CUSTOMERS", "RHN_HA_V_INVOICES"]]
TENANT7["objects"] += [
    view("RHN_HARM", "RHN_HA_V_GRID_AREAS", "Grid Areas (harmonized)", "SELECT GRID_AREA, GRID_AREA_NAME, REGION, SRC_SYS_ID FROM RHN_IN.GRID_AREAS"),
    view("RHN_HARM", "RHN_HA_V_TARIFFS", "Tariffs (harmonized)",
         "SELECT TARIFF, COMMODITY, TARIFF_NAME, PRICE_PER_KWH, BASE_FEE_MONTH, SRC_SYS_ID FROM RHN_IN.TARIFFS"),
    view("RHN_HARM", "RHN_HA_V_INVOICES", "Invoices (harmonized)",
         "SELECT INVOICE_ID, CONTRACT_ID, INVOICE_DATE, PERIOD_FROM, PERIOD_TO, NET_AMOUNT, TAX_AMOUNT, CURRENCY, STATUS, DUE_DATE, PAID_DATE, SRC_SYS_ID "
         "FROM RHN_IN.BILLING_INVOICES"),
    sem("RHN_REP", "RHN_REP_D_GRID_AREA", "Grid Area", "SELECT GRID_AREA, GRID_AREA_NAME, REGION FROM RHN_HARM.RHN_HA_V_GRID_AREAS", "Dimension",
        roles(['GRID_AREA', 'GRID_AREA_NAME', 'REGION'], {'GRID_AREA': 'Key'})),
    sem("RHN_REP", "RHN_REP_D_TARIFF", "Tariff", "SELECT TARIFF, TARIFF_NAME, COMMODITY FROM RHN_HARM.RHN_HA_V_TARIFFS", "Dimension",
        roles(['TARIFF', 'TARIFF_NAME', 'COMMODITY'], {'TARIFF': 'Key'})),
    sem("RHN_REP", "RHN_REP_D_CUSTOMER", "Customer", "SELECT CUSTOMER_ID, NAME, ZIP, CITY FROM RHN_HARM.RHN_HA_V_CUSTOMERS", "Dimension",
        roles(['CUSTOMER_ID', 'NAME', 'ZIP', 'CITY'], {'CUSTOMER_ID': 'Key'})),
    sem("RHN_REP", "RHN_REP_F_CONSUMPTION", "Consumption", CONS, "Fact",
        roles(['CONTRACT_ID', 'CUSTOMER_ID', 'GRID_AREA', 'TARIFF', 'READING_DATE', 'CONSUMPTION_KWH'], {'CONSUMPTION_KWH': 'Measure'}), ASSOC),
    sem("RHN_REP", "RHN_REP_F_INVOICES", "Invoices", INV, "Fact",
        roles(['INVOICE_ID', 'CONTRACT_ID', 'CUSTOMER_ID', 'GRID_AREA', 'TARIFF', 'INVOICE_DATE', 'DUE_DATE', 'STATUS', 'NET_AMOUNT', 'TAX_AMOUNT'],
              {'NET_AMOUNT': 'Measure', 'TAX_AMOUNT': 'Measure'}), ASSOC),
]
