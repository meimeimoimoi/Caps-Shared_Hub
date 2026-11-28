from langchain_community.chat_models import ChatOllama
from langchain_community.embeddings import OllamaEmbeddings

from app.config import settings

embedding_model = OllamaEmbeddings(
    model=settings.EMBEDDING_MODEL,
    base_url=settings.OLLAMA_BASE_URL,
)

# ChatOllama 0.3.1 has no `seed` field; bound kwargs that are not known params are sent as Ollama options.
llm_model = ChatOllama(
    model=settings.LLM_MODEL,
    temperature=0.0,
    num_predict=settings.OLLAMA_NUM_PREDICT,
    keep_alive=settings.OLLAMA_KEEP_ALIVE,
    base_url=settings.OLLAMA_BASE_URL,
    timeout=settings.OLLAMA_TIMEOUT_SECONDS,
).bind(seed=settings.OLLAMA_SEED)
