const { SESClient, SendRawEmailCommand } = require('@aws-sdk/client-ses');
const puppeteer = require('puppeteer');
const generateRxFormHTML = require('../template/rxFormTemplate');

const EMAIL_CONFIG = {
    ENABLED: process.env.VITE_EMAIL_ENABLED !== 'false',
    FROM: process.env.VITE_EMAIL_FROM || 'RxForms <noreply@rxforms.com>',
    AWS_REGION:  process.env.VITE_AWS_REGION || 'us-east-1',
    FRONTEND_URL: process.env.VITE_FRONTEND_URL || 'https://rxforms-dev.claritytechlabs.com',
};

/**
 * RFC 2047 encode a display name so SES accepts "Name <email>" in raw MIME.
 * Only encodes the display-name part, leaves the <email> address untouched.
 *
 * Input:  'RxForms <noreply@rxforms.com>'
 * Output: '=?UTF-8?B?UnhGb3Jtcw==?= <noreply@rxforms.com>'
 */
function encodeMIMEAddress(address) {
    const match = address.match(/^(.+?)\s*<(.+)>$/);
    if (!match) return address; // bare email, no display name — nothing to encode
    const [, displayName, email] = match;
    const encoded = Buffer.from(displayName.trim(), 'utf-8').toString('base64');
    return `=?UTF-8?B?${encoded}?= <${email}>`;
}

/**
 * Wrap base64 at 76 chars per line (RFC 2045).
 * Prevents PDF corruption in MIME.
 */
function wrapBase64(base64Str) {
    const clean = (typeof base64Str === 'string' ? base64Str : '').replace(/\s/g, '');
    const lines = [];
    for (let i = 0; i < clean.length; i += 76) {
        lines.push(clean.slice(i, i + 76));
    }
    return lines.join('\r\n');
}

/**
 * Generate a PDF buffer from formData using Puppeteer,
 * and return it as a base64 string.
 */
async function generatePDFBase64(formData) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
        const page = await browser.newPage();
        const html = generateRxFormHTML(formData);

        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '2mm', right: '2mm', bottom: '2mm', left: '2mm' },
        });

        if (!pdfBuffer || pdfBuffer.length === 0) {
            throw new Error('Puppeteer returned an empty PDF buffer.');
        }

        return Buffer.isBuffer(pdfBuffer)
            ? pdfBuffer.toString('base64')
            : Buffer.from(pdfBuffer).toString('base64');
    } finally {
        await browser.close();
    }
}

/**
 * Build a raw MIME email with a PDF attachment and send via AWS SES.
 *
 * @param {string} to          - Recipient email address
 * @param {string} subject     - Email subject
 * @param {string} textBody    - Plain-text email body
 * @param {string} htmlBody    - HTML email body (optional, falls back to textBody)
 * @param {string} pdfBase64   - Base64-encoded PDF string (required)
 * @param {string} filename    - Attachment filename (default: Invisalign-Rx-Form.pdf)
 */
async function sendEmailWithPDFAttachment(to, subject, textBody, htmlBody, pdfBase64, filename = 'Invisalign-Rx-Form.pdf') {
    console.log(EMAIL_CONFIG);
    if (!EMAIL_CONFIG.ENABLED) {
        console.log('[Email] Disabled via config. Skipping send.');
        return { MessageId: 'disabled' };
    }

    if (!pdfBase64 || pdfBase64.length === 0) {
        throw new Error('[Email] pdfBase64 is empty — cannot send without attachment.');
    }

    const ses = new SESClient({ region: EMAIL_CONFIG.AWS_REGION });
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const base64Wrapped = wrapBase64(pdfBase64);

    const parts = [
        `From: ${encodeMIMEAddress(EMAIL_CONFIG.FROM)}`,
        `To: ${encodeMIMEAddress(to)}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',

        // --- Plain text part ---
        `--${boundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 7bit',
        '',
        textBody,
        '',
    ];
    console.log(parts);
    // --- Optional HTML part ---
    if (htmlBody) {
        parts.push(
            `--${boundary}`,
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: 7bit',
            '',
            htmlBody,
            '',
        );
    }

    // --- PDF attachment ---
    parts.push(
        `--${boundary}`,
        `Content-Type: application/pdf; name="${filename}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${filename}"`,
        '',
        base64Wrapped,
        '',
        `--${boundary}--`,
    );

    const rawMessage = parts.join('\r\n');
    const rawBuffer = Buffer.from(rawMessage, 'utf-8');

    const command = new SendRawEmailCommand({
        RawMessage: { Data: rawBuffer },
    });

    const result = await ses.send(command);
    console.log(`[Email] Sent with PDF attachment to ${to} | MessageId: ${result.MessageId}`);
    return result;
}

/**
 * PRIMARY ENTRY POINT
 *
 * Generates the PDF from formData, then sends the approval email
 * with the PDF attached — all in one call.
 *
 * @param {string} recipientEmail  - Where to send the email
 * @param {object} formData        - The Rx form data (passed to PDF generator)
 */
async function sendApprovalEmail(recipientEmail, formData) {
    if (!recipientEmail) throw new Error('[Email] recipientEmail is required.');
    if (!formData)        throw new Error('[Email] formData is required.');

    console.log(`[Email] Generating PDF for formId: ${formData?.formId}`);
    const pdfBase64 = await generatePDFBase64(formData);

    const viewLink = `${EMAIL_CONFIG.FRONTEND_URL}/rx-form/pdf?formId=${formData?.formId || ''}`;

    const subject = 'Invisalign Rx Form - Approved';

    const textBody = [
        'Your Invisalign Rx Form has been approved.',
        '',
        'Please find the form PDF attached to this email.',
    ].join('\n');

    const htmlBody = ``;

    return sendEmailWithPDFAttachment(
        recipientEmail,
        subject,
        textBody,
        htmlBody,
        pdfBase64,
        'Invisalign-Rx-Form.pdf',
    );
}

module.exports = {
    sendApprovalEmail,          // ← use this everywhere
    sendEmailWithPDFAttachment, // ← lower-level, if you need to pass your own PDF
    generatePDFBase64,
    EMAIL_CONFIG,
};