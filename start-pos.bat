@echo off
title Aura Coffee POS - Running Dev Server
cd /d "%~dp0\client"

echo ========================================================
echo        Starting Aura Coffee POS System...
echo ========================================================
echo.
echo Opening browser at http://localhost:5173 ...
start http://localhost:5173
echo.
echo Starting Vite server...
npm.cmd run dev
pause
