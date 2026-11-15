from langchain_community.chat_models import ChatOllama
from langchain_community.embeddings import OllamaEmbeddings

from app.config import settings

embedding_model = OllamaEmbeddings(
    model=settings.EMBEDDING_MODEL,
    base_url=settings.OLLAMA_BASE_URL,
)

llm_model = ChatOllama(
    model=settings.LLM_MODEL,
    temperature=0.1,
    base_url=settings.OLLAMA_BASE_URL,
    timeout=settings.OLLAMA_TIMEOUT_SECONDS,
)

