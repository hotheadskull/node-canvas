@echo off
title Node Canvas - Dev Launcher
rem Double-click to run Node Canvas with the latest code.
rem %~dp0 = this file's own folder, so it keeps working if the folder moves.

cd /d "%~dp0"
echo Starting Node Canvas (latest code)...
echo First launch after code changes recompiles - give it a minute.
echo.
call npm run tauri dev

rem Keep the window open if something failed so the error is readable
if errorlevel 1 pause
