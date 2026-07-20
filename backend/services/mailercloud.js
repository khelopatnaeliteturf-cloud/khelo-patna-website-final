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

// Clean vector SVG icons (No emojis used, 100% email client compatible)
const svgIcons = {
    calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 5px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    clock: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 5px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    mapPin: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -3px; margin-right: 6px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#047857" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    warning: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    card: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 5px;"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>`,
    phone: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`,
    mail: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 4px;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
    pinDetails: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#047857" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -2px; margin-right: 5px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`
};

/**
 * Dispatches a high-contrast, clean, elegant Light Gradient Turf receipt pass to the customer.
 */
async function sendBookingInvoiceEmail(booking) {
    const isCricket = (booking.sport || '').toLowerCase().includes('cricket');
    const sportName = (booking.sport || 'TURF').toUpperCase();
    const subject = `Booking Confirmed: ${sportName} Arena — Khelo Patna Elite Turf [Ref: ${booking.orderId}]`;

    // Official logo URL
    const logoUrl = 'https://khelopatna.in/logo.png';

    const totalAmt = Number(booking.totalAmount || 0);
    const discountAmt = Number(booking.discount || booking.discountAmount || 0);
    const grossAmt = totalAmt + discountAmt;
    const paidAmt = Number(booking.paidAmount || 0);
    const balanceDue = Math.max(0, totalAmt - paidAmt);
    const formattedTime = (booking.timeSlots || []).map(formatSlotTo12Hr).join(', ') || '—';
    
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
<body style="margin: 0; padding: 20px 10px; background: linear-gradient(180deg, #ECFDF5 0%, #D1FAE5 50%, #A7F3D0 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 2px solid #10B981; border-radius: 24px; overflow: hidden; box-shadow: 0 15px 35px rgba(16, 185, 129, 0.2);">
    
    <!-- Top Turf Green Gradient Header -->
    <div style="background: linear-gradient(135deg, #059669 0%, #10B981 50%, #047857 100%); padding: 32px 20px; text-align: center; color: #FFFFFF;">
      
      <!-- Official Khelo Patna Logo Badge -->
      <div style="margin-bottom: 12px;">
        <img src="${logoUrl}" alt="Khelo Patna Elite Turf Logo" style="width: 75px; height: 75px; border-radius: 50%; border: 3px solid #FFFFFF; box-shadow: 0 8px 20px rgba(0,0,0,0.25); background: #FFFFFF; object-fit: contain; padding: 4px;">
      </div>

      <div style="display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px; color: #FFFFFF;">
        ${sportName} ARENA RESERVED
      </div>

      <h1 style="margin: 4px 0 0 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #FFFFFF;">
        Khelo Patna Elite Turf
      </h1>
      <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: 800; opacity: 0.95; letter-spacing: 1px; text-transform: uppercase; color: #D1FAE5;">
        PLAY ELITE. PLAY PATNA.
      </p>
    </div>

    <!-- Booking Content Container -->
    <div style="padding: 24px 20px; background: #FFFFFF;">
      
      <!-- Customer Info & Status Badge -->
      <div style="border-bottom: 2px dashed #E5E7EB; padding-bottom: 16px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="vertical-align: top;">
              <div style="font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">RESERVED FOR</div>
              <div style="font-size: 18px; font-weight: 800; color: #111827; margin-top: 2px;">${booking.customerName}</div>
              <div style="font-size: 13px; color: #4B5563; margin-top: 2px;">${svgIcons.phone} ${booking.customerPhone} ${booking.customerEmail ? `| ${svgIcons.mail} ${booking.customerEmail}` : ''}</div>
            </td>
            <td style="text-align: right; vertical-align: top; width: 40%;">
              <span style="display: inline-block; background: #D1FAE5; border: 1.5px solid #10B981; color: #047857; padding: 6px 12px; border-radius: 12px; font-size: 11px; font-weight: 900; text-transform: uppercase;">
                ${svgIcons.check} ${booking.paymentStatus === 'SUCCESS' ? 'CONFIRMED' : booking.paymentStatus}
              </span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Main Slot Details Card -->
      <div style="background: #F0FDF4; border: 1.5px solid #A7F3D0; border-radius: 18px; padding: 18px; margin-bottom: 20px;">
        <div style="font-size: 11px; font-weight: 900; color: #047857; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
          ${svgIcons.pinDetails} TURF RESERVATION DETAILS
        </div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 9px 0; color: #4B5563; border-bottom: 1px solid #D1FAE5; font-weight: 600;">Sport Arena</td>
            <td style="padding: 9px 0; color: #111827; font-weight: 800; border-bottom: 1px solid #D1FAE5; text-align: right; text-transform: uppercase;">
              ${sportName} ARENA
            </td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #4B5563; border-bottom: 1px solid #D1FAE5; font-weight: 600;">Date</td>
            <td style="padding: 9px 0; color: #111827; font-weight: 800; border-bottom: 1px solid #D1FAE5; text-align: right;">
              ${svgIcons.calendar} ${formattedDate}
            </td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #4B5563; border-bottom: 1px solid #D1FAE5; font-weight: 600;">Time</td>
            <td style="padding: 9px 0; color: #047857; font-weight: 900; border-bottom: 1px solid #D1FAE5; text-align: right; font-family: monospace; font-size: 14px;">
              ${svgIcons.clock} ${formattedTime}
            </td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #4B5563; border-bottom: 1px solid #D1FAE5; font-weight: 600;">Booking Ref / ID</td>
            <td style="padding: 9px 0; color: #374151; font-family: monospace; font-weight: 800; border-bottom: 1px solid #D1FAE5; text-align: right; font-size: 12px;">
              ${booking.orderId}
            </td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #4B5563; font-weight: 600;">Payment Method</td>
            <td style="padding: 9px 0; color: #111827; font-weight: 800; text-align: right; text-transform: uppercase;">
              ${svgIcons.card} ${(booking.paymentMethod || 'OFFLINE').toUpperCase()}
            </td>
          </tr>
        </table>
      </div>

      <!-- Financial Receipt Breakdown Card -->
      <div style="background: #F9FAFB; border: 1.5px solid #E5E7EB; border-radius: 18px; padding: 18px; margin-bottom: 24px;">
        <div style="font-size: 11px; font-weight: 900; color: #047857; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
          ${svgIcons.card} FINANCIAL BREAKDOWN
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${discountAmt > 0 ? `
          <tr>
            <td style="padding: 7px 0; color: #4B5563;">Total Slot Rate</td>
            <td style="padding: 7px 0; color: #111827; font-weight: 700; text-align: right;">₹${grossAmt}</td>
          </tr>
          <tr>
            <td style="padding: 7px 0; color: #059669; font-weight: 700;">Discount Applied ${booking.couponCode ? `(${booking.couponCode})` : ''}</td>
            <td style="padding: 7px 0; color: #059669; font-weight: 800; text-align: right;">- ₹${discountAmt}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 7px 0; color: #111827; font-weight: 700;">Net Payable Amount</td>
            <td style="padding: 7px 0; color: #111827; font-weight: 900; text-align: right; font-size: 15px;">₹${totalAmt}</td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #047857; font-weight: 800; border-top: 1px dashed #D1D5DB;">Advance Paid</td>
            <td style="padding: 9px 0; color: #047857; font-weight: 900; border-top: 1px dashed #D1D5DB; text-align: right; font-size: 16px;">₹${paidAmt}</td>
          </tr>
          <tr>
            <td style="padding: 10px 10px; background: ${balanceDue > 0 ? '#FEF3C7' : '#D1FAE5'}; color: ${balanceDue > 0 ? '#92400E' : '#047857'}; font-weight: 800; border-radius: 8px 0 0 8px;">
              ${balanceDue > 0 ? `${svgIcons.warning} Rest Due on Arrival at Arena` : `${svgIcons.check} Payment Status`}
            </td>
            <td style="padding: 10px 10px; background: ${balanceDue > 0 ? '#FEF3C7' : '#D1FAE5'}; color: ${balanceDue > 0 ? '#92400E' : '#047857'}; font-weight: 900; text-align: right; font-size: 17px; border-radius: 0 8px 8px 0;">
              ${balanceDue > 0 ? `₹${balanceDue}` : 'Fully Paid'}
            </td>
          </tr>
        </table>
      </div>

      <!-- Action Button / Map Location -->
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="https://maps.app.goo.gl/iF1kcgi6seEnsRfaA" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: #FFFFFF; padding: 14px 28px; border-radius: 14px; font-weight: 900; font-size: 14px; text-decoration: none; letter-spacing: 0.5px; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);">
          ${svgIcons.mapPin} GET MAP DIRECTIONS TO ARENA
        </a>
      </div>

      <!-- Footer Info -->
      <div style="border-top: 1px solid #E5E7EB; padding-top: 18px; text-align: center; font-size: 12px; color: #4B5563; line-height: 1.6;">
        <div style="font-weight: 800; color: #111827; margin-bottom: 4px; font-size: 13px;">Khelo Patna Elite Turf</div>
        <div>Near ICICI Bank, Kumhrar, Sandalpur Road, Patna – 800007</div>
        <div>Helpline: <a href="tel:+919709701400" style="color: #059669; text-decoration: none; font-weight: 800;">(+91) 970 970 1400</a> | <a href="mailto:service@khelopatna.in" style="color: #059669; text-decoration: none; font-weight: 700;">service@khelopatna.in</a></div>
        <div style="margin-top: 10px; font-size: 11px; color: #6B7280;">&copy; 2026 Khelo Patna Elite Turf. All Rights Reserved.</div>
      </div>

    </div>
  </div>
</body>
</html>
    `;

    return await sendEmail({ to: booking.customerEmail, subject, htmlContent });
}

/**
 * Dispatches a high-contrast Light Gradient Turf fee payment receipt to the parent.
 */
async function sendFeeInvoiceEmail(student, feeRecord) {
    const subject = `Fee Receipt: ${student.name} (${feeRecord.monthFor}) — Khelo Patna Training Academy`;
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 20px 10px; background: linear-gradient(180deg, #ECFDF5 0%, #D1FAE5 50%, #A7F3D0 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 2px solid #10B981; border-radius: 24px; overflow: hidden; box-shadow: 0 15px 35px rgba(16, 185, 129, 0.2);">
    
    <!-- Top Header Banner -->
    <div style="background: linear-gradient(135deg, #059669 0%, #10B981 50%, #047857 100%); padding: 32px 20px; text-align: center; color: #FFFFFF;">
      <div style="display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px; color: #FFFFFF;">
        ACADEMY FEE RECEIPT
      </div>
      <h1 style="margin: 4px 0 0 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #FFFFFF;">
        Khelo Patna Training Academy
      </h1>
      <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: 800; opacity: 0.95; letter-spacing: 1px; text-transform: uppercase; color: #D1FAE5;">
        TRAIN TODAY. LEAD TOMORROW.
      </p>
    </div>

    <!-- Body -->
    <div style="padding: 24px 20px; background: #FFFFFF;">
      
      <div style="border-bottom: 2px dashed #E5E7EB; padding-bottom: 16px; margin-bottom: 20px;">
        <div style="font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">STUDENT NAME</div>
        <div style="font-size: 18px; font-weight: 800; color: #111827; margin-top: 2px;">${student.name}</div>
        <div style="font-size: 13px; color: #4B5563; margin-top: 2px;">${student.sport ? student.sport.toUpperCase() : ''} | Batch: ${student.batchTime || 'Standard'}</div>
      </div>

      <!-- Receipt Card -->
      <div style="background: #F0FDF4; border: 1.5px solid #A7F3D0; border-radius: 18px; padding: 18px; margin-bottom: 20px;">
        <div style="font-size: 11px; font-weight: 900; color: #047857; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
          ${svgIcons.card} ACADEMY FEE DETAILS
        </div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 9px 0; color: #4B5563; border-bottom: 1px solid #D1FAE5; font-weight: 600;">Billing Period</td>
            <td style="padding: 9px 0; color: #111827; font-weight: 800; border-bottom: 1px solid #D1FAE5; text-align: right;">
              ${svgIcons.calendar} ${feeRecord.monthFor}
            </td>
          </tr>
          <tr>
            <td style="padding: 9px 0; color: #4B5563; border-bottom: 1px solid #D1FAE5; font-weight: 600;">Receipt ID</td>
            <td style="padding: 9px 0; color: #374151; font-family: monospace; font-weight: 800; border-bottom: 1px solid #D1FAE5; text-align: right; font-size: 12px;">
              ${feeRecord._id}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 10px; background: #D1FAE5; color: #047857; font-weight: 800; border-radius: 8px 0 0 8px;">
              ${svgIcons.check} Total Fee Paid
            </td>
            <td style="padding: 10px 10px; background: #D1FAE5; color: #047857; font-weight: 900; text-align: right; font-size: 18px; border-radius: 0 8px 8px 0;">
              ₹${feeRecord.amountPaid}
            </td>
          </tr>
        </table>
      </div>

      <!-- Footer Info -->
      <div style="border-top: 1px solid #E5E7EB; padding-top: 18px; text-align: center; font-size: 12px; color: #4B5563; line-height: 1.6;">
        <div style="font-weight: 800; color: #111827; margin-bottom: 4px; font-size: 13px;">Khelo Patna Training Academy</div>
        <div>Near ICICI Bank, Kumhrar, Sandalpur Road, Patna – 800007</div>
        <div>Helpline: <a href="tel:+919709701400" style="color: #059669; text-decoration: none; font-weight: 800;">(+91) 970 970 1400</a> | <a href="mailto:service@khelopatna.in" style="color: #059669; text-decoration: none; font-weight: 700;">service@khelopatna.in</a></div>
        <div style="margin-top: 10px; font-size: 11px; color: #6B7280;">&copy; 2026 Khelo Patna Elite Turf. All Rights Reserved.</div>
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
