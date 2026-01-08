@echo off
echo ========================================
echo  Deploy to Laragon WWW Root
echo ========================================
echo.

REM Check if dist folder exists, if not build first
if not exist "dist\index.html" (
    echo [1/4] Building React Frontend...
    call npm run build
    if errorlevel 1 (
        echo.
        echo ❌ Build failed!
        pause
        exit /b 1
    )
) else (
    echo [1/4] Using existing build in dist folder...
)

echo.
echo [2/4] Copying Frontend files to Laragon WWW root...
xcopy /E /Y "dist\*" "F:\laragon\www\" >nul 2>&1
if errorlevel 1 (
    echo ❌ Failed to copy frontend files!
    echo Make sure F:\laragon\www\ is accessible
    pause
    exit /b 1
)
echo ✅ Frontend files copied to C:\laragon\www\

echo.
:: echo [3/4] Copying PHP Backend to Laragon WWW root...
:: xcopy /E /I /Y "php_server\*" "C:\laragon\www\php_server\" >nul 2>&1
:: if errorlevel 1 (
::     echo ❌ Failed to copy backend files!
::     pause
::     exit /b 1
:: )
:: echo ✅ Backend files copied to C:\laragon\www\php_server\

:: echo.
:: echo [4/4] Copying root .htaccess...
echo [3/4] Copying root .htaccess...
copy /Y ".htaccess" "F:\laragon\www\.htaccess" >nul 2>&1
echo ✅ .htaccess copied to F:\laragon\www\.htaccess

echo.
echo ========================================
echo  ✅ Deployment Complete!
echo ========================================
echo.
echo Folder Structure:
echo   F:\laragon\www\
echo   ├── index.html
echo   ├── .htaccess
echo   └── assets\
:: echo   └── php_server\
echo.
echo URLs:
echo   Frontend: http://localhost/
:: echo   Backend:  http://localhost/php_server/
echo.

if exist "server\" (
    echo [4/4] Starting Backend Node.js server...
    echo.
    echo URLs:
    echo   Backend:  http://localhost:3001
    echo.
    echo Starting server in new window...
    start "Backend Server" cmd /c "cd server && npm start || echo Server failed to start - possibly database connection error && timeout /t 5"
    echo.
    echo ℹ️  Server is starting in a separate window
    echo    If database connection fails, close terminal. Start Laragon (Apache + MySQL)
    echo.
) else (
    echo Go to server folder and run 'npm start' or 'node index.js'
    echo   Backend:  http://localhost:3001
    echo.
)

echo.
echo Don't forget to:
echo  1. Start Laragon (Apache + MySQL)
echo  2. Import database if not done yet
:: echo  3. Check php_server/.env configuration
echo  3. Run Backend Node.js server
echo.
pause
