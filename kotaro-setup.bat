@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

:: =============================================================================
:: Kotaro-Engine セットアップスクリプト（Qwen版）
:: =============================================================================

echo.
echo  ╔═══════════════════════════════════════════════════════════╗
echo  ║      🐯 Kotaro-Engine セットアップ (Qwen)                 ║
echo  ╚═══════════════════════════════════════════════════════════╝
echo.

:: Ollama チェック
echo  [1/5] Ollama をチェック中...
ollama --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  ⚠️ Ollama がインストールされていません
    echo.
    echo  以下のURLからダウンロードしてください：
    echo  https://ollama.com/
    echo.
    echo  インストール後、PCを再起動してこのスクリプトを再実行してください。
    echo.
    pause
    exit /b 1
)
echo  ✅ Ollama インストール済み

:: Qwen2.5-VL モデル（画像分析用）
echo.
echo  [2/5] Qwen2.5-VL モデルをチェック中...
ollama list | findstr "qwen2.5vl:7b" >nul 2>&1
if errorlevel 1 (
    echo  📥 Qwen2.5-VL をダウンロード中...（約4GB）
    echo.
    ollama pull qwen2.5vl:7b
    if errorlevel 1 (
        echo  ❌ ダウンロードに失敗しました
        pause
        exit /b 1
    )
)
echo  ✅ Qwen2.5-VL モデル準備完了

:: Qwen2.5 Instruct モデル（コメント生成用）
echo.
echo  [3/5] Qwen2.5 Instruct モデルをチェック中...
ollama list | findstr "qwen2.5:7b-instruct" >nul 2>&1
if errorlevel 1 (
    echo  📥 Qwen2.5 Instruct をダウンロード中...（約4GB）
    echo.
    ollama pull qwen2.5:7b-instruct-q4_K_M
    if errorlevel 1 (
        echo  ❌ ダウンロードに失敗しました
        pause
        exit /b 1
    )
)
echo  ✅ Qwen2.5 Instruct モデル準備完了

:: Python チェック
echo.
echo  [4/5] Python をチェック中...
python --version >nul 2>&1
if errorlevel 1 (
    echo  ⚠️ Python がインストールされていません
    echo  https://www.python.org/ からダウンロードしてください
    pause
    exit /b 1
)
echo  ✅ Python インストール済み

:: Python ライブラリ
echo.
echo  [5/5] Python ライブラリをインストール中...
pip install ollama fastapi uvicorn --quiet
echo  ✅ ライブラリ準備完了

echo.
echo  ╔═══════════════════════════════════════════════════════════╗
echo  ║  🎉 セットアップ完了！                                    ║
echo  ║                                                           ║
echo  ║  起動方法:                                                ║
echo  ║    start_kotaro.bat                                       ║
echo  ╚═══════════════════════════════════════════════════════════╝
echo.
pause
