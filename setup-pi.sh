#!/bin/bash
# Run this once on your Raspberry Pi to install and schedule the daily digest.
# Usage: bash setup-pi.sh

set -e

INSTALL_DIR="$HOME/discord-digest"
REPO_URL="https://github.com/bostonleier-code/discord-daily-digest.git"
CRON_TIME="0 14 * * *"   # 14:00 UTC = 7am MST / 8am MST depending on DST

echo "==> Installing Node.js (if not present)..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node --version

echo "==> Cloning repo into $INSTALL_DIR..."
if [ -d "$INSTALL_DIR" ]; then
  echo "    Directory exists — pulling latest..."
  cd "$INSTALL_DIR" && git pull
else
  git clone "$REPO_URL" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

echo "==> Installing dependencies..."
npm install --omit=dev

echo "==> Checking for .env.local..."
if [ ! -f "$INSTALL_DIR/.env.local" ]; then
  cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env.local"
  echo ""
  echo "  !! IMPORTANT: Edit $INSTALL_DIR/.env.local and fill in your values."
  echo "     Run: nano $INSTALL_DIR/.env.local"
  echo ""
fi

echo "==> Registering cron job ($CRON_TIME UTC)..."
CRON_CMD="$CRON_TIME cd $INSTALL_DIR && /usr/bin/env node_modules/.bin/tsx src/runDailyDigest.ts >> $HOME/digest.log 2>&1"
# Remove any existing digest cron, add new one
( crontab -l 2>/dev/null | grep -v "runDailyDigest"; echo "$CRON_CMD" ) | crontab -

echo ""
echo "Done! Cron job registered. Digest will run daily at 14:00 UTC (adjust CRON_TIME in this script to change)."
echo ""
echo "To run manually right now:"
echo "  cd $INSTALL_DIR && npm run daily:digest"
echo ""
echo "To view logs:"
echo "  tail -f ~/digest.log"
