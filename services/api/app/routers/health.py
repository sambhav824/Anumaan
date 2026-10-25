from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.core.config import settings

router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    General health overview endpoint.
    Safely reports service status and database connectivity without leaking internal errors.
    """
    db_status = "connected"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "service": "Anumaan (\u0905\u0928\u0941\u092e\u093e\u0928) API",
        "tagline": "\u092e\u093f\u0928\u091f\u094b\u0902 \u092e\u0947\u0902 \u092a\u0942\u0930\u093e \u0905\u0928\u0941\u092e\u093e\u0928\u0964",
        "version": "0.1.0",
        "database": db_status,
        "supported_locales": settings.SUPPORTED_LOCALES,
        "default_locale": settings.DEFAULT_LOCALE,
    }


@router.get("/live")
async def liveness_check():
    """
    Lightweight liveness probe for orchestrators and load balancers.
    Returns 200 OK as long as the Python application process is alive.
    """
    return {"status": "alive"}


@router.get("/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """
    Readiness probe for zero-downtime deployments and load balancers.
    Verifies that the database pool is reachable before directing traffic.
    Returns 200 OK if ready, 503 Service Unavailable if database is unreachable.
    """
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "database": "disconnected"}
        )
