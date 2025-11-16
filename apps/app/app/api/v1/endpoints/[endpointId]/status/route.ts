import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/db";

/**
 * GET /api/v1/endpoints/[endpointId]/status
 * Gets the deployment status of an endpoint
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  try {
    const { endpointId } = await params;

    const endpoint = await prisma.endpoint.findUnique({
      where: { id: endpointId },
      select: {
        id: true,
        name: true,
        status: true,
        errorMessage: true,
        buildLogs: true,
        serviceUrl: true,
        apiKey: true,
        deployedAt: true,
        createdAt: true,
      },
    });

    if (!endpoint) {
      return NextResponse.json(
        { detail: "Endpoint not found" },
        { status: 404 }
      );
    }

    // Map database status to deployment steps
    const statusMapping: Record<string, string> = {
      UPLOADING: "UPLOADING",
      BUILDING: "BUILDING",
      DEPLOYING: "DEPLOYING",
      DEPLOYED: "COMPLETED",
      FAILED: "FAILED",
      SUSPENDED: "FAILED",
    };

    const currentStep = statusMapping[endpoint.status] || "INITIALIZING";

    // Create step statuses based on current status
    const steps = [
      {
        step: "INITIALIZING",
        status: "completed" as const,
        message: "Endpoint created",
        timestamp: endpoint.createdAt,
      },
      {
        step: "UPLOADING",
        status:
          endpoint.status === "UPLOADING"
            ? ("in_progress" as const)
            : ["BUILDING", "DEPLOYING", "DEPLOYED"].includes(endpoint.status)
            ? ("completed" as const)
            : ("pending" as const),
        message: endpoint.status === "UPLOADING" ? "Uploading files to GCS..." : "Files uploaded",
        timestamp: endpoint.createdAt,
      },
      {
        step: "BUILDING",
        status:
          endpoint.status === "BUILDING"
            ? ("in_progress" as const)
            : ["DEPLOYING", "DEPLOYED"].includes(endpoint.status)
            ? ("completed" as const)
            : ("pending" as const),
        message: endpoint.status === "BUILDING" ? "Building Docker image..." : endpoint.status === "DEPLOYED" ? "Build completed" : "Waiting to build",
        timestamp: endpoint.createdAt,
      },
      {
        step: "DEPLOYING",
        status:
          endpoint.status === "DEPLOYING"
            ? ("in_progress" as const)
            : endpoint.status === "DEPLOYED"
            ? ("completed" as const)
            : ("pending" as const),
        message: endpoint.status === "DEPLOYING" ? "Deploying to Cloud Run..." : endpoint.status === "DEPLOYED" ? "Deployed successfully" : "Waiting to deploy",
        timestamp: endpoint.deployedAt || endpoint.createdAt,
      },
    ];

    // Parse logs from buildLogs
    const logs = endpoint.buildLogs ? endpoint.buildLogs.split("\n").filter(Boolean) : [];

    return NextResponse.json({
      id: endpoint.id,
      name: endpoint.name,
      currentStep,
      steps,
      logs,
      error: endpoint.errorMessage,
      serviceUrl: endpoint.serviceUrl,
      apiKey: endpoint.apiKey,
      status: endpoint.status,
      deployedAt: endpoint.deployedAt,
      createdAt: endpoint.createdAt,
    });
  } catch (error) {
    console.error("Error fetching endpoint status:", error);
    return NextResponse.json(
      {
        detail: error instanceof Error ? error.message : "Failed to fetch status",
      },
      { status: 500 }
    );
  }
}
