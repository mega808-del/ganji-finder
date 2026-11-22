@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo   Saju Reverse PWA launcher
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 goto :nonode

rem Install dependencies when they are missing or incomplete.
rem This also covers the case where node_modules was deleted to save disk
rem space, or where a previous install was interrupted and the .bin shims
rem (which provide tsc/vite for the npm scripts) were never created.
if not exist "node_modules\.bin\tsc.cmd" goto :install
if not exist "node_modules\typescript\bin\tsc" goto :install
goto :launch

:install
echo Installing dependencies. First run may take a few minutes...
call npm install --include=dev --no-audit --no-fund
if errorlevel 1 goto :failed
if not exist "node_modules\.bin\tsc.cmd" (
  echo.
  echo [ERROR] npm install finished but the build tools are still missing.
  echo         Delete the node_modules folder and run this file again.
  goto :end
)

:launch
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
echo         If the error mentions missing modules or a missing tsc/vite
echo         command, delete the node_modules folder and run this file again.

:end
echo.
pause
