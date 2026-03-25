import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Send, Music } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

function RequestPage() {
    const [djs, setDjs] = useState([]);
    const [tracks, setTracks] = useState([]);
    const [selectedDj, setSelectedDj] = useState('');
    const [selectedTrack, setSelectedTrack] = useState('');
    const [customTrack, setCustomTrack] = useState('');
    const [isCustom, setIsCustom] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchDjs();
        fetchTracks();
    }, []);

    const fetchDjs = async () => {
        const res = await axios.get(`${API}/api/djs`);
        setDjs(res.data);
    };

    const fetchTracks = async () => {
        const res = await axios.get(`${API}/api/tracks`);
        setTracks(res.data);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedDj) return alert('Bitte einen DJ auswählen');

        try {
            const res = await axios.post(`${API}/api/requests`, {
                dj_id: selectedDj,
                track_id: isCustom ? null : selectedTrack,
                custom_track_name: isCustom ? customTrack : null
            });
            setMessage(res.data.message || 'Wunsch abgeschickt!');
            setCustomTrack('');
            setSelectedTrack('');
            setTimeout(() => setMessage(''), 4000);
        } catch (err) {
            alert('Fehler beim Abschicken');
        }
    };

    return (
        <div className="glass-card" style={{ maxWidth: '600px', margin: '5vh auto' }}>
            <h2 className="flex items-center gap-1"><Music color="var(--primary)" /> Musikwunsch senden</h2>
            {message && <div style={{ padding: '1rem', background: 'var(--success)', color: '#fff', borderRadius: '8px', marginBottom: '1rem' }}>{message}</div>}

            <form onSubmit={handleSubmit}>
                <label>DJ auswählen:</label>
                <select value={selectedDj} onChange={e => setSelectedDj(e.target.value)} required>
                    <option value="">-- DJ wählen --</option>
                    {djs.map(dj => <option key={dj.id} value={dj.id}>{dj.username}</option>)}
                </select>

                <div style={{ marginBottom: '1rem' }}>
                    <label className="flex items-center gap-1" style={{ cursor: 'pointer' }}>
                        <input type="checkbox" checked={isCustom} onChange={e => setIsCustom(e.target.checked)} style={{ width: 'auto', marginBottom: 0 }} />
                        Song nicht in der Liste?
                    </label>
                </div>

                {!isCustom ? (
                    <>
                        <label>Track wählen:</label>
                        <select value={selectedTrack} onChange={e => setSelectedTrack(e.target.value)} required={!isCustom}>
                            <option value="">-- Track wählen --</option>
                            {tracks.map(t => <option key={t.id} value={t.id}>{t.title} - {t.artist}</option>)}
                        </select>
                    </>
                ) : (
                    <>
                        <label>Song/Künstler Name:</label>
                        <input type="text" placeholder="z.B. ABBA - Dancing Queen" value={customTrack} onChange={e => setCustomTrack(e.target.value)} required={isCustom} />
                    </>
                )}

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                    <Send size={18} /> Wunsch abschicken
                </button>
            </form>

            <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--glass-border)' }}>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>
                    Wähle einen DJ und den Song, den du hören möchtest. Der DJ wird über deinen Wunsch benachrichtigt.
                </p>
            </div>
        </div>
    );
}

export default RequestPage;
