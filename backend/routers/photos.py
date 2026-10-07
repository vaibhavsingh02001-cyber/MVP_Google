"""
backend/routers/photos.py
===========================
Photo endpoints — Phase 2 full implementation.

Endpoints:
  GET    /photos/{photo_id}      → serve photo metadata (file served via StaticFiles)
  POST   /photos/upload          → accept user-uploaded photo, tag it, store temporarily
  DELETE /photos/upload/{id}     → delete user-uploaded photo immediately
"""

import os
import uuid
import base64
import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Form, HTTPException, UploadFile, File, Header
from fastapi.responses import JSONResponse

from storage import metadata_db
from storage.metadata_db import Photo

log    = logging.getLogger("recall.photos")
router = APIRouter()

UPLOAD_DIR     = Path(__file__).parent.parent / "library" / "uploads"
MAX_UPLOAD_MB  = int(os.environ.get("MAX_UPLOAD_MB",  "10"))
UPLOAD_TTL_HRS = int(os.environ.get("UPLOAD_TTL_HOURS", "24"))
ALLOWED_TYPES  = {"image/jpeg", "image/png", "image/webp", "image/heic"}

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/feed")
async def get_photo_feed(limit: int = 200):
    """
    Return all library photos organized for Google Photos feed view,
    including top memory story carousels and total count.
    """
    photos = metadata_db.get_all_photos(limit=limit)
    stories = metadata_db.get_stories()
    return {
        "photos": [p.to_dict() for p in photos],
        "stories": stories,
        "total": len(photos),
    }


@router.get("")
async def list_photos(limit: int = 100):
    """List photos with basic metadata."""
    photos = metadata_db.get_all_photos(limit=limit)
    return [p.to_dict() for p in photos]


@router.get("/{photo_id}")
async def get_photo_metadata(photo_id: str):
    """
    Return metadata for a single photo by ID.
    The actual image file is served by FastAPI StaticFiles at /images/<filename>.
    """
    # Validate photo_id — only alphanumeric + hyphen/underscore
    import re
    if not re.match(r"^[a-zA-Z0-9_-]{1,128}$", photo_id):
        raise HTTPException(status_code=400, detail="Invalid photo ID format.")

    photo = metadata_db.get_photo(photo_id)
    if not photo:
        raise HTTPException(status_code=404, detail=f"Photo '{photo_id}' not found.")

    return photo.to_dict()


@router.post("/upload")
async def upload_photo(
    file:       UploadFile = File(...),
    session_id: str        = Form(...),
):
    """
    Accept a user-uploaded photo, tag it with Claude vision, and store temporarily.

    Privacy:
    - Stored under library/uploads/{session_id}/
    - Auto-deleted after UPLOAD_TTL_HOURS (24h default)
    - DELETE /photos/upload/{id} also available on demand
    """
    # Validate MIME type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{file.content_type}'. Use JPEG, PNG, or WEBP.",
        )

    # Read file and check size
    contents = await file.read()
    size_mb   = len(contents) / (1024 * 1024)
    if size_mb > MAX_UPLOAD_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({size_mb:.1f} MB). Maximum is {MAX_UPLOAD_MB} MB.",
        )

    # Deduplication via sha256
    import hashlib
    file_hash = hashlib.sha256(contents).hexdigest()[:16]

    # Save to disk
    photo_id  = f"upload_{file_hash}_{uuid.uuid4().hex[:8]}"
    ext       = Path(file.filename or "photo.jpg").suffix.lower() or ".jpg"
    upload_path = UPLOAD_DIR / session_id / f"{photo_id}{ext}"
    upload_path.parent.mkdir(parents=True, exist_ok=True)
    upload_path.write_bytes(contents)

    # Tag with Claude vision
    try:
        tags = _tag_upload(contents, file.content_type or "image/jpeg")
    except Exception as e:
        log.warning("Vision tagging failed for upload %s: %s", photo_id, e)
        tags = {
            "caption":         "User uploaded photo",
            "objects":         [],
            "mood_tags":       [],
            "purpose_tag":     "memory",
            "dominant_colors": [],
            "people_tags":     [],
        }

    # Set expiry
    expires = (datetime.now(timezone.utc) + timedelta(hours=UPLOAD_TTL_HRS)).isoformat()

    # Store in DB
    photo = Photo(
        id=photo_id,
        filename=f"{photo_id}{ext}",
        timestamp=datetime.now(timezone.utc).isoformat(),
        latitude=None,
        longitude=None,
        location_label="User upload",
        caption=tags.get("caption", ""),
        objects=tags.get("objects", []),
        mood_tags=tags.get("mood_tags", []),
        purpose_tag=tags.get("purpose_tag", "memory"),
        dominant_colors=tags.get("dominant_colors", []),
        people_tags=tags.get("people_tags", []),
        episode_label="User Uploads",
        is_user_upload=1,
        upload_expires=expires,
    )
    metadata_db.add_user_photo(photo)

    log.info("Upload stored: %s (%.1f MB, expires %s)", photo_id, size_mb, expires)

    return {
        "photo_id":      photo_id,
        "filename":      photo.filename,
        "expires_at":    expires,
        "caption":       photo.caption,
        "purpose_tag":   photo.purpose_tag,
        "privacy_note":  (
            "Your photo is stored temporarily on our server for this session only. "
            f"It will be automatically deleted within {UPLOAD_TTL_HRS} hours. "
            "Use the delete button to remove it immediately."
        ),
    }


