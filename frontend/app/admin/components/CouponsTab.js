"use client";

import React, { useState, useEffect } from 'react';

export default function CouponsTab({ backendUrl, getHeaders, notifySuccess, notifyError }) {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    
    // Form fields
    const [code, setCode] = useState('');
    const [discountType, setDiscountType] = useState('PERCENT');
    const [discountValue, setDiscountValue] = useState('');
    const [minOrderAmount, setMinOrderAmount] = useState('');
    const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [usageLimit, setUsageLimit] = useState('');
    
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadCoupons();
    }, []);

    const loadCoupons = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${backendUrl}/api/admin/coupons`, {
                headers: getHeaders()
            });
            if (!res.ok) throw new Error('Failed to fetch coupons.');
            const data = await res.json();
            setCoupons(data || []);
        } catch (err) {
            console.error(err);
            notifyError('Could not load coupons directory.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCoupon = async (e) => {
        e.preventDefault();
        if (!code.trim() || !discountValue) {
            notifyError('Coupon code and discount value are required.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`${backendUrl}/api/admin/coupons`, {
                method: 'POST',
                headers: {
                    ...getHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code: code.toUpperCase().trim(),
                    discountType,
                    discountValue: parseFloat(discountValue),
                    minOrderAmount: parseFloat(minOrderAmount || 0),
                    maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
                    expiryDate: expiryDate || null,
                    isActive,
                    usageLimit: usageLimit ? parseInt(usageLimit, 10) : null
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create coupon.');

            notifySuccess(`Coupon ${code.toUpperCase()} created successfully!`);
            setShowCreateModal(false);
            resetForm();
            loadCoupons();
        } catch (err) {
            console.error(err);
            notifyError(err.message || 'Error creating coupon.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteCoupon = async (id, code) => {
        if (!window.confirm(`Are you sure you want to delete coupon "${code}"?`)) return;

        try {
            const res = await fetch(`${backendUrl}/api/admin/coupons/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });

            if (!res.ok) throw new Error('Failed to delete coupon.');
            notifySuccess(`Coupon "${code}" deleted successfully.`);
            loadCoupons();
        } catch (err) {
            console.error(err);
            notifyError('Error deleting coupon.');
        }
    };

    const resetForm = () => {
        setCode('');
        setDiscountType('PERCENT');
        setDiscountValue('');
        setMinOrderAmount('');
        setMaxDiscountAmount('');
        setExpiryDate('');
        setIsActive(true);
        setUsageLimit('');
    };

    return (
        <div style={{ padding: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px', fontFamily: 'Space Grotesk' }}>
                        🎫 Promo & Discount Coupons
                    </h2>
                    <p style={{ color: '#94A3B8', fontSize: '0.88rem', margin: 0 }}>
                        Create and manage active promo codes for checkout discount validation.
                    </p>
                </div>

                <button
                    onClick={() => {
                        resetForm();
                        setShowCreateModal(true);
                    }}
                    className="btn-premium"
                    style={{ padding: '12px 24px', fontSize: '0.85rem' }}
                >
                    <span>➕ Create Promo Code</span>
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                    <div style={{
                        width: '32px', height: '32px', border: '3px solid transparent',
                        borderTopColor: '#10B981', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                    }} />
                </div>
            ) : coupons.length === 0 ? (
                <div style={{
                    background: 'rgba(15, 23, 42, 0.4)', border: '1px dashed rgba(255,255,255,0.06)',
                    borderRadius: '16px', padding: '48px', textAlign: 'center', color: '#94A3B8'
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎫</div>
                    <div style={{ fontWeight: 600, color: '#F8FAFC', marginBottom: '4px' }}>No Coupons Found</div>
                    <div style={{ fontSize: '0.85rem' }}>Create your first promo code to allow checkout discounts.</div>
                </div>
            ) : (
                <div className="table-responsive" style={{ background: 'rgba(10, 16, 30, 0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
                    <table className="table-styled" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'rgba(15, 23, 42, 0.65)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Code</th>
                                <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Discount</th>
                                <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Min. Purchase</th>
                                <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Max Cap</th>
                                <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Usage Limit</th>
                                <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expiry Date</th>
                                <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                <th style={{ padding: '16px 20px', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {coupons.map((coupon) => {
                                const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) < new Date();
                                const isLimitReached = coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit;
                                const statusLabel = !coupon.isActive ? 'Inactive' : isExpired ? 'Expired' : isLimitReached ? 'Limit Reached' : 'Active';
                                const statusColor = statusLabel === 'Active' ? '#10B981' : statusLabel === 'Expired' ? '#EF4444' : '#F59E0B';

                                return (
                                    <tr key={coupon._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }}>
                                        <td style={{ padding: '16px 20px', fontWeight: 700, color: '#F8FAFC', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                                            {coupon.code}
                                        </td>
                                        <td style={{ padding: '16px 20px', color: '#10B981', fontWeight: 600 }}>
                                            {coupon.discountType === 'PERCENT' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                                        </td>
                                        <td style={{ padding: '16px 20px', color: '#E2E8F0' }}>
                                            ₹{coupon.minOrderAmount || 0}
                                        </td>
                                        <td style={{ padding: '16px 20px', color: '#E2E8F0' }}>
                                            {coupon.maxDiscountAmount ? `₹${coupon.maxDiscountAmount}` : 'None'}
                                        </td>
                                        <td style={{ padding: '16px 20px', color: '#E2E8F0' }}>
                                            {coupon.usageCount} / {coupon.usageLimit !== null ? coupon.usageLimit : '∞'}
                                        </td>
                                        <td style={{ padding: '16px 20px', color: '#94A3B8' }}>
                                            {coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <span style={{
                                                background: `${statusColor}15`, color: statusColor, border: `1px solid ${statusColor}30`,
                                                borderRadius: '30px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700,
                                                textTransform: 'uppercase', letterSpacing: '0.04em'
                                            }}>
                                                {statusLabel}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                            <button
                                                onClick={() => handleDeleteCoupon(coupon._id, coupon.code)}
                                                style={{
                                                    background: 'transparent', border: 'none', color: '#EF4444',
                                                    cursor: 'pointer', padding: '6px', opacity: 0.8, transition: 'opacity 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                                onMouseLeave={(e) => e.currentTarget.style.opacity = 0.8}
                                                title="Delete Coupon"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Coupon Modal */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 11000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    background: 'rgba(5, 7, 12, 0.8)', backdropFilter: 'blur(8px)'
                }}>
                    <div style={{
                        background: '#0B0F19', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '16px', padding: '36px', maxWidth: '480px', width: '90%',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#F8FAFC' }}>
                                Create New Promo Code
                            </h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                style={{ background: 'transparent', border: 'none', color: '#94A3B8', fontSize: '1.2rem', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label className="form-label-styled" style={{ display: 'block', marginBottom: '8px' }}>Promo Code *</label>
                                <input
                                    type="text"
                                    className="glass-input"
                                    style={{ textTransform: 'uppercase', width: '100%', boxSizing: 'border-box' }}
                                    placeholder="e.g. KHELO20"
                                    required
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label className="form-label-styled" style={{ display: 'block', marginBottom: '8px' }}>Discount Type *</label>
                                    <select
                                        className="glass-input"
                                        style={{ width: '100%', boxSizing: 'border-box', background: '#090D16' }}
                                        value={discountType}
                                        onChange={(e) => setDiscountType(e.target.value)}
                                    >
                                        <option value="PERCENT" style={{ background: '#090D16' }}>Percent (%)</option>
                                        <option value="FLAT" style={{ background: '#090D16' }}>Flat (₹)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label-styled" style={{ display: 'block', marginBottom: '8px' }}>Discount Value *</label>
                                    <input
                                        type="number"
                                        className="glass-input"
                                        style={{ width: '100%', boxSizing: 'border-box' }}
                                        placeholder={discountType === 'PERCENT' ? 'e.g. 20' : 'e.g. 200'}
                                        required
                                        min="1"
                                        value={discountValue}
                                        onChange={(e) => setDiscountValue(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label className="form-label-styled" style={{ display: 'block', marginBottom: '8px' }}>Min. Purchase Amount</label>
                                    <input
                                        type="number"
                                        className="glass-input"
                                        style={{ width: '100%', boxSizing: 'border-box' }}
                                        placeholder="e.g. 500"
                                        min="0"
                                        value={minOrderAmount}
                                        onChange={(e) => setMinOrderAmount(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="form-label-styled" style={{ display: 'block', marginBottom: '8px' }}>Max Discount Cap</label>
                                    <input
                                        type="number"
                                        className="glass-input"
                                        style={{ width: '100%', boxSizing: 'border-box' }}
                                        placeholder="None"
                                        min="0"
                                        disabled={discountType === 'FLAT'}
                                        value={maxDiscountAmount}
                                        onChange={(e) => setMaxDiscountAmount(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label className="form-label-styled" style={{ display: 'block', marginBottom: '8px' }}>Usage Limit</label>
                                    <input
                                        type="number"
                                        className="glass-input"
                                        style={{ width: '100%', boxSizing: 'border-box' }}
                                        placeholder="Unlimited"
                                        min="1"
                                        value={usageLimit}
                                        onChange={(e) => setUsageLimit(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="form-label-styled" style={{ display: 'block', marginBottom: '8px' }}>Expiry Date</label>
                                    <input
                                        type="date"
                                        className="glass-input"
                                        style={{ width: '100%', boxSizing: 'border-box' }}
                                        value={expiryDate}
                                        onChange={(e) => setExpiryDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                                <input
                                    type="checkbox"
                                    id="is-active-chk"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    style={{ width: '18px', height: '18px', accentColor: '#10B981', cursor: 'pointer' }}
                                />
                                <label htmlFor="is-active-chk" style={{ fontSize: '0.85rem', color: '#E2E8F0', cursor: 'pointer', userSelect: 'none' }}>
                                    Set this coupon as Active immediately
                                </label>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="btn-premium"
                                    style={{ flex: 1, padding: '14px 0', fontSize: '0.9rem' }}
                                >
                                    <span>{submitting ? 'Creating...' : 'Create Coupon'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    style={{
                                        flex: 1, background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '30px',
                                        color: '#E2E8F0', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem'
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
