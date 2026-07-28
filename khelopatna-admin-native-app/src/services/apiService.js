// API Service for KheloPatna Admin Native App
const BASE_URL = 'https://app.khelopatna.in';

let authToken = '';

export const setAuthToken = (token) => {
    authToken = token;
};

export const apiFetch = async (endpoint, options = {}) => {
    const headers = {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        ...(options.headers || {})
    };

    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers
        });
        const data = await response.json();
        return { ok: response.ok, status: response.status, data };
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        return { ok: false, error: error.message };
    }
};

// 1. Auth & Login
export const loginStaff = async (username, password) => {
    return apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
};

// 2. Fetch Available Slots & Manual Booking
export const getAvailableSlots = async (sport = 'cricket', date = '') => {
    const todayStr = date || new Date().toISOString().split('T')[0];
    return apiFetch(`/api/available-slots?sport=${sport}&date=${todayStr}`);
};

export const createManualBooking = async (bookingData) => {
    return apiFetch('/api/slots/book', {
        method: 'POST',
        body: JSON.stringify(bookingData)
    });
};

// 3. WhatsApp Bot Status & Toggle
export const getWhatsappStatus = async () => {
    return apiFetch('/api/admin/whatsapp/status');
};

export const toggleWhatsappBot = async (enabled) => {
    return apiFetch('/api/admin/whatsapp/toggle-bot', {
        method: 'POST',
        body: JSON.stringify({ enabled })
    });
};

// 4. Academy Admission Applications & Approval
export const getAcademyApplications = async () => {
    return apiFetch('/api/academy/admission/applications');
};

export const approveAcademyApplication = async (id) => {
    return apiFetch(`/api/academy/admission/approve/${id}`, {
        method: 'POST'
    });
};

// 5. System Audit Logs
export const getAuditLogs = async () => {
    return apiFetch('/api/audit-logs');
};
