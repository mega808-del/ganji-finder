@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo   Saju Reverse PWA launcher
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 goto :nonode

rem 폴더 자체가 없을 때만이 아니라, 폴더만 남고 내용이 비어 있는 경우(tsc 같은 빌드 도구 누락)도
rem 다시 설치한다. 용량 정리로 node_modules 를 지운 뒤에도 첫 실행이 바로 되도록 하기 위함이다.
if not exist "node_modules\typescript\bin\tsc" (
  echo Installing dependencies. First run may take a few minutes...
  call npm install --include=dev --no-audit --no-fund
  if errorlevel 1 goto :failed
  if not exist "node_modules\typescript\bin\tsc" goto :failed
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
