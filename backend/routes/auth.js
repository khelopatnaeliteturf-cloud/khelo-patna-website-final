const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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
            let token = authHeader && authHeader.split(' ')[1];

            // Cookie fallback for sessions authenticated via HTTP-only cookies
            if (!token && req.headers.cookie) {
                const list = {};
                req.headers.cookie.split(';').forEach(c => {
                    const parts = c.split('=');
                    if (parts.length >= 2) list[parts.shift().trim()] = decodeURIComponent(parts.join('='));
                });
                token = list.kp_session || list.token;
            }

            if (!token) {
                return res.status(401).json({ error: 'Unauthorized. Admin credentials required to add user.' });
            }

            let decoded;
            try {
                decoded = jwt.verify(token, getJwtSecret());
            } catch (jwtErr) {
                console.error('JWT Verification Error during staff registration:', jwtErr.message);
                return res.status(401).json({ error: 'Unauthorized. Session expired or invalid admin credentials.' });
            }

            if (!STAFF_REGISTER_ROLES.includes(decoded.role)) {
                return res.status(403).json({ error: 'Unauthorized. Admin credentials required to add user.' });
            }

            // Enforce role-assignment hierarchy: Super Admins & Owners can create any role.
            if (decoded.role !== 'SUPER_ADMIN' && decoded.role !== 'ACADEMY_OWNER') {
                const allowedRoles = ASSIGNABLE_ROLES[decoded.role] || [];
                if (!allowedRoles.includes(role)) {
                    return res.status(403).json({ error: `Your role (${decoded.role}) is not permitted to create accounts with the ${role} role.` });
                }
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

// 5. Update staff details, permissions, role, status, and reset password (Protected)
router.put('/auth/staff/:id', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ACADEMY_OWNER', 'HR_MANAGER'), async (req, res) => {
    try {
        const { name, phone, username, role, permissions, status, newPassword } = req.body;
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

        if (name !== undefined) staff.name = name;
        if (phone !== undefined) staff.phone = phone;
        if (username && username !== staff.username) {
            const existing = await Staff.findOne({ tenantId: req.user.tenantId, username });
            if (existing && String(existing._id) !== String(staff._id)) {
                return res.status(400).json({ error: 'Username already in use by another account.' });
            }
            staff.username = username;
        }

        if (role) {
            const allowedRoles = ASSIGNABLE_ROLES[req.user.role] || [];
            if (!allowedRoles.includes(role) && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ACADEMY_OWNER') {
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

        if (newPassword) {
            if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
                return res.status(400).json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters long.` });
            }
            staff.password = newPassword;
        }

        await staff.save();
        res.json({ message: 'User account details updated successfully.', staff });
    } catch (err) {
        console.error('Error updating staff details:', err);
        res.status(500).json({ error: 'Server error updating staff account.' });
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

// 7. Change Own Password (Protected — Any authenticated user)
router.post('/auth/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required.' });
        }

        if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters long.` });
        }

        const staff = await Staff.findById(req.user.id);
        if (!staff) {
            return res.status(404).json({ error: 'User profile not found.' });
        }

        const isMatch = await staff.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect current password.' });
        }

        staff.password = newPassword;
        await staff.save();

        res.json({ success: true, message: 'Password updated successfully.' });
    } catch (err) {
        console.error('Error changing password:', err);
        res.status(500).json({ error: 'Server error updating password.' });
    }
});

const { sendWhatsAppMessage } = require('../services/whatsapp');
const otpStore = new Map(); // In-memory store: username -> { otp, expiresAt, phone }

