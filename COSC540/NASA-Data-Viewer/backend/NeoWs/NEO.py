import json
import os
import time
from datetime import date, datetime, timedelta, timezone

import psycopg2
import requests
from dotenv import load_dotenv
from psycopg2.extras import execute_batch


# ---- CONFIG -----------------------------------------------------------------

load_dotenv()

API_KEY = os.getenv("NASA_API_KEY")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

BASE_URL   = "https://api.nasa.gov/neo/rest/v1/feed"
DETAIL_URL = "https://api.nasa.gov/neo/rest/v1/neo/{neo_id}"

if not API_KEY:
    raise ValueError("NASA_API_KEY missing in environment variables.")

required_db_vars = {
    "DB_HOST": DB_HOST,
    "DB_PORT": DB_PORT,
    "DB_NAME": DB_NAME,
    "DB_USER": DB_USER,
    "DB_PASSWORD": DB_PASSWORD,
}
missing = [key for key, value in required_db_vars.items() if not value]
if missing:
    raise ValueError(f"Missing required DB environment variables: {', '.join(missing)}")


# ---- HELPERS ----------------------------------------------------------------

def parse_close_approach_timestamp(value: str | None):
    """
    NeoWs may return:
      - close_approach_date_full like '2026-Mar-14 12:34'
      - or just close_approach_date like '2026-03-14'

    Return a timezone-aware datetime when possible, otherwise None.
    """
    if not value:
        return None

    value = value.strip()

    formats = [
        "%Y-%b-%d %H:%M",  # 2026-Mar-14 12:34
        "%Y-%m-%d",        # 2026-03-14
    ]

    for fmt in formats:
        try:
            dt = datetime.strptime(value, fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue

    return None


def safe_float(value):
    """Convert string/number to float, else None."""
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


# ---- EXTRACT ----------------------------------------------------------------

def get_neows_feed(start_date: str, end_date: str, api_key: str) -> dict | None:
    """
    Retrieve NeoWs asteroid feed for a date range.
    """
    params = {
        "start_date": start_date,
        "end_date": end_date,
        "api_key": api_key,
    }

    try:
        response = requests.get(BASE_URL, params=params, timeout=60)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as exc:
        print(f"[EXTRACT] Request failed: {exc}")
        return None


# ---- ORBITAL ELEMENTS -------------------------------------------------------

def get_neo_orbital_elements(neo_id: str, api_key: str) -> dict:
    """
    Fetch orbital elements for a single NEO from the detail endpoint.
    Returns a dict with inclination, ascending_node_longitude, etc.
    Returns {} on failure so callers can handle missing data gracefully.
    """
    try:
        url = DETAIL_URL.format(neo_id=neo_id)
        response = requests.get(url, params={"api_key": api_key}, timeout=15)
        response.raise_for_status()
        orbital = response.json().get("orbital_data", {})
        return {
            "inclination":              orbital.get("inclination"),
            "ascending_node_longitude": orbital.get("ascending_node_longitude"),
            "perihelion_argument":      orbital.get("perihelion_argument"),
            "eccentricity":             orbital.get("eccentricity"),
            "semi_major_axis":          orbital.get("semi_major_axis"),
            "orbit_class":              orbital.get("orbit_class", {}).get("orbit_class_type"),
        }
    except requests.exceptions.RequestException as exc:
        print(f"[ORBITAL] Failed for NEO {neo_id}: {exc}")
        return {}


# ---- TRANSFORM ---------------------------------------------------------------

def flatten_neows_feed(feed_data: dict, orbital_by_id: dict | None = None) -> list[tuple]:
    """
    Flatten NeoWs feed into rows for neo_events.
    orbital_by_id maps neo_id -> orbital elements dict fetched from the detail endpoint.
    One row per close-approach record.
    """
    if orbital_by_id is None:
        orbital_by_id = {}

    rows = []

    neo_dict = feed_data.get("near_earth_objects", {})

    for approach_date, asteroids in neo_dict.items():
        for asteroid in asteroids:
            neo_id = asteroid.get("id")
            neo_reference_id = asteroid.get("neo_reference_id")
            name = asteroid.get("name")
            nasa_jpl_url = asteroid.get("nasa_jpl_url")
            is_potentially_hazardous = asteroid.get("is_potentially_hazardous_asteroid", False)
            absolute_magnitude_h = safe_float(asteroid.get("absolute_magnitude_h"))

            estimated_diameter = json.dumps(asteroid.get("estimated_diameter", {}))
            all_close_approach_data = asteroid.get("close_approach_data", [])

            orbital_data = json.dumps(orbital_by_id.get(neo_id, {}))

            if not all_close_approach_data:
                rows.append(
                    (
                        neo_id,
                        neo_reference_id,
                        name,
                        approach_date,
                        None,  # close_approach_time
                        None,  # orbiting_body
                        nasa_jpl_url,
                        is_potentially_hazardous,
                        absolute_magnitude_h,
                        estimated_diameter,
                        json.dumps({}),   # relative_velocity
                        json.dumps({}),   # miss_distance
                        json.dumps([]),   # close_approach_data
                        json.dumps([]),   # sent_notifications
                        orbital_data,
                    )
                )
                continue

            for cad in all_close_approach_data:
                close_approach_raw = (
                    cad.get("close_approach_date_full")
                    or cad.get("close_approach_date")
                )
                close_approach_time = parse_close_approach_timestamp(close_approach_raw)

                orbiting_body = cad.get("orbiting_body")
                relative_velocity = json.dumps(cad.get("relative_velocity", {}))
                miss_distance = json.dumps(cad.get("miss_distance", {}))

                rows.append(
                    (
                        neo_id,
                        neo_reference_id,
                        name,
                        approach_date,
                        close_approach_time,
                        orbiting_body,
                        nasa_jpl_url,
                        is_potentially_hazardous,
                        absolute_magnitude_h,
                        estimated_diameter,
                        relative_velocity,
                        miss_distance,
                        json.dumps(all_close_approach_data),
                        json.dumps([]),
                        orbital_data,
                    )
                )

    return rows


# ---- LOAD -------------------------------------------------------------------

def ensure_neo_events_table(cursor):
    """
    Create neo_events if it does not exist.
    Uses a composite unique constraint so multiple asteroid events can be stored
    across dates/times without duplicate inserts on repeat pulls.
    """
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS neo_events (
            id SERIAL PRIMARY KEY,
            neo_id TEXT NOT NULL,
            neo_reference_id TEXT,
            name TEXT,
            close_approach_date DATE,
            close_approach_time TIMESTAMPTZ,
            orbiting_body TEXT,
            nasa_jpl_url TEXT,
            is_potentially_hazardous BOOLEAN,
            absolute_magnitude_h DOUBLE PRECISION,
            estimated_diameter JSONB,
            relative_velocity JSONB,
            miss_distance JSONB,
            close_approach_data JSONB,
            sent_notifications JSONB,
            fetched_at TIMESTAMPTZ DEFAULT NOW(),
            orbital_data JSONB,
            CONSTRAINT uq_neo_events_event
                UNIQUE (neo_id, close_approach_date, close_approach_time, orbiting_body)
        );
        """
    )

    cursor.execute(
        """
        ALTER TABLE neo_events ADD COLUMN IF NOT EXISTS orbital_data JSONB;
        """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_neo_events_date
        ON neo_events (close_approach_date);
        """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_neo_events_hazardous
        ON neo_events (is_potentially_hazardous);
        """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_neo_events_fetched_at
        ON neo_events (fetched_at);
        """
    )


