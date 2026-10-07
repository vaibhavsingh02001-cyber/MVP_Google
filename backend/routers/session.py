"""
backend/routers/session.py
============================
Session API endpoints — full Phase 2 implementation.

Endpoints:
  POST /session/start      → SSE stream of clusters
  POST /session/feedback   → apply user reaction, return updated clusters
  POST /session/confirm    → mark session found/skipped
  POST /session/anchor     → set timeline anchor photo
"""

import json
import time
import uuid
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Literal, Optional

from agent.orchestrator import (
    run_recall_session,
    apply_feedback,
    resolve_anchor,
    baseline_search,
)
from storage import session_db

log = logging.getLogger("recall.session")
router = APIRouter()


# ── Request / Response models ─────────────────────────────────────────────────

class StartRequest(BaseModel):
    clue:       str   = Field(..., min_length=1, max_length=1000)
    mode:       Literal["recall", "baseline"] = "recall"
    session_id: Optional[str] = None   # client can supply its own UUID


class FeedbackRequest(BaseModel):
    session_id:   str
    feedback:     Literal["not_this", "earlier", "later", "more_like_this"]
    excluded_ids: list[str] = []
    free_text:    Optional[str] = None
    answer:       Optional[str] = None   # chip answer given with feedback


class ConfirmRequest(BaseModel):
    session_id: str
    photo_id:   Optional[str] = None
    outcome:    Literal["found", "skipped", "abandoned"] = "found"


class AnchorRequest(BaseModel):
    session_id: str
    photo_id:   str
    relation:   Literal["before", "after", "same_day"]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/start")
async def start_session(body: StartRequest):
    """
    Start a new retrieval session.

    In Recall mode: runs the agent loop and streams clusters via SSE.
    In Baseline mode: runs FTS5 search and returns a flat JSON response.
    """
    clue       = body.clue.strip()
    mode       = body.mode
    session_id = body.session_id or str(uuid.uuid4())

    if not clue:
        raise HTTPException(status_code=422, detail="Clue cannot be empty.")

    # Create session record
    try:
        session_db.create_session(session_id, mode)
    except Exception as e:
        log.warning("Session DB create failed (non-fatal): %s", e)

    # ── Baseline mode — plain JSON response ───────────────────────────────────
    if mode == "baseline":
        result = baseline_search(clue, session_id)
        try:
            session_db.log_turn(
                session_id=session_id,
                turn_index=1,
                raw_clue=clue,
            )
        except Exception as e:
            log.warning("Session log (baseline) failed: %s", e)
        return result

    # ── Recall mode — SSE stream ──────────────────────────────────────────────
    async def event_stream():
        try:
            async for event in run_recall_session(clue, session_id):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            log.error("SSE stream error: %s", e)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":               "no-cache",
            "X-Accel-Buffering":           "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


@router.post("/feedback")
async def session_feedback(body: FeedbackRequest):
    """
    Apply user feedback on current clusters and return updated clusters + question.
    """
    if not body.session_id:
        raise HTTPException(status_code=422, detail="session_id is required.")

    try:
        result = await apply_feedback(
            session_id=body.session_id,
            signal=body.feedback,
            excluded_ids=body.excluded_ids,
            free_text=body.free_text or "",
            answer=body.answer or "",
        )
    except Exception as e:
        log.error("Feedback error: %s", e)
        raise HTTPException(status_code=500, detail="Feedback processing failed.")

    return result


@router.post("/confirm")
async def confirm_session(body: ConfirmRequest):
    """
    Close a session with an outcome. Called when:
    - User taps "That's it"  → outcome=found, photo_id=<id>
    - User taps "Skip"       → outcome=skipped
    - User closes window     → outcome=abandoned (via sendBeacon)
    """
    try:
        session_db.close_session(
            session_id=body.session_id,
            outcome=body.outcome,
            confirmed_photo=body.photo_id,
        )
    except Exception as e:
        log.warning("Session close failed (non-fatal): %s", e)

    return {"status": "ok", "outcome": body.outcome}


@router.post("/anchor")
async def set_anchor(body: AnchorRequest):
    """
    Set a timeline anchor photo and return the resolved time window.
    """
    try:
        result = await resolve_anchor(
            session_id=body.session_id,
            photo_id=body.photo_id,
            relation=body.relation,
        )
    except Exception as e:
        log.error("Anchor error: %s", e)
        raise HTTPException(status_code=500, detail="Anchor resolution failed.")

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result
