# Pipeline — Data Build Instructions

This directory contains all build-time scripts that create the demo photo library.  
Run these scripts **once** before starting the backend. They do not run during live searches.

---

## Run Order

```bash
cd pipeline
pip install -r requirements.txt

# Step 1 — Download images from Unsplash
python download_images.py

# Step 2 — Tag every image with Claude vision (~$0.40 for 200 images)
python tag_images.py

# Step 3 — Import metadata into SQLite
python import_to_sqlite.py

# Step 4 — Generate ChromaDB embeddings
python embed_images.py

# Step 5 — Verify everything is correct
python verify_library.py
```

---

## Directory Layout After Running

```
pipeline/
├── library/
│   ├── raw_images/
│   │   ├── goa_trip_nov_2023/    ← downloaded images
│   │   ├── sick_week_jan_2024/
│   │   ├── job_change_mar_2023/
│   │   ├── cousins_wedding_dec_2023/
│   │   ├── beach_day_oct_2023/
│   │   └── everyday/
│   ├── download_manifest.json    ← written by download_images.py
│   ├── metadata.json             ← written by tag_images.py
│   └── tag_errors.log            ← images that failed tagging
│
└── ... scripts ...
```

After Step 3, outputs are copied to:
```
backend/storage/metadata.db     ← SQLite database
backend/storage/chroma/         ← ChromaDB vector store
```

---

## Swapping the Library

1. Add your images to `library/raw_images/<episode_slug>/`
2. Edit `episode_manifest.json` to add/change episodes
3. Re-run Steps 2–5

---

## Cost Estimates

| Step | API | Approx Cost |
|------|-----|-------------|
| `download_images.py` | Unsplash (free tier) | Free |
| `tag_images.py` | Claude claude-3-haiku-20240307 | ~$0.40 for 200 images |
| `import_to_sqlite.py` | None | Free |
| `embed_images.py` | Local model (all-MiniLM-L6-v2) | Free |
