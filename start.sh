#!/bin/bash

# 扫码点餐系统 - 开发环境快速启动脚本

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  扫码点餐系统 - 开发环境启动${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 启动后端
echo -e "${GREEN}[1/2] 启动后端服务...${NC}"
cd backend

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}后端依赖未安装，正在安装...${NC}"
    npm install
fi

# 后台启动后端
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ 后端服务已启动 (PID: $BACKEND_PID)${NC}"
echo -e "${BLUE}  后端日志: logs/backend.log${NC}"
echo ""

# 等待3秒
echo -e "${YELLOW}等待 3 秒后启动前端...${NC}"
sleep 3
echo ""

# 启动前端
echo -e "${GREEN}[2/2] 启动前端管理后台...${NC}"
cd ../web-admin

# 检查 node_modules 是否存在
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}前端依赖未安装，正在安装...${NC}"
    npm install
fi

# 后台启动前端
npm run dev > ../logs/web-admin.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ 前端管理后台已启动 (PID: $FRONTEND_PID)${NC}"
echo -e "${BLUE}  前端日志: logs/web-admin.log${NC}"
echo ""

# 保存 PID 到文件
cd ..
mkdir -p logs
echo "$BACKEND_PID" > logs/backend.pid
echo "$FRONTEND_PID" > logs/web-admin.pid

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ 所有服务已启动${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${BLUE}服务地址:${NC}"
echo -e "  后端 API:    http://localhost:7001"
echo -e "  管理后台:    http://localhost:5173"
echo ""
echo -e "${YELLOW}查看日志:${NC}"
echo -e "  后端: tail -f logs/backend.log"
echo -e "  前端: tail -f logs/web-admin.log"
echo ""
echo -e "${YELLOW}停止服务:${NC}"
echo -e "  运行: ./stop-dev.sh"
echo -e "  或手动: kill $BACKEND_PID $FRONTEND_PID"
echo ""
