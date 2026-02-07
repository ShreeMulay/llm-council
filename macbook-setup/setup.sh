#!/usr/bin/env bash
# =============================================================================
# MacBook Pro M5 — One-Shot Developer Setup
# Dr. Shree Mulay | The Kidney Experts
#
# Prerequisites:
#   1. Xcode CLT:  xcode-select --install
#   2. Homebrew:   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
#   3. Add brew to PATH:  eval "$(/opt/homebrew/bin/brew shellenv)"
#
# Usage:
#   git clone <this-repo> ~/ai_projects   (or scp this directory)
#   cd ~/ai_projects/macbook-setup
#   chmod +x setup.sh
#   ./setup.sh
#
# The script is idempotent — safe to re-run.
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/setup.log"

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------
info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[DONE]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; }
step()    { echo -e "\n${BOLD}${CYAN}==>${NC}${BOLD} $*${NC}"; }

check_command() {
    if command -v "$1" &>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Redirect all output to log file while still showing on screen
exec > >(tee -a "$LOG_FILE") 2>&1

echo ""
echo -e "${BOLD}=================================================================${NC}"
echo -e "${BOLD}  MacBook Pro M5 — Developer Workstation Setup${NC}"
echo -e "${BOLD}  $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${BOLD}=================================================================${NC}"
echo ""

# -----------------------------------------------------------------------------
# Pre-flight checks
# -----------------------------------------------------------------------------
step "Pre-flight checks"

# Must be macOS
if [[ "$(uname)" != "Darwin" ]]; then
    error "This script is for macOS only. Detected: $(uname)"
    exit 1
fi

# Must be Apple Silicon
if [[ "$(uname -m)" != "arm64" ]]; then
    warn "Expected Apple Silicon (arm64), detected: $(uname -m)"
    warn "Continuing anyway..."
fi

# Xcode CLT must be installed
if ! xcode-select -p &>/dev/null; then
    error "Xcode Command Line Tools not installed."
    error "Run: xcode-select --install"
    exit 1
fi
success "Xcode CLT installed"

# Homebrew must be installed
if ! check_command brew; then
    error "Homebrew not installed."
    error "Run: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi
success "Homebrew installed ($(brew --version | head -1))"

# =============================================================================
# PHASE 1: macOS System Defaults
# =============================================================================
step "Phase 1: macOS System Defaults"

if [[ -f "${SCRIPT_DIR}/macos-defaults.sh" ]]; then
    bash "${SCRIPT_DIR}/macos-defaults.sh"
    success "macOS defaults configured"
else
    warn "macos-defaults.sh not found, skipping"
fi

# =============================================================================
# PHASE 1.5: Apple ID Lockdown (Interactive)
# =============================================================================
step "Phase 1.5: Apple ID Lockdown"

echo ""
echo -e "${BOLD}  Your Apple ID should be signed in, but iCloud sync must be stripped down.${NC}"
echo -e "${BOLD}  Open System Settings → [Your Name] → iCloud and toggle each item:${NC}"
echo ""
echo -e "  ${RED}TURN OFF:${NC}"
echo "    [ ] iCloud Drive ........................ OFF"
echo "    [ ] Desktop & Documents Folders ......... OFF  (inside iCloud Drive → Options)"
echo "    [ ] iCloud Photos ....................... OFF"
echo "    [ ] iCloud Keychain ..................... OFF"
echo "    [ ] iCloud Mail ......................... OFF"
echo "    [ ] iCloud Contacts ..................... OFF"
echo "    [ ] iCloud Calendars .................... OFF"
echo "    [ ] iCloud Reminders .................... OFF"
echo "    [ ] iCloud Notes ........................ OFF"
echo "    [ ] iCloud Safari ....................... OFF"
echo "    [ ] Siri ................................ OFF  (System Settings → Siri)"
echo ""
echo -e "  ${GREEN}KEEP ON:${NC}"
echo "    [x] Find My Mac ........................ ON   (protects against theft)"
echo ""
echo -e "  ${YELLOW}TIP: Click your name at the top of System Settings to find iCloud.${NC}"
echo -e "  ${YELLOW}     Inside iCloud, click 'Show All' to see every toggle.${NC}"
echo ""

# Pause for user to complete manual steps
read -r -p "  Press ENTER when done (or type 's' to skip): " LOCKDOWN_RESPONSE

if [[ "$LOCKDOWN_RESPONSE" == "s" || "$LOCKDOWN_RESPONSE" == "S" ]]; then
    warn "Apple ID lockdown skipped — remember to do this manually later!"
    warn "  System Settings → [Your Name] → iCloud → disable everything except Find My"
else
    success "Apple ID lockdown completed"
fi

# =============================================================================
# PHASE 2: Homebrew Packages
# =============================================================================
step "Phase 2: Installing Homebrew packages"

info "Running brew bundle (this takes 5-15 minutes on first run)..."
if [[ -f "${SCRIPT_DIR}/Brewfile" ]]; then
    brew bundle --file="${SCRIPT_DIR}/Brewfile" --no-lock 2>&1 || {
        warn "Some brew packages may have failed. Check output above."
        warn "Continuing with setup..."
    }
    success "Homebrew packages installed"
else
    error "Brewfile not found at ${SCRIPT_DIR}/Brewfile"
    exit 1
fi

# =============================================================================
# PHASE 3: Shell Setup (Modern Bash)
# =============================================================================
step "Phase 3: Shell configuration"

BREW_BASH="/opt/homebrew/bin/bash"

if [[ -x "$BREW_BASH" ]]; then
    # Add Homebrew bash to allowed shells if not already there
    if ! grep -q "$BREW_BASH" /etc/shells 2>/dev/null; then
        info "Adding $BREW_BASH to /etc/shells (requires sudo)..."
        echo "$BREW_BASH" | sudo tee -a /etc/shells >/dev/null
    fi

    # Set as default shell if not already
    if [[ "$SHELL" != "$BREW_BASH" ]]; then
        info "Setting $BREW_BASH as default shell..."
        chsh -s "$BREW_BASH"
        success "Default shell changed to bash $(${BREW_BASH} --version | head -1)"
    else
        success "Already using Homebrew bash"
    fi
else
    warn "Homebrew bash not found at $BREW_BASH. Using system shell."
fi

# =============================================================================
# PHASE 4: Rust (via rustup, not Homebrew)
# =============================================================================
step "Phase 4: Rust toolchain"

if check_command rustc; then
    success "Rust already installed ($(rustc --version))"
else
    info "Installing Rust via rustup..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
    source "${HOME}/.cargo/env" 2>/dev/null || true
    success "Rust installed ($(rustc --version 2>/dev/null || echo 'restart shell to verify'))"
fi

# =============================================================================
# PHASE 5: fzf Key Bindings
# =============================================================================
step "Phase 5: fzf setup"

if check_command fzf; then
    # Install fzf key bindings and completion
    FZF_INSTALL="$(brew --prefix)/opt/fzf/install"
    if [[ -x "$FZF_INSTALL" ]]; then
        "$FZF_INSTALL" --key-bindings --completion --no-update-rc --no-bash --no-zsh 2>/dev/null || true
        success "fzf key bindings configured"
    fi
else
    warn "fzf not found, skipping"
fi

# =============================================================================
# PHASE 6: Config Files
# =============================================================================
step "Phase 6: Application configs"

# Ghostty config
GHOSTTY_DIR="${HOME}/.config/ghostty"
if [[ -f "${SCRIPT_DIR}/ghostty.config" ]]; then
    mkdir -p "$GHOSTTY_DIR"
    if [[ -f "${GHOSTTY_DIR}/config" ]]; then
        warn "Ghostty config already exists, backing up to config.bak"
        cp "${GHOSTTY_DIR}/config" "${GHOSTTY_DIR}/config.bak"
    fi
    cp "${SCRIPT_DIR}/ghostty.config" "${GHOSTTY_DIR}/config"
    success "Ghostty config installed"
fi

# Starship prompt config
STARSHIP_DIR="${HOME}/.config"
if [[ -f "${SCRIPT_DIR}/starship.toml" ]]; then
    if [[ -f "${STARSHIP_DIR}/starship.toml" ]]; then
        warn "Starship config already exists, backing up to starship.toml.bak"
        cp "${STARSHIP_DIR}/starship.toml" "${STARSHIP_DIR}/starship.toml.bak"
    fi
    cp "${SCRIPT_DIR}/starship.toml" "${STARSHIP_DIR}/starship.toml"
    success "Starship prompt config installed"
fi

# Create Screenshots directory
mkdir -p "${HOME}/Screenshots"

# Create Projects directory
mkdir -p "${HOME}/ai_projects"

# =============================================================================
# PHASE 7: Git Configuration
# =============================================================================
step "Phase 7: Git configuration"

# Only set if not already configured
if [[ -z "$(git config --global user.name 2>/dev/null)" ]]; then
    warn "Git user.name not set. Set it with:"
    warn "  git config --global user.name \"Shree Mulay\""
else
    success "Git user.name: $(git config --global user.name)"
fi

if [[ -z "$(git config --global user.email 2>/dev/null)" ]]; then
    warn "Git user.email not set. Set it with:"
    warn "  git config --global user.email \"your@email.com\""
else
    success "Git user.email: $(git config --global user.email)"
fi

# Set git defaults (safe to re-run)
git config --global core.pager delta
git config --global interactive.diffFilter "delta --color-only"
git config --global delta.navigate true
git config --global delta.side-by-side true
git config --global delta.line-numbers true
git config --global merge.conflictstyle zdiff3
git config --global pull.rebase true
git config --global init.defaultBranch main
git config --global push.autoSetupRemote true
git config --global rerere.enabled true
git config --global column.ui auto
git config --global branch.sort -committerdate
success "Git defaults configured (delta, rebase, zdiff3)"

# =============================================================================
# PHASE 8: SSH Key
# =============================================================================
step "Phase 8: SSH key"

SSH_KEY="${HOME}/.ssh/id_ed25519"
if [[ -f "$SSH_KEY" ]]; then
    success "SSH key already exists: $SSH_KEY"
else
    info "No SSH key found. Generate one with:"
    info "  ssh-keygen -t ed25519 -C \"your@email.com\""
    info "  cat ~/.ssh/id_ed25519.pub"
    info "  Then add to: https://github.com/settings/keys"
fi

# =============================================================================
# PHASE 9: OpenClaw CLI + Local Gateway Setup
# =============================================================================
step "Phase 9: OpenClaw (LOCAL gateway — this machine is the server)"

if check_command openclaw; then
    success "OpenClaw CLI already installed ($(openclaw --version 2>/dev/null || echo 'installed'))"
else
    info "Installing OpenClaw CLI..."
    curl -fsSL https://openclaw.ai/install.sh | bash 2>&1 || {
        warn "OpenClaw install script failed. Try manually:"
        warn "  curl -fsSL https://openclaw.ai/install.sh | bash"
    }
