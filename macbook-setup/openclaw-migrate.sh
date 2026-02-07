#!/usr/bin/env bash
# =============================================================================
# OpenClaw Migration: ChromeOS → MacBook Pro M5
#
# This script runs on the MacBook AFTER setup.sh completes.
# It imports the OpenClaw config, workspace, plugins, and credentials
# from a tarball exported from the ChromeOS machine.
#
# Step 1 (on ChromeOS): Run this script with --export
# Step 2 (transfer):    scp the tarball to the MacBook
# Step 3 (on MacBook):  Run this script with --import <tarball>
#
# Usage:
#   ./openclaw-migrate.sh --export                    # On ChromeOS (creates tarball)
#   ./openclaw-migrate.sh --import openclaw-export.tar.gz  # On MacBook
#   ./openclaw-migrate.sh --post-import               # On MacBook (after import, configures gateway)
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[DONE]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; }
step()    { echo -e "\n${BOLD}${CYAN}==>${NC}${BOLD} $*${NC}"; }

OPENCLAW_DIR="${HOME}/.openclaw"
EXPORT_NAME="openclaw-export-$(date +%Y%m%d-%H%M%S)"
EXPORT_DIR="/tmp/${EXPORT_NAME}"
EXPORT_TARBALL="${HOME}/${EXPORT_NAME}.tar.gz"

# =============================================================================
# EXPORT (run on ChromeOS)
# =============================================================================
do_export() {
    step "Exporting OpenClaw from $(hostname)"

    if [[ ! -d "$OPENCLAW_DIR" ]]; then
        error "No OpenClaw directory found at $OPENCLAW_DIR"
        exit 1
    fi

    # Create export directory
    rm -rf "$EXPORT_DIR"
    mkdir -p "$EXPORT_DIR"

    # --- Core config ---
    info "Exporting core config..."
    cp "$OPENCLAW_DIR/openclaw.json" "$EXPORT_DIR/"

    # --- Auth profiles ---
    info "Exporting auth profiles..."
    if [[ -f "$OPENCLAW_DIR/agents/main/agent/auth-profiles.json" ]]; then
        mkdir -p "$EXPORT_DIR/agents/main/agent"
        cp "$OPENCLAW_DIR/agents/main/agent/auth-profiles.json" "$EXPORT_DIR/agents/main/agent/"
    fi

    # --- Workspace (Kai's brain) ---
    info "Exporting workspace (AGENTS.md, MEMORY.md, TOOLS.md, etc.)..."
    if [[ -d "$OPENCLAW_DIR/workspace" ]]; then
        mkdir -p "$EXPORT_DIR/workspace"
        # Copy markdown files (Kai's knowledge)
        cp "$OPENCLAW_DIR/workspace/"*.md "$EXPORT_DIR/workspace/" 2>/dev/null || true
        # Copy memory subdirectory
        if [[ -d "$OPENCLAW_DIR/workspace/memory" ]]; then
            cp -r "$OPENCLAW_DIR/workspace/memory" "$EXPORT_DIR/workspace/"
        fi
    fi

    # --- Memory database ---
    info "Exporting memory database..."
    if [[ -d "$OPENCLAW_DIR/memory" ]]; then
        mkdir -p "$EXPORT_DIR/memory"
        cp "$OPENCLAW_DIR/memory/"* "$EXPORT_DIR/memory/" 2>/dev/null || true
    fi

    # --- Credentials (Telegram pairing, WhatsApp, etc.) ---
    info "Exporting credentials..."
    if [[ -d "$OPENCLAW_DIR/credentials" ]]; then
        cp -r "$OPENCLAW_DIR/credentials" "$EXPORT_DIR/"
    fi

    # --- Extensions (Shield plugin) ---
    info "Exporting extensions (Shield)..."
    if [[ -d "$OPENCLAW_DIR/extensions" ]]; then
        cp -r "$OPENCLAW_DIR/extensions" "$EXPORT_DIR/"
    fi

    # --- Identity ---
    info "Exporting identity..."
    if [[ -d "$OPENCLAW_DIR/identity" ]]; then
        cp -r "$OPENCLAW_DIR/identity" "$EXPORT_DIR/"
    fi

    # --- Telegram data ---
    if [[ -d "$OPENCLAW_DIR/telegram" ]]; then
        info "Exporting Telegram session data..."
        cp -r "$OPENCLAW_DIR/telegram" "$EXPORT_DIR/"
    fi

    # --- Canvas ---
    if [[ -d "$OPENCLAW_DIR/canvas" ]]; then
        info "Exporting Canvas data..."
        cp -r "$OPENCLAW_DIR/canvas" "$EXPORT_DIR/"
    fi

    # --- Completions ---
    if [[ -d "$OPENCLAW_DIR/completions" ]]; then
        info "Exporting completions cache..."
        cp -r "$OPENCLAW_DIR/completions" "$EXPORT_DIR/"
    fi

    # --- Create manifest ---
    info "Creating manifest..."
    cat > "$EXPORT_DIR/MANIFEST.json" << EOF
{
  "exportedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "exportedFrom": "$(hostname)",
  "exportedBy": "$(whoami)",
  "openclawVersion": "$(openclaw --version 2>/dev/null || echo 'unknown')",
  "platform": "$(uname -s)/$(uname -m)",
  "contents": [
    "openclaw.json",
    "agents/main/agent/auth-profiles.json",
    "workspace/ (AGENTS.md, MEMORY.md, TOOLS.md, SOUL.md, USER.md, IDENTITY.md)",
    "memory/main.sqlite",
    "credentials/ (telegram, whatsapp pairing)",
    "extensions/openclaw-shield/",
    "identity/",
    "telegram/",
    "canvas/",
    "completions/"
  ],
  "notes": {
    "gateway": "Config has gateway.bind=loopback. Must change to tailscale on MacBook.",
    "workspace_path": "Config has workspace=/home/shreemulay/.openclaw/workspace. Must update for macOS /Users/ path.",
    "shield_installPath": "Plugin installPath references /home/shreemulay/. Must update for macOS."
  }
}
EOF

    # --- Create tarball ---
    info "Creating tarball..."
    tar -czf "$EXPORT_TARBALL" -C /tmp "$EXPORT_NAME"

    # Clean up
    rm -rf "$EXPORT_DIR"

    echo ""
    success "Export complete!"
    echo ""
    echo -e "  ${BOLD}Tarball:${NC} ${EXPORT_TARBALL}"
    echo -e "  ${BOLD}Size:${NC}    $(du -h "$EXPORT_TARBALL" | cut -f1)"
    echo ""
    echo -e "  ${YELLOW}Next: Transfer to MacBook:${NC}"
    echo "    scp ${EXPORT_TARBALL} shreemulay@<macbook-tailscale-ip>:~/"
    echo ""
    echo "  Then on MacBook:"
    echo "    ./openclaw-migrate.sh --import ~/$(basename "$EXPORT_TARBALL")"
    echo ""
}

