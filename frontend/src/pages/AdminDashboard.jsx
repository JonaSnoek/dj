import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Users, Trash2, Edit2, Check, X, RefreshCw } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [form, setForm] = useState({ username: '', password: '', roles: 'DJ' });
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ username: '', roles: '', password: '' });
    const [message, setMessage] = useState({ text: '', type: 'success' });

    useEffect(() => { fetchUsers(); }, []);

    const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

    const showMsg = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: 'success' }), 3000);
    };

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`${API}/api/admin/users`, auth());
            setUsers(res.data);
        } catch (err) {
            showMsg('Fehler beim Laden der Benutzer', 'error');
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API}/api/admin/users`, form, auth());
            showMsg(`Benutzer "${form.username}" erstellt!`);
            setForm({ username: '', password: '', roles: 'DJ' });
            fetchUsers();
        } catch (err) {
            showMsg(err.response?.data?.message || 'Fehler beim Erstellen', 'error');
        }
    };

    const startEdit = (user) => {
        setEditingId(user.id);
        setEditForm({ username: user.username, roles: user.roles, password: '' });
    };

    const cancelEdit = () => { setEditingId(null); setEditForm({ username: '', roles: '', password: '' }); };

    const handleUpdate = async (id) => {
        try {
            await axios.patch(`${API}/api/admin/users/${id}`, editForm, auth());
            showMsg('Benutzer aktualisiert!');
            setEditingId(null);
            fetchUsers();
        } catch (err) {
            showMsg('Fehler beim Aktualisieren', 'error');
        }
    };

    const handleDelete = async (id, username) => {
        if (!window.confirm(`Benutzer "${username}" wirklich löschen?`)) return;
        try {
            await axios.delete(`${API}/api/admin/users/${id}`, auth());
            showMsg(`Benutzer "${username}" gelöscht`);
            fetchUsers();
        } catch (err) {
            showMsg('Fehler beim Löschen', 'error');
        }
    };

    const roleColor = (roles) => roles.includes('Admin') ? 'var(--warning, #f59e0b)' : 'var(--primary)';
    const roleLabel = (roles) => roles.includes('Admin') ? '👑 DJ & Admin' : '🎧 DJ';

    return (
        <div className="fade-in">
            {/* Feedback Banner */}
            {message.text && (
                <div style={{
                    padding: '0.8rem 1.2rem', borderRadius: '8px', marginBottom: '1.5rem',
                    background: message.type === 'error' ? 'var(--error)' : 'var(--success)',
                    color: '#fff', fontWeight: 'bold'
                }}>
                    {message.text}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '2rem' }}>
                {/* Create User Form */}
                <div className="glass-card">
                    <h3 className="flex items-center gap-1"><UserPlus size={20} /> Neuen Benutzer erstellen</h3>
                    <form onSubmit={handleCreate} style={{ marginTop: '1rem' }}>
                        <label>Benutzername</label>
                        <input
                            type="text" value={form.username} required
                            placeholder="z.B. dj_max"
                            onChange={e => setForm({ ...form, username: e.target.value })}
                        />
                        <label>Passwort</label>
                        <input
                            type="password" value={form.password} required
                            placeholder="Sicheres Passwort"
                            onChange={e => setForm({ ...form, password: e.target.value })}
                        />
                        <label>Rolle</label>
                        <select value={form.roles} onChange={e => setForm({ ...form, roles: e.target.value })}>
                            <option value="DJ">🎧 DJ</option>
                            <option value="DJ,Admin">👑 DJ & Admin</option>
                        </select>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                            Benutzer erstellen
                        </button>
                    </form>
                </div>

                {/* User List */}
                <div className="glass-card">
                    <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                        <h3 className="flex items-center gap-1"><Users size={20} /> Benutzerverwaltung</h3>
                        <button onClick={fetchUsers} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <RefreshCw size={14} /> Aktualisieren
                        </button>
                    </div>

                    {users.length === 0 ? (
                        <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '2rem' }}>Keine Benutzer</p>
                    ) : users.map(u => (
                        <div key={u.id} style={{
                            padding: '0.8rem 1rem', borderRadius: '10px',
                            background: 'var(--surface-alt)', marginBottom: '0.6rem',
                            border: editingId === u.id ? '1px solid var(--primary)' : '1px solid transparent',
                            transition: 'border-color 0.2s'
                        }}>
                            {editingId === u.id ? (
                                /* Edit mode */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <input
                                        value={editForm.username}
                                        onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                                        placeholder="Benutzername"
                                        style={{ marginBottom: 0 }}
                                    />
                                    <select
                                        value={editForm.roles}
                                        onChange={e => setEditForm({ ...editForm, roles: e.target.value })}
                                        style={{ marginBottom: 0 }}
                                    >
                                        <option value="DJ">🎧 DJ</option>
                                        <option value="DJ,Admin">👑 DJ & Admin</option>
                                    </select>
                                    <input
                                        type="password"
                                        value={editForm.password}
                                        onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                        placeholder="Neues Passwort (leer lassen = unveränert)"
                                        style={{ marginBottom: 0 }}
                                    />
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
                                        <button onClick={() => handleUpdate(u.id)} className="btn btn-primary"
                                            style={{ flex: 1, padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
                                            <Check size={14} /> Speichern
                                        </button>
                                        <button onClick={cancelEdit} className="btn btn-outline"
                                            style={{ padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <X size={14} /> Abbrechen
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* View mode */
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{u.username}</div>
                                        <div style={{ fontSize: '0.8rem', color: roleColor(u.roles), marginTop: '0.2rem' }}>
                                            {roleLabel(u.roles)}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                        <button onClick={() => startEdit(u)} className="btn btn-outline"
                                            style={{ padding: '0.4rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <Edit2 size={14} /> Bearbeiten
                                        </button>
                                        <button onClick={() => handleDelete(u.id, u.username)} className="btn btn-outline"
                                            style={{ padding: '0.4rem 0.7rem', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <Trash2 size={14} /> Löschen
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;
