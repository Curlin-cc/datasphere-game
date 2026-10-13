"""Start state for the chapter 11 playtests: chapters 0–10 solved: both task chains deployed, the nightly one scheduled
daily with the failure email; readings and customers persisted. Connections and flows of chapter 3 come from the set-up."""
import copy
from chapter10_data import TENANT10

TS = "2026-10-09T11:00:00.000Z"
IN_CHAIN = {"steps": [{"object": "RHN_ENTRY.RHN_EN_RF_CRM", "type": "Replication Flow"}],
            "notify": {"onFailure": False, "onSuccess": False, "recipients": ""}}
NIGHTLY = {"steps": [{"object": "RHN_ENTRY.RHN_EN_TC_CRM", "type": "Task Chain"},
                     {"object": "RHN_DSL.RHN_DS_V_CUSTOMERS", "type": "View Persistence"},
                     {"object": "RHN_DSL.RHN_DS_V_METER_READINGS", "type": "View Persistence"}],
           "notify": {"onFailure": True, "onSuccess": False, "recipients": "LHOFFMANN"}}


def chain(space, name, business, d, schedule=None):
    o = {"space": space, "name": name, "kind": "Task Chain", "businessName": business, "semanticUsage": "Relational Dataset",
         "chain": d, "deployed": {"businessName": business, "chain": copy.deepcopy(d)}, "status": "deployed", "changedAt": TS}
    if schedule:
        o["chainSchedule"] = schedule
    return o


TENANT11 = copy.deepcopy(TENANT10)
TENANT11["shares"] += [{"object": "RHN_ENTRY.RHN_EN_TC_CRM", "to": "RHN_DSL"}]
TENANT11["objects"] += [chain("RHN_ENTRY", "RHN_EN_TC_CRM", "CRM file", IN_CHAIN),
                        chain("RHN_DSL", "RHN_DS_TC_NIGHTLY", "Nightly", NIGHTLY, "Daily")]
for o in TENANT11["objects"]:
    if o["name"] == "RHN_DS_V_METER_READINGS":
        o.pop("persistSchedule", None)
    if o["name"] == "RHN_DS_V_CUSTOMERS":
        o["persisted"] = {"lastRefresh": TS, "records": 900, "columns": 7}
