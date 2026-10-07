"""
pipeline/download_images.py
============================
Phase 1 Step 1 — Download demo library images from Unsplash.

Usage:
    cd pipeline
    python download_images.py

Requires:
    UNSPLASH_KEY environment variable (Unsplash API access key).
    Get a free key at https://unsplash.com/developers

Output:
    pipeline/library/raw_images/<episode_slug>/<photo_id>.jpg
    pipeline/library/download_manifest.json  (maps photo_id → episode metadata)
"""

import os
import json
import time
import uuid
import hashlib
import requests
from pathlib import Path
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

# ── Config ────────────────────────────────────────────────────────────────────
UNSPLASH_KEY   = os.environ.get("UNSPLASH_KEY", "")
MANIFEST_PATH  = Path(__file__).parent / "episode_manifest.json"
OUT_DIR        = Path(__file__).parent / "library" / "raw_images"
DOWNLOAD_LOG   = Path(__file__).parent / "library" / "download_manifest.json"
UNSPLASH_URL   = "https://api.unsplash.com/photos/random"
REQUEST_DELAY  = 0.5   # seconds between API calls (rate limit: 50/hr free tier)
MAX_PER_QUERY  = 10    # Unsplash free tier allows max 30; keep conservative


# ── Helpers ───────────────────────────────────────────────────────────────────

def slug(label: str) -> str:
    return label.lower().replace(" ", "_").replace("'", "").replace(",", "")


def random_datetime_in_range(date_from: str, date_to: str) -> str:
    """Generate a random ISO datetime within a date range."""
    d0 = datetime.fromisoformat(date_from)
    d1 = datetime.fromisoformat(date_to)
    delta_seconds = int((d1 - d0).total_seconds())
    random_offset = int(hashlib.sha1(os.urandom(4)).hexdigest(), 16) % max(delta_seconds, 1)
    result = d0 + timedelta(seconds=random_offset)
    # Add a realistic time-of-day (8am–9pm)
    hour = 8 + (random_offset % 13)
    minute = random_offset % 60
    return result.replace(hour=hour, minute=minute, second=0).isoformat()


def fetch_unsplash_batch(query: str, count: int) -> list[dict]:
    """Fetch up to `count` photo metadata objects from Unsplash."""
    if not UNSPLASH_KEY:
        print("  ⚠️  UNSPLASH_KEY not set — skipping Unsplash download.")
        return []
    photos = []
    remaining = count
    while remaining > 0:
        batch = min(remaining, MAX_PER_QUERY)
        try:
            r = requests.get(
                UNSPLASH_URL,
                params={"query": query, "count": batch, "client_id": UNSPLASH_KEY},
                timeout=15,
            )
            if r.status_code == 403:
                print("  ❌  Unsplash API rate limit hit. Wait an hour or upgrade plan.")
                break
            r.raise_for_status()
            photos.extend(r.json())
            remaining -= batch
            time.sleep(REQUEST_DELAY)
        except Exception as e:
            print(f"  ⚠️  Unsplash fetch error for '{query}': {e}")
            break
    return photos


def download_image(url: str, dest: Path) -> bool:
    """Download a single image. Returns True on success."""
    try:
        r = requests.get(url, timeout=30, stream=True)
        r.raise_for_status()
        dest.parent.mkdir(parents=True, exist_ok=True)
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        return True
    except Exception as e:
        print(f"  ⚠️  Download failed for {url}: {e}")
        return False


# ── Purpose tag assignment ────────────────────────────────────────────────────

PURPOSE_KEYWORDS = {
    "receipt":  ["receipt", "bill", "invoice", "grocery"],
    "reminder": ["document", "paper", "letter", "laptop", "screen", "notification", "office"],
    "proof":    ["prescription", "pharmacy", "medical"],
    "memory":   [],  # default
}


def infer_purpose(query: str, hint: str) -> str:
    if hint == "mixed":
        q_lower = query.lower()
        for tag, keywords in PURPOSE_KEYWORDS.items():
            if any(k in q_lower for k in keywords):
                return tag
        return "memory"
    if hint in ("receipt", "reminder", "proof", "memory"):
        return hint
    return "memory"


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    episodes = json.loads(MANIFEST_PATH.read_text())
    all_records: list[dict] = []

    # Load existing download log to allow resumption
    existing_ids: set[str] = set()
    if DOWNLOAD_LOG.exists():
        existing = json.loads(DOWNLOAD_LOG.read_text())
        existing_ids = {r["id"] for r in existing}
        all_records = existing
        print(f"▶  Resuming — {len(existing_ids)} images already downloaded.\n")

    for episode in episodes:
        ep_label   = episode["label"]
        ep_slug    = slug(ep_label)
        ep_count   = episode["count"]
        ep_queries = episode["queries"]
        date_from  = episode["date_range"]["from"]
        date_to    = episode["date_range"]["to"]
        ep_loc     = episode["location"]
        ep_lat     = episode["latitude"]
        ep_lng     = episode["longitude"]
        ep_purpose = episode["purpose_hint"]

        ep_dir = OUT_DIR / ep_slug
        ep_dir.mkdir(parents=True, exist_ok=True)

        # How many images per query (distribute evenly)
        per_query = max(1, ep_count // len(ep_queries))
        downloaded_this_ep = 0

        print(f"📁  Episode: {ep_label} (target: {ep_count} photos)")

        for query in ep_queries:
            if downloaded_this_ep >= ep_count:
                break

            need = min(per_query, ep_count - downloaded_this_ep)
            print(f"   🔍  Query: '{query}' → fetching {need} photos")
            photos = fetch_unsplash_batch(query, need)

            for photo in photos:
                if downloaded_this_ep >= ep_count:
                    break

                photo_id = photo.get("id", str(uuid.uuid4()))
                if photo_id in existing_ids:
                    continue  # already downloaded

                img_url  = photo.get("urls", {}).get("regular", "")
                if not img_url:
                    continue

                dest_path = ep_dir / f"{photo_id}.jpg"
                success   = download_image(img_url, dest_path)
                if not success:
                    continue

                purpose = infer_purpose(query, ep_purpose)

                record = {
                    "id":             photo_id,
                    "filename":       f"{photo_id}.jpg",
                    "episode_slug":   ep_slug,
                    "episode_label":  ep_label,
                    "timestamp":      random_datetime_in_range(date_from, date_to),
                    "latitude":       ep_lat,
                    "longitude":      ep_lng,
                    "location_label": ep_loc,
                    "purpose_hint":   purpose,
                    "source_url":     img_url,
                    "unsplash_id":    photo_id,
                    "rel_path":       str(dest_path.relative_to(OUT_DIR.parent)),
                }
                all_records.append(record)
                existing_ids.add(photo_id)
                downloaded_this_ep += 1
                print(f"      ✅  {photo_id}.jpg ({downloaded_this_ep}/{ep_count})")

        print(f"   → Downloaded {downloaded_this_ep} images for '{ep_label}'\n")

    # Save download manifest
    DOWNLOAD_LOG.parent.mkdir(parents=True, exist_ok=True)
    DOWNLOAD_LOG.write_text(json.dumps(all_records, indent=2))
    print(f"✅  Download complete. {len(all_records)} total images.")
    print(f"   Manifest saved to: {DOWNLOAD_LOG}")
    print("\n⚠️  If UNSPLASH_KEY was not set, place images manually in:")
    print(f"   {OUT_DIR}/<episode_slug>/<any_name>.jpg")
    print("   Then re-run this script to generate the download manifest.\n")


if __name__ == "__main__":
    main()
