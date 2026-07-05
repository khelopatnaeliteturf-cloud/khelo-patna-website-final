"use client";
import Link from "next/link";
import React, { useState } from "react";

/* ───────── design tokens ───────── */
const T = {
  neon: "#39ff14",
  emerald: "#10b981",
  emeraldDark: "#065f46",
  textPrimary: "#e8f0ea",
  textSecondary: "#a1b4a8",
  textMuted: "#5e7367",
  bgVoid: "#020405",
  bgCard: "rgba(16, 185, 129, 0.04)",
  border: "rgba(16, 185, 129, 0.10)",
  borderSubtle: "rgba(16, 185, 129, 0.08)",
  glass: "rgba(4, 6, 9, 0.9)",
  gradientText: "linear-gradient(135deg, #39ff14 0%, #10b981 50%, #34d399 100%)",
  gradientBtn:
    "linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)",
  gradientBtnHover:
    "linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%)",
  fontHeading: "'Unbounded', sans-serif",
  fontLabel: "'Space Grotesk', sans-serif",
  fontBody: "'Inter', sans-serif",
};

/* ───────── data ───────── */
const FEATURES = [
  "Premium Indoor Turf Surface",
  "7v7 Match-Ready Capacity",
  "Automatic Bowling Machine Access",
  "LED Floodlight Arena Lighting",
  "Live Score Overlay System",
];

const OCCASIONS = [
  {
    icon: "groups",
    title: "Friendly Matches",
    desc: "Rally your crew for weekend cricket battles on a pro-grade indoor surface.",
  },
  {
    icon: "sports_cricket",
    title: "Practice Nets",
    desc: "Sharpen your batting and bowling with dedicated net sessions & bowling machine.",
  },
  {
    icon: "emoji_events",
    title: "Tournaments",
    desc: "Host box-cricket tournaments with LED scoreboards and full event support.",
  },
];

