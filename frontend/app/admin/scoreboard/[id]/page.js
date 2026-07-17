'use client';

import { useEffect, useState, useRef } from 'react';
import { getBackendUrl } from '@/app/lib/backendUrl';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const BACKEND_URL = getBackendUrl();

export default function ScorekeeperPanel() {
    const params = useParams();
    const scoreboardId = params.id;

    const [scoreboard, setScoreboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState('');
    const [authenticated, setAuthenticated] = useState(false);
    const [saving, setSaving] = useState(false);

    // Timer ref for Football matches
    const timerRef = useRef(null);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
            window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
            return;
        }
        setToken(storedToken);
        setAuthenticated(true);
    }, []);

    useEffect(() => {
        if (!authenticated || !token || !scoreboardId) return;

        fetch(`${BACKEND_URL}/api/scoreboards/${scoreboardId}`)
            .then(res => res.json())
            .then(data => {
                setScoreboard(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                alert('Failed to load match scoreboard.');
                setLoading(false);
            });
    }, [authenticated, token, scoreboardId]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // Sync match timer locally for football
    useEffect(() => {
        if (!scoreboard || scoreboard.sport !== 'football') return;
        const fb = scoreboard.settings?.football || {};

        if (fb.timerRunning) {
            if (!timerRef.current) {
                timerRef.current = setInterval(() => {
                    setScoreboard(prev => {
                        if (!prev) return null;
                        const prevFb = prev.settings?.football || {};
                        const newSeconds = (prevFb.timerSeconds || 0) + 1;
                        
                        return {
                            ...prev,
                            settings: {
                                ...prev.settings,
                                football: {
                                    ...prevFb,
                                    timerSeconds: newSeconds
                                }
                            }
                        };
                    });
                }, 1000);
            }
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    }, [scoreboard?.settings?.football?.timerRunning]);

    const saveScoreboardState = async (updatedFields) => {
        setSaving(true);
        try {
            const headers = {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            };

            const res = await fetch(`${BACKEND_URL}/api/scoreboards/${scoreboardId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(updatedFields)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update score');
            }

            const data = await res.json();
            setScoreboard(data);
        } catch (err) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const updateScore = (team, delta) => {
        if (!scoreboard) return;
        if (team === 'A') {
            const newVal = Math.max(0, scoreboard.teamAScore + delta);
            saveScoreboardState({ teamAScore: newVal });
        } else {
            const newVal = Math.max(0, scoreboard.teamBScore + delta);
            saveScoreboardState({ teamBScore: newVal });
        }
    };

    const handleStatusChange = (newStatus) => {
        saveScoreboardState({ status: newStatus });
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0F172A', color: '#FFF' }}>
                <div>Loading Scorekeeper Control...</div>
            </div>
        );
    }

    if (!scoreboard) return null;

    const { sport, matchName, teamAName, teamBName, teamAScore, teamBScore, status, settings } = scoreboard;

    // ----------------------------------------------------
    // SPORT CONTROL 1: CRICKET PANEL
    // ----------------------------------------------------
    const renderCricketControls = () => {
        const cr = settings?.cricket || {};

        const updateCricketSettings = (fields) => {
            saveScoreboardState({
                settings: {
                    ...settings,
                    cricket: {
                        ...cr,
                        ...fields
                    }
                }
            });
        };

        const handleRunAndBall = (runs, isExtra = false, extraType = '') => {
            let nextRuns = teamAScore + runs;
            let currentOvers = cr.oversA || '0.0';
            let parts = currentOvers.split('.');
            let overs = parseInt(parts[0], 10);
            let balls = parseInt(parts[1], 10);

            let newOverSummary = [...(cr.overSummary || [])];
            
            if (!isExtra) {
                balls += 1;
                newOverSummary.push(runs.toString());
                if (balls >= 6) {
                    overs += 1;
                    balls = 0;
                    newOverSummary = []; // clear summary for new over
                }
            } else {
                newOverSummary.push(extraType);
            }

            const nextOvers = `${overs}.${balls}`;

            saveScoreboardState({
                teamAScore: nextRuns,
                settings: {
                    ...settings,
                    cricket: {
                        ...cr,
                        oversA: nextOvers,
                        overSummary: newOverSummary
                    }
                }
            });
        };

        const handleWicket = () => {
            const nextWickets = Math.min(10, (cr.wicketsA || 0) + 1);
            let currentOvers = cr.oversA || '0.0';
            let parts = currentOvers.split('.');
            let overs = parseInt(parts[0], 10);
            let balls = parseInt(parts[1], 10) + 1;

            let newOverSummary = [...(cr.overSummary || []), 'W'];

            if (balls >= 6) {
                overs += 1;
                balls = 0;
                newOverSummary = [];
            }

            const nextOvers = `${overs}.${balls}`;

            saveScoreboardState({
                settings: {
                    ...settings,
                    cricket: {
                        ...cr,
                        wicketsA: nextWickets,
                        oversA: nextOvers,
                        overSummary: newOverSummary
                    }
                }
            });
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {/* Score & Wickets Banner */}
                <div style={{
                    background: '#1E293B', padding: '30px', borderRadius: '16px',
                    display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' }}>
                            Batting: {teamAName}
                        </div>
                        <div style={{ fontSize: '64px', fontWeight: '900', color: '#38BDF8', margin: '10px 0' }}>
                            {teamAScore} / {cr.wicketsA || 0}
                        </div>
                        <div style={{ fontSize: '20px', color: '#F1F5F9', fontWeight: '600' }}>
                            Overs: {cr.oversA || '0.0'}
                        </div>
                    </div>
                </div>

                {/* Scorekeeper Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Runs Increments */}
                    <div style={{ background: '#1E293B', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <h3 style={{ margin: 0, color: '#38BDF8', fontSize: '16px' }}>Add Runs (Batting Team)</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                            <button onClick={() => handleRunAndBall(0)} style={btnStyle('#0F172A')}>Dot Ball</button>
                            <button onClick={() => handleRunAndBall(1)} style={btnStyle('#0284C7')}>+1 Run</button>
                            <button onClick={() => handleRunAndBall(2)} style={btnStyle('#0284C7')}>+2 Runs</button>
                            <button onClick={() => handleRunAndBall(3)} style={btnStyle('#0284C7')}>+3 Runs</button>
                            <button onClick={() => handleRunAndBall(4)} style={btnStyle('#10B981')}>+4 Runs (Four)</button>
                            <button onClick={() => handleRunAndBall(6)} style={btnStyle('#10B981')}>+6 Runs (Six)</button>
                        </div>
                    </div>

                    {/* Extras & Wickets */}
                    <div style={{ background: '#1E293B', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <h3 style={{ margin: 0, color: '#F43F5E', fontSize: '16px' }}>Wickets & Extras</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <button onClick={handleWicket} style={{ ...btnStyle('#EF4444'), gridColumn: 'span 2' }}>
                                🔴 WICKET!
                            </button>
                            <button onClick={() => handleRunAndBall(1, true, 'Wd')} style={btnStyle('#EAB308')}>
                                Wide (+1)
                            </button>
                            <button onClick={() => handleRunAndBall(1, true, 'Nb')} style={btnStyle('#EAB308')}>
                                No Ball (+1)
                            </button>
                        </div>
                    </div>
                </div>

                {/* Match Information / Settings */}
                <div style={{ background: '#1E293B', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <h3 style={{ margin: 0, color: '#38BDF8', fontSize: '16px' }}>Batter & Bowler Settings</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '12px', color: '#94A3B8' }}>Striker Batsman</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Aarav"
                                value={cr.currentBatsman1 || ''}
                                onChange={(e) => updateCricketSettings({ currentBatsman1: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '12px', color: '#94A3B8' }}>Non-Striker Batsman</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Rahul"
                                value={cr.currentBatsman2 || ''}
                                onChange={(e) => updateCricketSettings({ currentBatsman2: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '12px', color: '#94A3B8' }}>Current Bowler</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Karan"
                                value={cr.currentBowler || ''}
                                onChange={(e) => updateCricketSettings({ currentBowler: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '12px', color: '#94A3B8' }}>Target Score</label>
                            <input 
                                type="number" 
                                placeholder="e.g. 145"
                                value={cr.target || ''}
                                onChange={(e) => updateCricketSettings({ target: e.target.value ? parseInt(e.target.value, 10) : null })}
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '12px', color: '#94A3B8' }}>Adjust Overs manually (e.g. 12.3)</label>
                            <input 
                                type="text" 
                                placeholder="Overs"
                                value={cr.oversA || '0.0'}
                                onChange={(e) => updateCricketSettings({ oversA: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // ----------------------------------------------------
    // SPORT CONTROL 2: FOOTBALL PANEL
    // ----------------------------------------------------
    const renderFootballControls = () => {
        const fb = settings?.football || {};

        const updateFootballSettings = (fields) => {
            saveScoreboardState({
                settings: {
                    ...settings,
                    football: {
                        ...fb,
                        ...fields
                    }
                }
            });
        };

        const toggleTimer = () => {
            const nextRunning = !fb.timerRunning;
            updateFootballSettings({ timerRunning: nextRunning });
        };

        const resetTimer = () => {
            if (confirm('Reset timer to 0?')) {
                updateFootballSettings({ timerSeconds: 0, timerRunning: false });
            }
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                
                {/* Score keeper board */}
                <div style={{
                    background: '#1E293B', padding: '30px', borderRadius: '16px',
                    display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    {/* Team A */}
                    <div style={{ textAlign: 'center', width: '40%' }}>
                        <div style={{ fontSize: '20px', fontWeight: '800' }}>{teamAName}</div>
                        <div style={{ fontSize: '72px', fontWeight: '900', color: '#10B981', margin: '15px 0' }}>{teamAScore}</div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={() => updateScore('A', 1)} style={miniBtnStyle('#10B981')}>+ Goal</button>
                            <button onClick={() => updateScore('A', -1)} style={miniBtnStyle('#64748B')}>- Goal</button>
                        </div>
                    </div>

                    <div style={{ fontSize: '24px', color: '#475569', fontWeight: '700' }}>vs</div>

                    {/* Team B */}
                    <div style={{ textAlign: 'center', width: '40%' }}>
                        <div style={{ fontSize: '20px', fontWeight: '800' }}>{teamBName}</div>
                        <div style={{ fontSize: '72px', fontWeight: '900', color: '#10B981', margin: '15px 0' }}>{teamBScore}</div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={() => updateScore('B', 1)} style={miniBtnStyle('#10B981')}>+ Goal</button>
                            <button onClick={() => updateScore('B', -1)} style={miniBtnStyle('#64748B')}>- Goal</button>
                        </div>
                    </div>
                </div>

                {/* Match Timer & Period Settings */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    
                    {/* Timer Controls */}
                    <div style={{ background: '#1E293B', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <h3 style={{ margin: 0, color: '#38BDF8', fontSize: '16px' }}>Match Timer</h3>
                        <div style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'monospace', textAlign: 'center', color: '#FBBF24' }}>
                            {Math.floor((fb.timerSeconds || 0) / 60).toString().padStart(2, '0')}:
                            {((fb.timerSeconds || 0) % 60).toString().padStart(2, '0')}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={toggleTimer} style={btnStyle(fb.timerRunning ? '#EF4444' : '#10B981')}>
                                {fb.timerRunning ? '⏸️ Pause' : '▶️ Start'}
                            </button>
                            <button onClick={resetTimer} style={btnStyle('#374151')}>
                                🔄 Reset
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px' }}>
                            <label style={{ fontSize: '12px', color: '#94A3B8' }}>Manually Set Time (Seconds)</label>
                            <input 
                                type="number" 
                                value={fb.timerSeconds || 0}
                                onChange={(e) => updateFootballSettings({ timerSeconds: parseInt(e.target.value || 0, 10) })}
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    {/* Cards & Period */}
                    <div style={{ background: '#1E293B', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <h3 style={{ margin: 0, color: '#38BDF8', fontSize: '16px' }}>Period & Card Controls</h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '12px', color: '#94A3B8' }}>Current Half</label>
                            <select 
                                value={fb.half || '1st'} 
                                onChange={(e) => updateFootballSettings({ half: e.target.value })}
                                style={{
                                    background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#FFF', padding: '8px', borderRadius: '6px'
                                }}
                            >
                                <option value="1st">1st Half</option>
                                <option value="HT">Half Time (HT)</option>
                                <option value="2nd">2nd Half</option>
                                <option value="FT">Full Time (FT)</option>
                                <option value="OT">Overtime (OT)</option>
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: '#EAB308' }}>🟨 Yellow ({teamAName})</span>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button onClick={() => updateFootballSettings({ yellowCardsA: (fb.yellowCardsA || 0) + 1 })} style={miniBtnStyle('#EAB308', '6px 12px')}>+</button>
                                    <button onClick={() => updateFootballSettings({ yellowCardsA: Math.max(0, (fb.yellowCardsA || 0) - 1) })} style={miniBtnStyle('#64748B', '6px 12px')}>-</button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: '#EAB308' }}>🟨 Yellow ({teamBName})</span>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button onClick={() => updateFootballSettings({ yellowCardsB: (fb.yellowCardsB || 0) + 1 })} style={miniBtnStyle('#EAB308', '6px 12px')}>+</button>
                                    <button onClick={() => updateFootballSettings({ yellowCardsB: Math.max(0, (fb.yellowCardsB || 0) - 1) })} style={miniBtnStyle('#64748B', '6px 12px')}>-</button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        );
    };

    // ----------------------------------------------------
    // SPORT CONTROL 3: BADMINTON PANEL
    // ----------------------------------------------------
    const renderBadmintonControls = () => {
        const bd = settings?.badminton || {};

        const updateBadmintonSettings = (fields) => {
            saveScoreboardState({
                settings: {
                    ...settings,
                    badminton: {
                        ...bd,
                        ...fields
                    }
                }
            });
        };

        const handleSetFinished = () => {
            const nextScores = [...(bd.setScores || [])];
            nextScores.push({ a: teamAScore, b: teamBScore });
            
            let nextSetsWonA = bd.setsWonA || 0;
            let nextSetsWonB = bd.setsWonB || 0;
            if (teamAScore > teamBScore) nextSetsWonA++;
            else nextSetsWonB++;

            saveScoreboardState({
                teamAScore: 0,
                teamBScore: 0,
                settings: {
                    ...settings,
                    badminton: {
                        ...bd,
                        setsWonA: nextSetsWonA,
                        setsWonB: nextSetsWonB,
                        setScores: nextScores,
                        currentSetNumber: (bd.currentSetNumber || 1) + 1,
                        serving: 'A'
                    }
                }
            });
        };

        const toggleServing = () => {
            const nextServing = bd.serving === 'A' ? 'B' : 'A';
            updateBadmintonSettings({ serving: nextServing });
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                <div style={{
                    background: '#1E293B', padding: '30px', borderRadius: '16px',
                    display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    {/* Player A */}
                    <div style={{ textAlign: 'center', width: '40%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            {bd.serving === 'A' && <span style={{ color: '#FBBF24', fontSize: '14px' }}>●</span>}
                            <span style={{ fontSize: '20px', fontWeight: '800' }}>{teamAName}</span>
                        </div>
                        <div style={{ fontSize: '72px', fontWeight: '900', color: '#10B981', margin: '15px 0' }}>{teamAScore}</div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={() => updateScore('A', 1)} style={miniBtnStyle('#10B981')}>+ Point</button>
                            <button onClick={() => updateScore('A', -1)} style={miniBtnStyle('#64748B')}>- Point</button>
                        </div>
                    </div>

                    <div style={{ fontSize: '24px', color: '#475569', fontWeight: '700' }}>
                        Set {bd.currentSetNumber || 1}
                    </div>

                    {/* Player B */}
                    <div style={{ textAlign: 'center', width: '40%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            {bd.serving === 'B' && <span style={{ color: '#FBBF24', fontSize: '14px' }}>●</span>}
                            <span style={{ fontSize: '20px', fontWeight: '800' }}>{teamBName}</span>
                        </div>
                        <div style={{ fontSize: '72px', fontWeight: '900', color: '#10B981', margin: '15px 0' }}>{teamBScore}</div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={() => updateScore('B', 1)} style={miniBtnStyle('#10B981')}>+ Point</button>
                            <button onClick={() => updateScore('B', -1)} style={miniBtnStyle('#64748B')}>- Point</button>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ background: '#1E293B', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <h3 style={{ margin: 0, color: '#38BDF8', fontSize: '16px' }}>Service & Set Actions</h3>
                        <button onClick={toggleServing} style={btnStyle('#0284C7')}>
                            📢 Toggle Server ({bd.serving === 'A' ? teamAName : teamBName})
                        </button>
                        <button onClick={handleSetFinished} style={btnStyle('#10B981')}>
                            🏆 Finish Current Set
                        </button>
                    </div>

                    <div style={{ background: '#1E293B', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <h3 style={{ margin: 0, color: '#38BDF8', fontSize: '16px' }}>Sets Score History</h3>
                        <div style={{ fontSize: '14px', color: '#94A3B8' }}>
                            Sets Won: {teamAName} ({bd.setsWonA || 0}) — {teamBName} ({bd.setsWonB || 0})
                        </div>
                        {bd.setScores && bd.setScores.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                {bd.setScores.map((score, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <span>Set {idx+1}:</span>
                                        <span style={{ fontWeight: '600' }}>{score.a} - {score.b}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ color: '#64748B', fontSize: '13px' }}>No previous sets logged.</div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const btnStyle = (bg) => ({
        background: bg, color: '#FFF', border: 'none', padding: '12px 20px',
        borderRadius: '8px', fontWeight: '600', cursor: 'pointer', textAlign: 'center'
    });

    const miniBtnStyle = (bg, padding = '10px 20px') => ({
        background: bg, color: '#FFF', border: 'none', padding,
        borderRadius: '6px', fontWeight: '600', cursor: 'pointer'
    });

    const inputStyle = {
        background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)',
        color: '#FFF', padding: '10px', borderRadius: '6px', width: '100%', boxSizing: 'border-box'
    };

    return (
        <div style={{
            minHeight: '100vh', backgroundColor: '#0F172A', color: '#F1F5F9',
            fontFamily: 'system-ui, sans-serif', padding: '40px'
        }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                
                {/* Header Back Link */}
                <div style={{ marginBottom: '20px' }}>
                    <Link href="/admin/scoreboard" style={{ color: '#38BDF8', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
                        ← Back to Scoreboard Manager
                    </Link>
                </div>

                {/* Scoreboard Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ background: '#38BDF8', color: '#0F172A', fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                {sport}
                            </span>
                            <span style={{ color: '#94A3B8', fontSize: '13px' }}>Match Scorekeeper Panel</span>
                        </div>
                        <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '10px 0 0 0', color: '#FFF' }}>{matchName}</h1>
                    </div>
                    
                    {/* Status Toggle */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '600' }}>Match Status</label>
                        <select 
                            value={status} 
                            onChange={(e) => handleStatusChange(e.target.value)}
                            style={{
                                background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)',
                                color: '#FFF', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer'
                            }}
                        >
                            <option value="UPCOMING">Upcoming</option>
                            <option value="LIVE">Live</option>
                            <option value="FINISHED">Finished</option>
                        </select>
                    </div>
                </div>

                {/* Render Sport Specific Controls */}
                {sport === 'cricket' && renderCricketControls()}
                {sport === 'football' && renderFootballControls()}
                {sport === 'badminton' && renderBadmintonControls()}

                {saving && (
                    <div style={{
                        position: 'fixed', bottom: '20px', right: '20px',
                        background: '#10B981', color: '#FFF', padding: '12px 24px',
                        borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        fontSize: '14px', fontWeight: '600'
                    }}>
                        Syncing live score...
                    </div>
                )}

            </div>
        </div>
    );
}
