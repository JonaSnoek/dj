# DJ Management System

A web-based DJ management system with dual-deck playback, music requests, and a public request page.

## Tech Stack
- **Backend**: Node.js, Express, Socket.IO, Multer, bcryptjs, JWT
- **Frontend**: React, Vite, Axios, Socket.IO client, Lucide icons
- **Storage**: JSON-based database (file-based, no external DB required)

## Features
- Admin & DJ account management
- MP3 upload with cover art
- Dual-deck audio player (Deck A / Deck B)
- Persistent queue with music request integration
- Public music request page (real-time via WebSockets)
- Auto-queue: known tracks from the library are queued automatically

## Quick Deploy (Ubuntu Server)

```bash
# On your Ubuntu server (as root):
curl -fsSL https://raw.githubusercontent.com/JonaSnoek/dj/main/install.sh | bash
```

Or manually:
```bash
wget https://raw.githubusercontent.com/JonaSnoek/dj/main/install.sh
bash install.sh
```

## Updating the server after code changes
```bash
# On your server:
bash /opt/dj/update.sh
```

## Default Admin Login
- **Username**: `admin`
- **Password**: `mpipwmkbe3521!`

> ⚠️ Change the admin password after first login!

## Local Development

```bash
# Backend
cd backend
npm install
cp .env.example .env   # then edit JWT_SECRET
node server.js

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```
