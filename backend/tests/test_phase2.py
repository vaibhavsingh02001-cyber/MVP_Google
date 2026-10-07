"""
backend/tests/test_phase2.py
==============================
Phase 2 integration tests.

Run with:
    cd backend
    pip install pytest httpx pytest-asyncio
    pytest tests/test_phase2.py -v

Tests verify:
  1. GET /health — returns db_photos and chroma_vectors
  2. POST /session/start (recall mode) — SSE stream, clusters have name/photo_ids/match_reason
  3. POST /session/start (baseline mode) — flat photo list
  4. POST /session/feedback (not_this) — returns updated clusters
  5. POST /session/confirm — closes session with outcome=found
  6. POST /session/anchor — resolves time window
  7. GET /photos/{id} — returns photo metadata
  8. GET /photos/invalid_id — 400 error
  9. GET /session/export — returns JSON list
  10. POST /session/start — latency under 8s (relaxed for CI)

Uses httpx.AsyncClient against a live server started in the test.
Requires ANTHROPIC_API_KEY in environment (or a populated metadata.db).
"""

import json
import os
import asyncio
import pytest
import httpx

BASE_URL = os.environ.get("TEST_BASE_URL", "http://localhost:8000")
EXPORT_TOKEN = os.environ.get("EXPORT_TOKEN", "test-token")


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

async def collect_sse(client: httpx.AsyncClient, url: str, body: dict) -> list[dict]:
    """POST to an SSE endpoint and collect all events into a list."""
    events = []
    async with client.stream("POST", url, json=body, timeout=30) as resp:
        resp.raise_for_status()
        async for line in resp.aiter_lines():
            line = line.strip()
            if line.startswith("data:"):
                data = line[5:].strip()
                if data:
                    try:
                        events.append(json.loads(data))
                    except json.JSONDecodeError:
                        pass
    return events


# ─────────────────────────────────────────────────────────────────────────────
# Tests
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health():
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        r = await client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "db_photos" in body
    assert "chroma_vectors" in body
    print(f"\n  db_photos={body['db_photos']}, chroma_vectors={body['chroma_vectors']}")


@pytest.mark.asyncio
async def test_baseline_search():
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        r = await client.post("/session/start", json={
            "clue": "beach sunset",
            "mode": "baseline",
        })
    assert r.status_code == 200
    body = r.json()
    assert body["mode"] == "baseline"
    assert "photos" in body
    assert "session_id" in body
    print(f"\n  baseline returned {body['count']} photos")


@pytest.mark.asyncio
async def test_recall_sse_stream():
    """Recall mode should stream cluster and question events."""
    session_id = "test-session-001"
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        import time
        t0 = time.time()
        events = await collect_sse(client, "/session/start", {
            "clue":       "small cafe, it was raining",
            "mode":       "recall",
            "session_id": session_id,
        })
        elapsed = time.time() - t0

    cluster_events = [e for e in events if e.get("type") == "cluster"]
    done_events    = [e for e in events if e.get("type") == "done"]
    error_events   = [e for e in events if e.get("type") == "error"]

    assert not error_events, f"Agent returned errors: {error_events}"
    assert len(cluster_events) >= 1, "Expected at least 1 cluster"
    assert len(done_events) == 1

    # Validate cluster structure
    for ce in cluster_events:
        cluster = ce["cluster"]
        assert "name" in cluster,         "Cluster missing 'name'"
        assert "photo_ids" in cluster,    "Cluster missing 'photo_ids'"
        assert "match_reason" in cluster, "Cluster missing 'match_reason'"
        assert len(cluster["name"]) <= 80, "Cluster name too long"

    print(f"\n  {len(cluster_events)} clusters, elapsed={elapsed:.1f}s")
    # Latency: relaxed to 8s for CI (3s target in production with warm cache)
    assert elapsed < 8.0, f"Response too slow: {elapsed:.1f}s"


@pytest.mark.asyncio
async def test_feedback_not_this():
    session_id = "test-session-002"
    # First start a session
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        events = await collect_sse(client, "/session/start", {
            "clue":       "wedding decoration hall",
            "mode":       "recall",
            "session_id": session_id,
        })
        cluster_events = [e for e in events if e.get("type") == "cluster"]
        first_ids = []
        if cluster_events:
            first_ids = cluster_events[0]["cluster"].get("photo_ids", [])[:3]

        # Send feedback
        r = await client.post("/session/feedback", json={
            "session_id":   session_id,
            "feedback":     "not_this",
            "excluded_ids": first_ids,
        })
    assert r.status_code == 200
    body = r.json()
    assert "clusters" in body
    # Excluded IDs should not appear in new clusters
    all_new_ids = [
        pid
        for c in body["clusters"]
        for pid in c.get("photo_ids", [])
    ]
    for eid in first_ids:
        assert eid not in all_new_ids, f"Excluded ID {eid} still in results"
    print(f"\n  feedback returned {len(body['clusters'])} clusters")


@pytest.mark.asyncio
async def test_confirm_session():
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        r = await client.post("/session/confirm", json={
            "session_id": "test-session-003",
            "photo_id":   "some_photo_id",
            "outcome":    "found",
        })
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_get_photo_metadata():
    """Pick a real photo from the DB and fetch its metadata."""
    from pathlib import Path
    import sqlite3
    db_path = Path(__file__).parent.parent / "storage" / "metadata.db"
    if not db_path.exists():
        pytest.skip("metadata.db not found — run pipeline first")
    conn = sqlite3.connect(str(db_path))
    row  = conn.execute("SELECT id FROM photos LIMIT 1").fetchone()
    conn.close()
    if not row:
        pytest.skip("No photos in DB — run pipeline first")

    photo_id = row[0]
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        r = await client.get(f"/photos/{photo_id}")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == photo_id
    assert "caption" in body
    print(f"\n  photo {photo_id[:12]}… fetched OK")


@pytest.mark.asyncio
async def test_get_photo_invalid_id():
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        r = await client.get("/photos/../etc/passwd")
    assert r.status_code in (400, 404, 422)


@pytest.mark.asyncio
async def test_export_json():
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        r = await client.get(
            "/session/export",
            params={"format": "json"},
            headers={"X-Export-Token": EXPORT_TOKEN},
        )
    assert r.status_code in (200, 403)  # 403 if EXPORT_TOKEN mismatch
    if r.status_code == 200:
        body = r.json()
        assert isinstance(body, list)
        print(f"\n  export returned {len(body)} turn rows")


@pytest.mark.asyncio
async def test_anchor():
    """Test anchor endpoint — skip if no photos in DB."""
    from pathlib import Path
    import sqlite3
    db_path = Path(__file__).parent.parent / "storage" / "metadata.db"
    if not db_path.exists():
        pytest.skip("metadata.db not found — run pipeline first")
    conn = sqlite3.connect(str(db_path))
    row  = conn.execute("SELECT id FROM photos LIMIT 1").fetchone()
    conn.close()
    if not row:
        pytest.skip("No photos in DB")

    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        r = await client.post("/session/anchor", json={
            "session_id": "test-anchor-001",
            "photo_id":   row[0],
            "relation":   "before",
        })
    assert r.status_code == 200
    body = r.json()
    assert body.get("anchor_set") is True
    assert "time_range" in body
    print(f"\n  anchor set for {row[0][:12]}…, window={body['time_range']}")
