import webview
import threading
import time
import requests
import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SIDECAR_DIR = os.path.join(BASE_DIR, "sidecar")

if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
if SIDECAR_DIR not in sys.path:
    sys.path.insert(0, SIDECAR_DIR)

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
    # Check if backend already running
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

    # Load via HTTP (both UI and API served through http://127.0.0.1:8001)
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
