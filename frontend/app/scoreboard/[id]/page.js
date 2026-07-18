'use client';

import { useEffect, useState, useRef, use, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { getBackendUrl } from '../../lib/backendUrl';

const BACKEND_URL = getBackendUrl();

// ─── Design Tokens ───────────────────────────────────────────────
const FONT = {
  score: "'Oswald', sans-serif",
  label: "'Inter', sans-serif",
  timer: "'Fira Code', monospace",
};
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const COLOR = {
  bg: '#0B0F19',
  glass: 'rgba(11,15,25,0.92)',
  glassBorder: 'rgba(255,255,255,0.08)',
  accent: '#10B981',
  accentGlow: 'rgba(16,185,129,0.25)',
  white: '#FFFFFF',
  muted: '#9CA3AF',
  dim: '#6B7280',
  gold: '#FBBF24',
  red: '#EF4444',
  green: '#22C55E',
  dot: '#4B5563',
  yellow: '#EAB308',
  surface: 'rgba(255,255,255,0.04)',
  surfaceBorder: 'rgba(255,255,255,0.06)',
};

// ─── Theme Style Engine ──────────────────────────────────────────
export function getThemeStyles(theme, font, sportColor = '#10B981') {
  let fontFamily = "'Oswald', sans-serif";
  let labelFontFamily = "'Inter', sans-serif";
  let timerFontFamily = "'Fira Code', monospace";

  if (font === 'orbitron') {
    fontFamily = "'Orbitron', sans-serif";
    labelFontFamily = "'Orbitron', sans-serif";
  } else if (font === 'chakra') {
    fontFamily = "'Chakra Petch', sans-serif";
    labelFontFamily = "'Chakra Petch', sans-serif";
  } else if (font === 'mono') {
    fontFamily = "'Fira Code', monospace";
    labelFontFamily = "'Fira Code', monospace";
  }

  const t = (theme || 'glass').toLowerCase();
  if (t === 'neon') {
    return {
      bg: 'rgba(7, 10, 19, 0.95)',
      border: '2px solid #00F2FE',
      borderRadius: '8px',
      boxShadow: '0 0 15px rgba(0, 242, 254, 0.35), inset 0 0 8px rgba(0, 242, 254, 0.15)',
      color: '#00F2FE',
      backdropFilter: 'none',
      accentColor: '#FF007F', // hot neon pink
      accentGlow: 'rgba(255, 0, 127, 0.15)',
      mutedColor: '#38BDF8', // cyan
      dimColor: '#00A8B5',
      fontFamily,
      labelFontFamily,
      timerFontFamily,
      divider: 'rgba(0, 242, 254, 0.25)',
      badgeBg: 'rgba(0, 242, 254, 0.1)',
      badgeBorder: '1px solid rgba(0, 242, 254, 0.3)',
      badgeColor: '#00F2FE'
    };
  }

  if (t === 'clean') {
    return {
      bg: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: '8px',
      boxShadow: '0 4px 16px rgba(15, 23, 42, 0.12)',
      color: '#0F172A',
      backdropFilter: 'none',
      accentColor: '#2563EB', // deep clean blue
      accentGlow: 'rgba(37, 99, 235, 0.08)',
      mutedColor: '#475569',
      dimColor: '#64748B',
      fontFamily,
      labelFontFamily,
      timerFontFamily,
      divider: '#E2E8F0',
      badgeBg: '#F1F5F9',
      badgeBorder: '1px solid #CBD5E1',
      badgeColor: '#0F172A'
    };
  }

  if (t === 'retro') {
    return {
      bg: '#000000',
      border: '4px double #F59E0B',
      borderRadius: '0px',
      boxShadow: '0 6px 0 rgba(0, 0, 0, 0.8)',
      color: '#F59E0B',
      backdropFilter: 'none',
      accentColor: '#F59E0B',
      accentGlow: 'rgba(245, 158, 11, 0.1)',
      mutedColor: '#D97706',
      dimColor: '#B45309',
      fontFamily: "'Fira Code', monospace",
      labelFontFamily: "'Fira Code', monospace",
      timerFontFamily: "'Fira Code', monospace",
      divider: '#F59E0B',
      badgeBg: 'transparent',
      badgeBorder: '1px solid #F59E0B',
      badgeColor: '#F59E0B'
    };
  }

  // Default: glassmorphic theme
  return {
    bg: 'rgba(11, 15, 25, 0.88)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    color: '#FFFFFF',
    backdropFilter: 'blur(16px)',
    accentColor: sportColor,
    accentGlow: `${sportColor}25`,
    mutedColor: '#9CA3AF',
    dimColor: '#6B7280',
    fontFamily,
    labelFontFamily,
    timerFontFamily,
    divider: 'rgba(255, 255, 255, 0.08)',
    badgeBg: 'rgba(255, 255, 255, 0.04)',
    badgeBorder: '1px solid rgba(255, 255, 255, 0.06)',
    badgeColor: '#FFFFFF'
  };
}

// ─── Ball Color Map ──────────────────────────────────────────────
function getBallColor(ball) {
  if (!ball) return { bg: COLOR.dot, text: '#FFF' };
  const b = String(ball).toUpperCase();
  if (b === 'W') return { bg: '#DC2626', text: '#FFF' };
  if (b === '4') return { bg: '#16A34A', text: '#FFF' };
  if (b === '6') return { bg: '#D97706', text: '#FFF' };
  if (b === '0' || b === '.') return { bg: '#374151', text: '#9CA3AF' };
  if (b === 'WD' || b === 'NB' || b.includes('W') && b.length > 1) return { bg: '#CA8A04', text: '#FFF' };
  if (b === 'LB' || b === 'B') return { bg: '#6366F1', text: '#FFF' };
  return { bg: '#4B5563', text: '#FFF' };
}

// ─── Rolling Number Component ────────────────────────────────────
function RollingNumber({ value, size = 48, color = COLOR.white, weight = 700, fontFamily = "'Oswald', sans-serif" }) {
  const prevRef = useRef(value);
  const [display, setDisplay] = useState({ current: value, prev: value, animating: false });

  useEffect(() => {
    if (prevRef.current !== value) {
      setDisplay({ current: value, prev: prevRef.current, animating: true });
      prevRef.current = value;
      const t = setTimeout(() => setDisplay(d => ({ ...d, animating: false })), 450);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <div style={{
      position: 'relative', display: 'inline-flex', overflow: 'hidden',
      height: `${size * 1.15}px`, alignItems: 'center',
      willChange: 'transform, opacity',
    }}>
      {/* Old number slides up and out */}
      <span style={{
        fontFamily: fontFamily, fontWeight: weight, fontSize: `${size}px`,
        color, lineHeight: 1, position: 'absolute',
        transform: display.animating ? 'translateY(-110%)' : 'translateY(0)',
        opacity: display.animating ? 0 : 1,
        transition: `transform 400ms ${EASE}, opacity 400ms ${EASE}`,
        willChange: 'transform, opacity',
      }}>
        {display.prev}
      </span>
      {/* New number slides up from below */}
      <span style={{
        fontFamily: fontFamily, fontWeight: weight, fontSize: `${size}px`,
        color, lineHeight: 1,
        transform: display.animating ? 'translateY(0)' : 'translateY(110%)',
        opacity: display.animating ? 1 : 0,
        transition: `transform 400ms ${EASE}, opacity 400ms ${EASE}`,
        willChange: 'transform, opacity',
        position: display.animating ? 'relative' : 'absolute',
      }}>
        {display.current}
      </span>
      {/* Static fallback when not animating */}
      {!display.animating && (
        <span style={{
          fontFamily: fontFamily, fontWeight: weight, fontSize: `${size}px`,
          color, lineHeight: 1,
        }}>
          {value}
        </span>
      )}
    </div>
  );
}

// ─── Celebration Overlay ─────────────────────────────────────────
function CelebrationOverlay({ celebration }) {
  if (!celebration) return null;

  const colorMap = {
    'WICKET!': COLOR.red,
    'FOUR!': COLOR.green,
    'SIX!': COLOR.gold,
    'GOAL!': COLOR.white,
    'MATCH POINT': COLOR.gold,
  };

  const bgMap = {
    'WICKET!': 'rgba(220,38,38,0.15)',
    'FOUR!': 'rgba(22,163,74,0.15)',
    'SIX!': 'rgba(217,119,6,0.15)',
    'GOAL!': 'rgba(255,255,255,0.1)',
    'MATCH POINT': 'rgba(217,119,6,0.12)',
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 9999, pointerEvents: 'none',
      background: bgMap[celebration] || 'transparent',
    }}>
      <div style={{
        fontFamily: FONT.score, fontSize: '96px', fontWeight: 700,
        color: colorMap[celebration] || COLOR.white,
        textShadow: `0 0 60px ${colorMap[celebration] || COLOR.white}40, 0 4px 20px rgba(0,0,0,0.5)`,
        letterSpacing: '6px',
        willChange: 'transform, opacity',
        animation: celebration === 'MATCH POINT'
          ? 'celebPulse 600ms ease-in-out infinite alternate'
          : 'celebSlideIn 500ms cubic-bezier(0.16,1,0.3,1) forwards',
      }}>
        {celebration}
      </div>
    </div>
  );
}

// ─── LIVE Badge ──────────────────────────────────────────────────
function LiveBadge({ status, size = 'normal', themeStyles }) {
  const isLive = status === 'LIVE';
  const isFinished = status === 'FINISHED';
  const labelFont = themeStyles ? themeStyles.labelFontFamily : FONT.label;
  const sz = size === 'large' ? { font: 16, pad: '8px 20px', dot: 10 } : { font: 11, pad: '4px 12px', dot: 7 };

  if (isFinished) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: themeStyles ? themeStyles.badgeBg : 'rgba(251,191,36,0.15)',
        border: themeStyles ? themeStyles.badgeBorder : '1px solid rgba(251,191,36,0.3)',
        borderRadius: '20px', padding: sz.pad, fontFamily: labelFont,
        fontWeight: 700, fontSize: `${sz.font}px`, color: themeStyles ? themeStyles.accentColor : COLOR.gold,
        letterSpacing: '1.5px', textTransform: 'uppercase',
      }}>
        FINISHED
      </div>
    );
  }

  if (!isLive) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: themeStyles ? themeStyles.badgeBg : 'rgba(107,114,128,0.15)',
        border: themeStyles ? themeStyles.badgeBorder : '1px solid rgba(107,114,128,0.3)',
        borderRadius: '20px', padding: sz.pad, fontFamily: labelFont,
        fontWeight: 700, fontSize: `${sz.font}px`, color: themeStyles ? themeStyles.mutedColor : COLOR.muted,
        letterSpacing: '1.5px', textTransform: 'uppercase',
      }}>
        UPCOMING
      </div>
    );
  }

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      background: themeStyles ? themeStyles.badgeBg : 'transparent',
      border: themeStyles ? themeStyles.badgeBorder : 'none',
      borderRadius: '20px',
      padding: sz.pad, fontFamily: labelFont, fontWeight: 700,
      fontSize: `${sz.font}px`, color: COLOR.red,
      letterSpacing: '1.5px', textTransform: 'uppercase',
    }}>
      <span style={{
        width: `${sz.dot}px`, height: `${sz.dot}px`, borderRadius: '50%',
        background: COLOR.red, display: 'inline-block',
        animation: 'livePulse 1.5s ease-in-out infinite',
        willChange: 'opacity',
      }} />
      LIVE
    </div>
  );
}

