from pydantic_settings import BaseSettings, SettingsConfigDict  # noqa: I001


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables and .env."""

    APP_ENV: str = "dev"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    LLM_MODEL: str = "qwen2.5:7b"
    EMBEDDING_MODEL: str = "bge-m3:latest"
    OLLAMA_TIMEOUT_SECONDS: int = 60
    OLLAMA_NUM_PREDICT: int = 768
    OLLAMA_KEEP_ALIVE: str = "30m"
    OLLAMA_MAX_CONCURRENCY: int = 2
    WARMUP_ON_STARTUP: bool = True
    REQUEST_TIMEOUT_SECONDS: int = 75
    READYZ_PROBE_TIMEOUT_SECONDS: float = 8.0
    CV_EXTRACTION_TIMEOUT_SECONDS: int = 120
    CV_MIN_TEXT_CHARS: int = 40
    CV_MAX_PAGES: int = 10
    CV_OCR_MAX_PAGES: int = 5
    OCR_ENABLED: bool = True
    OCR_LANGUAGE: str = "vie+eng"
    OCR_DPI: int = 200
    OCR_TESSDATA_DIR: str = ""
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_TIMEOUT_SECONDS: int = 5
    CHAT_MAX_QUESTION_CHARS: int = 6000
    REQUIRE_INTERNAL_API_KEY: bool = False
    INTERNAL_API_KEY: str = ""

    QDRANT_COLLECTION: str = "tax_knowledge_base"

    # Load .env when present and ignore unrelated environment variables.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
