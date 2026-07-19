'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Application error:', error);
    }, [error]);

    return (
        <div style={{
            minHeight: '100vh',
            background: '#030806',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            textAlign: 'center'
        }}>
            {/* Ambient orb background */}
            <div style={{
                position: 'fixed',
                top: '20%',
                left: '30%',
                width: '400px',
                height: '400px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(239, 68, 68, 0.08) 0%, transparent 70%)',
                filter: 'blur(60px)',
                pointerEvents: 'none',
                zIndex: 0
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Error Icon */}
                <div style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 30px auto'
                }}>
                    <span style={{ fontSize: '48px', color: '#EF4444' }}>!</span>
                </div>

                <h1 style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                    fontWeight: 800,
                    color: '#ffffff',
                    marginBottom: '16px',
                    letterSpacing: '-0.02em'
                }}>
                    Something went wrong
                </h1>

                <p style={{
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: '1rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    maxWidth: '400px',
                    lineHeight: '1.7',
                    marginBottom: '32px'
                }}>
                    We encountered an unexpected error. Please try again or contact support if the problem persists.
                </p>

                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => reset()}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '14px 32px',
                            background: 'linear-gradient(135deg, #00FF88 0%, #00B35F 100%)',
                            color: '#ffffff',
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            border: 'none',
                            borderRadius: '9999px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 20px rgba(0, 255, 136, 0.3)',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        Try Again
                    </button>

                    <Link
                        href="/"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '14px 32px',
                            background: 'rgba(0, 255, 136, 0.06)',
                            color: '#00FF88',
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            border: '1px solid rgba(0, 255, 136, 0.3)',
                            borderRadius: '9999px',
                            textDecoration: 'none',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        Go Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
