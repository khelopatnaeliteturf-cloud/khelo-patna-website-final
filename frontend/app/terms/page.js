"use client";

import React from 'react';
import Link from 'next/link';

export default function TermsAndConditionsPage() {
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
                top: '10%', right: '-10%', zIndex: 1, pointerEvents: 'none'
            }} />
            <div style={{
                position: 'absolute', width: '500px', height: '500px',
                background: 'radial-gradient(circle, rgba(52,211,153,0.05) 0%, transparent 75%)',
                bottom: '15%', left: '-10%', zIndex: 1, pointerEvents: 'none'
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
                            Terms & Conditions
                        </span>
                        <h1 style={{ fontFamily: 'Montserrat', fontWeight: 900, marginTop: '20px', fontSize: '2.2rem' }}>
                            Terms & Conditions
                        </h1>
                        <p style={{ color: 'var(--text-muted, #94A3B8)', fontSize: '0.85rem', marginTop: '10px' }}>
                            Last Updated: July 5, 2026
                        </p>
                    </div>

                    <div style={{ lineHeight: '1.75', fontSize: '0.92rem', color: '#E2E8F0', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        
                        <section>
                            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: '1.25rem', color: '#fff', marginBottom: '12px' }}>
                                1. Turf Bookings & Payment Terms
                            </h2>
                            <p>
                                When reserving slots at our Football Turf or Cricket Practice Nets:
                            </p>
                            <ul>
                                <li><strong>Confirmation:</strong> Bookings are successfully confirmed only upon payment. Advance payments default to 50% of the total slot rate (or full payment if selected).</li>
                                <li><strong>Rate Variations:</strong> Slots are subject to weekday/weekend tariff variations. Cricket Net rates are calculated dynamically based on the number of participants.</li>
                                <li><strong>Price Tampering:</strong> Any attempts to manipulate checkout prices will result in immediate cancellation of the order without refund, and a permanent ban from our services.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: '1.25rem', color: '#fff', marginBottom: '12px' }}>
                                2. Rescheduling & Cancellations Policy
                            </h2>
                            <p>
                                Administrative slot rescheduling and cancellations are managed according to the following guidelines:
                            </p>
                            <ul>
                                <li><strong>Rescheduling:</strong> Reschedules must be requested at least 24 hours prior to the original slot time and are subject to availability.</li>
                                <li><strong>Refunds:</strong> Cancelled slots with authorized refund flags are processed through our partner gateway (Cashfree) directly to the original payment source. Refund timelines are governed by bank clearance schedules.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: '1.25rem', color: '#fff', marginBottom: '12px' }}>
                                3. Academy Enrollment & Monthly Tuition Dues
                            </h2>
                            <p>
                                Students enrolled in the Cricket or Football academies agree to the following billing policies:
                            </p>
                            <ul>
                                <li><strong>Billing Schedule:</strong> Invoice dues are generated on the 1st of each month. Payments are due by the 5th day of each billing month.</li>
                                <li><strong>Payment Recording:</strong> Direct manual payments at the reception desk can be paid via Cash, UPI, Card, or Bank Transfer, and are logged with transaction metadata.</li>
                                <li><strong>Discounts/Waivers:</strong> Adjusted rates or promo waivers must be approved by the academy owner or branch manager and documented on the student's fee ledger.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: '1.25rem', color: '#fff', marginBottom: '12px' }}>
                                4. Facility Conduct & Rules
                            </h2>
                            <p>
                                To preserve safety and turf condition, all visitors and players must strictly adhere to the ground regulations:
                            </p>
                            <ul>
                                <li>Only flat-soled sports shoes, turf shoes, or molded rubber studs are allowed. Metal cleats/spikes are strictly prohibited on the turf surfaces.</li>
                                <li>Slot usage must start and end precisely according to the booked hours. Setting up or warming up on turf grounds before the slot start time is not permitted if other slots are active.</li>
                                <li>Vandalism, aggressive behavior, or damaging ground equipment (nets, poles, or pitch boundaries) will result in immediate eviction and liability for replacement costs.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: '1.25rem', color: '#fff', marginBottom: '12px' }}>
                                5. Liability Waiver
                            </h2>
                            <p>
                                Participation in athletic sports (Football, Cricket, Nets Practice) carries inherent physical risks. By entering the premises or enrolling in training, users, players, and parents waive liability for personal injury, accidental damage, or property loss incurred within the facility grounds.
                            </p>
                        </section>

                        <section>
                            <h2 style={{ fontFamily: 'Montserrat', fontWeight: 800, fontSize: '1.25rem', color: '#fff', marginBottom: '12px' }}>
                                6. Revisions & Updates
                            </h2>
                            <p>
                                We reserve the right to modify these Terms and Conditions at any time. Changes become effective immediately upon public posting on this page. Your continued use of turf bookings or academy training constitutes acceptance of updated terms.
                            </p>
                        </section>

                    </div>

                </div>
            </main>
        </div>
    );
}
