import React, { useState, useEffect } from 'react';
import { APP_VERSION } from '../../config/version';

export default function IntegrationsTab({ backendUrl, getHeaders }) {
    const [integrations, setIntegrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // WhatsApp details states (for live QR retrieval)
    const [waQr, setWaQr] = useState(null);
    const [waStatus, setWaStatus] = useState('');
    const [waLoading, setWaLoading] = useState(false);

    // Live Mobile Push Notifications state
    const [pushStatus, setPushStatus] = useState('CHECKING'); // 'ACTIVE', 'NOT_SUBSCRIBED', 'UNSUPPORTED', 'DENIED'
    const [pushLoading, setPushLoading] = useState(false);

    useEffect(() => {
        loadIntegrations();
        loadWhatsAppStatus();
        checkPushSubscription();

        // Poll WhatsApp status every 3 seconds to keep QR code live and fresh
        const interval = setInterval(() => {
            loadWhatsAppStatus();
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const checkPushSubscription = async () => {
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            setPushStatus('UNSUPPORTED');
            return;
        }
        if (Notification.permission === 'denied') {
            setPushStatus('DENIED');
            return;
        }
        try {
            const reg = await navigator.serviceWorker.getRegistration('/sw.js');
            if (reg) {
                const sub = await reg.pushManager.getSubscription();
                if (sub) {
                    setPushStatus('ACTIVE');
                    return;
                }
            }
            setPushStatus('NOT_SUBSCRIBED');
        } catch (e) {
            setPushStatus('NOT_SUBSCRIBED');
        }
    };

    const handleEnablePushNotifications = async () => {
        setPushLoading(true);
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                alert('Push notifications are not supported on this browser.');
                setPushStatus('UNSUPPORTED');
                return;
            }
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') {
                alert('Permission denied for notifications.');
                setPushStatus('DENIED');
                return;
            }
            const reg = await navigator.serviceWorker.register('/sw.js');
            await navigator.serviceWorker.ready;

            const res = await fetch(`${backendUrl}/api/push/public-key`);
            const data = await res.json();
            if (!data.publicKey) throw new Error('VAPID public key not found');

            const urlBase64ToUint8Array = (base64String) => {
                const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
                const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
                const rawData = window.atob(base64);
                const outputArray = new Uint8Array(rawData.length);
                for (let i = 0; i < rawData.length; ++i) {
                    outputArray[i] = rawData.charCodeAt(i);
                }
                return outputArray;
            };

            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(data.publicKey)
            });

            await fetch(`${backendUrl}/api/push/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription: sub })
            });

            setPushStatus('ACTIVE');
            alert('🎉 Live Mobile Push Notifications Enabled! You will get native phone alerts whenever a turf is booked!');
        } catch (err) {
            console.error('Error enabling push notifications:', err);
            alert('Could not enable push notifications: ' + err.message);
        } finally {
            setPushLoading(false);
        }
    };

    const handleTestPushNotification = async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            alert('Notifications are not supported on this browser.');
            return;
        }

        if (Notification.permission !== 'granted') {
            alert('Notification permission is not granted yet. Tapping "Enable Phone Notifications" to link your phone...');
            await handleEnablePushNotifications();
            return;
        }

        // Firing immediate local native notification pop-up banner on phone screen
        try {
            if ('serviceWorker' in navigator) {
                const reg = await navigator.serviceWorker.ready;
                if (reg && reg.showNotification) {
                    await reg.showNotification('🚨 TEST TURF BOOKING ALERT!', {
                        body: '🏟️ CRICKET | 📅 Today (06:00 PM - 07:00 PM)\n💰 Paid: ₹1,200 (Live Mobile Alert Active)',
                        icon: '/icon.png',
                        badge: '/icon.png',
                        vibrate: [200, 100, 200, 100, 200],
                        renotify: true,
                        tag: 'test-' + Date.now(),
                        data: { url: '/admin' }
                    });
                }
            } else {
                new Notification('🚨 TEST TURF BOOKING ALERT!', {
                    body: '🏟️ CRICKET | 📅 Today (06:00 PM - 07:00 PM)\n💰 Paid: ₹1,200 (Live Mobile Alert Active)',
                    icon: '/icon.png'
                });
            }
        } catch (localErr) {
            console.error('Local notification error:', localErr);
        }

        // Fire backend WebPush dispatch and check subscription count
        try {
            const res = await fetch(`${backendUrl}/api/push/test`, { method: 'POST' });
            const data = await res.json();
            if (data.result && data.result.totalSubscriptions === 0) {
                alert('🔔 Test notification popped up on your screen! Note: Tap "Enable Phone Notifications" once to link your phone token for background server alerts.');
            } else {
                alert(`🔔 Test alert sent! Registered active phone(s): ${data.result ? data.result.totalSubscriptions : 1}. Check your phone notification bar / lockscreen!`);
            }
        } catch (err) {
            alert('🔔 Test alert sent to your phone screen!');
        }
    };

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
                                </div>
                            </div>
                        );
                    })}


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

                    {/* Mobile App Push Notifications Panel */}
                    <div className="col-12 mt-4">
                        <div className="card-premium" style={{ background: 'rgba(59, 130, 246, 0.03)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                                <div>
                                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#60A5FA', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                        <span className="material-icons-outlined">notifications_active</span> Live Mobile App Push Notifications
                                    </h4>
                                    <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                                        Receive native phone app notifications with sound & pop-up banners on your mobile phone screen whenever someone books a turf slot!
                                    </p>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    {pushStatus === 'ACTIVE' ? (
                                        <>
                                            <span className="badge-stripe badge-success d-inline-flex align-items-center gap-1" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                                                <span className="status-dot bg-success"></span> Phone Alerts Active
                                            </span>
                                            <button className="btn-secondary-stripe py-1 px-3" style={{ fontSize: '0.8rem' }} onClick={handleTestPushNotification}>
                                                Send Test Alert
                                            </button>
                                        </>
                                    ) : (
                                        <button 
                                            disabled={pushLoading}
                                            onClick={handleEnablePushNotifications}
                                            className="btn-primary-stripe"
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#2563EB', borderColor: '#3B82F6' }}
                                        >
                                            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>phonelink_ring</span> Enable Phone Notifications
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* System Version Panel */}
                    <div className="col-12 mt-4">
                        <div className="card-premium d-flex justify-content-between align-items-center flex-wrap gap-3" style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '16px 20px' }}>
                            <div className="d-flex align-items-center gap-2">
                                <span className="material-icons-outlined" style={{ color: 'var(--emerald)', fontSize: '20px' }}>verified</span>
                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>System Version</span>
                            </div>
                            <span className="badge-stripe badge-success" style={{ fontSize: '0.85rem', padding: '6px 14px', fontWeight: 700 }}>
                                {APP_VERSION}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
