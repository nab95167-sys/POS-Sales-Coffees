@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo        Aura Coffee POS - GitHub Auto Sync
echo ========================================================
echo Repository: https://github.com/nab95167-sys/POS-Sales-Coffees.git
echo.

cd /d "%~dp0"

echo [1/3] Checking Git status...
git status -s

echo.
echo [2/3] Staging all files...
git add -A

set /p commit_msg="Enter commit message (Press ENTER for auto-timestamp): "
if "!commit_msg!"=="" (
    for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
    set commit_msg=Auto-sync Coffee Shop POS update - !datetime:~0,4!-!datetime:~4,2!-!datetime:~6,2! !datetime:~8,2!:!datetime:~10,2!
)

echo.
echo [3/3] Committing and pushing to GitHub...
git commit -m "!commit_msg!"
git push origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo   [SUCCESS] Successfully pushed all updates to GitHub!
    echo ========================================================
) else (
    echo ========================================================
    echo   [NOTICE] Git push finished or nothing new to push.
    echo ========================================================
)

echo.
pause
