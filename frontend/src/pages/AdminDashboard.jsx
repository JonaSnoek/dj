import React, { useState } from 'react';
import axios from 'axios';
import { UserPlus, Users } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

function AdminDashboard() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [roles, setRoles] = useState('DJ');
    const [message, setMessage] = useState('');

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API}/api/admin/users`, { username, password, roles }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setMessage('User created successfully!');
            setUsername('');
            setPassword('');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            alert('Failed to create user');
        }
    };

    return (
        <div className="fade-in">
            <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <h2 className="flex items-center gap-1"><UserPlus /> Create New User</h2>
                {message && <div style={{ padding: '1rem', background: 'var(--success)', color: '#fff', borderRadius: '8px', marginBottom: '1rem' }}>{message}</div>}

                <form onSubmit={handleCreateUser}>
                    <label>Benutzername:</label>
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />

                    <label>Passwort:</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />

                    <label>Rollen:</label>
                    <select value={roles} onChange={e => setRoles(e.target.value)}>
                        <option value="DJ">DJ</option>
                        <option value="DJ,Admin">DJ & Admin</option>
                    </select>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                        User erstellen
                    </button>
                </form>
            </div>

            <div className="glass-card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
                <h3 className="flex items-center gap-1"><Users size={18} /> Info</h3>
                <p style={{ color: 'var(--text-dim)' }}>
                    Als Administrator kannst du hier neue DJs anlegen. Diese können sich dann mit ihren Zugangsdaten anmelden und Musik hochladen sowie Wünsche verwalten.
                </p>
            </div>
        </div>
    );
}

export default AdminDashboard;
