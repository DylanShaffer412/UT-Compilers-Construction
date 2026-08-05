
-- NeoWs table schema for PostgreSQL
-- Stores Near-Earth Object feed data from NASA NeoWs API
-- Append-friendly design for frontend consumption

-- Drop table if it exists (optional)
-- DROP TABLE IF EXISTS neo_events CASCADE;

CREATE TABLE IF NOT EXISTS neo_events (
    id                          SERIAL PRIMARY KEY,

    neo_id                      TEXT NOT NULL,
    neo_reference_id            TEXT,
    name                        TEXT,

    close_approach_date         DATE,
    close_approach_timestamp    TIMESTAMPTZ,

    orbiting_body               TEXT,
    nasa_jpl_url                TEXT,

    is_potentially_hazardous    BOOLEAN,
    absolute_magnitude_h        NUMERIC,

    estimated_diameter          JSONB,
    relative_velocity           JSONB,
    miss_distance               JSONB,

    close_approach_data         JSONB,
    raw_neo_data                JSONB,

    sent_notifications          JSONB,

    data_pulled                 TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_neo_event UNIQUE (neo_id, close_approach_date)
);

CREATE INDEX IF NOT EXISTS idx_neo_date
ON neo_events (close_approach_date);

CREATE INDEX IF NOT EXISTS idx_neo_hazardous
ON neo_events (is_potentially_hazardous);

CREATE INDEX IF NOT EXISTS idx_neo_fetch_time
ON neo_events (data_pulled);

CREATE INDEX IF NOT EXISTS idx_neo_json
ON neo_events USING GIN (close_approach_data);
