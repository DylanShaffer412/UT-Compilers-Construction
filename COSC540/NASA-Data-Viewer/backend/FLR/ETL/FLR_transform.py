import json
from datetime import datetime


def parse_dt(dt_str):
    if not dt_str:
        return None
    return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))


def transform_flr(events: list[dict]) -> list[tuple]:
    """
    Returns a list of tuples matching the columns list in load
    
    """
    rows = []
    for event in events:
        flr_id = event.get("flrID")
        if not flr_id:
            continue
        rows.append((
            flr_id,
            event.get("catalog"),
            json.dumps(event.get("instruments")),
            parse_dt(event.get("beginTime")),
            parse_dt(event.get("peakTime")),
            parse_dt(event.get("endTime")),
            event.get("classType"),
            event.get("sourceLocation"),
            event.get("activeRegionNum"),
            event.get("note"),
            parse_dt(event.get("submissionTime")),
            event.get("versionId"),
            event.get("link"),
            json.dumps(event.get("linkedEvents")),
            json.dumps(event.get("sentNotifications")),
            parse_dt(event.get("lastUpdated"))
        ))
    return rows