fi

# Update to beta channel (matches ChromeOS setup — needed for Opus 4.6 support)
if check_command openclaw; then
    info "Setting update channel to beta (for Opus 4.6 model catalog)..."
    openclaw config set update.channel beta 2>/dev/null || true

    info "Updating OpenClaw to latest beta..."
    openclaw update --channel beta --yes 2>/dev/null || {
        warn "OpenClaw update failed — may need to run manually after reboot"
    }
fi

info ""
info "OpenClaw macOS app should be in /Applications/OpenClaw.app"
info ""
echo -e "  ${BOLD}This MacBook is configured as the OpenClaw SERVER (local gateway).${NC}"
echo -e "  ${BOLD}To complete migration, run:${NC}"
echo ""
echo "    # 1. Export from ChromeOS (on the ChromeOS machine):"
echo "    ./openclaw-migrate.sh --export"
echo ""
echo "    # 2. Transfer tarball to this MacBook:"
echo "    scp ~/openclaw-export-*.tar.gz shreemulay@<macbook-ip>:~/"
echo ""
echo "    # 3. Import on this MacBook:"
echo "    cd ~/ai_projects/macbook-setup"
echo "    ./openclaw-migrate.sh --import ~/openclaw-export-*.tar.gz"
echo "    ./openclaw-migrate.sh --post-import"
echo ""

