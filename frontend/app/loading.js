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
            <div className="logo-loader-wrapper animate-fade-in">
                <div className="logo-loader-badge" style={{ width: '84px', height: '84px', marginBottom: '20px' }}>
                    <img src="/logo.png" alt="Khelo Patna Logo" style={{ width: '56px', height: '56px' }} />
                </div>
                <div className="logo-loader-title" style={{ fontSize: '1.25rem', letterSpacing: '3px', marginBottom: '18px' }}>
                    KHELO<span>PATNA</span>
                </div>
                <div className="logo-loader-bar-bg" style={{ width: '150px' }}>
                    <div className="logo-loader-bar-fill"></div>
                </div>
            </div>
        </div>
    );
}
