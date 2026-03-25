#!/bin/bash
# Quick updater – run this on the server after pushing changes to GitHub
# Usage: bash update.sh

set -e
APP_DIR="/opt/dj"

echo "Pulling latest changes..."
git -C "$APP_DIR" pull

echo "Installing backend dependencies..."
cd "$APP_DIR/backend" && npm install --omit=dev

echo "Building frontend..."
cd "$APP_DIR/frontend" && npm install && npm run build

echo "Restarting backend..."
pm2 restart dj-backend

echo "✅ Update complete!"
