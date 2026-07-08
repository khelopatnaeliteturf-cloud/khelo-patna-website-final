const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const Staff = require('../models/Staff');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');
const { ensureDefaultTenant } = require('../lib/bootstrap');

const JWT_SECRET = process.env.JWT_SECRET;
const STAFF_REGISTER_ROLES = ['SUPER_ADMIN', 'ACADEMY_OWNER', 'HR_MANAGER'];

// Which roles each registrar role is allowed to assign. Prevents privilege
// escalation (e.g. an HR_MANAGER creating a SUPER_ADMIN account).
const ASSIGNABLE_ROLES = {
    SUPER_ADMIN: ['SUPER_ADMIN', 'ACADEMY_OWNER', 'BRANCH_MANAGER', 'FINANCE_MANAGER', 'RECEPTIONIST', 'COACH', 'GROUND_MANAGER', 'HR_MANAGER', 'PARENT', 'MEMBER'],
    ACADEMY_OWNER: ['BRANCH_MANAGER', 'FINANCE_MANAGER', 'RECEPTIONIST', 'COACH', 'GROUND_MANAGER', 'HR_MANAGER', 'PARENT', 'MEMBER'],
    HR_MANAGER: ['RECEPTIONIST', 'COACH', 'GROUND_MANAGER', 'PARENT', 'MEMBER']
};

const MIN_PASSWORD_LENGTH = 8;
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Please try again later.' }
});

function getJwtSecret() {
    if (!JWT_SECRET) {
        throw new Error('FATAL: JWT_SECRET is not configured in environment variables.');
    }
    return JWT_SECRET;
}

// Determines cookie SameSite/Secure attributes per-request. When the browser
// is on HTTPS (e.g. behind a proxy or embedded in a cross-site iframe like
// the v0 preview), SameSite=None + Secure is required for the cookie to be
// sent at all; browsers silently drop SameSite=Lax cookies in iframes.
const sessionCookiePolicy = (req) => {
    const origin = req.headers.origin || '';
    const isHttpsClient =
        req.secure ||
        req.headers['x-forwarded-proto'] === 'https' ||
        origin.startsWith('https://');
    return isHttpsClient
        ? { sameSite: 'none', secure: true }
        : { sameSite: 'lax', secure: false };
};

// 0. Bootstrap status (Public) — tells the login page whether the very first
// admin account still needs to be created. Reveals nothing beyond a boolean.
router.get('/auth/bootstrap-status', async (req, res) => {
    try {
        const staffCount = await Staff.countDocuments();
        res.json({ bootstrapNeeded: staffCount === 0 });
    } catch (err) {
        console.error('Error checking bootstrap status:', err);
        res.status(500).json({ error: 'Server error checking bootstrap status.' });
    }
});

