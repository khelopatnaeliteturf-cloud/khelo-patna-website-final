'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { getBackendUrl } from '@/app/lib/backendUrl';

const BACKEND_URL = getBackendUrl();

export default function ScoreboardDisplay() {
    const params = useParams();
    const searchParams = useSearchParams();
    const scoreboardId = params.id;
    
    const mode = searchParams.get('mode') || 'overlay'; // 'overlay', 'tv', 'spectator'
    
    const [scoreboard, setScoreboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [prevScoreA, setPrevScoreA] = useState(0);
    const [prevScoreB, setPrevScoreB] = useState(0);
    const [animateA, setAnimateA] = useState(false);
    const [animateB, setAnimateB] = useState(false);

    // Keep track of previous scores to trigger punchy animations
    useEffect(() => {
        if (scoreboard) {
            if (scoreboard.teamAScore !== prevScoreA) {
                setAnimateA(true);
                const t = setTimeout(() => setAnimateA(false), 800);
                setPrevScoreA(scoreboard.teamAScore);
                return () => clearTimeout(t);
            }
            if (scoreboard.teamBScore !== prevScoreB) {
                setAnimateB(true);
                const t = setTimeout(() => setAnimateB(false), 800);
                setPrevScoreB(scoreboard.teamBScore);
                return () => clearTimeout(t);
            }
        }
    }, [scoreboard]);

    // Connect to Server-Sent Events (SSE) for real-time updates
    useEffect(() => {
        if (!scoreboardId) return;

        // Fetch initial data first
        fetch(`${BACKEND_URL}/api/scoreboards/${scoreboardId}`)
            .then(res => {
                if (!res.ok) throw new Error('Scoreboard not found');
                return res.json();
            })
            .then(data => {
                setScoreboard(data);
                setPrevScoreA(data.teamAScore);
                setPrevScoreB(data.teamBScore);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError(err.message);
                setLoading(false);
            });

        // Setup EventSource for real-time updates
        const sseUrl = `${BACKEND_URL}/api/scoreboards/${scoreboardId}/stream`;
        console.log(`[Scoreboard] Connecting to SSE stream at ${sseUrl}`);
        const eventSource = new EventSource(sseUrl);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[Scoreboard] SSE update received:', data);
                if (data.type === 'deleted') {
                    setError('This match scoreboard has been closed or deleted.');
                    return;
                }
                setScoreboard(data);
            } catch (err) {
                console.error('Error parsing SSE data:', err);
            }
        };

        eventSource.onerror = (err) => {
            console.warn('[Scoreboard] SSE connection error, browser will auto-reconnect.', err);
        };

        return () => {
            eventSource.close();
            console.log('[Scoreboard] SSE connection closed');
        };
    }, [scoreboardId]);

    if (loading) {
        return (
            <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                height: '100vh', backgroundColor: mode === 'overlay' ? 'transparent' : '#0B0F19',
                color: '#ffffff', fontFamily: 'system-ui, sans-serif'
            }}>
                <div className="spinner">Loading Live Scoreboard...</div>
                <style jsx>{`
                    .spinner {
                        border: 3px solid rgba(255,255,255,0.1);
                        border-radius: 50%;
                        border-top: 3px solid #10B981;
                        width: 40px;
                        height: 40px;
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                height: '100vh', backgroundColor: '#0B0F19', color: '#EF4444',
                fontFamily: 'system-ui, sans-serif', padding: '20px', textAlign: 'center'
            }}>
                <h2 style={{ marginBottom: '10px' }}>⚠️ Error</h2>
                <p>{error}</p>
            </div>
        );
    }

    if (!scoreboard) return null;

    const { sport, matchName, teamAName, teamBName, teamAScore, teamBScore, status, settings } = scoreboard;

    // ----------------------------------------------------
    // LAYOUT 1: OBS OVERLAY MODE (Transparent, Score Bar)
    // ----------------------------------------------------
    if (mode === 'overlay') {
        if (sport === 'cricket') {
            const cr = settings?.cricket || {};
            return (
                <div style={{
                    position: 'fixed', bottom: '20px', left: '5%', right: '5%',
                    display: 'flex', justifyContent: 'center', fontFamily: 'system-ui, sans-serif'
                }}>
                    {/* Floating Glass Score Bar */}
                    <div style={{
                        display: 'flex', alignItems: 'center', height: '60px',
                        background: 'rgba(11, 15, 25, 0.85)', backdropFilter: 'blur(10px)',
                        borderRadius: '30px', padding: '0 30px', border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)', color: '#FFFFFF', gap: '20px'
                    }}>
                        <div style={{ fontWeight: '800', color: '#10B981', textTransform: 'uppercase', fontSize: '14px', letterSpacing: '1px' }}>
                            🔴 LIVE
                        </div>
                        <div style={{ height: '20px', width: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
                        
                        {/* Match Name */}
                        <div style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: '500' }}>{matchName}</div>
                        <div style={{ height: '20px', width: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }} />

                        {/* Cricket Scoreboard Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ fontWeight: '700', fontSize: '16px' }}>{teamAName} vs {teamBName}</span>
                            
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: 'rgba(16, 185, 129, 0.2)', padding: '4px 12px', borderRadius: '15px',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                transform: animateA || animateB ? 'scale(1.1)' : 'scale(1)',
                                transition: 'transform 0.2s ease-in-out'
                            }}>
                                <span style={{ fontWeight: '800', color: '#34D399', fontSize: '18px' }}>
                                    {teamAScore}/{cr.wicketsA || 0}
                                </span>
                                <span style={{ color: '#9CA3AF', fontSize: '12px' }}>({cr.oversA || '0.0'} ov)</span>
                            </div>

                            {cr.target && (
                                <div style={{ fontSize: '13px', color: '#FBBF24', fontWeight: '600' }}>
                                    Target: {cr.target} (Req: {((cr.target - teamAScore) > 0 ? (cr.target - teamAScore) : 0)})
                                </div>
                            )}
                        </div>

                        {/* Batter & Bowler stats if present */}
                        {(cr.currentBatsman1 || cr.currentBowler) && (
                            <>
                                <div style={{ height: '20px', width: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
                                <div style={{ display: 'flex', gap: '15px', fontSize: '13px', color: '#D1D5DB' }}>
                                    {cr.currentBatsman1 && (
                                        <div>🏏 <span style={{ fontWeight: '600' }}>{cr.currentBatsman1}</span>{cr.currentBatsman2 ? ` & ${cr.currentBatsman2}` : ''}</div>
                                    )}
                                    {cr.currentBowler && (
                                        <div>🥎 Bowler: <span style={{ fontWeight: '600' }}>{cr.currentBowler}</span></div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            );
        }

        if (sport === 'football') {
            const fb = settings?.football || {};
            return (
                <div style={{
                    position: 'fixed', top: '20px', left: '20px',
                    display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif'
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', height: '50px',
                        background: 'rgba(11, 15, 25, 0.85)', backdropFilter: 'blur(10px)',
                        borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)', color: '#FFFFFF', overflow: 'hidden'
                    }}>
                        {/* Match Period / Half */}
                        <div style={{
                            background: '#10B981', padding: '0 12px', height: '100%',
                            display: 'flex', alignItems: 'center', fontWeight: '800', fontSize: '12px'
                        }}>
                            {fb.half || '1st'}
                        </div>
                        
                        {/* Team A */}
                        <div style={{ padding: '0 15px', fontWeight: '700', fontSize: '14px' }}>
                            {teamAName.substring(0, 3).toUpperCase()}
                        </div>

                        {/* Scores */}
                        <div style={{
                            background: 'rgba(255,255,255,0.1)', height: '100%', width: '40px',
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            fontWeight: '900', fontSize: '16px', color: animateA ? '#34D399' : '#FFFFFF',
                            transition: 'color 0.2s'
                        }}>
                            {teamAScore}
                        </div>
                        <div style={{
                            background: 'rgba(255,255,255,0.1)', height: '100%', width: '40px',
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            fontWeight: '900', fontSize: '16px', color: animateB ? '#34D399' : '#FFFFFF',
                            borderLeft: '1px solid rgba(255,255,255,0.1)', transition: 'color 0.2s'
                        }}>
                            {teamBScore}
                        </div>

                        {/* Team B */}
                        <div style={{ padding: '0 15px', fontWeight: '700', fontSize: '14px' }}>
                            {teamBName.substring(0, 3).toUpperCase()}
                        </div>

                        {/* Timer */}
                        <div style={{
                            padding: '0 15px', fontWeight: '800', fontSize: '14px',
                            color: '#FBBF24', fontFamily: 'monospace', minWidth: '60px', textAlign: 'center'
                        }}>
                            {Math.floor((fb.timerSeconds || 0) / 60).toString().padStart(2, '0')}:
                            {((fb.timerSeconds || 0) % 60).toString().padStart(2, '0')}
                        </div>
                    </div>
                </div>
            );
        }

        if (sport === 'badminton') {
            const bd = settings?.badminton || {};
            return (
                <div style={{
                    position: 'fixed', top: '20px', left: '20px',
                    display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif'
                }}>
                    <div style={{
                        background: 'rgba(11, 15, 25, 0.85)', backdropFilter: 'blur(10px)',
                        borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)', color: '#FFFFFF', padding: '10px 15px',
                        display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '220px'
                    }}>
                        <div style={{ fontSize: '11px', color: '#10B981', fontWeight: '800', letterSpacing: '1px' }}>
                            🏸 BADMINTON LIVE (SET {bd.currentSetNumber || 1})
                        </div>
                        
                        {/* Player A Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {bd.serving === 'A' && <span style={{ color: '#FBBF24', fontSize: '12px' }}>●</span>}
                                <span style={{ fontWeight: bd.serving === 'A' ? '700' : '500', fontSize: '14px' }}>{teamAName}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ color: '#9CA3AF', fontSize: '12px', fontWeight: '600' }}>({bd.setsWonA || 0})</span>
                                <span style={{
                                    fontSize: '16px', fontWeight: '800', color: '#34D399',
                                    transform: animateA ? 'scale(1.3)' : 'scale(1)', transition: 'transform 0.2s'
                                }}>{teamAScore}</span>
                            </div>
                        </div>

                        {/* Player B Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {bd.serving === 'B' && <span style={{ color: '#FBBF24', fontSize: '12px' }}>●</span>}
                                <span style={{ fontWeight: bd.serving === 'B' ? '700' : '500', fontSize: '14px' }}>{teamBName}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ color: '#9CA3AF', fontSize: '12px', fontWeight: '600' }}>({bd.setsWonB || 0})</span>
                                <span style={{
                                    fontSize: '16px', fontWeight: '800', color: '#34D399',
                                    transform: animateB ? 'scale(1.3)' : 'scale(1)', transition: 'transform 0.2s'
                                }}>{teamBScore}</span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
    }

    // ----------------------------------------------------
    // LAYOUT 2: VENUE SMART TV MODE (Fullscreen, Large UI)
    // ----------------------------------------------------
    if (mode === 'tv') {
        const cr = settings?.cricket || {};
        const fb = settings?.football || {};
        const bd = settings?.badminton || {};

        return (
            <div style={{
                height: '100vh', backgroundColor: '#0B0F19', color: '#FFFFFF',
                fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between', padding: '40px', boxSizing: 'border-box',
                backgroundImage: 'radial-gradient(circle at top right, rgba(16, 185, 129, 0.08), transparent)'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontSize: '32px', fontWeight: '800', color: '#10B981', margin: 0 }}>
                            KHELO PATNA ELITE TURF
                        </h2>
                        <p style={{ color: '#9CA3AF', fontSize: '18px', marginTop: '5px', margin: 0 }}>
                            {matchName} • <span style={{ textTransform: 'uppercase', fontWeight: '700' }}>{sport}</span>
                        </p>
                    </div>
                    <div style={{
                        background: '#EF4444', color: '#FFFFFF', padding: '8px 20px',
                        borderRadius: '20px', fontWeight: '800', fontSize: '16px', animation: 'pulse 2s infinite'
                    }}>
                        ● LIVE MATCH
                    </div>
                </div>

                {/* Score Section */}
                <div style={{
                    display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                    flex: 1, margin: '40px 0'
                }}>
                    {/* Team A */}
                    <div style={{ textAlign: 'center', width: '35%' }}>
                        <div style={{
                            fontSize: '48px', fontWeight: '900', color: '#FFFFFF',
                            textShadow: '0 4px 10px rgba(0,0,0,0.5)'
                        }}>{teamAName}</div>
                        
                        {sport === 'badminton' && (
                            <div style={{ color: '#10B981', fontSize: '24px', fontWeight: '700', marginTop: '10px' }}>
                                Sets Won: {bd.setsWonA || 0}
                            </div>
                        )}
                    </div>

                    {/* Central Score box */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '24px', padding: '40px 80px', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                        minWidth: '300px'
                    }}>
                        {sport === 'cricket' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{
                                    fontSize: '96px', fontWeight: '900', color: '#34D399',
                                    animation: animateA || animateB ? 'bounce 0.5s' : 'none'
                                }}>
                                    {teamAScore}/{cr.wicketsA || 0}
                                </div>
                                <div style={{ fontSize: '24px', color: '#9CA3AF', fontWeight: '600' }}>
                                    Overs: {cr.oversA || '0.0'}
                                </div>
                                {cr.target && (
                                    <div style={{ fontSize: '20px', color: '#FBBF24', fontWeight: '700', marginTop: '15px' }}>
                                        Target: {cr.target} • Need {cr.target - teamAScore} runs
                                    </div>
                                )}
                            </div>
                        ) : sport === 'football' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                                    <span style={{ fontSize: '120px', fontWeight: '900', color: animateA ? '#34D399' : '#FFFFFF' }}>{teamAScore}</span>
                                    <span style={{ fontSize: '72px', color: 'rgba(255,255,255,0.2)', fontWeight: '300' }}>-</span>
                                    <span style={{ fontSize: '120px', fontWeight: '900', color: animateB ? '#34D399' : '#FFFFFF' }}>{teamBScore}</span>
                                </div>
                                <div style={{
                                    fontSize: '36px', fontWeight: '800', color: '#FBBF24',
                                    fontFamily: 'monospace', letterSpacing: '2px'
                                }}>
                                    {Math.floor((fb.timerSeconds || 0) / 60).toString().padStart(2, '0')}:
                                    {((fb.timerSeconds || 0) % 60).toString().padStart(2, '0')}
                                </div>
                                <div style={{ background: '#1F2937', padding: '6px 16px', borderRadius: '15px', fontSize: '16px', fontWeight: '700' }}>
                                    Half: {fb.half || '1st'}
                                </div>
                            </div>
                        ) : (
                            // Badminton
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                                    <span style={{ fontSize: '96px', fontWeight: '900', color: animateA ? '#34D399' : '#FFFFFF', borderBottom: bd.serving === 'A' ? '6px solid #FBBF24' : 'none' }}>
                                        {teamAScore}
                                    </span>
                                    <span style={{ fontSize: '54px', color: 'rgba(255,255,255,0.2)' }}>-</span>
                                    <span style={{ fontSize: '96px', fontWeight: '900', color: animateB ? '#34D399' : '#FFFFFF', borderBottom: bd.serving === 'B' ? '6px solid #FBBF24' : 'none' }}>
                                        {teamBScore}
                                    </span>
                                </div>
                                <div style={{ color: '#9CA3AF', fontSize: '20px', fontWeight: '600' }}>
                                    Serving: {bd.serving === 'A' ? teamAName : teamBName}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Team B */}
                    <div style={{ textAlign: 'center', width: '35%' }}>
                        <div style={{
                            fontSize: '48px', fontWeight: '900', color: '#FFFFFF',
                            textShadow: '0 4px 10px rgba(0,0,0,0.5)'
                        }}>{teamBName}</div>
                        
                        {sport === 'badminton' && (
                            <div style={{ color: '#10B981', fontSize: '24px', fontWeight: '700', marginTop: '10px' }}>
                                Sets Won: {bd.setsWonB || 0}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer stats / tickers */}
                <div style={{
                    background: 'rgba(255,255,255,0.02)', padding: '20px 40px', borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-around',
                    fontSize: '18px', color: '#D1D5DB'
                }}>
                    {sport === 'cricket' && (
                        <>
                            <div>🏏 Current Batsman: <strong style={{ color: '#FFF' }}>{cr.currentBatsman1 || 'N/A'}</strong></div>
                            <div>🥎 Current Bowler: <strong style={{ color: '#FFF' }}>{cr.currentBowler || 'N/A'}</strong></div>
                            <div>📊 Target score to win: <strong style={{ color: '#FBBF24' }}>{cr.target || 'N/A'}</strong></div>
                        </>
                    )}
                    {sport === 'football' && (
                        <>
                            <div>🟨 Yellow Cards: {teamAName} ({fb.yellowCardsA || 0}) • {teamBName} ({fb.yellowCardsB || 0})</div>
                            <div>🟥 Red Cards: {teamAName} ({fb.redCardsA || 0}) • {teamBName} ({fb.redCardsB || 0})</div>
                        </>
                    )}
                    {sport === 'badminton' && bd.setScores && bd.setScores.length > 0 && (
                        <div>📊 Previous Sets: {bd.setScores.map((s, idx) => `Set ${idx+1}: ${s.a}-${s.b}`).join(' | ')}</div>
                    )}
                </div>

                <style jsx global>{`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                    @keyframes bounce {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-10px); }
                    }
                `}</style>
            </div>
        );
    }

    // ----------------------------------------------------
    // LAYOUT 3: SPECTATOR VIEW (Mobile Friendly Spectator Mode)
    // ----------------------------------------------------
    const cr = settings?.cricket || {};
    const fb = settings?.football || {};
    const bd = settings?.badminton || {};
    return (
        <div style={{
            minHeight: '100vh', backgroundColor: '#0B0F19', color: '#FFFFFF',
            fontFamily: 'system-ui, sans-serif', padding: '20px', display: 'flex', flexDirection: 'column'
        }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '30px', marginTop: '10px' }}>
                <span style={{
                    background: 'rgba(16, 185, 129, 0.1)', color: '#10B981',
                    padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '800',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                    🔴 LIVE MATCH
                </span>
                <h1 style={{ fontSize: '22px', fontWeight: '800', marginTop: '10px', marginBottom: '5px' }}>
                    {matchName}
                </h1>
                <p style={{ color: '#9CA3AF', fontSize: '13px', margin: 0, textTransform: 'uppercase', fontWeight: '700' }}>
                    {sport} match • KP Elite Turf
                </p>
            </div>

            {/* Scoreboard Card */}
            <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column',
                gap: '20px', boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'center' }}>
                    {/* Team A */}
                    <div style={{ width: '40%' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700' }}>{teamAName}</div>
                        {sport === 'badminton' && <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>Sets: {bd.setsWonA || 0}</div>}
                    </div>

                    {/* Central separator */}
                    <div style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600' }}>vs</div>

                    {/* Team B */}
                    <div style={{ width: '40%' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700' }}>{teamBName}</div>
                        {sport === 'badminton' && <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>Sets: {bd.setsWonB || 0}</div>}
                    </div>
                </div>

                <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }} />

                {/* Score numbers */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {sport === 'cricket' ? (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '48px', fontWeight: '900', color: '#34D399' }}>
                                {teamAScore}/{cr.wicketsA || 0}
                            </div>
                            <div style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '5px' }}>
                                Overs: {cr.oversA || '0.0'}
                            </div>
                            {cr.target && (
                                <div style={{ fontSize: '14px', color: '#FBBF24', fontWeight: '700', marginTop: '12px' }}>
                                    Target: {cr.target} • Need {cr.target - teamAScore} from {((20 * 6) - (parseFloat(cr.oversA || 0) * 6))} balls
                                </div>
                            )}
                        </div>
                    ) : sport === 'football' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '42px', fontWeight: '900' }}>
                                <span style={{ color: animateA ? '#34D399' : '#FFF' }}>{teamAScore}</span>
                                <span style={{ color: 'rgba(255,255,255,0.2)' }}>-</span>
                                <span style={{ color: animateB ? '#34D399' : '#FFF' }}>{teamBScore}</span>
                            </div>
                            <div style={{ fontSize: '20px', color: '#FBBF24', fontWeight: '700', fontFamily: 'monospace' }}>
                                {Math.floor((fb.timerSeconds || 0) / 60).toString().padStart(2, '0')}:
                                {((fb.timerSeconds || 0) % 60).toString().padStart(2, '0')}
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: '10px', fontSize: '12px' }}>
                                Period: {fb.half || '1st'}
                            </div>
                        </div>
                    ) : (
                        // Badminton
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '48px', fontWeight: '900' }}>
                                <span style={{ borderBottom: bd.serving === 'A' ? '4px solid #FBBF24' : 'none' }}>{teamAScore}</span>
                                <span style={{ color: 'rgba(255,255,255,0.2)' }}>-</span>
                                <span style={{ borderBottom: bd.serving === 'B' ? '4px solid #FBBF24' : 'none' }}>{teamBScore}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                                Set {bd.currentSetNumber || 1} • Serving: {bd.serving === 'A' ? teamAName : teamBName}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Match Information */}
            <div style={{
                background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '16px', padding: '15px 20px', marginTop: '20px', display: 'flex',
                flexDirection: 'column', gap: '10px', fontSize: '13px'
            }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 5px 0', color: '#9CA3AF' }}>Match Stats</h3>
                {sport === 'cricket' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Batsman:</span>
                            <span style={{ fontWeight: '600' }}>{cr.currentBatsman1 || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Bowler:</span>
                            <span style={{ fontWeight: '600' }}>{cr.currentBowler || 'N/A'}</span>
                        </div>
                        {cr.overSummary && cr.overSummary.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '5px' }}>
                                <span>This Over:</span>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {cr.overSummary.map((ball, idx) => (
                                        <span key={idx} style={{
                                            background: ball === 'W' ? '#EF4444' : ball === '4' || ball === '6' ? '#34D399' : '#1F2937',
                                            color: '#FFF', padding: '2px 8px', borderRadius: '50%', fontSize: '11px', fontWeight: '700'
                                        }}>{ball}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
                {sport === 'football' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Yellow Cards ({teamAName}):</span>
                            <span style={{ fontWeight: '600' }}>{fb.yellowCardsA || 0}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Yellow Cards ({teamBName}):</span>
                            <span style={{ fontWeight: '600' }}>{fb.yellowCardsB || 0}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Red Cards ({teamAName}):</span>
                            <span style={{ fontWeight: '600', color: '#EF4444' }}>{fb.redCardsA || 0}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Red Cards ({teamBName}):</span>
                            <span style={{ fontWeight: '600', color: '#EF4444' }}>{fb.redCardsB || 0}</span>
                        </div>
                    </>
                )}
                {sport === 'badminton' && bd.setScores && bd.setScores.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <span>Set History:</span>
                        {bd.setScores.map((score, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Set {idx + 1}:</span>
                                <span style={{ fontWeight: '600' }}>{score.a} - {score.b}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Spectator Ticker/Ads */}
            <div style={{
                textAlign: 'center', marginTop: 'auto', padding: '20px 0',
                color: '#9CA3AF', fontSize: '11px'
            }}>
                Powered by Khelo Patna Elite Turf Scoreboard Systems
            </div>
        </div>
    );
}
