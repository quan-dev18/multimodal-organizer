import os
import sys
import time
import shutil
import subprocess
import psutil
import requests
from typing import Dict, Any, List, Optional

def find_ollama_executable() -> Optional[str]:
    """Find ollama executable path on Windows or other OS."""
    # 1. Check in PATH
    exe = shutil.which("ollama.exe") or shutil.which("ollama")
    if exe and os.path.exists(exe):
        return os.path.abspath(exe)

    # 2. Check standard Windows LocalAppData
    local_path = os.path.expandvars(r"%LOCALAPPDATA%\Programs\Ollama\ollama.exe")
    if os.path.exists(local_path):
        return os.path.abspath(local_path)

    # 3. Check Program Files
    pf_path = os.path.expandvars(r"%ProgramFiles%\Ollama\ollama.exe")
    if os.path.exists(pf_path):
        return os.path.abspath(pf_path)

    pf86_path = os.path.expandvars(r"%ProgramFiles(x86)%\Ollama\ollama.exe")
    if os.path.exists(pf86_path):
        return os.path.abspath(pf86_path)

    # 4. Check Windows Registry
    if sys.platform == "win32":
        try:
            import winreg
            for hkey in (winreg.HKEY_CURRENT_USER, winreg.HKEY_LOCAL_MACHINE):
                try:
                    with winreg.OpenKey(hkey, r"Software\Ollama") as key:
                        val, _ = winreg.QueryValueEx(key, "InstallDir")
                        cand = os.path.join(val, "ollama.exe")
                        if os.path.exists(cand):
                            return os.path.abspath(cand)
                except Exception:
                    pass
        except Exception:
            pass

    return None

def ensure_ollama_running(timeout: float = 12.0) -> Dict[str, Any]:
    """
    Ensure Ollama daemon is running on 127.0.0.1:11434.
    If not running, attempts to start it in the background.
    """
    ollama_url = "http://127.0.0.1:11434"
    # 1. Quick check if already up (using IPv4 127.0.0.1 to avoid Windows IPv6 localhost delay)
    try:
        r = requests.get(f"{ollama_url}/api/version", timeout=1.0)
        if r.status_code == 200:
            return {
                "success": True,
                "already_running": True,
                "installed": True,
                "message": "Dịch vụ Ollama đang hoạt động bình thường.",
                "version": r.json().get("version", "unknown")
            }
    except Exception:
        pass

    # 2. Check if executable exists
    ollama_exe = find_ollama_executable()
    if not ollama_exe:
        return {
            "success": False,
            "installed": False,
            "already_running": False,
            "message": "Chưa cài đặt Ollama trên máy tính. Vui lòng tải và cài đặt từ https://ollama.com/download"
        }

    # 3. Spawn background process
    try:
        env = os.environ.copy()
        if "OLLAMA_MODELS" not in env or not env["OLLAMA_MODELS"]:
            env["OLLAMA_MODELS"] = r"D:\OllamaModels"

        subprocess.Popen(
            [ollama_exe, "serve"],
            env=env,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )

        # 4. Wait and verify startup
        start_time = time.time()
        while time.time() - start_time < timeout:
            time.sleep(0.5)
            try:
                r = requests.get(f"{ollama_url}/api/version", timeout=1.0)
                if r.status_code == 200:
                    return {
                        "success": True,
                        "already_running": False,
                        "installed": True,
                        "message": "Đã tự động khởi động dịch vụ Ollama thành công!",
                        "version": r.json().get("version", "unknown")
                    }
            except Exception:
                pass

        return {
            "success": False,
            "installed": True,
            "already_running": False,
            "message": "Đã khởi động tiến trình Ollama nhưng quá thời gian chờ (Timeout) phản hồi cổng 11434."
        }
    except Exception as e:
        return {
            "success": False,
            "installed": True,
            "already_running": False,
            "message": f"Lỗi khi khởi chạy Ollama: {str(e)}"
        }

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
    ollama_url = "http://127.0.0.1:11434"
    exe_path = find_ollama_executable()
    is_installed = (exe_path is not None)

    status = {
        "is_installed": is_installed,
        "is_running": False,
        "installed_or_running": False,  # Kept for backward compatibility
        "version": "unknown",
        "models": [],
        "running_models": [],
        "url": ollama_url,
        "executable_path": exe_path,
        "download_url": "https://ollama.com/download",
        "error_message": None
    }

    try:
        res = requests.get(f"{ollama_url}/api/version", timeout=1.5)
        if res.status_code == 200:
            status["is_running"] = True
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
            except Exception:
                pass
        else:
            status["error_message"] = f"Mã phản hồi HTTP {res.status_code} từ dịch vụ Ollama."
    except requests.exceptions.Timeout:
        status["error_message"] = "Kết nối quá thời gian chờ (Timeout). Dịch vụ Ollama phản hồi chậm hoặc đang treo."
    except requests.exceptions.ConnectionError:
        if is_installed:
            status["error_message"] = "Dịch vụ Ollama chưa được bật (không thể kết nối cổng 11434)."
        else:
            status["error_message"] = "Chưa cài đặt Ollama trên máy tính."
    except Exception as e:
        status["error_message"] = str(e)

    return status
