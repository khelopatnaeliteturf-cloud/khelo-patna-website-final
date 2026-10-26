'use client';

import React, { useState } from 'react';

export default function AdmissionFormModal({ isOpen, onClose, backendUrl = '', token = '' }) {
    const [downloading, setDownloading] = useState(false);

    if (!isOpen) return null;

    const authQuery = token ? `?token=${encodeURIComponent(token)}` : '';
    const downloadEndpoint = `${backendUrl}/api/academy/admission-form/download${authQuery}`;
    const viewEndpoint = `${backendUrl}/api/academy/admission-form/view${authQuery}`;

    const handleDownload = async () => {
        try {
            setDownloading(true);
            const res = await fetch(downloadEndpoint, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                credentials: 'include'
            });
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    throw new Error('Access denied: Staff login session required.');
                }
                throw new Error('Failed to download PDF form.');
            }
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = 'Khelo_Patna_Academy_Admission_Form.pdf';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
        } catch (err) {
            alert(err.message || 'Error downloading form.');
        } finally {
            setDownloading(false);
        }
    };

    const handlePrint = () => {
        // Trigger browser print of the clean printable form sheet
        window.print();
    };

    const handleOpenInNewTab = () => {
        window.open(viewEndpoint, '_blank');
    };

    return (
        <>
            {/* Global print style so only the paper form prints */}
            <style jsx global>{`
                @media print {
                    body {
                        background: #FFFFFF !important;
                        color: #000000 !important;
                    }
                    body * {
                        visibility: hidden !important;
                    }
                    #admission-form-paper, #admission-form-paper * {
                        visibility: visible !important;
                    }
                    #admission-form-paper {
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 24px !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: #FFFFFF !important;
                        color: #0F172A !important;
                    }
                }
            `}</style>

            <div 
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(3, 8, 6, 0.75)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 999999,
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    padding: '16px'
                }}
                onClick={onClose}
            >
                <div 
                    style={{
                        background: 'var(--card-bg, #FFFFFF)',
                        border: '1px solid var(--border-color, rgba(0, 0, 0, 0.12))',
                        borderRadius: '20px',
                        width: '100%',
                        maxWidth: '860px',
                        maxHeight: '94vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
                        overflow: 'hidden'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Modal Header */}
                    <div style={{
                        padding: '16px 24px',
                        borderBottom: '1px solid var(--border-color, rgba(0, 0, 0, 0.08))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        background: 'var(--surface-tint, rgba(0, 0, 0, 0.02))'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '12px',
                                background: 'rgba(5, 150, 105, 0.12)',
                                border: '1px solid rgba(5, 150, 105, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--primary, #059669)'
                            }}>
                                <span className="material-icons-outlined" style={{ fontSize: '22px' }}>description</span>
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main, #0F172A)', letterSpacing: '-0.02em' }}>
                                        Academy Admission Form
                                    </h3>
                                    <span style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        background: 'rgba(5, 150, 105, 0.12)',
                                        color: 'var(--primary, #059669)',
                                        border: '1px solid rgba(5, 150, 105, 0.3)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        letterSpacing: '0.04em'
                                    }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '12px' }}>lock</span>
                                        Staff Only
                                    </span>
                                </div>
                                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #64748B)' }}>
                                    Official physical registration & consent form for offline academy intake
                                </p>
                            </div>
                        </div>

                        <button 
                            onClick={onClose}
                            style={{
                                background: 'var(--surface-tint, rgba(0, 0, 0, 0.04))',
                                border: '1px solid var(--border-color, rgba(0, 0, 0, 0.08))',
                                color: 'var(--text-muted, #64748B)',
                                borderRadius: '10px',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-main, #0F172A)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted, #64748B)'; }}
                            title="Close (Esc)"
                        >
                            <span className="material-icons-outlined" style={{ fontSize: '20px' }}>close</span>
                        </button>
                    </div>

                    {/* Action Bar (Download / Print / View) */}
                    <div style={{
                        padding: '12px 24px',
                        background: 'var(--surface-tint, rgba(0, 0, 0, 0.03))',
                        borderBottom: '1px solid var(--border-color, rgba(0, 0, 0, 0.08))',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={handleDownload}
                                disabled={downloading}
                                className="btn-primary-stripe"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '9px 18px',
                                    fontSize: '0.86rem',
                                    fontWeight: 700,
                                    borderRadius: '10px',
                                    cursor: downloading ? 'not-allowed' : 'pointer',
                                    opacity: downloading ? 0.7 : 1
                                }}
                            >
                                <span className="material-icons-outlined" style={{ fontSize: '18px' }}>
                                    {downloading ? 'hourglass_top' : 'download'}
                                </span>
                                {downloading ? 'Downloading...' : 'Download PDF Form'}
                            </button>

                            <button
                                type="button"
                                onClick={handlePrint}
                                className="btn-secondary-stripe"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '9px 16px',
                                    fontSize: '0.86rem',
                                    fontWeight: 600,
                                    borderRadius: '10px'
                                }}
                            >
                                <span className="material-icons-outlined" style={{ fontSize: '18px' }}>print</span>
                                Print Form
                            </button>

                            <button
                                type="button"
                                onClick={handleOpenInNewTab}
                                className="btn-secondary-stripe"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '9px 14px',
                                    fontSize: '0.86rem',
                                    borderRadius: '10px'
                                }}
                            >
                                <span className="material-icons-outlined" style={{ fontSize: '18px' }}>open_in_new</span>
                                Open PDF in Tab
                            </button>
                        </div>

                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            color: 'var(--primary, #059669)',
                            background: 'rgba(5, 150, 105, 0.08)',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(5, 150, 105, 0.25)'
                        }}>
                            <span className="material-icons-outlined" style={{ fontSize: '14px' }}>verified_user</span>
                            <span>Authenticated Admin Access</span>
                        </div>
                    </div>

                    {/* Quick Info Ribbon */}
                    <div style={{
                        padding: '10px 24px',
                        background: 'rgba(5, 150, 105, 0.06)',
                        borderBottom: '1px solid rgba(5, 150, 105, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        flexWrap: 'wrap',
                        fontSize: '0.8rem'
                    }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--text-main, #1E293B)', fontWeight: 600 }}>
                            <span className="material-icons-outlined" style={{ fontSize: '16px', color: 'var(--primary, #059669)' }}>sports_cricket</span>
                            Cricket (3 PM – 5 PM)
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--text-main, #1E293B)', fontWeight: 600 }}>
                            <span className="material-icons-outlined" style={{ fontSize: '16px', color: 'var(--primary, #059669)' }}>sports_soccer</span>
                            Football (5 PM – 7 PM)
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--text-main, #1E293B)', fontWeight: 600 }}>
                            <span className="material-icons-outlined" style={{ fontSize: '16px', color: 'var(--primary, #059669)' }}>call</span>
                            Ph: 970 970 1400
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted, #64748B)', marginLeft: 'auto' }}>
                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>place</span>
                            Kumhrar - Sandalpur Road, Patna
                        </span>
                    </div>

                    {/* Scrollable Preview Area */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '24px 16px',
                        background: 'var(--bg-color, #F1F5F9)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        {/* ═══ REALISTIC PAPER FORM PREVIEW (NO BROKEN IMAGES) ═══ */}
                        <div 
                            id="admission-form-paper"
                            style={{
                                width: '100%',
                                maxWidth: '720px',
                                background: '#FFFFFF',
                                color: '#0F172A',
                                padding: '36px 42px',
                                borderRadius: '10px',
                                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.06)',
                                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                fontSize: '0.9rem',
                                lineHeight: '1.6'
                            }}
                        >
                            {/* Top Header Row */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', borderBottom: '2px solid #0F172A', paddingBottom: '16px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <img 
                                        src="/logo.png" 
                                        alt="Khelo Patna Logo"
                                        style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                                    />
                                    <div>
                                        <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0F3057', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                            KHELO PATNA ELITE TURF
                                        </h1>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F172A', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '2px' }}>
                                            PATNA'S PREMIER INDOOR SPORTS ARENA
                                        </div>
                                        <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '2px' }}>
                                            Kumhrar - Sandalpur Road, Patna, Bihar 800006
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: '#059669', fontStyle: 'italic', fontWeight: 600 }}>
                                            Cricket | Football | Academy | Multi-sport Booking
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>
                                        Ph. No.: 970 970 1400
                                    </span>
                                </div>
                            </div>

                            {/* Title */}
                            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', textDecoration: 'underline', textUnderlineOffset: '6px' }}>
                                    Academy Admission Form
                                </h2>
                            </div>

                            {/* Section: Personal Details */}
                            <div style={{ marginBottom: '22px' }}>
                                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
                                    Personal Details:
                                </h3>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                                        <span style={{ fontWeight: 600, minWidth: '130px' }}>Full Name:</span>
                                        <span style={{ flex: 1, borderBottom: '1px solid #94A3B8', height: '1.2rem' }}></span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', flex: 1, minWidth: '220px' }}>
                                            <span style={{ fontWeight: 600, minWidth: '130px' }}>Date of Birth:</span>
                                            <span style={{ flex: 1, borderBottom: '1px solid #94A3B8', height: '1.2rem', color: '#94A3B8', fontSize: '0.85rem' }}>
                                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <span style={{ fontWeight: 600 }}>Gender:</span>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>☐ Male</span>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>☐ Female</span>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>☐ Other</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                                        <span style={{ fontWeight: 600, minWidth: '130px' }}>Father's Name:</span>
                                        <span style={{ flex: 1, borderBottom: '1px solid #94A3B8', height: '1.2rem' }}></span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                                        <span style={{ fontWeight: 600, minWidth: '130px' }}>Mother's Name:</span>
                                        <span style={{ flex: 1, borderBottom: '1px solid #94A3B8', height: '1.2rem' }}></span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                                        <span style={{ fontWeight: 600, minWidth: '130px' }}>Contact Number:</span>
                                        <span style={{ flex: 1, borderBottom: '1px solid #94A3B8', height: '1.2rem' }}></span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                                        <span style={{ fontWeight: 600, minWidth: '130px' }}>Email Address:</span>
                                        <span style={{ flex: 1, borderBottom: '1px solid #94A3B8', height: '1.2rem' }}></span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                                        <span style={{ fontWeight: 600, minWidth: '130px' }}>School Name:</span>
                                        <span style={{ flex: 1, borderBottom: '1px solid #94A3B8', height: '1.2rem' }}></span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                                        <span style={{ fontWeight: 600, minWidth: '130px' }}>Address:</span>
                                        <span style={{ flex: 1, borderBottom: '1px solid #94A3B8', height: '1.2rem' }}></span>
                                    </div>
                                    <div style={{ borderBottom: '1px solid #94A3B8', height: '1.2rem', marginLeft: '130px' }}></div>
                                </div>
                            </div>

                            {/* Section: Academy Details */}
                            <div style={{ marginBottom: '22px' }}>
                                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                                    Academy Details:
                                </h3>
                                
                                <div style={{ marginBottom: '8px' }}>
                                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>Select Sport:</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '1.1rem' }}>☐</span>
                                            <span>Cricket Academy (3 PM – 5 PM)</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '1.1rem' }}>☐</span>
                                            <span>Football Academy (5 PM – 7 PM)</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '10px' }}>
                                    <span style={{ fontWeight: 600 }}>Experience Level:</span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>☐ Beginner</span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>☐ Intermediate</span>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>☐ Advanced</span>
                                </div>
                            </div>

                            {/* Section: Medical Declaration */}
                            <div style={{ marginBottom: '22px' }}>
                                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                                    Medical Declaration:
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.85rem', color: '#334155' }}>
                                    <span style={{ fontSize: '1.1rem', lineHeight: '1.2' }}>☐</span>
                                    <span>
                                        I confirm that the applicant is medically fit to participate in physical training and has no known health conditions that may affect regular activity.
                                    </span>
                                </div>
                            </div>

                            {/* Section: Declaration by Parent/Guardian */}
                            <div style={{ marginBottom: '24px' }}>
                                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                                    Declaration by Parent/Guardian:
                                </h3>
                                <p style={{ fontSize: '0.85rem', color: '#334155', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                                    I hereby declare that all information provided is true and correct to the best of my knowledge. I agree to abide by the rules and discipline of Khelo Patna Elite Turf Academy.
                                </p>

                                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '20px', marginTop: '20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', flex: 1 }}>
                                        <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Signature of Parent/Guardian:</span>
                                        <span style={{ flex: 1, borderBottom: '1px solid #94A3B8', height: '1.2rem', marginLeft: '6px' }}></span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', width: '220px' }}>
                                        <span style={{ fontWeight: 600 }}>Date:</span>
                                        <span style={{ flex: 1, borderBottom: '1px solid #94A3B8', height: '1.2rem', marginLeft: '6px', color: '#94A3B8', fontSize: '0.85rem' }}>
                                            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Staff Guidance Box */}
                        <div style={{
                            marginTop: '20px',
                            width: '100%',
                            maxWidth: '720px',
                            padding: '14px 18px',
                            background: 'rgba(5, 150, 105, 0.08)',
                            border: '1px solid rgba(5, 150, 105, 0.25)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px'
                        }}>
                            <span className="material-icons-outlined" style={{ color: 'var(--primary, #059669)', fontSize: '20px', marginTop: '2px' }}>
                                tips_and_updates
                            </span>
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-main, #1E293B)', lineHeight: '1.5' }}>
                                <strong style={{ color: 'var(--primary, #059669)' }}>Office Staff Procedure:</strong>
                                <p style={{ margin: '4px 0 0', color: 'var(--text-muted, #64748B)' }}>
                                    Print 10–15 copies of this form for the front counter. When walk-in students or parents submit the filled & signed form, collect the admission fee and complete digital enrollment in the <strong>Admissions Studio</strong> tab.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div style={{
                        padding: '14px 24px',
                        borderTop: '1px solid var(--border-color, rgba(0, 0, 0, 0.08))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--surface-tint, rgba(0, 0, 0, 0.02))'
                    }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748B)' }}>
                            Template: <code style={{ color: 'var(--primary, #059669)', fontFamily: 'monospace', fontWeight: 600 }}>Khelo_Patna_Academy_Admission_Form.pdf</code>
                        </span>
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary-stripe"
                            style={{
                                padding: '6px 16px',
                                fontSize: '0.82rem',
                                borderRadius: '8px'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
