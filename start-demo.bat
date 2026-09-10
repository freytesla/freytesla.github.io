@echo off
setlocal
cd /d "%~dp0"
set "PYCMD="
where python >nul 2>nul
if %errorlevel%==0 set "PYCMD=python"
if not defined PYCMD (
  where py >nul 2>nul
  if %errorlevel%==0 set "PYCMD=py -3"
)
if not defined PYCMD goto nopython
echo.
echo  Frey - Necklace physics demo : starting local server (browser opens automatically)
echo.
%PYCMD% demo_server.py 8123 necklace-physics.html
exit /b 0
:nopython
echo.
echo  [ERROR] Python was not found on PATH.
echo  Install from https://www.python.org/downloads/ and tick "Add python.exe to PATH".
echo.
pause
exit /b 1
