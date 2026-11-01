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
    undo_last_organize,
    redo_last_organize,
    get_action_history
)

app = FastAPI(title="MMO Multimodal Core Engine", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CONFIG_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config.json")

def load_system_config() -> Dict[str, Any]:
    home = os.path.expanduser("~")
    default_cfg = {
        "active_models": ["llama3.2:1b", "nomic-embed-text:latest"],
        "model_storage_path": os.path.join(home, ".ollama", "models"),
        "last_opened_folder": home,
        "recent_actions": [],
        "created_at": int(time.time()),
        "updated_at": int(time.time())
    }
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    default_cfg.update(data)
                    return default_cfg
        except Exception:
            pass
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(default_cfg, f, ensure_ascii=False, indent=2)
    except Exception:
        pass
    return default_cfg

def save_system_config(cfg: Dict[str, Any]) -> None:
    try:
        cfg["updated_at"] = int(time.time())
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

def record_user_action(action_type: str, details: Dict[str, Any]) -> None:
    """Record an action performed by user or active model into config.json"""
    try:
        cfg = load_system_config()
        recent = cfg.get("recent_actions", [])
        record = {
            "id": f"act_{int(time.time()*1000)}",
            "action": action_type,
            "details": details,
            "timestamp": int(time.time())
        }
        recent.insert(0, record)
        cfg["recent_actions"] = recent[:100] # Keep last 100 actions
        save_system_config(cfg)
    except Exception:
        pass

@app.get("/api/config")
def api_get_config():
    return load_system_config()

class UpdateConfigRequest(BaseModel):
    active_models: Optional[List[str]] = None
    model_storage_path: Optional[str] = None
    last_opened_folder: Optional[str] = None

@app.post("/api/config")
def api_update_config(req: UpdateConfigRequest):
    cfg = load_system_config()
    if req.active_models is not None:
        cfg["active_models"] = req.active_models
    if req.model_storage_path is not None:
        cfg["model_storage_path"] = req.model_storage_path
    if req.last_opened_folder is not None:
        cfg["last_opened_folder"] = req.last_opened_folder
    save_system_config(cfg)
    return {"success": True, "config": cfg}

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
    default_dir = os.path.expanduser("~/.ollama/models")
    path = os.environ.get("OLLAMA_MODELS")
    if not path:
        cfg = load_system_config()
        path = cfg.get("model_storage_path", default_dir)
    return {"current_path": path, "default_c": default_dir}

# Update Model Storage Location
@app.post("/api/models/update_storage_location")
def api_update_storage_location(req: UpdateStoragePathRequest):
    new_dir = req.new_path.strip()
    if not os.path.exists(new_dir):
        try:
            os.makedirs(new_dir, exist_ok=True)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Không thể tạo thư mục: {str(e)}")

    os.environ["OLLAMA_MODELS"] = new_dir
    cfg = load_system_config()
    cfg["model_storage_path"] = new_dir
    cfg["updated_at"] = int(time.time())
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

    return {"success": True, "new_path": new_dir, "message": "Đã đổi nơi lưu trữ mô hình thành công! Hãy khởi động lại Ollama để nhận đường dẫn mới."}

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
            "junk_paths": junk_paths
        }) + "\n"

    return StreamingResponse(scan_generator(), media_type="application/x-ndjson")

@app.post("/api/files/trash")
def api_trash_files(req: TrashRequest):
    res = safe_clean_trash(req.file_paths, req.clean_system_temp)
    if res.get("success"):
        record_user_action("trash_files", {
            "cleaned_count": res.get("cleaned_count", 0),
            "blocked_count": res.get("blocked_count", 0)
        })
    return res

class CleanTempRequest(BaseModel):
    zones: Optional[List[str]] = None

# Built-in Dedicated Temp Cleaner API
@app.get("/api/system/temp_status")
def api_get_temp_status():
    from file_manager import get_system_temp_status
    return get_system_temp_status()

