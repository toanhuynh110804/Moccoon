@echo off
chcp 65001 >nul
title MOCCOON - KHỞI TẠO CƠ SỞ DỮ LIỆU TỰ ĐỘNG
cls

echo ========================================================
echo     TỰ ĐỘNG NẠP CƠ SỞ DỮ LIỆU MOCCOON VÀO SQL SERVER
echo ========================================================
echo.

set SCRIPT_DIR=%~dp0
set SQL_FILE=%SCRIPT_DIR%MoccoonDB_Full_Export.sql

if not exist "%SQL_FILE%" (
    echo [X] Không tìm thấy file dữ liệu: MoccoonDB_Full_Export.sql
    echo.
    pause
    exit /b 1
)

echo [1/3] Đang kiểm tra công cụ sqlcmd...
where sqlcmd >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [!] Không tìm thấy lệnh 'sqlcmd' trên hệ thống của bạn.
    echo 👉 Bạn có thể nạp CSDL bằng cách thủ công:
    echo    1. Mở phần mềm SQL Server Management Studio (SSMS).
    echo    2. Mở file: %SQL_FILE%
    echo    3. Nhấn phím F5 (Execute) để nạp toàn bộ CSDL.
    echo.
    pause
    exit /b 1
)
echo   ✓ Đã tìm thấy công cụ sqlcmd.

echo.
echo [2/3] Đang kiểm tra kết nối SQL Server tại localhost\SQLEXPRESS...
sqlcmd -S localhost\SQLEXPRESS -E -Q "SELECT @@VERSION" >nul 2>nul
if %errorlevel% equ 0 (
    set TARGET_SERVER=localhost\SQLEXPRESS
    echo   ✓ Đã kết nối thành công tới SQL Server (localhost\SQLEXPRESS).
) else (
    sqlcmd -S . -E -Q "SELECT @@VERSION" >nul 2>nul
    if %errorlevel% equ 0 (
        set TARGET_SERVER=.
        echo   ✓ Đã kết nối thành công tới SQL Server mặc định (.).
    ) else (
        echo.
        echo [!] Không thể tự động kết nối tới SQL Server localhost\SQLEXPRESS.
        set /p TARGET_SERVER="Vui lòng nhập tên Server SQL của máy bạn (ví dụ: localhost\SQLEXPRESS hoặc .): "
    )
)

echo.
echo [3/3] Đang nạp toàn bộ cấu trúc bảng và dữ liệu mẫu vào SQL Server...
echo     (Vui lòng chờ khoảng 5 - 15 giây)...
echo.

sqlcmd -S %TARGET_SERVER% -E -i "%SQL_FILE%"

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo   ✓ CHÚC MỪNG! ĐÃ KHỞI TẠO CƠ SỞ DỮ LIỆU MOCCOON THÀNH CÔNG!
    echo ========================================================
    echo   • Tên Database: MoccoonDB
    echo   • Đã có sẵn tài khoản Admin, Khách hàng mẫu, Bộ 3 sản phẩm làm sạch,
    echo     album ảnh, voucher khuyến mãi, giỏ hàng và lịch sử đơn hàng.
    echo.
) else (
    echo.
    echo [!] Có lỗi xảy ra trong quá trình nạp dữ liệu. Vui lòng kiểm tra lại quyền truy cập SQL.
)

pause
