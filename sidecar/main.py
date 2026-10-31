import json
import time
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from hardware import get_hardware_info, check_ollama_status
from models_catalog import get_recommended_catalog
from file_manager import scan_files, safe_clean_trash, organize_files_safe

app = FastAPI(title="MMO Desktop Core Engine", version="1.0.0")

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
    prompt: Optional[str] = "Phân loại tệp: 'Bao_cao_tai_chinh_quy_3_2026.pdf', 2.5MB. Trả về nhãn JSON."

class ScanRequest(BaseModel):
    directory: str
    include_hidden: bool = True

class TrashRequest(BaseModel):
    file_paths: List[str]

class OrganizeRequest(BaseModel):
    file_paths: List[str]
    target_base: str
    mode: str = "copy" # copy or move

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "MMO Desktop Core"}

@app.get("/api/hardware")
def api_hardware():
    return get_hardware_info()

@app.get("/api/ollama/status")
def api_ollama_status():
    return check_ollama_status()

@app.get("/api/models/catalog")
def api_models_catalog():
    return get_recommended_catalog()

@app.post("/api/ollama/pull")
def api_ollama_pull(req: PullRequest):
    ollama_url = "http://localhost:11434/api/pull"
    def generate():
        try:
            with requests.post(ollama_url, json={"name": req.model_name}, stream=True, timeout=1200) as r:
                if r.status_code != 200:
                    yield json.dumps({"error": f"Ollama lỗi HTTP {r.status_code}"}) + "\n"
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
            "speed_rating": "Cực mượt" if tokens_per_sec > 35 else ("Mượt" if tokens_per_sec > 15 else "Chậm")
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Không kết nối được tới mô hình. Vui lòng bật Ollama và tải model."
        }

# File Management Endpoints (L1 Ingestion, L6 Storage, Safe Trash & Organize)
@app.post("/api/files/scan")
def api_scan_files(req: ScanRequest):
    files = scan_files(req.directory, req.include_hidden)
    return {"directory": req.directory, "total_items": len(files), "files": files}

@app.post("/api/files/trash")
def api_trash_files(req: TrashRequest):
    return safe_clean_trash(req.file_paths)

@app.post("/api/files/organize")
def api_organize_files(req: OrganizeRequest):
    return organize_files_safe(req.file_paths, req.target_base, req.mode)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
