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
    batchesList = [],
    activeCheckins = [],
    onOpenBookingModal,
    onOpenStudentModal,
    onOpenFeeModal,
    onOpenExpenseModal,
    onToggleAttendance,
    onLogout
}) {
    const [mobileTab, setMobileTab] = useState('dashboard');
    const [academySubTab, setAcademySubTab] = useState('students');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDateIdx, setSelectedDateIdx] = useState(0);

    const formatINR = (val) => '₹' + (val || 0).toLocaleString('en-IN');

    // Live Database Stats
    const totalBookings = stats?.today_bookings !== undefined ? stats.today_bookings : bookingsLog.length;
    const totalRevenue = stats?.today_revenue !== undefined ? stats.today_revenue : 0;
    const checkedInCount = stats?.today_checkins !== undefined ? stats.today_checkins : 0;
    const pendingCount = bookingsLog.filter(b => (b.paymentStatus || b.status || '').toUpperCase() === 'PENDING').length;

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

    const formatTimeSlot = (b) => {
        if (b.timeSlots && Array.isArray(b.timeSlots) && b.timeSlots.length > 0) {
            const first = b.timeSlots[0];
            const last = b.timeSlots[b.timeSlots.length - 1];
            const to12 = (s) => {
                if (!s) return s;
                const parts = s.split(':');
                let h = parseInt(parts[0]); const m = parts[1] || '00';
                const ampm = h >= 12 ? 'PM' : 'AM';
                if (h > 12) h -= 12; if (h === 0) h = 12;
                return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
            };
            const lastParts = last.split(':');
            const endH = String(parseInt(lastParts[0]) + 1).padStart(2, '0');
            return `${to12(first)} – ${to12(endH + ':' + (lastParts[1] || '00'))}`;
        }
        return b.timeSlot || b.slotTime || 'Scheduled Slot';
    };

    return (
        <div style={{
            backgroundColor: '#050A10',
            color: '#F1F5F9',
            minHeight: '100vh',
            width: '100vw',
            maxWidth: '100%',
            overflowX: 'hidden',
            fontFamily: "'Space Grotesk', system-ui, -apple-system, sans-serif",
            paddingBottom: '80px'
        }}>
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap');
                * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
                .mglass {
                    background: rgba(15, 23, 34, 0.75);
                    backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 20px;
                }
                .mchip-confirmed { background: rgba(0, 255, 136, 0.12); color: #00FF88; border: 1px solid rgba(0, 255, 136, 0.35); }
                .mchip-pending { background: rgba(245, 158, 11, 0.12); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.35); }
                .mchip-cancelled { background: rgba(239, 68, 68, 0.12); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.35); }
                .quick-action-btn {
                    flex: 1;
                    padding: 12px;
                    border-radius: 16px;
                    border: 1px solid rgba(255,255,255,0.08);
                    background: rgba(15, 23, 34, 0.8);
                    color: #fff;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.7rem;
                    font-weight: 800;
                    cursor: pointer;
                    transition: transform 0.15s ease;
                }
                .quick-action-btn:active { transform: scale(0.96); }
            `}} />

            {/* Header Bar */}
            <header style={{
                height: '64px',
                padding: '0 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: '#070D16'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: '#000 url(https://khelopatna.in/logo.png) center/cover',
                        border: '1px solid rgba(0, 255, 136, 0.4)'
                    }} />
                    <div>
                        <h1 style={{ fontSize: '1.05rem', fontWeight: 900, margin: 0, color: '#FFFFFF', letterSpacing: '1px' }}>KHELOPATNA</h1>
                        <p style={{ fontSize: '0.65rem', margin: 0, color: '#00FF88', fontWeight: 700, letterSpacing: '2px' }}>ELITE TURF · COMMAND</p>
                    </div>
                </div>
                <div style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    border: '1px solid rgba(0, 255, 136, 0.3)',
                    color: '#00FF88',
                    fontSize: '0.7rem',
                    fontWeight: 800
                }}>
                    🔒 PASSKEY ACTIVE
                </div>
            </header>

            <div style={{ padding: '16px' }}>

                {/* TAB 1: DASHBOARD */}
                {mobileTab === 'dashboard' && (
                    <>
                        {/* Today Overview Banner */}
                        <div className="mglass" style={{ padding: '16px 20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>Today's Overview</h2>
                                <p style={{ fontSize: '0.75rem', margin: '4px 0 0', color: '#94A3B8' }}>{todayStr}</p>
                            </div>
                            <span className="material-icons-outlined" style={{ color: '#00FF88', fontSize: '24px' }}>calendar_today</span>
                        </div>

                        {/* Quick Actions (Book Turf, Take Fee, Admission) */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
                            <button className="quick-action-btn" onClick={onOpenBookingModal}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0, 255, 136, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00FF88' }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '18px' }}>add_box</span>
                                </div>
                                BOOK TURF
                            </button>
                            <button className="quick-action-btn" onClick={onOpenFeeModal}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '18px' }}>payments</span>
                                </div>
                                TAKE FEE
                            </button>
                            <button className="quick-action-btn" onClick={onOpenStudentModal}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(96, 165, 250, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60A5FA' }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '18px' }}>person_add</span>
                                </div>
                                ADMISSION
                            </button>
                        </div>

                        {/* 4-Bento Stats Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                            <div className="mglass" style={{ padding: '16px' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Today's Bookings</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', margin: '4px 0' }}>{totalBookings}</div>
                                <div style={{ fontSize: '0.65rem', color: '#00FF88', fontWeight: 700 }}>Live · SUCCESS Filter</div>
                            </div>
                            <div className="mglass" style={{ padding: '16px' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Today's Revenue</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', margin: '4px 0' }}>{formatINR(totalRevenue)}</div>
                                <div style={{ fontSize: '0.65rem', color: '#00FF88', fontWeight: 700 }}>Sum of Amounts</div>
                            </div>
                            <div className="mglass" style={{ padding: '16px' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Paid / Confirmed</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', margin: '4px 0' }}>{checkedInCount}</div>
                                <div style={{ fontSize: '0.65rem', color: '#00FF88', fontWeight: 700 }}>Payment Success</div>
                            </div>
                            <div className="mglass" style={{ padding: '16px' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Pending</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', margin: '4px 0' }}>{pendingCount}</div>
                                <div style={{ fontSize: '0.65rem', color: '#F59E0B', fontWeight: 700 }}>Awaiting Payment</div>
                            </div>
                        </div>

                        {/* Upcoming Bookings */}
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 12px' }}>Upcoming Bookings</h3>
                        {bookingsLog.length === 0 ? (
                            <div className="mglass" style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                                No upcoming bookings for today.
                            </div>
                        ) : (
                            bookingsLog.map((item, idx) => {
                                const isFootball = (item.sport || '').toLowerCase().includes('football');
                                const status = (item.paymentStatus || item.status || 'CONFIRMED').toUpperCase();
                                return (
                                    <div key={item._id || idx} className="mglass" style={{ padding: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div style={{
                                            width: '44px', height: '44px', borderRadius: '50%',
                                            backgroundColor: isFootball ? 'rgba(96, 165, 250, 0.15)' : 'rgba(0, 255, 136, 0.15)',
                                            border: `1px solid ${isFootball ? '#60A5FA' : '#00FF88'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: isFootball ? '#60A5FA' : '#00FF88'
                                        }}>
                                            <span className="material-icons-outlined">{isFootball ? 'sports_soccer' : 'sports_cricket'}</span>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8' }}>{formatTimeSlot(item)}</div>
                                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>
                                                {isFootball ? 'Football Turf' : 'Cricket Turf'} • {item.customerName || 'Walk-in'}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#00FF88' }}>{formatINR(item.paidAmount || item.price || 1200)}</div>
                                        </div>
                                        <span className={status === 'SUCCESS' || status === 'CONFIRMED' || status === 'PAID' ? 'mchip-confirmed' : status === 'PENDING' ? 'mchip-pending' : 'mchip-cancelled'} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800 }}>
                                            {status}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </>
                )}

                {/* TAB 2: BOOKINGS */}
                {mobileTab === 'bookings' && (
                    <>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 12px' }}>Bookings Directory</h3>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            {datePills.map((p, idx) => (
                                <button key={idx} onClick={() => setSelectedDateIdx(idx)} style={{
                                    flex: 1, padding: '8px 4px', borderRadius: '12px',
                                    border: selectedDateIdx === idx ? '1px solid #00FF88' : '1px solid rgba(255,255,255,0.08)',
                                    background: selectedDateIdx === idx ? '#00FF88' : '#0F1722',
                                    color: selectedDateIdx === idx ? '#030806' : '#94A3B8',
                                    fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer'
                                }}>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        {bookingsLog.length === 0 ? (
                            <div className="mglass" style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                                No bookings for this date.
                            </div>
                        ) : (
                            bookingsLog.map((item, idx) => (
                                <div key={item._id || idx} className="mglass" style={{ padding: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8' }}>{formatTimeSlot(item)}</div>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>{item.customerName || 'Guest'}</div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#00FF88' }}>{formatINR(item.paidAmount || item.price || 1200)}</div>
                                    </div>
                                    <span className="mchip-confirmed" style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800 }}>
                                        {(item.paymentStatus || 'CONFIRMED').toUpperCase()}
                                    </span>
                                </div>
                            ))
                        )}
                    </>
                )}

                {/* TAB 3: CHECK-IN */}
                {mobileTab === 'checkin' && (
                    <>
                        <div style={{
                            background: 'linear-gradient(135deg, #00FF88 0%, #059669 100%)',
                            color: '#030806', padding: '20px', borderRadius: '20px', marginBottom: '20px'
                        }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Scan Booking QR</h3>
                            <p style={{ fontSize: '0.8rem', margin: '4px 0 0', opacity: 0.9 }}>Active sessions console</p>
                        </div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 12px' }}>Active Sessions</h3>
                        {bookingsLog.map((item, idx) => (
                            <div key={item._id || idx} className="mglass" style={{ padding: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8' }}>{formatTimeSlot(item)}</div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>{item.customerName || 'Athlete'}</div>
                                </div>
                                <span className="mchip-confirmed" style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800 }}>✓ ACTIVE</span>
                            </div>
                        ))}
                    </>
                )}

                {/* TAB 4: ACADEMY */}
                {mobileTab === 'academy' && (
                    <>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            {['students', 'coaches', 'batches', 'sessions'].map((sub) => (
                                <button key={sub} onClick={() => setAcademySubTab(sub)} style={{
                                    flex: 1, padding: '10px 4px', borderRadius: '12px',
                                    border: academySubTab === sub ? '1px solid #00FF88' : '1px solid rgba(255,255,255,0.08)',
                                    background: academySubTab === sub ? 'rgba(0, 255, 136, 0.15)' : '#0F1722',
                                    color: academySubTab === sub ? '#00FF88' : '#94A3B8',
                                    fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', cursor: 'pointer'
                                }}>
                                    {sub}
                                </button>
                            ))}
                        </div>

                        {academySubTab === 'students' && (
                            studentsList.length === 0 ? (
                                <div className="mglass" style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>No academy students enrolled.</div>
                            ) : (
                                studentsList.map((s, idx) => (
                                    <div key={s._id || idx} className="mglass" style={{ padding: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>{s.studentName || s.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{s.sport || 'Cricket'} Academy • {s.mobileNumber}</div>
                                        </div>
                                        <button onClick={() => onOpenFeeModal(s)} style={{ padding: '6px 12px', borderRadius: '12px', border: '1px solid #00FF88', background: 'rgba(0,255,136,0.1)', color: '#00FF88', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer' }}>
                                            Pay Fee
                                        </button>
                                    </div>
                                ))
                            )
                        )}

                        {academySubTab === 'coaches' && (
                            coachesList.length === 0 ? (
                                <div className="mglass" style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>No coaches assigned.</div>
                            ) : (
                                coachesList.map((c, idx) => (
                                    <div key={c._id || idx} className="mglass" style={{ padding: '16px', marginBottom: '12px' }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>{c.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#00FF88', fontWeight: 700 }}>{c.sport} Head Coach • {c.phone}</div>
                                    </div>
                                ))
                            )
                        )}

                        {academySubTab === 'batches' && (
                            <div className="mglass" style={{ padding: '20px' }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>Morning & Evening Batches</div>
                                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>• Morning Batch: 06:00 AM – 08:00 AM<br/>• Afternoon Batch: 03:00 PM – 05:00 PM<br/>• Evening Batch: 05:00 PM – 07:00 PM</div>
                            </div>
                        )}

                        {academySubTab === 'sessions' && (
                            sessionsList.length === 0 ? (
                                <div className="mglass" style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>No upcoming sessions.</div>
                            ) : (
                                sessionsList.map((sess, idx) => (
                                    <div key={sess._id || idx} className="mglass" style={{ padding: '16px', marginBottom: '12px' }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FFFFFF' }}>{sess.title || 'Academy Practice Session'}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{sess.time || '05:00 PM – 07:00 PM'}</div>
                                    </div>
                                ))
                            )
                        )}
                    </>
                )}

                {/* TAB 5: MORE (12 Super-Admin Modules) */}
                {mobileTab === 'more' && (
                    <>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 12px' }}>Super-Admin Suite</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                            {[
                                { title: 'Customers', path: '/admin/customers', icon: 'people' },
                                { title: 'Enquiries', path: '/admin/enquiries', icon: 'support_agent' },
                                { title: 'Coupons', path: '/admin/coupons', icon: 'local_offer' },
                                { title: 'Closures', path: '/admin/closures', icon: 'event_busy' },
                                { title: 'Inventory', path: '/inventory', icon: 'inventory_2' },
                                { title: 'Revenue Reports', path: '/reports/revenue-analytics', icon: 'analytics' },
                                { title: 'Booking Reports', path: '/reports/bookings', icon: 'assessment' },
                                { title: 'Fee Reports', path: '/reports/fees', icon: 'receipt_long' },
                                { title: 'Google Reviews', path: '/admin/maps-reviews', icon: 'star' },
                                { title: 'WhatsApp Status', path: '/admin/whatsapp/status', icon: 'chat' },
                                { title: 'Staff Directory', path: '/auth/staff', icon: 'badge' },
                                { title: 'Audit Logs', path: '/admin/audit-logs', icon: 'shield' }
                            ].map((mod, idx) => (
                                <button key={idx} onClick={() => window.location.href = mod.path} className="mglass" style={{
                                    padding: '14px', display: 'flex', alignItems: 'center', gap: '10px',
                                    color: '#FFFFFF', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', textAlign: 'left'
                                }}>
                                    <span className="material-icons-outlined" style={{ color: '#00FF88', fontSize: '20px' }}>{mod.icon}</span>
                                    {mod.title}
                                </button>
                            ))}
                        </div>
                        <button onClick={onLogout} style={{
                            width: '100%', padding: '16px', borderRadius: '16px',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444',
                            color: '#EF4444', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer'
                        }}>
                            Sign Out Admin
                        </button>
                    </>
                )}

            </div>

            {/* Bottom Navigation Bar */}
            <nav style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, height: '64px',
                backgroundColor: '#070D16', borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-around', zIndex: 9999
            }}>
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: 'grid_view' },
                    { id: 'bookings', label: 'Bookings', icon: 'calendar_month' },
                    { id: 'checkin', label: 'Check-In', icon: 'fact_check' },
                    { id: 'academy', label: 'Academy', icon: 'school' },
                    { id: 'more', label: 'More', icon: 'more_horiz' }
                ].map((t) => (
                    <button key={t.id} onClick={() => setMobileTab(t.id)} style={{
                        background: 'none', border: 'none',
                        color: mobileTab === t.id ? '#00FF88' : '#64748B',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                        cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700
                    }}>
                        <span className="material-icons-outlined" style={{ fontSize: '22px' }}>{t.icon}</span>
                        {t.label}
                    </button>
                ))}
            </nav>
        </div>
    );
}
