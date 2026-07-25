const express = require('express');
const router = express.Router();
const axios = require('axios');
const MapsReviewUsed = require('../models/MapsReviewUsed');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

// Helper to parse user agent
function parseUserAgent(ua) {
    let device = "Desktop";
    let browser = "Other";
    let osName = "Other";
    
    if (!ua) return { device, browser, os: osName };
    const uaLower = ua.toLowerCase();
    
    if (uaLower.includes("ipad") || uaLower.includes("tablet")) {
        device = "Tablet";
    } else if (uaLower.includes("mobi") || uaLower.includes("android") || uaLower.includes("iphone")) {
        device = "Mobile";
    }
    
    if (uaLower.includes("edg")) {
        browser = "Edge";
    } else if (uaLower.includes("opr") || uaLower.includes("opera")) {
        browser = "Opera";
    } else if (uaLower.includes("chrome")) {
        browser = "Chrome";
    } else if (uaLower.includes("safari")) {
        browser = "Safari";
    } else if (uaLower.includes("firefox")) {
        browser = "Firefox";
    }
    
    if (uaLower.includes("windows")) {
        osName = "Windows";
    } else if (uaLower.includes("macintosh") || uaLower.includes("mac os")) {
        osName = "macOS";
    } else if (uaLower.includes("android")) {
        osName = "Android";
    } else if (uaLower.includes("iphone") || uaLower.includes("ipad")) {
        osName = "iOS";
    } else if (uaLower.includes("linux")) {
        osName = "Linux";
    }
    
    return { device, browser, os: osName };
}

// Randomized pools for Khelo Patna Elite Turf review generation
const KEY_FEATURES = [
    "Premium Indoor Turf Arena", "Top-quality Artificial Grass", "Excellent LED Floodlighting",
    "Professional Cricket Net Benches", "Bowling Machine Sessions", "Sports Academy Programs",
    "Extremely Polite & Professional Staff", "Courteous & Cooperative Management", "Well-Maintained locker & waiting areas", "Ample vehicle parking",
    "Safe & Disciplined environment for kids", "Online Turf Slot Booking", "Clean drinking water & amenities",
    "High ceiling net height for big shots", "Birthday/Event slot hiring", "Exciting local tournaments",
    "Certified & Helpful academy coaches", "Personal attention from trainers", "Friendly & Respectful customer support"
];

const REVIEWER_TYPES = [
    "Turf booking player", "Parent of Cricket Academy student", "Parent of Football Academy student",
    "Regular weekend player", "Corporate team event host", "Co-player with friends",
    "Academy Student", "Local sports enthusiast", "First-time turf visitor", "Long-term turf subscriber"
];

const EMOTIONS = [
    "Happy", "Proud", "Satisfied", "Impressionable", "Grateful",
    "Excited", "Confident", "Relieved", "Thrilled", "Amazed"
];

const FOCUS_AREAS = [
    "Staff professionalism & politeness", "Pitch quality & high ceiling height", "Bowling machine", "Cricket coaching", "Football academy",
    "Booking ease", "Helpful ground staff", "Parking space", "Lockers & benches", "Drinking water & cleanliness",
    "Tournament matches", "Coaching techniques", "Location access", "Player safety", "Overall sports atmosphere"
];

const IMPROVEMENTS = [
    "Better gameplay stamina", "Increased batting/bowling accuracy", "Improved physical fitness",
    "Teamwork & discipline", "Enhanced football dribbling skills", "More confidence in sports",
    "Reduced screen-time for kids", "Better social circle in games", "Enhanced weekend recreation",
    "Better bowling technique"
];

const WRITING_STYLES = [
    "Short Player review", "Detailed experience", "Conversational", "Story-based", "Professional review"
];

const LENGTHS = [
    "20-40 words (short and punchy)",
    "40-70 words (medium length, natural)",
    "70-120 words (detailed gameplay experience)"
];

