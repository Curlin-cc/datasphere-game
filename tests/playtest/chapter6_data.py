"""Start state for the chapter 6 playtests: chapters 0–5 solved, the harmonized views of chapter 5 deployed and shared."""
from common import SPACES
from chapter5_data import KEYS

CUSTOMERS = ("SELECT CUSTOMER_ID, trim(NAME) AS NAME, STREET, ZIP, CITY, lower(EMAIL) AS EMAIL FROM ("
             "SELECT k.*, ROW_NUMBER() OVER (PARTITION BY lower(EMAIL), STREET, ZIP ORDER BY CREATED_AT) AS RN FROM RHN_IN.CRM_CUSTOMERS k) x WHERE RN = 1")
READINGS = ("SELECT DISTINCT METER_ID, CONTRACT_ID, READING_DATE, CASE WHEN UNIT = 'MWh' THEN VALUE * 1000 ELSE VALUE END AS CONSUMPTION_KWH, "
            "SRC_SYS_ID FROM RHN_IN.METER_READINGS")


def view(space, name, business, sql):
    return {"space": space, "name": name, "kind": "SQL View", "businessName": business, "semanticUsage": "Relational Dataset",
            "sql": sql, "deployed": {"businessName": business, "sql": sql}, "status": "deployed", "changedAt": "2026-10-09T08:00:00.000Z"}


TENANT6 = {
    "spaces": SPACES, "activeSpace": "RHN_REP",
    "shares": [{"object": f"RHN_IN.{t}", "to": "RHN_HARM"} for t in
               ["BILLING_CONTRACTS", "GRID_AREAS", "LEGACY_CUSTOMER_MAP", "CRM_CUSTOMERS", "METER_READINGS"]]
              + [{"object": f"RHN_HARM.{v}", "to": "RHN_REP"} for v in ["RHN_HA_V_CONTRACTS", "RHN_HA_V_METER_READINGS"]],
    "objects": [
        view("RHN_HARM", "RHN_HA_V_CONTRACTS", "Contracts (harmonized)", KEYS),
        view("RHN_HARM", "RHN_HA_V_CUSTOMERS", "Customers (harmonized)", CUSTOMERS),
        view("RHN_HARM", "RHN_HA_V_METER_READINGS", "Meter Readings (harmonized)", READINGS),
    ],
}
