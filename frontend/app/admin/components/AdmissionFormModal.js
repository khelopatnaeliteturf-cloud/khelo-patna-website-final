'use client';

import React, { useState } from 'react';

export default function AdmissionFormModal({ isOpen, onClose, backendUrl, token }) {
    const [downloading, setDownloading] = useState(false);

    if (!isOpen) return null;

    const authQuery = token ? `?token=${encodeURIComponent(token)}` : '';
    const downloadEndpoint = `${backendUrl}/api/academy/admission-form/download${authQuery}`;
    const viewEndpoint = `${backendUrl}/api/academy/admission-form/view${authQuery}`;
    const previewEndpoint = `${backendUrl}/api/academy/admission-form/preview${authQuery}`;

    const handleDownload = async () => {
        try {
            setDownloading(true);
            const res = await fetch(downloadEndpoint, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                credentials: 'include'
            });
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    throw new Error('Access denied. Admin or office staff login required.');
                }
                throw new Error('Failed to download admission form.');
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

    const handleOpenInNewTab = () => {
        window.open(viewEndpoint, '_blank');
    };

    const handlePrint = () => {
        window.open(viewEndpoint, '_blank');
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
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    color: '#F87171',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    letterSpacing: '0.04em'
                                }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '12px' }}>lock</span>
                                    Staff Only
                                </span>
                            </div>
                            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #94A3B8)' }}>
                                Official offline registration & consent form (Protected Internal Document)
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

                {/* Action Bar (Download / Print) */}
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
                                opacity: downloading ? 0.7 : 1,
                                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)'
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
                            Open in New Tab
                        </button>
                    </div>

                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.76rem',
                        color: 'var(--emerald, #10B981)',
                        background: 'rgba(16, 185, 129, 0.08)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(16, 185, 129, 0.2)'
                    }}>
                        <span className="material-icons-outlined" style={{ fontSize: '14px' }}>verified_user</span>
                        <span>Authenticated Staff Access</span>
                    </div>
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
                            src={previewEndpoint} 
                            alt="Khelo Patna Elite Turf Academy Admission Form"
                            style={{
                                width: '100%',
                                height: 'auto',
                                display: 'block'
                            }}
                            onError={(e) => {
                                // Fallback placeholder if image not yet loaded
                                e.currentTarget.style.display = 'none';
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
                            security
                        </span>
                        <div style={{ fontSize: '0.8rem', color: '#CBD5E1', lineHeight: '1.5' }}>
                            <strong style={{ color: '#FFFFFF' }}>Internal Office Staff Security Policy:</strong>
                            <p style={{ margin: '4px 0 0' }}>
                                This form is restricted to internal staff and administrators. It cannot be accessed without an active admin login session. Print copies as needed for offline walk-in parents and file physical copies in the office registry after digital admission.
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
                        Internal File: <code style={{ color: 'var(--emerald, #10B981)', fontFamily: 'monospace' }}>Khelo_Patna_Academy_Admission_Form.pdf</code>
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
