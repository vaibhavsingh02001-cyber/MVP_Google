# 🏗️ Architecture — "Recall" AI-Native Retrieval Agent

> **Project:** Recall MVP · **Based on:** [`Problemstatement.md`](./Problemstatement.md)  
> **Stack:** Next.js · FastAPI · Claude API · SQLite + ChromaDB · Vercel + Render

---

## 1. System Overview

Recall is a **two-mode retrieval application** built around a conversational AI agent. The system is split into three distinct runtime zones:

| Zone | Role |
|------|------|
| **Browser (Client)** | Google Photos-style UI shell — search bar, photo grid, agent panel |
| **API Server (Backend)** | Stateless tool functions + session store; calls Claude |
| **Build-time Pipeline** | One-shot vision tagging; produces the indexed demo library |

```
┌──────────────────────────────────────────────────────────────────────┐
│                          BROWSER (Next.js)                           │
│                                                                      │
│   SearchBar  ──►  AgentPanel (chips, clusters, questions)            │
│                        │                                             │
│              PhotoGrid ◄── ClusterCard (name + why-matched)          │
│                        │                                             │
│             BaselineToggle  SessionLogger (client-side events)       │
└────────────────────────┬─────────────────────────────────────────────┘
                         │  HTTPS / REST + SSE (streaming)
┌────────────────────────▼─────────────────────────────────────────────┐
│                     API SERVER (FastAPI / Python)                    │
│                                                                      │
│   POST /session/start      POST /session/feedback                    │
│   POST /session/confirm    GET  /session/export                      │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │                    Agent Orchestrator                       │    │
│   │  1. parse_clues() ──► Claude (structured JSON)             │    │
│   │  2. search_library(filters) ──► SQLite / metadata JSON     │    │
│   │  3. cluster_episodes(results) ──► Claude (names + reasons) │    │
│   │  4. ask_next_question(clusters) ──► Claude (best split)    │    │
│   │  5. exclude_similar(feedback) ──► Claude + SQLite filter   │    │
│   │  6. set_anchor(photo_id) ──► timeline pin logic            │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│   Storage:  metadata.db (SQLite)  ·  embeddings (ChromaDB)          │
│   Session:  session_log.db (SQLite)                                  │
└──────────────────────────────────────────────────────────────────────┘
                         │  (build-time only)
┌────────────────────────▼─────────────────────────────────────────────┐
│                   BUILD-TIME TAGGING PIPELINE                        │
│                                                                      │
│   raw_images/  ──► tag_images.py (vision model, run once)           │
│                        │                                             │
│                   metadata.json  ──► SQLite import + Chroma index    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Repository Structure

```
recall/
├── frontend/                    # Next.js app
│   ├── app/
│   │   ├── page.tsx             # Main search + agent page
│   │   ├── layout.tsx
│   │   └── api/                 # Next.js API routes (proxies to backend)
│   ├── components/
│   │   ├── SearchBar.tsx        # Fuzzy clue input
│   │   ├── AgentPanel.tsx       # Clusters, questions, chips
│   │   ├── ClusterCard.tsx      # Named cluster + why-matched line
│   │   ├── PhotoGrid.tsx        # Flat results display
│   │   ├── AnswerChips.tsx      # Tappable answer options
│   │   ├── FeedbackBar.tsx      # "Not this" / "earlier" / "later"
│   │   ├── AnchorPicker.tsx     # Timeline anchor selection
│   │   ├── BaselineToggle.tsx   # Mode switch (Recall ↔ Baseline)
│   │   └── SessionLogger.tsx    # Client-side event capture
│   ├── lib/
│   │   ├── api.ts               # Typed API client
│   │   └── types.ts             # Shared TypeScript types
│   └── public/
│       └── demo-library/        # Symlink → backend/library/images/
│
├── backend/                     # FastAPI server
│   ├── main.py                  # App entry point + CORS
│   ├── routers/
│   │   ├── session.py           # /session/* endpoints
│   │   └── export.py            # /session/export endpoint
│   ├── agent/
│   │   ├── orchestrator.py      # Main agent loop
│   │   ├── tools.py             # Tool definitions (search, cluster, …)
│   │   ├── prompts.py           # All LLM system prompts
│   │   └── claude_client.py     # Anthropic SDK wrapper
│   ├── storage/
│   │   ├── metadata_db.py       # SQLite read helpers
│   │   ├── session_db.py        # Session log writes/reads
│   │   └── chroma_store.py      # ChromaDB embedding search
│   └── library/
│       ├── images/              # Demo photo files
│       └── metadata.json        # Pre-tagged metadata
│
├── pipeline/                    # Build-time tagging (run once)
│   ├── tag_images.py            # Vision model → metadata.json
│   ├── import_to_sqlite.py      # metadata.json → metadata.db
│   ├── embed_images.py          # Generate + store Chroma embeddings
│   └── requirements.txt
│
├── docs/
│   ├── Problemstatement.md
│   └── Architecture.md          # ← this file
│
├── .env.example
└── README.md
```

---

## 3. Frontend Architecture (Next.js)

### 3.1 Page Layout

```
┌─────────────────────────────────────────────────────┐
│  🔍  [Search / clue input bar]          [⚡ Baseline] │  ← Header
├────────────────────────┬────────────────────────────┤
│                        │  Agent Panel               │
│   Photo Grid           │  ┌──────────────────────┐  │
│   (flat / clustered)   │  │  ClusterCard ×3–5    │  │
│                        │  │  • Name + count       │  │
│   [Not this] [Earlier] │  │  • Why matched        │  │
│   [Later] [Like this]  │  └──────────────────────┘  │
│                        │  [AnswerChips]              │
│                        │  [Free-text input]          │
│                        │  "Skip to all results →"   │
└────────────────────────┴────────────────────────────┘
```

### 3.2 State Machine (Client)

```
IDLE
  │  user types clue
  ▼
