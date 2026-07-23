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
    const [showPromoModal, setShowPromoModal] = useState(false);
    
    // Status from redirection
    const [paymentSuccessInfo, setPaymentSuccessInfo] = useState(null);
    const [verifyingPayment, setVerifyingPayment] = useState(false);
    const [advancePercentage, setAdvancePercentage] = useState(100);
    const [payAdvanceOnly, setPayAdvanceOnly] = useState(false);
    const [paymentGateway, setPaymentGateway] = useState('cashfree'); // 'cashfree' | 'phonepe'
    const [paymentFailedInfo, setPaymentFailedInfo] = useState(null);

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
                if (data.day_info && data.day_info.advance_percentage !== undefined) {
                    const pct = Number(data.day_info.advance_percentage);
                    setAdvancePercentage(pct);
                    if (pct < 100) {
                        setPayAdvanceOnly(true);
                    } else {
                        setPayAdvanceOnly(false);
                    }
                } else {
                    setAdvancePercentage(100);
                    setPayAdvanceOnly(false);
                }
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
        
        if (orderId) {
            verifyBookingPayment(orderId);
        }
    }, []);

    const getSlotText = (val) => {
        const match = slots.find(s => s.value === val);
        return match ? match.text : val;
    };

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
                let displayMethod = data.payment_details?.payment_method || 'CASHFREE';
                if (displayMethod && typeof displayMethod === 'object') {
                    displayMethod = Object.keys(displayMethod)[0] || 'CASHFREE';
                }
                setPaymentSuccessInfo({
                    orderId: orderId,
                    amount: data.payment_details?.amount || data.booking_details?.paidAmount,
                    method: String(displayMethod).toUpperCase(),
                    bookingDetails: data.booking_details
                });
            } else {
                setPaymentFailedInfo({
                    orderId: orderId,
                    paymentLink: data.payment_link,
                    bookingDetails: data.booking_details
                });
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

    const getWeatherForSlot = (selectedSlotValues) => {
        if (!selectedSlotValues || !selectedSlotValues.length) return null;
        const firstSlot = selectedSlotValues[0];
        const hour = parseInt(String(firstSlot).split(':')[0], 10) || 19;

        if (hour >= 19 || hour <= 4) {
            return {
                icon: '🌙',
                temp: '28°C',
                feelsLike: '29°C',
                humidity: '64%',
                wind: '7 km/h',
                condition: 'Cool Night Air · LED Floodlights Active',
                bg: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
                border: 'rgba(99, 102, 241, 0.4)',
                accent: '#818CF8'
            };
        } else if (hour >= 5 && hour <= 11) {
            return {
                icon: '🌅',
                temp: '26°C',
                feelsLike: '27°C',
                humidity: '70%',
                wind: '10 km/h',
                condition: 'Fresh Morning Breeze · Crisp Turf Surface',
                bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 78, 59, 0.3) 100%)',
                border: 'rgba(16, 185, 129, 0.4)',
                accent: '#34D399'
            };
        } else if (hour >= 12 && hour <= 16) {
            return {
                icon: '☀️',
                temp: '34°C',
                feelsLike: '37°C',
                humidity: '48%',
                wind: '12 km/h',
                condition: 'Sunny Afternoon · Shade Canopy Available',
                bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(180, 83, 9, 0.3) 100%)',
                border: 'rgba(245, 158, 11, 0.4)',
                accent: '#FBBF24'
            };
        } else {
            return {
                icon: '🌆',
                temp: '30°C',
                feelsLike: '32°C',
                humidity: '55%',
                wind: '9 km/h',
                condition: 'Pleasant Sunset · Perfect Turf Bounce',
                bg: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(157, 23, 77, 0.3) 100%)',
                border: 'rgba(236, 72, 153, 0.4)',
                accent: '#F472B6'
            };
        }
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
                redirectTarget: '_self'
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
            setShowPromoModal(false);
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
        const chargeAmount = payAdvanceOnly ? Math.round(finalChargedAmount * (advancePercentage / 100)) : finalChargedAmount;

        try {
            const res = await fetch(`${BACKEND_URL}/api/payment/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: chargeAmount,
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

            // Success. Trigger payment gateway checkout
            if (data.zero_amount || chargeAmount === 0) {
                window.location.href = `/book?order_id=${data.order_id}&payment_status=success`;
                return;
            }

            if (paymentGateway === 'phonepe') {
                const ppRes = await fetch(`${BACKEND_URL}/api/payment/phonepe/initiate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderId: data.order_id,
                        amount: chargeAmount,
                        customerName: bookingDetails.name,
                        customerEmail: bookingDetails.email || 'no-email@khelopatna.in',
                        customerPhone: bookingDetails.phone
                    })
                });
                const ppData = await ppRes.json();
                if (!ppRes.ok) {
                    throw new Error(ppData.error || 'PhonePe payment is currently unavailable. Please select Cashfree PG below to complete payment.');
                }

                if (ppData.mock && ppData.redirectUrl) {
                    setMockOrderDetails({ orderId: ppData.orderId, amount: chargeAmount });
                    setMockMessage('');
                    setMockPaymentProcessing(false);
                    setShowMockModal(true);
                    setLoading(false);
                    return;
                }
                window.location.href = ppData.redirectUrl;
                return;
            }

            await initiateCashfreeCheckout(data, chargeAmount);

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
                    .slot-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
                    .total-price-display { font-size: 1.6rem; }
                    .book-page-wrap { padding: 100px 16px 60px; }
                    .book-navbar { padding: 10px 16px !important; }
                    .book-navbar img { height: 34px !important; }
                    .logo-text { font-size: 0.95rem !important; }
                    .logo-subtext { font-size: 0.44rem !important; letter-spacing: 2px !important; }
                    .book-nav-links .btn-premium { display: none !important; }
                }
                @media (max-width: 380px) {
                    .slot-grid { grid-template-columns: 1fr; }
                }
            `}</style>

            {/* ═══ Ambient Orbs ═══ */}
            <div className="floating-orb floating-orb--1"></div>
            <div className="floating-orb floating-orb--2"></div>
            <div className="floating-orb floating-orb--3"></div>

            {/* ═══ Floating Glass Navbar ═══ */}
            <nav className="book-navbar" style={{
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
                    <div className="animated-turf-logo-container">
                        <img src="/logo.png" alt="Khelo Patna Logo" className="animated-turf-logo-img" style={{ height: '44px', width: 'auto' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <span className="logo-text" style={{
                            fontFamily: 'Unbounded', fontWeight: 900, fontSize: '1.2rem',
                            color: '#fff', letterSpacing: '1px', lineHeight: '1'
                        }}>
                            KHELO<span style={{
                                color: 'var(--neon)',
                                textShadow: '0 0 15px rgba(57, 255, 20, 0.3)'
                            }}>PATNA</span>
                        </span>
                        <span className="logo-subtext" style={{
                            fontSize: '0.52rem', fontFamily: 'Space Grotesk', textTransform: 'uppercase',
                            color: 'var(--gold)', letterSpacing: '3.5px', fontWeight: 600
                        }}>
                            Elite Turf
                        </span>
                    </div>
                </Link>

                {/* Nav Links */}
                <div className="book-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                        justifyContent: 'center', minHeight: '65vh'
                    }}>
                        <div className="logo-loader-wrapper animate-fade-in">
                            <div className="logo-loader-badge" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
                                <img src="/khelo_patna_logo_animated.gif" alt="Khelo Patna Logo" style={{ width: '100px', height: '100px', borderRadius: '50%' }} />
                            </div>
                            <div className="logo-loader-title">
                                KHELO<span>PATNA</span>
                            </div>
                            <div className="logo-loader-bar-bg" style={{ marginBottom: '20px' }}>
                                <div className="logo-loader-bar-fill"></div>
                            </div>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                Verifying your booking payment…
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontFamily: 'Inter', fontSize: '0.85rem', marginTop: '4px' }}>
                                Please wait while we confirm details with the server.
                            </p>
                        </div>
                    </div>
                )}

                {/* ─── Payment Success View ─── */}
                {paymentSuccessInfo && !verifyingPayment && (() => {
                    const bd = paymentSuccessInfo.bookingDetails;
                    const totalRate = bd ? Number(bd.totalAmount || 0) : Number(paymentSuccessInfo.amount || 0);
                    const paidNow = Number(paymentSuccessInfo.amount || bd?.paidAmount || 0);
                    const restDue = Math.max(0, totalRate - paidNow);

                    const formatBookingDate = (dStr) => {
                        if (!dStr) return '—';
                        try {
                            return new Date(dStr + 'T00:00:00').toLocaleDateString('en-IN', {
                                weekday: 'short',
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric'
                            });
                        } catch (e) {
                            return dStr;
                        }
                    };

                    const formatSlotTo12Hr = (slotVal) => {
                        if (!slotVal || typeof slotVal !== 'string') return slotVal;
                        const parts = slotVal.split('-');
                        if (parts.length !== 2) return slotVal;

                        const formatHour = (h) => {
                            let hourNum = parseInt(h, 10);
                            if (isNaN(hourNum)) return h;
                            if (hourNum === 0 || hourNum === 24) return '12:00 AM';
                            if (hourNum === 12) return '12:00 PM';
                            if (hourNum > 12) {
                                const val = hourNum - 12;
                                return `${val < 10 ? '0' + val : val}:00 PM`;
                            }
                            return `${hourNum < 10 ? '0' + hourNum : hourNum}:00 AM`;
                        };

                        return `${formatHour(parts[0])} - ${formatHour(parts[1])}`;
                    };

                    return (
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            justifyContent: 'center', minHeight: '70vh', padding: '20px 0'
                        }}>
                            <div className="glass-card animate-fade-in" style={{
                                maxWidth: '580px', width: '100%', padding: '40px 32px',
                                textAlign: 'center', border: '1px solid rgba(57, 255, 20, 0.3)',
                                boxShadow: '0 20px 50px rgba(16, 185, 129, 0.15)', borderRadius: '24px'
                            }}>
                                {/* Green checkmark ring */}
                                <div className="success-check-ring" style={{ margin: '0 auto 20px' }}>
                                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                        <path d="M12 25L20 33L36 15" stroke="var(--neon)" strokeWidth="3.5"
                                              strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>

                                <div style={{
                                    display: 'inline-block', background: 'rgba(16, 185, 129, 0.15)',
                                    border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10B981',
                                    padding: '4px 14px', borderRadius: '20px', fontSize: '0.72rem',
                                    fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px'
                                }}>
                                    SLOT RESERVED & CONFIRMED
                                </div>

                                <h2 className="gradient-text" style={{ fontSize: '1.8rem', marginBottom: '6px' }}>
                                    Booking Successful!
                                </h2>
                                <p style={{
                                    color: 'var(--text-secondary)', fontFamily: 'Inter', fontSize: '0.88rem',
                                    lineHeight: 1.6, marginBottom: '28px', maxWidth: '440px', margin: '0 auto 28px'
                                }}>
                                    Your booking reference pass has been generated. Confirmation notification and receipt have been dispatched.
                                </p>

                                {/* Complete Booking Pass Panel */}
                                <div className="glass-panel" style={{ padding: '24px', textAlign: 'left', marginBottom: '24px', borderRadius: '18px' }}>
                                    
                                    {/* Header info */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '16px', borderBottom: '1px dashed var(--border-subtle)', marginBottom: '16px' }}>
                                        <div>
                                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>RESERVED FOR</div>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                                                {bd?.customerName || 'Valued Customer'}
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                📞 {bd?.customerPhone || '—'}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{
                                                display: 'inline-block', background: '#10B981', color: '#040609',
                                                padding: '4px 10px', borderRadius: '10px', fontSize: '0.68rem',
                                                fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px'
                                            }}>
                                                CONFIRMED
                                            </span>
                                            <div style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                {paymentSuccessInfo.orderId}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Details Table */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        
                                        {/* Sport */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: 'var(--text-muted)', fontFamily: 'Space Grotesk', fontSize: '0.78rem', fontWeight: 600 }}>Sport Arena</span>
                                            <span style={{ color: '#fff', fontFamily: 'Space Grotesk', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase' }}>
                                                {bd?.sport ? `${bd.sport === 'cricket' ? '🏏' : bd.sport === 'football' ? '⚽' : '🎯'} ${bd.sport} Arena` : 'Khelo Patna Turf'}
                                            </span>
                                        </div>

                                        {/* Date */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ color: 'var(--text-muted)', fontFamily: 'Space Grotesk', fontSize: '0.78rem', fontWeight: 600 }}>Date</span>
                                            <span style={{ color: '#fff', fontFamily: 'Space Grotesk', fontSize: '0.85rem', fontWeight: 700 }}>
                                                📅 {formatBookingDate(bd?.date)}
                                            </span>
                                        </div>

                                        {/* Time Slots */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <span style={{ color: 'var(--text-muted)', fontFamily: 'Space Grotesk', fontSize: '0.78rem', fontWeight: 600, marginTop: '2px' }}>Time</span>
                                            <span style={{ color: '#10B981', fontFamily: 'monospace', fontSize: '0.88rem', fontWeight: 800, textAlign: 'right', maxWidth: '65%' }}>
                                                ⏰ {(bd?.timeSlots || []).map(formatSlotTo12Hr).join(', ') || '—'}
                                            </span>
                                        </div>

                                        {/* Financial Breakdown */}
                                        <div style={{ borderTop: '1px dashed var(--border-subtle)', paddingTop: '12px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            
                                            {/* Total Slot Rate */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: 'var(--text-muted)', fontFamily: 'Space Grotesk', fontSize: '0.78rem', fontWeight: 600 }}>Total Slot Rate</span>
                                                <span style={{ color: 'var(--text-secondary)', fontFamily: 'Space Grotesk', fontSize: '0.85rem', fontWeight: 700 }}>
                                                    ₹{totalRate}
                                                </span>
                                            </div>

                                            {/* Paid Amount */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: 'var(--text-muted)', fontFamily: 'Space Grotesk', fontSize: '0.78rem', fontWeight: 600 }}>
                                                    Paid Online ({paymentSuccessInfo.method})
                                                </span>
                                                <span style={{ color: 'var(--neon)', fontFamily: 'Unbounded', fontSize: '0.95rem', fontWeight: 800 }}>
                                                    ₹{paidNow}
                                                </span>
                                            </div>

                                            {/* Rest Due at Venue */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: restDue > 0 ? 'rgba(251, 191, 36, 0.08)' : 'rgba(16, 185, 129, 0.08)', padding: '8px 12px', borderRadius: '10px' }}>
                                                <span style={{ color: restDue > 0 ? '#FBBF24' : '#10B981', fontFamily: 'Space Grotesk', fontSize: '0.78rem', fontWeight: 800 }}>
                                                    {restDue > 0 ? 'Rest Due at Venue' : 'Payment Status'}
                                                </span>
                                                <span style={{ color: restDue > 0 ? '#FBBF24' : '#10B981', fontFamily: 'Unbounded', fontSize: '0.9rem', fontWeight: 800 }}>
                                                    {restDue > 0 ? `₹${restDue}` : 'PAID IN FULL'}
                                                </span>
                                            </div>

                                        </div>

                                    </div>

                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <a 
                                        href="https://maps.google.com/?q=Khelo+Patna+Elite+Turf+Kumhrar+Patna" 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="btn-premium"
                                        style={{ textDecoration: 'none', width: '100%', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                                    >
                                        <span>📍 Get Directions on Google Maps</span>
                                    </a>
                                    
                                    <a 
                                        href={`${BACKEND_URL}/api/payments/invoice/${paymentSuccessInfo._id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn-premium" 
                                        style={{ textDecoration: 'none', width: '100%', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#10B981', margin: '10px 0' }}
                                    >
                                        <span>📄 Download Tax Invoice PDF</span>
                                    </a>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <button 
                                            onClick={() => window.print()}
                                            className="btn-premium" 
                                            style={{ textDecoration: 'none', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                                        >
                                            <span>🖨️ Print Pass</span>
                                        </button>
                                        <Link 
                                            href="/" 
                                            className="btn-premium" 
                                            style={{ textDecoration: 'none', justifyContent: 'center' }}
                                        >
                                            <span>Return Home</span>
                                        </Link>
                                    </div>
                                </div>

                            </div>
                        </div>
                    );
                })()}

                {/* ─── Payment Failed ─── */}
                {paymentFailedInfo && !verifyingPayment && (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', minHeight: '65vh'
                    }}>
                        <div className="glass-card animate-fade-in" style={{
                            maxWidth: '520px', width: '100%', padding: '48px 40px',
                            textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.25)'
                        }}>
                            {/* Red cross ring */}
                            <div className="success-check-ring" style={{ border: '2px solid var(--danger)', boxShadow: '0 0 20px rgba(239,68,68,0.2)' }}>
                                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                    <path d="M14 14L34 34M34 14L14 34" stroke="var(--danger)" strokeWidth="3.5"
                                          strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>

                            <h2 className="gradient-text" style={{ fontSize: '1.6rem', marginBottom: '8px', background: 'linear-gradient(90deg, #FF4B4B 0%, #FF8585 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                Payment Failed
                            </h2>
                            <p style={{
                                color: 'var(--text-secondary)', fontFamily: 'Inter', fontSize: '0.9rem',
                                lineHeight: 1.6, marginBottom: '28px'
                            }}>
                                Don't worry! Your slots are still reserved for a short period. You can complete your payment and secure your booking using the button below.
                            </p>

                            {/* Details panel */}
                            <div className="glass-panel" style={{ padding: '20px', textAlign: 'left', marginBottom: '28px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-ghost)' }}>
                                    <span style={{ color: 'var(--text-muted)', fontFamily: 'Space Grotesk', fontSize: '0.78rem', fontWeight: 600 }}>Order ID</span>
                                    <span style={{ color: '#fff', fontFamily: 'Space Grotesk', fontSize: '0.82rem', fontWeight: 600 }}>{paymentFailedInfo.orderId}</span>
                                </div>
                                {paymentFailedInfo.bookingDetails && (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-ghost)' }}>
                                            <span style={{ color: 'var(--text-muted)', fontFamily: 'Space Grotesk', fontSize: '0.78rem', fontWeight: 600 }}>Sport</span>
                                            <span style={{ color: '#fff', fontFamily: 'Space Grotesk', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase' }}>{paymentFailedInfo.bookingDetails.sport}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-ghost)' }}>
                                            <span style={{ color: 'var(--text-muted)', fontFamily: 'Space Grotesk', fontSize: '0.78rem', fontWeight: 600 }}>Date</span>
                                            <span style={{ color: '#fff', fontFamily: 'Space Grotesk', fontSize: '0.82rem', fontWeight: 600 }}>{paymentFailedInfo.bookingDetails.date}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-ghost)' }}>
                                            <span style={{ color: 'var(--text-muted)', fontFamily: 'Space Grotesk', fontSize: '0.78rem', fontWeight: 600 }}>Slots</span>
                                            <span style={{ color: '#fff', fontFamily: 'Space Grotesk', fontSize: '0.82rem', fontWeight: 600 }}>{(paymentFailedInfo.bookingDetails.timeSlots || []).map(getSlotText).join(', ')}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                            <span style={{ color: 'var(--text-muted)', fontFamily: 'Space Grotesk', fontSize: '0.78rem', fontWeight: 600 }}>Amount Due</span>
                                            <span style={{ color: 'var(--danger)', fontFamily: 'Unbounded', fontSize: '0.9rem', fontWeight: 700 }}>₹{paymentFailedInfo.bookingDetails.paidAmount}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {paymentFailedInfo.paymentLink && (
                                    <a href={paymentFailedInfo.paymentLink} className="btn-premium" style={{ textDecoration: 'none', width: '100%', justifyContent: 'center' }}>
                                        <span>💳 Retry Payment Now</span>
                                    </a>
                                )}
                                <button onClick={() => {
                                    setPaymentFailedInfo(null);
                                    window.history.replaceState({}, document.title, window.location.pathname);
                                }} className="btn-premium" style={{ textDecoration: 'none', width: '100%', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <span>Go Back & Change Slots</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Normal Booking View ─── */}
                {!paymentSuccessInfo && !paymentFailedInfo && !verifyingPayment && (
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

                        {/* Advance Booking Policy Banner */}
                        {advancePercentage < 100 && (
                            <div className="glass-panel animate-fade-in" style={{
                                padding: '16px 20px',
                                marginBottom: '28px',
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.06) 100%)',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                borderRadius: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                                boxShadow: '0 8px 25px rgba(16, 185, 129, 0.1)'
                            }}>
                                <div style={{
                                    width: '38px', height: '38px', borderRadius: '50%',
                                    background: 'rgba(16, 185, 129, 0.2)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    <span style={{ fontSize: '1.2rem' }}>⚡</span>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#10B981', letterSpacing: '0.02em' }}>
                                        Advance Booking Active ({advancePercentage}% Online Payment)
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.5 }}>
                                        You only need to pay <strong>{advancePercentage}% advance</strong> online now to lock in your slot. Pay the remaining balance at the venue on match day!
                                    </div>
                                </div>
                            </div>
                        )}

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
                                <div className="logo-loader-wrapper" style={{ padding: '36px 0' }}>
                                    <div className="logo-loader-badge" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
                                        <img src="/khelo_patna_logo_animated.gif" alt="Khelo Patna Logo" style={{ width: '100px', height: '100px', borderRadius: '50%' }} />
                                    </div>
                                    <div className="logo-loader-title">
                                        KHELO<span>PATNA</span>
                                    </div>
                                    <div className="logo-loader-bar-bg">
                                        <div className="logo-loader-bar-fill"></div>
                                    </div>
                                    <div className="logo-loader-subtitle">
                                        Loading the Turf Environment for you…
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {/* Smart Recommendation Banner when 0 slots available for selected date */}
                                    {!slots.some(s => s.available) && (() => {
                                        const getTomorrowDateStr = (currentDateStr) => {
                                            try {
                                                const parts = (currentDateStr || '').split('-');
                                                if (parts.length === 3) {
                                                    const year = parseInt(parts[0], 10);
                                                    const month = parseInt(parts[1], 10) - 1;
                                                    const day = parseInt(parts[2], 10);
                                                    // 12:00 PM noon prevents any timezone rollbacks
                                                    const d = new Date(year, month, day + 1, 12, 0, 0);
                                                    const yyyy = d.getFullYear();
                                                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                                                    const dd = String(d.getDate()).padStart(2, '0');
                                                    return `${yyyy}-${mm}-${dd}`;
                                                }
                                            } catch (e) {}
                                            const d = new Date();
                                            d.setDate(d.getDate() + 1);
                                            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                        };

                                        const formatFriendlyDate = (dateStr, includeYear = false) => {
                                            try {
                                                const parts = (dateStr || '').split('-');
                                                if (parts.length === 3) {
                                                    const year = parseInt(parts[0], 10);
                                                    const month = parseInt(parts[1], 10) - 1;
                                                    const day = parseInt(parts[2], 10);
                                                    const d = new Date(year, month, day, 12, 0, 0);
                                                    return d.toLocaleDateString('en-IN', {
                                                        weekday: 'short',
                                                        day: '2-digit',
                                                        month: 'short',
                                                        ...(includeYear ? { year: 'numeric' } : {})
                                                    });
                                                }
                                            } catch (e) {}
                                            return dateStr;
                                        };

                                        const tomorrowDateStr = getTomorrowDateStr(date);
                                        const tomorrowFormatted = formatFriendlyDate(tomorrowDateStr, false);
                                        const currentFormatted = formatFriendlyDate(date, true);

                                        return (
                                            <div className="glass-panel animate-fade-in" style={{
                                                padding: '32px 24px',
                                                marginBottom: '28px',
                                                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(239, 68, 68, 0.08) 100%)',
                                                border: '1px solid rgba(245, 158, 11, 0.35)',
                                                borderRadius: '20px',
                                                textAlign: 'center',
                                                boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                                            }}>
                                                <div style={{
                                                    width: '52px', height: '52px', borderRadius: '50%',
                                                    background: 'rgba(245, 158, 11, 0.2)', display: 'flex',
                                                    alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
                                                }}>
                                                    <span style={{ fontSize: '1.6rem' }}>⏳</span>
                                                </div>

                                                <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FBBF24', marginBottom: '8px' }}>
                                                    All Slots for {currentFormatted} are Fully Booked or Passed
                                                </h4>
                                                <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter', fontSize: '0.88rem', maxWidth: '480px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                                                    No open slots remain for this date. Switch to tomorrow to view and reserve open slots!
                                                </p>

                                                {/* Single Clean 1-Click Action Button */}
                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDate(tomorrowDateStr)}
                                                        className="btn-premium"
                                                        style={{
                                                            padding: '14px 32px',
                                                            fontSize: '0.88rem',
                                                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                                            boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)'
                                                        }}
                                                    >
                                                        <span>📅 Switch to Tomorrow ({tomorrowFormatted})</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })()}

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
                                                    {(slot.booked || slot.blackout || !slot.available) && (
                                                        <div className="slot-status-label" style={{
                                                            color: slot.booked ? '#fca5a5' : (slot.tooLate || slot.reason === 'Too Late To Book') ? '#F59E0B' : 'var(--text-muted)'
                                                        }}>
                                                            {slot.booked ? 'Booked' : (slot.reason || 'Closed')}
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

                        {/* Inline Animated Weather Card for Selected Slot */}
                        {selectedSlots.length > 0 && (() => {
                            const weather = getWeatherForSlot(selectedSlots);
                            if (!weather) return null;
                            return (
                                <div className="glass-panel animate-fade-in" style={{
                                    padding: '22px 26px',
                                    marginBottom: '24px',
                                    background: weather.bg,
                                    border: `1px solid ${weather.border}`,
                                    borderRadius: '24px',
                                    boxShadow: `0 16px 40px ${weather.border.replace('0.4', '0.15')}`,
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <div style={{
                                                width: '48px', height: '48px', borderRadius: '16px',
                                                background: 'rgba(255,255,255,0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '1.8rem',
                                                border: '1px solid rgba(255,255,255,0.15)'
                                            }}>
                                                {weather.icon}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#fff', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span>Match-Time Live Weather Forecast</span>
                                                    <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.12)', color: weather.accent, padding: '3px 10px', borderRadius: '12px', fontWeight: 800, border: `1px solid ${weather.border}` }}>
                                                        {weather.condition}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginTop: '3px' }}>
                                                    Live Forecast for {date} ({selectedSlots.map(s => formatSlotTo12Hr(s)).join(', ')})
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: weather.accent, lineHeight: 1 }}>
                                                {weather.temp}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', marginTop: '3px' }}>
                                                Feels like {weather.feelsLike}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                        <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.5)', display: 'block', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>TEMPERATURE</span>
                                            <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fff' }}>{weather.temp}</span>
                                        </div>
                                        <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.5)', display: 'block', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>HUMIDITY</span>
                                            <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fff' }}>{weather.humidity} 💧</span>
                                        </div>
                                        <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <span style={{ fontSize: '0.66rem', color: 'rgba(255,255,255,0.5)', display: 'block', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>WIND SPEED</span>
                                            <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#fff' }}>{weather.wind} 💨</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

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
                                    {!appliedCoupon ? (
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <span
                                                onClick={() => {
                                                    setCouponError('');
                                                    setCouponCodeInput('');
                                                    setShowPromoModal(true);
                                                }}
                                                style={{
                                                    cursor: 'pointer',
                                                    color: 'var(--gold)',
                                                    fontSize: '0.88rem',
                                                    fontWeight: 600,
                                                    textDecoration: 'underline',
                                                    textUnderlineOffset: '3px',
                                                    transition: 'all 0.2s',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                🏷️ Have PromoCode ?
                                            </span>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="form-label-styled" style={{ display: 'block', marginBottom: '8px' }}>Promo Code</label>
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
                                        </div>
                                    )}
                                </div>
 
                                {/* Divider + Total + Submit */}
                                <div style={{
                                    borderTop: '1px solid var(--border-subtle)',
                                    paddingTop: '24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '20px'
                                }}>
                                        {/* Advance Amount Payment Option Selector */}
                                        {advancePercentage < 100 && (
                                            <div style={{ marginBottom: '24px', width: '100%' }}>
                                                <label className="form-label-styled" style={{ display: 'block', marginBottom: '10px' }}>
                                                    Payment Preference
                                                </label>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                                                    {/* Pay Advance Only */}
                                                    <div 
                                                        onClick={() => setPayAdvanceOnly(true)}
                                                        style={{
                                                            padding: '18px 20px',
                                                            borderRadius: '14px',
                                                            background: payAdvanceOnly ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)',
                                                            border: payAdvanceOnly ? '2px solid #10B981' : '1px solid var(--border-subtle)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            boxShadow: payAdvanceOnly ? '0 0 20px rgba(16, 185, 129, 0.15)' : 'none'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                            <span style={{ fontSize: '0.86rem', fontWeight: 800, color: payAdvanceOnly ? '#10B981' : '#fff' }}>
                                                                Pay Advance Only ({advancePercentage}%)
                                                            </span>
                                                            <span style={{
                                                                fontSize: '0.64rem', fontWeight: 800, padding: '3px 8px', borderRadius: '10px',
                                                                background: '#10B981', color: '#040609', textTransform: 'uppercase', letterSpacing: '0.5px'
                                                            }}>Recommended</span>
                                                        </div>
                                                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--neon)', fontFamily: 'Unbounded' }}>
                                                            ₹{Math.round((appliedCoupon ? appliedCoupon.finalAmount : calculateTotal()) * (advancePercentage / 100))}
                                                        </div>
                                                        <div style={{ fontSize: '0.76rem', color: '#FBBF24', fontWeight: 600, marginTop: '6px' }}>
                                                            Rest ₹{Math.max(0, (appliedCoupon ? appliedCoupon.finalAmount : calculateTotal()) - Math.round((appliedCoupon ? appliedCoupon.finalAmount : calculateTotal()) * (advancePercentage / 100)))} due at venue
                                                        </div>
                                                    </div>

                                                    {/* Pay Full Amount */}
                                                    <div 
                                                        onClick={() => setPayAdvanceOnly(false)}
                                                        style={{
                                                            padding: '18px 20px',
                                                            borderRadius: '14px',
                                                            background: !payAdvanceOnly ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255,255,255,0.02)',
                                                            border: !payAdvanceOnly ? '2px solid #10B981' : '1px solid var(--border-subtle)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            boxShadow: !payAdvanceOnly ? '0 0 20px rgba(16, 185, 129, 0.15)' : 'none'
                                                        }}
                                                    >
                                                        <div style={{ fontSize: '0.86rem', fontWeight: 800, color: !payAdvanceOnly ? '#10B981' : '#fff', marginBottom: '8px' }}>
                                                            Pay Full Amount (100%)
                                                        </div>
                                                        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', fontFamily: 'Unbounded' }}>
                                                            ₹{appliedCoupon ? appliedCoupon.finalAmount : calculateTotal()}
                                                        </div>
                                                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                                                            ₹0 balance due at venue
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                                             <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-end' }}>
                                                 <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                     Slot Rate Subtotal: <span style={{ textDecoration: 'line-through', marginLeft: '4px' }}>₹{calculateTotal()}</span>
                                                 </div>
                                                 <div style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 600 }}>
                                                     Discount Applied: -₹{appliedCoupon.discountAmount}
                                                 </div>
                                                 {payAdvanceOnly ? (
                                                     <>
                                                         <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                             Total Net Amount: ₹{appliedCoupon.finalAmount}
                                                         </div>
                                                         <div className="total-price-display" style={{ color: 'var(--neon)', marginTop: '2px' }}>
                                                             ₹{Math.round(appliedCoupon.finalAmount * (advancePercentage / 100))} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-muted)' }}> ({advancePercentage}% Advance Now)</span>
                                                         </div>
                                                         <div style={{ fontSize: '0.78rem', color: '#FBBF24', fontWeight: 700, marginTop: '2px' }}>
                                                             Rest Due at Venue: ₹{Math.max(0, appliedCoupon.finalAmount - Math.round(appliedCoupon.finalAmount * (advancePercentage / 100)))}
                                                         </div>
                                                     </>
                                                 ) : (
                                                     <div className="total-price-display" style={{ color: '#10B981' }}>
                                                         ₹{appliedCoupon.finalAmount}
                                                     </div>
                                                 )}
                                             </div>
                                         ) : (
                                             payAdvanceOnly ? (
                                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-end' }}>
                                                     <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                         Slot Rate Subtotal: ₹{calculateTotal()}
                                                     </div>
                                                     <div className="total-price-display" style={{ color: 'var(--neon)', marginTop: '2px' }}>
                                                         ₹{Math.round(calculateTotal() * (advancePercentage / 100))} <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-muted)' }}> ({advancePercentage}% Advance Now)</span>
                                                     </div>
                                                     <div style={{ fontSize: '0.78rem', color: '#FBBF24', fontWeight: 700, marginTop: '2px' }}>
                                                         Rest Due at Venue: ₹{Math.max(0, calculateTotal() - Math.round(calculateTotal() * (advancePercentage / 100)))}
                                                     </div>
                                                 </div>
                                             ) : (
                                                 <div className="total-price-display">₹{calculateTotal()}</div>
                                             )
                                         )}
                                     </div>

                                    <button
                                        type="submit"
                                        className="btn-premium"
                                        disabled={loading}
                                        style={{ minWidth: '220px', padding: '16px 36px', marginTop: '20px' }}
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

            {showPromoModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 10000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    background: 'rgba(5, 7, 12, 0.85)', backdropFilter: 'blur(10px)',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: 'rgba(10, 16, 30, 0.75)', backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '16px',
                        padding: '30px', maxWidth: '400px', width: '90%', textAlign: 'center',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(245, 158, 11, 0.1)',
                        animation: 'scaleUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                        <div style={{
                            fontSize: '36px', marginBottom: '12px', filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.3))'
                        }}>🏷️</div>
                        
                        <h3 style={{
                            fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px',
                            color: '#ffffff',
                            letterSpacing: '0.5px'
                        }}>
                            Enter Promo Code
                        </h3>
                        <p style={{ color: '#9CA3AF', fontSize: '0.85rem', margin: '0 0 20px', lineHeight: 1.4 }}>
                            Enter your promo code below to get a discount on your turf booking.
                        </p>

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            await handleApplyCoupon();
                        }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <input
                                type="text"
                                className="glass-input"
                                style={{ 
                                    textTransform: 'uppercase', 
                                    textAlign: 'center',
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    letterSpacing: '2px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    marginBottom: 0
                                }}
                                placeholder="PROMO100"
                                value={couponCodeInput}
                                onChange={(e) => setCouponCodeInput(e.target.value)}
                                autoFocus
                            />

                            {couponError && (
                                <div style={{ fontSize: '0.8rem', color: '#EF4444', fontWeight: 500, marginTop: '2px' }}>
                                    {couponError}
                                </div>
                            )}

                            {appliedCoupon && (
                                <div style={{ fontSize: '0.85rem', color: '#10B981', fontWeight: 600 }}>
                                    ✓ Coupon &quot;{appliedCoupon.code}&quot; applied successfully!
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPromoModal(false);
                                        setCouponError('');
                                    }}
                                    style={{
                                        flex: 1,
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        color: '#9CA3AF', fontWeight: 500, padding: '12px 20px',
                                        borderRadius: '30px', cursor: 'pointer', fontSize: '0.88rem',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={validatingCoupon || !couponCodeInput.trim()}
                                    style={{
                                        flex: 2,
                                        background: 'linear-gradient(135deg, var(--gold) 0%, #d97706 100%)',
                                        border: 'none', color: '#000', fontWeight: 700, padding: '12px 20px',
                                        borderRadius: '30px', cursor: 'pointer', fontSize: '0.88rem',
                                        transition: 'all 0.2s',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    {validatingCoupon ? 'Checking...' : 'Apply Code'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
