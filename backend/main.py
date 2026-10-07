"""
backend/main.py
================
FastAPI application entry point for the Recall API.

Starts up:
  - CORS middleware (allow all origins for MVP; restrict in production)
  - Router registration
  - Database initialisation
  - Background scheduler for expired-upload cleanup

Run:
    cd backend
    uvicorn main:app --reload
"""

import os
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
)
log = logging.getLogger("recall")


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ───────────────────────────────────────────────────────────────
    log.info("Starting Recall API…")

    # Init session log DB
    from storage.session_db import init_db as init_session_db
    init_session_db()
    log.info("Session DB initialised.")

    # Health-check: verify demo library is loaded
    from storage.metadata_db import count_photos
    n = count_photos()
    if n == 0:
        log.warning(
            "⚠️  Demo library is empty. Run the pipeline scripts first:\n"
            "   cd pipeline && python download_images.py && python tag_images.py\n"
            "   && python import_to_sqlite.py && python embed_images.py"
        )
    else:
        log.info("Demo library loaded — %d photos in metadata.db.", n)

    # Warm-up ChromaDB (lazy init runs in background)
    try:
        from storage.chroma_store import _init as chroma_init
        chroma_init()
    except Exception as e:
        log.warning("ChromaDB warm-up skipped: %s", e)

    # Start upload cleanup scheduler (every 60 minutes)
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from cleanup import purge_expired_uploads
        scheduler = AsyncIOScheduler()
        scheduler.add_job(purge_expired_uploads, "interval", minutes=60,
                          id="upload_cleanup", replace_existing=True)
        scheduler.start()
        log.info("Upload cleanup scheduler started (every 60 min).")
        app.state.scheduler = scheduler
    except ImportError:
        log.warning("APScheduler not installed — upload auto-cleanup disabled.")
    except Exception as e:
        log.warning("Scheduler start failed (non-fatal): %s", e)

    yield

    # ── Shutdown ──────────────────────────────────────────────────────────────
    if hasattr(app.state, "scheduler"):
        app.state.scheduler.shutdown(wait=False)
    log.info("Recall API shutting down.")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Recall API",
    description=(
        "AI-native photo retrieval agent backend. "
        "Docs at /docs | Redoc at /redoc"
    ),
    version="0.2.0",
    lifespan=lifespan,
)

# CORS — allow the Vercel frontend origin (set FRONTEND_URL in production)
FRONTEND_URL = os.environ.get("FRONTEND_URL", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
from routers import session, export, photos                   # noqa: E402

app.include_router(session.router, prefix="/session", tags=["session"])
app.include_router(export.router,  prefix="/session", tags=["export"])
app.include_router(photos.router,  prefix="/photos",  tags=["photos"])


# ── Health endpoint ───────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health():
    from storage.metadata_db import count_photos
    from storage.chroma_store import count_vectors
    from storage.session_db import DB_PATH as SESSION_DB_PATH
    from storage.metadata_db import DB_PATH as META_DB_PATH
    return {
        "status":         "ok",
        "db_photos":      count_photos(),
        "chroma_vectors": count_vectors(),
        "meta_db":        str(META_DB_PATH),
        "session_db":     str(SESSION_DB_PATH),
    }


# ── Static files (demo library images) ───────────────────────────────────────
images_dir = Path(__file__).parent / "library" / "images"
images_dir.mkdir(parents=True, exist_ok=True)
app.mount("/images", StaticFiles(directory=str(images_dir)), name="images")

# Also serve user uploads (scoped by session_id subfolder)
uploads_dir = Path(__file__).parent / "library" / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")