SEARCHING  ──► (POST /session/start)
  │  clusters arrive (SSE stream)
  ▼
CLUSTERS_SHOWN
  │  user answers question / gives feedback
  ▼
REFINING   ──► (POST /session/feedback)
  │  updated clusters arrive
  ▼
CLUSTERS_SHOWN  (loop, max 3 turns)
  │  user taps "That's it"
  ▼
CONFIRMED  ──► (POST /session/confirm)
```

### 3.3 Key Components

| Component | Responsibility |
|-----------|---------------|
| `SearchBar` | Accepts free-text clue, triggers session start |
| `AgentPanel` | Renders clusters, question, and chips; handles feedback |
| `ClusterCard` | Shows name, photo count, and one-line match reason |
| `PhotoGrid` | Flat photo display for baseline mode and expanded clusters |
| `AnswerChips` | Tappable options generated by the agent's question |
| `FeedbackBar` | "Not this", "Earlier", "Later", "More like this" actions |
| `AnchorPicker` | Let user select an anchor photo for timeline pinning |
| `BaselineToggle` | Switches between Recall mode and Baseline keyword mode |
| `SessionLogger` | Buffers and flushes client events to the session log |

---

## 4. Backend Architecture (FastAPI)

### 4.1 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/session/start` | Accept clue, run agent, return clusters (SSE) |
| `POST` | `/session/feedback` | Accept user reaction, re-rank, return updated clusters |
| `POST` | `/session/confirm` | Log confirmed photo, optionally save to Found album |
| `POST` | `/session/anchor` | Set anchor photo for timeline-relative search |
| `GET`  | `/session/export` | Download full session log as CSV or JSON |
| `GET`  | `/photos/{id}` | Serve a photo file from the demo library |
| `POST` | `/photos/upload` | Accept user-uploaded photo (privacy-safe, temp storage) |
| `DELETE` | `/photos/upload/{id}` | Delete user-uploaded photo on demand |

### 4.2 Agent Orchestrator Loop

```python
# orchestrator.py  (pseudocode)

async def run_recall_session(clue: str, session: Session) -> AgentResponse:

    # Step 1 — LLM: parse fuzzy clue into structured filters
    filters = await claude.parse_clues(clue, session.history)
    # Returns: { time_range, locations, objects, mood, purpose, anchors }

    # Step 2 — Plain code: search metadata DB
    candidates = metadata_db.search(filters)          # SQLite WHERE + ORDER BY

    # Step 3 — Optional: similarity search for "more like this"
    if filters.anchor_embedding:
        similar = chroma_store.query(filters.anchor_embedding, top_k=50)
        candidates = merge_and_dedupe(candidates, similar)

    # Step 4 — LLM: cluster candidates and name them
    clusters = await claude.cluster_episodes(candidates, clue)
    # Returns: [{ name, photo_ids, match_reason }]  (3–5 clusters)

    # Step 5 — LLM: choose the best narrowing question
    question = await claude.ask_next_question(clusters, session.turns)
    # Returns: { question_text, answer_chips: [str] }

    # Step 6 — Log turn
    session_db.log_turn(session.id, filters, clusters, question)

    return AgentResponse(clusters=clusters, question=question)


async def apply_feedback(feedback: Feedback, session: Session) -> AgentResponse:

    # Step 1 — LLM: interpret feedback ("not this", "earlier", "later", etc.)
    updated_filters = await claude.interpret_feedback(feedback, session.last_filters)

    # Step 2-5 same loop as above with refined filters
    return await run_recall_session_inner(updated_filters, session)
```

