'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getSessionMonths, getSessionLabel } from '../lib/feeSession';

const formatINR = (v) => `₹${(Number(v) || 0).toLocaleString('en-IN')}`;

// Manages session fee terms (April → March) for one student.
// Terms are Fee records; unassigned months can be selected and assigned,
// unpaid assigned terms can be removed.
export default function FeeTermsManager({ student, backendUrl, getHeaders, notifySuccess, notifyError, onChanged }) {
    const [fees, setFees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedMonths, setSelectedMonths] = useState([]);

    const sessionMonths = getSessionMonths();
    const sessionLabel = getSessionLabel();
    const perMonthFee = student?.adjustedFee !== undefined && student?.adjustedFee !== null && student?.adjustedFee !== ''
        ? Number(student.adjustedFee)
        : Number(student?.monthlyFee) || 0;

    const loadFees = useCallback(async () => {
        if (!student?._id) return;
        setLoading(true);
        try {
            const res = await fetch(`${backendUrl}/api/academy/students/${student._id}/fees`, { headers: getHeaders() });
            const data = await res.json();
            if (res.ok) setFees(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to load fee terms:', err);
        } finally {
            setLoading(false);
        }
    }, [student?._id, backendUrl]);

    useEffect(() => { loadFees(); }, [loadFees]);

    const feeByMonth = {};
    fees.forEach(f => { feeByMonth[f.monthFor] = f; });

    const toggleMonth = (month) => {
        setSelectedMonths(prev => prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]);
    };

    const handleAssign = async () => {
        if (selectedMonths.length === 0) return;
        setSaving(true);
        try {
            const res = await fetch(`${backendUrl}/api/academy/students/${student._id}/fee-terms`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ months: selectedMonths })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to assign fee terms.');
            notifySuccess && notifySuccess(data.message);
            setSelectedMonths([]);
            await loadFees();
            onChanged && onChanged();
        } catch (err) {
            notifyError && notifyError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async (month) => {
        setSaving(true);
        try {
            const res = await fetch(`${backendUrl}/api/academy/students/${student._id}/fee-terms/remove`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ monthFor: month })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to remove fee term.');
            notifySuccess && notifySuccess(data.message);
            await loadFees();
            onChanged && onChanged();
        } catch (err) {
            notifyError && notifyError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const statusStyle = (fee) => {
        if (!fee) return { border: '1px dashed var(--border-color)', color: 'var(--text-muted)', background: 'transparent' };
        if (fee.status === 'PAID') return { border: '1px solid var(--success-border)', color: 'var(--success-text)', background: 'var(--success-bg)' };
        if (fee.status === 'PARTIAL') return { border: '1px solid var(--warning-border)', color: 'var(--warning)', background: 'var(--warning-light)' };
        return { border: '1px solid var(--danger-border)', color: 'var(--danger)', background: 'var(--danger-light)' };
    };

    return (
        <div className="card-premium" style={{ marginTop: '16px' }}>
            <div className="d-flex justify-content-between align-items-center mb-3" style={{ flexWrap: 'wrap', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Fee Terms — Session {sessionLabel}
                </h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {formatINR(perMonthFee)}/month · April {sessionLabel.split('-')[0]} to March {Number(sessionLabel.split('-')[0]) + 1}
                </span>
            </div>

            {loading ? (
                <div style={{ padding: '18px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading fee terms…</div>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                        {sessionMonths.map(month => {
                            const fee = feeByMonth[month];
                            const isSelected = selectedMonths.includes(month);
                            const st = statusStyle(fee);
                            const balance = fee ? Math.max(0, (Number(fee.amountDue) || 0) - (Number(fee.amountPaid) || 0) - (Number(fee.discount) || 0)) : 0;
                            return (
                                <div
                                    key={month}
                                    role={fee ? undefined : 'button'}
                                    tabIndex={fee ? undefined : 0}
                                    aria-pressed={fee ? undefined : isSelected}
                                    onClick={() => !fee && !saving && toggleMonth(month)}
                                    onKeyDown={(e) => { if (!fee && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleMonth(month); } }}
                                    style={{
                                        ...st,
                                        borderRadius: '10px',
                                        padding: '10px 12px',
                                        cursor: fee ? 'default' : 'pointer',
                                        position: 'relative',
                                        outline: isSelected ? '2px solid var(--primary)' : 'none',
                                        outlineOffset: '1px',
                                        transition: 'outline 0.15s ease, background 0.15s ease'
                                    }}
                                >
                                    <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>{month}</div>
                                    <div style={{ fontSize: '0.68rem', marginTop: '3px' }}>
                                        {!fee && (isSelected ? 'Selected — will assign' : 'Not assigned')}
                                        {fee && fee.status === 'PAID' && 'Paid'}
                                        {fee && fee.status === 'PARTIAL' && `Partial · Bal ${formatINR(balance)}`}
                                        {fee && fee.status === 'UNPAID' && `Due ${formatINR(balance)}`}
                                    </div>
                                    {fee && fee.status === 'UNPAID' && (Number(fee.amountPaid) || 0) === 0 && (
                                        <button
                                            type="button"
                                            aria-label={`Remove ${month} fee term`}
                                            disabled={saving}
                                            onClick={(e) => { e.stopPropagation(); handleRemove(month); }}
                                            style={{
                                                position: 'absolute', top: '6px', right: '6px',
                                                width: '20px', height: '20px', borderRadius: '6px',
                                                border: 'none', background: 'var(--danger-light)',
                                                color: 'var(--danger)', cursor: 'pointer',
                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                                            }}
                                        >
                                            <span className="material-icons-outlined" style={{ fontSize: '13px' }}>close</span>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="d-flex justify-content-between align-items-center mt-3" style={{ flexWrap: 'wrap', gap: '10px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Tap unassigned months to select, then assign. Unpaid terms can be removed with the small ×.
                        </span>
                        <button
                            type="button"
                            className="btn-primary-stripe"
                            disabled={selectedMonths.length === 0 || saving}
                            onClick={handleAssign}
                            style={{ fontSize: '0.82rem', opacity: selectedMonths.length === 0 ? 0.5 : 1 }}
                        >
                            {saving ? 'Saving…' : `Assign ${selectedMonths.length || ''} Term${selectedMonths.length === 1 ? '' : 's'} (${formatINR(perMonthFee * selectedMonths.length)})`}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
