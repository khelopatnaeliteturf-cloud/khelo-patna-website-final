const jwt = require('jsonwebtoken');

const parseCookies = (cookieHeader) => {
    const list = {};
    if (!cookieHeader) return list;
    cookieHeader.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        if (parts.length >= 2) {
            list[parts.shift().trim()] = decodeURIComponent(parts.join('='));
        }
    });
    return list;
};

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    // Fallback to cookie
    if (!token && req.headers.cookie) {
        const cookies = parseCookies(req.headers.cookie);
        token = cookies.token;
    }

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    if (!process.env.JWT_SECRET) {
        console.error('FATAL: JWT_SECRET is not configured in the environment.');
        return res.status(500).json({ error: 'Internal security configuration error.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
};

// Middleware to authorize specific roles
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Unauthorized. Insufficient permissions.' });
        }
        next();
    };
};

module.exports = {
    authenticateToken,
    authorizeRoles
};
