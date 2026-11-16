@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo   Saju Reverse PWA launcher
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 goto :nonode

if not exist "node_modules" (
  echo Installing dependencies. First run may take a few minutes...
  call npm install
  if errorlevel 1 goto :failed
)

echo Building the app and opening the browser...
echo Keep this window open. Close it to stop the server.
echo.
call npm run start
if errorlevel 1 goto :failed
goto :end

:nonode
echo [ERROR] Node.js not found. Install the LTS version from https://nodejs.org
echo         then run this file again.
goto :end

:failed
echo.
echo [ERROR] Launch failed. Check the messages above.

:end
echo.
pause
