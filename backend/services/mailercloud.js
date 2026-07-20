const nodemailer = require('nodemailer');
const dns = require('dns');
const net = require('net');

if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.hostinger.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT) || 587;
const SMTP_SECURE = process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === 'true' : (SMTP_PORT === 465);
const SMTP_USER = process.env.SMTP_USER || 'service@khelopatna.in';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SENDER_EMAIL = process.env.SMTP_SENDER_EMAIL || SMTP_USER || 'service@khelopatna.in';
const SENDER_NAME = 'KheloPatna Elite Turf';

// Custom DNS lookup using resolve4 to strictly fetch IPv4 A-records
function lookupIPv4(hostname, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    if (net.isIP(hostname)) {
        return callback(null, hostname, net.isIPv6(hostname) ? 6 : 4);
    }
    dns.resolve4(hostname, (err, addresses) => {
        if (err || !addresses || !addresses.length) {
            return dns.lookup(hostname, Object.assign({}, options, { family: 4, all: false }), callback);
        }
        return callback(null, addresses[0], 4);
    });
}

// Create a nodemailer transporter
let transporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS && SMTP_PASS !== 'YOUR_HOSTINGER_MAIL_PASSWORD') {
    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE, // false for 587 (STARTTLS)
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS
        },
        lookup: lookupIPv4, // Force DNS to ONLY return IPv4 (prevents ENETUNREACH on Cloud hosts like Render)
        family: 4,
        connectionTimeout: 10000, // 10 seconds timeout
        greetingTimeout: 10000,
        socketTimeout: 15000,
        tls: {
            rejectUnauthorized: false
        }
    });
} else {
    console.warn('[SMTP WARNING] Transporter not initialized. Missing SMTP_PASS or valid SMTP config.');
}

/**
 * Sends a transactional email using Resend / Brevo HTTPS APIs (Port 443) or Nodemailer SMTP.
 */
async function sendEmail({ to, subject, htmlContent }) {
    if (!to) {
        console.warn('[EMAIL CANCELLED] No recipient email address provided.');
        return false;
    }

    // 1. Try Brevo (Sendinblue) HTTP API (Port 443 - Recommended for Render Free Tier)
    if (process.env.BREVO_API_KEY) {
        try {
            const res = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'accept': 'application/json',
                    'api-key': process.env.BREVO_API_KEY,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    sender: { name: SENDER_NAME, email: SENDER_EMAIL },
                    to: [{ email: to }],
                    subject: subject,
                    htmlContent: htmlContent
                })
            });
            const data = await res.json();
            if (res.ok) {
                console.log(`[BREVO DISPATCH SUCCESS] Email sent via Brevo HTTPS API to ${to}. Message ID: ${data.messageId}`);
                return true;
            } else {
                console.error('[BREVO API ERROR]:', data);
            }
        } catch (brevoErr) {
            console.error('[BREVO DISPATCH EXCEPTION]:', brevoErr.message);
        }
    }

    // 2. Try Resend HTTP API (Port 443)
    if (process.env.RESEND_API_KEY) {
        try {
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: process.env.RESEND_SENDER || `${SENDER_NAME} <onboarding@resend.dev>`,
                    to: [to],
                    subject: subject,
                    html: htmlContent
                })
            });
            const data = await res.json();
            if (res.ok) {
                console.log(`Email successfully dispatched via Resend HTTPS API to ${to}. ID: ${data.id}`);
                return true;
            } else {
                console.error('Resend HTTPS API error response:', data);
            }
        } catch (resendErr) {
            console.error('Resend HTTPS dispatch exception:', resendErr.message);
        }
    }

    // 3. Fallback to Nodemailer SMTP (Note: Render Free Tier blocks outbound SMTP ports 25, 465, 587)
    if (!transporter) {
        console.log(`[MOCK EMAIL (SMTP PASS MISSING ON SERVER)] To: ${to}\nSubject: ${subject}\nContent:\n${htmlContent}\n================================`);
        return true;
    }

    try {
        const info = await transporter.sendMail({
            from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
            to: to,
            subject: subject,
            html: htmlContent
        });
        console.log(`Email successfully dispatched via SMTP (${SMTP_HOST}) to ${to}. Response ID: ${info.messageId}`);
        return true;
    } catch (err) {
        console.error('SMTP email dispatch error:', err.message || err);
        return false;
    }
}

