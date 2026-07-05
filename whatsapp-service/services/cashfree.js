const axios = require('axios');

const CASHFREE_ENV = process.env.CASHFREE_ENV || 'sandbox';
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || '';
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || '';

const BASE_URL = CASHFREE_ENV === 'production' 
    ? 'https://api.cashfree.com/pg' 
    : 'https://sandbox.cashfree.com/pg';

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
    // Check if credentials exist; if not, return mock session
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
        console.log('Cashfree credentials missing. Generating MOCK Order Session...');
        return {
            success: true,
            order_id: orderId,
            payment_session_id: 'mock_session_' + Date.now(),
            mock: true
        };
    }

    try {
        const response = await axios.post(`${BASE_URL}/orders`, {
            order_amount: amount,
            order_currency: 'INR',
            order_id: orderId,
            customer_details: {
                customer_id: customerPhone,
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: customerPhone
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
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
        console.log('Cashfree credentials missing. Generating MOCK Payment Link...');
        // We link to a simulated mock payment portal on Vercel frontend or local backend
        return `http://localhost:5001/mock-payment.html?order_id=${linkId}&amount=${amount}`;
    }

    try {
        const response = await axios.post(`${BASE_URL}/links`, {
            link_id: linkId,
            link_amount: amount,
            link_currency: 'INR',
            link_purpose: 'KheloPatna Turf Booking',
            customer_details: {
                customer_phone: customerPhone,
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
        // Fall back to a mock link if API fails during sandbox rate limit or downtimes
        return `http://localhost:5001/mock-payment.html?order_id=${linkId}&amount=${amount}`;
    }
}

/**
 * Verifies the payment status of an order.
 */
async function verifyPayment(orderId) {
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY || orderId.startsWith('mock_')) {
        console.log(`Mock verification for Order: ${orderId} -> SUCCESS`);
        return {
            success: true,
            payment_status: 'SUCCESS',
            payment_details: {
                transaction_id: 'mock_tx_' + Date.now(),
                amount: 100,
                payment_method: 'UPI'
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
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY || orderId.startsWith('mock_') || orderId.startsWith('KP-OFFLINE-')) {
        console.log(`Mock refund initiated for Order: ${orderId}, Amount: ${amount}`);
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
    refundPayment
};
