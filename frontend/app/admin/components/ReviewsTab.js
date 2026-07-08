import React, { useState, useEffect } from 'react';
import { getBackendUrl } from '../../lib/backendUrl';

const BACKEND_URL = getBackendUrl();

export default function ReviewsTab() {
    const reviewUrl = typeof window !== 'undefined' ? `${window.location.origin}/review` : '';
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(reviewUrl)}`;

    const [activeSubTab, setActiveSubTab] = useState("poster"); // "poster" | "logs"
    const [previewType, setPreviewType] = useState("a4"); // "a4" | "card"
    
    // Logs and statistics states
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [ratingFilter, setRatingFilter] = useState("all");
    const [copiedIdx, setCopiedIdx] = useState(null);

    const fetchLogsAndStats = async () => {
        setLoadingLogs(true);
        try {
            const [logsRes, statsRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/admin/maps-reviews`),
                fetch(`${BACKEND_URL}/api/admin/maps-reviews/stats`)
            ]);

            if (logsRes.ok && statsRes.ok) {
                const logsData = await logsRes.json();
                const statsData = await statsRes.json();
                setLogs(logsData || []);
                setStats(statsData || null);
            }
        } catch (err) {
            console.error("Error loading reviews log:", err);
        } finally {
            setLoadingLogs(false);
        }
    };

    useEffect(() => {
        if (activeSubTab === "logs") {
            fetchLogsAndStats();
        }
    }, [activeSubTab]);

    const handleCopyText = (text, idx) => {
        navigator.clipboard.writeText(text);
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 1500);
    };

    const handlePrint = (type = "a4") => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            alert("Popup blocker prevented printing. Please enable popups.");
            return;
        }

        const htmlContent = type === "a4" ? `
            <html>
                <head>
                    <title>Google Review Poster - Khelo Patna Elite Turf</title>
                    <style>
                        body {
                            margin: 0;
                            padding: 0;
                            background-color: #ffffff;
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
                            border: 12px solid #0a1510;
                        }
                        .a4-inner-border {
                            position: absolute;
                            top: 4mm;
                            left: 4mm;
                            right: 4mm;
                            bottom: 4mm;
                            border: 2px solid #10b981;
                            pointer-events: none;
                        }
                        .header {
                            display: flex;
                            align-items: center;
                            gap: 20px;
                            width: 100%;
                            border-bottom: 3px double #10b981;
                            padding-bottom: 20px;
                        }
                        .logo-circle {
                            width: 60px;
                            height: 60px;
                            border-radius: 50%;
                            background: #0a1510;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: #10b981;
                            font-size: 32px;
                            font-weight: bold;
                            border: 2px solid #10b981;
                        }
                        .school-info {
                            text-align: left;
                        }
                        .school-name {
                            font-size: 28px;
                            font-weight: 900;
                            color: #0a1510;
                            margin: 0;
                            letter-spacing: -0.5px;
                        }
                        .school-tagline {
                            font-size: 12px;
                            color: #10b981;
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
                            font-size: 38px;
                            font-weight: 900;
                            color: #0a1510;
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
                            font-size: 36px;
                        }
                        .description {
                            font-size: 15px;
                            color: #374151;
                            text-align: center;
                            max-width: 90%;
                            margin-bottom: 35px;
                            line-height: 1.6;
                        }
                        .qr-frame {
                            background: white;
                            border: 4px solid #0a1510;
                            border-radius: 24px;
                            padding: 24px;
                            box-shadow: 0 15px 30px rgba(10, 20, 16, 0.1);
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
                            color: #0a1510;
                            text-transform: uppercase;
                            margin-top: 15px;
                            letter-spacing: 1.5px;
                        }
                        .steps-container {
                            width: 100%;
                            max-width: 85%;
                            background: #f9fafb;
                            border: 1px solid #e5e7eb;
                            border-radius: 18px;
                            padding: 20px 25px;
                        }
                        .steps-title {
                            font-size: 13px;
                            font-weight: 800;
                            color: #111827;
                            margin: 0 0 12px 0;
                            text-transform: uppercase;
                            letter-spacing: 1px;
                            text-align: center;
                        }
                        .step-item {
                            font-size: 12px;
                            color: #4b5563;
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
                            background: #10b981;
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
                            border-top: 1px solid #e5e7eb;
                            padding-top: 15px;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            font-size: 10px;
                            color: #6b7280;
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
                            <div class="logo-circle">K</div>
                            <div class="school-info">
                                <div class="school-name">Khelo Patna Elite Turf</div>
                                <div class="school-tagline">Premium Indoor Turf & Sports Academy</div>
                            </div>
                        </div>
                        
                        <div class="main-content">
                            <div class="heading">Rate Our Turf Experience!</div>
                            <div class="stars">
                                <span class="star">★</span>
                                <span class="star">★</span>
                                <span class="star">★</span>
                                <span class="star">★</span>
                                <span class="star">★</span>
                            </div>
                            <div class="description">
                                Your feedback keeps us going! Scan the QR code below to quickly rate and write a Google review for our sports turf.
                            </div>
                            
                            <div class="qr-frame">
                                <img class="qr-image" src="${qrCodeUrl}" alt="Google Review QR Code" />
                                <div class="qr-caption">Scan to Rate Us</div>
                            </div>
                            
                            <div class="steps-container">
                                <div class="steps-title">How to Review in 4 Easy Steps</div>
                                <div class="step-item">
                                    <span class="step-number">1</span>
                                    <span>Scan the QR code using your phone camera.</span>
                                </div>
                                <div class="step-item">
                                    <span class="step-number">2</span>
                                    <span>Select your star rating (1 to 5 stars) on the landing page.</span>
                                </div>
                                <div class="step-item">
                                    <span class="step-number">3</span>
                                    <span>Instantly copy the generated review draft.</span>
                                </div>
                                <div class="step-item">
                                    <span class="step-number">4</span>
                                    <span>Paste directly on our Google Maps profile and submit!</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="footer">
                            <span>📍 Saguna More - Khagaul Rd, Patna</span>
                            <span>📧 bookings@khelopatna.in</span>
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
                            background-color: #f3f4f6;
                        }
                        .card {
                            width: 380px;
                            background: white;
                            border: 2px solid #e5e7eb;
                            border-radius: 24px;
                            padding: 40px 30px;
                            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
                            text-align: center;
                        }
                        .title {
                            font-size: 24px;
                            font-weight: 800;
                            color: #111827;
                            margin-bottom: 8px;
                            letter-spacing: -0.025em;
                        }
                        .subtitle {
                            font-size: 13px;
                            color: #4b5563;
                            margin-bottom: 30px;
                            line-height: 1.5;
                        }
                        .qr-container {
                            display: inline-block;
                            background: #f9fafb;
                            border: 1px solid #e5e7eb;
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
                            font-size: 11px;
                            font-weight: 700;
                            color: #10b981;
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
                        <div class="title">Rate Us on Google!</div>
                        <div class="subtitle">Scan this QR code to quickly rate and review your experience with Khelo Patna Elite Turf.</div>
                        <div class="qr-container">
                            <img class="qr-img" src="${qrCodeUrl}" alt="Review QR Code" />
                        </div>
                        <div class="footer-text">⭐ Khelo Patna Elite Turf ⭐</div>
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
            const response = await fetch(qrCodeUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "khelopatna_google_review_qr.png";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to download QR code:", err);
            alert("Failed to download. You can right-click the QR image to save it.");
        }
    };

    const filteredLogs = logs.filter(log => {
        const queryMatch = searchQuery ? log.text.toLowerCase().includes(searchQuery.toLowerCase()) : true;
        const ratingMatch = ratingFilter === "all" ? true : String(log.rating) === ratingFilter;
        return queryMatch && ratingMatch;
    });

    return (
        <div className="tab-pane-container">
            <style jsx>{`
                .tab-pane-container {
                    color: var(--text-main);
                }

                .pane-header {
                    margin-bottom: 24px;
                }

                .pane-title {
                    font-size: 24px;
                    font-weight: 800;
                    color: var(--text-main);
                    margin: 0 0 4px;
                }

                .pane-subtitle {
                    font-size: 13px;
                    color: var(--text-muted);
                }

                /* Sub-tabs */
                .sub-tabs-container {
                    display: flex;
                    gap: 8px;
                    border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.08));
                    padding-bottom: 12px;
                    margin-bottom: 24px;
                }

                .sub-tab-btn {
                    padding: 8px 16px;
                    font-size: 12px;
                    font-weight: 700;
                    border: none;
                    background: transparent;
                    color: var(--text-muted);
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s ease;
                }

                .sub-tab-btn:hover {
                    background: rgba(255, 255, 255, 0.03);
                    color: var(--text-main);
                }

                .sub-tab-btn.active {
                    background: linear-gradient(135deg, var(--emerald, #10b981) 0%, var(--emerald-dark, #059669) 100%);
                    color: #ffffff;
                }

                /* Layout Grids */
                .poster-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 30px;
                }

                @media (min-width: 768px) {
                    .poster-grid {
                        grid-template-columns: 350px 1fr;
                    }
                }

                /* Poster Preview Card */
                .preview-card {
                    background: var(--card-bg, rgba(255,255,255,0.02));
                    border: 1px solid var(--border-color, rgba(255,255,255,0.08));
                    border-radius: 20px;
                    padding: 24px;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .preview-title-bar {
                    display: flex;
                    justify-content: space-between;
                    width: 100%;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .preview-tag {
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: var(--text-muted);
                    letter-spacing: 1px;
                }

                .toggle-group {
                    display: flex;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 8px;
                    padding: 2px;
                }

                .toggle-btn {
                    padding: 4px 10px;
                    font-size: 10px;
                    font-weight: 700;
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    border-radius: 6px;
                }

                .toggle-btn.active {
                    background: #ffffff;
                    color: #000000;
                }

                /* A4 Poster preview frame */
                .a4-preview-frame {
                    width: 100%;
                    max-width: 280px;
                    aspect-ratio: 1/1.414;
                    background: #ffffff;
                    border: 8px solid #0a1510;
                    border-radius: 16px;
                    padding: 16px;
                    box-sizing: border-box;
                    color: #000000;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }

                .a4-preview-header {
                    border-bottom: 1.5px solid #10b981;
                    padding-bottom: 8px;
                    text-align: left;
                    font-weight: 900;
                    font-size: 11px;
                    color: #0a1510;
                    line-height: 1.2;
                }

                .a4-preview-body {
                    flex-grow: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 8px 0;
                }

                .a4-preview-body h3 {
                    font-size: 12px;
                    font-weight: 900;
                    margin: 0 0 2px;
                    text-transform: uppercase;
                    color: #0a1510;
                }

                .preview-stars {
                    display: flex;
                    gap: 2px;
                    color: #fbbf24;
                    font-size: 12px;
                    margin-bottom: 8px;
                }

                .preview-qr-box {
                    border: 2px solid #0a1510;
                    padding: 8px;
                    background: #ffffff;
                    border-radius: 12px;
                }

                .preview-qr-img {
                    width: 80px;
                    height: 80px;
                    display: block;
                }

                .a4-preview-footer {
                    border-top: 1px solid #e5e7eb;
                    padding-top: 6px;
                    font-size: 6px;
                    color: #6b7280;
                    display: flex;
                    justify-content: space-between;
                    font-weight: 700;
                }

                /* Compact card preview */
                .card-preview-frame {
                    width: 100%;
                    max-width: 280px;
                    background: #ffffff;
                    border: 1px solid #e5e7eb;
                    border-radius: 16px;
                    padding: 24px;
                    box-sizing: border-box;
                    color: #111827;
                    text-align: center;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                }

                .card-preview-frame h3 {
                    font-size: 15px;
                    font-weight: 800;
                    margin: 0 0 4px;
                }

                .card-preview-frame p {
                    font-size: 9px;
                    color: #6b7280;
                    margin: 0 0 16px;
                    line-height: 1.4;
                }

                .card-preview-qr {
                    display: inline-block;
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 10px;
                    padding: 8px;
                    margin-bottom: 12px;
                }

                .card-preview-qr img {
                    width: 90px;
                    height: 90px;
                    display: block;
                }

                /* Right panel info */
                .info-card {
                    background: var(--card-bg, rgba(255,255,255,0.02));
                    border: 1px solid var(--border-color, rgba(255,255,255,0.08));
                    border-radius: 20px;
                    padding: 24px;
                }

                .section-headline {
                    font-size: 16px;
                    font-weight: 800;
                    color: var(--text-main);
                    margin: 0 0 16px;
                }

                .button-group-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 12px;
                    margin-bottom: 20px;
                }

                @media (min-width: 576px) {
                    .button-group-grid {
                        grid-template-columns: 1fr 1fr;
                    }
                }

                .btn-action {
                    padding: 12px;
                    font-size: 12px;
                    font-weight: 700;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    color: #ffffff;
                    transition: all 0.2s ease;
                }

                .btn-action:hover {
                    transform: translateY(-1px);
                }

                .btn-action.success-theme {
                    background: linear-gradient(135deg, var(--emerald, #10b981) 0%, var(--emerald-dark, #059669) 100%);
                }

                .btn-action.outline-theme {
                    background: rgba(255,255,255,0.04);
                    border: 1px solid var(--border-color, rgba(255,255,255,0.08));
                    color: var(--text-main);
                }

                .btn-action.outline-theme:hover {
                    background: rgba(255,255,255,0.08);
                }

                .btn-action.wa-theme {
                    background: #25D366;
                    color: #ffffff;
                }

                .link-box {
                    background: rgba(255,255,255,0.02);
                    border: 1px solid var(--border-color, rgba(255,255,255,0.08));
                    border-radius: 12px;
                    padding: 12px;
                    font-family: monospace;
                    font-size: 11.5px;
                    color: var(--text-muted);
                    word-break: break-all;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 8px;
                }

                /* Stats strip */
                .stats-strip {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .stat-box {
                    background: var(--card-bg, rgba(255,255,255,0.02));
                    border: 1px solid var(--border-color, rgba(255,255,255,0.08));
                    border-radius: 16px;
                    padding: 18px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .stat-info {
                    display: flex;
                    flex-direction: column;
                }

                .stat-title {
                    font-size: 10px;
                    font-weight: 700;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                }

                .stat-value {
                    font-size: 24px;
                    font-weight: 900;
                    color: var(--text-main);
                    margin-top: 4px;
                }

                .stat-icon-wrapper {
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    background: rgba(16, 185, 129, 0.08);
                    color: var(--emerald, #10b981);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                /* Filters container */
                .filter-row {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 20px;
                }

                .search-input-wrapper {
                    position: relative;
                    flex-grow: 1;
                }

                .search-input-wrapper input {
                    width: 100%;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid var(--border-color, rgba(255,255,255,0.08));
                    border-radius: 10px;
                    padding: 8px 12px 8px 36px;
                    font-size: 12px;
                    color: var(--text-main);
                }

                .search-input-wrapper input:focus {
                    outline: none;
                    border-color: var(--emerald, #10b981);
                }

                .search-icon-pos {
                    position: absolute;
                    left: 12px;
                    top: 10px;
                    color: var(--text-muted);
                    font-size: 16px;
                }

                .filter-select {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid var(--border-color, rgba(255,255,255,0.08));
                    border-radius: 10px;
                    padding: 8px 16px;
                    font-size: 12px;
                    color: var(--text-main);
                }

                .filter-select:focus {
                    outline: none;
                    border-color: var(--emerald, #10b981);
                }

                .logs-scroll-area {
                    max-height: 520px;
                    overflow-y: auto;
                }

                /* Log row */
                .log-row-card {
                    background: rgba(255,255,255,0.01);
                    border: 1px solid var(--border-color, rgba(255,255,255,0.05));
                    border-radius: 16px;
                    padding: 16px;
                    margin-bottom: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    position: relative;
                }

                .log-row-card:hover {
                    background: rgba(255,255,255,0.02);
                }

                .log-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .log-stars {
                    display: flex;
                    gap: 2px;
                    color: #fbbf24;
                }

                .log-meta {
                    font-size: 10px;
                    color: var(--text-muted);
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                }

                .log-meta span {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }

                .log-text-content {
                    font-size: 13px;
                    color: var(--text-main);
                    line-height: 1.5;
                    padding-right: 40px;
                }

                .copy-btn-log {
                    position: absolute;
                    right: 16px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: rgba(255,255,255,0.03);
                    border: 1px solid var(--border-color, rgba(255,255,255,0.08));
                    border-radius: 8px;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-muted);
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .copy-btn-log:hover {
                    background: var(--emerald, #10b981);
                    color: #ffffff;
                    border-color: var(--emerald, #10b981);
                }
            `}</style>

            <div className="pane-header">
                <h1 className="pane-title">Google Maps Review System</h1>
                <p className="pane-subtitle">Increase Google business ratings by printing A4 posters or reception cards for visitors.</p>
            </div>

            {/* Navigation sub-tabs */}
            <div className="sub-tabs-container">
                <button 
                    onClick={() => setActiveSubTab("poster")} 
                    className={`sub-tab-btn ${activeSubTab === "poster" ? "active" : ""}`}
                >
                    <span className="material-icons-outlined" style={{ fontSize: '16px' }}>print</span>
                    Poster & Printables
                </button>
                <button 
                    onClick={() => setActiveSubTab("logs")} 
                    className={`sub-tab-btn ${activeSubTab === "logs" ? "active" : ""}`}
                >
                    <span className="material-icons-outlined" style={{ fontSize: '16px' }}>analytics</span>
                    Log & Device Stats
                </button>
            </div>

            {activeSubTab === "poster" && (
                <div className="poster-grid">
                    {/* Left: Design Preview */}
                    <div className="preview-card">
                        <div className="preview-title-bar">
                            <span className="preview-tag">Design Preview</span>
                            <div className="toggle-group">
                                <button 
                                    onClick={() => setPreviewType("a4")} 
                                    className={`toggle-btn ${previewType === "a4" ? "active" : ""}`}
                                >
                                    A4 Poster
                                </button>
                                <button 
                                    onClick={() => setPreviewType("card")} 
                                    className={`toggle-btn ${previewType === "card" ? "active" : ""}`}
                                >
                                    Card
                                </button>
                            </div>
                        </div>

                        {previewType === "a4" ? (
                            <div className="a4-preview-frame">
                                <div className="a4-preview-header">
                                    <span style={{ fontSize: '10px', display: 'block', fontWeight: 'bold' }}>Khelo Patna Elite Turf</span>
                                    <span style={{ fontSize: '5px', textTransform: 'uppercase', tracking: '1px', display: 'block' }}>Premium Turf & Academy</span>
                                </div>
                                <div className="a4-preview-body">
                                    <h3>Rate Our Turf!</h3>
                                    <div className="preview-stars">
                                        <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                                    </div>
                                    <div className="preview-qr-box">
                                        <img src={qrCodeUrl} alt="Review QR Code" className="preview-qr-img" />
                                    </div>
                                    <span style={{ fontSize: '6px', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '6px', color: '#0a1510' }}>
                                        Scan to Rate Us
                                    </span>
                                </div>
                                <div className="a4-preview-footer">
                                    <span>📍 Saguna More, Patna</span>
                                    <span>🌐 khelopatna.in</span>
                                </div>
                            </div>
                        ) : (
                            <div className="card-preview-frame">
                                <h3>Rate Us on Google!</h3>
                                <p>Scan this QR code to quickly rate and review your experience with Khelo Patna Elite Turf.</p>
                                <div className="card-preview-qr">
                                    <img src={qrCodeUrl} alt="Review QR Card" />
                                </div>
                                <div className="footer-text">⭐ Khelo Patna ⭐</div>
                            </div>
                        )}
                    </div>

                    {/* Right: Print Actions & Configs */}
                    <div className="info-card">
                        <h3 className="section-headline">Print Actions & Materials</h3>
                        
                        <div className="button-group-grid">
                            <button onClick={() => handlePrint("a4")} className="btn-action success-theme">
                                <span className="material-icons-outlined">print</span>
                                Print A4 Poster
                            </button>
                            <button onClick={() => handlePrint("card")} className="btn-action success-theme">
                                <span className="material-icons-outlined">picture_in_picture</span>
                                Print Desk Card
                            </button>
                        </div>

                        <div className="button-group-grid">
                            <button onClick={handleDownloadQR} className="btn-action outline-theme">
                                <span className="material-icons-outlined">download</span>
                                Download QR
                            </button>
                            <a 
                                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                                    `Hello! Please take a moment to share your feedback and review Khelo Patna Elite Turf. Scan or click the link to rate us: ${reviewUrl}`
                                )}`}
                                target="_blank" 
                                rel="noreferrer" 
                                className="btn-action wa-theme"
                            >
                                <span className="material-icons-outlined">share</span>
                                Share on WhatsApp
                            </a>
                        </div>

                        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color, rgba(255,255,255,0.08))', paddingTop: '20px' }}>
                            <h3 className="section-headline" style={{ fontSize: '14px', marginBottom: '8px' }}>Public Review Link</h3>
                            <div className="link-box">
                                <span className="material-icons-outlined" style={{ fontSize: '16px' }}>link</span>
                                <span>{reviewUrl}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeSubTab === "logs" && (
                <div>
                    {/* Stats strip */}
                    <div className="stats-strip">
                        <div className="stat-box">
                            <div className="stat-info">
                                <span className="stat-title">Total Generated</span>
                                <span className="stat-value">{stats?.total || 0}</span>
                            </div>
                            <div className="stat-icon-wrapper">
                                <span className="material-icons-outlined">star_rate</span>
                            </div>
                        </div>

                        <div className="stat-box">
                            <div className="stat-info">
                                <span className="stat-title">Mobile / Desktop</span>
                                <span className="stat-value" style={{ fontSize: '16px', marginTop: '10px' }}>
                                    📱 {stats?.devices?.Mobile || 0} &nbsp;|&nbsp; 💻 {stats?.devices?.Desktop || 0}
                                </span>
                            </div>
                            <div className="stat-icon-wrapper">
                                <span className="material-icons-outlined">devices</span>
                            </div>
                        </div>

                        <div className="stat-box">
                            <div className="stat-info">
                                <span className="stat-title">Ratings Mix</span>
                                <span className="stat-value" style={{ fontSize: '18px', marginTop: '8px' }}>
                                    5★: {stats?.ratings?.["5"] || 0} &nbsp;|&nbsp; 4★: {stats?.ratings?.["4"] || 0}
                                </span>
                            </div>
                            <div className="stat-icon-wrapper">
                                <span className="material-icons-outlined">thumbs_up_down</span>
                            </div>
                        </div>

                        <div className="stat-box">
                            <div className="stat-info">
                                <span className="stat-title">Top Unique IPs</span>
                                <span className="stat-value">{stats?.top_ips?.length || 0}</span>
                            </div>
                            <div className="stat-icon-wrapper">
                                <span className="material-icons-outlined">lan</span>
                            </div>
                        </div>
                    </div>

                    {/* Filter bar */}
                    <div className="filter-row">
                        <div className="search-input-wrapper">
                            <span className="material-icons-outlined search-icon-pos">search</span>
                            <input 
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search generated review content..."
                            />
                        </div>
                        <select 
                            value={ratingFilter}
                            onChange={(e) => setRatingFilter(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Ratings</option>
                            <option value="5">5 Stars</option>
                            <option value="4">4 Stars</option>
                        </select>
                    </div>

                    {/* Log list scroll area */}
                    <div className="logs-scroll-area">
                        {loadingLogs ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                                Loading generated reviews log...
                            </div>
                        ) : filteredLogs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                No generated reviews match the search criteria.
                            </div>
                        ) : (
                            filteredLogs.map((log, idx) => (
                                <div key={log.id || idx} className="log-row-card">
                                    <div className="log-card-header">
                                        <div className="log-stars">
                                            {Array.from({ length: Number(log.rating || 5) }).map((_, i) => (
                                                <span key={i} className="material-icons-outlined" style={{ fontSize: '16px' }}>star</span>
                                            ))}
                                        </div>
                                        <div className="log-meta">
                                            <span>
                                                <span className="material-icons-outlined" style={{ fontSize: '12px' }}>devices</span>
                                                {log.device || 'Desktop'}
                                            </span>
                                            <span>
                                                <span className="material-icons-outlined" style={{ fontSize: '12px' }}>dns</span>
                                                {log.browser || 'Other'} ({log.os || 'Other'})
                                            </span>
                                            <span>
                                                <span className="material-icons-outlined" style={{ fontSize: '12px' }}>schedule</span>
                                                {new Date(log.createdAt || log.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="log-text-content">{log.text}</div>

                                    <button 
                                        className="copy-btn-log"
                                        onClick={() => handleCopyText(log.text, idx)}
                                        title="Copy text"
                                    >
                                        <span className="material-icons-outlined" style={{ fontSize: '18px' }}>
                                            {copiedIdx === idx ? 'done' : 'content_copy'}
                                        </span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
