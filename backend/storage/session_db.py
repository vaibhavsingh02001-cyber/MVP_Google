"""
backend/storage/session_db.py
===============================
SQLite helpers for reading and writing session logs.
"""

import sqlite3
import json
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).parent / "session_log.db"

SCHEMA_SQL = """
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS sessions (
    session_id      TEXT PRIMARY KEY,
    mode            TEXT NOT NULL,          -- "recall" | "baseline"
    started_at      DATETIME NOT NULL,
    ended_at        DATETIME,
    outcome         TEXT,                   -- "found" | "skipped" | "abandoned"
    confirmed_photo TEXT
);

CREATE TABLE IF NOT EXISTS turns (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      TEXT REFERENCES sessions(session_id),
    turn_index      INTEGER NOT NULL,
    raw_clue        TEXT,
    parsed_filters  TEXT,                   -- JSON
    clusters_shown  TEXT,                   -- JSON array of cluster names
    question_asked  TEXT,
    answer_given    TEXT,
    feedback_signal TEXT,                   -- "not_this"|"earlier"|"later"|null
    excluded_ids    TEXT,                   -- JSON array
    time_elapsed_ms INTEGER,
    timestamp       DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_turns_session ON turns(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_outcome ON sessions(outcome);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create tables if they don't exist."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.executescript(SCHEMA_SQL)
    conn.commit()
    conn.close()


def create_session(session_id: str, mode: str) -> None:
    conn = _get_conn()
    conn.execute(
        "INSERT OR IGNORE INTO sessions (session_id, mode, started_at) VALUES (?, ?, ?)",
        (session_id, mode, _now()),
    )
    conn.commit()
    conn.close()


def log_turn(
    session_id: str,
    turn_index: int,
    raw_clue: str = None,
    parsed_filters: dict = None,
    clusters_shown: list = None,
    question_asked: str = None,
    answer_given: str = None,
    feedback_signal: str = None,
    excluded_ids: list = None,
    time_elapsed_ms: int = None,
) -> None:
    conn = _get_conn()
    conn.execute(
        """INSERT INTO turns
           (session_id, turn_index, raw_clue, parsed_filters, clusters_shown,
            question_asked, answer_given, feedback_signal, excluded_ids,
            time_elapsed_ms, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            session_id,
            turn_index,
            raw_clue,
            json.dumps(parsed_filters) if parsed_filters else None,
            json.dumps(clusters_shown) if clusters_shown else None,
            question_asked,
            answer_given,
            feedback_signal,
            json.dumps(excluded_ids or []),
            max(0, time_elapsed_ms) if time_elapsed_ms is not None else None,
            _now(),
        ),
    )
    conn.commit()
    conn.close()


def close_session(session_id: str, outcome: str, confirmed_photo: str = None) -> None:
    conn = _get_conn()
    conn.execute(
        "UPDATE sessions SET ended_at=?, outcome=?, confirmed_photo=? WHERE session_id=?",
        (_now(), outcome, confirmed_photo, session_id),
    )
    conn.commit()
    conn.close()


def get_turn_count(session_id: str) -> int:
    conn = _get_conn()
    result = conn.execute(
        "SELECT COUNT(*) FROM turns WHERE session_id = ?", (session_id,)
    ).fetchone()[0]
    conn.close()
    return result


def get_all_turns(session_id: str = None) -> list[dict]:
    """Return all turns joined with session metadata for export."""
    conn = _get_conn()
    if session_id:
        rows = conn.execute(
            """SELECT s.session_id, s.mode, s.started_at, s.ended_at,
                      s.outcome, s.confirmed_photo,
                      t.turn_index, t.raw_clue, t.parsed_filters,
                      t.clusters_shown, t.question_asked, t.answer_given,
                      t.feedback_signal, t.excluded_ids, t.time_elapsed_ms,
                      t.timestamp
               FROM sessions s LEFT JOIN turns t ON s.session_id = t.session_id
               WHERE s.session_id = ?
               ORDER BY t.turn_index""",
            (session_id,),
        ).fetchall()
    else:
        rows = conn.execute(
            """SELECT s.session_id, s.mode, s.started_at, s.ended_at,
                      s.outcome, s.confirmed_photo,
                      t.turn_index, t.raw_clue, t.parsed_filters,
                      t.clusters_shown, t.question_asked, t.answer_given,
                      t.feedback_signal, t.excluded_ids, t.time_elapsed_ms,
                      t.timestamp
               FROM sessions s LEFT JOIN turns t ON s.session_id = t.session_id
               ORDER BY s.started_at DESC, t.turn_index"""
        ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def mark_abandoned_sessions(ttl_hours: int = 2) -> int:
    """Mark sessions as abandoned if they haven't been closed within TTL."""
    conn = _get_conn()
    result = conn.execute(
        """UPDATE sessions
           SET outcome = 'abandoned', ended_at = ?
           WHERE outcome IS NULL
             AND started_at < datetime('now', ? || ' hours')""",
        (_now(), f"-{ttl_hours}"),
    )
    conn.commit()
    conn.close()
    return result.rowcount
