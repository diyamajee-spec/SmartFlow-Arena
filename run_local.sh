#!/usr/bin/env bash
# ╔══════════════════════════════════════════════╗
# ║  SmartFlow Arena — Local Startup Script      ║
# ║  Usage: bash run_local.sh                    ║
# ╚══════════════════════════════════════════════╝

set -e   # exit immediately on any error

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
RESET='\033[0m'
BOLD='\033[1m'

echo ""
echo -e "${CYAN}${BOLD}  ⬡  SmartFlow Arena — Local Dev Startup${RESET}"
echo -e "${CYAN}  ─────────────────────────────────────────${RESET}"
echo ""

# ── Step 1: Check Node.js ──────────────────────
echo -e "${YELLOW}[1/3] Checking Node.js...${RESET}"
if ! command -v node &>/dev/null; then
    echo -e "${RED}  ✗  Node.js is not installed.${RESET}"
    echo "     Install from https://nodejs.org (v16 or later recommended)"
    exit 1
fi

NODE_VER=$(node -v)
echo -e "${GREEN}  ✓  Node.js ${NODE_VER} found${RESET}"

# ── Step 2: Install dependencies ──────────────
echo ""
echo -e "${YELLOW}[2/3] Installing npm dependencies...${RESET}"
if [ -f "package.json" ]; then
    npm install --silent
    echo -e "${GREEN}  ✓  Dependencies ready (express, cors)${RESET}"
else
    echo -e "${RED}  ✗  package.json not found. Are you in the SmartFlow-Arena directory?${RESET}"
    exit 1
fi

# ── Step 3: Launch Server ─────────────────────
echo ""
echo -e "${YELLOW}[3/3] Starting SmartFlow Arena backend...${RESET}"
echo ""
echo -e "${CYAN}  ┌──────────────────────────────────────────┐${RESET}"
echo -e "${CYAN}  │                                          │${RESET}"
echo -e "${CYAN}  │   🌐  Frontend  →  http://localhost:8080 │${RESET}"
echo -e "${CYAN}  │   📡  API       →  /api/snapshot         │${RESET}"
echo -e "${CYAN}  │   🔄  Refresh   →  every 60 seconds      │${RESET}"
echo -e "${CYAN}  │                                          │${RESET}"
echo -e "${CYAN}  │   Press  Ctrl + C  to stop               │${RESET}"
echo -e "${CYAN}  │                                          │${RESET}"
echo -e "${CYAN}  └──────────────────────────────────────────┘${RESET}"
echo ""

# Attempt to open browser after 1.5 s (best-effort, works on Linux/macOS/WSL)
(sleep 1.5 && \
  { open "http://localhost:8080" 2>/dev/null || \
    xdg-open "http://localhost:8080" 2>/dev/null || \
    start "http://localhost:8080" 2>/dev/null || true; }) &

# Start Node server
node server.js
