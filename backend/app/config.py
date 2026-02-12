from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://mirror:mirror@localhost:5432/mirror"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Anthropic
    ANTHROPIC_API_KEY: str = ""
    OPUS_MODEL: str = "claude-opus-4-6"
    SONNET_MODEL: str = "claude-sonnet-4-5-20250929"

    # Storage
    STORAGE_PATH: str = "./data"
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "mirror-screenshots"
    R2_ENDPOINT_URL: str = ""

    # Study limits
    MAX_CONCURRENT_SESSIONS: int = 5
    MAX_STEPS_PER_SESSION: int = 30
    STUDY_TIMEOUT_SECONDS: int = 600

    # Browserbase
    BROWSERBASE_API_KEY: str = ""
    BROWSERBASE_PROJECT_ID: str = ""

    # Firecrawl
    FIRECRAWL_API_KEY: str = ""

    # Langfuse
    LANGFUSE_PUBLIC_KEY: str = ""
    LANGFUSE_SECRET_KEY: str = ""
    LANGFUSE_HOST: str = "https://cloud.langfuse.com"

    # Auth (optional for dev)
    CLERK_SECRET_KEY: str = ""

    # Server
    LOG_LEVEL: str = "INFO"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
