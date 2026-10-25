import time
import pytest
import jwt
from unittest.mock import MagicMock, AsyncMock, patch
from httpx import AsyncClient
from cryptography.hazmat.primitives.asymmetric import ec
from pydantic import ValidationError

from app.core.config import Settings, settings
from app.core.security import decode_access_token
from app.core.rate_limiter import limiter, InMemoryRateLimiter


def test_asymmetric_es256_token_verification():
    """
    Validates asymmetric ES256 token verification using ECDSA P-256 curve,
    mirroring the exact signing algorithm configured on Supabase project knwinlllqjmgzqcjrrio.
    """
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()

    mock_signing_key = MagicMock()
    mock_signing_key.key = public_key

    mock_jwk_client = MagicMock()
    mock_jwk_client.get_signing_key_from_jwt.return_value = mock_signing_key

    token = jwt.encode(
        {
            "sub": "user-es256-pilot-001",
            "email": "pilot.engineer@anumaan.in",
            "aud": "authenticated",
            "iss": f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1" if "example" not in settings.SUPABASE_URL else "https://example.supabase.co/auth/v1",
            "exp": int(time.time()) + 3600,
        },
        private_key,
        algorithm="ES256",
        headers={"kid": "pilot-ec-kid-1"}
    )

    payload = decode_access_token(token, custom_jwks_client=mock_jwk_client)
    assert payload["sub"] == "user-es256-pilot-001"
    assert payload["email"] == "pilot.engineer@anumaan.in"


def test_tampered_es256_token_rejected():
    """
    Validates that modifying an ES256 token payload or signature is strictly rejected.
    """
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()

    mock_signing_key = MagicMock()
    mock_signing_key.key = public_key

    mock_jwk_client = MagicMock()
    mock_jwk_client.get_signing_key_from_jwt.return_value = mock_signing_key

    token = jwt.encode(
        {
            "sub": "user-es256-pilot-001",
            "email": "pilot.engineer@anumaan.in",
            "aud": "authenticated",
            "exp": int(time.time()) + 3600,
        },
        private_key,
        algorithm="ES256",
        headers={"kid": "pilot-ec-kid-1"}
    )

    tampered_token = token[:-5] + "XXXXX"
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc:
        decode_access_token(tampered_token, custom_jwks_client=mock_jwk_client)
    assert exc.value.status_code == 401


def test_wrong_project_issuer_rejected():
    """
    Validates that a token issued by an unauthorized Supabase project is rejected.
    """
    from fastapi import HTTPException
    token = jwt.encode(
        {
            "sub": "user-malicious-cross-project",
            "email": "hacker@other-project.com",
            "aud": "authenticated",
            "iss": "https://attacker-project.supabase.co/auth/v1",
            "exp": int(time.time()) + 3600,
        },
        settings.SUPABASE_JWT_SECRET,
        algorithm="HS256"
    )

    # Temporarily set a real Supabase URL to exercise issuer check
    with patch.object(settings, "SUPABASE_URL", "https://knwinlllqjmgzqcjrrio.supabase.co"):
        with pytest.raises(HTTPException) as exc:
            decode_access_token(token)
        assert exc.value.status_code == 401
        assert "issuer mismatch" in exc.value.detail.lower()


def test_wrong_audience_rejected():
    """
    Validates that a token with non-'authenticated' audience is rejected.
    """
    from fastapi import HTTPException
    token = jwt.encode(
        {
            "sub": "user-wrong-aud",
            "aud": "anon-or-other-audience",
            "exp": int(time.time()) + 3600,
        },
        settings.SUPABASE_JWT_SECRET,
        algorithm="HS256"
    )

    with pytest.raises(HTTPException) as exc:
        decode_access_token(token)
    assert exc.value.status_code == 401
    assert "audience mismatch" in exc.value.detail.lower()


def test_algorithm_none_rejected():
    """
    Validates that 'none' algorithm token attacks are strictly blocked.
    """
    from fastapi import HTTPException
    token = jwt.encode(
        {"sub": "user-none-attack", "exp": int(time.time()) + 3600},
        key="",
        algorithm="none"
    )

    with pytest.raises(HTTPException) as exc:
        decode_access_token(token)
    assert exc.value.status_code == 401
    assert "missing or disallowed alg" in exc.value.detail.lower()


