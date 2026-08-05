from utils.utils import load_records
from .FLR_transform import transform_flr

columns = [
    "flr_id",
    "catalog",
    "instruments",
    "begin_time",
    "peak_time",
    "end_time",
    "class_type",
    "source_location",
    "active_region_num",
    "note",
    "submission_time",
    "version_id",
    "link",
    "linked_events",
    "sent_notifications",
    "last_updated"
]

def load_flr(events: list[dict]):
    rows = transform_flr(events)
    load_records("FLR_TABLE", columns, rows)