import os
import signal
import psycopg2
from pathlib import Path

PORTS = [5173, 5200, 8000]

def get_connection():
    conn_string = os.getenv("POSTGRES_CONNECTION")
    if not conn_string:
        raise EnvironmentError("Missing POSTGRES_CONNECTION in .env")
    return psycopg2.connect(conn_string)


def ensure_table_exists(sql_file: str):
    """
    Executes a SQL file to create tables if they do not exist.
    """
    conn = get_connection()
    cur = conn.cursor()

    sql_path = Path(sql_file)

    if not sql_path.exists():
        raise FileNotFoundError(f"SQL file not found: {sql_file}")

    with open(sql_path, "r") as f:
        sql = f.read()

    cur.execute(sql)
    conn.commit()

    cur.close()
    conn.close()

    print(f"Table check complete using {sql_file}")


def get_last_event_date(table: str, date_column: str):
    """
    Returns the most recent value of date_column from table as a date,
    or None if the table doesn't exist or is empty.
    """
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(f"SELECT MAX({date_column}) FROM {table}")
        result = cur.fetchone()
        cur.close()
        conn.close()
        if result and result[0]:
            val = result[0]
            return val.date() if hasattr(val, "date") else val
        return None
    except psycopg2.Error:
        return None


def load_records(table: str, columns: list[str], rows: list[tuple]):
    """
    Inserts rows into a table, skipping duplicates.

    Args:
        table:   Target table name
        columns: List of column names e.g. ["gst_id", "start_time", ...]
        rows:    List of tuples matching the column order
    """
    if not rows:
        print("No rows to insert.")
        return

    placeholders = ", ".join(["%s"] * len(columns))
    col_names    = ", ".join(columns)

    sql = f"""
        INSERT INTO {table} ({col_names})
        VALUES ({placeholders})
        ON CONFLICT DO NOTHING
    """

    conn = get_connection()
    cur  = conn.cursor()

    cur.executemany(sql, rows)
    inserted = cur.rowcount

    conn.commit()
    cur.close()
    conn.close()
    print(f"Done — {inserted} rows inserted into {table}.")



def find_sockets_on_port(port):
    hex_port = format(port, '04X')
    sockets = set()
    for proto in ('/proc/net/tcp', '/proc/net/tcp6'):
        try:
            with open(proto) as f:
                for line in f.readlines()[1:]:
                    fields = line.split()
                    if fields[1].split(':')[1] == hex_port:
                        sockets.add(fields[9])
        except FileNotFoundError:
            pass
    return sockets

def kill_processes_holding(sockets):
    for pid in os.listdir('/proc'):
        if not pid.isdigit():
            continue
        try:
            for fd in os.listdir(f'/proc/{pid}/fd'):
                if os.readlink(f'/proc/{pid}/fd/{fd}') in {f'socket:[{s}]' for s in sockets}:
                    os.kill(int(pid), signal.SIGKILL)
        except OSError:
            pass

def free_ports():
    for port in PORTS:
        sockets = find_sockets_on_port(port)
        if sockets:
            kill_processes_holding(sockets)
