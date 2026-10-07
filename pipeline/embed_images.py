"""
pipeline/embed_images.py
==========================
Phase 1 Step 4 — Generate text embeddings and store in ChromaDB.

Reads:   pipeline/library/metadata.json
Writes:  backend/storage/chroma/  (persistent ChromaDB collection)

Usage:
    cd pipeline
    python embed_images.py

Model: sentence-transformers/all-MiniLM-L6-v2 (free, local, ~80MB)
Embedding text = caption + objects + mood_tags (concatenated)

Safe to re-run: uses upsert, skips already-embedded IDs.
Prints a sync warning if metadata.db has more records than ChromaDB.
"""

import json
import sys
import sqlite3
from pathlib import Path

try:
    import chromadb
    from sentence_transformers import SentenceTransformer
except ImportError:
    print("❌  Missing dependencies. Run: pip install -r requirements.txt")
    sys.exit(1)

# ── Paths ─────────────────────────────────────────────────────────────────────
METADATA_PATH  = Path(__file__).parent / "library" / "metadata.json"
CHROMA_DIR     = Path(__file__).parent.parent / "backend" / "storage" / "chroma"
DB_PATH        = Path(__file__).parent.parent / "backend" / "storage" / "metadata.db"
COLLECTION     = "photo_embeddings"
EMBED_MODEL    = "all-MiniLM-L6-v2"
BATCH_SIZE     = 32    # embed this many photos at a time


def build_embed_text(record: dict) -> str:
    """Compose the text to embed for a photo record."""
    parts = []
    if caption := record.get("caption", ""):
        parts.append(caption)
    if objects := record.get("objects", []):
        parts.append(" ".join(objects))
    if mood := record.get("mood_tags", []):
        parts.append(" ".join(mood))
    if ep := record.get("episode_label", ""):
        parts.append(ep)
    return " ".join(parts).strip()


def main():
    if not METADATA_PATH.exists():
        print(f"❌  metadata.json not found: {METADATA_PATH}")
        print("   Run pipeline/tag_images.py first.")
        sys.exit(1)

    records: list[dict] = json.loads(METADATA_PATH.read_text())
    # Only embed records without tagging errors
    valid_records = [r for r in records if not r.get("tagging_error") and r.get("caption")]
    print(f"▶  {len(valid_records)} valid records to embed (from {len(records)} total)")

    # Load model
    print(f"▶  Loading embedding model '{EMBED_MODEL}'…")
    model = SentenceTransformer(EMBED_MODEL)
    print("   Model loaded.\n")

    # Init ChromaDB
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    chroma_client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    collection = chroma_client.get_or_create_collection(
        name=COLLECTION,
        metadata={"hnsw:space": "cosine"},
    )

    # Determine which IDs are already embedded
    existing_ids: set[str] = set()
    if collection.count() > 0:
        existing_ids = set(collection.get(include=[])["ids"])
        print(f"   Resuming — {len(existing_ids)} already embedded.\n")

    to_embed = [r for r in valid_records if r["id"] not in existing_ids]
    print(f"▶  Embedding {len(to_embed)} new records in batches of {BATCH_SIZE}…\n")

    total_embedded = 0
    for batch_start in range(0, len(to_embed), BATCH_SIZE):
        batch = to_embed[batch_start: batch_start + BATCH_SIZE]
        texts = [build_embed_text(r) for r in batch]
        ids   = [r["id"] for r in batch]
        metas = [
            {
                "episode":   r.get("episode_label", ""),
                "location":  r.get("location_label", ""),
                "purpose":   r.get("purpose_tag", "memory"),
                "timestamp": r.get("timestamp", ""),
            }
            for r in batch
        ]

        embeddings = model.encode(texts, show_progress_bar=False).tolist()

        collection.upsert(
            ids=ids,
            embeddings=embeddings,
            metadatas=metas,
        )

        total_embedded += len(batch)
        pct = int(total_embedded / len(to_embed) * 100) if to_embed else 100
        print(f"   [{pct:3d}%] Embedded {total_embedded}/{len(to_embed)} records")

    final_count = collection.count()
    print(f"\n✅  ChromaDB sync complete.")
    print(f"   Collection '{COLLECTION}' now has {final_count} vectors.")
    print(f"   Stored at: {CHROMA_DIR}\n")

    # ── Integrity check: compare with SQLite ──────────────────────────────────
    if DB_PATH.exists():
        conn = sqlite3.connect(str(DB_PATH))
        db_count = conn.execute("SELECT COUNT(*) FROM photos WHERE is_user_upload = 0").fetchone()[0]
        conn.close()
        if db_count != final_count:
            print(f"⚠️  Sync mismatch: metadata.db has {db_count} photos but Chroma has {final_count} vectors.")
            print("   This is OK if some records had tagging errors.")
            print("   Run import_to_sqlite.py then embed_images.py again to re-sync.\n")
        else:
            print(f"✅  metadata.db and ChromaDB are in sync ({db_count} records each).\n")


if __name__ == "__main__":
    main()
