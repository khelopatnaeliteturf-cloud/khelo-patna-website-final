"use client";

import { useRef, useCallback } from 'react';

/**
 * 3D perspective tilt wrapper for glass cards.
 * Follows the cursor with a subtle rotation + moving glare highlight,
 * springs back on leave. Pointer-only (no effect on touch devices).
 */
export default function TiltCard({ children, maxTilt = 7, style = {}, className = '' }) {
    const ref = useRef(null);
    const glareRef = useRef(null);
    const frame = useRef(null);

    const handleMove = useCallback((e) => {
        const el = ref.current;
        if (!el) return;
        if (frame.current) cancelAnimationFrame(frame.current);
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        frame.current = requestAnimationFrame(() => {
            el.style.transform = `perspective(1100px) rotateY(${(px - 0.5) * maxTilt * 2}deg) rotateX(${(0.5 - py) * maxTilt * 2}deg) translateZ(0)`;
            if (glareRef.current) {
                glareRef.current.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,0.08) 0%, transparent 55%)`;
                glareRef.current.style.opacity = '1';
            }
        });
    }, [maxTilt]);

    const handleLeave = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        if (frame.current) cancelAnimationFrame(frame.current);
        el.style.transform = 'perspective(1100px) rotateY(0deg) rotateX(0deg)';
        if (glareRef.current) glareRef.current.style.opacity = '0';
    }, []);

    return (
        <div
            ref={ref}
            className={className}
            onPointerMove={(e) => { if (e.pointerType === 'mouse') handleMove(e); }}
            onPointerLeave={handleLeave}
            style={{
                transition: 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
                transformStyle: 'preserve-3d',
                position: 'relative',
                willChange: 'transform',
                ...style
            }}
        >
            {children}
            <div
                ref={glareRef}
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 'inherit',
                    pointerEvents: 'none',
                    opacity: 0,
                    transition: 'opacity 0.4s ease',
                    zIndex: 3
                }}
            />
        </div>
    );
}
