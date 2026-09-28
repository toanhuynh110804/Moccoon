@echo off
chcp 65001 >nul
title MOCCOON - TAO DUONG LINK ONLINE TOAN CAU (CLOUDFLARE)
cls

echo ========================================================
echo     TẠO ĐƯỜNG LINK ONLINE CHO MỌI MẠNG (4G, WIFI KHÁC...)
echo ========================================================
echo.
echo [1/2] Đang kiểm tra Backend cổng 5000...

set SCRIPT_DIR=%~dp0

netstat -ano | findstr :5000 | findstr LISTENING >nul 2>nul
if %errorlevel% equ 0 (
    echo   [OK] Máy chủ Backend đang chạy tại cổng 5000.
) else (
    echo   [!] Máy chủ Backend chưa bật. Đang khởi động Backend...
    if exist "%SCRIPT_DIR%backend\src\server.js" (
        start /min "Moccoon Backend" cmd /c "cd /d \"%SCRIPT_DIR%backend\" && node src/server.js"
        timeout /t 3 /nobreak >nul
        echo   [OK] Đã khởi động Backend.
    ) else (
        echo   [!] Không tìm thấy Backend.
    )
)

echo.
echo [2/2] Đang kích hoạt Cloudflare Tunnel công khai...
echo.
echo (Lưu ý: Giữ nguyên cửa sổ này để duy trì kết nối online cho khách hàng và mọi mạng).
echo ----------------------------------------------------------------------
echo.

"%SCRIPT_DIR%cloudflared.exe" tunnel --url http://localhost:5000

pause
