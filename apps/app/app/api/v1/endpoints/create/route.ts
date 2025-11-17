import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { Storage } from "@google-cloud/storage";
import { auth } from "@repo/auth";
import path from "path";

// Helper function to initialize GCS
function getStorage() {
  const credentialsPath = path.join(
    process.cwd(),
    process.env.GOOGLE_APPLICATION_CREDENTIALS || "./service-account.json"
  );

  return new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || "aiforge-2026",
    keyFilename: credentialsPath,
  });
}

/**
 * POST /api/v1/endpoints/create
 * Creates a new endpoint, uploads files to GCS, and triggers deployment
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { detail: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const formData = await request.formData();

    // Extract common form fields
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const projectId = formData.get("projectId") as string;
    const userId = formData.get("userId") as string;
    const accessType = formData.get("accessType") as string;
    const inputType = formData.get("inputType") as string;
    const deploymentType = (formData.get("deploymentType") as string) || "SINGLE_FILE";
    const pricePerRequest = formData.get("pricePerRequest") as string | null;
    const pricePerMonth = formData.get("pricePerMonth") as string | null;

    // Extract deployment-specific fields
    const modelFile = formData.get("modelFile") as File | null;
    const requirementsFile = formData.get("requirementsFile") as File | null;
    const inferenceFile = formData.get("inferenceFile") as File | null;
    const archiveFile = formData.get("archiveFile") as File | null;
    const gitRepoUrl = formData.get("gitRepoUrl") as string | null;
    const gitBranch = formData.get("gitBranch") as string | null;
    const gitCommit = formData.get("gitCommit") as string | null;
    const gitAccessToken = formData.get("gitAccessToken") as string | null;

    // Validate required fields
    if (!name || !projectId || !userId || !accessType || !inputType) {
      return NextResponse.json(
        { detail: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate deployment-specific requirements
    if (deploymentType === "SINGLE_FILE" && (!modelFile || !requirementsFile)) {
      return NextResponse.json(
        { detail: "Model file and requirements.txt are required for single file deployment" },
        { status: 400 }
      );
    }

    if (deploymentType === "ZIP_ARCHIVE" && !archiveFile) {
      return NextResponse.json(
        { detail: "Archive file is required for ZIP deployment" },
        { status: 400 }
      );
    }

    if (deploymentType === "GIT_REPOSITORY" && !gitRepoUrl) {
      return NextResponse.json(
        { detail: "Repository URL is required for GitHub deployment" },
        { status: 400 }
      );
    }

    // Verify user has access to project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        team: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { detail: "Project not found or access denied" },
        { status: 403 }
      );
    }

    // Generate unique slug from name
    let baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if slug exists and make it unique
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existingEndpoint = await prisma.endpoint.findUnique({
        where: {
          projectId_slug: {
            projectId,
            slug,
          },
        },
      });

      if (!existingEndpoint) {
        break; // Slug is unique
      }

      // Append counter to make it unique
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Detect framework from model file extension (for single file deployment)
    let framework = "sklearn"; // Default to sklearn for Git/ZIP deployments

    if (deploymentType === "SINGLE_FILE" && modelFile) {
      const modelExtension = modelFile.name.split(".").pop()?.toLowerCase();

      if (["h5", "keras"].includes(modelExtension || "")) {
        framework = "tensorflow";
      } else if (["pt", "pth"].includes(modelExtension || "")) {
        framework = "pytorch";
      } else if (modelExtension === "onnx") {
        framework = "onnx";
      } else if (["pkl", "joblib"].includes(modelExtension || "")) {
        framework = "sklearn";
      }
    }

    // Create endpoint in database first
    const endpoint = await prisma.endpoint.create({
      data: {
        name,
        slug,
        description: description || null,
        projectId,
        createdBy: userId,
        framework,
        inputType: inputType as any,
        accessType: accessType as any,
        status: "UPLOADING",
        deploymentType: deploymentType as any,
        // For Git deployments
        gitRepoUrl: gitRepoUrl || null,
        gitBranch: gitBranch || null,
        gitCommitSha: gitCommit || null,
        gitAccessToken: gitAccessToken || null,
        // Temporary placeholders for file paths - will be updated after upload
        gcsModelPath: deploymentType === "GIT_REPOSITORY" ? null : "",
        gcsRequirementsPath: deploymentType === "GIT_REPOSITORY" ? null : "",
        gcsInferencePath: deploymentType === "GIT_REPOSITORY" ? null : "",
        gcsArchivePath: null,
        pricePerRequest: pricePerRequest ? parseFloat(pricePerRequest) : null,
      },
    });

    try {
      let modelGcsPath = "";
      let requirementsGcsPath = "";
      let inferenceGcsPath = "";
      let archiveGcsPath = "";
      let buildLogs = "";

      // Handle different deployment types
      if (deploymentType === "GIT_REPOSITORY") {
        // For Git deployments, skip file uploads
        console.log("🔗 GitHub deployment - skipping file upload");
        buildLogs = [
          `[${new Date().toISOString()}] Endpoint created`,
          `[${new Date().toISOString()}] Deployment type: GitHub Repository`,
          `[${new Date().toISOString()}] Repository: ${gitRepoUrl}`,
          gitBranch ? `[${new Date().toISOString()}] Branch: ${gitBranch}` : null,
          gitCommit ? `[${new Date().toISOString()}] Commit: ${gitCommit}` : null,
          `[${new Date().toISOString()}] Framework: ${framework} (will auto-detect)`,
          `[${new Date().toISOString()}] Status: BUILDING - Cloning repository`,
        ].filter(Boolean).join("\n");

        // Update endpoint status
        await prisma.endpoint.update({
          where: { id: endpoint.id },
          data: {
            status: "BUILDING",
            buildLogs,
          },
        });

      } else if (deploymentType === "ZIP_ARCHIVE" && archiveFile) {
        // Upload ZIP archive
        const storage = getStorage();
        const modelsBucket = storage.bucket(
          process.env.GCS_BUCKET_MODELS || "aiforge-models"
        );

        const endpointPath = `${userId}/${endpoint.id}`;
        const archiveBuffer = Buffer.from(await archiveFile.arrayBuffer());
        archiveGcsPath = `${endpointPath}/${archiveFile.name}`;

        console.log("📦 Uploading ZIP archive to GCS:");
        console.log(`  - Archive: ${archiveFile.name} (${archiveFile.size} bytes)`);

        await modelsBucket.file(archiveGcsPath).save(archiveBuffer, {
          metadata: {
            contentType: "application/zip",
          },
        });

        console.log("✅ Archive uploaded successfully to GCS");

        buildLogs = [
          `[${new Date().toISOString()}] Endpoint created`,
          `[${new Date().toISOString()}] Deployment type: ZIP Archive`,
          `[${new Date().toISOString()}] Uploaded archive: ${archiveFile.name} (${archiveFile.size} bytes)`,
          `[${new Date().toISOString()}] Framework: ${framework} (will auto-detect)`,
          `[${new Date().toISOString()}] Status: BUILDING - Extracting archive`,
        ].filter(Boolean).join("\n");

        await prisma.endpoint.update({
          where: { id: endpoint.id },
          data: {
            gcsArchivePath: archiveGcsPath,
            status: "BUILDING",
            buildLogs,
          },
        });

      } else if (deploymentType === "SINGLE_FILE" && modelFile && requirementsFile) {
        // Original single file upload logic
        const storage = getStorage();
        const modelsBucket = storage.bucket(
          process.env.GCS_BUCKET_MODELS || "aiforge-models"
        );

        const endpointPath = `${userId}/${endpoint.id}`;
        const modelBuffer = Buffer.from(await modelFile.arrayBuffer());
        const requirementsBuffer = Buffer.from(await requirementsFile.arrayBuffer());

        modelGcsPath = `${endpointPath}/${modelFile.name}`;
        requirementsGcsPath = `${endpointPath}/requirements.txt`;

        console.log("📦 Uploading files to GCS:");
        console.log(`  - Model: ${modelFile.name} (${modelFile.size} bytes)`);
        console.log(`  - Requirements: ${requirementsFile.name} (${requirementsFile.size} bytes)`);

        // Upload model file
        await modelsBucket.file(modelGcsPath).save(modelBuffer, {
          metadata: {
            contentType: modelFile.type || "application/octet-stream",
          },
        });

        // Upload requirements file
        await modelsBucket.file(requirementsGcsPath).save(requirementsBuffer, {
          metadata: {
            contentType: "text/plain",
          },
        });

        // Upload inference file if provided
        if (inferenceFile) {
          console.log(`  - Inference: ${inferenceFile.name} (${inferenceFile.size} bytes)`);
          const inferenceBuffer = Buffer.from(await inferenceFile.arrayBuffer());
          inferenceGcsPath = `${endpointPath}/inference.py`;
          await modelsBucket.file(inferenceGcsPath).save(inferenceBuffer, {
            metadata: {
              contentType: "text/x-python",
            },
          });
        }

        console.log("✅ Files uploaded successfully to GCS");

        buildLogs = [
          `[${new Date().toISOString()}] Endpoint created`,
          `[${new Date().toISOString()}] Deployment type: Single File`,
          `[${new Date().toISOString()}] Uploaded model: ${modelFile.name} (${modelFile.size} bytes)`,
          `[${new Date().toISOString()}] Uploaded requirements.txt (${requirementsFile.size} bytes)`,
          inferenceFile ? `[${new Date().toISOString()}] Uploaded inference.py (${inferenceFile.size} bytes)` : null,
          `[${new Date().toISOString()}] Framework detected: ${framework}`,
          `[${new Date().toISOString()}] Files uploaded to GCS successfully`,
          `[${new Date().toISOString()}] Status: BUILDING - Waiting for Cloud Run deployment`,
        ].filter(Boolean).join("\n");

        await prisma.endpoint.update({
          where: { id: endpoint.id },
          data: {
            gcsModelPath: modelGcsPath,
            gcsRequirementsPath: requirementsGcsPath,
            gcsInferencePath: inferenceGcsPath || "",
            status: "BUILDING",
            buildLogs,
          },
        });
      }

      console.log(`✅ Endpoint ${endpoint.id} status updated to BUILDING`);

      // Trigger deployment in background (don't await)
      // Use enhanced deployment service for ZIP/Git, or legacy for single file
      if (deploymentType === "GIT_REPOSITORY" || deploymentType === "ZIP_ARCHIVE") {
        import("@/lib/enhanced-deployment-service").then(({ EnhancedDeploymentService }) => {
          const deploymentService = new EnhancedDeploymentService();
          deploymentService.deploy({
            endpointId: endpoint.id,
            userId,
            projectId,
            framework,
            apiKey: endpoint.apiKey,
            deploymentType: deploymentType as any,
            gcsArchivePath: archiveGcsPath || undefined,
            gitRepoUrl: gitRepoUrl || undefined,
            gitBranch: gitBranch || undefined,
            gitCommitSha: gitCommit || undefined,
            gitAccessToken: gitAccessToken || undefined,
          }).catch((error) => {
            console.error(`Background deployment failed for ${endpoint.id}:`, error);
          });
        });
      } else {
        import("@/lib/deployment-service").then(({ DeploymentService }) => {
          const deploymentService = new DeploymentService();
          deploymentService.deploy({
            endpointId: endpoint.id,
            userId,
            projectId,
            framework,
            apiKey: endpoint.apiKey,
            gcsModelPath: modelGcsPath,
            gcsRequirementsPath: requirementsGcsPath,
            gcsInferencePath: inferenceGcsPath || undefined,
          }).catch((error) => {
            console.error(`Background deployment failed for ${endpoint.id}:`, error);
          });
        });
      }

      return NextResponse.json({
        success: true,
        endpointId: endpoint.id,
        message: "Endpoint created and deployment started",
      });
    } catch (uploadError) {
      // If upload fails, update endpoint status to FAILED
      await prisma.endpoint.update({
        where: { id: endpoint.id },
        data: {
          status: "FAILED",
          errorMessage: uploadError instanceof Error ? uploadError.message : "Upload failed",
        },
      });

      throw uploadError;
    }
  } catch (error) {
    console.error("Error creating endpoint:", error);
    return NextResponse.json(
      {
        detail: error instanceof Error ? error.message : "Failed to create endpoint",
      },
      { status: 500 }
    );
  }
}
