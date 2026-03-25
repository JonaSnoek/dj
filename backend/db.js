const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'db.json');

async function getData() {
    try {
        const content = await fs.readFile(DB_PATH, 'utf8');
        return JSON.parse(content);
    } catch (err) {
        const initial = {
            users: [{ id: 1, username: 'admin', password: await bcrypt.hash('mpipwmkbe3521!', 10), roles: 'DJ,Admin', settings: { auto_add_known: false }, queue: [] }],
            tracks: [],
            requests: []
        };
        await fs.writeFile(DB_PATH, JSON.stringify(initial, null, 2));
        return initial;
    }
}

async function saveData(data) {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

const pool = {
    query: async (sql, params = []) => {
        const data = await getData();
        console.log('SQL Mock Query:', sql, params);

        if (sql.includes('SELECT * FROM users WHERE username = ?')) {
            const user = data.users.find(u => u.username === params[0]);
            if (user) {
                if (!user.settings) user.settings = { auto_add_known: false };
                if (!user.queue) user.queue = [];
            }
            return [user ? [user] : []];
        }
        if (sql.includes('SELECT * FROM users WHERE id = ?')) {
            const user = data.users.find(u => u.id == params[0]);
            return [user ? [user] : []];
        }
        if (sql.includes('UPDATE users SET settings = ? WHERE id = ?')) {
            const user = data.users.find(u => u.id == params[1]);
            if (user) user.settings = typeof params[0] === 'string' ? JSON.parse(params[0]) : params[0];
            await saveData(data);
            return [{}];
        }
        if (sql.includes('UPDATE users SET queue = ? WHERE id = ?')) {
            const user = data.users.find(u => u.id == params[1]);
            if (user) user.queue = typeof params[0] === 'string' ? JSON.parse(params[0]) : params[0];
            await saveData(data);
            return [{}];
        }
        if (sql.includes('INSERT INTO users')) {
            const newUser = { id: Date.now(), username: params[0], password: params[1], roles: params[2], settings: { auto_add_known: false }, queue: [] };
            data.users.push(newUser);
            await saveData(data);
            return [{ insertId: newUser.id }];
        }
        if (sql.includes('SELECT id, username FROM users WHERE roles LIKE "%DJ%"')) {
            const djs = data.users.filter(u => u.roles.includes('DJ')).map(u => ({ id: u.id, username: u.username }));
            return [djs];
        }
        if (sql.includes('INSERT INTO tracks')) {
            const newTrack = { id: Date.now(), title: params[0], artist: params[1], file_path: params[2], uploaded_by: params[3], cover_image: params[4] || null };
            data.tracks.push(newTrack);
            await saveData(data);
            return [{ insertId: newTrack.id }];
        }
        if (sql.includes('DELETE FROM tracks WHERE id = ?')) {
            data.tracks = data.tracks.filter(t => t.id != params[0]);
            // Also remove from any user's queue
            data.users.forEach(u => { if (u.queue) u.queue = u.queue.filter(t => t.id != params[0]); });
            data.requests = data.requests.filter(r => r.track_id != params[0]);
            await saveData(data);
            return [{}];
        }
        if (sql.includes('SELECT * FROM tracks')) {
            return [data.tracks];
        }
        if (sql.includes('INSERT INTO requests')) {
            const newReq = { id: Date.now(), dj_id: params[0], track_id: params[1], custom_track_name: params[2], status: params[3] || 'pending', created_at: new Date() };
            data.requests.push(newReq);
            await saveData(data);
            return [{ insertId: newReq.id }];
        }
        if (sql.includes('SELECT r.*, t.title, t.artist, t.cover_image FROM requests r')) {
            const djRequests = data.requests
                .filter(r => r.dj_id == params[0] && r.status === 'pending')
                .map(r => {
                    const t = data.tracks.find(track => track.id == r.track_id);
                    return { ...r, title: t ? t.title : null, artist: t ? t.artist : null, cover_image: t ? t.cover_image : null };
                });
            return [djRequests];
        }
        if (sql.includes('UPDATE requests SET status = ?')) {
            const req = data.requests.find(r => r.id == params[1]);
            if (req) req.status = params[0];
            await saveData(data);
            return [{}];
        }

        // Admin: list all users
        if (sql.includes('SELECT id, username, roles FROM users')) {
            return [data.users.map(u => ({ id: u.id, username: u.username, roles: u.roles }))];
        }
        // Admin: update user (with password)
        if (sql.includes('UPDATE users SET username = ?, roles = ?, password = ?')) {
            const user = data.users.find(u => u.id == params[3]);
            if (user) { user.username = params[0]; user.roles = params[1]; user.password = params[2]; }
            await saveData(data);
            return [{}];
        }
        // Admin: update user (without password)
        if (sql.includes('UPDATE users SET username = ?, roles = ? WHERE id = ?')) {
            const user = data.users.find(u => u.id == params[2]);
            if (user) { user.username = params[0]; user.roles = params[1]; }
            await saveData(data);
            return [{}];
        }
        // Admin: delete user
        if (sql.includes('DELETE FROM users WHERE id = ?')) {
            data.users = data.users.filter(u => u.id != params[0]);
            await saveData(data);
            return [{}];
        }

        return [[]];
    },
    getConnection: async () => ({
        release: () => { },
        query: pool.query
    })
};

module.exports = pool;
