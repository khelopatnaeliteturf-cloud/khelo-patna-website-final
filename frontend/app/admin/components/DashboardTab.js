import React from 'react';
import AnimatedNumber from './AnimatedNumber';

export default function DashboardTab(props) {
    const { revenueAnalytics, bookingsLog, formatINR, stats, allStudents, username, setActiveTab, setActiveSidebarKey, setShowOfflineBookingModal, pendingFeesAmount, formatSlotTo12Hr } = props;
    
    const [newBookings, setNewBookings] = React.useState([]);
    const [showNotification, setShowNotification] = React.useState(false);

    React.useEffect(() => {
        if (!bookingsLog || bookingsLog.length === 0) return;

        const lastSeenStr = localStorage.getItem('admin_last_seen_bookings_time');
        let lastSeenTime = null;
        if (lastSeenStr) {
            lastSeenTime = new Date(lastSeenStr);
        } else {
            const oneDayAgo = new Date();
            oneDayAgo.setDate(oneDayAgo.getDate() - 1);
            lastSeenTime = oneDayAgo;
        }

        const filtered = bookingsLog.filter(b => {
            if (!b.createdAt) return false;
            const created = new Date(b.createdAt);
            const isNew = created > lastSeenTime;
            const isValid = b.paymentStatus === 'SUCCESS' || b.paymentStatus === 'COMPLETED' || b.paymentStatus === 'PENDING';
            return isNew && isValid;
        });

        if (filtered.length > 0) {
            setNewBookings(filtered);
            setShowNotification(true);
        }
    }, [bookingsLog]);

    const handleDismissNotifications = () => {
        localStorage.setItem('admin_last_seen_bookings_time', new Date().toISOString());
        setShowNotification(false);
    };

        const formatTimeAgo = (dateStr) => {
            if (!dateStr) return 'Recently';
            try {
                const diffMs = new Date() - new Date(dateStr);
                const diffMins = Math.floor(diffMs / 60000);
                if (diffMins < 1) return 'Just now';
                if (diffMins < 60) return `${diffMins}m ago`;
                const diffHours = Math.floor(diffMins / 60);
                if (diffHours < 24) return `${diffHours}h ago`;
                const diffDays = Math.floor(diffHours / 24);
                return `${diffDays}d ago`;
            } catch (e) {
                return 'Recently';
            }
        };

        const chartData = revenueAnalytics.length > 0 ? revenueAnalytics.map(item => item.total) : [0, 0, 0, 0, 0, 0];
        const chartLabels = revenueAnalytics.length > 0 ? revenueAnalytics.map(item => item.month.split(' ')[0]) : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const maxVal = Math.max(...chartData);
        const chartMax = maxVal > 0 ? maxVal * 1.15 : 10000;
        const chartW = 500;
        const chartH = 200;
        const chartPad = { top: 10, right: 10, bottom: 30, left: 50 };
        const plotW = chartW - chartPad.left - chartPad.right;
        const plotH = chartH - chartPad.top - chartPad.bottom;
        const chartPoints = chartData.map((v, i) => ({
            x: chartPad.left + (i / Math.max(chartData.length - 1, 1)) * plotW,
            y: chartPad.top + plotH - (v / chartMax) * plotH
        }));
        const lineStr = chartPoints.map(p => `${p.x},${p.y}`).join(' ');
        const areaStr = `${chartPad.left},${chartPad.top + plotH} ${lineStr} ${chartPad.left + plotW},${chartPad.top + plotH}`;

        const todayStr = new Date().toISOString().split('T')[0];
        const todayBookings = bookingsLog.filter(b => b.date === todayStr && b.paymentStatus !== 'CANCELLED' && b.paymentStatus !== 'FAILED');
        const todaySchedule = todayBookings.map(b => ({
            time: b.timeSlots?.[0] ? b.timeSlots[0].split('-')[0] : '06:00 AM',
            title: `${(b.sport || 'Turf').charAt(0).toUpperCase() + (b.sport || 'turf').slice(1)} Booking`,
            subtitle: b.customerName || 'Walk-in',
            status: b.paymentStatus === 'SUCCESS' ? 'CONFIRMED' : 'UPCOMING'
        }));

        const statusColor = (s) => s === 'CONFIRMED' ? 'var(--success)' : s === 'ONGOING' ? 'var(--warning)' : 'var(--primary)';
        const statusBg = (s) => s === 'CONFIRMED' ? 'rgba(16,185,129,0.08)' : s === 'ONGOING' ? 'rgba(245,158,11,0.08)' : 'rgba(37,99,235,0.06)';

        const bookingActivities = bookingsLog.slice(0, 5).map(b => ({
            icon: 'event_available',
            text: `Turf Booking: ${b.customerName || 'Walk-in'}`,
            sub: `${(b.sport || 'Turf').toUpperCase()} Turf · ${formatINR(b.paidAmount || b.totalPrice || 0)} paid`,
            time: formatTimeAgo(b.createdAt),
            timestamp: new Date(b.createdAt || 0)
        }));

        const enquiryActivities = (stats?.latest_enquiries || []).map(e => ({
            icon: 'contact_support',
            text: `New Enquiry: ${e.studentName}`,
            sub: `Interested in: ${e.interestedIn || 'Academy'}`,
            time: formatTimeAgo(e.createdAt),
            timestamp: new Date(e.createdAt || 0)
        }));

        const recentActivities = [...bookingActivities, ...enquiryActivities]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 5);

        const studentColors = ['var(--info)', 'var(--success)', 'var(--warning)', 'var(--purple)'];
        const recentAdmissions = [...allStudents]
            .sort((a, b) => new Date(b.admissionDate || 0) - new Date(a.admissionDate || 0))
            .slice(0, 4);

        const alerts = stats?.critical_stock_items || [];

        const barData = revenueAnalytics.length > 0 ? revenueAnalytics.map(item => item.total) : [0, 0, 0, 0, 0, 0];
        const maxBarVal = Math.max(...barData);

        const statGradients = ['var(--gradient-1)', 'var(--gradient-2)', 'var(--gradient-3)', 'var(--gradient-4)', 'var(--gradient-5)'];

        return (
            <div className="dashboard-next" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Welcome Banner + Quick Actions */}
                <div className="dashboard-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.03em' }}>Welcome back, {username || 'Admin'}</h1>
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, fontWeight: 400 }}>Live pulse for turf operations, academy movement, collections, and service readiness.</p>
                    </div>
                    <div className="dashboard-action-grid" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {[
                            { label: 'Book Turf', icon: 'calendar_month', gradient: 'var(--gradient-1)', action: () => { setActiveTab('turf-management'); setActiveSidebarKey('bookings'); setShowOfflineBookingModal(true); } },
                            { label: 'Add Student', icon: 'person_add', gradient: 'var(--gradient-2)', tab: 'membership-management', key: 'membership-management' },
                            { label: 'Collect Fee', icon: 'payments', gradient: 'var(--gradient-3)', tab: 'payments', key: 'payments' },
                            { label: 'Add Expense', icon: 'receipt_long', gradient: 'var(--gradient-5)', tab: 'reports', key: 'reports' }
                        ].map((a, i) => (
                            <button key={i} onClick={() => { if (a.action) { a.action(); } else { setActiveTab(a.tab); setActiveSidebarKey(a.key); } }} style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px 8px 8px',
                                background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px',
                                cursor: 'pointer', color: 'var(--text-main)', fontWeight: 600, fontSize: '0.82rem',
                                fontFamily: 'inherit', transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)', letterSpacing: '-0.01em'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                                <span style={{ width: '32px', height: '32px', borderRadius: '10px', background: a.gradient, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '17px' }}>{a.icon}</span>
                                </span>
                                {a.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* New Bookings Alert Banner */}
                {showNotification && newBookings.length > 0 && (
                    <div className="card-premium animate-fade-in" style={{
                        background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.06) 0%, rgba(0, 200, 255, 0.02) 100%)',
                        border: '1px solid rgba(0, 255, 136, 0.18)',
                        boxShadow: '0 8px 32px rgba(0, 255, 136, 0.04)',
                        padding: '20px 24px',
                        borderRadius: '16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '16px',
                        position: 'relative',
                        zIndex: 10
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1, minWidth: '280px' }}>
                            <span className="material-icons-outlined" style={{
                                color: 'var(--neon)',
                                fontSize: '24px',
                                background: 'rgba(0, 255, 136, 0.1)',
                                padding: '10px',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>notifications_active</span>
                            <div>
                                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '-0.01em', color: 'var(--text-main)' }}>
                                    {newBookings.length} New Turf Booking{newBookings.length > 1 ? 's' : ''} Received
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {newBookings.slice(0, 3).map((b, i) => (
                                        <div key={i} style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
                                            <strong style={{ color: 'var(--primary)' }}>{b.customerName || 'Walk-in'}</strong> booked <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{b.sport}</span> Turf for <strong>{b.date}</strong> ({(b.timeSlots || []).map(formatSlotTo12Hr).join(', ') || 'TBD'})
                                        </div>
                                    ))}
                                    {newBookings.length > 3 && (
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, paddingLeft: '2px' }}>
                                            + {newBookings.length - 3} more new bookings
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button onClick={handleDismissNotifications} className="btn-premium py-2 px-3" style={{ fontSize: '0.72rem' }}>
                            <span>Mark as Read</span>
                        </button>
                    </div>
                )}

                {/* 5 Metric Cards with Gradient Icon Backgrounds */}
                <div className="dashboard-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
                    {[
                        { label: "Today's Revenue", value: formatINR(stats?.today_revenue || 0), icon: 'payments', trend: 'Turf + Academy', trendLabel: 'earnings today', up: true },
                        { label: "Today's Bookings", value: stats?.today_bookings || 0, icon: 'calendar_today', trend: `${stats?.today_checkins || 0}`, trendLabel: 'active check-ins', up: true },
                        { label: 'Attendance', value: stats?.today_attendance_percent ? `${stats.today_attendance_percent}%` : '0%', icon: 'done_all', trend: `${stats?.today_present || 0} Present`, trendLabel: `/ ${stats?.today_absent || 0} Absent`, up: true },
                        { label: 'Active Students', value: stats?.active_students || allStudents?.length || 0, icon: 'school', trend: `+${stats?.today_summary?.new_admissions || 0}`, trendLabel: 'admissions today', up: true },
                        { label: 'Outstanding Dues', value: formatINR(pendingFeesAmount), icon: 'receipt_long', trend: 'Academy billing', trendLabel: 'unpaid', up: false }
                    ].map((m, i) => (
                        <div key={i} className="card-premium metric-card" style={{ padding: '18px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: '-12px', right: '-12px', width: '64px', height: '64px', borderRadius: '50%', background: statGradients[i], opacity: 0.08 }} />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: statGradients[i], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '20px' }}>{m.icon}</span>
                                </div>
                                <div style={{ fontSize: '0.65rem', color: m.up ? 'var(--success)' : 'var(--danger)', fontWeight: 700, background: m.up ? 'var(--success-light)' : 'var(--danger-light)', padding: '3px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '12px' }}>{m.up ? 'trending_up' : 'trending_down'}</span>
                                    {m.trend}
                                </div>
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '2px' }}>{m.label}</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' }}><AnimatedNumber value={m.value} /></div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '4px' }}>{m.trendLabel}</div>
                        </div>
                    ))}
                </div>

                {/* Middle Section: Chart + Schedule + Activity */}
                <div className="dashboard-bento-grid" style={{ display: 'grid', gridTemplateColumns: '5fr 4fr 3fr', gap: '20px' }}>
                    {/* Weekly Revenue Line Chart */}
                    <div className="card-premium" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Revenue Overview</h3>
                            <button className="btn-secondary-stripe" style={{ fontSize: '0.78rem', padding: '4px 12px' }}>Last 6 Months</button>
                        </div>
                        <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: 'auto' }}>
                            <defs>
                                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
                                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.01" />
                                </linearGradient>
                            </defs>
                            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                                const v = Math.round(ratio * chartMax);
                                const y = chartPad.top + plotH - (v / chartMax) * plotH;
                                return (<g key={i}>
                                    <line x1={chartPad.left} y1={y} x2={chartPad.left + plotW} y2={y} stroke="var(--border-color)" strokeWidth="1" />
                                    <text x={chartPad.left - 8} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="10">₹{v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v}</text>
                                </g>);
                            })}
                            <polygon points={areaStr} fill="url(#chartGrad)" />
                            <polyline points={lineStr} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            {chartPoints.map((p, i) => (
                                <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--card-bg)" stroke="var(--primary)" strokeWidth="2.5" />
                            ))}
                            {chartLabels.map((d, i) => (
                                <text key={i} x={chartPad.left + (i / Math.max(chartLabels.length - 1, 1)) * plotW} y={chartH - 5} textAnchor="middle" fill="var(--text-muted)" fontSize="10">{d}</text>
                            ))}
                        </svg>
                    </div>

                    {/* Today's Schedule */}
                    <div className="card-premium" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Today's Schedule</h3>
                            <button onClick={() => { setActiveTab('turf-management'); setActiveSidebarKey('bookings'); }} style={{ fontSize: '0.78rem', color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View All</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {todaySchedule.length === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '150px', color: 'var(--text-muted)' }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>calendar_today</span>
                                    <span style={{ fontSize: '0.85rem' }}>No bookings scheduled today</span>
                                </div>
                            ) : (
                                todaySchedule.slice(0, 5).map((s, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', minWidth: '65px', paddingTop: '2px' }}>{s.time}</div>
                                        <div style={{ width: '3px', borderRadius: '3px', background: statusColor(s.status), alignSelf: 'stretch', flexShrink: 0 }}></div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{s.title}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.subtitle}</div>
                                        </div>
                                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: statusBg(s.status), color: statusColor(s.status), whiteSpace: 'nowrap', alignSelf: 'center' }}>{s.status}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="card-premium" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Recent Activity</h3>
                            <span onClick={() => { setActiveTab('reports'); setActiveSidebarKey('activity-logs'); }} style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>View All</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {recentActivities.length === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '150px', color: 'var(--text-muted)' }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>history</span>
                                    <span style={{ fontSize: '0.85rem' }}>No recent activity</span>
                                </div>
                            ) : (
                                recentActivities.map((a, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>{a.icon}</span>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 600, lineHeight: 1.3 }}>{a.text}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.sub}</div>
                                        </div>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{a.time}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Section: 4 cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    {/* Upcoming Bookings */}
                    <div className="card-premium" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Upcoming Bookings</h3>
                            <span onClick={() => { setActiveTab('turf-management'); setActiveSidebarKey('bookings'); }} style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>View All</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {bookingsLog.filter(b => b.date >= todayStr && b.paymentStatus !== 'CANCELLED' && b.paymentStatus !== 'FAILED').slice(0, 4).map((b, i) => {
                                const d = new Date(b.date + 'T00:00:00');
                                return (
                                    <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <div style={{ width: '40px', height: '44px', borderRadius: '8px', background: 'var(--primary-light)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{d.getDate()}</span>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.sport?.charAt(0).toUpperCase() + b.sport?.slice(1)} Turf</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{(b.timeSlots || []).map(formatSlotTo12Hr).join(', ') || 'TBD'} · {b.customerName || 'Walk-in'}</div>
                                        </div>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: b.paymentStatus === 'SUCCESS' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', color: b.paymentStatus === 'SUCCESS' ? 'var(--success)' : 'var(--warning)', whiteSpace: 'nowrap' }}>{b.paymentStatus === 'SUCCESS' ? 'CONFIRMED' : 'UPCOMING'}</span>
                                    </div>
                                );
                            })}
                            {bookingsLog.filter(b => b.date >= todayStr && b.paymentStatus !== 'CANCELLED' && b.paymentStatus !== 'FAILED').length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '20px 0' }}>No upcoming bookings</div>}
                        </div>
                    </div>

                    {/* Recent Admissions */}
                    <div className="card-premium" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Recent Admissions</h3>
                            <span onClick={() => { setActiveTab('membership-management'); setActiveSidebarKey('membership-management'); }} style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>View All</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {recentAdmissions.length === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '150px', color: 'var(--text-muted)' }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>school</span>
                                    <span style={{ fontSize: '0.85rem' }}>No student records found</span>
                                </div>
                            ) : (
                                recentAdmissions.map((s, i) => {
                                    const dateStr = s.admissionDate ? new Date(s.admissionDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'N/A';
                                    return (
                                        <div key={s._id || i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: studentColors[i % studentColors.length], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>{s.name?.charAt(0)}</div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                                    <span style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{dateStr}</span>
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {s.sport?.charAt(0).toUpperCase() + s.sport?.slice(1)} · {s.batchTime}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Inventory Alert */}
                    <div className="card-premium" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Inventory Alert</h3>
                            <span onClick={() => { setActiveTab('inventory-management'); setActiveSidebarKey('stock-alerts'); }} style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>View All</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {alerts.length === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '150px', color: 'var(--text-muted)' }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '32px', marginBottom: '8px', color: 'var(--success)', opacity: 0.8 }}>check_circle</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>All items in stock</span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>No low stock alerts</span>
                                </div>
                            ) : (
                                alerts.slice(0, 4).map((it, i) => (
                                    <div key={it._id || i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>inventory_2</span>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{it.itemName}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Stock: {it.availableQuantity}</div>
                                        </div>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: it.availableQuantity === 0 ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)', color: it.availableQuantity === 0 ? 'var(--danger)' : 'var(--warning)', whiteSpace: 'nowrap' }}>{it.availableQuantity === 0 ? 'Out of Stock' : 'Low Stock'}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Monthly Revenue */}
                    <div className="card-premium" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Monthly Revenue</h3>
                            <button className="btn-secondary-stripe" style={{ fontSize: '0.72rem', padding: '3px 10px' }}>6 Months</button>
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.1 }}>{formatINR(stats?.finances?.total || 0)}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Total this month across turf, academy & store</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', height: '80px', padding: '0 4px' }}>
                            {barData.map((v, i) => {
                                const heightPct = maxBarVal > 0 ? (v / maxBarVal) * 100 : 0;
                                const isCurrentMonth = i === barData.length - 1;
                                return (
                                    <div key={i} style={{ 
                                        flex: 1, 
                                        height: `${Math.max(heightPct, 5)}%`, 
                                        background: isCurrentMonth ? 'var(--primary)' : 'rgba(37, 99, 235, 0.15)', 
                                        borderRadius: '4px', 
                                        transition: 'height 0.3s ease',
                                        position: 'relative'
                                    }} title={`${revenueAnalytics[i]?.month || ''}: ${formatINR(v)}`}></div>
                                );
                            })}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', padding: '0 4px' }}>
                            {revenueAnalytics.map((item, i) => (
                                <span key={i} style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                    {item.month ? item.month.split(' ')[0].slice(0, 3) : ''}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
}
