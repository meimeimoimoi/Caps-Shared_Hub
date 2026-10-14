from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int =  8000
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_COLLECTION: str = "tax_knowleged_base"

    class Config:
        env_file = ".env"

settings = Settings()