@echo off
chcp 65001 >nul
title DỪNG ỨNG DỤNG MOCCOON & CLOUDFLARE TUNNEL
cls

echo ========================================================
echo       DỪNG TOÀN BỘ TIẾN TRÌNH ỨNG DỤNG MOCCOON
echo ========================================================
echo.
echo [1/2] Đang tắt Cloudflare Tunnel...
taskkill /F /IM cloudflared.exe >nul 2>nul
echo   ✓ Đã đóng tiến trình Cloudflare Tunnel.

echo.
echo [2/2] Đang giải phóng máy chủ Backend cổng 5000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>nul
    echo   ✓ Đã đóng tiến trình Backend PID %%a.
)

echo.
echo ========================================================
echo   ✓ ĐÃ DỪNG TOÀN BỘ CÁC DỊCH VỤ MOCCOON THÀNH CÔNG!
echo ========================================================
echo.
timeout /t 3 /nobreak >nul
