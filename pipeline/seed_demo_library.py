"""
pipeline/seed_demo_library.py
==============================
Seeds backend/storage/metadata.db with high-fidelity demo photos across the 6 episodes
and everyday life scenarios, plus generates lightweight image assets in backend/library/images.

Usage:
    & "C:\\Users\\Public\\Python311\\python.exe" pipeline/seed_demo_library.py
"""

import sqlite3
import json
from pathlib import Path

# Paths
DB_PATH = Path(__file__).parent.parent / "backend" / "storage" / "metadata.db"
IMAGES_DIR = Path(__file__).parent.parent / "backend" / "library" / "images"

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

CREATE VIRTUAL TABLE IF NOT EXISTS photos_fts
    USING fts5(id UNINDEXED, caption, objects, location_label, episode_label);
"""

PHOTOS_DATA = [
    # ── Episode 1: Kyoto Cafes & Receipts (Nov 2023) ──
    {
        "id": "kyoto_01",
        "filename": "kyoto_01.jpg",
        "timestamp": "2023-11-12T14:22:10",
        "latitude": 35.0116,
        "longitude": 135.7681,
        "location_label": "Kyoto, Japan",
        "caption": "Paper coffee receipt on warm wooden cafe table with espresso cup and coin change",
        "objects": ["receipt", "coffee", "cup", "table", "paper", "espresso", "wood"],
        "mood_tags": ["cozy", "warm", "travel", "quiet"],
        "purpose_tag": "receipt",
        "dominant_colors": ["#4A3728", "#D4A373", "#FAEDCD"],
        "people_tags": [],
        "episode_label": "Kyoto Cafes & Receipts",
    },
    {
        "id": "kyoto_02",
        "filename": "kyoto_02.jpg",
        "timestamp": "2023-11-12T15:10:00",
        "latitude": 35.0037,
        "longitude": 135.7772,
        "location_label": "Gion, Kyoto",
        "caption": "Delicate swan latte art foam in ceramic mug at traditional kissaten",
        "objects": ["coffee", "latte art", "cup", "cafe", "saucer"],
        "mood_tags": ["serene", "cozy", "artistic"],
        "purpose_tag": "memory",
        "dominant_colors": ["#3D2B1F", "#E6CCB2", "#EDE0D4"],
        "people_tags": [],
        "episode_label": "Kyoto Cafes & Receipts",
    },
    {
        "id": "kyoto_03",
        "filename": "kyoto_03.jpg",
        "timestamp": "2023-11-14T11:45:30",
        "latitude": 35.0050,
        "longitude": 135.7650,
        "location_label": "Nishiki Market, Kyoto",
        "caption": "Handwritten cafe menu bill beside green matcha parfait dessert",
        "objects": ["receipt", "menu", "bill", "matcha", "dessert", "spoon"],
        "mood_tags": ["travel", "sweet"],
        "purpose_tag": "receipt",
        "dominant_colors": ["#2D5A27", "#F7E1D7", "#4A5859"],
        "people_tags": [],
        "episode_label": "Kyoto Cafes & Receipts",
    },
    {
        "id": "kyoto_04",
        "filename": "kyoto_04.jpg",
        "timestamp": "2023-11-15T09:30:15",
        "latitude": 35.0120,
        "longitude": 135.7690,
        "location_label": "Kyoto, Japan",
        "caption": "Exterior facade of historic machiya wooden townhouse turned specialty coffee roastery",
        "objects": ["building", "signboard", "street", "wooden house", "lantern"],
        "mood_tags": ["historic", "peaceful"],
        "purpose_tag": "memory",
        "dominant_colors": ["#2B2D42", "#8D99AE", "#EDF2F4"],
        "people_tags": [],
        "episode_label": "Kyoto Cafes & Receipts",
    },
    {
        "id": "kyoto_05",
        "filename": "kyoto_05.jpg",
        "timestamp": "2023-11-16T18:05:40",
        "latitude": 35.0080,
        "longitude": 135.7720,
        "location_label": "Pontocho Alley, Kyoto",
        "caption": "Rainy evening reflections on wet cobblestone alley with warm paper lanterns and transparent umbrella",
        "objects": ["rain", "street", "umbrella", "lantern", "cobblestone"],
        "mood_tags": ["rainy", "evening", "atmospheric"],
        "purpose_tag": "memory",
        "dominant_colors": ["#1A1B2F", "#D97706", "#2563EB"],
        "people_tags": [],
        "episode_label": "Kyoto Cafes & Receipts",
    },

    # ── Episode 2: Sick Week & Pharmacy (Jan 2024) ──
    {
        "id": "sick_01",
        "filename": "sick_01.jpg",
        "timestamp": "2024-01-09T08:15:20",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "location_label": "Home, Mumbai",
        "caption": "Prescription medicine box with antibiotic blister pack and cough syrup bottle on bedside nightstand",
        "objects": ["medicine", "prescription", "pills", "blister pack", "box", "table", "bottle"],
        "mood_tags": ["sick", "resting", "quiet"],
        "purpose_tag": "reminder",
        "dominant_colors": ["#1E293B", "#38BDF8", "#F1F5F9"],
        "people_tags": [],
        "episode_label": "Sick Week & Pharmacy",
    },
    {
        "id": "sick_02",
        "filename": "sick_02.jpg",
        "timestamp": "2024-01-10T11:30:45",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "location_label": "Home, Mumbai",
        "caption": "Digital thermometer showing 101.4 F next to hot ginger honey lemon tea mug and tissue box",
        "objects": ["thermometer", "tea", "mug", "temperature", "tissues"],
        "mood_tags": ["fever", "recovering", "warm"],
        "purpose_tag": "memory",
        "dominant_colors": ["#D97706", "#FDE68A", "#78350F"],
        "people_tags": [],
        "episode_label": "Sick Week & Pharmacy",
    },
    {
        "id": "sick_03",
        "filename": "sick_03.jpg",
        "timestamp": "2024-01-11T16:40:10",
        "latitude": 19.0596,
        "longitude": 72.8295,
        "location_label": "Apollo Pharmacy, Bandra",
        "caption": "Pharmacy counter receipt and medical bill with dosage instructions circled in red pen",
        "objects": ["pharmacy", "receipt", "bill", "paper", "medicine", "pen"],
        "mood_tags": ["errands", "clinical"],
        "purpose_tag": "receipt",
        "dominant_colors": ["#047857", "#ECFDF5", "#065F46"],
        "people_tags": [],
        "episode_label": "Sick Week & Pharmacy",
    },
    {
        "id": "sick_04",
        "filename": "sick_04.jpg",
        "timestamp": "2024-01-13T15:20:00",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "location_label": "Home, Mumbai",
        "caption": "Sunlight streaming over cozy fleece duvet and bedside stack of paperback books on recovery day",
        "objects": ["blanket", "bed", "book", "pillow", "window"],
        "mood_tags": ["rest", "peaceful", "recovery"],
        "purpose_tag": "memory",
        "dominant_colors": ["#F8FAFC", "#94A3B8", "#64748B"],
        "people_tags": [],
        "episode_label": "Sick Week & Pharmacy",
    },

    # ── Episode 3: Job Change & Resignation (Mar 2023) ──
    {
        "id": "job_01",
        "filename": "job_01.jpg",
        "timestamp": "2023-03-03T17:45:00",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "location_label": "Office, Bengaluru",
        "caption": "Screenshot of official resignation email draft and signed employment offer letter on laptop screen",
        "objects": ["screenshot", "email", "laptop", "screen", "document", "offer letter"],
        "mood_tags": ["milestone", "excited", "nervous"],
        "purpose_tag": "screenshot",
        "dominant_colors": ["#0F172A", "#3B82F6", "#E2E8F0"],
        "people_tags": [],
        "episode_label": "Job Change & Resignation",
    },
    {
        "id": "job_02",
        "filename": "job_02.jpg",
        "timestamp": "2023-03-14T18:30:15",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "location_label": "Office, Bengaluru",
        "caption": "Clean empty wooden desk on last working day with turned-in badge, laptop, and farewell card",
        "objects": ["desk", "laptop", "badge", "chair", "office", "farewell"],
        "mood_tags": ["bittersweet", "milestone"],
        "purpose_tag": "memory",
        "dominant_colors": ["#334155", "#CBD5E1", "#64748B"],
        "people_tags": [],
        "episode_label": "Job Change & Resignation",
    },
    {
        "id": "job_03",
        "filename": "job_03.jpg",
        "timestamp": "2023-03-14T20:15:00",
        "latitude": 12.9784,
        "longitude": 77.6408,
        "location_label": "Indiranagar, Bengaluru",
        "caption": "Team farewell dinner with craft beers, burgers, and handwritten group goodbye card",
        "objects": ["dinner", "beer", "card", "table", "celebration", "food"],
        "mood_tags": ["grateful", "celebration", "festive"],
        "purpose_tag": "memory",
        "dominant_colors": ["#B45309", "#FEF3C7", "#78350F"],
        "people_tags": ["coworkers"],
        "episode_label": "Job Change & Resignation",
    },
    {
        "id": "job_04",
        "filename": "job_04.jpg",
        "timestamp": "2023-03-20T09:15:30",
        "latitude": 12.9352,
        "longitude": 77.6245,
        "location_label": "Koramangala, Bengaluru",
        "caption": "First day morning celebration double espresso on sunny rooftop cafe overlooking tech park",
        "objects": ["coffee", "espresso", "rooftop", "mug", "sunglasses"],
        "mood_tags": ["fresh start", "energetic", "optimistic"],
        "purpose_tag": "memory",
        "dominant_colors": ["#1D4ED8", "#DBEAFE", "#F59E0B"],
        "people_tags": [],
        "episode_label": "Job Change & Resignation",
    },

    # ── Episode 4: Cousin's Wedding Celebration (Dec 2023) ──
    {
        "id": "wedding_01",
        "filename": "wedding_01.jpg",
        "timestamp": "2023-12-21T21:45:00",
        "latitude": 26.9124,
        "longitude": 75.7873,
        "location_label": "Jaipur, Rajasthan",
        "caption": "Mom cutting three-tier floral celebration cake under glowing golden fairy lights and chandeliers in garden pavilion",
        "objects": ["cake", "fairy lights", "mom", "flowers", "knife", "celebration", "night"],
        "mood_tags": ["joyful", "festive", "evening", "celebratory"],
        "purpose_tag": "memory",
        "dominant_colors": ["#7C2D12", "#FDE047", "#EA580C"],
        "people_tags": ["mom", "family"],
        "episode_label": "Cousin's Wedding Celebration",
    },
    {
        "id": "wedding_02",
        "filename": "wedding_02.jpg",
        "timestamp": "2023-12-21T18:15:10",
        "latitude": 26.9124,
        "longitude": 75.7873,
        "location_label": "Jaipur, Rajasthan",
        "caption": "Grand heritage palace courtyard decorated with thousands of yellow marigold curtains and brass oil lamps",
        "objects": ["palace", "lanterns", "marigolds", "courtyard", "decorations"],
        "mood_tags": ["royal", "festive", "traditional"],
        "purpose_tag": "memory",
        "dominant_colors": ["#E11D48", "#FBBF24", "#831843"],
        "people_tags": [],
        "episode_label": "Cousin's Wedding Celebration",
    },
    {
        "id": "wedding_03",
        "filename": "wedding_03.jpg",
        "timestamp": "2023-12-22T19:30:00",
        "latitude": 26.9124,
        "longitude": 75.7873,
        "location_label": "Jaipur, Rajasthan",
        "caption": "Large family smiling in colorful silk brocade lehengas and embroidered sherwanis on grand banquet stage",
        "objects": ["family", "people", "wedding", "saree", "sherwani", "stage"],
        "mood_tags": ["family", "happy", "glamorous"],
        "purpose_tag": "memory",
        "dominant_colors": ["#BE123C", "#FDE047", "#1E1B4B"],
        "people_tags": ["family", "cousins"],
        "episode_label": "Cousin's Wedding Celebration",
    },
    {
        "id": "wedding_04",
        "filename": "wedding_04.jpg",
        "timestamp": "2023-12-22T22:15:40",
        "latitude": 26.9124,
        "longitude": 75.7873,
        "location_label": "Jaipur, Rajasthan",
        "caption": "Bride and groom exchanging fragrant red rose and white jasmine varmala garlands amidst flower showers",
        "objects": ["bride", "groom", "garland", "stage", "flowers", "rose"],
        "mood_tags": ["ceremonial", "emotional", "romantic"],
        "purpose_tag": "memory",
        "dominant_colors": ["#991B1B", "#FEF2F2", "#D97706"],
        "people_tags": ["bride", "groom"],
        "episode_label": "Cousin's Wedding Celebration",
    },

    # ── Episode 5: Beach Day & Sunset Dinner (Oct 2023) ──
    {
        "id": "beach_01",
        "filename": "beach_01.jpg",
        "timestamp": "2023-10-14T20:15:00",
        "latitude": 19.0989,
        "longitude": 72.8267,
        "location_label": "Juhu Beach, Mumbai",
        "caption": "Grilled garlic butter seafood platter and iced lemon drinks on candlelit outdoor seaside restaurant patio at dusk right after beach",
        "objects": ["seafood", "dinner", "plate", "restaurant", "patio", "prawns", "candle"],
        "mood_tags": ["relaxed", "delicious", "dusk", "beach vibes"],
        "purpose_tag": "memory",
        "dominant_colors": ["#0284C7", "#F97316", "#0F172A"],
        "people_tags": [],
        "episode_label": "Beach Day & Sunset Dinner",
    },
    {
        "id": "beach_02",
        "filename": "beach_02.jpg",
        "timestamp": "2023-10-14T18:20:10",
        "latitude": 19.0989,
        "longitude": 72.8267,
        "location_label": "Juhu Beach, Mumbai",
        "caption": "Golden sunset sky reflecting over gentle tidal waves and damp sand shoreline with walking footprints",
        "objects": ["beach", "sunset", "ocean", "waves", "sand", "sky"],
        "mood_tags": ["golden hour", "peaceful", "serene"],
        "purpose_tag": "memory",
        "dominant_colors": ["#EA580C", "#FDE047", "#0369A1"],
        "people_tags": [],
        "episode_label": "Beach Day & Sunset Dinner",
    },
    {
        "id": "beach_03",
        "filename": "beach_03.jpg",
        "timestamp": "2023-10-14T16:45:00",
        "latitude": 19.0989,
        "longitude": 72.8267,
        "location_label": "Juhu Beach, Mumbai",
        "caption": "Beach vendor cart piled with fresh green tender coconuts with red straws and sea breeze",
        "objects": ["coconut", "cart", "beach", "straw", "fruit"],
        "mood_tags": ["refreshing", "summer", "sunny"],
        "purpose_tag": "memory",
        "dominant_colors": ["#15803D", "#86EFAC", "#0284C7"],
        "people_tags": [],
        "episode_label": "Beach Day & Sunset Dinner",
    },

    # ── Episode 6: Iceland Road Trip & Flat Tire (Aug 2023) ──
    {
        "id": "iceland_01",
        "filename": "iceland_01.jpg",
        "timestamp": "2023-08-18T14:10:00",
        "latitude": 63.5320,
        "longitude": -19.5113,
        "location_label": "Ring Road, Iceland",
        "caption": "Rental 4x4 SUV with flat tire pulled onto black volcanic gravel road shoulder against misty green mountain slope",
        "objects": ["car", "flat tire", "wheel", "gravel", "road", "rental", "mountain", "suv"],
        "mood_tags": ["adventure", "mishap", "rugged"],
        "purpose_tag": "memory",
        "dominant_colors": ["#18181B", "#4D7C0F", "#71717A"],
        "people_tags": [],
        "episode_label": "Iceland Road Trip",
    },
    {
        "id": "iceland_02",
        "filename": "iceland_02.jpg",
        "timestamp": "2023-08-18T15:30:20",
        "latitude": 63.5320,
        "longitude": -19.5113,
        "location_label": "Ring Road, Iceland",
        "caption": "Hydraulic tire jack lifting rental car wheel hub with lug wrench and spare tire lying on gravel",
        "objects": ["car", "jack", "tools", "spare tire", "wheel", "gravel"],
        "mood_tags": ["repair", "road trip"],
        "purpose_tag": "memory",
        "dominant_colors": ["#DC2626", "#27272A", "#9CA3AF"],
        "people_tags": [],
        "episode_label": "Iceland Road Trip",
    },
    {
        "id": "iceland_03",
        "filename": "iceland_03.jpg",
        "timestamp": "2023-08-19T10:15:00",
        "latitude": 64.1466,
        "longitude": -21.9426,
        "location_label": "Reykjavik, Iceland",
        "caption": "Rental car repair invoice receipt and roadside assistance paperwork resting on vehicle steering wheel",
        "objects": ["receipt", "invoice", "paper", "rental car", "steering wheel"],
        "mood_tags": ["paperwork", "travel"],
        "purpose_tag": "receipt",
        "dominant_colors": ["#1E293B", "#F8FAFC", "#475569"],
        "people_tags": [],
        "episode_label": "Iceland Road Trip",
    },

    # ── Episode 7: Everyday Moments & Smart Clues (2023-2024) ──
    {
        "id": "everyday_01",
        "filename": "everyday_01.jpg",
        "timestamp": "2023-09-05T19:30:00",
        "latitude": 19.0596,
        "longitude": 72.8295,
        "location_label": "Bandra, Mumbai",
        "caption": "Yellow sticky note with WiFi network SSID and password stuck to stainless steel refrigerator door in Airbnb",
        "objects": ["sticky note", "wifi", "password", "refrigerator", "note", "paper", "airbnb"],
        "mood_tags": ["practical", "travel", "clever"],
        "purpose_tag": "reminder",
        "dominant_colors": ["#CA8A04", "#FEF08A", "#64748B"],
        "people_tags": [],
        "episode_label": "Everyday Moments",
    },
    {
        "id": "everyday_02",
        "filename": "everyday_02.jpg",
        "timestamp": "2023-11-28T17:15:00",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "location_label": "Oval Maidan, Mumbai",
        "caption": "Energetic white Samoyed dog leaping high to catch bright red frisbee disk against golden sunset grass",
        "objects": ["dog", "white dog", "frisbee", "red frisbee", "park", "grass", "sunset"],
        "mood_tags": ["playful", "active", "happy", "golden hour"],
        "purpose_tag": "memory",
        "dominant_colors": ["#DC2626", "#15803D", "#FDE047"],
        "people_tags": [],
        "episode_label": "Everyday Moments",
    },
    {
        "id": "everyday_03",
        "filename": "everyday_03.jpg",
        "timestamp": "2024-02-14T11:20:00",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "location_label": "Nature's Basket, Mumbai",
        "caption": "Supermarket grocery cash register paper receipt itemizing fresh produce, sourdough bread, and olive oil",
        "objects": ["grocery", "receipt", "supermarket", "countertop", "bill", "paper"],
        "mood_tags": ["daily", "errands"],
        "purpose_tag": "receipt",
        "dominant_colors": ["#334155", "#F1F5F9", "#0F766E"],
        "people_tags": [],
        "episode_label": "Everyday Moments",
    },
    {
        "id": "everyday_04",
        "filename": "everyday_04.jpg",
        "timestamp": "2024-03-01T15:45:00",
        "latitude": 19.0728,
        "longitude": 72.8331,
        "location_label": "Kala Ghoda Cafe, Mumbai",
        "caption": "Open hardcover sketchbook with architectural ink drawing and brass fountain pen on weathered teak cafe table",
        "objects": ["sketchbook", "pen", "coffee", "cappuccino", "notebook", "drawing"],
        "mood_tags": ["creative", "focus", "artistic"],
        "purpose_tag": "memory",
        "dominant_colors": ["#78350F", "#FEF3C7", "#1C1917"],
        "people_tags": [],
        "episode_label": "Everyday Moments",
    },
    {
        "id": "everyday_05",
        "filename": "everyday_05.jpg",
        "timestamp": "2024-04-10T20:00:00",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "location_label": "Home, Mumbai",
        "caption": "Steaming bowl of spicy homemade ramen with soft boiled ramen egg, scallions, and nori seaweed",
        "objects": ["ramen", "bowl", "food", "egg", "noodles", "chopsticks"],
        "mood_tags": ["delicious", "comfort food", "home"],
        "purpose_tag": "memory",
        "dominant_colors": ["#B91C1C", "#F59E0B", "#18181B"],
        "people_tags": [],
        "episode_label": "Everyday Moments",
    },
]


def create_minimal_svg(photo: dict) -> str:
    """Generate a clean, aesthetic SVG banner for the photo."""
    colors = photo.get("dominant_colors", ["#2563EB", "#1E293B"])
    c1 = colors[0] if len(colors) > 0 else "#1E293B"
    c2 = colors[1] if len(colors) > 1 else "#3B82F6"
    
    caption = photo.get("caption", "Photo")
    short_caption = caption[:45] + ("…" if len(caption) > 45 else "")
    episode = photo.get("episode_label", "")
    date_str = photo.get("timestamp", "")[:10]
    loc = photo.get("location_label", "")
    purpose = photo.get("purpose_tag", "memory").upper()

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="100%" height="100%">
  <defs>
    <linearGradient id="grad-{photo['id']}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{c1}" />
      <stop offset="100%" stop-color="{c2}" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="600" height="450" fill="url(#grad-{photo['id']})" />
  
  <!-- Subtle pattern grid -->
  <g opacity="0.08" stroke="#ffffff" stroke-width="1.5">
    <line x1="0" y1="150" x2="600" y2="150" />
    <line x1="0" y1="300" x2="600" y2="300" />
    <line x1="200" y1="0" x2="200" y2="450" />
    <line x1="400" y1="0" x2="400" y2="450" />
  </g>

  <!-- Content Card overlay -->
  <rect x="36" y="240" width="528" height="174" rx="14" fill="#0f172a" fill-opacity="0.82" filter="url(#shadow)" stroke="#ffffff" stroke-opacity="0.12" />

  <!-- Badge -->
  <rect x="56" y="260" width="90" height="24" rx="6" fill="#3b82f6" fill-opacity="0.9" />
  <text x="101" y="276" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="11" font-weight="700" text-anchor="middle" letter-spacing="1">
    {purpose}
  </text>

  <!-- Episode & Date -->
  <text x="156" y="276" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="12" font-weight="500">
    {episode} • {date_str}
  </text>

  <!-- Main caption -->
  <text x="56" y="315" fill="#f8fafc" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="17" font-weight="600">
    {short_caption}
  </text>

  <!-- Location badge -->
  <text x="56" y="375" fill="#38bdf8" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="13" font-weight="500">
    📍 {loc}
  </text>
  
  <text x="544" y="375" fill="#94a3b8" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="12" font-weight="500" text-anchor="end">
    Google Photos • Recall
  </text>
</svg>
"""
    return svg