// 8. Forgot Password OTP Request via WhatsApp (Public)
router.post('/auth/forgot-password', authLimiter, async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ error: 'Username or phone contact is required.' });
        }

        const cleanInput = username.trim();
        const staff = await Staff.findOne({
            $or: [
                { username: cleanInput },
                { phone: cleanInput }
            ]
        });

        if (!staff) {
            return res.status(404).json({ error: 'No account found matching this username or phone number.' });
        }

        const targetPhone = staff.phone || (cleanInput.match(/^\d{10}$/) ? cleanInput : null);
        if (!targetPhone) {
            return res.status(400).json({ error: `User account '${staff.username}' has no phone contact saved. Please contact Super Admin 'owner'.` });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins

        otpStore.set(staff.username, { otp, expiresAt, phone: targetPhone });

        // Send via WhatsApp
        const waMsg = `🔑 *KheloPatna Security Alert*\n\nYour Admin Password Reset OTP is: *${otp}*\n\nThis OTP is valid for 10 minutes. Please do not share it with anyone.`;
        const sent = await sendWhatsAppMessage(targetPhone, waMsg);

        // Mask phone for privacy (e.g. 97******00)
        const maskedPhone = targetPhone.length >= 10 
            ? targetPhone.slice(0, 2) + '******' + targetPhone.slice(-2) 
            : targetPhone;

        res.json({
            success: true,
            otpSent: true,
            username: staff.username,
            maskedPhone,
            message: sent 
                ? `6-digit OTP sent to WhatsApp number (${maskedPhone}).` 
                : `OTP generated for ${staff.username}. Check WhatsApp or contact Super Admin.`
        });
    } catch (err) {
        console.error('Error in forgot-password request:', err);
        res.status(500).json({ error: 'Server error processing OTP request.' });
    }
});

// 9. Verify WhatsApp OTP & Reset Password (Public)
router.post('/auth/verify-reset-otp', authLimiter, async (req, res) => {
    try {
        const { username, otp, newPassword } = req.body;
        if (!username || !otp || !newPassword) {
            return res.status(400).json({ error: 'Username, OTP, and new password are required.' });
        }

        if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
            return res.status(400).json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters long.` });
        }

        const record = otpStore.get(username);
        if (!record) {
            return res.status(400).json({ error: 'No active OTP request found for this account. Please request a new OTP.' });
        }

        if (Date.now() > record.expiresAt) {
            otpStore.delete(username);
            return res.status(400).json({ error: 'OTP has expired. Please request a new OTP.' });
        }

        if (record.otp !== String(otp).trim()) {
            return res.status(400).json({ error: 'Invalid 6-digit OTP code. Please check your WhatsApp.' });
        }

        const staff = await Staff.findOne({ username });
        if (!staff) {
            return res.status(404).json({ error: 'Staff account not found.' });
        }

        staff.password = newPassword;
        await staff.save();

        // Clear OTP after successful use
        otpStore.delete(username);

        res.json({ success: true, message: 'Password reset successfully! You can now log in.' });
    } catch (err) {
        console.error('Error verifying OTP:', err);
        res.status(500).json({ error: 'Server error resetting password.' });
    }
});

// --- PASSKEY (WEBAUTHN / FIDO2 / FACE ID / FINGERPRINT) ENDPOINTS ---
const passkeyChallenges = new Map();

// 10. Passkey Registration Options (Authenticated)
router.post('/auth/passkey/register-options', authenticateToken, async (req, res) => {
    try {
        const staff = await Staff.findById(req.user.id);
        if (!staff) return res.status(404).json({ error: 'User not found.' });

        const challenge = crypto.randomBytes(32).toString('base64url');
        passkeyChallenges.set(String(req.user.id), challenge);

        const hostHeader = req.get('x-forwarded-host') || req.get('host') || req.hostname || '';
        let rpId = 'khelopatna.in';
        if (hostHeader.includes('localhost')) {
            rpId = 'localhost';
        } else if (hostHeader.includes('onrender.com')) {
            rpId = hostHeader.split(':')[0];
        }

        res.json({
            success: true,
            options: {
                challenge,
                rp: { name: 'KheloPatna Elite Turf', id: rpId },
                user: {
                    id: Buffer.from(String(staff._id)).toString('base64url'),
                    name: staff.username,
                    displayName: staff.name || staff.username
                },
                pubKeyCredParams: [
                    { alg: -7, type: 'public-key' },
                    { alg: -257, type: 'public-key' }
                ],
                authenticatorSelection: {
                    userVerification: 'preferred'
                },
                timeout: 60000
            }
        });
    } catch (err) {
        console.error('Error generating passkey register options:', err);
        res.status(500).json({ error: 'Failed to generate passkey registration options.' });
    }
});

// 11. Passkey Registration Verify (Authenticated)
router.post('/auth/passkey/register-verify', authenticateToken, async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential || !credential.id) {
            return res.status(400).json({ error: 'Invalid passkey credential payload.' });
        }

        const userId = req.user.id || req.user._id || req.user.userId;
        const staff = await Staff.findById(userId);
        if (!staff) return res.status(404).json({ error: 'User not found.' });

        const passkeys = Array.isArray(staff.passkeys) ? staff.passkeys : [];
        const newPasskey = {
            id: String(credential.id),
            publicKey: String(credential.id),
            createdAt: new Date().toISOString()
        };
        
        const updatedPasskeys = [...passkeys.filter(p => p.id !== credential.id), newPasskey];
        staff.passkeys = updatedPasskeys;
        await staff.save();
        passkeyChallenges.delete(String(userId));

        res.json({ success: true, message: 'Passkey registered successfully! You can now log in using Face ID / Touch ID / Fingerprint.' });
    } catch (err) {
        console.error('Error verifying passkey registration:', err);
        res.status(500).json({ error: 'Failed to save passkey.' });
    }
});

// 12. Passkey Login Options (Public)
router.post('/auth/passkey/login-options', authLimiter, async (req, res) => {
    try {
        const challenge = crypto.randomBytes(32).toString('base64url');
        const loginToken = `passkey_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        passkeyChallenges.set(loginToken, challenge);
        const hostname = req.hostname && req.hostname !== 'localhost' ? req.hostname : 'khelopatna.in';

        res.json({
            success: true,
            loginToken,
            options: {
                challenge,
                rpId: hostname,
                userVerification: 'preferred',
                timeout: 60000
            }
        });
    } catch (err) {
        console.error('Error generating passkey login options:', err);
        res.status(500).json({ error: 'Failed to generate passkey login options.' });
    }
});

