@echo off
REM HumenAI — Fix npm pour Windows (contourne SSL bug Node.js 24)
echo ========================================
echo  HumenAI — Fix npm Installer
echo ========================================
echo.
echo Node.js 24 + OpenSSL 3.5.6 bug connu sur Windows.
echo Installation des dependances via Node.js 22 LTS (si disponible)
echo.

REM Check if nvm-windows is available
where nvm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] nvm-windows detected. Switching to Node.js 22 LTS...
    nvm install 22.14.0
    nvm use 22.14.0
    npm install --no-audit --no-fund
    echo.
    echo ✅ Done! Running with Node 22 LTS.
    goto :end
)

REM Try using the latest npm that supports Node 24
echo [INFO] Attempting npm install with --ignore-scripts...
npm install --no-audit --no-fund --ignore-scripts --no-optional 2>nul

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ⚠️  npm install failed (SSL error).
    echo.
    echo Solutions:
    echo   1. Install Node.js 22 LTS from https://nodejs.org/
    echo   2. Or use nvm-windows: https://github.com/coreybutler/nvm-windows
    echo   3. Or run from WSL if available
    echo.
    echo After installing Node 22, run: npm install
    pause
    exit /b 1
)

echo ✅ npm install completed successfully!
:end
echo.
echo You can now run: npm run dev
pause
