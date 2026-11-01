# 🏛️ Kiến Trúc Hệ Thống MMO Desktop (Multimodal Organizer)



---

## 1. Sơ đồ Kiến trúc Hệ thống Thực tế (System Architecture)

MMO Desktop được thiết kế theo mô hình **Tam tầng Phân tách (3-Tier Decoupled Architecture)** chạy offline-first, đảm bảo 100% dữ liệu không rời khỏi máy tính người dùng:

```mermaid
flowchart TD
    subgraph Client_Layer ["1. Lớp Trình diễn & Giao diện (Frontend)"]
        UI["React 19 + TypeScript + Tailwind CSS v4"]
        Vite["Vite 8 Bundler"]
        AppCtx["AppContext (i18n VI/EN, Dark/Light Theme)"]
        Components["Views: Explorer | Temp Cleaner | Tiering | Semantic Search"]
        UI --> Vite
        UI --> AppCtx
        UI --> Components
    end

    subgraph Host_Layer ["2. Lớp Đóng gói Desktop Host"]
        DesktopRun["Desktop Host: pywebview / Edge WebView2\n(File: run_desktop.py)"]
        Packager["PyInstaller Standalone Executable\n(File: package_app.bat -> MMO_Desktop.exe)"]
        DesktopRun --> Packager
    end

    subgraph Core_Engine ["3. Lớp Nhân Tính toán & Điều phối (Backend Core - Python)"]
        FastAPISrv["FastAPI + Uvicorn Sidecar (Port 8001)"]
        Sniffer["Content Sniffer (Đọc lướt văn bản, code, metadata)"]
        FileManager["FileManager Engine (os.scandir Win32 API C-core)"]
        HwGuard["Hardware Guard (psutil, pywin32, WMI giám sát VRAM)"]

        FastAPISrv --> Sniffer
        FastAPISrv --> FileManager
        FastAPISrv --> HwGuard
    end

    subgraph AI_Storage ["4. Lớp AI Cục bộ & Lưu trữ (AI & Storage Tiering)"]
        OllamaEngine["Ollama Runtime (Port 11434)"]
        TextSLM["Text & Reasoning: Llama 3.2 / Qwen 2.5"]
        VisionSLM["Vision OCR: Moondream 2"]
        VectorEngine["Vector Embeddings: Nomic Embed / BGE-M3"]
        FileStorage["File System Storage (Hot / Warm / Cold Tiers)"]

        FastAPISrv --> OllamaEngine
        OllamaEngine --> TextSLM
        OllamaEngine --> VisionSLM
        OllamaEngine --> VectorEngine
        FileManager --> FileStorage
    end

    Components <-->|REST API & Server-Sent Events (Port 8001)| FastAPISrv
    DesktopRun -.->|Khởi chạy & quản lý tiến trình ngầm| FastAPISrv
```

---

## 2. Chi tiết các Phân tầng Công nghệ & Framework Đang Sử Dụng

### 🔹 1. Frontend (Giao diện người dùng) — Thư mục `frontend/`
* **React 19 & TypeScript:** Xây dựng Single Page Application (SPA), quản lý chặt chẽ type-safety.
* **Tailwind CSS v4:** Styling hiện đại, tự động tinh gọn CSS runtime.
* **Vite 8:** Bundler và Local Dev Server tốc độ cao.
* **Lucide React:** Bộ icon giao diện đồng bộ.
* **AppContext & i18n:** Quản lý Dark/Light/System theme và chuyển đổi tức thì song ngữ (Tiếng Việt 🇻🇳 / English 🇬🇧).
* **Luồng giao tiếp:** Gọi trực tiếp qua HTTP REST và nhận luồng dữ liệu tiến trình thời gian thực (SSE) tới API Backend `http://127.0.0.1:8001/api`.

### 🔹 2. Desktop Shell & Đóng gói Phân phối
* **`pywebview` + Microsoft Edge WebView2 (`run_desktop.py`):** Đảm nhiệm vai trò cửa sổ Native Desktop Shell, đồng thời tự động kích hoạt và quản lý vòng đời của tiến trình FastAPI sidecar.
* **`PyInstaller` (`package_app.bat`):** Đóng gói toàn bộ Frontend đã build (`frontend/dist`), Backend Python (`sidecar/`), icon và tài nguyên thành một thư mục/file thực thi `.exe` độc lập (`dist/MMO_Desktop/MMO_Desktop.exe`) mà người dùng cuối không cần cài đặt môi trường Python hay Node.js.
* **Inno Setup Generator (`make_installer.py`):** Tạo trình cài đặt (Setup Wizard) chuyên nghiệp cho người dùng Windows.

