# MMO – Multimodal Organizer (Desktop)

Ứng dụng desktop offline-first hỗ trợ tự động tổ chức, phân loại, tìm kiếm và phân tầng lưu trữ dữ liệu đa phương thức (Văn bản, Hình ảnh, Âm thanh, Video) bằng mô hình AI cục bộ (Local SLM / Ollama).

## Kiến trúc hệ thống
- **Giao diện người dùng:** Tauri 2 + React + TypeScript + Tailwind CSS.
- **Lõi xử lý (Sidecar):** Python 3.11 (FastAPI IPC).
- **AI Engine:** Ollama cục bộ (Tối ưu cho VRAM 4GB: Qwen 2.5, Llama 3.2, Moondream2, BGE-M3).
- **Cơ sở dữ liệu:** SQLite (Metadata, FTS5) + LanceDB (Vector Embedding).
- **Phân tầng lưu trữ:** Hot / Warm / Cold (Polyglot persistence & Storage Locations).

## Quy ước Git
- `main`: Nhánh chính chỉ dùng cho các bản phát hành (Releases).
- `develop`: Nhánh làm việc tích cực hàng ngày.
