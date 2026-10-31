import webview
import threading
import time
import requests
import sys
import os

def start_backend():
    import uvicorn
    from main import app
    uvicorn.run(app, host="127.0.0.1", port=8001, log_level="warning")

def wait_for_services():
    # Wait for backend
    for _ in range(30):
        try:
            r = requests.get("http://127.0.0.1:8001/api/health", timeout=1)
            if r.status_code == 200:
                break
        except:
            time.sleep(0.5)

if __name__ == "__main__":
    # Start backend thread if not already running
    try:
        r = requests.get("http://127.0.0.1:8001/api/health", timeout=0.8)
    except:
        backend_thread = threading.Thread(target=start_backend, daemon=True)
        backend_thread.start()
        wait_for_services()

    # Create native Windows Desktop Window with dark theme & optimal size
    window = webview.create_window(
        title="MMO — Multimodal Organizer Desktop",
        url="http://127.0.0.1:5173",
        width=1280,
        height=820,
        min_size=(1024, 680),
        background_color='#020617', # Slate 950 Dark
        text_select=True,
        zoomable=True
    )
    
    # Run desktop app GUI
    webview.start(debug=False)
