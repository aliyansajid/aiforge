import { sendEmail } from "../sender";
import TeamInvitationEmail, {
  TeamInvitationEmailProps,
} from "@/emails/team-invitation";

interface SendTeamInvitationParams {
  to: string;
  username?: string;
  userImage?: string;
  teamName: string;
  teamImage: string;
  inviterName: string;
  inviterEmail: string;
  role: string;
  invitationToken: string;
  ipAddress?: string;
  location?: string;
}

export async function sendTeamInvitation(
  params: SendTeamInvitationParams
): Promise<{ success: boolean; error?: string }> {
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${params.invitationToken}`;

  const emailProps: TeamInvitationEmailProps = {
    username: params.username || "there",
    userImage: params.userImage,
    invitedByUsername: params.inviterName,
    invitedByEmail: params.inviterEmail,
    teamName: params.teamName,
    teamImage: params.teamImage,
    role: params.role,
    inviteLink,
    inviteFromIp: params.ipAddress || "Unknown",
    inviteFromLocation: params.location || "Unknown",
  };

  return sendEmail({
    to: params.to,
    subject: `Join ${params.teamName} on AIForge`,
    react: TeamInvitationEmail(emailProps),
  });
}
