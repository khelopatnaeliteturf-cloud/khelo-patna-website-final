"use client";

import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
    return (
        <div style={{
            background: '#030806',
            color: '#fff',
            minHeight: '100vh',
            fontFamily: 'Space Grotesk, sans-serif',
            position: 'relative',
            overflowX: 'hidden',
            paddingBottom: '80px'
        }}>
            {/* Ambient Glowing Background Orbs */}
            <div style={{
                position: 'absolute', width: '400px', height: '400px',
                background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
                top: '10%', left: '-10%', zIndex: 1, pointerEvents: 'none'
            }} />
            <div style={{
                position: 'absolute', width: '500px', height: '500px',
                background: 'radial-gradient(circle, rgba(52,211,153,0.05) 0%, transparent 75%)',
                bottom: '15%', right: '-10%', zIndex: 1, pointerEvents: 'none'
            }} />

            {/* Premium Mini-Navbar */}
            <header style={{
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                background: 'rgba(3, 8, 6, 0.8)',
                backdropFilter: 'blur(30px) saturate(180%)',
                position: 'sticky', top: 0, zIndex: 10
            }}>
                <div style={{
                    maxWidth: '1000px', margin: '0 auto', padding: '16px 20px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src="/logo.png" alt="Logo" style={{ height: '30px' }} />
                        <span style={{ fontFamily: 'Montserrat', fontWeight: 900, fontSize: '1rem', color: '#fff', letterSpacing: '1px' }}>
                            KHELO<span style={{ color: 'var(--neon, #10B981)' }}>PATNA</span>
                        </span>
                    </Link>
                    <Link href="/" className="btn-secondary-stripe py-1 px-3" style={{ fontSize: '0.8rem', textDecoration: 'none' }}>
                        Back to Home
                    </Link>
                </div>
            </header>

            {/* Document Content Card */}
            <main style={{ maxWidth: '900px', margin: '60px auto 0 auto', padding: '0 20px', position: 'relative', zIndex: 2 }}>
                <div className="card-premium p-4 p-md-5" style={{ background: 'rgba(10, 21, 16, 0.72)', border: '1px solid rgba(255,255,255,0.04)' }}>
                    
                    <div className="text-center mb-5">
                        <span style={{
                            background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(52,211,153,0.05))',
                            border: '1px solid rgba(16,185,129,0.2)',
                            color: '#34D399', fontSize: '0.72rem', fontWeight: 700,
                            padding: '6px 16px', borderRadius: '50px', letterSpacing: '2px', textTransform: 'uppercase'
                        }}>
                            Privacy Policy
                        </span>
                        <h1 style={{ fontFamily: 'Montserrat', fontWeight: 900, marginTop: '20px', fontSize: '2.2rem' }}>
                            Privacy Policy
                        </h1>
                        <p style={{ color: 'var(--text-muted, #94A3B8)', fontSize: '0.85rem', marginTop: '10px' }}>
                            Last Updated: July 5, 2026
                        </p>
                    </div>

                    <div style={{ lineHeight: '1.75', fontSize: '0.92rem', color: '#E2E8F0', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        
                        <section>
                            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: '1.25rem', color: '#fff', marginBottom: '12px' }}>
                                1. Information We Collect
                            </h2>
                            <p>
                                At KheloPatna Elite Sports & Turf, we collect information you provide directly to us when booking slots, registering for academies, or making inquiries. This includes:
                            </p>
                            <ul>
                                <li><strong>Personal Identification Details:</strong> Name, email address, phone number, and WhatsApp number.</li>
                                <li><strong>Academy Enrolment Info:</strong> Student registration details, date of birth, gender, blood group, parent/guardian contact, current residential address, and uploaded proof documents (Aadhaar Card, Birth Certificate, Medical Certificate).</li>
                                <li><strong>Transaction & Payment Information:</strong> Payment reference IDs, billing logs, and transaction status logs. We do not store credit card numbers directly; all payment checkouts are securely processed by our third-party partner, Cashfree.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: '1.25rem', color: '#fff', marginBottom: '12px' }}>
                                2. How We Use Your Information
                            </h2>
                            <p>
                                We utilize the collected data to operate our facility, handle scheduling reservations, and send real-time confirmations, including:
                            </p>
                            <ul>
                                <li>Processing and validating online slot booking reservations.</li>
                                <li>Managing student cohorts, batches, and coaching allocations.</li>
                                <li>Forwarding automatic transaction notifications, slot details, and invoices via WhatsApp and Email.</li>
                                <li>Preventing booking conflicts, unauthorized reschedules, and price tampering.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: '1.25rem', color: '#fff', marginBottom: '12px' }}>
                                3. Information Sharing & Third Parties
                            </h2>
                            <p>
                                We respect your privacy. We do not sell or lease your personal information to third parties. We share data only to the extent necessary to deliver our services:
                            </p>
                            <ul>
                                <li><strong>Payment Processing:</strong> Sharing invoice and billing metadata with Cashfree to complete payment checkouts securely.</li>
                                <li><strong>Communication Gateways:</strong> Integrating with secure SMS/WhatsApp API channels to deliver instant booking confirmations and receipts.</li>
                                <li><strong>Cloud Storage:</strong> Document uploads (Aadhaar, proof files) are securely processed and stored via Cloudinary storage.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: '1.25rem', color: '#fff', marginBottom: '12px' }}>
                                4. Security & Data Protection
                            </h2>
                            <p>
                                We employ administrative, logical, and physical security measures to protect your database records. Uploaded identity files are securely hosted, and backend transactions strictly enforce JWT authentication and role-based authority. However, no database over the internet can be guaranteed 100% secure; please protect your portal credentials accordingly.
                            </p>
                        </section>

                        <section>
                            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: '1.25rem', color: '#fff', marginBottom: '12px' }}>
                                5. Your Choices & Consent
                            </h2>
                            <p>
                                By utilizing our booking widgets or submitting academy intake forms, you consent to the collection and processing of your details as described in this policy. You have the right to query, correct, or request the deletion of your customer records by contacting us at our official hotline or service email.
                            </p>
                        </section>

                        <section>
                            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: '1.25rem', color: '#fff', marginBottom: '12px' }}>
                                6. Contact Us
                            </h2>
                            <p>
                                If you have questions regarding this Privacy Policy, please contact us:
                            </p>
                            <p style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '8px', fontSize: '0.88rem' }}>
                                <strong>KheloPatna Elite Sports & Turf</strong><br />
                                Kumhrar, Sandalpur Road, Near ICICI Bank, Patna – 800006, Bihar<br />
                                <strong>Email:</strong> service@khelopatna.in<br />
                                <strong>Phone:</strong> (+91) 970 970 1400
                            </p>
                        </section>

                    </div>

                </div>
            </main>
        </div>
    );
}
