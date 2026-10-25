from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.core.config import settings

router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check endpoint providing status of API and database connectivity."""
    db_status = "connected"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "service": "Anumaan (अनुमान) API",
        "tagline": "मिनटों में पूरा अनुमान।",
        "version": "0.1.0",
        "database": db_status,
        "supported_locales": settings.SUPPORTED_LOCALES,
        "default_locale": settings.DEFAULT_LOCALE,
    }
