"use client";

import React from 'react';
import Link from 'next/link';

export default function ContactPage() {
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
            <div className="container" style={{ position: 'relative', zIndex: 2, marginBottom: '60px' }}>
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
                            Get in Touch
                        </h1>
                        <p style={{
                            fontSize: '1.2rem',
                            color: '#a1b4a8',
                            lineHeight: '1.6',
                            fontWeight: 300
                        }}>
                            Have questions or want to host an event? Reach out to us.
                        </p>
                    </div>
                </div>
            </div>

            {/* Contact Details Grid */}
            <div className="container" style={{ marginBottom: '60px', position: 'relative', zIndex: 2 }}>
                <div className="row g-4 justify-content-center">
                    <div className="col-md-4">
                        <div style={{
                            background: 'rgba(16, 185, 129, 0.04)',
                            border: '1px solid rgba(16, 185, 129, 0.1)',
                            borderRadius: '24px',
                            padding: '32px',
                            textAlign: 'center',
                            height: '100%',
                            backdropFilter: 'blur(20px)'
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
                                <span className="material-icons-outlined" style={{ color: '#00FF88', fontSize: '24px' }}>place</span>
                            </div>
                            <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: '#fff', fontWeight: 800, fontSize: '1.2rem', marginBottom: '12px' }}>Visit Us</h3>
                            <p style={{ color: '#a1b4a8', lineHeight: '1.6', fontSize: '0.9rem', margin: 0 }}>
                                Near ICICI Bank, Kumhrar,<br />Sandalpur Road, Patna – 800007
                            </p>
                        </div>
                    </div>

                    <div className="col-md-4">
                        <div style={{
                            background: 'rgba(16, 185, 129, 0.04)',
                            border: '1px solid rgba(16, 185, 129, 0.1)',
                            borderRadius: '24px',
                            padding: '32px',
                            textAlign: 'center',
                            height: '100%',
                            backdropFilter: 'blur(20px)'
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
                                <span className="material-icons-outlined" style={{ color: '#00FF88', fontSize: '24px' }}>phone</span>
                            </div>
                            <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: '#fff', fontWeight: 800, fontSize: '1.2rem', marginBottom: '12px' }}>Call Us</h3>
                            <p style={{ color: '#a1b4a8', lineHeight: '1.6', fontSize: '0.9rem', margin: '0 0 8px 0' }}>
                                (+91) 970 970 1400
                            </p>
                            <span style={{ fontSize: '0.75rem', color: '#5e7367' }}>Available 6:00 AM - 11:00 PM</span>
                        </div>
                    </div>

                    <div className="col-md-4">
                        <div style={{
                            background: 'rgba(16, 185, 129, 0.04)',
                            border: '1px solid rgba(16, 185, 129, 0.1)',
                            borderRadius: '24px',
                            padding: '32px',
                            textAlign: 'center',
                            height: '100%',
                            backdropFilter: 'blur(20px)'
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
                                <span className="material-icons-outlined" style={{ color: '#00FF88', fontSize: '24px' }}>mail</span>
                            </div>
                            <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: '#fff', fontWeight: 800, fontSize: '1.2rem', marginBottom: '12px' }}>Email Us</h3>
                            <p style={{ color: '#a1b4a8', lineHeight: '1.6', fontSize: '0.9rem', margin: 0 }}>
                                service@khelopatna.in
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Google Map & Business Hours */}
            <div className="container" style={{ marginBottom: '60px', position: 'relative', zIndex: 2 }}>
                <div className="row g-4">
                    <div className="col-lg-8">
                        <div style={{
                            background: 'rgba(255,255,255,0.01)',
                            border: '1px solid rgba(16, 185, 129, 0.15)',
                            borderRadius: '24px',
                            padding: '12px',
                            height: '424px',
                            overflow: 'hidden'
                        }}>
                            <iframe 
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3597.9!2d85.18!3d25.6!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sKhelo+Patna+Elite+Turf!5e0!3m2!1sen!2sin!4v1" 
                                width="100%" 
                                height="400" 
                                style={{ border: 0, borderRadius: '16px' }} 
                                allowFullScreen="" 
                                loading="lazy" 
                                referrerPolicy="no-referrer-when-downgrade"
                                title="Google Maps Location"
                            ></iframe>
                        </div>
                    </div>
                    <div className="col-lg-4">
                        <div style={{
                            background: 'rgba(16, 185, 129, 0.02)',
                            border: '1px solid rgba(16, 185, 129, 0.08)',
                            borderRadius: '24px',
                            padding: '36px',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                        }}>
                            <h3 style={{ fontFamily: 'Montserrat, sans-serif', color: '#fff', fontWeight: 800, fontSize: '1.4rem', marginBottom: '20px' }}>Business Hours</h3>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '12px' }}>
                                <span style={{ color: '#a1b4a8' }}>Monday - Sunday</span>
                                <span style={{ color: '#00FF88', fontWeight: 700 }}>6:00 AM - 11:00 PM</span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: '#5e7367', lineHeight: '1.5', margin: '10px 0 0 0' }}>
                                *Our phone lines and online booking portal are active 24/7. Slot bookings can be made in advance online.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions / Link Buttons */}
            <div className="container text-center" style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <Link href="/book" style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                        color: '#fff',
                        textDecoration: 'none',
                        padding: '12px 28px',
                        borderRadius: '10px',
                        fontWeight: 700,
                        transition: 'transform 0.2s ease'
                    }}>
                        Book Turf Slot
                    </Link>
                    <Link href="/enquiry" style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        textDecoration: 'none',
                        padding: '12px 28px',
                        borderRadius: '10px',
                        fontWeight: 700,
                        transition: 'transform 0.2s ease'
                    }}>
                        Send Inquiry
                    </Link>
                </div>
            </div>
        </div>
    );
}
