@echo off
cd /d "%~dp0"
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  node --test tests/backend.test.mjs tests/config.test.mjs
  if errorlevel 1 exit /b 1
  node tests/live-rendering.mjs
  if errorlevel 1 exit /b 1
  node tests/browser.mjs
  exit /b
)
if exist "%ProgramFiles%\Microsoft VS Code\Code.exe" (
  set ELECTRON_RUN_AS_NODE=1
  "%ProgramFiles%\Microsoft VS Code\Code.exe" --test tests/backend.test.mjs tests/config.test.mjs
  if errorlevel 1 exit /b 1
  "%ProgramFiles%\Microsoft VS Code\Code.exe" tests/live-rendering.mjs
  if errorlevel 1 exit /b 1
  "%ProgramFiles%\Microsoft VS Code\Code.exe" tests/browser.mjs
  exit /b
)
echo Node.js 22.12 or newer is required.
exit /b 1
