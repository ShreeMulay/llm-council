"""Configuration settings for LangGraph Forge backend."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Provider API Keys
    openrouter_api_key: str = ""
    cerebras_api_key: str = ""
    fireworks_api_key: str = ""

    # Cache Settings
    models_cache_ttl_seconds: int = 3600
    pricing_cache_ttl_seconds: int = 86400

    # Execution Settings
    execution_timeout_seconds: int = 30
    max_output_length: int = 10000

    # CORS
    cors_origins: str = "http://localhost:5173"

    # Application
    app_name: str = "LangGraph Forge API"
    app_version: str = "0.1.0"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins string into list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


# Global settings instance
settings = Settings()