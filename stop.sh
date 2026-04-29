#!/bin/bash

# 扫码点餐系统 - 停止开发环境脚本

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  扫码点餐系统 - 停止开发环境${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 读取 PID 文件
BACKEND_PID_FILE="logs/backend.pid"
FRONTEND_PID_FILE="logs/web-admin.pid"

# 停止后端
if [ -f "$BACKEND_PID_FILE" ]; then
    BACKEND_PID=$(cat "$BACKEND_PID_FILE")
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}停止后端服务 (PID: $BACKEND_PID)...${NC}"
        kill $BACKEND_PID
        echo -e "${GREEN}✓ 后端服务已停止${NC}"
    else
        echo -e "${YELLOW}后端服务未运行${NC}"
    fi
    rm -f "$BACKEND_PID_FILE"
else
    echo -e "${YELLOW}未找到后端 PID 文件，尝试查找进程...${NC}"
    # 尝试通过端口查找并停止
    BACKEND_PID=$(lsof -ti:7001 2>/dev/null || echo "")
    if [ -n "$BACKEND_PID" ]; then
        echo -e "${YELLOW}找到后端进程 (PID: $BACKEND_PID)，正在停止...${NC}"
        kill $BACKEND_PID
        echo -e "${GREEN}✓ 后端服务已停止${NC}"
    else
        echo -e "${YELLOW}未找到运行中的后端服务${NC}"
    fi
fi

echo ""

# 停止前端
if [ -f "$FRONTEND_PID_FILE" ]; then
    FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}停止前端服务 (PID: $FRONTEND_PID)...${NC}"
        kill $FRONTEND_PID
        echo -e "${GREEN}✓ 前端服务已停止${NC}"
    else
        echo -e "${YELLOW}前端服务未运行${NC}"
    fi
    rm -f "$FRONTEND_PID_FILE"
else
    echo -e "${YELLOW}未找到前端 PID 文件，尝试查找进程...${NC}"
    # 尝试通过端口查找并停止
    FRONTEND_PID=$(lsof -ti:5173 2>/dev/null || echo "")
    if [ -n "$FRONTEND_PID" ]; then
        echo -e "${YELLOW}找到前端进程 (PID: $FRONTEND_PID)，正在停止...${NC}"
        kill $FRONTEND_PID
        echo -e "${GREEN}✓ 前端服务已停止${NC}"
    else
        echo -e "${YELLOW}未找到运行中的前端服务${NC}"
    fi
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ 所有服务已停止${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
