@echo off
title Roleplay AI Launcher
echo ===================================================
echo   Roleplay AI — Starting Application
echo ===================================================
echo.
echo [1/2] Starting Pinterest Image Helper Server...
start "Pinterest Server" /B node server.js
timeout /t 1 /nobreak >nul
echo [2/2] Opening Roleplay AI in your browser...
start "" "index.html"
echo.
echo All set! Enjoy your roleplay story.
echo (Keep this window open or minimize it)
pause
