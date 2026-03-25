#!/bin/bash
# ============================================================
# DJ Management System – Install Script
# Run as root or with sudo on a fresh Ubuntu 22.04+ server
# Usage: bash install.sh
# ============================================================

set -e

echo "=================================================="
echo "  DJ Management System – Server Setup"
echo "=================================================="

# --- 1. Update system & install dependencies ---
echo ""
echo "[1/7] Updating system packages..."
apt-get update -y && apt-get upgrade -y

echo ""
echo "[2/7] Installing Node.js 20 LTS, npm, git, nginx, certbot..."
apt-get install -y curl git nginx

# Install Node.js 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2 globally (process manager – keeps the app running)
npm install -g pm2

# --- 2. App directory ---
APP_DIR="/opt/dj"
echo ""
echo "[3/7] Cloning / updating app in $APP_DIR ..."

if [ -d "$APP_DIR/.git" ]; then
  echo "Repository already exists – pulling latest changes..."
  git -C "$APP_DIR" pull
else
  git clone https://github.com/JonaSnoek/dj.git "$APP_DIR"
fi

# Create uploads directory (gitignored, must exist at runtime)
mkdir -p "$APP_DIR/uploads"
chmod 755 "$APP_DIR/uploads"

# --- 3. Backend setup ---
echo ""
echo "[4/7] Installing backend dependencies..."
cd "$APP_DIR/backend"
npm install --omit=dev

# Create .env if it doesn't exist
if [ ! -f "$APP_DIR/backend/.env" ]; then
  cp "$APP_DIR/backend/.env.example" "$APP_DIR/backend/.env"
  # Generate a random JWT secret
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
  sed -i "s/change_this_to_a_long_random_string/$JWT_SECRET/" "$APP_DIR/backend/.env"
  echo "  ✅ .env created with a random JWT secret."
  echo "  ⚠️  Review $APP_DIR/backend/.env before going to production."
fi

# --- 4. Frontend build ---
echo ""
echo "[5/7] Building frontend..."
cd "$APP_DIR/frontend"
npm install
npm run build

# --- 5. Nginx config ---
echo ""
echo "[6/7] Configuring nginx..."

DOMAIN=""
echo ""
read -p "Enter your domain name (e.g. dj.example.com) or press Enter to use IP only: " DOMAIN

NGINX_CONF="/etc/nginx/sites-available/dj"

cat > "$NGINX_CONF" <<NGINX
server {
    listen 80;
    server_name ${DOMAIN:-_};

    # Frontend (built static files)
    root $APP_DIR/frontend/dist;
    index index.html;

    # SPA fallback: redirect all non-file requests to index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy API + Socket.IO to the Node.js backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
    }

    # Serve uploaded files (MP3, cover images)
    location /uploads/ {
        alias $APP_DIR/uploads/;
    }
}
NGINX

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/dj
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
echo "  ✅ Nginx configured."

# --- 6. Start backend with PM2 ---
echo ""
echo "[7/7] Starting backend with PM2..."
cd "$APP_DIR/backend"
pm2 delete dj-backend 2>/dev/null || true
pm2 start server.js --name dj-backend
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash || true

echo ""
echo "=================================================="
echo "  ✅ Installation complete!"
echo ""
echo "  App running at: http://${DOMAIN:-<YOUR-SERVER-IP>}"
if [ -n "$DOMAIN" ]; then
  echo ""
  echo "  To enable HTTPS (free SSL), run:"
  echo "    apt-get install -y certbot python3-certbot-nginx"
  echo "    certbot --nginx -d $DOMAIN"
fi
echo ""
echo "  Useful commands:"
echo "    pm2 status           – check if backend is running"
echo "    pm2 logs dj-backend  – view backend logs"
echo "    pm2 restart dj-backend – restart backend"
echo "    nano $APP_DIR/backend/.env – edit config"
echo "=================================================="
