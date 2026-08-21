@echo off
title Launch FocusVision AI
echo ==================================================
echo   Launching FocusVision AI (Frontend + Backend)
echo ==================================================

start "FocusVision AI - Backend Server" powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0start-backend.ps1"
start "FocusVision AI - Frontend Server" powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0start-frontend.ps1"

echo.
echo Both servers are starting up:
echo - Frontend: http://localhost:5173
echo - Backend API Docs: http://localhost:8000/docs
echo.
pause