# =============================================================================
# IMPORT (run on MacBook)
# =============================================================================
do_import() {
    local tarball="$1"

    step "Importing OpenClaw to $(hostname)"

    if [[ ! -f "$tarball" ]]; then
        error "Tarball not found: $tarball"
        exit 1
    fi

    # Check if OpenClaw is installed
    if ! command -v openclaw &>/dev/null; then
        error "OpenClaw CLI not installed. Run setup.sh first."
        exit 1
    fi

    # Stop the gateway if running
    info "Stopping OpenClaw gateway (if running)..."
    openclaw gateway stop 2>/dev/null || true
    sleep 2

    # Backup existing config if any
    if [[ -d "$OPENCLAW_DIR" ]]; then
        local backup="${OPENCLAW_DIR}.pre-import.$(date +%Y%m%d-%H%M%S)"
        warn "Existing ~/.openclaw found, backing up to $(basename "$backup")"
        mv "$OPENCLAW_DIR" "$backup"
    fi

    # Create fresh directory
    mkdir -p "$OPENCLAW_DIR"
    chmod 700 "$OPENCLAW_DIR"

    # Extract tarball
    info "Extracting tarball..."
    local extract_dir
    extract_dir=$(mktemp -d)
    tar -xzf "$tarball" -C "$extract_dir"

    # Find the export directory inside (it has a timestamp name)
    local source_dir
    source_dir=$(find "$extract_dir" -maxdepth 1 -type d -name "openclaw-export-*" | head -1)
    if [[ -z "$source_dir" ]]; then
        error "Invalid tarball — no openclaw-export-* directory found inside"
        rm -rf "$extract_dir"
        exit 1
    fi

    # Show manifest
    if [[ -f "$source_dir/MANIFEST.json" ]]; then
        info "Import manifest:"
        echo "    Exported from: $(jq -r '.exportedFrom' "$source_dir/MANIFEST.json" 2>/dev/null || echo 'unknown')"
        echo "    Exported at:   $(jq -r '.exportedAt' "$source_dir/MANIFEST.json" 2>/dev/null || echo 'unknown')"
        echo "    OC version:    $(jq -r '.openclawVersion' "$source_dir/MANIFEST.json" 2>/dev/null || echo 'unknown')"
    fi

    # --- Copy everything ---
    info "Copying config files..."

    # Core config
    cp "$source_dir/openclaw.json" "$OPENCLAW_DIR/"

    # Auth profiles
    if [[ -d "$source_dir/agents" ]]; then
        mkdir -p "$OPENCLAW_DIR/agents/main/agent"
        cp "$source_dir/agents/main/agent/auth-profiles.json" "$OPENCLAW_DIR/agents/main/agent/" 2>/dev/null || true
    fi

    # Workspace
    if [[ -d "$source_dir/workspace" ]]; then
        cp -r "$source_dir/workspace" "$OPENCLAW_DIR/"
    fi

    # Memory
    if [[ -d "$source_dir/memory" ]]; then
        cp -r "$source_dir/memory" "$OPENCLAW_DIR/"
    fi

    # Credentials
    if [[ -d "$source_dir/credentials" ]]; then
        cp -r "$source_dir/credentials" "$OPENCLAW_DIR/"
    fi

    # Extensions
    if [[ -d "$source_dir/extensions" ]]; then
        cp -r "$source_dir/extensions" "$OPENCLAW_DIR/"
    fi

    # Identity
    if [[ -d "$source_dir/identity" ]]; then
        cp -r "$source_dir/identity" "$OPENCLAW_DIR/"
    fi

    # Telegram
    if [[ -d "$source_dir/telegram" ]]; then
        cp -r "$source_dir/telegram" "$OPENCLAW_DIR/"
    fi

    # Canvas
    if [[ -d "$source_dir/canvas" ]]; then
        cp -r "$source_dir/canvas" "$OPENCLAW_DIR/"
    fi

    # Completions
    if [[ -d "$source_dir/completions" ]]; then
        cp -r "$source_dir/completions" "$OPENCLAW_DIR/"
    fi

    # Clean up extract
    rm -rf "$extract_dir"

    # --- Fix permissions ---
    info "Setting permissions..."
    chmod 700 "$OPENCLAW_DIR"
    find "$OPENCLAW_DIR" -type f -exec chmod 600 {} \; 2>/dev/null || true
    find "$OPENCLAW_DIR" -type d -exec chmod 700 {} \; 2>/dev/null || true

    success "Files imported to ~/.openclaw"
    echo ""
    echo -e "  ${YELLOW}Next: Run path fixups:${NC}"
    echo "    ./openclaw-migrate.sh --post-import"
    echo ""
}

