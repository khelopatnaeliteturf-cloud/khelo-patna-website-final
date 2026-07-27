"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function AdmissionContent() {
    const searchParams = useSearchParams();
    const initialSport = searchParams.get('sport') === 'football' ? 'football' : 'cricket';

    const [form, setForm] = useState({
        studentName: '',
        dateOfBirth: '',
        age: '',
        gender: 'Male',
        schoolName: '',
        classGrade: '',
        playingPosition: '',
        sport: initialSport,
        batchTime: '',
        parentName: '',
        parentRelation: 'Father',
        parentPhone: '',
        parentEmail: '',
        address: '',
        emergencyContact: '',
        experience: 'Beginner',
        kitSize: 'M',
        medicalNotes: ''
    });

    const [adminBatches, setAdminBatches] = useState([]);
    const [loadingBatches, setLoadingBatches] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successData, setSuccessData] = useState(null);

    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://app.khelopatna.in';

    // 1. Fetch live batches configured in Admin Panel
    useEffect(() => {
        fetchLiveBatches();
    }, []);

    const fetchLiveBatches = async () => {
        setLoadingBatches(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/public/academy/batches`);
            const data = await res.json();
            if (res.ok && Array.isArray(data)) {
                setAdminBatches(data);
            }
        } catch (err) {
            console.error('Failed to load admin batches:', err);
        } finally {
            setLoadingBatches(false);
        }
    };

    // Filter live admin batches for selected sport
    const availableBatches = adminBatches.filter(b => (b.sport || '').toLowerCase() === form.sport.toLowerCase());

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

    // 2. Real-time automatic age calculation from Date of Birth
    const handleDobChange = (dob) => {
        if (!dob) {
            setForm(prev => ({ ...prev, dateOfBirth: '', age: '' }));
            return;
        }
        const birthDate = new Date(dob);
        const today = new Date();
        let ageYears = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            ageYears--;
        }
        
        const computedAge = ageYears >= 0 ? `${ageYears} Years` : '0 Years';
        setForm(prev => ({ ...prev, dateOfBirth: dob, age: computedAge }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSubmitting(true);

        const selectedBatch = form.batchTime || (availableBatches.length > 0 ? availableBatches[0].timeSlot : '06:00 AM - 08:00 AM');

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

        const payload = {
            ...form,
            batchTime: selectedBatch
        };

        try {
            const res = await fetch(`${BACKEND_URL}/api/academy/admission/initiate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Registration failed');

            // Handle Cashfree Checkout
            if (data.paymentSessionId && window.Cashfree) {
                const cashfree = window.Cashfree({ mode: 'production' });
                cashfree.checkout({
                    paymentSessionId: data.paymentSessionId,
                    redirectTarget: '_self'
                });
            } else {
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
        <div style={{ background: '#040609', minHeight: '100vh', color: '#e8f0ea', paddingBottom: '90px', fontFamily: 'Inter, system-ui, sans-serif' }}>
            {/* Header / Navigation Bar with Official Logo */}
            <header style={{ padding: '16px 40px', borderBottom: '1px solid rgba(16, 185, 129, 0.15)', background: 'rgba(4, 6, 9, 0.92)', backdropFilter: 'blur(25px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
                <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <img src="/logo.png" alt="KheloPatna Elite Turf Logo" style={{ height: '38px', width: 'auto', objectFit: 'contain' }} />
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', fontFamily: 'Montserrat, sans-serif', letterSpacing: '-0.3px' }}>
                        KheloPatna <span style={{ background: 'linear-gradient(135deg, #00FF88, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Academy</span>
                    </span>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <Link href="/academy" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600, transition: 'color 0.2s' }}>Overview</Link>
                    <Link href="/academy/pay-fees" style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#00FF88', padding: '8px 18px', borderRadius: '20px', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 800 }}>Pay Tuition Fees</Link>
                </div>
            </header>

            <main style={{ maxWidth: '880px', margin: '40px auto', padding: '0 20px' }}>
                {/* Hero Title Header */}
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '6px 18px', borderRadius: '20px', marginBottom: '16px' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '16px', color: '#00FF88' }}>workspace_premium</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#00FF88', letterSpacing: '0.6px', textTransform: 'uppercase' }}>OFFICIAL ACADEMY INTAKE</span>
                    </div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'Montserrat, sans-serif', margin: '0 0 12px 0', background: 'linear-gradient(135deg, #FFFFFF 0%, #00FF88 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>
                        Sports Academy Admission Application
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.98rem', maxWidth: '640px', margin: '0 auto', lineHeight: '1.6' }}>
                        Submit mandatory student credentials below. Registration fee is <strong style={{ color: '#00FF88' }}>100% adjustable</strong> against final admission tuition upon coach onboarding.
                    </p>
                </div>

                {/* Adjustable Deposit Highlight Box */}
                <div style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.14), rgba(0, 200, 255, 0.08))', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: '18px', padding: '22px 28px', marginBottom: '36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                            <span className="material-icons-outlined" style={{ color: '#00FF88', fontSize: '28px' }}>account_balance_wallet</span>
                        </div>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>₹1,000 Registration Deposit (100% Adjustable)</h4>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.4' }}>This ₹1,000 deposit is fully deducted from your first month's admission invoice upon coach verification.</p>
                        </div>
                    </div>
                    <div style={{ background: 'rgba(0, 255, 136, 0.16)', border: '1px solid #00FF88', padding: '8px 18px', borderRadius: '12px', fontWeight: 900, color: '#00FF88', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '18px' }}>verified</span> ₹1,000
                    </div>
                </div>

                {errorMsg && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', padding: '14px 20px', borderRadius: '12px', marginBottom: '24px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="material-icons-outlined">error_outline</span> {errorMsg}
                    </div>
                )}

                {successData ? (
                    <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '2px solid #00FF88', borderRadius: '22px', padding: '44px 32px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '68px', color: '#00FF88', marginBottom: '16px' }}>check_circle</span>
                        <h2 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#fff', margin: '0 0 12px 0', fontFamily: 'Montserrat, sans-serif' }}>Admission Application Registered!</h2>
                        <p style={{ color: '#cbd5e1', fontSize: '1rem', maxWidth: '560px', margin: '0 auto 28px auto', lineHeight: '1.6' }}>
                            Thank you! Application <strong style={{ color: '#00FF88' }}>#{successData.orderId}</strong> for <strong style={{ color: '#fff' }}>{successData.studentName}</strong> has been received and verified.
                        </p>
                        <div style={{ background: 'rgba(4, 6, 9, 0.8)', padding: '24px', borderRadius: '16px', textAlign: 'left', maxWidth: '460px', margin: '0 auto 28px auto', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.88rem' }}>
                                <span style={{ color: '#94a3b8' }}>Sport Program:</span>
                                <strong style={{ color: '#fff', textTransform: 'uppercase' }}>{successData.sport} Academy</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.88rem' }}>
                                <span style={{ color: '#94a3b8' }}>Batch Timing:</span>
                                <strong style={{ color: '#fff' }}>{successData.batchTime}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.88rem' }}>
                                <span style={{ color: '#94a3b8' }}>Parent Contact:</span>
                                <strong style={{ color: '#fff' }}>{successData.parentPhone}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                                <span style={{ color: '#94a3b8' }}>Registration Fee:</span>
                                <strong style={{ color: '#00FF88' }}>₹1,000 Paid (Adjustable)</strong>
                            </div>
                        </div>
                        <Link href="/academy" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #00FF88, #10b981)', color: '#040609', fontWeight: 900, padding: '14px 34px', borderRadius: '12px', textDecoration: 'none', fontSize: '0.95rem' }}>
                            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>arrow_back</span> Return to Academy Page
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ background: 'rgba(8, 16, 12, 0.65)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '22px', padding: '40px', backdropFilter: 'blur(20px)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
                        
                        {/* Section 1: Program & Dynamic Admin Batches */}
                        <div style={{ marginBottom: '36px' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#00FF88', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(16, 185, 129, 0.15)', paddingBottom: '10px' }}>
                                <span className="material-icons-outlined">sports</span> 1. Select Training Program & Admin Batch
                            </h3>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Target Sport Academy *</label>
                                    <select name="sport" value={form.sport} onChange={handleChange} required style={{ width: '100%', background: '#08120e', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#fff', padding: '13px 16px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700, outline: 'none' }}>
                                        <option value="cricket">Cricket Academy (U-6 to U-18)</option>
                                        <option value="football">Football Academy (U-6 to U-18)</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Preferred Batch Timing *</label>
                                    <select name="batchTime" value={form.batchTime} onChange={handleChange} required style={{ width: '100%', background: '#08120e', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#fff', padding: '13px 16px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700, outline: 'none' }}>
                                        <option value="">-- Select Active Batch --</option>
                                        {availableBatches.length > 0 ? (
                                            availableBatches.map(b => (
                                                <option key={b._id} value={b.timeSlot || b.name}>
                                                    {b.name} ({b.timeSlot}) {b.coachId?.name ? `• Coach ${b.coachId.name}` : ''}
                                                </option>
                                            ))
                                        ) : (
                                            <>
                                                <option value="06:00 AM - 08:00 AM">Morning Batch (06:00 AM – 08:00 AM)</option>
                                                <option value="03:00 PM - 05:00 PM">Afternoon Batch (03:00 PM – 05:00 PM)</option>
                                                <option value="05:00 PM - 07:00 PM">Evening Batch (05:00 PM – 07:00 PM)</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Student Credentials */}
                        <div style={{ marginBottom: '36px' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#00FF88', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(16, 185, 129, 0.15)', paddingBottom: '10px' }}>
                                <span className="material-icons-outlined">badge</span> 2. Student Credentials
                            </h3>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Student Full Name *</label>
                                    <input type="text" name="studentName" value={form.studentName} onChange={handleChange} placeholder="e.g. Master Aarav Sharma" required style={{ width: '100%', background: '#08120e', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#fff', padding: '13px 16px', borderRadius: '12px', fontSize: '0.95rem' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Date of Birth *</label>
                                    <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={(e) => handleDobChange(e.target.value)} required style={{ width: '100%', background: '#08120e', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#fff', padding: '13px 16px', borderRadius: '12px', fontSize: '0.95rem' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>
                                        Auto-Calculated Age <span className="material-icons-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', color: '#00FF88' }}>lock</span>
                                    </label>
                                    <input type="text" name="age" value={form.age} readOnly placeholder="Select DOB above" style={{ width: '100%', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#00FF88', padding: '13px 16px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 800, cursor: 'not-allowed' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Gender *</label>
                                    <select name="gender" value={form.gender} onChange={handleChange} required style={{ width: '100%', background: '#08120e', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#fff', padding: '13px 16px', borderRadius: '12px', fontSize: '0.95rem' }}>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>School Name</label>
                                    <input type="text" name="schoolName" value={form.schoolName} onChange={handleChange} placeholder="e.g. S.D. Public School, Patna" style={{ width: '100%', background: '#08120e', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#fff', padding: '13px 16px', borderRadius: '12px', fontSize: '0.95rem' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Class / Grade</label>
                                    <input type="text" name="classGrade" value={form.classGrade} onChange={handleChange} placeholder="e.g. Class 7th" style={{ width: '100%', background: '#08120e', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#fff', padding: '13px 16px', borderRadius: '12px', fontSize: '0.95rem' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Playing Role / Position</label>
                                    <input type="text" name="playingPosition" value={form.playingPosition} onChange={handleChange} placeholder="e.g. Batsman / Striker" style={{ width: '100%', background: '#08120e', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#fff', padding: '13px 16px', borderRadius: '12px', fontSize: '0.95rem' }} />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Parent / Guardian Details */}
                        <div style={{ marginBottom: '36px' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#00FF88', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(16, 185, 129, 0.15)', paddingBottom: '10px' }}>
                                <span className="material-icons-outlined">family_restroom</span> 3. Parent / Guardian Contact Details
                            </h3>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Parent / Guardian Name *</label>
                                    <input type="text" name="parentName" value={form.parentName} onChange={handleChange} placeholder="e.g. Rajesh Kumar Sharma" required style={{ width: '100%', background: '#08120e', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#fff', padding: '13px 16px', borderRadius: '12px', fontSize: '0.95rem' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Relation to Student *</label>
                                    <select name="parentRelation" value={form.parentRelation} onChange={handleChange} required style={{ width: '100%', background: '#08120e', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#fff', padding: '13px 16px', borderRadius: '12px', fontSize: '0.95rem' }}>
                                        <option value="Father">Father</option>
                                        <option value="Mother">Mother</option>
                                        <option value="Guardian">Guardian</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Mobile Number (WhatsApp) *</label>
                                    <input type="tel" name="parentPhone" value={form.parentPhone} onChange={handleChange} placeholder="10-digit mobile number" required style={{ width: '100%', background: '#08120e', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#fff', padding: '13px 16px', borderRadius: '12px', fontSize: '0.95rem' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Email Address</label>
                                    <input type="email" name="parentEmail" value={form.parentEmail} onChange={handleChange} placeholder="name@domain.com" style={{ width: '100%', background: '#08120e', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#fff', padding: '13px 16px', borderRadius: '12px', fontSize: '0.95rem' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Emergency Contact Number</label>
                                    <input type="tel" name="emergencyContact" value={form.emergencyContact} onChange={handleChange} placeholder="Alternate mobile" style={{ width: '100%', background: '#08120e', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#fff', padding: '13px 16px', borderRadius: '12px', fontSize: '0.95rem' }} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Kit Size Preference</label>
                                    <select name="kitSize" value={form.kitSize} onChange={handleChange} style={{ width: '100%', background: '#08120e', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#fff', padding: '13px 16px', borderRadius: '12px', fontSize: '0.95rem' }}>
                                        <option value="S">Small (S)</option>
                                        <option value="M">Medium (M)</option>
                                        <option value="L">Large (L)</option>
                                        <option value="XL">Extra Large (XL)</option>
                                    </select>
                                </div>

                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px' }}>Residential Address in Patna *</label>
                                    <textarea name="address" value={form.address} onChange={handleChange} rows="2" placeholder="House / Flat No, Street, Area, Kumhrar / Patna" required style={{ width: '100%', background: '#08120e', border: '1px solid rgba(16, 185, 129, 0.35)', color: '#fff', padding: '13px 16px', borderRadius: '12px', fontSize: '0.95rem' }} />
                                </div>
                            </div>
                        </div>

                        {/* Submit Action CTA */}
                        <div style={{ textAlign: 'center', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                            <button type="submit" disabled={submitting} style={{ background: 'linear-gradient(135deg, #00FF88 0%, #10b981 100%)', color: '#040609', border: 'none', padding: '18px 44px', borderRadius: '14px', fontSize: '1.05rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 10px 28px rgba(0, 255, 136, 0.35)', width: '100%', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                <span className="material-icons-outlined" style={{ fontSize: '22px' }}>payment</span>
                                <span>{submitting ? 'Initiating Registration...' : 'PROCEED TO PAY ₹1,000 REGISTRATION FEE'}</span>
                                <span className="material-icons-outlined" style={{ fontSize: '20px' }}>arrow_forward</span>
                            </button>
                            <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <span className="material-icons-outlined" style={{ fontSize: '16px', color: '#00FF88' }}>shield</span> Secure Cashfree payment. The ₹1,000 registration fee will be 100% adjusted against your tuition invoice.
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
        <Suspense fallback={<div style={{ color: '#fff', padding: '50px', textAlign: 'center', background: '#040609', minHeight: '100vh' }}>Loading Academy Admission Form...</div>}>
            <AdmissionContent />
        </Suspense>
    );
}
