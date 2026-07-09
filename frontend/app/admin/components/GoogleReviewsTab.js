"use client";

import React, { useState, useEffect } from 'react';

export default function GoogleReviewsTab({ backendUrl, getHeaders }) {
    const [reviewUrl, setReviewUrl] = useState('');
    const [previewType, setPreviewType] = useState('a4'); // 'a4' | 'card'
    const [activeSubTab, setActiveSubTab] = useState('poster'); // 'poster' | 'log'
    const [reviews, setReviews] = useState([]);
    const [stats, setStats] = useState(null);
    const [loadingLog, setLoadingLog] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRating, setSelectedRating] = useState('all');
    const [copySuccess, setCopySuccess] = useState(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setReviewUrl(`${window.location.origin}/review`);
        }
    }, []);

    const fetchReviewsAndStats = async () => {
        setLoadingLog(true);
        try {
            const [revRes, statsRes] = await Promise.all([
                fetch(`${backendUrl}/api/admin/maps-reviews`, { headers: getHeaders() }),
                fetch(`${backendUrl}/api/admin/maps-reviews/stats`, { headers: getHeaders() })
            ]);
            
            if (revRes.ok && statsRes.ok) {
                const revData = await revRes.json();
                const statsData = await statsRes.json();
                setReviews(revData || []);
                setStats(statsData || null);
            }
        } catch (err) {
            console.error('Failed to load review logs and stats:', err);
        } finally {
            setLoadingLog(false);
        }
    };

    useEffect(() => {
        if (activeSubTab === 'log') {
            fetchReviewsAndStats();
        }
    }, [activeSubTab]);

    const handleCopyText = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopySuccess(id);
        setTimeout(() => setCopySuccess(null), 2000);
    };

    const handlePrint = (type = 'a4') => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Popup blocker prevented printing. Please enable popups for this site.');
            return;
        }

        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(reviewUrl)}`;
        
        const htmlContent = type === 'a4' ? `
            <html>
                <head>
                    <title>Print Google Review Poster - Khelo Patna</title>
                    <style>
                        body {
                            margin: 0;
                            padding: 0;
                            background-color: #f1f5f9;
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                        }
                        .a4-container {
                            width: 210mm;
                            height: 297mm;
                            background: white;
                            box-sizing: border-box;
                            padding: 25mm 20mm;
                            display: flex;
                            flex-direction: column;
                            justify-content: space-between;
                            align-items: center;
                            position: relative;
                            border: 12px solid #059669; /* Emerald Green Primary */
                        }
                        .a4-inner-border {
                            position: absolute;
                            top: 4mm;
                            left: 4mm;
                            right: 4mm;
                            bottom: 4mm;
                            border: 2px solid #fbbf24; /* Yellow Amber */
                            pointer-events: none;
                        }
                        .header {
                            display: flex;
                            align-items: center;
                            gap: 20px;
                            width: 100%;
                            border-bottom: 3px double #fbbf24;
                            padding-bottom: 20px;
                        }
                        .logo {
                            width: 80px;
                            height: 80px;
                            border-radius: 12px;
                            border: 2px solid #059669;
                            background-color: #047857;
                            padding: 2px;
                        }
                        .center-info {
                            text-align: left;
                        }
                        .center-name {
                            font-size: 28px;
                            font-weight: 900;
                            color: #059669;
                            margin: 0;
                            letter-spacing: -0.5px;
                        }
                        .center-tagline {
                            font-size: 12px;
                            color: #fbbf24;
                            font-weight: 700;
                            margin: 4px 0 0 0;
                            text-transform: uppercase;
                            letter-spacing: 1.5px;
                        }
                        .main-content {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            flex-grow: 1;
                            width: 100%;
                            padding: 20px 0;
                        }
                        .heading {
                            font-size: 36px;
                            font-weight: 900;
                            color: #0f172a;
                            margin: 0 0 10px 0;
                            text-align: center;
                            text-transform: uppercase;
                            letter-spacing: -0.5px;
                        }
                        .stars {
                            display: flex;
                            gap: 8px;
                            margin-bottom: 25px;
                        }
                        .star {
                            color: #fbbf24;
                            font-size: 38px;
                        }
                        .description {
                            font-size: 16px;
                            color: #475569;
                            text-align: center;
                            max-width: 90%;
                            margin-bottom: 35px;
                            line-height: 1.6;
                        }
                        .qr-frame {
                            background: white;
                            border: 4px solid #059669;
                            border-radius: 24px;
                            padding: 24px;
                            box-shadow: 0 15px 30px rgba(5, 150, 105, 0.15);
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            margin-bottom: 35px;
                        }
                        .qr-image {
                            width: 220px;
                            height: 220px;
                            display: block;
                        }
                        .qr-caption {
                            font-size: 12px;
                            font-weight: 800;
                            color: #059669;
                            text-transform: uppercase;
                            margin-top: 15px;
                            letter-spacing: 1.5px;
                        }
                        .steps-container {
                            width: 100%;
                            max-width: 85%;
                            background: #f8fafc;
                            border: 1px solid #e2e8f0;
                            border-radius: 18px;
                            padding: 20px 25px;
                        }
                        .steps-title {
                            font-size: 13px;
                            font-weight: 800;
                            color: #0f172a;
                            margin: 0 0 12px 0;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                            text-align: center;
                        }
                        .step-item {
                            font-size: 12px;
                            color: #475569;
                            margin-bottom: 8px;
                            display: flex;
                            align-items: flex-start;
                            gap: 10px;
                            line-height: 1.5;
                            text-align: left;
                        }
                        .step-item:last-child {
                            margin-bottom: 0;
                        }
                        .step-number {
                            background: #059669;
                            color: white;
                            font-weight: bold;
                            font-size: 10px;
                            width: 18px;
                            height: 18px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            flex-shrink: 0;
                            margin-top: 1px;
                        }
                        .footer {
                            width: 100%;
                            border-top: 1px solid #e2e8f0;
                            padding-top: 15px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            font-size: 11px;
                            color: #64748b;
                            font-weight: 500;
                        }
                        @media print {
                            @page {
                                size: A4 portrait;
                                margin: 0;
                            }
                            body {
                                background: white;
                                padding: 0;
                            }
                            .a4-container {
                                border: none;
                                width: 210mm;
                                height: 297mm;
                                box-shadow: none;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="a4-container">
                        <div class="a4-inner-border"></div>
                        <div class="header">
                            <div class="logo" style="display: flex; align-items: center; justify-content: center; overflow: hidden; background: #059669; padding: 4px;">
                                <img src="${window.location.origin}/logo.png" alt="Logo" style="width: 100%; height: 100%; object-fit: contain;" />
                            </div>
                            <div class="center-info">
                                <div class="center-name">Khelo Patna Elite Turf</div>
                                <div class="center-tagline">Premium Football & Cricket Sports Arena</div>
                            </div>
                        </div>
                        
                        <div class="main-content">
                            <div class="heading">Share Your Experience!</div>
                            <div class="stars">
                                <span class="star">★</span>
                                <span class="star">★</span>
                                <span class="star">★</span>
                                <span class="star">★</span>
                                <span class="star">★</span>
                            </div>
                            <div class="description">
                                Your reviews help us make sports better! Scan the QR code below to rate your experience and generate a customized Google Maps review.
                            </div>
                            
                            <div class="qr-frame">
                                <img class="qr-image" src="${qrCodeUrl}" alt="Review QR Code" />
                                <div class="qr-caption">Scan to Review Us</div>
                            </div>
                            
                            <div class="steps-container">
                                <div class="steps-title">How to Review in 4 Easy Steps</div>
                                <div class="step-item">
                                    <span class="step-number">1</span>
                                    <span>Open your phone's camera and scan the QR code.</span>
                                </div>
                                <div class="step-item">
                                    <span class="step-number">2</span>
                                    <span>Choose a star rating (1 to 5 stars) on the landing page.</span>
                                </div>
                                <div class="step-item">
                                    <span class="step-number">3</span>
                                    <span>Copy the customized review text generated by Groq AI.</span>
                                </div>
                                <div class="step-item">
                                    <span class="step-number">4</span>
                                    <span>Paste the review directly on our Google Maps profile!</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="footer">
                            <span>📍 Kumhrar, Sandalpur Road, Patna</span>
                            <span>📧 service@khelopatna.in</span>
                            <span>🌐 www.khelopatna.in</span>
                        </div>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 500);
                        };
                    </script>
                </body>
            </html>
        ` : `
            <html>
                <head>
                    <title>Print QR Code Card - Khelo Patna</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                            margin: 0;
                            padding: 40px;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 90vh;
                            background-color: #f8fafc;
                        }
                        .card {
                            width: 380px;
                            background: white;
                            border: 3px solid #059669;
                            border-radius: 24px;
                            padding: 40px 30px;
                            box-shadow: 0 10px 25px -5px rgba(5, 150, 105, 0.1);
                            text-align: center;
                        }
                        .title {
                            font-size: 24px;
                            font-weight: 800;
                            color: #0f172a;
                            margin-bottom: 8px;
                            letter-spacing: -0.025em;
                        }
                        .subtitle {
                            font-size: 13px;
                            color: #64748b;
                            margin-bottom: 30px;
                            line-height: 1.5;
                        }
                        .qr-container {
                            display: inline-block;
                            background: #f8fafc;
                            border: 1px solid #e2e8f0;
                            border-radius: 16px;
                            padding: 16px;
                            margin-bottom: 30px;
                        }
                        .qr-img {
                            width: 200px;
                            height: 200px;
                            display: block;
                        }
                        .footer-text {
                            font-size: 12px;
                            font-weight: 700;
                            color: #059669;
                            text-transform: uppercase;
                            letter-spacing: 0.1em;
                        }
                        @media print {
                            body {
                                background: white;
                                padding: 0;
                            }
                            .card {
                                border: none;
                                box-shadow: none;
                                margin: auto;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <div style="display: flex; justify-content: center; margin-bottom: 15px;">
                            <div style="width: 55px; height: 55px; border-radius: 12px; background: #059669; overflow: hidden; display: flex; align-items: center; justify-content: center; padding: 4px;">
                                <img src="${window.location.origin}/logo.png" alt="Logo" style="width: 100%; height: 100%; object-fit: contain;" />
                            </div>
                        </div>
                        <div class="title">Rate Khelo Patna!</div>
                        <div class="subtitle">Scan this QR code to quickly rate and write a Google review using our AI review generator.</div>
                        <div class="qr-container">
                            <img class="qr-img" src="${qrCodeUrl}" alt="Review QR Code" />
                        </div>
                        <div class="footer-text">⭐⭐ Khelo Patna Elite Turf ⭐⭐</div>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 500);
                        };
                    </script>
                </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const handleDownloadQR = async () => {
        try {
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(reviewUrl)}`;
            const response = await fetch(qrCodeUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'khelo_patna_review_qr.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download QR code:', err);
            alert('Failed to download QR code. You can right-click the QR preview to save it.');
        }
    };

    const filteredReviews = reviews.filter(rev => {
        const textMatch = rev.text?.toLowerCase().includes(searchQuery.toLowerCase());
        const ratingMatch = selectedRating === 'all' || String(rev.rating) === selectedRating;
        return textMatch && ratingMatch;
    });

    const mockQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(reviewUrl || 'https://khelopatna.com/review')}`;

    return (
        <div className="glass-card animate-fade-in" style={{ padding: '28px' }}>
            {/* Header section with emerald visual tokens */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#fff' }}>
                    <span className="material-icons-outlined" style={{ color: 'var(--emerald)', fontSize: '24px' }}>reviews</span> Google Maps AI Review System
                </h3>
            </div>

            {/* Custom Sub-tabs using Khelo Patna pills design */}
            <div className="d-flex gap-2 border-bottom pb-3 mb-4" style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}>
                <button
                    onClick={() => setActiveSubTab('poster')}
                    className={`btn-pill ${activeSubTab === 'poster' ? 'active' : ''}`}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '30px',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        border: 'none',
                        background: activeSubTab === 'poster' ? 'var(--emerald)' : 'rgba(255, 255, 255, 0.04)',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.25s',
                        boxShadow: activeSubTab === 'poster' ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none'
                    }}
                >
                    <span className="material-icons-outlined" style={{ fontSize: '18px' }}>print</span> QR Poster & Printables
                </button>
                <button
                    onClick={() => setActiveSubTab('log')}
                    className={`btn-pill ${activeSubTab === 'log' ? 'active' : ''}`}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '30px',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        border: 'none',
                        background: activeSubTab === 'log' ? 'var(--emerald)' : 'rgba(255, 255, 255, 0.04)',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.25s',
                        boxShadow: activeSubTab === 'log' ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none'
                    }}
                >
                    <span className="material-icons-outlined" style={{ fontSize: '18px' }}>insights</span> AI Generated Log & Device Stats
                </button>
            </div>

            {activeSubTab === 'poster' && (
                <div className="row g-4 align-items-start">
                    {/* Left: Design Preview */}
                    <div className="col-12 col-lg-5 d-flex flex-column align-items-center">
                        <div className="w-100 d-flex align-items-center justify-content-between mb-3">
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                DESIGN PREVIEW
                            </span>
                            <div className="d-flex gap-1 p-1" style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <button
                                    onClick={() => setPreviewType('a4')}
                                    style={{
                                        border: 'none',
                                        background: previewType === 'a4' ? 'rgba(255,255,255,0.08)' : 'transparent',
                                        color: '#fff',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    A4 Poster
                                </button>
                                <button
                                    onClick={() => setPreviewType('card')}
                                    style={{
                                        border: 'none',
                                        background: previewType === 'card' ? 'rgba(255,255,255,0.08)' : 'transparent',
                                        color: '#fff',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Compact Card
                                </button>
                            </div>
                        </div>

                        {previewType === 'a4' ? (
                            <div className="w-100 max-w-sm bg-white text-dark rounded-4 p-4 text-center shadow-lg relative flex flex-column justify-content-between overflow-hidden"
                                 style={{ aspectRatio: '1/1.414', border: '10px solid #059669', color: '#0f172a', position: 'relative' }}>
                                {/* Inner amber border */}
                                <div style={{ position: 'absolute', top: '6px', left: '6px', right: '6px', bottom: '6px', border: '2px solid #fbbf24', pointerEvents: 'none', borderRadius: '10px' }}></div>
                                
                                <div className="d-flex flex-column justify-content-between h-100" style={{ zIndex: 10 }}>
                                    {/* Header */}
                                    <div className="d-flex align-items-center gap-3 border-bottom pb-3 text-start" style={{ borderColor: 'rgba(251, 191, 36, 0.3)' }}>
                                        <div className="logo d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#059669', overflow: 'hidden' }}>
                                            <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#059669', lineHeight: 1.1 }}>Khelo Patna Elite Turf</div>
                                            <div style={{ fontSize: '0.55rem', textTransform: 'uppercase', color: '#b45309', fontWeight: 800, marginTop: '2px' }}>Football & Cricket Sports Arena</div>
                                        </div>
                                    </div>

                                    {/* Main Content */}
                                    <div className="flex-grow-1 d-flex flex-column justify-content-center align-items-center py-3">
                                        <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
                                            SHARE YOUR EXPERIENCE!
                                        </h2>
                                        <div className="d-flex gap-1 mb-2" style={{ color: '#fbbf24' }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>star</span>
                                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>star</span>
                                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>star</span>
                                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>star</span>
                                            <span className="material-icons-outlined" style={{ fontSize: '16px' }}>star</span>
                                        </div>
                                        <p style={{ fontSize: '0.68rem', color: '#475569', lineHeight: 1.4, margin: '0 auto 12px auto', maxWidth: '90%', fontWeight: 500 }}>
                                            Your reviews help us grow. Scan the QR code below to quickly rate and write a Google review for our arena.
                                        </p>

                                        <div className="bg-white border rounded-3 p-3 shadow-sm mb-3" style={{ borderColor: '#059669', borderWidth: '2px' }}>
                                            <img
                                                src={mockQrCodeUrl}
                                                alt="QR Code"
                                                style={{ width: '100px', height: '100px', display: 'block', borderRadius: '4px' }}
                                            />
                                            <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#059669', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '6px', marginBottom: 0 }}>
                                                Scan to Rate Us
                                            </div>
                                        </div>

                                        {/* Steps */}
                                        <div className="w-100 bg-light rounded-3 p-2 text-start" style={{ border: '1px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', textAlign: 'center', marginBottom: '8px' }}>
                                                How to review in 4 steps
                                            </div>
                                            {[
                                                "Scan the QR code using your phone camera.",
                                                "Choose your star rating (1-5 stars).",
                                                "Copy the generated review description.",
                                                "Paste the review directly on Google Maps!",
                                            ].map((step, idx) => (
                                                <div key={idx} className="d-flex gap-2 align-items-start mb-1" style={{ fontSize: '0.58rem', color: '#334155', lineHeight: 1.2, fontWeight: 500 }}>
                                                    <span style={{ background: '#059669', color: 'white', fontWeight: 'bold', width: '12px', height: '12px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.5rem' }}>
                                                        {idx + 1}
                                                    </span>
                                                    <span>{step}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="border-t pt-2 d-flex justify-content-between align-items-center" style={{ fontSize: '0.55rem', color: '#475569', fontWeight: 700 }}>
                                        <span>📍 Kumhrar, Sandalpur Road, Patna</span>
                                        <span>📧 service@khelopatna.in</span>
                                        <span>🌐 www.khelopatna.in</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="w-100 max-w-sm bg-white text-dark rounded-4 p-4 text-center shadow-lg"
                                 style={{ border: '3px solid #059669', color: '#0f172a' }}>
                                <div className="d-flex justify-content-center mb-3">
                                    <div className="logo d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px', borderRadius: '10px', background: '#059669', overflow: 'hidden' }}>
                                        <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }} />
                                    </div>
                                </div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', marginBottom: '8px' }}>
                                    Rate Us on Google!
                                </h2>
                                <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5, marginBottom: '20px', fontWeight: 500 }}>
                                    Scan this QR code to quickly rate and review your experience with Khelo Patna Elite Turf.
                                </p>
                                <div className="inline-block bg-light border rounded-3 p-3 mb-4">
                                    <img
                                        src={mockQrCodeUrl}
                                        alt="QR Code Preview"
                                        style={{ width: '160px', height: '160px', display: 'block', margin: '0 auto', borderRadius: '6px' }}
                                    />
                                </div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#059669', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                    ⭐⭐ KHELO PATNA ELITE TURF ⭐⭐
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Actions and Info */}
                    <div className="col-12 col-lg-7 d-flex flex-column gap-3">
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            ACTIONS & SETTINGS
                        </span>

                        <div className="glass-card" style={{ padding: '24px' }}>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '16px', color: '#fff' }}>Print Actions</h4>
                            <div className="row g-3 mb-4">
                                <div className="col-12 col-md-6">
                                    <button
                                        onClick={() => handlePrint('a4')}
                                        className="btn-primary-stripe w-100"
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
                                    >
                                        <span className="material-icons-outlined">print</span> Print A4 Poster
                                    </button>
                                </div>
                                <div className="col-12 col-md-6">
                                    <button
                                        onClick={() => handlePrint('card')}
                                        className="btn-secondary-stripe w-100"
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
                                    >
                                        <span className="material-icons-outlined">print</span> Print Reception Card
                                    </button>
                                </div>
                            </div>

                            <div className="d-flex flex-wrap gap-2">
                                <button
                                    onClick={handleDownloadQR}
                                    className="btn-secondary-stripe"
                                    style={{ flex: 1, minWidth: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                    <span className="material-icons-outlined">download</span> Download QR
                                </button>
                                <a
                                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                                        `Hey! We would love to hear your feedback on Khelo Patna. Scan or click here to rate and generate your review: ${reviewUrl}`
                                    )}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn-secondary-stripe"
                                    style={{ flex: 1, minWidth: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#25d366', borderColor: '#25d366', color: '#fff' }}
                                >
                                    <span className="material-icons-outlined" style={{ fontSize: '18px' }}>share</span> WhatsApp Invite
                                </a>
                                <a
                                    href={reviewUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn-secondary-stripe"
                                    style={{ flex: 1, minWidth: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                >
                                    <span className="material-icons-outlined">open_in_new</span> Test Review Page
                                </a>
                            </div>
                        </div>

                        <div className="glass-card" style={{ padding: '20px' }}>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '10px', color: '#fff' }}>Public Review Landing URL</h4>
                            <div className="d-flex align-items-center gap-2 p-3 text-mono" style={{ background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', border: '1px dashed var(--emerald)', fontSize: '0.82rem', color: 'var(--text-primary)', wordBreak: 'break-all', fontWeight: 600 }}>
                                <span className="material-icons-outlined" style={{ fontSize: '18px', color: 'var(--emerald)' }}>qr_code</span>
                                <strong style={{ color: 'var(--emerald)' }}>{reviewUrl || 'Loading review url...'}</strong>
                            </div>
                        </div>

                        {/* Informational Alert Box */}
                        <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: '16px', padding: '18px', display: 'flex', gap: '14px' }}>
                            <span className="material-icons-outlined" style={{ color: 'var(--emerald)', fontSize: '22px', marginTop: '2px' }}>info</span>
                            <div style={{ fontSize: '0.8rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>How the AI review generator helps:</strong>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    When customers scan the QR code and select a rating, our system calls the Groq Cloud API backend. It generates a unique, highly natural, short sports-focused review matching their score. The review is copied to their clipboard, and they are redirected to Google Maps where they can paste it in one click!
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeSubTab === 'log' && (
                <div className="d-flex flex-column gap-4 animate-fade-in">
                    {/* Stats KPI Strip */}
                    <div className="row g-3">
                        <div className="col-12 col-sm-6 col-md-3">
                            <div className="card-premium d-flex align-items-center justify-content-between p-3" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Generated</span>
                                    <h3 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '4px 0 0 0', color: 'var(--emerald)' }}>{stats?.total || 0}</h3>
                                </div>
                                <div className="d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--emerald)' }}>
                                    <span className="material-icons-outlined">trending_up</span>
                                </div>
                            </div>
                        </div>

                        <div className="col-12 col-sm-6 col-md-3">
                            <div className="card-premium d-flex align-items-center justify-content-between p-3" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Device Profile</span>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, marginTop: '8px', color: '#fff' }}>
                                        📱 {stats?.devices?.Mobile || 0} &nbsp;|&nbsp; 💻 {stats?.devices?.Desktop || 0}
                                    </div>
                                </div>
                                <div className="d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' }}>
                                    <span className="material-icons-outlined">devices</span>
                                </div>
                            </div>
                        </div>

                        <div className="col-12 col-sm-6 col-md-3">
                            <div className="card-premium d-flex align-items-center justify-content-between p-3" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average Rating</span>
                                    <h3 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '4px 0 0 0', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        5★ <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>({stats?.ratings?.['5'] || 0})</span>
                                    </h3>
                                </div>
                                <div className="d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24' }}>
                                    <span className="material-icons-outlined">star</span>
                                </div>
                            </div>
                        </div>

                        <div className="col-12 col-sm-6 col-md-3">
                            <div className="card-premium d-flex align-items-center justify-content-between p-3" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unique IPs</span>
                                    <h3 style={{ fontSize: '1.75rem', fontWeight: 900, margin: '4px 0 0 0', color: '#a78bfa' }}>{stats?.top_ips?.length || 0}</h3>
                                </div>
                                <div className="d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa' }}>
                                    <span className="material-icons-outlined">fingerprint</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="row g-4">
                        {/* Generated Reviews Logs Table */}
                        <div className="col-12 col-lg-8">
                            <div className="card-premium" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div className="d-flex justify-content-between align-items-center pb-3 border-bottom mb-4">
                                    <div>
                                        <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Review Logs History</h4>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Logs of reviews drafted by turf customers</p>
                                    </div>
                                    <button
                                        onClick={fetchReviewsAndStats}
                                        className="btn-secondary-stripe"
                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '6px 12px' }}
                                    >
                                        <span className="material-icons-outlined" style={{ fontSize: '14px' }}>refresh</span> Refresh Logs
                                    </button>
                                </div>

                                {/* Filters Row */}
                                <div className="row g-2 mb-3">
                                    <div className="col-12 col-sm-8">
                                        <div style={{ position: 'relative' }}>
                                            <span className="material-icons-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', color: 'var(--text-muted)' }}>search</span>
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search log text..."
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px 8px 34px',
                                                    fontSize: '0.8rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    background: 'rgba(0,0,0,0.15)',
                                                    color: '#fff'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-12 col-sm-4">
                                        <select
                                            value={selectedRating}
                                            onChange={(e) => setSelectedRating(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                fontSize: '0.8rem',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                background: 'rgba(0,0,0,0.15)',
                                                color: '#fff'
                                            }}
                                        >
                                            <option value="all">All Ratings</option>
                                            <option value="5">5 Stars only</option>
                                            <option value="4">4 Stars only</option>
                                            <option value="3">3 Stars only</option>
                                            <option value="2">2 Stars only</option>
                                            <option value="1">1 Star only</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Logs container */}
                                {loadingLog ? (
                                    <div className="text-center py-5 text-muted">Loading generated review logs...</div>
                                ) : filteredReviews.length === 0 ? (
                                    <div className="text-center py-5 text-muted italic" style={{ fontSize: '0.8rem' }}>No generated reviews logged yet matching filter parameters.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '550px', overflowY: 'auto', paddingRight: '4px' }}>
                                        {filteredReviews.map((rev) => (
                                            <div key={rev.id} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <div className="d-flex gap-0.5" style={{ color: '#fbbf24' }}>
                                                        {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                                                            <span key={i} className="material-icons-outlined" style={{ fontSize: '14px' }}>star</span>
                                                        ))}
                                                    </div>
                                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                        {new Date(rev.created_at).toLocaleString('en-IN')}
                                                    </span>
                                                </div>

                                                <p style={{ fontSize: '0.8rem', color: '#e2e8f0', lineHeight: '1.45', margin: 0 }}>{rev.text}</p>

                                                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-2 border-top" style={{ borderColor: 'rgba(255, 255, 255, 0.04)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                    <div className="d-flex gap-2">
                                                        <span style={{ background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>IP: {rev.ip || 'unknown'}</span>
                                                        <span style={{ background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px' }}>{rev.device || 'Other'} ({rev.os || 'Other'})</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleCopyText(rev.text, rev.id)}
                                                        className="btn-secondary-stripe"
                                                        style={{ fontSize: '0.7rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                    >
                                                        <span className="material-icons-outlined" style={{ fontSize: '13px' }}>
                                                            {copySuccess === rev.id ? 'check' : 'content_copy'}
                                                        </span>
                                                        {copySuccess === rev.id ? 'Copied!' : 'Copy Draft'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Top generating IPs scoreboard */}
                        <div className="col-12 col-lg-4 d-flex flex-column gap-3">
                            <div className="card-premium" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>Top Generation Sources</h4>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>Frequent review draft source IP addresses</p>

                                {loadingLog ? (
                                    <div className="text-muted text-center py-4">Loading leaderboard...</div>
                                ) : !stats || stats.top_ips?.length === 0 ? (
                                    <div className="text-muted text-center py-4 italic" style={{ fontSize: '0.8rem' }}>No IP leaderboard records found yet.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {stats.top_ips.map((item, idx) => (
                                            <div key={idx} className="d-flex justify-content-between align-items-center py-2 border-bottom" style={{ borderColor: 'rgba(255, 255, 255, 0.03)', fontSize: '0.78rem' }}>
                                                <div className="d-flex align-items-center gap-2 min-w-0">
                                                    <span style={{ width: '20px', height: '20px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-mono truncate text-white" style={{ fontSize: '0.75rem' }}>{item.ip}</span>
                                                </div>
                                                <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--emerald)', padding: '2px 8px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 'bold' }}>
                                                    {item.count} review{item.count !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Help & security audits */}
                            <div style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', padding: '16px', display: 'flex', gap: '12px' }}>
                                <span className="material-icons-outlined" style={{ color: 'var(--text-muted)', fontSize: '20px', marginTop: '2px' }}>security</span>
                                <div style={{ fontSize: '0.78rem', lineHeight: '1.5', color: 'var(--text-muted)' }}>
                                    <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>IP Pacing & Anti-Spam Safety:</strong>
                                    If you note many drafts from the same IP address (e.g. over 5-10 logs in a short duration), this indicates a single device repeating review generations. Remind customers to pace reviews and post from their own data connections so Google Maps algorithms register the reviews as organic.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
