import dotenv from 'dotenv'

dotenv.config()

import nodemailer from "nodemailer";

//for sending mail to verify the mail

export const sender = {
  email: process.env.SMTP_MAIL,
  name: "Mails Test",
};

export const transporter = nodemailer.createTransport({
  service: "gmail",
  secure: true,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_MAIL,
    pass: process.env.SMTP_PASSWORD
  }
});


// --- Diagnostics: log mailer env (masked) and verify transporter ---
try {
  const mask = (v) => {
    if (!v) return 'MISSING';
    const s = String(v);
    if (s.length <= 4) return '*'.repeat(s.length);
    return s.slice(0, 2) + '***' + s.slice(-2);
  };
  console.log('[MAILER] Config:', {
    SMTP_MAIL_present: !!process.env.SMTP_MAIL,
    SMTP_MAIL_value_masked: mask(process.env.SMTP_MAIL),
    SMTP_PORT_value: process.env.SMTP_PORT,
    NODE_ENV: process.env.NODE_ENV,
  });
  transporter.verify((err, success) => {
    if (err) {
      console.warn('[MAILER] SMTP VERIFY FAILED:', err?.message || err);
    } else {
      console.log('[MAILER] SMTP VERIFY OK');
    }
  });
} catch (e) {
  console.warn('[MAILER] Diagnostics error:', e?.message || e);
}