@app.post("/api/system/clean_temp_stream")
def api_clean_system_temp_stream(req: Optional[CleanTempRequest] = None):
    from file_manager import get_system_temp_status, run_external_temp_cleaner, format_bytes
    target_ids = set(req.zones) if req and req.zones else {"user_temp", "win_temp", "crash_dumps", "prefetch"}
    
    def clean_generator():
        zones = get_system_temp_status()
        active_zones = [z for z in zones if z["id"] in target_ids]
        
        # Phase 1: Count total items to clean
        total_items = sum(z["file_count"] for z in active_zones)
        if total_items == 0:
            total_items = 1 # Avoid division by zero
            
        cleaned_count = 0
        freed_bytes = 0
        locked_count = 0
        start_time = time.time()
        
        # Yield initial start progress event
        yield json.dumps({
            "type": "progress",
            "current_zone": "Bắt đầu dọn dẹp...",
            "current_file": "Đang phân tích các tệp cần xóa...",
            "cleaned_count": 0,
            "total_items": total_items,
            "freed_mb": 0.0,
            "locked_count": 0,
            "percent": 5.0,
            "elapsed": 0.1,
            "est_left": 3.0
        }) + "\n"

        for z in active_zones:
            p = z["path"]
            if not os.path.exists(p):
                continue
            
            try:
                entries = os.listdir(p)
            except Exception:
                continue
                
            for item in entries:
                full_item = os.path.join(p, item)
                try:
                    if os.path.isfile(full_item) or os.path.islink(full_item):
                        sz = os.path.getsize(full_item)
                        os.remove(full_item)
                        cleaned_count += 1
                        freed_bytes += sz
                    elif os.path.isdir(full_item):
                        shutil.rmtree(full_item, ignore_errors=True)
                        cleaned_count += 1
                except Exception:
                    locked_count += 1
                    
                # Yield progress every few items (handle both cleaned and locked items)
                processed_count = cleaned_count + locked_count
                if processed_count % 5 == 0 or processed_count <= 10:
                    elapsed = max(time.time() - start_time, 0.1)
                    speed = max(processed_count / elapsed, 1)
                    percent = min(round((processed_count / total_items) * 100, 1), 99.0)
                    rem_items = max(total_items - processed_count, 0)
                    est_left = round(rem_items / speed, 1)
                    
                    yield json.dumps({
                        "type": "progress",
                        "current_zone": z["name"],
                        "current_file": item,
                        "cleaned_count": cleaned_count,
                        "total_items": total_items,
                        "freed_mb": round(freed_bytes / (1024**2), 1),
                        "locked_count": locked_count,
                        "percent": percent,
                        "elapsed": round(elapsed, 1),
                        "est_left": est_left
                    }) + "\n"
        
        # Trigger external tool if needed
        external_res = run_external_temp_cleaner()
        elapsed_total = round(time.time() - start_time, 2)
        
        yield json.dumps({
            "type": "completed",
            "cleaned_count": cleaned_count,
            "total_items": total_items,
            "freed_formatted": format_bytes(freed_bytes),
            "freed_mb": round(freed_bytes / (1024**2), 1),
            "locked_count": locked_count,
            "elapsed_seconds": elapsed_total,
            "message": f"Đã dọn sạch {cleaned_count} tệp tạm ({format_bytes(freed_bytes)}). Bỏ qua an toàn {locked_count} tệp đang khóa!"
        }) + "\n"
        
    return StreamingResponse(clean_generator(), media_type="application/x-ndjson")

@app.post("/api/system/clean_temp")
def api_clean_system_temp(req: Optional[CleanTempRequest] = None):
    from file_manager import clean_system_temp_native
    target_zones = req.zones if req else None
    return clean_system_temp_native(target_zones)

@app.post("/api/files/organize")
def api_organize_files(req: OrganizeRequest):
    res = organize_files_safe(req.file_paths, req.target_base, req.mode)
    if res.get("success"):
        record_user_action("organize_files", {
            "mode": req.mode,
            "target_base": req.target_base,
            "count": res.get("success_count", 0)
        })
    return res

@app.post("/api/files/organize_preview")
def api_organize_preview(req: OrganizePreviewRequest):
    return generate_organize_preview(req.file_paths, req.target_base)

# Undo / Redo & Action History
@app.post("/api/files/undo")
def api_undo_organize():
    res = undo_last_organize()
    if res.get("success"):
        record_user_action("undo_organize", {"message": res.get("message")})
    return res

@app.post("/api/files/redo")
def api_redo_organize():
    res = redo_last_organize()
    if res.get("success"):
        record_user_action("redo_organize", {"message": res.get("message")})
    return res

@app.get("/api/files/history")
def api_get_file_history():
    return get_action_history()

class RuleItemModel(BaseModel):
    id: str
    name: str
    domain: str
    extensions: List[str]
    destFolder: str
    subFolderPattern: Optional[str] = "{Category}/{Year}"
    aiModel: Optional[str] = "Qwen 2.5 / Rule Engine"
    priority: int = 1
    enabled: bool = True

