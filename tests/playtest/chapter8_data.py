"""Start state for the chapter 8 playtests: chapters 0–7 solved, both analytic models deployed."""
import copy
from chapter7_data import TENANT7

INV_MODEL = {
    "fact": "RHN_REP.RHN_REP_F_INVOICES", "dimensions": ["RHN_REP.RHN_REP_D_GRID_AREA", "RHN_REP.RHN_REP_D_TARIFF"],
    "attributes": ["INVOICE_ID", "CONTRACT_ID", "CUSTOMER_ID", "GRID_AREA", "TARIFF", "INVOICE_DATE", "DUE_DATE", "STATUS",
                   "RHN_REP_D_GRID_AREA.GRID_AREA_NAME", "RHN_REP_D_GRID_AREA.REGION", "RHN_REP_D_TARIFF.TARIFF_NAME", "RHN_REP_D_TARIFF.COMMODITY"],
    "measures": [
        {"type": "Fact Source Measure", "name": "NET_AMOUNT", "column": "NET_AMOUNT", "aggregation": "SUM"},
        {"type": "Fact Source Measure", "name": "TAX_AMOUNT", "column": "TAX_AMOUNT", "aggregation": "SUM"},
        {"type": "Calculated Measure", "name": "GROSS_AMOUNT", "formula": "NET_AMOUNT + TAX_AMOUNT"},
        {"type": "Restricted Measure", "name": "UNPAID_GROSS", "base": "GROSS_AMOUNT", "attribute": "STATUS", "values": ["OPEN", "OVERDUE"]},
        {"type": "Count Distinct", "name": "CUSTOMERS", "attribute": "CUSTOMER_ID"},
    ],
    "variables": [{"name": "V_INVOICE_DATE", "type": "Filter Variable", "attribute": "INVOICE_DATE", "selection": "Interval", "mandatory": True}],
}
CONS_MODEL = {
    "fact": "RHN_REP.RHN_REP_F_CONSUMPTION", "dimensions": ["RHN_REP.RHN_REP_D_GRID_AREA", "RHN_REP.RHN_REP_D_TARIFF"],
    "attributes": ["CONTRACT_ID", "CUSTOMER_ID", "GRID_AREA", "TARIFF", "READING_DATE",
                   "RHN_REP_D_GRID_AREA.GRID_AREA_NAME", "RHN_REP_D_GRID_AREA.REGION", "RHN_REP_D_TARIFF.TARIFF_NAME", "RHN_REP_D_TARIFF.COMMODITY"],
    "measures": [{"type": "Fact Source Measure", "name": "CONSUMPTION_KWH", "column": "CONSUMPTION_KWH", "aggregation": "SUM"}],
    "variables": [{"name": "V_READING_DATE", "type": "Filter Variable", "attribute": "READING_DATE", "selection": "Interval", "mandatory": False}],
}


def model(name, business, d):
    return {"space": "RHN_REP", "name": name, "kind": "Analytic Model", "businessName": business, "semanticUsage": "Relational Dataset",
            "model": d, "deployed": {"businessName": business, "model": copy.deepcopy(d)}, "status": "deployed", "changedAt": "2026-10-09T09:00:00.000Z"}


TENANT8 = copy.deepcopy(TENANT7)
TENANT8["objects"] += [model("RHN_REP_AM_INVOICES", "Invoices Model", INV_MODEL), model("RHN_REP_AM_CONSUMPTION", "Consumption Model", CONS_MODEL)]
