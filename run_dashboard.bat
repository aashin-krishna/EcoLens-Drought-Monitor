@echo off
title EcoLens - Run Web Dashboard
color 0B

echo =======================================================================
echo               EcoLens: Starting Local Web Dashboard
echo =======================================================================
echo.

REM Detect Python command
set PYTHON_CMD=

python --version >nul 2>&1
if %errorlevel% equ 0 set PYTHON_CMD=python

if "%PYTHON_CMD%"=="" (
    py --version >nul 2>&1
    if %errorlevel% equ 0 set PYTHON_CMD=py
)

if "%PYTHON_CMD%"=="" (
    python3 --version >nul 2>&1
    if %errorlevel% equ 0 set PYTHON_CMD=python3
)

if not "%PYTHON_CMD%"=="" goto python_ok

echo [WARNING] Python is not detected in your system PATH.
echo Opening dashboard directly in browser - CORS restrictions might apply.
echo.
start "" "dashboard\index.html"
exit /b

:python_ok
echo Detected Python: %PYTHON_CMD%
echo.
echo [+] Starting local HTTP server on port 8080...
echo [+] Opening browser at http://localhost:8080...
start "" "http://localhost:8080"

cd dashboard
%PYTHON_CMD% -m http.server 8080
if %errorlevel% neq 0 (
    echo.
    echo [!] Port 8080 failed. Attempting fallback port 8000...
    start "" "http://localhost:8000"
    %PYTHON_CMD% -m http.server 8000
)
cd ..
pause