# =============================================================================
# PHASE 10: Claude Code CLI
# =============================================================================
step "Phase 10: Claude Code CLI"

if check_command claude; then
    success "Claude Code already installed ($(claude --version 2>/dev/null || echo 'installed'))"
else
    info "Installing Claude Code CLI..."
    npm install -g @anthropic-ai/claude-code 2>&1 || {
        warn "Claude Code install failed. Try manually:"
        warn "  npm install -g @anthropic-ai/claude-code"
    }
fi

# =============================================================================
# PHASE 11: Tailscale
# =============================================================================
step "Phase 11: Tailscale"

if check_command tailscale; then
    TAILSCALE_STATUS=$(tailscale status 2>/dev/null | head -1 || echo "not connected")
    info "Tailscale installed. Status: $TAILSCALE_STATUS"
    info "If not logged in, open the Tailscale app from the menu bar."
else
    warn "Tailscale CLI not found. Open /Applications/Tailscale.app to set up."
fi

# =============================================================================
# PHASE 12: Bash Profile Bootstrap
# =============================================================================
step "Phase 12: Bash profile bootstrap"

BASH_PROFILE="${HOME}/.bash_profile"

# Create a minimal .bash_profile that loads .bashrc (macOS convention)
# Only create if it doesn't exist
if [[ ! -f "$BASH_PROFILE" ]]; then
    cat > "$BASH_PROFILE" << 'PROFILE'
