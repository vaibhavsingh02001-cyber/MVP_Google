"""
backend/routers/export.py
===========================
Session log export endpoint — Phase 4 (wired in Phase 2 as a stub with auth).

GET /session/export?format=csv|json&session_id=<optional>

Protected by X-Export-Token header.
"""

import csv
import io
import json
import os
import logging

from fastapi import APIRouter, Header, HTTPException, Query
from fastapi.responses import StreamingResponse, JSONResponse

from storage import session_db

log    = logging.getLogger("recall.export")
router = APIRouter()

EXPORT_TOKEN = os.environ.get("EXPORT_TOKEN", "")


def _check_token(x_export_token: str = "", token: str = ""):
    if EXPORT_TOKEN:
        supplied = x_export_token or token
        if supplied != EXPORT_TOKEN:
            raise HTTPException(
                status_code=403,
                detail="Invalid or missing X-Export-Token.",
            )


@router.get("/export")
async def export_sessions(
    format:             str           = Query("json", regex="^(json|csv)$"),
    session_id:         str | None    = Query(None),
    token:              str | None    = Query(None),
    x_export_token:     str           = Header("", alias="X-Export-Token"),
):
    """
    Download all session turns as JSON or CSV.
    Pass ?session_id=<uuid> to export a single session.
    Pass ?format=csv or ?format=json.
    Protected by X-Export-Token header or ?token=<secret>.
    """
    _check_token(x_export_token, token or "")

    rows = session_db.get_all_turns(session_id=session_id)

    if format == "csv":
        if not rows:
            # Return empty CSV with headers only
            headers_row = [
                "session_id", "mode", "started_at", "ended_at", "outcome",
                "confirmed_photo", "turn_index", "raw_clue", "parsed_filters",
                "clusters_shown", "question_asked", "answer_given",
                "feedback_signal", "excluded_ids", "time_elapsed_ms", "timestamp",
            ]
            buf = io.StringIO()
            buf.write(",".join(headers_row) + "\n")
            buf.write("# No sessions recorded yet\n")
        else:
            buf = io.StringIO()
            writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)

        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=recall_sessions.csv"
            },
        )

    # JSON
    return JSONResponse(content=rows if rows else [])
