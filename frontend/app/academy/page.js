"use client";

import React from 'react';
import Link from 'next/link';

export default function AcademyPage() {
    return (
        <div style={{
            minHeight: '100vh',
            background: '#040609',
            color: '#e8f0ea',
            padding: '40px 20px 80px 20px',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: 'Poppins, sans-serif'
        }}>
            {/* Header / Navigation */}
            <div className="container" style={{ marginBottom: '60px' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '20px 0',
                    borderBottom: '1px solid rgba(16, 185, 129, 0.1)'
                }}>
                    <Link href="/" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        textDecoration: 'none'
                    }}>
                        <img src="/logo.png" alt="Logo" style={{ height: '36px', width: 'auto' }} />
                        <span style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontWeight: 900,
                            fontSize: '1.2rem',
                            color: '#fff',
                            letterSpacing: '1px'
                        }}>
                            KHELO<span style={{ color: '#00FF88' }}>PATNA</span>
                        </span>
                    </Link>
                    <Link href="/" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#00FF88',
                        textDecoration: 'none',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        transition: 'opacity 0.2s ease'
                    }} className="hover-opacity">
                        <span className="material-icons-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
                        Back to Home
                    </Link>
                </div>
            </div>

            {/* Hero Section */}
            <div className="container" style={{ position: 'relative', zIndex: 2, marginBottom: '80px' }}>
                <div className="row justify-content-center text-center">
                    <div className="col-lg-8">
                        <h1 style={{
                            fontFamily: 'Montserrat, sans-serif',
                            fontSize: '3.5rem',
                            fontWeight: 900,
                            letterSpacing: '-0.02em',
                            marginBottom: '20px',
                            background: 'linear-gradient(135deg, #00FF88 0%, #10b981 50%, #34d399 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            Training Academy
                        </h1>
                        <p style={{
                            fontSize: '1.25rem',
                            color: '#a1b4a8',
                            lineHeight: '1.6',
                            fontWeight: 300,
                            marginBottom: '30px'
                        }}>
                            Train Today. Lead Tomorrow. Professional coaching programs for budding sports stars in Patna.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            <Link href="/enquiry" style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                                color: '#fff',
                                textDecoration: 'none',
                                padding: '14px 32px',
                                borderRadius: '12px',
                                fontWeight: 700,
                                fontSize: '1rem',
                                transition: 'transform 0.2s ease',
                                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)'
                            }}>
                                Join Academy (Enquire)
                            </Link>
                            <Link href="/academy/pay-fees" style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#00FF88',
                                textDecoration: 'none',
                                padding: '14px 32px',
                                borderRadius: '12px',
                                fontWeight: 700,
                                fontSize: '1rem',
                                transition: 'transform 0.2s ease'
                            }}>
                                Pay Monthly Fees
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Programs Offered */}
            <div className="container" style={{ marginBottom: '80px', position: 'relative', zIndex: 2 }}>
                <h2 style={{ fontFamily: 'Montserrat, sans-serif', color: '#fff', fontWeight: 800, textAlign: 'center', marginBottom: '40px', fontSize: '2rem' }}>
                    Coaching Programs
                </h2>
                <div className="row g-4">
                    {[
                        { icon: "sports_cricket", title: "Cricket Coaching", desc: "Certified coaches offering specialized batting, bowling, and fielding analysis. Under-12, Under-16, and open batches." },
                        { icon: "sports_soccer", title: "Football Training", desc: "Build technical agility, tactical positioning, and teamwork on professional turf under guidance of certified head coaches." },
                        { icon: "fitness_center", title: "Fitness & Conditioning", desc: "Special focus on youth athletic development including strength, core stability, stamina, and injury prevention techniques." },
                        { icon: "emoji_events", title: "Regular Tournaments", desc: "Get platform exposure by playing in regular inter-academy league matches and club-level state tournaments." }
                    ].map((prog, idx) => (
                        <div key={idx} className="col-md-6 col-lg-3">
                            <div style={{
                                background: 'rgba(16, 185, 129, 0.04)',
                                border: '1px solid rgba(16, 185, 129, 0.1)',
                                borderRadius: '24px',
                                padding: '30px',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div style={{
                                    display: 'inline-flex',
                                    width: '48px',
                                    height: '48px',
                                    background: 'rgba(0, 255, 136, 0.1)',
                                    borderRadius: '12px',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '20px'
                                }}>
                                    <span className="material-icons-outlined" style={{ color: '#00FF88', fontSize: '24px' }}>{prog.icon}</span>
                                </div>
                                <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: '#fff', fontWeight: 800, fontSize: '1.2rem', marginBottom: '12px' }}>{prog.title}</h3>
                                <p style={{ color: '#a1b4a8', lineHeight: '1.6', fontSize: '0.85rem', margin: 0, flexGrow: 1 }}>{prog.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Why Choose Us & Batch Timings */}
            <div className="container" style={{ marginBottom: '60px', position: 'relative', zIndex: 2 }}>
                <div className="row g-5">
                    <div className="col-lg-6">
                        <div style={{
                            background: 'rgba(255,255,255,0.01)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '24px',
                            padding: '40px'
                        }}>
                            <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: '#fff', fontWeight: 800, fontSize: '1.6rem', marginBottom: '24px' }}>Academy Highlights</h3>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {[
                                    { icon: "verified_user", title: "Certified Professional Coaches", desc: "Guidance under former state and national level players." },
                                    { icon: "schedule", title: "Flexible Batch Timings", desc: "Batches designed to accommodate school and college hours." },
                                    { icon: "sports", title: "Ultra-Premium Turf Facility", desc: "No delays due to rain or mud; train in a world-class indoor arena." },
                                    { icon: "analytics", title: "Regular Performance Reports", desc: "Quarterly evaluations, fitness assessments, and parent-coach meetings." }
                                ].map((hl, idx) => (
                                    <li key={idx} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                                        <span className="material-icons-outlined" style={{ color: '#00FF88', fontSize: '22px', marginTop: '2px' }}>{hl.icon}</span>
                                        <div>
                                            <h4 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, margin: '0 0 4px 0' }}>{hl.title}</h4>
                                            <p style={{ color: '#a1b4a8', fontSize: '0.8rem', margin: 0 }}>{hl.desc}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div style={{
                            background: 'rgba(16, 185, 129, 0.02)',
                            border: '1px solid rgba(16, 185, 129, 0.08)',
                            borderRadius: '24px',
                            padding: '40px',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                        }}>
                            <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: '#fff', fontWeight: 800, fontSize: '1.6rem', marginBottom: '24px' }}>Batch Timings</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                {[
                                    { label: "Morning Batch", hours: "6:00 AM - 8:00 AM" },
                                    { label: "Afternoon Batch", hours: "3:00 PM - 5:00 PM" },
                                    { label: "Evening Batch", hours: "5:00 PM - 7:00 PM" }
                                ].map((batch, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <span style={{ color: '#a1b4a8', fontWeight: 600 }}>{batch.label}</span>
                                        <span style={{ color: '#00FF88', fontWeight: 700 }}>{batch.hours}</span>
                                    </div>
                                ))}
                            </div>
                            <p style={{ fontSize: '0.78rem', color: '#5e7367', marginTop: '20px', lineHeight: '1.5' }}>
                                *Timings can be selected during enrollment subject to batch slot availability. Academy operates 6 days a week (closed on Mondays).
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
