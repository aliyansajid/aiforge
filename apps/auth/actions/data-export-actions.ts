"use server";

import { auth } from "@repo/auth";
import { prisma } from "@repo/db";

export async function exportUserData() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error: "Unauthorized",
        data: null,
      };
    }

    const userId = session.user.id;

    // Fetch all user data
    const [user, teamMembers, sessions] = await Promise.all([
      // User basic info
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      // Teams, projects, and endpoints
      prisma.teamMember.findMany({
        where: { userId },
        include: {
          team: {
            include: {
              projects: {
                include: {
                  endpoints: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      slug: true,
                      status: true,
                      framework: true,
                      inputType: true,
                      accessType: true,
                      deploymentType: true,
                      serviceUrl: true,
                      createdAt: true,
                      deployedAt: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),

      // Sessions
      prisma.session.findMany({
        where: { userId },
        select: {
          id: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          expires: true,
        },
      }),
    ]);

    if (!user) {
      return {
        success: false,
        error: "User not found",
        data: null,
      };
    }

    // Structure the export data
    const exportData = {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      teams: teamMembers.map((tm) => ({
        role: tm.role,
        team: {
          id: tm.team.id,
          name: tm.team.name,
          slug: tm.team.slug,
          createdAt: tm.team.createdAt,
          projects: tm.team.projects.map((project) => ({
            id: project.id,
            name: project.name,
            slug: project.slug,
            createdAt: project.createdAt,
            endpoints: project.endpoints.map((endpoint) => ({
              id: endpoint.id,
              name: endpoint.name,
              description: endpoint.description,
              slug: endpoint.slug,
              status: endpoint.status,
              framework: endpoint.framework,
              inputType: endpoint.inputType,
              accessType: endpoint.accessType,
              deploymentType: endpoint.deploymentType,
              serviceUrl: endpoint.serviceUrl,
              createdAt: endpoint.createdAt,
              deployedAt: endpoint.deployedAt,
            })),
          })),
        },
      })),
      sessions: sessions.map((session) => ({
        id: session.id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        expires: session.expires,
      })),
      exportedAt: new Date().toISOString(),
    };

    return {
      success: true,
      data: exportData,
      error: null,
    };
  } catch (error) {
    console.error("Error exporting user data:", error);
    return {
      success: false,
      error: "Failed to export user data",
      data: null,
    };
  }
}
