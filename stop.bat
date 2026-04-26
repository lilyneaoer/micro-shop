@echo off
chcp 65001 >nul

echo ========================================
echo   扫码点餐系统 - 停止开发环境
echo ========================================
echo.

REM 停止后端服务（端口 7001）
echo 停止后端服务...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :7001 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✓ 后端服务已停止 ^(PID: %%a^)
    )
)

echo.

REM 停止前端服务（端口 5173）
echo 停止前端服务...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✓ 前端服务已停止 ^(PID: %%a^)
    )
)

echo.
echo ========================================
echo ✓ 所有服务已停止
echo ========================================
echo.
pause
