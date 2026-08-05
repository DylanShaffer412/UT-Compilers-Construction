import os
import sys
from datetime import date

import psycopg2

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.api import get_lunar_phase_today


def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )


def run_test():
    today = date.today()

    conn = get_connection()
    cur = conn.cursor()

    try:
        print("[TEST] Cleaning existing rows...")
        cur.execute("DELETE FROM LUNAR_PHASES WHERE date = %s", (today,))
        conn.commit()

        print("[TEST] Inserting test row...")
        cur.execute(
            """
            INSERT INTO LUNAR_PHASES (date, phase)
            VALUES (%s, %s)
            """,
            (today, "Full Moon"),
        )
        conn.commit()

        print("[TEST] Calling backend function directly...")
        result = get_lunar_phase_today()

        if "rows" not in result:
            print("[FAIL] Missing 'rows' in response")
            return 1

        if len(result["rows"]) == 0:
            print("[FAIL] No rows returned")
            return 1

        phases = [row["phase"] for row in result["rows"]]

        if "Full Moon" not in phases:
            print("[FAIL] Expected 'Full Moon' not found")
            return 1

        print("[PASS] Lunar phase integration test passed")
        return 0

    except Exception as e:
        print(f"[ERROR] {e}")
        return 1

    finally:
        print("[TEST] Cleaning up...")
        cur.execute("DELETE FROM LUNAR_PHASES WHERE date = %s", (today,))
        conn.commit()
        cur.close()
        conn.close()


if __name__ == "__main__":
    raise SystemExit(run_test())