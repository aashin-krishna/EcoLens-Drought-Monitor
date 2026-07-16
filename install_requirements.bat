@echo off
title EcoLens - Install GIS Requirements
color 0A

echo =======================================================================
echo               EcoLens: Installing Geospatial Dependencies
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

echo [ERROR] Python is not detected in your system PATH.
echo Please install Python 3.8 or higher and try again.
echo.
pause
exit /b

:python_ok
echo Detected Python: %PYTHON_CMD%
echo.
echo [+] Upgrading pip to the latest version...
%PYTHON_CMD% -m pip install --upgrade pip
echo.
echo [+] Installing libraries from requirements.txt...
%PYTHON_CMD% -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Some dependencies failed to install. Ensure you have internet access.
) else (
    echo.
    echo [+] All required GIS dependencies installed successfully!
)
echo.
pause
