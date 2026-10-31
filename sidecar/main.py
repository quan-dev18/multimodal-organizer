import json
import time
import requests
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List

from hardware import get_hardware_info, check_ollama_status
from models_catalog import get_recommended_catalog

app = FastAPI(title="MMO Sidecar Backend", version="1.0.0")

# Enable CORS for React Frontend
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
    prompt: Optional[str] = "Hãy phân loại tệp tin sau và trả về định dạng JSON: Tên tệp: 'Báo_cáo_tài_chính_quý_3_2026.pdf', Kích thước: 2.5MB. Loại tài liệu là gì?"

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "MMO Python Sidecar"}

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
    """Stream pulling model from Ollama with progress"""
    ollama_url = "http://localhost:11434/api/pull"
    
    def generate():
        try:
            with requests.post(ollama_url, json={"name": req.model_name}, stream=True, timeout=1200) as r:
                if r.status_code != 200:
                    yield json.dumps({"error": f"Ollama trả về mã lỗi: {r.status_code}"}) + "\n"
                    return
                for chunk in r.iter_lines():
                    if chunk:
                        yield chunk.decode("utf-8") + "\n"
        except Exception as e:
            yield json.dumps({"error": str(e)}) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")

@app.post("/api/models/benchmark")
def api_benchmark(req: BenchmarkRequest):
    """Run a quick benchmark on selected model to measure tok/s and TTFT"""
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
            raise HTTPException(status_code=500, detail="Mô hình chưa được nạp hoặc Ollama bị lỗi.")
        
        data = response.json()
        eval_count = data.get("eval_count", 0)
        eval_duration_ns = data.get("eval_duration", 1)
        # convert ns to seconds
        eval_duration_s = eval_duration_ns / 1e9 if eval_duration_ns else total_time
        tokens_per_sec = round(eval_count / eval_duration_s, 2) if eval_duration_s > 0 else 0
        prompt_eval_count = data.get("prompt_eval_count", 0)

        return {
            "success": True,
            "model": req.model_name,
            "response": data.get("response", ""),
            "tokens_per_sec": tokens_per_sec,
            "eval_count": eval_count,
            "prompt_eval_count": prompt_eval_count,
            "total_time_sec": round(total_time, 2),
            "speed_rating": "Cực nhanh" if tokens_per_sec > 35 else ("Nhanh" if tokens_per_sec > 15 else "Trung bình / Chậm")
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Không thể kết nối tới mô hình. Hãy chắc chắn bạn đã tải mô hình này qua Ollama."
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
