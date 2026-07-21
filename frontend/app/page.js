"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { getBackendUrl } from './lib/backendUrl';

// Dynamic imports for heavy components to reduce initial bundle size
const ConfettiCanvas = dynamic(() => import('./components/ConfettiCanvas'), {
    ssr: false,
    loading: () => null
});

const TiltCard = dynamic(() => import('./components/TiltCard'), {
    ssr: false,
    loading: () => <div style={{ borderRadius: 'var(--radius-xl)' }} />
});

const BACKEND_URL = getBackendUrl();

export default function HomePage() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeSportTab, setActiveSportTab] = useState('football');
    const [isLoading, setIsLoading] = useState(true);
    const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
    const [visibleSections, setVisibleSections] = useState({});
    
    // Quick Reservation live states
    const [quickSlots, setQuickSlots] = useState([]);
    const [quickLoading, setQuickLoading] = useState(false);
    const [quickError, setQuickError] = useState('');
    const [selectedQuickSlots, setSelectedQuickSlots] = useState([]);
    
    // Testimonial state
    const [activeTestimonial, setActiveTestimonial] = useState(0);

    // Achievements stats counts
    const [stats, setStats] = useState({
        games: 0,
        students: 0,
        tournaments: 0,
        rating: 0
    });

    const testimonials = [
        {
            name: "Rajesh Kumar",
            role: "Cricket Academy Parent",
            quote: "The automated bowling machines and professional net facilities here are second to none in Bihar. My son's batting has improved tremendously under certified coaches.",
            rating: 5,
            avatar: "RK"
        },
        {
            name: "Amit Sen",
            role: "Weekend Football Player",
            quote: "Playing under the high-intensity LED floodlights feels like an international stadium. The synthetic turf is non-abrasive and very safe for fast-paced games.",
            rating: 5,
            avatar: "AS"
        },
        {
            name: "Sneha Roy",
            role: "Sports Enthusiast",
            quote: "Online slot reservation is seamless! The turf is premium, well-maintained, and they have excellent security and washroom facilities. Highly recommended!",
            rating: 5,
            avatar: "SR"
        }
    ];

    const highlights = [
        {
            title: "U-16 Academy Derby Match",
            category: "Football",
            duration: "03:45",
            views: "1.2k views",
            img: "/football_turf.png"
        },
        {
            title: "Elite T20 Tournament Finals",
            category: "Cricket",
            duration: "05:12",
            views: "2.5k views",
            img: "/cricket_nets.png"
        },
        {
            title: "Super 5s Weekend Cup",
            category: "Football",
            duration: "02:30",
            views: "890 views",
            img: "/hero-bg.png"
        },
        {
            title: "Under-19 Batting Masterclass",
            category: "Cricket",
            duration: "04:15",
            views: "1.7k views",
            img: "/cricket_nets.png"
        }
    ];

    const galleryImages = [
        { title: "Premium Pitch Surface", category: "Football Turf", img: "/football_turf.png" },
        { title: "Pro Bowling Nets", category: "Cricket Nets", img: "/cricket_nets.png" },
        { title: "Evening Floodlight View", category: "Stadium Lights", img: "/hero-bg.png" },
        { title: "Young Academy Stars", category: "Training", img: "/football_turf.png" },
        { title: "Interactive Match Records", category: "Analytics", img: "/cricket_nets.png" },
        { title: "Championship Celebration", category: "Events", img: "/hero-bg.png" }
    ];

    // Scroll handler
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Cursor tracking
    useEffect(() => {
        const handleMouseMove = (e) => {
            setCursorPos({ x: e.clientX, y: e.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Preloader delay
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    // Fetch slots for the home page's Quick Reservation
    useEffect(() => {
        let isMounted = true;
        const fetchQuickSlots = async () => {
            setQuickLoading(true);
            setQuickError('');
            try {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                const dateStr = `${yyyy}-${mm}-${dd}`;

                const url = `${BACKEND_URL}/api/available-slots?sport=${activeSportTab}&date=${dateStr}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error('Failed to fetch slots');
                const data = await res.json();
                
                if (isMounted && data.slots) {
                    const allSlots = data.slots;
                    const currentHour = today.getHours();

                    // Parse start hour and filter slots starting at or after the current hour
                    let filtered = allSlots.filter(slot => {
                        const start = parseInt(slot.value.split('-')[0], 10);
                        return start >= currentHour;
                    });

                    // If less than 6 slots left in the day, fall back to the last 6 slots of the day
                    if (filtered.length < 6) {
                        filtered = allSlots.slice(-6);
                    } else {
                        // Take the first 6 slots starting after the current hour
                        filtered = filtered.slice(0, 6);
                    }

                    setQuickSlots(filtered);
                    setSelectedQuickSlots([]); // reset selection
                }
            } catch (err) {
                console.error('Error fetching quick slots:', err);
                if (isMounted) {
                    setQuickError('Error loading slots');
                }
            } finally {
                if (isMounted) {
                    setQuickLoading(false);
                }
            }
        };

        fetchQuickSlots();
        return () => {
            isMounted = false;
        };
    }, [activeSportTab]);

    const handleQuickSlotClick = (slot) => {
        if (slot.booked || slot.blackout) return;
        
        if (selectedQuickSlots.includes(slot.value)) {
            setSelectedQuickSlots(selectedQuickSlots.filter(s => s !== slot.value));
        } else {
            setSelectedQuickSlots([...selectedQuickSlots, slot.value]);
        }
    };

    const calculateQuickTotal = () => {
        return selectedQuickSlots.reduce((sum, slotValue) => {
            const slot = quickSlots.find(s => s.value === slotValue);
            return sum + (slot ? slot.price : 0);
        }, 0);
    };

    const getSelectedSlotsText = () => {
        if (selectedQuickSlots.length === 0) return 'No Slots Selected';
        const times = selectedQuickSlots.map(v => {
            const match = quickSlots.find(qs => qs.value === v);
            return match ? match.text.split(' - ')[0] : '';
        }).filter(Boolean);
        return `${selectedQuickSlots.length} ${selectedQuickSlots.length === 1 ? 'Slot' : 'Slots'} (${times.join(', ')})`;
    };

    // Intersection observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setVisibleSections(prev => ({ ...prev, [entry.target.id]: true }));
                        
                        // Trigger stats counting if achievements section is visible
                        if (entry.target.id === 'achievements') {
                            animateStats();
                        }
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );
        document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    const animateStats = () => {
        const duration = 1800; // ms
        const steps = 60;
        const stepTime = duration / steps;
        
        let step = 0;
        const interval = setInterval(() => {
            step++;
            setStats({
                games: Math.floor((10000 / steps) * step),
                students: Math.floor((350 / steps) * step),
                tournaments: Math.floor((50 / steps) * step),
                rating: Number(((4.9 / steps) * step).toFixed(1))
            });
            if (step >= steps) {
                clearInterval(interval);
                setStats({ games: 10000, students: 350, tournaments: 50, rating: 4.9 });
            }
        }, stepTime);
    };

    const handleScrollTo = (e, id) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            const offset = 80;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = element.getBoundingClientRect().top;
            const offsetPosition = elementRect - bodyRect - offset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
        setMobileMenuOpen(false);
    };

    const sectionVisible = (id) => visibleSections[id] ? 'animate-fade-in' : '';

    return (
        <div style={{ background: 'var(--bg-void)', minHeight: '100vh', overflowX: 'hidden', position: 'relative' }}>
            
            {/* ═══ Cursor spotlight element ═══ */}
            <div className="cursor-spotlight d-none d-md-block" style={{ left: `${cursorPos.x}px`, top: `${cursorPos.y}px` }} />

            {/* ═══ Anniversary golden confetti celebration ═══ */}
            <ConfettiCanvas delay={1800} ambientSeconds={6} />

            {/* ═══ Ultra-Premium Animated Loading Screen ═══ */}
            <div className={`premium-loader-screen ${!isLoading ? 'fade-out' : ''}`}>
                <div className="logo-loader-wrapper animate-fade-in">
                    <div className="logo-loader-badge">
                        <img src="/logo.png" alt="Khelo Patna Logo" />
                    </div>
                    <div className="logo-loader-title">
                        KHELO<span>PATNA</span>
                    </div>
                    <div className="logo-loader-bar-bg">
                        <div className="logo-loader-bar-fill"></div>
                    </div>
                    <div className="logo-loader-subtitle">
                        Loading the Turf Environment for you…
                    </div>
                </div>
            </div>

            {/* ═══ Ambient beams & textures ─── */}
            <div className="stadium-beam stadium-beam--left" />
            <div className="stadium-beam stadium-beam--right" />
            <div className="floating-ball floating-ball--football" />
            <div className="floating-ball floating-ball--cricket" />

            {/* Ambient Liquid Orbs */}
            <div className="ambient-orb" style={{ position: 'fixed', top: '-10%', left: '-5%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0, 255, 136, 0.06) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0, animation: 'float-drift 30s ease-in-out infinite' }} />
            <div className="ambient-orb" style={{ position: 'fixed', bottom: '-15%', right: '-8%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0, 200, 255, 0.04) 0%, transparent 70%)', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0, animation: 'float-drift 25s ease-in-out infinite reverse' }} />
            <div className="ambient-orb" style={{ position: 'fixed', top: '40%', left: '50%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255, 215, 0, 0.03) 0%, transparent 70%)', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0, animation: 'float-drift 35s ease-in-out infinite' }} />

            {/* ═══ Sticky Navbar ═══ */}
            <nav style={{
                position: 'fixed',
                top: scrolled ? '0' : '12px',
                left: scrolled ? '0' : '50%',
                transform: scrolled ? 'none' : 'translateX(-50%)',
                width: scrolled ? '100%' : 'min(92%, 1200px)',
                background: scrolled
                    ? 'rgba(3, 8, 6, 0.85)'
                    : 'rgba(3, 8, 6, 0.6)',
                backdropFilter: 'blur(40px) saturate(200%)',
                WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                borderBottom: scrolled ? '1px solid rgba(255,255,255,0.04)' : 'none',
                border: scrolled ? undefined : '1px solid rgba(255,255,255,0.06)',
                borderRadius: scrolled ? '0' : 'var(--radius-xl)',
                padding: scrolled ? '14px 0' : '12px 0',
                zIndex: 1000,
                transition: 'all 0.5s var(--ease-spring)',
                boxShadow: scrolled
                    ? '0 4px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.02)'
                    : '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)'
            }}>
                <div className="container d-flex align-items-center justify-content-between">
                    <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="animated-turf-logo-container">
                            <img src="/logo.png" alt="Logo" className="animated-turf-logo-img" style={{ height: '42px', width: 'auto' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            <span className="logo-text" style={{
                                fontFamily: 'Montserrat', fontWeight: 900, fontSize: '1.2rem',
                                color: '#fff', letterSpacing: '1px', lineHeight: '1'
                            }}>
                                KHELO<span style={{ color: 'var(--neon)', textShadow: '0 0 15px rgba(0, 255, 136, 0.3)' }}>PATNA</span>
                            </span>
                            <span className="logo-subtext" style={{
                                fontSize: '0.52rem', fontFamily: 'Space Grotesk', textTransform: 'uppercase',
                                color: 'var(--gold)', letterSpacing: '3.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'
                            }}>
                                Elite Turf <span className="logo-badge" style={{ background: 'linear-gradient(135deg, var(--gold) 0%, #ffe066 100%)', color: '#000', padding: '1px 5px', borderRadius: '3px', fontSize: '0.45rem', fontWeight: 800, letterSpacing: '0.5px' }}>1ST YEAR</span>
                            </span>
                        </div>
                    </Link>

                    {/* Nav Links */}
                    <div className="d-none d-lg-flex align-items-center" style={{ gap: '4px' }}>
                        {['home', 'anniversary', 'about', 'facilities', 'academy', 'highlights', 'gallery', 'contact'].map(section => (
                            <a key={section} href={`#${section}`}
                               className="nav-link-custom"
                               onClick={(e) => handleScrollTo(e, section)}
                               style={{ fontSize: '0.74rem' }}
                            >
                                {section === 'anniversary' ? 'Anniversary' : section.charAt(0).toUpperCase() + section.slice(1)}
                            </a>
                        ))}
                        <Link href="/book" className="btn-premium" style={{ marginLeft: '12px', padding: '10px 24px', fontSize: '0.72rem' }}>
                            <span><span className="material-icons-outlined" style={{ fontSize: '13px', marginRight: '6px', verticalAlign: 'middle', display: 'inline-block' }}>bolt</span>Book Turf</span>
                        </Link>
                    </div>

                    {/* Mobile menu toggle */}
                    <button
                        className="d-lg-none"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle Navigation"
                        style={{
                            background: 'rgba(0, 255, 136, 0.06)', border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '12px', width: '44px', height: '44px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', cursor: 'pointer', transition: 'all 0.3s ease',
                            backdropFilter: 'blur(20px)'
                        }}
                    >
                        <span className="material-icons-outlined" style={{ fontSize: '22px' }}>
                            {mobileMenuOpen ? 'close' : 'menu'}
                        </span>
                    </button>
                </div>
            </nav>

            {/* Mobile Nav Overlay */}
            {mobileMenuOpen && (
                <div className="d-lg-none" style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh',
                    background: 'rgba(3, 8, 6, 0.97)',
                    backdropFilter: 'blur(40px) saturate(200%)', WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                    zIndex: 999, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '10px',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    {['home', 'anniversary', 'about', 'facilities', 'academy', 'highlights', 'gallery', 'contact'].map(section => (
                        <a key={section} href={`#${section}`}
                           onClick={(e) => handleScrollTo(e, section)}
                           style={{
                               color: section === 'anniversary' ? 'var(--gold)' : 'rgba(255,255,255,0.7)', fontFamily: 'Montserrat',
                               fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase',
                               letterSpacing: '0.1em', padding: '12px 30px',
                               textDecoration: 'none', transition: 'color 0.3s ease'
                           }}
                        >
                           {section === 'anniversary' ? 'Anniversary' : section}
                        </a>
                    ))}
                    <Link href="/book" className="btn-premium" style={{ marginTop: '20px', padding: '14px 40px' }}>
                        <span><span className="material-icons-outlined" style={{ fontSize: '14px', marginRight: '6px', verticalAlign: 'middle', display: 'inline-block' }}>bolt</span>Reserve Now</span>
                    </Link>
                </div>
            )}

            {/* ═══ 1. HERO SECTION ═══ */}
            <header id="home" style={{ paddingTop: '150px', paddingBottom: '100px', position: 'relative', overflow: 'hidden' }}>
                <div className="container">
                    <div className="row align-items-center g-5">
                        
                        {/* Hero Text Content */}
                        <div className="col-lg-7 animate-fade-in">
                            <div className="liquid-glass" style={{ marginBottom: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 18px', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(255, 215, 0, 0.45)', background: 'rgba(255, 215, 0, 0.04)', boxShadow: '0 0 20px rgba(255, 215, 0, 0.1), inset 0 1px 0 rgba(255,255,255,0.03)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', fontSize: '0.72rem', fontFamily: 'Space Grotesk', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--gold)' }}>
                                <span className="pulsate-dot" style={{ background: 'var(--gold)' }}></span>
                                <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '14px', height: '14px', color: 'var(--gold)', display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v3c0 2.44 1.72 4.48 4 4.9C7.84 15.39 9.8 16 12 16s4.16-.61 5-1.1c2.28-.42 4-2.46 4-4.9V7c0-1.1-.9-2-2-2zM5 10V7h2v3H5zm14 0h-2V7h2v3zm-7 8c-1.66 0-3 1.34-3 3h6c0-1.66-1.34-3-3-3z"/></svg> CELEBRATING 1 YEAR OF SPORTS EXCELLENCE
                            </div>

                            <h1 className="hero-title" style={{ marginBottom: '24px', fontFamily: 'Montserrat', fontWeight: 900 }}>
                                <span style={{
                                    background: 'linear-gradient(135deg, #ffffff 0%, #a0a0a0 100%)',
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                                }}>
                                    Patna's Premier
                                </span>
                                <br />
                                <span style={{
                                    background: 'linear-gradient(135deg, var(--neon) 0%, var(--cyan) 50%, var(--gold) 100%)',
                                    backgroundSize: '200% 200%',
                                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                    animation: 'gradient-flow 5s ease infinite',
                                    filter: 'drop-shadow(0 0 25px rgba(0, 255, 136, 0.2))'
                                }}>
                                    Football & Cricket Arena
                                </span>
                            </h1>

                            <p style={{
                                fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: '1.8',
                                maxWidth: '580px', marginBottom: '36px', fontFamily: 'Poppins'
                            }}>
                                Experience Bihar's first climate-controlled enclosed sports ecosystem. Fitted with FIFA-certified grass pitches, pro bowling machines, and automated speed recording systems. Built for professional training and recreational showdowns.
                            </p>

                            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '40px' }}>
                                <Link href="/book" className="btn-premium" style={{ padding: '16px 36px', fontSize: '0.8rem' }}>
                                    <span><span className="material-icons-outlined" style={{ fontSize: '14px', marginRight: '6px', verticalAlign: 'middle', display: 'inline-block' }}>bolt</span>Book Slots Now</span>
                                </Link>
                                <a href="#facilities" onClick={(e) => handleScrollTo(e, 'facilities')}
                                   className="btn-premium-border" style={{ padding: '16px 36px', fontSize: '0.8rem' }}>
                                    View Facilities
                                </a>
                            </div>

                            {/* Trust Badge Counters */}
                            <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.6rem', color: 'var(--neon)', fontFamily: 'Montserrat', fontWeight: 800, margin: 0 }}>24/7</h3>
                                    <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)' }}>Play Slots</span>
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.6rem', color: 'var(--cyan)', fontFamily: 'Montserrat', fontWeight: 800, margin: 0 }}>FIFA</h3>
                                    <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)' }}>Turf Grade</span>
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.6rem', color: 'var(--gold)', fontFamily: 'Montserrat', fontWeight: 800, margin: 0 }}>35 FT</h3>
                                    <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--text-muted)' }}>Bihar's Tallest Turf</span>
                                </div>
                            </div>
                        </div>

                        {/* Hero Right: Booking Card Preview */}
                        <div className="col-lg-5 animate-fade-in-delay-2">
                            <TiltCard maxTilt={5} style={{ borderRadius: 'var(--radius-xl)' }}>
                            <div className="liquid-glass-card" style={{ padding: '24px', backdropFilter: 'blur(40px) saturate(200%)', WebkitBackdropFilter: 'blur(40px) saturate(200%)', background: 'rgba(8, 16, 12, 0.55)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius-xl)', boxShadow: '0 30px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h3 style={{ fontSize: '1rem', margin: 0, fontFamily: 'Montserrat', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '16px', display: 'inline-block', verticalAlign: 'middle' }}>bolt</span> QUICK RESERVATION
                                    </h3>
                                    <span className="glass-badge" style={{ fontSize: '0.6rem', padding: '4px 10px' }}>PREVIEW</span>
                                </div>

                                {/* Tabs */}
                                <div style={{ display: 'flex', gap: '8px', padding: '4px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-pill)', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '20px' }}>
                                    <button onClick={() => setActiveSportTab('football')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 'var(--radius-pill)', background: activeSportTab === 'football' ? 'linear-gradient(135deg, var(--emerald), var(--emerald-dark))' : 'transparent', color: '#fff', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'Montserrat', cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><span className="material-icons-outlined" style={{ fontSize: '13px', display: 'inline-block' }}>sports_soccer</span> FOOTBALL</button>
                                    <button onClick={() => setActiveSportTab('cricket')} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: 'var(--radius-pill)', background: activeSportTab === 'cricket' ? 'linear-gradient(135deg, var(--emerald), var(--emerald-dark))' : 'transparent', color: '#fff', fontSize: '0.72rem', fontWeight: 700, fontFamily: 'Montserrat', cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><span className="material-icons-outlined" style={{ fontSize: '13px', display: 'inline-block' }}>sports_cricket</span> CRICKET</button>
                                </div>

                                {/* Live Slots Grid */}
                                {quickLoading ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', gap: '10px', marginBottom: '20px' }}>
                                        <div style={{ width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--neon)', borderRadius: '50%', animation: 'spin-border 1s infinite linear' }} />
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Loading live slots...</span>
                                    </div>
                                ) : quickError ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '140px', textAlign: 'center', marginBottom: '20px' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#ff4d4d' }}>{quickError}</span>
                                    </div>
                                ) : (
                                    <div className="grid-responsive-3" style={{ marginBottom: '20px' }}>
                                        {quickSlots.map((slot, index) => {
                                            const isSelected = selectedQuickSlots.includes(slot.value);
                                            let cardClass = 'slot-card available';
                                            let statusText = 'available';

                                            if (isSelected) {
                                                cardClass = 'slot-card selected';
                                                statusText = 'selected';
                                            } else if (slot.booked) {
                                                cardClass = 'slot-card booked';
                                                statusText = 'booked';
                                            } else if (slot.blackout) {
                                                cardClass = 'slot-card blackout';
                                                statusText = slot.reason || 'closed';
                                            }

                                            return (
                                                <div 
                                                    key={index} 
                                                    className={cardClass}
                                                    onClick={() => handleQuickSlotClick(slot)}
                                                >
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 600, display: 'block', color: '#fff', whiteSpace: 'nowrap' }}>
                                                        {slot.text.split(' - ')[0]}
                                                    </span>
                                                    <span style={{ fontSize: '0.52rem', textTransform: 'uppercase', display: 'block', color: isSelected || slot.booked ? '#fff' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={statusText}>
                                                        {statusText}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <div>
                                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>SELECTED SLOTS</span>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                                            {getSelectedSlotsText()}
                                        </span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>TOTAL AMOUNT</span>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--neon)', fontFamily: 'Montserrat' }}>
                                            ₹{calculateQuickTotal().toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </div>

                                <Link 
                                    href={`/book?sport=${activeSportTab}${selectedQuickSlots.length > 0 ? `&slots=${selectedQuickSlots.join(',')}` : ''}`} 
                                    className="btn-premium" 
                                    style={{ width: '100%', padding: '14px', fontSize: '0.78rem', textDecoration: 'none', display: 'block', textAlign: 'center' }}
                                >
                                    <span><span className="material-icons-outlined" style={{ fontSize: '14px', marginRight: '6px', verticalAlign: 'middle', display: 'inline-block' }}>bolt</span>GO TO BOOKING PAGE</span>
                                </Link>
                            </div>
                            </TiltCard>
                        </div>

                    </div>
                </div>
            </header>

            {/* Scroll Indicator */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingBottom: '30px', position: 'relative', zIndex: 5 }}>
                <a href="#anniversary" onClick={(e) => handleScrollTo(e, 'anniversary')} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.65rem', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600 }}>
                    <span>SCROLL DOWN</span>
                    <span className="material-icons-outlined" style={{ animation: 'bounce 2s infinite', fontSize: '18px', color: 'var(--neon)' }}>keyboard_double_arrow_down</span>
                </a>
            </div>

            {/* ═══ Anniversary Gold Marquee Ribbon ═══ */}
            <div className="anniversary-marquee" aria-hidden="true">
                <div className="anniversary-marquee__track">
                    {[0, 1].map(copy => (
                        <div key={copy} style={{ display: 'flex' }}>
                            {[
                                'Celebrating 1 Year of KheloPatna',
                                '10,000+ Games Played',
                                'Anniversary Offers Live',
                                "Patna's #1 Sports Arena",
                                '350+ Academy Students',
                                'FIFA-Grade Turf'
                            ].map((text, i) => (
                                <span key={i} className="anniversary-marquee__item">
                                    <span className="marquee-dot" />
                                    {text}
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══ 1.5. ANNIVERSARY SPECIAL SECTION ═══ */}
            <section id="anniversary" data-animate style={{ padding: '120px 0', background: 'radial-gradient(circle at 50% 50%, rgba(255, 215, 0, 0.08) 0%, transparent 75%)', position: 'relative', overflow: 'hidden' }}>
                {/* Embedded styles for million dollar site feel and animations */}
                <style dangerouslySetInnerHTML={{__html: `
                    @keyframes float-spark-1 {
                        0% { transform: translateY(0px) rotate(0deg) scale(1); opacity: 0.2; }
                        50% { transform: translateY(-40px) rotate(180deg) scale(1.2); opacity: 0.6; }
                        100% { transform: translateY(0px) rotate(360deg) scale(1); opacity: 0.2; }
                    }
                    @keyframes float-spark-2 {
                        0% { transform: translateY(0px) rotate(0deg) scale(1.2); opacity: 0.15; }
                        50% { transform: translateY(-30px) rotate(-180deg) scale(0.9); opacity: 0.5; }
                        100% { transform: translateY(0px) rotate(-360deg) scale(1.2); opacity: 0.15; }
                    }
                    @keyframes border-glow-flow {
                        0% { border-color: rgba(255, 255, 255, 0.05); }
                        50% { border-color: rgba(255, 215, 0, 0.35); }
                        100% { border-color: rgba(255, 255, 255, 0.05); }
                    }
                    .million-dollar-card {
                        backdrop-filter: blur(30px) saturate(220%) !important;
                        -webkit-backdrop-filter: blur(30px) saturate(220%) !important;
                        background: rgba(15, 22, 36, 0.45) !important;
                        border: 1px solid rgba(255, 255, 255, 0.04) !important;
                        box-shadow: 0 30px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03) !important;
                        position: relative;
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                        transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1) !important;
                    }
                    .million-dollar-card:hover {
                        transform: translateY(-10px) scale(1.02) !important;
                        border-color: rgba(255, 215, 0, 0.5) !important;
                        box-shadow: 0 40px 80px rgba(0,0,0,0.6), 0 0 40px rgba(255, 215, 0, 0.18), inset 0 1px 0 rgba(255,255,255,0.1) !important;
                    }
                `}} />

                {/* Ambient glowing circles behind cards for ultra premium depth */}
                <div style={{ position: 'absolute', top: '10%', left: '15%', width: '350px', height: '350px', borderRadius: '50%', background: 'rgba(255,215,0,0.04)', filter: 'blur(100px)', pointerEvents: 'none', zIndex: 0 }} />
                <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(0,255,136,0.03)', filter: 'blur(120px)', pointerEvents: 'none', zIndex: 0 }} />

                {/* Floating anniversary stars/confetti decorations */}
                <div style={{ position: 'absolute', top: '15%', left: '8%', animation: 'float-spark-1 6s infinite ease-in-out', pointerEvents: 'none', zIndex: 1 }}>
                    <span className="material-icons-outlined" style={{ fontSize: '24px', color: 'var(--gold)' }}>auto_awesome</span>
                </div>
                <div style={{ position: 'absolute', bottom: '25%', left: '22%', animation: 'float-spark-2 8s infinite ease-in-out', pointerEvents: 'none', zIndex: 1 }}>
                    <span className="material-icons-outlined" style={{ fontSize: '18px', color: 'var(--cyan)' }}>star</span>
                </div>
                <div style={{ position: 'absolute', top: '20%', right: '18%', animation: 'float-spark-2 7s infinite ease-in-out', pointerEvents: 'none', zIndex: 1 }}>
                    <span className="material-icons-outlined" style={{ fontSize: '20px', color: 'var(--neon)' }}>celebration</span>
                </div>
                <div style={{ position: 'absolute', bottom: '20%', right: '8%', animation: 'float-spark-1 9s infinite ease-in-out', pointerEvents: 'none', zIndex: 1 }}>
                    <span className="material-icons-outlined" style={{ fontSize: '22px', color: 'var(--gold)' }}>auto_awesome</span>
                </div>

                <div className={`container ${sectionVisible('anniversary')}`} style={{ position: 'relative', zIndex: 2 }}>
                    <div className="section-header text-center" style={{ marginBottom: '60px' }}>
                        <span className="section-eyebrow" style={{ color: 'var(--gold)', letterSpacing: '5px', fontSize: '0.8rem', textShadow: '0 0 10px rgba(255,215,0,0.3)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '14px', height: '14px', color: 'var(--gold)', display: 'inline-block', verticalAlign: 'middle' }}><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v3c0 2.44 1.72 4.48 4 4.9C7.84 15.39 9.8 16 12 16s4.16-.61 5-1.1c2.28-.42 4-2.46 4-4.9V7c0-1.1-.9-2-2-2zM5 10V7h2v3H5zm14 0h-2V7h2v3zm-7 8c-1.66 0-3 1.34-3 3h6c0-1.66-1.34-3-3-3z"/></svg> 1ST ANNIVERSARY CELEBRATION</span>
                        <h2 style={{ fontSize: '2.8rem', fontFamily: 'Montserrat', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: '1.2', marginTop: '12px' }}>
                            Celebrating One Year <br className="d-none d-md-block" />
                            Of <span style={{ background: 'linear-gradient(135deg, #FFE066 0%, #F5B041 50%, #D4AC0D 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.3))' }}>Sports & Community</span>
                        </h2>
                        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: '700px', margin: '16px auto 0 auto', lineHeight: '1.8' }}>
                            We are proud to celebrate 365 days of tournaments, coaching rosters, and competitive showdowns! To thank Patna's active community, we are rolling out exclusive anniversary privileges.
                        </p>
                    </div>

                    <div className="row g-4 justify-content-center">
                        {[
                            {
                                title: "15% OFF Slot Bookings",
                                desc: "Get a flat 15% discount on all morning and weekend slot bookings this week.",
                                highlight: "CODE: KPA1YEAR",
                                icon: "local_offer",
                                color: "var(--gold)",
                                buttonText: "Book Slots Now",
                                link: "/book"
                            },
                            {
                                title: "20% OFF Academy Admission",
                                desc: "Register for our cricket or football academies this month and get a flat 20% discount on your first-quarter admission fees.",
                                highlight: "Flat 20% Off Admission",
                                icon: "school",
                                color: "var(--neon)",
                                buttonText: "Register Interest",
                                link: "#contact",
                                isScroll: true,
                                targetId: "contact"
                            },
                            {
                                title: "1st Anniversary Cup",
                                desc: "Participate in our Anniversary Football & Cricket Mini-Derby. Medals for participants!",
                                highlight: "Derby Cup July 2026",
                                icon: "emoji_events",
                                color: "var(--cyan)",
                                buttonText: "Register Team",
                                link: "#contact",
                                isScroll: true,
                                targetId: "contact"
                            }
                        ].map((promo, index) => (
                            <div key={index} className="col-lg-4 col-md-6 d-flex">
                                <div className="glass-card million-dollar-card w-100" style={{
                                    padding: '36px',
                                    borderTop: `4px solid ${promo.color}`,
                                }}
                                >
                                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: promo.color, opacity: 0.05, filter: 'blur(10px)' }} />
                                    <div>
                                        <div className="icon-ring" style={{ marginBottom: '24px', borderColor: varBorder(promo.color), background: 'rgba(255,255,255,0.01)', boxShadow: `0 0 15px ${promo.color}2b` }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '24px', color: promo.color }}>{promo.icon}</span>
                                        </div>
                                        <h3 style={{ fontSize: '1.22rem', fontFamily: 'Montserrat', fontWeight: 800, color: '#fff', marginBottom: '12px', letterSpacing: '-0.01em' }}>{promo.title}</h3>
                                        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>{promo.desc}</p>
                                    </div>
                                    <div>
                                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', textAlign: 'center' }}>
                                            <span style={{ fontSize: '0.84rem', fontWeight: 800, fontFamily: 'Space Grotesk', color: promo.color, letterSpacing: '1px' }}>{promo.highlight}</span>
                                        </div>
                                        {promo.isScroll ? (
                                            <a href={promo.link} onClick={(e) => handleScrollTo(e, promo.targetId)} className="btn-premium" style={{ width: '100%', padding: '12px', fontSize: '0.74rem', textDecoration: 'none', display: 'block', textAlign: 'center' }}>
                                                <span>{promo.buttonText}</span>
                                            </a>
                                        ) : (
                                            <Link href={promo.link} className="btn-premium" style={{ width: '100%', padding: '12px', fontSize: '0.74rem', textDecoration: 'none', display: 'block', textAlign: 'center' }}>
                                                <span>{promo.buttonText}</span>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="section-divider"></div>

            {/* ═══ 2. ABOUT KHELOPATNA ═══ */}
            <section id="about" data-animate style={{ padding: '110px 0', position: 'relative' }}>
                <div className={`container ${sectionVisible('about')}`}>
                    <div className="row align-items-center g-5">
                        
                        {/* Left Content */}
                        <div className="col-lg-6">
                            <span className="section-eyebrow">ABOUT KHELOPATNA</span>
                            <h2 style={{ fontSize: '2.4rem', fontFamily: 'Montserrat', fontWeight: 900, marginBottom: '24px' }}>
                                S.D. Public School Legacy & Vision
                            </h2>
                            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: '1.8', marginBottom: '20px' }}>
                                Rooted in the rich athletic heritage of <strong style={{ color: '#fff' }}>S.D. Public School</strong>, KheloPatna Elite Turf was engineered to provide Patna's youth, athletes, and local clubs with international-standard sports arenas.
                            </p>
                            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: '1.8', marginBottom: '30px' }}>
                                We have combined pro-grade non-abrasive turf systems, full safety nets, clinical lighting, and structured youth programs to establish Bihar's premium sports-tech venue.
                            </p>

                            {/* Small feature bullets */}
                            <div className="grid-responsive-2">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span className="material-icons-outlined" style={{ color: 'var(--neon)', fontSize: '20px' }}>check_circle</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>FIFA certified synthetic grass</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span className="material-icons-outlined" style={{ color: 'var(--neon)', fontSize: '20px' }}>check_circle</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Certified Pro Coaches</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span className="material-icons-outlined" style={{ color: 'var(--neon)', fontSize: '20px' }}>check_circle</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Smart digital slot check-ins</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span className="material-icons-outlined" style={{ color: 'var(--neon)', fontSize: '20px' }}>check_circle</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>CCTV secured campus</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Stack Cards */}
                        <div className="col-lg-6">
                            <div style={{ position: 'relative', height: '400px', width: '100%', maxWidth: '500px', margin: '0 auto' }}>
                                <div className="liquid-glass-card" style={{
                                    position: 'absolute', top: '0', left: '0', width: '75%', height: '75%',
                                    borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)', zIndex: 1,
                                    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: 0
                                }}>
                                    <img src="/football_turf.png" alt="Football Turf" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div className="liquid-glass-card" style={{
                                    position: 'absolute', bottom: '0', right: '0', width: '65%', height: '65%',
                                    borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                                    border: '1px solid rgba(0, 255, 136, 0.12)',
                                    boxShadow: '0 20px 40px rgba(0,255,136,0.1)', zIndex: 2,
                                    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: 0
                                }}>
                                    <img src="/cricket_nets.png" alt="Cricket Nets" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div className="liquid-glass" style={{
                                    position: 'absolute', top: '40%', right: '45%', padding: '16px 24px',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                    zIndex: 3, boxShadow: '0 15px 30px rgba(0,0,0,0.4)',
                                    backdropFilter: 'blur(30px) saturate(200%)', WebkitBackdropFilter: 'blur(30px) saturate(200%)',
                                    background: 'rgba(8, 16, 12, 0.55)', border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: 'var(--radius-lg)'
                                }}>
                                    <span style={{ fontFamily: 'Montserrat', fontSize: '1.5rem', fontWeight: 900, color: 'var(--neon)' }}>100%</span>
                                    <span style={{ fontSize: '0.62rem', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>PRO CUSHIONING</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            <div className="section-divider"></div>

            {/* ═══ 3. FACILITIES SECTION ═══ */}
            <section id="facilities" data-animate style={{ padding: '110px 0' }}>
                <div className={`container ${sectionVisible('facilities')}`}>
                    <div className="section-header">
                        <span>PREMIUM INFASTRUCTURE</span>
                        <h2>World-Class Ground Facilities</h2>
                    </div>

                    <div className="row g-4 stagger-children">
                        {[
                            { title: "FIFA Turf Ground", desc: "Premium 50mm synthetic grass with underlying shock cushion padding.", icon: "grass", color: "var(--neon)" },
                            { title: "Full net Cover", desc: "High-density nylon safety netting covering the entire play cage structure.", icon: "grid_view", color: "var(--cyan)" },
                            { title: "Pro Bowling Machine", desc: "Automated speed-controlled ball feeder with spin variation controls.", icon: "speed", color: "var(--gold)" },
                            { title: "CCTV secured", desc: "24/7 security recording coverage around fields and parking.", icon: "security", color: "#FF4D4D" },
                            { title: "Drinking Water", desc: "Fully filtered RO mineral water dispenser stations on both sides.", icon: "water_drop", color: "var(--cyan)" },
                            { title: "Private washrooms", desc: "Clean changing rooms and restrooms for players and academy students.", icon: "wc", color: "var(--neon)" },
                            { title: "Parking Area", desc: "Spacious vehicle parking slots directly inside the school campus.", icon: "local_parking", color: "var(--gold)" }
                        ].map((facility, index) => (
                            <div key={index} className="col-lg-3 col-md-6 d-flex">
                                <div className="liquid-glass-card w-100" style={{
                                    padding: '28px',
                                    borderLeft: `1px solid ${facility.color}`,
                                    backdropFilter: 'blur(30px) saturate(200%)',
                                    WebkitBackdropFilter: 'blur(30px) saturate(200%)',
                                    background: 'rgba(8, 16, 12, 0.45)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: 'var(--radius-lg)',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)',
                                    transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                                    borderLeftWidth: '2px', borderLeftStyle: 'solid', borderLeftColor: facility.color
                                }}>
                                    <div className="icon-ring" style={{ marginBottom: '20px', background: 'rgba(255,255,255,0.02)', borderColor: varBorder(facility.color) }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '24px', color: facility.color }}>{facility.icon}</span>
                                    </div>
                                    <h4 style={{ fontSize: '1rem', fontFamily: 'Montserrat', fontWeight: 800, marginBottom: '8px' }}>{facility.title}</h4>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>{facility.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="section-divider"></div>

            {/* ═══ 4. SPORTS ACADEMY SECTION ═══ */}
            <section id="academy" data-animate style={{ padding: '110px 0' }}>
                <div className={`container ${sectionVisible('academy')}`}>
                    <div className="section-header">
                        <span>SPORTS ACADEMY</span>
                        <h2>Build the Champion Within</h2>
                    </div>

                    <div className="row g-4">
                        
                        {/* Football Academy */}
                        <div className="col-lg-6">
                            <div className="liquid-glass-card" style={{
                                padding: '32px', position: 'relative', overflow: 'hidden',
                                backdropFilter: 'blur(30px) saturate(200%)', WebkitBackdropFilter: 'blur(30px) saturate(200%)',
                                background: 'rgba(8, 16, 12, 0.5)', border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 'var(--radius-xl)',
                                boxShadow: '0 30px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
                                transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}>
                                <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '100%', opacity: 0.12, zIndex: 0 }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '150px', color: 'var(--neon)' }}>sports_soccer</span>
                                </div>
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <span className="sport-badge" style={{ marginBottom: '14px', display: 'inline-block' }}>Football Academy</span>
                                    <h3 style={{ fontSize: '1.5rem', fontFamily: 'Montserrat', fontWeight: 900, marginBottom: '14px' }}>Elite Football Training</h3>
                                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '24px' }}>
                                        Join our structured development program covering technical skills, physical coordination, tactical awareness, and regular academy friendly league matches.
                                    </p>
                                    <div className="grid-responsive-2" style={{ gap: '12px', marginBottom: '28px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="material-icons-outlined" style={{ color: 'var(--neon)', fontSize: '18px' }}>check</span>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Age groups 6 to 18</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="material-icons-outlined" style={{ color: 'var(--neon)', fontSize: '18px' }}>check</span>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>AI Performance analysis</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="material-icons-outlined" style={{ color: 'var(--neon)', fontSize: '18px' }}>check</span>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Certified coaches</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="material-icons-outlined" style={{ color: 'var(--neon)', fontSize: '18px' }}>check</span>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Free club jerseys</span>
                                        </div>
                                    </div>
                                    <a href="https://forms.gle/6wMsARgxUnEC7VM87" target="_blank" rel="noopener noreferrer" className="btn-premium" style={{ width: '100%', padding: '14px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <span>APPLY FOR FOOTBALL ADMISSION</span> <span className="material-icons-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Cricket Academy */}
                        <div className="col-lg-6">
                            <div className="liquid-glass-card" style={{
                                padding: '32px', position: 'relative', overflow: 'hidden',
                                backdropFilter: 'blur(30px) saturate(200%)', WebkitBackdropFilter: 'blur(30px) saturate(200%)',
                                background: 'rgba(8, 16, 12, 0.5)', border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 'var(--radius-xl)',
                                boxShadow: '0 30px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
                                transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}>
                                <div style={{ position: 'absolute', top: 0, right: 0, width: '150px', height: '100%', opacity: 0.12, zIndex: 0 }}>
                                    <span className="material-icons-outlined" style={{ fontSize: '150px', color: 'var(--cyan)' }}>sports_cricket</span>
                                </div>
                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <span className="sport-badge" style={{ marginBottom: '14px', display: 'inline-block', borderColor: 'var(--cyan)', color: 'var(--cyan)', background: 'rgba(0, 200, 255, 0.08)' }}>Cricket Academy</span>
                                    <h3 style={{ fontSize: '1.5rem', fontFamily: 'Montserrat', fontWeight: 900, marginBottom: '14px' }}>Elite Cricket Training</h3>
                                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '24px' }}>
                                        Master cricket fundamentals under national-level guidance. Integrated speed analytics, bowling drill feeds, and professional nets configuration.
                                    </p>
                                    <div className="grid-responsive-2" style={{ gap: '12px', marginBottom: '28px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="material-icons-outlined" style={{ color: 'var(--cyan)', fontSize: '18px' }}>check</span>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Age groups 6 to 18</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="material-icons-outlined" style={{ color: 'var(--cyan)', fontSize: '18px' }}>check</span>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Bowling feed analysis</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="material-icons-outlined" style={{ color: 'var(--cyan)', fontSize: '18px' }}>check</span>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>BCCI qualified coaches</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="material-icons-outlined" style={{ color: 'var(--cyan)', fontSize: '18px' }}>check</span>
                                            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Premium match schedule</span>
                                        </div>
                                    </div>
                                    <a href="https://forms.gle/6wMsARgxUnEC7VM87" target="_blank" rel="noopener noreferrer" className="btn-premium" style={{ width: '100%', padding: '14px', fontSize: '0.75rem', background: 'linear-gradient(135deg, var(--cyan) 0%, #0088b3 100%)', boxShadow: '0 4px 18px rgba(0, 200, 255, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <span>APPLY FOR CRICKET ADMISSION</span> <span className="material-icons-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
                                    </a>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            <div className="section-divider"></div>

            {/* ═══ 5. MATCH HIGHLIGHTS SECTION ═══ */}
            <section id="highlights" data-animate className="turf-gradient-bg" style={{ padding: '110px 0', background: 'linear-gradient(180deg, rgba(5,5,5,0.95) 0%, rgba(13, 17, 23, 0.95) 100%)' }}>
                <div className={`container ${sectionVisible('highlights')}`}>
                    <div className="section-header">
                        <span>PREVIEW CLIPS</span>
                        <h2>Match & Academy Highlights</h2>
                    </div>

                    {/* Netflix-style horizontal carousel */}
                    <div className="netflix-carousel-container">
                        {highlights.map((item, index) => (
                            <div key={index} className="netflix-card">
                                <img src={item.img} alt={item.title} className="netflix-card-img" />
                                <div className="netflix-card-overlay">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span className="glass-badge" style={{ fontSize: '0.55rem', padding: '2px 8px', color: item.category === 'Football' ? 'var(--neon)' : 'var(--cyan)', borderColor: item.category === 'Football' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(0, 200, 255, 0.2)' }}>{item.category}</span>
                                        <span style={{ fontSize: '0.65rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '12px' }}>schedule</span> {item.duration}
                                        </span>
                                    </div>
                                    <h4 style={{ fontSize: '0.9rem', fontFamily: 'Montserrat', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>{item.title}</h4>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{item.views}</span>
                                    
                                    {/* Play Overlay Hover effect */}
                                    <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(0, 255, 136, 0.85)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', opacity: 0.9, transition: 'all 0.3s ease', boxShadow: '0 0 20px rgba(0, 255, 136, 0.4)' }}>
                                        <span className="material-icons-outlined" style={{ color: '#000', fontSize: '20px', marginLeft: '2px' }}>play_arrow</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="section-divider"></div>

            {/* ═══ 6. GALLERY SECTION ═══ */}
            <section id="gallery" data-animate style={{ padding: '110px 0' }}>
                <div className={`container ${sectionVisible('gallery')}`}>
                    <div className="section-header">
                        <span>GALLERY STAGE</span>
                        <h2>Explore The Elite Arena</h2>
                    </div>

                    {/* Premium masonry-inspired grid */}
                    <div className="row g-4 stagger-children">
                        {galleryImages.map((img, index) => (
                            <div key={index} className="col-md-4">
                                <div className="liquid-glass-card" style={{
                                    padding: '8px', overflow: 'hidden', cursor: 'pointer',
                                    backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                                    background: 'rgba(8, 16, 12, 0.4)', border: '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: 'var(--radius-lg)',
                                    boxShadow: '0 15px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)',
                                    transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
                                }}>
                                    <div style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 'calc(var(--radius-lg) - 8px)', overflow: 'hidden' }}>
                                        <img src={img.img} alt={img.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'all 0.6s ease' }} className="gallery-thumbnail" />
                                        <div style={{
                                            position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(5,5,5,0.9) 100%)',
                                            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '16px', opacity: 0.9
                                        }}>
                                            <span style={{ fontSize: '0.6rem', color: 'var(--neon)', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>{img.category}</span>
                                            <h4 style={{ fontSize: '0.88rem', fontFamily: 'Montserrat', fontWeight: 800, color: '#fff', margin: 0 }}>{img.title}</h4>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <div className="section-divider"></div>

            {/* ═══ 7. ACHIEVEMENTS SECTION ═══ */}
            <section id="achievements" data-animate style={{ padding: '110px 0', background: 'linear-gradient(180deg, rgba(13, 17, 23, 0.95) 0%, rgba(5,5,5,0.95) 100%)' }}>
                <div className={`container ${sectionVisible('achievements')}`}>
                    <div className="row align-items-center g-5">
                        
                        {/* Trophy showcase Left */}
                        <div className="col-lg-5 text-center">
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                {/* Dedicated Trophy Icon Wrapper to center glass circle and icon */}
                                <div style={{
                                    position: 'relative',
                                    width: '200px',
                                    height: '200px',
                                    margin: '0 auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {/* Liquid glass circle behind trophy */}
                                    <div style={{
                                        position: 'absolute',
                                        inset: 0,
                                        borderRadius: '50%',
                                        background: 'rgba(255, 215, 0, 0.04)',
                                        backdropFilter: 'blur(20px) saturate(180%)',
                                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                                        border: '1px solid rgba(255, 215, 0, 0.08)',
                                        boxShadow: '0 0 60px rgba(255, 215, 0, 0.08), inset 0 1px 0 rgba(255,255,255,0.03)',
                                        zIndex: 0
                                    }} />
                                    <span className="material-icons-outlined" style={{
                                        fontSize: '130px',
                                        color: 'var(--gold)',
                                        filter: 'drop-shadow(0 0 30px rgba(255, 215, 0, 0.4))',
                                        position: 'relative',
                                        zIndex: 1
                                    }}>emoji_events</span>
                                </div>
                                <h3 style={{ fontSize: '1.2rem', fontFamily: 'Montserrat', fontWeight: 900, marginTop: '24px', letterSpacing: '1px' }}>TROPHY SHOWCASE</h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Developed in association with S.D. Public School</p>
                            </div>
                        </div>

                        {/* Animated statistics right */}
                        <div className="col-lg-7">
                            <span className="section-eyebrow">ELITE STATS</span>
                            <h2 style={{ fontSize: '2.2rem', fontFamily: 'Montserrat', fontWeight: 900, marginBottom: '28px' }}>Our Sporting Milestones</h2>
                            
                            <div className="row g-4">
                                {[
                                    { value: stats.games, suffix: "+", label: "Matches Hosted" },
                                    { value: stats.students, suffix: "+", label: "Active Students" },
                                    { value: stats.tournaments, suffix: "+", label: "Tournaments Held" },
                                    { value: stats.rating, suffix: "★", label: "Google Rating" }
                                ].map((item, index) => (
                                    <div key={index} className="col-6">
                                        <div className="liquid-glass-card" style={{
                                            padding: '24px',
                                            borderLeft: '3px solid var(--neon)',
                                            backdropFilter: 'blur(30px) saturate(200%)', WebkitBackdropFilter: 'blur(30px) saturate(200%)',
                                            background: 'rgba(8, 16, 12, 0.45)',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            borderRadius: 'var(--radius-lg)',
                                            boxShadow: '0 15px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)',
                                            borderLeftWidth: '3px', borderLeftStyle: 'solid', borderLeftColor: 'var(--neon)'
                                        }}>
                                            <span style={{ fontSize: '2rem', fontFamily: 'Montserrat', fontWeight: 900, color: '#fff', display: 'block', textShadow: '0 0 20px rgba(0, 255, 136, 0.2)' }}>
                                                {item.value}{item.suffix}
                                            </span>
                                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{item.label}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            <div className="section-divider"></div>

            {/* ═══ 8. TESTIMONIALS SECTION ═══ */}
            <section id="testimonials" data-animate style={{ padding: '110px 0' }}>
                <div className={`container ${sectionVisible('testimonials')}`} style={{ maxWidth: '800px' }}>
                    <div className="section-header">
                        <span>TESTIMONIALS</span>
                        <h2>What Champions Say</h2>
                    </div>

                    {/* Sliding Testimonial Perspective container */}
                    <div className="perspective-container">
                        <div className="liquid-glass-card" style={{
                            padding: '40px', position: 'relative', transition: 'all 0.5s ease',
                            borderLeft: '4px solid var(--cyan)',
                            backdropFilter: 'blur(30px) saturate(200%)', WebkitBackdropFilter: 'blur(30px) saturate(200%)',
                            background: 'rgba(8, 16, 12, 0.5)', border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 'var(--radius-xl)',
                            boxShadow: '0 30px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
                            borderLeftWidth: '4px', borderLeftStyle: 'solid', borderLeftColor: 'var(--cyan)'
                        }}>
                            <span className="material-icons-outlined" style={{ fontSize: '48px', color: 'rgba(0, 200, 255, 0.15)', position: 'absolute', top: '24px', left: '24px' }}>format_quote</span>
                            
                            <p style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: '1.8', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
                                "{testimonials[activeTestimonial].quote}"
                            </p>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--cyan), #00668a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff' }}>
                                        {testimonials[activeTestimonial].avatar}
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '0.92rem', fontFamily: 'Montserrat', fontWeight: 800, margin: 0 }}>{testimonials[activeTestimonial].name}</h4>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{testimonials[activeTestimonial].role}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '2px' }}>
                                    {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => (
                                        <span key={i} className="material-icons-outlined" style={{ color: 'var(--gold)', fontSize: '16px' }}>star</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Slider dot controllers */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
                        {testimonials.map((_, index) => (
                            <button key={index} onClick={() => setActiveTestimonial(index)} style={{ width: '12px', height: '12px', borderRadius: '50%', border: 'none', background: activeTestimonial === index ? 'var(--cyan)' : 'rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.3s ease' }} />
                        ))}
                    </div>
                </div>
            </section>

            <div className="section-divider"></div>

            {/* ═══ 9. CONTACT SECTION ═══ */}
            <section id="contact" data-animate style={{ padding: '110px 0' }}>
                <div className={`container ${sectionVisible('contact')}`} style={{ maxWidth: '1000px' }}>
                    <div className="section-header">
                        <span>GET IN TOUCH</span>
                        <h2>Send An Enquiry</h2>
                    </div>

                    <div className="row g-4 align-items-stretch">
                        
                        {/* Left contact Details card */}
                        <div className="col-lg-6">
                            <div className="liquid-glass-card" style={{
                                padding: '36px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                                backdropFilter: 'blur(30px) saturate(200%)', WebkitBackdropFilter: 'blur(30px) saturate(200%)',
                                background: 'rgba(8, 16, 12, 0.5)', border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 'var(--radius-xl)',
                                boxShadow: '0 30px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)'
                            }}>
                                <div>
                                    <h3 style={{ fontSize: '1.2rem', fontFamily: 'Montserrat', fontWeight: 900, marginBottom: '24px' }}>
                                        KheloPatna <span style={{ color: 'var(--neon)' }}>Elite Turf</span>
                                    </h3>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                                        <div className="icon-ring" style={{ width: '40px', height: '40px' }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '18px', color: 'var(--emerald)' }}>phone</span>
                                        </div>
                                        <a href="tel:9709701400" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem' }}>(+91) 970 970 1400</a>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                                        <div className="icon-ring" style={{ width: '40px', height: '40px' }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '18px', color: 'var(--emerald)' }}>email</span>
                                        </div>
                                        <a href="mailto:service@khelopatna.in" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem' }}>service@khelopatna.in</a>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '20px' }}>
                                        <div className="icon-ring" style={{ width: '40px', height: '40px', marginTop: '2px' }}>
                                            <span className="material-icons-outlined" style={{ fontSize: '18px', color: 'var(--emerald)' }}>location_on</span>
                                        </div>
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                            Near ICICI Bank, Kumhrar, Sandalpur Road, Patna – 800007
                                        </span>
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '20px', marginTop: '20px' }}>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--neon)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>ARENA TIMINGS</span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>06:00 AM – 11:00 PM (Everyday)</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Enquiry Form panel */}
                        <div className="col-lg-6">
                            <div className="liquid-glass-card" style={{
                                padding: '36px',
                                backdropFilter: 'blur(30px) saturate(200%)', WebkitBackdropFilter: 'blur(30px) saturate(200%)',
                                background: 'rgba(8, 16, 12, 0.5)', border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 'var(--radius-xl)',
                                boxShadow: '0 30px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)'
                            }}>
                                <h3 style={{ fontSize: '1.1rem', fontFamily: 'Montserrat', fontWeight: 800, marginBottom: '20px' }}>Submit Enquiry</h3>
                                <form onSubmit={(e) => e.preventDefault()}>
                                    <div className="mb-3">
                                        <input type="text" className="glass-input" placeholder="Full Name" required />
                                    </div>
                                    <div className="mb-3">
                                        <input type="tel" className="glass-input" placeholder="Mobile Number" required />
                                    </div>
                                    <div className="mb-3">
                                        <select className="glass-input">
                                            <option value="">Select academy interest</option>
                                            <option value="football">Football Academy</option>
                                            <option value="cricket">Cricket Academy</option>
                                            <option value="recreational">Weekend slot booking</option>
                                        </select>
                                    </div>
                                    <div className="mb-4">
                                        <textarea className="glass-input" rows="3" placeholder="Message / Requirements"></textarea>
                                    </div>
                                    <button type="submit" className="btn-premium" style={{ width: '100%', padding: '14px' }}>
                                        <span>SUBMIT ADMISSION ENQUIRY</span>
                                    </button>
                                </form>
                            </div>
                        </div>

                    </div>

                    {/* Interactive map */}
                    <div className="mt-5">
                        <div className="liquid-glass" style={{
                            padding: '8px', overflow: 'hidden',
                            backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                            background: 'rgba(8, 16, 12, 0.4)', border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: '0 15px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)'
                        }}>
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3548.541988353559!2d85.18419904696597!3d25.60222910212486!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39ed59ffa6d552bd%3A0xee9dbb297b8a583c!2sKhelo%20Patna%20Elite%20Turf!5e0!3m2!1sen!2sin!4v1751442280659!5m2!1sen!2sin"
                                width="100%"
                                height="320"
                                style={{ border: 0, borderRadius: 'calc(var(--radius-lg) - 6px)' }}
                                allowFullScreen=""
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            ></iframe>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ 10. LUXURY FOOTER ═══ */}
            <footer style={{
                padding: '60px 0 30px 0',
                borderTop: '1px solid rgba(255,255,255,0.03)',
                background: 'rgba(3, 8, 6, 0.95)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                position: 'relative',
                zIndex: 5
            }}>
                <div className="container">
                    <div className="row g-5 mb-5">
                        
                        {/* Footer Logo info */}
                        <div className="col-lg-5">
                            <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <img src="/logo.png" alt="Logo" style={{ height: '36px', width: 'auto' }} />
                                <span style={{
                                    fontFamily: 'Montserrat', fontWeight: 900, fontSize: '1.2rem',
                                    color: '#fff', letterSpacing: '1px'
                                }}>
                                    KHELO<span style={{ color: 'var(--neon)' }}>PATNA</span>
                                </span>
                            </Link>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.7', maxWidth: '350px' }}>
                                Ultra-premium sports turf and training academies developed in association with S.D. Public School, Kumhrar, Patna.
                            </p>
                        </div>

                        {/* Quick links */}
                        <div className="col-lg-3 col-6">
                            <h4 style={{ fontSize: '0.85rem', fontFamily: 'Montserrat', fontWeight: 800, color: '#fff', marginBottom: '20px', letterSpacing: '1px' }}>QUICK LINKS</h4>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {['home', 'about', 'facilities', 'academy'].map(link => (
                                    <li key={link}>
                                        <a href={`#${link}`} onClick={(e) => handleScrollTo(e, link)} style={{ textDecoration: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', transition: 'color 0.3s ease' }} className="footer-link-item">{link.toUpperCase()}</a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Social Links */}
                        <div className="col-lg-4 col-6">
                            <h4 style={{ fontSize: '0.85rem', fontFamily: 'Montserrat', fontWeight: 800, color: '#fff', marginBottom: '20px', letterSpacing: '1px' }}>SOCIAL MEDIA</h4>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                {[
                                    { icon: "facebook", url: "https://facebook.com" },
                                    { icon: "instagram", url: "https://instagram.com" },
                                    { icon: "youtube", url: "https://youtube.com" }
                                ].map((soc, idx) => (
                                    <a key={idx} href={soc.url} target="_blank" rel="noreferrer" className="icon-ring" style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.02)' }}>
                                        <span className="material-icons-outlined" style={{ fontSize: '18px', color: '#fff' }}>{soc.icon === 'facebook' ? 'facebook' : soc.icon === 'instagram' ? 'photo_camera' : 'smart_display'}</span>
                                    </a>
                                ))}
                            </div>
                        </div>

                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', margin: 0 }}>
                            &copy; 2026 KheloPatna Elite Turf. All rights reserved. Developed with S.D. Public School.
                        </p>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <Link href="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.72rem', fontFamily: 'Space Grotesk' }}>
                                Privacy Policy
                            </Link>
                            <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '0.72rem' }}>|</span>
                            <Link href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.72rem', fontFamily: 'Space Grotesk' }}>
                                Terms & Conditions
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Floating WhatsApp Button */}
            <a href="https://wa.me/919709701400" target="_blank" rel="noreferrer" className="whatsapp-float-btn" aria-label="Chat on WhatsApp">
                <span className="material-icons-outlined" style={{ fontSize: '32px' }}>chat</span>
            </a>

        </div>
    );
}

// Helper function to calculate border opacity
function varBorder(color) {
    if (color.startsWith('var')) return 'rgba(0, 255, 136, 0.15)';
    return color.replace('1)', '0.15)');
}
