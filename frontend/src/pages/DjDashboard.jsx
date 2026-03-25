import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import socket from '../socket';
import { Upload, Music, MessageSquare, Trash2, Settings, Plus, CheckCircle, XCircle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

function DjDashboard({ user, updateUser }) {
    const [tracks, setTracks] = useState([]);
    const [requests, setRequests] = useState([]);
    // Queue items: { id, title, artist, file_path, cover_image, isRequest, requestLabel }
    // isRequest=true means it came from a music wish
    // requestLabel is what the requester typed (for custom tracks)
    const [queue, setQueue] = useState(user.queue || []);
    const [deckA, setDeckA] = useState(null);
    const [deckB, setDeckB] = useState(null);
    const [uploadData, setUploadData] = useState({ title: '', artist: '', audio: null, cover: null });
    // Modal for "create library entry from request"
    const [createFromRequest, setCreateFromRequest] = useState(null); // { request, audio: null, cover: null }

    const audioRefA = useRef(null);
    const audioRefB = useRef(null);

    useEffect(() => {
        fetchTracks();
        fetchRequests();
        socket.emit('join-dj-room', user.id);

        socket.on('new-request', (request) => {
            setRequests(prev => [...prev, request]);
        });

        socket.on('auto-added', ({ queue: newQueue }) => {
            setQueue(newQueue);
            updateUser({ queue: newQueue });
        });

        return () => {
            socket.off('new-request');
            socket.off('auto-added');
        };
    }, []);

    const fetchTracks = async () => {
        const res = await axios.get(`${API}/api/tracks`);
        setTracks(res.data);
    };

    const fetchRequests = async () => {
        const res = await axios.get(`${API}/api/requests/${user.id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setRequests(res.data);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', uploadData.title);
        formData.append('artist', uploadData.artist);
        formData.append('audio', uploadData.audio);
        if (uploadData.cover) formData.append('cover', uploadData.cover);
        try {
            await axios.post(`${API}/api/tracks/upload`, formData, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setUploadData({ title: '', artist: '', audio: null, cover: null });
            fetchTracks();
        } catch {
            alert('Upload fehlgeschlagen');
        }
    };

    const deleteTrack = async (id) => {
        await axios.delete(`${API}/api/tracks/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchTracks();
    };

    const updateSettingsServer = async (newSettings) => {
        updateUser({ settings: newSettings });
        await axios.patch(`${API}/api/users/settings`, { settings: newSettings }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
    };

    const updateQueueServer = async (newQueue) => {
        setQueue(newQueue);
        updateUser({ queue: newQueue });
        await axios.patch(`${API}/api/users/queue`, { queue: newQueue }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
    };

    const addToQueue = (track, opts = {}) => {
        updateQueueServer([...queue, { ...track, ...opts }]);
    };

    const loadToDeck = (track, deck) => {
        if (deck === 'A') setDeckA(track);
        else setDeckB(track);
    };

    // When a song ends: clear the deck (do NOT auto-play next)
    const onDeckEnded = (deck) => {
        if (deck === 'A') setDeckA(null);
        else setDeckB(null);
    };

    // Accept a request: mark as accepted and add to queue
    const acceptRequest = async (req) => {
        await axios.patch(`${API}/api/requests/${req.id}`, { status: 'accepted' }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setRequests(prev => prev.filter(r => r.id !== req.id));

        if (req.track_id) {
            // Library track request
            const track = tracks.find(t => t.id == req.track_id);
            if (track) {
                addToQueue(track, { isRequest: true, requestLabel: `${req.title} – ${req.artist}` });
            }
        } else {
            // Custom request: add a placeholder to queue so the song label is visible
            addToQueue({
                id: null,
                title: req.custom_track_name,
                artist: '(Manueller Wunsch)',
                file_path: null,
                cover_image: null,
                isRequest: true,
                requestLabel: req.custom_track_name,
                isCustom: true,
            });
        }
    };

    const rejectRequest = async (id) => {
        await axios.patch(`${API}/api/requests/${id}`, { status: 'rejected' }, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setRequests(prev => prev.filter(r => r.id !== id));
    };

    // Create library entry from a custom request, upload file, then add to queue
    const handleCreateFromRequest = async (e) => {
        e.preventDefault();
        const { request, audio, cover } = createFromRequest;
        const formData = new FormData();
        // pre-split "Song – Artist" if possible
        const parts = request.custom_track_name.split(/\s*[-–]\s*/);
        formData.append('title', parts[0] || request.custom_track_name);
        formData.append('artist', parts[1] || 'Unbekannt');
        formData.append('audio', audio);
        if (cover) formData.append('cover', cover);

        try {
            const res = await axios.post(`${API}/api/tracks/upload`, formData, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            // Fetch the new track and add it to the queue
            const tracksRes = await axios.get(`${API}/api/tracks`);
            const allTracks = tracksRes.data;
            setTracks(allTracks);
            const newTrack = allTracks[allTracks.length - 1]; // newest is last
            if (newTrack) {
                addToQueue(newTrack, { isRequest: true, requestLabel: request.custom_track_name });
            }
            // Mark request as accepted
            await axios.patch(`${API}/api/requests/${request.id}`, { status: 'accepted' }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setRequests(prev => prev.filter(r => r.id !== request.id));
            setCreateFromRequest(null);
        } catch {
            alert('Upload fehlgeschlagen');
        }
    };

    return (
        <div className="fade-in">
            {/* Settings bar */}
            <div className="glass-card flex justify-between items-center" style={{ padding: '1rem', marginBottom: '1rem' }}>
                <h4 className="flex items-center gap-1"><Settings size={18} /> DJ Einstellungen</h4>
                <label className="flex items-center gap-1" style={{ cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={user.settings?.auto_add_known}
                        onChange={e => updateSettingsServer({ ...user.settings, auto_add_known: e.target.checked })}
                        style={{ width: 'auto', marginBottom: 0 }}
                    />
                    Songs aus Bibliothek automatisch zur Warteschlange hinzufügen
                </label>
            </div>

            {/* Decks */}
            <div className="deck-container">
                {['A', 'B'].map(deck => {
                    const deckTrack = deck === 'A' ? deckA : deckB;
                    const audioRef = deck === 'A' ? audioRefA : audioRefB;
                    return (
                        <div key={deck} className={`player glass-card ${deckTrack ? `active-deck-${deck.toLowerCase()}` : ''}`}>
                            <div className="flex justify-between items-center">
                                <h3>Deck {deck}</h3>
                                {deckTrack?.cover_image && (
                                    <img src={`${API}/uploads/${deckTrack.cover_image}`} alt="cover"
                                        style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                                )}
                            </div>
                            {deckTrack ? (
                                <div>
                                    <p style={{ marginTop: '0.5rem' }}><strong>{deckTrack.title}</strong></p>
                                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>{deckTrack.artist}</p>
                                    {deckTrack.isRequest && (
                                        <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.2rem' }}>
                                            🎵 Wunsch: {deckTrack.requestLabel}
                                        </p>
                                    )}
                                    {deckTrack.file_path ? (
                                        <audio
                                            key={deckTrack.file_path}
                                            ref={audioRef}
                                            src={`${API}/uploads/${deckTrack.file_path}`}
                                            onEnded={() => onDeckEnded(deck)}
                                            controls
                                            style={{ width: '100%', marginTop: '1rem' }}
                                        />
                                    ) : (
                                        <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                                            ⚠️ Kein Audio – manueller Wunsch
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p style={{ color: 'var(--text-dim)', padding: '2rem', textAlign: 'center' }}>Deck leer</p>
                            )}
                        </div>
                    );
                })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
                {/* Left: Upload + Library */}
                <div className="flex flex-col gap-1">
                    <div className="glass-card">
                        <h4><Upload size={18} /> Musik hochladen</h4>
                        <form onSubmit={handleUpload}>
                            <input type="text" placeholder="Song Titel" value={uploadData.title}
                                onChange={e => setUploadData({ ...uploadData, title: e.target.value })} required />
                            <input type="text" placeholder="Künstler" value={uploadData.artist}
                                onChange={e => setUploadData({ ...uploadData, artist: e.target.value })} required />
                            <div style={{ marginBottom: '1rem' }}>
                                <small style={{ color: 'var(--text-dim)' }}>MP3 Datei:</small>
                                <input type="file" accept="audio/*"
                                    onChange={e => setUploadData({ ...uploadData, audio: e.target.files[0] })} required />
                            </div>
                            <div style={{ marginBottom: '1rem' }}>
                                <small style={{ color: 'var(--text-dim)' }}>Cover Bild (optional):</small>
                                <input type="file" accept="image/*"
                                    onChange={e => setUploadData({ ...uploadData, cover: e.target.files[0] })} />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Hochladen</button>
                        </form>
                    </div>

                    <div className="glass-card" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        <h4><Music size={18} /> Bibliothek</h4>
                        {tracks.length === 0
                            ? <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '1rem' }}>Keine Tracks</p>
                            : tracks.map(t => (
                                <div key={t.id} className="flex justify-between items-center"
                                    style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--glass-border)' }}>
                                    <div className="flex gap-1 items-center">
                                        {t.cover_image
                                            ? <img src={`${API}/uploads/${t.cover_image}`} alt="cover"
                                                style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} />
                                            : <div style={{ width: '32px', height: '32px', background: 'var(--surface-alt)', borderRadius: '4px' }} />
                                        }
                                        <div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{t.title}</div>
                                            <small style={{ color: 'var(--text-dim)' }}>{t.artist}</small>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                                        <button onClick={() => addToQueue(t)} className="btn btn-outline" style={{ padding: '0.2rem 0.5rem' }}>Q</button>
                                        <button onClick={() => loadToDeck(t, 'A')} className="btn btn-outline" style={{ padding: '0.2rem 0.5rem' }}>A</button>
                                        <button onClick={() => loadToDeck(t, 'B')} className="btn btn-outline" style={{ padding: '0.2rem 0.5rem' }}>B</button>
                                        <button onClick={() => deleteTrack(t.id)} className="btn btn-outline"
                                            style={{ padding: '0.2rem 0.5rem', color: 'var(--error)' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>

                {/* Right: Queue + Requests */}
                <div className="flex flex-col gap-1">
                    <div className="glass-card">
                        <h4>Warteschlange</h4>
                        {queue.length === 0
                            ? <p style={{ color: 'var(--text-dim)', padding: '1rem' }}>Warteschlange ist leer</p>
                            : queue.map((t, i) => (
                                <div key={i} className="flex justify-between items-center"
                                    style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--glass-border)' }}>
                                    <div>
                                        <span style={{ fontSize: '0.85rem' }}>
                                            {i + 1}. <strong>{t.title}</strong>
                                            {t.artist && ` – ${t.artist}`}
                                        </span>
                                        {t.isRequest && (
                                            <div style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>
                                                🎵 Wunsch: {t.requestLabel || t.title}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                                        {t.file_path && (
                                            <>
                                                <button onClick={() => loadToDeck(t, 'A')} className="btn btn-outline" style={{ padding: '0.2rem 0.5rem' }}>A</button>
                                                <button onClick={() => loadToDeck(t, 'B')} className="btn btn-outline" style={{ padding: '0.2rem 0.5rem' }}>B</button>
                                            </>
                                        )}
                                        <button onClick={() => updateQueueServer(queue.filter((_, idx) => idx !== i))}
                                            className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', color: 'var(--error)' }}>✕</button>
                                    </div>
                                </div>
                            ))
                        }
                    </div>

                    <div className="glass-card">
                        <h4><MessageSquare size={18} /> Musikwünsche</h4>
                        {requests.length === 0
                            ? <p style={{ color: 'var(--text-dim)', padding: '1rem' }}>Keine Musikwünsche</p>
                            : requests.map(r => (
                                <div key={r.id} style={{
                                    padding: '0.8rem', background: 'var(--surface-alt)',
                                    borderRadius: '8px', marginBottom: '0.5rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                                            {r.cover_image && (
                                                <img src={`${API}/uploads/${r.cover_image}`} alt="cover"
                                                    style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }} />
                                            )}
                                            <div>
                                                {r.track_id ? (
                                                    <>
                                                        <strong>{r.title}</strong>
                                                        <br /><small style={{ color: 'var(--text-dim)' }}>{r.artist}</small>
                                                        <br /><small style={{ color: 'var(--primary)' }}>📚 In der Bibliothek</small>
                                                    </>
                                                ) : (
                                                    <>
                                                        <strong>{r.custom_track_name}</strong>
                                                        <br /><small style={{ color: 'var(--text-dim)' }}>Manueller Wunsch</small>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flexShrink: 0 }}>
                                            <button onClick={() => acceptRequest(r)} className="btn btn-primary"
                                                style={{ padding: '0.4rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <CheckCircle size={14} /> Annehmen
                                            </button>
                                            {!r.track_id && (
                                                <button
                                                    onClick={() => setCreateFromRequest({ request: r, audio: null, cover: null })}
                                                    className="btn btn-outline"
                                                    style={{ padding: '0.4rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--primary)' }}>
                                                    <Plus size={14} /> In Bibliothek
                                                </button>
                                            )}
                                            <button onClick={() => rejectRequest(r.id)} className="btn btn-outline"
                                                style={{ padding: '0.4rem 0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--error)' }}>
                                                <XCircle size={14} /> Ablehnen
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            </div>

            {/* Modal: Create library entry from a custom request */}
            {createFromRequest && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-card" style={{ width: '420px', padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1rem' }}>In Bibliothek aufnehmen</h3>
                        <p style={{ color: 'var(--text-dim)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                            Wunsch: <strong>{createFromRequest.request.custom_track_name}</strong>
                        </p>
                        <form onSubmit={handleCreateFromRequest}>
                            <small style={{ color: 'var(--text-dim)' }}>MP3 Datei *</small>
                            <input type="file" accept="audio/*" required
                                onChange={e => setCreateFromRequest(prev => ({ ...prev, audio: e.target.files[0] }))}
                                style={{ marginBottom: '1rem' }} />
                            <small style={{ color: 'var(--text-dim)' }}>Cover Bild (optional)</small>
                            <input type="file" accept="image/*"
                                onChange={e => setCreateFromRequest(prev => ({ ...prev, cover: e.target.files[0] }))}
                                style={{ marginBottom: '1.5rem' }} />
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
                                Der Song wird automatisch in die Bibliothek und Warteschlange aufgenommen.
                            </p>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Hochladen & Hinzufügen</button>
                                <button type="button" className="btn btn-outline"
                                    onClick={() => setCreateFromRequest(null)}>Abbrechen</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DjDashboard;
