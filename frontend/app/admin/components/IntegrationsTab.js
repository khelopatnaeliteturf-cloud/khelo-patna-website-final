import React, { useState, useEffect } from 'react';
import { APP_VERSION, BUILD_NUMBER, GIT_COMMIT_HASH, RELEASE_NAME, LAST_UPDATED } from '../../config/version';

export default function IntegrationsTab({ backendUrl, getHeaders }) {
    const [integrations, setIntegrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // WhatsApp details states (for live QR retrieval)
    const [waQr, setWaQr] = useState(null);
    const [waStatus, setWaStatus] = useState('');
    const [botEnabled, setBotEnabled] = useState(true);
    const [waLoading, setWaLoading] = useState(false);

    useEffect(() => {
        loadIntegrations();
        loadWhatsAppStatus();

        // Poll WhatsApp status every 3 seconds to keep QR code live and fresh
        const interval = setInterval(() => {
            loadWhatsAppStatus();
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const loadIntegrations = async () => {
        setRefreshing(true);
        try {
            const res = await fetch(`${backendUrl}/api/reports/integrations`, { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) {
                setIntegrations(data.integrations || []);
            }
        } catch (err) {
            console.error('Failed to load integrations status:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadWhatsAppStatus = async () => {
        try {
            const res = await fetch(`${backendUrl}/api/admin/whatsapp/status`, { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) {
                setWaStatus(data.status);
                setWaQr(data.qr);
                setBotEnabled(data.bot_enabled);
            }
        } catch (err) {
            console.error('Error fetching whatsapp status:', err);
        }
    };

    const handleReconnectWhatsApp = async () => {
        setWaLoading(true);
        try {
            const res = await fetch(`${backendUrl}/api/admin/whatsapp/reconnect`, {
                method: 'POST',
                headers: getHeaders()
            });
            if (res.ok) {
                alert('WhatsApp reconnection sequence initiated. Please wait 10-15 seconds for socket setup.');
                setTimeout(loadWhatsAppStatus, 3000);
            }
        } catch (err) {
            console.error('WhatsApp reconnection failed:', err);
        } finally {
            setWaLoading(false);
        }
    };

    const handleToggleBot = async () => {
        try {
            const target = !botEnabled;
            const res = await fetch(`${backendUrl}/api/admin/whatsapp/toggle-bot`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ enabled: target })
            });
            if (res.ok) {
                setBotEnabled(target);
                alert(`WhatsApp Auto-Booking Bot successfully ${target ? 'ENABLED' : 'DISABLED'}.`);
            }
        } catch (err) {
            console.error('WhatsApp bot toggle failed:', err);
        }
    };

    return (
        <div className="card-premium animate-fade-in">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-icons-outlined" style={{ color: 'var(--emerald)' }}>hub</span> API Integrations & Diagnostics
                </h3>
                <button 
                    disabled={refreshing} 
                    className="btn-secondary-stripe" 
                    onClick={() => { loadIntegrations(); loadWhatsAppStatus(); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                    <span className="material-icons-outlined" style={{ fontSize: '16px' }}>refresh</span> 
                    {refreshing ? 'Checking...' : 'Refresh Status'}
                </button>
            </div>

            {loading ? (
                <div className="text-center p-5 text-muted">Running system diagnostic check...</div>
            ) : (
                <div className="row g-4">
                    {/* Diagnostic list */}
                    {(Array.isArray(integrations) ? integrations : []).map((item, idx) => {
                        const isWhatsApp = item.name.includes('WhatsApp');
                        
                        let badgeBg = 'rgba(16, 185, 129, 0.15)';
                        let badgeColor = 'var(--success)';
                        if (item.badge === 'warning') {
                            badgeBg = 'rgba(245, 158, 11, 0.15)';
                            badgeColor = 'var(--warning)';
                        } else if (item.badge === 'danger') {
                            badgeBg = 'rgba(239, 68, 68, 0.15)';
                            badgeColor = 'var(--danger)';
                        }

                        return (
                            <div key={idx} className="col-md-6 col-lg-4">
                                <div className="rounded p-4 d-flex flex-column justify-content-between h-100" 
                                     style={{ 
                                         minHeight: '180px',
                                         backgroundColor: 'var(--bg-color)',
                                         border: '1px solid var(--border-color)',
                                         boxShadow: 'var(--shadow-sm)'
                                     }}>
                                    <div>
                                        <div className="d-flex justify-content-between align-items-center mb-2 gap-2">
                                            <strong style={{ fontSize: '0.94rem', color: 'var(--text-main)', fontWeight: 700 }}>{item.name}</strong>
                                            <span className="badge-pill" style={{ 
                                                background: badgeBg, 
                                                color: badgeColor, 
                                                fontSize: '0.68rem', 
                                                fontWeight: 700,
                                                whiteSpace: 'nowrap',
                                                flexShrink: 0
                                            }}>
                                                {isWhatsApp ? waStatus : item.status}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', opacity: 0.78, margin: '8px 0 0 0', lineHeight: 1.45 }}>
                                            {item.details}
                                        </p>
                                        {item.mock && (
                                            <div style={{ fontSize: '0.7rem', color: 'var(--warning)', marginTop: '6px', fontWeight: 600 }}>
                                                ⚠️ Operating in mock mode. Add credentials to go live.
                                            </div>
                                        )}
                                    </div>

                                    {/* Action footer inside card */}
                                    {isWhatsApp && (
                                        <div className="mt-3 pt-3 border-top" style={{ borderColor: 'var(--border-color)' }}>
                                            <button 
                                                disabled={waLoading}
                                                onClick={handleReconnectWhatsApp} 
                                                className="btn-secondary-stripe btn-sm w-100"
                                                style={{ fontSize: '0.74rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                            >
                                                <span className="material-icons-outlined" style={{ fontSize: '15px' }}>refresh</span>
                                                {waLoading ? 'Reconnecting Socket...' : 'Reconnect Microservice'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Dedicated AI WhatsApp Auto-Reply Bot Card */}
                    <div className="col-md-6 col-lg-4">
                        <div className="rounded p-4 d-flex flex-column justify-content-between h-100" 
                             style={{ 
                                 minHeight: '180px',
                                 backgroundColor: 'var(--bg-color)',
                                 border: '1px solid var(--border-color)',
                                 boxShadow: 'var(--shadow-sm)'
                             }}>
                            <div>
                                <div className="d-flex justify-content-between align-items-center mb-2 gap-2">
                                    <strong style={{ fontSize: '0.94rem', color: 'var(--text-main)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span className="material-icons-outlined" style={{ color: 'var(--emerald)', fontSize: '18px', flexShrink: 0 }}>smart_toy</span>
                                        <span>AI WhatsApp Auto-Reply</span>
                                    </strong>
                                    <span className="badge-pill" style={{ 
                                        background: botEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                                        color: botEnabled ? 'var(--success)' : 'var(--danger)', 
                                        fontSize: '0.66rem', 
                                        fontWeight: 700,
                                        whiteSpace: 'nowrap',
                                        flexShrink: 0,
                                        padding: '4px 8px'
                                    }}>
                                        {botEnabled ? 'BOT ACTIVE' : 'PAUSED'}
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', opacity: 0.78, margin: '8px 0 0 0', lineHeight: 1.45 }}>
                                    {botEnabled 
                                        ? 'AI Bot is automatically replying to customer slot queries, rates, & booking requests.' 
                                        : 'AI Auto-reply is paused. Incoming messages are saved so human staff can reply manually.'}
                                </p>
                            </div>

                            <div className="mt-3 pt-3 border-top" style={{ borderColor: 'var(--border-color)' }}>
                                <button 
                                    onClick={handleToggleBot} 
                                    className={`btn-sm w-100 ${botEnabled ? 'btn-secondary-stripe' : 'btn-primary-stripe'}`}
                                    style={{ 
                                        fontSize: '0.74rem', 
                                        padding: '6px 12px', 
                                        fontWeight: 700,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <span className="material-icons-outlined" style={{ fontSize: '16px' }}>
                                        {botEnabled ? 'pause_circle_outline' : 'play_circle_outline'}
                                    </span>
                                    {botEnabled ? 'Turn OFF AI Auto-Reply' : 'Turn ON AI Auto-Reply'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* WhatsApp QR Panel */}
                    {waStatus !== 'CONNECTED' && waStatus !== 'DISABLED' && (
                        <div className="col-12 mt-4">
                            <div className="card-premium border border-warning" style={{ background: 'rgba(245, 158, 11, 0.02)' }}>
                                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span className="material-icons-outlined">qr_code_2</span> WhatsApp Authentication Required
                                </h4>
                                <div className="row mt-3 align-items-center">
                                    <div className="col-md-8">
                                        <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', opacity: 0.9, margin: 0 }}>
                                            The WhatsApp Gateway is currently disconnected. To pair your turf phone and enable WhatsApp Booking Bot notifications:
                                        </p>
                                        <ol className="mt-2" style={{ fontSize: '0.88rem', color: 'var(--text-main)', opacity: 0.85, paddingLeft: '20px', lineHeight: 1.6 }}>
                                            <li>Open WhatsApp on your mobile phone.</li>
                                            <li>Go to Settings &gt; Linked Devices &gt; Link a Device.</li>
                                            <li>Point your phone camera to scan the QR code displayed on the right.</li>
                                        </ol>
                                        <div className="mt-3">
                                            <button 
                                                disabled={waLoading}
                                                onClick={handleReconnectWhatsApp}
                                                className="btn-primary-stripe"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                            >
                                                <span className="material-icons-outlined" style={{ fontSize: '16px' }}>cached</span> Regenerate QR Code
                                            </button>
                                        </div>
                                    </div>
                                    <div className="col-md-4 text-center">
                                        {waQr ? (
                                            <div className="p-3 bg-white d-inline-block rounded" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                                <img src={waQr} alt="WhatsApp QR Code" style={{ width: '160px', height: '160px' }} />
                                            </div>
                                        ) : (
                                            <div className="p-4 border rounded d-flex flex-column align-items-center justify-content-center" 
                                                 style={{ 
                                                     minHeight: '160px', 
                                                     backgroundColor: 'var(--bg-color)', 
                                                     borderColor: 'var(--border-color)',
                                                     color: 'var(--text-muted)'
                                                 }}>
                                                <span className="material-icons-outlined mb-2" style={{ fontSize: '32px', color: 'var(--text-muted)' }}>qr_code_scanner</span>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', opacity: 0.8 }}>No QR code loaded.</span>
                                                <span style={{ fontSize: '0.72rem', marginTop: '2px', color: 'var(--text-muted)' }}>Click Regenerate to fetch.</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* System Version & Deployment Metadata Panel */}
                    <div className="col-12 mt-4">
                        <div className="card-premium" style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                                <div>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                        <span className="material-icons-outlined">verified</span>
                                        <span>System Version & Build Info</span>
                                    </h4>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                                        Production build details and deployed GitHub commit specifications.
                                    </p>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <span className="badge-stripe badge-success" style={{ fontSize: '0.78rem', padding: '6px 12px', fontWeight: 700 }}>
                                        {APP_VERSION}
                                    </span>
                                    <span className="badge-stripe" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', fontSize: '0.78rem', padding: '6px 12px', fontFamily: 'monospace' }}>
                                        Commit: {GIT_COMMIT_HASH}
                                    </span>
                                </div>
                            </div>
                            <hr style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '14px 0' }} />
                            <div className="row g-3" style={{ fontSize: '0.82rem' }}>
                                <div className="col-md-3 col-6">
                                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Release Channel</span>
                                    <strong style={{ color: 'var(--text-main)' }}>{RELEASE_NAME}</strong>
                                </div>
                                <div className="col-md-3 col-6">
                                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Build Number</span>
                                    <strong style={{ color: 'var(--text-main)' }}>#{BUILD_NUMBER}</strong>
                                </div>
                                <div className="col-md-3 col-6">
                                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Deployment Date</span>
                                    <strong style={{ color: 'var(--text-main)' }}>{LAST_UPDATED}</strong>
                                </div>
                                <div className="col-md-3 col-6">
                                    <span style={{ color: 'var(--text-muted)', display: 'block' }}>Environment</span>
                                    <strong style={{ color: 'var(--emerald)' }}>Vercel Production (Live)</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
