@echo off
setlocal
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Python not found. Please install it from https://www.python.org/downloads/
  pause
  exit /b 1
)

echo Starting local server ...
echo Open in Chrome:  http://127.0.0.1:8712/hobby.html
echo Close the small minimized console window to stop the server.
start "Frey-local-server" /min python -m http.server 8712 --bind 127.0.0.1
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:8712/hobby.html"
pause

