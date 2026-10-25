import os
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "sqlite+aiosqlite:///./anumaan.db"
    
    # Supabase credentials
    SUPABASE_URL: str = "https://example.supabase.co"
    SUPABASE_JWT_SECRET: str = "super-secret-jwt-key-anumaan-min-32-chars-length"
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    
    # CORS
    CORS_ORIGINS: Union[str, List[str]] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # Supported Locales
    SUPPORTED_LOCALES: List[str] = ["en", "mr", "hi"]
    DEFAULT_LOCALE: str = "en"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v


settings = Settings()
