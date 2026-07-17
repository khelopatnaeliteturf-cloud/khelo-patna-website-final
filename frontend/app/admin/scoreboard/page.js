'use client';

import { useEffect, useState, useCallback } from 'react';
import { getBackendUrl } from '@/app/lib/backendUrl';
import Link from 'next/link';

const BACKEND_URL = getBackendUrl();

// ─── QR Code SVG Generator (preserved from original) ────────────────────────
function generateQRCodeSVG(text, size = 140) {
    const modules = 21;
    const cellSize = size / modules;
    let rects = '';
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const chr = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    const seed = Math.abs(hash);
    for (let row = 0; row < modules; row++) {
        for (let col = 0; col < modules; col++) {
            const isFinderTL = row < 7 && col < 7;
            const isFinderTR = row < 7 && col >= modules - 7;
            const isFinderBL = row >= modules - 7 && col < 7;
            let filled = false;
            if (isFinderTL || isFinderTR || isFinderBL) {
                const lr = isFinderTL ? row : isFinderTR ? row : row - (modules - 7);
                const lc = isFinderTL ? col : isFinderTR ? col - (modules - 7) : col;
                filled = lr === 0 || lr === 6 || lc === 0 || lc === 6 || (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
            } else {
                filled = ((seed * (row * modules + col + 1)) % 100) < 45;
            }
            if (filled) {
                rects += `<rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" fill="white"/>`;
            }
        }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="background:#111827;border-radius:8px;padding:6px">${rects}</svg>`;
}

// ─── Sport Config ────────────────────────────────────────────────────────────
const SPORT_CONFIG = {
    cricket: { icon: '🏏', color: '#10B981', label: 'Cricket' },
    football: { icon: '⚽', color: '#3B82F6', label: 'Football' },
    badminton: { icon: '🏸', color: '#F59E0B', label: 'Badminton' },
};

const CRICKET_FORMATS = [
    { key: 'T10', label: 'T10', overs: 10 },
    { key: 'T15', label: 'T15', overs: 15 },
    { key: 'T20', label: 'T20', overs: 20 },
    { key: 'custom', label: 'Custom', overs: null },
];

const FOOTBALL_FORMATS = [
    { key: '5v5', label: '5-a-side', halfMinutes: 20 },
    { key: '7v7', label: '7-a-side', halfMinutes: 30 },
    { key: '11v11', label: '11-a-side', halfMinutes: 45 },
    { key: 'custom', label: 'Custom', halfMinutes: null },
];

const BADMINTON_FORMATS = [
    { key: 'bo3', label: 'Best of 3' },
    { key: 'bo5', label: 'Best of 5' },
];

// ─── Tabs Config ─────────────────────────────────────────────────────────────
const TABS = [
    { key: 'live', label: '🔴 Live', emptyIcon: '📡', emptyMsg: 'No live matches right now. Create one to start streaming!' },
    { key: 'tournaments', label: '🏆 Tournaments', emptyIcon: '🏆', emptyMsg: 'No tournaments yet. Create your first tournament!' },
    { key: 'all', label: '📋 All Matches', emptyIcon: '📋', emptyMsg: 'No matches found. Create your first match!' },
    { key: 'history', label: '📊 History', emptyIcon: '🏅', emptyMsg: 'No completed matches yet.' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getSportAccent(sport) {
    return SPORT_CONFIG[sport]?.color || '#64748B';
}

function formatScore(sb) {
    const sport = (sb.sport || '').toLowerCase();
    if (sport === 'cricket') {
        const aScore = sb.teamAScore ?? 0;
        const aWickets = sb.teamAWickets ?? 0;
        const aOvers = sb.teamAOvers ?? '0.0';
        const bScore = sb.teamBScore ?? 0;
        const bWickets = sb.teamBWickets ?? 0;
        const bOvers = sb.teamBOvers ?? '0.0';
        return {
            teamA: `${aScore}/${aWickets}`,
            teamAExtra: `(${aOvers})`,
            teamB: `${bScore}/${bWickets}`,
            teamBExtra: `(${bOvers})`,
        };
    }
    if (sport === 'football') {
        const aScore = sb.teamAScore ?? 0;
        const bScore = sb.teamBScore ?? 0;
        const timer = sb.matchTimer || '';
        return {
            teamA: `${aScore}`,
            teamAExtra: '',
            teamB: `${bScore}`,
            teamBExtra: timer ? `⏱ ${timer}` : '',
            center: '—',
        };
    }
    if (sport === 'badminton') {
        const aScore = sb.teamAScore ?? 0;
        const bScore = sb.teamBScore ?? 0;
        const aSets = sb.teamASets ?? 0;
        const bSets = sb.teamBSets ?? 0;
        return {
            teamA: `${aScore}`,
            teamAExtra: '',
            teamB: `${bScore}`,
            teamBExtra: `(Sets: ${aSets}-${bSets})`,
            center: '-',
        };
    }
    // Generic fallback
    return {
        teamA: `${sb.teamAScore ?? 0}`,
        teamAExtra: '',
        teamB: `${sb.teamBScore ?? 0}`,
        teamBExtra: '',
        center: '-',
    };
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function ScoreboardAdminDashboard() {
    // ── Auth & data state ───
    const [authenticated, setAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [scoreboards, setScoreboards] = useState([]);
    const [tournaments, setTournaments] = useState([]);
    const [bookings, setBookings] = useState([]);

    // ── UI state ───
    const [activeTab, setActiveTab] = useState('live');
    const [copiedId, setCopiedId] = useState(null);
    const [showQR, setShowQR] = useState(null);
    const [expandedShare, setExpandedShare] = useState(null);
    const [hoveredCard, setHoveredCard] = useState(null);

    // ── Filter state (All Matches tab) ───
    const [sportFilter, setSportFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // ── Create Match Modal state ───
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [wizardData, setWizardData] = useState({
        matchType: '', // 'quick' or 'booking'
        sport: '',
        format: '',
        customOvers: 20,
        customMinutes: 30,
        teamAName: '',
        teamAColor: '#38BDF8',
        teamBName: '',
        teamBColor: '#EF4444',
        matchName: '',
        bookingId: '',
    });
    const [submitting, setSubmitting] = useState(false);

    // ── Tournament state ───
    const [showCreateTournament, setShowCreateTournament] = useState(false);
    const [tournamentForm, setTournamentForm] = useState({
        name: '',
        sport: 'cricket',
        format: 'group',
        teamInput: '',
        teams: [],
    });
    const [expandedTournament, setExpandedTournament] = useState(null);
    const [creatingTournament, setCreatingTournament] = useState(false);

    // ────────────────────────────────────────────────────────────────────────
    // AUTH (kept exactly as original)
    // ────────────────────────────────────────────────────────────────────────
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

    // ────────────────────────────────────────────────────────────────────────
    // DATA FETCH
    // ────────────────────────────────────────────────────────────────────────
    const fetchAllData = useCallback(async () => {
        try {
            const [sbRes, tRes, bRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/scoreboards`, { credentials: 'include' }),
                fetch(`${BACKEND_URL}/api/tournaments`, { credentials: 'include' }),
                fetch(`${BACKEND_URL}/api/admin/bookings`, { credentials: 'include' }),
            ]);

            if (sbRes.ok) {
                const sbData = await sbRes.json();
                setScoreboards(Array.isArray(sbData) ? sbData : []);
            }
            if (tRes.ok) {
                const tData = await tRes.json();
                setTournaments(Array.isArray(tData) ? tData : []);
            }
            if (bRes.ok) {
                const bData = await bRes.json();
                setBookings(
                    Array.isArray(bData)
                        ? bData.filter(b => b.paymentStatus === 'SUCCESS').slice(0, 30)
                        : []
                );
            }
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!authenticated) return;
        fetchAllData();
    }, [authenticated, fetchAllData]);

    // ────────────────────────────────────────────────────────────────────────
    // COMPUTED DATA
    // ────────────────────────────────────────────────────────────────────────
    const liveMatches = scoreboards.filter(sb => sb.status === 'LIVE');
    const finishedMatches = scoreboards.filter(sb => sb.status === 'FINISHED');

    const filteredMatches = scoreboards.filter(sb => {
        if (sportFilter !== 'all' && (sb.sport || '').toLowerCase() !== sportFilter) return false;
        if (statusFilter !== 'all' && sb.status !== statusFilter.toUpperCase()) return false;
        return true;
    });

    const tabCounts = {
        live: liveMatches.length,
        tournaments: tournaments.length,
        all: scoreboards.length,
        history: finishedMatches.length,
    };

    // ────────────────────────────────────────────────────────────────────────
    // ACTIONS
    // ────────────────────────────────────────────────────────────────────────
    const copyToClipboard = useCallback(async (text, id) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
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

    const handleDeleteScoreboard = async (id) => {
        if (!confirm('Are you sure you want to delete this scoreboard? This will disconnect active viewers.')) return;
        try {
            const res = await fetch(`${BACKEND_URL}/api/scoreboards/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (res.ok) {
                setScoreboards(prev => prev.filter(sb => sb._id !== id));
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to delete');
            }
        } catch (err) {
            console.error(err);
        }
    };

    // ── Wizard helpers ───
    const openWizard = () => {
        setWizardStep(1);
        setWizardData({
            matchType: '', sport: '', format: '', customOvers: 20, customMinutes: 30,
            teamAName: '', teamAColor: '#38BDF8', teamBName: '', teamBColor: '#EF4444',
            matchName: '', bookingId: '',
        });
        setShowCreateModal(true);
    };

    const updateWizard = (field, value) => {
        setWizardData(prev => ({ ...prev, [field]: value }));
    };

    const handleBookingSelect = (bookingId) => {
        updateWizard('bookingId', bookingId);
        if (!bookingId) return;
        const booking = bookings.find(b => b._id === bookingId);
        if (booking) {
            updateWizard('sport', (booking.sport || 'cricket').toLowerCase());
            updateWizard('teamAName', booking.customerName || '');
            updateWizard('teamBName', 'Opponent Team');
            updateWizard('matchName', `${(booking.sport || 'Cricket').toUpperCase()} Turf Match - Slot: ${booking.timeSlots?.[0] || ''}`);
        }
    };

    const getFormatLabel = () => {
        const { sport, format, customOvers, customMinutes } = wizardData;
        if (sport === 'cricket') {
            if (format === 'custom') return `Custom (${customOvers} overs)`;
            const f = CRICKET_FORMATS.find(x => x.key === format);
            return f ? f.label : format;
        }
        if (sport === 'football') {
            if (format === 'custom') return `Custom (${customMinutes} min halves)`;
            const f = FOOTBALL_FORMATS.find(x => x.key === format);
            return f ? f.label : format;
        }
        if (sport === 'badminton') {
            const f = BADMINTON_FORMATS.find(x => x.key === format);
            return f ? f.label : format;
        }
        return format;
    };

    const autoMatchName = () => {
        const { teamAName, teamBName } = wizardData;
        if (teamAName && teamBName) return `${teamAName} vs ${teamBName}`;
        return '';
    };

    const handleCreateMatch = async () => {
        const { sport, format, teamAName, teamBName, matchName, bookingId, teamAColor, teamBColor, customOvers, customMinutes } = wizardData;
        if (!teamAName || !teamBName) {
            alert('Please fill in both team names.');
            return;
        }
        setSubmitting(true);
        try {
            const body = {
                sport,
                format,
                matchName: matchName || autoMatchName(),
                teamAName,
                teamBName,
                teamAColor,
                teamBColor,
                status: 'LIVE',
            };
            if (bookingId) body.bookingId = bookingId;
            if (sport === 'cricket' && format === 'custom') body.overs = customOvers;
            if (sport === 'football' && format === 'custom') body.halfMinutes = customMinutes;

            const res = await fetch(`${BACKEND_URL}/api/scoreboards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to create scoreboard');
            }
            const newSb = await res.json();
            setScoreboards(prev => [newSb, ...prev]);
            setShowCreateModal(false);
            setActiveTab('live');
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Tournament actions ───
    const addTeamToTournament = () => {
        const name = tournamentForm.teamInput.trim();
        if (!name) return;
        if (tournamentForm.teams.find(t => t.name.toLowerCase() === name.toLowerCase())) return;
        setTournamentForm(prev => ({
            ...prev,
            teamInput: '',
            teams: [...prev.teams, { name, shortName: '', color: getSportAccent(prev.sport), group: 'A' }],
        }));
    };

    const removeTeamFromTournament = (idx) => {
        setTournamentForm(prev => ({
            ...prev,
            teams: prev.teams.filter((_, i) => i !== idx),
        }));
    };

    const updateTeamField = (idx, field, value) => {
        setTournamentForm(prev => ({
            ...prev,
            teams: prev.teams.map((t, i) => i === idx ? { ...t, [field]: value } : t),
        }));
    };

    const handleCreateTournament = async () => {
        const { name, sport, format, teams } = tournamentForm;
        if (!name.trim() || teams.length < 2) {
            alert('Please provide a tournament name and at least 2 teams.');
            return;
        }
        setCreatingTournament(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/tournaments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: name.trim(), sport, format, teams }),
            });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to create tournament');
            }
            const newT = await res.json();
            setTournaments(prev => [newT, ...prev]);
            setShowCreateTournament(false);
            setTournamentForm({ name: '', sport: 'cricket', format: 'group', teamInput: '', teams: [] });
        } catch (err) {
            alert(err.message);
        } finally {
            setCreatingTournament(false);
        }
    };

    const handleDeleteTournament = async (id) => {
        if (!confirm('Delete this tournament? All associated matches will be removed.')) return;
        try {
            const res = await fetch(`${BACKEND_URL}/api/tournaments/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (res.ok) {
                setTournaments(prev => prev.filter(t => t._id !== id));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleGoLiveFixture = async (tournamentId, fixtureIndex) => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/tournaments/${tournamentId}/create-match/${fixtureIndex}`, {
                method: 'POST',
                credentials: 'include',
            });
            if (res.ok) {
                await fetchAllData();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create match');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleGenerateFixtures = async (tournamentId) => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/tournaments/${tournamentId}/generate-fixtures`, {
                method: 'POST',
                credentials: 'include',
            });
            if (res.ok) {
                await fetchAllData();
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to generate fixtures');
            }
        } catch (err) {
            console.error(err);
        }
    };

    // ────────────────────────────────────────────────────────────────────────
    // LOADING STATE
    // ────────────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                height: '100vh', background: '#0B0F19', color: '#F1F5F9',
                fontFamily: "'Inter', sans-serif",
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', animation: 'pulse 1.5s ease-in-out infinite' }}>🏏</div>
                    <div style={{ fontSize: '16px', fontWeight: 500, color: '#94A3B8' }}>Loading Match Control Center…</div>
                </div>
                <style jsx>{`
                    @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');
                    @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.1)} }
                `}</style>
            </div>
        );
    }

    // ────────────────────────────────────────────────────────────────────────
    // SUB-RENDERERS
    // ────────────────────────────────────────────────────────────────────────

    // ── Status Badge ───
    const renderStatusBadge = (status, winner) => {
        const isLive = status === 'LIVE';
        const isFinished = status === 'FINISHED';
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: isLive ? 'rgba(239,68,68,0.2)' : isFinished ? 'rgba(245,158,11,0.15)' : 'rgba(100,116,139,0.2)',
                color: isLive ? '#EF4444' : isFinished ? '#F59E0B' : '#94A3B8',
                fontSize: '11px', fontWeight: 800, padding: '3px 10px', borderRadius: '20px',
                textTransform: 'uppercase', letterSpacing: '0.5px',
                animation: isLive ? 'livePulse 2s ease-in-out infinite' : 'none',
            }}>
                {isLive && <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444', animation: 'dotPulse 1s ease-in-out infinite' }} />}
                {isLive ? 'LIVE' : isFinished ? (winner ? `🏆 ${winner}` : 'FINISHED') : status || 'UPCOMING'}
            </span>
        );
    };

    // ── Score Display ───
    const renderScoreBlock = (sb) => {
        const scores = formatScore(sb);
        const isLive = sb.status === 'LIVE';

        return (
            <div style={{
                margin: '16px 0 16px',
                padding: '12px 14px',
                background: 'rgba(15, 23, 42, 0.4)',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                {/* Team A */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: sb.teamAColor || '#38BDF8',
                            boxShadow: `0 0 6px ${sb.teamAColor || '#38BDF8'}`
                        }} />
                        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '14px', color: '#CBD5E1' }}>
                            {sb.teamAName || 'Team A'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                            fontFamily: "'Oswald', sans-serif",
                            fontWeight: 700,
                            fontSize: '22px',
                            color: isLive ? '#38BDF8' : '#F1F5F9',
                            letterSpacing: '0.5px'
                        }}>
                            {scores.teamA}
                        </span>
                        {scores.teamAExtra && (
                            <span style={{ fontSize: '11px', color: '#64748B', fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
                                {scores.teamAExtra}
                            </span>
                        )}
                    </div>
                </div>

                {/* Subtle Divider */}
                <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.05)' }} />

                {/* Team B */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: sb.teamBColor || '#EF4444',
                            boxShadow: `0 0 6px ${sb.teamBColor || '#EF4444'}`
                        }} />
                        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '14px', color: '#CBD5E1' }}>
                            {sb.teamBName || 'Team B'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                            fontFamily: "'Oswald', sans-serif",
                            fontWeight: 700,
                            fontSize: '22px',
                            color: isLive ? '#38BDF8' : '#F1F5F9',
                            letterSpacing: '0.5px'
                        }}>
                            {scores.teamB}
                        </span>
                        {scores.teamBExtra && (
                            <span style={{ fontSize: '11px', color: '#64748B', fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
                                {scores.teamBExtra}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ── Share Section ───
    const renderShareSection = (sb) => {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const overlayUrl = `${origin}/scoreboard/${sb._id}?mode=overlay`;
        const tvUrl = `${origin}/scoreboard/${sb._id}?mode=tv`;
        const spectatorUrl = `${origin}/scoreboard/${sb._id}?mode=spectator`;
        const isExpanded = expandedShare === sb._id;
        const links = [
            { label: '🎥 OBS Overlay', url: overlayUrl, color: '#38BDF8', glow: 'rgba(56, 189, 248, 0.15)' },
            { label: '📺 Venue TV', url: tvUrl, color: '#10B981', glow: 'rgba(16, 185, 129, 0.15)' },
            { label: '📱 Spectator', url: spectatorUrl, color: '#FBBF24', glow: 'rgba(251, 191, 36, 0.15)' },
        ];

        return (
            <>
                {isExpanded && (
                    <div style={{
                        background: 'rgba(9, 13, 22, 0.95)',
                        padding: '16px',
                        borderRadius: '12px',
                        marginTop: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        border: '1px solid rgba(56, 189, 248, 0.18)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: '#64748B',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            paddingBottom: '6px',
                            marginBottom: '2px'
                        }}>
                            Broadcast Feed URLs
                        </div>
                        {links.map(link => {
                            const copyId = `${sb._id}-${link.label}`;
                            return (
                                <div key={link.label} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px'
                                }}>
                                    <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: link.color, boxShadow: `0 0 6px ${link.color}` }} />
                                        {link.label}
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <input
                                            readOnly
                                            value={link.url}
                                            onClick={() => copyToClipboard(link.url, copyId)}
                                            style={{
                                                background: 'rgba(15, 23, 42, 0.8)',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                                color: '#CBD5E1',
                                                fontSize: '11px',
                                                padding: '8px 10px',
                                                borderRadius: '8px',
                                                width: '100%',
                                                cursor: 'pointer',
                                                outline: 'none',
                                                fontFamily: "'Fira Code', 'Courier New', monospace",
                                                transition: 'border 0.2s',
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = link.color}
                                            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.06)'}
                                        />
                                        <button
                                            onClick={() => copyToClipboard(link.url, copyId)}
                                            style={{
                                                background: copiedId === copyId ? '#10B981' : 'rgba(51,65,85,0.4)',
                                                color: '#FFF',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                minWidth: '38px',
                                                transition: 'all 0.2s',
                                                fontWeight: 600
                                            }}
                                            title="Copy URL"
                                        >
                                            {copiedId === copyId ? '✓' : '📋'}
                                        </button>
                                        <button
                                            onClick={() => setShowQR({ sbId: sb._id, url: link.url, label: link.label })}
                                            style={{
                                                background: 'rgba(51,65,85,0.4)',
                                                color: '#FFF',
                                                border: '1px solid rgba(255,255,255,0.06)',
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                minWidth: '38px',
                                                transition: 'all 0.2s'
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
                )}
            </>
        );
    };

    // ── Match Card ───
    const renderMatchCard = (sb) => {
        const sport = (sb.sport || '').toLowerCase();
        const sportConf = SPORT_CONFIG[sport] || { icon: '🎯', color: '#64748B', label: sb.sport || 'Sport' };
        const isHovered = hoveredCard === sb._id;
        const isLive = sb.status === 'LIVE';

        return (
            <div
                key={sb._id}
                onMouseEnter={() => setHoveredCard(sb._id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                    background: 'linear-gradient(145deg, rgba(26, 36, 56, 0.7) 0%, rgba(13, 19, 33, 0.85) 100%)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: isHovered ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
                    borderLeft: `4px solid ${sportConf.color}`,
                    borderRadius: '16px',
                    padding: '22px 20px',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
                    boxShadow: isHovered 
                        ? `0 12px 30px rgba(0, 0, 0, 0.4), 0 0 16px ${sportConf.color}15` 
                        : '0 4px 16px rgba(0, 0, 0, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                }}
            >
                <div>
                    {/* Top row: status + sport + format */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        {renderStatusBadge(sb.status, sb.winner)}
                        <span style={{
                            fontSize: '10px', fontWeight: 800, color: sportConf.color,
                            textTransform: 'uppercase', letterSpacing: '1px',
                            background: `${sportConf.color}10`,
                            padding: '3px 8px', borderRadius: '6px',
                            display: 'flex', alignItems: 'center', gap: '4px'
                        }}>
                            <span>{sportConf.icon}</span> <span>{sportConf.label}</span>
                        </span>
                        {sb.format && (
                            <span style={{
                                fontSize: '10px', fontWeight: 600, color: '#94A3B8',
                                background: 'rgba(255, 255, 255, 0.05)', padding: '3px 8px', borderRadius: '6px',
                            }}>
                                {sb.format}
                            </span>
                        )}
                        {sb.matchType === 'tournament' && (
                            <span style={{
                                fontSize: '10px', fontWeight: 800, color: '#FBBF24',
                                background: 'rgba(251, 191, 36, 0.1)', padding: '3px 8px', borderRadius: '6px',
                                border: '1px solid rgba(251, 191, 36, 0.15)'
                            }}>
                                🏆 Tournament
                            </span>
                        )}
                    </div>

                    {/* Match name */}
                    <div style={{
                        fontSize: '13px', color: '#64748B', fontWeight: 500, margin: '4px 0 0',
                    }}>
                        {sb.matchName || `Match #${sb._id?.slice(-4)}`}
                        {sb.tournamentName && <span style={{ color: '#475569' }}> • {sb.tournamentName}</span>}
                    </div>

                    {/* Scores */}
                    {renderScoreBlock(sb)}
                </div>

                <div>
                    {/* Action row */}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                        <Link href={`/admin/scoreboard/${sb._id}`} style={{ textDecoration: 'none' }}>
                            <button style={{
                                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '8px',
                                fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                                transition: 'all 0.2s',
                            }}
                            className="hover-bright"
                            >
                                ✏️ Scorekeeper
                            </button>
                        </Link>
                        <button
                            onClick={() => setExpandedShare(expandedShare === sb._id ? null : sb._id)}
                            style={{
                                background: expandedShare === sb._id ? 'rgba(56,189,248,0.18)' : 'rgba(255,255,255,0.04)',
                                color: expandedShare === sb._id ? '#38BDF8' : '#94A3B8',
                                border: '1px solid ' + (expandedShare === sb._id ? 'rgba(56,189,248,0.35)' : 'rgba(255,255,255,0.08)'),
                                padding: '8px 16px', borderRadius: '8px', fontWeight: 600, fontSize: '12px',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                transition: 'all 0.2s',
                            }}
                        >
                            🔗 Share
                        </button>
                        <button
                            onClick={() => handleDeleteScoreboard(sb._id)}
                            style={{
                                background: 'transparent', color: '#EF4444',
                                border: '1px solid rgba(239,68,68,0.25)',
                                padding: '8px 12px', borderRadius: '8px', fontWeight: 600, fontSize: '12px',
                                cursor: 'pointer', marginLeft: 'auto',
                                transition: 'all 0.2s',
                            }}
                            className="hover-danger-bg"
                        >
                            🗑️
                        </button>
                    </div>

                    {/* Share URLs (expandable) */}
                    {renderShareSection(sb)}
                </div>
            </div>
        );
    };

    // ── Empty State ───
    const renderEmptyState = (tab) => {
        const cfg = TABS.find(t => t.key === tab);
        return (
            <div style={{
                textAlign: 'center', padding: '80px 20px', borderRadius: '16px',
                background: 'rgba(30,41,59,0.4)', border: '1px dashed rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
            }}>
                <div style={{ fontSize: '56px', marginBottom: '16px' }}>{cfg?.emptyIcon || '📋'}</div>
                <h3 style={{ margin: '0 0 8px', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '18px', color: '#CBD5E1' }}>
                    {cfg?.emptyMsg || 'Nothing here yet.'}
                </h3>
                {tab === 'live' && (
                    <button
                        onClick={openWizard}
                        style={{
                            marginTop: '16px', background: 'linear-gradient(135deg, #0284C7, #0EA5E9)',
                            color: '#FFF', border: 'none', padding: '10px 24px', borderRadius: '10px',
                            fontWeight: 600, cursor: 'pointer', fontSize: '14px',
                        }}
                    >
                        + Create First Match
                    </button>
                )}
            </div>
        );
    };

    // ── Tab Content ───
    const renderTabContent = () => {
        switch (activeTab) {
            case 'live':
                return liveMatches.length === 0 ? renderEmptyState('live') : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px' }}>
                        {liveMatches.map(sb => renderMatchCard(sb))}
                    </div>
                );

            case 'tournaments':
                return renderTournamentsTab();

            case 'all':
                return renderAllMatchesTab();

            case 'history':
                return finishedMatches.length === 0 ? renderEmptyState('history') : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px' }}>
                        {finishedMatches.map(sb => renderMatchCard(sb))}
                    </div>
                );

            default:
                return null;
        }
    };

    // ── All Matches Tab ───
    const renderAllMatchesTab = () => {
        const filterPillStyle = (active) => ({
            padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', border: 'none', transition: 'all 0.2s',
            background: active ? 'rgba(56,189,248,0.15)' : 'rgba(51,65,85,0.4)',
            color: active ? '#38BDF8' : '#94A3B8',
        });

        return (
            <div>
                {/* Filters */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, alignSelf: 'center', marginRight: '4px' }}>Sport:</span>
                    {['all', 'cricket', 'football', 'badminton'].map(s => (
                        <button key={s} onClick={() => setSportFilter(s)} style={filterPillStyle(sportFilter === s)}>
                            {s === 'all' ? 'All' : SPORT_CONFIG[s]?.icon + ' ' + SPORT_CONFIG[s]?.label}
                        </button>
                    ))}
                    <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)', margin: '0 8px' }} />
                    <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, alignSelf: 'center', marginRight: '4px' }}>Status:</span>
                    {['all', 'live', 'upcoming', 'finished'].map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)} style={filterPillStyle(statusFilter === s)}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>

                {filteredMatches.length === 0 ? renderEmptyState('all') : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px' }}>
                        {filteredMatches.map(sb => renderMatchCard(sb))}
                    </div>
                )}
            </div>
        );
    };

    // ── Tournaments Tab ───
    const renderTournamentsTab = () => (
        <div>
            {/* Create Tournament Toggle */}
            <button
                onClick={() => setShowCreateTournament(!showCreateTournament)}
                style={{
                    background: showCreateTournament ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg, #0284C7, #0EA5E9)',
                    color: showCreateTournament ? '#EF4444' : '#FFF',
                    border: showCreateTournament ? '1px solid rgba(239,68,68,0.3)' : 'none',
                    padding: '10px 24px', borderRadius: '10px', fontWeight: 600, cursor: 'pointer',
                    fontSize: '14px', marginBottom: '24px', transition: 'all 0.2s',
                }}
            >
                {showCreateTournament ? '✕ Cancel' : '+ Create Tournament'}
            </button>

            {/* Create Tournament Form */}
            {showCreateTournament && (
                <div style={{
                    background: 'rgba(30,41,59,0.7)', backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px',
                    padding: '24px', marginBottom: '24px',
                }}>
                    <h3 style={{ margin: '0 0 20px', fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: '20px', color: '#F1F5F9' }}>
                        🏆 New Tournament
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        {/* Name */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>Tournament Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Saguna Premier League"
                                value={tournamentForm.name}
                                onChange={e => setTournamentForm(prev => ({ ...prev, name: e.target.value }))}
                                style={{
                                    background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#FFF', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none',
                                }}
                            />
                        </div>
                        {/* Sport */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>Sport</label>
                            <select
                                value={tournamentForm.sport}
                                onChange={e => setTournamentForm(prev => ({ ...prev, sport: e.target.value }))}
                                style={{
                                    background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#FFF', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none',
                                }}
                            >
                                <option value="cricket">🏏 Cricket</option>
                                <option value="football">⚽ Football</option>
                                <option value="badminton">🏸 Badminton</option>
                            </select>
                        </div>
                        {/* Format */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>Format</label>
                            <select
                                value={tournamentForm.format}
                                onChange={e => setTournamentForm(prev => ({ ...prev, format: e.target.value }))}
                                style={{
                                    background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#FFF', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none',
                                }}
                            >
                                <option value="group">Group Stage</option>
                                <option value="knockout">Knockout</option>
                                <option value="group+knockout">Group + Knockout</option>
                            </select>
                        </div>
                    </div>

                    {/* Add Teams */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                            Teams ({tournamentForm.teams.length})
                        </label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            <input
                                type="text"
                                placeholder="Team name"
                                value={tournamentForm.teamInput}
                                onChange={e => setTournamentForm(prev => ({ ...prev, teamInput: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTeamToTournament(); } }}
                                style={{
                                    flex: 1, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#FFF', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none',
                                }}
                            />
                            <button
                                type="button"
                                onClick={addTeamToTournament}
                                style={{
                                    background: '#0284C7', color: '#FFF', border: 'none',
                                    padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px',
                                }}
                            >
                                + Add
                            </button>
                        </div>

                        {/* Team list */}
                        {tournamentForm.teams.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {tournamentForm.teams.map((team, idx) => (
                                    <div key={idx} style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        background: 'rgba(15,23,42,0.5)', padding: '8px 12px', borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.04)',
                                    }}>
                                        <span style={{ fontSize: '13px', color: '#CBD5E1', fontWeight: 600, minWidth: '24px' }}>
                                            {idx + 1}.
                                        </span>
                                        <span style={{ flex: 1, fontSize: '13px', color: '#F1F5F9', fontWeight: 500 }}>
                                            {team.name}
                                        </span>
                                        <input
                                            type="text"
                                            placeholder="Short"
                                            value={team.shortName}
                                            onChange={e => updateTeamField(idx, 'shortName', e.target.value)}
                                            style={{
                                                width: '60px', background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.08)',
                                                color: '#FFF', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', outline: 'none',
                                            }}
                                        />
                                        <input
                                            type="color"
                                            value={team.color}
                                            onChange={e => updateTeamField(idx, 'color', e.target.value)}
                                            style={{ width: '30px', height: '30px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}
                                        />
                                        {(tournamentForm.format === 'group' || tournamentForm.format === 'group+knockout') && (
                                            <select
                                                value={team.group}
                                                onChange={e => updateTeamField(idx, 'group', e.target.value)}
                                                style={{
                                                    background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.08)',
                                                    color: '#FFF', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', outline: 'none',
                                                }}
                                            >
                                                {['A', 'B', 'C', 'D'].map(g => (
                                                    <option key={g} value={g}>Group {g}</option>
                                                ))}
                                            </select>
                                        )}
                                        <button
                                            onClick={() => removeTeamFromTournament(idx)}
                                            style={{
                                                background: 'transparent', border: 'none', color: '#EF4444',
                                                cursor: 'pointer', fontSize: '16px', padding: '2px 6px',
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Create Button */}
                    <button
                        onClick={handleCreateTournament}
                        disabled={creatingTournament || tournamentForm.teams.length < 2 || !tournamentForm.name.trim()}
                        style={{
                            background: (creatingTournament || tournamentForm.teams.length < 2 || !tournamentForm.name.trim())
                                ? '#334155' : 'linear-gradient(135deg, #0284C7, #0EA5E9)',
                            color: '#FFF', border: 'none', padding: '12px 28px', borderRadius: '10px',
                            fontWeight: 700, cursor: (creatingTournament || tournamentForm.teams.length < 2) ? 'not-allowed' : 'pointer',
                            fontSize: '14px', transition: 'all 0.2s',
                        }}
                    >
                        {creatingTournament ? 'Creating...' : '🏆 Create Tournament'}
                    </button>
                </div>
            )}

            {/* Tournament Cards */}
            {tournaments.length === 0 && !showCreateTournament ? renderEmptyState('tournaments') : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {tournaments.map(t => renderTournamentCard(t))}
                </div>
            )}
        </div>
    );

    // ── Tournament Card ───
    const renderTournamentCard = (t) => {
        const sport = (t.sport || '').toLowerCase();
        const sportConf = SPORT_CONFIG[sport] || { icon: '🎯', color: '#64748B', label: t.sport || 'Sport' };
        const isExpanded = expandedTournament === t._id;
        const fixtures = t.fixtures || [];
        const teams = t.teams || [];
        const playedCount = fixtures.filter(f => f.status === 'FINISHED' || f.status === 'LIVE').length;
        const pointsTable = t.pointsTable || [];

        return (
            <div key={t._id} style={{
                background: 'rgba(30,41,59,0.7)', backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${sportConf.color}`,
                borderRadius: '16px', padding: '24px',
                transition: 'box-shadow 0.2s',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h3 style={{
                            margin: '0 0 6px', fontFamily: "'Oswald', sans-serif", fontWeight: 700,
                            fontSize: '22px', color: '#F1F5F9',
                        }}>
                            🏆 {t.name || 'Unnamed Tournament'}
                        </h3>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{
                                fontSize: '11px', fontWeight: 700, color: sportConf.color,
                                textTransform: 'uppercase', letterSpacing: '0.5px',
                            }}>
                                {sportConf.icon} {sportConf.label}
                            </span>
                            {t.format && (
                                <span style={{
                                    fontSize: '11px', fontWeight: 600, color: '#94A3B8',
                                    background: 'rgba(100,116,139,0.15)', padding: '2px 10px', borderRadius: '10px',
                                }}>
                                    {t.format}
                                </span>
                            )}
                            <span style={{
                                fontSize: '11px', fontWeight: 700,
                                color: t.status === 'ONGOING' ? '#10B981' : t.status === 'COMPLETED' ? '#F59E0B' : '#94A3B8',
                                background: t.status === 'ONGOING' ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                                padding: '2px 10px', borderRadius: '10px',
                            }}>
                                {t.status || 'DRAFT'}
                            </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8' }}>
                            {teams.length} Teams • {fixtures.length} Matches ({playedCount} played)
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setExpandedTournament(isExpanded ? null : t._id)}
                            style={{
                                background: isExpanded ? 'rgba(56,189,248,0.15)' : 'rgba(51,65,85,0.5)',
                                color: isExpanded ? '#38BDF8' : '#CBD5E1',
                                border: '1px solid ' + (isExpanded ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.08)'),
                                padding: '8px 16px', borderRadius: '8px', fontWeight: 600,
                                fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s',
                            }}
                        >
                            📋 {isExpanded ? 'Hide' : 'View'} Fixtures
                        </button>
                        {(!fixtures || fixtures.length === 0) && (
                            <button
                                onClick={() => handleGenerateFixtures(t._id)}
                                style={{
                                    background: 'linear-gradient(135deg, #059669, #10B981)',
                                    color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '8px',
                                    fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                                }}
                            >
                                ⚙️ Generate Fixtures
                            </button>
                        )}
                        <button
                            onClick={() => handleDeleteTournament(t._id)}
                            style={{
                                background: 'transparent', color: '#EF4444',
                                border: '1px solid rgba(239,68,68,0.3)',
                                padding: '8px 16px', borderRadius: '8px', fontWeight: 600,
                                fontSize: '12px', cursor: 'pointer',
                            }}
                        >
                            🗑️ Delete
                        </button>
                    </div>
                </div>

                {/* Points table (top 3) */}
                {pointsTable.length > 0 && (
                    <div style={{
                        marginTop: '16px', background: 'rgba(15,23,42,0.5)', borderRadius: '10px',
                        padding: '12px 16px', border: '1px solid rgba(255,255,255,0.04)',
                    }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Points Table
                        </div>
                        {pointsTable.slice(0, 3).map((entry, idx) => (
                            <div key={idx} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '4px 0', borderBottom: idx < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                            }}>
                                <span style={{ fontSize: '13px', color: '#F1F5F9', fontWeight: 600 }}>
                                    <span style={{ color: '#64748B', marginRight: '8px' }}>{idx + 1}.</span>
                                    {entry.teamName || entry.team}
                                </span>
                                <div style={{ display: 'flex', gap: '16px' }}>
                                    <span style={{ fontSize: '13px', color: '#38BDF8', fontWeight: 700, fontFamily: "'Oswald', sans-serif" }}>
                                        {entry.points ?? 0} pts
                                    </span>
                                    {entry.nrr !== undefined && (
                                        <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                                            NRR {entry.nrr >= 0 ? '+' : ''}{Number(entry.nrr).toFixed(1)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Expanded Fixtures */}
                {isExpanded && (
                    <div style={{
                        marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px',
                    }}>
                        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                            All Fixtures ({fixtures.length})
                        </div>
                        {fixtures.length === 0 ? (
                            <p style={{ color: '#64748B', fontSize: '13px', margin: 0 }}>No fixtures generated yet. Click "Generate Fixtures" above.</p>
                        ) : (
                            fixtures.map((fix, idx) => (
                                <div key={idx} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    background: 'rgba(15,23,42,0.5)', padding: '10px 14px', borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.04)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, minWidth: '50px' }}>
                                            Match {idx + 1}
                                        </span>
                                        <span style={{ fontSize: '13px', color: '#F1F5F9', fontWeight: 500 }}>
                                            {fix.teamA || 'TBD'} <span style={{ color: '#64748B' }}>vs</span> {fix.teamB || 'TBD'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {fix.result && (
                                            <span style={{ fontSize: '11px', color: '#94A3B8' }}>{fix.result}</span>
                                        )}
                                        {renderStatusBadge(fix.status)}
                                        {(fix.status === 'UPCOMING' || !fix.status) && (
                                            <button
                                                onClick={() => handleGoLiveFixture(t._id, idx)}
                                                style={{
                                                    background: 'rgba(239,68,68,0.15)', color: '#EF4444',
                                                    border: '1px solid rgba(239,68,68,0.3)',
                                                    padding: '4px 12px', borderRadius: '6px',
                                                    fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                                                }}
                                            >
                                                🔴 Go Live
                                            </button>
                                        )}
                                        {fix.status === 'LIVE' && fix.scoreboardId && (
                                            <Link href={`/admin/scoreboard/${fix.scoreboardId}`} style={{ textDecoration: 'none' }}>
                                                <button style={{
                                                    background: 'rgba(16,185,129,0.15)', color: '#10B981',
                                                    border: '1px solid rgba(16,185,129,0.3)',
                                                    padding: '4px 12px', borderRadius: '6px',
                                                    fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                                                }}>
                                                    ✏️ Scorekeeper
                                                </button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        );
    };

    // ── Wizard Modal ───
    const renderWizardModal = () => {
        if (!showCreateModal) return null;

        const stepIndicators = [1, 2, 3, 4];
        const stepLabels = ['Match Type', 'Sport & Format', 'Teams', 'Confirm'];

        return (
            <div
                onClick={() => setShowCreateModal(false)}
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center',
                    alignItems: 'flex-end', zIndex: 1000, padding: '0',
                    animation: 'fadeIn 0.2s ease-out',
                }}
            >
                <div
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: 'rgba(15,23,42,0.98)', backdropFilter: 'blur(20px)',
                        padding: '32px', borderRadius: '24px 24px 0 0',
                        maxWidth: '600px', width: '100%',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderBottom: 'none',
                        maxHeight: '90vh', overflowY: 'auto',
                        animation: 'slideUp 0.3s ease-out',
                    }}
                >
                    {/* Step indicator */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
                        {stepIndicators.map(s => (
                            <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '13px', fontWeight: 700,
                                    background: s === wizardStep ? 'linear-gradient(135deg, #0284C7, #0EA5E9)' : s < wizardStep ? '#10B981' : 'rgba(51,65,85,0.5)',
                                    color: '#FFF',
                                    transition: 'all 0.2s',
                                }}>
                                    {s < wizardStep ? '✓' : s}
                                </div>
                                <span style={{ fontSize: '10px', color: s === wizardStep ? '#38BDF8' : '#64748B', fontWeight: 600 }}>
                                    {stepLabels[s - 1]}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Step 1: Match Type */}
                    {wizardStep === 1 && (
                        <div>
                            <h2 style={{ margin: '0 0 8px', fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: '24px', color: '#F1F5F9' }}>
                                Choose Match Type
                            </h2>
                            <p style={{ color: '#64748B', fontSize: '13px', margin: '0 0 24px' }}>How would you like to set up this match?</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                {[
                                    { key: 'quick', icon: '⚡', label: 'Quick Match', desc: 'Create a standalone custom match' },
                                    { key: 'booking', icon: '📎', label: 'From Booking', desc: 'Pre-populate from a turf booking' },
                                ].map(opt => (
                                    <button
                                        key={opt.key}
                                        onClick={() => { updateWizard('matchType', opt.key); setWizardStep(2); }}
                                        style={{
                                            background: wizardData.matchType === opt.key ? 'rgba(56,189,248,0.1)' : 'rgba(30,41,59,0.6)',
                                            border: wizardData.matchType === opt.key ? '2px solid #38BDF8' : '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '14px', padding: '24px 20px', cursor: 'pointer',
                                            textAlign: 'left', transition: 'all 0.2s',
                                        }}
                                    >
                                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>{opt.icon}</div>
                                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#F1F5F9', marginBottom: '4px' }}>{opt.label}</div>
                                        <div style={{ fontSize: '12px', color: '#94A3B8' }}>{opt.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Sport & Format */}
                    {wizardStep === 2 && (
                        <div>
                            <h2 style={{ margin: '0 0 8px', fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: '24px', color: '#F1F5F9' }}>
                                Sport & Format
                            </h2>
                            <p style={{ color: '#64748B', fontSize: '13px', margin: '0 0 20px' }}>Select the sport and match format</p>

                            {/* Booking selector */}
                            {wizardData.matchType === 'booking' && (
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                                        Link to Booking
                                    </label>
                                    <select
                                        value={wizardData.bookingId}
                                        onChange={e => handleBookingSelect(e.target.value)}
                                        style={{
                                            width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#FFF', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', outline: 'none',
                                        }}
                                    >
                                        <option value="">-- Select Booking --</option>
                                        {bookings.map(b => (
                                            <option key={b._id} value={b._id}>
                                                {b.customerName} - {(b.sport || '').toUpperCase()} ({b.date} • {b.timeSlots?.join(', ')})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Sport Cards */}
                            <label style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Sport</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                {Object.entries(SPORT_CONFIG).map(([key, conf]) => (
                                    <button
                                        key={key}
                                        onClick={() => { updateWizard('sport', key); updateWizard('format', ''); }}
                                        style={{
                                            background: wizardData.sport === key ? `rgba(${key === 'cricket' ? '16,185,129' : key === 'football' ? '59,130,246' : '245,158,11'},0.12)` : 'rgba(30,41,59,0.6)',
                                            border: wizardData.sport === key ? `2px solid ${conf.color}` : '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '12px', padding: '16px', cursor: 'pointer',
                                            textAlign: 'center', transition: 'all 0.2s',
                                        }}
                                    >
                                        <div style={{ fontSize: '28px', marginBottom: '4px' }}>{conf.icon}</div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: wizardData.sport === key ? conf.color : '#CBD5E1' }}>
                                            {conf.label}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Format selector (depends on sport) */}
                            {wizardData.sport && (
                                <>
                                    <label style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Format</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                                        {(wizardData.sport === 'cricket' ? CRICKET_FORMATS :
                                          wizardData.sport === 'football' ? FOOTBALL_FORMATS :
                                          BADMINTON_FORMATS).map(f => (
                                            <button
                                                key={f.key}
                                                onClick={() => updateWizard('format', f.key)}
                                                style={{
                                                    background: wizardData.format === f.key ? 'rgba(56,189,248,0.15)' : 'rgba(30,41,59,0.6)',
                                                    color: wizardData.format === f.key ? '#38BDF8' : '#CBD5E1',
                                                    border: wizardData.format === f.key ? '2px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.08)',
                                                    padding: '8px 18px', borderRadius: '10px', fontWeight: 600,
                                                    fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
                                                }}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Custom inputs */}
                                    {wizardData.sport === 'cricket' && wizardData.format === 'custom' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                            <label style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>Overs:</label>
                                            <input
                                                type="number" min="1" max="50"
                                                value={wizardData.customOvers}
                                                onChange={e => updateWizard('customOvers', parseInt(e.target.value) || 20)}
                                                style={{
                                                    width: '80px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)',
                                                    color: '#FFF', padding: '8px 12px', borderRadius: '8px', fontSize: '14px', outline: 'none',
                                                    fontFamily: "'Oswald', sans-serif", fontWeight: 700,
                                                }}
                                            />
                                        </div>
                                    )}
                                    {wizardData.sport === 'football' && wizardData.format === 'custom' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                            <label style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600 }}>Half duration (min):</label>
                                            <input
                                                type="number" min="5" max="90"
                                                value={wizardData.customMinutes}
                                                onChange={e => updateWizard('customMinutes', parseInt(e.target.value) || 30)}
                                                style={{
                                                    width: '80px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)',
                                                    color: '#FFF', padding: '8px 12px', borderRadius: '8px', fontSize: '14px', outline: 'none',
                                                    fontFamily: "'Oswald', sans-serif", fontWeight: 700,
                                                }}
                                            />
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Nav */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                                <button onClick={() => setWizardStep(1)} style={{
                                    background: 'transparent', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.1)',
                                    padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                                }}>
                                    ← Back
                                </button>
                                <button
                                    onClick={() => { if (wizardData.sport && wizardData.format) setWizardStep(3); }}
                                    disabled={!wizardData.sport || !wizardData.format}
                                    style={{
                                        background: (!wizardData.sport || !wizardData.format) ? '#334155' : 'linear-gradient(135deg, #0284C7, #0EA5E9)',
                                        color: '#FFF', border: 'none', padding: '10px 24px', borderRadius: '8px',
                                        cursor: (!wizardData.sport || !wizardData.format) ? 'not-allowed' : 'pointer',
                                        fontWeight: 600, fontSize: '13px',
                                    }}
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Team Details */}
                    {wizardStep === 3 && (
                        <div>
                            <h2 style={{ margin: '0 0 8px', fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: '24px', color: '#F1F5F9' }}>
                                Team Details
                            </h2>
                            <p style={{ color: '#64748B', fontSize: '13px', margin: '0 0 20px' }}>Enter team names and pick colors</p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                {/* Team A */}
                                <div style={{
                                    background: 'rgba(30,41,59,0.6)', borderRadius: '12px', padding: '16px',
                                    border: `2px solid ${wizardData.teamAColor}30`,
                                }}>
                                    <label style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                                        Team A
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Royal XI"
                                        value={wizardData.teamAName}
                                        onChange={e => updateWizard('teamAName', e.target.value)}
                                        style={{
                                            width: '100%', boxSizing: 'border-box',
                                            background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#FFF', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', outline: 'none',
                                            marginBottom: '10px',
                                        }}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', color: '#94A3B8' }}>Color:</span>
                                        <input
                                            type="color"
                                            value={wizardData.teamAColor}
                                            onChange={e => updateWizard('teamAColor', e.target.value)}
                                            style={{ width: '36px', height: '36px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                                        />
                                        <div style={{
                                            width: '20px', height: '20px', borderRadius: '50%',
                                            background: wizardData.teamAColor, border: '2px solid rgba(255,255,255,0.2)',
                                        }} />
                                    </div>
                                </div>

                                {/* Team B */}
                                <div style={{
                                    background: 'rgba(30,41,59,0.6)', borderRadius: '12px', padding: '16px',
                                    border: `2px solid ${wizardData.teamBColor}30`,
                                }}>
                                    <label style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                                        Team B
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Challengers"
                                        value={wizardData.teamBName}
                                        onChange={e => updateWizard('teamBName', e.target.value)}
                                        style={{
                                            width: '100%', boxSizing: 'border-box',
                                            background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#FFF', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', outline: 'none',
                                            marginBottom: '10px',
                                        }}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '12px', color: '#94A3B8' }}>Color:</span>
                                        <input
                                            type="color"
                                            value={wizardData.teamBColor}
                                            onChange={e => updateWizard('teamBColor', e.target.value)}
                                            style={{ width: '36px', height: '36px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }}
                                        />
                                        <div style={{
                                            width: '20px', height: '20px', borderRadius: '50%',
                                            background: wizardData.teamBColor, border: '2px solid rgba(255,255,255,0.2)',
                                        }} />
                                    </div>
                                </div>
                            </div>

                            {/* Match name */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                                    Match Name
                                </label>
                                <input
                                    type="text"
                                    placeholder={autoMatchName() || 'e.g. Royal XI vs Challengers'}
                                    value={wizardData.matchName}
                                    onChange={e => updateWizard('matchName', e.target.value)}
                                    style={{
                                        width: '100%', boxSizing: 'border-box',
                                        background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#FFF', padding: '10px 12px', borderRadius: '8px', fontSize: '14px', outline: 'none',
                                    }}
                                />
                                {!wizardData.matchName && autoMatchName() && (
                                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                                        Auto: {autoMatchName()}
                                    </div>
                                )}
                            </div>

                            {/* Nav */}
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <button onClick={() => setWizardStep(2)} style={{
                                    background: 'transparent', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.1)',
                                    padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                                }}>
                                    ← Back
                                </button>
                                <button
                                    onClick={() => { if (wizardData.teamAName && wizardData.teamBName) setWizardStep(4); }}
                                    disabled={!wizardData.teamAName || !wizardData.teamBName}
                                    style={{
                                        background: (!wizardData.teamAName || !wizardData.teamBName) ? '#334155' : 'linear-gradient(135deg, #0284C7, #0EA5E9)',
                                        color: '#FFF', border: 'none', padding: '10px 24px', borderRadius: '8px',
                                        cursor: (!wizardData.teamAName || !wizardData.teamBName) ? 'not-allowed' : 'pointer',
                                        fontWeight: 600, fontSize: '13px',
                                    }}
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Confirm */}
                    {wizardStep === 4 && (
                        <div>
                            <h2 style={{ margin: '0 0 8px', fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: '24px', color: '#F1F5F9' }}>
                                Confirm & Launch
                            </h2>
                            <p style={{ color: '#64748B', fontSize: '13px', margin: '0 0 20px' }}>Review your match details before going live</p>

                            {/* Summary card */}
                            <div style={{
                                background: 'rgba(30,41,59,0.6)', borderRadius: '14px', padding: '20px',
                                border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px',
                            }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    {[
                                        { label: 'Match Type', value: wizardData.matchType === 'quick' ? '⚡ Quick Match' : '📎 From Booking' },
                                        { label: 'Sport', value: `${SPORT_CONFIG[wizardData.sport]?.icon || ''} ${SPORT_CONFIG[wizardData.sport]?.label || wizardData.sport}` },
                                        { label: 'Format', value: getFormatLabel() },
                                        { label: 'Match Name', value: wizardData.matchName || autoMatchName() || '-' },
                                    ].map((item, i) => (
                                        <div key={i}>
                                            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                                {item.label}
                                            </div>
                                            <div style={{ fontSize: '14px', color: '#F1F5F9', fontWeight: 600 }}>
                                                {item.value}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '16px 0' }} />

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: wizardData.teamAColor }} />
                                        <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: '20px', color: '#F1F5F9' }}>
                                            {wizardData.teamAName}
                                        </span>
                                    </div>
                                    <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: '18px', color: '#64748B' }}>VS</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: '20px', color: '#F1F5F9' }}>
                                            {wizardData.teamBName}
                                        </span>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: wizardData.teamBColor }} />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <button onClick={() => setWizardStep(3)} style={{
                                    background: 'transparent', color: '#94A3B8', border: '1px solid rgba(255,255,255,0.1)',
                                    padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                                }}>
                                    ← Back
                                </button>
                                <button
                                    onClick={handleCreateMatch}
                                    disabled={submitting}
                                    style={{
                                        background: submitting ? '#334155' : 'linear-gradient(135deg, #DC2626, #EF4444)',
                                        color: '#FFF', border: 'none', padding: '12px 28px', borderRadius: '10px',
                                        fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                                        fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px',
                                        boxShadow: submitting ? 'none' : '0 4px 20px rgba(239,68,68,0.3)',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {submitting ? 'Creating...' : '🔴 Create & Go Live'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ── QR Modal ───
    const renderQRModal = () => {
        if (!showQR) return null;
        return (
            <div
                onClick={() => setShowQR(null)}
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center',
                    alignItems: 'center', zIndex: 1001, cursor: 'pointer',
                    animation: 'fadeIn 0.2s ease-out',
                }}
            >
                <div
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: 'rgba(30,41,59,0.95)', backdropFilter: 'blur(20px)',
                        padding: '30px', borderRadius: '20px',
                        border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center',
                        cursor: 'default', maxWidth: '300px',
                    }}
                >
                    <h3 style={{ margin: '0 0 8px', color: '#F1F5F9', fontSize: '16px', fontWeight: 700 }}>
                        {showQR.label}
                    </h3>
                    <p style={{ color: '#94A3B8', fontSize: '12px', margin: '0 0 16px' }}>
                        Scan to open on mobile
                    </p>
                    <div
                        style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}
                        dangerouslySetInnerHTML={{ __html: generateQRCodeSVG(showQR.url, 180) }}
                    />
                    <p style={{
                        color: '#38BDF8', fontSize: '11px', margin: 0,
                        wordBreak: 'break-all', lineHeight: '1.4',
                    }}>
                        {showQR.url}
                    </p>
                    <button
                        onClick={() => setShowQR(null)}
                        style={{
                            marginTop: '16px', background: 'rgba(51,65,85,0.8)', color: '#FFF',
                            border: 'none', padding: '8px 24px', borderRadius: '8px',
                            cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    };

    // ────────────────────────────────────────────────────────────────────────
    // MAIN RENDER
    // ────────────────────────────────────────────────────────────────────────
    return (
        <div style={{
            minHeight: '100vh',
            background: 'radial-gradient(ellipse at top, rgba(14, 165, 233, 0.08) 0%, rgba(15, 23, 42, 0) 60%), #070B14',
            color: '#F1F5F9',
            fontFamily: "'Inter', sans-serif",
            padding: '36px 40px',
            position: 'relative',
        }}>
            {/* Ambient Background Glow */}
            <div style={{
                position: 'absolute', top: 0, left: '20%', right: '20%', height: '300px',
                background: 'radial-gradient(50% 50% at 50% 0%, rgba(56, 189, 248, 0.06) 0%, rgba(56, 189, 248, 0) 100%)',
                pointerEvents: 'none', zIndex: 0
            }} />

            <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

                {/* ── Header ─────────────────────────────────────── */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '32px', flexWrap: 'wrap', gap: '16px',
                }}>
                    <div>
                        <h1 style={{
                            fontSize: '32px',
                            fontFamily: "'Oswald', sans-serif",
                            fontWeight: 700,
                            margin: 0,
                            backgroundImage: 'linear-gradient(135deg, #FFFFFF 40%, #A5F3FC 100%)',
                            WebkitBackgroundClip: 'text',
                            backgroundClip: 'text',
                            color: 'transparent',
                            letterSpacing: '0.5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                        }}>
                            🏏 Match & Tournament Control Center
                        </h1>
                        <p style={{ fontSize: '14px', color: '#94A3B8', margin: '6px 0 0', fontWeight: 500 }}>
                            Host live scoreboards for streaming on YouTube, OBS, and TV
                        </p>
                    </div>
                    <button
                        onClick={openWizard}
                        style={{
                            background: 'linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)',
                            color: '#FFF', border: 'none', padding: '12px 26px', borderRadius: '10px',
                            fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                            boxShadow: '0 4px 20px rgba(56, 189, 248, 0.25)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'flex', alignItems: 'center', gap: '8px',
                        }}
                        className="btn-primary-glow"
                    >
                        + New Match
                    </button>
                </div>

                {/* ── Tab Bar ────────────────────────────────────── */}
                <div style={{
                    display: 'flex', gap: '8px', marginBottom: '32px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    padding: '6px',
                    borderRadius: '14px',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
                    overflowX: 'auto',
                    width: 'fit-content'
                }}>
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.key;
                        const count = tabCounts[tab.key] || 0;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                style={{
                                    background: isActive ? 'linear-gradient(180deg, rgba(56, 189, 248, 0.12) 0%, rgba(56, 189, 248, 0.02) 100%)' : 'transparent',
                                    color: isActive ? '#38BDF8' : '#94A3B8',
                                    border: isActive ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid transparent',
                                    padding: '8px 20px', borderRadius: '10px',
                                    fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    whiteSpace: 'nowrap',
                                    boxShadow: isActive ? '0 4px 12px rgba(56, 189, 248, 0.06)' : 'none',
                                }}
                            >
                                <span style={{ transition: 'transform 0.2s' }}>{tab.label}</span>
                                <span style={{
                                    background: isActive ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                                    color: isActive ? '#38BDF8' : '#64748B',
                                    fontSize: '11px', fontWeight: 700,
                                    padding: '1px 8px', borderRadius: '10px',
                                    minWidth: '20px', textAlign: 'center',
                                    transition: 'all 0.2s',
                                }}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* ── Tab Content ────────────────────────────────── */}
                <div style={{
                    animation: 'fadeIn 0.25s ease-out',
                }}>
                    {renderTabContent()}
                </div>

            </div>

            {/* ── Modals ──────────────────────────────────────── */}
            {renderWizardModal()}
            {renderQRModal()}

            {/* ── CSS Animations ─────────────────────────────── */}
            <style jsx>{`
                @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');

                @keyframes livePulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }

                @keyframes dotPulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.4); opacity: 0.5; }
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes slideUp {
                    from { transform: translateY(40px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.1); }
                }

                /* Button & Input micro-interactions */
                .btn-primary-glow:hover {
                    box-shadow: 0 8px 24px rgba(56, 189, 248, 0.35) !important;
                    transform: translateY(-1px);
                    filter: brightness(1.05);
                }
                .btn-primary-glow:active {
                    transform: translateY(0);
                }

                .hover-bright:hover {
                    filter: brightness(1.12);
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.25) !important;
                }
                .hover-bright:active {
                    transform: translateY(0);
                }

                .hover-danger-bg {
                    transition: all 0.2s ease;
                }
                .hover-danger-bg:hover {
                    background: rgba(239, 68, 68, 0.12) !important;
                    border-color: rgba(239, 68, 68, 0.6) !important;
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
                }

                /* Scrollbar styling */
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.25); border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(100,116,139,0.45); }
            `}</style>
        </div>
    );
}
