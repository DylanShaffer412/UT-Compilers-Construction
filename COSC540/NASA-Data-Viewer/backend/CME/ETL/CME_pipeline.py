import os
import requests
from datetime import datetime, timedelta
from pathlib import Path

from .CME_load import load_cme
from utils.utils import ensure_table_exists, get_last_event_date

API_KEY  = os.getenv("NASA_API_KEY")
BASE_URL = "https://api.nasa.gov/DONKI/CME"

if not API_KEY:
    raise ValueError("NASA_API_KEY missing in .env")


def extract_cme(start_date: str, end_date: str) -> list[dict]:
    print(f"[EXTRACT] Fetching CME events: {start_date} to {end_date}")

    try:
        response = requests.get(
            BASE_URL,
            params={
                "startDate": start_date,
                "endDate": end_date,
                "api_key": API_KEY,
            },
            timeout=60,
        )
        response.raise_for_status()
    except requests.exceptions.HTTPError:
        raise requests.exceptions.HTTPError(
            f"[EXTRACT] HTTP {response.status_code} error fetching CME data"
        ) from None

    events = response.json()
    print(f"[EXTRACT] Found {len(events)} event(s)")
    return events


def run_cme_pipeline(archive: bool = False):
    print("=== CME ETL ===")

    SQL_FILE = Path(__file__).resolve().parent / "CME_table.sql"
    ensure_table_exists(str(SQL_FILE))

    end_date = datetime.today().strftime("%Y-%m-%d")
    if not archive:
        last = get_last_event_date("cme_events", "start_time")
        if last:
            start_date = last.strftime("%Y-%m-%d")
            print(f"[INFO] Incremental pull from {start_date}")
        else:
            start_date = (datetime.today() - timedelta(days=90)).strftime("%Y-%m-%d")
            print(f"[INFO] No existing data — pulling 90-day window")
    else:
        start_date = (datetime.today() - timedelta(days=90)).strftime("%Y-%m-%d")
        print(f"[INFO] Archive pull: {start_date} to {end_date}")

    events = extract_cme(start_date, end_date)

    print("[LOAD] Loading into database...")
    load_cme(events)

    print("=== Done ===")
    