RULES_FILE = os.path.join(os.path.expanduser("~"), ".mmo_rules.json")

DEFAULT_RULES = [
    {
        "id": "gamedev",
        "name": "Tài nguyên phát triển Game",
        "domain": "GameDev & Engine",
        "extensions": ["unity", "prefab", "fbx", "obj", "blend", "uproject", "shader", "hlsl", "cs"],
        "destFolder": "GameDev_Projects",
        "subFolderPattern": "{Domain}/{FileType}",
        "aiModel": "qwen2.5:1.5b (Phân loại ngữ cảnh)",
        "priority": 1,
        "enabled": True
    },
    {
        "id": "code",
        "name": "Mã nguồn & Kho lập trình",
        "domain": "Software_Engineering",
        "extensions": ["py", "rs", "cpp", "c", "h", "java", "ts", "tsx", "js", "html", "css", "sql", "json"],
        "destFolder": "Source_Code",
        "subFolderPattern": "{Language}/{ProjectName}",
        "aiModel": "qwen2.5:1.5b (AST & Domain)",
        "priority": 2,
        "enabled": True
    },
    {
        "id": "docs",
        "name": "Tài liệu văn phòng & Nghiên cứu",
        "domain": "Documents_Office",
        "extensions": ["docx", "pdf", "xlsx", "pptx", "csv", "txt", "doc", "xls"],
        "destFolder": "Office_Vault",
        "subFolderPattern": "{Category}/{Year}",
        "aiModel": "qwen2.5:1.5b + bge-m3",
        "priority": 3,
        "enabled": True
    },
    {
        "id": "media",
        "name": "Đồ họa & Đa phương tiện",
        "domain": "Creative_Media",
        "extensions": ["png", "jpg", "psd", "ai", "mp4", "mov", "wav", "mp3", "flac"],
        "destFolder": "Media_Library",
        "subFolderPattern": "{Modality}/{Resolution}",
        "aiModel": "moondream (Vision) + whisper",
        "priority": 4,
        "enabled": True
    },
    {
        "id": "installers",
        "name": "Bộ cài đặt & Tệp nén",
        "domain": "Installers_Packages",
        "extensions": ["exe", "msi", "zip", "rar", "7z", "iso"],
        "destFolder": "Installers_Archives",
        "subFolderPattern": "{Type}",
        "aiModel": "Quy tắc định dạng",
        "priority": 5,
        "enabled": True
    }
]