def main():
    print(f">> Target DB: {DB_PATH}")
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(DB_PATH))
    conn.executescript(SCHEMA_SQL)

    # Insert into photos and photos_fts
    insert_photo_sql = """
    INSERT OR REPLACE INTO photos
        (id, filename, timestamp, latitude, longitude, location_label,
         caption, objects, mood_tags, purpose_tag, dominant_colors,
         people_tags, episode_label, is_user_upload, upload_expires)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)
    """

    insert_fts_sql = """
    INSERT OR REPLACE INTO photos_fts
        (id, caption, objects, location_label, episode_label)
    VALUES (?, ?, ?, ?, ?)
    """

    count = 0
    for p in PHOTOS_DATA:
        objects_json = json.dumps(p["objects"])
        mood_json = json.dumps(p["mood_tags"])
        colors_json = json.dumps(p["dominant_colors"])
        people_json = json.dumps(p["people_tags"])

        conn.execute(
            insert_photo_sql,
            (
                p["id"],
                p["filename"],
                p["timestamp"],
                p["latitude"],
                p["longitude"],
                p["location_label"],
                p["caption"],
                objects_json,
                mood_json,
                p["purpose_tag"],
                colors_json,
                people_json,
                p["episode_label"],
            ),
        )

        conn.execute(
            insert_fts_sql,
            (
                p["id"],
                p["caption"],
                " ".join(p["objects"]),
                p["location_label"],
                p["episode_label"],
            ),
        )

        # Write corresponding SVG image file
        svg_content = create_minimal_svg(p)
        img_svg_path = IMAGES_DIR / f"{p['id']}.svg"
        img_svg_path.write_text(svg_content, encoding="utf-8")
        
        # Also write .jpg file as SVG text (FastAPI StaticFiles serves it directly or SVG browser loads)
        img_jpg_path = IMAGES_DIR / p["filename"]
        img_jpg_path.write_text(svg_content, encoding="utf-8")

        count += 1

    conn.commit()
    conn.close()

    print(f"[OK] Successfully seeded {count} photos into {DB_PATH}")
    print(f"[OK] Generated {count} images in {IMAGES_DIR}")


if __name__ == "__main__":
    main()