/* ───────── component ───────── */
export default function CricketTurfPage() {
  const [navHover, setNavHover] = useState(null);
  const [btnHover, setBtnHover] = useState(null);

  return (
    <>
      {/* Google Fonts */}
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Unbounded:wght@400;600;800;900&family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap");
        @import url("https://fonts.googleapis.com/icon?family=Material+Icons+Outlined");

        *,
        *::before,
        *::after {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        html {
          scroll-behavior: smooth;
        }
        body {
          background: ${T.bgVoid};
          color: ${T.textPrimary};
          font-family: ${T.fontBody};
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        /* ── reusable classes ── */
        .glass-card {
          background: ${T.bgCard};
          border: 1px solid ${T.border};
          border-radius: 18px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;
        }
        .glass-card:hover {
          border-color: rgba(16, 185, 129, 0.22);
          box-shadow: 0 0 32px rgba(16, 185, 129, 0.06);
          transform: translateY(-4px);
        }
        .glass-panel {
          background: rgba(16, 185, 129, 0.03);
          border: 1px solid ${T.border};
          border-radius: 20px;
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .btn-premium {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 32px;
          border: none;
          border-radius: 14px;
          background: ${T.gradientBtn};
          color: #fff;
          font-family: ${T.fontLabel};
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: background 0.3s, box-shadow 0.3s, transform 0.2s;
          text-decoration: none;
        }
        .btn-premium:hover {
          background: ${T.gradientBtnHover};
          box-shadow: 0 0 28px rgba(16, 185, 129, 0.35);
          transform: translateY(-2px);
        }
        .btn-premium-border {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 32px;
          border: 1.5px solid ${T.emerald};
          border-radius: 14px;
          background: transparent;
          color: ${T.emerald};
          font-family: ${T.fontLabel};
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: background 0.3s, border-color 0.3s, color 0.3s,
            transform 0.2s;
          text-decoration: none;
        }
        .btn-premium-border:hover {
          background: rgba(16, 185, 129, 0.08);
          border-color: ${T.neon};
          color: ${T.neon};
          transform: translateY(-2px);
        }
        .icon-ring {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid ${T.border};
          color: ${T.emerald};
          font-size: 28px;
          flex-shrink: 0;
        }
        .section-eyebrow {
          display: inline-block;
          font-family: ${T.fontLabel};
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: ${T.emerald};
          margin-bottom: 12px;
        }

        /* scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.18);
          border-radius: 3px;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .anim-in {
          animation: fadeInUp 0.7s ease-out both;
        }
        .anim-delay-1 {
          animation-delay: 0.15s;
        }
        .anim-delay-2 {
          animation-delay: 0.3s;
        }
        .anim-delay-3 {
          animation-delay: 0.45s;
        }
      `}</style>

      {/* ═══════ NAVBAR ═══════ */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          height: 72,
          background: T.glass,
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: `1px solid ${T.borderSubtle}`,
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" alt="Khelo Patna Logo" style={{ height: "42px", width: "auto" }} />
          <span
            style={{
              fontFamily: T.fontHeading,
              fontWeight: 800,
              fontSize: "1.2rem",
              color: T.textPrimary,
              letterSpacing: 1,
            }}
          >
            KHELO+
            <span style={{ color: T.neon }}>PATNA</span>
          </span>
        </Link>

        {/* Links */}
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          {[
            { label: "Home", href: "/" },
            { label: "Cricket Turf", href: "/cricket-turf" },
            { label: "Football Turf", href: "/football-turf" },
          ].map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onMouseEnter={() => setNavHover(l.label)}
              onMouseLeave={() => setNavHover(null)}
              style={{
                textDecoration: "none",
                fontFamily: T.fontLabel,
                fontWeight: 500,
                fontSize: "0.9rem",
                color:
                  l.label === "Cricket Turf"
                    ? T.neon
                    : navHover === l.label
                    ? T.emerald
                    : T.textSecondary,
                transition: "color 0.25s",
                letterSpacing: 0.5,
              }}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/book?sport=cricket" className="btn-premium" style={{ padding: "10px 26px", fontSize: "0.85rem" }}>
            Book Turf
          </Link>
        </div>
      </nav>

      {/* ═══════ MAIN ═══════ */}
      <main style={{ paddingTop: 72 }}>
        {/* ── HERO ── */}
        <section
          className="anim-in"
          style={{
            minHeight: "80vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "100px 24px 80px",
            position: "relative",
          }}
        >
          {/* ambient glow */}
          <div
            style={{
              position: "absolute",
              top: "20%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 600,
              height: 600,
              background:
                "radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          <span className="section-eyebrow">Premium Indoor Arena</span>

          <h1
            style={{
              fontFamily: T.fontHeading,
              fontWeight: 900,
              fontSize: "clamp(2.6rem, 6vw, 5rem)",
              lineHeight: 1.1,
              marginBottom: 20,
              color: T.textPrimary,
            }}
          >
            <span className="material-icons-outlined" style={{ fontSize: '32px', marginRight: '8px', verticalAlign: 'middle', color: 'var(--cyan)' }}>sports_cricket</span> CRICKET{" "}
            <span
              style={{
                background: T.gradientText,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              TURF
            </span>
          </h1>

          <p
            style={{
              fontFamily: T.fontBody,
              fontSize: "1.15rem",
              color: T.textMuted,
              maxWidth: 540,
              lineHeight: 1.7,
              marginBottom: 40,
            }}
          >
            Where Every Over Counts. Patna&rsquo;s Premium Indoor Cricket Arena.
          </p>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/book?sport=cricket" className="btn-premium">
              <span className="material-icons-outlined" style={{ fontSize: 20 }}>
                bolt
              </span>
              Book Turf Now
            </Link>
            <Link href="/book?sport=nets" className="btn-premium-border" style={{ textDecoration: "none" }}>
              <span className="material-icons-outlined" style={{ fontSize: 20 }}>
                grid_on
              </span>
              Book Practice Nets
            </Link>
            <a href="#features" className="btn-premium-border">
              <span className="material-icons-outlined" style={{ fontSize: 20 }}>
                arrow_downward
              </span>
              Explore Features
            </a>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section
          id="features"
          className="anim-in anim-delay-1"
          style={{
            maxWidth: 820,
            margin: "0 auto",
            padding: "60px 24px 80px",
          }}
        >
          <span className="section-eyebrow">What You Get</span>
          <h2
            style={{
              fontFamily: T.fontHeading,
              fontWeight: 700,
              fontSize: "1.8rem",
              marginBottom: 32,
              color: T.textPrimary,
            }}
          >
            Arena Features
          </h2>

          <div
            className="glass-card"
            style={{
              padding: "36px 40px",
              borderLeft: `3px solid ${T.emerald}`,
            }}
          >
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 18 }}>
              {FEATURES.map((f) => (
                <li
                  key={f}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    fontFamily: T.fontBody,
                    fontSize: "1rem",
                    color: T.textSecondary,
                  }}
                >
                  <span
                    className="material-icons-outlined"
                    style={{ color: T.emerald, fontSize: 22 }}
                  >
                    check_circle
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── PERFECT FOR ── */}
        <section
          className="anim-in anim-delay-2"
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            padding: "20px 24px 100px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span className="section-eyebrow">Perfect For</span>
            <h2
              style={{
                fontFamily: T.fontHeading,
                fontWeight: 700,
                fontSize: "1.8rem",
                color: T.textPrimary,
              }}
            >
              Every Occasion
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            {OCCASIONS.map((o, i) => (
              <div
                key={o.title}
                className={`glass-card anim-in anim-delay-${i + 1}`}
                style={{
                  padding: "36px 32px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                }}
              >
                <div className="icon-ring">
                  <span className="material-icons-outlined">{o.icon}</span>
                </div>
                <h3
                  style={{
                    fontFamily: T.fontLabel,
                    fontWeight: 600,
                    fontSize: "1.1rem",
                    color: T.textPrimary,
                  }}
                >
                  {o.title}
                </h3>
                <p
                  style={{
                    fontFamily: T.fontBody,
                    fontSize: "0.92rem",
                    lineHeight: 1.7,
                    color: T.textMuted,
                  }}
                >
                  {o.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ═══════ FOOTER ═══════ */}
      <footer
        style={{
          textAlign: "center",
          padding: "48px 24px",
          borderTop: `1px solid ${T.borderSubtle}`,
          fontFamily: T.fontBody,
          fontSize: "0.82rem",
          color: T.textMuted,
        }}
      >
        © {new Date().getFullYear()} Khelo Patna. All rights reserved.
      </footer>
    </>
  );
}
