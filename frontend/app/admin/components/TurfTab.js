import React from 'react';

export default function TurfTab(props) {
    const { 
        activeSidebarKey = 'bookings', 
        bookingsLog = [], 
        selectedBooking = null, 
        generateCustomerId = () => {}, 
        bookingsFilter = 'ALL', 
        setBookingsFilter = () => {}, 
        bookingsDateRange = 'ALL', 
        setBookingsDateRange = () => {}, 
        bookingsCustomStartDate = '', 
        setBookingsCustomStartDate = () => {}, 
        bookingsCustomEndDate = '', 
        setBookingsCustomEndDate = () => {}, 
        setShowOfflineBookingModal = () => {}, 
        setShowBookingsReportModal = () => {}, 
        formatINR = (n) => '₹' + (n || 0), 
        formatSlotTo12Hr = (s) => s, 
        formatMultipleSlots = (s) => s,
        setSelectedBookingState = () => {}, 
        turfSettings = {}, 
        closuresList = [], 
        handleSaveSettings = () => {}, 
        setTurfSettings = () => {}, 
        handleCreateClosure = () => {}, 
        newClosure = {}, 
        setNewClosure = () => {}, 
        handleDeleteClosure = () => {} 
    } = props || {};
    
    const getBookingSourceLabel = (b) => {
        if (!b) return 'Website';
        const rawBookedBy = String(b.bookedBy || '').trim();
        const orderIdStr = String(b.orderId || '');
        const name = b.customerName || 'Customer';

        // 1. If explicitly booked by Staff / Admin
        if (rawBookedBy.startsWith('Staff') || rawBookedBy.startsWith('Admin') || orderIdStr.startsWith('KP-OFFLINE-') || b.paymentMethod === 'offline' || b.paymentMethod === 'cash') {
            if (rawBookedBy && (rawBookedBy.startsWith('Staff') || rawBookedBy.startsWith('Admin'))) {
                return rawBookedBy;
            }
            return 'Admin Staff';
        }

        // 2. If booked via WhatsApp Bot
        if (rawBookedBy.includes('WhatsApp Bot') || orderIdStr.startsWith('KP-WA-') || b.createdVia === 'WHATSAPP') {
            return `${name} (WhatsApp Bot)`;
        }

        // 3. Website Booking
        return `${name} (Website)`;
    };

    if (activeSidebarKey === 'bookings') {
            // Net revenue helper: include SUCCESS payments + CANCELLED payments where refund was skipped/retained
            const getBookingNetRevenue = (b) => {
                if (b.paymentStatus === 'SUCCESS') {
                    return Number(b.paidAmount || 0);
                }
                if (b.paymentStatus === 'CANCELLED') {
                    const refund = b.paymentDetails?.refund;
                    const isRefunded = refund && (refund.status === 'SUCCESS' || (refund.amount > 0 && refund.status !== 'SKIPPED' && refund.status !== 'FAILED_GATEWAY'));
                    if (isRefunded) {
                        const refundAmt = Number(refund.amount || b.paidAmount || 0);
                        return Math.max(0, Number(b.paidAmount || 0) - refundAmt);
                    } else {
                        // Cancelled WITHOUT refund: Turf retains the collected amount!
                        return Number(b.paidAmount || 0);
                    }
                }
                return 0;
            };

            // Stats calculations
            const totalRevenue = bookingsLog.reduce((sum, b) => sum + getBookingNetRevenue(b), 0);
            const totalBookingsCount = bookingsLog.length;
            const paidCount = bookingsLog.filter(b => b.paymentStatus === 'SUCCESS').length;
            const pendingCount = bookingsLog.filter(b => b.paymentStatus === 'PENDING').length;
            const failedCount = bookingsLog.filter(b => b.paymentStatus === 'FAILED' || b.paymentStatus === 'CANCELLED').length;
            const totalPendingAmount = bookingsLog.filter(b => b.paymentStatus === 'PENDING').reduce((sum, b) => sum + ((b.totalAmount || 0) - (b.paidAmount || 0)), 0);
            
            const selectedBookingCustId = selectedBooking ? generateCustomerId(selectedBooking.customerName, selectedBooking.customerPhone) : '';
            const selectedBookingBalance = selectedBooking ? (selectedBooking.totalAmount || 0) - (selectedBooking.paidAmount || 0) : 0;
            const selectedBookingInitials = selectedBooking ? (selectedBooking.customerName || 'W').substring(0, 2).toUpperCase() : '';

            return (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Page Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.03em' }}>Turf Bookings</h2>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Manage all bookings, customers, and payment records</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <select className="input-premium" style={{ fontSize: '0.82rem', padding: '8px 14px', borderRadius: '10px', fontFamily: 'inherit', fontWeight: 500, width: 'auto', minWidth: '130px' }} value={bookingsFilter.sport} onChange={(e) => setBookingsFilter({...bookingsFilter, sport: e.target.value})}>
                                <option value="">All Sports</option>
                                <option value="cricket">Cricket</option>
                                <option value="football">Football</option>
                            </select>
                            <select className="input-premium" style={{ fontSize: '0.82rem', padding: '8px 14px', borderRadius: '10px', fontFamily: 'inherit', fontWeight: 500, width: 'auto', minWidth: '135px' }} value={bookingsFilter.paymentStatus} onChange={(e) => setBookingsFilter({...bookingsFilter, paymentStatus: e.target.value})}>
                                <option value="">All Statuses</option>
                                <option value="SUCCESS">Paid</option>
                                <option value="PENDING">Pending</option>
                                <option value="DROPPED">Dropped</option>
                                <option value="FAILED">Failed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                            <select className="input-premium" style={{ fontSize: '0.82rem', padding: '8px 14px', borderRadius: '10px', fontFamily: 'inherit', fontWeight: 500, width: 'auto', minWidth: '145px' }} value={bookingsDateRange} onChange={(e) => setBookingsDateRange(e.target.value)}>
                                <option value="all">All Time</option>
                                <option value="30days">Last 30 Days</option>
                                <option value="90days">Last 90 Days</option>
                                <option value="custom">Custom Range</option>
                            </select>
                            {bookingsDateRange === 'custom' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <input 
                                        type="date" 
                                        className="input-premium" 
                                        style={{ fontSize: '0.82rem', padding: '6px 10px', borderRadius: '10px', fontFamily: 'inherit', width: 'auto', minWidth: '130px' }}
                                        value={bookingsCustomStartDate} 
                                        onChange={(e) => setBookingsCustomStartDate(e.target.value)} 
                                    />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>to</span>
                                    <input 
                                        type="date" 
                                        className="input-premium" 
                                        style={{ fontSize: '0.82rem', padding: '6px 10px', borderRadius: '10px', fontFamily: 'inherit', width: 'auto', minWidth: '130px' }}
                                        value={bookingsCustomEndDate} 
                                        onChange={(e) => setBookingsCustomEndDate(e.target.value)} 
                                    />
                                </div>
                            )}
                            <button onClick={() => setShowOfflineBookingModal(true)} style={{
                                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                                background: 'var(--gradient-2)', color: '#fff', border: 'none', borderRadius: '10px',
                                cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600,
                                transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(16,185,129,0.25)'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(16,185,129,0.35)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.25)'; }}
                            >
                                <span className="material-icons-outlined" style={{ fontSize: '16px' }}>add_circle</span> Book Turf
                            </button>
                            <button onClick={() => setShowBookingsReportModal(true)} style={{
                                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                                background: 'var(--gradient-1)', color: '#fff', border: 'none', borderRadius: '10px',
                                cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600,
                                transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(99,102,241,0.25)'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(99,102,241,0.35)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.25)'; }}
                            >
                                <span className="material-icons-outlined" style={{ fontSize: '16px' }}>analytics</span> Report
                            </button>
                            <button onClick={() => {
                                const headers = ['Booking ID', 'Customer Name', 'Phone', 'Sport', 'Date', 'Slots', 'Total Amount', 'Paid Amount', 'Status', 'Payment Method'];
                                const rows = filteredBookings.map(b => [
                                    b._id,
                                    b.customerName || '',
                                    b.customerPhone || '',
                                    b.sport || 'turf',
                                    b.date || '',
                                    (b.timeSlots || []).join('; '),
                                    b.totalAmount || 0,
                                    b.paidAmount || 0,
                                    b.paymentStatus || 'PENDING',
                                    b.paymentMethod || 'ONLINE'
                                ]);
                                const blob = new Blob(['\uFEFF' + [headers.join(','), ...rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')], { type: 'text/csv;charset=utf-8;' });
                                const url = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.setAttribute('href', url);
                                link.setAttribute('download', `khelo_patna_bookings_${new Date().toISOString().split('T')[0]}.csv`);
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }} style={{
                                display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                                background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px',
                                cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600,
                                transition: 'all 0.2s'
                            }}>
                                <span className="material-icons-outlined" style={{ fontSize: '16px' }}>file_download</span> Export CSV
                            </button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                        {[
                            { label: 'Total Revenue', value: formatINR(totalRevenue), icon: 'account_balance_wallet', gradient: 'var(--gradient-1)', sub: `From ${totalBookingsCount} bookings` },
                            { label: 'Total Bookings', value: totalBookingsCount, icon: 'calendar_month', gradient: 'var(--gradient-4)', sub: `${paidCount} paid · ${pendingCount} pending` },
                            { label: 'Successful Payments', value: paidCount, icon: 'check_circle', gradient: 'var(--gradient-2)', sub: `${((paidCount / (totalBookingsCount || 1)) * 100).toFixed(0)}% success rate` },
                            { label: 'Pending Amount', value: formatINR(totalPendingAmount), icon: 'pending', gradient: 'var(--gradient-5)', sub: `${pendingCount + failedCount} unpaid bookings` }
                        ].map((s, i) => (
                            <div key={i} className="card-premium" style={{ padding: '18px', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '70px', height: '70px', borderRadius: '50%', background: s.gradient, opacity: 0.07 }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                                    <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: s.gradient, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '19px' }}>{s.icon}</span>
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
                                </div>
                                <div style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '2px' }}>{s.value}</div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{s.sub}</div>
                            </div>
                        ))}
                    </div>

                    {/* Bookings Table */}
                    <div className="card-premium" style={{ padding: '0', overflow: 'hidden' }}>
                        {/* Table Header */}
                        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'var(--gradient-4)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '17px' }}>receipt_long</span>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>All Bookings</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{totalBookingsCount} records found</div>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        {['Customer', 'Customer ID', 'Sport', 'Date', 'Slots', 'Total', 'Paid', 'Balance', 'Status', 'Action'].map(h => (
                                            <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--bg-color)' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {bookingsLog.length === 0 ? (
                                        <tr><td colSpan="10" style={{ textAlign: 'center', padding: '50px 20px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                                <span className="material-icons-outlined" style={{ fontSize: '44px', color: 'var(--text-muted)', opacity: 0.3 }}>event_busy</span>
                                                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-muted)' }}>No bookings found</div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', opacity: 0.7 }}>Try changing your filters above</div>
                                            </div>
                                        </td></tr>
                                    ) : (
                                        bookingsLog.map((b, idx) => {
                                            const custId = generateCustomerId(b.customerName, b.customerPhone);
                                            const initials = (b.customerName || 'W').substring(0, 2).toUpperCase();
                                            const balance = (b.totalAmount || 0) - (b.discountAmount || 0) - (b.paidAmount || 0);
                                            const avatarColors = ['var(--primary)', 'var(--success)', 'var(--warning)', 'var(--info)', 'var(--danger)', '#8b5cf6', '#ec4899'];
                                            const avatarColor = avatarColors[idx % avatarColors.length];
                                            const bookedByLabel = getBookingSourceLabel(b);

                                            return (
                                                <tr key={b._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-light)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    {/* Customer */}
                                                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: avatarColor, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.72rem', flexShrink: 0 }}>
                                                                {initials}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{b.customerName || 'Walk-in'}</div>
                                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{b.customerPhone || '—'}</div>
                                                                <div style={{ fontSize: '0.68rem', color: 'var(--primary)', fontWeight: 600, marginTop: '1px' }}>
                                                                    Booked by: {bookedByLabel}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {/* Customer ID */}
                                                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                                        <span style={{ fontSize: '0.74rem', fontWeight: 600, background: 'rgba(99,102,241,0.08)', color: 'var(--primary)', padding: '3px 8px', borderRadius: '6px', fontFamily: 'monospace', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>{custId}</span>
                                                    </td>
                                                    {/* Sport */}
                                                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                                        <span style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'capitalize', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            {b.sport === 'cricket' ? (
                                                                <span className="material-icons-outlined" style={{ fontSize: '15px', color: 'var(--gold)' }}>sports_cricket</span>
                                                            ) : (
                                                                <span className="material-icons-outlined" style={{ fontSize: '15px', color: 'var(--primary)' }}>sports_soccer</span>
                                                            )}
                                                            {b.sport}
                                                        </span>
                                                    </td>
                                                    {/* Date */}
                                                    <td style={{ padding: '12px 16px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                                                        {new Date(b.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    {/* Slots */}
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
                                                            {(b.timeSlots || []).map((slot, si) => (
                                                                <span key={si} style={{ fontSize: '0.68rem', background: 'rgba(59,130,246,0.06)', color: 'var(--primary)', border: '1px solid rgba(99,102,241,0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatSlotTo12Hr(slot)}</span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    {/* Total */}
                                                    <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.84rem', whiteSpace: 'nowrap' }}>{formatINR(b.totalAmount || 0)}</td>
                                                    {/* Paid */}
                                                    <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.84rem', color: 'var(--success)', whiteSpace: 'nowrap' }}>{formatINR(b.paidAmount || 0)}</td>
                                                    {/* Balance */}
                                                    <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: '0.84rem', color: balance > 0 ? 'var(--danger)' : 'var(--success)', whiteSpace: 'nowrap' }}>
                                                        {balance > 0 ? formatINR(balance) : '—'}
                                                    </td>
                                                    {/* Status */}
                                                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                                        <span style={{
                                                            fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: '12px',
                                                            background: b.paymentStatus === 'SUCCESS' ? 'var(--success-light)' 
                                                                : b.paymentStatus === 'PENDING' ? 'var(--warning-light)' 
                                                                : b.paymentStatus === 'DROPPED' ? 'rgba(217, 119, 6, 0.08)' 
                                                                : b.paymentStatus === 'CANCELLED' ? 'rgba(156, 163, 175, 0.08)'
                                                                : 'var(--danger-light)',
                                                            color: b.paymentStatus === 'SUCCESS' ? 'var(--success)' 
                                                                : b.paymentStatus === 'PENDING' ? 'var(--warning)' 
                                                                : b.paymentStatus === 'DROPPED' ? '#D97706' 
                                                                : b.paymentStatus === 'CANCELLED' ? '#9CA3AF'
                                                                : 'var(--danger)',
                                                            border: `1px solid ${b.paymentStatus === 'SUCCESS' ? 'var(--success-border)' 
                                                                : b.paymentStatus === 'PENDING' ? 'var(--warning-border)' 
                                                                : b.paymentStatus === 'DROPPED' ? 'rgba(217, 119, 6, 0.2)'
                                                                : b.paymentStatus === 'CANCELLED' ? 'rgba(156, 163, 175, 0.2)'
                                                                : 'var(--danger-border)'}`,
                                                            whiteSpace: 'nowrap',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}>
                                                            <span style={{ fontSize: '8px' }}>●</span>
                                                            {b.paymentStatus === 'SUCCESS' ? 'Paid' 
                                                                : b.paymentStatus === 'PENDING' ? 'Pending' 
                                                                : b.paymentStatus === 'DROPPED' ? 'Dropped' 
                                                                : b.paymentStatus === 'CANCELLED' ? 'Cancelled' 
                                                                : 'Failed'}
                                                        </span>
                                                    </td>
                                                    {/* Action */}
                                                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                                        <button onClick={() => setSelectedBookingState(b)} style={{
                                                            display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px',
                                                            background: 'var(--gradient-1)', color: '#fff', border: 'none', borderRadius: '8px',
                                                            cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.74rem', fontWeight: 600,
                                                            transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(99,102,241,0.25)'
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.35)'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(99,102,241,0.25)'; }}
                                                        >
                                                            <span className="material-icons-outlined" style={{ fontSize: '15px' }}>visibility</span>
                                                            Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Modals are now rendered at the root viewport level to prevent transform clipping */}
                </div>
            );
        }

        const hoursArray = Array.from({ length: 24 }).map((_, i) => {
            const h = i % 12 || 12;
            const ampm = i < 12 ? 'AM' : 'PM';
            return { value: i, label: `${String(h).padStart(2, '0')}:00 ${ampm}` };
        });

        // Calculate stats for premium stats cards
        const startHourVal = turfSettings?.blackoutHours?.start ?? 16;
        const endHourVal = turfSettings?.blackoutHours?.end ?? 20;
        const startHourLabel = hoursArray.find(h => h.value === startHourVal)?.label || '04:00 PM';
        const endHourLabel = hoursArray.find(h => h.value === endHourVal)?.label || '08:00 PM';
        const academyHoursText = `${startHourLabel} - ${endHourLabel}`;

        return (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Page Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.03em' }}>Turf Management Settings</h2>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Configure operating hours, daily Academy block times, and custom date closure exceptions.</p>
                    </div>
                </div>

                {/* Premium Stats Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                    {[
                        { label: 'Academy Block Hours', value: academyHoursText, icon: 'school', gradient: 'var(--gradient-1)', sub: 'Monday to Friday only' },
                        { label: 'Cricket Turf Rate', value: turfSettings ? formatINR(turfSettings.cricketBaseRate) + '/hr' : 'Loading...', icon: 'sports_cricket', gradient: 'var(--gradient-2)', sub: 'Standard hourly slot rate' },
                        { label: 'Cricket Nets Rate', value: turfSettings ? formatINR(turfSettings.netsBaseRate || 800) + '/hr' : 'Loading...', icon: 'sports_cricket', gradient: 'var(--gradient-3)', sub: 'Admin offline booking only' },
                        { label: 'Football Turf Rate', value: turfSettings ? formatINR(turfSettings.footballBaseRate) + '/hr' : 'Loading...', icon: 'sports_soccer', gradient: 'var(--gradient-4)', sub: 'Standard hourly slot rate' },
                        { label: 'Active Closures', value: `${closuresList.length} Exceptions`, icon: 'block', gradient: 'var(--gradient-5)', sub: 'Custom date blocks scheduled' }
                    ].map((s, i) => (
                        <div key={i} className="card-premium" style={{ padding: '18px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '70px', height: '70px', borderRadius: '50%', background: s.gradient, opacity: 0.07 }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                                <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: s.gradient, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '19px' }}>{s.icon}</span>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
                            </div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '2px' }}>{s.value}</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{s.sub}</div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px' }}>
                    
                    {/* Column 1: Daily Blackouts & Pricing */}
                    <div style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {turfSettings ? (
                            <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '22px', padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--gradient-1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '20px' }}>tune</span>
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Academy Block & Pricing Rules</h3>
                                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>Manage default operational settings and pricing rules for the turf grounds</p>
                                    </div>
                                </div>

                                <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    
                                    {/* Academy Block Times setting */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                <span className="material-icons-outlined" style={{ fontSize: '15px', color: 'var(--emerald)' }}>school</span> Monday to Friday Academy Block
                                            </span>
                                        </label>
                                        <div style={{ background: 'var(--bg-color)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)' }}>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 0, marginBottom: '14px', lineHeight: '1.4' }}>
                                                Configure the daily time window reserved exclusively for Academy training. The turf will be blocked from public reservation during these hours <strong>only from Monday to Friday</strong>. Saturday and Sunday will remain fully open for public bookings.
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>Start Block Time</span>
                                                    <select 
                                                        className="input-premium w-100" 
                                                        value={turfSettings.blackoutHours?.start ?? 16} 
                                                        onChange={(e) => setTurfSettings({ ...turfSettings, blackoutHours: { ...turfSettings.blackoutHours, start: Number(e.target.value) } })}
                                                        style={{ fontSize: '0.84rem', padding: '10px 14px', borderRadius: '8px' }}
                                                    >
                                                        {hoursArray.map(h => (
                                                            <option key={h.value} value={h.value}>{h.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'flex-end', paddingBottom: '10px' }}>
                                                    <span className="material-icons-outlined" style={{ color: 'var(--text-muted)', fontSize: '18px' }}>arrow_forward</span>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>End Block Time</span>
                                                    <select 
                                                        className="input-premium w-100" 
                                                        value={turfSettings.blackoutHours?.end ?? 20} 
                                                        onChange={(e) => setTurfSettings({ ...turfSettings, blackoutHours: { ...turfSettings.blackoutHours, end: Number(e.target.value) } })}
                                                        style={{ fontSize: '0.84rem', padding: '10px 14px', borderRadius: '8px' }}
                                                    >
                                                        {hoursArray.map(h => (
                                                            <option key={h.value} value={h.value}>{h.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', background: 'rgba(99,102,241,0.06)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.1)' }}>
                                                <span className="material-icons-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>info</span>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                                                    Current Academy Block: <strong>{hoursArray.find(h => h.value === (turfSettings.blackoutHours?.start ?? 16))?.label}</strong> to <strong>{hoursArray.find(h => h.value === (turfSettings.blackoutHours?.end ?? 20))?.label}</strong> (Monday to Friday only).
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Turf Pricing Settings */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                <span className="material-icons-outlined" style={{ fontSize: '15px', color: 'var(--emerald)' }}>payments</span> Hourly Booking Base Rates
                                            </span>
                                        </label>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                                            <div style={{ background: 'var(--bg-color)', borderRadius: '12px', padding: '14px', border: '1px solid var(--border-color)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                                    <span className="material-icons-outlined" style={{ fontSize: '18px', color: 'var(--amber)' }}>sports_cricket</span>
                                                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main)' }}>Cricket Turf Rate</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                                    <span style={{ position: 'absolute', left: '12px', fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-muted)' }}>₹</span>
                                                    <input 
                                                        type="number" 
                                                        className="input-premium w-100" 
                                                        style={{ paddingLeft: '24px', fontSize: '0.84rem', borderRadius: '8px', padding: '10px 10px 10px 24px' }} 
                                                        value={turfSettings.cricketBaseRate} 
                                                        onChange={(e) => setTurfSettings({ ...turfSettings, cricketBaseRate: Number(e.target.value) })}
                                                    />
                                                </div>
                                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>Base rate charged per hour slot</span>
                                            </div>

                                            <div style={{ background: 'var(--bg-color)', borderRadius: '12px', padding: '14px', border: '1px solid var(--border-color)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                                    <span className="material-icons-outlined" style={{ fontSize: '18px', color: 'var(--emerald)' }}>grid_on</span>
                                                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main)' }}>Cricket Nets Rate</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                                    <span style={{ position: 'absolute', left: '12px', fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-muted)' }}>₹</span>
                                                    <input 
                                                        type="number" 
                                                        className="input-premium w-100" 
                                                        style={{ paddingLeft: '24px', fontSize: '0.84rem', borderRadius: '8px', padding: '10px 10px 10px 24px' }} 
                                                        value={turfSettings.netsBaseRate || 800} 
                                                        onChange={(e) => setTurfSettings({ ...turfSettings, netsBaseRate: Number(e.target.value) })}
                                                    />
                                                </div>
                                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>Rate for admin offline bookings</span>
                                            </div>
                                            
                                            <div style={{ background: 'var(--bg-color)', borderRadius: '12px', padding: '14px', border: '1px solid var(--border-color)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                                    <span className="material-icons-outlined" style={{ fontSize: '18px', color: 'var(--emerald)' }}>sports_soccer</span>
                                                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main)' }}>Football Turf Rate</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                                    <span style={{ position: 'absolute', left: '12px', fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-muted)' }}>₹</span>
                                                    <input 
                                                        type="number" 
                                                        className="input-premium w-100" 
                                                        style={{ paddingLeft: '24px', fontSize: '0.84rem', borderRadius: '8px', padding: '10px 10px 10px 24px' }} 
                                                        value={turfSettings.footballBaseRate} 
                                                        onChange={(e) => setTurfSettings({ ...turfSettings, footballBaseRate: Number(e.target.value) })}
                                                    />
                                                </div>
                                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>Base rate charged per hour slot</span>
                                            </div>

                                            <div style={{ background: 'var(--bg-color)', borderRadius: '12px', padding: '14px', border: '1px solid var(--border-color)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                                    <span className="material-icons-outlined" style={{ fontSize: '18px', color: 'var(--emerald)' }}>payments</span>
                                                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main)' }}>Advance Payment %</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                                    <input 
                                                        type="number" 
                                                        className="input-premium w-100" 
                                                        style={{ fontSize: '0.84rem', borderRadius: '8px', padding: '10px 24px 10px 10px' }} 
                                                        value={turfSettings.advancePercentage !== undefined ? turfSettings.advancePercentage : 100} 
                                                        min="0"
                                                        max="100"
                                                        onChange={(e) => setTurfSettings({ ...turfSettings, advancePercentage: Math.min(100, Math.max(0, Number(e.target.value))) })}
                                                    />
                                                    <span style={{ position: 'absolute', right: '12px', fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-muted)' }}>%</span>
                                                </div>
                                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>Percentage of total to pay online (0-100)</span>
                                            </div>
                                        </div>

                                        {/* Weekly Pricing Matrix */}
                                        <div style={{ marginTop: '24px' }}>
                                            <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                    <span className="material-icons-outlined" style={{ fontSize: '15px', color: 'var(--emerald)' }}>calendar_month</span> Custom Weekly Pricing (By Day of Week)
                                                </span>
                                            </label>
                                            <div style={{ background: 'var(--bg-color)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 0, marginBottom: '14px', lineHeight: '1.4' }}>
                                                    Set custom hourly rates for specific days of the week. Leave blank or set to 0 to use the standard base rate above.
                                                </p>
                                                <table className="w-100" style={{ borderCollapse: 'collapse', minWidth: '600px' }}>
                                                    <thead>
                                                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                            <th style={{ textAlign: 'left', padding: '10px', fontSize: '0.74rem', color: 'var(--text-muted)', width: '180px' }}>Sport / Turf Type</th>
                                                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                                                                <th key={idx} style={{ textAlign: 'center', padding: '10px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>{day}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {[
                                                            { key: 'cricket', label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span className="material-icons-outlined" style={{ fontSize: '16px', color: 'var(--amber)' }}>sports_cricket</span> Cricket Turf</span>, defaultRate: turfSettings.cricketBaseRate },
                                                            { key: 'nets', label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span className="material-icons-outlined" style={{ fontSize: '16px', color: 'var(--emerald)' }}>grid_on</span> Cricket Nets</span>, defaultRate: turfSettings.netsBaseRate || 800 },
                                                            { key: 'football', label: <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span className="material-icons-outlined" style={{ fontSize: '16px', color: 'var(--emerald)' }}>sports_soccer</span> Football Turf</span>, defaultRate: turfSettings.footballBaseRate }
                                                        ].map(sportRow => {
                                                            const rates = turfSettings.weeklyRates?.[sportRow.key] || [0, 0, 0, 0, 0, 0, 0];
                                                            return (
                                                                <tr key={sportRow.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                                    <td style={{ padding: '12px 10px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>{sportRow.label}</td>
                                                                    {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
                                                                        const val = rates[dayIdx] || 0;
                                                                        return (
                                                                            <td key={dayIdx} style={{ padding: '8px 4px', textAlign: 'center' }}>
                                                                                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', width: '74px' }}>
                                                                                    <span style={{ position: 'absolute', left: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>₹</span>
                                                                                    <input 
                                                                                        type="number" 
                                                                                        className="input-premium text-center" 
                                                                                        style={{ width: '100%', padding: '6px 4px 6px 14px', fontSize: '0.74rem', borderRadius: '6px' }}
                                                                                        value={val === 0 ? '' : val}
                                                                                        placeholder={sportRow.defaultRate}
                                                                                        onChange={(e) => {
                                                                                            const newVal = Number(e.target.value) || 0;
                                                                                            const updatedRates = [...rates];
                                                                                            updatedRates[dayIdx] = newVal;
                                                                                            setTurfSettings({
                                                                                                ...turfSettings,
                                                                                                weeklyRates: {
                                                                                                    ...turfSettings.weeklyRates,
                                                                                                    [sportRow.key]: updatedRates
                                                                                                }
                                                                                            });
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                            </td>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action button */}
                                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                                        <button type="submit" className="btn-primary-stripe" style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 700, borderRadius: '8px', border: 'none', background: 'var(--gradient-1)', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.2)' }}
                                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                        >
                                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>save</span> Save Configuration
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div className="card-premium text-center" style={{ padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                    <span className="material-icons-outlined animate-spin" style={{ fontSize: '32px', color: 'var(--primary)' }}>sync</span>
                                    <span className="text-muted" style={{ fontSize: '0.88rem', fontWeight: 500 }}>Loading turf configuration...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Column 2: Closures */}
                    <div style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* Add Closure Card */}
                        <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '18px' }}>block</span>
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.02rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Create Custom Date Closure</h3>
                                    <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: 0 }}>Block turf bookings for specific exceptions</p>
                                </div>
                            </div>

                            <form onSubmit={handleCreateClosure} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Closure Starts</label>
                                    <input 
                                        type="datetime-local" 
                                        className="input-premium w-100" 
                                        required 
                                        style={{ fontSize: '0.82rem', padding: '10px 12px', borderRadius: '8px' }}
                                        value={newClosure.startDate} 
                                        onChange={(e) => setNewClosure({ ...newClosure, startDate: e.target.value })} 
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Closure Ends</label>
                                    <input 
                                        type="datetime-local" 
                                        className="input-premium w-100" 
                                        required 
                                        style={{ fontSize: '0.82rem', padding: '10px 12px', borderRadius: '8px' }}
                                        value={newClosure.endDate} 
                                        onChange={(e) => setNewClosure({ ...newClosure, endDate: e.target.value })} 
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>Reason / Description</label>
                                    <input 
                                        type="text" 
                                        className="input-premium w-100" 
                                        placeholder="e.g. Heavy Rain / Maintenance / Tournament" 
                                        required 
                                        style={{ fontSize: '0.82rem', padding: '10px 12px', borderRadius: '8px' }}
                                        value={newClosure.reason} 
                                        onChange={(e) => setNewClosure({ ...newClosure, reason: e.target.value })} 
                                    />
                                </div>
                                <button type="submit" style={{ background: '#EF4444', color: '#fff', fontSize: '0.82rem', fontWeight: 700, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', boxShadow: '0 4px 12px rgba(239,68,68,0.25)' }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <span className="material-icons-outlined" style={{ fontSize: '16px' }}>lock</span> Add Closure Block
                                </button>
                            </form>
                        </div>

                        {/* Active Closures list card */}
                        <div className="card-premium" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="material-icons-outlined" style={{ color: 'var(--primary)', fontSize: '18px' }}>format_list_bulleted</span>
                                    <h3 style={{ fontSize: '0.98rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Active Closure Exceptions</h3>
                                </div>
                                <span style={{ fontSize: '0.68rem', background: 'rgba(239,68,68,0.08)', color: '#EF4444', padding: '3px 8px', borderRadius: '12px', fontWeight: 700 }}>
                                    {closuresList.length} exceptions
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                                {closuresList.length === 0 ? (
                                    <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', border: '1px dashed var(--border-color)', borderRadius: '10px', background: 'var(--bg-color)' }}>
                                        No active custom closures scheduled.
                                    </div>
                                ) : (
                                    closuresList.map(c => {
                                        const startStr = new Date(c.startDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                                        const endStr = new Date(c.endDate).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                                        return (
                                            <div key={c._id} style={{ padding: '12px 14px', background: 'var(--bg-color)', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border-color 0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'}
                                                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                                            >
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                                                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{c.reason}</span>
                                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                                        {startStr} to {endStr}
                                                    </span>
                                                </div>
                                                <button 
                                                    onClick={() => handleDeleteClosure(c._id)} 
                                                    style={{ border: 'none', background: 'rgba(239,68,68,0.06)', width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#EF4444', transition: 'all 0.2s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.06)'}
                                                    title="Delete exception"
                                                >
                                                    <span className="material-icons-outlined" style={{ fontSize: '16px' }}>delete</span>
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        );
}
