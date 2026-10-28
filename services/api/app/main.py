from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.rate_limiter import RateLimitMiddleware
from app.core.database import init_db
from app.routers import (
    health_router,
    auth_router,
    profile_router,
    organizations_router,
    clients_router,
    projects_router,
    estimates_router,
    quotations_router,
    rates_router,
    global_rates_router,
    expenses_router,
    drawings_router,
    geolocation_router,
    invoices_router,
)



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema for development / testing environments
    if "sqlite" in settings.DATABASE_URL:
        await init_db()
    yield


app = FastAPI(
    title="अनुमान (Anumaan) API",
    description="Backend API for Anumaan — Multilingual Construction Estimation SaaS (मिनटों में पूरा अनुमान।)",
    version="0.1.0",
    lifespan=lifespan,
)

# Rate Limiting Middleware (Inner)
app.add_middleware(RateLimitMiddleware)

# CORS Middleware (Outermost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(organizations_router)
app.include_router(clients_router)
app.include_router(projects_router)
app.include_router(estimates_router)
app.include_router(quotations_router)
app.include_router(global_rates_router)
app.include_router(rates_router)
app.include_router(expenses_router)
app.include_router(drawings_router)
app.include_router(geolocation_router)
app.include_router(invoices_router)



@app.get("/")
async def root():
    return {
        "brand": "अनुमान (Anumaan)",
        "tagline": "मिनटों में पूरा अनुमान।",
        "description": "Professional Multilingual Construction Estimation SaaS for India",
        "supported_languages": {
            "en": "English",
            "mr": "मराठी (Marathi)",
            "hi": "हिन्दी (Hindi)"
        },
        "docs_url": "/docs",
        "health_check": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
