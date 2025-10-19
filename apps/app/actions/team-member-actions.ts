"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@repo/db";
import { auth } from "@repo/auth";
import { TeamRole, InvitationStatus } from "@repo/db";
import { randomBytes } from "crypto";
import { sendTeamInvitation } from "@/lib/email/services/team-invitation";
import { getTeamIconUrl } from "@/utils/team-icon";
type ActionResponse = {
  success: boolean;
  message: string;
  data?: any;
};

// ============================================
// GET TEAM MEMBERS & INVITATIONS
// ============================================

export async function getTeamMembers(teamId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    // Verify user is a team member
    const userMember = await prisma.teamMember.findFirst({
      where: { teamId, userId: session.user.id },
    });

    if (!userMember) {
      return { success: false, message: "You are not a member of this team" };
    }

    // Fetch all team members with user details
    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: [
        { role: "asc" }, // OWNER first, then ADMIN, then MEMBER
        { createdAt: "asc" },
      ],
    });

    const formattedMembers = members.map((member) => ({
      id: member.id,
      role: member.role,
      joinedAt: member.createdAt,
      user: {
        id: member.user.id,
        name: `${member.user.firstName} ${member.user.lastName}`,
        email: member.user.email,
        image: member.user.image,
      },
    }));

    return {
      success: true,
      message: "Members fetched successfully",
      data: formattedMembers,
    };
  } catch (error) {
    console.error("Failed to fetch members:", error);
    return { success: false, message: "Failed to fetch members" };
  }
}

export async function getTeamInvitations(
  teamId: string
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    // Verify user is owner or admin
    const userMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: session.user.id,
        role: { in: [TeamRole.OWNER, TeamRole.ADMIN] },
      },
    });

    if (!userMember) {
      return {
        success: false,
        message: "Only owners and admins can view invitations",
      };
    }

    // Fetch pending invitations
    const invitations = await prisma.teamInvitation.findMany({
      where: {
        teamId,
        status: { in: [InvitationStatus.PENDING, InvitationStatus.EXPIRED] },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedInvitations = invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      role: inv.role,
      status: inv.status,
      invitedBy: `${inv.user.firstName} ${inv.user.lastName}`,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    }));

    return {
      success: true,
      message: "Invitations fetched successfully",
      data: formattedInvitations,
    };
  } catch (error) {
    console.error("Failed to fetch invitations:", error);
    return { success: false, message: "Failed to fetch invitations" };
  }
}

// ============================================
// SEND INVITATION
// ============================================

export async function inviteTeamMember(input: {
  teamId: string;
  email: string;
  role: TeamRole;
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    // Verify user is owner or admin
    const userMember = await prisma.teamMember.findFirst({
      where: {
        teamId: input.teamId,
        userId: session.user.id,
        role: { in: [TeamRole.OWNER, TeamRole.ADMIN] },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!userMember) {
      return {
        success: false,
        message: "Only owners and admins can invite members",
      };
    }

    // Check if email is already a team member
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        teamId: input.teamId,
        user: { email: input.email },
      },
    });

    if (existingMember) {
      return {
        success: false,
        message: "This user is already a team member",
      };
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.teamInvitation.findFirst({
      where: {
        teamId: input.teamId,
        email: input.email,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      return {
        success: false,
        message: "An invitation has already been sent to this email",
      };
    }

    // Generate secure token
    const token = randomBytes(32).toString("hex");

    // Create invitation (expires in 7 days)
    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId: input.teamId,
        email: input.email,
        role: input.role,
        token,
        invitedBy: session.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: {
        team: {
          select: {
            name: true,
            slug: true,
            icon: true, // ✅ Get team icon name (e.g., "Building2")
          },
        },
      },
    });

    // ✅ Check if invited user already exists
    const invitedUser = await prisma.user.findUnique({
      where: { email: input.email },
      select: {
        firstName: true,
        lastName: true,
        image: true,
      },
    });

    // ✅ Prepare data for email
    const inviterName = `${userMember.user.firstName} ${userMember.user.lastName}`;
    const inviterEmail = userMember.user.email;

    const username = invitedUser
      ? `${invitedUser.firstName} ${invitedUser.lastName}`
      : input.email.split("@")[0];

    const userImage = invitedUser?.image || undefined;

    // ✅ Convert team icon name to full URL
    const teamImage = getTeamIconUrl(invitation.team.icon);

    // ✅ Send invitation email
    const emailResult = await sendTeamInvitation({
      to: input.email,
      username,
      userImage,
      teamName: invitation.team.name,
      teamImage, // Team icon PNG URL
      inviterName,
      inviterEmail,
      role: input.role,
      invitationToken: token,
      // TODO: Get from request headers
      // ipAddress: headers().get('x-forwarded-for') || 'Unknown',
      // location: await getLocationFromIp(ipAddress),
    });

    if (!emailResult.success) {
      console.error("Failed to send invitation email:", emailResult.error);
      return {
        success: true,
        message:
          "Invitation created but email failed to send. Please share the link manually.",
        data: {
          invitationId: invitation.id,
          warning: "Email delivery failed",
        },
      };
    }

    revalidatePath(`/teams/${invitation.team.slug}`);

    return {
      success: true,
      message: "Invitation sent successfully",
      data: { invitationId: invitation.id },
    };
  } catch (error) {
    console.error("Failed to send invitation:", error);
    return { success: false, message: "Failed to send invitation" };
  }
}

// ============================================
// ACCEPT INVITATION
// ============================================

