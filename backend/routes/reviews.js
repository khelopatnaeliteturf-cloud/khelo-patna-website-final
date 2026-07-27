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

// Fallback pools categorized by theme
const FALLBACK_TURF_BOOKINGS_NIGHT = [
    "Superb turf pitch quality! Played football here late last night under the bright LED floodlights — the lighting vision is crystal clear. The staff is extremely polite and cooperative.",
    "Best indoor turf in Patna for night matches. Fantastic LED floodlights, high ceiling net height for big cricket shots, and very helpful ground staff. Highly recommended!",
    "Great late-night game with friends. The LED floodlight visibility is top-tier and management team is very polite and professional."
];

const FALLBACK_TURF_BOOKINGS_GENERAL = [
    "Superb turf pitch quality! The staff is extremely polite, professional, and cooperative. High ceiling net height and smooth online booking process.",
    "Best indoor turf in Patna. High ceiling net height for big cricket shots, and the ground staff is very helpful and well-behaved. Highly recommended!",
    "Clean drinking water, locker benches, and a polite, helpful management staff. Easily the most well-maintained sports turf in Patna."
];

const FALLBACK_CORPORATE_EVENTS = [
    "Really relieved we chose Khelo Patna Elite Turf for our corporate team event! Super cooperative staff made everything smooth, organized, and hassle-free. Exceptional turf quality and management.",
    "Hosted our company's annual sports event at Khelo Patna Turf. Highly polite and professional management who handled our group seamlessly. Highly recommended for corporate matches!"
];

const FALLBACK_ACADEMY = [
    "Enrolled my son in the Khelo Patna Cricket Academy. The coaches are highly professional, patient, and encouraging. Outstanding progress and great discipline!",
    "Wonderful coaching program! Highly professional management and coaches. My son has gained so much confidence and improved his game since joining this academy."
];

