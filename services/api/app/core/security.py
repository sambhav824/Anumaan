import jwt
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.database import get_db
from app.models.models import Profile, OrganizationMember

security_scheme = HTTPBearer(auto_error=False)


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decodes and validates a Supabase JWT access token.
    Raises HTTPException(401) on invalid or expired token.
    """
    try:
        # Supabase uses HS256 with JWT secret by default
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}  # Supabase aud is typically 'authenticated'
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> Profile:
    """
    Dependency that authenticates the user from the Supabase Bearer token,
    and returns their database Profile record.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing subject (sub) claim.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch profile from DB
    result = await db.execute(select(Profile).where(Profile.id == user_id))
    profile = result.scalars().first()

    if not profile:
        # If user exists in auth but profile record wasn't created yet (e.g. SQLite local dev)
        user_meta = payload.get("user_metadata", {})
        full_name = user_meta.get("full_name") or payload.get("email", "User")
        lang = user_meta.get("language_preference", "en")
        if lang not in settings.SUPPORTED_LOCALES:
            lang = "en"

        profile = Profile(
            id=user_id,
            full_name=full_name,
            language_preference=lang
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    return profile


async def verify_org_membership(
    organization_id: str,
    user_id: str,
    db: AsyncSession
) -> OrganizationMember:
    """
    Strictly verifies that user_id is an active member of organization_id.
    Prevents cross-tenant access.
    """
    result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == organization_id,
            OrganizationMember.user_id == user_id
        )
    )
    membership = result.scalars().first()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not authorized to access this organization's data."
        )
    return membership


async def verify_org_admin(
    organization_id: str,
    user_id: str,
    db: AsyncSession
) -> OrganizationMember:
    """
    Strictly verifies that user_id has an owner or admin role in organization_id.
    """
    membership = await verify_org_membership(organization_id, user_id, db)
    if membership.role not in ("owner", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Owner or Administrator privileges required."
        )
    return membership
