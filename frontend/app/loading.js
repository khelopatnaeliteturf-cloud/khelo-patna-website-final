export default function Loading() {
    return (
        <div className="premium-loader-screen" style={{
            position: 'fixed',
            inset: 0,
            background: '#030806',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999
        }}>
            <div className="loader-ball" style={{
                width: '80px',
                height: '80px',
                background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cpath fill='%2300FF88' d='M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256 256-114.6 256-256S397.4 0 256 0zm0 464c-114.7 0-208-93.3-208-208S141.3 48 256 48s208 93.3 208 208-93.3 208-208 208z'/%3E%3C/svg%3E") no-repeat center center`,
                backgroundSize: 'contain',
                animation: 'rotate-ball 2s infinite linear'
            }} />
            <h2 style={{
                fontFamily: 'Montserrat, sans-serif',
                fontSize: '1.2rem',
                color: '#fff',
                letterSpacing: '3px',
                marginTop: '24px',
                textTransform: 'uppercase'
            }}>
                KHELO<span style={{ color: '#00FF88' }}>PATNA</span>
            </h2>
            <div style={{
                width: '150px',
                height: '2px',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '2px',
                marginTop: '14px',
                overflow: 'hidden',
                position: 'relative'
            }}>
                <div style={{
                    position: 'absolute',
                    height: '100%',
                    width: '40%',
                    background: 'linear-gradient(90deg, #00C8FF, #00FF88)',
                    borderRadius: 'inherit',
                    animation: 'shimmer 1.5s infinite linear'
                }} />
            </div>
            <style>{`
                @keyframes rotate-ball {
                    0% { transform: rotate(0deg) scale(0.9); }
                    50% { transform: rotate(180deg) scale(1.1); }
                    100% { transform: rotate(360deg) scale(0.9); }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(350%); }
                }
            `}</style>
        </div>
    );
}
