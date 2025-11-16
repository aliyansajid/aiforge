"use server";

import { auth } from "@repo/auth";
import { prisma } from "@repo/db";

export async function getEndpointContext(
  projectSlug: string,
  teamSlug: string
) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      message: "Please sign in",
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
    });

    if (!project) {
      return {
        success: false,
        message: "Project not found or you don't have access",
        data: null,
      };
    }

    return {
      success: true,
      data: {
        projectId: project.id,
        userId: session.user.id,
      },
    };
  } catch (error) {
    console.error("Error fetching context:", error);
    return {
      success: false,
      message: "An error occurred",
      data: null,
    };
  }
}

export interface EndpointDetails {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  framework: string;
  inputType: string;
  serviceUrl: string | null;
  apiKey: string;
  status: string;
  accessType: string;
  deployedAt: Date | null;
  createdAt: Date;
}

export async function getEndpointDetails(endpointId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      message: "Please sign in to view this endpoint.",
      data: null,
    };
  }

  try {
    const endpoint = await prisma.endpoint.findFirst({
      where: {
        id: endpointId,
        project: {
          team: {
            members: {
              some: {
                userId: session.user.id,
              },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        framework: true,
        inputType: true,
        serviceUrl: true,
        apiKey: true,
        status: true,
        accessType: true,
        deployedAt: true,
        createdAt: true,
      },
    });

    if (!endpoint) {
      return {
        success: false,
        message: "Endpoint not found or you don't have access.",
        data: null,
      };
    }

    return {
      success: true,
      message: "Endpoint fetched successfully.",
      data: endpoint,
    };
  } catch (error) {
    console.error("Error fetching endpoint details:", error);
    return {
      success: false,
      message: "An unexpected error occurred while fetching the endpoint.",
      data: null,
    };
  }
}
