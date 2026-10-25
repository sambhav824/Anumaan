from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Profile
from app.schemas.profile import ProfileRead, ProfileUpdate
from app.core.config import settings

router = APIRouter(prefix="/api/profile", tags=["Profile"])


@router.get("", response_model=ProfileRead)
async def get_profile(
    current_user: Profile = Depends(get_current_user)
):
    """Returns the authenticated user's profile and language preferences."""
    return current_user


@router.patch("", response_model=ProfileRead)
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: Profile = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Updates user profile and persists language preference (en, mr, hi)."""
    if profile_data.language_preference is not None:
        if profile_data.language_preference not in settings.SUPPORTED_LOCALES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported language. Supported: {settings.SUPPORTED_LOCALES}"
            )
        current_user.language_preference = profile_data.language_preference

    if profile_data.full_name is not None:
        current_user.full_name = profile_data.full_name.strip()

    if profile_data.avatar_url is not None:
        current_user.avatar_url = profile_data.avatar_url.strip()

    await db.commit()
    await db.refresh(current_user)
    return current_user
