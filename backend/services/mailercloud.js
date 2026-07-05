const axios = require('axios');

const MAILERCLOUD_API_KEY = process.env.MAILERCLOUD_API_KEY || '';
const SENDER_EMAIL = process.env.MAILERCLOUD_SENDER_EMAIL || 'service@khelopatna.in';
const SENDER_NAME = 'KheloPatna Elite Turf';

const API_URL = 'https://api.mailercloud.com/v1/send/mail';

/**
 * Sends a transactional email using Mailercloud API.
 */
async function sendEmail({ to, subject, htmlContent }) {
    if (!MAILERCLOUD_API_KEY) {
        console.log(`[MOCK EMAIL] To: ${to}\nSubject: ${subject}\nContent:\n${htmlContent}\n================================`);
        return true;
    }

    try {
        const response = await axios.post(API_URL, {
            subject: subject,
            sender: {
                name: SENDER_NAME,
                email: SENDER_EMAIL
            },
            recipients: [
                {
                    email: to
                }
            ],
            content: [
                {
                    type: 'text/html',
                    value: htmlContent
                }
            ]
        }, {
            headers: {
                'Authorization': MAILERCLOUD_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Email successfully dispatched via Mailercloud to ${to}`);
        return true;
    } catch (err) {
        console.error('Mailercloud sending error:', err.response?.data || err.message);
        return false;
    }
}

/**
 * Dispatches an HTML booking invoice to the customer.
 */
async function sendBookingInvoiceEmail(booking) {
    const subject = `🏏⚽ Booking Confirmed: Order ID ${booking.orderId}`;
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #f9f9f9;">
            <div style="text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px;">
                <h1 style="color: #0b0f19; margin: 0;">KheloPatna Elite Turf</h1>
                <p style="color: #10b981; font-weight: bold; margin: 5px 0 0 0;">PLAY ELITE. PLAY PATNA.</p>
            </div>
            
            <div style="padding: 20px 0;">
                <p>Hello <strong>${booking.customerName}</strong>,</p>
                <p>Thank you for booking with us! Your slot reservation has been successfully confirmed. Please find your invoice details below:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr style="background-color: #0b0f19; color: white;">
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Booking Details</th>
                        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Info</th>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">Sport</td>
                        <td style="padding: 10px; text-align: right; border: 1px solid #ddd; text-transform: uppercase; font-weight: bold;">${booking.sport}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">Date</td>
                        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${booking.date}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">Time Slots</td>
                        <td style="padding: 10px; text-align: right; border: 1px solid #ddd; font-family: monospace;">${booking.timeSlots.join(', ')}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">Order Reference</td>
                        <td style="padding: 10px; text-align: right; border: 1px solid #ddd; font-family: monospace;">${booking.orderId}</td>
                    </tr>
                    <tr style="background-color: #f1f1f1; font-weight: bold;">
                        <td style="padding: 10px; border: 1px solid #ddd;">Amount Paid</td>
                        <td style="padding: 10px; text-align: right; border: 1px solid #ddd; color: #10b981;">₹${booking.paidAmount}</td>
                    </tr>
                </table>
                
                <p style="font-size: 0.9em; color: #666;">If you chose a partial payment option, the remaining balance is due on arrival at the turf.</p>
            </div>
            
            <div style="text-align: center; border-top: 1px solid #eee; padding-top: 20px; font-size: 0.8em; color: #888;">
                <p>Near ICICI Bank, Kumhrar, Sandalpur Road, Patna – 800007</p>
                <p>Helpline: (+91) 970 970 1400 | service@khelopatna.in</p>
                <p>&copy; 2026 KheloPatna Elite Turf. All Rights Reserved.</p>
            </div>
        </div>
    `;

    return await sendEmail({ to: booking.customerEmail, subject, htmlContent });
}

/**
 * Dispatches an HTML fee payment invoice to the parent.
 */
async function sendFeeInvoiceEmail(student, feeRecord) {
    const subject = `💳 Fee Receipt: ${student.name} - ${feeRecord.monthFor}`;
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #f9f9f9;">
            <div style="text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px;">
                <h1 style="color: #0b0f19; margin: 0;">KheloPatna Training Academy</h1>
                <p style="color: #10b981; font-weight: bold; margin: 5px 0 0 0;">TRAIN TODAY. LEAD TOMORROW.</p>
            </div>
            
            <div style="padding: 20px 0;">
                <p>Dear Parent,</p>
                <p>We have successfully recorded the monthly fee payment for your ward <strong>${student.name}</strong>. Here are the invoice receipt details:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr style="background-color: #0b0f19; color: white;">
                        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Fee Details</th>
                        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Info</th>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">Student Name</td>
                        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;"><strong>${student.name}</strong></td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">Sports Discipline</td>
                        <td style="padding: 10px; text-align: right; border: 1px solid #ddd; text-transform: uppercase;">${student.sport}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">Batch Schedule</td>
                        <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${student.batchTime}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">Billing Month</td>
                        <td style="padding: 10px; text-align: right; border: 1px solid #ddd; font-weight: bold;">${feeRecord.monthFor}</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;">Receipt ID</td>
                        <td style="padding: 10px; text-align: right; border: 1px solid #ddd; font-family: monospace;">${feeRecord._id}</td>
                    </tr>
                    <tr style="background-color: #f1f1f1; font-weight: bold;">
                        <td style="padding: 10px; border: 1px solid #ddd;">Amount Paid</td>
                        <td style="padding: 10px; text-align: right; border: 1px solid #ddd; color: #10b981;">₹${feeRecord.amountPaid}</td>
                    </tr>
                </table>
            </div>
            
            <div style="text-align: center; border-top: 1px solid #eee; padding-top: 20px; font-size: 0.8em; color: #888;">
                <p>Near ICICI Bank, Kumhrar, Sandalpur Road, Patna – 800007</p>
                <p>Helpline: (+91) 970 970 1400 | service@khelopatna.in</p>
                <p>&copy; 2026 KheloPatna Elite Turf. All Rights Reserved.</p>
            </div>
        </div>
    `;

    return await sendEmail({ to: student.email, subject, htmlContent });
}

module.exports = {
    sendBookingInvoiceEmail,
    sendFeeInvoiceEmail
};
