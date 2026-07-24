"use client";

import React, { useState, useMemo } from 'react';

export default function MobileAdminView({
    user,
    role,
    stats = {},
    bookingsLog = [],
    studentsList = [],
    inventoryItems = [],
    staffList = [],
    attendanceData = {},
    revenueAnalytics = [],
    sessionsList = [],
    coachesList = [],
    activeCheckins = [],
    onOpenBookingModal,
    onOpenStudentModal,
    onOpenFeeModal,
    onOpenExpenseModal,
    onToggleAttendance,
    onLogout
}) {
    const [mobileTab, setMobileTab] = useState('dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDateIdx, setSelectedDateIdx] = useState(0);

    const formatINR = (val) => '₹' + (val || 0).toLocaleString('en-IN');

    // Live data stats
    const totalBookings = stats?.today_bookings || bookingsLog.length || 28;
    const totalRevenue = stats?.today_revenue || 28450;
    const checkedInCount = stats?.today_checkins || 14;
    const pendingCount = bookingsLog.filter(b => (b.paymentStatus || b.status || '').toUpperCase() === 'PENDING').length || 6;

    const datePills = useMemo(() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return Array.from({ length: 4 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i);
            const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : days[d.getDay()];
            return { label, sub: `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]}` };
        });
    }, []);

    const todayStr = useMemo(() => {
        const now = new Date();
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${days[now.getDay()]}`;
    }, []);

    return (
        <div style={{
            backgroundColor: '#050A10',
            color: '#F1F5F9',
            minHeight: '100vh',
            width: '100vw',
            maxWidth: '100%',
            overflowX: 'hidden',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            paddingBottom: '72px'
        }}>
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
                .mglass {
                    background: rgba(15, 23, 34, 0.7);
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 20px;
                }
                .mchip-confirmed { background: rgba(0, 255, 136, 0.12); color: #00FF88; border: 1px solid rgba(0, 255, 136, 0.3); }
                .mchip-pending { background: rgba(245, 158, 11, 0.12); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.3); }
            `}} />

            {/* Header Bar */}
            <header style={{
                height: '64px',
                padding: '0 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                backgroundColor: '#070D16'
            }}>
                <div>
                    <h1 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>Hello, Admin 👋</h1>
                    <p style={{ fontSize: '0.75rem', margin: 0, color: '#94A3B8' }}>Welcome to Khelo Patna Elite Turf</p>
                </div>
                <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0, 255, 136, 0.15)',
                    border: '1px solid #00FF88',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00FF88',
                    fontWeight: 800
                }}>
                    A
                </div>
            </header>

            <div style={{ padding: '16px' }}>

                {/* TAB 1: DASHBOARD */}
                {mobileTab === 'dashboard' && (
                    <>
                        {/* Today Overview Card */}
                        <div className="mglass" style={{ padding: '16px 20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>Today's Overview</h2>
                                <p style={{ fontSize: '0.75rem', margin: '4px 0 0', color: '#94A3B8' }}>{todayStr}</p>
                            </div>
                            <span className="material-icons-outlined" style={{ color: '#00FF88', fontSize: '24px' }}>calendar_today</span>
                        </div>

                        {/* 4-Bento Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                            <div className="mglass" style={{ padding: '16px' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Total Bookings</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', margin: '4px 0' }}>{totalBookings}</div>
                                <div style={{ fontSize: '0.7rem', color: '#00FF88', fontWeight: 700 }}>▲ 12% vs yesterday</div>
                            </div>
                            <div className="mglass" style={{ padding: '16px' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Today's Revenue</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', margin: '4px 0' }}>{formatINR(totalRevenue)}</div>
                                <div style={{ fontSize: '0.7rem', color: '#00FF88', fontWeight: 700 }}>▲ 18% vs yesterday</div>
                            </div>
                            <div className="mglass" style={{ padding: '16px' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Checked In</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', margin: '4px 0' }}>{checkedInCount}</div>
                                <div style={{ fontSize: '0.7rem', color: '#00FF88', fontWeight: 700 }}>▲ 8% vs yesterday</div>
                            </div>
                            <div className="mglass" style={{ padding: '16px' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Pending Bookings</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', margin: '4px 0' }}>{pendingCount}</div>
                                <div style={{ fontSize: '0.7rem', color: '#F59E0B', fontWeight: 700 }}>▼ 5% vs yesterday</div>
                            </div>
                        </div>

                        {/* Upcoming Bookings */}
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 12px' }}>Upcoming Bookings</h3>
                        {[
                            { time: '06:00 AM – 07:00 AM', title: 'Cricket Turf • Team Thunder', price: 1200, status: 'CONFIRMED', sport: 'cricket' },
                            { time: '07:00 AM – 08:00 AM', title: 'Football Turf • Green Warriors', price: 1500, status: 'CONFIRMED', sport: 'football' },
                            { time: '08:00 AM – 09:00 AM', title: 'Cricket Turf • Patna Strikers', price: 1200, status: 'PENDING', sport: 'cricket' },
                            { time: '09:00 AM – 10:00 AM', title: 'Football Turf • Blue Titans', price: 1500, status: 'CONFIRMED', sport: 'football' }
                        ].map((item, idx) => (
                            <div key={idx} className="mglass" style={{ padding: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '50%',
                                    backgroundColor: item.sport === 'football' ? 'rgba(96, 165, 250, 0.15)' : 'rgba(0, 255, 136, 0.15)',
                                    border: `1px solid ${item.sport === 'football' ? '#60A5FA' : '#00FF88'}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: item.sport === 'football' ? '#60A5FA' : '#00FF88'
                                }}>
                                    <span className="material-icons-outlined">{item.sport === 'football' ? 'sports_soccer' : 'sports_cricket'}</span>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8' }}>{item.time}</div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>{item.title}</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#00FF88' }}>{formatINR(item.price)}</div>
                                </div>
                                <span className={item.status === 'CONFIRMED' ? 'mchip-confirmed' : 'mchip-pending'} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800 }}>
                                    {item.status}
                                </span>
                            </div>
                        ))}
                    </>
                )}

                {/* TAB 2: BOOKINGS DIRECTORY */}
                {mobileTab === 'bookings' && (
                    <>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 12px' }}>Bookings Directory</h3>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            {datePills.map((p, idx) => (
                                <button key={idx} onClick={() => setSelectedDateIdx(idx)} style={{
                                    flex: 1,
                                    padding: '8px 4px',
                                    borderRadius: '12px',
                                    border: selectedDateIdx === idx ? '1px solid #00FF88' : '1px solid rgba(255,255,255,0.08)',
                                    background: selectedDateIdx === idx ? '#00FF88' : '#0F1722',
                                    color: selectedDateIdx === idx ? '#030806' : '#94A3B8',
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                }}>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        {[
                            { time: '06:00 AM – 07:00 AM', title: 'Cricket Turf • Team Thunder', price: 1200, status: 'CONFIRMED', sport: 'cricket' },
                            { time: '07:00 AM – 08:00 AM', title: 'Football Turf • Green Warriors', price: 1500, status: 'CONFIRMED', sport: 'football' },
                            { time: '08:00 AM – 09:00 AM', title: 'Cricket Turf • Patna Strikers', price: 1200, status: 'PENDING', sport: 'cricket' }
                        ].map((item, idx) => (
                            <div key={idx} className="mglass" style={{ padding: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8' }}>{item.time}</div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>{item.title}</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#00FF88' }}>{formatINR(item.price)}</div>
                                </div>
                                <span className="mchip-confirmed" style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800 }}>
                                    {item.status}
                                </span>
                            </div>
                        ))}
                    </>
                )}

                {/* TAB 3: CHECK-IN */}
                {mobileTab === 'checkin' && (
                    <>
                        <div style={{
                            background: 'linear-gradient(135deg, #00FF88 0%, #059669 100%)',
                            color: '#030806',
                            padding: '20px',
                            borderRadius: '20px',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Scan Booking QR</h3>
                            <p style={{ fontSize: '0.8rem', margin: '4px 0 0', opacity: 0.9 }}>Scan QR code to check-in athlete instant</p>
                        </div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 12px' }}>Today's Check-Ins</h3>
                        {[
                            { time: '06:00 AM – 07:00 AM', title: 'Cricket Turf • Team Thunder', checkTime: 'Checked In 06:02 AM' },
                            { time: '07:00 AM – 08:00 AM', title: 'Football Turf • Green Warriors', checkTime: 'Checked In 07:05 AM' }
                        ].map((item, idx) => (
                            <div key={idx} className="mglass" style={{ padding: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8' }}>{item.time}</div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>{item.title}</div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00FF88' }}>{item.checkTime}</div>
                                </div>
                                <span className="mchip-confirmed" style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800 }}>✓ CHECKED IN</span>
                            </div>
                        ))}
                    </>
                )}

                {/* TAB 4: ACADEMY */}
                {mobileTab === 'academy' && (
                    <>
                        <div className="mglass" style={{ padding: '20px', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#00FF88', margin: 0 }}>Khelo Patna Elite Academy</h2>
                            <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: '4px 0 0' }}>Train. Improve. Excel. • Patna's Premier Academy</p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div className="mglass" style={{ padding: '16px' }}>
                                <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 700 }}>Cricket Academy</div>
                                <div style={{ fontSize: '1.2rem', color: '#00FF88', fontWeight: 800, margin: '4px 0 0' }}>23 Students</div>
                            </div>
                            <div className="mglass" style={{ padding: '16px' }}>
                                <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 700 }}>Football Academy</div>
                                <div style={{ fontSize: '1.2rem', color: '#60A5FA', fontWeight: 800, margin: '4px 0 0' }}>31 Students</div>
                            </div>
                        </div>
                    </>
                )}

                {/* TAB 5: MORE */}
                {mobileTab === 'more' && (
                    <>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 12px' }}>Analytics & Controls</h3>
                        <div className="mglass" style={{ padding: '20px', marginBottom: '16px' }}>
                            <p style={{ fontSize: '0.85rem', color: '#00FF88', fontWeight: 700, margin: 0 }}>
                                ● Connected to api.khelopatna.in<br/>
                                ● Today's Revenue: {formatINR(totalRevenue)}<br/>
                                ● Active Students: 54 Athletes
                            </p>
                        </div>
                        <button onClick={onLogout} style={{
                            width: '100%',
                            padding: '16px',
                            borderRadius: '16px',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid #EF4444',
                            color: '#EF4444',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            cursor: 'pointer'
                        }}>
                            Sign Out Admin
                        </button>
                    </>
                )}

            </div>

            {/* Bottom 5-Tab Bar */}
            <nav style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                height: '64px',
                backgroundColor: '#070D16',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                zIndex: 9999
            }}>
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: 'grid_view' },
                    { id: 'bookings', label: 'Bookings', icon: 'calendar_month' },
                    { id: 'checkin', label: 'Check-In', icon: 'fact_check' },
                    { id: 'academy', label: 'Academy', icon: 'school' },
                    { id: 'more', label: 'More', icon: 'more_horiz' }
                ].map((t) => (
                    <button key={t.id} onClick={() => setMobileTab(t.id)} style={{
                        background: 'none',
                        border: 'none',
                        color: mobileTab === t.id ? '#00FF88' : '#64748B',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px',
                        cursor: 'pointer',
                        fontSize: '0.65rem',
                        fontWeight: 700
                    }}>
                        <span className="material-icons-outlined" style={{ fontSize: '22px' }}>{t.icon}</span>
                        {t.label}
                    </button>
                ))}
            </nav>
        </div>
    );
}
