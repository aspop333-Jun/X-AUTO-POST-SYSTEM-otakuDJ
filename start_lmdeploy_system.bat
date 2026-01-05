@echo off
chcp 65001 >nul
setlocal

echo ===================================================
echo 🐯 Kotaro-Engine System Launcher (LMDeploy Edition)
echo ===================================================
echo.

:: Backend (WSL)
echo [1/2] Starting Backend Server (Qwen2-VL on WSL/Port 23334)...
start "LMDeploy Backend (Do Not Close)" wsl -e bash -c "cd /mnt/c/AI/APP/X-AUTO-POST-SYSTEM-otakuDJ && source .venv_lmdeploy/bin/activate && echo 'Starting Server on Port 23334...' && python3 scripts/launch_qwen2.py; echo 'Server stopped.'; read -p 'Press Enter to exit.' "
echo    -> Backend window opened.
echo.

echo Waiting for backend to initialize (10 seconds)...
timeout /t 10 >nul

:: Frontend (Windows)
echo [2/2] Starting API Server (Kotaro API)...
if exist ".venv\Scripts\activate.bat" (
    echo    -> Activating minimal .venv...
    call .venv\Scripts\activate.bat
)

echo.
echo =======================================
echo   Server is running at:
echo   http://localhost:8000/docs
echo   (Backend: http://localhost:23334)
echo =======================================
echo.
python kotaro_api.py

endlocal
pause
