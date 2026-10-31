import sys
import os
import json
import time
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from hardware import get_hardware_info, check_ollama_status
from models_catalog import get_all_model_clusters, get_flat_catalog
from file_manager import (
    get_system_drives, 
    scan_directory_tree, 
    safe_clean_trash, 
    generate_organize_preview, 
    organize_files_safe, 
    undo_last_organize
)

app = FastAPI(title="MMO Multimodal Core Engine", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PullRequest(BaseModel):
    model_name: str

class BenchmarkRequest(BaseModel):
    model_name: str
    prompt: Optional[str] = "Phân loại tệp: 'Bao_cao_NCKH_2026.docx'. Trả về JSON."

class ScanTreeRequest(BaseModel):
    directory: str
    include_hidden: bool = True

class DeepScanProgressRequest(BaseModel):
    directory: str

class TrashRequest(BaseModel):
    file_paths: List[str]
    clean_system_temp: bool = False

class OrganizePreviewRequest(BaseModel):
    file_paths: List[str]
    target_base: str

class OrganizeRequest(BaseModel):
    file_paths: List[str]
    target_base: str
    mode: str = "copy"

class DeleteModelRequest(BaseModel):
    model_name: str

class UpdateStoragePathRequest(BaseModel):
    new_path: str

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "MMO Desktop Core 1.2"}

@app.get("/api/hardware")
def api_hardware():
    return get_hardware_info()

# New: System drives detection (C:, D:, USBs, external)
@app.get("/api/system/drives")
def api_system_drives():
    return get_system_drives()

@app.get("/api/ollama/status")
def api_ollama_status():
    return check_ollama_status()

@app.get("/api/models/clusters")
def api_models_clusters():
    return get_all_model_clusters()

@app.get("/api/models/catalog")
def api_models_catalog():
    return get_flat_catalog()

# Get Current Model Storage Path (OLLAMA_MODELS)
@app.get("/api/models/storage_location")
def api_get_storage_location():
    path = os.environ.get("OLLAMA_MODELS")
    if not path:
        # Check User env in Windows registry
        import winreg
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Environment") as key:
                path, _ = winreg.QueryValueEx(key, "OLLAMA_MODELS")
        except:
            path = os.path.expandvars(r"%USERPROFILE%\.ollama\models")
    return {"current_path": path, "default_c": os.path.expandvars(r"%USERPROFILE%\.ollama\models")}

