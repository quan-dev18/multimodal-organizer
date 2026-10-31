import webview
import threading
import time
import requests
import subprocess
import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SIDECAR_DIR = os.path.join(BASE_DIR, "sidecar")

if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
if SIDECAR_DIR not in sys.path:
    sys.path.insert(0, SIDECAR_DIR)

def ensure_ollama_running():
    """Ensure Ollama daemon is running automatically on localhost:11434"""
    try:
        r = requests.get("http://localhost:11434/api/version", timeout=1)
        if r.status_code == 200:
            print("[MMO] Ollama Engine dang chay san.")
            return True
    except:
        pass

    ollama_exe = os.path.expandvars(r"%LOCALAPPDATA%\Programs\Ollama\ollama.exe")
    if os.path.exists(ollama_exe):
        print("[MMO] Dang tu dong khoi dong Ollama Daemon...")
        try:
            # Launch detached background process
            subprocess.Popen(
                [ollama_exe, "serve"],
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            for _ in range(15):
                time.sleep(0.5)
                try:
                    r = requests.get("http://localhost:11434/api/version", timeout=1)
                    if r.status_code == 200:
                        print("[MMO] Ollama Daemon da khoi dong thanh cong!")
                        return True
                except:
                    pass
        except Exception as e:
            print(f"[MMO] Khong the bat Ollama tu dong: {e}")
    return False

def start_backend():
    import uvicorn
    os.chdir(SIDECAR_DIR)
    from main import app
    uvicorn.run(app, host="127.0.0.1", port=8001, log_level="warning")

def wait_for_services():
    print("[MMO] Dang ket noi toi Backend Core...")
    for _ in range(40):
        try:
            r = requests.get("http://127.0.0.1:8001/api/health", timeout=1)
            if r.status_code == 200:
                print("[MMO] Backend Core da san sang tren cong 8001!")
                return True
        except:
            time.sleep(0.3)
    return False

if __name__ == "__main__":
    print("[MMO] Khoi dong ung dung Desktop MMO...")

    # 1. Auto start Ollama if installed
    ensure_ollama_running()

    # 2. Auto start Backend sidecar
    is_running = False
    try:
        r = requests.get("http://127.0.0.1:8001/api/health", timeout=0.8)
        if r.status_code == 200:
            is_running = True
    except:
        pass

    if not is_running:
        backend_thread = threading.Thread(target=start_backend, daemon=True)
        backend_thread.start()
        wait_for_services()

    app_url = "http://127.0.0.1:8001"

    # Launch native desktop window
    window = webview.create_window(
        title="MMO — Multimodal Organizer Desktop",
        url=app_url,
        width=1280,
        height=820,
        min_size=(1024, 680),
        background_color='#020617',
        text_select=True,
        zoomable=True
    )
    
    webview.start(debug=False)
