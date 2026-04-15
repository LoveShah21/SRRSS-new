const logger = require('../utils/logger');

/**
 * Email service — configurable transport.
 * Uses console logging by default; can be switched to SMTP/SendGrid via env vars.
 *
 * Set EMAIL_ENABLED=true and configure SMTP_* env vars for real email delivery.
 */

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.EMAIL_ENABLED === 'true') {
    try {
      const nodemailer = require('nodemailer');
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      await transporter.verify();
      logger.info('Email transport connected');
    } catch (err) {
      logger.error('Email transport failed to connect', { error: err.message });
      transporter = null;
    }
  }

  return transporter;
}

const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@srrss.com';
const APP_NAME = 'SRRSS – Smart Recruitment System';

/**
 * Send an email (or log to console if transport not configured)
 */
async function sendEmail({ to, subject, text, html }) {
  const transport = await getTransporter();

  if (!transport) {
    logger.info(`[EMAIL-CONSOLE] To: ${to} | Subject: ${subject}`);
    logger.info(`[EMAIL-CONSOLE] Body: ${text || html}`);
    return { sent: false, reason: 'no-transport', logged: true };
  }

  try {
    const result = await transport.sendMail({
      from: `"${APP_NAME}" <${EMAIL_FROM}>`,
      to,
      subject,
      text,
      html,
    });
    logger.info(`Email sent to ${to}`, { messageId: result.messageId });
    return { sent: true, messageId: result.messageId };
  } catch (err) {
    logger.error(`Failed to send email to ${to}`, { error: err.message });
    return { sent: false, error: err.message };
  }
}

// ─── Template Functions ──────────────────────────────────

async function sendInterviewScheduled({ candidateEmail, candidateName, jobTitle, scheduledAt, link, notes }) {
  const date = new Date(scheduledAt).toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });

  return sendEmail({
    to: candidateEmail,
    subject: `Interview Scheduled – ${jobTitle}`,
    text: `Hi ${candidateName},\n\nYour interview for "${jobTitle}" has been scheduled.\n\nDate: ${date}\n${link ? `Link: ${link}\n` : ''}${notes ? `Notes: ${notes}\n` : ''}\nBest regards,\n${APP_NAME}`,
    html: `<h2>Interview Scheduled</h2><p>Hi ${candidateName},</p><p>Your interview for <strong>${jobTitle}</strong> has been scheduled.</p><p><strong>Date:</strong> ${date}</p>${link ? `<p><strong>Link:</strong> <a href="${link}">${link}</a></p>` : ''}${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}<p>Best regards,<br/>${APP_NAME}</p>`,
  });
}

async function sendStatusChange({ candidateEmail, candidateName, jobTitle, newStatus }) {
  const statusMessages = {
    shortlisted: 'You have been shortlisted! We will be in touch about next steps.',
    interview: 'An interview has been scheduled for you. Check your dashboard for details.',
    hired: 'Congratulations! You have been selected for the position!',
    rejected: 'Thank you for your application. Unfortunately, we have decided to move forward with other candidates.',
  };

  const statusMsg = statusMessages[newStatus] || `Your application status has been updated to: ${newStatus}`;

  return sendEmail({
    to: candidateEmail,
    subject: `Application Update – ${jobTitle}`,
    text: `Hi ${candidateName},\n\n${statusMsg}\n\nPosition: ${jobTitle}\nNew Status: ${newStatus}\n\nBest regards,\n${APP_NAME}`,
    html: `<h2>Application Update</h2><p>Hi ${candidateName},</p><p>${statusMsg}</p><p><strong>Position:</strong> ${jobTitle}<br/><strong>Status:</strong> ${newStatus}</p><p>Best regards,<br/>${APP_NAME}</p>`,
  });
}

async function sendApplicationReceived({ candidateEmail, candidateName, jobTitle }) {
  return sendEmail({
    to: candidateEmail,
    subject: `Application Received – ${jobTitle}`,
    text: `Hi ${candidateName},\n\nYour application for "${jobTitle}" has been received. We will review it and get back to you.\n\nBest regards,\n${APP_NAME}`,
    html: `<h2>Application Received</h2><p>Hi ${candidateName},</p><p>Your application for <strong>${jobTitle}</strong> has been received. We will review it and get back to you.</p><p>Best regards,<br/>${APP_NAME}</p>`,
  });
}

async function sendEmailVerification({ to, firstName, verificationUrl }) {
  return sendEmail({
    to,
    subject: 'Verify Your Email – SRRSS',
    text: `Hi ${firstName},\n\nThank you for registering with ${APP_NAME}.\n\nPlease verify your email address by clicking the link below:\n\n${verificationUrl}\n\nIf you did not create an account, please ignore this email.\n\nBest regards,\n${APP_NAME}`,
    html: `<h2>Verify Your Email</h2><p>Hi ${firstName},</p><p>Thank you for registering with <strong>${APP_NAME}</strong>.</p><p>Please verify your email address by clicking the button below:</p><p><a href="${verificationUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Verify Email</a></p><p>Or copy and paste this link in your browser:<br/>${verificationUrl}</p><p>If you did not create an account, please ignore this email.</p><p>Best regards,<br/>${APP_NAME}</p>`,
  });
}

async function sendPasswordReset({ to, firstName, resetUrl }) {
  return sendEmail({
    to,
    subject: 'Reset Your Password – SRRSS',
    text: `Hi ${firstName},\n\nWe received a request to reset your password.\n\nClick the link below to create a new password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request a password reset, please ignore this email.\n\nBest regards,\n${APP_NAME}`,
    html: `<h2>Reset Your Password</h2><p>Hi ${firstName},</p><p>We received a request to reset your password.</p><p>Click the button below to create a new password:</p><p><a href="${resetUrl}" style="background:#dc2626;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Reset Password</a></p><p>Or copy and paste this link in your browser:<br/>${resetUrl}</p><p>This link will expire in 1 hour.</p><p>If you did not request a password reset, please ignore this email.</p><p>Best regards,<br/>${APP_NAME}</p>`,
  });
}

module.exports = {
  sendEmail,
  sendInterviewScheduled,
  sendStatusChange,
  sendApplicationReceived,
  sendEmailVerification,
  sendPasswordReset,
};
