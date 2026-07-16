@echo off
title EcoLens - Run GEE Calculations
color 0E

echo =======================================================================
echo            EcoLens: Running GEE Calculations ^& Raster Pipeline
echo =======================================================================
echo.

:: Detect Python command
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
echo [1] Verifying Google Earth Engine (GEE) AuthenticationStatus...
echo If you get an error here, you must run "earthengine authenticate" in a separate terminal.
echo.
%PYTHON_CMD% scripts/ee_auth.py
echo.

echo [2] Running Cloud Calculations...
echo Fetching data, downloading GeoTIFFs, and generating transparent PNGs...
echo This will take a moment depending on internet speed and GEE response.
echo.
%PYTHON_CMD% scripts/calculate_indices.py
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Pipeline failed. Please check GEE authentication or console errors.
) else (
    echo.
    echo [+] Raster processing completed successfully!
    echo [+] High-resolution PNG overlays generated in dashboard/data/
)
echo.
pause