// ─── Ball Circle ─────────────────────────────────────────────────
function BallCircle({ ball, size = 28, themeStyles }) {
  const { bg, text } = getBallColor(ball);
  const labelFont = themeStyles ? themeStyles.labelFontFamily : FONT.label;
  return (
    <div style={{
      width: `${size}px`, height: `${size}px`, borderRadius: '50%',
      background: bg, display: 'flex', justifyContent: 'center', alignItems: 'center',
      fontFamily: labelFont, fontWeight: 700, fontSize: `${size * 0.4}px`,
      color: text, flexShrink: 0,
    }}>
      {String(ball).substring(0, 2)}
    </div>
  );
}

// ─── Football Smart Timer ────────────────────────────────────────
function FootballTimer({ timerRunning, timerStartAt, timerSeconds, size = 36, color = COLOR.gold, fontFamily = "'Fira Code', monospace" }) {
  const [displayTime, setDisplayTime] = useState(timerSeconds || 0);

  useEffect(() => {
    if (!timerRunning) {
      setDisplayTime(timerSeconds || 0);
      return;
    }
    const base = timerSeconds || 0;
    const startMs = timerStartAt ? new Date(timerStartAt).getTime() : Date.now();

    const tick = () => {
      const elapsed = (Date.now() - startMs) / 1000;
      setDisplayTime(Math.floor(base + elapsed));
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [timerRunning, timerStartAt, timerSeconds]);

  const mins = Math.floor(displayTime / 60).toString().padStart(2, '0');
  const secs = (displayTime % 60).toString().padStart(2, '0');

  return (
    <span style={{
      fontFamily: fontFamily, fontWeight: 500, fontSize: `${size}px`,
      color, letterSpacing: '2px', fontVariantNumeric: 'tabular-nums',
    }}>
      {mins}:{secs}
    </span>
  );
}

// ─── Separator ───────────────────────────────────────────────────
function Divider({ vertical = true, height = 24, color: c = 'rgba(255,255,255,0.12)' }) {
  return vertical
    ? <div style={{ width: '1px', height: `${height}px`, background: c, flexShrink: 0 }} />
    : <div style={{ height: '1px', width: '100%', background: c }} />;
}

// ─── Winner Overlay (TV mode) ────────────────────────────────────
function WinnerOverlay({ winner, teamAName, teamBName }) {
  if (!winner) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', zIndex: 100,
      background: 'rgba(11,15,25,0.95)', backdropFilter: 'blur(20px)',
      animation: 'fadeIn 600ms ease forwards',
    }}>
      <div style={{
        fontFamily: FONT.label, fontSize: '20px', fontWeight: 600,
        color: COLOR.muted, letterSpacing: '4px', textTransform: 'uppercase',
        marginBottom: '16px',
      }}>
        MATCH RESULT
      </div>
      <div style={{
        fontFamily: FONT.score, fontSize: '72px', fontWeight: 700,
        color: COLOR.gold, textAlign: 'center',
        textShadow: '0 0 40px rgba(251,191,36,0.3)',
        animation: 'celebSlideIn 700ms cubic-bezier(0.16,1,0.3,1) forwards',
      }}>
        {winner}
      </div>
      <div style={{
        fontFamily: FONT.label, fontSize: '18px', fontWeight: 500,
        color: COLOR.muted, marginTop: '12px',
      }}>
        🏆 Winner
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CRICKET OVERLAYS
// ═══════════════════════════════════════════════════════════════════

function CricketOverlay({ sb, animDelay, theme, layout, font }) {
  const cr = sb.settings?.cricket || {};
  const battingTeam = sb.currentBattingTeam === 'A' ? sb.teamAName : sb.teamBName;
  const battingScore = sb.currentBattingTeam === 'A' ? sb.teamAScore : sb.teamBScore;
  const battingWickets = sb.currentBattingTeam === 'A' ? (cr.wicketsA || 0) : (cr.wicketsB || 0);
  const battingOvers = sb.currentBattingTeam === 'A' ? (cr.oversA || '0.0') : (cr.oversB || '0.0');
  const balls = (cr.overSummary || []).slice(-6);

  // Calculate required run rate
  let rrInfo = null;
  if (cr.target && sb.currentInnings === 2) {
    const remaining = cr.target - battingScore;
    const oversFloat = parseFloat(battingOvers) || 0;
    const totalOvers = cr.ballsInOver ? 20 : 20; // default 20
    const oversLeft = totalOvers - oversFloat;
    if (oversLeft > 0 && remaining > 0) {
      rrInfo = { need: remaining, overs: oversLeft.toFixed(1), rr: (remaining / oversLeft).toFixed(2) };
    }
  }

  const style = getThemeStyles(theme, font, '#10B981');

  // ── 1. SCORE BUG LAYOUT ─────────────────────────────────────────
  if (layout === 'bug') {
    return (
      <div style={{
        position: 'fixed', top: '24px', left: '24px',
        animation: 'slideDown 600ms cubic-bezier(0.16,1,0.3,1) forwards',
        willChange: 'transform, opacity',
        opacity: 0, animationDelay: `${animDelay}ms`,
        animationFillMode: 'forwards',
        zIndex: 999
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column',
          background: style.bg, backdropFilter: style.backdropFilter,
          borderRadius: style.borderRadius, border: style.border,
          boxShadow: style.boxShadow,
          overflow: 'hidden', width: '340px',
          color: style.color,
          fontFamily: style.fontFamily,
        }}>
          {/* Header Row */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 12px', background: 'rgba(255,255,255,0.03)',
            borderBottom: `1px solid ${style.divider}`
          }}>
            <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: style.labelFontFamily, letterSpacing: '1px', color: style.mutedColor }}>
              {sb.matchName}
            </span>
            <LiveBadge status={sb.status} size="small" themeStyles={style} />
          </div>

          {/* Core Score Row */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 14px', borderBottom: `1px solid ${style.divider}`
          }}>
            <span style={{ fontSize: '15px', fontWeight: 800, fontFamily: style.labelFontFamily, textTransform: 'uppercase' }}>
              {battingTeam}
            </span>
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: '2px',
              background: style.accentGlow, padding: '4px 12px', borderRadius: '6px',
              border: style.badgeBorder
            }}>
              <RollingNumber value={battingScore} size={22} color={style.accentColor} weight={700} fontFamily={style.fontFamily} />
              <span style={{ fontSize: '16px', color: style.accentColor, opacity: 0.6, margin: '0 1px' }}>/</span>
              <RollingNumber value={battingWickets} size={22} color={style.accentColor} weight={700} fontFamily={style.fontFamily} />
            </div>
          </div>

          {/* Stats & Current Inning Status */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', fontSize: '11px', color: style.mutedColor,
            borderBottom: (balls.length > 0 || rrInfo) ? `1px solid ${style.divider}` : 'none'
          }}>
            <span style={{ fontFamily: style.timerFontFamily }}>
              Overs: {battingOvers}
            </span>
            {cr.currentBatsman1 && (
              <span style={{ fontWeight: 600, fontFamily: style.labelFontFamily }}>
                🏏 {cr.currentBatsman1}
              </span>
            )}
          </div>

          {/* Balls Tracker */}
          {balls.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '10px 14px',
              borderBottom: rrInfo ? `1px solid ${style.divider}` : 'none'
            }}>
              {balls.map((ball, i) => (
                <BallCircle key={`${i}-${ball}`} ball={ball} size={22} themeStyles={style} />
              ))}
            </div>
          )}

          {/* Required run rate */}
          {rrInfo && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', background: style.accentGlow,
              fontSize: '11px', fontWeight: 600, color: style.accentColor
            }}>
              <span>TARGET: {cr.target}</span>
              <span>NEED: {rrInfo.need} (RR {rrInfo.rr})</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── 2. BOTTOM TICKER LAYOUT ──────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', bottom: '24px', left: '3%', right: '3%',
      display: 'flex', justifyContent: 'center',
      animation: 'slideUp 600ms cubic-bezier(0.16,1,0.3,1) forwards',
      willChange: 'transform, opacity',
      opacity: 0, animationDelay: `${animDelay}ms`,
      animationFillMode: 'forwards',
      zIndex: 999
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0',
        background: style.bg, backdropFilter: style.backdropFilter,
        borderRadius: style.borderRadius, border: style.border,
        boxShadow: style.boxShadow,
        overflow: 'hidden', maxWidth: '1200px', width: '100%',
        color: style.color, fontFamily: style.fontFamily
      }}>
        {/* LIVE + Match */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 20px', borderRight: `1px solid ${style.divider}`,
          flexShrink: 0,
        }}>
          <LiveBadge status={sb.status} themeStyles={style} />
          <span style={{
            fontFamily: style.labelFontFamily, fontSize: '12px', color: style.mutedColor,
            fontWeight: 500, maxWidth: '120px', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {sb.matchName}
          </span>
        </div>

        {/* Batting Team + Score */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '10px 24px', borderRight: `1px solid ${style.divider}`,
        }}>
          <div style={{
            fontFamily: style.labelFontFamily, fontWeight: 700, fontSize: '15px',
            color: style.color, textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            {battingTeam}
          </div>
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: '2px',
            background: style.accentGlow, padding: '6px 16px',
            borderRadius: '10px', border: style.badgeBorder,
          }}>
            <RollingNumber value={battingScore} size={26} color={style.accentColor} weight={700} fontFamily={style.fontFamily} />
            <span style={{
              fontFamily: style.fontFamily, fontSize: '20px', fontWeight: 500,
              color: style.accentColor, opacity: 0.6,
            }}>/</span>
            <span style={{
              fontFamily: style.fontFamily, fontSize: '20px', fontWeight: 600,
              color: style.accentColor,
            }}>{battingWickets}</span>
          </div>
          <span style={{
            fontFamily: style.timerFontFamily, fontSize: '13px', color: style.mutedColor, fontWeight: 400,
          }}>
            ({battingOvers} ov)
          </span>
        </div>

        {/* Ball-by-ball strip */}
        {balls.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 18px', borderRight: `1px solid ${style.divider}`,
          }}>
            {balls.map((ball, i) => (
              <BallCircle key={`${i}-${ball}`} ball={ball} size={26} themeStyles={style} />
            ))}
          </div>
        )}

        {/* Batsmen & Bowler */}
        {(cr.currentBatsman1 || cr.currentBowler) && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '2px',
            padding: '8px 18px', borderRight: `1px solid ${style.divider}`,
            minWidth: '160px',
          }}>
            {cr.currentBatsman1 && (
              <div style={{
                fontFamily: style.labelFontFamily, fontSize: '11px', color: style.color, fontWeight: 500,
              }}>
                <span style={{ color: style.mutedColor }}>BAT</span>{' '}
                {cr.currentBatsman1}
                {cr.currentBatsman2 ? ` & ${cr.currentBatsman2}` : ''}
              </div>
            )}
            {cr.currentBowler && (
              <div style={{
                fontFamily: style.labelFontFamily, fontSize: '11px', color: style.color, fontWeight: 500,
              }}>
                <span style={{ color: style.mutedColor }}>BWL</span>{' '}
                {cr.currentBowler}
              </div>
            )}
            {cr.partnership && (
              <div style={{
                fontFamily: style.labelFontFamily, fontSize: '10px', color: style.dimColor, fontWeight: 400,
              }}>
                P'ship: {cr.partnership.runs}({cr.partnership.balls})
              </div>
            )}
          </div>
        )}

        {/* Required Rate Info */}
        {rrInfo && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '8px 18px', gap: '1px',
          }}>
            <span style={{
              fontFamily: style.labelFontFamily, fontSize: '10px', color: style.accentColor,
              fontWeight: 600, letterSpacing: '0.5px',
            }}>
              NEED
            </span>
            <span style={{
              fontFamily: style.fontFamily, fontSize: '16px', color: style.accentColor, fontWeight: 700,
            }}>
              {rrInfo.need}
            </span>
            <span style={{
              fontFamily: style.labelFontFamily, fontSize: '9px', color: style.dimColor, fontWeight: 500,
            }}>
              RR {rrInfo.rr}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function CricketTV({ sb }) {
  const cr = sb.settings?.cricket || {};
  const battingTeam = sb.currentBattingTeam === 'A' ? sb.teamAName : sb.teamBName;
  const bowlingTeam = sb.currentBattingTeam === 'A' ? sb.teamBName : sb.teamAName;
  const battingScore = sb.currentBattingTeam === 'A' ? sb.teamAScore : sb.teamBScore;
  const battingWickets = sb.currentBattingTeam === 'A' ? (cr.wicketsA || 0) : (cr.wicketsB || 0);
  const battingOvers = sb.currentBattingTeam === 'A' ? (cr.oversA || '0.0') : (cr.oversB || '0.0');
  const balls = (cr.overSummary || []).slice(-6);

  return (
    <>
      {/* Main Score Card */}
      <div style={{
        background: COLOR.glass, backdropFilter: 'blur(20px)',
        borderRadius: '28px', border: `1px solid ${COLOR.glassBorder}`,
        padding: '48px 64px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '24px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
        animation: 'fadeIn 800ms ease forwards',
        minWidth: '500px',
      }}>
        <div style={{
          fontFamily: FONT.label, fontSize: '14px', fontWeight: 600,
          color: COLOR.muted, letterSpacing: '3px', textTransform: 'uppercase',
        }}>
          {sb.currentInnings === 2 ? '2ND INNINGS' : '1ST INNINGS'}
        </div>

        <div style={{
          fontFamily: FONT.label, fontSize: '32px', fontWeight: 700,
          color: COLOR.white, textTransform: 'uppercase', letterSpacing: '1px',
        }}>
          {battingTeam}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <RollingNumber value={battingScore} size={96} color={COLOR.accent} weight={700} />
          <span style={{
            fontFamily: FONT.score, fontSize: '56px', fontWeight: 400,
            color: 'rgba(16,185,129,0.4)',
          }}>/</span>
          <span style={{
            fontFamily: FONT.score, fontSize: '56px', fontWeight: 600,
            color: COLOR.accent,
          }}>{battingWickets}</span>
        </div>

        <div style={{
          fontFamily: FONT.timer, fontSize: '22px', color: COLOR.muted, fontWeight: 400,
        }}>
          OVERS {battingOvers}
        </div>

        {cr.target && (
          <div style={{
            background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)',
            borderRadius: '12px', padding: '10px 28px',
            fontFamily: FONT.label, fontSize: '18px', color: COLOR.gold, fontWeight: 600,
          }}>
            TARGET {cr.target} • NEED {Math.max(0, cr.target - battingScore)} RUNS
          </div>
        )}

        {/* Ball strip */}
        {balls.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            {balls.map((ball, i) => (
              <BallCircle key={`${i}-${ball}`} ball={ball} size={40} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Info Bar */}
      <div style={{
        display: 'flex', justifyContent: 'center', gap: '48px',
        marginTop: '32px', flexWrap: 'wrap',
      }}>
        {cr.currentBatsman1 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: FONT.label, fontSize: '12px', fontWeight: 600,
              color: COLOR.dim, letterSpacing: '2px', marginBottom: '6px',
            }}>BATTING</div>
            <div style={{
              fontFamily: FONT.label, fontSize: '20px', fontWeight: 600, color: COLOR.white,
            }}>
              {cr.currentBatsman1}{cr.currentBatsman2 ? ` & ${cr.currentBatsman2}` : ''}
            </div>
          </div>
        )}
        {cr.currentBowler && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: FONT.label, fontSize: '12px', fontWeight: 600,
              color: COLOR.dim, letterSpacing: '2px', marginBottom: '6px',
            }}>BOWLING</div>
            <div style={{
              fontFamily: FONT.label, fontSize: '20px', fontWeight: 600, color: COLOR.white,
            }}>{cr.currentBowler}</div>
          </div>
        )}
        {cr.partnership && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: FONT.label, fontSize: '12px', fontWeight: 600,
              color: COLOR.dim, letterSpacing: '2px', marginBottom: '6px',
            }}>PARTNERSHIP</div>
            <div style={{
              fontFamily: FONT.score, fontSize: '22px', fontWeight: 600, color: COLOR.white,
            }}>
              {cr.partnership.runs} <span style={{ fontSize: '14px', color: COLOR.muted }}>({cr.partnership.balls})</span>
            </div>
          </div>
        )}
      </div>

      {/* First Innings Score if 2nd innings */}
      {cr.firstInningsScore != null && sb.currentInnings === 2 && (
        <div style={{
          fontFamily: FONT.label, fontSize: '16px', color: COLOR.dim,
          fontWeight: 500, marginTop: '16px', textAlign: 'center',
        }}>
          {bowlingTeam}: {cr.firstInningsScore}
        </div>
      )}
    </>
  );
}

