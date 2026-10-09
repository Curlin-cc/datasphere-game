"""Start state for the chapter 9 playtests: chapters 0–8 solved, both facts protected by RHN_REP_DAC_GRID_AREA."""
import copy
from chapter8_data import TENANT8

PERM = {"columns": [{"name": "USER_ID", "type": "String", "key": True}, {"name": "GRID_AREA", "type": "String", "key": True}],
        "rows": [["PLINDNER", "NORTH"], ["PLINDNER", "EAST"], ["PLINDNER", "SOUTH"], ["PLINDNER", "WEST"],
                 ["MBRANDT", "NORTH"], ["MBRANDT", "EAST"], ["ADEMIR", "SOUTH"], ["ADEMIR", "WEST"]]}
DAC = {"type": "Single Values", "entity": "RHN_REP.RHN_REP_T_PERMISSIONS", "identifier": "USER_ID", "criteria": ["GRID_AREA"]}
ASSIGN = [{"dac": "RHN_REP.RHN_REP_DAC_GRID_AREA", "mapping": {"GRID_AREA": "GRID_AREA"}}]
TS = "2026-10-09T10:00:00.000Z"

TENANT9 = copy.deepcopy(TENANT8)
TENANT9["consent"] = True
TENANT9["objects"] += [
    {"space": "RHN_REP", "name": "RHN_REP_T_PERMISSIONS", "kind": "Local Table", "businessName": "Permissions", "semanticUsage": "Relational Dataset",
     "table": PERM, "deployed": {"businessName": "Permissions", "table": copy.deepcopy(PERM)}, "status": "deployed", "changedAt": TS},
    {"space": "RHN_REP", "name": "RHN_REP_DAC_GRID_AREA", "kind": "Data Access Control", "businessName": "Grid Area Access", "semanticUsage": "Relational Dataset",
     "dac": DAC, "deployed": {"businessName": "Grid Area Access", "dac": copy.deepcopy(DAC)}, "status": "deployed", "changedAt": TS},
]
for o in TENANT9["objects"]:
    if o["name"] in ("RHN_REP_F_INVOICES", "RHN_REP_F_CONSUMPTION"):
        o["dacs"] = copy.deepcopy(ASSIGN)
        o["deployed"]["dacs"] = copy.deepcopy(ASSIGN)
