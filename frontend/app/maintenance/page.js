"use client";

import React from 'react';

export default function MaintenancePage() {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at center, #070B14 0%, #020305 100%)',
            padding: '24px',
            color: '#F8FAFC',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Ambient Background Orbs */}
            <div style={{
                position: 'absolute',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%)',
                top: '-10%',
                left: '-10%',
                pointerEvents: 'none'
            }} />
            <div style={{
                position: 'absolute',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.04) 0%, transparent 70%)',
                bottom: '-10%',
                right: '-10%',
                pointerEvents: 'none'
            }} />

            {/* Glassmorphic Container */}
            <div style={{
                background: 'rgba(9, 13, 22, 0.55)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '32px',
                padding: '48px 40px',
                maxWidth: '620px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 30px 60px rgba(0, 0, 0, 0.6)',
                zIndex: 10,
                position: 'relative'
            }}>
                {/* Brand Logo */}
                <div style={{
                    marginBottom: '24px',
                    display: 'flex',
                    justifyContent: 'center'
                }}>
                    <img src="/logo.png" alt="KheloPatna Logo" style={{
                        height: '60px',
                        width: 'auto',
                        filter: 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.2))'
                    }} />
                </div>

                {/* Sports Turf Dynamic Blueprint Animation */}
                <div style={{ marginBottom: '24px', position: 'relative' }}>
                    <svg viewBox="0 0 600 350" style={{ width: '100%', maxHeight: '260px', opacity: 0.85 }} className="blueprint-svg">
                        <defs>
                            <linearGradient id="neon-green-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#10B981" />
                                <stop offset="50%" stopColor="#3B82F6" />
                                <stop offset="100%" stopColor="#6366F1" />
                            </linearGradient>
                            <filter id="glow-effect" x="-10%" y="-10%" width="120%" height="120%">
                                <feGaussianBlur stdDeviation="4" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        
                        {/* Outer Turf Boundary */}
                        <rect x="15" y="15" width="570" height="320" rx="24" fill="none" stroke="url(#neon-green-blue)" strokeWidth="2.5" strokeDasharray="1800" strokeDashoffset="1800" filter="url(#glow-effect)" style={{ animation: 'drawBoundary 6s cubic-bezier(0.4, 0, 0.2, 1) infinite' }} />

                        {/* Midfield Line */}
                        <line x1="300" y1="15" x2="300" y2="335" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" strokeDasharray="6,6" />

                        {/* Football Center Circle */}
                        <circle cx="300" cy="175" r="60" fill="none" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2" strokeDasharray="400" strokeDashoffset="400" style={{ animation: 'drawBoundary 5s cubic-bezier(0.4, 0, 0.2, 1) 0.5s infinite' }} />
                        <circle cx="300" cy="175" r="4" fill="#3B82F6" opacity="0.7" />

                        {/* Left Penalty Area */}
                        <path d="M 15 75 L 105 75 L 105 275 L 15 275" fill="none" stroke="rgba(16, 185, 129, 0.35)" strokeWidth="1.8" strokeDasharray="500" strokeDashoffset="500" style={{ animation: 'drawBoundary 5s cubic-bezier(0.4, 0, 0.2, 1) 1s infinite' }} />
                        
                        {/* Right Penalty Area */}
                        <path d="M 585 75 L 495 75 L 495 275 L 585 275" fill="none" stroke="rgba(16, 185, 129, 0.35)" strokeWidth="1.8" strokeDasharray="500" strokeDashoffset="500" style={{ animation: 'drawBoundary 5s cubic-bezier(0.4, 0, 0.2, 1) 1s infinite' }} />

                        {/* Cricket Pitch Wicket Area in Center */}
                        <rect x="272" y="110" width="56" height="130" rx="3" fill="none" stroke="url(#neon-green-blue)" strokeWidth="2" strokeDasharray="400" strokeDashoffset="400" filter="url(#glow-effect)" style={{ animation: 'drawBoundary 4s cubic-bezier(0.4, 0, 0.2, 1) 1.5s infinite' }} />
                        
                        {/* Cricket Bowling Creases */}
                        <line x1="272" y1="130" x2="328" y2="130" stroke="rgba(16, 185, 129, 0.6)" strokeWidth="1.5" />
                        <line x1="272" y1="220" x2="328" y2="220" stroke="rgba(16, 185, 129, 0.6)" strokeWidth="1.5" />
                        
                        {/* Stumps indicators */}
                        <circle cx="290" cy="120" r="1.5" fill="#10B981" />
                        <circle cx="300" cy="120" r="1.5" fill="#10B981" />
                        <circle cx="310" cy="120" r="1.5" fill="#10B981" />

                        <circle cx="290" cy="230" r="1.5" fill="#10B981" />
                        <circle cx="300" cy="230" r="1.5" fill="#10B981" />
                        <circle cx="310" cy="230" r="1.5" fill="#10B981" />
                    </svg>
                    
                    {/* Glowing status tag overlay */}
                    <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '30px',
                        padding: '6px 16px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#10B981',
                        letterSpacing: '0.12em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 0 16px rgba(16, 185, 129, 0.1)',
                        textTransform: 'uppercase'
                    }}>
                        <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: '#10B981',
                            display: 'inline-block',
                            animation: 'statusPulse 1.8s infinite ease-in-out'
                        }} />
                        System Recalibration
                    </div>
                </div>

                {/* Heading */}
                <h1 style={{
                    fontSize: '2rem',
                    fontWeight: 800,
                    marginBottom: '14px',
                    letterSpacing: '-0.02em',
                    fontFamily: '"Unbounded", system-ui, sans-serif',
                    background: 'linear-gradient(135deg, #FFFFFF 30%, #94A3B8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    lineHeight: '1.3'
                }}>
                    Scheduled Turf Optimization
                </h1>

                {/* Subtext */}
                <p style={{
                    color: '#94A3B8',
                    fontSize: '0.96rem',
                    lineHeight: '1.6',
                    marginBottom: '36px',
                    padding: '0 20px',
                    margin: '0 auto 36px',
                    maxWidth: '460px'
                }}>
                    We are currently fine-tuning our booking engine to provide you with a smoother, faster scheduling experience. Back online shortly.
                </p>

                {/* Contact Controls */}
                <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.07)',
                    paddingTop: '28px',
                }}>
                    <p style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
                        Need booking assistance?
                    </p>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px'
                    }}>
                        <a href="tel:+919709701400" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '14px 16px',
                            borderRadius: '14px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            color: '#E2E8F0',
                            textDecoration: 'none',
                            fontWeight: 600,
                            fontSize: '0.86rem',
                            transition: 'all 0.2s ease-in-out'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.transform = 'none';
                        }}>
                            📞 Call 970 970 1400
                        </a>
                        <a href="mailto:support@khelopatna.in" style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '14px 16px',
                            borderRadius: '14px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            color: '#E2E8F0',
                            textDecoration: 'none',
                            fontWeight: 600,
                            fontSize: '0.86rem',
                            transition: 'all 0.2s ease-in-out'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.transform = 'none';
                        }}>
                            ✉️ Email team
                        </a>
                    </div>
                </div>
            </div>

            {/* Custom SVG Drawing CSS */}
            <style jsx global>{`
                @keyframes drawBoundary {
                    0% {
                        stroke-dashoffset: 1800;
                    }
                    50% {
                        stroke-dashoffset: 0;
                    }
                    100% {
                        stroke-dashoffset: -1800;
                    }
                }
                @keyframes statusPulse {
                    0%, 100% { opacity: 0.3; transform: scale(0.9); }
                    50% { opacity: 1; transform: scale(1.15); }
                }
                .blueprint-svg {
                    filter: drop-shadow(0 0 12px rgba(16, 185, 129, 0.06));
                }
            `}</style>
        </div>
    );
}
