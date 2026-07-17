"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBackendUrl } from '../lib/backendUrl';

const BACKEND_URL = getBackendUrl();

// Parses a fetch response as JSON, but converts HTML/error-page responses
// (backend down, proxy 502, etc.) into a human-readable error instead of
// the cryptic "Unexpected token '<' ... is not valid JSON".
async function parseJsonSafe(res) {
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        throw new Error(
            res.ok
                ? 'Server returned an unexpected response. Please try again.'
                : 'Cannot reach the backend server right now. Please wait a few seconds and try again.'
        );
    }
}

export default function LoginPage() {
    const router = useRouter();

    const getRedirectUrl = () => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return params.get('redirect') || '/admin';
        }
        return '/admin';
    };

    useEffect(() => {
        const originalFetch = window.fetch;
        window.fetch = function (url, options = {}) {
            if (typeof url === 'string' && url.includes(BACKEND_URL)) {
                options.credentials = 'include';
            }
            return originalFetch(url, options);
        };
        return () => {
            window.fetch = originalFetch;
        };
    }, []);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [firstTimeBootstrap, setFirstTimeBootstrap] = useState(false);
    const [bootstrapRole, setBootstrapRole] = useState('SUPER_ADMIN');
    
    // Ask the backend whether the very first admin still needs to be created.
    // Auto-opens bootstrap mode on a fresh database, and forces normal login
    // mode when accounts already exist (bootstrap would be rejected anyway).
    const checkBootstrapNeeded = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/bootstrap-status`);
            const data = await parseJsonSafe(res);
            if (res.ok) {
                setFirstTimeBootstrap(Boolean(data.bootstrapNeeded));
            }
        } catch (e) {
            // Backend unreachable — leave the normal login form visible.
            console.error('Bootstrap status check failed:', e);
        }
    };

    // Frontend-domain session marker read by middleware.js to gate /admin
    // server-side. Not a security boundary — the backend validates the real
    // httpOnly JWT cookie on every API call.
    const setSessionMarker = () => {
        // Over HTTPS use SameSite=None so the cookie also works when the app
        // is embedded in a cross-site iframe (e.g. the v0 preview); browsers
        // refuse to send SameSite=Lax cookies in that context. SameSite=None
        // requires Secure, so fall back to Lax on plain-HTTP localhost.
        const isHttps = window.location.protocol === 'https:';
        const attrs = isHttps ? '; SameSite=None; Secure' : '; SameSite=Lax';
        document.cookie = `kp_session=1; path=/; max-age=${24 * 60 * 60}${attrs}`;
    };

    useEffect(() => {
        // Clear old client-side identity hints on landing on login page.
        // The real session is the HTTP-only cookie cleared by the backend logout route.
        localStorage.removeItem('token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('username');
        document.cookie = 'kp_session=; path=/; max-age=0';
        checkBootstrapNeeded();
    }, []);

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage('');

        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });
            const data = await parseJsonSafe(res);

            if (!res.ok) {
                // If it failed, let's check if the error is due to zero staff records (invalid credentials fallback)
                // In local testing, if database is completely blank, we can prompt register.
                throw new Error(data.error || 'Login failed. Please check credentials.');
            }

            localStorage.setItem('user_role', data.user.role);
            localStorage.setItem('username', data.user.username);
            setSessionMarker();

            // Redirect to dashboard or requested page
            router.push(getRedirectUrl());

        } catch (err) {
            console.error(err);
            setErrorMessage(err.message || 'Connection error contacting auth server.');
        } finally {
            setLoading(false);
        }
    };

    const handleBootstrapSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage('');

        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, role: bootstrapRole })
            });
            const data = await parseJsonSafe(res);

            if (!res.ok) {
                throw new Error(data.error || 'Failed to bootstrap account.');
            }

            // Immediately log them in
            const loginRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });
            const loginData = await parseJsonSafe(loginRes);
            if (!loginRes.ok) {
                throw new Error(loginData.error || 'Bootstrap account created, but login failed.');
            }
            
            localStorage.setItem('user_role', loginData.user.role);
            localStorage.setItem('username', loginData.user.username);
            setSessionMarker();

            router.push(getRedirectUrl());

        } catch (err) {
            console.error(err);
            setErrorMessage(err.message || 'Error bootstrapped first account.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(ellipse at 30% 20%, rgba(16,185,129,0.06) 0%, #020405 55%, #020405 100%)',
            backgroundColor: '#020405',
            padding: '24px',
            fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Ambient glow orbs */}
            <div style={{
                position: 'absolute',
                top: '-120px',
                left: '-80px',
                width: '400px',
                height: '400px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(57,255,20,0.07) 0%, transparent 70%)',
                filter: 'blur(80px)',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute',
                bottom: '-100px',
                right: '-60px',
                width: '350px',
                height: '350px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
                filter: 'blur(80px)',
                pointerEvents: 'none',
            }} />

            {/* Login Card */}
            <div
                className="glass-card"
                style={{
                    maxWidth: '440px',
                    width: '100%',
                    padding: '44px 36px 36px',
                    borderRadius: '20px',
                    background: 'linear-gradient(145deg, rgba(16,185,129,0.06) 0%, rgba(2,4,5,0.85) 40%, rgba(2,4,5,0.92) 100%)',
                    backdropFilter: 'blur(24px) saturate(140%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(140%)',
                    border: '1px solid rgba(57,255,20,0.12)',
                    boxShadow: '0 0 40px rgba(57,255,20,0.06), 0 0 80px rgba(16,185,129,0.04), 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
                    position: 'relative',
                    zIndex: 1,
                    animation: 'fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
            >
                {/* Logo Section */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '76px',
                        height: '76px',
                        borderRadius: '50%',
                        background: '#040609',
                        border: '2px solid rgba(57, 255, 20, 0.35)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '18px',
                        boxShadow: '0 0 25px rgba(57, 255, 20, 0.15)',
                        overflow: 'hidden'
                    }}>
                        <img src="/logo.png" alt="Khelo Patna Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: 800,
                        color: '#ffffff',
                        letterSpacing: '3px',
                        marginBottom: '8px',
                        fontFamily: "'Space Grotesk', sans-serif",
                        textTransform: 'uppercase',
                        lineHeight: 1.2,
                    }}>
                        KHELO<span style={{
                            color: '#39ff14',
                            textShadow: '0 0 20px rgba(57,255,20,0.4), 0 0 40px rgba(57,255,20,0.15)',
                        }}>PATNA</span>
                    </h1>
                    <p style={{
                        fontSize: '0.82rem',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.45)',
                        fontWeight: 600,
                        fontFamily: "'Space Grotesk', sans-serif",
                        letterSpacing: '1.5px',
                        margin: 0,
                    }}>
                        {firstTimeBootstrap ? 'First Admin Setup' : 'Staff Dashboard Login'}
                    </p>
                </div>

                {/* Divider */}
                <div style={{
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent, rgba(57,255,20,0.15), rgba(16,185,129,0.1), transparent)',
                    marginBottom: '28px',
                }} />

                {/* Error Alert */}
                {errorMessage && (
                    <div className="glass-panel" style={{
                        background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.04))',
                        border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        marginBottom: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        backdropFilter: 'blur(8px)',
                    }}>
                        <span style={{
                            fontSize: '16px',
                            color: '#fca5a5',
                            flexShrink: 0,
                        }}>⚠️</span>
                        <span style={{
                            color: '#fca5a5',
                            fontSize: '0.82rem',
                            fontFamily: "'Space Grotesk', sans-serif",
                            lineHeight: 1.5,
                        }}>{errorMessage}</span>
                    </div>
                )}

                {/* Normal Login Form */}
                {!firstTimeBootstrap ? (
                    <form onSubmit={handleLoginSubmit}>
                        <div style={{ marginBottom: '20px' }}>
                            <label htmlFor="staff-username" style={{
                                display: 'block',
                                fontSize: '0.78rem',
                                color: 'rgba(255,255,255,0.5)',
                                marginBottom: '8px',
                                fontWeight: 600,
                                fontFamily: "'Space Grotesk', sans-serif",
                                letterSpacing: '0.8px',
                                textTransform: 'uppercase',
                            }}>Username</label>
                            <input 
                                id="staff-username"
                                type="text" 
                                className="glass-input" 
                                placeholder="Enter username" 
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '13px 16px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#ffffff',
                                    fontSize: '0.92rem',
                                    fontFamily: "'Space Grotesk', sans-serif",
                                    outline: 'none',
                                    transition: 'all 0.3s ease',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>
                        <div style={{ marginBottom: '28px' }}>
                            <label htmlFor="staff-password" style={{
                                display: 'block',
                                fontSize: '0.78rem',
                                color: 'rgba(255,255,255,0.5)',
                                marginBottom: '8px',
                                fontWeight: 600,
                                fontFamily: "'Space Grotesk', sans-serif",
                                letterSpacing: '0.8px',
                                textTransform: 'uppercase',
                            }}>Password</label>
                            <input 
                                id="staff-password"
                                type="password" 
                                className="glass-input" 
                                placeholder="Enter password" 
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '13px 16px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#ffffff',
                                    fontSize: '0.92rem',
                                    fontFamily: "'Space Grotesk', sans-serif",
                                    outline: 'none',
                                    transition: 'all 0.3s ease',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>

                        <button type="submit" className="btn-premium" disabled={loading} style={{
                            width: '100%',
                            padding: '14px 24px',
                            borderRadius: '12px',
                            background: loading
                                ? 'rgba(57,255,20,0.08)'
                                : 'linear-gradient(135deg, rgba(57,255,20,0.15), rgba(16,185,129,0.12))',
                            border: '1px solid rgba(57,255,20,0.2)',
                            color: loading ? 'rgba(57,255,20,0.5)' : '#39ff14',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            fontFamily: "'Space Grotesk', sans-serif",
                            letterSpacing: '1.5px',
                            textTransform: 'uppercase',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: loading ? 'none' : '0 0 20px rgba(57,255,20,0.08), 0 4px 16px rgba(0,0,0,0.3)',
                            marginBottom: '16px',
                        }}>
                            {loading ? 'Authenticating...' : 'Sign In'}
                        </button>
                    </form>
                ) : (
                    /* Initial Admin Bootstrap Form */
                    <form onSubmit={handleBootstrapSubmit}>
                        <div className="glass-panel" style={{
                            background: 'linear-gradient(135deg, rgba(245,197,66,0.08), rgba(245,197,66,0.02))',
                            border: '1px solid rgba(245,197,66,0.18)',
                            borderRadius: '12px',
                            padding: '14px 16px',
                            marginBottom: '24px',
                            fontSize: '0.8rem',
                            color: 'rgba(255,224,102,0.9)',
                            fontFamily: "'Space Grotesk', sans-serif",
                            lineHeight: 1.6,
                            backdropFilter: 'blur(8px)',
                        }}>
                            💡 <strong style={{ color: '#ffe066' }}>Bootstrap Mode:</strong> Registering the very first account on a fresh database does not require authorization headers.
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label htmlFor="bootstrap-username" style={{
                                display: 'block',
                                fontSize: '0.78rem',
                                color: 'rgba(255,255,255,0.5)',
                                marginBottom: '8px',
                                fontWeight: 600,
                                fontFamily: "'Space Grotesk', sans-serif",
                                letterSpacing: '0.8px',
                                textTransform: 'uppercase',
                            }}>Admin Username</label>
                            <input 
                                id="bootstrap-username"
                                type="text" 
                                className="glass-input" 
                                placeholder="Create admin username" 
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '13px 16px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#ffffff',
                                    fontSize: '0.92rem',
                                    fontFamily: "'Space Grotesk', sans-serif",
                                    outline: 'none',
                                    transition: 'all 0.3s ease',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label htmlFor="bootstrap-password" style={{
                                display: 'block',
                                fontSize: '0.78rem',
                                color: 'rgba(255,255,255,0.5)',
                                marginBottom: '8px',
                                fontWeight: 600,
                                fontFamily: "'Space Grotesk', sans-serif",
                                letterSpacing: '0.8px',
                                textTransform: 'uppercase',
                            }}>Admin Password</label>
                            <input 
                                id="bootstrap-password"
                                type="password" 
                                className="glass-input" 
                                placeholder="Create admin password" 
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '13px 16px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#ffffff',
                                    fontSize: '0.92rem',
                                    fontFamily: "'Space Grotesk', sans-serif",
                                    outline: 'none',
                                    transition: 'all 0.3s ease',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>
                        <div style={{ marginBottom: '28px' }}>
                            <label htmlFor="bootstrap-role" style={{
                                display: 'block',
                                fontSize: '0.78rem',
                                color: 'rgba(255,255,255,0.5)',
                                marginBottom: '8px',
                                fontWeight: 600,
                                fontFamily: "'Space Grotesk', sans-serif",
                                letterSpacing: '0.8px',
                                textTransform: 'uppercase',
                            }}>Initial Role</label>
                            <select 
                                id="bootstrap-role"
                                className="glass-input"
                                value={bootstrapRole}
                                onChange={(e) => setBootstrapRole(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '13px 16px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#ffffff',
                                    fontSize: '0.92rem',
                                    fontFamily: "'Space Grotesk', sans-serif",
                                    outline: 'none',
                                    transition: 'all 0.3s ease',
                                    boxSizing: 'border-box',
                                    appearance: 'none',
                                    WebkitAppearance: 'none',
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='rgba(255,255,255,0.4)' d='M6 8.825L0.35 3.175 1.175 2.35 6 7.175 10.825 2.35 11.65 3.175z'/%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 14px center',
                                    paddingRight: '40px',
                                }}
                            >
                                <option value="SUPER_ADMIN" style={{ background: '#0a0f14', color: '#fff' }}>SUPER_ADMIN (Full system access)</option>
                                <option value="BRANCH_MANAGER" style={{ background: '#0a0f14', color: '#fff' }}>BRANCH_MANAGER (Turf & POS)</option>
                                <option value="RECEPTIONIST" style={{ background: '#0a0f14', color: '#fff' }}>RECEPTIONIST (Academy & Attendance)</option>
                            </select>
                        </div>

                        <button type="submit" className="btn-premium" disabled={loading} style={{
                            width: '100%',
                            padding: '14px 24px',
                            borderRadius: '12px',
                            background: loading
                                ? 'rgba(57,255,20,0.08)'
                                : 'linear-gradient(135deg, rgba(57,255,20,0.15), rgba(16,185,129,0.12))',
                            border: '1px solid rgba(57,255,20,0.2)',
                            color: loading ? 'rgba(57,255,20,0.5)' : '#39ff14',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            fontFamily: "'Space Grotesk', sans-serif",
                            letterSpacing: '1.5px',
                            textTransform: 'uppercase',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: loading ? 'none' : '0 0 20px rgba(57,255,20,0.08), 0 4px 16px rgba(0,0,0,0.3)',
                            marginBottom: '16px',
                        }}>
                            {loading ? '⏳ Bootstrapping...' : '👑 Create & Log In'}
                        </button>

                        <div style={{ textAlign: 'center', marginTop: '16px' }}>
                            <button 
                                type="button"
                                onClick={() => setFirstTimeBootstrap(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'rgba(255,255,255,0.4)',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    fontFamily: "'Space Grotesk', sans-serif",
                                    fontWeight: 500,
                                    textDecoration: 'none',
                                    transition: 'color 0.2s ease',
                                    padding: '4px 8px',
                                    borderBottom: '1px dashed rgba(255,255,255,0.12)',
                                }}
                            >
                                ← Back to login
                            </button>
                        </div>
                    </form>
                )}

                {/* Bottom separator & back link */}
                <div style={{
                    marginTop: '28px',
                    paddingTop: '20px',
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    textAlign: 'center',
                }}>
                    <Link href="/" style={{
                        color: 'rgba(255,255,255,0.3)',
                        textDecoration: 'none',
                        fontSize: '0.78rem',
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontWeight: 500,
                        letterSpacing: '0.5px',
                        transition: 'color 0.2s ease',
                    }}>
                        ← Back to public homepage
                    </Link>
                </div>
            </div>

            {/* Inline keyframes */}
            <style jsx>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(24px) scale(0.97);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                .glass-input:focus {
                    border-color: rgba(57,255,20,0.25) !important;
                    box-shadow: 0 0 0 3px rgba(57,255,20,0.06), 0 0 20px rgba(57,255,20,0.05) !important;
                    background: rgba(255,255,255,0.05) !important;
                }
                .glass-input::placeholder {
                    color: rgba(255,255,255,0.2);
                }
                .btn-premium:hover:not(:disabled) {
                    background: linear-gradient(135deg, rgba(57,255,20,0.22), rgba(16,185,129,0.18)) !important;
                    box-shadow: 0 0 30px rgba(57,255,20,0.15), 0 4px 20px rgba(0,0,0,0.35) !important;
                    transform: translateY(-1px);
                }
                .btn-premium:active:not(:disabled) {
                    transform: translateY(0px);
                }
                select.glass-input option {
                    background: #0a0f14;
                    color: #ffffff;
                }
            `}</style>
        </div>
    );
}