export async function acceptInvitation(token: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        message: "You must be logged in to accept invitations",
      };
    }

    // Find invitation
    const invitation = await prisma.teamInvitation.findUnique({
      where: { token },
      include: {
        team: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!invitation) {
      return { success: false, message: "Invalid invitation" };
    }

    // Verify invitation is for the logged-in user's email
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });

    if (user?.email !== invitation.email) {
      return {
        success: false,
        message: "This invitation was sent to a different email address",
      };
    }

    // Check if already accepted
    if (invitation.status === InvitationStatus.ACCEPTED) {
      return {
        success: false,
        message: "This invitation has already been accepted",
      };
    }

    // Check if expired
    if (invitation.expiresAt < new Date()) {
      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      return { success: false, message: "This invitation has expired" };
    }

    // Check if cancelled
    if (invitation.status === InvitationStatus.CANCELLED) {
      return { success: false, message: "This invitation has been cancelled" };
    }

    // Check if user is already a member
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        teamId: invitation.teamId,
        userId: session.user.id,
      },
    });

    if (existingMember) {
      return { success: false, message: "You are already a team member" };
    }

    // Accept invitation - create member and update invitation
    await prisma.$transaction([
      // Create team member
      prisma.teamMember.create({
        data: {
          teamId: invitation.teamId,
          userId: session.user.id,
          role: invitation.role,
        },
      }),
      // Update invitation status
      prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.ACCEPTED },
      }),
    ]);

    revalidatePath(`/teams/${invitation.team.slug}`);

    return {
      success: true,
      message: `Welcome to ${invitation.team.name}!`,
      data: { teamSlug: invitation.team.slug },
    };
  } catch (error) {
    console.error("Failed to accept invitation:", error);
    return { success: false, message: "Failed to accept invitation" };
  }
}

// ============================================
// DECLINE INVITATION
// ============================================

export async function declineInvitation(
  token: string
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    const invitation = await prisma.teamInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return { success: false, message: "Invalid invitation" };
    }

    // Verify invitation is for the logged-in user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });

    if (user?.email !== invitation.email) {
      return {
        success: false,
        message: "This invitation was sent to a different email address",
      };
    }

    await prisma.teamInvitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.DECLINED },
    });

    return {
      success: true,
      message: "Invitation declined",
    };
  } catch (error) {
    console.error("Failed to decline invitation:", error);
    return { success: false, message: "Failed to decline invitation" };
  }
}

// ============================================
// CANCEL INVITATION (Admin/Owner only)
// ============================================

export async function cancelInvitation(
  invitationId: string
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    const invitation = await prisma.teamInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      return { success: false, message: "Invitation not found" };
    }

    // Verify user is owner or admin
    const userMember = await prisma.teamMember.findFirst({
      where: {
        teamId: invitation.teamId,
        userId: session.user.id,
        role: { in: [TeamRole.OWNER, TeamRole.ADMIN] },
      },
    });

    if (!userMember) {
      return {
        success: false,
        message: "Only owners and admins can cancel invitations",
      };
    }

    await prisma.teamInvitation.update({
      where: { id: invitationId },
      data: { status: InvitationStatus.CANCELLED },
    });

    revalidatePath(`/teams`);

    return {
      success: true,
      message: "Invitation cancelled",
    };
  } catch (error) {
    console.error("Failed to cancel invitation:", error);
    return { success: false, message: "Failed to cancel invitation" };
  }
}

// ============================================
// UPDATE MEMBER ROLE (Owner/Admin only)
// ============================================

export async function updateMemberRole(
  memberId: string,
  newRole: TeamRole
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: { team: true },
    });

    if (!member) {
      return { success: false, message: "Member not found" };
    }

    // Verify user is owner or admin
    const userMember = await prisma.teamMember.findFirst({
      where: {
        teamId: member.teamId,
        userId: session.user.id,
        role: { in: [TeamRole.OWNER, TeamRole.ADMIN] },
      },
    });

    if (!userMember) {
      return {
        success: false,
        message: "Only owners and admins can update member roles",
      };
    }

    // Can't change owner role
    if (member.role === TeamRole.OWNER) {
      return { success: false, message: "Cannot change owner role" };
    }

    // Only owner can promote to admin
    if (newRole === TeamRole.ADMIN && userMember.role !== TeamRole.OWNER) {
      return { success: false, message: "Only owners can promote to admin" };
    }

    await prisma.teamMember.update({
      where: { id: memberId },
      data: { role: newRole },
    });

    revalidatePath(`/teams/${member.team.slug}`);

    return { success: true, message: "Member role updated" };
  } catch (error) {
    console.error("Failed to update member role:", error);
    return { success: false, message: "Failed to update member role" };
  }
}

// ============================================
// REMOVE MEMBER (Owner/Admin only)
// ============================================

export async function removeMember(memberId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, message: "Unauthorized" };
    }

    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: { team: true },
    });

    if (!member) {
      return { success: false, message: "Member not found" };
    }

    // Verify user is owner or admin
    const userMember = await prisma.teamMember.findFirst({
      where: {
        teamId: member.teamId,
        userId: session.user.id,
        role: { in: [TeamRole.OWNER, TeamRole.ADMIN] },
      },
    });

    if (!userMember) {
      return {
        success: false,
        message: "Only owners and admins can remove members",
      };
    }

    // Can't remove owner
    if (member.role === TeamRole.OWNER) {
      return { success: false, message: "Cannot remove team owner" };
    }

    // Can't remove yourself
    if (member.userId === session.user.id) {
      return { success: false, message: "Cannot remove yourself" };
    }

    await prisma.teamMember.delete({
      where: { id: memberId },
    });

    revalidatePath(`/teams/${member.team.slug}`);

    return { success: true, message: "Member removed successfully" };
  } catch (error) {
    console.error("Failed to remove member:", error);
    return { success: false, message: "Failed to remove member" };
  }
}
