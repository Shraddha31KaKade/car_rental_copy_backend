/**
 * test-email.js — Run once to verify Gmail SMTP is working.
 * Usage: node test-email.js
 * Delete after testing.
 */
require("dotenv").config();
const nodemailer = require("nodemailer");

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "✅ loaded (hidden)" : "❌ NOT LOADED");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function run() {
  try {
    // Step 1: Verify SMTP connection
    await transporter.verify();
    console.log("✅ SMTP connection OK — credentials are valid!");

    // Step 2: Send a real test email
    const info = await transporter.sendMail({
      from: `"CarRental Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,    // sends to yourself
      subject: "✅ Test Email from CarRental Backend",
      html: "<p>If you see this, email is working correctly! 🎉</p>",
    });

    console.log("✅ Email sent! Message ID:", info.messageId);
    console.log("   Check your Gmail inbox.");
  } catch (err) {
    console.error("❌ Email failed:", err.message);
    console.error("\nCommon fixes:");
    console.error("  1. Is 2-Factor Auth ON for your Gmail? (required for App Passwords)");
    console.error("  2. Did you generate an App Password? (not your login password)");
    console.error("     Go to: https://myaccount.google.com/apppasswords");
    console.error("  3. Is 'Less secure app access' disabled? (it should be — use App Password instead)");
  }
}

run();
