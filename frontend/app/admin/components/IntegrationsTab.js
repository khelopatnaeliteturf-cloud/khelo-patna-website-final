"use client";

import React, { useState, useEffect } from 'react';

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
                    {integrations.map((item, idx) => {
                        const isWhatsApp = item.name.includes('WhatsApp');
                        
                        let badgeBg = 'rgba(16, 185, 129, 0.1)';
                        let badgeColor = 'var(--emerald)';
                        if (item.badge === 'warning') {
                            badgeBg = 'rgba(245, 158, 11, 0.1)';
                            badgeColor = 'var(--warning)';
                        } else if (item.badge === 'danger') {
                            badgeBg = 'rgba(239, 68, 68, 0.1)';
                            badgeColor = 'var(--danger)';
                        }

                        return (
                            <div key={idx} className="col-md-6 col-lg-4">
                                <div className="border rounded p-3 bg-dark bg-opacity-10 d-flex flex-column justify-content-between h-100" style={{ minHeight: '160px' }}>
                                    <div>
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <strong style={{ fontSize: '0.95rem' }}>{item.name}</strong>
                                            <span className="badge-pill" style={{ background: badgeBg, color: badgeColor, fontSize: '0.68rem', fontWeight: 700 }}>
                                                {isWhatsApp ? waStatus : item.status}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '8px 0 0 0' }}>
                                            {item.details}
                                        </p>
                                        {item.mock && (
                                            <div style={{ fontSize: '0.7rem', color: 'var(--warning)', marginTop: '4px', fontWeight: 600 }}>
                                                ⚠️ Operating in mock mode. Add credentials to go live.
                                            </div>
                                        )}
                                    </div>

                                    {/* Action footer inside card */}
                                    {isWhatsApp && (
                                        <div className="mt-3 pt-3 border-top d-flex gap-2">
                                            <button 
                                                onClick={handleToggleBot} 
                                                className={`btn-sm ${botEnabled ? 'btn-primary-stripe' : 'btn-secondary-stripe'}`}
                                                style={{ fontSize: '0.72rem', padding: '4px 8px', flex: 1 }}
                                            >
                                                {botEnabled ? 'Disable Bot' : 'Enable Bot'}
                                            </button>
                                            <button 
                                                disabled={waLoading}
                                                onClick={handleReconnectWhatsApp} 
                                                className="btn-secondary-stripe btn-sm"
                                                style={{ fontSize: '0.72rem', padding: '4px 8px', flex: 1 }}
                                            >
                                                {waLoading ? 'Reconnecting...' : 'Reconnect'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* WhatsApp QR Panel */}
                    {waStatus !== 'CONNECTED' && waStatus !== 'DISABLED' && (
                        <div className="col-12 mt-4">
                            <div className="card-premium border border-warning" style={{ background: 'rgba(245, 158, 11, 0.02)' }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span className="material-icons-outlined">qr_code_2</span> WhatsApp Authentication Required
                                </h4>
                                <div className="row mt-3 align-items-center">
                                    <div className="col-md-8">
                                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                                            The WhatsApp Gateway is currently disconnected. To pair your turf phone and enable WhatsApp Booking Bot notifications:
                                        </p>
                                        <ol className="mt-2" style={{ fontSize: '0.82rem', paddingLeft: '20px' }}>
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
                                            <div className="p-5 border rounded bg-dark bg-opacity-20 text-muted" style={{ fontSize: '0.78rem' }}>
                                                No QR code loaded. Click Regenerate to fetch.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
