@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo   扫码点餐系统 - 开发环境启动
echo ========================================
echo.

REM 检查必要的目录是否存在
if not exist "backend" (
    echo 错误: backend 目录不存在
    pause
    exit /b 1
)

if not exist "web-admin" (
    echo 错误: web-admin 目录不存在
    pause
    exit /b 1
)

REM 创建 logs 目录
if not exist "logs" mkdir "logs"

REM 启动后端
echo [1/2] 启动后端服务...
cd backend

REM 检查 node_modules 是否存在
if not exist "node_modules" (
    echo 后端依赖未安装，正在安装...
    call npm install
)

REM 启动后端（新窗口）
start "后端服务" cmd /k "npm run dev"
echo ✓ 后端服务已启动
echo.

REM 等待3秒
echo 等待 3 秒后启动前端...
timeout /t 3 /nobreak >nul
echo.

REM 启动前端
echo [2/2] 启动前端管理后台...
cd ..\web-admin

REM 检查 node_modules 是否存在
if not exist "node_modules" (
    echo 前端依赖未安装，正在安装...
    call npm install
)

REM 启动前端（新窗口）
start "前端管理后台" cmd /k "npm run dev"
echo ✓ 前端管理后台已启动
echo.

cd ..

echo ========================================
echo ✓ 所有服务已启动
echo ========================================
echo.
echo 服务地址:
echo   后端 API:    http://localhost:7001
echo   管理后台:    http://localhost:5173
echo.
echo 提示: 关闭命令行窗口即可停止对应服务
echo.
pause
