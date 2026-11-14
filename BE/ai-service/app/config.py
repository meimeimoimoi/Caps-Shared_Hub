from pydantic_settings import BaseSettings, SettingsConfigDict  # noqa: I001


class Settings(BaseSettings):
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    LLM_MODEL: str = "qwen2.5:7b"
    EMBEDDING_MODEL: str = "bge-m3:latest"
    OLLAMA_TIMEOUT_SECONDS: int = 35
    QDRANT_URL: str = "http://localhost:6333"

    # Hỗ trợ cả 2 tên biến nếu có
    QDRANT_COLLECTION: str = "tax_knowledge_base"

    # Cho phép đọc .env và bỏ qua các biến thừa/lệch tên
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
