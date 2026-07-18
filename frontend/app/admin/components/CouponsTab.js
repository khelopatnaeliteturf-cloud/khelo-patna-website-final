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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px', color: 'var(--text-main)' }}>
                        🎫 Promo & Discount Coupons
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
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
                        borderTopColor: 'var(--success)', borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                    }} />
                </div>
            ) : coupons.length === 0 ? (
                <div style={{
                    background: 'var(--card-bg)', border: '1px dashed var(--border-color)',
                    borderRadius: '16px', padding: '48px', textAlign: 'center', color: 'var(--text-muted)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎫</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>No Coupons Found</div>
                    <div style={{ fontSize: '0.85rem' }}>Create your first promo code to allow checkout discounts.</div>
                </div>
            ) : (
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={thStyle}>Code</th>
                                    <th style={thStyle}>Discount</th>
                                    <th style={thStyle}>Min. Purchase</th>
                                    <th style={thStyle}>Max Cap</th>
                                    <th style={thStyle}>Usage Limit</th>
                                    <th style={thStyle}>Expiry Date</th>
                                    <th style={thStyle}>Status</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {coupons.map((coupon) => {
                                    const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) < new Date();
                                    const isLimitReached = coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit;
                                    const statusLabel = !coupon.isActive ? 'Inactive' : isExpired ? 'Expired' : isLimitReached ? 'Limit Reached' : 'Active';
                                    const statusColor = statusLabel === 'Active' ? 'var(--success)' : statusLabel === 'Expired' ? 'var(--danger)' : 'var(--warning)';

                                    return (
                                        <tr key={coupon._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                                            <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--text-main)', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                                                {coupon.code}
                                            </td>
                                            <td style={{ ...tdStyle, color: 'var(--success)', fontWeight: 600 }}>
                                                {coupon.discountType === 'PERCENT' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                                            </td>
                                            <td style={{ ...tdStyle, color: 'var(--text-main)' }}>
                                                ₹{coupon.minOrderAmount || 0}
                                            </td>
                                            <td style={{ ...tdStyle, color: 'var(--text-main)' }}>
                                                {coupon.maxDiscountAmount ? `₹${coupon.maxDiscountAmount}` : 'None'}
                                            </td>
                                            <td style={{ ...tdStyle, color: 'var(--text-main)' }}>
                                                {coupon.usageCount} / {coupon.usageLimit !== null ? coupon.usageLimit : '∞'}
                                            </td>
                                            <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>
                                                {coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}
                                            </td>
                                            <td style={tdStyle}>
                                                <span style={{
                                                    background: 'var(--success-bg)', color: statusColor, border: `1px solid var(--success-border)`,
                                                    borderRadius: '30px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700,
                                                    textTransform: 'uppercase', letterSpacing: '0.04em'
                                                }}>
                                                    {statusLabel}
                                                </span>
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                <button
                                                    onClick={() => handleDeleteCoupon(coupon._id, coupon.code)}
                                                    style={{
                                                        background: 'transparent', border: 'none', color: 'var(--danger)',
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
                </div>
            )}

            {/* Create Coupon Modal */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 11000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)'
                }}>
                    <div style={{
                        background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                        borderRadius: '16px', padding: '36px', maxWidth: '480px', width: '90%',
                        boxShadow: 'var(--shadow-lg)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                                Create New Promo Code
                            </h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={labelStyle}>Promo Code *</label>
                                <input
                                    type="text"
                                    style={{ ...inputStyle, textTransform: 'uppercase' }}
                                    placeholder="e.g. KHELO20"
                                    required
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={labelStyle}>Discount Type *</label>
                                    <select
                                        style={inputStyle}
                                        value={discountType}
                                        onChange={(e) => setDiscountType(e.target.value)}
                                    >
                                        <option value="PERCENT">Percent (%)</option>
                                        <option value="FLAT">Flat (₹)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Discount Value *</label>
                                    <input
                                        type="number"
                                        style={inputStyle}
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
                                    <label style={labelStyle}>Min. Purchase Amount</label>
                                    <input
                                        type="number"
                                        style={inputStyle}
                                        placeholder="e.g. 500"
                                        min="0"
                                        value={minOrderAmount}
                                        onChange={(e) => setMinOrderAmount(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Max Discount Cap</label>
                                    <input
                                        type="number"
                                        style={inputStyle}
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
                                    <label style={labelStyle}>Usage Limit</label>
                                    <input
                                        type="number"
                                        style={inputStyle}
                                        placeholder="Unlimited"
                                        min="1"
                                        value={usageLimit}
                                        onChange={(e) => setUsageLimit(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Expiry Date</label>
                                    <input
                                        type="date"
                                        style={inputStyle}
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
                                    style={{ width: '18px', height: '18px', accentColor: 'var(--success)', cursor: 'pointer' }}
                                />
                                <label htmlFor="is-active-chk" style={{ fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer', userSelect: 'none' }}>
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
                                        flex: 1, background: 'var(--card-bg)',
                                        border: '1px solid var(--border-color)', borderRadius: '30px',
                                        color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem'
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

/* ─── Shared inline style objects ─── */

const thStyle = {
    padding: '16px 20px',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
};

const tdStyle = {
    padding: '16px 20px'
};

const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
};

const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid var(--border-color)',
    background: 'var(--input-bg)',
    color: 'var(--text-main)',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 0.2s'
};
