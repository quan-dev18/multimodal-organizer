@echo off
title MMO Desktop - Building Standalone App & Setup Installer
color 0b

echo =======================================================
echo          MMO Desktop - Smart App Packaging
echo =======================================================
echo.

echo [1/4] Bien dich Frontend (Vite + React + Tailwind)...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Loi bien dich frontend!
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo [2/4] Tao file Icon chuan .ico cho ung dung...
python -c "from PIL import Image; src = Image.open(r'frontend\public\mmo_app_icon.png').convert('RGBA'); src = src.resize((256, 256), Image.Resampling.LANCZOS); src.save(r'frontend\public\app_icon.ico', format='ICO', bitmap_format='bmp'); src.save(r'app_icon.ico', format='ICO', bitmap_format='bmp')"

echo.
echo [3/4] Kiem tra cac thu vien PyInstaller, FastAPI, Webview...
python -m pip install pyinstaller pywebview fastapi uvicorn pydantic requests psutil send2trash Pillow pywin32 --quiet

echo.
echo [4/4] Dong goi MMO Desktop thanh file thuc thi (.exe)...
pyinstaller --noconfirm --onedir --windowed ^
    --name "MMO_Desktop" ^
    --icon "app_icon.ico" ^
    --add-data "frontend\dist;frontend\dist" ^
    --add-data "frontend\public\mmo_app_icon.png;." ^
    --add-data "frontend\public\app_icon.ico;." ^
    --add-data "app_icon.ico;." ^
    --add-data "splash.html;." ^
    --add-data "sidecar;sidecar" ^
    --hidden-import "uvicorn" ^
    --hidden-import "uvicorn.logging" ^
    --hidden-import "uvicorn.loops" ^
    --hidden-import "uvicorn.loops.auto" ^
    --hidden-import "uvicorn.protocols" ^
    --hidden-import "uvicorn.protocols.http" ^
    --hidden-import "uvicorn.protocols.http.auto" ^
    --hidden-import "uvicorn.protocols.websockets" ^
    --hidden-import "uvicorn.protocols.websockets.auto" ^
    --hidden-import "uvicorn.lifespans" ^
    --hidden-import "uvicorn.lifespans.on" ^
    --hidden-import "fastapi" ^
    --hidden-import "pydantic" ^
    --hidden-import "psutil" ^
    --hidden-import "send2trash" ^
    --hidden-import "webview" ^
    run_desktop.py

echo.
echo =======================================================
echo [THANH CONG] Dong goi xong!
echo Ban co the:
echo  1. Mo truc tiep file: dist\MMO_Desktop\MMO_Desktop.exe
echo  2. Hoac chay "python make_installer.py" de bat trinh cai dat chon thu muc
echo =======================================================
pause