def insert_neo_rows(cursor, rows: list[tuple]):
    """
    Append rows while preventing duplicates on repeated pulls.
    """
    insert_sql = """
        INSERT INTO neo_events (
            neo_id,
            neo_reference_id,
            name,
            close_approach_date,
            close_approach_time,
            orbiting_body,
            nasa_jpl_url,
            is_potentially_hazardous,
            absolute_magnitude_h,
            estimated_diameter,
            relative_velocity,
            miss_distance,
            close_approach_data,
            sent_notifications,
            orbital_data
        )
        VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb
        )
        ON CONFLICT (neo_id, close_approach_date, close_approach_time, orbiting_body)
        DO UPDATE SET orbital_data = EXCLUDED.orbital_data;
    """
    execute_batch(cursor, insert_sql, rows, page_size=100)


# ---- MAIN -------------------------------------------------------------------

def main():
    print("=== NEO ETL ===")

    # NASA NeoWs feed allows max 7 days per request; batch across the window
    TOTAL_DAYS = 21
    CHUNK_DAYS = 7

    window_start = date.today()
    window_end   = window_start + timedelta(days=TOTAL_DAYS)

    # Pass 1: collect all feed data and unique NEO IDs
    all_feeds   = []
    unique_ids  = set()
    chunk_start = window_start
    while chunk_start < window_end:
        chunk_end = min(chunk_start + timedelta(days=CHUNK_DAYS - 1), window_end)
        print(f"[EXTRACT] Fetching feed: {chunk_start} to {chunk_end}")
        feed_data = get_neows_feed(
            start_date=chunk_start.isoformat(),
            end_date=chunk_end.isoformat(),
            api_key=API_KEY,
        )
        if feed_data:
            all_feeds.append(feed_data)
            for asteroids in feed_data.get("near_earth_objects", {}).values():
                for asteroid in asteroids:
                    if asteroid.get("id"):
                        unique_ids.add(asteroid["id"])
        else:
            print(f"[EXTRACT] No data for chunk {chunk_start} – {chunk_end}")
        chunk_start = chunk_end + timedelta(days=1)

    # Pass 2: fetch orbital elements only for NEOs not already cached in DB
    cached_orbital = {}
    try:
        conn_check = psycopg2.connect(
            dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD,
            host=DB_HOST, port=DB_PORT,
        )
        cur_check = conn_check.cursor()
        cur_check.execute(
            "SELECT neo_id, orbital_data FROM neo_events "
            "WHERE neo_id = ANY(%s) AND orbital_data IS NOT NULL AND orbital_data != '{}'::jsonb",
            (list(unique_ids),),
        )
        for neo_id, orbital_data in cur_check.fetchall():
            cached_orbital[neo_id] = orbital_data
        cur_check.close()
        conn_check.close()
    except psycopg2.Error:
        pass  # table may not exist yet on first run

    new_ids = unique_ids - set(cached_orbital)
    print(f"[ORBITAL] {len(cached_orbital)} cached, fetching {len(new_ids)} new...")
    orbital_by_id = dict(cached_orbital)
    for neo_id in new_ids:
        orbital_by_id[neo_id] = get_neo_orbital_elements(neo_id, API_KEY)
        time.sleep(0.12)  # stay well under NASA rate limit

    # Pass 3: build rows
    rows = []
    for feed_data in all_feeds:
        rows.extend(flatten_neows_feed(feed_data, orbital_by_id))

    if not rows:
        print("[TRANSFORM] No asteroid rows found in response.")
        return

    conn = None
    cursor = None

    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT,
        )
        cursor = conn.cursor()
        print("[DB] Connected.")

        ensure_neo_events_table(cursor)

        print(f"[LOAD] Loading {len(rows)} row(s) into neo_events...")
        insert_neo_rows(cursor, rows)

        conn.commit()
        print("[LOAD] Done.")

    except psycopg2.Error as exc:
        if conn:
            conn.rollback()
        print(f"[DB] ERROR {exc.pgcode} | {exc.pgerror}")
        raise

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            print("[DB] Connection closed.")

    print("=== Done ===")


if __name__ == "__main__":
    main()