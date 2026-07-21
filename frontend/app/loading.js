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
                <div className="logo-loader-badge" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
                    <img src="/khelo_patna_logo_animated.gif" alt="Khelo Patna Logo" style={{ width: '100px', height: '100px', borderRadius: '50%' }} />
                </div>
                <div className="logo-loader-title">
                    KHELO<span>PATNA</span>
                </div>
                <div className="logo-loader-bar-bg">
                    <div className="logo-loader-bar-fill"></div>
                </div>
                <div className="logo-loader-subtitle">
                    Loading the Turf Environment for you…
                </div>
            </div>
        </div>
    );
}
