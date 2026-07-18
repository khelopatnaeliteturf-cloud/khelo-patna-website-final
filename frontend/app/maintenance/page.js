"use client";

import React from 'react';

export default function MaintenancePage() {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at center, #0B1220 0%, #040609 100%)',
            padding: '24px',
            color: '#F8FAFC',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Ambient Background Orbs */}
            <div style={{
                position: 'absolute',
                width: '400px',
                height: '400px',
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
                top: '10%',
                left: '10%',
                pointerEvents: 'none'
            }} />
            <div style={{
                position: 'absolute',
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.06) 0%, transparent 70%)',
                bottom: '10%',
                right: '10%',
                pointerEvents: 'none'
            }} />

            {/* Glassmorphic Container */}
            <div style={{
                background: 'rgba(11, 15, 25, 0.65)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '24px',
                padding: '48px 32px',
                maxWidth: '540px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
                zIndex: 10,
                position: 'relative'
            }}>
                {/* Brand Logo & Indicator */}
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px' }}>
                    <div style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px',
                        boxShadow: '0 0 20px rgba(16, 185, 129, 0.15)',
                        animation: 'pulse 3s infinite ease-in-out'
                    }}>
                        🎫
                    </div>
                </div>

                {/* Heading */}
                <h1 style={{
                    fontSize: '2.2rem',
                    fontWeight: 800,
                    marginBottom: '16px',
                    letterSpacing: '-0.02em',
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #94A3B8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    lineHeight: '1.2'
                }}>
                    Scheduled Maintenance
                </h1>

                {/* Subtext */}
                <p style={{
                    color: '#94A3B8',
                    fontSize: '1rem',
                    lineHeight: '1.6',
                    marginBottom: '32px',
                    padding: '0 12px'
                }}>
                    We are currently upgrading our servers and turf booking engine to provide you with a smoother slot reservation experience. We will be back online shortly.
                </p>

                {/* Progress bar simulation */}
                <div style={{ marginBottom: '36px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748B', marginBottom: '8px', fontWeight: 600 }}>
                        <span>SYSTEM OPTIMIZATION</span>
                        <span>IN PROGRESS</span>
                    </div>
                    <div style={{
                        height: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '10px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: '78%',
                            height: '100%',
                            background: 'linear-gradient(90deg, #10B981 0%, #6366F1 100%)',
                            borderRadius: '10px',
                            animation: 'glow 2s infinite ease-in-out'
                        }} />
                    </div>
                </div>

                {/* Contact Options */}
                <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingTop: '28px',
                }}>
                    <p style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>
                        Need urgent booking support?
                    </p>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <a href="tel:+919999999999" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            padding: '14px 20px',
                            borderRadius: '14px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            color: '#E2E8F0',
                            textDecoration: 'none',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                        }}>
                            📞 Call Turf Support
                        </a>
                        <a href="mailto:support@khelopatna.in" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            padding: '14px 20px',
                            borderRadius: '14px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            color: '#E2E8F0',
                            textDecoration: 'none',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                        }}>
                            ✉️ Email Support
                        </a>
                    </div>
                </div>
            </div>

            {/* Custom Animations styles */}
            <style jsx global>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.85; }
                }
                @keyframes glow {
                    0%, 100% { opacity: 0.8; filter: drop-shadow(0 0 2px rgba(16, 185, 129, 0.4)); }
                    50% { opacity: 1; filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.8)); }
                }
            `}</style>
        </div>
    );
}
