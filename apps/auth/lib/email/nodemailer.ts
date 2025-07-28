import nodemailer from "nodemailer";
import { verificationEmailTemplate } from "./templates/verification-email";
import { passwordResetEmailTemplate } from "./templates/password-reset-email";
import { newLoginEmailTemplate } from "./templates/new-login-email";

// Configure the SMTP transporter
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true, // Use SSL/TLS for secure connection
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Standardized email configuration used across all outgoing emails
export const EMAIL_CONFIG = {
  from: `"AIForge" <${process.env.SMTP_USER}>`,
  replyTo: process.env.SMTP_USER,
} as const;

/**
 * Utility to send an email using predefined configurations.
 * Accepts content and recipient details.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}) {
  try {
    const result = await transporter.sendMail({
      from: EMAIL_CONFIG.from,
      to,
      subject,
      html,
      text,
      replyTo: EMAIL_CONFIG.replyTo,
    });

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Email sending error:", error);
    return { success: false, error };
  }
}

/**
 * Sends a verification email with a formatted OTP.
 * Used during account registration.
 */
export async function sendVerificationEmail(
  email: string,
  otpWithDash: string
) {
  return sendEmail({
    to: email,
    subject: `${otpWithDash} AIForge confirmation code`,
    html: verificationEmailTemplate(otpWithDash),
  });
}

/**
 * Sends a password reset email with a formatted OTP.
 * Used on forgot password.
 */
export async function sendPasswordResetEmail(
  email: string,
  otpWithDash: string
) {
  return sendEmail({
    to: email,
    subject: `${otpWithDash} AIForge confirmation code`,
    html: passwordResetEmailTemplate(otpWithDash),
  });
}

/**
 * Sends a new login alert email with session details.
 * Used when a user logs in from a new IP address or device.
 */
export async function sendNewLoginEmail(
  email: string,
  loginData: {
    firstName: string;
    loginTime: string;
    ipAddress: string;
    location: string;
    browser: string;
  }
) {
  return sendEmail({
    to: email,
    subject: "New login to your AIForge account",
    html: newLoginEmailTemplate(loginData),
  });
}