@router.delete("/upload/{photo_id}")
async def delete_upload(photo_id: str):
    """
    Immediately delete a user-uploaded photo from disk and database.
    """
    import re
    if not re.match(r"^upload_[a-zA-Z0-9_-]{1,64}$", photo_id):
        raise HTTPException(status_code=400, detail="Invalid upload photo ID.")

    photo = metadata_db.get_photo(photo_id)
    if not photo or not photo.is_user_upload:
        raise HTTPException(status_code=404, detail="Upload not found.")

    # Delete file(s) from disk
    deleted_files = 0
    for f in UPLOAD_DIR.rglob(photo.filename):
        try:
            f.unlink()
            deleted_files += 1
        except OSError as e:
            log.warning("Could not delete file %s: %s", f, e)

    # Delete DB record
    metadata_db.delete_photo(photo_id)

    log.info("Upload deleted: %s (%d file(s) removed)", photo_id, deleted_files)
    return {"status": "deleted", "photo_id": photo_id}


# ── Internal: tag uploaded image with Claude vision ───────────────────────────

_UPLOAD_TAG_PROMPT = """Analyse this photo and return ONLY valid JSON:
{
  "caption": "one sentence describing what is in this photo",
  "objects": ["up to 6 specific visible things"],
  "mood_tags": ["up to 4 atmospheric words"],
  "purpose_tag": "receipt | reminder | proof | memory",
  "dominant_colors": ["up to 3 hex colors"],
  "people_tags": ["generic labels only: person, group, child — never names"]
}
Rules:
- Never extract personal names, ID numbers, or prescription details.
- For medical/pharmacy images use generic objects: ["medicine", "pills"].
- Return ONLY the JSON object, no prose."""


def _tag_upload(image_bytes: bytes, media_type: str) -> dict:
    """Auto-tag uploaded image bytes using Groq Vision or Claude."""
    import httpx, base64
    from agent.groq_client import extract_json

    img_b64 = base64.standard_b64encode(image_bytes).decode()
    groq_key = os.environ.get("GROQ_API_KEY", "")

    # 1. Try Groq Vision if GROQ_API_KEY is configured
    if groq_key:
        try:
            with httpx.Client(timeout=25.0) as http:
                payload = {
                    "model": "llama-3.2-11b-vision-preview",
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": _UPLOAD_TAG_PROMPT},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{media_type};base64,{img_b64}"
                                    },
                                },
                            ],
                        }
                    ],
                    "temperature": 0.1,
                    "max_tokens": 400,
                }
                res = http.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {groq_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                if res.status_code == 200:
                    data = res.json()
                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "{}")
                    return extract_json(content)
        except Exception as e:
            import logging
            logging.getLogger("recall.photos").warning(f"Groq vision tagging error: {e}")

    # 2. Fallback to Anthropic Claude Haiku if configured
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if anthropic_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=anthropic_key)
            resp = client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=400,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": img_b64,
                            },
                        },
                        {"type": "text", "text": _UPLOAD_TAG_PROMPT},
                    ],
                }],
            )
            return extract_json(resp.content[0].text if resp.content else "{}")
        except Exception:
            pass

    return {}
