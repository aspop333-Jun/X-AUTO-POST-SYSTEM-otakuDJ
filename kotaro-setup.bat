@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

:: =============================================================================
:: Kotaro-Engine セットアップスクリプト
:: =============================================================================

echo.
echo  ╔═══════════════════════════════════════════════════════════╗
echo  ║      🐯 Kotaro-Engine セットアップ                        ║
echo  ╚═══════════════════════════════════════════════════════════╝
echo.

:: Ollama チェック
echo  [1/4] Ollama をチェック中...
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

:: Gemma 2 2B モデルチェック
echo.
echo  [2/4] Gemma 2 2B モデルをチェック中...
ollama list | findstr "gemma2:2b" >nul 2>&1
if errorlevel 1 (
    echo  📥 Gemma 2 2B をダウンロード中...（約1.6GB、数分かかります）
    echo.
    ollama pull gemma2:2b
    if errorlevel 1 (
        echo  ❌ ダウンロードに失敗しました
        pause
        exit /b 1
    )
)
echo  ✅ Gemma 2 2B モデル準備完了

:: Python チェック
echo.
echo  [3/4] Python をチェック中...
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
echo  [4/4] Python ライブラリをインストール中...
pip install ollama deepface mediapipe opencv-python --quiet
echo  ✅ ライブラリ準備完了

echo.
echo  ╔═══════════════════════════════════════════════════════════╗
echo  ║  🎉 セットアップ完了！                                    ║
echo  ║                                                           ║
echo  ║  次のコマンドでテスト:                                    ║
echo  ║    ollama run gemma2:2b "栞さんの笑顔を18文字で称えて"    ║
echo  ╚═══════════════════════════════════════════════════════════╝
echo.
pause
