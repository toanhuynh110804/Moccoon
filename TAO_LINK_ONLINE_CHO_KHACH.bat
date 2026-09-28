@echo off
chcp 65001 >nul
title MOCCOON - TAO DUONG LINK ONLINE CHO KHACH HANG
cls

echo ========================================================
echo     TAO DUONG LINK TRUY CAP ONLINE QUA CLOUD TUNNEL
echo ========================================================
echo.
echo [1/2] Dang kiem tra trang thai Backend cong 5000...

set SCRIPT_DIR=%~dp0

netstat -ano | findstr :5000 | findstr LISTENING >nul 2>nul
if %errorlevel% equ 0 (
    echo   [OK] May chu Backend dang chay tai cong 5000.
) else (
    echo   [!] May chu Backend chua bat. Dang khoi dong Backend...
    if exist "%SCRIPT_DIR%backend\src\server.js" (
        start /min "Moccoon Backend" cmd /c "cd /d \"%SCRIPT_DIR%backend\" && node src/server.js"
        timeout /t 3 /nobreak >nul
        echo   [OK] Da khoi dong Backend.
    ) else (
        echo   [!] Vui long bat Backend truoc khi tao link.
    )
)

echo.
echo [2/2] Dang tao duong dan Cloud Tunnel...
echo.
echo ----------------------------------------------------------------------
echo HUONG DAN:
echo 1. Sau vai giay, man hinh se hien thi:
echo    "your url is: https://xxxx.loca.lt"
echo 2. Ban copy duong link do dan vao file "config.json"
echo 3. Khach hang chi can mo file "Moccoon.exe" la dung duoc ngay!
echo.
echo (Luu y: Giu nguyen cua so nay de duy tri ket noi online cho khach).
echo ----------------------------------------------------------------------
echo.

call npx --yes localtunnel --port 5000

pause
