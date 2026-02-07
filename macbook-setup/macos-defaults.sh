#!/usr/bin/env bash
# =============================================================================
# macOS System Defaults — Developer Optimization
# Dr. Shree Mulay | MacBook Pro M5
# 
# Run once after first boot. Some changes require logout/restart.
# Usage: bash macos-defaults.sh
# =============================================================================

set -euo pipefail

echo "==> Configuring macOS defaults for development..."

# =============================================================================
# Keyboard
# =============================================================================
echo "  -> Keyboard settings..."

# Fastest key repeat rate
defaults write NSGlobalDomain KeyRepeat -int 1

# Shortest delay until repeat
defaults write NSGlobalDomain InitialKeyRepeat -int 10

# Disable press-and-hold for accent characters (enables key repeat everywhere)
defaults write NSGlobalDomain ApplePressAndHoldEnabled -bool false

# Disable auto-correct
defaults write NSGlobalDomain NSAutomaticSpellingCorrectionEnabled -bool false

# Disable smart quotes (breaks code)
defaults write NSGlobalDomain NSAutomaticQuoteSubstitutionEnabled -bool false

# Disable smart dashes (breaks code)
defaults write NSGlobalDomain NSAutomaticDashSubstitutionEnabled -bool false

# Disable automatic capitalization
defaults write NSGlobalDomain NSAutomaticCapitalizationEnabled -bool false

# Disable automatic period substitution
defaults write NSGlobalDomain NSAutomaticPeriodSubstitutionEnabled -bool false

# Enable full keyboard access for all controls (Tab through dialogs)
defaults write NSGlobalDomain AppleKeyboardUIMode -int 3

# =============================================================================
# Trackpad
# =============================================================================
echo "  -> Trackpad settings..."

# Enable tap to click
defaults write com.apple.driver.AppleBluetoothMultitouch.trackpad Clicking -bool true
defaults -currentHost write NSGlobalDomain com.apple.mouse.tapBehavior -int 1

# Enable three-finger drag
defaults write com.apple.AppleMultitouchTrackpad TrackpadThreeFingerDrag -bool true
defaults write com.apple.driver.AppleBluetoothMultitouch.trackpad TrackpadThreeFingerDrag -bool true

# =============================================================================
# Finder
# =============================================================================
echo "  -> Finder settings..."

# Show hidden files
defaults write com.apple.finder AppleShowAllFiles -bool true

# Show all file extensions
defaults write NSGlobalDomain AppleShowAllExtensions -bool true

# Show path bar at bottom
defaults write com.apple.finder ShowPathbar -bool true

# Show status bar
defaults write com.apple.finder ShowStatusBar -bool true

# Show full POSIX path in Finder title
defaults write com.apple.finder _FMShowStatusBar -bool true

# Search current folder by default (not entire Mac)
defaults write com.apple.finder FXDefaultSearchScope -string "SCcf"

# Disable warning when changing file extension
defaults write com.apple.finder FXEnableExtensionChangeWarning -bool false

# Avoid creating .DS_Store files on network and USB volumes
defaults write com.apple.desktopservices DSDontWriteNetworkStores -bool true
defaults write com.apple.desktopservices DSDontWriteUSBStores -bool true

# Default to list view in Finder
defaults write com.apple.finder FXPreferredViewStyle -string "Nlsv"

# New Finder window shows home directory
defaults write com.apple.finder NewWindowTarget -string "PfHm"
defaults write com.apple.finder NewWindowTargetPath -string "file://${HOME}/"

# =============================================================================
# Dock
# =============================================================================
echo "  -> Dock settings..."

# Position on left (maximizes vertical space)
defaults write com.apple.dock orientation -string "left"

# Small icon size
defaults write com.apple.dock tilesize -int 36

# Auto-hide the Dock
defaults write com.apple.dock autohide -bool true

# Remove auto-hide delay
defaults write com.apple.dock autohide-delay -float 0

# Faster auto-hide animation
defaults write com.apple.dock autohide-time-modifier -float 0.3

# Don't show recent applications
defaults write com.apple.dock show-recents -bool false

# Minimize using scale effect (faster than genie)
defaults write com.apple.dock mineffect -string "scale"

# Don't minimize windows into application icon
defaults write com.apple.dock minimize-to-application -bool false

# Speed up Mission Control animations
defaults write com.apple.dock expose-animation-duration -float 0.1

# Don't automatically rearrange Spaces based on most recent use
defaults write com.apple.dock mru-spaces -bool false

# =============================================================================
# Safari (if used as secondary browser)
# =============================================================================
echo "  -> Safari settings..."

# Show full URL in address bar
defaults write com.apple.Safari ShowFullURLInSmartSearchField -bool true

# Enable Develop menu and Web Inspector
defaults write com.apple.Safari IncludeDevelopMenu -bool true
defaults write com.apple.Safari WebKitDeveloperExtrasEnabledPreferenceKey -bool true

# =============================================================================
# Activity Monitor
# =============================================================================
echo "  -> Activity Monitor settings..."

# Show all processes
defaults write com.apple.ActivityMonitor ShowCategory -int 0

# Sort by CPU usage
defaults write com.apple.ActivityMonitor SortColumn -string "CPUUsage"
defaults write com.apple.ActivityMonitor SortDirection -int 0

# =============================================================================
# Security & Privacy
# =============================================================================
echo "  -> Security settings..."

