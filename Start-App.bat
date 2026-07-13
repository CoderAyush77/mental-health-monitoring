@echo off
title Mental Health App Server
echo ===================================================
echo Starting Local Server for Mental Health App...
echo DO NOT CLOSE THIS WINDOW if you want to use the app.
echo ===================================================
echo.

:: Open the browser automatically after a short delay
start "" cmd /c "timeout /t 2 >nul & start http://localhost:8000"

:: Try to start the server using Python first (fastest)
python -m http.server 8000

:: If Python isn't installed, it will try Node.js (npx)
if %errorlevel% neq 0 (
    echo Python not found, trying Node.js...
    npx http-server -p 8000
)

pause
