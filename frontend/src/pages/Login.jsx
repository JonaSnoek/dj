import React, { useState } from 'react';
import axios from 'axios';
import { LogIn } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API}/api/auth/login`, { username, password });
            localStorage.setItem('token', res.data.token);
            onLogin(res.data.user);
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
        }
    };

    return (
        <div className="glass-card" style={{ maxWidth: '400px', margin: '10vh auto' }}>
            <h2 className="flex items-center gap-1"><LogIn /> Login</h2>
            {error && <p style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Sign In</button>
            </form>
        </div>
    );
}

export default Login;
