"""
pipeline/tag_images.py
========================
Phase 1 Step 2 — Tag each image with Claude vision (run once at build time).

Reads:   pipeline/library/download_manifest.json  (from download_images.py)
         pipeline/library/raw_images/<episode_slug>/<id>.jpg

Writes:  pipeline/library/metadata.json

Usage:
    cd pipeline
    python tag_images.py

Cost estimate: ~200 images × ~$0.002 each ≈ $0.40 with claude-3-haiku-20240307.

Handles:
  - Resumption: already-tagged IDs are skipped
  - Errors:     failed images are logged to pipeline/library/tag_errors.log
  - Sensitive:  medical/document images get generic purpose labels
"""

import os
import json
import base64
import time
import re
import logging
from pathlib import Path
from dotenv import load_dotenv
import anthropic

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

# ── Config ────────────────────────────────────────────────────────────────────
ANTHROPIC_KEY    = os.environ.get("ANTHROPIC_API_KEY", "")
MANIFEST_PATH    = Path(__file__).parent / "library" / "download_manifest.json"
IMAGES_DIR       = Path(__file__).parent / "library" / "raw_images"
METADATA_OUT     = Path(__file__).parent / "library" / "metadata.json"
ERROR_LOG        = Path(__file__).parent / "library" / "tag_errors.log"
MODEL            = "claude-3-haiku-20240307"
MAX_TOKENS       = 600
REQUEST_DELAY    = 0.3   # seconds between API calls

logging.basicConfig(filename=str(ERROR_LOG), level=logging.WARNING,
                    format="%(asctime)s %(levelname)s %(message)s")

# ── Prompts ───────────────────────────────────────────────────────────────────

VISION_PROMPT = """Analyse this photo and return ONLY valid JSON (no markdown, no prose):
{
  "caption": "One sentence describing what is in this photo.",
  "objects": ["up to 8 specific visible things"],
  "mood_tags": ["up to 5 atmospheric or emotional words describing the scene"],
  "purpose_tag": "one of: receipt | reminder | proof | memory",
  "dominant_colors": ["up to 3 hex color codes like #3A5F6B"],
  "people_tags": ["generic relationship labels only if people are visible, e.g. person, group, child — never use names"]
}

Rules:
- purpose_tag is 'receipt' if it shows a bill, invoice, or receipt.
- purpose_tag is 'reminder' if it shows a document, screenshot, or note saved intentionally.
- purpose_tag is 'proof' if it shows a prescription, medical record, or official document.
- purpose_tag is 'memory' for all other photos.
- Do NOT describe personal names, ID numbers, or sensitive text.
- For medical or pharmacy images, keep objects generic: ["medicine", "pills", "bottle"].
- Return ONLY the JSON object."""

# ── Helpers ───────────────────────────────────────────────────────────────────

def load_image_b64(path: Path) -> tuple[str, str]:
    """Load image as base64; detect media type."""
    suffix = path.suffix.lower()
    media_map = {
        ".jpg":  "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png":  "image/png",
        ".webp": "image/webp",
    }
    media_type = media_map.get(suffix, "image/jpeg")
    with open(path, "rb") as f:
        return base64.standard_b64encode(f.read()).decode("utf-8"), media_type


def extract_json(text: str) -> dict:
    """Extract the first JSON object from a response that may contain extra text."""
    # Try direct parse first
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass
    # Try to find JSON block
    match = re.search(r"\{[\s\S]+\}", text)
    if match:
        return json.loads(match.group())
    raise ValueError(f"No valid JSON found in response: {text[:200]}")


def sanitise_tags(tags: dict, purpose_hint: str) -> dict:
    """
    Enforce safety rules on vision output:
    - people_tags must not contain names (only relationship words)
    - sensitive purpose images get generic object lists
    """
    safe_people_words = {
        "person", "people", "group", "man", "woman", "child", "children",
        "couple", "family", "crowd", "figure", "individual", "bride",
        "groom", "guest", "cousin", "friend",
    }
    people = [p.lower().strip() for p in tags.get("people_tags", [])]
    tags["people_tags"] = [p for p in people if p in safe_people_words]

    # Sanitise sensitive purpose images
    if tags.get("purpose_tag") in ("proof", "receipt") or purpose_hint == "proof":
        # Keep objects generic
        tags["objects"] = [
            o for o in tags.get("objects", [])
            if not any(c.isdigit() for c in o)  # drop anything with numbers
        ][:5]

    return tags


