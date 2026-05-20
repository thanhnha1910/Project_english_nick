# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

English-learning web app ("VocabMaster") with three core surfaces: paragraph/audio listening, speaking practice (recording + n8n-based analysis), and vocabulary review using the FSRS spaced-repetition algorithm. FastAPI backend, React+Vite frontend, SQLite locally / PostgreSQL on Render.

UI strings and code comments are largely in Vietnamese — keep that style when editing.

## Commands

Backend (run from `backend/`):
```bash
# First-time setup
python -m venv venv && source venv/bin/activate && pip install -r requirements.txt

# Dev server (autoreload, port 8000)
./dev.sh                          # or: uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Frontend (run from `frontend/`):
```bash
npm install
npm run dev      # Vite dev server on port 5173, exposed on LAN (host: true)
npm run build    # Outputs to frontend/dist
npm run lint     # ESLint
```

Production build (Render uses this via `build.sh`):
```bash
./build.sh       # Installs backend+frontend deps, builds frontend, copies dist → backend/frontend_dist
```

There is no test suite.

## Architecture

### Single-service deployment model
In production the FastAPI app serves both the API and the React SPA from one process. The frontend is built with Vite, then copied to `backend/frontend_dist/`. `backend/main.py` mounts that directory and uses a catch-all route to serve `index.html` for client-side routes. This is why `app.include_router(...)` calls and `/static` mounts MUST come before the catch-all in `main.py` — order matters.

In dev, the frontend (5173) and backend (8000) run separately. `frontend/src/services/api.js` detects this by checking `window.location.port === '5173'` and rewrites the API base URL to `http://<hostname>:8000` accordingly. No CORS proxy — the backend allows `*` origins.

### Database: dual SQLite/Postgres
`backend/models.py` reads `DATABASE_URL` env var (set by Render from the bound database) and falls back to local SQLite (`./english_learning.db`). It rewrites `postgres://` → `postgresql://` (SQLAlchemy 2.x requirement) and applies `check_same_thread=False` only for SQLite. Tables are auto-created on startup via `init_db()` — there are no Alembic migrations.

To migrate local SQLite data up to Render Postgres, use `migrate_data.py` at the repo root with `DATABASE_URL` env var set. It does UPSERT-on-id and resets sequences afterward.

### Backend module layout
- `main.py` — app entry, CORS, router registration, frontend serving
- `models.py` — SQLAlchemy models + `get_db()` dependency
- `schemas.py` — all Pydantic request/response schemas (shared across routers)
- `routers/` — one file per domain: `audio`, `stages`, `speaking`, `vocabulary`. New routes go in the matching file and are auto-included if added to the `from routers import …` line in `main.py`.

### FSRS spaced-repetition (vocabulary)
The `Word` model carries FSRS state as 8 columns (`fsrs_state`, `fsrs_step`, `fsrs_stability`, `fsrs_difficulty`, `fsrs_due`, `fsrs_last_review`, `fsrs_reps`, `fsrs_lapses`). The scheduler is configured Anki-style in `routers/vocabulary.py` (90% target retention, 1m/10m learning steps). On each review, `_word_to_fsrs_card`/`_save_fsrs_card` reconstruct a `py-fsrs` `Card` from the row, run `scheduler.review_card`, and write back. Datetimes are stored naive (UTC) and converted to tz-aware on read — be careful preserving that contract if you touch this code.

Ratings: 1=Again, 2=Hard, 3=Good, 4=Easy. Submit via `POST /api/vocabulary/review` with a batch of `{word_id, rating}`.

### Speaking analysis: async via n8n
Speaking analysis is NOT done in-process. `routers/speaking.py` proxies audio (base64-encoded) to an n8n webhook at `N8N_BASE_URL = "https://n8n-nick.abapi.dev/webhook"`:
- `POST /api/speaking/analyze` → n8n `/speaking-start` → returns a `jobId`
- `GET /api/speaking/analyze/status/{job_id}` → n8n `/speaking-status?jobId=...`

The frontend polls status via `pollAnalysisResult` in `src/services/api.js` (60 attempts, 2s interval). `status: not_found` is treated as "still processing" because n8n may not have persisted staticData yet. If editing this flow, preserve that tolerance.

### Audio import pipeline + n8n transcript generation
`POST /api/audios/bulk-import` accepts many files plus an optional parallel `transcripts` JSON array — files are **natural-sorted by filename** (so `01, 02, ..., 10`, not `01, 10, 2`) before being zipped with transcripts. The same natural-sort is repeated in `bulk_update_transcripts` so a later transcript-update call lines up with the original import order. Don't change the sort in one place without the other.

For audios with no transcript, n8n can poll `GET /api/audios/without-transcript`, generate via Whisper/GPT, and write back via `POST /api/audios/webhook/generate-transcript` (body: `{audio_id, transcript}`).

### Frontend structure
- `src/pages/` — one page per route, all wired in `src/App.jsx` with `react-router-dom`
- `src/services/api.js` — single axios client; every backend call goes through here
- `src/components/` — shared UI (`AudioPlayer`, `VoiceRecorder`, `TranscriptViewer`, `BulkImporter`, `Navigation`, `MultiSelect`)
- No state management library — components use local state + props

`STATIC_BASE_URL` (exported from `api.js`) is the right thing to prefix when building URLs for files under `/static/audio/...` — it handles the dev/prod hostname split.

## Deployment (Render)

`render.yaml` defines one web service + one Postgres DB. Build = `bash build.sh`, start = `gunicorn main:app -w 1 -k uvicorn.workers.UvicornWorker`. Single worker is intentional (SQLite-style code paths assume it). `DATABASE_URL` is injected from the bound database.
