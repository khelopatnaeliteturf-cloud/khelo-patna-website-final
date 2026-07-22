const axios = require('axios');
const crypto = require('crypto');

const PHONEPE_ENV = process.env.PHONEPE_ENV || 'sandbox';
const PHONEPE_MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || '';
const PHONEPE_SALT_KEY = process.env.PHONEPE_SALT_KEY || '';
const PHONEPE_SALT_INDEX = process.env.PHONEPE_SALT_INDEX || '1';

const BASE_URL = PHONEPE_ENV === 'production'
    ? 'https://api.phonepe.com/apis/hermes'
    : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

const IS_PRODUCTION = PHONEPE_ENV === 'production';
const hasCredentials = () => Boolean(PHONEPE_MERCHANT_ID && PHONEPE_SALT_KEY);

const assertCredentialsInProduction = (operation) => {
    if (IS_PRODUCTION && !hasCredentials()) {
        console.error(`CRITICAL: PhonePe credentials missing in production. Refusing to ${operation}.`);
        throw new Error('PhonePe payment gateway is not configured. Please contact support.');
    }
};

/**
 * Calculates X-VERIFY header for PhonePe API calls.
 * SHA256(endpoint_payload + salt_key) + "###" + salt_index
 */
function calculateXVerify(payloadString, endpointPath) {
    const stringToHash = payloadString + endpointPath + PHONEPE_SALT_KEY;
    const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
    return `${sha256}###${PHONEPE_SALT_INDEX}`;
}

/**
 * Verifies incoming PhonePe Webhook / Callback checksum.
 * SHA256(response_base64 + salt_key) + "###" + salt_index
 */
function verifyChecksum(base64Payload, xVerifyHeader) {
    if (!hasCredentials()) return true; // Bypass signature check in mock mode
    if (!xVerifyHeader) return false;
    const computed = crypto.createHash('sha256').update(base64Payload + PHONEPE_SALT_KEY).digest('hex') + '###' + PHONEPE_SALT_INDEX;
    return computed === xVerifyHeader;
}

/**
 * Creates a PhonePe standard payment checkout order.
 */
async function createPhonePeOrder({ amount, orderId, customerName, customerEmail, customerPhone, redirectUrl, callbackUrl }) {
    let cleanPhone = (customerPhone || '').replace(/\D/g, '');
    if (cleanPhone.length > 10) {
        cleanPhone = cleanPhone.slice(-10);
    }
    if (cleanPhone.length < 10) {
        cleanPhone = '9709701400';
    }

    // Fallback to mock session if credentials are missing
    if (!hasCredentials()) {
        console.log('PhonePe credentials missing. Generating MOCK PhonePe Session...');
        const backendUrl = process.env.BACKEND_SELF_URL || 'https://api.khelopatna.in';
        return {
            success: true,
            orderId,
            redirectUrl: `${backendUrl.replace(/\/+$/, '')}/mock-payment.html?order_id=${orderId}&amount=${amount}&gateway=phonepe`,
            mock: true
        };
    }

    try {
        const amountInPaise = Math.round(Number(amount) * 100);
        const payloadObj = {
            merchantId: PHONEPE_MERCHANT_ID,
            merchantTransactionId: orderId,
            merchantUserId: `CUST_${cleanPhone}`,
            amount: amountInPaise,
            redirectUrl,
            redirectMode: 'REDIRECT',
            callbackUrl,
            mobileNumber: cleanPhone,
            paymentInstrument: {
                type: 'PAY_PAGE'
            }
        };

        const base64Payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64');
        const endpointPath = '/pg/v1/pay';
        const xVerify = calculateXVerify(base64Payload, endpointPath);

        const response = await axios.post(`${BASE_URL}${endpointPath}`, {
            request: base64Payload
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': xVerify
            }
        });

        const resData = response.data;
        if (resData.success && resData.data?.instrumentResponse?.redirectInfo?.url) {
            return {
                success: true,
                orderId,
                redirectUrl: resData.data.instrumentResponse.redirectInfo.url,
                mock: false
            };
        } else {
            throw new Error(resData.message || 'PhonePe failed to return redirect URL.');
        }
    } catch (err) {
        console.error('PhonePe order creation error:', err.response?.data || err.message);
        throw new Error(err.response?.data?.message || err.message || 'Failed to initiate PhonePe payment.');
    }
}

/**
 * Verifies status of a PhonePe transaction by Order ID.
 */
async function verifyPhonePePayment(orderId, expectedAmount = null) {
    if (!hasCredentials()) {
        console.log(`Mock PhonePe verification for Order: ${orderId} -> SUCCESS`);
        return {
            success: true,
            payment_status: 'SUCCESS',
            mock: true,
            payment_details: {
                transaction_id: 'mock_pp_tx_' + Date.now(),
                amount: expectedAmount !== null ? Number(expectedAmount) : 0,
                payment_method: 'PHONEPE_UPI',
                mock: true
            }
        };
    }

    try {
        const endpointPath = `/pg/v1/status/${PHONEPE_MERCHANT_ID}/${orderId}`;
        const stringToHash = endpointPath + PHONEPE_SALT_KEY;
        const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
        const xVerify = `${sha256}###${PHONEPE_SALT_INDEX}`;

        const response = await axios.get(`${BASE_URL}${endpointPath}`, {
            headers: {
                'Content-Type': 'application/json',
                'X-VERIFY': xVerify,
                'X-MERCHANT-ID': PHONEPE_MERCHANT_ID
            }
        });

        const resData = response.data;
        const state = resData.data?.state || '';
        const isSuccess = resData.success && (state === 'COMPLETED' || state === 'SUCCESS');

        return {
            success: isSuccess,
            payment_status: isSuccess ? 'SUCCESS' : (state === 'PENDING' ? 'PENDING' : 'FAILED'),
            payment_details: {
                transaction_id: resData.data?.transactionId || orderId,
                amount: resData.data?.amount ? Number(resData.data.amount) / 100 : 0,
                payment_method: resData.data?.paymentInstrument?.type || 'PHONEPE'
            }
        };
    } catch (err) {
        console.error('PhonePe verification error:', err.response?.data || err.message);
        return {
            success: false,
            payment_status: 'FAILED'
        };
    }
}

module.exports = {
    createPhonePeOrder,
    verifyPhonePePayment,
    verifyChecksum,
    hasCredentials,
    PHONEPE_ENV,
    PHONEPE_MERCHANT_ID
};
