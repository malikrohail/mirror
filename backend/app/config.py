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

    # Screencast (CDP Page.startScreencast for local mode)
    ENABLE_SCREENCAST: bool = False
    SCREENCAST_QUALITY: int = 60
    SCREENCAST_MAX_WIDTH: int = 1280
    SCREENCAST_MAX_HEIGHT: int = 720
    SCREENCAST_FPS: int = 10
    SCREENCAST_RECORD_TO_DISK: bool = False

    # Browser robustness (Iteration 2)
    SESSION_TIMEOUT_SECONDS: int = 180  # Per-session timeout in local mode
    MAX_PAGES_PER_CONTEXT: int = 50  # Pages before context recreation
    BROWSER_WARMUP_CONTEXTS: int = 0  # Pre-create contexts at pool init
    BROWSER_ACTION_RETRIES: int = 1  # Retries for Playwright action failures
    BROWSER_DEBUG_CDP: bool = False  # Expose CDP WebSocket URL in logs

    # Screenshot diff (Iteration 3)
    SCREENSHOT_DIFF_ENABLED: bool = False

    # Performance & cost (Iteration 4)
    PARALLEL_BROWSER_INSTANCES: int = 1  # Separate Chromium processes (local mode)
    SCREENSHOT_FORMAT: str = "png"  # "png" or "jpeg"
    SCREENSHOT_JPEG_QUALITY: int = 85
    LLM_BATCH_ANALYSIS: bool = False  # Batch screenshots in analysis pass
    BROWSER_PROFILE_PATH: str = ""  # Persistent browser profile dir

    # Hybrid mode & production (Iteration 5)
    DEFAULT_BROWSER_MODE: str = "cloud"  # Default browser mode (cloud = Browserbase with CAPTCHA solving)
    HYBRID_FAILOVER_ENABLED: bool = True
    HYBRID_CRASH_THRESHOLD: int = 2  # Local crashes before failover to cloud
    MEMORY_MIN_FREE_MB: int = 500  # Minimum free memory for new sessions

    # ElevenLabs TTS
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_MODEL_ID: str = "eleven_multilingual_v2"

    # Server
    LOG_LEVEL: str = "INFO"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
