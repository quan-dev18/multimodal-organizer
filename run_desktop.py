import webview
import threading
import time
import requests
import subprocess
import sys
import os

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

def ensure_ollama_running():
    """Ensure Ollama daemon is running automatically on localhost:11434"""
    try:
        r = requests.get("http://localhost:11434/api/version", timeout=1)
        if r.status_code == 200:
            return True
    except:
        pass

    # Try standard system ollama first (Linux / Mac / Windows PATH)
    import shutil
    ollama_bin = shutil.which("ollama")
    if not ollama_bin:
        ollama_bin = os.path.expandvars(r"%LOCALAPPDATA%\Programs\Ollama\ollama.exe")

    if ollama_bin and os.path.exists(ollama_bin):
        try:
            env = os.environ.copy()
            if "OLLAMA_MODELS" not in env or not env["OLLAMA_MODELS"]:
                env["OLLAMA_MODELS"] = os.path.expanduser("~/.ollama/models")
            
            subprocess.Popen(
                [ollama_bin, "serve"],
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            for _ in range(15):
                time.sleep(0.4)
                try:
                    r = requests.get("http://localhost:11434/api/version", timeout=1)
                    if r.status_code == 200:
                        return True
                except:
                    pass
        except Exception:
            pass
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
    # 1. Start Ollama asynchronously
    threading.Thread(target=ensure_ollama_running, daemon=True).start()

    # 2. Check if backend is already listening
    backend_is_up = False
    try:
        r = requests.get("http://127.0.0.1:8001/api/health", timeout=0.6)
        if r.status_code == 200:
            backend_is_up = True
    except:
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

    # Try native GUI via pywebview first; if GTK/QT bindings are missing, fallback to App Window
    opened = False
    try:
        import webview
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
        opened = True
    except Exception as e:
        print(f"[Desktop Host] pywebview GUI runtime unavailable ({e}). Fallback to Native Chromium Window...", file=sys.stderr)

    if not opened:
        # Fallback to standalone Frameless App Window via Chromium/Brave
        target_app_url = "http://127.0.0.1:8001"
        # Wait until backend is fully up
        for _ in range(25):
            try:
                if requests.get("http://127.0.0.1:8001/api/health", timeout=0.5).status_code == 200:
                    break
            except Exception:
                time.sleep(0.2)

        import shutil
        browser_bin = shutil.which("chromium") or shutil.which("brave") or shutil.which("google-chrome")
        if browser_bin:
            app_proc = subprocess.Popen([
                browser_bin,
                f"--app={target_app_url}",
                f"--window-size=1280,820",
                f"--user-data-dir={os.path.expanduser('~/.cache/mmo_desktop_profile')}",
                "--class=mmo_desktop",
                "--name=mmo_desktop"
            ])
            app_proc.wait()
        else:
            import webbrowser
            webbrowser.open(target_app_url)
            # Keep process alive while user uses the app
            while True:
                time.sleep(2)
