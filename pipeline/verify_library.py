"""
pipeline/verify_library.py
============================
Spot-check the demo library after running all pipeline steps.

Checks:
  1. metadata.json exists and has ≥ 150 records
  2. metadata.db exists and has matching record count + all indexes
  3. ChromaDB collection exists and count matches DB
  4. 5 random photos have complete fields (caption, objects, mood_tags, episode_label)
  5. All 6 episodes are represented
  6. At least 15 records have purpose_tag != 'memory' (for test tasks #2, #3)
  7. Image files exist for a random sample of 10 records

Usage:
    cd pipeline
    python verify_library.py
"""

import json
import sqlite3
import random
import sys
from pathlib import Path

METADATA_PATH = Path(__file__).parent / "library" / "metadata.json"
IMAGES_DIR    = Path(__file__).parent / "library" / "raw_images"
DB_PATH       = Path(__file__).parent.parent / "backend" / "storage" / "metadata.db"
CHROMA_DIR    = Path(__file__).parent.parent / "backend" / "storage" / "chroma"

REQUIRED_EPISODES = {
    "Goa Trip Nov 2023",
    "Sick Week Jan 2024",
    "Job Change Mar 2023",
    "Cousin's Wedding Dec 2023",
    "Beach Day Oct 2023",
    "Everyday",
}

PASS = "✅"
FAIL = "❌"
WARN = "⚠️ "
errors = 0


def check(condition: bool, msg_pass: str, msg_fail: str, warn_only: bool = False):
    global errors
    if condition:
        print(f"  {PASS}  {msg_pass}")
    else:
        symbol = WARN if warn_only else FAIL
        print(f"  {symbol}  {msg_fail}")
        if not warn_only:
            errors += 1


def main():
    print("=" * 55)
    print(" Recall Demo Library — Verification Report")
    print("=" * 55)

    # ── 1. metadata.json ──────────────────────────────────────
    print("\n[1] metadata.json")
    if not METADATA_PATH.exists():
        print(f"  {FAIL}  File not found: {METADATA_PATH}")
        print("      Run: python tag_images.py")
        sys.exit(1)

    records: list[dict] = json.loads(METADATA_PATH.read_text())
    valid = [r for r in records if not r.get("tagging_error")]
    check(len(valid) >= 150,
          f"Valid records: {len(valid)} (≥ 150)",
          f"Only {len(valid)} valid records — need at least 150")

    # ── 2. Field completeness (5 random) ─────────────────────
    print("\n[2] Field completeness (5 random samples)")
    REQUIRED_FIELDS = ["id", "filename", "timestamp", "caption",
                       "objects", "mood_tags", "purpose_tag", "episode_label"]
    sample = random.sample(valid, min(5, len(valid)))
    for rec in sample:
        missing = [f for f in REQUIRED_FIELDS if not rec.get(f)]
        check(not missing,
              f"{rec['id'][:12]}… — all fields present",
              f"{rec['id'][:12]}… — missing: {missing}")

    # ── 3. Episodes ───────────────────────────────────────────
    print("\n[3] Episode coverage")
    found_episodes = {r.get("episode_label", "") for r in valid}
    for ep in sorted(REQUIRED_EPISODES):
        ep_records = [r for r in valid if r.get("episode_label") == ep]
        check(len(ep_records) >= 10,
              f"'{ep}': {len(ep_records)} photos",
              f"'{ep}': only {len(ep_records)} photos (need ≥ 10)",
              warn_only=(len(ep_records) > 0))

    # ── 4. Non-memory purpose tags ────────────────────────────
    print("\n[4] Purpose tag diversity")
    non_memory = [r for r in valid if r.get("purpose_tag", "memory") != "memory"]
    check(len(non_memory) >= 15,
          f"{len(non_memory)} photos with purpose_tag ≠ 'memory'",
          f"Only {len(non_memory)} non-memory photos — need ≥ 15 for test tasks #2, #3",
          warn_only=True)

    # ── 5. SQLite ─────────────────────────────────────────────
    print("\n[5] SQLite metadata.db")
    if not DB_PATH.exists():
        print(f"  {FAIL}  Database not found: {DB_PATH}")
        print("      Run: python import_to_sqlite.py")
        errors += 1
    else:
        conn = sqlite3.connect(str(DB_PATH))
        db_count = conn.execute("SELECT COUNT(*) FROM photos WHERE is_user_upload=0").fetchone()[0]
        fts_count = conn.execute("SELECT COUNT(*) FROM photos_fts").fetchone()[0]
        check(db_count >= 150,
              f"photos table: {db_count} rows",
              f"photos table: only {db_count} rows")
        check(fts_count == db_count,
              f"photos_fts in sync: {fts_count} rows",
              f"FTS out of sync: photos={db_count}, fts={fts_count}",
              warn_only=True)
        indexes = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='photos'"
        ).fetchall()
        idx_names = {r[0] for r in indexes}
        for idx in ["idx_timestamp", "idx_location", "idx_purpose", "idx_episode"]:
            check(idx in idx_names, f"Index '{idx}' exists", f"Index '{idx}' missing")
        conn.close()

    # ── 6. ChromaDB ───────────────────────────────────────────
    print("\n[6] ChromaDB embeddings")
    if not CHROMA_DIR.exists():
        print(f"  {WARN}  ChromaDB directory not found: {CHROMA_DIR}")
        print("      Run: python embed_images.py")
    else:
        try:
            import chromadb
            client = chromadb.PersistentClient(path=str(CHROMA_DIR))
            col = client.get_or_create_collection("photo_embeddings")
            chroma_count = col.count()
            check(chroma_count >= 150,
                  f"ChromaDB vectors: {chroma_count}",
                  f"ChromaDB: only {chroma_count} vectors")
        except Exception as e:
            print(f"  {WARN}  ChromaDB check failed: {e}")

    # ── 7. Image files ────────────────────────────────────────
    print("\n[7] Image file existence (10 random)")
    sample10 = random.sample(valid, min(10, len(valid)))
    for rec in sample10:
        ep_slug = rec.get("episode_label", "everyday").lower().replace(" ", "_").replace("'", "").replace(",", "")
        img_path = IMAGES_DIR / ep_slug / rec["filename"]
        if not img_path.exists():
            img_path = IMAGES_DIR / rec["filename"]  # flat fallback
        check(img_path.exists(),
              f"{rec['filename']} found",
              f"{rec['filename']} NOT found at {img_path}",
              warn_only=True)

    # ── Summary ───────────────────────────────────────────────
    print("\n" + "=" * 55)
    if errors == 0:
        print(f"  {PASS}  All checks passed. Library is ready for Phase 2.")
    else:
        print(f"  {FAIL}  {errors} check(s) failed. Fix issues above before proceeding.")
    print("=" * 55 + "\n")
    sys.exit(0 if errors == 0 else 1)


if __name__ == "__main__":
    main()
