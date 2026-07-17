'use client';

import { useEffect, useState, useRef } from 'react';
import { getBackendUrl } from '@/app/lib/backendUrl';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const BACKEND_URL = getBackendUrl();

// ---------------------------------------------------------------------------
// Style helpers (dark theme)
// ---------------------------------------------------------------------------
const btnStyle = (bg) => ({
    background: bg, color: '#FFF', border: 'none', padding: '12px 20px',
    borderRadius: '8px', fontWeight: '600', cursor: 'pointer', textAlign: 'center',
    fontSize: '14px', transition: 'opacity 0.15s',
});

const miniBtnStyle = (bg, padding = '10px 20px') => ({
    background: bg, color: '#FFF', border: 'none', padding,
    borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px',
});

const inputStyle = {
    background: '#0F172A', border: '1px solid rgba(255,255,255,0.1)',
    color: '#FFF', padding: '10px', borderRadius: '6px', width: '100%', boxSizing: 'border-box',
};

const sectionCard = {
    background: '#1E293B', padding: '20px', borderRadius: '12px',
    display: 'flex', flexDirection: 'column', gap: '15px',
};

const sectionTitle = (color = '#38BDF8') => ({
    margin: 0, color, fontSize: '16px', fontWeight: '700',
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ScorekeeperPanel() {
    const params = useParams();
    const scoreboardId = params.id;

    const [scoreboard, setScoreboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);
    const [saving, setSaving] = useState(false);

    // Winner modal state
    const [showWinnerModal, setShowWinnerModal] = useState(false);
    const [pendingStatus, setPendingStatus] = useState(null);

    // Goal scorer prompt state
    const [goalScorerPrompt, setGoalScorerPrompt] = useState(null); // { team: 'A'|'B' }
    const [goalScorerName, setGoalScorerName] = useState('');

    // Undo – one-level snapshot
    const lastStateRef = useRef(null);
    const [canUndo, setCanUndo] = useState(false);

    // Timer refs for Football
    const timerRef = useRef(null);
    const [displaySeconds, setDisplaySeconds] = useState(0);

    // -----------------------------------------------------------------------
    // Auth – preserved exactly
    // -----------------------------------------------------------------------
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

    // -----------------------------------------------------------------------
    // Fetch scoreboard
    // -----------------------------------------------------------------------
    useEffect(() => {
        if (!authenticated || !scoreboardId) return;

        fetch(`${BACKEND_URL}/api/scoreboards/${scoreboardId}`, {
            credentials: 'include'
        })
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
    }, [authenticated, scoreboardId]);

    // -----------------------------------------------------------------------
    // Timer display – smooth 100ms interval for football
    // -----------------------------------------------------------------------
    useEffect(() => {
        if (!scoreboard || scoreboard.sport !== 'football') return;
        const fb = scoreboard.settings?.football || {};

        const compute = () => {
            let secs = fb.timerSeconds || 0;
            if (fb.timerRunning && fb.timerStartAt) {
                secs += (Date.now() - new Date(fb.timerStartAt).getTime()) / 1000;
            }
            setDisplaySeconds(Math.floor(secs));
        };
        compute();

        if (fb.timerRunning && fb.timerStartAt) {
            if (!timerRef.current) {
                timerRef.current = setInterval(compute, 100);
            }
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [scoreboard?.settings?.football?.timerRunning, scoreboard?.settings?.football?.timerStartAt, scoreboard?.settings?.football?.timerSeconds]);

    // -----------------------------------------------------------------------
    // Save helper – stores undo snapshot before every save
    // -----------------------------------------------------------------------
    const saveScoreboardState = async (updatedFields) => {
        // Snapshot current state for undo
        if (scoreboard) {
            lastStateRef.current = JSON.parse(JSON.stringify(scoreboard));
            setCanUndo(true);
        }

        setSaving(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/scoreboards/${scoreboardId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
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

    // -----------------------------------------------------------------------
    // Undo handler
    // -----------------------------------------------------------------------
    const handleUndo = async () => {
        if (!lastStateRef.current) return;
        const prev = lastStateRef.current;
        setSaving(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/scoreboards/${scoreboardId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    teamAScore: prev.teamAScore,
                    teamBScore: prev.teamBScore,
                    status: prev.status,
                    settings: prev.settings,
                    events: prev.events,
                    winner: prev.winner,
                })
            });
            if (!res.ok) throw new Error('Undo failed');
            const data = await res.json();
            setScoreboard(data);
            lastStateRef.current = null;
            setCanUndo(false);
        } catch (err) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    // -----------------------------------------------------------------------
    // Events helper – appends an event to the events array
    // -----------------------------------------------------------------------
    const appendEvent = (currentEvents, event) => {
        return [...(currentEvents || []), { ...event, timestamp: new Date().toISOString() }];
    };

    // -----------------------------------------------------------------------
    // Score update (generic)
    // -----------------------------------------------------------------------
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

    // -----------------------------------------------------------------------
    // Status change – with winner modal for FINISHED
    // -----------------------------------------------------------------------
    const handleStatusChange = (newStatus) => {
        if (newStatus === 'FINISHED') {
            setPendingStatus(newStatus);
            setShowWinnerModal(true);
        } else {
            saveScoreboardState({ status: newStatus });
        }
    };

    const confirmWinner = (winner) => {
        const events = appendEvent(scoreboard.events, {
            type: 'match_finished',
            winner,
        });
        saveScoreboardState({ status: pendingStatus, winner, events });
        setShowWinnerModal(false);
        setPendingStatus(null);
    };

    // -----------------------------------------------------------------------
    // Loading / empty states
    // -----------------------------------------------------------------------
    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0F172A', color: '#FFF' }}>
                <div>Loading Scorekeeper Control...</div>
            </div>
        );
    }

    if (!scoreboard) return null;

    const { sport, matchName, teamAName, teamBName, teamAScore, teamBScore, status, settings } = scoreboard;

    // ======================================================================
    // CRICKET PANEL
    // ======================================================================
    const renderCricketControls = () => {
        const cr = settings?.cricket || {};

        const updateCricketSettings = (fields) => {
            saveScoreboardState({
                settings: {
                    ...settings,
                    cricket: { ...cr, ...fields }
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

            // Build event
            let eventType = 'runs';
            const eventDetails = { runs, team: cr.currentBattingTeam || 'A' };

            if (!isExtra) {
                balls += 1;
                newOverSummary.push(runs.toString());
                if (runs === 4) eventType = 'boundary_four';
                if (runs === 6) eventType = 'boundary_six';
                if (balls >= 6) {
                    overs += 1;
                    balls = 0;
                    newOverSummary = [];
                }
            } else {
                newOverSummary.push(extraType);
                eventType = 'extra';
                eventDetails.extraType = extraType;
            }

            const nextOvers = `${overs}.${balls}`;
            const events = appendEvent(scoreboard.events, { type: eventType, ...eventDetails });

            saveScoreboardState({
                teamAScore: nextRuns,
                events,
                settings: {
                    ...settings,
                    cricket: {
                        ...cr,
                        oversA: nextOvers,
                        overSummary: newOverSummary,
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
            const events = appendEvent(scoreboard.events, {
                type: 'wicket',
                team: cr.currentBattingTeam || 'A',
                wickets: nextWickets,
            });

            saveScoreboardState({
                events,
                settings: {
                    ...settings,
                    cricket: {
                        ...cr,
                        wicketsA: nextWickets,
                        oversA: nextOvers,
                        overSummary: newOverSummary,
                    }
                }
            });
        };

        const handleSwitchInnings = () => {
            if (!confirm('Switch innings? This will archive the current batting score and set the target.')) return;

            const firstInningsScore = teamAScore;
            const target = firstInningsScore + 1;

            const events = appendEvent(scoreboard.events, {
                type: 'innings_switch',
                innings: 2,
                firstInningsScore,
                target,
            });

            saveScoreboardState({
                teamAScore: 0,
                events,
                settings: {
                    ...settings,
                    cricket: {
                        ...cr,
                        currentInnings: 2,
                        currentBattingTeam: 'B',
                        firstInningsScore,
                        target,
                        oversA: '0.0',
                        wicketsA: 0,
                        ballsInOver: 0,
                        overSummary: [],
                        partnership: 0,
                        currentBatsman1: '',
                        currentBatsman2: '',
                        currentBowler: '',
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
                            {cr.currentInnings === 2 ? '2nd Innings' : '1st Innings'} — Batting: {cr.currentBattingTeam === 'B' ? teamBName : teamAName}
                        </div>
                        <div style={{ fontSize: '64px', fontWeight: '900', color: '#38BDF8', margin: '10px 0' }}>
                            {teamAScore} / {cr.wicketsA || 0}
                        </div>
                        <div style={{ fontSize: '20px', color: '#F1F5F9', fontWeight: '600' }}>
                            Overs: {cr.oversA || '0.0'}{scoreboard.totalOvers ? ` / ${scoreboard.totalOvers}` : ''}
                        </div>
                        {cr.firstInningsScore != null && (
                            <div style={{ fontSize: '14px', color: '#94A3B8', marginTop: '8px' }}>
                                1st Innings: {cr.firstInningsScore} | Target: {cr.target}
                            </div>
                        )}
                    </div>
                </div>

                {/* Scorekeeper Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Runs Increments */}
                    <div style={sectionCard}>
                        <h3 style={sectionTitle()}>Add Runs (Batting Team)</h3>
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
                    <div style={sectionCard}>
                        <h3 style={sectionTitle('#F43F5E')}>Wickets & Extras</h3>
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

                {/* Switch Innings */}
                {(cr.currentInnings || 1) === 1 && (
                    <div style={{ ...sectionCard, alignItems: 'center', border: '2px dashed #F59E0B' }}>
                        <h3 style={sectionTitle('#F59E0B')}>⚠️ Innings Control</h3>
                        <button
                            onClick={handleSwitchInnings}
                            style={{ ...btnStyle('#F59E0B'), fontSize: '16px', padding: '14px 32px' }}
                        >
                            🔄 Switch Innings (End 1st Innings)
                        </button>
                        <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                            This archives the current score, sets target, and resets for 2nd innings.
                        </span>
                    </div>
                )}

                {/* Over Summary */}
                {(cr.overSummary || []).length > 0 && (
                    <div style={sectionCard}>
                        <h3 style={sectionTitle()}>Current Over</h3>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {cr.overSummary.map((ball, i) => (
                                <span key={i} style={{
                                    background: ball === 'W' ? '#EF4444' : ball === '4' ? '#10B981' : ball === '6' ? '#8B5CF6' : '#334155',
                                    color: '#FFF', padding: '6px 12px', borderRadius: '6px', fontWeight: '700', fontSize: '14px',
                                }}>
                                    {ball}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Match Information / Settings */}
                <div style={sectionCard}>
                    <h3 style={sectionTitle()}>Batter & Bowler Settings</h3>
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

    // ======================================================================
    // FOOTBALL PANEL
    // ======================================================================
    const renderFootballControls = () => {
        const fb = settings?.football || {};

        const updateFootballSettings = (fields) => {
            saveScoreboardState({
                settings: {
                    ...settings,
                    football: { ...fb, ...fields }
                }
            });
        };

        // ----- Timer sync fix -----
        const handleStartTimer = () => {
            updateFootballSettings({
                timerRunning: true,
                timerStartAt: new Date().toISOString(),
                // timerSeconds stays as the base
            });
        };

        const handlePauseTimer = () => {
            const base = fb.timerSeconds || 0;
            const startAt = fb.timerStartAt;
            let elapsed = 0;
            if (startAt) {
                elapsed = (Date.now() - new Date(startAt).getTime()) / 1000;
            }
            updateFootballSettings({
                timerSeconds: Math.floor(base + elapsed),
                timerRunning: false,
                timerStartAt: null,
            });
        };

        const resetTimer = () => {
            if (confirm('Reset timer to 0?')) {
                updateFootballSettings({ timerSeconds: 0, timerRunning: false, timerStartAt: null });
            }
        };

        // ----- Goal with scorer prompt -----
        const handleGoal = (team) => {
            setGoalScorerPrompt({ team });
            setGoalScorerName('');
        };

        const confirmGoal = () => {
            const team = goalScorerPrompt.team;
            const scorer = goalScorerName.trim() || 'Unknown';
            const minute = displaySeconds;

            const goalScorers = [...(fb.goalScorers || []), { team, scorer, minute }];
            const events = appendEvent(scoreboard.events, {
                type: 'goal',
                team,
                scorer,
                minute,
            });

            const scoreField = team === 'A'
                ? { teamAScore: scoreboard.teamAScore + 1 }
                : { teamBScore: scoreboard.teamBScore + 1 };

            // Snapshot for undo before saving
            if (scoreboard) {
                lastStateRef.current = JSON.parse(JSON.stringify(scoreboard));
                setCanUndo(true);
            }

            setSaving(true);
            fetch(`${BACKEND_URL}/api/scoreboards/${scoreboardId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    ...scoreField,
                    events,
                    settings: { ...settings, football: { ...fb, goalScorers } },
                })
            })
                .then(res => {
                    if (!res.ok) throw new Error('Failed to save goal');
                    return res.json();
                })
                .then(data => setScoreboard(data))
                .catch(err => alert(err.message))
                .finally(() => setSaving(false));

            setGoalScorerPrompt(null);
        };

        const skipGoalScorer = () => {
            setGoalScorerName('');
            confirmGoal();
        };

        // ----- Cards -----
        const handleCard = (cardType, team, delta) => {
            const field = `${cardType}Cards${team}`;
            const newVal = Math.max(0, (fb[field] || 0) + delta);
            const events = appendEvent(scoreboard.events, {
                type: cardType === 'yellow' ? 'yellow_card' : 'red_card',
                team,
                count: newVal,
            });
            // Save via saveScoreboardState (captures undo snapshot)
            saveScoreboardState({
                events,
                settings: { ...settings, football: { ...fb, [field]: newVal } },
            });
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

                {/* Goal scorer prompt modal */}
                {goalScorerPrompt && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                        zIndex: 1000,
                    }}>
                        <div style={{
                            background: '#1E293B', padding: '30px', borderRadius: '16px',
                            width: '400px', maxWidth: '90vw', display: 'flex', flexDirection: 'column', gap: '15px',
                        }}>
                            <h3 style={{ margin: 0, color: '#38BDF8' }}>
                                ⚽ Goal for {goalScorerPrompt.team === 'A' ? teamAName : teamBName}
                            </h3>
                            <label style={{ fontSize: '13px', color: '#94A3B8' }}>Goal scored by? (optional)</label>
                            <input
                                type="text"
                                placeholder="Player name"
                                value={goalScorerName}
                                onChange={(e) => setGoalScorerName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && confirmGoal()}
                                style={inputStyle}
                                autoFocus
                            />
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={confirmGoal} style={btnStyle('#10B981')}>Confirm Goal</button>
                                <button onClick={skipGoalScorer} style={btnStyle('#64748B')}>Skip Name</button>
                                <button onClick={() => setGoalScorerPrompt(null)} style={btnStyle('#374151')}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}

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
                            <button onClick={() => handleGoal('A')} style={miniBtnStyle('#10B981')}>+ Goal</button>
                            <button onClick={() => updateScore('A', -1)} style={miniBtnStyle('#64748B')}>- Goal</button>
                        </div>
                    </div>

                    <div style={{ fontSize: '24px', color: '#475569', fontWeight: '700' }}>vs</div>

                    {/* Team B */}
                    <div style={{ textAlign: 'center', width: '40%' }}>
                        <div style={{ fontSize: '20px', fontWeight: '800' }}>{teamBName}</div>
                        <div style={{ fontSize: '72px', fontWeight: '900', color: '#10B981', margin: '15px 0' }}>{teamBScore}</div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            <button onClick={() => handleGoal('B')} style={miniBtnStyle('#10B981')}>+ Goal</button>
                            <button onClick={() => updateScore('B', -1)} style={miniBtnStyle('#64748B')}>- Goal</button>
                        </div>
                    </div>
                </div>

                {/* Match Timer & Period Settings */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                    {/* Timer Controls — synced */}
                    <div style={sectionCard}>
                        <h3 style={sectionTitle()}>Match Timer</h3>
                        <div style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'monospace', textAlign: 'center', color: '#FBBF24' }}>
                            {Math.floor(displaySeconds / 60).toString().padStart(2, '0')}:
                            {(displaySeconds % 60).toString().padStart(2, '0')}
                            {scoreboard.matchDuration ? <span style={{ fontSize: '18px', color: '#64748B', marginLeft: '6px' }}>/ {scoreboard.matchDuration} min</span> : ''}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {fb.timerRunning ? (
                                <button onClick={handlePauseTimer} style={btnStyle('#EF4444')}>⏸️ Pause</button>
                            ) : (
                                <button onClick={handleStartTimer} style={btnStyle('#10B981')}>▶️ Start</button>
                            )}
                            <button onClick={resetTimer} style={btnStyle('#374151')}>🔄 Reset</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px' }}>
                            <label style={{ fontSize: '12px', color: '#94A3B8' }}>Manually Set Time (Seconds)</label>
                            <input
                                type="number"
                                value={fb.timerSeconds || 0}
                                onChange={(e) => updateFootballSettings({ timerSeconds: parseInt(e.target.value || 0, 10), timerStartAt: null, timerRunning: false })}
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    {/* Cards & Period */}
                    <div style={sectionCard}>
                        <h3 style={sectionTitle()}>Period & Card Controls</h3>

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

                        {/* Yellow Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: '#EAB308' }}>🟨 Yellow ({teamAName}): {fb.yellowCardsA || 0}</span>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button onClick={() => handleCard('yellow', 'A', 1)} style={miniBtnStyle('#EAB308', '6px 12px')}>+</button>
                                    <button onClick={() => handleCard('yellow', 'A', -1)} style={miniBtnStyle('#64748B', '6px 12px')}>-</button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: '#EAB308' }}>🟨 Yellow ({teamBName}): {fb.yellowCardsB || 0}</span>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button onClick={() => handleCard('yellow', 'B', 1)} style={miniBtnStyle('#EAB308', '6px 12px')}>+</button>
                                    <button onClick={() => handleCard('yellow', 'B', -1)} style={miniBtnStyle('#64748B', '6px 12px')}>-</button>
                                </div>
                            </div>
                        </div>

                        {/* Red Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: '#EF4444' }}>🟥 Red ({teamAName}): {fb.redCardsA || 0}</span>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button onClick={() => handleCard('red', 'A', 1)} style={miniBtnStyle('#EF4444', '6px 12px')}>+</button>
                                    <button onClick={() => handleCard('red', 'A', -1)} style={miniBtnStyle('#64748B', '6px 12px')}>-</button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: '#EF4444' }}>🟥 Red ({teamBName}): {fb.redCardsB || 0}</span>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button onClick={() => handleCard('red', 'B', 1)} style={miniBtnStyle('#EF4444', '6px 12px')}>+</button>
                                    <button onClick={() => handleCard('red', 'B', -1)} style={miniBtnStyle('#64748B', '6px 12px')}>-</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Goal Scorers log */}
                {(fb.goalScorers || []).length > 0 && (
                    <div style={sectionCard}>
                        <h3 style={sectionTitle()}>⚽ Goal Scorers</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {fb.goalScorers.map((g, i) => (
                                <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between', padding: '6px 0',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '14px',
                                }}>
                                    <span style={{ color: g.team === 'A' ? '#38BDF8' : '#34D399' }}>
                                        {g.team === 'A' ? teamAName : teamBName}
                                    </span>
                                    <span>{g.scorer}</span>
                                    <span style={{ color: '#94A3B8' }}>
                                        {Math.floor((g.minute || 0) / 60)}&apos;
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ======================================================================
    // BADMINTON PANEL
    // ======================================================================
    const renderBadmintonControls = () => {
        const bd = settings?.badminton || {};

        const updateBadmintonSettings = (fields) => {
            saveScoreboardState({
                settings: {
                    ...settings,
                    badminton: { ...bd, ...fields }
                }
            });
        };

        // Auto-serve toggle on point scored
        const handlePoint = (team, delta) => {
            if (!scoreboard) return;
            const currentServing = bd.serving || 'A';

            if (delta > 0) {
                // Auto-toggle serve on point scored
                const nextServing = currentServing === 'A' ? 'B' : 'A';
                const scoreField = team === 'A'
                    ? { teamAScore: Math.max(0, scoreboard.teamAScore + delta) }
                    : { teamBScore: Math.max(0, scoreboard.teamBScore + delta) };

                saveScoreboardState({
                    ...scoreField,
                    settings: {
                        ...settings,
                        badminton: { ...bd, serving: nextServing }
                    }
                });
            } else {
                // Negative delta – just update score, no serve change
                updateScore(team, delta);
            }
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
                            <button onClick={() => handlePoint('A', 1)} style={miniBtnStyle('#10B981')}>+ Point</button>
                            <button onClick={() => handlePoint('A', -1)} style={miniBtnStyle('#64748B')}>- Point</button>
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
                            <button onClick={() => handlePoint('B', 1)} style={miniBtnStyle('#10B981')}>+ Point</button>
                            <button onClick={() => handlePoint('B', -1)} style={miniBtnStyle('#64748B')}>- Point</button>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={sectionCard}>
                        <h3 style={sectionTitle()}>Service & Set Actions</h3>
                        <button onClick={toggleServing} style={btnStyle('#0284C7')}>
                            📢 Toggle Server ({bd.serving === 'A' ? teamAName : teamBName})
                        </button>
                        <span style={{ fontSize: '11px', color: '#94A3B8', textAlign: 'center' }}>
                            Serve auto-toggles on each point scored
                        </span>
                        <button onClick={handleSetFinished} style={btnStyle('#10B981')}>
                            🏆 Finish Current Set
                        </button>
                    </div>

                    <div style={sectionCard}>
                        <h3 style={sectionTitle()}>Sets Score History</h3>
                        <div style={{ fontSize: '14px', color: '#94A3B8' }}>
                            Sets Won: {teamAName} ({bd.setsWonA || 0}) — {teamBName} ({bd.setsWonB || 0})
                        </div>
                        {bd.setScores && bd.setScores.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                {bd.setScores.map((score, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <span>Set {idx + 1}:</span>
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

    // ======================================================================
    // Events log renderer
    // ======================================================================
    const renderEventsLog = () => {
        const events = scoreboard.events || [];
        if (events.length === 0) return null;

        const eventLabel = (e) => {
            switch (e.type) {
                case 'goal': return `⚽ Goal: ${e.scorer || 'Unknown'} (${e.team === 'A' ? teamAName : teamBName}) ${e.minute != null ? Math.floor(e.minute / 60) + "'" : ''}`;
                case 'wicket': return `🔴 Wicket (${e.team === 'A' ? teamAName : teamBName})`;
                case 'boundary_four': return `4️⃣ Four!`;
                case 'boundary_six': return `6️⃣ Six!`;
                case 'yellow_card': return `🟨 Yellow Card (${e.team === 'A' ? teamAName : teamBName})`;
                case 'red_card': return `🟥 Red Card (${e.team === 'A' ? teamAName : teamBName})`;
                case 'innings_switch': return `🔄 Innings Switched — 1st: ${e.firstInningsScore}, Target: ${e.target}`;
                case 'match_finished': return `🏁 Match Finished — Winner: ${e.winner || 'N/A'}`;
                default: return e.type;
            }
        };

        return (
            <div style={{ ...sectionCard, marginTop: '30px' }}>
                <h3 style={sectionTitle('#94A3B8')}>📋 Match Events ({events.length})</h3>
                <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {[...events].reverse().map((e, i) => (
                        <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', padding: '6px 8px',
                            borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '13px',
                        }}>
                            <span>{eventLabel(e)}</span>
                            <span style={{ color: '#64748B', fontSize: '11px' }}>
                                {e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : ''}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // ======================================================================
    // MAIN RENDER
    // ======================================================================
    return (
        <div style={{
            minHeight: '100vh', backgroundColor: '#0F172A', color: '#F1F5F9',
            fontFamily: 'system-ui, sans-serif', padding: '40px'
        }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>

                {/* Header Back Link */}
                <div style={{ marginBottom: '20px' }}>
                    <Link href="/admin/scoreboard" style={{ color: '#38BDF8', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
                        ← Back to Control Center
                    </Link>
                </div>

                {/* Scoreboard Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{ background: '#38BDF8', color: '#0F172A', fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                {sport}
                            </span>
                            {scoreboard.matchFormat && (
                                <span style={{ background: 'rgba(255,255,255,0.1)', color: '#FFF', fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '4px' }}>
                                    {scoreboard.matchFormat}
                                </span>
                            )}
                            {scoreboard.matchType === 'tournament' && (
                                <span style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B', fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '4px' }}>
                                    🏆 TOURNAMENT
                                </span>
                            )}
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

                {/* Winner declaration */}
                {scoreboard.winner && (
                    <div style={{
                        background: '#10B981', padding: '12px 20px', borderRadius: '10px',
                        textAlign: 'center', marginBottom: '20px', fontWeight: '700', fontSize: '16px',
                    }}>
                        🏆 Winner: {scoreboard.winner}
                    </div>
                )}

                {/* Undo button */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <button
                        onClick={handleUndo}
                        disabled={!canUndo || saving}
                        style={{
                            ...btnStyle(canUndo ? '#F59E0B' : '#334155'),
                            opacity: canUndo ? 1 : 0.5,
                            cursor: canUndo ? 'pointer' : 'not-allowed',
                            padding: '10px 20px',
                        }}
                    >
                        ↩️ Undo Last Action
                    </button>
                </div>

                {/* Render Sport Specific Controls */}
                {sport === 'cricket' && renderCricketControls()}
                {sport === 'football' && renderFootballControls()}
                {sport === 'badminton' && renderBadmintonControls()}

                {/* Events log */}
                {renderEventsLog()}

                {/* Saving indicator */}
                {saving && (
                    <div style={{
                        position: 'fixed', bottom: '20px', right: '20px',
                        background: '#10B981', color: '#FFF', padding: '12px 24px',
                        borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        fontSize: '14px', fontWeight: '600', zIndex: 900,
                    }}>
                        Syncing live score...
                    </div>
                )}

                {/* Winner modal */}
                {showWinnerModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                        zIndex: 1000,
                    }}>
                        <div style={{
                            background: '#1E293B', padding: '30px', borderRadius: '16px',
                            width: '420px', maxWidth: '90vw', display: 'flex', flexDirection: 'column', gap: '20px',
                        }}>
                            <h3 style={{ margin: 0, color: '#F1F5F9', fontSize: '20px' }}>🏆 Declare Winner</h3>
                            <p style={{ margin: 0, color: '#94A3B8', fontSize: '14px' }}>
                                The match is being marked as FINISHED. Who won?
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <button onClick={() => confirmWinner(teamAName)} style={btnStyle('#10B981')}>
                                    {teamAName} Wins
                                </button>
                                <button onClick={() => confirmWinner(teamBName)} style={btnStyle('#38BDF8')}>
                                    {teamBName} Wins
                                </button>
                                <button onClick={() => confirmWinner('Draw')} style={btnStyle('#F59E0B')}>
                                    Draw
                                </button>
                                <button onClick={() => { setShowWinnerModal(false); setPendingStatus(null); }} style={btnStyle('#374151')}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
