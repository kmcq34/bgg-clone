@echo off
cd /d "%~dp0"
echo Starting server...
start /MIN node server.js
timeout /t 3 /nobreak >nul
echo Starting Cloudflare tunnel...
start /MIN cloudflared.exe tunnel --url http://localhost:3000
timeout /t 8 /nobreak >nul
echo.
echo ========================================
echo  Server is running!
echo.
echo  Find the public URL by checking
echo  the cloudflared window title or
echo  check Task Manager for details.
echo.
echo  Local:   http://localhost:3000
echo ========================================
echo.
pause
