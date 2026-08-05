CREATE TABLE IF NOT EXISTS FLR_TABLE (
    id                  SERIAL PRIMARY KEY,
    flr_id              VARCHAR(255) NOT NULL UNIQUE,  -- UNIQUE required for ON CONFLICT
    catalog             VARCHAR(255) NOT NULL,
    instruments         JSONB NOT NULL,
    begin_time          TIMESTAMPTZ NOT NULL,
    peak_time           TIMESTAMPTZ,
    end_time            TIMESTAMPTZ,
    class_type          VARCHAR(255) NOT NULL,
    source_location     VARCHAR(255),
    active_region_num   INTEGER,
    note                TEXT,
    submission_time     TIMESTAMPTZ NOT NULL,
    version_id          INTEGER NOT NULL,
    link                TEXT NOT NULL,
    linked_events       JSONB,
    sent_notifications  JSONB,
    last_updated        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Below is example API pull from NASA's website
/*
  {
    "flrID": "2016-01-01T23:10:00-FLR-001",
    "catalog": "M2M_CATALOG",
    "instruments": [
      {
        "displayName": "GOES-P: EXIS 1.0-8.0"
      }
    ],
    "beginTime": "2016-01-01T23:10Z",
    "peakTime": "2016-01-02T00:11Z",
    "endTime": "2016-01-02T01:01Z",
    "classType": "M2.3",
    "sourceLocation": "S21W73",
    "activeRegionNum": 12473,
    "note": "Associated eruption visible in SDO AIA 171. 193, and 304 with opening field lines and filament liftoff.",
    "submissionTime": "2025-09-09T19:05Z",
    "versionId": 5,
    "link": "https://webtools.ccmc.gsfc.nasa.gov/DONKI/view/FLR/9963/-1",
    "linkedEvents": [
      {
        "activityID": "2016-01-01T23:12:00-CME-001"
      },
      {
        "activityID": "2016-01-02T02:48:00-SEP-001"
      },
      {
        "activityID": "2016-01-02T04:30:00-SEP-001"
      }
    ],
    "sentNotifications": null
  },
  {
    "flrID": "2016-01-28T11:48:00-FLR-001",
    "catalog": "M2M_CATALOG",
    "instruments": [
      {
        "displayName": "GOES15: SEM/XRS 1.0-8.0"
      }
    ],
    "beginTime": "2016-01-28T11:48Z",
    "peakTime": "2016-01-28T12:02Z",
    "endTime": "2016-01-28T12:56Z",
    "classType": "C9.6",
    "sourceLocation": "N03W47",
    "activeRegionNum": 12488,
    "note": "",
    "submissionTime": "2016-01-28T22:31Z",
    "versionId": 1,
    "link": "https://webtools.ccmc.gsfc.nasa.gov/DONKI/view/FLR/10122/-1",
    "linkedEvents": [
      {
        "activityID": "2016-01-28T12:24:00-CME-001"
      }
    ],
    "sentNotifications": null
  }
*/