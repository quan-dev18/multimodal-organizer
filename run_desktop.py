import webview
import threading
import time
import requests
import subprocess
import sys
import os
import shutil

# Ensure UTF-8 output in Windows console
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

# Detect directory if frozen by PyInstaller or running directly
if getattr(sys, 'frozen', False):
    BASE_DIR = sys._MEIPASS if hasattr(sys, '_MEIPASS') else os.path.dirname(os.path.abspath(__file__))
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

SIDECAR_DIR = os.path.join(BASE_DIR, "sidecar")

if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
if SIDECAR_DIR not in sys.path:
    sys.path.insert(0, SIDECAR_DIR)

def ensure_ollama():
    """Ensure Ollama daemon is running automatically on 127.0.0.1:11434"""
    try:
        try:
            from sidecar.hardware import ensure_ollama_running
        except ImportError:
            from hardware import ensure_ollama_running
        res = ensure_ollama_running(timeout=10.0)
        print(f"[Ollama Launcher] Status: {res.get('success')} - {res.get('message')}")
        return res.get("success", False)
    except Exception as e:
        print(f"[Ollama Launcher] Error: {e}")
        return False

def start_backend():
    import uvicorn
    # In PyInstaller frozen environment, import main from sidecar
    if getattr(sys, 'frozen', False):
        try:
            from sidecar.main import app
        except ImportError:
            from main import app
    else:
        from sidecar.main import app
    uvicorn.run(app, host="127.0.0.1", port=8001, log_level="warning")

if __name__ == "__main__":
    # 1. Start Ollama daemon asynchronously
    threading.Thread(target=ensure_ollama, daemon=True).start()

    # 2. Check if backend is already listening
    backend_is_up = False
    try:
        r = requests.get("http://127.0.0.1:8001/api/health", timeout=0.6)
        if r.status_code == 200:
            backend_is_up = True
    except Exception:
        pass

    # 3. Launch backend if needed
    if not backend_is_up:
        backend_thread = threading.Thread(target=start_backend, daemon=True)
        backend_thread.start()

    # 4. Resolve splash screen and icon paths
    splash_file = os.path.join(BASE_DIR, "splash.html")
    icon_file = os.path.join(BASE_DIR, "frontend", "public", "app_icon.ico")
    if not os.path.exists(icon_file):
        icon_file = os.path.join(BASE_DIR, "app_icon.ico")

    # Start with splash screen that polls for backend ready, avoiding 127.0.0.1 refused
    target_url = splash_file if os.path.exists(splash_file) else "http://127.0.0.1:8001"

    window = webview.create_window(
        title="MMO — Multimodal Organizer Desktop",
        url=target_url,
        width=1280,
        height=820,
        min_size=(1024, 680),
        background_color='#09090b',
        text_select=True,
        zoomable=True
    )
    
    webview.start(debug=False)
