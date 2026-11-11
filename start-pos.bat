@echo off
title Aura Coffee POS - Full-Stack Launcher

echo ========================================================
echo     Starting Aura Coffee POS Full-Stack System...
echo ========================================================
echo.
echo [1/2] Launching Backend API Server on http://localhost:5000 ...
start "Aura Coffee POS - API Server" cmd /k "cd /d "%~dp0\server" && npm.cmd run dev"

timeout /t 3 /nobreak >nul

echo [2/2] Launching Frontend POS Client on http://localhost:5173 ...
start "Aura Coffee POS - Client UI" cmd /k "cd /d "%~dp0\client" && npm.cmd run dev"

timeout /t 2 /nobreak >nul
start http://localhost:5173
echo Both servers started in separate terminal windows.

