"use server";

import { auth } from "@repo/auth";
import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { sendTeamInvitationEmail } from "@/lib/email/nodemailer";

/**
 * Get all team members
 */
export async function getTeamMembers(teamSlug: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        message: "Please sign in to view team members",
        data: null,
      };
    }

    // Verify user is a member of the team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        team: {
          slug: teamSlug,
        },
      },
      include: {
        team: true,
      },
    });

    if (!teamMember) {
      return {
        success: false,
        message: "You don't have access to this team",
        data: null,
      };
    }

    // Get all team members with user details
    const members = await prisma.teamMember.findMany({
      where: {
        teamId: teamMember.teamId,
      },
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
      orderBy: {
        createdAt: "asc",
      },
    });

    return {
      success: true,
      message: "Team members retrieved successfully",
      data: members.map((member) => ({
        id: member.id,
        role: member.role,
        createdAt: member.createdAt,
        user: {
          id: member.user.id,
          name: `${member.user.firstName} ${member.user.lastName}`,
          email: member.user.email,
          image: member.user.image,
        },
      })),
    };
  } catch (error) {
    console.error("Error fetching team members:", error);
    return {
      success: false,
      message: "Failed to fetch team members",
      data: null,
    };
  }
}

/**
 * Get pending team invitations
 */
export async function getTeamInvitations(teamSlug: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        message: "Please sign in to view invitations",
        data: null,
      };
    }

    // Verify user is an admin or owner
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        team: {
          slug: teamSlug,
        },
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
      include: {
        team: true,
      },
    });

    if (!teamMember) {
      return {
        success: false,
        message: "You don't have permission to view invitations",
        data: null,
      };
    }

    const invitations = await prisma.teamInvitation.findMany({
      where: {
        teamId: teamMember.teamId,
        status: "PENDING",
        expiresAt: {
          gte: new Date(),
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      message: "Invitations retrieved successfully",
      data: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        expiresAt: inv.expiresAt,
        invitedBy: `${inv.user.firstName} ${inv.user.lastName}`,
        createdAt: inv.createdAt,
        token: inv.token,
      })),
    };
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return {
      success: false,
      message: "Failed to fetch invitations",
      data: null,
    };
  }
}

/**
 * Invite a new team member
 */
export async function inviteTeamMember(
  teamSlug: string,
  email: string,
  role: "MEMBER" | "ADMIN" = "MEMBER"
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        message: "Please sign in to invite members",
        data: null,
      };
    }

    // Verify user is an admin or owner
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        team: {
          slug: teamSlug,
        },
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
      include: {
        team: true,
      },
    });

    if (!teamMember) {
      return {
        success: false,
        message: "You don't have permission to invite members",
        data: null,
      };
    }

    // Check if user is already a member
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        teamId: teamMember.teamId,
        user: {
          email: email,
        },
      },
    });

    if (existingMember) {
      return {
        success: false,
        message: "This user is already a team member",
        data: null,
      };
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.teamInvitation.findFirst({
      where: {
        teamId: teamMember.teamId,
        email: email,
        status: "PENDING",
        expiresAt: {
          gte: new Date(),
        },
      },
    });

    if (existingInvitation) {
      return {
        success: false,
        message: "An invitation has already been sent to this email",
        data: null,
      };
    }

    // Create invitation token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId: teamMember.teamId,
        email: email,
        role: role,
        token: token,
        expiresAt: expiresAt,
        invitedBy: session.user.id,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Send invitation email
    await sendTeamInvitationEmail(email, {
      teamName: teamMember.team.name,
      inviterName: `${invitation.user.firstName} ${invitation.user.lastName}`,
      role: role,
      token: token,
      expiresAt: expiresAt,
    });

    revalidatePath(`/${teamSlug}/settings/members`);

    return {
      success: true,
      message: "Invitation sent successfully",
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
      },
    };
  } catch (error) {
    console.error("Error inviting team member:", error);
    return {
      success: false,
      message: "Failed to send invitation",
      data: null,
    };
  }
}

/**
 * Update team member role
 */
export async function updateMemberRole(
  teamSlug: string,
  memberId: string,
  newRole: "MEMBER" | "ADMIN"
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        message: "Please sign in to update member roles",
      };
    }

    // Verify user is an owner (only owners can change roles)
    const currentMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        team: {
          slug: teamSlug,
        },
        role: "OWNER",
      },
      include: {
        team: true,
      },
    });

    if (!currentMember) {
      return {
        success: false,
        message: "Only team owners can change member roles",
      };
    }

    // Get the member to update
    const memberToUpdate = await prisma.teamMember.findFirst({
      where: {
        id: memberId,
        teamId: currentMember.teamId,
      },
    });

    if (!memberToUpdate) {
      return {
        success: false,
        message: "Member not found",
      };
    }

    // Don't allow changing owner's role
    if (memberToUpdate.role === "OWNER") {
      return {
        success: false,
        message: "Cannot change the owner's role",
      };
    }

    await prisma.teamMember.update({
      where: {
        id: memberId,
      },
      data: {
        role: newRole,
      },
    });

    revalidatePath(`/${teamSlug}/settings/members`);

    return {
      success: true,
      message: "Member role updated successfully",
    };
  } catch (error) {
    console.error("Error updating member role:", error);
    return {
      success: false,
      message: "Failed to update member role",
    };
  }
}

/**
 * Remove team member
 */
