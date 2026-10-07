"""
backend/storage/chroma_store.py
=================================
ChromaDB helpers for vector similarity search.

Used for:
  - "More like this" similarity queries
  - Anchor-based neighbourhood search

Degrades gracefully when ChromaDB is unavailable (returns empty list).
"""

import os
import logging
from pathlib import Path

log = logging.getLogger("recall.chroma")

CHROMA_DIR  = Path(os.environ.get("CHROMA_PERSIST_DIR", "./storage/chroma"))
COLLECTION  = "photo_embeddings"
EMBED_MODEL = "all-MiniLM-L6-v2"

_chroma_client = None
_collection    = None
_embed_model   = None
_available     = False


def _init():
    """Lazy-init ChromaDB and sentence-transformers."""
    global _chroma_client, _collection, _embed_model, _available
    if _available:
        return True
    try:
        import chromadb
        from sentence_transformers import SentenceTransformer

        _chroma_client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        _collection    = _chroma_client.get_or_create_collection(COLLECTION)
        _embed_model   = SentenceTransformer(EMBED_MODEL)
        _available     = True
        log.info(f"ChromaDB loaded — {_collection.count()} vectors in '{COLLECTION}'.")
        return True
    except Exception as e:
        log.warning(f"ChromaDB unavailable: {e} — similarity features disabled.")
        _available = False
        return False


def count_vectors() -> int:
    """Return number of vectors in the collection."""
    if not _init():
        return 0
    try:
        return _collection.count()
    except Exception:
        return 0


def query_by_text(text: str, top_k: int = 50, exclude_ids: list = None) -> list[str]:
    """
    Embed `text` and return the top_k most similar photo IDs.
    Returns [] if ChromaDB is unavailable.
    """
    if not _init():
        return []
    try:
        embedding = _embed_model.encode(text).tolist()
        where = None
        results = _collection.query(
            query_embeddings=[embedding],
            n_results=min(top_k + len(exclude_ids or []), _collection.count()),
            include=["distances"],
        )
        ids = results["ids"][0] if results["ids"] else []
        if exclude_ids:
            ids = [i for i in ids if i not in set(exclude_ids)]
        return ids[:top_k]
    except Exception as e:
        log.warning(f"ChromaDB query failed: {e}")
        return []


def query_by_photo_id(photo_id: str, top_k: int = 30, exclude_ids: list = None) -> list[str]:
    """
    Find photos similar to a given photo_id (anchor-based search).
    Returns [] if the photo_id is not in the collection.
    """
    if not _init():
        return []
    try:
        result = _collection.get(ids=[photo_id], include=["embeddings"])
        if not result["embeddings"]:
            log.warning(f"Photo {photo_id} not found in ChromaDB.")
            return []
        embedding = result["embeddings"][0]
        results = _collection.query(
            query_embeddings=[embedding],
            n_results=min(top_k + 1 + len(exclude_ids or []), _collection.count()),
            include=["distances"],
        )
        ids = results["ids"][0] if results["ids"] else []
        # Exclude the anchor photo itself and any explicitly excluded IDs
        exclude_set = set(exclude_ids or []) | {photo_id}
        ids = [i for i in ids if i not in exclude_set]
        return ids[:top_k]
    except Exception as e:
        log.warning(f"ChromaDB anchor query failed: {e}")
        return []
