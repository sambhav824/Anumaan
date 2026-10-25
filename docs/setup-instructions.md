# अनुमान (Anumaan) — Setup & Deployment Guide

This guide explains how to configure and run Anumaan across local development, testing, and production environments.

---

## 1. Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Python**: 3.10 or higher (Python 3.14 supported)
- **Git**
- Optional: Supabase CLI or active Supabase cloud project

---

## 2. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Populate the following variables:

```ini
# Frontend (apps/web)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_DEFAULT_LOCALE=en

# Backend (services/api)
ENVIRONMENT=development
DATABASE_URL=sqlite+aiosqlite:///./anumaan.db
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=your-supabase-jwt-secret-minimum-32-characters-long
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

---

## 3. Database Migrations (Supabase)

If using a Supabase Cloud project or local Supabase instance:

1. Open your Supabase Dashboard -> **SQL Editor**.
2. Run `supabase/migrations/00001_initial_schema.sql` to create tables, functions, triggers, and RLS policies.
3. Run `supabase/migrations/00002_storage_buckets.sql` to configure private storage buckets.
4. (Optional) Run `supabase/seed.sql` to populate sample construction projects in Marathi, Hindi, and English.

---

## 4. Backend Setup & Test Runner

```bash
cd services/api

# 1. Create and activate virtual environment
python -m venv .venv
# On Windows:
.\.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run automated tests (Auth, Org Isolation, Clients, Projects)
pytest -v

# 4. Start development server
uvicorn app.main:app --reload --port 8000
```

API will be live at `http://localhost:8000` with Swagger docs at `http://localhost:8000/docs`.

---

## 5. Frontend Setup & Test Runner

```bash
cd apps/web

# 1. Install dependencies
npm install

# 2. Run automated test suites (i18n completeness, form state preservation)
npm run test

# 3. Run type checking & linting
npm run typecheck
npm run lint

# 4. Start Next.js development server
npm run dev
```

Frontend will be accessible at `http://localhost:3000`.
