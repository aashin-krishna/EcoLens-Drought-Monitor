@echo off
title EcoLens - Drought Severity Mapping Launcher
color 0B

echo =======================================================================
echo               EcoLens: Drought Severity Mapping Launcher
echo        (NDVI ^& VCI Cloud-Based Monitoring ^& Interactive Dashboard)
echo =======================================================================
echo.

REM Detect Python command sequentially
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

REM If Python is found, jump straight to the menu
if not "%PYTHON_CMD%"=="" goto menu

REM If Python is NOT found, display warning and prompt fallback (no parentheses)
echo [WARNING] Python is not detected in your system PATH.
echo Python 3.8 or higher is required to run the local server.
echo.
echo Note: Opening the index.html file directly in modern browsers might block
echo data loading (CORS policy). A local web server is highly recommended.
echo.
set /p open_direct="Would you like to try opening the dashboard directly anyway? (y/n): "
if "%open_direct%"=="y" start "" "dashboard\index.html"
if "%open_direct%"=="Y" start "" "dashboard\index.html"
exit /b

:menu
cls
echo =======================================================================
echo               EcoLens: Drought Severity Mapping Launcher
echo =======================================================================
echo.
echo Detected Python: %PYTHON_CMD%
echo.
echo Select an action to perform:
echo ----------------------------------------------------
echo [1] Launch Interactive Web Dashboard (Local Preview)
echo [2] Run Python GEE Calculations (Cloud Data Fetch)
echo [3] Install requirements.txt (Initial Setup)
echo [4] Convert Shapefile (2011_Dist.shp) to Boundary
echo [5] Exit
echo ----------------------------------------------------
set /p choice="Enter option (1-5): "

if "%choice%"=="1" goto launch_dashboard
if "%choice%"=="2" goto run_python
if "%choice%"=="3" goto install_reqs
if "%choice%"=="4" goto convert_shp
if "%choice%"=="5" exit
echo Invalid selection.
pause
goto menu

:install_reqs
echo.
echo [+] Installing required python libraries...
%PYTHON_CMD% -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] Some dependencies failed to install. Ensure pip is updated.
) else (
    echo.
    echo [+] Requirements installed successfully!
)
pause
goto menu

:launch_dashboard
echo.
echo [+] Starting local HTTP server for dashboard...
echo [+] Automatically opening dashboard in your browser...
start "" "http://localhost:8080"
cd dashboard
%PYTHON_CMD% -m http.server 8080
if %errorlevel% neq 0 (
    echo.
    echo [!] Port 8080 failed. Attempting port 8000...
    start "" "http://localhost:8000"
    %PYTHON_CMD% -m http.server 8000
)
cd ..
pause
exit

:run_python
echo.
echo [+] Launching Earth Engine calculating script...
%PYTHON_CMD% scripts/calculate_indices.py
echo.
echo [+] Done running calculations. Check data/output/ for results.
pause
goto menu

:convert_shp
echo.
echo [+] Launching Shapefile conversion...
%PYTHON_CMD% scripts/convert_shp.py
echo.
pause
goto menu