### 4.3 Tool Definitions (Claude Tool-Calling)

These are the tools exposed to Claude via the Anthropic tool-use API:

```json
[
  {
    "name": "search_library",
    "description": "Search the photo metadata DB with structured filters.",
    "input_schema": {
      "type": "object",
      "properties": {
        "time_range":   { "type": "object", "properties": { "from": { "type": "string" }, "to": { "type": "string" } } },
        "locations":    { "type": "array",  "items": { "type": "string" } },
        "objects":      { "type": "array",  "items": { "type": "string" } },
        "mood_tags":    { "type": "array",  "items": { "type": "string" } },
        "purpose_tags": { "type": "array",  "items": { "type": "string" } },
        "people":       { "type": "array",  "items": { "type": "string" } }
      }
    }
  },
  {
    "name": "cluster_episodes",
    "description": "Group photo candidates into 3–5 named clusters with a one-line match reason each.",
    "input_schema": {
      "type": "object",
      "properties": {
        "photo_ids":   { "type": "array", "items": { "type": "string" } },
        "user_clue":   { "type": "string" }
      },
      "required": ["photo_ids", "user_clue"]
    }
  },
  {
    "name": "ask_next_question",
    "description": "Return the single most discriminating question to split remaining candidates.",
    "input_schema": {
      "type": "object",
      "properties": {
        "clusters":     { "type": "array" },
        "turns_used":   { "type": "integer" }
      },
      "required": ["clusters", "turns_used"]
    }
  },
  {
    "name": "exclude_similar",
    "description": "Remove a cluster or photo and refine filters based on user's 'not this' signal.",
    "input_schema": {
      "type": "object",
      "properties": {
        "excluded_ids": { "type": "array", "items": { "type": "string" } },
        "signal":       { "type": "string", "enum": ["not_this", "earlier", "later", "more_like_this"] }
      },
      "required": ["excluded_ids", "signal"]
    }
  },
  {
    "name": "set_anchor",
    "description": "Set a timeline anchor from a known photo and return relative time window.",
    "input_schema": {
      "type": "object",
      "properties": {
        "anchor_photo_id": { "type": "string" },
        "relation":        { "type": "string", "enum": ["before", "after", "same_day"] }
      },
      "required": ["anchor_photo_id", "relation"]
    }
  }
]
```

---

## 5. Data Architecture

### 5.1 Photo Metadata Schema (`metadata.db` — SQLite)

```sql
CREATE TABLE photos (
    id              TEXT PRIMARY KEY,    -- UUID
    filename        TEXT NOT NULL,
    timestamp       DATETIME NOT NULL,   -- EXIF or assigned
    latitude        REAL,
    longitude       REAL,
    location_label  TEXT,                -- "Panjim, Goa"
    caption         TEXT,                -- Vision model output
    objects         TEXT,                -- JSON array: ["cafe", "table", "rain"]
    mood_tags       TEXT,                -- JSON array: ["rainy", "cozy"]
    purpose_tag     TEXT,                -- "receipt" | "reminder" | "proof" | "memory"
    dominant_colors TEXT,                -- JSON array: ["#3A5F6B", "#D4B483"]
    people_tags     TEXT,                -- JSON array: ["cousin", "bride"]
    episode_label   TEXT,                -- "Goa Trip Nov 2023" (manually assigned)
    is_user_upload  INTEGER DEFAULT 0,
    upload_expires  DATETIME             -- NULL for demo library
);

CREATE INDEX idx_timestamp ON photos(timestamp);
CREATE INDEX idx_location  ON photos(location_label);
CREATE INDEX idx_purpose   ON photos(purpose_tag);
CREATE INDEX idx_episode   ON photos(episode_label);
```

### 5.2 Session Log Schema (`session_log.db` — SQLite)

```sql
CREATE TABLE sessions (
    session_id      TEXT PRIMARY KEY,
    mode            TEXT NOT NULL,      -- "recall" | "baseline"
    started_at      DATETIME NOT NULL,
    ended_at        DATETIME,
    outcome         TEXT,               -- "found" | "skipped" | "abandoned"
    confirmed_photo TEXT                -- photo id
);

CREATE TABLE turns (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id      TEXT REFERENCES sessions(session_id),
    turn_index      INTEGER NOT NULL,
    raw_clue        TEXT,
    parsed_filters  TEXT,               -- JSON
    clusters_shown  TEXT,               -- JSON array of cluster names
    question_asked  TEXT,
    answer_given    TEXT,
    feedback_signal TEXT,               -- "not_this" | "earlier" | "later" | null
    excluded_ids    TEXT,               -- JSON array
    timestamp       DATETIME NOT NULL
);
```

