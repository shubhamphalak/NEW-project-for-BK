@echo off
setlocal
cd /d "%~dp0"
rem LLM flags and OPENAI_API_KEY are loaded by server/config.mjs, never forced here.
where node >nul 2>nul
if not errorlevel 1 goto use_node
if exist "%ProgramFiles%\Microsoft VS Code\Code.exe" goto use_vscode
echo Node.js 22.12 or newer is required.
exit /b 1
:use_node
node server.mjs
exit /b %errorlevel%
:use_vscode
set ELECTRON_RUN_AS_NODE=1
"%ProgramFiles%\Microsoft VS Code\Code.exe" server.mjs
exit /b %errorlevel%
