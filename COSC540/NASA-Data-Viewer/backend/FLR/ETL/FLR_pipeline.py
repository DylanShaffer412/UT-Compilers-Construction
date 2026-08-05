
import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pathlib import Path

from .FLR_load import load_flr
from utils.utils import ensure_table_exists, get_last_event_date

load_dotenv(override=True)

#----API CONFIG---------------------------------------------------------------

API_KEY  = os.getenv("NASA_API_KEY")
BASE_URL = "https://api.nasa.gov/DONKI/FLR"

if not API_KEY:
    raise ValueError("NASA_API_KEY missing in .env")

#----EXTRACT---------------------------------------------------------------

def extract_flr(start_date: str, end_date: str) -> list[dict]:
    print(f"[EXTRACT] Fetching FLR events: {start_date} to {end_date}")

    try:
        response = requests.get(BASE_URL, params={
            "startDate": start_date,
            "endDate":   end_date,
            "api_key":   API_KEY,
        }, timeout=60)
        response.raise_for_status()
    except requests.exceptions.HTTPError:
        raise requests.exceptions.HTTPError(
            f"[EXTRACT] HTTP {response.status_code} error fetching GST data"
        ) from None

    events = response.json()
    print(f"[EXTRACT] Found {len(events)} event(s)")
    return events

#----MAIN---------------------------------------------------------------
def run_flr_pipeline(archive: bool = False):
    print("=== FLR ETL ===")

    SQL_FILE = Path(__file__).resolve().parent / "FLR_table.sql"
    ensure_table_exists(str(SQL_FILE))

    end_date = datetime.today().strftime("%Y-%m-%d")
    if not archive:
        last = get_last_event_date("FLR_TABLE", "begin_time")
        if last:
            start_date = last.strftime("%Y-%m-%d")
            print(f"[INFO] Incremental pull from {start_date}")
        else:
            start_date = (datetime.today() - timedelta(days=90)).strftime("%Y-%m-%d")
            print(f"[INFO] No existing data — pulling 90-day window")
    else:
        start_date = (datetime.today() - timedelta(days=90)).strftime("%Y-%m-%d")
        print(f"[INFO] Archive pull: {start_date} to {end_date}")

    events = extract_flr(start_date, end_date)

    print("[LOAD] Loading into database...")
    load_flr(events)

    print("=== Done ===")
