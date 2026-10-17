from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.core.qdrant import init_qdrant
from app.api.routes import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi động: Đảm bảo Qdrant Collection và Index đã sẵn sàng
    init_qdrant()
    yield

app = FastAPI(
    title="SHFT AI Engine Service",
    description="Stateless AI & RAG Engine kết nối .NET 9 Backend",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "SHFT AI Engine"}

if __name__ == "__main__":
    import uvicorn
    from app.config import settings
    uvicorn.run("app.main:app", host=settings.APP_HOST, port=settings.APP_PORT, reload=True)