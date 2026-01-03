@echo off
chcp 65001 >nul 2>&1
setlocal

:: =============================================================================
:: Kotaro-Engine 起動スクリプト (Qwen + GPU最適化)
:: =============================================================================
:: モデル: qwen2.5vl:7b (画像分析) + qwen2.5:7b-instruct-q4_K_M (コメント生成)
:: RTX 4060 (8GB VRAM) 最適化済み
:: =============================================================================

echo.
echo ========================================
echo   🐯 Kotaro-Engine (Qwen + GPU)
echo ========================================
echo.

:: GPU確認
nvidia-smi >nul 2>&1
if errorlevel 1 (
    echo [エラー] NVIDIA GPUが検出されません！
    echo CUDAドライバーをインストールしてください。
    pause
    exit /b 1
)

echo [OK] NVIDIA GPU 検出済み

:: Ollama GPU設定（全レイヤーGPU + Flash Attention）
set OLLAMA_GPU_LAYERS=-1
set OLLAMA_NUM_GPU=99
set OLLAMA_FLASH_ATTENTION=1
set CUDA_VISIBLE_DEVICES=0

echo [OK] Ollama GPU設定完了
echo     OLLAMA_GPU_LAYERS=%OLLAMA_GPU_LAYERS%
echo     OLLAMA_FLASH_ATTENTION=%OLLAMA_FLASH_ATTENTION%
echo.

:: Ollamaが起動しているか確認
ollama ps >nul 2>&1
if errorlevel 1 (
    echo [INFO] Ollama を起動中...
    start /b ollama serve >nul 2>&1
    timeout /t 3 /nobreak >nul
)

echo ========================================
echo   Kotaro API Server 起動中...
echo   URL: http://localhost:8000
echo   停止: Ctrl + C
echo ========================================
echo.

:: Python仮想環境があれば有効化
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
)

:: Kotaro API起動
python kotaro_api.py

endlocal
