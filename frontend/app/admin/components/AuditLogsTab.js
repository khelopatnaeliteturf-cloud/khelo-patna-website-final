"use client";

import React, { useState, useEffect } from 'react';

export default function AuditLogsTab({ backendUrl, getHeaders }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${backendUrl}/api/admin/audit-logs`, { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) {
                setLogs(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to load audit logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatActionBadge = (action) => {
        switch (action) {
            case 'CREATE_OFFLINE_BOOKING':
                return <span style={{ background: 'rgba(16, 185, 129, 0.14)', color: '#047857', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '5px 12px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap' }}>🏏 Manual Booking</span>;
            case 'ONLINE_BOOKING':
                return <span style={{ background: 'rgba(16, 185, 129, 0.14)', color: '#047857', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '5px 12px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap' }}>🌐 Online Booking</span>;
            case 'CANCEL_BOOKING':
                return <span style={{ background: 'rgba(239, 68, 68, 0.14)', color: '#B91C1C', border: '1px solid rgba(239, 68, 68, 0.35)', padding: '5px 12px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap' }}>❌ Cancelled Booking</span>;
            case 'CREATE_CLOSURE':
                return <span style={{ background: 'rgba(217, 119, 6, 0.14)', color: '#B45309', border: '1px solid rgba(217, 119, 6, 0.35)', padding: '5px 12px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap' }}>🔒 Turf Closed</span>;
            case 'DELETE_CLOSURE':
                return <span style={{ background: 'rgba(100, 116, 139, 0.14)', color: '#334155', border: '1px solid rgba(100, 116, 139, 0.35)', padding: '5px 12px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap' }}>🔓 Block Removed</span>;
            case 'RECORD_FEE_PAYMENT':
            case 'PAY_FEE':
                return <span style={{ background: 'rgba(16, 185, 129, 0.14)', color: '#047857', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '5px 12px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap' }}>💳 Academy Fee Paid</span>;
            case 'ADD_STUDENT':
            case 'ADMISSION':
                return <span style={{ background: 'rgba(37, 99, 235, 0.14)', color: '#1D4ED8', border: '1px solid rgba(37, 99, 235, 0.35)', padding: '5px 12px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap' }}>👤 Student Admission</span>;
            case 'UPDATE_PRICING':
            case 'UPDATE_SETTINGS':
                return <span style={{ background: 'rgba(79, 70, 229, 0.14)', color: '#4338CA', border: '1px solid rgba(79, 70, 229, 0.35)', padding: '5px 12px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap' }}>⚙️ Settings Updated</span>;
            case 'ADD_STAFF':
                return <span style={{ background: 'rgba(37, 99, 235, 0.14)', color: '#1D4ED8', border: '1px solid rgba(37, 99, 235, 0.35)', padding: '5px 12px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap' }}>🪪 New Staff Added</span>;
            case 'DELETE_STAFF':
                return <span style={{ background: 'rgba(239, 68, 68, 0.14)', color: '#B91C1C', border: '1px solid rgba(239, 68, 68, 0.35)', padding: '5px 12px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 800, whiteSpace: 'nowrap' }}>🗑️ Staff Account Deleted</span>;
            default:
                return <span style={{ background: 'rgba(100, 116, 139, 0.12)', color: '#1E293B', padding: '5px 12px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{action ? action.replace(/_/g, ' ') : 'System Action'}</span>;
        }
    };

    const formatSummaryDetails = (log) => {
        const rawData = log.newData || log.oldData || log.details || {};
        let obj = rawData;
        if (typeof rawData === 'string') {
            try {
                obj = JSON.parse(rawData);
            } catch (_) {
                return rawData;
            }
        }
        return formatSummaryObj(obj, log.action);
    };

    const formatSummaryObj = (obj, action) => {
        if (!obj || typeof obj !== 'object' || Object.keys(obj).length === 0) {
            return '—';
        }

        if (action === 'CREATE_OFFLINE_BOOKING' || action === 'ONLINE_BOOKING') {
            const name = obj.customerName || obj.name || 'Walk-in Guest';
            const rawSport = obj.sport || 'cricket';
            const sport = rawSport.charAt(0).toUpperCase() + rawSport.slice(1);
            const date = obj.date || '';
            const time = obj.slotTime || obj.timeSlot || (obj.slots ? (Array.isArray(obj.slots) ? obj.slots.join(', ') : obj.slots) : '');
            const amount = obj.paidAmount || obj.amount || obj.totalAmount || '';
            return `Booked ${sport} Turf for ${name}${date ? ` (${date}${time ? `, ${time}` : ''})` : ''}${amount ? ` • Paid ₹${amount}` : ''}`;
        }

        if (action === 'RECORD_FEE_PAYMENT' || action === 'PAY_FEE') {
            const name = obj.studentName || obj.name || 'Student';
            const amount = obj.amount || obj.paidAmount || '';
            const month = obj.month || obj.forMonth || '';
            return `Received ${amount ? `₹${amount}` : ''} Academy Fee for ${name}${month ? ` (${month})` : ''}`;
        }

        if (action === 'ADD_STUDENT' || action === 'ADMISSION') {
            const name = obj.studentName || obj.name || 'Student';
            const rawSport = obj.sport || 'cricket';
            const sport = rawSport.charAt(0).toUpperCase() + rawSport.slice(1);
            const phone = obj.mobileNumber || obj.phone || '';
            return `Admitted ${name} into ${sport} Academy${phone ? ` • Contact: ${phone}` : ''}`;
        }

        if (action === 'CREATE_CLOSURE') {
            const reason = obj.reason || 'Maintenance';
            const start = obj.startDate ? new Date(obj.startDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
            const end = obj.endDate ? new Date(obj.endDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
            return `Blocked turf for "${reason}" ${start ? `(${start} to ${end})` : ''}`;
        }

        if (action === 'DELETE_CLOSURE') {
            return `Removed custom closure block from calendar`;
        }

        if (action === 'TOGGLE_WHATSAPP_BOT') {
            const status = obj.status || (obj.enabled ? 'ENABLED' : 'DISABLED');
            const user = obj.toggledBy || 'owner';
            return `Toggled WhatsApp Auto-Bot to ${status} (by ${user})`;
        }

        // Clean Key-Value sentence fallback without raw JSON braces
        return Object.entries(obj)
            .filter(([k]) => !['_id', 'tenantId', 'branchId', '__v', 'createdAt', 'updatedAt'].includes(k))
            .map(([k, v]) => {
                const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                const valStr = typeof v === 'object' ? JSON.stringify(v) : String(v);
                return `${label}: ${valStr}`;
            })
            .join(' • ');
    };

    return (
        <div className="card-premium animate-fade-in">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-icons-outlined" style={{ color: 'var(--emerald)' }}>analytics</span> Administrative Audit Logs
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Real-time activity records of staff bookings, academy payments, and turf modifications.</p>
                </div>
                <button className="btn-secondary-stripe" onClick={loadLogs} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-icons-outlined" style={{ fontSize: '16px' }}>refresh</span> Refresh Logs
                </button>
            </div>

            <div className="table-responsive">
                <table className="table-premium">
                    <thead>
                        <tr>
                            <th>Date & Time</th>
                            <th>Operator</th>
                            <th>Module</th>
                            <th>Action Performed</th>
                            <th>Activity Details Summary</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="5" className="text-center p-4">Loading audit activity logs...</td>
                            </tr>
                        ) : logs.length > 0 ? (
                            logs.map(log => (
                                <tr key={log._id}>
                                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', fontWeight: 500 }}>
                                        {new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </td>
                                    <td>
                                        <span style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#4338CA', border: '1px solid rgba(99, 102, 241, 0.25)', padding: '3px 9px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, textTransform: 'capitalize', display: 'inline-block' }}>
                                            {log.userId || log.operator || 'Owner'}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{log.module || 'Turf'}</td>
                                    <td>{formatActionBadge(log.action)}</td>
                                    <td style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text-main)' }}>
                                        {formatSummaryDetails(log)}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="text-center p-4 text-muted">No administrative activity logs recorded yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
