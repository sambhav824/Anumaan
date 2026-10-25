# अनुमान (Anumaan) — Multilingual Construction Estimation SaaS

> **मिनटों में पूरा अनुमान।**  
> *Accurate construction estimation, quotation, and project tracking in minutes.*

Anumaan (अनुमान) is a modern, multilingual construction estimation and project quotation platform engineered specifically for civil engineers, general contractors, developers, and quantity surveyors in India.

---

## Phase 1 Overview

Phase 1 provides the production-grade foundation of the SaaS platform:
- **Multilingual-First Engine**: Complete trilingual support across **English (`en`)**, **मराठी (`mr`)**, and **हिन्दी (`hi`)** with instant zero-loss language switching that never wipes active form inputs.
- **Enterprise Multi-Tenancy**: Organization creation, membership management, and strict Row Level Security (RLS) ensuring total data isolation between contracting companies.
- **Project Lifecycle Management**: Building and road project tracking (`planning`, `in_progress`, `completed`, `archived`) with Unicode support for regional project scopes.
- **Client Directory**: Client management with GSTIN handling and composite foreign-key integrity enforcing client-organization matching.
- **Real-Data Dashboard**: Real-time project counts and status breakdowns directly derived from authorized records, with clear "Coming Soon" badges for future modules.
- **Verified Security Architecture**: Supabase JWT authentication, server-side tenant authorization middleware, and automated cross-tenant intrusion tests.

---

## Tech Stack

```
Frontend:   Next.js 14 (App Router) + TypeScript Strict + Tailwind CSS + Lucide Icons
Typography: Inter + Noto Sans Devanagari (optimized for Marathi & Hindi)
Backend:    FastAPI (Python 3.14) + Pydantic v2 + SQLAlchemy 2.0 Async
Database:   Supabase PostgreSQL + Row Level Security (RLS) + Private Supabase Storage
Testing:    Vitest + React Testing Library (Web) & Pytest + HTTPX (API)
```

---

## Monorepo Layout

```
├── apps/
│   └── web/                     # Next.js 14 frontend application
│       ├── src/
│       │   ├── app/             # App router pages: (auth), (dashboard)
│       │   ├── components/      # UI components (Sidebar, Header, Forms, Modals)
│       │   ├── context/         # I18nContext, AuthContext, OrgContext
│       │   ├── messages/        # Translation dictionaries (en.json, mr.json, hi.json)
│       │   └── lib/             # Supabase & API client bindings
│       └── tests/               # Vitest suites (i18n completeness, form state)
├── services/
│   └── api/                     # FastAPI backend service
│       ├── app/
│       │   ├── core/            # Config, security, database engine
│       │   ├── models/          # SQLAlchemy async data models
│       │   ├── schemas/         # Pydantic v2 validation schemas
│       │   └── routers/         # Health, profile, orgs, clients, projects
│       └── tests/               # Pytest suites (Auth, Org isolation, CRUD)
├── supabase/
│   ├── migrations/              # Versioned SQL migrations with RLS policies
│   │   ├── 00001_initial_schema.sql
│   │   └── 00002_storage_buckets.sql
│   └── seed.sql                 # Sample Marathi, Hindi, & English data
└── docs/                        # Architecture, security, and setup documentation
```

---

## Quickstart

### 1. Environment Setup
```bash
cp .env.example .env
```

### 2. Run Backend & Tests
```bash
cd services/api
python -m venv .venv
.\.venv\Scripts\activate       # On Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
pytest -v                      # Runs all 7 authorization & isolation tests
uvicorn app.main:app --reload --port 8000
```

### 3. Run Frontend & Tests
```bash
cd apps/web
npm install
npm run test                   # Runs i18n completeness & form persistence tests
npm run typecheck              # Strict TypeScript verification
npm run dev                    # Starts Next.js on http://localhost:3000
```

---

## Documentation

- [System Architecture](docs/architecture.md)
- [Database & Security Model](docs/database-and-security.md)
- [Setup & Deployment Guide](docs/setup-instructions.md)
