"""
backend/storage/metadata_db.py
================================
SQLite helpers for reading photo metadata.

All functions are read-only (no writes to the demo library at runtime).
Writes happen only during pipeline/import_to_sqlite.py.
"""

import sqlite3
import json
import os
from dataclasses import dataclass, field
from typing import Optional
from pathlib import Path

DB_PATH = Path(__file__).parent / "metadata.db"


@dataclass
class Photo:
    id:              str
    filename:        str
    timestamp:       str
    latitude:        Optional[float]
    longitude:       Optional[float]
    location_label:  str
    caption:         str
    objects:         list
    mood_tags:       list
    purpose_tag:     str
    dominant_colors: list
    people_tags:     list
    episode_label:   str
    is_user_upload:  int = 0
    upload_expires:  Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "id":              self.id,
            "filename":        self.filename,
            "timestamp":       self.timestamp,
            "latitude":        self.latitude,
            "longitude":       self.longitude,
            "location_label":  self.location_label,
            "caption":         self.caption,
            "objects":         self.objects,
            "mood_tags":       self.mood_tags,
            "purpose_tag":     self.purpose_tag,
            "dominant_colors": self.dominant_colors,
            "people_tags":     self.people_tags,
            "episode_label":   self.episode_label,
        }


def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def _row_to_photo(row) -> Photo:
    return Photo(
        id=row["id"],
        filename=row["filename"],
        timestamp=row["timestamp"],
        latitude=row["latitude"],
        longitude=row["longitude"],
        location_label=row["location_label"] or "",
        caption=row["caption"] or "",
        objects=json.loads(row["objects"] or "[]"),
        mood_tags=json.loads(row["mood_tags"] or "[]"),
        purpose_tag=row["purpose_tag"] or "memory",
        dominant_colors=json.loads(row["dominant_colors"] or "[]"),
        people_tags=json.loads(row["people_tags"] or "[]"),
        episode_label=row["episode_label"] or "Everyday",
        is_user_upload=row["is_user_upload"],
        upload_expires=row["upload_expires"],
    )


def count_photos() -> int:
    """Return total number of non-upload photos in the library."""
    if not DB_PATH.exists():
        return 0
    conn = _get_conn()
    result = conn.execute(
        "SELECT COUNT(*) FROM photos WHERE is_user_upload = 0"
    ).fetchone()[0]
    conn.close()
    return result


def get_photo(photo_id: str) -> Optional[Photo]:
    """Fetch a single photo by ID."""
    conn = _get_conn()
    row = conn.execute(
        "SELECT * FROM photos WHERE id = ?", (photo_id,)
    ).fetchone()
    conn.close()
    return _row_to_photo(row) if row else None


def get_all_photos(limit: int = 200) -> list[Photo]:
    """Return all non-upload photos ordered by timestamp desc."""
    if not DB_PATH.exists():
        return []
    conn = _get_conn()
    rows = conn.execute(
        "SELECT * FROM photos WHERE is_user_upload = 0 ORDER BY timestamp DESC LIMIT ?",
        (limit,),
    ).fetchall()
    conn.close()
    return [_row_to_photo(r) for r in rows]


def get_stories() -> list[dict]:
    """Generate dynamic Google Photos style story albums based on episodes and dates."""
    if not DB_PATH.exists():
        return []
    episodes = get_all_episodes()
    stories = []
    
    # Story titles mapping for Google Photos style
    title_labels = [
        "Recent highlights",
        "Trip to Kyoto",
        "Golden hour & Beach",
        "Life & Milestones",
        "Everyday memories",
        "Iceland Expedition",
    ]

    for i, ep in enumerate(episodes):
        label = ep["label"]
        photos = search({"episode": label}, limit=6)
        if not photos:
            continue
        cover = photos[0].to_dict()
        display_title = title_labels[i % len(title_labels)] if i < len(title_labels) else label
        stories.append({
            "id": f"story-{i}",
            "title": display_title,
            "subtitle": label,
            "date_from": ep.get("date_from"),
            "date_to": ep.get("date_to"),
            "photo_count": ep.get("count", len(photos)),
            "cover_photo": cover,
            "photos": [p.to_dict() for p in photos],
        })
    return stories


def search(filters: dict, limit: int = 100, exclude_ids: list = None) -> list[Photo]:
    """
    Search photos using structured filters.

    Supported filter keys:
      time_range   : { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }
      locations    : ["Panjim, Goa", ...]   (partial match via LIKE)
      objects      : ["cafe", "rain", ...]  (JSON array LIKE match)
      mood_tags    : ["rainy", "cozy", ...] (JSON array LIKE match)
      purpose_tags : ["receipt", ...]
      people       : ["cousin", ...]        (JSON array LIKE match)
      episode      : "Goa Trip Nov 2023"    (exact match)
    """
    if not DB_PATH.exists():
        return []

    conn = _get_conn()
    clauses = ["is_user_upload = 0"]
    params: list = []

    if exclude_ids:
        placeholders = ",".join("?" * len(exclude_ids))
        clauses.append(f"id NOT IN ({placeholders})")
        params.extend(exclude_ids)

    if tr := filters.get("time_range"):
        if tr.get("from") and tr.get("to"):
            clauses.append("timestamp BETWEEN ? AND ?")
            params += [tr["from"], tr["to"] + "T23:59:59"]

    if locs := filters.get("locations"):
        loc_clauses = []
        for loc in locs:
            loc_clauses.append("location_label LIKE ?")
            params.append(f"%{loc}%")
        clauses.append(f"({' OR '.join(loc_clauses)})")

    if objs := filters.get("objects"):
        for obj in objs:
            clauses.append("objects LIKE ?")
            params.append(f'%"{obj}"%')

    if mood := filters.get("mood_tags"):
        for m in mood:
            clauses.append("mood_tags LIKE ?")
            params.append(f'%"{m}"%')

    if purposes := filters.get("purpose_tags"):
        placeholders = ",".join("?" * len(purposes))
        clauses.append(f"purpose_tag IN ({placeholders})")
        params.extend(purposes)

    if people := filters.get("people"):
        for p in people:
            clauses.append("people_tags LIKE ?")
            params.append(f'%"{p}"%')

    if ep := filters.get("episode"):
        clauses.append("episode_label = ?")
        params.append(ep)

    where = " AND ".join(clauses)
    query = f"SELECT * FROM photos WHERE {where} ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)

    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [_row_to_photo(r) for r in rows]