@app.get("/api/rules")
def api_get_rules():
    if os.path.exists(RULES_FILE):
        try:
            with open(RULES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except:
            pass
    return DEFAULT_RULES

@app.post("/api/rules")
def api_save_rules(rules: List[RuleItemModel]):
    try:
        with open(RULES_FILE, "w", encoding="utf-8") as f:
            json.dump([r.dict() for r in rules], f, ensure_ascii=False, indent=2)
        record_user_action("update_rules", {"rules_count": len(rules)})
        return {"success": True, "message": f"Đã lưu thành công {len(rules)} quy tắc vào hệ thống!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ChatRequest(BaseModel):
    message: str
    model: Optional[str] = "llama3.2:1b"

@app.post("/api/ai/chat")
def api_ai_chat(req: ChatRequest):
    model = req.model if req.model else "llama3.2:1b"
    system_prompt = (
        "Bạn là Trợ lý AI Thông Minh tích hợp của ứng dụng MMO Desktop (Multimodal Organizer). "
        "Nhiệm vụ của bạn là hỗ trợ người dùng phân loại tệp tin, dọn dẹp hệ thống, tìm kiếm tệp ngữ nghĩa, "
        "tối ưu phân tầng Hot/Warm/Cold, giải đáp thắc mắc về phần cứng, dung lượng đĩa và cách dùng phần mềm. "
        "Hãy trả lời bằng tiếng Việt thân thiện, súc tích, chuyên nghiệp."
    )
    full_prompt = f"{system_prompt}\n\nNgười dùng: {req.message}\nTrợ lý MMO:"
    try:
        r = requests.post(
            "http://127.0.0.1:11434/api/generate",
            json={"model": model, "prompt": full_prompt, "stream": False},
            timeout=30
        )
        if r.status_code == 200:
            return {"success": True, "reply": r.json().get("response", "").strip()}
    except Exception as e:
        pass
    
    # Fallback if Ollama not responding or timeout
    return {
        "success": True,
        "reply": f"Tôi là Trợ lý MMO! Tôi có thể giúp bạn sắp xếp dữ liệu tự động, dọn dẹp bộ nhớ đệm hoặc giải thích cách phân loại tệp tin. (Bạn đã hỏi: '{req.message}')"
    }

class OverviewStatsRequest(BaseModel):
    directory: Optional[str] = None

@app.post("/api/stats/overview")
def api_get_overview_stats(req: Optional[OverviewStatsRequest] = None):
    default_dir = os.path.expanduser("~")
    scan_dir = req.directory if req and req.directory and os.path.exists(req.directory) else default_dir
    stats = {
        "text": {"count": 0, "bytes": 0, "model": "Qwen 2.5 / Llama 3.2"},
        "image": {"count": 0, "bytes": 0, "model": "Moondream2 Vision"},
        "audio": {"count": 0, "bytes": 0, "model": "Whisper SLM"},
        "video": {"count": 0, "bytes": 0, "model": "Cold Storage"},
        "other": {"count": 0, "bytes": 0, "model": "General Archive"}
    }
    
    from file_manager import detect_modality, format_bytes
    total_files = 0
    total_size = 0
    
    try:
        for root, dirs, files in os.walk(scan_dir):
            dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ["node_modules", ".git", "__pycache__", "dist", "target"]]
            for f in files:
                if f.startswith(".") or f.startswith("~$"):
                    continue
                ext = os.path.splitext(f)[1].lower().lstrip(".")
                mod = detect_modality(ext)
                fp = os.path.join(root, f)
                try:
                    sz = os.path.getsize(fp)
                except:
                    sz = 0
                
                total_files += 1
                total_size += sz
                
                if mod in stats:
                    stats[mod]["count"] += 1
                    stats[mod]["bytes"] += sz
                else:
                    stats["other"]["count"] += 1
                    stats["other"]["bytes"] += sz
                
                if total_files >= 10000:
                    break
            if total_files >= 10000:
                break
    except Exception:
        pass

    chart_data = [
        {"name": "Văn bản", "key": "text", "count": stats["text"]["count"], "size": format_bytes(stats["text"]["bytes"]), "bytes": stats["text"]["bytes"], "color": "#38bdf8"},
        {"name": "Hình ảnh", "key": "image", "count": stats["image"]["count"], "size": format_bytes(stats["image"]["bytes"]), "bytes": stats["image"]["bytes"], "color": "#34d399"},
        {"name": "Âm thanh", "key": "audio", "count": stats["audio"]["count"], "size": format_bytes(stats["audio"]["bytes"]), "bytes": stats["audio"]["bytes"], "color": "#fbbf24"},
        {"name": "Video", "key": "video", "count": stats["video"]["count"], "size": format_bytes(stats["video"]["bytes"]), "bytes": stats["video"]["bytes"], "color": "#f87171"},
        {"name": "Mã nguồn & Khác", "key": "other", "count": stats["other"]["count"], "size": format_bytes(stats["other"]["bytes"]), "bytes": stats["other"]["bytes"], "color": "#a78bfa"}
    ]

    return {
        "success": True,
        "directory": scan_dir,
        "total_files": total_files,
        "total_size_formatted": format_bytes(total_size),
        "stats": stats,
        "chart_data": chart_data
    }

class TieringMigrationRequest(BaseModel):
    source_dir: Optional[str] = None
    target_cold_dir: Optional[str] = None
    days_inactive: Optional[int] = 30

@app.post("/api/storage/tiering_scan")
def api_storage_tiering_scan(req: Optional[TieringMigrationRequest] = None):
    home = os.path.expanduser("~")
    scan_dir = req.source_dir if req and req.source_dir and os.path.exists(req.source_dir) else home
    from file_manager import format_bytes
    
    now = time.time()
    hot_files, warm_files, cold_files = [], [], []
    hot_bytes, warm_bytes, cold_bytes = 0, 0, 0
    
    try:
        for root, dirs, files in os.walk(scan_dir):
            dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ["node_modules", ".git", "__pycache__", "dist", "target"]]
            for f in files:
                if f.startswith(".") or f.startswith("~$"):
                    continue
                fp = os.path.join(root, f)
                try:
                    st = os.stat(fp)
                    sz = st.st_size
                    # File modification / access age
                    age_days = (now - max(st.st_mtime, st.st_atime)) / 86400.0
                    
                    record = {
                        "name": f,
                        "path": fp,
                        "size_formatted": format_bytes(sz),
                        "age_days": round(age_days, 1)
                    }
                    
                    if age_days <= 7:
                        hot_files.append(record)
                        hot_bytes += sz
                    elif age_days <= 45:
                        warm_files.append(record)
                        warm_bytes += sz
                    else:
                        cold_files.append(record)
                        cold_bytes += sz
                except:
                    pass
    except Exception:
        pass
        
    return {
        "success": True,
        "directory": scan_dir,
        "hot": {
            "count": len(hot_files),
            "bytes": hot_bytes,
            "size_formatted": format_bytes(hot_bytes),
            "sample": hot_files[:5]
        },
        "warm": {
            "count": len(warm_files),
            "bytes": warm_bytes,
            "size_formatted": format_bytes(warm_bytes),
            "sample": warm_files[:5]
        },
        "cold": {
            "count": len(cold_files),
            "bytes": cold_bytes,
            "size_formatted": format_bytes(cold_bytes),
            "sample": cold_files[:5]
        }
    }

