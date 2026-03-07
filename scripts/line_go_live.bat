@echo off
chcp 65001 >nul
cd /d "%~dp0.."
python scripts/line_go_live.py
echo.
pause