const POSITIVE_KEYWORDS = [
    "polite", "courteous", "extremely professional", "cooperative", "well-maintained", "outstanding", "superb", "highly-recommended",
    "premium", "friendly", "helpful staff", "perfect", "amazing", "smooth",
    "disciplined", "top-tier", "clean", "wonderful", "impressive", "quality"
];

// Offline Fallback Pools (specifically customized for Khelo Patna Elite Turf)
const fallbacks = [
    "Superb turf pitch quality! The staff is extremely polite, professional, and cooperative. Played football here last night under the LED lights with a smooth booking process.",
    "Best indoor turf in Patna. High ceiling net height for big cricket shots, and the ground staff is very helpful and well-behaved. Highly recommended!",
    "Enrolled my son in the Khelo Patna Football Academy. The coaches are highly professional, patient, and encouraging. Outstanding experience!",
    "Great lighting and plenty of parking space near Kumhrar. The management team is very polite and professional. Perfect for regular weekend games.",
    "Excellent behavior of the support staff and easy online slot reservations. The owner and staff are super courteous, polite, and well-disciplined.",
    "Excellent value for cricket training. Coach Bhakt Vatsal and the staff give personal, professional attention to every student. My child's stamina has improved a lot.",
    "Clean drinking water, locker benches, and a polite, helpful management staff. Easily the most well-maintained turf arena in Bihar.",
    "Hosted a corporate tournament here last Sunday. The staff was incredibly professional and organized everything smoothly. Everyone thoroughly enjoyed it.",
    "My daughter loves the cricket practice nets! The staff is very polite, respectful, and ensures a safe, family-friendly environment.",
    "The turf artificial grass is of high quality and high ceiling height. The staff is polite, professional, and very prompt with bookings.",
    "Great location near Kumhrar. Easy access, polite and cooperative staff, and reasonable rates. We book it every weekend for our football group.",
    "Wonderful coaching program! Highly professional management and coaches. My son has gained so much confidence since joining this academy.",
    "Amazing indoor turf and net setup. The staff is extremely polite and supportive. The LED lighting is fantastic for late-night matches.",
    "Highly recommended turf! Safe, clean, and perfectly run by professional and polite management. Clear advance booking and great hospitality.",
    "Been booking Khelo Patna Turf for months now. Top-class polite staff, spacious nets with high ceiling, and consistent ground quality. Best in Patna."
];

