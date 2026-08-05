from utils.utils import load_records
from .GST_transform import transform_gst

columns = [
    "gst_id", "start_time", "link", "submission_time",
    "version_id", "kp_index", "linked_events", "sent_notifications"
]

def load_gst(events: list[dict]):
    rows = transform_gst(events)
    load_records("gst_events", columns, rows)