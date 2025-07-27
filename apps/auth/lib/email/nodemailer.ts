import nodemailer from "nodemailer";
import { verificationEmailTemplate } from "./templates/verification-email";

// Configure the transporter
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true, // Use SSL
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Email configuration constants
export const EMAIL_CONFIG = {
  from: `"AIForge" <${process.env.SMTP_USER}>`,
  replyTo: process.env.SMTP_USER,
} as const;

// Helper function to send emails with consistent configuration
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

// Email verification template
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

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
) {
  return sendEmail({
    to: email,
    subject: "Reset your AIForge password",
    html: `Password reset token: ${resetToken}`,
  });
}

export async function sendWelcomeEmail(email: string, firstName: string) {
  return sendEmail({
    to: email,
    subject: "Welcome to AIForge!",
    html: `Welcome ${firstName}!`,
  });
}
