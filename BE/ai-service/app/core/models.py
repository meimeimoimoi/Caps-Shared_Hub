from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.chat_models import ChatOllama
from app.config import settings

# bge-m2: Model vector kích thước 1024 
embedding_model = OllamaEmbeddings(
    model="bge-m3:latest",
    base_url=settings.OLLAMA_BASE_URL
)

# ollama qwen2.5:7b
llm_model = ChatOllama(
    model="qwen2.5:7b",
    temperature=0.1,
    base_url=settings.OLLAMA_BASE_URL
)

