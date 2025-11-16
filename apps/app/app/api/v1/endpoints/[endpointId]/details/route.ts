import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { auth } from "@repo/auth";

/**
 * GET /api/v1/endpoints/[endpointId]/details
 * Fetches endpoint details for the playground page
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { detail: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const { endpointId } = await params;

    // Fetch endpoint and verify user has access via team membership
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
        serviceUrl: true,
        apiKey: true,
        status: true,
        accessType: true,
        deployedAt: true,
        createdAt: true,
      },
    });

    if (!endpoint) {
      return NextResponse.json(
        { detail: "Endpoint not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(endpoint);
  } catch (error) {
    console.error("Error fetching endpoint details:", error);
    return NextResponse.json(
      {
        detail: error instanceof Error ? error.message : "Failed to fetch endpoint details",
      },
      { status: 500 }
    );
  }
}
