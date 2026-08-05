
import requests
import json
import psycopg2
from dotenv import load_dotenv, find_dotenv
import os
from datetime import date
from pathlib import Path

load_dotenv(find_dotenv())

def get_solar_eclipse_data(year):
    url = f"https://aa.usno.navy.mil/api/eclipses/solar/year?year={year}"
    try:
        resp = requests.get(url, timeout=10)
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return None

    if resp.status_code == 200:
        data = resp.json()
        return data
    
    print(f"ERROR: {resp.status_code}")
    return None


# This API call only gives the primary phases
# if we want secondary phases we need to calculate that manually
def get_moon_phases(year):
    url = f"https://aa.usno.navy.mil/api/moon/phases/year?year={year}"
    try:
        resp = requests.get(url, timeout=10)
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return None

    if resp.status_code == 200:
        data = resp.json()
        return data
    
    print(f"ERROR: {resp.status_code}")
    return None


def run_aai_pipeline(): 
    # START OF MAIN OPERATIONS #
    current_year = date.today().year
    solar_eclipse_data = get_solar_eclipse_data(current_year)
    moon_phases = get_moon_phases(current_year)

    # clean the data
    solar_eclipse_data = solar_eclipse_data['eclipses_in_year']
    moon_phases = moon_phases['phasedata']

    # connect to the DB
    HOST = os.getenv('DB_HOST')
    PORT = os.getenv('DB_PORT')
    DB = os.getenv('DB_NAME')
    USER = os.getenv('DB_USER')
    PSWD = os.getenv('DB_PASSWORD')

    #done to prevent an error on a failure in the try loop
    connected = None
    cursor = None

    try:
        connected = psycopg2.connect(dbname=DB, user=USER, password=PSWD, host=HOST, port=PORT)
        cursor = connected.cursor()
        
        
        # ECLIPSE TABLE #

        # should be fine to just remake the table each time, as this will not be run often (1/yr expected)
        cursor.execute("DROP TABLE IF EXISTS SOLAR_ECLIPSES;")
        cursor.execute("""
            CREATE TABLE SOLAR_ECLIPSES (
                date DATE PRIMARY KEY,
                event TEXT NOT NULL
            );
        """)

        for eclipse in solar_eclipse_data:
            cursor.execute(f"INSERT INTO SOLAR_ECLIPSES VALUES ('{eclipse['year']}-{eclipse['month']:02d}-{eclipse['day']:02d}', '{eclipse['event']}')")

        # LUNAR TABLE #
        cursor.execute("DROP TABLE IF EXISTS LUNAR_PHASES;")
        cursor.execute("""
            CREATE TABLE LUNAR_PHASES (
                date DATE PRIMARY KEY,
                phase TEXT NOT NULL
            );
        """)

        for phase in moon_phases:
            cursor.execute(f"INSERT INTO LUNAR_PHASES VALUES ('{phase['year']}-{phase['month']:02d}-{phase['day']:02d}', '{phase['phase']}')")

        connected.commit()

    except psycopg2.Error as e:
        print(f"ERROR {e.pgcode} | {e.pgerror}")
        if connected:
            connected.rollback()

    finally:
        if cursor:
            cursor.close()
        if connected:
            connected.close()
