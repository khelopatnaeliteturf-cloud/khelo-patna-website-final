"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function AdmissionContent() {
    const searchParams = useSearchParams();
    const initialSport = searchParams.get('sport') === 'cricket' ? 'cricket' : searchParams.get('sport') === 'football' ? 'football' : 'cricket';

    const [form, setForm] = useState({
        studentName: '',
        dateOfBirth: '',
        age: '',
        gender: 'Male',
        sport: initialSport,
        batchTime: '06:00 AM - 08:00 AM',
        parentName: '',
        parentPhone: '',
        parentEmail: '',
        address: '',
        emergencyContact: '',
        experience: 'Beginner'
    });

    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successData, setSuccessData] = useState(null);

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://app.khelopatna.in';

    useEffect(() => {
        if (searchParams.get('sport')) {
            const sp = searchParams.get('sport').toLowerCase();
            if (sp === 'cricket' || sp === 'football') {
                setForm(prev => ({ ...prev, sport: sp }));
            }
        }
    }, [searchParams]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleCalculateAge = (dob) => {
        if (!dob) return;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        setForm(prev => ({ ...prev, dateOfBirth: dob, age: age > 0 ? String(age) : '6' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSubmitting(true);

        if (!form.studentName || !form.parentName || !form.parentPhone || !form.dateOfBirth || !form.address) {
            setErrorMsg('Please complete all mandatory credentials (Student Name, DOB, Parent Name, Mobile & Address).');
            setSubmitting(false);
            return;
        }

        if (form.parentPhone.replace(/\D/g, '').length < 10) {
            setErrorMsg('Please enter a valid 10-digit mobile number.');
            setSubmitting(false);
            return;
        }

        try {
            const res = await fetch(`${BACKEND_URL}/api/academy/admission/initiate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Registration failed');

            // Handle Cashfree Payment Gateway Checkout
            if (data.paymentSessionId && window.Cashfree) {
                const cashfree = window.Cashfree({ mode: 'production' });
                cashfree.checkout({
                    paymentSessionId: data.paymentSessionId,
                    redirectTarget: '_self'
                });
            } else {
                // Verification fallback
                verifyPaymentDirect(data.orderId);
            }
        } catch (err) {
            setErrorMsg(err.message || 'Error processing application. Please try again.');
            setSubmitting(false);
        }
    };

    const verifyPaymentDirect = async (orderId) => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/academy/admission/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setSuccessData(data.admission);
            } else {
                setErrorMsg('Payment verification pending. Reference Code: ' + orderId);
            }
        } catch (err) {
            setErrorMsg('Payment complete. Our team will contact you shortly.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ background: '#040609', minHeight: '100vh', color: '#e8f0ea', paddingBottom: '80px' }}>
            {/* Header / Nav */}
            <header style={{ padding: '20px 40px', borderBottom: '1px solid rgba(16, 185, 129, 0.15)', background: 'rgba(8, 16, 12, 0.8)', backdropFilter: 'blur(20px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
                <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', fontFamily: 'Montserrat' }}>
                        KheloPatna <span style={{ background: 'linear-gradient(135deg, #00FF88, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Academy</span>
                    </span>
                </Link>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <Link href="/academy" style={{ color: 'var(--text-muted, #94a3b8)', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>Overview</Link>
                    <Link href="/academy/pay-fees" style={{ color: '#10b981', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 700 }}>Pay Tuition Fees</Link>
                </div>
            </header>

            <main style={{ maxWidth: '840px', margin: '40px auto', padding: '0 20px' }}>
                {/* Hero / Banner */}
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '6px 16px', borderRadius: '20px', marginBottom: '16px' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '16px', color: '#00FF88' }}>workspace_premium</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#00FF88', letterSpacing: '0.5px' }}>OFFICIAL ACADEMY INTAKE FORM</span>
                    </div>
                    <h1 style={{ fontSize: '2.4rem', fontWeight: 900, fontFamily: 'Montserrat', margin: '0 0 12px 0', background: 'linear-gradient(135deg, #FFFFFF 0%, #00FF88 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Sports Academy Admission Application
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '1rem', maxWidth: '640px', margin: '0 auto', lineHeight: '1.6' }}>
                        Fill in all mandatory credentials below to reserve your training seat. Registration deposit is <strong style={{ color: '#00FF88' }}>100% adjustable</strong> against final admission tuition.
                    </p>
                </div>

                {/* Adjustable Deposit Highlight Box */}
                <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(0, 200, 255, 0.08))', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '16px', padding: '20px 24px', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                            <span className="material-icons-outlined" style={{ color: '#00FF88', fontSize: '28px' }}>account_balance_wallet</span>
                        </div>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>₹1,000 Registration Fee (100% Adjustable)</h4>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#cbd5e1' }}>This ₹1,000 deposit is fully deducted from your first month's admission fee upon coach verification.</p>
                        </div>
                    </div>
                    <div style={{ background: 'rgba(0, 255, 136, 0.15)', border: '1px solid #00FF88', padding: '6px 14px', borderRadius: '10px', fontWeight: 900, color: '#00FF88', fontSize: '1.1rem' }}>
                        ₹1,000
                    </div>
                </div>

                {errorMsg && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', padding: '14px 20px', borderRadius: '12px', marginBottom: '24px', fontSize: '0.9rem', fontWeight: 600 }}>
                        ⚠️ {errorMsg}
                    </div>
                )}

                {successData ? (
                    <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '2px solid #00FF88', borderRadius: '20px', padding: '40px', textAlign: 'center' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '64px', color: '#00FF88', marginBottom: '16px' }}>check_circle</span>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', margin: '0 0 12px 0' }}>Admission Application Received!</h2>
                        <p style={{ color: '#cbd5e1', fontSize: '1rem', maxWidth: '540px', margin: '0 auto 24px auto', lineHeight: '1.6' }}>
                            Thank you! Application <strong style={{ color: '#00FF88' }}>#{successData.orderId}</strong> for <strong style={{ color: '#fff' }}>{successData.studentName}</strong> has been registered.
                        </p>
                        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '20px', borderRadius: '12px', textAlign: 'left', maxWidth: '440px', margin: '0 auto 24px auto', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem' }}>
                                <span style={{ color: '#94a3b8' }}>Sport Academy:</span>
                                <strong style={{ color: '#fff', textTransform: 'uppercase' }}>{successData.sport}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem' }}>
                                <span style={{ color: '#94a3b8' }}>Batch Timing:</span>
                                <strong style={{ color: '#fff' }}>{successData.batchTime}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem' }}>
                                <span style={{ color: '#94a3b8' }}>Parent Mobile:</span>
                                <strong style={{ color: '#fff' }}>{successData.parentPhone}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                                <span style={{ color: '#94a3b8' }}>Registration Fee:</span>
                                <strong style={{ color: '#00FF88' }}>₹1,000 Paid (Adjustable)</strong>
                            </div>
                        </div>
                        <Link href="/academy" style={{ display: 'inline-block', background: 'linear-gradient(135deg, #00FF88, #10b981)', color: '#040609', fontWeight: 800, padding: '14px 32px', borderRadius: '12px', textDecoration: 'none' }}>
                            Back to Academy Page
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ background: 'rgba(8, 16, 12, 0.65)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '20px', padding: '36px', backdropFilter: 'blur(20px)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                        
                        {/* Section 1: Sport & Batch Selection */}
                        <div style={{ marginBottom: '32px' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#00FF88', margin: '0 0 18px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="material-icons-outlined">sports</span> 1. Select Training Program & Batch
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Target Sport *</label>
                                    <select name="sport" value={form.sport} onChange={handleChange} required style={{ width: '100%', background: '#091310', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#fff', padding: '12px 14px', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 600 }}>
                                        <option value="cricket">🏏 Cricket Academy (U-6 to U-18)</option>
                                        <option value="football">⚽ Football Academy (U-6 to U-18)</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Preferred Batch Timing *</label>
                                    <select name="batchTime" value={form.batchTime} onChange={handleChange} required style={{ width: '100%', background: '#091310', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#fff', padding: '12px 14px', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 600 }}>
                                        <option value="06:00 AM - 08:00 AM">🌅 Morning Batch (06:00 AM – 08:00 AM)</option>
                                        <option value="03:00 PM - 05:00 PM">☀️ Afternoon Batch (03:00 PM – 05:00 PM)</option>
                                        <option value="05:00 PM - 07:00 PM">🌆 Evening Batch (05:00 PM – 07:00 PM)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Student Information */}
                        <div style={{ marginBottom: '32px' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#00FF88', margin: '0 0 18px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="material-icons-outlined">badge</span> 2. Student Details
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Student Full Name *</label>
                                    <input type="text" name="studentName" value={form.studentName} onChange={handleChange} placeholder="e.g. Master Aarav Sharma" required style={{ width: '100%', background: '#091310', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#fff', padding: '12px 14px', borderRadius: '10px', fontSize: '0.95rem' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Date of Birth *</label>
                                    <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={(e) => handleCalculateAge(e.target.value)} required style={{ width: '100%', background: '#091310', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#fff', padding: '12px 14px', borderRadius: '10px', fontSize: '0.95rem' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Age (Years)</label>
                                    <input type="number" name="age" value={form.age} onChange={handleChange} placeholder="e.g. 12" style={{ width: '100%', background: '#091310', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#fff', padding: '12px 14px', borderRadius: '10px', fontSize: '0.95rem' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Gender *</label>
                                    <select name="gender" value={form.gender} onChange={handleChange} required style={{ width: '100%', background: '#091310', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#fff', padding: '12px 14px', borderRadius: '10px', fontSize: '0.95rem' }}>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Prior Experience</label>
                                    <select name="experience" value={form.experience} onChange={handleChange} style={{ width: '100%', background: '#091310', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#fff', padding: '12px 14px', borderRadius: '10px', fontSize: '0.95rem' }}>
                                        <option value="Beginner">Beginner (First Time)</option>
                                        <option value="Intermediate">Intermediate (School Team / Club)</option>
                                        <option value="Advanced">Advanced (District / State Level)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Parent / Guardian Information */}
                        <div style={{ marginBottom: '32px' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#00FF88', margin: '0 0 18px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="material-icons-outlined">family_restroom</span> 3. Parent / Guardian Contact Details
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Parent / Guardian Name *</label>
                                    <input type="text" name="parentName" value={form.parentName} onChange={handleChange} placeholder="e.g. Rajesh Kumar Sharma" required style={{ width: '100%', background: '#091310', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#fff', padding: '12px 14px', borderRadius: '10px', fontSize: '0.95rem' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Mobile Number (WhatsApp) *</label>
                                    <input type="tel" name="parentPhone" value={form.parentPhone} onChange={handleChange} placeholder="10-digit mobile number" required style={{ width: '100%', background: '#091310', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#fff', padding: '12px 14px', borderRadius: '10px', fontSize: '0.95rem' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Email Address</label>
                                    <input type="email" name="parentEmail" value={form.parentEmail} onChange={handleChange} placeholder="name@domain.com" style={{ width: '100%', background: '#091310', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#fff', padding: '12px 14px', borderRadius: '10px', fontSize: '0.95rem' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Emergency Contact Number</label>
                                    <input type="tel" name="emergencyContact" value={form.emergencyContact} onChange={handleChange} placeholder="Alternate phone" style={{ width: '100%', background: '#091310', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#fff', padding: '12px 14px', borderRadius: '10px', fontSize: '0.95rem' }} />
                                </div>

                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Residential Address in Patna *</label>
                                    <textarea name="address" value={form.address} onChange={handleChange} rows="2" placeholder="House / Flat No, Street, Locality, Patna" required style={{ width: '100%', background: '#091310', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#fff', padding: '12px 14px', borderRadius: '10px', fontSize: '0.95rem' }} />
                                </div>
                            </div>
                        </div>

                        {/* Submit CTA */}
                        <div style={{ textAlign: 'center', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            <button type="submit" disabled={submitting} style={{ background: 'linear-gradient(135deg, #00FF88 0%, #10b981 100%)', color: '#040609', border: 'none', padding: '16px 40px', borderRadius: '14px', fontSize: '1.05rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 24px rgba(0, 255, 136, 0.3)', width: '100%', transition: 'all 0.3s ease' }}>
                                {submitting ? 'Initiating Registration...' : 'PROCEED TO PAY ₹1,000 REGISTRATION FEE →'}
                            </button>
                            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '12px' }}>
                                🔒 Secure Cashfree payment. The ₹1,000 fee will be adjusted against your first month's tuition.
                            </p>
                        </div>
                    </form>
                )}
            </main>
        </div>
    );
}

export default function AdmissionPage() {
    return (
        <Suspense fallback={<div style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Loading Admission Form...</div>}>
            <AdmissionContent />
        </Suspense>
    );
}
