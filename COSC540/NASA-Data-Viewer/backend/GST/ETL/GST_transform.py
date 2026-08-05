import json
from datetime import datetime


def parse_dt(dt_str):
    if not dt_str:
        return None
    return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))


def transform_gst(events: list[dict]) -> list[tuple]:
    """
    Returns a list of tuples matching the columns list in load
    
    """
    rows = []
    for event in events:
        gst_id = event.get("gstID")
        if not gst_id:
            continue
        rows.append((
            gst_id,
            parse_dt(event.get("startTime")),
            event.get("link"),
            parse_dt(event.get("submissionTime")),
            event.get("versionId"),
            json.dumps(event.get("allKpIndex")),
            json.dumps(event.get("linkedEvents")),
            json.dumps(event.get("sentNotifications")),
        ))
    return rows