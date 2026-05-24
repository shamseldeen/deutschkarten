#!/usr/bin/env bash
# ===== DeutschKarten — Kivy one-click launcher for macOS / Linux =====
set -e
cd "$(dirname "$0")"

if ! command -v python3 >/dev/null 2>&1; then
    echo "Python 3 is not installed. Install Python 3.10+ from https://www.python.org/downloads/"
    exit 1
fi

if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# shellcheck source=/dev/null
source .venv/bin/activate

echo "Installing/updating dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Starting DeutschKarten..."
python main.py
