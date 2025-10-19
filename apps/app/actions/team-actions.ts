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

type FormattedTeam = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  role: string;
};

export async function getUserTeams(): Promise<ActionResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        message: "Unauthorized",
        data: [],
      };
    }

    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
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
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedTeams: FormattedTeam[] = teams.map((team: any) => ({
      id: team.id,
      name: team.name,
      slug: team.slug,
      icon: team.icon,
      role: team.members[0]?.role || "MEMBER",
    }));

    return {
      success: true,
      message: "Teams fetched successfully",
      data: formattedTeams,
    };
  } catch (error) {
    console.error("Failed to fetch teams:", error);
    return {
      success: false,
      message: "Failed to fetch teams",
      data: [],
    };
  }
}

export async function createTeam(input: {
  name: string;
  icon: string;
}): Promise<ActionResponse> {
  try {
    if (!input.name || input.name.length < 3) {
      return {
        success: false,
        message: "Team name must be at least 3 characters",
      };
    }

    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        message: "Unauthorized. Please sign in to create a team.",
      };
    }

    // Generate unique slug
    const baseSlug = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    let slug = baseSlug;
    let counter = 1;
    while (await prisma.team.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const team = await prisma.team.create({
      data: {
        name: input.name,
        slug,
        icon: input.icon || "Building2",
        members: {
          create: {
            userId: session.user.id,
            role: TeamRole.OWNER,
          },
        },
      },
    });

    revalidatePath("/");
    revalidatePath("/teams");

    return {
      success: true,
      message: "Team created successfully!",
      data: {
        teamId: team.id,
        slug: team.slug,
      },
    };
  } catch (error) {
    console.error("Create team error:", error);
    return {
      success: false,
      message: "Failed to create team. Please try again.",
    };
  }
}
