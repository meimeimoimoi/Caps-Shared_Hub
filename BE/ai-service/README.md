# AI service

Service FastAPI dùng Qdrant để lưu vector và Ollama để embedding, sinh câu trả lời.
Các lệnh dưới đây chạy bằng PowerShell tại `BE/ai-service`.

## Chuẩn bị

- Python 3.11 và môi trường `.venv` có các dependency trong `requirements.txt`.
- Docker Desktop đang chạy với Linux containers để chạy Qdrant.
- Ollama đang chạy tại `http://localhost:11434`, có model `bge-m3:latest` và `qwen2.5:7b`.
- Nếu chưa có `.env`, sao chép `.env.example` thành `.env`. Giữ nguyên `.env` hiện có.

Compose chung tại `BE/docker/docker-compose.yml` hiện chưa cung cấp Qdrant.
Tạo container riêng với volume lưu dữ liệu:

```powershell
docker run -d --name caps_qdrant --restart unless-stopped -p 6333:6333 -v caps_qdrant_data:/qdrant/storage qdrant/qdrant:v1.11.3
```

Nếu container `caps_qdrant` đã tồn tại, dùng `docker start caps_qdrant`.
Kiểm tra Qdrant trước khi chạy API:

```powershell
Invoke-RestMethod http://localhost:6333/collections
ollama list
```

Nếu thiếu model, tải bằng `ollama pull bge-m3:latest` và `ollama pull qwen2.5:7b`.
Nếu dùng Qdrant hoặc Ollama ở máy khác, chỉnh `QDRANT_URL` hoặc `OLLAMA_BASE_URL` trong `.env`.

## Chạy

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Kiểm tra `http://localhost:8000/health` và Swagger tại `http://localhost:8000/docs`.
`/health` chỉ xác nhận API đang chạy, không kiểm tra Ollama hay model.

## Lỗi khởi động

`ResponseHandlingException: [WinError 10061]` tại `init_qdrant()` nghĩa là kết nối
Qdrant bị từ chối. Kiểm tra Docker Desktop, container Qdrant, port 6333 và
`QDRANT_URL`. Service cần kết nối Qdrant khi khởi động để chuẩn bị collection.

Nếu `.venv\Scripts\python.exe` báo `No Python at ...`, Python gốc dùng tạo môi
trường không còn truy cập được. Kiểm tra Python 3.11 trên máy và tạo lại môi
trường phù hợp trước khi cài dependency từ `requirements.txt`.
