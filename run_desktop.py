import webview
import threading
import time
import requests
import sys
import os

# Ensure current dir and sidecar dir are in python path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SIDECAR_DIR = os.path.join(BASE_DIR, "sidecar")

if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
if SIDECAR_DIR not in sys.path:
    sys.path.insert(0, SIDECAR_DIR)

def start_backend():
    import uvicorn
    # Change working directory to sidecar so relative imports work seamlessly
    os.chdir(SIDECAR_DIR)
    from main import app
    uvicorn.run(app, host="127.0.0.1", port=8001, log_level="info")

def wait_for_services():
    print("[MMO] Đang kết nối tới Backend Core...")
    for i in range(40):
        try:
            r = requests.get("http://127.0.0.1:8001/api/health", timeout=1)
            if r.status_code == 200:
                print("[MMO] Backend Core đã sẵn sàng trên cổng 8001!")
                return True
        except:
            time.sleep(0.3)
    return False

if __name__ == "__main__":
    print("[MMO] Khởi động ứng dụng Desktop MMO...")
    # Check if backend already running
    is_running = False
    try:
        r = requests.get("http://127.0.0.1:8001/api/health", timeout=0.8)
        if r.status_code == 200:
            is_running = True
            print("[MMO] Backend đã chạy sẵn.")
    except:
        pass

    if not is_running:
        backend_thread = threading.Thread(target=start_backend, daemon=True)
        backend_thread.start()
        wait_for_services()

    # Determine URL: prefer local built dist, or dev server if alive
    frontend_url = "http://127.0.0.1:5173"
    dist_html = os.path.join(BASE_DIR, "frontend", "dist", "index.html")

    # If dev server is not responding, use the built dist index.html directly
    try:
        r = requests.get(frontend_url, timeout=0.5)
    except:
        if os.path.exists(dist_html):
            frontend_url = f"file:///{dist_html.replace(os.sep, '/')}"
            print(f"[MMO] Sử dụng giao diện tĩnh nội bộ: {frontend_url}")

    # Launch native desktop window
    window = webview.create_window(
        title="MMO — Multimodal Organizer Desktop",
        url=frontend_url,
        width=1280,
        height=820,
        min_size=(1024, 680),
        background_color='#020617',
        text_select=True,
        zoomable=True
    )
    
    webview.start(debug=False)
