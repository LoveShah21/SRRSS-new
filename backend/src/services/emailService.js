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

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
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
      attempt++;
      const delay = Math.pow(2, attempt) * 1000;
      logger.error(`Failed to send email to ${to} (Attempt ${attempt}/${maxRetries})`, { error: err.message });

      if (attempt >= maxRetries) {
        return { sent: false, error: err.message };
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

function generateHTMLTemplate(title, content, buttonText = null, buttonUrl = null) {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center; font-size: 24px; font-weight: bold;">
        ${APP_NAME}
      </div>
      <div style="padding: 30px; color: #374151; line-height: 1.6;">
        <h2 style="color: #111827; margin-top: 0;">${title}</h2>
        <div>${content}</div>
        ${buttonText && buttonUrl ? `
          <div style="text-align: center; margin-top: 30px;">
            <a href="${buttonUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">${buttonText}</a>
          </div>
        ` : ''}
      </div>
      <div style="background-color: #f9fafb; color: #6b7280; padding: 20px; text-align: center; font-size: 12px;">
        &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
      </div>
    </div>
  `;
}


// ─── Template Functions ──────────────────────────────────

async function sendInterviewScheduled({ candidateEmail, candidateName, jobTitle, scheduledAt, link, notes }) {
  const date = new Date(scheduledAt).toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });

  const content = `
    <p>Hi ${candidateName},</p>
    <p>Your interview for <strong>${jobTitle}</strong> has been scheduled.</p>
    <p><strong>Date:</strong> ${date}</p>
    ${link ? `<p><strong>Meeting Link:</strong> <a href="${link}">${link}</a></p>` : ''}
    ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
    <p>We look forward to speaking with you!</p>
  `;

  return sendEmail({
    to: candidateEmail,
    subject: `Interview Scheduled – ${jobTitle}`,
    text: `Hi ${candidateName},\n\nYour interview for "${jobTitle}" has been scheduled.\n\nDate: ${date}\n${link ? `Link: ${link}\n` : ''}${notes ? `Notes: ${notes}\n` : ''}\nBest regards,\n${APP_NAME}`,
    html: generateHTMLTemplate(`Interview Scheduled`, content),
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
  const content = `
    <p>Hi ${candidateName},</p>
    <p>${statusMsg}</p>
    <p><strong>Position:</strong> ${jobTitle}<br/><strong>Status:</strong> ${newStatus}</p>
    <p>Best regards,</p>
  `;

  return sendEmail({
    to: candidateEmail,
    subject: `Application Update – ${jobTitle}`,
    text: `Hi ${candidateName},\n\n${statusMsg}\n\nPosition: ${jobTitle}\nNew Status: ${newStatus}\n\nBest regards,\n${APP_NAME}`,
    html: generateHTMLTemplate(`Application Update`, content),
  });
}

async function sendApplicationReceived({ candidateEmail, candidateName, jobTitle }) {
  const content = `
    <p>Hi ${candidateName},</p>
    <p>Your application for <strong>${jobTitle}</strong> has been received. We will review it and get back to you soon.</p>
  `;

  return sendEmail({
    to: candidateEmail,
    subject: `Application Received – ${jobTitle}`,
    text: `Hi ${candidateName},\n\nYour application for "${jobTitle}" has been received. We will review it and get back to you.\n\nBest regards,\n${APP_NAME}`,
    html: generateHTMLTemplate(`Application Received`, content),
  });
}

async function sendEmailVerification({ to, firstName, verificationUrl }) {
  const content = `
    <p>Hi ${firstName},</p>
    <p>Thank you for registering with <strong>${APP_NAME}</strong>.</p>
    <p>Please verify your email address by clicking the button below:</p>
  `;

  return sendEmail({
    to,
    subject: 'Verify Your Email – SRRSS',
    text: `Hi ${firstName},\n\nThank you for registering with ${APP_NAME}.\n\nPlease verify your email address by clicking the link below:\n\n${verificationUrl}\n\nIf you did not create an account, please ignore this email.\n\nBest regards,\n${APP_NAME}`,
    html: generateHTMLTemplate(`Verify Your Email`, content, 'Verify Email', verificationUrl),
  });
}

async function sendPasswordReset({ to, firstName, resetUrl }) {
  const content = `
    <p>Hi ${firstName},</p>
    <p>We received a request to reset your password. Click the button below to create a new password.</p>
    <p><em>This link will expire in 1 hour.</em></p>
  `;

  return sendEmail({
    to,
    subject: 'Reset Your Password – SRRSS',
    text: `Hi ${firstName},\n\nWe received a request to reset your password.\n\nClick the link below to create a new password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request a password reset, please ignore this email.\n\nBest regards,\n${APP_NAME}`,
    html: generateHTMLTemplate(`Reset Your Password`, content, 'Reset Password', resetUrl),
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
