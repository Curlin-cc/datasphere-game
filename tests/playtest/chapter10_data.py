"""Start state for the chapter 10 playtests: chapters 0–9 solved: readings persisted and scheduled daily, tracing on.
Connections and flows of chapter 3 are added by the mission set-up (ensureInbound in c10.ts)."""
import copy
from chapter9_data import TENANT9

TENANT10 = copy.deepcopy(TENANT9)
TENANT10["tracing"] = {"enabled": True, "thresholdMs": 1000}
for o in TENANT10["objects"]:
    if o["name"] == "RHN_DS_V_METER_READINGS":
        o["persisted"] = {"lastRefresh": "2026-10-09T06:00:00.000Z", "records": 5726, "columns": 5}
        o["persistSchedule"] = "Daily"