def tag_image(client: anthropic.Anthropic, image_path: Path, purpose_hint: str) -> dict:
    """Call Claude vision on a single image; return parsed tag dict."""
    img_b64, media_type = load_image_b64(image_path)
    msg = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
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
                {"type": "text", "text": VISION_PROMPT},
            ],
        }],
    )
    raw_text = msg.content[0].text
    tags = extract_json(raw_text)
    return sanitise_tags(tags, purpose_hint)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if not ANTHROPIC_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY is not set. Add it to your .env file.")

    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)

    if not MANIFEST_PATH.exists():
        raise FileNotFoundError(
            f"Download manifest not found: {MANIFEST_PATH}\n"
            "Run pipeline/download_images.py first."
        )

    manifest: list[dict] = json.loads(MANIFEST_PATH.read_text())
    print(f"▶  Loaded {len(manifest)} records from download manifest.")

    # Load existing metadata to allow resumption
    existing: dict[str, dict] = {}
    if METADATA_OUT.exists():
        for rec in json.loads(METADATA_OUT.read_text()):
            existing[rec["id"]] = rec
        print(f"   Resuming — {len(existing)} images already tagged.\n")

    results: list[dict] = list(existing.values())
    tagged_ids = set(existing.keys())
    errors = 0

    for i, record in enumerate(manifest):
        photo_id     = record["id"]
        ep_slug      = record.get("episode_slug", "everyday")
        purpose_hint = record.get("purpose_hint", "memory")

        if photo_id in tagged_ids:
            continue  # skip already-tagged

        img_path = IMAGES_DIR / ep_slug / record["filename"]
        if not img_path.exists():
            # Try flat layout fallback
            img_path = IMAGES_DIR / record["filename"]
        if not img_path.exists():
            logging.warning(f"Image file not found: {photo_id} — {img_path}")
            errors += 1
            continue

        print(f"[{i+1}/{len(manifest)}] Tagging {photo_id} ({record.get('episode_label','?')})…", end=" ")

        try:
            tags = tag_image(client, img_path, purpose_hint)

            # Merge manifest metadata with vision tags
            full_record = {
                "id":             photo_id,
                "filename":       record["filename"],
                "timestamp":      record.get("timestamp", "2023-01-01T12:00:00"),
                "latitude":       record.get("latitude"),
                "longitude":      record.get("longitude"),
                "location_label": record.get("location_label", ""),
                "episode_label":  record.get("episode_label", "Everyday"),
                "caption":        tags.get("caption", ""),
                "objects":        tags.get("objects", []),
                "mood_tags":      tags.get("mood_tags", []),
                "purpose_tag":    tags.get("purpose_tag", purpose_hint if purpose_hint != "mixed" else "memory"),
                "dominant_colors": tags.get("dominant_colors", []),
                "people_tags":    tags.get("people_tags", []),
                "tagging_error":  False,
            }

            results.append(full_record)
            tagged_ids.add(photo_id)
            print("✅")

        except Exception as e:
            logging.warning(f"Tagging failed for {photo_id}: {e}")
            print(f"⚠️  Error — {e}")
            errors += 1

            # Add a stub record so the image isn't silently dropped
            results.append({
                "id":             photo_id,
                "filename":       record["filename"],
                "timestamp":      record.get("timestamp", "2023-01-01T12:00:00"),
                "latitude":       record.get("latitude"),
                "longitude":      record.get("longitude"),
                "location_label": record.get("location_label", ""),
                "episode_label":  record.get("episode_label", "Everyday"),
                "caption":        "",
                "objects":        [],
                "mood_tags":      [],
                "purpose_tag":    purpose_hint if purpose_hint != "mixed" else "memory",
                "dominant_colors": [],
                "people_tags":    [],
                "tagging_error":  True,
            })

        # Save incrementally every 10 images (crash recovery)
        if len(results) % 10 == 0:
            METADATA_OUT.write_text(json.dumps(results, indent=2))

        time.sleep(REQUEST_DELAY)

    # Final save
    METADATA_OUT.write_text(json.dumps(results, indent=2))

    success = len(results) - errors
    print(f"\n✅  Tagging complete.")
    print(f"   Tagged:  {success}")
    print(f"   Errors:  {errors} (see {ERROR_LOG})")
    print(f"   Output:  {METADATA_OUT}")


if __name__ == "__main__":
    main()