# Disable the "Are you sure you want to open this application?" dialog
defaults write com.apple.LaunchServices LSQuarantine -bool false

# Require password immediately after sleep or screen saver
defaults write com.apple.screensaver askForPassword -int 1
defaults write com.apple.screensaver askForPasswordDelay -int 0

# Enable firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on 2>/dev/null || true

# =============================================================================
# Screenshots
# =============================================================================
echo "  -> Screenshot settings..."

# Save screenshots to ~/Screenshots (not Desktop)
mkdir -p "${HOME}/Screenshots"
defaults write com.apple.screencapture location -string "${HOME}/Screenshots"

# Save screenshots as PNG
defaults write com.apple.screencapture type -string "png"

# Disable screenshot shadow
defaults write com.apple.screencapture disable-shadow -bool true

# =============================================================================
# Terminal.app (fallback terminal)
# =============================================================================
echo "  -> Terminal.app settings..."

# Only use UTF-8 in Terminal.app
defaults write com.apple.terminal StringEncodings -array 4

# =============================================================================
# Text Edit (useful for quick notes)
# =============================================================================
echo "  -> TextEdit settings..."

# Use plain text mode by default
defaults write com.apple.TextEdit RichText -int 0

# Open and save files as UTF-8
defaults write com.apple.TextEdit PlainTextEncoding -int 4
defaults write com.apple.TextEdit PlainTextEncodingForWrite -int 4

# =============================================================================
# Energy & Performance (SERVER MODE — MacBook runs OpenClaw gateway 24/7)
# =============================================================================
echo "  -> Energy settings (server mode — always-on for OpenClaw gateway)..."

# Prevent system sleep when on power adapter (gateway must stay alive)
sudo pmset -c sleep 0 2>/dev/null || true

# Prevent display sleep when on power adapter (set to 15 min, not never)
sudo pmset -c displaysleep 15 2>/dev/null || true

# Prevent disk sleep
sudo pmset -c disksleep 0 2>/dev/null || true

# Enable lid-wake
sudo pmset -a lidwake 1 2>/dev/null || true

# Wake on network access (allows Tailscale to wake the machine)
sudo pmset -c womp 1 2>/dev/null || true

# Restart on power failure (auto-recover after power outage)
sudo pmset -c autorestart 1 2>/dev/null || true

# TCP keepalive during sleep (maintains Tailscale + Discord connections)
sudo pmset -c tcpkeepalive 1 2>/dev/null || true

# Prevent sleep when lid is closed AND on power (clamshell mode)
# This allows running with lid closed + external monitor or headless
sudo pmset -c lidclose 0 2>/dev/null || true

# On battery: allow sleep after 10 min (preserve battery when unplugged)
sudo pmset -b sleep 10 2>/dev/null || true
sudo pmset -b displaysleep 5 2>/dev/null || true

# =============================================================================
# Misc
# =============================================================================
echo "  -> Miscellaneous settings..."

# Expand save panel by default
defaults write NSGlobalDomain NSNavPanelExpandedStateForSaveMode -bool true
defaults write NSGlobalDomain NSNavPanelExpandedStateForSaveMode2 -bool true

# Expand print panel by default
defaults write NSGlobalDomain PMPrintingExpandedStateForPrint -bool true
defaults write NSGlobalDomain PMPrintingExpandedStateForPrint2 -bool true

# Disable Notification Center (one less background process)
# launchctl unload -w /System/Library/LaunchAgents/com.apple.notificationcenterui.plist 2>/dev/null || true

# Disable Siri (saves RAM)
defaults write com.apple.assistant.support "Assistant Enabled" -bool false

# Disable Siri suggestions in Spotlight
defaults write com.apple.Siri SiriCanLearnFromAppBlacklist -string "*"
defaults write com.apple.Siri StatusMenuVisible -bool false

# =============================================================================
# iCloud & Apple ID (automatable portions)
# =============================================================================
echo "  -> iCloud/Apple ID settings (automatable portion)..."

# Disable iCloud document sync for built-in apps
# (TextEdit, Preview, etc. won't auto-save to iCloud)
defaults write NSGlobalDomain NSDocumentSaveNewDocumentsToCloud -bool false

# Disable Safari iCloud sync for tabs
defaults write com.apple.Safari SyncEnabled -bool false 2>/dev/null || true

# Disable Handoff (sends clipboard/activity data via iCloud)
defaults write com.apple.coreservices.useractivityd ActivityAdvertisingAllowed -bool false
defaults write com.apple.coreservices.useractivityd ActivityReceivingAllowed -bool false

# =============================================================================
# Hostname
# =============================================================================
echo "  -> Setting hostname to shree-m5..."

sudo scutil --set ComputerName "shree-m5" 2>/dev/null || true
sudo scutil --set HostName "shree-m5" 2>/dev/null || true
sudo scutil --set LocalHostName "shree-m5" 2>/dev/null || true

# =============================================================================
# Restart affected applications
# =============================================================================
echo "  -> Restarting affected applications..."

for app in "Finder" "Dock" "SystemUIServer" "cfprefsd"; do
    killall "${app}" 2>/dev/null || true
done

echo ""
echo "==> macOS defaults configured!"
echo "    Some changes require a logout/restart to take effect."
echo "    Recommended: Log out and log back in now."
