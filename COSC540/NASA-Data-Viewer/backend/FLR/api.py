import os
import psycopg2
import psycopg2.extras
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv(override=True)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_methods=["GET"],
    allow_headers=["*"],
)

def get_connection():
    conn_string = os.getenv("POSTGRES_CONNECTION")
    if not conn_string:
        raise EnvironmentError("Missing POSTGRES_CONNECTION in .env")
    return psycopg2.connect(conn_string)

@app.get("/api/flr")
def get_flr_events():
    conn = get_connection()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM FLR_TABLE ORDER BY begin_time DESC")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows