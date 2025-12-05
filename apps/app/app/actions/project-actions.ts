"use server";

import { auth } from "@repo/auth";
import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";
import { projectSchema } from "@/schema/index";
import { ActionResponse, Project } from "@/types";

type ProjectWithCount = Project & {
  _count: {
    endpoints: number;
  };
};

export async function getTeamProjects(
  teamSlug: string
): Promise<ActionResponse<ProjectWithCount[]>> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      message: "Please sign in to view projects.",
      data: null,
    };
  }

  try {
    // First, verify user has access to this team
    const team = await prisma.team.findUnique({
      where: { slug: teamSlug },
      include: {
        members: {
          where: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!team || team.members.length === 0) {
      return {
        success: false,
        message: "You don't have access to this team.",
        data: null,
      };
    }

    // Fetch all projects for this team
    const projects = await prisma.project.findMany({
      where: {
        teamId: team.id,
      },
      include: {
        _count: {
          select: {
            endpoints: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      message: "Projects fetched successfully",
      data: projects,
    };
  } catch (error) {
    console.error("Error fetching team projects:", error);
    return {
      success: false,
      message: "An unexpected error occurred while fetching projects.",
      data: null,
    };
  }
}

export async function createProject(
  teamId: string,
  formData: FormData
): Promise<ActionResponse<Project>> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      message: "Please sign in to create a project.",
      data: null,
    };
  }

  const data = Object.fromEntries(formData.entries());
  const validatedData = projectSchema.safeParse(data);

  if (!validatedData.success) {
    console.error("Validation failed:", validatedData.error.flatten());
    return {
      success: false,
      message: "Invalid project data. Please check the inputs and try again.",
      data: null,
    };
  }

  const { name } = validatedData.data;

  try {
    // Verify user is a member of the team
    const teamMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: session.user.id,
        },
      },
      include: {
        team: true,
      },
    });

    if (!teamMember) {
      return {
        success: false,
        message: "You don't have access to this team.",
        data: null,
      };
    }

    // Check if user has permission (OWNER or ADMIN)
    if (teamMember.role === "MEMBER") {
      return {
        success: false,
        message: "Only team owners and admins can create projects.",
        data: null,
      };
    }

    // Generate base slug from project name
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Generate unique slug with numeric suffix if needed
    let slug = baseSlug;
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const existingProject = await prisma.project.findUnique({
        where: {
          teamId_slug: {
            teamId,
            slug,
          },
        },
      });

      if (!existingProject) {
        break;
      }

      // Generate random 4-digit number
      const randomNumber = Math.floor(1000 + Math.random() * 9000);
      slug = `${baseSlug}-${randomNumber}`;
      attempts++;
    }

    if (attempts === maxAttempts) {
      return {
        success: false,
        message:
          "Unable to generate a unique project identifier. Please try again.",
        data: null,
      };
    }

    // Create the project
    const project = await prisma.project.create({
      data: {
        name,
        slug,
        teamId,
      },
    });

    // Revalidate the team page
    revalidatePath(`/${teamMember.team.slug}`);

    return {
      success: true,
      message: "Project created successfully.",
      data: project,
    };
  } catch (error) {
    console.error("Error creating project:", error);
    return {
      success: false,
      message: "An unexpected error occurred while creating the project.",
      data: null,
    };
  }
}

export async function deleteProject(
  projectId: string,
  teamSlug: string
): Promise<ActionResponse<null>> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      message: "Please sign in to delete a project.",
      data: null,
    };
  }

  try {
    // Get the project with team info
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        team: {
          include: {
            members: {
              where: {
                userId: session.user.id,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return {
        success: false,
        message: "Project not found.",
        data: null,
      };
    }

    // Check if user has permission
    const teamMember = project.team.members[0];
    if (!teamMember || teamMember.role === "MEMBER") {
      return {
        success: false,
        message: "Only team owners and admins can delete projects.",
        data: null,
      };
    }

    // Delete the project
    await prisma.project.delete({
      where: { id: projectId },
    });

    revalidatePath(`/${teamSlug}`);

    return {
      success: true,
      message: "Project deleted successfully.",
      data: null,
    };
  } catch (error) {
    console.error("Error deleting project:", error);
    return {
      success: false,
      message: "An unexpected error occurred while deleting the project.",
      data: null,
    };
  }
}

export interface ProjectWithEndpoints {
  id: string;
  name: string;
  slug: string;
  team: {
    id: string;
    name: string;
    slug: string;
  };
  endpoints: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    framework: string;
    inputType: string;
    status: string;
    accessType: string;
    serviceUrl: string | null;
    deployedAt: Date | null;
    createdAt: Date;
    lastUsedAt: Date | null;
  }>;
}

export async function getProjectWithEndpoints(
  teamSlug: string,
  projectSlug: string
): Promise<ActionResponse<ProjectWithEndpoints>> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      message: "Please sign in to view this project.",
      data: null,
    };
  }

  try {
    const project = await prisma.project.findFirst({
      where: {
        slug: projectSlug,
        team: {
          slug: teamSlug,
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        endpoints: {
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            framework: true,
            inputType: true,
            status: true,
            accessType: true,
            serviceUrl: true,
            deployedAt: true,
            createdAt: true,
            lastUsedAt: true,
          },
        },
      },
    });

    if (!project) {
      return {
        success: false,
        message: "Project not found or you don't have access.",
        data: null,
      };
    }

    return {
      success: true,
      message: "Project fetched successfully.",
      data: project,
    };
  } catch (error) {
    console.error("Error fetching project with endpoints:", error);
    return {
      success: false,
      message: "An unexpected error occurred while fetching the project.",
      data: null,
    };
  }
}
