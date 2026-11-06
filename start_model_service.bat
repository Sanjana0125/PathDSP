@echo off
echo ========================================================
echo   Starting PathDSP Python Model Service (Port 8000)
echo ========================================================
cd /d "%~dp0model_service"
python main.py
pause

