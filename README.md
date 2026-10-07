# Recall — AI-Native Photo Retrieval Agent

> A conversational, clue-based photo retrieval MVP for Google Photos built on Claude AI. Retrieve elusive photo memories that you can't quite describe through natural progressive episode clustering, discriminating narrowing questions, and timeline anchor pivots.

---

## Overview

Traditional photo search relies on exact keyword matching, which fails when users have hazy, episodic memories (e.g., *"the coffee shop receipt in Kyoto"* or *"picture after the beach day"*). **Recall** acts as an AI conversational detective: it interprets messy temporal and sensory clues, organizes candidate photos into chronological episode clusters, asks high-leverage narrowing questions, and supports timeline anchoring to pinpoint photos quickly.

---

## Project Structure

```
MVP_Googlephotos/
├── frontend/        # Next.js 16 (App Router, TypeScript, Vanilla CSS, Inter font)
│   ├── app/         # Layout, core page state machine, globals.css design system
│   ├── components/  # SearchBar, BaselineToggle, ClusterCard, AgentPanel, PhotoGrid,
│   │                # AnswerChips, PhotoModal, AnchorPicker, ExportModal, SuccessOverlay
│   ├── lib/         # TypeScript types, streaming SSE client, API helpers
│   ├── vercel.json  # Vercel deployment blueprint
│   └── .env.example # Frontend environment template
├── backend/         # FastAPI server (Agent loop, SSE streaming, SQLite + ChromaDB)
│   ├── agent/       # Claude Haiku orchestrator, 5 prompt definitions, tool-use loop
│   ├── routers/     # /session (start, feedback, confirm, anchor), /photos, /export
│   ├── storage/     # SQLite metadata DB (FTS5), session turn DB, ChromaDB vector store
│   ├── tests/       # Phase 2 & Phase 4/5 integration tests (pytest + httpx)
│   ├── render.yaml  # Render web service deployment blueprint
│   └── cleanup.py   # Background job purging expired uploads
├── pipeline/        # Offline data pipeline (builds demo library)
│   ├── episode_manifest.json  # 6 realistic life episodes (Kyoto, Sick Week, etc.)
│   ├── download_images.py     # Unsplash downloader with resumption
│   ├── tag_images.py          # Claude Haiku vision tagger (PII-safe)
│   ├── import_to_sqlite.py    # Imports metadata and indexes captions into FTS5
│   └── embed_images.py        # Generates multimodal embeddings into ChromaDB
└── docs/            # Architecture, implementation plan, edge case catalogue
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 18+ (tested on v26) | Runs Next.js frontend |
| **Python** | 3.11+ | Runs FastAPI backend & data pipeline |
| **pip** / **npm** | Latest | Package managers |
| **Anthropic API Key** | — | Powers Claude Haiku tool-use loop & vision tagging |
| **Unsplash Key** | — | (Optional) For downloading demo library photos |

---

## Quick Start (Local Development)

### 1. Configure Environment

Copy `.env.example` to `.env` in the root and set your API keys:

```bash
cp .env.example .env
```

Ensure your `.env` contains:
```env
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
NEXT_PUBLIC_API_URL=http://localhost:8000
EXPORT_TOKEN=recall-export-secret-token
```

### 2. Run the Demo Library Pipeline (Run Once)

```bash
cd pipeline
pip install -r requirements.txt

# Download 6 realistic episodes (~30 photos)
python download_images.py

# Tag with Claude vision (~$0.40 total cost)
python tag_images.py

# Index metadata into SQLite & FTS5
python import_to_sqlite.py

# Generate semantic embeddings into ChromaDB
python embed_images.py
cd ..
```

### 3. Start the Backend API

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# → API running at http://localhost:8000
# → Swagger interactive docs at http://localhost:8000/docs
```

### 4. Start the Frontend Application

```bash
cd frontend
npm install
npm run dev
# → App running at http://localhost:3000
```

---

## 5 Evaluation Tasks

You can test the system end-to-end against the 5 canonical retrieval tasks from the problem statement (accessible directly as one-click chips on the search bar):

