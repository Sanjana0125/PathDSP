@echo off
echo ========================================================
echo   Launching All PathDSP Services in separate windows...
echo ========================================================
start "1. PathDSP Python Model Service (Port 8000)" cmd /k "cd /d "%~dp0model_service" && python main.py"
timeout /t 3 >nul
start "2. PathDSP Node Backend (Port 5000)" cmd /k "cd /d "%~dp0server" && node index.js"
timeout /t 2 >nul
start "3. PathDSP React Frontend (Port 3000)" cmd /k "cd /d "%~dp0client" && npm start"

echo.
echo All 3 services have been launched!
echo - Python Model: http://localhost:8000
echo - Node API:     http://localhost:5000
echo - React Web UI: http://localhost:3000
echo.

