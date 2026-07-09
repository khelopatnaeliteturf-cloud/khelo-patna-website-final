const axios = require('axios');

const CASHFREE_ENV = process.env.CASHFREE_ENV || 'sandbox';
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || '';
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || '';

const BASE_URL = CASHFREE_ENV === 'production' 
    ? 'https://api.cashfree.com/pg' 
    : 'https://sandbox.cashfree.com/pg';

// Mock payment flows are ONLY allowed in non-production environments.
// In production, missing credentials must fail closed to prevent
// attackers from confirming bookings/fees without paying.
const IS_PRODUCTION = CASHFREE_ENV === 'production';
const hasCredentials = () => Boolean(CASHFREE_APP_ID && CASHFREE_SECRET_KEY);
const assertCredentialsInProduction = (operation) => {
    if (IS_PRODUCTION && !hasCredentials()) {
        console.error(`CRITICAL: Cashfree credentials missing in production. Refusing to ${operation}.`);
        throw new Error('Payment gateway is not configured. Please contact support.');
    }
};

// Helper to get headers
const getCFHeaders = () => {
    return {
        'x-api-version': '2023-08-01',
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'Content-Type': 'application/json'
    };
};

/**
 * Creates an order session for the Next.js frontend checkout.
 */
async function createOrder({ amount, orderId, customerName, customerEmail, customerPhone, returnUrl }) {
    assertCredentialsInProduction('create an order');

    // Non-production only: return mock session when credentials are missing
    if (!hasCredentials()) {
        console.log('Cashfree credentials missing (non-production). Generating MOCK Order Session...');
        return {
            success: true,
            order_id: orderId,
            payment_session_id: 'mock_session_' + Date.now(),
            mock: true
        };
    }

    let cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length > 10) {
        cleanPhone = cleanPhone.slice(-10);
    }

    try {
        const response = await axios.post(`${BASE_URL}/orders`, {
            order_amount: amount,
            order_currency: 'INR',
            order_id: orderId,
            customer_details: {
                customer_id: cleanPhone,
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: cleanPhone
            },
            order_meta: {
                return_url: returnUrl
            }
        }, { headers: getCFHeaders() });

        return {
            success: true,
            order_id: response.data.order_id,
            payment_session_id: response.data.payment_session_id
        };
    } catch (err) {
        console.error('Cashfree order creation error:', err.response?.data || err.message);
        throw new Error(err.response?.data?.message || 'Failed to create payment order.');
    }
}

/**
 * Generates a Payment Link specifically for WhatsApp Bot booking chat flows.
 */
async function createPaymentLink({ linkId, amount, customerPhone, customerName, customerEmail, returnUrl }) {
    assertCredentialsInProduction('create a payment link');

    let cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length > 10) {
        cleanPhone = cleanPhone.slice(-10);
    }

    if (!hasCredentials()) {
        console.log('Cashfree credentials missing (non-production). Generating MOCK Payment Link...');
        const backendUrl = process.env.BACKEND_SELF_URL || 'http://localhost:5001';
        return `${backendUrl.replace(/\/+$/, '')}/mock-payment.html?order_id=${linkId}&amount=${amount}`;
    }

    try {
        const response = await axios.post(`${BASE_URL}/links`, {
            link_id: linkId,
            link_amount: amount,
            link_currency: 'INR',
            link_purpose: 'KheloPatna Turf Booking',
            customer_details: {
                customer_phone: cleanPhone,
                customer_name: customerName,
                customer_email: customerEmail
            },
            link_notify: {
                send_sms: false,
                send_email: false
            },
            link_meta: {
                return_url: returnUrl
            }
        }, { headers: getCFHeaders() });

        return response.data.link_url;
    } catch (err) {
        console.error('Cashfree link creation error:', err.response?.data || err.message);
        // Never send customers a broken/mock link — fail loudly so the caller can handle it
        throw new Error(err.response?.data?.message || 'Failed to create payment link.');
    }
}

/**
 * Verifies the payment status of an order.
 */
async function verifyPayment(orderId, expectedAmount = null) {
    assertCredentialsInProduction('verify a payment');

    if (!hasCredentials()) {
        console.log(`Mock verification (non-production) for Order: ${orderId} -> SUCCESS`);
        return {
            success: true,
            payment_status: 'SUCCESS',
            mock: true,
            payment_details: {
                transaction_id: 'mock_tx_' + Date.now(),
                // Echo the expected amount so amount-mismatch checks stay consistent in dev
                amount: expectedAmount !== null ? Number(expectedAmount) : 0,
                payment_method: 'UPI',
                mock: true
            }
        };
    }

    try {
        const response = await axios.get(`${BASE_URL}/orders/${orderId}`, {
            headers: getCFHeaders()
        });

        const orderStatus = response.data.order_status; // PAID, ACTIVE, EXPIRED

        return {
            success: true,
            payment_status: orderStatus === 'PAID' ? 'SUCCESS' : 'PENDING',
            payment_details: {
                transaction_id: response.data.cf_order_id,
                amount: response.data.order_amount,
                payment_method: 'CASHFREE'
            }
        };
    } catch (err) {
        console.error('Cashfree verification error:', err.response?.data || err.message);
        return {
            success: false,
            payment_status: 'FAILED'
        };
    }
}

/**
 * Initiates a refund for a Cashfree order.
 */
async function refundPayment(orderId, amount) {
    // Offline bookings are refunded in cash outside the gateway
    if (orderId.startsWith('KP-OFFLINE-')) {
        console.log(`Offline order ${orderId}: no gateway refund needed (handled manually).`);
        return {
            success: true,
            refund_id: 'offline_ref_' + Date.now(),
            status: 'OFFLINE'
        };
    }

    assertCredentialsInProduction('initiate a refund');

    if (!hasCredentials()) {
        console.log(`Mock refund (non-production) for Order: ${orderId}, Amount: ${amount}`);
        return {
            success: true,
            refund_id: 'mock_ref_' + Date.now(),
            status: 'SUCCESS'
        };
    }

    try {
        const refundId = `ref_${Date.now()}`;
        const response = await axios.post(`${BASE_URL}/orders/${orderId}/refunds`, {
            refund_amount: Number(amount),
            refund_id: refundId,
            refund_note: 'Cancelled and refunded by Admin'
        }, {
            headers: getCFHeaders()
        });

        return {
            success: true,
            refund_id: response.data.refund_id,
            status: response.data.refund_status
        };
    } catch (err) {
        console.error('Cashfree refund error:', err.response?.data || err.message);
        throw new Error(err.response?.data?.message || 'Failed to initiate Cashfree refund.');
    }
}

module.exports = {
    createOrder,
    createPaymentLink,
    verifyPayment,
    refundPayment,
    hasCredentials,
    CASHFREE_ENV
};