| # | Task Clue | Expected Episode Cluster | Evaluation Goal |
|---|-----------|--------------------------|-----------------|
| 1 | *"The coffee shop receipt in Kyoto"* | Kyoto Cafes & Receipts (Nov 2023) | Find receipt document in top 3 clusters |
| 2 | *"Medicine from when I was sick"* | Sick Week (Jan 2024) | Semantic mapping from "sick" to pharmacy items |
| 3 | *"Screenshot around when I changed jobs"* | Job Change & Resignation (Mar 2023) | Temporal & document OCR retrieval |
| 4 | *"Wedding, my cousin was in it"* | Cousin's Wedding (Dec 2023) | Person & event co-occurrence grouping |
| 5 | *"Picture after the beach day"* | Beach Day Sunset & Dinner | Timeline anchor resolution (after beach) |

---

## Baseline Mode Comparison

The app includes a prominent **Recall Agent (AI-Native)** vs **Baseline Search (FTS5)** mode switcher:
- **Recall Mode**: LLM extracts structured filters, calls ChromaDB, streams 3–5 named episode clusters with match reasoning, presents discriminating narrowing questions, and lets you pivot with timeline anchors.
- **Baseline Mode**: Directly executes SQLite FTS5 keyword indexing, returning flat results within 500 ms without conversational guidance.
- Both modes log identical session metrics into the SQLite `turns` table to allow direct A/B performance comparison.

---

## Exporting Session Evaluation Logs

### 1. Via Frontend UI
Click the **"Export"** button in the top navigation bar or the **"Export Logs (CSV / JSON)"** button in the footer to open the Export dialog. Choose between exporting the current session or all recorded sessions as CSV or JSON.

### 2. Via REST API
```bash
# Export all session turns as CSV
curl "http://localhost:8000/session/export?format=csv&token=recall-export-secret-token" -o sessions.csv

# Export single session as JSON
curl "http://localhost:8000/session/export?format=json&session_id=<UUID>&token=recall-export-secret-token"
```

The exported CSV includes all 16 evaluation metric columns:
1. `session_id`
2. `mode` (`recall` vs `baseline`)
3. `started_at`
4. `ended_at`
5. `outcome` (`found`, `skipped`, `abandoned`)
6. `confirmed_photo`
7. `turn_index`
8. `raw_clue`
9. `parsed_filters`
10. `clusters_shown`
11. `question_asked`
12. `answer_given`
13. `feedback_signal`
14. `excluded_ids`
15. `time_elapsed_ms`
16. `timestamp`

---

## Deployment Guide

### Deploying the Backend to Render

1. Create a new Web Service on [Render](https://render.com).
2. Connect your GitHub repository.
3. Render will automatically detect [`backend/render.yaml`](backend/render.yaml) Blueprint:
   - **Environment:** Python
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. In the Render Dashboard, add your `GROQ_API_KEY` (and optionally `GROQ_MODEL=llama-3.3-70b-versatile`) under **Environment Variables**.
5. Ensure the persistent disk mount (`/opt/render/project/src/storage`) is enabled for SQLite and ChromaDB data.
6. Note your live service URL: `https://recall-api.onrender.com`.

### Deploying the Frontend to Vercel

1. Push the code to your GitHub repository.
2. Import the project into [Vercel](https://vercel.com) and select the `frontend` root directory.
3. Under **Environment Variables**, set:
   ```env
   NEXT_PUBLIC_API_URL=https://recall-api.onrender.com
   ```
4. Deploy. Vercel will use [`frontend/vercel.json`](frontend/vercel.json) and Turbopack to generate the static optimized production bundle.
5. Access your live app at `https://recall.vercel.app`.

---

## Swapping in a Custom Photo Library

To evaluate Recall against your own photos:
1. Place JPEG/PNG images in `pipeline/library/raw_images/`.
2. Define custom episodes in `pipeline/episode_manifest.json`.
3. Run `python tag_images.py && python import_to_sqlite.py && python embed_images.py`.
4. Restart the backend to load the updated library.

---

## Privacy & Research Compliance

- **Research Prototype:** Recall is an independent research prototype and is not connected to personal Google accounts.
- **Auto-Cleanup:** Temporary user uploads are stored in isolated session folders and automatically purged every 24 hours by a background APScheduler worker.
- **On-Demand Deletion:** Users can immediately purge their active session and uploads using the **"Reset Data"** button in the app footer.
