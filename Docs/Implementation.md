# 🚀 Implementation Plan — "Recall" AI-Native Retrieval Agent

> **Project:** Recall MVP · **Based on:** [`Architecture.md`](./Architecture.md)  
> **Total Estimated Duration:** ~5–6 weeks (solo dev) · ~3 weeks (2-person team)

---

## Overview

The implementation is divided into **6 sequential phases**, each building on the previous and ending with a testable checkpoint. No phase assumes the next is complete.

```
Phase 0 ── Project Bootstrap & Environment Setup         (Day 1–2)
Phase 1 ── Build-Time Data Pipeline                      (Day 3–6)
Phase 2 ── Backend Core: API + Storage + Agent Loop      (Day 7–14)
Phase 3 ── Frontend Core: UI Shell + Recall Flow         (Day 15–22)
Phase 4 ── Baseline Mode + Session Logging & Export      (Day 23–26)
Phase 5 ── Integration, QA & Deployment                  (Day 27–32)
Phase 6 ── User Testing Readiness & Handoff              (Day 33–35)
```

---

## Phase 0 — Project Bootstrap & Environment Setup

> **Duration:** 2 days · **Goal:** Repo, tooling, and API credentials ready to go

### 0.1 Repository Scaffold

```bash
mkdir recall && cd recall
git init

# Create top-level folder structure
mkdir -p frontend backend pipeline docs

# Initialise frontend
cd frontend && npx create-next-app@latest . --typescript --app --tailwind=false --eslint
cd ..

# Initialise backend
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install fastapi uvicorn anthropic chromadb sentence-transformers
pip freeze > requirements.txt
cd ..

# Initialise pipeline
cd pipeline
pip install anthropic pillow requests tqdm
pip freeze > requirements.txt
cd ..
```

### 0.2 Environment Files

Create `.env.example` at the project root:

```env
# Backend
ANTHROPIC_API_KEY=sk-ant-...
VISION_API_KEY=                  # Only needed for pipeline tagging step
MAX_UPLOAD_MB=10
UPLOAD_TTL_HOURS=24
CHROMA_PERSIST_DIR=./storage/chroma

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Copy `.env.example` → `.env` locally; **never commit `.env`**.

### 0.3 Checklist

- [ ] Repo initialised with `frontend/`, `backend/`, `pipeline/`, `docs/`
- [ ] `.gitignore` excludes `.env`, `*.db`, `chroma/`, `library/images/`
- [ ] `ANTHROPIC_API_KEY` obtained and verified (`claude-3-haiku-20240307`)
- [ ] `VISION_API_KEY` obtained (Google Vision API or OpenAI GPT-4o vision)
- [ ] Both servers start locally without errors:
  - `cd frontend && npm run dev` → `http://localhost:3000`
  - `cd backend && uvicorn main:app --reload` → `http://localhost:8000`
- [ ] `README.md` skeleton committed (setup steps to be filled in Phase 5)

---

## Phase 1 — Build-Time Data Pipeline

> **Duration:** 4 days · **Goal:** Demo library of 200 tagged photos, indexed in SQLite + ChromaDB

This phase runs **once** at build time. The outputs feed every subsequent phase.

### 1.1 Assemble the Raw Image Library

**Target:** 200 images across 6 episodes.

| Episode | # Photos | Source |
|---------|---------|--------|
| `Goa Trip Nov 2023` | 40 | Unsplash: cafes, beaches, rain, restaurants |
| `Sick Week Jan 2024` | 20 | Unsplash: medicine, pharmacy, home interiors |
| `Job Change Mar 2023` | 15 | Screenshots: offer letters, Slack, browser |
| `Cousin's Wedding Dec 2023` | 35 | Unsplash: wedding halls, people, decorations |
| `Beach Day Oct 2023` | 20 | Unsplash: beach, sea, sunset |
| `Everyday / Misc` | 70 | Mix: receipts, food, documents, random |

