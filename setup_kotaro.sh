#!/bin/bash

# =============================================================================
# Kotaro-Engine Setup Script for WSL2/Ubuntu
# =============================================================================

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║      🐯 Kotaro-Engine Setup (WSL2/Ubuntu)                 ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# 1. Check/Install Python
echo "[1/4] Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo "  -> Installing Python..."
    sudo apt update && sudo apt install -y python3 python3-pip python3-venv
else
    echo "  ✅ Python $(python3 --version) found"
fi

# 2. Check/Install Ollama
echo ""
echo "[2/4] Checking Ollama..."
if ! command -v ollama &> /dev/null; then
    echo "  -> Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
else
    echo "  ✅ Ollama $(ollama --version) found"
fi

# 3. Pull Models
echo ""
echo "[3/4] Pulling AI Models..."

# Qwen2.5-VL (Vision)
if ! ollama list | grep -q "qwen2.5vl:7b"; then
    echo "  📥 Pulling qwen2.5vl:7b (Vision)..."
    ollama pull qwen2.5vl:7b
else
    echo "  ✅ qwen2.5vl:7b ready"
fi

# Qwen2.5 Instruct (Comment)
if ! ollama list | grep -q "qwen2.5:7b-instruct-q4_K_M"; then
    echo "  📥 Pulling qwen2.5:7b-instruct-q4_K_M (Comment)..."
    ollama pull qwen2.5:7b-instruct-q4_K_M
else
    echo "  ✅ qwen2.5 instruct ready"
fi

# 4. Install Python Libs
echo ""
echo "[4/4] Installing Python Libraries..."
if [ ! -d ".venv_wsl" ]; then
    echo "  -> Creating venv (WSL)..."
    python3 -m venv .venv_wsl
fi

source .venv_wsl/bin/activate
pip install -r requirements-kotaro.txt
pip install fastapi uvicorn ollama

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  🎉 Setup Complete!                                       ║"
echo "║                                                           ║"
echo "║  Run: ./start_kotaro.sh                                   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
