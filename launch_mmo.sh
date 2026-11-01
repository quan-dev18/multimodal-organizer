#!/usr/bin/env bash
set -e

# MMO Desktop Linux Launcher
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

# Ensure C++ Core shared library is compiled
if [ ! -f "$APP_DIR/cpp_core/libmmo_core.so" ]; then
    echo "[MMO] Đang biên dịch C++ Core Engine (libmmo_core.so)..."
    make -C "$APP_DIR/cpp_core"
fi

# Ensure Frontend production build exists
if [ ! -f "$APP_DIR/frontend/dist/index.html" ]; then
    echo "[MMO] Đang biên dịch Frontend (Vite + React)..."
    cd "$APP_DIR/frontend"
    mise exec -- npm run build
    cd "$APP_DIR"
fi

# Run Desktop Application
PYTHON_EXEC="/home/quandev/.local/share/mise/installs/python/latest/bin/python"
if [ ! -f "$PYTHON_EXEC" ]; then
    PYTHON_EXEC="python3"
fi

echo "[MMO] Khởi chạy ứng dụng MMO Desktop..."
exec "$PYTHON_EXEC" "$APP_DIR/run_desktop.py" "$@"
