import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pathlib import Path

from .GST_load import load_gst
from utils.utils import ensure_table_exists, get_last_event_date

load_dotenv(override=True)

#----API CONFIG---------------------------------------------------------------

API_KEY  = os.getenv("NASA_API_KEY")
BASE_URL = "https://api.nasa.gov/DONKI/GST"

if not API_KEY:
    raise ValueError("NASA_API_KEY missing in .env")

#----EXTRACT---------------------------------------------------------------

def extract_gst(start_date: str, end_date: str) -> list[dict]:
    print(f"[EXTRACT] Fetching GST events: {start_date} to {end_date}")

    try:
        response = requests.get(BASE_URL, params={
            "startDate": start_date,
            "endDate":   end_date,
            "api_key":   API_KEY,
        }, timeout=10)
        response.raise_for_status()
    except requests.exceptions.HTTPError:
        raise requests.exceptions.HTTPError(
            f"[EXTRACT] HTTP {response.status_code} error fetching GST data"
        ) from None

    events = response.json()
    print(f"[EXTRACT] Found {len(events)} event(s)")
    return events

#----MAIN---------------------------------------------------------------
def run_gst_pipeline(archive: bool = False):
    print("=== GST ETL ===")

    SQL_FILE = Path(__file__).resolve().parent / "GST_table.sql"
    ensure_table_exists(str(SQL_FILE))

    end_date = datetime.today().strftime("%Y-%m-%d")
    if not archive:
        last = get_last_event_date("gst_events", "start_time")
        if last:
            start_date = last.strftime("%Y-%m-%d")
            print(f"[INFO] Incremental pull from {start_date}")
        else:
            start_date = (datetime.today() - timedelta(days=90)).strftime("%Y-%m-%d")
            print(f"[INFO] No existing data — pulling 90-day window")
    else:
        start_date = (datetime.today() - timedelta(days=90)).strftime("%Y-%m-%d")
        print(f"[INFO] Archive pull: {start_date} to {end_date}")

    events = extract_gst(start_date, end_date)

    print("[LOAD] Loading into database...")
    load_gst(events)

    print("=== Done ===")