@app.post("/api/storage/tiering_migrate")
def api_storage_tiering_migrate(req: TieringMigrationRequest):
    scan_res = api_storage_tiering_scan(req)
    cold_items = scan_res["cold"]["sample"]
    home = os.path.expanduser("~")
    target_cold = req.target_cold_dir or os.path.join(home, "Cold_Tier_Vault")
    
    from file_manager import organize_files_safe
    paths_to_move = [item["path"] for item in cold_items if os.path.exists(item["path"])]
    if not paths_to_move:
        return {
            "success": True,
            "message": "Tất cả các tệp hiện tại đều đang được truy cập gần đây (Hot/Warm Tier), không cần di chuyển sang Cold Tier!"
        }
        
    res = organize_files_safe(paths_to_move, target_cold, mode="move")
    return {
        "success": True,
        "moved_count": res.get("success_count", 0),
        "target_dir": target_cold,
        "message": f"Đã di chuyển tối ưu {res.get('success_count', 0)} tệp Cold Tier (không truy cập > 30 ngày) sang thư mục lưu trữ dài hạn: {target_cold}!"
    }

class SemanticSearchRequest(BaseModel):
    query: str
    search_dir: Optional[str] = None
    top_k: Optional[int] = 10

def sniff_file_content(file_path: str, max_chars: int = 1000) -> str:
    """
    Blazing-fast content sniffer: reads first snippet of readable files
    to extract actual contextual content for true semantic embeddings.
    """
    ext = os.path.splitext(file_path)[1].lower().lstrip(".")
    text_exts = {
        "txt", "md", "json", "py", "rs", "ts", "tsx", "js", "jsx", "html", "css",
        "csv", "yaml", "yml", "toml", "bat", "sh", "ps1", "sql", "log", "ini", "cfg"
    }
    if ext not in text_exts:
        return ""
    try:
        # Check size to prevent opening massive binaries
        if os.path.getsize(file_path) > 10 * 1024 * 1024:
            return ""
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read(max_chars).strip()
            # Clean whitespace
            content = " ".join(content.split())
            return content
    except Exception:
        return ""

