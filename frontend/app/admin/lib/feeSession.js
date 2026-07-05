// Academy session helpers. A session runs April → March
// (e.g. session 2026-27 = April 2026 to March 2027).

// 12 month labels for the session containing `ref`, formatted to match
// the backend `monthFor` field ("April 2026" ... "March 2027").
export function getSessionMonths(ref = new Date()) {
    const startYear = ref.getMonth() >= 3 ? ref.getFullYear() : ref.getFullYear() - 1;
    return Array.from({ length: 12 }, (_, i) =>
        new Date(startYear, 3 + i, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    );
}

// "2026-27" style label for the session containing `ref`.
export function getSessionLabel(ref = new Date()) {
    const startYear = ref.getMonth() >= 3 ? ref.getFullYear() : ref.getFullYear() - 1;
    return `${startYear}-${String(startYear + 1).slice(2)}`;
}
