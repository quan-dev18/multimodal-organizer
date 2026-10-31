import os
import psutil
import requests
from typing import Dict, Any, List

def get_hardware_info() -> Dict[str, Any]:
    # 1. System RAM
    mem = psutil.virtual_memory()
    total_ram_gb = round(mem.total / (1024**3), 2)
    used_ram_gb = round(mem.used / (1024**3), 2)
    free_ram_gb = round(mem.available / (1024**3), 2)
    ram_percent = mem.percent

    # 2. GPU & VRAM (via pynvml / nvidia-ml-py)
    gpu_info = {
        "has_gpu": False,
        "name": "N/A",
        "total_vram_gb": 0.0,
        "used_vram_gb": 0.0,
        "free_vram_gb": 0.0,
        "vram_percent": 0.0,
    }

    try:
        import pynvml
        pynvml.nvmlInit()
        device_count = pynvml.nvmlDeviceGetCount()
        if device_count > 0:
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            gpu_name = pynvml.nvmlDeviceGetName(handle)
            if isinstance(gpu_name, bytes):
                gpu_name = gpu_name.decode("utf-8")
            mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
            total_vram = round(mem_info.total / (1024**3), 2)
            used_vram = round(mem_info.used / (1024**3), 2)
            free_vram = round(mem_info.free / (1024**3), 2)
            gpu_info = {
                "has_gpu": True,
                "name": str(gpu_name),
                "total_vram_gb": total_vram,
                "used_vram_gb": used_vram,
                "free_vram_gb": free_vram,
                "vram_percent": round((used_vram / total_vram) * 100, 1) if total_vram > 0 else 0.0,
            }
    except Exception as e:
        # Fallback if no nvidia driver or pynvml failed
        pass

    return {
        "ram": {
            "total_gb": total_ram_gb,
            "used_gb": used_ram_gb,
            "free_gb": free_ram_gb,
            "percent": ram_percent,
        },
        "gpu": gpu_info,
        "cpu": {
            "cores": psutil.cpu_count(logical=False),
            "logical_cores": psutil.cpu_count(logical=True),
            "percent": psutil.cpu_percent(interval=None)
        }
    }

def check_ollama_status() -> Dict[str, Any]:
    ollama_url = "http://localhost:11434"
    status = {
        "installed_or_running": False,
        "version": "unknown",
        "models": [],
        "running_models": [],
        "url": ollama_url
    }
    try:
        res = requests.get(f"{ollama_url}/api/version", timeout=1.5)
        if res.status_code == 200:
            status["installed_or_running"] = True
            status["version"] = res.json().get("version", "unknown")
            
            # Get list of installed models
            tags_res = requests.get(f"{ollama_url}/api/tags", timeout=2.0)
            if tags_res.status_code == 200:
                models_data = tags_res.json().get("models", [])
                status["models"] = [
                    {
                        "name": m.get("name"),
                        "size_gb": round(m.get("size", 0) / (1024**3), 2),
                        "modified_at": m.get("modified_at")
                    }
                    for m in models_data
                ]

            # Get currently loaded models in VRAM/RAM
            try:
                ps_res = requests.get(f"{ollama_url}/api/ps", timeout=1.5)
                if ps_res.status_code == 200:
                    status["running_models"] = ps_res.json().get("models", [])
            except:
                pass
    except Exception:
        status["installed_or_running"] = False

    return status