// POST /api/generate-maps-review
router.post('/generate-maps-review', async (req, res) => {
    const { rating } = req.body;
    if (!rating || ![1, 2, 3, 4, 5].includes(Number(rating))) {
        return res.status(400).json({ error: "Rating must be an integer between 1 and 5." });
    }

    // Capture metadata from request
    const ip = req.ip || req.headers['x-forwarded-for'] || "unknown";
    const ua = req.headers['user-agent'] || "unknown";
    const { device, browser, os } = parseUserAgent(ua);

    // Always generate positive reviews (Google Maps rating push)
    // Mostly 5 stars, sometimes 4
    const rand = Math.random();
    const effectiveRating = rand < 0.85 ? 5 : 4;

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    // Helper: check if review is already used
    const isUsed = async (text) => {
        const existing = await MapsReviewUsed.findOne({ text });
        return existing !== null;
    };

    // Helper: mark review as used
    const markUsed = async (text) => {
        const review = new MapsReviewUsed({
            text,
            rating: Number(rating),
            ip,
            userAgent: ua,
            device,
            browser,
            os
        });
        await review.save();
    };

    // Fallback path if GROQ is not set
    if (!GROQ_API_KEY) {
        console.warn("[MapsReview] GROQ_API_KEY is not set — using local fallback");
        // Shuffle fallbacks
        const shuffled = [...fallbacks].sort(() => Math.random() - 0.5);
        for (const fb of shuffled) {
            if (!(await isUsed(fb))) {
                await markUsed(fb);
                return res.json({ text: fb });
            }
        }
        return res.json({ text: fallbacks[Math.floor(Math.random() * fallbacks.length)] });
    }

    // Build randomized prompt for Groq Cloud
    const MAX_RETRIES = 5;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const reviewerType = REVIEWER_TYPES[Math.floor(Math.random() * REVIEWER_TYPES.length)];
        const emotion = EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)];
        
        // Select random focus areas
        const focusCount = Math.floor(Math.random() * 3) + 1; // 1 to 3
        const shuffledFocus = [...FOCUS_AREAS].sort(() => Math.random() - 0.5);
        const selectedFocus = shuffledFocus.slice(0, focusCount);
        
        const improvement = IMPROVEMENTS[Math.floor(Math.random() * IMPROVEMENTS.length)];
        const writingStyle = WRITING_STYLES[Math.floor(Math.random() * WRITING_STYLES.length)];
        const length = LENGTHS[Math.floor(Math.random() * LENGTHS.length)];
        
        // Select random positive keywords
        const keywordCount = Math.floor(Math.random() * 3) + 2; // 2 to 4
        const shuffledKeywords = [...POSITIVE_KEYWORDS].sort(() => Math.random() - 0.5);
        const selectedKeywords = shuffledKeywords.slice(0, keywordCount);

        const prompt = `
BUSINESS PROFILE:
Khelo Patna Elite Turf is a premium indoor sports turf arena established near Saguna More, Khagaul Road, Patna. It offers standard slot bookings for Football and Cricket Turf, Cricket Practice Nets with a professional bowling machine, and academy coaching programs for kids and youth.

Write a Google Maps review for Khelo Patna Elite Turf.
Rating: ${effectiveRating} out of 5 stars.

REVIEWER TYPE: ${reviewerType}
EMOTION: ${emotion}
WRITING STYLE: ${writingStyle}
LENGTH: ${length}
FOCUS AREAS: ${selectedFocus.join(', ')}
STUDENT/PLAYER IMPROVEMENT TO MENTION: ${improvement}
USE SOME OF THESE WORDS NATURALLY: ${selectedKeywords.join(', ')}

BUSINESS HIGHLIGHTS YOU MAY REFERENCE:
- Extremely polite, humble, helpful, and professional staff & management
- High ceiling net height for big cricket shots and football games
- Premium indoor artificial turf pitch with high-quality green grass
- Late-night matches under bright LED floodlights
- Cricket practice nets with a professional bowling machine
- Certified Cricket and Football coaching academy for kids and youth
- Smooth online turf slot scheduling and transparent pricing
- Ample vehicle parking space, clean drinking water, lockers, and benches
- Safe, secure, family-friendly, and disciplined sports environment

CRITICAL STAFF PRAISE RULE:
- Every review MUST include a natural, positive praise for the staff's professionalism, politeness, helpfulness, or courteous management behavior (e.g., "staff is very polite", "courteous management", "extremely professional and helpful ground staff", "well-behaved team", "super cooperative staff").

HUMANIZATION RULES:
- Use natural, conversational language. Do NOT sound robotic, artificial, or marketing-heavy.
- Write like a real customer typing a quick review on their mobile phone.
- Occasionally include minor informal expressions.
- Keep the language simple and authentic.

STRICT ANTI-REPETITION RULES:
- Never repeat any review exactly.
- Never reuse opening sentences.
- Never reuse closing sentences.
- Vary the sentence lengths and tone completely.

OUTPUT RULES:
- Output ONLY the raw review text.
- Do NOT include quotes, headings, labels, intro, or greeting.
- Do NOT use overused cliché phrases: 'holistic development', 'highly recommended', 'top-notch', 'second to none'.
`;

        try {
            const groqRes = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model: GROQ_MODEL,
                    messages: [
                        {
                            role: "system",
                            content: "You are a review generator producing authentic, unique, human-sounding Google Maps reviews for Khelo Patna Elite Turf. Output ONLY the raw review text and nothing else."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    max_tokens: 250,
                    temperature: 1.0
                },
                {
                    headers: {
                        "Authorization": `Bearer ${GROQ_API_KEY}`,
                        "Content-Type": "application/json"
                    },
                    timeout: 12000
                }
            );

            let reply = groqRes.data?.choices?.[0]?.message?.content?.trim() || "";
            
            // Clean outer quotes
            if ((reply.startsWith('"') && reply.endsWith('"')) || (reply.startsWith("'") && reply.endsWith("'"))) {
                reply = reply.substring(1, reply.length - 1).trim();
            }

            if (!reply) continue;

            // Check if used
            if (await isUsed(reply)) {
                console.log(`[MapsReview] Duplicate review generated on attempt ${attempt + 1}, retrying...`);
                continue;
            }

            // Save and return
            await markUsed(reply);
            return res.json({ text: reply });

        } catch (err) {
            console.error(`[MapsReview] Groq generation attempt ${attempt + 1} failed:`, err.message);
            // Continue retry loop
        }
    }

    // If retries fail, fallback to local pool
    console.warn("[MapsReview] All Groq retries failed, falling back to local list");
    const shuffled = [...fallbacks].sort(() => Math.random() - 0.5);
    for (const fb of shuffled) {
        if (!(await isUsed(fb))) {
            await markUsed(fb);
            return res.json({ text: fb });
        }
    }
    return res.json({ text: fallbacks[Math.floor(Math.random() * fallbacks.length)] });
});

