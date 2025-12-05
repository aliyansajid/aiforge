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

    // Helper function to get step message based on status
    const getStepMessage = (
      stepName: string,
      isCurrentStep: boolean,
      isPastStep: boolean
    ): string => {
      if (isPastStep) {
        // Step is completed
        switch (stepName) {
          case "INITIALIZING":
            return "Deployment environment ready";
          case "UPLOADING":
            return "Files uploaded successfully to Google Cloud Storage";
          case "BUILDING":
            return "Docker image built successfully";
          case "DEPLOYING":
            return "Service deployed to Cloud Run";
          case "COMPLETED":
            return "Your endpoint is live and ready to use";
          default:
            return "Completed";
        }
      } else if (isCurrentStep) {
        // Step is in progress
        switch (stepName) {
          case "INITIALIZING":
            return "Setting up deployment environment...";
          case "UPLOADING":
            return "Uploading files to Google Cloud Storage...";
          case "BUILDING":
            return "Building Docker image with your dependencies...";
          case "DEPLOYING":
            return "Deploying service to Google Cloud Run...";
          default:
            return "In progress...";
        }
      } else {
        // Step is pending
        switch (stepName) {
          case "INITIALIZING":
            return "Waiting to initialize";
          case "UPLOADING":
            return "Waiting to upload files";
          case "BUILDING":
            return "Waiting to build Docker image";
          case "DEPLOYING":
            return "Waiting to deploy to Cloud Run";
          case "COMPLETED":
            return "Waiting for all steps to complete";
          default:
            return "Waiting...";
        }
      }
    };

    // Create step statuses based on current status
    const steps = [
      {
        step: "INITIALIZING",
        status: "completed" as const,
        message: getStepMessage("INITIALIZING", false, true),
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
        message: getStepMessage(
          "UPLOADING",
          endpoint.status === "UPLOADING",
          ["BUILDING", "DEPLOYING", "DEPLOYED"].includes(endpoint.status)
        ),
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
        message: getStepMessage(
          "BUILDING",
          endpoint.status === "BUILDING",
          ["DEPLOYING", "DEPLOYED"].includes(endpoint.status)
        ),
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
        message: getStepMessage(
          "DEPLOYING",
          endpoint.status === "DEPLOYING",
          endpoint.status === "DEPLOYED"
        ),
        timestamp: endpoint.deployedAt || endpoint.createdAt,
      },
      {
        step: "COMPLETED",
        status: endpoint.status === "DEPLOYED" ? ("completed" as const) : ("pending" as const),
        message: getStepMessage("COMPLETED", false, endpoint.status === "DEPLOYED"),
        timestamp: endpoint.deployedAt,
      },
    ];

    // Create comprehensive logs for all steps
    const logs: string[] = [];

    // Add initialization logs
    logs.push(`[${new Date(endpoint.createdAt).toLocaleTimeString()}] 🚀 Deployment initialized`);
    logs.push(`[${new Date(endpoint.createdAt).toLocaleTimeString()}] 📋 Endpoint ID: ${endpoint.id}`);
    logs.push(`[${new Date(endpoint.createdAt).toLocaleTimeString()}] 📝 Endpoint Name: ${endpoint.name}`);

    // Add upload logs if past that stage
    if (["UPLOADING", "BUILDING", "DEPLOYING", "DEPLOYED"].includes(endpoint.status)) {
      logs.push(`[${new Date(endpoint.createdAt).toLocaleTimeString()}] 📤 Starting file upload to Google Cloud Storage...`);
    }

    if (["BUILDING", "DEPLOYING", "DEPLOYED"].includes(endpoint.status)) {
      logs.push(`[${new Date(endpoint.createdAt).toLocaleTimeString()}] ✅ Files uploaded successfully`);
    }

    // Add build logs if available
    if (endpoint.buildLogs && ["BUILDING", "DEPLOYING", "DEPLOYED"].includes(endpoint.status)) {
      logs.push(`[${new Date().toLocaleTimeString()}] 🐳 Starting Docker image build...`);
      endpoint.buildLogs.split("\n").filter(Boolean).forEach(log => {
        logs.push(log);
      });
    }

    // Add deployment logs
    if (endpoint.status === "DEPLOYING") {
      logs.push(`[${new Date().toLocaleTimeString()}] 🚀 Deploying to Google Cloud Run...`);
    }

    if (endpoint.status === "DEPLOYED" && endpoint.deployedAt) {
      logs.push(`[${new Date(endpoint.deployedAt).toLocaleTimeString()}] ✅ Deployment completed successfully!`);
      logs.push(`[${new Date(endpoint.deployedAt).toLocaleTimeString()}] 🌐 Service URL: ${endpoint.serviceUrl || "Pending..."}`);
      logs.push(`[${new Date(endpoint.deployedAt).toLocaleTimeString()}] 🔑 API Key: ${endpoint.apiKey}`);
    }

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