**Download helper** (`pipeline/download_images.py`):
```python
# Use Unsplash API (free tier) to download images by query keyword per episode
import requests, os, json

UNSPLASH_KEY = os.environ["UNSPLASH_KEY"]
EPISODES = {
    "Goa Trip Nov 2023": ["cafe india rain", "goa beach", "indian restaurant"],
    "Sick Week Jan 2024": ["medicine pills", "pharmacy prescription"],
    # ... etc
}

def download(query, count, out_dir):
    r = requests.get(
        "https://api.unsplash.com/photos/random",
        params={"query": query, "count": count, "client_id": UNSPLASH_KEY}
    )
    for photo in r.json():
        img = requests.get(photo["urls"]["regular"])
        fname = f"{out_dir}/{photo['id']}.jpg"
        open(fname, "wb").write(img.content)
```

**Assign timestamps and locations** programmatically per episode to match realistic dates.

### 1.2 Vision Tagging (`pipeline/tag_images.py`)

For each image, call the vision model **once** and write output to `metadata.json`.

```python
import anthropic, base64, json, os
from pathlib import Path

client = anthropic.Anthropic()

PROMPT = """Analyse this photo and return JSON only:
{
  "caption": "one sentence describing the scene",
  "objects": ["list", "of", "visible", "things"],
  "mood_tags": ["atmospheric", "words"],
  "purpose_tag": "receipt|reminder|proof|memory",
  "dominant_colors": ["#hex1", "#hex2", "#hex3"],
  "people_tags": ["relationship labels if people visible, else empty"]
}"""

def tag_image(image_path: str) -> dict:
    with open(image_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode()
    msg = client.messages.create(
        model="claude-3-haiku-20240307",
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64",
                 "media_type": "image/jpeg", "data": img_b64}},
                {"type": "text", "text": PROMPT}
            ]
        }]
    )
    return json.loads(msg.content[0].text)

# Run for all images, save metadata.json
records = []
for img_path in Path("library/raw_images").glob("*.jpg"):
    tags = tag_image(str(img_path))
    tags["id"]       = img_path.stem
    tags["filename"] = img_path.name
    # timestamp, location, episode_label assigned by episode manifest
    records.append(tags)

json.dump(records, open("library/metadata.json", "w"), indent=2)
```

> **Cost estimate:** ~200 images × ~$0.002 each ≈ **$0.40 total** with Claude Haiku.

### 1.3 SQLite Import (`pipeline/import_to_sqlite.py`)

```python
import sqlite3, json

conn = sqlite3.connect("../backend/storage/metadata.db")
conn.executescript("""
CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY, filename TEXT NOT NULL,
    timestamp DATETIME NOT NULL, latitude REAL, longitude REAL,
    location_label TEXT, caption TEXT,
    objects TEXT, mood_tags TEXT, purpose_tag TEXT,
    dominant_colors TEXT, people_tags TEXT, episode_label TEXT,
    is_user_upload INTEGER DEFAULT 0, upload_expires DATETIME
);
CREATE INDEX IF NOT EXISTS idx_timestamp ON photos(timestamp);
CREATE INDEX IF NOT EXISTS idx_location  ON photos(location_label);
CREATE INDEX IF NOT EXISTS idx_purpose   ON photos(purpose_tag);
CREATE INDEX IF NOT EXISTS idx_episode   ON photos(episode_label);

-- FTS5 virtual table for Baseline mode
CREATE VIRTUAL TABLE IF NOT EXISTS photos_fts
    USING fts5(id UNINDEXED, caption, objects, location_label);
""")

records = json.load(open("library/metadata.json"))
for r in records:
    conn.execute(
        "INSERT OR REPLACE INTO photos VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,NULL)",
        (r["id"], r["filename"], r["timestamp"], r.get("latitude"),
         r.get("longitude"), r.get("location_label"), r["caption"],
         json.dumps(r["objects"]), json.dumps(r["mood_tags"]),
         r["purpose_tag"], json.dumps(r["dominant_colors"]),
         json.dumps(r["people_tags"]), r["episode_label"])
    )
    conn.execute(
        "INSERT OR REPLACE INTO photos_fts VALUES (?,?,?,?)",
        (r["id"], r["caption"], " ".join(r["objects"]), r.get("location_label",""))
    )
conn.commit()
```

### 1.4 Embedding Generation (`pipeline/embed_images.py`)

