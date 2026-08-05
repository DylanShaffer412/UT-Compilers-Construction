import json
from datetime import datetime


def parse_dt(dt_str):
    if not dt_str:
        return None
    return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))


def transform_cme(events: list[dict]) -> list[tuple]:
    """
    Returns a list of tuples matching the columns list in CME_LOAD.py
    """
    rows = []

    for event in events:
        activity_id = event.get("activityID")
        if not activity_id:
            continue

        rows.append((
            activity_id,
            event.get("catalog"),
            parse_dt(event.get("startTime")),
            event.get("sourceLocation"),
            event.get("activeRegionNum"),
            event.get("link"),
            event.get("note"),
            json.dumps(event.get("instruments")),
            json.dumps(event.get("cmeAnalyses")),
            json.dumps(event.get("linkedEvents")),
        ))

    return rows
