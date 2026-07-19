import Link from 'next/link';

export default function NotFound() {
    return (
        <div style={{
            minHeight: '100vh',
            background: '#030806',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Ambient orb backgrounds */}
            <div style={{
                position: 'fixed',
                top: '10%',
                left: '20%',
                width: '500px',
                height: '500px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0, 255, 136, 0.06) 0%, transparent 70%)',
                filter: 'blur(80px)',
                pointerEvents: 'none',
                zIndex: 0
            }} />
            <div style={{
                position: 'fixed',
                bottom: '10%',
                right: '15%',
                width: '400px',
                height: '400px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0, 200, 255, 0.04) 0%, transparent 70%)',
                filter: 'blur(60px)',
                pointerEvents: 'none',
                zIndex: 0
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
                {/* 404 Large Text */}
                <h1 style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'clamp(6rem, 20vw, 12rem)',
                    fontWeight: 900,
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(0, 255, 136, 0.3) 50%, rgba(255,255,255,0.1) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    margin: 0,
                    lineHeight: 1,
                    letterSpacing: '-0.05em'
                }}>
                    404
                </h1>

                <h2 style={{
                    fontFamily: 'Montserrat, sans-serif',
                    fontSize: 'clamp(1.2rem, 3vw, 1.8rem)',
                    fontWeight: 800,
                    color: '#ffffff',
                    marginTop: '20px',
                    marginBottom: '16px',
                    letterSpacing: '-0.01em'
                }}>
                    Page Not Found
                </h2>

                <p style={{
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: '1rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    maxWidth: '450px',
                    lineHeight: '1.7',
                    marginBottom: '40px',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                }}>
                    Oops! The page you're looking for seems to have gone offside.
                    Let's get you back in the game.
                </p>

                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link
                        href="/"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '16px 36px',
                            background: 'linear-gradient(135deg, #00FF88 0%, #00B35F 100%)',
                            color: '#ffffff',
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            border: 'none',
                            borderRadius: '9999px',
                            textDecoration: 'none',
                            boxShadow: '0 4px 20px rgba(0, 255, 136, 0.3)',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        Back to Home
                    </Link>

                    <Link
                        href="/book"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '16px 36px',
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
                        Book a Slot
                    </Link>
                </div>

                {/* Quick Links */}
                <div style={{
                    marginTop: '60px',
                    paddingTop: '40px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                }}>
                    <p style={{
                        fontFamily: 'Space Grotesk, sans-serif',
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255, 0.4)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                        marginBottom: '16px'
                    }}>
                        Popular Pages
                    </p>
                    <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {[
                            { href: '/football-turf', label: 'Football Turf' },
                            { href: '/cricket-turf', label: 'Cricket Nets' },
                            { href: '/enquiry', label: 'Enquiry' }
                        ].map(link => (
                            <Link
                                key={link.href}
                                href={link.href}
                                style={{
                                    fontFamily: 'Poppins, sans-serif',
                                    fontSize: '0.9rem',
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    textDecoration: 'none',
                                    transition: 'color 0.2s ease'
                                }}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
