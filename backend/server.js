const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const pool = require('./db');
const authMiddleware = require('./middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// DB check middleware
app.use(async (req, res, next) => {
    try {
        await pool.getConnection();
        next();
    } catch (err) {
        console.error('Database connection failed:', err);
        res.status(500).json({ message: 'Database connection failed' });
    }
});

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) return res.status(400).json({ message: 'User not found' });

        const user = rows[0];
        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ message: 'Invalid password' });

        const token = jwt.sign({ id: user.id, username: user.username, roles: user.roles }, process.env.JWT_SECRET);
        res.json({ token, user: { id: user.id, username: user.username, roles: user.roles, settings: user.settings, queue: user.queue || [] } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Settings & Queue
app.patch('/api/users/settings', authMiddleware, async (req, res) => {
    try {
        await pool.query('UPDATE users SET settings = ? WHERE id = ?', [JSON.stringify(req.body.settings), req.user.id]);
        res.json({ message: 'Settings updated' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.patch('/api/users/queue', authMiddleware, async (req, res) => {
    try {
        await pool.query('UPDATE users SET queue = ? WHERE id = ?', [JSON.stringify(req.body.queue), req.user.id]);
        res.json({ message: 'Queue updated' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Tracks
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, '../uploads'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.post('/api/tracks/upload', authMiddleware, upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), async (req, res) => {
    if (!req.user.roles.includes('DJ')) return res.status(403).json({ message: 'DJ only' });

    const { title, artist } = req.body;
    const audioPath = req.files['audio'][0].filename;
    const coverPath = req.files['cover'] ? req.files['cover'][0].filename : null;

    try {
        await pool.query('INSERT INTO tracks (title, artist, file_path, uploaded_by, cover_image) VALUES (?, ?, ?, ?, ?)', [title, artist, audioPath, req.user.id, coverPath]);
        res.status(201).json({ message: 'Track uploaded' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.delete('/api/tracks/:id', authMiddleware, async (req, res) => {
    try {
        await pool.query('DELETE FROM tracks WHERE id = ?', [req.params.id]);
        res.json({ message: 'Track deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/tracks', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM tracks');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/djs', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, username FROM users WHERE roles LIKE "%DJ%"');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Requests
app.post('/api/requests', async (req, res) => {
    const { dj_id, track_id, custom_track_name } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [dj_id]);
        if (!users || users.length === 0) return res.status(404).json({ message: 'DJ not found' });

        const dj = users[0];
        const status = (dj.settings?.auto_add_known && track_id) ? 'accepted' : 'pending';

        const [result] = await pool.query('INSERT INTO requests (dj_id, track_id, custom_track_name, status) VALUES (?, ?, ?, ?)', [dj_id, track_id || null, custom_track_name || null, status]);

        if (status === 'accepted' && track_id) {
            const updatedQueue = [...(dj.queue || [])];
            const [tracks] = await pool.query('SELECT * FROM tracks');
            const track = tracks.find(t => t.id == track_id);
            if (track) {
                updatedQueue.push(track);
                await pool.query('UPDATE users SET queue = ? WHERE id = ?', [JSON.stringify(updatedQueue), dj_id]);
                io.to(`dj-${dj_id}`).emit('auto-added', { track_id, queue: updatedQueue });
            }
        } else if (status === 'pending') {
            io.to(`dj-${dj_id}`).emit('new-request', { id: result.insertId, dj_id, track_id, custom_track_name, status: 'pending' });
        }

        res.status(201).json({ message: status === 'accepted' ? 'Direkt zur Warteschlange hinzugefügt!' : 'Wunsch abgeschickt', status });
    } catch (err) {
        console.error('Request error:', err);
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/requests/:dj_id', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT r.*, t.title, t.artist, t.cover_image
            FROM requests r 
            LEFT JOIN tracks t ON r.track_id = t.id 
            WHERE r.dj_id = ? AND r.status = 'pending'
            ORDER BY r.created_at ASC
        `, [req.params.dj_id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.patch('/api/requests/:id', authMiddleware, async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query('UPDATE requests SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ message: 'Request updated' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── Admin: User Management ──────────────────────────────────────────────────
const adminOnly = (req, res, next) => {
    if (!req.user?.roles?.includes('Admin')) return res.status(403).json({ message: 'Admin only' });
    next();
};

// List all users
app.get('/api/admin/users', authMiddleware, adminOnly, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, username, roles FROM users');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create user
app.post('/api/admin/users', authMiddleware, adminOnly, async (req, res) => {
    const { username, password, roles } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password required' });
    try {
        const hashed = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (username, password, roles) VALUES (?, ?, ?)', [username, hashed, roles || 'DJ']);
        res.status(201).json({ message: 'User created' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Edit user (username, roles, optional new password)
app.patch('/api/admin/users/:id', authMiddleware, adminOnly, async (req, res) => {
    const { username, roles, password } = req.body;
    try {
        if (password) {
            const hashed = await bcrypt.hash(password, 10);
            await pool.query('UPDATE users SET username = ?, roles = ?, password = ? WHERE id = ?', [username, roles, hashed, req.params.id]);
        } else {
            await pool.query('UPDATE users SET username = ?, roles = ? WHERE id = ?', [username, roles, req.params.id]);
        }
        res.json({ message: 'User updated' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete user
app.delete('/api/admin/users/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Socket logic
io.on('connection', (socket) => {
    socket.on('join-dj-room', (djId) => {
        socket.join(`dj-${djId}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on public Server-IP (0.0.0.0) at port ${PORT}`);
});