### 🔹 3. Backend Core & Quét Tệp Hệ Thống — Thư mục `sidecar/`
Toàn bộ logic vận hành, quét hệ thống tệp và quản lý ổ cứng được viết bằng **Python 3.11**:
* **FastAPI + Uvicorn:** Web service bất đồng bộ hiệu năng cao chạy tại `127.0.0.1:8001`.
* **Cơ chế Quét Tệp Tin (`file_manager.py`):**
  * Sử dụng **`os.scandir()`** (gọi trực tiếp C-core Win32 API `FindFirstFileW`/`FindNextFileW`).
  * Trích xuất thông tin metadata (size, timestamp, type) ngay trong lần đọc đầu tiên mà không tốn round-trip I/O.
  * Phân loại định dạng tệp (*modality*): Text, Image, Audio, Video, Other.
  * Nhận diện và lọc các loại file rác/file tạm thời (*junk files: `.tmp`, `thumbs.db`, `cache`, v.v.*).
* **Content Sniffer:** Đọc nhanh tiêu đề và nội dung ban đầu (header snippets) của các file văn bản, mã nguồn (`.txt, .md, .py, .ts, .csv, .json...`) để AI hiểu ngữ cảnh.
* **Bảo vệ Dữ liệu:** Tích hợp `send2trash` giúp di chuyển file an toàn vào Thùng rác OS (Recycle Bin), cho phép người dùng phục hồi, tránh xóa nhầm dữ liệu.
* **Hardware & VRAM Monitor (`hardware.py`):** Dùng `psutil`, `pywin32` và WMI đo đạc tải CPU, RAM và GPU VRAM thời gian thực.

### 🔹 4. Tầng AI Cục bộ & Phân tầng Dữ liệu (AI & Storage Tiering)
* **Ollama Runtime (Port 11434):**
  * Chạy mô hình ngôn ngữ nhỏ (SLM) hoàn toàn offline trên GPU (GTX 1650 trở lên) hoặc CPU.
  * **Text/Reasoning:** `Llama 3.2` / `Qwen 2.5`.
  * **Vision/OCR:** `Moondream 2`.
  * **Semantic Vector:** `Nomic Embed` / `BGE-M3` phục vụ tìm kiếm ngữ nghĩa theo cosine similarity.
* **Phân tầng Lưu trữ (Storage Tiering):**
  * 🔥 **Hot Tier ($\le$ 7 ngày):** Tệp tin đang làm việc tích cực.
  * ☀️ **Warm Tier (7 - 45 ngày):** Tài liệu tham khảo, media ít truy cập.
  * ❄️ **Cold Tier (> 45 ngày):** Tệp cũ, bản backup, gom nhóm sang vùng lưu trữ dài hạn (`Cold_Tier_Vault`).

---

## 3. Vị trí của Rust trong Mã Nguồn (`frontend/src-tauri/`)

Trong mã nguồn hiện có thư mục `frontend/src-tauri` viết bằng Rust (Tauri 2):
* **Vai trò kỹ thuật:** Đây là module thử nghiệm (Research & Prototyping) được chuẩn bị sẵn cho giai đoạn tiếp theo (như đã ghi trong tài liệu kế hoạch nghiên cứu).
* **Trạng thái thực tế trên nhánh chính:** Hiện tại Frontend kết nối và vận hành 100% thông qua **FastAPI Python Backend** để đảm bảo tính đồng bộ hoàn toàn với các thư viện AI và tính năng đóng gói `.exe` tức thì qua `pywebview` + `PyInstaller`.

---

## 4. Cấu trúc Cây Thư mục Dự án

```text
D:\AI_NCKH\ (Repository Root)
├── frontend/                     # [Giao diện người dùng]
│   ├── src/                      # Source code React 19 + TypeScript + Tailwind
│   │   ├── components/main/      # Explorer, DedicatedTempCleaner, Tiering, Search...
│   │   ├── components/preflight/ # VRAM Gauge, BenchmarkCard, ModelSelector...
│   │   └── lib/                  # i18n đa ngữ, AppContext, sounds, animations...
│   ├── src-tauri/                # Module Rust / Tauri 2 (dự phòng nâng cấp Phase sau)
│   ├── package.json              # Khai báo dependencies Node.js
│   └── vite.config.ts            # Cấu hình Vite bundler
│
├── sidecar/                      # [Backend Core & AI Engine - Python]
│   ├── main.py                   # FastAPI Server (Endpoints REST & SSE)
│   ├── ai_organizer.py           # Kết nối Ollama SLM, phân tích ngữ nghĩa, Vector Search
│   ├── file_manager.py           # Quản lý file, quét os.scandir, phân tầng Hot/Warm/Cold
│   ├── hardware.py               # Giám sát phần cứng, đo VRAM GPU, CPU, RAM
│   └── models_catalog.py         # Danh mục mô hình SLM được hỗ trợ
│
├── run_desktop.py                # Script chạy Desktop Shell (pywebview + Sidecar)
├── package_app.bat               # Script tự động build & đóng gói ra MMO_Desktop.exe
├── make_installer.py             # Script tạo bộ cài đặt Windows Setup Wizard
├── config.json                   # Cấu hình mặc định của ứng dụng
└── README.md                     # Tài liệu giới thiệu tổng quan dự án trên GitHub
```
