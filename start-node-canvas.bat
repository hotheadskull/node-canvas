@echo off
rem Node Canvas V2 - local dev launcher.
rem Starts the app dev server in its own window, then opens the browser.
rem Close the server window to stop the app.
cd /d "%~dp0"
start "Node Canvas V2 dev server" cmd /k "npm run dev -w app"
timeout /t 4 /nobreak >nul
start "" http://localhost:1421
