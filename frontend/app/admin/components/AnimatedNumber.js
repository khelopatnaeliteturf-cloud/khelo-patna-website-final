'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Animates numeric values with an ease-out count-up whenever they change.
 * Accepts plain numbers or formatted strings like "₹1,20,500", "85%", "12".
 * Non-numeric parts (currency symbol, separators, suffix) are preserved.
 */
export default function AnimatedNumber({ value, duration = 900 }) {
    const [display, setDisplay] = useState(value);
    const frameRef = useRef(null);
    const prevNumRef = useRef(0);

    useEffect(() => {
        const str = String(value ?? '');
        const match = str.match(/-?[\d,]+(?:\.\d+)?/);
        if (!match) {
            setDisplay(value);
            return;
        }

        const target = parseFloat(match[0].replace(/,/g, ''));
        if (Number.isNaN(target)) {
            setDisplay(value);
            return;
        }

        const prefix = str.slice(0, match.index);
        const suffix = str.slice(match.index + match[0].length);
        const hasDecimals = match[0].includes('.');
        const useGrouping = match[0].includes(',');
        const from = prevNumRef.current;
        prevNumRef.current = target;

        if (from === target) {
            setDisplay(value);
            return;
        }

        // Respect reduced-motion preferences: snap instantly.
        if (typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setDisplay(value);
            return;
        }

        const start = performance.now();
        const fmt = (n) => {
            const rounded = hasDecimals ? n.toFixed(1) : Math.round(n);
            const num = useGrouping
                ? Number(rounded).toLocaleString('en-IN')
                : String(rounded);
            return `${prefix}${num}${suffix}`;
        };

        const tick = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
            setDisplay(fmt(from + (target - from) * eased));
            if (t < 1) frameRef.current = requestAnimationFrame(tick);
        };
        frameRef.current = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frameRef.current);
    }, [value, duration]);

    return <>{display}</>;
}
