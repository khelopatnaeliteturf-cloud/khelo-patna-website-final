"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { getBackendUrl } from '../lib/backendUrl';

export default function PublicEnquiryPage() {
    const BACKEND_URL = getBackendUrl();

    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [form, setForm] = useState({
        studentName: '',
        dateOfBirth: '',
        age: '',
        gender: '',
        schoolName: '',
        classGrade: '',
        fatherName: '',
        mobileNumber: '',
        interestedIn: '',
        previousExperience: '',
        experienceDetails: '',
        expectedJoiningMonth: '',
        heardAbout: '',
        heardAboutOther: '',
        questions: ''
    });

    const calculateAge = (dobString) => {
        if (!dobString) return '';
        const today = new Date();
        const birthDate = new Date(dobString);
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            calculatedAge--;
        }
        return calculatedAge >= 0 ? calculatedAge : 0;
    };

    const handleInputChange = (field, val) => {
        setForm(prev => {
            const updated = { ...prev, [field]: val };
            if (field === 'dateOfBirth') {
                updated.age = calculateAge(val);
            }
            return updated;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            const res = await fetch(`${BACKEND_URL}/api/public/enquiries`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            const data = await res.json();
            if (res.ok) {
                setSubmitted(true);
            } else {
                setErrorMsg(data.error || 'Failed to submit enquiry. Please try again.');
            }
        } catch (err) {
            setErrorMsg('Network error. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ background: 'var(--bg-void, #030508)', minHeight: '100vh', overflowX: 'hidden', paddingBottom: '60px', color: '#fff' }}>
            
            {/* Header / Brand Bar */}
            <div style={{
                background: 'rgba(8, 20, 15, 0.45)',
                backdropFilter: 'blur(24px) saturate(180%)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                padding: '16px 0'
            }}>
                <div className="container d-flex align-items-center justify-content-between">
                    <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src="/logo.png" alt="Khelo Patna Logo" style={{ height: '40px', width: 'auto' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            <span style={{
                                fontFamily: 'Unbounded', fontWeight: 900, fontSize: '1.1rem',
                                color: '#fff', letterSpacing: '1px', lineHeight: '1'
                            }}>
                                KHELO<span style={{ color: '#10b981' }}>PATNA</span>
                            </span>
                            <span style={{
                                fontSize: '0.5rem', fontFamily: 'Space Grotesk', textTransform: 'uppercase',
                                color: '#f59e0b', letterSpacing: '3px', fontWeight: 600
                            }}>
                                Elite Turf
                            </span>
                        </div>
                    </Link>
                    <Link href="/" className="nav-link-custom" style={{ textDecoration: 'none', color: '#fff', fontFamily: 'Space Grotesk', fontSize: '0.85rem', fontWeight: 600 }}>
                        &larr; Back to Home
                    </Link>
                </div>
            </div>

            <div className="container mt-5" style={{ maxWidth: '750px' }}>
                {submitted ? (
                    <div className="glass-card p-5 text-center animate-fade-in" style={{ borderLeft: '4px solid #10b981' }}>
                        <span className="material-icons-outlined text-success" style={{ fontSize: '4.5rem', color: '#10b981' }}>check_circle</span>
                        <h2 className="mt-3" style={{ fontFamily: 'Unbounded', fontWeight: 700 }}>Thank You!</h2>
                        <p className="text-muted mt-2" style={{ fontSize: '1rem' }}>
                            Your admission enquiry has been submitted successfully. Our counsellor will get in touch with you shortly.
                        </p>
                        <Link href="/" className="btn-premium mt-4" style={{ display: 'inline-block', padding: '12px 30px', textDecoration: 'none' }}>
                            Go Back Home
                        </Link>
                    </div>
                ) : (
                    <div className="glass-card p-4 p-md-5 animate-fade-in" style={{ borderLeft: '4px solid #10b981', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <div className="mb-4">
                            <span className="section-eyebrow" style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 'bold', letterSpacing: '1.5px', textTransform: 'uppercase' }}>ACADEMY ADMISSION</span>
                            <h1 style={{ fontFamily: "'Unbounded', sans-serif", fontSize: '1.8rem', fontWeight: 800, margin: '5px 0 0 0', color: '#fff' }}>Admission Enquiry Form</h1>
                            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>Interested in joining our cricket or football academy? Submit your details below.</p>
                        </div>

                        {errorMsg && (
                            <div className="p-3 mb-4 rounded-3" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '0.85rem' }}>
                                ⚠️ {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {/* SECTION 1: STUDENT INFO */}
                            <h3 className="mb-3" style={{ fontSize: '1rem', color: '#10b981', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                                👤 Student Information
                            </h3>
                            <div className="row g-3 mb-4">
                                <div className="col-md-6">
                                    <label className="form-label text-muted" style={{ fontSize: '0.85rem' }}>Student Name *</label>
                                    <input 
                                        type="text" 
                                        className="glass-input w-100" 
                                        value={form.studentName} 
                                        onChange={(e) => handleInputChange('studentName', e.target.value)}
                                        required 
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-muted" style={{ fontSize: '0.85rem' }}>Date of Birth</label>
                                    <input 
                                        type="date" 
                                        className="glass-input w-100" 
                                        value={form.dateOfBirth} 
                                        onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-muted" style={{ fontSize: '0.85rem' }}>Age</label>
                                    <input 
                                        type="number" 
                                        className="glass-input w-100" 
                                        value={form.age} 
                                        disabled
                                        placeholder="Auto-calculated"
                                        style={{ background: 'rgba(0,0,0,0.2)', cursor: 'not-allowed' }}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-muted" style={{ fontSize: '0.85rem' }}>Gender</label>
                                    <select 
                                        className="glass-input w-100" 
                                        value={form.gender} 
                                        onChange={(e) => handleInputChange('gender', e.target.value)}
                                    >
                                        <option value="">-- Select Gender --</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-muted" style={{ fontSize: '0.85rem' }}>School Name</label>
                                    <input 
                                        type="text" 
                                        className="glass-input w-100" 
                                        value={form.schoolName} 
                                        onChange={(e) => handleInputChange('schoolName', e.target.value)}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-muted" style={{ fontSize: '0.85rem' }}>Class / Grade</label>
                                    <input 
                                        type="text" 
                                        className="glass-input w-100" 
                                        value={form.classGrade} 
                                        onChange={(e) => handleInputChange('classGrade', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* SECTION 2: PARENT INFO */}
                            <h3 className="mb-3" style={{ fontSize: '1rem', color: '#10b981', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                                👨‍👩‍👦 Parent / Guardian Information
                            </h3>
                            <div className="row g-3 mb-4">
                                <div className="col-md-6">
                                    <label className="form-label text-muted" style={{ fontSize: '0.85rem' }}>Father's Name</label>
                                    <input 
                                        type="text" 
                                        className="glass-input w-100" 
                                        value={form.fatherName} 
                                        onChange={(e) => handleInputChange('fatherName', e.target.value)}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-muted" style={{ fontSize: '0.85rem' }}>Mobile Number *</label>
                                    <input 
                                        type="tel" 
                                        className="glass-input w-100" 
                                        value={form.mobileNumber} 
                                        onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                                        required 
                                    />
                                </div>
                            </div>

                            {/* SECTION 3: ACADEMY INTEREST */}
                            <h3 className="mb-3" style={{ fontSize: '1rem', color: '#10b981', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px', color: '#10b981', display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }}><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v3c0 2.44 1.72 4.48 4 4.9C7.84 15.39 9.8 16 12 16s4.16-.61 5-1.1c2.28-.42 4-2.46 4-4.9V7c0-1.1-.9-2-2-2zM5 10V7h2v3H5zm14 0h-2V7h2v3zm-7 8c-1.66 0-3 1.34-3 3h6c0-1.66-1.34-3-3-3z"/></svg> Academy Interest
                            </h3>
                            <div className="row g-3 mb-4">
                                <div className="col-md-6">
                                    <label className="form-label text-muted" style={{ fontSize: '0.85rem' }}>Interested In</label>
                                    <select 
                                        className="glass-input w-100" 
                                        value={form.interestedIn} 
                                        onChange={(e) => handleInputChange('interestedIn', e.target.value)}
                                    >
                                        <option value="">-- Choose Academy --</option>
                                        <option value="cricket">Cricket Academy</option>
                                        <option value="football">Football Academy</option>
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-muted" style={{ fontSize: '0.85rem' }}>Previous Sports Experience</label>
                                    <select 
                                        className="glass-input w-100" 
                                        value={form.previousExperience} 
                                        onChange={(e) => handleInputChange('previousExperience', e.target.value)}
                                    >
                                        <option value="">-- Select Option --</option>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                                <div className="col-12">
                                    <label className="form-label text-muted" style={{ fontSize: '0.85rem' }}>Previous Experience Details (if Yes)</label>
                                    <input 
                                        type="text" 
                                        className="glass-input w-100" 
                                        value={form.experienceDetails} 
                                        onChange={(e) => handleInputChange('experienceDetails', e.target.value)}
                                        disabled={form.previousExperience !== 'Yes'}
                                        style={form.previousExperience !== 'Yes' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                    />
                                </div>
                            </div>

                            {/* SECTION 4: PREFERRED JOINING DETAILS */}
                            <h3 className="mb-3" style={{ fontSize: '1rem', color: '#10b981', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px', color: '#10b981', display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }}><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm-5-7h-5v5h5v-5z"/></svg> Joining Details
                            </h3>
                            <div className="mb-4">
                                <label className="form-label text-muted" style={{ fontSize: '0.85rem' }}>Expected Joining Month</label>
                                <input 
                                    type="text" 
                                    className="glass-input w-100" 
                                    placeholder="e.g. July 2026"
                                    value={form.expectedJoiningMonth} 
                                    onChange={(e) => handleInputChange('expectedJoiningMonth', e.target.value)}
                                />
                            </div>

                            {/* SECTION 5: ADDITIONAL INFO */}
                            <h3 className="mb-3" style={{ fontSize: '1rem', color: '#10b981', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
                                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '16px', height: '16px', color: '#10b981', display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }}><path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"/></svg> Additional Information
                            </h3>
                            <div className="row g-3 mb-4">
                                <div className="col-md-6">
                                    <label className="form-label text-muted" style={{ fontSize: '0.85rem' }}>How did you hear about us?</label>
                                    <select 
                                        className="glass-input w-100" 
                                        value={form.heardAbout} 
                                        onChange={(e) => handleInputChange('heardAbout', e.target.value)}
                                    >
                                        <option value="">-- Choose Option --</option>
                                        <option value="Social Media">Social Media</option>
                                        <option value="Friend/Family">Friend/Family</option>
                                        <option value="Website">Website</option>
                                        <option value="School">School</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-muted" style={{ fontSize: '0.85rem' }}>Specify if Other</label>
                                    <input 
                                        type="text" 
                                        className="glass-input w-100" 
                                        value={form.heardAboutOther} 
                                        onChange={(e) => handleInputChange('heardAboutOther', e.target.value)}
                                        disabled={form.heardAbout !== 'Other'}
                                        style={form.heardAbout !== 'Other' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                                    />
                                </div>
                                <div className="col-12">
                                    <label className="form-label text-muted" style={{ fontSize: '0.85rem' }}>Any Questions or Requirements?</label>
                                    <textarea 
                                        className="glass-input w-100" 
                                        rows="3" 
                                        value={form.questions} 
                                        onChange={(e) => handleInputChange('questions', e.target.value)}
                                    ></textarea>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                className="btn-premium w-100 py-3 mt-2" 
                                style={{ fontSize: '1rem', fontWeight: 'bold' }}
                                disabled={loading}
                            >
                                {loading ? 'Submitting...' : 'Submit Enquiry Form'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
