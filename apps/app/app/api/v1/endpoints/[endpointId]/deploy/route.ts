import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/db";

/**
 * POST /api/v1/endpoints/[endpointId]/deploy
 * Manually trigger deployment completion (temporary for testing)
 * TODO: Replace with actual Cloud Run deployment trigger
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  try {
    const { endpointId } = await params;

    const endpoint = await prisma.endpoint.findUnique({
      where: { id: endpointId },
    });

    if (!endpoint) {
      return NextResponse.json(
        { detail: "Endpoint not found" },
        { status: 404 }
      );
    }

    // For testing: Mark as deployed with a mock service URL
    // In production, this would be triggered by Cloud Build/Cloud Run
    const mockServiceUrl = `https://aiforge-${endpoint.slug}-${endpointId.slice(0, 8)}.run.app`;

    const updatedEndpoint = await prisma.endpoint.update({
      where: { id: endpointId },
      data: {
        status: "DEPLOYED",
        serviceUrl: mockServiceUrl,
        deployedAt: new Date(),
        buildLogs: endpoint.buildLogs
          ? `${endpoint.buildLogs}\n[${new Date().toISOString()}] Deployment completed (manual trigger for testing)\n[${new Date().toISOString()}] Service URL: ${mockServiceUrl}`
          : `[${new Date().toISOString()}] Deployment completed\n[${new Date().toISOString()}] Service URL: ${mockServiceUrl}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Endpoint deployed successfully",
      endpoint: {
        id: updatedEndpoint.id,
        name: updatedEndpoint.name,
        status: updatedEndpoint.status,
        serviceUrl: updatedEndpoint.serviceUrl,
        apiKey: updatedEndpoint.apiKey,
      },
    });
  } catch (error) {
    console.error("Error deploying endpoint:", error);
    return NextResponse.json(
      {
        detail: error instanceof Error ? error.message : "Failed to deploy",
      },
      { status: 500 }
    );
  }
}
