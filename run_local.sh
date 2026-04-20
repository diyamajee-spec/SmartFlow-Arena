#!/usr/bin/env bash
# ╔══════════════════════════════════════════════╗
# ║  SmartFlow Arena — Local Startup Script      ║
# ║  v3.5 · Arena Neural Engine Edition          ║
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
echo -e "${CYAN}${BOLD}  ⬡  SmartFlow Arena — Neural Engine Startup${RESET}"
echo -e "${CYAN}  ────────────────────────────────────────────${RESET}"
echo ""

# ── Step 1: Check Node.js ──────────────────────
echo -e "${YELLOW}[1/3] Verifying Node.js Environment...${RESET}"
if ! command -v node &>/dev/null; then
    echo -e "${RED}  ✗  Node.js is not installed.${RESET}"
    echo "     Install from https://nodejs.org (v16 or later recommended)"
    exit 1
fi

NODE_VER=$(node -v)
echo -e "${GREEN}  ✓  Node.js ${NODE_VER} detected${RESET}"

# ── Step 2: Install dependencies ──────────────
echo ""
echo -e "${YELLOW}[2/3] Syncing Intelligence Dependencies...${RESET}"
if [ -f "package.json" ]; then
    npm install --silent
    echo -e "${GREEN}  ✓  Core & Tactical APIs ready${RESET}"
else
    echo -e "${RED}  ✗  package.json missing. Ensure you are in the project root.${RESET}"
    exit 1
fi

# ── Step 3: Launch Neural Engine ──────────────
echo ""
echo -e "${YELLOW}[3/3] Initializing SmartFlow Tactical Server...${RESET}"
echo ""
echo -e "${CYAN}  ┌───────────────────────────────────────────────┐${RESET}"
echo -e "${CYAN}  │                                               │${RESET}"
echo -e "${CYAN}  │   🌐  Platform  →  http://localhost:8080      │${RESET}"
echo -e "${CYAN}  │   🧠  Neural    →  AI Agent Brain (Active)    │${RESET}"
echo -e "${CYAN}  │   ✨  GenAI API →  /api/ai/query              │${RESET}"
echo -e "${CYAN}  │   🔄  Telemetry →  Synced every 60s           │${RESET}"
echo -e "${CYAN}  │                                               │${RESET}"
echo -e "${CYAN}  │   Press  Ctrl + C  to terminate engine        │${RESET}"
echo -e "${CYAN}  │                                               │${RESET}"
echo -e "${CYAN}  └───────────────────────────────────────────────┘${RESET}"
echo ""

# Attempt to open browser after 1.5 s (best-effort, works on Linux/macOS/WSL)
(sleep 1.5 && \
  { open "http://localhost:8080" 2>/dev/null || \
    xdg-open "http://localhost:8080" 2>/dev/null || \
    start "http://localhost:8080" 2>/dev/null || true; }) &

# Start Node server
node server.js
