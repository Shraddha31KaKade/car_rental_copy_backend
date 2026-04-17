// src/services/emailService.js
// Shared email service — used by all controllers.
// Fire-and-forget: errors are logged but never thrown so the API response is never blocked.

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // SSL on port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

/**
 * sendTemplate — non-blocking email sender.
 * @param {Object} opts
 * @param {string}   opts.to        recipient email address
 * @param {string}   opts.subject   email subject line
 * @param {string}   opts.template  logical template name (used for console logs only)
 * @param {string}   opts.html      HTML body of the email
 */
async function sendTemplate({ to, subject, template, html }) {
  if (!to) {
    console.warn(`[EmailService] Skipping "${template}" — recipient email is missing.`);
    return;
  }
  try {
    const info = await transporter.sendMail({
      from: `"CarRental" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[EmailService] ✅ Sent "${template}" → ${to} (id: ${info.messageId})`);
  } catch (err) {
    // Never throw — log only. Email failure must NOT break the API response.
    console.error(`[EmailService] ❌ Failed to send "${template}" → ${to}:`, err.message);
  }
}

module.exports = { sendTemplate };
