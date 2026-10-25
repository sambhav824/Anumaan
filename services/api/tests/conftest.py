import os
# Isolate test secret before settings are imported
os.environ["SUPABASE_JWT_SECRET"] = "test-jwt-secret-minimum-32-chars-long-for-testing-only"

import pytest
import jwt
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app

# In-memory test database
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False
)

TestAsyncSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestAsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


app.dependency_overrides[get_db] = override_get_db


def create_test_jwt(user_id: str, email: str, full_name: str = "Test User") -> str:
    """Generates a valid test Supabase JWT token."""
    payload = {
        "sub": user_id,
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "user_metadata": {
            "full_name": full_name,
            "language_preference": "en"
        }
    }
    return jwt.encode(payload, settings.SUPABASE_JWT_SECRET, algorithm="HS256")


@pytest.fixture
def user_a():
    return {
        "id": "11111111-1111-1111-1111-111111111111",
        "email": "user.a@sahyadriinfra.in",
        "full_name": "राजेश देशमुख (Rajesh Deshmukh)",
    }


@pytest.fixture
def user_b():
    return {
        "id": "22222222-2222-2222-2222-222222222222",
        "email": "user.b@competitorinfra.com",
        "full_name": "विक्रम शर्मा (Vikram Sharma)",
    }


@pytest.fixture
def token_a(user_a):
    return create_test_jwt(user_a["id"], user_a["email"], user_a["full_name"])


@pytest.fixture
def token_b(user_b):
    return create_test_jwt(user_b["id"], user_b["email"], user_b["full_name"])


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac
