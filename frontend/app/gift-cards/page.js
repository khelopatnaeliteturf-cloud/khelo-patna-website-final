'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function GiftCardsPage() {
    const [selectedAmount, setSelectedAmount] = useState(1000);
    const [customAmount, setCustomAmount] = useState('');
    const [recipientName, setRecipientName] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [message, setMessage] = useState('');
    const [purchased, setPurchased] = useState(false);
    const [couponCode, setCouponCode] = useState('');

    const finalAmount = selectedAmount === 'custom' ? (Number(customAmount) || 500) : selectedAmount;

    const handlePurchase = (e) => {
        e.preventDefault();
        const code = `GIFT-KP-${Math.floor(100000 + Math.random() * 900000)}`;
        setCouponCode(code);
        setPurchased(true);
    };

    return (
        <div style={{ minHeight: '100vh', background: '#040609', color: '#e8f0ea', padding: '100px 20px 60px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <div style={{ marginBottom: '20px' }}>
                    <Link href="/" style={{ color: '#10B981', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '18px' }}>arrow_back</span> Back to Home
                    </Link>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>
                        SPECIAL CELEBRATION VOUCHERS
                    </div>
                    <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, background: 'linear-gradient(135deg, #00FF88 0%, #10b981 50%, #34d399 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 16px 0' }}>
                        GIFT A MATCH EXPERIENCE
                    </h1>
                    <p style={{ color: 'rgba(232, 240, 234, 0.7)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto', lineHeight: 1.6 }}>
                        Surprise your friends, teammates, or colleagues with a KheloPatna Elite Turf gift card for birthdays, victories, and celebrations!
                    </p>
                </div>

                {!purchased ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', alignItems: 'start' }}>
                        {/* Preview Card */}
                        <div style={{
                            background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)',
                            borderRadius: '24px',
                            padding: '36px 30px',
                            color: '#ffffff',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: '0 20px 40px rgba(16, 185, 129, 0.25)',
                            border: '1px solid rgba(52, 211, 153, 0.3)'
                        }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase', opacity: 0.9 }}>
                                KHELOPATNA ELITE TURF PASS
                            </div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 900, margin: '20px 0 10px', letterSpacing: '-1px' }}>
                                ₹{finalAmount.toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, opacity: 0.95 }}>
                                For: {recipientName || 'Sports Fan'}
                            </div>
                            {message && (
                                <div style={{ fontSize: '0.85rem', fontStyle: 'italic', marginTop: '12px', background: 'rgba(0,0,0,0.15)', padding: '10px 14px', borderRadius: '10px' }}>
                                    "{message}"
                                </div>
                            )}
                            <div style={{ marginTop: '30px', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', opacity: 0.85 }}>
                                <span>Kumhrar, Sandalpur Road, Patna – 800006</span>
                                <span>Valid for 1 Year</span>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handlePurchase} style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '24px', padding: '30px' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '10px', color: '#10B981' }}>Select Gift Amount</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
                                {[500, 1000, 2500].map(amt => (
                                    <button
                                        type="button"
                                        key={amt}
                                        onClick={() => setSelectedAmount(amt)}
                                        style={{
                                            padding: '12px',
                                            borderRadius: '12px',
                                            border: selectedAmount === amt ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.1)',
                                            background: selectedAmount === amt ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.03)',
                                            color: '#fff',
                                            fontWeight: 800,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ₹{amt}
                                    </button>
                                ))}
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>Recipient Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Enter friend's name"
                                    value={recipientName}
                                    onChange={e => setRecipientName(e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#0a120e', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#fff', fontSize: '0.9rem' }}
                                />
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>Recipient Mobile Number</label>
                                <input
                                    type="tel"
                                    required
                                    placeholder="10-digit mobile number"
                                    value={recipientPhone}
                                    onChange={e => setRecipientPhone(e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#0a120e', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#fff', fontSize: '0.9rem' }}
                                />
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>Personal Celebration Message</label>
                                <textarea
                                    rows="3"
                                    placeholder="Happy Birthday! Have a great match at KheloPatna!"
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#0a120e', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#fff', fontSize: '0.9rem', resize: 'none' }}
                                />
                            </div>

                            <button
                                type="submit"
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #00FF88 0%, #10b981 100%)',
                                    color: '#000',
                                    border: 'none',
                                    fontWeight: 900,
                                    fontSize: '1rem',
                                    cursor: 'pointer',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}
                            >
                                Get Gift Voucher (₹{finalAmount})
                            </button>
                        </form>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', background: 'rgba(16, 185, 129, 0.06)', border: '2px solid #10B981', borderRadius: '24px', padding: '50px 30px', maxWidth: '600px', margin: '0 auto' }}>
                        <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', fontSize: '32px' }}>
                            🎁
                        </div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', marginBottom: '10px' }}>Gift Voucher Created!</h2>
                        <p style={{ color: 'rgba(232, 240, 234, 0.8)', fontSize: '0.95rem', marginBottom: '24px' }}>
                            Voucher has been generated for <strong>{recipientName}</strong> ({recipientPhone}).
                        </p>

                        <div style={{ background: '#040609', border: '1px dashed #10B981', borderRadius: '16px', padding: '20px', marginBottom: '30px' }}>
                            <div style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>YOUR GIFT VOUCHER CODE</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', fontFamily: 'monospace', letterSpacing: '2px', margin: '6px 0' }}>
                                {couponCode}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'rgba(232, 240, 234, 0.6)' }}>Value: ₹{finalAmount} · Valid for any turf slot booking</div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <Link href="/book" style={{ padding: '14px 28px', background: '#10B981', color: '#000', borderRadius: '12px', fontWeight: 800, textDecoration: 'none', fontSize: '0.9rem' }}>
                                Book Slot Now
                            </Link>
                            <button onClick={() => setPurchased(false)} style={{ padding: '14px 28px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                                Create Another Gift
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
