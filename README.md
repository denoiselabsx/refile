# refile

Monorepo for the Refile platform, combining the frontend and backend projects with full upstream history preserved via `git subtree`.

## Repository Layout

- `frontend/` - Next.js + React web app for AI-assisted file workflows, presets, auth, and dashboard UX.
- `backend/` - FastAPI service for uploads, prompt persistence, AI command generation, and file access APIs.

## Upstream Sources

- Frontend source: https://github.com/SaiTeja-2101/refile-frontend
- Backend source: https://github.com/YashvanthSankar/refile-backend

## What the App Does

- Upload files and submit prompts for AI-generated Linux/media-processing commands.
- Run conversational follow-up processing requests.
- Store prompt/file metadata in Supabase.
- Support presets, user-specific history, and secure per-user file access patterns.

## Tech Stack

- Frontend: Next.js, React, Tailwind CSS, Supabase, Google OAuth flow.
- Backend: FastAPI, Supabase, LangChain/LangGraph, Mistral AI integration.

## Quick Start

### Frontend (`frontend/`)

1. Configure `.env` with API + Supabase values.
2. Install dependencies and run the dev server (see `frontend/README.md`).
3. By default the app runs on `http://localhost:3000`.

### Backend (`backend/`)

1. Create and activate a Python virtual environment.
2. Configure `.env` from `.env.example` with Supabase + Mistral credentials.
3. Install requirements and run Uvicorn (see `backend/README.md`).
4. By default the API runs on `http://localhost:8000`.

## API Highlights (Backend)

- `POST /api/upload`
- `POST /api/process`
- `GET /api/list/{user_id}`
- `GET /api/download/{user_id}/{stored_filename}`
- `GET /api/health`

Refer to `backend/README.md` and `frontend/README.md` for full setup details and project-specific notes.
