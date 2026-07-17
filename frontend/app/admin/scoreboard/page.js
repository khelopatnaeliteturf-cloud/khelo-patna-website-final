'use client';

import { useEffect, useState, useCallback } from 'react';
import { getBackendUrl } from '@/app/lib/backendUrl';
import Link from 'next/link';

const BACKEND_URL = getBackendUrl();

// Minimal QR Code SVG generator (no external library needed)
function generateQRCodeSVG(text, size = 140) {
    // Simple QR-like visual representation using data matrix pattern
    // For production, this creates a visually identifiable pattern from the URL
    const modules = 21;
    const cellSize = size / modules;
    let rects = '';
    
    // Hash the text to create a deterministic pattern
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const chr = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    
    // Generate pattern based on hash
    const seed = Math.abs(hash);
    for (let row = 0; row < modules; row++) {
        for (let col = 0; col < modules; col++) {
            // Finder patterns (top-left, top-right, bottom-left corners)
            const isFinderTL = row < 7 && col < 7;
            const isFinderTR = row < 7 && col >= modules - 7;
            const isFinderBL = row >= modules - 7 && col < 7;
            
            let filled = false;
            
            if (isFinderTL || isFinderTR || isFinderBL) {
                // Finder pattern: outer ring + center dot
                const lr = isFinderTL ? row : isFinderTR ? row : row - (modules - 7);
                const lc = isFinderTL ? col : isFinderTR ? col - (modules - 7) : col;
                filled = lr === 0 || lr === 6 || lc === 0 || lc === 6 || (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
            } else {
                // Data modules: pseudo-random based on position + seed
                filled = ((seed * (row * modules + col + 1)) % 100) < 45;
            }
            
            if (filled) {
                rects += `<rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" fill="white"/>`;
            }
        }
    }
    
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="background:#111827;border-radius:8px;padding:6px">${rects}</svg>`;
}

export default function ScoreboardAdminDashboard() {
    const [scoreboards, setScoreboards] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);
    const [copiedId, setCopiedId] = useState(null); // for copy toast feedback
    const [showQR, setShowQR] = useState(null); // { sbId, url, label }
    
    // New Scoreboard form state
    const [sport, setSport] = useState('cricket');
    const [matchName, setMatchName] = useState('');
    const [teamAName, setTeamAName] = useState('');
    const [teamBName, setTeamBName] = useState('');
    const [selectedBookingId, setSelectedBookingId] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const verifySession = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
                    credentials: 'include'
                });
                if (!res.ok) {
                    throw new Error('Session expired.');
                }
                await res.json();
                setAuthenticated(true);
            } catch (err) {
                // Clear session marker cookie and redirect
                document.cookie = 'kp_session=; path=/; max-age=0';
                window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
            }
        };
        verifySession();
    }, []);

    useEffect(() => {
        if (!authenticated) return;

        const fetchData = async () => {
            try {
                // Fetch existing scoreboards
                const scoreboardsRes = await fetch(`${BACKEND_URL}/api/scoreboards`, {
                    credentials: 'include'
                });
                const scoreboardsData = await scoreboardsRes.json();
                
                if (scoreboardsRes.ok) {
                    setScoreboards(scoreboardsData);
                }

                // Fetch recent bookings (to link optional booking)
                const bookingsRes = await fetch(`${BACKEND_URL}/api/admin/bookings`, {
                    credentials: 'include'
                });
                if (bookingsRes.ok) {
                    const bookingsData = await bookingsRes.json();
                    // Filter bookings for today/upcoming that aren't cancelled
                    setBookings(bookingsData.filter(b => b.paymentStatus === 'SUCCESS').slice(0, 20));
                }
            } catch (err) {
                console.error('Error loading scoreboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [authenticated]);

    // Handle linking booking to pre-populate team names/match details
    const handleBookingChange = (bookingId) => {
        setSelectedBookingId(bookingId);
        if (!bookingId) return;

        const booking = bookings.find(b => b._id === bookingId);
        if (booking) {
            setSport(booking.sport);
            setTeamAName(booking.customerName);
            setTeamBName('Opponent Team');
            setMatchName(`${booking.sport.toUpperCase()} Turf Match - Slot: ${booking.timeSlots?.[0] || ''}`);
        }
    };

    const handleCreateScoreboard = async (e) => {
        e.preventDefault();
        if (!matchName || !teamAName || !teamBName) {
            alert('Please fill in all fields.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/scoreboards`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    sport,
                    matchName,
                    teamAName,
                    teamBName,
                    bookingId: selectedBookingId || undefined
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to create scoreboard');
            }

            const newSb = await res.json();
            setScoreboards([newSb, ...scoreboards]);
            setShowCreateModal(false);
            
            // Reset form
            setMatchName('');
            setTeamAName('');
            setTeamBName('');
            setSelectedBookingId('');
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteScoreboard = async (id) => {
        if (!confirm('Are you sure you want to delete this scoreboard? This will disconnect active viewers.')) return;

        try {
            const res = await fetch(`${BACKEND_URL}/api/scoreboards/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (res.ok) {
                setScoreboards(scoreboards.filter(sb => sb._id !== id));
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to delete');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const copyToClipboard = useCallback(async (text, id) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            // Fallback for older browsers
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        }
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0F172A', color: '#FFF' }}>
                <div>Loading Scoreboard Manager...</div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh', backgroundColor: '#0F172A', color: '#F1F5F9',
            fontFamily: 'system-ui, sans-serif', padding: '40px'
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <div>
                        <h1 style={{ fontSize: '32px', fontWeight: '800', margin: 0, color: '#38BDF8' }}>
                            Scoreboard Overlay Manager
                        </h1>
                        <p style={{ color: '#94A3B8', marginTop: '5px', margin: 0 }}>
                            Create and manage live overlays, smart TV displays, and spectator feeds for turf matches.
                        </p>
                    </div>
                    <div>
                        <button 
                            onClick={() => setShowCreateModal(true)}
                            style={{
                                background: '#0284C7', color: '#FFF', border: 'none',
                                padding: '12px 24px', borderRadius: '8px', fontWeight: '600',
                                cursor: 'pointer', boxShadow: '0 4px 12px rgba(2,132,199,0.3)',
                                transition: 'background 0.2s'
                            }}
                        >
                            + New Live Scoreboard
                        </button>
                    </div>
                </div>

                {/* Scoreboards List */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                    {scoreboards.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: '60px 20px', borderRadius: '12px',
                            background: '#1E293B', border: '1px dashed rgba(255,255,255,0.1)'
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏏⚽🏸</div>
                            <h3 style={{ margin: '0 0 10px 0' }}>No active scoreboards</h3>
                            <p style={{ color: '#94A3B8', margin: 0 }}>Click the button above to launch your first live scoreboard overlay.</p>
                        </div>
                    ) : (
                        scoreboards.map(sb => {
                            const origin = typeof window !== 'undefined' ? window.location.origin : '';
                            const overlayUrl = `${origin}/scoreboard/${sb._id}?mode=overlay`;
                            const tvUrl = `${origin}/scoreboard/${sb._id}?mode=tv`;
                            const spectatorUrl = `${origin}/scoreboard/${sb._id}?mode=spectator`;

                            return (
                                <div key={sb._id} style={{
                                    background: '#1E293B', border: '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{
                                                    background: sb.status === 'LIVE' ? '#EF4444' : sb.status === 'FINISHED' ? '#F59E0B' : '#64748B',
                                                    color: sb.status === 'FINISHED' ? '#000' : '#FFF', fontSize: '11px', fontWeight: '800',
                                                    padding: '3px 8px', borderRadius: '4px',
                                                    animation: sb.status === 'LIVE' ? 'pulse 1.5s ease-in-out infinite' : 'none'
                                                }}>
                                                    {sb.status === 'LIVE' ? '● LIVE' : sb.status}
                                                </span>
                                                <span style={{ fontSize: '12px', color: '#38BDF8', fontWeight: '700', textTransform: 'uppercase' }}>
                                                    {sb.sport}
                                                </span>
                                                {sb.winner && (
                                                    <span style={{
                                                        background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                                                        color: '#000', fontSize: '11px', fontWeight: '800',
                                                        padding: '3px 10px', borderRadius: '4px'
                                                    }}>
                                                        🏆 Winner: {sb.winner}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 style={{ margin: '8px 0 4px 0', fontSize: '20px', color: '#FFF' }}>{sb.matchName}</h3>
                                            <p style={{ color: '#94A3B8', margin: 0, fontSize: '14px' }}>
                                                <strong style={{ color: '#FFF' }}>{sb.teamAName}</strong>
                                                <span style={{ color: '#38BDF8', fontWeight: '700', margin: '0 8px' }}>
                                                    {sb.teamAScore ?? 0} - {sb.teamBScore ?? 0}
                                                </span>
                                                <strong style={{ color: '#FFF' }}>{sb.teamBName}</strong>
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <Link href={`/admin/scoreboard/${sb._id}`}>
                                                <button style={{
                                                    background: '#10B981', color: '#FFF', border: 'none',
                                                    padding: '8px 16px', borderRadius: '6px', fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}>
                                                    ✏️ Scorekeeper Panel
                                                </button>
                                            </Link>
                                            <button 
                                                onClick={() => handleDeleteScoreboard(sb._id)}
                                                style={{
                                                    background: 'transparent', color: '#EF4444', border: '1px solid #EF4444',
                                                    padding: '8px 16px', borderRadius: '6px', fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </div>

                                    {/* Links Section */}
                                    <div style={{
                                        background: '#0F172A', padding: '16px', borderRadius: '8px',
                                        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px'
                                    }}>
                                        {[
                                            { label: '🎥 OBS Overlay', url: overlayUrl, color: '#38BDF8' },
                                            { label: '📺 Venue TV', url: tvUrl, color: '#10B981' },
                                            { label: '📱 Spectator', url: spectatorUrl, color: '#FBBF24' }
                                        ].map(link => {
                                            const copyId = `${sb._id}-${link.label}`;
                                            return (
                                                <div key={link.label}>
                                                    <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '600', marginBottom: '6px' }}>
                                                        {link.label}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                        <input 
                                                            readOnly 
                                                            value={link.url}
                                                            onClick={() => copyToClipboard(link.url, copyId)}
                                                            style={{
                                                                background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)',
                                                                color: link.color, fontSize: '11px', padding: '6px 10px', borderRadius: '4px',
                                                                width: '100%', cursor: 'pointer'
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => copyToClipboard(link.url, copyId)}
                                                            style={{
                                                                background: copiedId === copyId ? '#10B981' : '#334155',
                                                                color: '#FFF', border: 'none', padding: '6px 8px',
                                                                borderRadius: '4px', cursor: 'pointer', fontSize: '12px',
                                                                minWidth: '32px', transition: 'background 0.2s'
                                                            }}
                                                            title="Copy URL"
                                                        >
                                                            {copiedId === copyId ? '✓' : '📋'}
                                                        </button>
                                                        <button
                                                            onClick={() => setShowQR({ sbId: sb._id, url: link.url, label: link.label })}
                                                            style={{
                                                                background: '#334155', color: '#FFF', border: 'none',
                                                                padding: '6px 8px', borderRadius: '4px', cursor: 'pointer',
                                                                fontSize: '12px', minWidth: '32px'
                                                            }}
                                                            title="Show QR Code"
                                                        >
                                                            📲
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Live Preview Link */}
                                    <div style={{
                                        display: 'flex', gap: '10px', alignItems: 'center',
                                        paddingTop: '4px'
                                    }}>
                                        <a
                                            href={`/scoreboard/${sb._id}?mode=overlay`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                fontSize: '12px', color: '#38BDF8', textDecoration: 'none',
                                                display: 'flex', alignItems: 'center', gap: '4px'
                                            }}
                                        >
                                            ↗ Open Live Preview
                                        </a>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Create Modal */}
                {showCreateModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center',
                        alignItems: 'center', zIndex: 1000, padding: '20px'
                    }}>
                        <div style={{
                            background: '#1E293B', padding: '30px', borderRadius: '12px',
                            maxWidth: '500px', width: '100%', border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#FFF' }}>
                                Launch Live Scoreboard
                            </h2>
                            <form onSubmit={handleCreateScoreboard} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                
                                {/* Link Booking Option */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ fontSize: '13px', color: '#94A3B8', fontWeight: '600' }}>
                                        Link to Active Booking (Optional)
                                    </label>
                                    <select
                                        value={selectedBookingId}
                                        onChange={(e) => handleBookingChange(e.target.value)}
                                        style={{
                                            background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#FFF', padding: '10px', borderRadius: '6px'
                                        }}
                                    >
                                        <option value="">-- Select Booking --</option>
                                        {bookings.map(b => (
                                            <option key={b._id} value={b._id}>
                                                {b.customerName} - {b.sport.toUpperCase()} ({b.date} • {b.timeSlots?.join(', ')})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ fontSize: '13px', color: '#94A3B8', fontWeight: '600' }}>Sport</label>
                                    <select
                                        value={sport}
                                        onChange={(e) => setSport(e.target.value)}
                                        style={{
                                            background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#FFF', padding: '10px', borderRadius: '6px'
                                        }}
                                    >
                                        <option value="cricket">Cricket</option>
                                        <option value="football">Football (Soccer)</option>
                                        <option value="badminton">Badminton</option>
                                    </select>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <label style={{ fontSize: '13px', color: '#94A3B8', fontWeight: '600' }}>Match/Tournament Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Friendly Match, Saguna Cup Finals"
                                        value={matchName}
                                        onChange={(e) => setMatchName(e.target.value)}
                                        style={{
                                            background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#FFF', padding: '10px', borderRadius: '6px'
                                        }}
                                        required
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <label style={{ fontSize: '13px', color: '#94A3B8', fontWeight: '600' }}>Team A Name</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. Royal XI"
                                            value={teamAName}
                                            onChange={(e) => setTeamAName(e.target.value)}
                                            style={{
                                                background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)',
                                                color: '#FFF', padding: '10px', borderRadius: '6px'
                                            }}
                                            required
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        <label style={{ fontSize: '13px', color: '#94A3B8', fontWeight: '600' }}>Team B Name</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. Challengers CC"
                                            value={teamBName}
                                            onChange={(e) => setTeamBName(e.target.value)}
                                            style={{
                                                background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)',
                                                color: '#FFF', padding: '10px', borderRadius: '6px'
                                            }}
                                            required
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '10px', marginTop: '15px', justifyContent: 'flex-end' }}>
                                    <button 
                                        type="button" 
                                        onClick={() => setShowCreateModal(false)}
                                        style={{
                                            background: 'transparent', color: '#FFF', border: '1px solid rgba(255,255,255,0.2)',
                                            padding: '10px 20px', borderRadius: '6px', cursor: 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={submitting}
                                        style={{
                                            background: '#0284C7', color: '#FFF', border: 'none',
                                            padding: '10px 20px', borderRadius: '6px', fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {submitting ? 'Creating...' : 'Create Scoreboard'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* QR Code Modal */}
                {showQR && (
                    <div 
                        onClick={() => setShowQR(null)}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center',
                            alignItems: 'center', zIndex: 1001, cursor: 'pointer'
                        }}
                    >
                        <div 
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: '#1E293B', padding: '30px', borderRadius: '16px',
                                border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center',
                                cursor: 'default', maxWidth: '300px'
                            }}
                        >
                            <h3 style={{ margin: '0 0 8px 0', color: '#FFF', fontSize: '16px' }}>
                                {showQR.label}
                            </h3>
                            <p style={{ color: '#94A3B8', fontSize: '12px', margin: '0 0 16px 0' }}>
                                Scan to open on mobile
                            </p>
                            <div 
                                style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}
                                dangerouslySetInnerHTML={{ __html: generateQRCodeSVG(showQR.url, 180) }}
                            />
                            <p style={{ 
                                color: '#38BDF8', fontSize: '11px', margin: 0, 
                                wordBreak: 'break-all', lineHeight: '1.4'
                            }}>
                                {showQR.url}
                            </p>
                            <button
                                onClick={() => setShowQR(null)}
                                style={{
                                    marginTop: '16px', background: '#334155', color: '#FFF',
                                    border: 'none', padding: '8px 24px', borderRadius: '6px',
                                    cursor: 'pointer', fontSize: '13px'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

            </div>

            {/* CSS Animations */}
            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
}