// 1. Staff Login (Public)
router.post('/auth/login', authLimiter, async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const staff = await Staff.findOne({ username });
        if (!staff) {
            return res.status(400).json({ error: 'Invalid username or password.' });
        }

        if (staff.status === 'INACTIVE') {
            return res.status(403).json({ error: 'Your account has been deactivated. Please contact your system administrator.' });
        }

        const isMatch = await staff.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid username or password.' });
        }

        const token = jwt.sign(
            { id: staff._id, username: staff.username, role: staff.role, tenantId: staff.tenantId, branchId: staff.branchId },
            getJwtSecret(),
            { expiresIn: '1d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 1 day
            path: '/',
            ...sessionCookiePolicy(req)
        });

        res.json({
            success: true,
            token,
            user: {
                id: staff._id,
                username: staff.username,
                role: staff.role,
                tenantId: staff.tenantId,
                branchId: staff.branchId
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

// 1b. Staff Logout
router.post('/auth/logout', (req, res) => {
    res.clearCookie('token', {
        path: '/'
    });
    res.json({ success: true, message: 'Logged out successfully.' });
});

// 2. Register Staff Account (Admin permission only, with bootstrap fallback)
router.post('/auth/register', authLimiter, async (req, res) => {
    const { username, password, role, name, phone } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Username, password, and role are required.' });
    }

    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` });
    }

    try {
        const staffCount = await Staff.countDocuments();
        let tenantId = null;
        let branchId = null;

        if (staffCount > 0) {
            const authHeader = req.headers['authorization'];
            const token = authHeader && authHeader.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: 'Unauthorized. Admin credentials required to add staff.' });
            }

            const decoded = jwt.verify(token, getJwtSecret());
            if (!STAFF_REGISTER_ROLES.includes(decoded.role)) {
                return res.status(403).json({ error: 'Only Super Admin, Academy Owner, or HR Manager can register staff.' });
            }

            // Enforce role-assignment hierarchy: a registrar can only create
            // accounts with roles at or below their own privilege level.
            const allowedRoles = ASSIGNABLE_ROLES[decoded.role] || [];
            if (!allowedRoles.includes(role)) {
                return res.status(403).json({ error: `Your role (${decoded.role}) is not permitted to create accounts with the ${role} role.` });
            }

            tenantId = decoded.tenantId;
            branchId = decoded.branchId;
        } else {
            console.log('No staff users found. Bootstrapping first admin with default tenant...');
            const { tenant, branch } = await ensureDefaultTenant();
            tenantId = tenant._id;
            branchId = branch._id;
        }

        const existingUser = await Staff.findOne({ tenantId, username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists.' });
        }

        const newStaff = new Staff({
            username,
            password,
            role,
            name: name || null,
            phone: phone || null,
            tenantId,
            branchId
        });

        await newStaff.save();

        res.status(201).json({
            success: true,
            message: `Staff account successfully registered for ${username} with role ${role}.`,
            user: {
                id: newStaff._id,
                username: newStaff.username,
                role: newStaff.role,
                tenantId: newStaff.tenantId,
                branchId: newStaff.branchId
            }
        });

    } catch (err) {
        console.error('Staff registration error:', err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error registering staff.' });
    }
});

// 3. List staff directory (Protected)
router.get('/auth/staff', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'HR_MANAGER', 'BRANCH_MANAGER'), async (req, res) => {
    try {
        const staff = await Staff.find({ tenantId: req.user.tenantId })
            .select('-password')
            .sort({ createdAt: -1 });
        res.json(staff);
    } catch (err) {
        console.error('Error listing staff:', err);
        res.status(500).json({ error: 'Server error loading staff directory.' });
    }
});

// 4. Get profile (Protected)
router.get('/auth/me', authenticateToken, async (req, res) => {
    try {
        const staff = await Staff.findById(req.user.id).select('-password');
        if (!staff) {
            return res.status(404).json({ error: 'User profile not found.' });
        }
        res.json(staff);
    } catch (err) {
        console.error('Error fetching staff profile:', err);
        res.status(500).json({ error: 'Server error loading profile.' });
    }
});

// 5. Update staff permissions, role, and status (Protected)
router.put('/auth/staff/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'HR_MANAGER'), async (req, res) => {
    try {
        const { role, permissions, status } = req.body;
        const staff = await Staff.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!staff) {
            return res.status(404).json({ error: 'Staff member not found.' });
        }
        
        // Prevent self-demotion or self-deactivation
        if (req.user.id === req.params.id) {
            if (role && role !== staff.role) {
                return res.status(403).json({ error: 'You cannot change your own role.' });
            }
            if (status && status !== staff.status) {
                return res.status(403).json({ error: 'You cannot change your own active status.' });
            }
        }

        if (role) {
            const allowedRoles = ASSIGNABLE_ROLES[req.user.role] || [];
            if (!allowedRoles.includes(role) && req.user.role !== 'SUPER_ADMIN') {
                return res.status(403).json({ error: `Your role (${req.user.role}) is not permitted to assign the ${role} role.` });
            }
            staff.role = role;
        }

        if (permissions !== undefined) {
            staff.permissions = permissions;
        }

        if (status) {
            staff.status = status;
        }

        await staff.save();
        res.json({ message: 'Staff member access controls updated successfully.', staff });
    } catch (err) {
        console.error('Error updating staff access control:', err);
        res.status(500).json({ error: 'Server error updating staff permissions.' });
    }
});

// 6. Delete staff member (Protected — SUPER_ADMIN or ACADEMY_OWNER only)
router.delete('/auth/staff/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER'), async (req, res) => {
    try {
        // Prevent deleting oneself
        if (req.user.id === req.params.id) {
            return res.status(403).json({ error: 'You cannot delete your own account.' });
        }

        const staff = await Staff.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!staff) {
            return res.status(404).json({ error: 'Staff member not found.' });
        }

        // Prevent deleting the owner account
        if (staff.username === 'owner') {
            return res.status(403).json({ error: 'The primary owner account cannot be deleted.' });
        }

        await Staff.deleteOne({ _id: req.params.id, tenantId: req.user.tenantId });
        res.json({ message: 'Staff member successfully deleted.' });
    } catch (err) {
        console.error('Error deleting staff member:', err);
        res.status(500).json({ error: 'Server error deleting staff member.' });
    }
});

module.exports = router;