// POST /api/generate-maps-review
router.post('/generate-maps-review', async (req, res) => {
    const { rating } = req.body;
    if (!rating || ![1, 2, 3, 4, 5].includes(Number(rating))) {
        return res.status(400).json({ error: "Rating must be an integer between 1 and 5." });
    }

    // Capture metadata
    const ip = req.ip || req.headers['x-forwarded-for'] || "unknown";
    const ua = req.headers['user-agent'] || "unknown";
    const { device, browser, os } = parseUserAgent(ua);

    // Rating distribution: 85% 5-star, 15% 4-star
    const randRating = Math.random();
    const effectiveRating = randRating < 0.85 ? 5 : 4;

    // Calculate IST Time & Schedule Windows
    const nowIST = new Date(Date.now() + 5.5 * 3600 * 1000);
    const dayIST = nowIST.getUTCDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
    const hourIST = nowIST.getUTCHours(); // 0 to 23
    const isAcademyTimeWindow = (dayIST >= 1 && dayIST <= 5) && (hourIST >= 15 && hourIST < 19);

    // Time-of-day Context System
    let timeOfDay = "NIGHT";
    let timeContextPrompt = "";

    if (hourIST >= 20 || hourIST < 6) {
        timeOfDay = "NIGHT";
        timeContextPrompt = "TIME-OF-DAY CONTEXT (LATE NIGHT / EVENING MATCH): Must naturally mention playing under bright LED floodlights, clear night lighting vision, cool night air, or high net ceiling under floodlights.";
    } else if (hourIST >= 6 && hourIST < 11) {
        timeOfDay = "MORNING";
        timeContextPrompt = "TIME-OF-DAY CONTEXT (EARLY MORNING SESSION): Mention fresh morning game atmosphere, cool morning breeze, energizing morning slot match, or high net ceiling.";
    } else if (hourIST >= 11 && hourIST < 15) {
        timeOfDay = "AFTERNOON";
        timeContextPrompt = "TIME-OF-DAY CONTEXT (AFTERNOON PLAY): Mention comfortable indoor shade away from sun heat, spacious high net ceiling height, or smooth afternoon slot booking.";
    } else {
        timeOfDay = "EVENING";
        timeContextPrompt = "TIME-OF-DAY CONTEXT (PEAK EVENING MATCH): Mention vibrant evening match atmosphere, bright LED floodlights turning on at sunset, high ceiling net height, or polite staff assistance.";
    }

    // Category Selection with Strict Probabilities:
    // 1. Corporate Event: Exactly 8% probability (0.08)
    // 2. Academy Review: Allowed ONLY during 3 PM - 7 PM Mon-Fri (if selected)
    // 3. Turf Bookings & Matches: 92% default (or 100% outside 3 PM - 7 PM Mon-Fri)
    const randCategory = Math.random();
    let category = "TURF_BOOKING";

    if (randCategory < 0.08) {
        category = "CORPORATE_EVENT";
    } else if (isAcademyTimeWindow && randCategory < 0.40) {
        category = "ACADEMY";
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    // Helper: check if review text is already used
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
        let pool = timeOfDay === "NIGHT" ? FALLBACK_TURF_BOOKINGS_NIGHT : FALLBACK_TURF_BOOKINGS_GENERAL;
        if (category === "CORPORATE_EVENT") pool = FALLBACK_CORPORATE_EVENTS;
        if (category === "ACADEMY") pool = FALLBACK_ACADEMY;

        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        for (const fb of shuffled) {
            if (!(await isUsed(fb))) {
                await markUsed(fb);
                return res.json({ text: fb });
            }
        }
        return res.json({ text: pool[Math.floor(Math.random() * pool.length)] });
    }

    // Build specific prompt based on category & time-of-day
    const MAX_RETRIES = 5;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {

        let prompt = "";

        if (category === "CORPORATE_EVENT") {
            prompt = `
BUSINESS PROFILE:
Khelo Patna Elite Turf is a premium indoor sports turf arena near Kumhrar, Sandalpur Road, Patna.

TASK:
Write a 5-star Google Maps review for a Corporate / Company Team Building Event hosted at Khelo Patna Elite Turf.

STRICT CATEGORY CONSTRAINTS (CORPORATE EVENT):
1. Focus strictly on corporate team outing, company cricket/football match, smooth event hosting, and team enjoyment.
2. STAFF PRAISE RULE: Must praise the super cooperative, polite, and professional staff/management (e.g. "super cooperative staff made everything smooth", "highly professional event management").
3. ${timeContextPrompt}
4. DO NOT MENTION BOWLING MACHINE. Absolutely zero mention of bowling machines.
5. DO NOT MENTION KIDS OR ACADEMY COACHING.
6. Length: 30 to 60 words.
7. Language: Natural, authentic, written by an employee or manager who attended the corporate event.
`;
        } else if (category === "ACADEMY") {
            prompt = `
BUSINESS PROFILE:
Khelo Patna Elite Turf is a premium indoor sports turf arena near Kumhrar, Sandalpur Road, Patna offering certified Cricket and Football Academy training for kids.

TASK:
Write a 5-star Google Maps review from a parent whose child is enrolled in the Khelo Patna Sports Academy.

STRICT CATEGORY CONSTRAINTS (ACADEMY REVIEW):
1. Focus on certified coaches, personal attention, discipline, fitness improvement, or kids building confidence and social circle through sports.
2. STAFF PRAISE RULE: Must praise the cooperative, polite, encouraging coaches and management staff.
3. DO NOT MENTION BOWLING MACHINE unless specifically describing cricket net batting drills.
4. Length: 30 to 65 words.
5. Language: Authentic, warm, and conversational parent review.
`;
        } else {
            // Default 92%: Turf Bookings, Hourly Play, Matches
            const isCricketNet = Math.random() < 0.3; // 30% nets, 70% general turf
            prompt = `
BUSINESS PROFILE:
Khelo Patna Elite Turf is a premium indoor sports turf arena near Kumhrar, Sandalpur Road, Patna offering high-quality artificial turf for Cricket and Football matches.

TASK:
Write a 5-star Google Maps review for an hourly turf slot booking / match played with friends.

STRICT CATEGORY CONSTRAINTS (TURF BOOKINGS):
1. ${timeContextPrompt}
2. STAFF PRAISE RULE: Must naturally praise the polite, courteous, cooperative, and professional ground staff or management (e.g. "staff is very polite and cooperative", "courteous management").
3. Highlight high net ceiling height for big shots and premium green turf grass quality.
${isCricketNet ? '4. You may mention cricket practice nets or bowling machine for batting practice.' : '4. DO NOT MENTION BOWLING MACHINE. Focus on football or general cricket turf match.'}
5. DO NOT MENTION CORPORATE EVENTS OR ACADEMY KIDS.
6. Length: 25 to 55 words.
7. Language: Authentic, casual, mobile-friendly review by a sports player.
`;
        }

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
                    max_tokens: 220,
                    temperature: 0.95
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
        }
    }

    // Fallback to local pool if retries fail
    console.warn("[MapsReview] All Groq retries failed, falling back to local list");
    let pool = timeOfDay === "NIGHT" ? FALLBACK_TURF_BOOKINGS_NIGHT : FALLBACK_TURF_BOOKINGS_GENERAL;
    if (category === "CORPORATE_EVENT") pool = FALLBACK_CORPORATE_EVENTS;
    if (category === "ACADEMY") pool = FALLBACK_ACADEMY;

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    for (const fb of shuffled) {
        if (!(await isUsed(fb))) {
            await markUsed(fb);
            return res.json({ text: fb });
        }
    }
    return res.json({ text: pool[Math.floor(Math.random() * pool.length)] });
});

// GET /api/admin/maps-reviews (List all generated reviews logs)
router.get('/admin/maps-reviews', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'ADMIN', 'STAFF'), async (req, res) => {
    try {
        const reviews = await MapsReviewUsed.find().sort({ createdAt: -1 });
        res.json(reviews);
    } catch (err) {
        console.error('Error fetching maps reviews logs:', err);
        res.status(500).json({ error: 'Server error loading reviews log.' });
    }
});

// GET /api/admin/maps-reviews/stats (Fetch aggregated statistics)
router.get('/admin/maps-reviews/stats', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'ADMIN', 'STAFF'), async (req, res) => {
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

        res.json({
            totalReviews: total,
            ratings
        });
    } catch (err) {
        console.error('Error computing maps reviews stats:', err);
        res.status(500).json({ error: 'Server error calculating review statistics.' });
    }
});

module.exports = router;