export async function removeMember(teamSlug: string, memberId: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        message: "Please sign in to remove members",
      };
    }

    // Verify user is an admin or owner
    const currentMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        team: {
          slug: teamSlug,
        },
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
      include: {
        team: true,
      },
    });

    if (!currentMember) {
      return {
        success: false,
        message: "You don't have permission to remove members",
      };
    }

    const memberToRemove = await prisma.teamMember.findFirst({
      where: {
        id: memberId,
        teamId: currentMember.teamId,
      },
    });

    if (!memberToRemove) {
      return {
        success: false,
        message: "Member not found",
      };
    }

    // Don't allow removing owner
    if (memberToRemove.role === "OWNER") {
      return {
        success: false,
        message: "Cannot remove the team owner",
      };
    }

    // Admins can't remove other admins, only owner can
    if (memberToRemove.role === "ADMIN" && currentMember.role !== "OWNER") {
      return {
        success: false,
        message: "Only the team owner can remove admins",
      };
    }

    await prisma.teamMember.delete({
      where: {
        id: memberId,
      },
    });

    revalidatePath(`/${teamSlug}/settings/members`);

    return {
      success: true,
      message: "Member removed successfully",
    };
  } catch (error) {
    console.error("Error removing member:", error);
    return {
      success: false,
      message: "Failed to remove member",
    };
  }
}

/**
 * Validate invitation token
 */
export async function validateInvitationToken(token: string) {
  try {
    const invitation = await prisma.teamInvitation.findUnique({
      where: {
        token: token,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!invitation) {
      return {
        success: false,
        message: "Invalid invitation link",
        data: null,
      };
    }

    if (invitation.status !== "PENDING") {
      return {
        success: false,
        message: `This invitation has been ${invitation.status.toLowerCase()}`,
        data: null,
      };
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });

      return {
        success: false,
        message: "This invitation has expired",
        data: null,
      };
    }

    return {
      success: true,
      message: "Invitation is valid",
      data: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        team: invitation.team,
        invitedBy: `${invitation.user.firstName} ${invitation.user.lastName}`,
        expiresAt: invitation.expiresAt,
      },
    };
  } catch (error) {
    console.error("Error validating invitation:", error);
    return {
      success: false,
      message: "Failed to validate invitation",
      data: null,
    };
  }
}

/**
 * Accept team invitation
 */
export async function acceptInvitation(token: string) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.email) {
      return {
        success: false,
        message: "Please sign in to accept this invitation",
      };
    }

    const invitation = await prisma.teamInvitation.findUnique({
      where: {
        token: token,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!invitation) {
      return {
        success: false,
        message: "Invalid invitation",
      };
    }

    // Verify the logged-in user's email matches the invitation email
    if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return {
        success: false,
        message: `This invitation was sent to ${invitation.email}. Please sign in with that email address to accept.`,
      };
    }

    if (invitation.status !== "PENDING") {
      return {
        success: false,
        message: `This invitation has been ${invitation.status.toLowerCase()}`,
      };
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });

      return {
        success: false,
        message: "This invitation has expired",
      };
    }

    // Check if user is already a member
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        teamId: invitation.teamId,
        userId: session.user.id,
      },
    });

    if (existingMember) {
      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      });

      return {
        success: false,
        message: "You are already a member of this team",
        teamSlug: invitation.team.slug,
      };
    }

    // Add user to team and mark invitation as accepted
    await prisma.$transaction([
      prisma.teamMember.create({
        data: {
          teamId: invitation.teamId,
          userId: session.user.id,
          role: invitation.role,
        },
      }),
      prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      }),
    ]);

    return {
      success: true,
      message: `Successfully joined ${invitation.team.name}`,
      teamSlug: invitation.team.slug,
    };
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return {
      success: false,
      message: "Failed to accept invitation",
    };
  }
}

/**
 * Decline team invitation
 */
export async function declineInvitation(token: string) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return {
        success: false,
        message: "Please sign in to decline this invitation",
      };
    }

    const invitation = await prisma.teamInvitation.findUnique({
      where: {
        token: token,
      },
    });

    if (!invitation) {
      return {
        success: false,
        message: "Invalid invitation",
      };
    }

    // Verify the logged-in user's email matches the invitation email
    if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return {
        success: false,
        message: `This invitation was sent to ${invitation.email}`,
      };
    }

    if (invitation.status !== "PENDING") {
      return {
        success: false,
        message: "This invitation is no longer pending",
      };
    }

    await prisma.teamInvitation.update({
      where: { id: invitation.id },
      data: { status: "DECLINED" },
    });

    return {
      success: true,
      message: "Invitation declined",
    };
  } catch (error) {
    console.error("Error declining invitation:", error);
    return {
      success: false,
      message: "Failed to decline invitation",
    };
  }
}

/**
 * Cancel pending invitation
 */
export async function cancelInvitation(teamSlug: string, invitationId: string) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        message: "Please sign in to cancel invitations",
      };
    }

    // Verify user is an admin or owner
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        team: {
          slug: teamSlug,
        },
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
    });

    if (!teamMember) {
      return {
        success: false,
        message: "You don't have permission to cancel invitations",
      };
    }

    await prisma.teamInvitation.update({
      where: {
        id: invitationId,
        teamId: teamMember.teamId,
      },
      data: {
        status: "CANCELLED",
      },
    });

    revalidatePath(`/${teamSlug}/settings/members`);

    return {
      success: true,
      message: "Invitation cancelled successfully",
    };
  } catch (error) {
    console.error("Error cancelling invitation:", error);
    return {
      success: false,
      message: "Failed to cancel invitation",
    };
  }
}
