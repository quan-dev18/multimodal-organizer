@echo off
chcp 65001 >nul
title MMO Desktop — Multimodal Organizer
color 0B
echo ======================================================================
echo          MMO DESKTOP - MULTIMODAL ORGANIZER (AI CORE ENGINE)
echo ======================================================================
echo.
cd /d "%~dp0"

where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [LOI] Khong tim thay Python trong PATH!
    echo Vui long cai dat Python 3.10 tro len va tich chon "Add Python to PATH".
    echo.
    pause
    exit /b 1
)

echo [*] Dang khoi dong cac tien trinh nen:
echo     - Dich vu Ollama Local (Cong 11434)
echo     - FastAPI Core Engine (Cong 8001)
echo     - Cua so Desktop Native MMO Dark-Mode
echo.
python run_desktop.py
if %ERRORLEVEL% neq 0 (
    echo.
    echo [CANH BAO] Tien trinh dung voi ma loi %ERRORLEVEL%.
    pause
)
