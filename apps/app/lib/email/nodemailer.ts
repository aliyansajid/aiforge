import nodemailer from "nodemailer";
import { teamInvitationEmailTemplate } from "./templates/team-invitation";

// Configure the SMTP transporter
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Standardized email configuration
export const EMAIL_CONFIG = {
  from: `"AIForge" <${process.env.SMTP_USER}>`,
  replyTo: process.env.SMTP_USER,
} as const;

/**
 * Utility to send an email
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
 * Sends a team invitation email
 */
export async function sendTeamInvitationEmail(
  email: string,
  data: {
    teamName: string;
    inviterName: string;
    role: string;
    token: string;
    expiresAt: Date;
  }
) {
  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/accept?token=${data.token}`;

  return sendEmail({
    to: email,
    subject: `You've been invited to join ${data.teamName} on AIForge`,
    html: teamInvitationEmailTemplate({
      ...data,
      acceptUrl,
    }),
  });
}
