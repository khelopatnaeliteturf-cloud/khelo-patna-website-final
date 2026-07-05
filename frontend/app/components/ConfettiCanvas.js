"use client";

import { useEffect, useRef } from 'react';

/**
 * Lightweight canvas confetti for the 1-year anniversary celebration.
 * - Fires a golden burst once after mount (post-loader), then gently
 *   rains a few ambient flakes for `ambientSeconds`.
 * - Zero dependencies, respects prefers-reduced-motion, auto-cleans up.
 */
export default function ConfettiCanvas({ delay = 1600, ambientSeconds = 6 }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let raf = null;
        let particles = [];
        let running = true;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        const resize = () => {
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
        };
        resize();
        window.addEventListener('resize', resize);

        const COLORS = ['#FFD700', '#FFE066', '#00FF88', '#00C8FF', '#FFFFFF'];

        const spawnBurst = (count, originYRatio) => {
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 4 + Math.random() * 9;
                particles.push({
                    x: canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.35,
                    y: canvas.height * originYRatio,
                    vx: Math.cos(angle) * speed * dpr,
                    vy: (Math.sin(angle) * speed - 7) * dpr,
                    w: (5 + Math.random() * 6) * dpr,
                    h: (3 + Math.random() * 4) * dpr,
                    color: COLORS[Math.floor(Math.random() * COLORS.length)],
                    rot: Math.random() * Math.PI * 2,
                    vr: (Math.random() - 0.5) * 0.25,
                    life: 1,
                    decay: 0.004 + Math.random() * 0.006
                });
            }
        };

        const spawnAmbient = () => {
            particles.push({
                x: Math.random() * canvas.width,
                y: -20 * dpr,
                vx: (Math.random() - 0.5) * 1.2 * dpr,
                vy: (0.9 + Math.random() * 1.4) * dpr,
                w: (4 + Math.random() * 5) * dpr,
                h: (3 + Math.random() * 3) * dpr,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                rot: Math.random() * Math.PI * 2,
                vr: (Math.random() - 0.5) * 0.15,
                life: 1,
                decay: 0.0025
            });
        };

        const GRAVITY = 0.16;
        const tick = () => {
            if (!running) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles = particles.filter(p => p.life > 0 && p.y < canvas.height + 40 * dpr);
            for (const p of particles) {
                p.vy += GRAVITY * dpr;
                p.vx *= 0.99;
                p.x += p.vx;
                p.y += p.vy;
                p.rot += p.vr;
                p.life -= p.decay;
                ctx.save();
                ctx.globalAlpha = Math.max(p.life, 0);
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, Math.abs(Math.sin(p.rot)) * p.h + 1);
                ctx.restore();
            }
            if (particles.length > 0) {
                raf = requestAnimationFrame(tick);
            } else {
                raf = null;
            }
        };

        const ensureLoop = () => {
            if (raf === null && running) raf = requestAnimationFrame(tick);
        };

        // Initial celebration burst (after preloader fades)
        const burstTimer = setTimeout(() => {
            spawnBurst(140, 0.55);
            ensureLoop();
        }, delay);

        // Gentle ambient golden rain for a few seconds afterwards
        const ambientInterval = setInterval(spawnAmbient, 260);
        const ambientStop = setTimeout(() => clearInterval(ambientInterval), delay + ambientSeconds * 1000);
        const ambientKick = setTimeout(ensureLoop, delay + 300);

        return () => {
            running = false;
            if (raf) cancelAnimationFrame(raf);
            clearTimeout(burstTimer);
            clearTimeout(ambientStop);
            clearTimeout(ambientKick);
            clearInterval(ambientInterval);
            window.removeEventListener('resize', resize);
        };
    }, [delay, ambientSeconds]);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: 900
            }}
        />
    );
}
