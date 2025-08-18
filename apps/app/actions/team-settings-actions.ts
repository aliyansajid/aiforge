"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@repo/db";
import { auth } from "@repo/auth";
import { TeamRole } from "@repo/db";

type ActionResponse = {
  success: boolean;
  message: string;
  data?: any;
};

export async function getTeamBySlug(slug: string): Promise<ActionResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        message: "Unauthorized",
      };
    }

    const team = await prisma.team.findUnique({
      where: { slug },
      include: {
        members: {
          where: {
            userId: session.user.id,
          },
          select: {
            role: true,
          },
        },
      },
    });

    if (!team) {
      return {
        success: false,
        message: "Team not found",
      };
    }

    // Check if user is a member
    if (team.members.length === 0) {
      return {
        success: false,
        message: "You are not a member of this team",
      };
    }

    return {
      success: true,
      message: "Team fetched successfully",
      data: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        icon: team.icon,
        role: team.members[0].role,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
      },
    };
  } catch (error) {
    console.error("Failed to fetch team:", error);
    return {
      success: false,
      message: "Failed to fetch team",
    };
  }
}

export async function updateTeamName(
  teamId: string,
  name: string
): Promise<ActionResponse> {
  try {
    if (!name || name.length < 2) {
      return {
        success: false,
        message: "Team name must be at least 2 characters",
      };
    }

    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        message: "Unauthorized",
      };
    }

    // Check if user is owner or admin
    const member = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: session.user.id,
        role: {
          in: [TeamRole.OWNER, TeamRole.ADMIN],
        },
      },
    });

    if (!member) {
      return {
        success: false,
        message: "Only team owners and admins can update team name",
      };
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: { name },
    });

    revalidatePath(`/teams/${team.slug}`);

    return {
      success: true,
      message: "Team name updated successfully",
      data: { name: team.name },
    };
  } catch (error) {
    console.error("Failed to update team name:", error);
    return {
      success: false,
      message: "Failed to update team name",
    };
  }
}

export async function updateTeamIcon(
  teamId: string,
  icon: string
): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        message: "Unauthorized",
      };
    }

    // Check if user is owner or admin
    const member = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: session.user.id,
        role: {
          in: [TeamRole.OWNER, TeamRole.ADMIN],
        },
      },
    });

    if (!member) {
      return {
        success: false,
        message: "Only team owners and admins can update team icon",
      };
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: { icon },
    });

    revalidatePath(`/teams/${team.slug}`);

    return {
      success: true,
      message: "Team icon updated successfully",
      data: { icon: team.icon },
    };
  } catch (error) {
    console.error("Failed to update team icon:", error);
    return {
      success: false,
      message: "Failed to update team icon",
    };
  }
}

export async function deleteTeam(teamId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        message: "Unauthorized",
      };
    }

    // Check if user is owner
    const member = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: session.user.id,
        role: TeamRole.OWNER,
      },
    });

    if (!member) {
      return {
        success: false,
        message: "Only team owner can delete the team",
      };
    }

    // Delete team (cascade will handle members)
    await prisma.team.delete({
      where: { id: teamId },
    });

    revalidatePath("/");
    revalidatePath("/teams");

    return {
      success: true,
      message: "Team deleted successfully",
    };
  } catch (error) {
    console.error("Failed to delete team:", error);
    return {
      success: false,
      message: "Failed to delete team",
    };
  }
}