# MacBook Pro M5 — Bash Profile
# macOS reads .bash_profile for login shells (terminals)
# This file sources .bashrc for consistency with Linux

# Homebrew
eval "$(/opt/homebrew/bin/brew shellenv)"

# Source .bashrc if it exists
if [[ -f "${HOME}/.bashrc" ]]; then
    source "${HOME}/.bashrc"
fi
PROFILE
    success "Created ~/.bash_profile (sources .bashrc)"
else
    # Ensure it at least sources .bashrc
    if ! grep -q '.bashrc' "$BASH_PROFILE" 2>/dev/null; then
        warn "~/.bash_profile exists but doesn't source .bashrc"
        warn "Add this line to it:"
        warn '  [[ -f "${HOME}/.bashrc" ]] && source "${HOME}/.bashrc"'
    else
        success "~/.bash_profile already sources .bashrc"
    fi
fi

# Create a minimal .bashrc if none exists (chezmoi will replace this later)
BASHRC="${HOME}/.bashrc"
if [[ ! -f "$BASHRC" ]]; then
    cat > "$BASHRC" << 'BASHRC_CONTENT'
# Minimal .bashrc — will be replaced by chezmoi
# This is a placeholder until dotfiles are synced

# Homebrew
eval "$(/opt/homebrew/bin/brew shellenv)"

# Cargo/Rust
[[ -f "${HOME}/.cargo/env" ]] && source "${HOME}/.cargo/env"

# Starship prompt
eval "$(starship init bash)"

# fzf
eval "$(fzf --bash)" 2>/dev/null || true

# Aliases
alias ll='eza -la --icons --git'
alias ls='eza --icons'
alias cat='bat --plain'
alias g='lazygit'
alias gs='git status'
alias gp='git push'
alias gl='git log --oneline -20'

