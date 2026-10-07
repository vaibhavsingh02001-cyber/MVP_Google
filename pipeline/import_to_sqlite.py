"""
pipeline/import_to_sqlite.py
==============================
Phase 1 Step 3 — Import metadata.json into SQLite + FTS5 tables.

Reads:   pipeline/library/metadata.json  (from tag_images.py)
Writes:  backend/storage/metadata.db

Usage:
    cd pipeline
    python import_to_sqlite.py

Safe to re-run: uses INSERT OR REPLACE, skips records with tagging_error=True.
"""

import sqlite3
import json
import sys
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
METADATA_PATH = Path(__file__).parent / "library" / "metadata.json"
DB_PATH       = Path(__file__).parent.parent / "backend" / "storage" / "metadata.db"

# ── DDL ───────────────────────────────────────────────────────────────────────
SCHEMA_SQL = """
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS photos (
    id              TEXT PRIMARY KEY,
    filename        TEXT NOT NULL,
    timestamp       DATETIME NOT NULL,
    latitude        REAL,
    longitude       REAL,
    location_label  TEXT,
    caption         TEXT,
    objects         TEXT,       -- JSON array
    mood_tags       TEXT,       -- JSON array
    purpose_tag     TEXT,
    dominant_colors TEXT,       -- JSON array
    people_tags     TEXT,       -- JSON array
    episode_label   TEXT,
    is_user_upload  INTEGER DEFAULT 0,
    upload_expires  DATETIME
);

CREATE INDEX IF NOT EXISTS idx_timestamp     ON photos(timestamp);
CREATE INDEX IF NOT EXISTS idx_location      ON photos(location_label);
CREATE INDEX IF NOT EXISTS idx_purpose       ON photos(purpose_tag);
CREATE INDEX IF NOT EXISTS idx_episode       ON photos(episode_label);
CREATE INDEX IF NOT EXISTS idx_user_upload   ON photos(is_user_upload);

-- FTS5 virtual table for Baseline keyword search mode
CREATE VIRTUAL TABLE IF NOT EXISTS photos_fts
    USING fts5(id UNINDEXED, caption, objects, location_label, episode_label);
"""

INSERT_PHOTO_SQL = """
INSERT OR REPLACE INTO photos
    (id, filename, timestamp, latitude, longitude, location_label,
     caption, objects, mood_tags, purpose_tag, dominant_colors,
     people_tags, episode_label, is_user_upload, upload_expires)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)
"""

INSERT_FTS_SQL = """
INSERT OR REPLACE INTO photos_fts
    (id, caption, objects, location_label, episode_label)
VALUES (?, ?, ?, ?, ?)
"""


def validate_record(r: dict) -> tuple[bool, str]:
    """Return (is_valid, reason). Records with tagging errors are skipped."""
    if r.get("tagging_error"):
        return False, "tagging_error flag set"
    if not r.get("id"):
        return False, "missing id"
    if not r.get("filename"):
        return False, "missing filename"
    # Ensure timestamp is present; default to a fallback
    if not r.get("timestamp"):
        r["timestamp"] = "1970-01-01T00:00:00"
    return True, ""


def main():
    if not METADATA_PATH.exists():
        print(f"❌  metadata.json not found: {METADATA_PATH}")
        print("   Run pipeline/tag_images.py first.")
        sys.exit(1)

    records: list[dict] = json.loads(METADATA_PATH.read_text())
    print(f"▶  Loaded {len(records)} records from metadata.json")

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.executescript(SCHEMA_SQL)

    inserted = 0
    skipped  = 0
    errors   = 0

    for r in records:
        valid, reason = validate_record(r)
        if not valid:
            print(f"   ⚠️  Skipping {r.get('id', '?')}: {reason}")
            skipped += 1
            continue

        try:
            conn.execute(INSERT_PHOTO_SQL, (
                r["id"],
                r["filename"],
                r["timestamp"],
                r.get("latitude"),
                r.get("longitude"),
                r.get("location_label", ""),
                r.get("caption", ""),
                json.dumps(r.get("objects", [])),
                json.dumps(r.get("mood_tags", [])),
                r.get("purpose_tag", "memory"),
                json.dumps(r.get("dominant_colors", [])),
                json.dumps(r.get("people_tags", [])),
                r.get("episode_label", "Everyday"),
            ))

            conn.execute(INSERT_FTS_SQL, (
                r["id"],
                r.get("caption", ""),
                " ".join(r.get("objects", [])),
                r.get("location_label", ""),
                r.get("episode_label", ""),
            ))

            inserted += 1

        except Exception as e:
            print(f"   ❌  DB insert error for {r.get('id', '?')}: {e}")
            errors += 1

    conn.commit()

    # ── Integrity report ──────────────────────────────────────────────────────
    total_in_db   = conn.execute("SELECT COUNT(*) FROM photos").fetchone()[0]
    total_in_fts  = conn.execute("SELECT COUNT(*) FROM photos_fts").fetchone()[0]
    episodes      = conn.execute(
        "SELECT episode_label, COUNT(*) FROM photos GROUP BY episode_label ORDER BY episode_label"
    ).fetchall()
    conn.close()

    print(f"\n✅  Import complete.")
    print(f"   Inserted:     {inserted}")
    print(f"   Skipped:      {skipped}")
    print(f"   Errors:       {errors}")
    print(f"   DB total:     {total_in_db} photos")
    print(f"   FTS total:    {total_in_fts} rows")
    print(f"   DB path:      {DB_PATH}\n")
    print("   Episodes breakdown:")
    for ep_label, count in episodes:
        print(f"     • {ep_label}: {count} photos")

    # Warn if Chroma is out of sync
    print(f"\n⚠️  Remember to run embed_images.py to sync ChromaDB with this database.")


if __name__ == "__main__":
    main()
