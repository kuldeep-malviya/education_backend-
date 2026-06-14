import nodemailer from 'nodemailer';
import { logger } from './logger.js';

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn('SMTP not fully configured — emails will be logged only');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
};

export const sendEmail = async ({ to, subject, html, text }) => {
  const t = getTransporter();
  if (!t) {
    logger.info(`[email:dev] to=${to} subject="${subject}"`);
    return { dev: true };
  }
  return t.sendMail({
    from: process.env.SMTP_FROM || 'StudyPath <no-reply@studypath.app>',
    to,
    subject,
    text,
    html,
  });
};