# Path
export PATH="${HOME}/.local/bin:${HOME}/go/bin:${PATH}"

# Editor
export EDITOR="cursor --wait"
export VISUAL="$EDITOR"

# Bun
export BUN_INSTALL="${HOME}/.bun"
export PATH="${BUN_INSTALL}/bin:${PATH}"
BASHRC_CONTENT
    success "Created minimal ~/.bashrc (placeholder until chezmoi sync)"
else
    success "~/.bashrc already exists"
fi

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo -e "${BOLD}=================================================================${NC}"
echo -e "${BOLD}  Setup Complete!${NC}"
echo -e "${BOLD}=================================================================${NC}"
echo ""
echo -e "${GREEN}Installed:${NC}"
echo "  Bash $(bash --version 2>/dev/null | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || echo '(check after restart)')"
check_command bun    && echo "  Bun $(bun --version 2>/dev/null)"
check_command node   && echo "  Node $(node --version 2>/dev/null)"
check_command python3 && echo "  Python $(python3 --version 2>/dev/null | cut -d' ' -f2)"
check_command go     && echo "  Go $(go version 2>/dev/null | cut -d' ' -f3)"
check_command rustc  && echo "  Rust $(rustc --version 2>/dev/null | cut -d' ' -f2)"
check_command git    && echo "  Git $(git --version 2>/dev/null | cut -d' ' -f3)"
check_command gh     && echo "  GitHub CLI $(gh --version 2>/dev/null | head -1 | cut -d' ' -f3)"
check_command rg     && echo "  ripgrep $(rg --version 2>/dev/null | head -1 | cut -d' ' -f2)"
check_command claude && echo "  Claude Code $(claude --version 2>/dev/null || echo 'installed')"
check_command openclaw && echo "  OpenClaw $(openclaw --version 2>/dev/null || echo 'installed')"
echo ""
echo -e "${YELLOW}Manual steps remaining:${NC}"
echo "  1. Restart your terminal (or log out and back in)"
echo "  2. Set up SSH key:  ssh-keygen -t ed25519 -C \"your@email.com\""
echo "  3. Add SSH key to GitHub:  cat ~/.ssh/id_ed25519.pub"
echo "  4. Auth GitHub CLI:  gh auth login"
echo "  5. Launch Tailscale app and sign in"
echo "  6. MIGRATE OpenClaw from ChromeOS (see Phase 9 output above):"
echo "     a) On ChromeOS:  ./openclaw-migrate.sh --export"
echo "     b) scp tarball to this MacBook"
echo "     c) On MacBook:   ./openclaw-migrate.sh --import ~/openclaw-export-*.tar.gz"
echo "     d) On MacBook:   ./openclaw-migrate.sh --post-import"
echo "  7. Sync dotfiles:  chezmoi init git@github.com:shreemulay/dotfiles.git"
echo "  8. Set up Caps Lock -> Escape:"
echo "     System Settings -> Keyboard -> Keyboard Shortcuts -> Modifier Keys"
echo "  9. Verify Apple ID lockdown (if skipped during Phase 1.5):"
echo "     System Settings -> [Your Name] -> iCloud -> disable all except Find My"
echo " 10. Switch ChromeOS to remote client mode:"
echo "     openclaw gateway stop"
echo "     openclaw config set gateway.mode remote"
echo "     openclaw config set gateway.remote.host <macbook-tailscale-ip>"
echo ""
echo -e "${CYAN}Config files installed:${NC}"
echo "  ~/.config/ghostty/config     (Ghostty terminal)"
echo "  ~/.config/starship.toml      (Starship prompt)"
echo "  ~/.bash_profile              (Login shell bootstrap)"
echo "  ~/.bashrc                    (Shell config placeholder)"
echo ""
echo "Log saved to: ${LOG_FILE}"
echo ""
echo -e "${BOLD}Open Ghostty, Raycast, and Cursor to complete their first-run setup.${NC}"
echo ""
