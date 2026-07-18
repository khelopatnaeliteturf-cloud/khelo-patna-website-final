import { NextResponse } from 'next/server';

export function middleware(request) {
    const { pathname } = request.nextUrl;

    // Allow static files, images, icons, and next internals to load
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/static') ||
        pathname.includes('.') ||
        pathname.startsWith('/api')
    ) {
        return NextResponse.next();
    }

    // Bypass maintenance page for /admin and /login so management functions remain online
    if (pathname.startsWith('/admin') || pathname === '/login') {
        if (pathname.startsWith('/admin')) {
            const sessionMarker = request.cookies.get('kp_session');
            if (!sessionMarker) {
                const loginUrl = new URL('/login', request.url);
                loginUrl.searchParams.set('next', pathname);
                return NextResponse.redirect(loginUrl);
            }
        }
        return NextResponse.next();
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Scheduled Turf Optimization | KheloPatna</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=Unbounded:wght@700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-void: #020305;
            --text-primary: #F8FAFC;
            --text-muted: #94A3B8;
            --neon-green: #10B981;
            --neon-blue: #6366F1;
            --glass-bg: rgba(9, 13, 22, 0.55);
            --glass-border: rgba(255, 255, 255, 0.06);
        }
        body {
            margin: 0;
            padding: 24px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: radial-gradient(circle at center, #070B14 0%, var(--bg-void) 100%);
            color: var(--text-primary);
            font-family: 'Space Grotesk', system-ui, -apple-system, sans-serif;
            overflow: hidden;
            box-sizing: border-box;
        }
        * {
            box-sizing: inherit;
        }
        .container {
            background: var(--glass-bg);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 32px;
            padding: 48px 40px;
            max-width: 620px;
            width: 100%;
            text-align: center;
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6);
            z-index: 10;
            position: relative;
        }
        .brand-logo-container {
            margin-bottom: 24px;
            display: flex;
            justify-content: center;
        }
        .brand-logo {
            height: 60px;
            width: auto;
            filter: drop-shadow(0 0 10px rgba(16, 185, 129, 0.2));
        }
        .scene-container {
            width: 100%;
            height: 220px;
            margin-bottom: 24px;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        svg {
            width: 100%;
            height: 100%;
            max-height: 220px;
        }
        /* Custom Animations */
        @keyframes rotate-clockwise {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        @keyframes rotate-counter {
            from { transform: rotate(0deg); }
            to { transform: rotate(-360deg); }
        }
        @keyframes wrench-work {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(-15deg); }
        }
        @keyframes spark-float {
            0% {
                transform: translate(0, 0) scale(1);
                opacity: 1;
            }
            100% {
                transform: translate(var(--dx), var(--dy)) scale(0.2);
                opacity: 0;
            }
        }
        @keyframes status-pulse {
            0%, 100% { opacity: 0.3; transform: scale(0.9); }
            50% { opacity: 1; transform: scale(1.15); }
        }
        .gear-large {
            transform-origin: 220px 110px;
            animation: rotate-clockwise 10s linear infinite;
        }
        .gear-small {
            transform-origin: 290px 150px;
            animation: rotate-counter 6s linear infinite;
        }
        .worker-arm {
            transform-origin: 130px 130px;
            animation: wrench-work 1.5s ease-in-out infinite;
        }
        .spark {
            fill: #FBBF24;
            filter: drop-shadow(0 0 3px #FBBF24);
            animation: spark-float 1.2s ease-out infinite;
        }
        .spark-1 { --dx: 40px; --dy: -30px; animation-delay: 0.1s; }
        .spark-2 { --dx: 25px; --dy: -45px; animation-delay: 0.4s; }
        .spark-3 { --dx: 50px; --dy: -10px; animation-delay: 0.7s; }
        .spark-4 { --dx: 30px; --dy: 30px; animation-delay: 1.0s; }

        h1 {
            font-family: 'Unbounded', sans-serif;
            font-size: 2rem;
            font-weight: 800;
            margin: 0 0 14px;
            letter-spacing: -0.02em;
            background: linear-gradient(135deg, #FFFFFF 30%, #94A3B8 100%);
            -webkit-background-clip: text;
            -webkit-text-fillColor: transparent;
            line-height: 1.3;
        }
        p {
            color: var(--text-muted);
            font-size: 0.96rem;
            line-height: 1.6;
            margin: 0 auto 36px;
            max-width: 460px;
        }
        .status-tag {
            background: rgba(16, 185, 129, 0.08);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: 30px;
            padding: 6px 16px;
            font-size: 0.72rem;
            font-weight: 700;
            color: var(--neon-green);
            letter-spacing: 0.12em;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 0 16px rgba(16, 185, 129, 0.1);
            text-transform: uppercase;
            margin-bottom: 20px;
        }
        .status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--neon-green);
            animation: status-pulse 1.8s infinite ease-in-out;
        }
        .grid-buttons {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            border-top: 1px solid rgba(255, 255, 255, 0.07);
            padding-top: 28px;
        }
        .support-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 14px 16px;
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            color: #E2E8F0;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.86rem;
            transition: all 0.2s ease-in-out;
        }
        .support-btn:hover {
            background: rgba(255, 255, 255, 0.06);
            border-color: rgba(255, 255, 255, 0.12);
            transform: translateY(-1px);
        }
        .support-label {
            font-size: 0.78rem;
            color: #64748B;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 16px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Brand Logo -->
        <div class="brand-logo-container">
            <img src="/logo.png" alt="KheloPatna Logo" class="brand-logo" />
        </div>

        <!-- Maintenance Scene -->
        <div class="scene-container">
            <svg viewBox="0 0 400 220">
                <defs>
                    <linearGradient id="neon-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#10B981" />
                        <stop offset="100%" stop-color="#6366F1" />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <!-- Neon Background Circuit Grid -->
                <path d="M10,110 L390,110 M200,10 L200,210" stroke="rgba(99, 102, 241, 0.05)" stroke-width="1.5" />
                <circle cx="200" cy="110" r="95" fill="none" stroke="rgba(16, 185, 129, 0.04)" stroke-width="2" />

                <!-- Large Gear (Interactive Worksite) -->
                <g class="gear-large">
                    <circle cx="220" cy="110" r="32" fill="none" stroke="url(#neon-glow)" stroke-width="5" filter="url(#glow)" />
                    <!-- Teeth -->
                    <rect x="216" y="70" width="8" height="12" fill="#10B981" rx="2" />
                    <rect x="216" y="138" width="8" height="12" fill="#10B981" rx="2" />
                    <rect x="178" y="106" width="12" height="8" fill="#10B981" rx="2" />
                    <rect x="246" y="106" width="12" height="8" fill="#10B981" rx="2" />
                    <rect x="188" y="78" width="10" height="10" fill="#10B981" rx="2" transform="rotate(45 220 110)" />
                    <rect x="188" y="78" width="10" height="10" fill="#10B981" rx="2" transform="rotate(135 220 110)" />
                    <rect x="188" y="78" width="10" height="10" fill="#10B981" rx="2" transform="rotate(225 220 110)" />
                    <rect x="188" y="78" width="10" height="10" fill="#10B981" rx="2" transform="rotate(315 220 110)" />
                </g>

                <!-- Small Gear -->
                <g class="gear-small">
                    <circle cx="290" cy="150" r="20" fill="none" stroke="#6366F1" stroke-width="4" filter="url(#glow)" />
                    <!-- Teeth -->
                    <rect x="287" y="124" width="6" height="8" fill="#6366F1" rx="1.5" />
                    <rect x="287" y="168" width="6" height="8" fill="#6366F1" rx="1.5" />
                    <rect x="261" y="147" width="8" height="6" fill="#6366F1" rx="1.5" />
                    <rect x="309" y="147" width="8" height="6" fill="#6366F1" rx="1.5" />
                    <rect x="268" y="128" width="8" height="8" fill="#6366F1" rx="1.5" transform="rotate(45 290 150)" />
                    <rect x="268" y="128" width="8" height="8" fill="#6366F1" rx="1.5" transform="rotate(135 290 150)" />
                </g>

                <!-- Worker Silhouette -->
                <!-- Torso and Head -->
                <path d="M70,210 L85,155 C90,140 105,130 120,130 C135,130 150,140 155,155 L170,210 Z" fill="#1E293B" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" />
                <circle cx="120" cy="100" r="16" fill="#1E293B" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" />
                <!-- Safety Helmet -->
                <path d="M101,98 C101,80 139,80 139,98 C144,98 144,103 139,103 L101,103 C96,103 96,98 101,98 Z" fill="#FBBF24" />
                <rect x="117" y="78" width="6" height="12" fill="#D97706" rx="1" />

                <!-- Animated Arm holding Wrench -->
                <g class="worker-arm">
                    <!-- Shoulder to Hand -->
                    <path d="M142,142 L180,122 C184,120 188,124 186,128 L162,154 Z" fill="#1E293B" />
                    <!-- Wrench Tool -->
                    <g transform="translate(178, 122) rotate(-25)">
                        <rect x="-4" y="-20" width="8" height="24" fill="#94A3B8" rx="1.5" />
                        <!-- Wrench head -->
                        <circle cx="0" cy="-20" r="8" fill="#94A3B8" />
                        <!-- Open jaw -->
                        <rect x="-3" y="-25" width="6" height="6" fill="#020305" />
                    </g>
                </g>

                <!-- Sparks emitting from gear center where wrench meets -->
                <circle class="spark spark-1" cx="210" cy="115" r="2" />
                <circle class="spark spark-2" cx="210" cy="115" r="1.5" />
                <circle class="spark spark-3" cx="210" cy="115" r="2.5" />
                <circle class="spark spark-4" cx="210" cy="115" r="1.8" />
            </svg>
        </div>

        <div class="status-tag">
            <span class="status-dot"></span>
            Maintenance in Progress
        </div>

        <h1>Under Scheduled Maintenance</h1>
        <p>Our team is currently optimizing the turf experience and performing standard recalibrations. We will be back online shortly with a faster booking engine.</p>

        <div class="grid-buttons">
            <div>
                <div class="support-label">Need slot support?</div>
                <a href="tel:+919709701400" class="support-btn">📞 Call 970 970 1400</a>
            </div>
            <div>
                <div class="support-label">General queries?</div>
                <a href="mailto:support@khelopatna.in" class="support-btn">✉️ Email Team</a>
            </div>
        </div>
    </div>
</body>
</html>`;

    return new NextResponse(htmlContent, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        status: 503
    });
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
