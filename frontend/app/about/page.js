"use client";

import React from 'react';
import Link from 'next/link';

export default function AboutPage() {
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
                            fontSize: '3rem',
                            fontWeight: 900,
                            letterSpacing: '-0.02em',
                            marginBottom: '20px',
                            background: 'linear-gradient(135deg, #00FF88 0%, #10b981 50%, #34d399 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>
                            About KheloPatna Elite Turf
                        </h1>
                        <p style={{
                            fontSize: '1.2rem',
                            color: '#a1b4a8',
                            lineHeight: '1.6',
                            fontWeight: 300
                        }}>
                            Patna's premier indoor sports arena offering ultra-premium turfs and world-class training facilities.
                        </p>
                    </div>
                </div>
            </div>

            {/* Our Story & Stats */}
            <div className="container" style={{ marginBottom: '80px', position: 'relative', zIndex: 2 }}>
                <div className="row g-5 align-items-center">
                    <div className="col-lg-6">
                        <div style={{
                            background: 'rgba(16, 185, 129, 0.04)',
                            border: '1px solid rgba(16, 185, 129, 0.1)',
                            borderRadius: '24px',
                            padding: '40px',
                            backdropFilter: 'blur(20px)'
                        }}>
                            {/* SDPS x KheloPatna Co-Branding Logo Badge */}
                            <div style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '12px', 
                                background: 'linear-gradient(135deg, rgba(8, 16, 12, 0.7), rgba(16, 185, 129, 0.12))', 
                                border: '1px solid rgba(16, 185, 129, 0.35)', 
                                padding: '8px 18px', 
                                borderRadius: '30px', 
                                marginBottom: '20px',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                flexWrap: 'wrap'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff', fontSize: '0.65rem', border: '1.5px solid #60A5FA' }}>
                                        SDPS
                                    </div>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.5px' }}>S.D. PUBLIC SCHOOL</span>
                                </div>

                                <span style={{ fontSize: '0.82rem', color: '#00FF88', fontWeight: 900 }}>✖️</span>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <img src="/logo.png" alt="KheloPatna" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#00FF88', letterSpacing: '0.5px' }}>ELITE TURF PATNA</span>
                                </div>
                            </div>

                            <h2 style={{
                                fontFamily: 'Montserrat, sans-serif',
                                color: '#fff',
                                fontWeight: 800,
                                marginBottom: '20px',
                                fontSize: '1.8rem'
                            }}>
                                Our Story
                            </h2>
                            <p style={{ color: '#a1b4a8', lineHeight: '1.8', fontSize: '0.95rem', marginBottom: '20px' }}>
                                Established in association with the prestigious <strong>S.D. Public School, Kumhrar</strong>, KheloPatna Elite Turf was born out of a passion to deliver premium sports infrastructure to the heart of Bihar.
                            </p>
                            <p style={{ color: '#a1b4a8', lineHeight: '1.8', fontSize: '0.95rem' }}>
                                We feature dual high-performance indoor arenas catering to both football enthusiasts and cricket players. Offering professional bowling machines, certified coaching, and automated slot booking, we bridge the gap between amateur play and professional sports.
                            </p>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="row g-4">
                            {[
                                { val: "2", label: "Premium Arenas", desc: "Dedicated Football & Cricket" },
                                { val: "500+", label: "Monthly Players", desc: "Active community of players" },
                                { val: "10+", label: "Expert Coaches", desc: "Guiding the next generation" },
                                { val: "365", label: "Days Open", desc: "Play anytime, morning to night" }
                            ].map((stat, idx) => (
                                <div key={idx} className="col-sm-6">
                                    <div style={{
                                        background: 'rgba(255, 255, 255, 0.02)',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                        borderRadius: '20px',
                                        padding: '24px',
                                        textAlign: 'center',
                                        transition: 'transform 0.3s ease, border-color 0.3s ease'
                                    }} className="stat-card">
                                        <div style={{
                                            fontSize: '2.5rem',
                                            fontWeight: 800,
                                            color: '#00FF88',
                                            marginBottom: '8px',
                                            fontFamily: 'Space Grotesk, monospace'
                                        }}>{stat.val}</div>
                                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '1rem', marginBottom: '4px' }}>{stat.label}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#5e7367' }}>{stat.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mission & Vision */}
            <div className="container" style={{ marginBottom: '80px', position: 'relative', zIndex: 2 }}>
                <div className="row g-4">
                    <div className="col-md-6">
                        <div style={{
                            background: 'rgba(16, 185, 129, 0.02)',
                            border: '1px solid rgba(16, 185, 129, 0.08)',
                            borderRadius: '24px',
                            padding: '36px',
                            height: '100%'
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
                                <span className="material-icons-outlined" style={{ color: '#00FF88', fontSize: '24px' }}>sports_score</span>
                            </div>
                            <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: '#fff', fontWeight: 800, marginBottom: '12px' }}>Our Mission</h3>
                            <p style={{ color: '#a1b4a8', lineHeight: '1.7', fontSize: '0.9rem', margin: 0 }}>
                                To make premium sports infrastructure accessible to every child, youth, and adult in Patna. We aim to nurture local talent and encourage fitness through world-class cricket and football facilities.
                            </p>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div style={{
                            background: 'rgba(16, 185, 129, 0.02)',
                            border: '1px solid rgba(16, 185, 129, 0.08)',
                            borderRadius: '24px',
                            padding: '36px',
                            height: '100%'
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
                                <span className="material-icons-outlined" style={{ color: '#00FF88', fontSize: '24px' }}>visibility</span>
                            </div>
                            <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: '#fff', fontWeight: 800, marginBottom: '12px' }}>Our Vision</h3>
                            <p style={{ color: '#a1b4a8', lineHeight: '1.7', fontSize: '0.9rem', margin: 0 }}>
                                To become the top destination for training and sports entertainment in Bihar. We envision building a strong sporting culture by offering state-of-the-art facilities, certified coaching, and competitive leagues.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="container text-center" style={{ position: 'relative', zIndex: 2 }}>
                <div style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(4, 6, 9, 0.6) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.15)',
                    borderRadius: '30px',
                    padding: '60px 40px',
                    maxWidth: '800px',
                    margin: '0 auto'
                }}>
                    <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: '#fff', fontWeight: 800, fontSize: '2rem', marginBottom: '15px' }}>
                        Ready to Book Your Slot?
                    </h3>
                    <p style={{ color: '#a1b4a8', fontSize: '1rem', marginBottom: '30px', maxWidth: '500px', margin: '0 auto 30px auto' }}>
                        Experience the premium turf under elite lighting. Bring your team and start playing today!
                    </p>
                    <Link href="/book" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                        color: '#fff',
                        textDecoration: 'none',
                        padding: '14px 32px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        fontSize: '1rem',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)'
                    }} className="btn-book">
                        Book Arena Now
                        <span className="material-icons-outlined" style={{ fontSize: '18px' }}>sports_cricket</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
