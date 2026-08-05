import math
import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
import os
from dotenv import load_dotenv, find_dotenv
from datetime import date, datetime
from pathlib import Path

load_dotenv(find_dotenv())

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )

def make_json_safe(value):
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value

# Mean longitude coefficients from Meeus 'Astronomical Algorithms' Table 31.a
# Each entry: (L0 degrees, L1 degrees per Julian century)
_MEAN_LONGITUDE_COEFFICIENTS = {
    'Mercury': (252.250906, 149474.0722491),
    'Venus':   (181.979801,  58519.2130302),
    'Earth':   (100.466457,  36000.7698278),
    'Mars':    (355.433275,  19141.6964746),
    'Jupiter': ( 34.351519,   3034.9056606),
    'Saturn':  ( 50.077444,   1222.1138488),
    'Uranus':  (314.055005,    429.8640561),
    'Neptune': (304.348665,    219.8833092),
}

@app.get("/api/ephemeris")
def get_ephemeris():
    now  = datetime.now(datetime.timezone.utc)
    j2000 = datetime(2000, 1, 1, 12, 0, 0, tzinfo=datetime.timezone.utc)
    T    = (now - j2000).total_seconds() / 86400.0 / 36525.0
    return {
        name: math.radians((L0 + L1 * T) % 360.0)
        for name, (L0, L1) in _MEAN_LONGITUDE_COEFFICIENTS.items()
    }

@app.get("/api/flr")
def get_flr():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM flr_table ORDER BY begin_time DESC LIMIT 50")
    columns = [desc[0] for desc in cursor.description]
    results = [
        {columns[i]: make_json_safe(row[i]) for i in range(len(columns))}
        for row in cursor.fetchall()
    ]
    cursor.close()
    conn.close()
    return results

@app.get("/api/cme")
def get_cme():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cme_events ORDER BY start_time DESC LIMIT 50")
    columns = [desc[0] for desc in cursor.description]
    results = [
        {columns[i]: make_json_safe(row[i]) for i in range(len(columns))}
        for row in cursor.fetchall()
    ]
    cursor.close()
    conn.close()
    return results

@app.get("/api/gst")
def get_gst():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM gst_events ORDER BY start_time DESC LIMIT 50")
    columns = [desc[0] for desc in cursor.description]
    results = [
        {columns[i]: make_json_safe(row[i]) for i in range(len(columns))}
        for row in cursor.fetchall()
    ]
    cursor.close()
    conn.close()
    return results

@app.get("/api/neows/forecast")
@app.get("/api/neows/upcoming")
def get_neows():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM neo_events
        ORDER BY close_approach_date ASC
        LIMIT 200
    """)
    columns = [desc[0] for desc in cursor.description]
    results = [
        {columns[i]: make_json_safe(row[i]) for i in range(len(columns))}
        for row in cursor.fetchall()
    ]
    cursor.close()
    conn.close()
    return {"rows": results}

## TODO (FOR ALL DAILY API ENDPOINTS)           ##
## set queries to use the user's local timezone ##

@app.get("/api/lunar-phase/today")
def get_lunar_phase_today():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM LUNAR_PHASES WHERE date = CURRENT_DATE")
    columns = [desc[0] for desc in cursor.description]
    results = [
        {columns[i]: make_json_safe(row[i]) for i in range(len(columns))}
        for row in cursor.fetchall()
    ]
    cursor.close()
    conn.close()
    return {"rows": results}

@app.get("/api/solar-eclipses/today")
def get_solar_eclipse_today():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM solar_eclipses WHERE date = CURRENT_DATE")
    columns = [desc[0] for desc in cursor.description]
    results = [
        {columns[i]: make_json_safe(row[i]) for i in range(len(columns))}
        for row in cursor.fetchall()
    ]
    cursor.close()
    conn.close()
    return {"rows": results}

@app.get("/api/cme-events/today")
def get_cme_events_today(date: str = None):
    target = date or str(datetime.now().date())
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cme_events WHERE start_time::date = %s", (target,))
    columns = [desc[0] for desc in cursor.description]
    results = [
        {columns[i]: make_json_safe(row[i]) for i in range(len(columns))}
        for row in cursor.fetchall()
    ]
    cursor.close()
    conn.close()
    return {"rows": results}

@app.get("/api/solar-flares/today")
def get_solar_flares_today(date: str = None):
    target = date or str(datetime.now().date())
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM FLR_TABLE WHERE begin_time::date = %s", (target,))
    columns = [desc[0] for desc in cursor.description]
    results = [
        {columns[i]: make_json_safe(row[i]) for i in range(len(columns))}
        for row in cursor.fetchall()
    ]
    cursor.close()
    conn.close()
    return {"rows": results}

@app.get("/api/geomagnetic-storms/today")
def get_geomagnetic_storms_today(date: str = None):
    target = date or str(datetime.now().date())
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM gst_events WHERE start_time::date = %s", (target,))
    columns = [desc[0] for desc in cursor.description]
    results = [
        {columns[i]: make_json_safe(row[i]) for i in range(len(columns))}
        for row in cursor.fetchall()
    ]
    cursor.close()
    conn.close()
    return {"rows": results}

@app.get("/api/near-earth-objects/today")
def get_near_earth_objects_today(date: str = None):
    target = date or str(datetime.now().date())
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM neo_events WHERE close_approach_date::date = %s", (target,))
    columns = [desc[0] for desc in cursor.description]
    results = [
        {columns[i]: make_json_safe(row[i]) for i in range(len(columns))}
        for row in cursor.fetchall()
    ]
    cursor.close()
    conn.close()
    return {"rows": results}

@app.get("/api/flr/latest")
def get_latest_flr():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT flr_id, class_type, begin_time, peak_time, source_location, link
        FROM flr_table
        ORDER BY begin_time DESC
        LIMIT 1
    """)
    row = cursor.fetchone()
    columns = [desc[0] for desc in cursor.description] if row else []
    cursor.close()
    conn.close()
    if not row:
        return {"rows": []}
    return {"rows": [{columns[i]: make_json_safe(row[i]) for i in range(len(columns))}]}


