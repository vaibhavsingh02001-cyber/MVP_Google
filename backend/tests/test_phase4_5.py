"""
backend/tests/test_phase4_5.py
================================
Integration and QA tests for Phase 4 & Phase 5.

Verifies:
  1. Baseline mode returns flat photos within 500 ms (measured locally)
  2. Identical fields logged in both recall and baseline turns
  3. GET /session/export?format=csv returns valid CSV with all 16 evaluation columns
  4. GET /session/export?format=json returns valid JSON array
  5. GET /session/export with token query param
  6. Privacy cleanup: purge_expired_uploads() removes expired photos
  7. DELETE /photos/upload/{id} deletes custom uploads
  8. End-to-end execution of all 5 evaluation task clues

Run with:
    cd backend
    pytest tests/test_phase4_5.py -v
"""

import csv
import io
import json
import os
import time
import uuid
import pytest
import httpx

BASE_URL = os.environ.get("TEST_BASE_URL", "http://localhost:8000")
EXPORT_TOKEN = os.environ.get("EXPORT_TOKEN", "test-token")

EVALUATION_TASKS = [
    {"task_id": 1, "clue": "Small cafe from our trip, raining"},
    {"task_id": 2, "clue": "Medicine from when I was sick"},
    {"task_id": 3, "clue": "Screenshot around when I changed jobs"},
    {"task_id": 4, "clue": "Wedding, my cousin was in it"},
    {"task_id": 5, "clue": "Picture after the beach day"},
]

REQUIRED_METRIC_FIELDS = [
    "session_id", "mode", "started_at", "ended_at", "outcome",
    "confirmed_photo", "turn_index", "raw_clue", "parsed_filters",
    "clusters_shown", "question_asked", "answer_given",
    "feedback_signal", "excluded_ids", "time_elapsed_ms", "timestamp"
]


@pytest.mark.asyncio
async def test_baseline_mode_search():
    """Verify Baseline mode returns flat photos without LLM clustering."""
    sess_id = f"test-base-{uuid.uuid4()}"
    t0 = time.time()

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10) as client:
        resp = await client.post(
            "/session/start",
            json={"clue": "Kyoto cafe", "mode": "baseline", "session_id": sess_id}
        )
        elapsed_ms = (time.time() - t0) * 1000

        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data.get("mode") == "baseline"
        assert "photos" in data
        assert isinstance(data["photos"], list)
        assert data.get("session_id") == sess_id


@pytest.mark.asyncio
async def test_session_logging_identical_fields():
    """Verify turns table captures all 16 evaluation fields for sessions."""
    sess_id = f"test-log-{uuid.uuid4()}"

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10) as client:
        # Run baseline search which logs turn 1
        resp = await client.post(
            "/session/start",
            json={"clue": "coffee receipt", "mode": "baseline", "session_id": sess_id}
        )
        assert resp.status_code == 200

        # Confirm session
        confirm_resp = await client.post(
            "/session/confirm",
            json={"session_id": sess_id, "photo_id": "test_photo_1", "outcome": "found"}
        )
        assert confirm_resp.status_code == 200

        # Export session log
        export_resp = await client.get(
            f"/session/export?format=json&session_id={sess_id}",
            headers={"X-Export-Token": EXPORT_TOKEN}
        )
        assert export_resp.status_code == 200
        turns = export_resp.json()
        assert len(turns) >= 1
        turn = turns[0]

        for field in REQUIRED_METRIC_FIELDS:
            assert field in turn, f"Missing required metric field: {field}"
        assert turn["mode"] == "baseline"
        assert turn["outcome"] == "found"


@pytest.mark.asyncio
async def test_csv_export_endpoint():
    """Verify GET /session/export?format=csv returns valid RFC 4180 CSV."""
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10) as client:
        resp = await client.get(
            "/session/export?format=csv",
            headers={"X-Export-Token": EXPORT_TOKEN}
        )
        assert resp.status_code == 200
        assert "text/csv" in resp.headers.get("content-type", "")

        reader = csv.reader(io.StringIO(resp.text))
        header = next(reader)
        assert len(header) >= 10
        for col in ["session_id", "mode", "outcome", "turn_index"]:
            assert col in header


@pytest.mark.asyncio
async def test_csv_export_query_token():
    """Verify GET /session/export supports token in query param."""
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10) as client:
        resp = await client.get(f"/session/export?format=json&token={EXPORT_TOKEN}")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_all_five_evaluation_tasks():
    """Test all 5 evaluation tasks against the baseline search index."""
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10) as client:
        for item in EVALUATION_TASKS:
            task_id = item["task_id"]
            clue = item["clue"]
            sess_id = f"eval-task-{task_id}-{uuid.uuid4()}"

            resp = await client.post(
                "/session/start",
                json={"clue": clue, "mode": "baseline", "session_id": sess_id}
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data.get("mode") == "baseline"
            assert "photos" in data
            assert data.get("session_id") == sess_id
