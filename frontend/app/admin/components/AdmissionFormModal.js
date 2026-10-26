'use client';

import React, { useState } from 'react';

export default function AdmissionFormModal({ isOpen, onClose }) {
    const [copied, setCopied] = useState(false);
    const [previewMode, setPreviewMode] = useState('pdf'); // 'pdf' | 'html'

    if (!isOpen) return null;

    const pdfUrl = '/forms/Khelo_Patna_Academy_Admission_Form.pdf';
    const previewImg = '/forms/admission_form_preview_hd.png';

    const handleCopyLink = () => {
        try {
            const fullUrl = window.location.origin + pdfUrl;
            navigator.clipboard.writeText(fullUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            console.error('Could not copy link', err);
        }
    };

    const handlePrint = () => {
        // Open PDF directly in new tab/window where print is natively supported
        const printWindow = window.open(pdfUrl, '_blank');
        if (printWindow) {
            printWindow.focus();
        }
    };

    return (
        <div 
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(3, 8, 6, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 999999,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                padding: '16px'
            }}
            onClick={onClose}
        >
            <div 
                style={{
                    background: 'var(--card-bg, #0A1510)',
                    border: '1px solid var(--border-color, rgba(16, 185, 129, 0.2))',
                    borderRadius: '20px',
                    width: '100%',
                    maxWidth: '860px',
                    maxHeight: '92vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(16, 185, 129, 0.1)',
                    overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div style={{
                    padding: '18px 24px',
                    borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    background: 'linear-gradient(180deg, rgba(16, 185, 129, 0.06) 0%, transparent 100%)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--emerald, #10B981)'
                        }}>
                            <span className="material-icons-outlined" style={{ fontSize: '22px' }}>description</span>
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                                    Academy Admission Form
                                </h3>
                                <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: 'rgba(16, 185, 129, 0.15)',
                                    color: 'var(--emerald, #10B981)',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}>
                                    Offline PDF
                                </span>
                            </div>
                            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #94A3B8)' }}>
                                Official registration & consent form for walk-in academy students
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#94A3B8',
                            borderRadius: '10px',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                        title="Close (Esc)"
                    >
                        <span className="material-icons-outlined" style={{ fontSize: '20px' }}>close</span>
                    </button>
                </div>

                {/* Action Bar (Download / Print / Share) */}
                <div style={{
                    padding: '12px 24px',
                    background: 'rgba(0, 0, 0, 0.35)',
                    borderBottom: '1px solid var(--border-color, rgba(255, 255, 255, 0.06))',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <a
                            href={pdfUrl}
                            download="Khelo_Patna_Academy_Admission_Form.pdf"
                            className="btn-primary-stripe"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '9px 18px',
                                fontSize: '0.86rem',
                                fontWeight: 700,
                                textDecoration: 'none',
                                borderRadius: '10px',
                                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)'
                            }}
                        >
                            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>download</span>
                            Download PDF Form
                        </a>

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

                        <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary-stripe"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '9px 14px',
                                fontSize: '0.86rem',
                                textDecoration: 'none',
                                borderRadius: '10px'
                            }}
                        >
                            <span className="material-icons-outlined" style={{ fontSize: '18px' }}>open_in_new</span>
                            Open in New Tab
                        </a>
                    </div>

                    <button
                        type="button"
                        onClick={handleCopyLink}
                        style={{
                            background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                            border: `1px solid ${copied ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                            color: copied ? 'var(--emerald, #10B981)' : '#CBD5E1',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <span className="material-icons-outlined" style={{ fontSize: '16px' }}>
                            {copied ? 'check' : 'content_copy'}
                        </span>
                        <span>{copied ? 'Link Copied!' : 'Copy Download Link'}</span>
                    </button>
                </div>

                {/* Form Quick Info Banner */}
                <div style={{
                    padding: '10px 24px',
                    background: 'rgba(16, 185, 129, 0.04)',
                    borderBottom: '1px solid rgba(16, 185, 129, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap',
                    fontSize: '0.78rem',
                    color: '#94A3B8'
                }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#E2E8F0' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '15px', color: 'var(--emerald, #10B981)' }}>sports_cricket</span>
                        Cricket (3 PM - 5 PM)
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#E2E8F0' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '15px', color: 'var(--emerald, #10B981)' }}>sports_soccer</span>
                        Football (5 PM - 7 PM)
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#E2E8F0' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '15px', color: 'var(--emerald, #10B981)' }}>call</span>
                        Ph: 970 970 1400
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#94A3B8', marginLeft: 'auto' }}>
                        <span className="material-icons-outlined" style={{ fontSize: '15px' }}>place</span>
                        Kumhrar - Sandalpur Road, Patna
                    </span>
                </div>

                {/* Modal Body / Scrollable Preview */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    {/* Visual paper preview */}
                    <div style={{
                        width: '100%',
                        maxWidth: '680px',
                        background: '#FFFFFF',
                        borderRadius: '12px',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        <img 
                            src={previewImg} 
                            alt="Khelo Patna Elite Turf Academy Admission Form"
                            style={{
                                width: '100%',
                                height: 'auto',
                                display: 'block'
                            }}
                        />
                    </div>

                    {/* Staff Guidance Footer */}
                    <div style={{
                        marginTop: '20px',
                        width: '100%',
                        maxWidth: '680px',
                        padding: '14px 18px',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px'
                    }}>
                        <span className="material-icons-outlined" style={{ color: 'var(--emerald, #10B981)', fontSize: '20px', marginTop: '2px' }}>
                            tips_and_updates
                        </span>
                        <div style={{ fontSize: '0.8rem', color: '#CBD5E1', lineHeight: '1.5' }}>
                            <strong style={{ color: '#FFFFFF' }}>Office Staff Instructions:</strong>
                            <p style={{ margin: '4px 0 0' }}>
                                Print blank copies of this form and keep 10-15 copies at the reception counter. Once the parent or guardian fills out and signs the form, collect the admission fee and register the student in the <strong>Admissions</strong> tab in the sidebar.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div style={{
                    padding: '14px 24px',
                    borderTop: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(0, 0, 0, 0.3)'
                }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94A3B8)' }}>
                        File: <code style={{ color: 'var(--emerald, #10B981)', fontFamily: 'monospace' }}>Khelo_Patna_Academy_Admission_Form.pdf</code>
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
    );
}