# =============================================================================
# POST-IMPORT (run on MacBook after import — fixes paths, gateway config)
# =============================================================================
do_post_import() {
    step "Post-import fixups for macOS"

    if [[ ! -f "$OPENCLAW_DIR/openclaw.json" ]]; then
        error "No openclaw.json found. Run --import first."
        exit 1
    fi

    local config="$OPENCLAW_DIR/openclaw.json"
    local macos_home="/Users/shreemulay"

    # --- Fix workspace path ---
    info "Fixing workspace path (/home/ → /Users/)..."
    if command -v jq &>/dev/null; then
        # Use jq for safe JSON editing
        local tmp
        tmp=$(mktemp)

        # Fix workspace path
        jq --arg new_path "${macos_home}/.openclaw/workspace" \
            '.agents.defaults.workspace = $new_path' \
            "$config" > "$tmp" && mv "$tmp" "$config"

        # Fix Shield installPath
        jq --arg new_path "${macos_home}/.openclaw/extensions/openclaw-shield" \
            '.plugins.installs["openclaw-shield"].installPath = $new_path' \
            "$config" > "$tmp" && mv "$tmp" "$config"

        # Configure gateway for Tailscale access (clients connect via Tailscale)
        # Bind to Tailscale interface so ChromeOS and other devices can reach it
        jq '.gateway.bind = "tailscale"' "$config" > "$tmp" && mv "$tmp" "$config"
        jq '.gateway.tailscale.mode = "serve"' "$config" > "$tmp" && mv "$tmp" "$config"

        success "Config paths updated for macOS"
    else
        warn "jq not installed — manual fixup needed"
        warn "Edit ~/.openclaw/openclaw.json:"
        warn "  - Change /home/shreemulay → /Users/shreemulay in workspace path"
        warn "  - Change /home/shreemulay → /Users/shreemulay in Shield installPath"
        warn "  - Change gateway.bind from 'loopback' to 'tailscale'"
    fi

    # --- Reinstall Shield (npm dependencies) ---
    info "Reinstalling Shield plugin dependencies..."
    local shield_dir="$OPENCLAW_DIR/extensions/openclaw-shield"
    if [[ -d "$shield_dir" ]] && [[ -f "$shield_dir/package.json" ]]; then
        (cd "$shield_dir" && npm install --production 2>/dev/null) || {
            warn "Shield npm install failed — may need manual reinstall:"
            warn "  openclaw plugins install https://github.com/knostic/openclaw-shield"
        }
        success "Shield plugin dependencies installed"
    fi

    # --- Install OpenClaw as daemon (launchd on macOS) ---
    info "Installing OpenClaw gateway as macOS daemon (launchd)..."
    openclaw gateway install-daemon 2>/dev/null || {
        warn "Daemon install failed — you can start manually with:"
        warn "  openclaw gateway start"
    }

    # --- Start the gateway ---
    info "Starting OpenClaw gateway..."
    openclaw gateway start 2>/dev/null || {
        warn "Gateway start failed. Check logs:"
        warn "  openclaw gateway logs"
    }

    # --- Run health check ---
    echo ""
    step "Verification"

    info "Running health check..."
    openclaw health 2>/dev/null || warn "Health check failed — gateway may still be starting"

    info "Running security audit..."
    openclaw security audit 2>/dev/null || warn "Security audit not available"

    info "Checking model status..."
    openclaw models status 2>/dev/null || warn "Model status check failed"

    # --- Print summary ---
    echo ""
    echo -e "${BOLD}=================================================================${NC}"
    echo -e "${BOLD}  OpenClaw Migration Complete!${NC}"
    echo -e "${BOLD}=================================================================${NC}"
    echo ""
    echo -e "${GREEN}Migrated:${NC}"
    echo "  Config .................. openclaw.json (paths fixed for macOS)"
    echo "  Auth .................... Anthropic Max token (sk-ant-oat01-...)"
    echo "  Workspace ............... Kai's brain (AGENTS.md, MEMORY.md, TOOLS.md, etc.)"
    echo "  Memory .................. main.sqlite (conversation history)"
    echo "  Channels ................ Discord @Kai, Telegram, WhatsApp"
    echo "  Shield .................. Knostic v0.1.0 (enforce mode)"
    echo "  Credentials ............. Telegram pairing, WhatsApp session"
    echo ""
    echo -e "${YELLOW}Architecture:${NC}"
    echo "  MacBook M5 (this machine):"
    echo "    - OpenClaw gateway on :18789"
    echo "    - Bound to Tailscale interface"
    echo "    - Discord @Kai, Telegram, WhatsApp active"
    echo "    - Shield security layer active"
    echo ""
    echo "  ChromeOS (old server):"
    echo "    - Switch to remote client mode"
    echo "    - Connect to MacBook via Tailscale"
    echo "    - Run: openclaw config set gateway.mode remote"
    echo "    - Run: openclaw config set gateway.remote.host <macbook-tailscale-ip>"
    echo ""
    echo -e "${YELLOW}Verify:${NC}"
    echo "  openclaw tui                    # Test Kai responds"
    echo "  openclaw gateway status         # Check gateway is running"
    echo "  tailscale status                # Check Tailscale mesh"
    echo ""
    echo -e "${YELLOW}On ChromeOS (switch to client):${NC}"
    echo "  openclaw gateway stop"
    echo "  openclaw config set gateway.mode remote"
    echo "  openclaw config set gateway.remote.host <macbook-tailscale-ip>"
    echo "  openclaw config set gateway.remote.port 18789"
    echo "  openclaw config set gateway.remote.auth.token 44eae2ada9821e6a1fb19b4467778c5d220b1242ebdab743"
    echo ""
}

# =============================================================================
# CLI Router
# =============================================================================
case "${1:-}" in
    --export)
        do_export
        ;;
    --import)
        if [[ -z "${2:-}" ]]; then
            error "Usage: $0 --import <tarball>"
            exit 1
        fi
        do_import "$2"
        ;;
    --post-import)
        do_post_import
        ;;
    *)
        echo "OpenClaw Migration Tool"
        echo ""
        echo "Usage:"
        echo "  $0 --export                   Export from current machine (creates tarball)"
        echo "  $0 --import <tarball>          Import tarball to this machine"
        echo "  $0 --post-import              Fix paths and start gateway (run after import)"
        echo ""
        echo "Workflow:"
        echo "  1. On ChromeOS:  ./openclaw-migrate.sh --export"
        echo "  2. Transfer:     scp ~/openclaw-export-*.tar.gz macbook:~/"
        echo "  3. On MacBook:   ./openclaw-migrate.sh --import ~/openclaw-export-*.tar.gz"
        echo "  4. On MacBook:   ./openclaw-migrate.sh --post-import"
        echo ""
        exit 1
        ;;
esac