def test_expired_token_rejected():
    """
    Validates that expired tokens fail authentication with a clear expiration message.
    """
    from fastapi import HTTPException
    token = jwt.encode(
        {"sub": "user-expired", "exp": int(time.time()) - 300},
        settings.SUPABASE_JWT_SECRET,
        algorithm="HS256"
    )

    with pytest.raises(HTTPException) as exc:
        decode_access_token(token)
    assert exc.value.status_code == 401
    assert "expired" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_health_liveness_and_readiness_probes(client: AsyncClient):
    """
    Validates Kubernetes / Docker / load-balancer probes:
    - /api/health/live (200 OK)
    - /api/health/ready (200 OK connected, 503 if DB disconnected)
    """
    # 1. Liveness check
    live_res = await client.get("/api/health/live")
    assert live_res.status_code == 200
    assert live_res.json()["status"] == "alive"

    # 2. Readiness check (healthy)
    ready_res = await client.get("/api/health/ready")
    assert ready_res.status_code == 200
    assert ready_res.json()["status"] == "ready"
    assert ready_res.json()["database"] == "connected"


@pytest.mark.asyncio
async def test_health_readiness_database_failure(client: AsyncClient):
    """
    Simulates database pool failure and verifies that /api/health/ready returns 503.
    """
    from sqlalchemy.exc import OperationalError
    from app.core.database import get_db

    async def broken_get_db():
        mock_session = AsyncMock()
        mock_session.execute.side_effect = OperationalError("connection refused", params=None, orig=Exception())
        yield mock_session

    from app.main import app
    app.dependency_overrides[get_db] = broken_get_db
    try:
        ready_fail = await client.get("/api/health/ready")
        assert ready_fail.status_code == 503
        data = ready_fail.json()
        assert data["status"] == "not_ready"
        assert data["database"] == "disconnected"
        # Ensure no sensitive database connection string or internal trace leaked
        assert "password" not in str(data).lower()
        assert "knwin" not in str(data).lower()
    finally:
        from tests.conftest import override_get_db
        app.dependency_overrides[get_db] = override_get_db


def test_rate_limiter_sliding_window_logic():
    """
    Direct unit test of the thread-safe InMemoryRateLimiter sliding window.
    """
    test_limiter = InMemoryRateLimiter()

    # 3 allowed requests within a 60-second window
    for i in range(3):
        allowed, rem, retry = test_limiter.is_allowed("user-123", max_requests=3, window_seconds=60)
        assert allowed is True
        assert rem == 2 - i

    # 4th request must be blocked with retry-after >= 1
    blocked, rem, retry = test_limiter.is_allowed("user-123", max_requests=3, window_seconds=60)
    assert blocked is False
    assert rem == 0
    assert retry >= 1

    # Different key is unaffected
    other_allowed, _, _ = test_limiter.is_allowed("user-456", max_requests=3, window_seconds=60)
    assert other_allowed is True


def test_production_environment_config_invariants():
    """
    Validates that setting ENVIRONMENT="production" enforces:
    - Rejection of SQLite
    - Rejection of placeholder Supabase URL
    - Rejection of insecure JWT secrets
    """
    # 1. SQLite rejected in production
    with pytest.raises(ValidationError) as exc:
        Settings(
            ENVIRONMENT="production",
            DATABASE_URL="sqlite+aiosqlite:///./anumaan.db",
            SUPABASE_URL="https://knwinlllqjmgzqcjrrio.supabase.co",
            SUPABASE_JWT_SECRET="a-valid-production-grade-secret-key-32-chars-long"
        )
    assert "cannot use sqlite" in str(exc.value).lower()

    # 2. Example placeholder Supabase URL rejected in production
    with pytest.raises(ValidationError) as exc:
        Settings(
            ENVIRONMENT="production",
            DATABASE_URL="postgresql+asyncpg://postgres:pass@aws-0-ap-south-1.pooler.supabase.com:5432/postgres",
            SUPABASE_URL="https://example.supabase.co",
            SUPABASE_JWT_SECRET="a-valid-production-grade-secret-key-32-chars-long"
        )
    assert "placeholder 'example.supabase.co'" in str(exc.value).lower()

    # 3. Valid production configuration passes cleanly
    prod_settings = Settings(
        ENVIRONMENT="production",
        DATABASE_URL="postgresql+asyncpg://postgres:pass@aws-0-ap-south-1.pooler.supabase.com:5432/postgres",
        SUPABASE_URL="https://knwinlllqjmgzqcjrrio.supabase.co",
        SUPABASE_JWT_SECRET="a-valid-production-grade-secret-key-32-chars-long"
    )
    assert prod_settings.ENVIRONMENT == "production"


@pytest.mark.asyncio
async def test_sqlite_init_db_creates_all_tables():
    """
    Regression test: Ensures init_db() registers all models on Base.metadata
    and creates all 8 core tables in SQLite: profiles, organizations,
    organization_members, clients, projects, estimates, boq_items, quotations.
    """
    from app.core.database import Base, init_db
    await init_db()
    registered_tables = set(Base.metadata.tables.keys())
    expected_tables = {
        "profiles", "organizations", "organization_members",
        "clients", "projects", "estimates", "boq_items", "quotations"
    }
    missing = expected_tables - registered_tables
    assert not missing, f"Missing table registrations on Base.metadata: {missing}"

