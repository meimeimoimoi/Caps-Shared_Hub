from pydantic_settings import BaseSettings, SettingsConfigDict  # noqa: I001


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables and .env."""

    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    LLM_MODEL: str = "qwen2.5:7b"
    EMBEDDING_MODEL: str = "bge-m3:latest"
    OLLAMA_TIMEOUT_SECONDS: int = 35
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_TIMEOUT_SECONDS: int = 5
    INTERNAL_API_KEY: str = ""

    QDRANT_COLLECTION: str = "tax_knowledge_base"

    # Load .env when present and ignore unrelated environment variables.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