### 5.3 Photo Metadata JSON (per-image, pre-tagged)

```json
{
  "id": "a3f7c12d-...",
  "filename": "goa_cafe_001.jpg",
  "timestamp": "2023-11-14T13:42:00",
  "latitude": 15.4989,
  "longitude": 73.8278,
  "location_label": "Panjim, Goa",
  "caption": "A small cozy cafe interior on a rainy afternoon, two people seated at a wooden table.",
  "objects": ["cafe", "table", "chair", "rain", "window"],
  "mood_tags": ["rainy", "cozy", "dim", "warm"],
  "purpose_tag": "memory",
  "dominant_colors": ["#5C3D2E", "#B8A394", "#2E3A47"],
  "people_tags": [],
  "episode_label": "Goa Trip Nov 2023"
}
```

### 5.4 Vector Embeddings (ChromaDB)

- **Collection:** `photo_embeddings`
- **Embedding source:** CLIP-style image+text embedding of `caption + objects + mood_tags`
- **Used for:** `exclude_similar` (find visually/semantically similar photos) and anchor-relative queries
- **Generated:** once at build time via `embed_images.py`

---

## 6. Build-Time Pipeline

```
pipeline/
│
├── 1. tag_images.py
│   Input:  library/raw_images/*.jpg
│   Uses:   Google Vision API / GPT-4o / Claude vision (run once)
│   Output: library/metadata.json
│
├── 2. import_to_sqlite.py
│   Input:  library/metadata.json
│   Output: backend/storage/metadata.db
│
└── 3. embed_images.py
    Input:  library/metadata.json + image files
    Uses:   OpenCLIP or sentence-transformers (all-MiniLM-L6-v2)
    Output: backend/storage/chroma/ (ChromaDB persistent store)
```

**Run order:**
```bash
cd pipeline
pip install -r requirements.txt
python tag_images.py       # ~5 min for 200 images; costs ~$0.50 in vision API
python import_to_sqlite.py
python embed_images.py
```

> **Note:** Never call the vision model during live search. All calls are pre-computed.

---

## 7. Demo Library Design

The demo library must contain **clear "episodes"** that make all 5 test tasks solvable:

| Episode Label | # Photos | Content | Covers Test Task |
|---------------|---------|---------|-----------------|
| `Goa Trip Nov 2023` | 40 | Cafes, beaches, rain, restaurants | #1, #5 |
| `Sick Week Jan 2024` | 20 | Medicine, prescriptions, home interiors | #2 |
| `Job Change Mar 2023` | 15 | Screenshots, job offer letters, documents | #3 |
| `Cousin's Wedding Dec 2023` | 35 | Wedding hall, people, celebrations | #4 |
| `Beach Day Oct 2023` | 20 | Beach, sea, sunset, followed by dinner | #5 |
| `Everyday / Miscellaneous` | 70 | Receipts, reminders, food, random moments | All |

**Image types to include:**
- Scenic / travel photos
- Indoor / food photos
- Screenshots (UI, messages, offers)
- Receipts and document photos
- Group photos with people tags

---

## 8. Agent Prompts

### 8.1 System Prompt

```
You are the Recall agent inside a photo retrieval app.
Your job: help users find a photo they remember but cannot describe precisely.

Rules:
- Always call search_library FIRST. Never ask a question before showing results.
- Return clusters named in plain English (place, date, mood). Keep names under 10 words.
- The "match_reason" for each cluster must reference the user's own words.
- The narrowing question must be answerable in 1–3 words. Offer 2–4 chips.
- Cap questions at 3 per session. If already at 3, skip to confirm flow.
- For "not this" signals, call exclude_similar and immediately re-cluster.
- Never describe personal details from documents or medical images beyond
  generic labels ("Medicine photo", "Receipt from pharmacy").
- Always include a "skip_to_all" flag = true in your response.
```

### 8.2 Clue Parsing Prompt

```
Extract structured search filters from this user memory clue.
Return JSON only, no prose.

Schema:
{
  "time_range": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" } | null,
  "locations": ["city or place fragments"],
  "objects": ["things visible in the photo"],
  "mood_tags": ["atmospheric words"],
  "purpose_tags": ["receipt" | "reminder" | "proof" | "memory"],
  "people": ["relationship or name fragments"],
  "relative_anchors": ["before X", "after Y", "same day as Z"],
  "confidence": "high" | "medium" | "low"
}

Clue: "{user_clue}"
```

