import os
import sys
import json
from datetime import datetime, timezone

import pytest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.CME.ETL.CME_transform import transform_cme, parse_dt


test_data = {
    "activityID": "2024-01-15T12:00:00-CME-001",
    "catalog": "M2M_CATALOG",
    "startTime": "2024-01-15T12:00Z",
    "sourceLocation": "N20W10",
    "activeRegionNum": 13536,
    "link": "https://example.com/cme/001",
    "note": "Fast CME",
    "instruments": [{"displayName": "LASCO C2"}],
    "cmeAnalyses": [{"speed": 1200}],
    "linkedEvents": [{"activityID": "2024-01-15T12:00:00-FLR-001"}],
}


# parse_dt

def test_parse_dt_none_returns_none():
    assert parse_dt(None) is None


def test_parse_dt_empty_string_returns_none():
    assert parse_dt("") is None


def test_parse_dt_z_suffix():
    result = parse_dt("2024-01-15T12:00Z")
    assert result == datetime(2024, 1, 15, 12, 0, tzinfo=timezone.utc)


# transform_cme

def test_event_missing_activity_id_is_skipped():
    result = transform_cme([{"catalog": "TEST", "startTime": "2024-01-15T12:00Z"}])
    assert result == []


def test_empty_input_returns_empty_list():
    assert transform_cme([]) == []


def test_valid_event_produces_one_tuple():
    result = transform_cme([test_data])
    assert len(result) == 1


def test_output_tuple_has_ten_fields():
    result = transform_cme([test_data])
    assert len(result[0]) == 10


def test_activity_id_preserved():
    result = transform_cme([test_data])
    assert result[0][0] == test_data["activityID"]


def test_instruments_json_serialized():
    result = transform_cme([test_data])
    assert result[0][7] == json.dumps(test_data["instruments"])


def test_multiple_valid_events():
    events = [dict(test_data, activityID=f"ID-{i}") for i in range(5)]
    assert len(transform_cme(events)) == 5


def test_mixed_valid_and_invalid_events():
    mixed = [
        {"catalog": "NO_ID"},
        dict(test_data, activityID="VALID-1"),
        {"note": "also no id"},
        dict(test_data, activityID="VALID-2"),
    ]
    result = transform_cme(mixed)
    assert len(result) == 2
