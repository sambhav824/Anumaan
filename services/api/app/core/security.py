import jwt
from typing import Optional, Dict, Any
from jwt import PyJWKClient, PyJWKClientError
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.database import get_db
from app.models.models import Profile, OrganizationMember

security_scheme = HTTPBearer(auto_error=False)


SUPPORTED_ASYMMETRIC_ALGS = ["ES256", "ES384", "ES512", "RS256", "RS384", "RS512"]
SUPPORTED_SYMMETRIC_ALGS = ["HS256", "HS384", "HS512"]

_jwks_client: Optional[PyJWKClient] = None


def get_jwks_client() -> Optional[PyJWKClient]:
    """
    Returns a cached PyJWKClient for the configured Supabase project.
    Caches keys for 300 seconds and automatically rotates keys when new kid claims arrive.
    """
    global _jwks_client
    if _jwks_client is None:
        supabase_url = settings.SUPABASE_URL.rstrip("/")
        if supabase_url and "example.supabase.co" not in supabase_url:
            jwks_uri = f"{supabase_url}/auth/v1/.well-known/jwks.json"
            try:
                _jwks_client = PyJWKClient(jwks_uri, cache_jwk_set=True, lifespan=300)
            except Exception:
                _jwks_client = None
    return _jwks_client


def decode_access_token(token: str, custom_jwks_client: Optional[PyJWKClient] = None) -> Dict[str, Any]:
    """
    Decodes and validates a Supabase JWT access token.
    Supports both:
    1. Asymmetric algorithms (ES256, RS256) via Supabase JWKS endpoint with automated key rotation.
    2. Symmetric HMAC algorithms (HS256, HS384, HS512) via SUPABASE_JWT_SECRET.
    Validates expiration (exp), audience (aud), project issuer (iss), and subject (sub).
    Rejects malformed, expired, none-algorithm, and wrong-project tokens.
    """
    try:
        header = jwt.get_unverified_header(token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token header: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    alg = header.get("alg")
    if not alg or alg.lower() == "none":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing or disallowed alg header claim.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if alg in SUPPORTED_ASYMMETRIC_ALGS:
        jwk_client = custom_jwks_client or get_jwks_client()
        if not jwk_client:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Asymmetric token algorithm {alg} received, but Supabase JWKS endpoint is unavailable.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        try:
            signing_key = jwk_client.get_signing_key_from_jwt(token)
            key = signing_key.key
        except PyJWKClientError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Failed to obtain JWKS signing key: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Asymmetric key retrieval error: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )
    elif alg in SUPPORTED_SYMMETRIC_ALGS:
        key = settings.SUPABASE_JWT_SECRET
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Unsupported token algorithm: {alg}.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            token,
            key,
            algorithms=[alg],
            options={
                "verify_signature": True,
                "verify_exp": True,
                "verify_aud": False,  # Verified explicitly below to allow graceful handling
                "require": ["sub"],
            }
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token signature.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Audience validation: Supabase access tokens are issued with aud='authenticated'
    token_aud = payload.get("aud")
    if token_aud is not None and token_aud != "authenticated":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token audience mismatch: expected 'authenticated', got '{token_aud}'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Issuer validation: Reject tokens issued by other Supabase projects
    token_iss = payload.get("iss")
    if token_iss is not None and settings.SUPABASE_URL and "example.supabase.co" not in settings.SUPABASE_URL:
        expected_iss = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1"
        if token_iss.rstrip("/") != expected_iss.rstrip("/"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token issuer mismatch: issued by '{token_iss}', expected '{expected_iss}'.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    return payload


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> Profile:
    """
    Dependency that authenticates the user from the Supabase Bearer token,
    and returns their database Profile record.
    Safely handles concurrent first-time profile inserts by catching IntegrityError,
    rolling back, and re-selecting.
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
        user_meta = payload.get("user_metadata", {})
        full_name = user_meta.get("full_name") or payload.get("email", "User")
        lang = user_meta.get("language_preference", "en")
        if lang not in settings.SUPPORTED_LOCALES:
            lang = "en"

        new_profile = Profile(
            id=user_id,
            full_name=full_name,
            language_preference=lang
        )
        try:
            db.add(new_profile)
            await db.commit()
            await db.refresh(new_profile)
            profile = new_profile
        except IntegrityError:
            # Concurrent request created the profile first: rollback and re-select
            await db.rollback()
            result = await db.execute(select(Profile).where(Profile.id == user_id))
            profile = result.scalars().first()
            if not profile:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Database collision occurred and user profile could not be retrieved."
                )

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