```python
import chromadb, json
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")
client = chromadb.PersistentClient(path="../backend/storage/chroma")
col = client.get_or_create_collection("photo_embeddings")

records = json.load(open("library/metadata.json"))
for r in records:
    text = f"{r['caption']} {' '.join(r['objects'])} {' '.join(r['mood_tags'])}"
    embedding = model.encode(text).tolist()
    col.add(ids=[r["id"]], embeddings=[embedding],
            metadatas=[{"episode": r.get("episode_label", "")}])

print(f"Indexed {col.count()} photos in ChromaDB.")
```

### 1.5 Phase 1 Checklist

- [ ] `library/raw_images/` contains ≥ 200 images across 6 episodes
- [ ] `library/metadata.json` has valid JSON with all required fields for every image
- [ ] `backend/storage/metadata.db` is queryable with correct schema + FTS5 table
- [ ] `backend/storage/chroma/` persisted with 200 embeddings
- [ ] Spot-check: 5 random images return sensible captions and mood tags
- [ ] Pipeline README documents the run order and approximate cost

---

## Phase 2 — Backend Core: API + Storage + Agent Loop

> **Duration:** 8 days · **Goal:** All API endpoints functional; agent loop returns real clusters from demo library

### 2.1 FastAPI App Skeleton (`backend/main.py`)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import session, export, photos

app = FastAPI(title="Recall API")
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

app.include_router(session.router, prefix="/session")
app.include_router(export.router,  prefix="/session")
app.include_router(photos.router,  prefix="/photos")
```

### 2.2 Storage Helpers

**`backend/storage/metadata_db.py`**
```python
import sqlite3, json
from dataclasses import dataclass
from typing import Optional

DB_PATH = "storage/metadata.db"

@dataclass
class Photo:
    id: str; filename: str; timestamp: str; latitude: Optional[float]
    longitude: Optional[float]; location_label: str; caption: str
    objects: list; mood_tags: list; purpose_tag: str
    dominant_colors: list; people_tags: list; episode_label: str

def search(filters: dict, limit: int = 100) -> list[Photo]:
    conn = sqlite3.connect(DB_PATH)
    query = "SELECT * FROM photos WHERE is_user_upload = 0"
    params = []
    if tr := filters.get("time_range"):
        query += " AND timestamp BETWEEN ? AND ?"; params += [tr["from"], tr["to"]]
    if locs := filters.get("locations"):
        placeholders = ",".join("?" * len(locs))
        query += f" AND location_label IN ({placeholders})"; params += locs
    if mood := filters.get("mood_tags"):
        for m in mood:
            query += " AND mood_tags LIKE ?"; params.append(f"%{m}%")
    query += f" ORDER BY timestamp DESC LIMIT {limit}"
    rows = conn.execute(query, params).fetchall()
    # deserialise JSON columns and return Photo objects ...
    return [_row_to_photo(r) for r in rows]

def fts_search(query_text: str, limit: int = 50) -> list[Photo]:
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT p.* FROM photos p JOIN photos_fts f ON p.id = f.id "
        "WHERE photos_fts MATCH ? ORDER BY rank LIMIT ?",
        (query_text, limit)
    ).fetchall()
    return [_row_to_photo(r) for r in rows]
```

**`backend/storage/session_db.py`**
```python
import sqlite3, json
from datetime import datetime, timezone

