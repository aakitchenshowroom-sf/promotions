@echo off
rem Double-click: rebuild the local preview from the workspace data and open it in your browser.
chcp 65001 >nul
cd /d "%~dp0"
node tools\build.mjs preview
if errorlevel 1 (
  echo.
  echo Build failed. See the message above.
  pause
  exit /b 1
)
node tools\build.mjs public
start "" "http://127.0.0.1:4317/"
node tools\serve.mjs
pause
