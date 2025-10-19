import { render } from "@react-email/components";
import { transporter } from "./transporter";
import { ReactElement } from "react";

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  react: ReactElement;
  from?: string;
  replyTo?: string;
}

export async function sendEmail({
  to,
  subject,
  react,
  from,
  replyTo,
}: SendEmailOptions): Promise<{
  success: boolean;
  error?: string;
  messageId?: string;
}> {
  try {
    // ✅ AWAIT the render (it's async!)
    const html = await render(react);
    const text = await render(react, { plainText: true });

    // ✅ Now send email with rendered strings
    const info = await transporter.sendMail({
      from: from || `"AIForge" <${process.env.SMTP_USER}>`,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html,
      text,
      replyTo: replyTo || process.env.SMTP_REPLY_TO,
    });

    console.log(`Email sent successfully: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