DB_PATH = "storage/session_log.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY, mode TEXT NOT NULL,
        started_at DATETIME NOT NULL, ended_at DATETIME,
        outcome TEXT, confirmed_photo TEXT
    );
    CREATE TABLE IF NOT EXISTS turns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT, turn_index INTEGER,
        raw_clue TEXT, parsed_filters TEXT, clusters_shown TEXT,
        question_asked TEXT, answer_given TEXT,
        feedback_signal TEXT, excluded_ids TEXT,
        time_elapsed_ms INTEGER, timestamp DATETIME
    );""")
    conn.commit()

def create_session(session_id: str, mode: str):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("INSERT INTO sessions VALUES (?,?,?,NULL,NULL,NULL)",
                 (session_id, mode, datetime.now(timezone.utc).isoformat()))
    conn.commit()

def log_turn(session_id: str, turn_index: int, **kwargs):
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO turns (session_id,turn_index,raw_clue,parsed_filters,"
        "clusters_shown,question_asked,answer_given,feedback_signal,"
        "excluded_ids,time_elapsed_ms,timestamp) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        (session_id, turn_index,
         kwargs.get("raw_clue"), json.dumps(kwargs.get("parsed_filters")),
         json.dumps(kwargs.get("clusters_shown")), kwargs.get("question_asked"),
         kwargs.get("answer_given"), kwargs.get("feedback_signal"),
         json.dumps(kwargs.get("excluded_ids", [])),
         kwargs.get("time_elapsed_ms"),
         datetime.now(timezone.utc).isoformat())
    )
    conn.commit()
```

### 2.3 Claude Client (`backend/agent/claude_client.py`)

```python
import anthropic, json, os

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
HAIKU = "claude-3-haiku-20240307"

TOOLS = [
    {
        "name": "search_library",
        "description": "Search the photo metadata DB with structured filters.",
        "input_schema": {
            "type": "object",
            "properties": {
                "time_range":   {"type": "object"},
                "locations":    {"type": "array", "items": {"type": "string"}},
                "objects":      {"type": "array", "items": {"type": "string"}},
                "mood_tags":    {"type": "array", "items": {"type": "string"}},
                "purpose_tags": {"type": "array", "items": {"type": "string"}},
                "people":       {"type": "array", "items": {"type": "string"}}
            }
        }
    },
    # ... cluster_episodes, ask_next_question, exclude_similar, set_anchor
]

SYSTEM_PROMPT = """You are the Recall agent inside a photo retrieval app.
Your job: help users find a photo they remember but cannot describe precisely.
Rules:
- Always call search_library FIRST. Never ask a question before showing results.
- Return clusters named in plain English (place, date, mood). Keep names under 10 words.
- The match_reason for each cluster must reference the user's own words.
- The narrowing question must be answerable in 1–3 words. Offer 2–4 chips.
- Cap questions at 3 per session. If already at 3, skip to confirm flow.
- For not-this signals, call exclude_similar and immediately re-cluster.
- Never describe personal details from documents or medical images.
- Always include skip_to_all: true in your response."""

async def run_agent(messages: list, tool_handler) -> dict:
    response = client.messages.create(
        model=HAIKU,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        tools=TOOLS,
        messages=messages
    )
    # Handle tool_use blocks by calling tool_handler
    for block in response.content:
        if block.type == "tool_use":
            result = await tool_handler(block.name, block.input)
            # append tool result to messages and continue...
    return response
```

### 2.4 Agent Orchestrator (`backend/agent/orchestrator.py`)

Implement the 6-step loop as described in Architecture §4.2:

1. `parse_clues()` → Claude tool call → structured `filters` dict
2. `metadata_db.search(filters)` → `candidates: list[Photo]`
3. Optionally `chroma_store.query()` for similarity
4. `cluster_episodes(candidates, clue)` → Claude → `clusters`
5. `ask_next_question(clusters, turns_used)` → Claude → `question`
6. `session_db.log_turn(...)` → persist

**Implementation order within 2.4:**
- [ ] Implement `parse_clues` tool call and validate JSON output
- [ ] Implement `cluster_episodes` tool call; test with 50-photo subset
- [ ] Implement `ask_next_question` tool call; validate chip count ≤ 4
- [ ] Wire together in `run_recall_session()`
- [ ] Implement `apply_feedback()` using `exclude_similar` tool
- [ ] Implement `set_anchor()` — resolve before/after/same-day time window

### 2.5 API Endpoints (`backend/routers/session.py`)

```python
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import uuid, time, json
from agent.orchestrator import run_recall_session, apply_feedback
from storage import session_db

router = APIRouter()

@router.post("/start")
async def start_session(body: dict):
    session_id = str(uuid.uuid4())
    mode = body.get("mode", "recall")
    clue = body["clue"]
    session_db.create_session(session_id, mode)

    async def event_stream():
        t0 = time.time()
        async for cluster in run_recall_session(clue, session_id):
            yield f"data: {json.dumps(cluster)}\n\n"
        elapsed = int((time.time() - t0) * 1000)
        yield f"data: {json.dumps({'type': 'done', 'elapsed_ms': elapsed})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

@router.post("/feedback")
async def session_feedback(body: dict):
    result = await apply_feedback(body["session_id"], body["feedback"], body["excluded_ids"])
    return result

@router.post("/confirm")
async def confirm_session(body: dict):
    session_db.close_session(body["session_id"], outcome="found",
                             confirmed_photo=body["photo_id"])
    return {"status": "ok"}

@router.post("/anchor")
async def set_anchor(body: dict):
    result = await set_anchor_handler(body["session_id"],
                                      body["photo_id"], body["relation"])
    return result
```

### 2.6 Photo Upload & Delete Endpoints (`backend/routers/photos.py`)

```python
@router.post("/upload")
async def upload_photo(file: UploadFile, session_id: str = Form(...)):
    # Save to /tmp/uploads/{session_id}/
    # Tag with vision model (same tag_image function from pipeline)
    # Insert into photos table with is_user_upload=1, upload_expires=now+24h
    # Return photo metadata
    ...

@router.delete("/upload/{photo_id}")
async def delete_upload(photo_id: str):
    # Delete file from disk + row from photos table
    ...
```

### 2.7 Phase 2 Checklist

- [ ] `POST /session/start` returns SSE stream of clusters within 3 s for a test clue
- [ ] Each cluster contains `name`, `photo_ids`, `match_reason`
- [ ] `POST /session/feedback` returns updated clusters after "not this"
- [ ] `POST /session/confirm` closes session in DB with `outcome=found`
- [ ] `POST /session/anchor` narrows candidates by before/after/same_day
- [ ] `GET /photos/{id}` serves image files correctly
- [ ] `POST /photos/upload` + `DELETE /photos/upload/{id}` work end-to-end
- [ ] All endpoints return proper CORS headers for `localhost:3000`
- [ ] Test with all 5 test-task clues from the problem statement; clusters are sensible

---

## Phase 3 — Frontend Core: UI Shell + Recall Flow

> **Duration:** 8 days · **Goal:** Full Recall conversational flow working in the browser

### 3.1 Shared Types (`frontend/lib/types.ts`)

```typescript
export type Mode = "recall" | "baseline";

export interface Photo {
  id: string; filename: string; timestamp: string;
  location_label: string; caption: string;
  objects: string[]; mood_tags: string[];
  purpose_tag: string; episode_label: string;
}

export interface Cluster {
  name: string; photo_ids: string[]; match_reason: string; photos: Photo[];
}

export interface Question {
  question_text: string; answer_chips: string[];
}

export interface AgentResponse {
  clusters: Cluster[]; question: Question | null;
  skip_to_all: boolean; session_id: string;
}

export type FeedbackSignal = "not_this" | "earlier" | "later" | "more_like_this";
```

### 3.2 API Client (`frontend/lib/api.ts`)

```typescript
const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function* startSession(clue: string, mode: Mode,
    sessionId: string): AsyncGenerator<Cluster> {
  const res = await fetch(`${BASE}/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clue, mode, session_id: sessionId })
  });
  const reader = res.body!.getReader();
  // Parse SSE stream, yield each cluster as it arrives
  ...
}

export async function sendFeedback(sessionId: string,
    feedback: FeedbackSignal, excludedIds: string[]): Promise<AgentResponse> {
  const res = await fetch(`${BASE}/session/feedback`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, feedback, excluded_ids: excludedIds })
  });
  return res.json();
}

export async function confirmPhoto(sessionId: string, photoId: string) {
  await fetch(`${BASE}/session/confirm`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, photo_id: photoId })
  });
}
```

### 3.3 Component Build Order

Build components in this order to match the user flow:

| Step | Component | What it does |
|------|-----------|-------------|
| 1 | `SearchBar.tsx` | Text input + submit; fires `startSession()` |
| 2 | `PhotoGrid.tsx` | Renders flat grid of `Photo[]`; reused in all modes |
| 3 | `ClusterCard.tsx` | Named cluster with match reason + expandable photo strip |
| 4 | `AgentPanel.tsx` | Hosts 3–5 `ClusterCard`s + question + skip link |
| 5 | `AnswerChips.tsx` | Tappable chips; emits selected answer to `AgentPanel` |
| 6 | `FeedbackBar.tsx` | "Not this" / "Earlier" / "Later" / "More like this" per photo |
| 7 | `AnchorPicker.tsx` | Modal for selecting an anchor photo; fires `/session/anchor` |
| 8 | `BaselineToggle.tsx` | Switch between modes; resets session state |
| 9 | `SessionLogger.tsx` | Silent; flushes buffered events to backend |

### 3.4 Page State Machine (`frontend/app/page.tsx`)

```typescript
type UIState = "idle" | "searching" | "clusters_shown" | "refining" | "confirmed";

// State variables
const [state, setState] = useState<UIState>("idle");
const [sessionId] = useState(() => crypto.randomUUID());
const [mode, setMode] = useState<Mode>("recall");
const [clusters, setClusters] = useState<Cluster[]>([]);
const [question, setQuestion] = useState<Question | null>(null);
const [turnsUsed, setTurnsUsed] = useState(0);
const [confirmedPhoto, setConfirmedPhoto] = useState<Photo | null>(null);

// Handlers
async function handleSearch(clue: string) {
  setState("searching");
  for await (const cluster of startSession(clue, mode, sessionId)) {
    setClusters(prev => [...prev, cluster]);     // stream in as they arrive
    setState("clusters_shown");
  }
}

async function handleFeedback(signal: FeedbackSignal, excludedIds: string[]) {
  setState("refining");
  const result = await sendFeedback(sessionId, signal, excludedIds);
  setClusters(result.clusters);
  setQuestion(result.question);
  setTurnsUsed(t => t + 1);
  setState("clusters_shown");
}

async function handleConfirm(photo: Photo) {
  await confirmPhoto(sessionId, photo.id);
  setConfirmedPhoto(photo);
  setState("confirmed");
}
```

### 3.5 Layout & Styling

- **Font:** Inter from Google Fonts (add to `layout.tsx`)
- **Colour palette:** Google Photos-inspired neutrals with a teal accent (`#1A73E8` / `#00BCD4`)
- **Grid:** CSS Grid for photo layout; Flexbox for agent panel
- **Mobile breakpoint:** stack photo grid + agent panel vertically at < 768px
- **Micro-animations:**
  - Cluster cards fade-in slide-up on arrival (`@keyframes slideUp`)
  - "Not this" button ripple on tap
  - Confirmed photo zooms to full-screen overlay

### 3.6 Phase 3 Checklist

- [ ] `SearchBar` submits and triggers SSE; clusters appear progressively
- [ ] Each `ClusterCard` shows name, photo count, match reason, and thumbnail strip
- [ ] `AnswerChips` are tappable; selecting one fires `sendFeedback`
- [ ] "Not this" on a cluster fires `sendFeedback` with `signal="not_this"`
- [ ] `AnchorPicker` lets user pick a photo and select before/after/same_day
- [ ] "That's it" button fires `confirmPhoto` and shows success state
- [ ] "Skip to all results" always visible; expands flat `PhotoGrid`
- [ ] Mobile layout tested at 375px width (iPhone SE viewport)
- [ ] All 5 test tasks walkable end-to-end in the UI against the demo library
- [ ] Max 3-turn cap enforced: after turn 3, question is suppressed

---

## Phase 4 — Baseline Mode + Session Logging & Export

> **Duration:** 4 days · **Goal:** Baseline mode functional; full session log exportable as CSV/JSON

### 4.1 Baseline Mode (Backend)

In `backend/routers/session.py`, detect `mode == "baseline"` and branch:

```python
if mode == "baseline":
    candidates = metadata_db.fts_search(clue, limit=50)
    session_db.log_turn(session_id, turn_index=1, raw_clue=clue,
                        parsed_filters=None, clusters_shown=None, ...)
    return {"photos": [p.__dict__ for p in candidates], "mode": "baseline"}
```

### 4.2 Baseline Mode (Frontend)

- When `BaselineToggle` is in Baseline position:
  - Hide `AgentPanel` entirely
  - Show flat `PhotoGrid` only
  - Submit clue → single API call → flat grid of results
  - "That's it" still fires `confirmPhoto` → logs session
- Session log captures identical fields in both modes, enabling metric comparison

### 4.3 Export Endpoint (`backend/routers/export.py`)

```python
import csv, io, json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse, JSONResponse
from storage import session_db

router = APIRouter()

@router.get("/export")
def export_sessions(format: str = "json", session_id: str = None):
    rows = session_db.get_all_turns(session_id=session_id)

    if format == "csv":
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=rows[0].keys())
        writer.writeheader(); writer.writerows(rows)
        return StreamingResponse(iter([buf.getvalue()]),
                                 media_type="text/csv",
                                 headers={"Content-Disposition":
                                          "attachment; filename=sessions.csv"})
    return JSONResponse(rows)
```

### 4.4 Privacy Cleanup Job

Add a background task in `main.py` that runs every hour and deletes expired user uploads:

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job("interval", hours=1)
async def purge_expired_uploads():
    expired = session_db.get_expired_uploads()
    for photo_id, filepath in expired:
        os.remove(filepath)
        metadata_db.delete_photo(photo_id)

@app.on_event("startup")
async def startup():
    scheduler.start()
```

### 4.5 Phase 4 Checklist

- [ ] `BaselineToggle` switches mode; UI shows/hides agent panel correctly
- [ ] Baseline mode returns flat results within 500 ms
- [ ] Both modes log identical session fields
- [ ] `GET /session/export?format=csv` downloads a valid CSV file
- [ ] `GET /session/export?format=json` returns correct JSON array
- [ ] CSV contains all required metric fields from the problem statement
- [ ] Privacy cleanup job purges expired uploads on schedule
- [ ] `DELETE /photos/upload/{id}` tested and verified

---

## Phase 5 — Integration, QA & Deployment

> **Duration:** 6 days · **Goal:** App deployed at a public URL; all 5 test tasks pass

### 5.1 End-to-End Integration Testing

Run all 5 test tasks against the deployed demo library and record:

| Task | Expected Clusters | Max Turns to Confirm |
|------|------------------|---------------------|
| "Small cafe from our trip, raining" | "Cafe in Panjim Nov 2023, rainy" in top 3 | ≤ 3 |
| "Medicine from when I was sick" | "Sick Week Jan 2024" cluster | ≤ 3 |
| "Screenshot around when I changed jobs" | "Job Change Mar 2023" cluster | ≤ 3 |
| "Wedding, my cousin was in it" | "Cousin's Wedding Dec 2023" cluster | ≤ 3 |
| "Picture after the beach day" | Beach Day + evening episode cluster | ≤ 3 |

### 5.2 Performance Validation

- [ ] First cluster appears within **3 seconds** of submitting a clue (measure via browser DevTools Network tab)
- [ ] Subsequent feedback turns resolve within **2 seconds**
- [ ] Baseline mode returns results within **500 ms**
- [ ] Test on a throttled mobile connection (Chrome DevTools → "Fast 3G")

### 5.3 Deploy Backend to Render

Create `render.yaml` in `backend/`:

```yaml
services:
  - type: web
    name: recall-api
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: ANTHROPIC_API_KEY
        sync: false
      - key: CHROMA_PERSIST_DIR
        value: ./storage/chroma
      - key: MAX_UPLOAD_MB
        value: "10"
      - key: UPLOAD_TTL_HOURS
        value: "24"
    disk:
      name: recall-storage
      mountPath: /opt/render/project/src/storage
      sizeGB: 1
```

**Steps:**
1. Push `backend/` to GitHub
2. Create new Web Service on Render, connect repo
3. Add `ANTHROPIC_API_KEY` as secret env var
4. Upload `metadata.db` and `chroma/` to the disk mount (or include in repo for MVP)
5. Note the public URL: `https://recall-api.onrender.com`

### 5.4 Deploy Frontend to Vercel

```bash
cd frontend
# Set production env var
echo "NEXT_PUBLIC_API_URL=https://recall-api.onrender.com" > .env.production
vercel deploy --prod
```

**Steps:**
1. Connect GitHub repo to Vercel
2. Set `NEXT_PUBLIC_API_URL` in Vercel environment settings
3. Deploy; note the public URL: `https://recall.vercel.app`

### 5.5 Smoke Test the Live URL

- [ ] Open the public URL on desktop and mobile
- [ ] Run all 5 test tasks end-to-end on the live deployment
- [ ] Confirm session log captures correctly (check `GET /session/export`)
- [ ] Verify no API keys are visible in browser Network tab or JS bundles
- [ ] Confirm privacy footer reads: *"This is a research prototype, not connected to Google Photos."*
- [ ] Test "Delete my data" button for user uploads

### 5.6 Finalise README

`README.md` must cover:
- [ ] Project overview (1 paragraph)
- [ ] Prerequisites (Node 18+, Python 3.11+, API keys)
- [ ] Setup steps (clone, install, env vars, pipeline run, dev servers)
- [ ] How to swap in a different photo library (replace images + re-run pipeline)
- [ ] Environment variable reference table
- [ ] Deployment instructions (Vercel + Render)
- [ ] How to export session logs

---

## Phase 6 — User Testing Readiness & Handoff

> **Duration:** 3 days · **Goal:** External testers can run all 5 tasks without guidance

### 6.1 Definition of Done Verification

Work through every criterion from the problem statement:

| Criterion | Verified? |
|-----------|----------|
| Stranger can open link, type vague memory, get clusters, answer question, say "not this", confirm find — with no instructions | [ ] |
| All 5 test tasks complete in ≤ 3 turns on demo library | [ ] |
| Baseline mode and Recall mode both work and log sessions | [ ] |
| Log export provides all fields needed to compute success metrics | [ ] |

### 6.2 Metric Verification

Confirm the session log export can produce each required metric:

| Metric | Log Fields Used |
|--------|----------------|
| Vague-search success rate | `outcome = "found"` / total sessions |
| Turns to find | `MAX(turn_index)` per confirmed session |
| Time to find | `ended_at - started_at` per session |
| First-hit rate | `turn_index = 1` AND `outcome = "found"` |
| Question answer rate | `answer_given IS NOT NULL` / `question_asked IS NOT NULL` |
| Confirm rate | `outcome = "found"` / total sessions |
| Abandon rate | `outcome = "abandoned"` / total sessions |
| Latency | `time_elapsed_ms` per turn |

### 6.3 "How It Works" Slide Note

Create `docs/HowItWorks.md` (1-pager for PM slides):

- **Agent loop:** Clue → Claude parses filters → SQLite search → Claude clusters → Claude questions → user reacts → repeat
- **Tools:** `search_library`, `cluster_episodes`, `ask_next_question`, `exclude_similar`, `set_anchor`
- **LLM boundary:** Only parsing, clustering, questioning, and feedback interpretation use LLM; all data operations use plain code
- **Latency:** SSE streaming delivers first cluster before all clusters are ready
- **A/B design:** Baseline mode uses FTS5 over the same library; session logs are identical

### 6.4 Final Phase 6 Checklist

- [ ] 3 external test users (not the dev) run all 5 tasks without instructions
- [ ] Gather qualitative notes on confusion points
- [ ] Fix any critical UX bugs found
- [ ] "How It Works" note written and ready for presentation
- [ ] Repository is public (or shared link) with working README
- [ ] Live URL confirmed accessible without login from a fresh browser / incognito window

---

## Summary Timeline

```
Week 1   Phase 0 ── Bootstrap (2 days)
         Phase 1 ── Data Pipeline (4 days)

Week 2   Phase 2 ── Backend Core (5 days)

Week 3   Phase 2 ── Backend Core cont. (3 days)
         Phase 3 ── Frontend Core (2 days)

Week 4   Phase 3 ── Frontend Core cont. (6 days)

Week 5   Phase 4 ── Baseline + Logging (4 days)
         Phase 5 ── Integration + Deploy (1 day)

Week 6   Phase 5 ── QA + Deploy cont. (5 days)
         Phase 6 ── User Testing Readiness (3 days)
```

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Vision tagging produces poor captions for edge images | Medium | High | Manual review + override for all 5 test-task photos |
| Claude Haiku latency spikes beyond 3 s | Low | High | Cache parsed filters; fall back to Claude Haiku streaming |
| Render free tier spins down after inactivity | High | Medium | Add a keep-alive ping every 14 min from Vercel cron |
| ChromaDB similarity results are noisy | Medium | Low | Weight SQLite structured search more; use Chroma only for "more like this" |
| User uploads contain PII | Medium | High | Vision output is filtered; purpose=medical gets generic label; 24 h auto-delete |
| SSE not supported in all test environments | Low | Medium | Provide polling fallback in `api.ts` |

---

*Based on [`Architecture.md`](./Architecture.md) · See also [`Problemstatement.md`](./Problemstatement.md)*