# Update Model Storage Location
@app.post("/api/models/update_storage_location")
def api_update_storage_location(req: UpdateStoragePathRequest):
    new_dir = req.new_path.strip()
    if not os.path.exists(new_dir):
        try:
            os.makedirs(new_dir, exist_ok=True)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Không thể tạo thư mục: {str(e)}")

    import winreg
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Environment", 0, winreg.KEY_SET_VALUE) as key:
            winreg.SetValueEx(key, "OLLAMA_MODELS", 0, winreg.REG_SZ, new_dir)
        os.environ["OLLAMA_MODELS"] = new_dir
        return {"success": True, "new_path": new_dir, "message": "Đã đổi nơi lưu trữ mô hình thành công! Hãy khởi động lại Ollama để nhận đường dẫn mới."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi ghi cấu hình Registry: {str(e)}")

class SelectFolderRequest(BaseModel):
    title: Optional[str] = "Chọn thư mục"

# Select Folder Dialog via Native Windows Picker (Tkinter)
@app.post("/api/system/select_folder")
def api_select_folder(req: Optional[SelectFolderRequest] = None):
    try:
        import tkinter as tk
        from tkinter import filedialog
        title = req.title if req and req.title else "Chọn thư mục"
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        folder_selected = filedialog.askdirectory(title=title)
        root.destroy()
        if folder_selected:
            # Normalize path on Windows
            folder_selected = os.path.normpath(folder_selected)
            return {"success": True, "path": folder_selected}
        return {"success": False, "message": "Người dùng đã hủy chọn thư mục."}
    except Exception as e:
        return {"success": False, "message": f"Lỗi mở hộp thoại: {str(e)}"}

# Delete Model via Ollama API
@app.post("/api/models/delete")
def api_delete_model(req: DeleteModelRequest):
    ollama_url = "http://localhost:11434/api/delete"
    try:
        r = requests.delete(ollama_url, json={"name": req.model_name}, timeout=15)
        if r.status_code == 200:
            return {"success": True, "message": f"Đã xóa thành công mô hình {req.model_name} để giải phóng dung lượng!"}
        else:
            return {"success": False, "message": f"Ollama trả về mã lỗi: {r.status_code}"}
    except Exception as e:
        return {"success": False, "message": f"Lỗi xóa mô hình: {str(e)}"}

@app.post("/api/ollama/pull")
def api_ollama_pull(req: PullRequest):
    ollama_url = "http://localhost:11434/api/pull"
    def generate():
        try:
            with requests.post(ollama_url, json={"name": req.model_name}, stream=True, timeout=1800) as r:
                if r.status_code != 200:
                    yield json.dumps({"error": f"Lỗi Ollama: HTTP {r.status_code}. Vui lòng kiểm tra ứng dụng Ollama đã bật chưa."}) + "\n"
                    return
                for chunk in r.iter_lines():
                    if chunk:
                        yield chunk.decode("utf-8") + "\n"
        except Exception as e:
            yield json.dumps({"error": f"Không thể kết nối tới Ollama ({str(e)}). Vui lòng đảm bảo Ollama đang chạy."}) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")

@app.post("/api/models/benchmark")
def api_benchmark(req: BenchmarkRequest):
    ollama_url = "http://localhost:11434/api/generate"
    start_time = time.time()
    try:
        response = requests.post(
            ollama_url,
            json={
                "model": req.model_name,
                "prompt": req.prompt,
                "stream": False
            },
            timeout=60
        )
        total_time = time.time() - start_time
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Mô hình chưa được nạp.")
        
        data = response.json()
        eval_count = data.get("eval_count", 0)
        eval_duration_ns = data.get("eval_duration", 1)
        eval_duration_s = eval_duration_ns / 1e9 if eval_duration_ns else total_time
        tokens_per_sec = round(eval_count / eval_duration_s, 2) if eval_duration_s > 0 else 0

        return {
            "success": True,
            "model": req.model_name,
            "response": data.get("response", ""),
            "tokens_per_sec": tokens_per_sec,
            "total_time_sec": round(total_time, 2),
            "speed_rating": "Cực mượt" if tokens_per_sec > 35 else ("Mượt" if tokens_per_sec > 15 else "Khá")
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Không kết nối được tới mô hình. Vui lòng bật Ollama và tải model."
        }

@app.post("/api/files/tree")
def api_scan_tree(req: ScanTreeRequest):
    return scan_directory_tree(req.directory, req.include_hidden)

@app.post("/api/files/deep_scan_stream")
def api_deep_scan_stream(req: DeepScanProgressRequest):
    def scan_generator():
        root_dir = req.directory
        start_time = time.time()
        
        # Phase 1: Quick tree estimation (count top level items to estimate depth)
        estimated_total_files = 0
        try:
            # For whole drive (C:\, D:\), sample reasonable baseline based on drive usage
            if len(root_dir.rstrip("\\")) <= 2:
                # Root drive scan: C:\ or D:\
                import psutil
                usage = psutil.disk_usage(root_dir)
                # Average file size ~300KB
                estimated_total_files = max(int((usage.used / 1024) / 350), 50000)
            else:
                # Count files in immediate 2 levels
                for root, dirs, files in os.walk(root_dir):
                    estimated_total_files += len(files)
                    if estimated_total_files > 50000:
                        break
        except:
            estimated_total_files = 30000

        scanned_count = 0
        total_bytes = 0
        junk_count = 0
        hidden_count = 0
        junk_paths = []

        for dirpath, dirnames, filenames in os.walk(root_dir):
            current_folder = dirpath
            for fname in filenames:
                scanned_count += 1
                fpath = os.path.join(dirpath, fname)
                try:
                    fsize = os.path.getsize(fpath)
                    total_bytes += fsize
                except:
                    pass

                ext = os.path.splitext(fname)[1].lower().lstrip(".")
                is_junk = ext in ["tmp", "log", "bak", "cache", "crdownload", "chk", "dmp"] or fname.lower() in ["thumbs.db", ".ds_store", "desktop.ini"] or fname.startswith("~$")
                if is_junk:
                    junk_count += 1
                    if len(junk_paths) < 1000:
                        junk_paths.append(fpath)

                if fname.startswith("."):
                    hidden_count += 1

                # Update progress every 80 items
                if scanned_count % 80 == 0 or scanned_count <= 20:
                    elapsed = max(time.time() - start_time, 0.1)
                    speed_files_per_sec = scanned_count / elapsed
                    
                    # Dynamically adjust total estimate if exceeded
                    if scanned_count >= estimated_total_files:
                        estimated_total_files = int(scanned_count * 1.3)

                    percent = min(round((scanned_count / max(estimated_total_files, 1)) * 100, 1), 99.0)
                    remaining_files = max(estimated_total_files - scanned_count, 0)
                    est_time_sec = round(remaining_files / max(speed_files_per_sec, 1), 1)

                    yield json.dumps({
                        "type": "progress",
                        "scanned_count": scanned_count,
                        "current_file": fname,
                        "current_folder": current_folder,
                        "junk_count": junk_count,
                        "hidden_count": hidden_count,
                        "elapsed_seconds": round(elapsed, 1),
                        "estimated_seconds_left": est_time_sec,
                        "percent": percent,
                        "speed": round(speed_files_per_sec)
                    }) + "\n"

        elapsed_total = round(time.time() - start_time, 2)
        yield json.dumps({
            "type": "completed",
            "total_scanned": scanned_count,
            "total_bytes": total_bytes,
            "junk_count": junk_count,
            "hidden_count": hidden_count,
            "elapsed_seconds": elapsed_total,
            "junk_samples": junk_paths[:100]
        }) + "\n"

    return StreamingResponse(scan_generator(), media_type="application/x-ndjson")

@app.post("/api/files/trash")
def api_trash_files(req: TrashRequest):
    return safe_clean_trash(req.file_paths, req.clean_system_temp)

# Run TempCleaner tool directly
@app.post("/api/system/clean_temp")
def api_clean_system_temp():
    from file_manager import run_external_temp_cleaner
    return run_external_temp_cleaner()

@app.post("/api/files/organize")
def api_organize_files(req: OrganizeRequest):
    return organize_files_safe(req.file_paths, req.target_base, req.mode)

@app.post("/api/files/organize_preview")
def api_organize_preview(req: OrganizePreviewRequest):
    return generate_organize_preview(req.file_paths, req.target_base)

# Undo Last Organize
@app.post("/api/files/undo")
def api_undo_organize():
    return undo_last_organize()

DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.exists(DIST_DIR):
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
