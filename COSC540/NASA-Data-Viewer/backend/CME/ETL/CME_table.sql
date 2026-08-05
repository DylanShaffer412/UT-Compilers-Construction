CREATE TABLE IF NOT EXISTS cme_events (
    id                  SERIAL PRIMARY KEY,
    activity_id         TEXT UNIQUE,
    catalog             TEXT,
    start_time          TIMESTAMPTZ,
    source_location     TEXT,
    active_region_num   INTEGER,
    link                TEXT,
    note                TEXT,
    instruments         JSONB,
    cme_analyses        JSONB,
    linked_events       JSONB,
    fetched_at          TIMESTAMPTZ DEFAULT NOW()
);