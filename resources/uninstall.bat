@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   Cron Manager Uninstaller
echo ========================================
echo.

:: Step 1: Kill running Cron Manager process
echo [1/5] Stopping Cron Manager...
taskkill /F /IM "Cron Manager.exe" /T 2>nul
if %errorlevel%==0 (
    echo       Stopped.
) else (
    echo       Not running.
)
timeout /t 1 /nobreak >nul

:: Step 2: Remove Windows-side app data
echo [2/5] Removing Windows app data...
if exist "%USERPROFILE%\.cron-manager" (
    rmdir /s /q "%USERPROFILE%\.cron-manager"
    echo       Removed: %USERPROFILE%\.cron-manager
) else (
    echo       Not found.
)

:: Step 3: Remove Electron app cache/data
echo [3/5] Removing Electron app data...
if exist "%APPDATA%\Cron Manager" (
    rmdir /s /q "%APPDATA%\Cron Manager"
    echo       Removed: %APPDATA%\Cron Manager
)
if exist "%LOCALAPPDATA%\cron-manager" (
    rmdir /s /q "%LOCALAPPDATA%\cron-manager"
    echo       Removed: %LOCALAPPDATA%\cron-manager
)

:: Step 4: Remove WSL-side app data
echo [4/5] Removing WSL app data...
where wsl >nul 2>&1
if %errorlevel%==0 (
    wsl rm -rf ~/.cron-manager 2>nul
    echo       Removed: WSL ~/.cron-manager
) else (
    echo       WSL not available, skipping.
)

:: Step 5: Run NSIS uninstaller
echo [5/5] Running uninstaller...
set "UNINSTALLER=%LOCALAPPDATA%\Programs\cron-manager\Uninstall Cron Manager.exe"
if exist "%UNINSTALLER%" (
    echo       Launching uninstaller...
    start "" "%UNINSTALLER%"
) else (
    echo       Uninstaller not found.
    echo       Please uninstall manually via Control Panel ^> Apps.
)

echo.
echo ========================================
echo   Done. Cron Manager has been removed.
echo ========================================
echo.
pause