@app.post("/api/search/semantic")
def api_semantic_search(req: SemanticSearchRequest):
    query = req.query.strip()
    if not query:
        return {"success": True, "results": []}

    home = os.path.expanduser("~")
    search_path = req.search_dir.strip() if req.search_dir and os.path.exists(req.search_dir.strip()) else home
    
    # 1. Collect candidate files from search directory (up to 300 files)
    candidate_files = []
    try:
        for root, dirs, files in os.walk(search_path):
            # Skip hidden and cache folders
            dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ["node_modules", ".git", "__pycache__", "dist", "target", "build"]]
            for f in files:
                if f.startswith(".") or f.startswith("~$"):
                    continue
                full_path = os.path.join(root, f)
                ext = os.path.splitext(f)[1].lower().lstrip(".")
                candidate_files.append({
                    "name": f,
                    "path": full_path,
                    "ext": ext
                })
                if len(candidate_files) >= 400:
                    break
            if len(candidate_files) >= 400:
                break
    except Exception:
        pass

    # 2. Try Vector Embedding via Ollama nomic-embed-text or bge-m3
    results = []
    vector_search_worked = False

    def get_embedding(text: str, model: str = "nomic-embed-text"):
        try:
            r = requests.post("http://127.0.0.1:11434/api/embeddings", json={"model": model, "prompt": text[:1500]}, timeout=3)
            if r.status_code == 200:
                return r.json().get("embedding")
        except:
            pass
        return None

    # Check available embedding model
    embed_model = "nomic-embed-text"
    query_vec = get_embedding(query, embed_model)
    if not query_vec:
        query_vec = get_embedding(query, "bge-m3")
        if query_vec:
            embed_model = "bge-m3"

    # Normalize query words for lexical match
    q_words = [w.lower() for w in query.split() if len(w) > 1]

    def cosine_sim(a, b):
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(x * x for x in b) ** 0.5
        return dot / (norm_a * norm_b) if norm_a and norm_b else 0.0

    # Read preview/content snippet for candidate files
    from file_manager import detect_modality
    from ai_organizer import analyze_file_intent

    # Pre-rank candidates by fast lexical and extension matching first
    # So we don't calculate expensive neural embeddings for hundreds of irrelevant files
    pre_scored = []
    for item in candidate_files:
        name_lower = item["name"].lower()
        match_count = sum(1 for w in q_words if w in name_lower)
        pre_scored.append((match_count, item))
    pre_scored.sort(key=lambda x: x[0], reverse=True)
    # Take top 35 candidates for neural embedding & deep content sniffing
    eval_candidates = [item for _, item in pre_scored[:35]]

    scored_items = []
    for item in eval_candidates:
        name = item["name"]
        path = item["path"]
        ext = item["ext"]
        name_lower = name.lower()

        # Read actual content snippet (up to 800 chars)
        file_content_snippet = sniff_file_content(path, max_chars=800)
        content_lower = file_content_snippet.lower()

        # Lexical matching score: name match has high weight, content match adds weight
        name_matches = sum(1 for w in q_words if w in name_lower)
        content_matches = sum(1 for w in q_words if w in content_lower) if file_content_snippet else 0

        lexical_score = 0.0
        if q_words:
            lexical_score = min(1.0, (name_matches * 0.7 + (1.0 if content_matches > 0 else 0.0) * 0.3) / max(len(q_words), 1))

        # Vector score
        vector_score = 0.0
        intent = analyze_file_intent(name, ext)

        if query_vec:
            # Enrich embedding context with actual content snippet!
            combined_context = f"{name} {intent.get('context_tag', '')} {intent.get('main_folder', '')}"
            if file_content_snippet:
                combined_context += f" | Nội dung: {file_content_snippet[:350]}"

            file_vec = get_embedding(combined_context, embed_model)
            if file_vec:
                vector_search_worked = True
                raw_v = cosine_sim(query_vec, file_vec)
                # Re-scale true relevance: >0.55 is strong, <0.4 is weak/irrelevant
                vector_score = max(0.0, (raw_v - 0.45) / 0.55)

        # Combined final score
        if vector_search_worked:
            final_score = (vector_score * 0.6) + (lexical_score * 0.4)
        else:
            final_score = lexical_score

        # Prepare meaningful snippet
        if file_content_snippet:
            snippet_text = file_content_snippet[:140] + ("..." if len(file_content_snippet) > 140 else "")
        else:
            snippet_text = f"Tệp {detect_modality(ext)} thuộc nhóm {intent.get('main_folder', 'Tài liệu')}. Nhãn: {intent.get('context_tag', 'Chung')}."

        tier = "Hot" if final_score >= 0.65 else ("Warm" if final_score >= 0.35 else "Cold")

        # FILTER: Only include if score is genuinely non-zero
        if final_score > 0.08 or lexical_score > 0:
            scored_items.append({
                "title": name,
                "path": path,
                "modality": detect_modality(ext),
                "score": round(final_score, 2),
                "snippet": snippet_text,
                "cluster": intent.get("main_folder", "General"),
                "tier": tier
            })

    # Sort descending by score
    scored_items.sort(key=lambda x: x["score"], reverse=True)
    results = scored_items[:req.top_k]

    return {
        "success": True,
        "query": query,
        "search_dir": search_path,
        "model_used": embed_model if vector_search_worked else "Hybrid Lexical Engine",
        "vector_enabled": vector_search_worked,
        "total_scanned": len(candidate_files),
        "results": results
    }

# Locate frontend dist directory supporting both dev mode and PyInstaller frozen binary
if getattr(sys, 'frozen', False):
    # PyInstaller bundled root directory
    ROOT_DIR = sys._MEIPASS if hasattr(sys, '_MEIPASS') else os.path.dirname(os.path.abspath(__file__))
    DIST_DIR = os.path.join(ROOT_DIR, "frontend", "dist")
else:
    ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DIST_DIR = os.path.join(ROOT_DIR, "frontend", "dist")

if os.path.exists(DIST_DIR):
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
