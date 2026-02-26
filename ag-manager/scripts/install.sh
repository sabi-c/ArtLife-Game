#!/usr/bin/env bash
# ag-manager/scripts/install.sh
#
# One-command setup for AG Manager on macOS.
# Run from the ag-manager/ directory:
#   bash scripts/install.sh

set -euo pipefail

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
RESET='\033[0m'

info()    { echo -e "${GREEN}✓${RESET} $1"; }
warn()    { echo -e "${YELLOW}⚠${RESET}  $1"; }
error()   { echo -e "${RED}✗${RESET} $1"; exit 1; }
section() { echo -e "\n${BOLD}$1${RESET}"; }

echo ""
echo -e "${BOLD}╔══════════════════════════════════╗${RESET}"
echo -e "${BOLD}║      AG Manager — Setup          ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════╝${RESET}"
echo ""

# ── Prerequisite checks ──────────────────────────────────────

section "1. Checking prerequisites"

# Node.js 18+
if ! command -v node &>/dev/null; then
  error "Node.js not found. Install from https://nodejs.org (v18 or later)"
fi

NODE_VER=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_VER" -lt 18 ]; then
  error "Node.js 18+ required (you have v$(node -v)). Upgrade at https://nodejs.org"
fi
info "Node.js $(node -v)"

# npm
if ! command -v npm &>/dev/null; then
  error "npm not found. It should come with Node.js"
fi
info "npm $(npm -v)"

# antigravity CLI
if command -v antigravity &>/dev/null; then
  info "Antigravity found in PATH"
else
  warn "Antigravity not found in PATH. Set AG_PATH in .env to the full binary path."
  warn "Default location: /Applications/Antigravity.app/Contents/MacOS/antigravity"
fi

# ── Install PM2 ──────────────────────────────────────────────

section "2. Installing PM2 (process manager)"

if command -v pm2 &>/dev/null; then
  info "PM2 already installed ($(pm2 -v))"
else
  echo "Installing PM2 globally..."
  npm install -g pm2
  info "PM2 installed"
fi

# ── Setup .env ───────────────────────────────────────────────

section "3. Configuring .env"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AG_MGR_DIR="$(dirname "$SCRIPT_DIR")"

if [ ! -f "$AG_MGR_DIR/.env" ]; then
  cp "$AG_MGR_DIR/.env.example" "$AG_MGR_DIR/.env"
  warn ".env created from .env.example"
  echo ""
  echo "  ▶ Edit $AG_MGR_DIR/.env before continuing:"
  echo "    - AG_MANAGER_KEY  (set a secure random key)"
  echo "    - AG_WORKSPACE    (path to your project, e.g. ArtLife-Game)"
  echo "    - PHONE_CHAT_DIR  (path to antigravity_phone_chat clone)"
  echo "    - ALLOWED_PHONE   (your mobile number for SMS)"
  echo ""
  read -p "  Have you edited .env? Press Enter to continue or Ctrl+C to exit. " _
else
  info ".env already exists"
fi

# ── Install Node.js deps ─────────────────────────────────────

section "4. Installing Node.js dependencies"
cd "$AG_MGR_DIR"
npm install
info "Dependencies installed"

# ── Create log directory ──────────────────────────────────────

mkdir -p "$AG_MGR_DIR/logs"
info "Log directory ready: ag-manager/logs/"

# ── Start with PM2 ───────────────────────────────────────────

section "5. Starting AG Manager with PM2"

pm2 start "$AG_MGR_DIR/pm2.config.js" --update-env 2>/dev/null || \
pm2 restart ag-manager 2>/dev/null || true

pm2 save
info "AG Manager started and saved to PM2"

# ── macOS auto-start on login ────────────────────────────────

section "6. Setting up auto-start on macOS login"

echo ""
echo "  Run the following command to make AG Manager start automatically"
echo "  when you log in to your Mac:"
echo ""
pm2 startup launchd --no-daemon 2>/dev/null | grep "sudo" | sed 's/^/  /'
echo ""
echo "  Copy and run the 'sudo env ...' command printed above."
echo ""

# ── Done ─────────────────────────────────────────────────────

PORT=$(grep -E '^AG_MANAGER_PORT=' "$AG_MGR_DIR/.env" 2>/dev/null | cut -d= -f2 || echo "3737")
KEY=$(grep -E '^AG_MANAGER_KEY=' "$AG_MGR_DIR/.env" 2>/dev/null | cut -d= -f2 || echo "")

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║  AG Manager is running!                              ║${RESET}"
echo -e "${BOLD}╠══════════════════════════════════════════════════════╣${RESET}"
echo -e "${BOLD}║${RESET}  Web UI:  http://localhost:${PORT}/?key=${KEY:0:8}...       ${BOLD}║${RESET}"
echo -e "${BOLD}║${RESET}  Logs:    pm2 logs ag-manager                        ${BOLD}║${RESET}"
echo -e "${BOLD}║${RESET}  Status:  pm2 status                                 ${BOLD}║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${RESET}"
echo ""
echo "  Next steps:"
echo "  1. Open http://localhost:${PORT}/?key=${KEY} in your browser"
echo "  2. Click START to launch Antigravity"
echo "  3. Once phone_chat starts, scan the QR code from your phone"
echo "  4. (Optional) Set up Twilio for SMS control — see .env"
echo ""
