import os
from typing import List, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

KNOWN_JWT_PLACEHOLDERS = {
    "super-secret-jwt-key-anumaan-min-32-chars-length",
    "your-supabase-jwt-secret-minimum-32-characters-long",
    "your-supabase-jwt-secret",
    "placeholder-secret-replace-in-production",
    "changeme-supabase-jwt-secret-placeholder",
}

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "sqlite+aiosqlite:///./anumaan.db"
    
    # Supabase credentials (SUPABASE_JWT_SECRET is strictly required with no default)
    SUPABASE_URL: str = "https://example.supabase.co"
    SUPABASE_JWT_SECRET: str
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    
    # CORS
    CORS_ORIGINS: Union[str, List[str]] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # Supported Locales
    SUPPORTED_LOCALES: List[str] = ["en", "mr", "hi"]
    DEFAULT_LOCALE: str = "en"
    
    # Security & Rate Limiting
    RATE_LIMIT_ENABLED: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @field_validator("SUPABASE_JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("SUPABASE_JWT_SECRET is required and cannot be empty.")
        v_clean = v.strip()
        if len(v_clean) < 32:
            raise ValueError(f"SUPABASE_JWT_SECRET must be at least 32 characters long (received {len(v_clean)}).")
        
        v_lower = v_clean.lower()
        if (
            v_lower in KNOWN_JWT_PLACEHOLDERS
            or "your-supabase" in v_lower
            or "placeholder" in v_lower
            or "super-secret-jwt-key" in v_lower
        ):
            raise ValueError("SUPABASE_JWT_SECRET contains an insecure default or placeholder secret.")
        return v_clean

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    @model_validator(mode="after")
    def validate_production_configuration(self):
        """
        Enforces strict production safety invariants:
        - Rejects embedded SQLite in production.
        - Requires an authentic HTTPS Supabase URL.
        """
        if self.ENVIRONMENT == "production":
            if "sqlite" in self.DATABASE_URL.lower():
                raise ValueError("Production environment cannot use SQLite. A PostgreSQL connection string (DATABASE_URL) is required.")
            if "example.supabase.co" in self.SUPABASE_URL.lower():
                raise ValueError("Production environment cannot use the placeholder 'example.supabase.co' SUPABASE_URL.")
            if not self.SUPABASE_URL.startswith("https://"):
                raise ValueError("Production SUPABASE_URL must use HTTPS encryption.")
        return self


settings = Settings()
