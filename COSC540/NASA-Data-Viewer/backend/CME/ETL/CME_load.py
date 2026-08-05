from utils.utils import load_records
from .CME_transform import transform_cme

columns = [
    "activity_id",
    "catalog",
    "start_time",
    "source_location",
    "active_region_num",
    "link",
    "note",
    "instruments",
    "cme_analyses",
    "linked_events",
]

def load_cme(events: list[dict]):
    rows = transform_cme(events)
    load_records("cme_events", columns, rows)
    