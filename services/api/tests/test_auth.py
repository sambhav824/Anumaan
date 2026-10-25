import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "Anumaan" in data["service"]
    assert "mr" in data["supported_locales"]
    assert "hi" in data["supported_locales"]


@pytest.mark.asyncio
async def test_profile_unauthorized(client: AsyncClient):
    response = await client.get("/api/profile")
    assert response.status_code == 401
    assert "Authentication token is missing" in response.json()["detail"]


@pytest.mark.asyncio
async def test_profile_invalid_token(client: AsyncClient):
    headers = {"Authorization": "Bearer invalid.jwt.token"}
    response = await client.get("/api/profile", headers=headers)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_profile_success_and_language_preference_persistence(client: AsyncClient, token_a: str, user_a: dict):
    headers = {"Authorization": f"Bearer {token_a}"}
    
    # Get initial profile
    res = await client.get("/api/profile", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == user_a["id"]
    assert data["language_preference"] == "en"

    # Update language preference to Marathi ('mr')
    update_res = await client.patch(
        "/api/profile",
        json={"language_preference": "mr", "full_name": "राजेश देशमुख"},
        headers=headers
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["language_preference"] == "mr"
    assert updated_data["full_name"] == "राजेश देशमुख"

    # Verify persistent state
    get_res = await client.get("/api/profile", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["language_preference"] == "mr"

    # Update language preference to Hindi ('hi')
    update_res_hi = await client.patch(
        "/api/profile",
        json={"language_preference": "hi"},
        headers=headers
    )
    assert update_res_hi.status_code == 200
    assert update_res_hi.json()["language_preference"] == "hi"

    # Reject unsupported language
    err_res = await client.patch(
        "/api/profile",
        json={"language_preference": "fr"},
        headers=headers
    )
    assert err_res.status_code == 422


import pytest
from pydantic import ValidationError
from unittest.mock import AsyncMock, patch
from sqlalchemy.exc import IntegrityError
from fastapi.security import HTTPAuthorizationCredentials
from app.core.config import Settings
from app.core.security import get_current_user
from app.models.models import Profile


def test_production_config_rejects_missing_or_placeholder_jwt_secret():
    # Placeholder secret
    with pytest.raises(ValidationError):
        Settings(
            ENVIRONMENT="production",
            SUPABASE_JWT_SECRET="super-secret-jwt-key-anumaan-min-32-chars-length"
        )

    # Empty or missing secret
    with pytest.raises(ValidationError):
        Settings(
            ENVIRONMENT="production",
            SUPABASE_JWT_SECRET=""
        )

    # Secret too short (< 32 chars)
    with pytest.raises(ValidationError):
        Settings(
            ENVIRONMENT="production",
            SUPABASE_JWT_SECRET="too-short-secret"
        )


from unittest.mock import MagicMock

@pytest.mark.asyncio
async def test_profile_insert_race_handled(token_a: str, user_a: dict):
    """
    Forces an IntegrityError on profile insertion in get_current_user
    to verify that the rollback, re-select, and recovery succeed.
    """
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token_a)

    mock_db = AsyncMock()

    # 1st execute (initial check): Profile not found
    first_res = MagicMock()
    first_res.scalars.return_value.first.return_value = None

    # 2nd execute (re-select after rollback): Profile now exists
    existing_profile = Profile(id=user_a["id"], full_name=user_a["full_name"], language_preference="en")
    second_res = MagicMock()
    second_res.scalars.return_value.first.return_value = existing_profile

    mock_db.execute.side_effect = [first_res, second_res]
    mock_db.commit.side_effect = IntegrityError("duplicate key", params=None, orig=Exception("unique constraint"))

    profile = await get_current_user(credentials=credentials, db=mock_db)

    assert profile.id == user_a["id"]
    mock_db.rollback.assert_awaited_once()
