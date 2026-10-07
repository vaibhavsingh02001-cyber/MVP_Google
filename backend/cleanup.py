"""
backend/cleanup.py
====================
Background task that purges expired user uploads every hour.

Runs as an APScheduler job started during FastAPI lifespan startup.
"""

import logging
from pathlib import Path

from storage import metadata_db

log        = logging.getLogger("recall.cleanup")
UPLOAD_DIR = Path(__file__).parent / "library" / "uploads"


def purge_expired_uploads():
    """Delete all expired user uploads from disk and the DB."""
    expired = metadata_db.get_expired_uploads()
    if not expired:
        return

    log.info("Purge: %d expired uploads found.", len(expired))
    deleted = 0
    for photo_id, filename in expired:
        # Find and delete file
        for f in UPLOAD_DIR.rglob(filename):
            try:
                f.unlink()
                deleted += 1
            except OSError as e:
                log.warning("Could not delete %s: %s", f, e)
        metadata_db.delete_photo(photo_id)

    log.info("Purge complete: %d files deleted.", deleted)
