"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getBackendUrl } from '../lib/backendUrl';

const BACKEND_URL = getBackendUrl();

export default function BookPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sport, setSport] = useState('football');
    const [date, setDate] = useState(() => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    });
    
    const [slots, setSlots] = useState([]);
    const [selectedSlots, setSelectedSlots] = useState([]);
    const [paramsLoaded, setParamsLoaded] = useState(false);
    const [participantsCount, setParticipantsCount] = useState(1);
    const [loading, setLoading] = useState(false);
    const [bookingDetails, setBookingDetails] = useState({
        name: '',
        phone: '',
        email: ''
    });
    const [errorMessage, setErrorMessage] = useState('');
    const [showMockModal, setShowMockModal] = useState(false);
    const [mockOrderDetails, setMockOrderDetails] = useState(null);
    const [mockPaymentProcessing, setMockPaymentProcessing] = useState(false);
    const [mockMessage, setMockMessage] = useState('');
    const [couponCodeInput, setCouponCodeInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponError, setCouponError] = useState('');
    const [validatingCoupon, setValidatingCoupon] = useState(false);
    
    // Status from redirection
    const [paymentSuccessInfo, setPaymentSuccessInfo] = useState(null);
    const [verifyingPayment, setVerifyingPayment] = useState(false);

    // Trigger slot fetch on sport/date change and handle URL query params on initial mount
    useEffect(() => {
        // Parse params on first load
        const params = new URLSearchParams(window.location.search);
        const sportParam = params.get('sport');
        const slotsParam = params.get('slots');
        
        let targetSport = sport;
        let initialSelected = [];
        let shouldApplyParams = !paramsLoaded;

        if (shouldApplyParams) {
            if (sportParam) {
                targetSport = sportParam === 'nets' ? 'cricket' : sportParam;
                setSport(targetSport);
            }
            if (slotsParam) {
                initialSelected = slotsParam.split(',');
                setSelectedSlots(initialSelected);
            }
            setParamsLoaded(true);
        }

        const loadSlots = async () => {
            setLoading(true);
            setErrorMessage('');
            try {
                const res = await fetch(`${BACKEND_URL}/api/available-slots?sport=${targetSport}&date=${date}`);
                if (!res.ok) throw new Error('Failed to fetch slots.');
                const data = await res.json();
                setSlots(data.slots || []);
                if (!shouldApplyParams || initialSelected.length === 0) {
                    setSelectedSlots([]); // Reset selection on date/sport change
                }
            } catch (err) {
                console.error(err);
                setErrorMessage('Could not load available slots. Please check if backend is running.');
            } finally {
                setLoading(false);
            }
        };

        loadSlots();
    }, [sport, date]);

    // Check query params for payment confirmation on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const orderId = params.get('order_id');
        const status = params.get('payment_status');
        
        if (orderId && status === 'success') {
            verifyBookingPayment(orderId);
        }
    }, []);

    const verifyBookingPayment = async (orderId) => {
        setVerifyingPayment(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/payment/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId })
            });
            const data = await res.json();
            if (data.success && data.payment_status === 'SUCCESS') {
                setPaymentSuccessInfo({
                    orderId: orderId,
                    amount: data.payment_details?.amount,
                    method: data.payment_details?.payment_method
                });
            } else {
                setErrorMessage('Payment verification failed or payment is pending.');
            }
        } catch (err) {
            console.error(err);
            setErrorMessage('Error verifying payment.');
        } finally {
            setVerifyingPayment(false);
        }
    };

    const handleSlotClick = (slot) => {
        if (!slot.available) return;
        
        if (selectedSlots.includes(slot.value)) {
            setSelectedSlots(selectedSlots.filter(s => s !== slot.value));
        } else {
            setSelectedSlots([...selectedSlots, slot.value]);
        }
    };

    const calculateTotal = () => {
        if (selectedSlots.length === 0) return 0;
        if (sport === 'nets') {
            return selectedSlots.length * 100 * participantsCount;
        }
        if (slots.length === 0) return 0;
        return selectedSlots.reduce((sum, slotValue) => {
            const match = slots.find(s => s.value === slotValue);
            return sum + (match ? match.price : 0);
        }, 0);
    };

    const initiateCashfreeCheckout = async (data, amount) => {
        const isMock = data.redirect_url && data.redirect_url.includes('mock-payment.html');
        
        if (isMock) {
            setMockOrderDetails({ orderId: data.order_id, amount: amount });
            setMockMessage('');
            setMockPaymentProcessing(false);
            setShowMockModal(true);
            setLoading(false);
            return;
        }

        // Live checkout via SDK
        try {
            const loadSDK = () => {
                return new Promise((resolve) => {
                    if (window.Cashfree) {
                        resolve(window.Cashfree);
                        return;
                    }
                    const script = document.createElement('script');
                    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
                    script.async = true;
                    script.onload = () => resolve(window.Cashfree);
                    document.body.appendChild(script);
                });
            };

            const CashfreeClass = await loadSDK();
            
            let envMode = 'sandbox';
            if (data.redirect_url && data.redirect_url.includes('env=production')) {
                envMode = 'production';
            }

            const cashfree = CashfreeClass({ mode: envMode });
            
            setLoading(true);
            cashfree.checkout({
                paymentSessionId: data.payment_session_id,
                redirectTarget: '_modal'
            }).then(() => {
                setLoading(false);
            }).catch((err) => {
                console.error('Checkout error:', err);
                setErrorMessage(err.message || 'Error triggering payment checkout.');
                setLoading(false);
            });
        } catch (e) {
            console.error('Error loading payment SDK:', e);
            setErrorMessage('Unable to load Payment SDK. Please check your network connection.');
            setLoading(false);
        }
    };

    // Reset applied coupon on options changes
    useEffect(() => {
        setAppliedCoupon(null);
        setCouponCodeInput('');
        setCouponError('');
    }, [selectedSlots, participantsCount, sport, date]);

    const handleApplyCoupon = async (e) => {
        if (e) e.preventDefault();
        if (!couponCodeInput.trim()) {
            setCouponError('Please enter a coupon code.');
            return;
        }

        setValidatingCoupon(true);
        setCouponError('');
        try {
            const res = await fetch(`${BACKEND_URL}/api/payment/validate-coupon`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: couponCodeInput,
                    amount: calculateTotal()
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to validate coupon.');
            }

            setAppliedCoupon({
                code: data.code,
                discountAmount: data.discountAmount,
                finalAmount: data.finalAmount
            });
            setCouponError('');
        } catch (err) {
            console.error(err);
            setCouponError(err.message || 'Invalid coupon code.');
            setAppliedCoupon(null);
        } finally {
            setValidatingCoupon(false);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCodeInput('');
        setCouponError('');
    };

    const handleBookingSubmit = async (e) => {
        e.preventDefault();
        
        if (!bookingDetails.name || !bookingDetails.phone) {
            setErrorMessage('Please fill in your name and phone number.');
            return;
        }
        
        setLoading(true);
        setErrorMessage('');

        const totalAmount = calculateTotal();
        const finalChargedAmount = appliedCoupon ? appliedCoupon.finalAmount : totalAmount;

        try {
            const res = await fetch(`${BACKEND_URL}/api/payment/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: finalChargedAmount,
                    customerName: bookingDetails.name,
                    customerEmail: bookingDetails.email || 'no-email@khelopatna.in',
                    customerPhone: bookingDetails.phone,
                    bookingData: {
                        booking_date: date,
                        time_slots: selectedSlots,
                        totalAmount: totalAmount,
                        sport: sport,
                        participantsCount: sport === 'nets' ? participantsCount : 1,
                        couponCode: appliedCoupon ? appliedCoupon.code : null,
                        discountAmount: appliedCoupon ? appliedCoupon.discountAmount : 0
                    }
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create booking.');

            // Success. Trigger pop checkout
            await initiateCashfreeCheckout(data, finalChargedAmount);

        } catch (err) {
            console.error(err);
            setErrorMessage(err.message || 'Error creating payment checkout session.');
            setLoading(false);
        }
    };

    return (
        <div style={{ background: 'var(--bg-void)', minHeight: '100vh', overflowX: 'hidden' }}>

            {/* ═══ Page-specific styles ═══ */}
            <style jsx global>{`
                .book-page-wrap {
                    max-width: 1100px;
                    margin: 0 auto;
                    padding: 120px 24px 80px;
                }
                .sport-pill-bar {
                    display: inline-flex;
                    background: rgba(6, 14, 10, 0.55);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-pill);
                    padding: 5px;
                    gap: 4px;
                }
                .sport-pill {
                    padding: 12px 32px;
                    border-radius: var(--radius-pill);
                    border: none;
                    background: transparent;
                    color: var(--text-secondary);
                    font-family: 'Unbounded', sans-serif;
                    font-size: 0.82rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    cursor: pointer;
                    transition: all 0.35s var(--ease-spring);
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }
                .sport-pill:hover {
                    color: var(--text-primary);
                    background: rgba(57, 255, 20, 0.05);
                }
                .sport-pill.active {
                    background: linear-gradient(135deg, var(--emerald) 0%, var(--emerald-dark) 100%);
                    color: #fff;
                    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.35), inset 0 1px 0 rgba(255,255,255,0.1);
                }
                .legend-row {
                    display: flex;
                    gap: 22px;
                    justify-content: center;
                    flex-wrap: wrap;
                    margin-top: 28px;
                    padding-top: 20px;
                    border-top: 1px solid var(--border-ghost);
                }
                .legend-item {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    font-family: 'Space Grotesk', sans-serif;
                    font-size: 0.72rem;
                    color: var(--text-muted);
                    font-weight: 600;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                }
                .legend-dot {
                    width: 10px;
                    height: 10px;
                    border-radius: 3px;
                    flex-shrink: 0;
                }
                .slot-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
                    gap: 14px;
                }
                .slot-card {
                    border: 1px solid var(--border-ghost);
                    position: relative;
                    overflow: hidden;
                }
                .slot-time {
                    font-family: 'Space Grotesk', sans-serif;
                    font-size: 0.88rem;
                    font-weight: 600;
                    letter-spacing: 0.01em;
                    color: #fff;
                }
                .slot-price {
                    font-family: 'Unbounded', sans-serif;
                    font-size: 0.72rem;
                    font-weight: 600;
                    margin-top: 5px;
                }
                .slot-status-label {
                    font-family: 'Space Grotesk', sans-serif;
                    font-size: 0.62rem;
                    font-weight: 700;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    margin-top: 4px;
                }
                .total-price-display {
                    font-family: 'Unbounded', sans-serif;
                    font-size: 2rem;
                    font-weight: 800;
                    color: var(--neon);
                    text-shadow: 0 0 30px rgba(57, 255, 20, 0.3);
                    line-height: 1;
                }
                .form-label-styled {
                    display: block;
                    font-family: 'Space Grotesk', sans-serif;
                    font-size: 0.72rem;
                    font-weight: 700;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    margin-bottom: 8px;
                }
                .verify-spinner {
                    width: 48px;
                    height: 48px;
                    border: 3px solid rgba(57, 255, 20, 0.12);
                    border-top: 3px solid var(--neon);
                    border-radius: 50%;
                    animation: spin-verify 0.8s linear infinite;
                }
                @keyframes spin-verify {
                    to { transform: rotate(360deg); }
                }
                .success-check-ring {
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    background: rgba(57, 255, 20, 0.08);
                    border: 2px solid rgba(57, 255, 20, 0.25);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 24px;
                    animation: scaleIn 0.6s var(--ease-spring) forwards;
                }
                .controls-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-bottom: 32px;
                }
                @media (max-width: 640px) {
                    .controls-grid { grid-template-columns: 1fr; }
                    .sport-pill { padding: 10px 20px; font-size: 0.74rem; }
                    .slot-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
                    .total-price-display { font-size: 1.6rem; }
                    .book-page-wrap { padding: 100px 16px 60px; }
                }
            `}</style>

            {/* ═══ Ambient Orbs ═══ */}
            <div className="floating-orb floating-orb--1"></div>
            <div className="floating-orb floating-orb--2"></div>
            <div className="floating-orb floating-orb--3"></div>

            {/* ═══ Floating Glass Navbar ═══ */}
            <nav style={{
                position: 'fixed',
                top: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'min(94%, 1200px)',
                background: 'linear-gradient(135deg, rgba(8, 20, 15, 0.5) 0%, rgba(6, 14, 10, 0.55) 100%)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xl)',
                padding: '12px 28px',
                zIndex: 1000,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                {/* Logo */}
                <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="/logo.png" alt="Khelo Patna Logo" style={{ height: '44px', width: 'auto' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <span style={{
                            fontFamily: 'Unbounded', fontWeight: 900, fontSize: '1.2rem',
                            color: '#fff', letterSpacing: '1px', lineHeight: '1'
                        }}>
                            KHELO<span style={{
                                color: 'var(--neon)',
                                textShadow: '0 0 15px rgba(57, 255, 20, 0.3)'
                            }}>PATNA</span>
                        </span>
                        <span style={{
                            fontSize: '0.52rem', fontFamily: 'Space Grotesk', textTransform: 'uppercase',
                            color: 'var(--gold)', letterSpacing: '3.5px', fontWeight: 600
                        }}>
                            Elite Turf
                        </span>
                    </div>
                </Link>

                {/* Nav Links */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Link href="/" className="nav-link-custom" style={{
                        color: 'rgba(255,255,255,0.6)', fontFamily: 'Space Grotesk',
                        fontSize: '0.76rem', fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '0.08em', padding: '8px 14px', textDecoration: 'none'
                    }}>
                        Home
                    </Link>
                    <Link href="/book" className="btn-premium" style={{
                        padding: '10px 24px', fontSize: '0.72rem', textDecoration: 'none'
                    }}>
                        <span><span className="material-icons-outlined" style={{ fontSize: '13px', marginRight: '6px', verticalAlign: 'middle', display: 'inline-block' }}>bolt</span>Book Slot</span>
                    </Link>
                </div>
            </nav>

            {/* ═══ Main Content ═══ */}
            <main className="book-page-wrap">

                {/* ─── Verifying Payment ─── */}
                {verifyingPayment && (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', minHeight: '65vh', gap: '20px'
                    }}>
                        <div className="verify-spinner"></div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            Verifying your booking payment…
                        </h3>
                        <p style={{ color: 'var(--text-muted)', fontFamily: 'Inter', fontSize: '0.88rem' }}>
                            Please wait while we confirm details with the server.
                        </p>
                    </div>
                )}

                {/* ─── Payment Success ─── */}
                {paymentSuccessInfo && !verifyingPayment && (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', minHeight: '65vh'
                    }}>
                        <div className="glass-card animate-fade-in" style={{
                            maxWidth: '520px', width: '100%', padding: '48px 40px',
                            textAlign: 'center', border: '1px solid rgba(57, 255, 20, 0.25)'
                        }}>
                            {/* Green checkmark ring */}
                            <div className="success-check-ring">
                                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                    <path d="M12 25L20 33L36 15" stroke="var(--neon)" strokeWidth="3.5"
                                          strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>

                            <h2 className="gradient-text" style={{ fontSize: '1.6rem', marginBottom: '8px' }}>
                                Booking Successful!
                            </h2>
                            <p style={{
                                color: 'var(--text-secondary)', fontFamily: 'Inter', fontSize: '0.9rem',
                                lineHeight: 1.6, marginBottom: '28px'
                            }}>
                                Your turf slot has been secured. A confirmation message and email receipt are on their way.
                            </p>

                            {/* Details panel */}
                            <div className="glass-panel" style={{ padding: '20px', textAlign: 'left', marginBottom: '28px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-ghost)' }}>
                                    <span style={{ color: 'var(--text-muted)', fontFamily: 'Space Grotesk', fontSize: '0.78rem', fontWeight: 600 }}>Order ID</span>
                                    <span style={{ color: '#fff', fontFamily: 'Space Grotesk', fontSize: '0.82rem', fontWeight: 600 }}>{paymentSuccessInfo.orderId}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-ghost)' }}>
                                    <span style={{ color: 'var(--text-muted)', fontFamily: 'Space Grotesk', fontSize: '0.78rem', fontWeight: 600 }}>Paid Amount</span>
                                    <span style={{ color: 'var(--neon)', fontFamily: 'Unbounded', fontSize: '0.9rem', fontWeight: 700 }}>₹{paymentSuccessInfo.amount}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                    <span style={{ color: 'var(--text-muted)', fontFamily: 'Space Grotesk', fontSize: '0.78rem', fontWeight: 600 }}>Payment Type</span>
                                    <span style={{ color: '#fff', fontFamily: 'Space Grotesk', fontSize: '0.82rem', fontWeight: 600 }}>{paymentSuccessInfo.method}</span>
                                </div>
                            </div>

                            <Link href="/" className="btn-premium" style={{ textDecoration: 'none', width: '100%', justifyContent: 'center' }}>
                                <span>Return to Homepage</span>
                            </Link>
                        </div>
                    </div>
                )}

                {/* ─── Normal Booking View ─── */}
                {!paymentSuccessInfo && !verifyingPayment && (
                    <div>
                        {/* Page Header */}
                        <div style={{ marginBottom: '40px' }} className="animate-fade-in">
                            <div className="section-eyebrow">Online Booking</div>
                            <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', marginBottom: '10px' }}>
                                <span className="material-icons-outlined" style={{ fontSize: '26px', marginRight: '6px', verticalAlign: 'middle' }}>bolt</span>RESERVE{' '}
                                <span className="gradient-text">YOUR SLOT</span>
                            </h1>
                            <p style={{
                                color: 'var(--text-secondary)', fontFamily: 'Inter', fontSize: '1rem',
                                maxWidth: '560px', lineHeight: 1.7
                            }}>
                                Book hourly slots instantly. Select a sport and date below to see availability.
                            </p>
                        </div>

                        {/* Error Alert */}
                        {errorMessage && (
                            <div className="glass-panel animate-fade-in" style={{
                                padding: '16px 20px', marginBottom: '24px',
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                display: 'flex', alignItems: 'center', gap: '12px'
                            }}>
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '50%',
                                    background: 'rgba(239, 68, 68, 0.15)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    <span style={{ color: '#fca5a5', fontSize: '1rem' }}>✕</span>
                                </div>
                                <span style={{ color: '#fca5a5', fontFamily: 'Inter', fontSize: '0.88rem' }}>{errorMessage}</span>
                            </div>
                        )}

                        {/* Controls Row: Sport + Date */}
                        <div className="controls-grid animate-fade-in-delay-1">
                            {/* Sport Selection */}
                            <div className="glass-panel" style={{ padding: '24px' }}>
                                <label className="form-label-styled">1 · Select Sport / Turf</label>
                                <div className="sport-pill-bar">
                                    <button
                                        className={`sport-pill ${sport === 'cricket' ? 'active' : ''}`}
                                        onClick={() => setSport('cricket')}
                                        type="button"
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <span className="material-icons-outlined" style={{ fontSize: '15px' }}>sports_cricket</span> Cricket Turf
                                    </button>
                                    <button
                                        className={`sport-pill ${sport === 'football' ? 'active' : ''}`}
                                        onClick={() => setSport('football')}
                                        type="button"
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <span className="material-icons-outlined" style={{ fontSize: '15px' }}>sports_soccer</span> Football Turf
                                    </button>
                                </div>
                            </div>

                            {/* Date Selection */}
                            <div className="glass-panel" style={{ padding: '24px' }}>
                                <label htmlFor="booking-date" className="form-label-styled">2 · Select Date</label>
                                <input
                                    id="booking-date"
                                    type="date"
                                    className="glass-input"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    onClick={(e) => {
                                        try {
                                            e.target.showPicker();
                                        } catch (err) {}
                                    }}
                                    style={{ cursor: 'pointer' }}
                                />
                            </div>
                        </div>

                        {/* Slot Grid */}
                        <div className="glass-card animate-fade-in-delay-2" style={{ padding: '32px', marginBottom: '32px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                <div className="icon-ring" style={{ width: '40px', height: '40px' }}>
                                    <span style={{ fontSize: '1rem' }}>🕐</span>
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1rem', marginBottom: '2px' }}>Choose Time Slots</h3>
                                    <span style={{ fontFamily: 'Space Grotesk', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>
                                        TAP TO SELECT · MULTIPLE ALLOWED
                                    </span>
                                </div>
                            </div>

                            {loading ? (
                                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                                    <div className="verify-spinner" style={{ margin: '0 auto 16px' }}></div>
                                    <p style={{ color: 'var(--text-muted)', fontFamily: 'Inter', fontSize: '0.88rem' }}>
                                        Checking available slots…
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <div className="slot-grid">
                                        {slots.map((slot) => {
                                            const isSelected = selectedSlots.includes(slot.value);
                                            let cardClass = 'slot-card available';
                                            if (isSelected) cardClass = 'slot-card selected';
                                            else if (slot.booked) cardClass = 'slot-card booked';
                                            else if (slot.blackout) cardClass = 'slot-card blackout';

                                            return (
                                                <button
                                                    key={slot.value}
                                                    className={cardClass}
                                                    disabled={!slot.available}
                                                    onClick={() => handleSlotClick(slot)}
                                                    style={{ color: '#fff' }}
                                                >
                                                    <div className="slot-time">{slot.text}</div>
                                                    <div className="slot-price" style={{
                                                        color: isSelected ? 'var(--gold)' : slot.booked ? '#fca5a5' : slot.blackout ? 'var(--text-muted)' : 'var(--neon)'
                                                    }}>
                                                        {slot.booked ? '' : slot.blackout ? '' : `₹${slot.price}`}
                                                    </div>
                                                    {(slot.booked || slot.blackout) && (
                                                        <div className="slot-status-label" style={{
                                                            color: slot.booked ? '#fca5a5' : 'var(--text-muted)'
                                                        }}>
                                                            {slot.booked ? 'Booked' : 'Closed'}
                                                        </div>
                                                    )}
                                                    {isSelected && (
                                                        <div className="slot-status-label" style={{ color: 'var(--gold)' }}>
                                                            ✓ Selected
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Legend */}
                                    <div className="legend-row">
                                        <div className="legend-item">
                                            <span className="legend-dot" style={{ background: 'rgba(10, 25, 18, 0.25)', border: '1px solid var(--border-ghost)' }}></span>
                                            Available
                                        </div>
                                        <div className="legend-item">
                                            <span className="legend-dot" style={{ background: 'linear-gradient(135deg, var(--emerald), var(--emerald-dark))' }}></span>
                                            Selected
                                        </div>
                                        <div className="legend-item">
                                            <span className="legend-dot" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.2)' }}></span>
                                            Booked
                                        </div>
                                        <div className="legend-item">
                                            <span className="legend-dot" style={{ background: 'rgba(20, 30, 40, 0.4)' }}></span>
                                            Blackout
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Customer Info & Payment */}
                        {selectedSlots.length > 0 && (
                            <form onSubmit={handleBookingSubmit} className="glass-card animate-fade-in" style={{ padding: '32px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                                    <div className="icon-ring" style={{ width: '40px', height: '40px' }}>
                                        <span style={{ fontSize: '1rem' }}>👤</span>
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1rem', marginBottom: '2px' }}>Customer Information</h3>
                                        <span style={{ fontFamily: 'Space Grotesk', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>
                                            REQUIRED FOR BOOKING CONFIRMATION
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '28px' }}>
                                    <div>
                                        <label htmlFor="customer-name" className="form-label-styled">Full Name *</label>
                                        <input
                                            id="customer-name"
                                            type="text"
                                            className="glass-input"
                                            placeholder="Your name"
                                            required
                                            value={bookingDetails.name}
                                            onChange={(e) => setBookingDetails({...bookingDetails, name: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="customer-phone" className="form-label-styled">WhatsApp Number *</label>
                                        <input
                                            id="customer-phone"
                                            type="tel"
                                            className="glass-input"
                                            placeholder="91xxxxxxxxxx"
                                            required
                                            value={bookingDetails.phone}
                                            onChange={(e) => setBookingDetails({...bookingDetails, phone: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="customer-email" className="form-label-styled">Email Address</label>
                                        <input
                                            id="customer-email"
                                            type="email"
                                            className="glass-input"
                                            placeholder="your@email.com"
                                            value={bookingDetails.email}
                                            onChange={(e) => setBookingDetails({...bookingDetails, email: e.target.value})}
                                        />
                                    </div>
                                    {sport === 'nets' && (
                                        <div>
                                            <label htmlFor="participants-count" className="form-label-styled">Number of Persons *</label>
                                            <select
                                                id="participants-count"
                                                className="glass-input"
                                                style={{ width: '100%' }}
                                                value={participantsCount}
                                                onChange={(e) => setParticipantsCount(Number(e.target.value))}
                                            >
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                                    <option key={n} value={n} style={{ background: '#000', color: '#fff' }}>
                                                        {n} {n === 1 ? 'Person' : 'People'} (₹{n * 100}/hr)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
 
                                {/* Coupon Section */}
                                <div style={{
                                    borderTop: '1px dashed var(--border-subtle)',
                                    paddingTop: '20px',
                                    marginBottom: '24px'
                                }}>
                                    <label className="form-label-styled" style={{ display: 'block', marginBottom: '8px' }}>Promo Code</label>
                                    {!appliedCoupon ? (
                                        <div style={{ display: 'flex', gap: '10px', maxWidth: '380px' }}>
                                            <input
                                                type="text"
                                                className="glass-input"
                                                style={{ textTransform: 'uppercase', marginBottom: 0 }}
                                                placeholder="Enter coupon code"
                                                value={couponCodeInput}
                                                onChange={(e) => setCouponCodeInput(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleApplyCoupon}
                                                disabled={validatingCoupon || !couponCodeInput.trim()}
                                                className="btn-premium"
                                                style={{
                                                    padding: '0 20px', fontSize: '0.8rem', minWidth: '100px',
                                                    height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                            >
                                                <span>{validatingCoupon ? 'Checking...' : 'Apply'}</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)',
                                            borderRadius: '8px', padding: '10px 16px', maxWidth: '380px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ color: '#10B981', fontWeight: 700 }}>✓</span>
                                                <span style={{ fontSize: '0.85rem', color: '#E5E7EB', fontWeight: 600 }}>
                                                    Code <strong style={{ color: '#10B981', fontFamily: 'monospace' }}>{appliedCoupon.code}</strong> applied!
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleRemoveCoupon}
                                                style={{
                                                    background: 'transparent', border: 'none', color: '#EF4444',
                                                    fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600
                                                }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                    {couponError && (
                                        <div style={{ fontSize: '0.8rem', color: '#EF4444', marginTop: '6px', fontWeight: 500 }}>
                                            {couponError}
                                        </div>
                                    )}
                                </div>
 
                                {/* Divider + Total + Submit */}
                                <div style={{
                                    borderTop: '1px solid var(--border-subtle)',
                                    paddingTop: '24px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '20px'
                                }}>
                                    <div>
                                        <div style={{
                                            fontFamily: 'Space Grotesk', fontSize: '0.72rem', fontWeight: 700,
                                            color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em',
                                            marginBottom: '4px'
                                        }}>
                                            {sport === 'nets' ? (
                                                <>
                                                    Selected: <span style={{ color: 'var(--text-primary)' }}>{selectedSlots.length} {selectedSlots.length === 1 ? 'hour' : 'hours'}</span> | Rate: ₹100/person/hr | Players: <span style={{ color: 'var(--text-primary)' }}>{participantsCount}</span>
                                                </>
                                            ) : (
                                                <>
                                                    Selected: <span style={{ color: 'var(--text-primary)' }}>{selectedSlots.length} {selectedSlots.length === 1 ? 'hour' : 'hours'}</span>
                                                </>
                                            )}
                                        </div>
                                        {appliedCoupon ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    Subtotal: <span style={{ textDecoration: 'line-through', marginLeft: '4px' }}>₹{calculateTotal()}</span>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 600 }}>
                                                    Discount: -₹{appliedCoupon.discountAmount}
                                                </div>
                                                <div className="total-price-display" style={{ color: '#10B981' }}>
                                                    ₹{appliedCoupon.finalAmount}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="total-price-display">₹{calculateTotal()}</div>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn-premium"
                                        disabled={loading}
                                        style={{ minWidth: '220px', padding: '16px 36px' }}
                                    >
                                        <span>{loading ? 'Processing…' : '💳 Pay & Reserve'}</span>
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </main>

            {showMockModal && mockOrderDetails && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 10000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    background: 'rgba(5, 7, 12, 0.85)', backdropFilter: 'blur(10px)',
                    animation: 'fadeIn 0.25s ease-out'
                }}>
                    <div style={{
                        background: 'rgba(10, 16, 30, 0.75)', backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '16px',
                        padding: '36px', maxWidth: '420px', width: '90%', textAlign: 'center',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(16, 185, 129, 0.15)',
                        animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                        <div style={{
                            fontSize: '44px', marginBottom: '16px', filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.4))'
                        }}>💳</div>
                        
                        <h3 style={{
                            fontSize: '1.4rem', fontWeight: 700, margin: '0 0 6px',
                            background: 'linear-gradient(135deg, #ffffff 30%, #a7f3d0 100%)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            letterSpacing: '0.5px'
                        }}>
                            Cashfree Simulator (Modal)
                        </h3>
                        <p style={{ color: '#9CA3AF', fontSize: '0.88rem', margin: '0 0 24px', lineHeight: 1.5 }}>
                            This simulates the Cashfree secure checkout modal overlay for local development.
                        </p>

                        <div style={{
                            background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.04)',
                            borderRadius: '10px', padding: '16px', textAlign: 'left', marginBottom: '28px',
                            display: 'flex', flexDirection: 'column', gap: '8px'
                        }}>
                            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Payment Details
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span style={{ color: '#9CA3AF' }}>Order ID:</span>
                                <span style={{ color: '#F3F4F6', fontFamily: 'monospace', fontWeight: 600 }}>{mockOrderDetails.orderId}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span style={{ color: '#9CA3AF' }}>Amount:</span>
                                <span style={{ color: '#10B981', fontWeight: 700 }}>₹{mockOrderDetails.amount}</span>
                            </div>
                        </div>

                        {mockMessage && (
                            <div style={{
                                fontSize: '0.85rem', color: mockMessage.includes('failed') || mockMessage.includes('error') ? '#EF4444' : '#10B981',
                                fontWeight: 500, marginBottom: '16px'
                            }}>
                                {mockMessage}
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button
                                onClick={async () => {
                                    setMockPaymentProcessing(true);
                                    setMockMessage('Processing simulated payment...');
                                    try {
                                        const res = await fetch(`${BACKEND_URL}/api/payment/webhook`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                data: {
                                                    order: { order_id: mockOrderDetails.orderId },
                                                    payment: {
                                                        payment_status: 'SUCCESS',
                                                        cf_payment_id: 'MOCK_TX_' + Date.now()
                                                    }
                                                }
                                            })
                                        });

                                        if (res.ok) {
                                            setMockMessage('Payment Success Simulated! Confirming...');
                                            setTimeout(() => {
                                                setShowMockModal(false);
                                                verifyBookingPayment(mockOrderDetails.orderId);
                                            }, 1200);
                                        } else {
                                            setMockMessage('Webhook simulation failed.');
                                            setMockPaymentProcessing(false);
                                        }
                                    } catch (err) {
                                        console.error(err);
                                        setMockMessage('Connection error simulating payment.');
                                        setMockPaymentProcessing(false);
                                    }
                                }}
                                disabled={mockPaymentProcessing}
                                style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    border: 'none', color: '#fff', fontWeight: 600, padding: '14px 20px',
                                    borderRadius: '30px', cursor: 'pointer', fontSize: '0.95rem',
                                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                                    transition: 'all 0.2s', width: '100%'
                                }}
                            >
                                {mockPaymentProcessing ? 'Confirming...' : 'Simulate Success'}
                            </button>

                            <button
                                onClick={() => {
                                    setShowMockModal(false);
                                    setLoading(false);
                                }}
                                disabled={mockPaymentProcessing}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    color: '#9CA3AF', fontWeight: 500, padding: '10px 20px',
                                    borderRadius: '30px', cursor: 'pointer', fontSize: '0.88rem',
                                    transition: 'all 0.2s', width: '100%'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
