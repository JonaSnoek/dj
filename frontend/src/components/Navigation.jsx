import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music, LogOut, Settings, Disc } from 'lucide-react';

function Navigation({ user, onLogout }) {
    const navigate = useNavigate();

    return (
        <nav className="flex justify-between items-center glass-card" style={{ padding: '1rem 2rem', marginBottom: '2rem', borderRadius: '12px' }}>
            <Link to="/" className="flex items-center gap-1" style={{ textDecoration: 'none', color: 'var(--text)', fontWeight: 'bold', fontSize: '1.2rem' }}>
                <Disc color="var(--primary)" /> DJ Manager
            </Link>

            <div className="flex gap-1 items-center">
                {user.roles.includes('DJ') && (
                    <Link to="/dj" className="btn btn-outline"><Music size={18} /> DJ Deck</Link>
                )}
                {user.roles.includes('Admin') && (
                    <Link to="/admin" className="btn btn-outline"><Settings size={18} /> Admin</Link>
                )}
                <div style={{ marginLeft: '1rem', paddingLeft: '1rem', borderLeft: '1px solid var(--glass-border)' }}>
                    <span style={{ marginRight: '1rem', color: 'var(--text-dim)' }}>{user.username}</span>
                    <button onClick={() => { onLogout(); navigate('/login'); }} className="btn btn-outline" style={{ padding: '0.5rem' }}>
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </nav>
    );
}

export default Navigation;