STOP_WORDS = {
    "a", "an", "the", "and", "or", "in", "on", "at", "of", "for", "with",
    "from", "to", "by", "is", "was", "were", "it", "this", "that", "i", "my",
    "me", "we", "our", "you", "your", "when", "around", "after", "before",
    "under", "over", "some", "any", "picture", "photo", "image"
}


def fts_search(query_text: str, limit: int = 50, exclude_ids: list = None) -> list[Photo]:
    """
    Full-text search using SQLite FTS5 (used by Baseline mode).
    Sanitises FTS5 special characters, filters stop words, and constructs
    a ranked OR query so natural language clues retrieve the best keyword matches.
    """
    if not DB_PATH.exists():
        return []

    # Sanitise FTS5 operators
    clean_text = (
        query_text
        .replace('"', ' ').replace("'", ' ')
        .replace('(', ' ').replace(')', ' ')
        .replace('*', ' ').replace('-', ' ')
        .replace(':', ' ').replace('^', ' ')
        .strip()
    )
    if not clean_text:
        return []

    # Extract tokens and filter out stop words
    words = [w.lower() for w in clean_text.split() if w.isalnum() or w.isalpha()]
    significant = [w for w in words if w not in STOP_WORDS and len(w) > 1]
    if not significant:
        significant = words

    # Build FTS5 query: prefer matching any significant word, ranked by BM25
    fts_query = " OR ".join(significant)
    if not fts_query:
        fts_query = clean_text

    conn = _get_conn()
    try:
        rows = conn.execute(
            """
            SELECT p.* FROM photos p
            JOIN photos_fts f ON p.id = f.id
            WHERE photos_fts MATCH ?
              AND p.is_user_upload = 0
            ORDER BY rank
            LIMIT ?
            """,
            (fts_query, limit),
        ).fetchall()
    except sqlite3.OperationalError:
        # FTS query parse error — fall back to LIKE search across caption and location
        rows = conn.execute(
            """
            SELECT * FROM photos
            WHERE (caption LIKE ? OR location_label LIKE ? OR episode_label LIKE ?)
              AND is_user_upload = 0
            LIMIT ?
            """,
            (f"%{clean_text}%", f"%{clean_text}%", f"%{clean_text}%", limit),
        ).fetchall()
    conn.close()

    results = [_row_to_photo(r) for r in rows]
    if exclude_ids:
        results = [p for p in results if p.id not in set(exclude_ids)]
    return results


def get_all_episodes() -> list[dict]:
    """Return distinct episode labels and their photo counts."""
    if not DB_PATH.exists():
        return []
    conn = _get_conn()
    rows = conn.execute(
        "SELECT episode_label, MIN(timestamp), MAX(timestamp), COUNT(*) "
        "FROM photos WHERE is_user_upload=0 "
        "GROUP BY episode_label ORDER BY MIN(timestamp)"
    ).fetchall()
    conn.close()
    return [
        {"label": r[0], "date_from": r[1], "date_to": r[2], "count": r[3]}
        for r in rows
    ]


def get_date_range_for_episode(episode_label: str) -> Optional[dict]:
    """Return the time range for a named episode."""
    if not DB_PATH.exists():
        return None
    conn = _get_conn()
    row = conn.execute(
        "SELECT MIN(timestamp), MAX(timestamp) FROM photos "
        "WHERE episode_label = ? AND is_user_upload = 0",
        (episode_label,),
    ).fetchone()
    conn.close()
    if row and row[0]:
        return {"from": row[0], "to": row[1]}
    return None


def add_user_photo(photo: Photo) -> None:
    """Insert a user-uploaded photo into the DB."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute(
        """INSERT OR REPLACE INTO photos
           (id, filename, timestamp, latitude, longitude, location_label,
            caption, objects, mood_tags, purpose_tag, dominant_colors,
            people_tags, episode_label, is_user_upload, upload_expires)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)""",
        (
            photo.id, photo.filename, photo.timestamp,
            photo.latitude, photo.longitude, photo.location_label,
            photo.caption,
            json.dumps(photo.objects), json.dumps(photo.mood_tags),
            photo.purpose_tag, json.dumps(photo.dominant_colors),
            json.dumps(photo.people_tags), photo.episode_label,
            photo.upload_expires,
        ),
    )
    conn.commit()
    conn.close()


def delete_photo(photo_id: str) -> None:
    """Delete a photo record (used for user upload deletion)."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("DELETE FROM photos WHERE id = ?", (photo_id,))
    conn.execute("DELETE FROM photos_fts WHERE id = ?", (photo_id,))
    conn.commit()
    conn.close()


def get_expired_uploads() -> list[tuple[str, str]]:
    """Return (photo_id, filename) for all expired user uploads."""
    if not DB_PATH.exists():
        return []
    conn = _get_conn()
    rows = conn.execute(
        "SELECT id, filename FROM photos "
        "WHERE is_user_upload = 1 AND upload_expires < datetime('now')"
    ).fetchall()
    conn.close()
    return [(r["id"], r["filename"]) for r in rows]