function CricketSpectator({ sb }) {
  const cr = sb.settings?.cricket || {};
  const battingTeam = sb.currentBattingTeam === 'A' ? sb.teamAName : sb.teamBName;
  const battingScore = sb.currentBattingTeam === 'A' ? sb.teamAScore : sb.teamBScore;
  const battingWickets = sb.currentBattingTeam === 'A' ? (cr.wicketsA || 0) : (cr.wicketsB || 0);
  const battingOvers = sb.currentBattingTeam === 'A' ? (cr.oversA || '0.0') : (cr.oversB || '0.0');
  const balls = (cr.overSummary || []).slice(-6);

  return (
    <>
      {/* Score Card */}
      <div style={{
        background: COLOR.surface, border: `1px solid ${COLOR.surfaceBorder}`,
        borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '12px',
      }}>
        <div style={{
          fontFamily: FONT.label, fontSize: '12px', fontWeight: 600,
          color: COLOR.dim, letterSpacing: '2px', textTransform: 'uppercase',
        }}>
          {sb.currentInnings === 2 ? '2ND INNINGS' : '1ST INNINGS'}
        </div>

        <div style={{
          fontFamily: FONT.label, fontSize: '22px', fontWeight: 700,
          color: COLOR.white, textTransform: 'uppercase',
        }}>{battingTeam}</div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
          <RollingNumber value={battingScore} size={52} color={COLOR.accent} weight={700} />
          <span style={{ fontFamily: FONT.score, fontSize: '32px', color: 'rgba(16,185,129,0.4)' }}>/</span>
          <span style={{ fontFamily: FONT.score, fontSize: '32px', fontWeight: 600, color: COLOR.accent }}>
            {battingWickets}
          </span>
        </div>

        <div style={{
          fontFamily: FONT.timer, fontSize: '14px', color: COLOR.muted,
        }}>({battingOvers} ov)</div>

        {cr.target && (
          <div style={{
            fontFamily: FONT.label, fontSize: '14px', color: COLOR.gold,
            fontWeight: 600, marginTop: '4px',
          }}>
            Target: {cr.target} • Need {Math.max(0, cr.target - battingScore)}
          </div>
        )}

        {/* Ball strip */}
        {balls.length > 0 && (
          <div style={{
            display: 'flex', gap: '8px', marginTop: '8px',
            padding: '8px 16px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px',
          }}>
            {balls.map((ball, i) => (
              <BallCircle key={`${i}-${ball}`} ball={ball} size={30} />
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{
        background: COLOR.surface, border: `1px solid ${COLOR.surfaceBorder}`,
        borderRadius: '16px', padding: '16px 20px', display: 'flex',
        flexDirection: 'column', gap: '12px',
      }}>
        <div style={{
          fontFamily: FONT.label, fontSize: '12px', fontWeight: 700,
          color: COLOR.dim, letterSpacing: '1.5px', textTransform: 'uppercase',
        }}>MATCH INFO</div>

        {cr.currentBatsman1 && (
          <StatRow label="Batsman" value={cr.currentBatsman1 + (cr.currentBatsman2 ? ` & ${cr.currentBatsman2}` : '')} />
        )}
        {cr.currentBowler && <StatRow label="Bowler" value={cr.currentBowler} />}
        {cr.partnership && <StatRow label="Partnership" value={`${cr.partnership.runs} (${cr.partnership.balls} balls)`} />}

        {/* Over history */}
        {cr.overHistory && cr.overHistory.length > 0 && (
          <div style={{ marginTop: '4px' }}>
            <div style={{
              fontFamily: FONT.label, fontSize: '11px', fontWeight: 600,
              color: COLOR.dim, marginBottom: '8px',
            }}>OVER HISTORY</div>
            {cr.overHistory.slice(-5).map((over, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                marginBottom: '6px',
              }}>
                <span style={{
                  fontFamily: FONT.timer, fontSize: '10px', color: COLOR.dim,
                  width: '28px', flexShrink: 0,
                }}>
                  Ov{cr.overHistory.length - 4 + idx}
                </span>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {over.map((b, bi) => (
                    <BallCircle key={bi} ball={b} size={22} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FOOTBALL OVERLAYS
// ═══════════════════════════════════════════════════════════════════

function FootballOverlay({ sb, animDelay, theme, layout, font }) {
  const fb = sb.settings?.football || {};
  const abbr = (name) => (name || '???').substring(0, 3).toUpperCase();
  const style = getThemeStyles(theme, font, '#3B82F6');

  const wrapperStyle = layout === 'ticker' ? {
    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
    animation: 'slideUp 500ms cubic-bezier(0.16,1,0.3,1) forwards',
    willChange: 'transform, opacity', opacity: 0,
    animationDelay: `${animDelay}ms`, animationFillMode: 'forwards',
    zIndex: 999
  } : {
    position: 'fixed', top: '24px', left: '24px',
    animation: 'slideDown 500ms cubic-bezier(0.16,1,0.3,1) forwards',
    willChange: 'transform, opacity', opacity: 0,
    animationDelay: `${animDelay}ms`, animationFillMode: 'forwards',
    zIndex: 999
  };

  return (
    <div style={wrapperStyle}>
      <div style={{
        display: 'flex', alignItems: 'stretch',
        background: style.bg, backdropFilter: style.backdropFilter,
        borderRadius: style.borderRadius, border: style.border,
        boxShadow: style.boxShadow,
        overflow: 'hidden',
        color: style.color,
        fontFamily: style.fontFamily
      }}>
        {/* Half Badge */}
        <div style={{
          background: fb.half === 'HT' || fb.half === 'FT' ? style.accentColor : style.mutedColor,
          padding: '0 14px', display: 'flex', alignItems: 'center',
          fontFamily: style.labelFontFamily, fontWeight: 800, fontSize: '11px',
          color: style.bg.includes('rgba(11, 15, 25') || style.bg.includes('rgba(7, 10, 19') || style.bg.includes('#000000') ? '#FFF' : '#0F172A',
          letterSpacing: '1px',
        }}>
          {fb.half || '1H'}
        </div>

        {/* Team A */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '10px 14px',
        }}>
          <span style={{
            fontFamily: style.labelFontFamily, fontWeight: 700, fontSize: '14px', color: style.color,
          }}>
            {abbr(sb.teamAName)}
          </span>
          {/* Card indicators */}
          {(fb.yellowCardsA > 0 || fb.redCardsA > 0) && (
            <div style={{ display: 'flex', gap: '3px' }}>
              {fb.yellowCardsA > 0 && <div style={{
                width: '8px', height: '11px', borderRadius: '1px',
                background: COLOR.yellow, fontSize: '6px',
              }} />}
              {fb.redCardsA > 0 && <div style={{
                width: '8px', height: '11px', borderRadius: '1px',
                background: COLOR.red, fontSize: '6px',
              }} />}
            </div>
          )}
        </div>

        {/* Scores */}
        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'rgba(255,255,255,0.04)',
          borderLeft: `1px solid ${style.divider}`,
          borderRight: `1px solid ${style.divider}`,
        }}>
          <div style={{
            width: '44px', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center',
            borderRight: `1px solid ${style.divider}`,
          }}>
            <RollingNumber value={sb.teamAScore} size={22} color={style.accentColor} weight={700} fontFamily={style.fontFamily} />
          </div>
          <div style={{
            width: '44px', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center',
          }}>
            <RollingNumber value={sb.teamBScore} size={22} color={style.accentColor} weight={700} fontFamily={style.fontFamily} />
          </div>
        </div>

        {/* Team B */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '10px 14px',
        }}>
          {(fb.yellowCardsB > 0 || fb.redCardsB > 0) && (
            <div style={{ display: 'flex', gap: '3px' }}>
              {fb.yellowCardsB > 0 && <div style={{
                width: '8px', height: '11px', borderRadius: '1px', background: COLOR.yellow,
              }} />}
              {fb.redCardsB > 0 && <div style={{
                width: '8px', height: '11px', borderRadius: '1px', background: COLOR.red,
              }} />}
            </div>
          )}
          <span style={{
            fontFamily: style.labelFontFamily, fontWeight: 700, fontSize: '14px', color: style.color,
          }}>
            {abbr(sb.teamBName)}
          </span>
        </div>

        {/* Timer */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '0 16px', borderLeft: `1px solid ${style.divider}`,
        }}>
          <FootballTimer
            timerRunning={fb.timerRunning}
            timerStartAt={fb.timerStartAt}
            timerSeconds={fb.timerSeconds || 0}
            size={16}
            color={style.accentColor}
            fontFamily={style.timerFontFamily}
          />
          {fb.stoppageTime > 0 && (
            <span style={{
              fontFamily: style.timerFontFamily, fontSize: '11px', color: COLOR.red,
              marginLeft: '4px', fontWeight: 500,
            }}>+{fb.stoppageTime}</span>
          )}
        </div>

        {/* LIVE indicator */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '0 12px', borderLeft: `1px solid ${style.divider}`,
        }}>
          <LiveBadge status={sb.status} themeStyles={style} />
        </div>
      </div>
    </div>
  );
}

function FootballTV({ sb }) {
  const fb = sb.settings?.football || {};
  return (
    <>
      <div style={{
        background: COLOR.glass, backdropFilter: 'blur(20px)',
        borderRadius: '28px', border: `1px solid ${COLOR.glassBorder}`,
        padding: '48px 80px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '24px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
        animation: 'fadeIn 800ms ease forwards', minWidth: '560px',
      }}>
        {/* Half */}
        <div style={{
          background: fb.half === 'HT' || fb.half === 'FT' ? 'rgba(251,191,36,0.15)' : 'rgba(16,185,129,0.1)',
          border: `1px solid ${fb.half === 'HT' || fb.half === 'FT' ? 'rgba(251,191,36,0.3)' : 'rgba(16,185,129,0.2)'}`,
          borderRadius: '10px', padding: '6px 24px',
          fontFamily: FONT.label, fontWeight: 700, fontSize: '14px',
          color: fb.half === 'HT' || fb.half === 'FT' ? COLOR.gold : COLOR.accent,
          letterSpacing: '3px',
        }}>
          {fb.half || '1ST HALF'}
        </div>

        {/* Teams + Score */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '40px',
        }}>
          {/* Team A */}
          <div style={{ textAlign: 'center', minWidth: '180px' }}>
            <div style={{
              fontFamily: FONT.label, fontSize: '28px', fontWeight: 700,
              color: COLOR.white, textTransform: 'uppercase',
            }}>{sb.teamAName}</div>
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '8px' }}>
              {Array.from({ length: fb.yellowCardsA || 0 }).map((_, i) => (
                <div key={`ya${i}`} style={{
                  width: '12px', height: '16px', borderRadius: '2px', background: COLOR.yellow,
                }} />
              ))}
              {Array.from({ length: fb.redCardsA || 0 }).map((_, i) => (
                <div key={`ra${i}`} style={{
                  width: '12px', height: '16px', borderRadius: '2px', background: COLOR.red,
                }} />
              ))}
            </div>
          </div>

          {/* Score */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <RollingNumber value={sb.teamAScore} size={120} color={COLOR.white} weight={700} />
            <span style={{
              fontFamily: FONT.score, fontSize: '72px', fontWeight: 300,
              color: 'rgba(255,255,255,0.15)',
            }}>:</span>
            <RollingNumber value={sb.teamBScore} size={120} color={COLOR.white} weight={700} />
          </div>

          {/* Team B */}
          <div style={{ textAlign: 'center', minWidth: '180px' }}>
            <div style={{
              fontFamily: FONT.label, fontSize: '28px', fontWeight: 700,
              color: COLOR.white, textTransform: 'uppercase',
            }}>{sb.teamBName}</div>
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '8px' }}>
              {Array.from({ length: fb.yellowCardsB || 0 }).map((_, i) => (
                <div key={`yb${i}`} style={{
                  width: '12px', height: '16px', borderRadius: '2px', background: COLOR.yellow,
                }} />
              ))}
              {Array.from({ length: fb.redCardsB || 0 }).map((_, i) => (
                <div key={`rb${i}`} style={{
                  width: '12px', height: '16px', borderRadius: '2px', background: COLOR.red,
                }} />
              ))}
            </div>
          </div>
        </div>

        {/* Timer */}
        <FootballTimer
          timerRunning={fb.timerRunning}
          timerStartAt={fb.timerStartAt}
          timerSeconds={fb.timerSeconds || 0}
          size={42}
          color={COLOR.gold}
        />
        {fb.stoppageTime > 0 && (
          <span style={{
            fontFamily: FONT.timer, fontSize: '20px', color: COLOR.red, fontWeight: 500,
          }}>+{fb.stoppageTime}'</span>
        )}
      </div>

      {/* Goal Scorers */}
      {fb.goalScorers && fb.goalScorers.length > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '24px',
          flexWrap: 'wrap',
        }}>
          {fb.goalScorers.map((g, i) => (
            <div key={i} style={{
              fontFamily: FONT.label, fontSize: '14px', color: COLOR.muted, fontWeight: 500,
            }}>
              ⚽ {g.scorer} <span style={{ color: COLOR.dim }}>{g.minute}'</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function FootballSpectator({ sb }) {
  const fb = sb.settings?.football || {};
  return (
    <>
      <div style={{
        background: COLOR.surface, border: `1px solid ${COLOR.surfaceBorder}`,
        borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '16px',
      }}>
        <div style={{
          background: 'rgba(16,185,129,0.1)', borderRadius: '8px', padding: '4px 14px',
          fontFamily: FONT.label, fontSize: '12px', fontWeight: 700,
          color: COLOR.accent, letterSpacing: '2px',
        }}>{fb.half || '1ST HALF'}</div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%',
        }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{
              fontFamily: FONT.label, fontSize: '16px', fontWeight: 700, color: COLOR.white,
            }}>{sb.teamAName}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <RollingNumber value={sb.teamAScore} size={42} color={COLOR.white} weight={700} />
            <span style={{ fontFamily: FONT.score, fontSize: '24px', color: COLOR.dim }}>:</span>
            <RollingNumber value={sb.teamBScore} size={42} color={COLOR.white} weight={700} />
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{
              fontFamily: FONT.label, fontSize: '16px', fontWeight: 700, color: COLOR.white,
            }}>{sb.teamBName}</div>
          </div>
        </div>

        <FootballTimer
          timerRunning={fb.timerRunning}
          timerStartAt={fb.timerStartAt}
          timerSeconds={fb.timerSeconds || 0}
          size={24}
          color={COLOR.gold}
        />
      </div>

      {/* Cards + Goals Stats */}
      <div style={{
        background: COLOR.surface, border: `1px solid ${COLOR.surfaceBorder}`,
        borderRadius: '16px', padding: '16px 20px', display: 'flex',
        flexDirection: 'column', gap: '12px',
      }}>
        <div style={{
          fontFamily: FONT.label, fontSize: '12px', fontWeight: 700,
          color: COLOR.dim, letterSpacing: '1.5px', textTransform: 'uppercase',
        }}>MATCH STATS</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <StatRow label="Yellow Cards" value={`${fb.yellowCardsA || 0} - ${fb.yellowCardsB || 0}`} />
        </div>
        <StatRow label="Red Cards" value={`${fb.redCardsA || 0} - ${fb.redCardsB || 0}`} valueColor={COLOR.red} />

        {fb.goalScorers && fb.goalScorers.length > 0 && (
          <div style={{ marginTop: '4px' }}>
            <div style={{
              fontFamily: FONT.label, fontSize: '11px', fontWeight: 600,
              color: COLOR.dim, marginBottom: '8px',
            }}>GOALS</div>
            {fb.goalScorers.map((g, i) => (
              <div key={i} style={{
                fontFamily: FONT.label, fontSize: '13px', color: COLOR.white,
                fontWeight: 500, marginBottom: '4px',
              }}>
                ⚽ {g.scorer} ({g.team === 'A' ? sb.teamAName : sb.teamBName}) - {g.minute}'
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// BADMINTON OVERLAYS
// ═══════════════════════════════════════════════════════════════════

function BadmintonOverlay({ sb, animDelay, theme, layout, font }) {
  const bd = sb.settings?.badminton || {};
  const setHistory = (bd.setScores || []).map(s => `${s.a}-${s.b}`).join(', ');
  const style = getThemeStyles(theme, font, '#F59E0B');

  // ── 1. HORIZONTAL TICKER LAYOUT ─────────────────────────────────
  if (layout === 'ticker') {
    return (
      <div style={{
        position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
        animation: 'slideUp 500ms cubic-bezier(0.16,1,0.3,1) forwards',
        willChange: 'transform, opacity', opacity: 0,
        animationDelay: `${animDelay}ms`, animationFillMode: 'forwards',
        zIndex: 999
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0',
          background: style.bg, backdropFilter: style.backdropFilter,
          borderRadius: style.borderRadius, border: style.border,
          boxShadow: style.boxShadow,
          overflow: 'hidden',
          color: style.color, fontFamily: style.fontFamily
        }}>
          {/* LIVE + Set Indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 16px', borderRight: `1px solid ${style.divider}`,
          }}>
            <LiveBadge status={sb.status} themeStyles={style} />
            <span style={{ fontFamily: style.labelFontFamily, fontSize: '12px', fontWeight: 700, color: style.mutedColor }}>
              SET {bd.currentSetNumber || 1}
            </span>
          </div>

          {/* Player A */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}>
            {bd.serving === 'A' && <span style={{ color: style.accentColor, fontSize: '12px' }}>●</span>}
            <span style={{ fontFamily: style.labelFontFamily, fontWeight: bd.serving === 'A' ? 700 : 500, fontSize: '14px' }}>
              {sb.teamAName}
            </span>
            <span style={{ fontFamily: style.labelFontFamily, fontSize: '11px', color: style.dimColor }}>({bd.setsWonA || 0})</span>
          </div>

          {/* Score Counter */}
          <div style={{
            display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)',
            borderLeft: `1px solid ${style.divider}`, borderRight: `1px solid ${style.divider}`,
            padding: '0 16px', height: '100%', display: 'flex', alignItems: 'center'
          }}>
            <RollingNumber value={sb.teamAScore} size={22} color={bd.serving === 'A' ? style.accentColor : style.color} weight={700} fontFamily={style.fontFamily} />
            <span style={{ margin: '0 8px', opacity: 0.5 }}>-</span>
            <RollingNumber value={sb.teamBScore} size={22} color={bd.serving === 'B' ? style.accentColor : style.color} weight={700} fontFamily={style.fontFamily} />
          </div>

          {/* Player B */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}>
            <span style={{ fontFamily: style.labelFontFamily, fontSize: '11px', color: style.dimColor }}>({bd.setsWonB || 0})</span>
            <span style={{ fontFamily: style.labelFontFamily, fontWeight: bd.serving === 'B' ? 700 : 500, fontSize: '14px' }}>
              {sb.teamBName}
            </span>
            {bd.serving === 'B' && <span style={{ color: style.accentColor, fontSize: '12px' }}>●</span>}
          </div>

          {/* Set History or Match Point */}
          {(setHistory || bd.matchPoint) && (
            <div style={{
              padding: '10px 16px', borderLeft: `1px solid ${style.divider}`,
              fontSize: '11px', fontFamily: style.timerFontFamily, color: style.dimColor,
              display: 'flex', alignItems: 'center'
            }}>
              {bd.matchPoint ? (
                <span style={{ color: style.accentColor, fontWeight: 700, animation: 'matchPointPulse 1s ease-in-out infinite' }}>
                  MP: {bd.matchPoint}
                </span>
              ) : (
                setHistory
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── 2. VERTICAL BUG LAYOUT ──────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', top: '24px', left: '24px',
      animation: 'slideDown 500ms cubic-bezier(0.16,1,0.3,1) forwards',
      willChange: 'transform, opacity', opacity: 0,
      animationDelay: `${animDelay}ms`, animationFillMode: 'forwards',
      zIndex: 999
    }}>
      <div style={{
        background: style.bg, backdropFilter: style.backdropFilter,
        borderRadius: style.borderRadius, border: style.border,
        boxShadow: style.boxShadow,
        padding: '14px 20px', minWidth: '260px',
        display: 'flex', flexDirection: 'column', gap: '8px',
        color: style.color, fontFamily: style.fontFamily
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{
            fontFamily: style.labelFontFamily, fontSize: '10px', fontWeight: 700,
            color: style.mutedColor, letterSpacing: '1.5px',
          }}>SET {bd.currentSetNumber || 1}</div>
          <LiveBadge status={sb.status} themeStyles={style} />
        </div>

        {/* Player A */}
        <PlayerRow
          name={sb.teamAName}
          score={sb.teamAScore}
          setsWon={bd.setsWonA || 0}
          serving={bd.serving === 'A'}
          themeStyles={style}
        />

        {/* Player B */}
        <PlayerRow
          name={sb.teamBName}
          score={sb.teamBScore}
          setsWon={bd.setsWonB || 0}
          serving={bd.serving === 'B'}
          themeStyles={style}
        />

        {/* Set History */}
        {setHistory && (
          <div style={{
            fontFamily: style.timerFontFamily, fontSize: '10px', color: style.dimColor,
            borderTop: `1px solid ${style.divider}`, paddingTop: '6px',
          }}>{setHistory}</div>
        )}

        {/* Match Point */}
        {bd.matchPoint && (
          <div style={{
            fontFamily: style.labelFontFamily, fontSize: '10px', fontWeight: 700,
            color: style.accentColor, textTransform: 'uppercase', letterSpacing: '2px',
            textAlign: 'center', animation: 'matchPointPulse 1s ease-in-out infinite',
          }}>
            MATCH POINT • {bd.matchPoint}
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerRow({ name, score, setsWon, serving, themeStyles }) {
  const F = themeStyles || { labelFontFamily: FONT.label, fontFamily: FONT.score, accentColor: COLOR.accent, color: COLOR.white, mutedColor: COLOR.muted, dimColor: COLOR.dim };
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '4px 0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Serve indicator */}
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: serving ? F.accentColor : 'transparent',
          boxShadow: serving ? `0 0 8px ${F.accentColor}` : 'none',
          transition: `opacity 300ms ${EASE}`,
          willChange: 'opacity',
          opacity: serving ? 1 : 0.2,
          border: serving ? 'none' : '1px solid rgba(255,255,255,0.15)',
        }} />
        <span style={{
          fontFamily: F.labelFontFamily, fontWeight: serving ? 700 : 500,
          fontSize: '14px', color: serving ? F.color : F.mutedColor,
        }}>
          {name}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Sets won */}
        <span style={{
          fontFamily: F.labelFontFamily, fontSize: '11px', color: F.dimColor, fontWeight: 600,
        }}>({setsWon})</span>
        {/* Current score */}
        <RollingNumber value={score} size={22} color={serving ? F.accentColor : F.color} weight={700} fontFamily={F.fontFamily} />
      </div>
    </div>
  );
}

function BadmintonTV({ sb }) {
  const bd = sb.settings?.badminton || {};
  const setHistory = (bd.setScores || []).map((s, i) => `${s.a}-${s.b}`);

  return (
    <>
      <div style={{
        background: COLOR.glass, backdropFilter: 'blur(20px)',
        borderRadius: '28px', border: `1px solid ${COLOR.glassBorder}`,
        padding: '48px 80px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '24px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset',
        animation: 'fadeIn 800ms ease forwards', minWidth: '500px',
      }}>
        <div style={{
          fontFamily: FONT.label, fontSize: '14px', fontWeight: 600,
          color: COLOR.muted, letterSpacing: '3px',
        }}>SET {bd.currentSetNumber || 1}</div>

        {/* Teams + Scores */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '48px',
        }}>
          {/* A */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: FONT.label, fontSize: '26px', fontWeight: 700,
              color: bd.serving === 'A' ? COLOR.white : COLOR.muted,
              borderBottom: bd.serving === 'A' ? `4px solid ${COLOR.gold}` : '4px solid transparent',
              paddingBottom: '8px',
            }}>{sb.teamAName}</div>
            <div style={{ marginTop: '4px' }}>
              <span style={{
                fontFamily: FONT.label, fontSize: '14px', color: COLOR.dim,
              }}>Sets: {bd.setsWonA || 0}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <RollingNumber value={sb.teamAScore} size={96} color={COLOR.white} weight={700} />
            <span style={{
              fontFamily: FONT.score, fontSize: '54px', color: 'rgba(255,255,255,0.15)',
            }}>-</span>
            <RollingNumber value={sb.teamBScore} size={96} color={COLOR.white} weight={700} />
          </div>

          {/* B */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: FONT.label, fontSize: '26px', fontWeight: 700,
              color: bd.serving === 'B' ? COLOR.white : COLOR.muted,
              borderBottom: bd.serving === 'B' ? `4px solid ${COLOR.gold}` : '4px solid transparent',
              paddingBottom: '8px',
            }}>{sb.teamBName}</div>
            <div style={{ marginTop: '4px' }}>
              <span style={{
                fontFamily: FONT.label, fontSize: '14px', color: COLOR.dim,
              }}>Sets: {bd.setsWonB || 0}</span>
            </div>
          </div>
        </div>

        {/* Serve indicator */}
        <div style={{
          fontFamily: FONT.label, fontSize: '14px', color: COLOR.gold,
          fontWeight: 600,
        }}>
          Serving: {bd.serving === 'A' ? sb.teamAName : sb.teamBName}
        </div>

        {/* Match Point */}
        {bd.matchPoint && (
          <div style={{
            fontFamily: FONT.score, fontSize: '24px', fontWeight: 700,
            color: COLOR.gold, letterSpacing: '4px',
            animation: 'matchPointPulse 1s ease-in-out infinite',
          }}>
            MATCH POINT
          </div>
        )}
      </div>

      {/* Set History */}
      {setHistory.length > 0 && (
        <div style={{
          display: 'flex', gap: '20px', marginTop: '24px', justifyContent: 'center',
        }}>
          {setHistory.map((score, i) => (
            <div key={i} style={{
              background: COLOR.surface, border: `1px solid ${COLOR.surfaceBorder}`,
              borderRadius: '12px', padding: '12px 24px', textAlign: 'center',
            }}>
              <div style={{
                fontFamily: FONT.label, fontSize: '11px', color: COLOR.dim,
                fontWeight: 600, letterSpacing: '1px', marginBottom: '4px',
              }}>SET {i + 1}</div>
              <div style={{
                fontFamily: FONT.score, fontSize: '22px', color: COLOR.white, fontWeight: 600,
              }}>{score}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function BadmintonSpectator({ sb }) {
  const bd = sb.settings?.badminton || {};

  return (
    <>
      <div style={{
        background: COLOR.surface, border: `1px solid ${COLOR.surfaceBorder}`,
        borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '16px',
      }}>
        <div style={{
          fontFamily: FONT.label, fontSize: '12px', fontWeight: 700,
          color: COLOR.dim, letterSpacing: '2px',
        }}>SET {bd.currentSetNumber || 1}</div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
        }}>
          <div style={{
            textAlign: 'center', flex: 1,
            borderBottom: bd.serving === 'A' ? `3px solid ${COLOR.gold}` : '3px solid transparent',
            paddingBottom: '6px',
          }}>
            <div style={{
              fontFamily: FONT.label, fontSize: '14px', fontWeight: 700,
              color: bd.serving === 'A' ? COLOR.white : COLOR.muted,
            }}>{sb.teamAName}</div>
            <div style={{
              fontFamily: FONT.label, fontSize: '11px', color: COLOR.dim,
            }}>Sets: {bd.setsWonA || 0}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <RollingNumber value={sb.teamAScore} size={42} color={COLOR.white} weight={700} />
            <span style={{ fontFamily: FONT.score, fontSize: '24px', color: COLOR.dim }}>-</span>
            <RollingNumber value={sb.teamBScore} size={42} color={COLOR.white} weight={700} />
          </div>

          <div style={{
            textAlign: 'center', flex: 1,
            borderBottom: bd.serving === 'B' ? `3px solid ${COLOR.gold}` : '3px solid transparent',
            paddingBottom: '6px',
          }}>
            <div style={{
              fontFamily: FONT.label, fontSize: '14px', fontWeight: 700,
              color: bd.serving === 'B' ? COLOR.white : COLOR.muted,
            }}>{sb.teamBName}</div>
            <div style={{
              fontFamily: FONT.label, fontSize: '11px', color: COLOR.dim,
            }}>Sets: {bd.setsWonB || 0}</div>
          </div>
        </div>

        {bd.matchPoint && (
          <div style={{
            fontFamily: FONT.label, fontSize: '12px', fontWeight: 700,
            color: COLOR.gold, letterSpacing: '2px',
            animation: 'matchPointPulse 1s ease-in-out infinite',
          }}>MATCH POINT</div>
        )}
      </div>

      {/* Set History */}
      {bd.setScores && bd.setScores.length > 0 && (
        <div style={{
          background: COLOR.surface, border: `1px solid ${COLOR.surfaceBorder}`,
          borderRadius: '16px', padding: '16px 20px', display: 'flex',
          flexDirection: 'column', gap: '10px',
        }}>
          <div style={{
            fontFamily: FONT.label, fontSize: '12px', fontWeight: 700,
            color: COLOR.dim, letterSpacing: '1.5px',
          }}>SET HISTORY</div>
          {bd.setScores.map((s, i) => (
            <StatRow key={i} label={`Set ${i + 1}`} value={`${s.a} - ${s.b}`} />
          ))}
        </div>
      )}
    </>
  );
}

// ─── Shared Stat Row ─────────────────────────────────────────────
function StatRow({ label, value, valueColor = COLOR.white }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span style={{
        fontFamily: FONT.label, fontSize: '13px', color: COLOR.muted, fontWeight: 500,
      }}>{label}</span>
      <span style={{
        fontFamily: FONT.label, fontSize: '13px', color: valueColor, fontWeight: 600,
      }}>{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT (inner — reads useSearchParams)
// ═══════════════════════════════════════════════════════════════════

function ScoreboardInner({ params }) {
  const { id: scoreboardId } = use(params);
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'overlay';
  const theme = searchParams.get('theme') || 'glass';
  const layout = searchParams.get('layout') || 'ticker';
  const font = searchParams.get('font') || 'oswald';

  const [scoreboard, setScoreboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [celebration, setCelebration] = useState(null);
  const [entryReady, setEntryReady] = useState(false);

  const prevRef = useRef(null);
  const celebTimeoutRef = useRef(null);

  // ── Celebration Detection ──────────────────────────────────────
  const detectCelebration = useCallback((prev, next) => {
    if (!prev || !next) return null;
    if (mode === 'spectator') return null; // only overlay + tv

    const sport = next.sport;
    if (sport === 'cricket') {
      const prevCr = prev.settings?.cricket || {};
      const nextCr = next.settings?.cricket || {};
      const prevWickets = (prev.currentBattingTeam === 'A' ? prevCr.wicketsA : prevCr.wicketsB) || 0;
      const nextWickets = (next.currentBattingTeam === 'A' ? nextCr.wicketsA : nextCr.wicketsB) || 0;
      if (nextWickets > prevWickets) return 'WICKET!';

      const prevScore = prev.currentBattingTeam === 'A' ? prev.teamAScore : prev.teamBScore;
      const nextScore = next.currentBattingTeam === 'A' ? next.teamAScore : next.teamBScore;
      const diff = nextScore - prevScore;
      if (diff >= 6) return 'SIX!';
      if (diff === 4) return 'FOUR!';
    }

    if (sport === 'football') {
      const totalPrev = (prev.teamAScore || 0) + (prev.teamBScore || 0);
      const totalNext = (next.teamAScore || 0) + (next.teamBScore || 0);
      if (totalNext > totalPrev) return 'GOAL!';
    }

    if (sport === 'badminton') {
      const prevBd = prev.settings?.badminton || {};
      const nextBd = next.settings?.badminton || {};
      if (!prevBd.matchPoint && nextBd.matchPoint) return 'MATCH POINT';
    }

    return null;
  }, [mode]);

  // ── SSE + Initial Fetch ────────────────────────────────────────
  useEffect(() => {
    if (!scoreboardId) return;

    fetch(`${BACKEND_URL}/api/scoreboards/${scoreboardId}`)
      .then(res => {
        if (!res.ok) throw new Error('Scoreboard not found');
        return res.json();
      })
      .then(data => {
        setScoreboard(data);
        prevRef.current = data;
        setLoading(false);
        // Trigger entry animation after a frame
        requestAnimationFrame(() => setEntryReady(true));
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });

    const sseUrl = `${BACKEND_URL}/api/scoreboards/${scoreboardId}/stream`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'deleted') {
          setError('This match scoreboard has been closed or deleted.');
          return;
        }

        // Detect celebration
        const celeb = detectCelebration(prevRef.current, data);
        if (celeb) {
          setCelebration(celeb);
          if (celebTimeoutRef.current) clearTimeout(celebTimeoutRef.current);
          celebTimeoutRef.current = setTimeout(() => setCelebration(null), 2500);
        }

        prevRef.current = data;
        setScoreboard(data);
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    eventSource.onerror = () => {
      // Browser auto-reconnects
    };

    return () => {
      eventSource.close();
      if (celebTimeoutRef.current) clearTimeout(celebTimeoutRef.current);
    };
  }, [scoreboardId, detectCelebration]);

  // ── Loading State ──────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <GlobalStyles mode={mode} />
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          height: '100vh',
          background: mode === 'overlay' ? 'rgba(0,0,0,0)' : COLOR.bg,
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: `3px solid rgba(255,255,255,0.08)`,
            borderTopColor: COLOR.accent,
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      </>
    );
  }

  // ── Error State ────────────────────────────────────────────────
  if (error) {
    return (
      <>
        <GlobalStyles mode={mode} />
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          alignItems: 'center', height: '100vh',
          background: mode === 'overlay' ? 'rgba(0,0,0,0)' : COLOR.bg,
          color: COLOR.red, fontFamily: FONT.label, padding: '20px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.7 }}>⚠</div>
          <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Error</div>
          <div style={{ fontSize: '14px', color: COLOR.muted }}>{error}</div>
        </div>
      </>
    );
  }

  if (!scoreboard) return null;

  const { sport, status } = scoreboard;
  const animDelay = 100;

  // ════════════════════════════════════════════════════════════════
  // OVERLAY MODE
  // ════════════════════════════════════════════════════════════════
  if (mode === 'overlay') {
    return (
      <>
        <GlobalStyles mode="overlay" />
        <CelebrationOverlay celebration={celebration} />
        {sport === 'cricket' && <CricketOverlay sb={scoreboard} animDelay={animDelay} theme={theme} layout={layout} font={font} />}
        {sport === 'football' && <FootballOverlay sb={scoreboard} animDelay={animDelay} theme={theme} layout={layout} font={font} />}
        {sport === 'badminton' && <BadmintonOverlay sb={scoreboard} animDelay={animDelay} theme={theme} layout={layout} font={font} />}
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // TV MODE
  // ════════════════════════════════════════════════════════════════
  if (mode === 'tv') {
    return (
      <>
        <GlobalStyles mode="tv" />
        <CelebrationOverlay celebration={celebration} />
        {status === 'FINISHED' && <WinnerOverlay winner={scoreboard.winner} teamAName={scoreboard.teamAName} teamBName={scoreboard.teamBName} />}

        <div style={{
          height: '100vh', background: COLOR.bg, color: COLOR.white,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', padding: '40px 48px',
          boxSizing: 'border-box', overflow: 'hidden', position: 'relative',
        }}>
          {/* Animated gradient mesh background */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
            background: `
              radial-gradient(ellipse at 20% 50%, rgba(16,185,129,0.06) 0%, transparent 60%),
              radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.04) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 80%, rgba(251,191,36,0.03) 0%, transparent 50%)
            `,
            animation: 'meshRotate 30s linear infinite',
          }} />

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              animation: 'fadeIn 600ms ease forwards',
            }}>
              <div>
                <div style={{
                  fontFamily: FONT.label, fontSize: '14px', fontWeight: 700,
                  color: COLOR.accent, letterSpacing: '4px', textTransform: 'uppercase',
                  marginBottom: '6px',
                }}>
                  KHELO PATNA ELITE TURF
                </div>
                <div style={{
                  fontFamily: FONT.label, fontSize: '18px', fontWeight: 500,
                  color: COLOR.muted,
                }}>
                  {scoreboard.matchName} • <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{sport}</span>
                </div>
              </div>
              <LiveBadge status={status} size="large" />
            </div>

            {/* Center Score */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              justifyContent: 'center', alignItems: 'center', gap: '16px',
            }}>
              {sport === 'cricket' && <CricketTV sb={scoreboard} />}
              {sport === 'football' && <FootballTV sb={scoreboard} />}
              {sport === 'badminton' && <BadmintonTV sb={scoreboard} />}
            </div>
          </div>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // SPECTATOR MODE
  // ════════════════════════════════════════════════════════════════
  return (
    <>
      <GlobalStyles mode="spectator" />
      <div style={{
        minHeight: '100vh', background: COLOR.bg, color: COLOR.white,
        fontFamily: FONT.label, padding: '20px',
        display: 'flex', flexDirection: 'column', gap: '16px',
        maxWidth: '480px', margin: '0 auto', boxSizing: 'border-box',
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center', paddingTop: '8px',
          animation: 'fadeIn 500ms ease forwards',
        }}>
          <LiveBadge status={status} />
          <h1 style={{
            fontFamily: FONT.label, fontSize: '20px', fontWeight: 700,
            margin: '12px 0 4px', color: COLOR.white,
          }}>{scoreboard.matchName}</h1>
          <p style={{
            fontFamily: FONT.label, fontSize: '12px', fontWeight: 600,
            color: COLOR.dim, letterSpacing: '1.5px', textTransform: 'uppercase', margin: 0,
          }}>
            {sport} • KHELO PATNA ELITE TURF
          </p>
        </div>

        {/* Winner Banner */}
        {status === 'FINISHED' && scoreboard.winner && (
          <div style={{
            background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)',
            borderRadius: '14px', padding: '16px', textAlign: 'center',
          }}>
            <div style={{
              fontFamily: FONT.label, fontSize: '11px', color: COLOR.dim,
              letterSpacing: '2px', fontWeight: 600, marginBottom: '6px',
            }}>MATCH RESULT</div>
            <div style={{
              fontFamily: FONT.score, fontSize: '24px', color: COLOR.gold, fontWeight: 700,
            }}>🏆 {scoreboard.winner}</div>
          </div>
        )}

        {/* Sport-specific content */}
        {sport === 'cricket' && <CricketSpectator sb={scoreboard} />}
        {sport === 'football' && <FootballSpectator sb={scoreboard} />}
        {sport === 'badminton' && <BadmintonSpectator sb={scoreboard} />}

        {/* Event Timeline */}
        {scoreboard.events && scoreboard.events.length > 0 && (
          <div style={{
            background: COLOR.surface, border: `1px solid ${COLOR.surfaceBorder}`,
            borderRadius: '16px', padding: '16px 20px', display: 'flex',
            flexDirection: 'column', gap: '10px',
          }}>
            <div style={{
              fontFamily: FONT.label, fontSize: '12px', fontWeight: 700,
              color: COLOR.dim, letterSpacing: '1.5px',
            }}>RECENT EVENTS</div>
            {scoreboard.events.slice(-10).reverse().map((evt, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                borderBottom: i < Math.min(scoreboard.events.length, 10) - 1 ? `1px solid ${COLOR.surfaceBorder}` : 'none',
                paddingBottom: '8px',
              }}>
                <span style={{
                  fontFamily: FONT.timer, fontSize: '10px', color: COLOR.dim,
                  flexShrink: 0, marginTop: '2px', minWidth: '52px',
                }}>
                  {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </span>
                <span style={{
                  fontFamily: FONT.label, fontSize: '13px', color: COLOR.muted, fontWeight: 500,
                }}>
                  {evt.type}{evt.details ? `: ${typeof evt.details === 'string' ? evt.details : JSON.stringify(evt.details)}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Share Button */}
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: `${scoreboard.matchName} - Live Score`,
                text: `Follow ${scoreboard.teamAName} vs ${scoreboard.teamBName} live!`,
                url: window.location.href,
              }).catch(() => {});
            } else {
              navigator.clipboard?.writeText(window.location.href);
            }
          }}
          style={{
            background: COLOR.accent, border: 'none', borderRadius: '14px',
            padding: '14px', fontFamily: FONT.label, fontWeight: 700,
            fontSize: '14px', color: COLOR.white, cursor: 'pointer',
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
            transition: `opacity 200ms ${EASE}`,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Share Live Score
        </button>

        {/* Footer */}
        <div style={{
          textAlign: 'center', padding: '16px 0 8px',
          fontFamily: FONT.label, fontSize: '11px', color: COLOR.dim,
        }}>
          Powered by <span style={{ color: COLOR.accent, fontWeight: 600 }}>Khelo Patna</span>
        </div>
      </div>
    </>
  );
}

// ─── Global Styles Component ─────────────────────────────────────
function GlobalStyles({ mode }) {
  return (
    <style jsx global>{`
      @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&family=Orbitron:wght@400;500;700;900&family=Chakra+Petch:wght@400;500;600;700&display=swap');

      * { margin: 0; padding: 0; box-sizing: border-box; }

      html, body {
        background: ${mode === 'overlay' ? 'rgba(0,0,0,0)' : COLOR.bg} !important;
        ${mode === 'overlay' ? 'overflow: hidden !important;' : ''}
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      @keyframes livePulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }

      @keyframes slideUp {
        from { transform: translateY(40px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      @keyframes slideDown {
        from { transform: translateY(-30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes celebSlideIn {
        from { transform: scale(0.5) translateY(20px); opacity: 0; }
        to { transform: scale(1) translateY(0); opacity: 1; }
      }

      @keyframes celebPulse {
        from { transform: scale(0.95); opacity: 0.8; }
        to { transform: scale(1.05); opacity: 1; }
      }

      @keyframes matchPointPulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }

      @keyframes meshRotate {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(360deg); }
      }
    `}</style>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DEFAULT EXPORT — wrapped in Suspense for useSearchParams
// ═══════════════════════════════════════════════════════════════════

export default function ScoreboardDisplay({ params }) {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', background: 'rgba(0,0,0,0)',
      }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          border: '3px solid rgba(255,255,255,0.08)',
          borderTopColor: '#10B981',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    }>
      <ScoreboardInner params={params} />
    </Suspense>
  );
}
