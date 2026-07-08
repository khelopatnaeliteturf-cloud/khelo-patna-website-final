"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getBackendUrl } from '../../lib/backendUrl';

const BACKEND_URL = getBackendUrl();

export default function PayFeesPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [studentData, setStudentData] = useState(null);
    const [dues, setDues] = useState([]);
    const [selectedFeeIds, setSelectedFeeIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    
    // Status from redirection
    const [paymentSuccessInfo, setPaymentSuccessInfo] = useState(null);
    const [verifyingPayment, setVerifyingPayment] = useState(false);

    // Search dues
    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!searchQuery.trim()) {
            setErrorMessage('Please enter a Student ID or Mobile number.');
            return;
        }

        setLoading(true);
        setErrorMessage('');
        setStudentData(null);
        setDues([]);
        setSelectedFeeIds([]);

        try {
            const res = await fetch(`${BACKEND_URL}/api/academy/dues?search=${encodeURIComponent(searchQuery)}`);
            if (res.status === 404) {
                throw new Error('No student matches this Student ID or registered Mobile number.');
            }
            if (!res.ok) throw new Error('Error retrieving student dues records.');

            const data = await res.json();
            setStudentData(data.student);
            setDues(data.dues || []);
        } catch (err) {
            console.error(err);
            setErrorMessage(err.message || 'Server error searching outstanding dues.');
        } finally {
            setLoading(false);
        }
    };

    // Check query params for payment confirmation on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const orderId = params.get('order_id');
        const status = params.get('payment_status');
        
        if (orderId && status === 'success') {
            verifyFeePayment(orderId);
        }
    }, []);

    const verifyFeePayment = async (orderId) => {
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
            setErrorMessage('Error verifying fee payment.');
        } finally {
            setVerifyingPayment(false);
        }
    };

    const toggleSelectFee = (feeId) => {
        if (selectedFeeIds.includes(feeId)) {
            setSelectedFeeIds(selectedFeeIds.filter(id => id !== feeId));
        } else {
            setSelectedFeeIds([...selectedFeeIds, feeId]);
        }
    };

    const calculateTotal = () => {
        return dues
            .filter(fee => selectedFeeIds.includes(fee._id))
            .reduce((sum, fee) => sum + (fee.amountDue - fee.amountPaid), 0);
    };

    const handleCheckoutSubmit = async (e) => {
        e.preventDefault();
        if (selectedFeeIds.length === 0) {
            setErrorMessage('Please select at least one unpaid month.');
            return;
        }

        setLoading(true);
        setErrorMessage('');

        const totalAmount = calculateTotal();

        try {
            const res = await fetch(`${BACKEND_URL}/api/academy/dues/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: studentData._id,
                    feeIds: selectedFeeIds
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create fee checkout.');

            // Success. Redirect to backend-provided checkout/simulator URL
            if (data.redirect_url) {
                window.location.href = data.redirect_url;
            } else {
                // Fallback in case redirect_url is somehow missing in old versions
                const fallbackUrl = `${BACKEND_URL}/mock-payment.html?order_id=${data.order_id}&amount=${totalAmount}`;
                window.location.href = fallbackUrl;
            }

        } catch (err) {
            console.error(err);
            setErrorMessage(err.message || 'Error creating payment checkout session.');
            setLoading(false);
        }
    };

    return (
        <div style={{ background: 'var(--bg-void)', minHeight: '100vh', overflowX: 'hidden' }}>

            {/* ═══ Scoped Page Styles ═══ */}
            <style jsx global>{`
                .fees-page-wrapper {
                    padding-top: 110px;
                }
                .checkbox-custom {
                    appearance: none;
                    -webkit-appearance: none;
                    width: 22px;
                    height: 22px;
                    border: 2px solid var(--border-default);
                    border-radius: 6px;
                    background: rgba(4, 10, 8, 0.6);
                    cursor: pointer;
                    position: relative;
                    transition: all 0.25s var(--ease-spring);
                    flex-shrink: 0;
                }
                .checkbox-custom:checked {
                    background: linear-gradient(135deg, var(--emerald) 0%, var(--neon) 100%);
                    border-color: var(--neon);
                    box-shadow: 0 0 12px rgba(57, 255, 20, 0.35);
                }
                .checkbox-custom:checked::after {
                    content: '✓';
                    position: absolute;
                    top: 50%; left: 50%;
                    transform: translate(-50%, -50%);
                    color: #020405;
                    font-weight: 800;
                    font-size: 13px;
                }
                .checkbox-custom:hover {
                    border-color: var(--border-hover);
                    box-shadow: 0 0 8px rgba(57, 255, 20, 0.12);
                }
                .fee-row {
                    transition: all 0.3s var(--ease-spring);
                    cursor: pointer;
                }
                .fee-row:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                }
                .icon-ring {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 20px;
                }
                @keyframes pulseGlow {
                    0%, 100% { box-shadow: 0 0 20px rgba(57, 255, 20, 0.2); }
                    50% { box-shadow: 0 0 40px rgba(57, 255, 20, 0.4); }
                }
                @keyframes checkPop {
                    0% { transform: scale(0.3); opacity: 0; }
                    60% { transform: scale(1.15); }
                    100% { transform: scale(1); opacity: 1; }
                }
                .success-check {
                    animation: checkPop 0.6s var(--ease-bounce) forwards;
                }
                @media (max-width: 768px) {
                    .fees-page-wrapper {
                        padding-top: 90px;
                    }
                    .fees-container {
                        padding-left: 16px !important;
                        padding-right: 16px !important;
                    }
                    .fee-row-inner {
                        flex-direction: column !important;
                        align-items: flex-start !important;
                        gap: 10px !important;
                    }
                    .fee-amount-col {
                        text-align: left !important;
                        padding-left: 34px;
                    }
                    .total-bar-inner {
                        flex-direction: column !important;
                        align-items: stretch !important;
                        text-align: center;
                    }
                }
            `}</style>

            {/* ═══ Floating Glass Navbar ═══ */}
            <nav style={{
                position: 'fixed',
                top: '12px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'min(92%, 1200px)',
                background: 'linear-gradient(135deg, rgba(8, 20, 15, 0.45) 0%, rgba(6, 14, 10, 0.5) 100%)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xl)',
                padding: '12px 0',
                zIndex: 1000,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)'
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    maxWidth: '1140px', margin: '0 auto', padding: '0 28px'
                }}>
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

                    {/* Desktop Nav */}
                    <div className="d-none d-md-flex align-items-center" style={{ gap: '6px' }}>
                        <Link href="/" style={{
                            color: 'rgba(255,255,255,0.6)', fontFamily: 'Space Grotesk',
                            fontSize: '0.76rem', fontWeight: 600, textTransform: 'uppercase',
                            letterSpacing: '0.08em', padding: '8px 14px', textDecoration: 'none',
                            transition: 'color 0.3s ease', borderRadius: '8px'
                        }}>
                            Home
                        </Link>
                        <Link href="/academy/pay-fees" style={{
                            color: 'var(--neon)', fontFamily: 'Space Grotesk',
                            fontSize: '0.76rem', fontWeight: 600, textTransform: 'uppercase',
                            letterSpacing: '0.08em', padding: '8px 14px', textDecoration: 'none',
                            borderRadius: '8px', background: 'rgba(57, 255, 20, 0.06)'
                        }}>
                            Pay Fees
                        </Link>
                        <Link href="/book" className="btn-premium" style={{ marginLeft: '12px', padding: '10px 24px', fontSize: '0.72rem' }}>
                            <span><span className="material-icons-outlined" style={{ fontSize: '13px', marginRight: '6px', verticalAlign: 'middle', display: 'inline-block' }}>bolt</span>Book Slot</span>
                        </Link>
                    </div>

                    {/* Mobile Toggle */}
                    <button
                        className="d-md-none"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        aria-label="Toggle Menu"
                        style={{
                            background: 'rgba(57, 255, 20, 0.06)', border: '1px solid var(--border-subtle)',
                            borderRadius: '12px', width: '44px', height: '44px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', cursor: 'pointer', transition: 'all 0.3s ease'
                        }}
                    >
                        <span className="material-icons-outlined" style={{ fontSize: '22px' }}>
                            {sidebarOpen ? 'close' : 'menu'}
                        </span>
                    </button>
                </div>
            </nav>

            {/* ═══ Mobile Menu Overlay ═══ */}
            {sidebarOpen && (
                <div className="d-md-none" style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh',
                    background: 'rgba(3, 5, 8, 0.97)',
                    backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
                    zIndex: 999, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '8px',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    <Link href="/" onClick={() => setSidebarOpen(false)} style={{
                        color: 'rgba(255,255,255,0.7)', fontFamily: 'Unbounded',
                        fontSize: '1.1rem', fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '0.1em', padding: '14px 40px',
                        textDecoration: 'none', borderRadius: '12px'
                    }}>
                        Home
                    </Link>
                    <Link href="/academy/pay-fees" onClick={() => setSidebarOpen(false)} style={{
                        color: 'var(--neon)', fontFamily: 'Unbounded',
                        fontSize: '1.1rem', fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '0.1em', padding: '14px 40px',
                        textDecoration: 'none', borderRadius: '12px'
                    }}>
                        Pay Fees
                    </Link>
                    <Link href="/book" className="btn-premium" onClick={() => setSidebarOpen(false)}
                        style={{ marginTop: '20px', padding: '14px 40px' }}>
                        <span><span className="material-icons-outlined" style={{ fontSize: '14px', marginRight: '6px', verticalAlign: 'middle', display: 'inline-block' }}>bolt</span>Book Slot</span>
                    </Link>
                </div>
            )}

            {/* ═══ Main Content ═══ */}
            <main className="fees-page-wrapper" style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

                {/* ── Verification Loading ── */}
                {verifyingPayment && (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', flexGrow: 1, textAlign: 'center', minHeight: '70vh'
                    }}>
                        <div className="icon-ring" style={{
                            background: 'rgba(57, 255, 20, 0.06)',
                            border: '2px solid var(--border-default)',
                            animation: 'pulseGlow 2s ease-in-out infinite'
                        }}>
                            <div style={{
                                width: '36px', height: '36px',
                                border: '3px solid transparent',
                                borderTop: '3px solid var(--neon)',
                                borderRight: '3px solid var(--emerald)',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite'
                            }} />
                        </div>
                        <h3 style={{
                            fontFamily: 'Unbounded', fontWeight: 700, fontSize: '1.3rem',
                            color: '#fff', marginBottom: '8px'
                        }}>Verifying Payment</h3>
                        <p style={{ color: 'var(--text-muted)', fontFamily: 'Inter', fontSize: '0.9rem' }}>
                            Connecting securely to update training records...
                        </p>
                    </div>
                )}

                {/* ── Payment Success ── */}
                {paymentSuccessInfo && !verifyingPayment && (
                    <div style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', flexGrow: 1, minHeight: '70vh',
                        padding: '40px 20px'
                    }}>
                        <div className="glass-card animate-fade-in" style={{
                            maxWidth: '520px', width: '100%', padding: '48px 40px',
                            textAlign: 'center',
                            border: '1px solid rgba(57, 255, 20, 0.25)',
                            boxShadow: '0 0 60px rgba(57, 255, 20, 0.08), var(--shadow-lg)',
                            position: 'relative', overflow: 'hidden'
                        }}>
                            {/* Decorative glow */}
                            <div style={{
                                position: 'absolute', top: '-60px', left: '50%', transform: 'translateX(-50%)',
                                width: '200px', height: '200px', borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(57,255,20,0.12) 0%, transparent 70%)',
                                pointerEvents: 'none'
                            }} />

                            <div className="icon-ring success-check" style={{
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(57, 255, 20, 0.08) 100%)',
                                border: '2px solid rgba(57, 255, 20, 0.3)',
                                boxShadow: '0 0 30px rgba(57, 255, 20, 0.15)'
                            }}>
                                <span className="material-icons-outlined" style={{ fontSize: '40px', color: 'var(--neon)' }}>check_circle</span>
                            </div>

                            <h2 style={{
                                fontFamily: 'Unbounded', fontWeight: 800, fontSize: '1.5rem',
                                color: '#fff', marginBottom: '10px'
                            }}>
                                Payment <span style={{ color: 'var(--neon)' }}>Successful!</span>
                            </h2>
                            <p style={{ color: 'var(--text-secondary)', fontFamily: 'Inter', fontSize: '0.88rem', lineHeight: '1.6', marginBottom: '24px' }}>
                                Outstanding monthly tuition balance has been cleared. Receipt details sent via WhatsApp.
                            </p>

                            <div style={{
                                background: 'rgba(4, 10, 8, 0.5)',
                                border: '1px solid var(--border-ghost)',
                                borderRadius: 'var(--radius-md)',
                                padding: '20px', textAlign: 'left', marginBottom: '28px'
                            }}>
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: 'var(--text-muted)', fontFamily: 'Space Grotesk', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transaction Ref</span>
                                        <span style={{ color: '#fff', fontFamily: 'Inter', fontWeight: 600, fontSize: '0.88rem' }}>{paymentSuccessInfo.orderId}</span>
                                    </div>
                                    <div style={{ height: '1px', background: 'var(--border-ghost)' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: 'var(--text-muted)', fontFamily: 'Space Grotesk', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount Settled</span>
                                        <span style={{ color: 'var(--neon)', fontFamily: 'Unbounded', fontWeight: 700, fontSize: '1.1rem' }}>₹{paymentSuccessInfo.amount}</span>
                                    </div>
                                    <div style={{ height: '1px', background: 'var(--border-ghost)' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: 'var(--text-muted)', fontFamily: 'Space Grotesk', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Method</span>
                                        <span style={{ color: '#fff', fontFamily: 'Inter', fontWeight: 600, fontSize: '0.88rem' }}>{paymentSuccessInfo.method}</span>
                                    </div>
                                </div>
                            </div>

                            <Link href="/" className="btn-premium" style={{
                                textDecoration: 'none', display: 'block', width: '100%',
                                textAlign: 'center', padding: '14px 24px'
                            }}>
                                ← Return to Homepage
                            </Link>
                        </div>
                    </div>
                )}

                {/* ── Dues Search & Payment Flow ── */}
                {!paymentSuccessInfo && !verifyingPayment && (
                    <div className="fees-container" style={{
                        maxWidth: '880px', width: '100%', margin: '0 auto',
                        padding: '0 24px 60px'
                    }}>
                        {/* Title Section */}
                        <div style={{ marginBottom: '36px' }}>
                            <h1 style={{
                                fontFamily: 'Unbounded', fontWeight: 900, fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
                                marginBottom: '10px', lineHeight: '1.2'
                            }}>
                                💳{' '}
                                <span style={{
                                    background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 40%, var(--neon) 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent'
                                }}>
                                    PARENT FEES PORTAL
                                </span>
                            </h1>
                            <p style={{
                                color: 'var(--text-muted)', fontFamily: 'Inter', fontSize: '0.92rem',
                                maxWidth: '550px', lineHeight: '1.6'
                            }}>
                                Search and pay your ward&apos;s academy tuition fees online. Enter your registered mobile number or Student ID.
                            </p>
                        </div>

                        {/* Error Message */}
                        {errorMessage && (
                            <div className="glass-panel animate-fade-in" style={{
                                padding: '14px 20px', marginBottom: '24px',
                                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex', alignItems: 'center', gap: '12px'
                            }}>
                                <span className="material-icons-outlined" style={{ color: '#f87171', fontSize: '20px' }}>error_outline</span>
                                <span style={{ color: '#fca5a5', fontFamily: 'Inter', fontSize: '0.88rem' }}>{errorMessage}</span>
                            </div>
                        )}

                        {/* Search Card */}
                        <div className="glass-panel" style={{
                            padding: '24px 28px', marginBottom: '28px',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border-subtle)'
                        }}>
                            <form onSubmit={handleSearch} style={{
                                display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'stretch'
                            }}>
                                <div style={{ flexGrow: 1, minWidth: '240px' }}>
                                    <input
                                        type="text"
                                        className="glass-input"
                                        placeholder="Enter Student ID or Mobile Number"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        disabled={loading}
                                        style={{
                                            width: '100%', padding: '14px 18px',
                                            fontFamily: 'Inter', fontSize: '0.92rem',
                                            borderRadius: 'var(--radius-md)'
                                        }}
                                    />
                                </div>
                                <button type="submit" className="btn-premium" disabled={loading} style={{
                                    minWidth: '160px', padding: '14px 24px',
                                    fontFamily: 'Space Grotesk', fontWeight: 700,
                                    fontSize: '0.82rem', letterSpacing: '0.04em'
                                }}>
                                    {loading ? (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                            <span style={{
                                                width: '16px', height: '16px',
                                                border: '2px solid transparent',
                                                borderTop: '2px solid currentColor',
                                                borderRadius: '50%',
                                                animation: 'spin 0.7s linear infinite', display: 'inline-block'
                                            }} />
                                            Searching...
                                        </span>
                                    ) : '🔍 Search Dues'}
                                </button>
                            </form>
                        </div>

                        {/* Student Details Card */}
                        {studentData && (
                            <div className="glass-card animate-fade-in" style={{
                                padding: '28px 28px 28px 24px', marginBottom: '28px',
                                borderLeft: '4px solid var(--emerald)',
                                borderRadius: 'var(--radius-lg)',
                                position: 'relative'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                    <div className="icon-ring" style={{
                                        width: '36px', height: '36px',
                                        background: 'rgba(16, 185, 129, 0.12)',
                                        border: '1px solid rgba(16, 185, 129, 0.25)'
                                    }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '18px', color: 'var(--emerald)' }}>person</span>
                                    </div>
                                    <h3 style={{
                                        fontFamily: 'Unbounded', fontWeight: 700, fontSize: '0.95rem',
                                        color: '#fff', margin: 0, letterSpacing: '0.03em'
                                    }}>
                                        Student Details
                                    </h3>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: '16px'
                                }}>
                                    {[
                                        { label: 'Student Name', value: studentData.name },
                                        { label: 'Parent Name', value: studentData.parentName },
                                        { label: 'Sport Academy', value: studentData.sport, capitalize: true },
                                        { label: 'Class Batch', value: studentData.batchTime },
                                        { label: 'Monthly Fee', value: `₹${studentData.adjustedFee || studentData.monthlyFee}`, highlight: true }
                                    ].map((item, idx) => (
                                        <div key={idx} style={{
                                            background: 'rgba(4, 10, 8, 0.35)',
                                            borderRadius: 'var(--radius-sm)',
                                            padding: '12px 14px',
                                            border: '1px solid var(--border-ghost)'
                                        }}>
                                            <div style={{
                                                fontFamily: 'Space Grotesk', fontSize: '0.68rem', fontWeight: 600,
                                                textTransform: 'uppercase', letterSpacing: '0.08em',
                                                color: 'var(--text-muted)', marginBottom: '4px'
                                            }}>
                                                {item.label}
                                            </div>
                                            <div style={{
                                                fontFamily: 'Inter', fontWeight: 600, fontSize: '0.92rem',
                                                color: item.highlight ? 'var(--neon)' : '#fff',
                                                textTransform: item.capitalize ? 'capitalize' : 'none'
                                            }}>
                                                {item.value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Pending Invoices */}
                        {studentData && (
                            <form onSubmit={handleCheckoutSubmit} className="glass-panel animate-fade-in" style={{
                                padding: '28px', borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--border-subtle)'
                            }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    marginBottom: '24px', paddingBottom: '16px',
                                    borderBottom: '1px solid var(--border-ghost)'
                                }}>
                                    <div className="icon-ring" style={{
                                        width: '36px', height: '36px',
                                        background: 'rgba(245, 197, 66, 0.1)',
                                        border: '1px solid rgba(245, 197, 66, 0.2)'
                                    }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '18px', color: 'var(--gold)' }}>receipt_long</span>
                                    </div>
                                    <h3 style={{
                                        fontFamily: 'Unbounded', fontWeight: 700, fontSize: '0.95rem',
                                        color: '#fff', margin: 0, letterSpacing: '0.03em'
                                    }}>
                                        Pending Invoices
                                    </h3>
                                    {dues.length > 0 && (
                                        <span style={{
                                            marginLeft: 'auto',
                                            fontFamily: 'Space Grotesk', fontSize: '0.72rem', fontWeight: 600,
                                            color: 'var(--gold)', background: 'rgba(245, 197, 66, 0.1)',
                                            padding: '4px 12px', borderRadius: 'var(--radius-pill)',
                                            border: '1px solid rgba(245, 197, 66, 0.2)'
                                        }}>
                                            {dues.length} Due
                                        </span>
                                    )}
                                </div>

                                {dues.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                        <div className="icon-ring" style={{
                                            background: 'rgba(57, 255, 20, 0.06)',
                                            border: '2px solid rgba(57, 255, 20, 0.15)'
                                        }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '36px', color: 'var(--neon)' }}>verified</span>
                                        </div>
                                        <p style={{
                                            fontFamily: 'Unbounded', fontWeight: 700, fontSize: '1rem',
                                            color: '#fff', marginBottom: '6px'
                                        }}>All Balances Cleared!</p>
                                        <p style={{ color: 'var(--text-muted)', fontFamily: 'Inter', fontSize: '0.85rem' }}>
                                            No outstanding dues found for this student record.
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {dues.map((fee) => {
                                                const remainingAmount = fee.amountDue - fee.amountPaid;
                                                const isSelected = selectedFeeIds.includes(fee._id);

                                                return (
                                                    <div
                                                        key={fee._id}
                                                        className="fee-row"
                                                        onClick={() => toggleSelectFee(fee._id)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            background: isSelected
                                                                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(57, 255, 20, 0.04) 100%)'
                                                                : 'rgba(6, 9, 15, 0.5)',
                                                            border: `1px solid ${isSelected ? 'rgba(57, 255, 20, 0.3)' : 'var(--border-ghost)'}`,
                                                            borderRadius: 'var(--radius-md)',
                                                            padding: '16px 18px',
                                                            gap: '15px',
                                                            boxShadow: isSelected ? '0 0 20px rgba(57, 255, 20, 0.06)' : 'none'
                                                        }}
                                                    >
                                                        <div className="fee-row-inner" style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                                                            <input
                                                                type="checkbox"
                                                                className="checkbox-custom"
                                                                checked={isSelected}
                                                                onChange={() => toggleSelectFee(fee._id)}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{
                                                                    fontFamily: 'Space Grotesk', fontWeight: 700,
                                                                    fontSize: '0.95rem', color: '#fff'
                                                                }}>
                                                                    {fee.monthFor}
                                                                </div>
                                                                <div style={{
                                                                    fontSize: '0.78rem', color: 'var(--text-muted)',
                                                                    fontFamily: 'Inter', marginTop: '3px'
                                                                }}>
                                                                    Due: {new Date(fee.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                </div>
                                                                {fee.adjustmentReason && (
                                                                    <div style={{
                                                                        fontSize: '0.72rem', color: 'var(--gold)',
                                                                        fontFamily: 'Inter', marginTop: '4px',
                                                                        display: 'flex', alignItems: 'center', gap: '4px'
                                                                    }}>
                                                                        <span className="material-icons-outlined" style={{ fontSize: '13px' }}>info</span>
                                                                        {fee.adjustmentReason}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="fee-amount-col" style={{ textAlign: 'right', flexShrink: 0 }}>
                                                            <div style={{
                                                                fontFamily: 'Unbounded', fontWeight: 700,
                                                                fontSize: '1.15rem', color: 'var(--neon)',
                                                                textShadow: isSelected ? '0 0 12px rgba(57, 255, 20, 0.3)' : 'none'
                                                            }}>
                                                                ₹{remainingAmount}
                                                            </div>
                                                            {fee.status === 'PARTIAL' && (
                                                                <div style={{
                                                                    fontSize: '0.7rem', color: 'var(--gold)',
                                                                    fontFamily: 'Inter', marginTop: '3px'
                                                                }}>
                                                                    Partial (₹{fee.amountPaid}/₹{fee.amountDue})
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Total Bar */}
                                        <div className="total-bar-inner" style={{
                                            borderTop: '1px solid var(--border-ghost)',
                                            paddingTop: '24px', marginTop: '28px',
                                            display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'center', flexWrap: 'wrap', gap: '20px'
                                        }}>
                                            <div>
                                                <div style={{
                                                    color: 'var(--text-muted)', fontSize: '0.8rem',
                                                    fontFamily: 'Space Grotesk', fontWeight: 600,
                                                    textTransform: 'uppercase', letterSpacing: '0.06em',
                                                    marginBottom: '4px'
                                                }}>
                                                    {selectedFeeIds.length} month{selectedFeeIds.length !== 1 ? 's' : ''} selected
                                                </div>
                                                <div style={{
                                                    fontFamily: 'Unbounded', fontWeight: 800,
                                                    fontSize: 'clamp(1.4rem, 3vw, 1.8rem)',
                                                    color: 'var(--neon)',
                                                    textShadow: selectedFeeIds.length > 0 ? '0 0 20px rgba(57, 255, 20, 0.25)' : 'none'
                                                }}>
                                                    ₹{calculateTotal()}
                                                </div>
                                            </div>

                                            <button
                                                type="submit"
                                                className="btn-premium"
                                                disabled={loading || selectedFeeIds.length === 0}
                                                style={{
                                                    minWidth: '220px', padding: '15px 28px',
                                                    fontFamily: 'Space Grotesk', fontWeight: 700,
                                                    fontSize: '0.84rem', letterSpacing: '0.04em',
                                                    opacity: selectedFeeIds.length === 0 ? 0.4 : 1
                                                }}
                                            >
                                                {loading ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                                        <span style={{
                                                            width: '16px', height: '16px',
                                                            border: '2px solid transparent',
                                                            borderTop: '2px solid currentColor',
                                                            borderRadius: '50%',
                                                            animation: 'spin 0.7s linear infinite', display: 'inline-block'
                                                        }} />
                                                        Processing...
                                                    </span>
                                                ) : '💳 Pay Outstanding Fees'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </form>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
