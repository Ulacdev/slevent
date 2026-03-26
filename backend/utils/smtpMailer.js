import nodemailer from 'nodemailer';

let cachedTransporter = null;
let isInitialized = false;

function createTransporter() {
  const host = 'smtp.gmail.com';
  const port = 587;
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();
  const secure = false; // 587 uses STARTTLS

  if (!user || !pass) {
    console.warn('⚠️ [SMTP] Gmail credentials (SMTP_USER/SMTP_PASS) are missing in environment.');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

function getTransporter() {
  if (!isInitialized) {
    cachedTransporter = createTransporter();
    isInitialized = true;
  }
  return cachedTransporter;
}

export async function sendSmtpEmail({ to, subject, text, html, replyTo, from, config }) {
  const recipient = String(to || '').trim();
  const mailSubject = String(subject || '').trim();

  const defaultFrom = String(process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();
  const configFrom = config?.fromAddress ? (config.fromName ? `${config.fromName} <${config.fromAddress}>` : config.fromAddress) : null;
  const mailFrom = from || configFrom || defaultFrom;

  if (!recipient || !mailSubject || !mailFrom) {
    return { ok: false, skipped: true, reason: 'Missing recipient/subject/from' };
  }

  const transporter = getTransporter();

  if (!transporter) {
    return { ok: false, skipped: true, reason: 'SMTP not configured' };
  }

  try {
    console.log(`📡 [MAIL] Sending email via ${transporter.options.host}...`);
    const sent = await transporter.sendMail({
      from: mailFrom,
      to: recipient,
      subject: mailSubject,
      text: text || undefined,
      html: html || undefined,
      replyTo: replyTo || undefined,
    });
    console.log(`✅ [MAIL] Email sent! MessageId: ${sent.messageId}`);
    return { ok: true };
  } catch (error) {
    console.error('❌ [MAIL] SMTP sending error:', error.message);
    return { ok: false, error: error.message };
  }
}
