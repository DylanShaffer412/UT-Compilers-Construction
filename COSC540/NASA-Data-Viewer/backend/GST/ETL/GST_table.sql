CREATE TABLE IF NOT EXISTS gst_events (
    id                  SERIAL PRIMARY KEY,
    gst_id              TEXT UNIQUE,
    start_time          TIMESTAMPTZ,
    link                TEXT,
    submission_time     TIMESTAMPTZ,
    version_id          INTEGER,
    kp_index            JSONB,
    linked_events       JSONB,
    sent_notifications  JSONB,
    fetched_at          TIMESTAMPTZ DEFAULT NOW()
);