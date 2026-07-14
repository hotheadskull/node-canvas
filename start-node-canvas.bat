@echo off
rem Node Canvas V2 - desktop launcher.
rem Compiles (first run takes a few minutes) and opens the Node Canvas
rem window. The console shows progress; closing it stops the app.
cd /d "%~dp0app"
npx tauri dev
