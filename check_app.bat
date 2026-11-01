@echo off
title Kiem tra he thong MMO Desktop
color 0A
echo ========================================================
echo   MMO - Multimodal Organizer (System & API Checker)
echo ========================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0check_app.ps1"
echo.
pause
