# MacBook Pro M5 Setup Automation Documentation

## Core Identity & Philosophies
- **Consistency:** Maintains Bash (v5 via Homebrew) to preserve a 5000-line legacy `.bashrc` rather than migrating to Zsh.
- **Performance:** Ghostty terminal (Metal/Native) and Raycast (Spotlight replacement).
- **Simplicity:** No version managers (nvm/pyenv); uses Homebrew + `uv`. No Docker Desktop (prefer OrbStack if needed). No local LLMs (rely on Claude Opus 4.6).

## Component Analysis

### 1. setup.sh (Orchestration Script)
Structured into 12 distinct execution phases:
- System checks (Pre-flight), macOS System Defaults.
- Installation: Homebrew, Shell, Rust/Cargo, fzf, and Git.
- Configuration: SSH, OpenClaw integration, Claude Code setup, and Bash Profile finalization.

### 2. Brewfile (The Dependency Manifest)
- **Taps:** Standard Homebrew.
- **Binaries:** Node@22, Bun, Python 3.13, UV, Go, Git-delta, Lazygit, Starship, Chezmoi, Age, Tailscale.
- **Casks (GUI):** Ghostty, Cursor, Raycast, Tailscale, Rectangle, Stats, OpenClaw-macOS.
- **Typography:** JetBrains Mono (Primary), Monaspace Neon, Fira Code.

### 3. macos-defaults.sh (System Hardening & UX)
- **Input:** Fastest key repeat, tap-to-click, three-finger drag.
- **UI:** Finder (show hidden, paths, extensions), Dock (left-side, small, auto-hide).
- **Productivity:** Disable autocorrect/dashes, screenshots to `~/Screenshots`, Safari Dev menu enabled.
- **Security:** Firewall activation.

### 4. ghostty.config
- **Aesthetics:** Catppuccin-Mocha theme, transparent titlebar.
- **Typography:** JetBrains Mono size 14.
- **Functionality:** Option key mapped to Alt, native split-pane keybindings.

### 5. starship.toml
- **Design:** Minimalist prompt.
- **Visibility:** Directory path, Git status/branch, language versions (Python/Node/Rust/Go), command duration.
- **Cleanliness:** All cloud-based modules are explicitly disabled.

## Deployment Workflow
1. **Bootstrap:** `xcode-select --install` and Homebrew installation.
2. **Transfer:** Move setup files to the M5.
3. **Execute:** `chmod +x setup.sh && ./setup.sh`.
4. **Finalize:** Complete manual post-install steps as prompted.