@app.get("/api/gst/latest")
def get_latest_gst():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT gst_id, start_time, kp_index, link
        FROM gst_events
        ORDER BY start_time DESC
        LIMIT 1
    """)
    row = cursor.fetchone()
    columns = [desc[0] for desc in cursor.description] if row else []
    cursor.close()
    conn.close()
    if not row:
        return {"rows": []}
    return {"rows": [{columns[i]: make_json_safe(row[i]) for i in range(len(columns))}]}

@app.get("/api/cme-events/week")
def get_cme_events_week():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cme_events WHERE start_time::date >= CURRENT_DATE - INTERVAL '7 days'")
    columns = [desc[0] for desc in cursor.description]
    results = [
        {columns[i]: make_json_safe(row[i]) for i in range(len(columns))}
        for row in cursor.fetchall()
    ]
    cursor.close()
    conn.close()
    return {"rows": results}

@app.get("/api/neo-events/week")
def get_neo_events_week():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM neo_events WHERE close_approach_date::date >= CURRENT_DATE - INTERVAL '7 days' ORDER BY close_approach_date DESC")
    columns = [desc[0] for desc in cursor.description]
    results = [
        {columns[i]: make_json_safe(row[i]) for i in range(len(columns))}
        for row in cursor.fetchall()
    ]
    cursor.close()
    conn.close()
    return {"rows": results}

@app.get("/api/solar-flares/week")
def get_solar_flares_week():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM FLR_TABLE WHERE begin_time::date >= CURRENT_DATE - INTERVAL '7 days'")
    columns = [desc[0] for desc in cursor.description]
    results = [
        {columns[i]: make_json_safe(row[i]) for i in range(len(columns))}
        for row in cursor.fetchall()
    ]
    cursor.close()
    conn.close()
    return {"rows": results}

@app.get("/api/geomagnetic-storms/week")
def get_geomagnetic_storms_week():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM gst_events WHERE start_time::date >= CURRENT_DATE - INTERVAL '7 days'")
    columns = [desc[0] for desc in cursor.description]
    results = [
        {columns[i]: make_json_safe(row[i]) for i in range(len(columns))}
        for row in cursor.fetchall()
    ]
    cursor.close()
    conn.close()
    return {"rows": results}

@app.get("/api/solar-flares")
def get_all_solar_flares():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM FLR_TABLE ORDER BY begin_time DESC")
    columns = [desc[0] for desc in cursor.description]
    results = [
        {columns[i]: make_json_safe(row[i]) for i in range(len(columns))}
        for row in cursor.fetchall()
    ]
    cursor.close()
    conn.close()
    return {"rows": results}

@app.get("/api/cme-events")
def get_all_cme_events():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cme_events ORDER BY start_time DESC")
    columns = [desc[0] for desc in cursor.description]
    results = [
        {columns[i]: make_json_safe(row[i]) for i in range(len(columns))}
        for row in cursor.fetchall()
    ]
    cursor.close()
    conn.close()
    return {"rows": results}

@app.get("/api/gst-events")
def get_all_gst_events():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM gst_events ORDER BY start_time DESC")
    columns = [desc[0] for desc in cursor.description]
    results = [
        {columns[i]: make_json_safe(row[i]) for i in range(len(columns))}
        for row in cursor.fetchall()
    ]
    cursor.close()
    conn.close()
    return {"rows": results}

@app.get("/api/neo-events")
def get_all_neo_events():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM neo_events ORDER BY close_approach_date DESC")
    columns = [desc[0] for desc in cursor.description]
    results = [
        {columns[i]: make_json_safe(row[i]) for i in range(len(columns))}
        for row in cursor.fetchall()
    ]
    cursor.close()
    conn.close()
    return {"rows": results}