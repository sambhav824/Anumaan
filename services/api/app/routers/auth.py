import hashlib
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Profile, Organization, OrganizationMember

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class SignUpRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    company_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


def hash_password(password: str) -> str:
    salt = "anumaan_salt_2026"
    return hashlib.sha256(f"{salt}{password}".encode("utf-8")).hexdigest()


def generate_jwt_token(user_id: str, email: str, full_name: str, language_preference: str = "en") -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "user_metadata": {
            "full_name": full_name,
            "language_preference": language_preference,
        },
        "exp": datetime.now(timezone.utc) + timedelta(days=14),
    }
    return jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(req: SignUpRequest, db: AsyncSession = Depends(get_db)):
    """Registers a new user and creates their organization."""
    # Check if email already registered
    existing_res = await db.execute(select(Profile).where(Profile.email == req.email.lower()))
    if existing_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please sign in."
        )

    user_id = str(uuid.uuid4())
    hashed_pwd = hash_password(req.password)

    profile = Profile(
        id=user_id,
        email=req.email.lower(),
        hashed_password=hashed_pwd,
        full_name=req.full_name.strip(),
        language_preference="en",
    )
    db.add(profile)
    await db.flush()

    # Create company / organization
    company_name = req.company_name.strip() if req.company_name else f"{req.full_name}'s Company"
    org = Organization(
        name=company_name,
        owner_person=req.full_name.strip(),
        email=req.email.lower(),
    )
    db.add(org)
    await db.flush()

    # Add as owner
    member = OrganizationMember(
        organization_id=org.id,
        user_id=user_id,
        role="owner"
    )
    db.add(member)
    await db.commit()

    token = generate_jwt_token(user_id, req.email.lower(), req.full_name.strip(), "en")

    return AuthResponse(
        access_token=token,
        user={
            "id": user_id,
            "email": req.email.lower(),
            "user_metadata": {
                "full_name": req.full_name.strip(),
                "language_preference": "en"
            }
        }
    )


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticates a user and returns a Supabase-compatible JWT."""
    res = await db.execute(select(Profile).where(Profile.email == req.email.lower()))
    user = res.scalars().first()

    if not user or user.hashed_password != hash_password(req.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify your credentials."
        )

    token = generate_jwt_token(user.id, user.email, user.full_name or "User", user.language_preference)

    return AuthResponse(
        access_token=token,
        user={
            "id": user.id,
            "email": user.email,
            "user_metadata": {
                "full_name": user.full_name,
                "language_preference": user.language_preference
            }
        }
    )


@router.get("/me")
async def get_me(current_user: Profile = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "language_preference": current_user.language_preference
    }
