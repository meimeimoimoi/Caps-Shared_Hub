from pydantic_settings import BaseSettings, SettingsConfigDict  # noqa: I001


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables and .env."""

    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    LLM_MODEL: str = "qwen2.5:7b"
    EMBEDDING_MODEL: str = "bge-m3:latest"
    OLLAMA_TIMEOUT_SECONDS: int = 35
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
    INTERNAL_API_KEY: str = ""

    QDRANT_COLLECTION: str = "tax_knowledge_base"

    # Load .env when present and ignore unrelated environment variables.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
