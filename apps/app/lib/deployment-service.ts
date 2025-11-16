import { prisma } from "@repo/db";
import { Storage } from "@google-cloud/storage";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

interface DeploymentConfig {
  endpointId: string;
  userId: string;
  projectId: string;
  framework: string;
  apiKey: string;
  gcsModelPath: string;
  gcsRequirementsPath: string;
  gcsInferencePath?: string;
}

export class DeploymentService {
  private storage: Storage;
  private bucketName: string;
  private artifactRegistry: string;
  private region: string;

  constructor() {
    const credentialsPath = path.join(process.cwd(), "./service-account.json");

    this.storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || "aiforge-2026",
      keyFilename: credentialsPath,
    });

    this.bucketName = process.env.GCS_BUCKET_MODELS || "aiforge-models";
    this.artifactRegistry = process.env.ARTIFACT_REGISTRY_REPO || "asia-south1-docker.pkg.dev/aiforge-2026/aiforge-models-repo";
    this.region = process.env.CLOUD_RUN_REGION || "asia-south1";
  }

  async updateStatus(endpointId: string, status: string, logs: string, errorMessage?: string) {
    const endpoint = await prisma.endpoint.findUnique({
      where: { id: endpointId },
      select: { buildLogs: true },
    });

    const existingLogs = endpoint?.buildLogs || "";
    const newLogs = existingLogs + "\n" + logs;

    await prisma.endpoint.update({
      where: { id: endpointId },
      data: {
        status: status as any,
        buildLogs: newLogs,
        errorMessage: errorMessage || null,
      },
    });
  }

  async deploy(config: DeploymentConfig): Promise<void> {
    const { endpointId, framework, apiKey, gcsModelPath, gcsRequirementsPath, gcsInferencePath } = config;

    try {
      // Step 1: Download files from GCS
      await this.updateStatus(
        endpointId,
        "BUILDING",
        `[${new Date().toISOString()}] Downloading files from GCS...`
      );

      const workDir = path.join(process.cwd(), "tmp", endpointId);
      await fs.promises.mkdir(workDir, { recursive: true });

      const bucket = this.storage.bucket(this.bucketName);

      // Download model file
      const modelFileName = path.basename(gcsModelPath);
      await bucket.file(gcsModelPath).download({
        destination: path.join(workDir, modelFileName),
      });

      // Download user's requirements.txt
      const userRequirementsPath = path.join(workDir, "user-requirements.txt");
      await bucket.file(gcsRequirementsPath).download({
        destination: userRequirementsPath,
      });

      // Read user requirements
      const userRequirements = await fs.promises.readFile(userRequirementsPath, "utf-8");

      // Read base FastAPI requirements
      const baseRequirementsPath = path.join(process.cwd(), "../api/requirements.txt");
      const baseRequirements = await fs.promises.readFile(baseRequirementsPath, "utf-8");

      // Merge requirements (base + user requirements)
      const mergedRequirements = `# Base FastAPI requirements\n${baseRequirements}\n\n# User model requirements\n${userRequirements}`;
      await fs.promises.writeFile(path.join(workDir, "requirements.txt"), mergedRequirements);

      // Download inference.py if exists
      if (gcsInferencePath) {
        await bucket.file(gcsInferencePath).download({
          destination: path.join(workDir, "inference.py"),
        });
      }

      await this.updateStatus(
        endpointId,
        "BUILDING",
        `[${new Date().toISOString()}] Files downloaded successfully`
      );

      // Step 2: Create Dockerfile
      await this.updateStatus(
        endpointId,
        "BUILDING",
        `[${new Date().toISOString()}] Generating Dockerfile...`
      );

      const dockerfile = this.generateDockerfile(framework, modelFileName);
      await fs.promises.writeFile(path.join(workDir, "Dockerfile"), dockerfile);

      // Copy API code (simplified version)
      await this.copyApiCode(workDir);

      await this.updateStatus(
        endpointId,
        "BUILDING",
        `[${new Date().toISOString()}] Dockerfile created`
      );

      // Step 3: Build Docker image
      await this.updateStatus(
        endpointId,
        "BUILDING",
        `[${new Date().toISOString()}] Building Docker image for linux/amd64...`
      );

      const imageName = `${this.artifactRegistry}/${endpointId}:latest`;

      const { stdout: buildOutput, stderr: buildError } = await execAsync(
        `docker build --platform linux/amd64 -t ${imageName} .`,
        { cwd: workDir, maxBuffer: 10 * 1024 * 1024 }
      );

      await this.updateStatus(
        endpointId,
        "BUILDING",
        `[${new Date().toISOString()}] Docker image built successfully\n${buildOutput.slice(-500)}`
      );

      // Step 4: Push to Artifact Registry
      await this.updateStatus(
        endpointId,
        "BUILDING",
        `[${new Date().toISOString()}] Pushing image to Artifact Registry...`
      );

      // Authenticate Docker with Artifact Registry
      await execAsync(
        `gcloud auth configure-docker ${this.region}-docker.pkg.dev --quiet`
      );

      const { stdout: pushOutput } = await execAsync(
        `docker push ${imageName}`,
        { maxBuffer: 10 * 1024 * 1024 }
      );

      await this.updateStatus(
        endpointId,
        "DEPLOYING",
        `[${new Date().toISOString()}] Image pushed to Artifact Registry\n${pushOutput.slice(-500)}`
      );

      // Step 5: Deploy to Cloud Run
      await this.updateStatus(
        endpointId,
        "DEPLOYING",
        `[${new Date().toISOString()}] Deploying to Cloud Run...`
      );

      const serviceName = `aiforge-${endpointId.toLowerCase().slice(0, 20)}`;

      await execAsync(
        `gcloud run deploy ${serviceName} \
          --image ${imageName} \
          --platform managed \
          --region ${this.region} \
          --allow-unauthenticated \
          --memory 2Gi \
          --cpu 2 \
          --timeout 300 \
          --max-instances 10 \
          --port 8080 \
          --set-env-vars "MODEL_PATH=/app/models/${modelFileName},DOWNLOAD_MODEL_ON_STARTUP=false,API_KEY=${apiKey},ENABLE_API_KEY_AUTH=true" \
          --quiet`,
        { maxBuffer: 10 * 1024 * 1024 }
      );

      // Get service URL using gcloud describe command
      const { stdout: serviceInfo } = await execAsync(
        `gcloud run services describe ${serviceName} \
          --region ${this.region} \
          --format "value(status.url)"`
      );
      const serviceUrl = serviceInfo.trim();

      await this.updateStatus(
        endpointId,
        "DEPLOYED",
        `[${new Date().toISOString()}] Deployment completed successfully\n[${new Date().toISOString()}] Service URL: ${serviceUrl}`
      );

      // Update with service URL
      await prisma.endpoint.update({
        where: { id: endpointId },
        data: {
          serviceUrl,
          deployedAt: new Date(),
        },
      });

      // Cleanup
      await fs.promises.rm(workDir, { recursive: true, force: true });

      console.log(`✅ Deployment completed for endpoint ${endpointId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ Deployment failed for endpoint ${endpointId}:`, error);

      await this.updateStatus(
        endpointId,
        "FAILED",
        `[${new Date().toISOString()}] Deployment failed: ${errorMessage}`,
        errorMessage
      );

      throw error;
    }
  }

  private generateDockerfile(framework: string, modelFileName: string): string {
    const baseImage = "python:3.11-slim";

    return `FROM ${baseImage}

WORKDIR /app

# Install system dependencies including curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends \\
    gcc g++ curl && \\
    rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create models directory
RUN mkdir -p /app/models

# Copy model and API code
COPY ${modelFileName} /app/models/${modelFileName}
COPY app /app/app

# Set environment variables
ENV PORT=8080
ENV HOST=0.0.0.0
ENV PYTHONUNBUFFERED=1
ENV MODEL_PATH=/app/models/${modelFileName}
ENV DOWNLOAD_MODEL_ON_STARTUP=false

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s CMD curl -f http://localhost:8080/health || exit 1

# Run the application
CMD uvicorn app.main:app --host \${HOST} --port \${PORT}
`;
  }

  private async copyApiCode(workDir: string): Promise<void> {
    // Copy the FastAPI code from apps/api
    const apiSourcePath = path.join(process.cwd(), "../api/app");
    const apiDestPath = path.join(workDir, "app");

    await fs.promises.cp(apiSourcePath, apiDestPath, { recursive: true });
  }
}
