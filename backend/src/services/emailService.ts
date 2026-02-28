import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { logger } from '../utils/logger.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string
): Promise<boolean> {
  const transport = getTransporter();

  if (!transport) {
    logger.warn('Email not sent — SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.');
    return false;
  }

  const from = process.env.SMTP_FROM || 'treasury@gusto.com';

  try {
    await transport.sendMail({
      from,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
    });
    logger.info('Email sent successfully', { subject, to });
    return true;
  } catch (error) {
    logger.error('Failed to send email', {
      subject,
      to,
      error: (error as Error).message,
    });
    return false;
  }
}

// Log warning at import time if SMTP is not configured
if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  logger.warn('SMTP environment variables are not fully configured. Email sending will be disabled.');
}
