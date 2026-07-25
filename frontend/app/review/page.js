"use client";

import React, { useState } from 'react';
import { getBackendUrl } from '../lib/backendUrl';

const BACKEND_URL = getBackendUrl();
const GOOGLE_MAPS_URL = "https://g.page/r/CTxYinspu53uEBM/review";

export default function ReviewHub() {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [reviewText, setReviewText] = useState("");
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState("");

    const handleRatingSelect = async (selectedRating) => {
        setRating(selectedRating);
        setLoading(true);
        setCopied(false);
        setReviewText("");
        setError("");

        try {
            const res = await fetch(`${BACKEND_URL}/api/generate-maps-review`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ rating: selectedRating })
            });

            if (!res.ok) {
                throw new Error("Failed to generate review");
            }

            const data = await res.json();
            if (data && data.text) {
                setReviewText(data.text);
            } else {
                throw new Error("Empty review text received");
            }
        } catch (err) {
            console.error("Error generating review text:", err);
            // Fallbacks in client
            const clientFallbacks = {
                5: "Outstanding indoor sports arena! The staff and management are extremely polite, cooperative, and professional. Played football last night under the LED lights with high net ceiling height. Highly recommend Khelo Patna Elite Turf!",
                4: "Very good turf ground with extremely polite and cooperative staff. Wide cricket practice nets and high ceiling height. Easy slot scheduling!",
                3: "Good turf ground with polite management and supportive coaches. Recommended for regular slot matches.",
                2: "The turf pitch quality is good and staff is polite, but weekend prime slots book out fast.",
                1: "Decent ground quality, hope they add more evening time slots."
            };
            setReviewText(clientFallbacks[selectedRating] || clientFallbacks[5]);
            setError("Using backup draft. Please proceed to copy and paste.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopyAndRedirect = () => {
        if (!reviewText) return;

        navigator.clipboard.writeText(reviewText);
        setCopied(true);

        // Redirect to Google Maps in a new tab after a brief delay
        setTimeout(() => {
            window.open(GOOGLE_MAPS_URL, "_blank", "noopener,noreferrer");
        }, 1000);
    };

    return (
        <div className="review-hub-page">
            <style jsx global>{`
                .review-hub-page {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(to bottom, #030806, #0a1510);
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    position: relative;
                    overflow: hidden;
                    padding: 24px 16px;
                }

                .glass-card {
                    position: relative;
                    width: 100%;
                    max-width: 480px;
                    background: rgba(10, 20, 16, 0.72);
                    backdrop-filter: blur(35px) saturate(220%);
                    -webkit-backdrop-filter: blur(35px) saturate(220%);
                    border: 1px solid rgba(16, 185, 129, 0.15);
                    border-radius: 24px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(16, 185, 129, 0.05);
                    padding: 32px 24px;
                    text-align: center;
                    z-index: 10;
                    transition: transform 0.3s ease;
                }

                .glow-orb-purple {
                    position: absolute;
                    top: 15%;
                    left: 20%;
                    width: 250px;
                    height: 250px;
                    background: radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%);
                    filter: blur(40px);
                    pointer-events: none;
                    z-index: 1;
                }

                .glow-orb-green {
                    position: absolute;
                    bottom: 15%;
                    right: 20%;
                    width: 300px;
                    height: 300px;
                    background: radial-gradient(circle, rgba(52, 211, 153, 0.08) 0%, transparent 70%);
                    filter: blur(50px);
                    pointer-events: none;
                    z-index: 1;
                }

                .badge-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 60px;
                    height: 60px;
                    background: rgba(16, 185, 129, 0.1);
                    border: 1px solid rgba(16, 185, 129, 0.2);
                    border-radius: 50%;
                    color: #10b981;
                    margin-bottom: 20px;
                    box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
                }

                .title {
                    font-size: 26px;
                    font-weight: 800;
                    color: #ffffff;
                    margin-bottom: 8px;
                    letter-spacing: -0.5px;
                }

                .subtitle {
                    font-size: 14px;
                    color: rgba(255, 255, 255, 0.6);
                    max-width: 340px;
                    margin: 0 auto 30px;
                    line-height: 1.5;
                }

                .star-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    margin-bottom: 30px;
                }

                .star-btn {
                    background: none;
                    border: none;
                    padding: 4px;
                    cursor: pointer;
                    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .star-btn:hover {
                    transform: scale(1.25);
                }

                .star-icon {
                    font-size: 40px;
                    transition: color 0.2s ease, text-shadow 0.2s ease;
                }

                .star-icon.active {
                    color: #fbbf24;
                    text-shadow: 0 0 10px rgba(251, 191, 36, 0.4);
                }

                .star-icon.inactive {
                    color: rgba(255, 255, 255, 0.2);
                }

                .loader-container {
                    padding: 20px 0;
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 13px;
                }

                .spinner {
                    display: inline-block;
                    width: 32px;
                    height: 32px;
                    border: 3px solid rgba(16, 185, 129, 0.1);
                    border-radius: 50%;
                    border-top-color: #10b981;
                    animation: spin 1s ease-in-out infinite;
                    margin-bottom: 12px;
                }

                .draft-container {
                    text-align: left;
                    animation: fadeInSlide 0.4s ease forwards;
                }

                .draft-label {
                    font-size: 11px;
                    font-weight: 700;
                    color: rgba(255, 255, 255, 0.4);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 8px;
                    display: block;
                }

                .draft-textarea {
                    width: 100%;
                    min-height: 120px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 14px;
                    font-size: 14px;
                    color: #ffffff;
                    line-height: 1.6;
                    resize: vertical;
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                }

                .draft-textarea:focus {
                    outline: none;
                    border-color: rgba(16, 185, 129, 0.5);
                    box-shadow: 0 0 15px rgba(16, 185, 129, 0.15);
                }

                .action-btn {
                    width: 100%;
                    padding: 14px 20px;
                    border-radius: 16px;
                    font-weight: 700;
                    font-size: 14px;
                    border: none;
                    color: #ffffff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    cursor: pointer;
                    margin-top: 20px;
                    transition: all 0.2s ease;
                    box-shadow: 0 10px 20px rgba(16, 185, 129, 0.15);
                }

                .action-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 12px 24px rgba(16, 185, 129, 0.25);
                }

                .action-btn.primary {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                }

                .action-btn.success {
                    background: linear-gradient(135deg, #059669 0%, #047857 100%);
                    box-shadow: 0 10px 20px rgba(5, 150, 105, 0.15);
                }

                .instructions-panel {
                    margin-top: 20px;
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    padding: 16px;
                    font-size: 11.5px;
                    line-height: 1.6;
                    color: rgba(255, 255, 255, 0.5);
                }

                .instructions-title {
                    font-weight: 700;
                    color: rgba(255, 255, 255, 0.7);
                    display: block;
                    margin-bottom: 6px;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @keyframes fadeInSlide {
                    from {
                        opacity: 0;
                        transform: translateY(12px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>

            <div className="glow-orb-purple" />
            <div className="glow-orb-green" />

            <div className="glass-card">
                <div className="badge-icon">
                    <span className="material-icons-outlined" style={{ fontSize: '32px' }}>star</span>
                </div>

                <h1 className="title">Review Hub</h1>
                <p className="subtitle">
                    Your feedback drives us forward! Select a rating below to write a Google review for Khelo Patna Elite Turf.
                </p>

                {/* Stars Grid */}
                <div className="star-container">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            className="star-btn"
                            onClick={() => handleRatingSelect(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            title={`${star} Star${star > 1 ? 's' : ''}`}
                        >
                            <span 
                                className={`star-icon material-icons-outlined ${
                                    star <= (hoverRating || rating) ? 'active' : 'inactive'
                                }`}
                            >
                                star
                            </span>
                        </button>
                    ))}
                </div>

                {/* Loading spinner */}
                {loading && (
                    <div className="loader-container">
                        <div className="spinner" />
                        <div>Generating unique review...</div>
                    </div>
                )}

                {/* Review Text Area & CTA */}
                {reviewText && !loading && (
                    <div className="draft-container">
                        <label className="draft-label">Generated Draft (Edit if you like)</label>
                        <textarea
                            className="draft-textarea"
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder="Drafting your review..."
                        />

                        {error && (
                            <div className="text-warning text-center mt-2" style={{ fontSize: '11px' }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleCopyAndRedirect}
                            className={`action-btn ${copied ? 'success' : 'primary'}`}
                        >
                            {copied ? (
                                <>
                                    <span className="material-icons-outlined">done</span>
                                    Copied! Opening Google Maps...
                                </>
                            ) : (
                                <>
                                    <span className="material-icons-outlined">content_copy</span>
                                    Copy Review & Open Google Maps
                                    <span className="material-icons-outlined" style={{ fontSize: '16px' }}>open_in_new</span>
                                </>
                            )}
                        </button>

                        <div className="instructions-panel">
                            <span className="instructions-title">💡 How it works:</span>
                            1. Select a rating star and click the button to copy the review.<br />
                            2. Google Maps review page will open in a new tab.<br />
                            3. Select stars on Google Maps, paste (Ctrl+V or tap and hold), and hit publish!
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
