
CREATE TABLE IF NOT EXISTS neo_events (
    id                      SERIAL PRIMARY KEY,

    neo_id                  TEXT UNIQUE,
    neo_reference_id        TEXT,
    name                    TEXT,

    close_approach_date     DATE,
    close_approach_time     TIMESTAMPTZ,

    orbiting_body           TEXT,
    nasa_jpl_url            TEXT,

    is_potentially_hazardous BOOLEAN,
    absolute_magnitude_h    DOUBLE PRECISION,

    estimated_diameter      JSONB,
    relative_velocity       JSONB,
    miss_distance           JSONB,

    close_approach_data     JSONB,

    sent_notifications      JSONB,

    fetched_at              TIMESTAMPTZ DEFAULT NOW()
);
