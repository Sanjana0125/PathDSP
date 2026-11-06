@echo off
echo ========================================================
echo   Starting PathDSP Node.js Server (Port 5000)
echo ========================================================
cd /d "%~dp0server"
node index.js
pause