// GET /api/admin/maps-reviews (List all generated reviews logs)
router.get('/admin/maps-reviews', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER'), async (req, res) => {
    try {
        const reviews = await MapsReviewUsed.find().sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        console.error('Error fetching maps reviews logs:', err);
        res.status(500).json({ error: 'Server error loading reviews log.' });
    }
});

// GET /api/admin/maps-reviews/stats (Fetch aggregated statistics)
router.get('/admin/maps-reviews/stats', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER'), async (req, res) => {
    try {
        let total = 0;
        try {
            total = await MapsReviewUsed.countDocuments();
        } catch (e) {
            console.warn('MapsReviewUsed count error:', e.message);
        }
        
        const ratings = { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 };
        try {
            const ratingsRes = await MapsReviewUsed.aggregate([
                { $group: { _id: "$rating", count: { $sum: 1 } } }
            ]);
            ratingsRes.forEach(r => {
                if (r._id) ratings[String(r._id)] = r.count;
            });
        } catch (e) {
            console.warn('Ratings aggregate warning:', e.message);
        }

        const devices = { "Desktop": 0, "Mobile": 0, "Tablet": 0 };
        try {
            const devicesRes = await MapsReviewUsed.aggregate([
                { $group: { _id: "$device", count: { $sum: 1 } } }
            ]);
            devicesRes.forEach(d => {
                if (d._id) devices[d._id] = d.count;
            });
        } catch (e) {
            console.warn('Devices aggregate warning:', e.message);
        }

        const os = {};
        try {
            const osRes = await MapsReviewUsed.aggregate([
                { $group: { _id: "$os", count: { $sum: 1 } } }
            ]);
            osRes.forEach(o => {
                if (o._id) os[o._id] = o.count;
            });
        } catch (e) {
            console.warn('OS aggregate warning:', e.message);
        }

        const browser = {};
        try {
            const browserRes = await MapsReviewUsed.aggregate([
                { $group: { _id: "$browser", count: { $sum: 1 } } }
            ]);
            browserRes.forEach(b => {
                if (b._id) browser[b._id] = b.count;
            });
        } catch (e) {
            console.warn('Browser aggregate warning:', e.message);
        }

        const topIps = [];
        try {
            const ipsRes = await MapsReviewUsed.aggregate([
                { $group: { _id: "$ip", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ]);
            ipsRes.forEach(item => {
                if (item._id) topIps.push({ ip: item._id, count: item.count });
            });
        } catch (e) {
            console.warn('IP aggregate warning:', e.message);
        }

        res.json({
            totalReviews: total,
            ratings,
            devices,
            os,
            browser,
            topIps
        });
    } catch (err) {
        console.error('Error computing maps reviews stats:', err);
        res.status(500).json({ error: 'Server error calculating review statistics.' });
    }
});

module.exports = router;
