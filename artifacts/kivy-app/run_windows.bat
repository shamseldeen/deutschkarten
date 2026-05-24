@echo off
REM ===== DeutschKarten — Kivy one-click launcher for Windows =====
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
    echo Python is not installed or not on PATH.
    echo Please install Python 3.10+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
    echo Creating virtual environment...
    python -m venv .venv
)

call .venv\Scripts\activate.bat

echo Installing/updating dependencies...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo Failed to install dependencies.
    pause
    exit /b 1
)

echo Starting DeutschKarten...
python main.py
pause