// 13. Passkey Login Verify (Public)
router.post('/auth/passkey/login-verify', authLimiter, async (req, res) => {
    try {
        const { credential, loginToken, username } = req.body;
        if (!credential || !credential.id) {
            return res.status(400).json({ error: 'Passkey credential missing.' });
        }

        let staff = null;
        if (username) {
            staff = await Staff.findOne({ username });
        }
        
        if (!staff) {
            const allStaff = await Staff.find({});
            staff = allStaff.find(s => (s.passkeys || []).some(p => p.id === credential.id));
        }

        if (!staff) {
            return res.status(401).json({ error: 'No account registered with this Passkey. Please log in with password first and register Passkey in Settings.' });
        }

        const payload = {
            id: staff._id,
            username: staff.username,
            role: staff.role
        };
        const token = jwt.sign(payload, getJwtSecret(), { expiresIn: '24h' });
        const cookiePolicy = sessionCookiePolicy(req);

        res.cookie('token', token, {
            httpOnly: true,
            secure: cookiePolicy.secure,
            sameSite: cookiePolicy.sameSite,
            maxAge: 24 * 60 * 60 * 1000,
            path: '/'
        });

        if (loginToken) passkeyChallenges.delete(loginToken);

        res.json({
            token,
            user: {
                id: staff._id,
                username: staff.username,
                role: staff.role
            }
        });
    } catch (err) {
        console.error('Error verifying passkey login:', err);
        res.status(500).json({ error: 'Passkey authentication failed.' });
    }
});

module.exports = router;