// Helper to format raw slots into 12-hour AM/PM format (e.g. "04:00 AM - 05:00 AM")
const formatSlotTo12Hr = (slot) => {
    if (!slot) return '';
    if (slot.includes('AM') || slot.includes('PM')) return slot;
    const parts = slot.split('-').map(p => parseInt(p.trim(), 10));
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return slot;
    const formatHour = (h) => {
        const period = (h >= 12 && h < 24) || h === 24 ? 'PM' : 'AM';
        let displayHour = h % 12;
        if (displayHour === 0) displayHour = 12;
        return `${displayHour < 10 ? '0' + displayHour : displayHour}:00 ${period}`;
    };
    return `${formatHour(parts[0])} - ${formatHour(parts[1])}`;
};

/**
 * Dispatches a $2000-grade luxury HTML booking confirmation pass to the customer.
 */
async function sendBookingInvoiceEmail(booking) {
    const subject = `🏏⚽ Booking Confirmed: ${booking.sport ? booking.sport.toUpperCase() : 'TURF'} Arena — Khelo Patna Elite Turf [Ref: ${booking.orderId}]`;

    const totalAmt = Number(booking.totalAmount || 0);
    const discountAmt = Number(booking.discount || booking.discountAmount || 0);
    const grossAmt = totalAmt + discountAmt;
    const paidAmt = Number(booking.paidAmount || 0);
    const balanceDue = Math.max(0, totalAmt - paidAmt);
    const formattedTime = (booking.timeSlots || []).map(formatSlotTo12Hr).join(', ') || '—';
    const sportEmoji = booking.sport?.toLowerCase() === 'cricket' ? '🏏' : '⚽';
    
    let formattedDate = booking.date || '—';
    try {
        if (booking.date) {
            formattedDate = new Date(booking.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', weekday: 'short' });
        }
    } catch (e) {
        formattedDate = booking.date;
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #040609; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e5e7eb;">
  <div style="max-width: 600px; margin: 20px auto; background-color: #0b0f19; border: 1px solid #1f2937; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,255,136,0.15);">
    
    <!-- Header Banner -->
    <div style="background: linear-gradient(135deg, #00FF88 0%, #059669 50%, #047857 100%); padding: 32px 24px; text-align: center; color: #040609;">
      <div style="display: inline-block; background: rgba(4, 6, 9, 0.15); padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">
        OFFICIAL TURF RESERVATION
      </div>
      <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #040609;">
        Khelo Patna Elite Turf
      </h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: 700; opacity: 0.9; letter-spacing: 1px; text-transform: uppercase;">
        PLAY ELITE. PLAY PATNA.
      </p>
    </div>

    <!-- Booking Body -->
    <div style="padding: 28px 24px;">
      
      <!-- Greeting Header & Status -->
      <div style="border-bottom: 1px dashed #1f2937; padding-bottom: 18px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td>
              <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">RESERVED FOR</div>
              <div style="font-size: 19px; font-weight: 800; color: #ffffff; margin-top: 2px;">${booking.customerName}</div>
              <div style="font-size: 13px; color: #6b7280; margin-top: 2px;">📞 ${booking.customerPhone} ${booking.customerEmail ? `| ✉️ ${booking.customerEmail}` : ''}</div>
            </td>
            <td style="text-align: right; vertical-align: top;">
              <span style="display: inline-block; background: rgba(0, 255, 136, 0.15); border: 1px solid #00FF88; color: #00FF88; padding: 6px 14px; border-radius: 12px; font-size: 11px; font-weight: 800; text-transform: uppercase;">
                ✓ ${booking.paymentStatus === 'SUCCESS' ? 'CONFIRMED' : booking.paymentStatus}
              </span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Main Slot Details Card -->
      <div style="background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
        <div style="font-size: 11px; font-weight: 800; color: #00FF88; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px;">
          📌 TURF RESERVATION DETAILS
        </div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 10px 0; color: #9ca3af; border-bottom: 1px solid #1f2937;">Sport</td>
            <td style="padding: 10px 0; color: #ffffff; font-weight: 800; border-bottom: 1px solid #1f2937; text-align: right; text-transform: uppercase;">
              ${sportEmoji} ${(booking.sport || '').toUpperCase()} ARENA
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #9ca3af; border-bottom: 1px solid #1f2937;">Date</td>
            <td style="padding: 10px 0; color: #ffffff; font-weight: 700; border-bottom: 1px solid #1f2937; text-align: right;">
              📅 ${formattedDate}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #9ca3af; border-bottom: 1px solid #1f2937;">Time</td>
            <td style="padding: 10px 0; color: #00FF88; font-weight: 800; border-bottom: 1px solid #1f2937; text-align: right; font-family: monospace; font-size: 14px;">
              ⏰ ${formattedTime}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #9ca3af; border-bottom: 1px solid #1f2937;">Booking Ref / ID</td>
            <td style="padding: 10px 0; color: #9ca3af; font-family: monospace; font-weight: 700; border-bottom: 1px solid #1f2937; text-align: right; font-size: 12px;">
              ${booking.orderId}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #9ca3af;">Payment Method</td>
            <td style="padding: 10px 0; color: #ffffff; font-weight: 700; text-align: right; text-transform: uppercase;">
              💳 ${(booking.paymentMethod || 'OFFLINE').toUpperCase()}
            </td>
          </tr>
        </table>
      </div>

      <!-- Financial Receipt Breakdown Card -->
      <div style="background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
        <div style="font-size: 11px; font-weight: 800; color: #00FF88; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px;">
          💳 FINANCIAL BREAKDOWN
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${discountAmt > 0 ? `
          <tr>
            <td style="padding: 8px 0; color: #9ca3af;">Total Slot Rate</td>
            <td style="padding: 8px 0; color: #ffffff; font-weight: 700; text-align: right;">₹${grossAmt}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #00FF88;">Discount Applied ${booking.couponCode ? `(${booking.couponCode})` : ''}</td>
            <td style="padding: 8px 0; color: #00FF88; font-weight: 700; text-align: right;">- ₹${discountAmt}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; color: #ffffff; font-weight: 700;">Net Payable Amount</td>
            <td style="padding: 8px 0; color: #ffffff; font-weight: 800; text-align: right; font-size: 16px;">₹${totalAmt}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #34d399; font-weight: 700; border-top: 1px dashed #1f2937;">Advance Paid</td>
            <td style="padding: 10px 0; color: #34d399; font-weight: 800; border-top: 1px dashed #1f2937; text-align: right; font-size: 16px;">₹${paidAmt}</td>
          </tr>
          <tr>
            <td style="padding: 12px 10px; background: ${balanceDue > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 255, 136, 0.15)'}; color: ${balanceDue > 0 ? '#fbbf24' : '#00FF88'}; font-weight: 800; border-radius: 8px 0 0 8px;">
              ${balanceDue > 0 ? '⚠️ Rest Due on Arrival at Arena' : '✓ Payment Status'}
            </td>
            <td style="padding: 12px 10px; background: ${balanceDue > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 255, 136, 0.15)'}; color: ${balanceDue > 0 ? '#fbbf24' : '#00FF88'}; font-weight: 900; text-align: right; font-size: 18px; border-radius: 0 8px 8px 0;">
              ${balanceDue > 0 ? `₹${balanceDue}` : 'Fully Paid'}
            </td>
          </tr>
        </table>
      </div>

      <!-- Action Button / Map Location -->
      <div style="text-align: center; margin-bottom: 28px;">
        <a href="https://maps.app.goo.gl/iF1kcgi6seEnsRfaA" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #00FF88 0%, #059669 100%); color: #040609; padding: 14px 28px; border-radius: 12px; font-weight: 900; font-size: 14px; text-decoration: none; letter-spacing: 0.5px; box-shadow: 0 10px 25px rgba(0, 255, 136, 0.25);">
          📍 GET MAP DIRECTIONS TO ARENA
        </a>
      </div>

      <!-- Footer Info -->
      <div style="border-top: 1px solid #1f2937; padding-top: 20px; text-align: center; font-size: 12px; color: #6b7280; line-height: 1.6;">
        <div style="font-weight: 800; color: #9ca3af; margin-bottom: 4px; font-size: 13px;">Khelo Patna Elite Turf</div>
        <div>Near ICICI Bank, Kumhrar, Sandalpur Road, Patna – 800007</div>
        <div>Helpline: <a href="tel:+919709701400" style="color: #00FF88; text-decoration: none; font-weight: 700;">(+91) 970 970 1400</a> | <a href="mailto:service@khelopatna.in" style="color: #00FF88; text-decoration: none;">service@khelopatna.in</a></div>
        <div style="margin-top: 10px; font-size: 11px; color: #4b5563;">&copy; 2026 Khelo Patna Elite Turf. All Rights Reserved.</div>
      </div>

    </div>
  </div>
</body>
</html>
    `;

    return await sendEmail({ to: booking.customerEmail, subject, htmlContent });
}

/**
 * Dispatches a $2000-grade luxury HTML fee payment receipt to the parent.
 */
async function sendFeeInvoiceEmail(student, feeRecord) {
    const subject = `💳 Fee Receipt: ${student.name} (${feeRecord.monthFor}) — Khelo Patna Training Academy`;
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #040609; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e5e7eb;">
  <div style="max-width: 600px; margin: 20px auto; background-color: #0b0f19; border: 1px solid #1f2937; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,255,136,0.15);">
    
    <!-- Header Banner -->
    <div style="background: linear-gradient(135deg, #00FF88 0%, #059669 50%, #047857 100%); padding: 32px 24px; text-align: center; color: #040609;">
      <div style="display: inline-block; background: rgba(4, 6, 9, 0.15); padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">
        TRAINING ACADEMY RECEIPT
      </div>
      <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #040609;">
        Khelo Patna Training Academy
      </h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: 700; opacity: 0.9; letter-spacing: 1px; text-transform: uppercase;">
        TRAIN TODAY. LEAD TOMORROW.
      </p>
    </div>

    <!-- Body -->
    <div style="padding: 28px 24px;">
      
      <div style="border-bottom: 1px dashed #1f2937; padding-bottom: 18px; margin-bottom: 20px;">
        <div style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">STUDENT NAME</div>
        <div style="font-size: 19px; font-weight: 800; color: #ffffff; margin-top: 2px;">${student.name}</div>
        <div style="font-size: 13px; color: #6b7280; margin-top: 2px;">🏆 ${student.sport ? student.sport.toUpperCase() : ''} | Batch: ${student.batchTime || 'Standard'}</div>
      </div>

      <!-- Receipt Card -->
      <div style="background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
        <div style="font-size: 11px; font-weight: 800; color: #00FF88; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px;">
          📄 ACADEMY FEE DETAILS
        </div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 10px 0; color: #9ca3af; border-bottom: 1px solid #1f2937;">Billing Period</td>
            <td style="padding: 10px 0; color: #ffffff; font-weight: 800; border-bottom: 1px solid #1f2937; text-align: right;">
              📅 ${feeRecord.monthFor}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #9ca3af; border-bottom: 1px solid #1f2937;">Receipt ID</td>
            <td style="padding: 10px 0; color: #9ca3af; font-family: monospace; font-weight: 700; border-bottom: 1px solid #1f2937; text-align: right; font-size: 12px;">
              ${feeRecord._id}
            </td>
          </tr>
          <tr style="background: rgba(0, 255, 136, 0.12);">
            <td style="padding: 12px 10px; color: #00FF88; font-weight: 800; border-radius: 8px 0 0 8px;">
              ✓ Total Fee Paid
            </td>
            <td style="padding: 12px 10px; color: #00FF88; font-weight: 900; text-align: right; font-size: 18px; border-radius: 0 8px 8px 0;">
              ₹${feeRecord.amountPaid}
            </td>
          </tr>
        </table>
      </div>

      <!-- Footer Info -->
      <div style="border-top: 1px solid #1f2937; padding-top: 20px; text-align: center; font-size: 12px; color: #6b7280; line-height: 1.6;">
        <div style="font-weight: 800; color: #9ca3af; margin-bottom: 4px; font-size: 13px;">Khelo Patna Training Academy</div>
        <div>Near ICICI Bank, Kumhrar, Sandalpur Road, Patna – 800007</div>
        <div>Helpline: <a href="tel:+919709701400" style="color: #00FF88; text-decoration: none; font-weight: 700;">(+91) 970 970 1400</a> | <a href="mailto:service@khelopatna.in" style="color: #00FF88; text-decoration: none;">service@khelopatna.in</a></div>
        <div style="margin-top: 10px; font-size: 11px; color: #4b5563;">&copy; 2026 Khelo Patna Elite Turf. All Rights Reserved.</div>
      </div>

    </div>
  </div>
</body>
</html>
    `;

    return await sendEmail({ to: student.email, subject, htmlContent });
}

module.exports = {
    sendBookingInvoiceEmail,
    sendFeeInvoiceEmail
};
