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
from file_manager import scan_directory_tree, safe_clean_trash, organize_files_safe

app = FastAPI(title="MMO Multimodal Core Engine", version="1.1.0")

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
    prompt: Optional[str] = "Phân tích và gán nhãn cho tài liệu: 'Bao_cao_NCKH_2026.docx'. Trả về JSON."

class ScanTreeRequest(BaseModel):
    directory: str
    include_hidden: bool = True

class DeepScanProgressRequest(BaseModel):
    directory: str

class TrashRequest(BaseModel):
    file_paths: List[str]

class OrganizeRequest(BaseModel):
    file_paths: List[str]
    target_base: str
    mode: str = "copy"

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "MMO Desktop Core 1.1"}

@app.get("/api/hardware")
def api_hardware():
    return get_hardware_info()

@app.get("/api/ollama/status")
def api_ollama_status():
    return check_ollama_status()

# Return Model Clusters & Multi-model selection
@app.get("/api/models/clusters")
def api_models_clusters():
    return get_all_model_clusters()

@app.get("/api/models/catalog")
def api_models_catalog():
    return get_flat_catalog()

@app.post("/api/ollama/pull")
def api_ollama_pull(req: PullRequest):
    ollama_url = "http://localhost:11434/api/pull"
    def generate():
        try:
            with requests.post(ollama_url, json={"name": req.model_name}, stream=True, timeout=1800) as r:
                if r.status_code != 200:
                    yield json.dumps({"error": f"Lỗi Ollama: HTTP {r.status_code}"}) + "\n"
                    return
                for chunk in r.iter_lines():
                    if chunk:
                        yield chunk.decode("utf-8") + "\n"
        except Exception as e:
            yield json.dumps({"error": str(e)}) + "\n"

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

# Explorer Tree Scanning (Folder inside folder)
@app.post("/api/files/tree")
def api_scan_tree(req: ScanTreeRequest):
    return scan_directory_tree(req.directory, req.include_hidden)

# Deep Scan with Progress Stream & Time Estimation (Only runs when requested)
@app.post("/api/files/deep_scan_stream")
def api_deep_scan_stream(req: DeepScanProgressRequest):
    def scan_generator():
        root_dir = req.directory
        start_time = time.time()
        scanned_count = 0
        total_bytes = 0
        junk_count = 0
        hidden_count = 0

        # Scan iteratively
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

                # Check junk
                ext = os.path.splitext(fname)[1].lower().lstrip(".")
                if ext in ["tmp", "log", "bak", "cache", "crdownload"] or fname.lower() in ["thumbs.db", ".ds_store"]:
                    junk_count += 1
                if fname.startswith("."):
                    hidden_count += 1

                # Yield progress updates periodically
                if scanned_count % 30 == 0 or scanned_count <= 10:
                    elapsed = time.time() - start_time
                    rate = scanned_count / elapsed if elapsed > 0 else 100
                    # Estimated time left based on local folder density
                    est_time_sec = round(max(0.5, (100 - (scanned_count % 100)) / max(rate, 1)), 1)
                    
                    yield json.dumps({
                        "type": "progress",
                        "scanned_count": scanned_count,
                        "current_file": fname,
                        "current_folder": current_folder,
                        "junk_count": junk_count,
                        "hidden_count": hidden_count,
                        "elapsed_seconds": round(elapsed, 1),
                        "estimated_seconds_left": est_time_sec
                    }) + "\n"

        elapsed_total = round(time.time() - start_time, 2)
        yield json.dumps({
            "type": "completed",
            "total_scanned": scanned_count,
            "total_bytes": total_bytes,
            "junk_count": junk_count,
            "hidden_count": hidden_count,
            "elapsed_seconds": elapsed_total
        }) + "\n"

    return StreamingResponse(scan_generator(), media_type="application/x-ndjson")

@app.post("/api/files/trash")
def api_trash_files(req: TrashRequest):
    return safe_clean_trash(req.file_paths)

@app.post("/api/files/organize")
def api_organize_files(req: OrganizeRequest):
    return organize_files_safe(req.file_paths, req.target_base, req.mode)

# Serve built frontend assets directly via HTTP at root
DIST_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.exists(DIST_DIR):
    app.mount("/", StaticFiles(directory=DIST_DIR, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