---

## 9. Baseline Mode

When `BaselineToggle` is set to **Baseline**:

- The frontend sends a `mode: "baseline"` flag with the search request.
- The backend **skips** the agent orchestrator entirely.
- A plain SQLite full-text search (`FTS5`) runs over `caption + objects + location_label`.
- Results are returned as a flat grid (no clusters, no questions).
- Session logging is identical — same fields — so both modes can be compared.

```
Baseline flow:
  clue → FTS5 keyword search → flat photo grid → user confirms or skips
```

---

## 10. Session Logging & Export

### Event fields logged per turn

```json
{
  "session_id": "uuid",
  "mode": "recall",
  "turn_index": 1,
  "raw_clue": "small cafe from our Goa trip, raining",
  "parsed_filters": { "locations": ["Goa"], "mood_tags": ["rainy"], ... },
  "clusters_shown": ["Cafe in Panjim Nov 2023", "Beach shack Oct 2023"],
  "question_asked": "Was there food on the table or were you outside?",
  "answer_given": "food on the table",
  "feedback_signal": null,
  "time_elapsed_ms": 2340,
  "timestamp": "2026-09-28T10:45:00Z"
}
```

### Export endpoint

```
GET /session/export?format=csv        → sessions.csv
GET /session/export?format=json       → sessions.json
GET /session/export?session_id=uuid   → single session detail
```

---

## 11. Privacy & Security

| Concern | Mitigation |
|---------|-----------|
| API keys exposed | All keys are server-side only (`ANTHROPIC_API_KEY` in `.env`); never sent to client |
| User-uploaded photos | Stored in `/tmp/uploads/{session_id}/`; auto-deleted after 24 h |
| "Delete my data" | `DELETE /photos/upload/{id}` wipes file + metadata immediately |
| Training on uploads | No uploads are sent to any training pipeline |
| Sensitive image content | Vision output filtered; purpose=`receipt`/`medical` gets generic cluster labels |
| Demo disclaimer | Footer reads: *"This is a research prototype, not connected to Google Photos."* |

---

## 12. Deployment

### Frontend — Vercel

```bash
cd frontend
vercel deploy --prod
# Set env vars:
#   NEXT_PUBLIC_API_URL=https://recall-api.onrender.com
```

### Backend — Render (Free tier)

```bash
# render.yaml
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
```

### Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `ANTHROPIC_API_KEY` | Backend `.env` | Claude API key |
| `VISION_API_KEY` | Pipeline `.env` | Used only at build time |
| `NEXT_PUBLIC_API_URL` | Frontend `.env` | Backend base URL |
| `MAX_UPLOAD_MB` | Backend `.env` | Max user upload size (default: 10) |
| `UPLOAD_TTL_HOURS` | Backend `.env` | Hours before uploads are purged (default: 24) |

---

## 13. Latency Strategy

| Step | Target | Technique |
|------|--------|-----------|
| Clue parsing (LLM) | < 800 ms | Claude Haiku for speed; cache repeat clues |
| DB search | < 100 ms | SQLite with indexes; pre-filtered on episode |
| Cluster naming (LLM) | < 1 200 ms | Stream clusters as soon as first is ready (SSE) |
| Total to first cluster | **< 3 s** | SSE streaming; show partial results immediately |
| Subsequent turns | < 2 s | Filters already parsed; only re-cluster |

---

## 14. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Claude tool-calling** over raw prompt | Structured JSON outputs; easier to validate and unit-test tools |
| **SQLite** over PostgreSQL | Zero-config, file-based, sufficient for 300 photos; swap trivially for production |
| **Pre-tagged metadata** (build-time vision) | Keeps live-search latency low; avoids per-query vision API cost |
| **SSE streaming** for clusters | Meets <3 s "first result" target even if full response takes longer |
| **ChromaDB** for embeddings | Lightweight, local, no external service needed; swappable to Pinecone |
| **Baseline mode** uses same data | Enables controlled A/B comparison within the same user test session |
| **Session log in SQLite** | Simple, portable, exportable to CSV without additional infra |

---

## 15. Future Considerations *(out of MVP scope)*

- Real Google Photos API integration (OAuth, GAPI)
- On-device vision/embedding model for full privacy
- Multi-user support with authentication
- Persistent user memory (episodes from past sessions)
- Voice clue input
- Progressive Web App (PWA) for offline-capable mobile use

---

*Based on [`Problemstatement.md`](./Problemstatement.md)*
