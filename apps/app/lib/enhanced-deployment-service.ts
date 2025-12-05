import { prisma } from "@repo/db";
import { Storage } from "@google-cloud/storage";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import { ZipExtractorEnhanced } from "./zip-extractor-enhanced";
import { ZipExtractor } from "./zip-extractor";
import { GitHandler } from "./git-handler";
import { getGoogleCredentials } from "./gcp-credentials";

export const execAsync = promisify(exec);

interface DeploymentConfig {
  endpointId: string;
  userId: string;
  projectId: string;
  framework: string;
  apiKey: string;
  deploymentType: "SINGLE_FILE" | "ZIP_ARCHIVE" | "GIT_REPOSITORY";

  // Single file deployment
  gcsModelPath?: string;
  gcsRequirementsPath?: string;
  gcsInferencePath?: string;

  // ZIP deployment
  gcsArchivePath?: string;

  // Git deployment
  gitRepoUrl?: string;
  gitBranch?: string;
  gitCommitSha?: string;
  gitAccessToken?: string;
}

export class EnhancedDeploymentService {
  private storage: Storage;
  private bucketName: string;
  private projectId: string;
  private region: string;
  private artifactRegistry: string;

  constructor() {
    const credentials = getGoogleCredentials();

    this.storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || "aiforge-448200",
      ...credentials,
    });

    this.bucketName = process.env.GCS_BUCKET_MODELS || "aiforge-models";
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || "aiforge-448200";
    this.region = process.env.CLOUD_RUN_REGION || "us-central1";
    this.artifactRegistry =
      process.env.ARTIFACT_REGISTRY_REPO ||
      `${this.region}-docker.pkg.dev/${this.projectId}/aiforge-models-repo`;
  }

  async updateStatus(
    endpointId: string,
    status: string,
    logs: string,
    errorMessage?: string
  ) {
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
    const { endpointId, framework, deploymentType } = config;

    try {
      await this.updateStatus(
        endpointId,
        "BUILDING",
        `[${new Date().toISOString()}] Starting deployment (type: ${deploymentType})...`
      );

      // Create working directory
      const workDir = path.join(process.cwd(), "tmp", endpointId);
      await fs.promises.mkdir(workDir, { recursive: true });

      // Handle different deployment types
      let modelPackagePath: string;
      let requirementsContent: string | undefined;

      switch (deploymentType) {
        case "SINGLE_FILE":
          modelPackagePath = await this.handleSingleFileDeployment(
            config,
            workDir
          );
          requirementsContent = await this.loadRequirements(
            path.join(workDir, "user-requirements.txt")
          );
          break;

        case "ZIP_ARCHIVE":
          const zipResult = await this.handleZipDeployment(config, workDir);
          modelPackagePath = zipResult.packagePath;
          requirementsContent = zipResult.requirementsContent;
          break;

        case "GIT_REPOSITORY":
          const gitResult = await this.handleGitDeployment(config, workDir);
          modelPackagePath = gitResult.packagePath;
          requirementsContent = gitResult.requirementsContent;
          break;

        default:
          throw new Error(`Unsupported deployment type: ${deploymentType}`);
      }

      // Merge requirements with base
      const mergedRequirements = await this.mergeRequirements(
        framework,
        requirementsContent
      );
      await fs.promises.writeFile(
        path.join(workDir, "requirements.txt"),
        mergedRequirements
      );

      // Copy FastAPI app
      await this.copyFastAPIApp(workDir);

      // Generate optimized Dockerfile
      const dockerfile = this.generateDockerfile(framework, deploymentType);
      await fs.promises.writeFile(path.join(workDir, "Dockerfile"), dockerfile);

      // Create custom .dockerignore that ALLOWS model files for ZIP/Git deployments
      const dockerignore = this.generateDockerignore(deploymentType);
      await fs.promises.writeFile(
        path.join(workDir, ".dockerignore"),
        dockerignore
      );

      // Copy model package to working directory
      const targetPath = path.join(workDir, "model_package");

      // CRITICAL DEBUG: List all files before Docker build
      const listAllFiles = async (dir: string, prefix = ""): Promise<string[]> => {
        const results: string[] = [];
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const displayPath = path.join(prefix, entry.name);
          if (entry.isDirectory()) {
            results.push(`[DIR] ${displayPath}/`);
            results.push(...(await listAllFiles(fullPath, displayPath)));
          } else {
            const stats = await fs.promises.stat(fullPath);
            results.push(`[FILE] ${displayPath} (${stats.size} bytes)`);
          }
        }
        return results;
      };

      if (modelPackagePath !== targetPath) {
        await this.copyDirectory(modelPackagePath, targetPath);
      }

      // List EVERYTHING in workDir before Docker build
      const allFiles = await listAllFiles(workDir);
      console.log(`[Deploy] ==================== BUILD DIRECTORY CONTENTS ====================`);
      console.log(allFiles.join("\n"));
      console.log(`[Deploy] ================================================================`);

      // Check if model_package exists and has files
      const modelPackageExists = await fs.promises
        .access(path.join(workDir, "model_package"))
        .then(() => true)
        .catch(() => false);

      if (modelPackageExists) {
        const modelPackageFiles = await fs.promises.readdir(
          path.join(workDir, "model_package")
        );
        await this.updateStatus(
          endpointId,
          "BUILDING",
          `[${new Date().toISOString()}] model_package/ contains: ${modelPackageFiles.join(", ")}`
        );
      } else {
        await this.updateStatus(
          endpointId,
          "BUILDING",
          `[${new Date().toISOString()}] WARNING: model_package/ directory NOT FOUND!`
        );
      }

      // Build Docker image
      await this.buildAndPushImage(endpointId, framework, workDir);

      // Deploy to Cloud Run
      await this.deployToCloudRun(config, workDir);

      // Cleanup
      await fs.promises.rm(workDir, { recursive: true, force: true });

      await this.updateStatus(
        endpointId,
        "DEPLOYED",
        `[${new Date().toISOString()}] Deployment completed successfully!`
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.updateStatus(endpointId, "FAILED", "", errorMsg);
      throw error;
    }
  }

  private async handleSingleFileDeployment(
    config: DeploymentConfig,
    workDir: string
  ): Promise<string> {
    await this.updateStatus(
      config.endpointId,
      "BUILDING",
      `[${new Date().toISOString()}] Downloading model files from GCS...`
    );

    const bucket = this.storage.bucket(this.bucketName);
    const packagePath = path.join(workDir, "model_package");
    await fs.promises.mkdir(packagePath, { recursive: true });

    // Download model file
    if (config.gcsModelPath) {
      const modelFileName = path.basename(config.gcsModelPath);
      await bucket.file(config.gcsModelPath).download({
        destination: path.join(packagePath, modelFileName),
      });
    }

    // Download requirements
    if (config.gcsRequirementsPath) {
      await bucket.file(config.gcsRequirementsPath).download({
        destination: path.join(workDir, "user-requirements.txt"),
      });
    }

    // Download inference.py if exists
    if (config.gcsInferencePath) {
      await bucket.file(config.gcsInferencePath).download({
        destination: path.join(packagePath, "inference.py"),
      });
    }

    return packagePath;
  }

  private async handleZipDeployment(
    config: DeploymentConfig,
    workDir: string
  ): Promise<{ packagePath: string; requirementsContent?: string }> {
    await this.updateStatus(
      config.endpointId,
      "BUILDING",
      `[${new Date().toISOString()}] Downloading and extracting ZIP archive...`
    );

    if (!config.gcsArchivePath) {
      throw new Error("ZIP archive path not provided");
    }

    const bucket = this.storage.bucket(this.bucketName);
    const zipPath = path.join(workDir, "archive.zip");

    // Download ZIP from GCS
    await bucket.file(config.gcsArchivePath).download({
      destination: zipPath,
    });

    // Extract with intelligent handling
    const extractResult = await ZipExtractorEnhanced.extract(zipPath, workDir);

    if (!extractResult.success) {
      throw new Error(`ZIP extraction failed: ${extractResult.error}`);
    }

    // Validate extracted contents with enhanced validation (enforces model_config.json)
    const validation = await ZipExtractorEnhanced.validate(extractResult.extractedPath);
    if (!validation.valid) {
      // Format error message for better UX
      const errorMsg = validation.errors.join("\n\n");
      throw new Error(`❌ ZIP Validation Failed:\n\n${errorMsg}`);
    }

    if (validation.warnings.length > 0) {
      await this.updateStatus(
        config.endpointId,
        "BUILDING",
        `[${new Date().toISOString()}] Warnings: ${validation.warnings.join(", ")}`
      );
    }

    // Load requirements if found
    let requirementsContent: string | undefined;
    if (extractResult.requirementsPath) {
      requirementsContent = await fs.promises.readFile(
        extractResult.requirementsPath,
        "utf-8"
      );
    }

    const filesInfo = [
      `${extractResult.modelFiles.length} model file(s)`,
      extractResult.requirementsPath ? "requirements.txt" : null,
      extractResult.inferencePath ? "inference.py" : null,
    ]
      .filter(Boolean)
      .join(", ");

    await this.updateStatus(
      config.endpointId,
      "BUILDING",
      `[${new Date().toISOString()}] Extracted: ${filesInfo}`
    );

    return {
      packagePath: extractResult.extractedPath,
      requirementsContent,
    };
  }

  private async handleGitDeployment(
    config: DeploymentConfig,
    workDir: string
  ): Promise<{ packagePath: string; requirementsContent?: string }> {
    await this.updateStatus(
      config.endpointId,
      "BUILDING",
      `[${new Date().toISOString()}] Cloning Git repository...`
    );

    if (!config.gitRepoUrl) {
      throw new Error("Git repository URL not provided");
    }

    // Validate URL
    const urlValidation = GitHandler.validateRepoUrl(config.gitRepoUrl);
    if (!urlValidation.valid) {
      throw new Error(`Invalid repository URL: ${urlValidation.error}`);
    }

    // Clone repository
    const cloneResult = await GitHandler.clone(
      {
        url: config.gitRepoUrl,
        branch: config.gitBranch,
        commit: config.gitCommitSha,
        accessToken: config.gitAccessToken,
      },
      workDir
    );

    if (!cloneResult.success) {
      throw new Error(`Git clone failed: ${cloneResult.error}`);
    }

    // Validate repository structure
    const validation = await GitHandler.validate(cloneResult.clonedPath);
    if (!validation.valid) {
      throw new Error(
        `Repository validation failed: ${validation.errors.join(", ")}`
      );
    }

    if (validation.warnings.length > 0) {
      await this.updateStatus(
        config.endpointId,
        "BUILDING",
        `[${new Date().toISOString()}] Warnings: ${validation.warnings.join(", ")}`
      );
    }

    // Load requirements if found
    let requirementsContent: string | undefined;
    if (cloneResult.requirementsPath) {
      requirementsContent = await fs.promises.readFile(
        cloneResult.requirementsPath,
        "utf-8"
      );
    }

    await this.updateStatus(
      config.endpointId,
      "BUILDING",
      `[${new Date().toISOString()}] Cloned ${urlValidation.provider} repo: ${cloneResult.branch}@${cloneResult.commitSha.substring(0, 7)}`
    );

    return {
      packagePath: cloneResult.clonedPath,
      requirementsContent,
    };
  }

  private async loadRequirements(
    filePath: string
  ): Promise<string | undefined> {
    try {
      return await fs.promises.readFile(filePath, "utf-8");
    } catch {
      return undefined;
    }
  }

  private async mergeRequirements(
    framework: string,
    userRequirements?: string
  ): Promise<string> {
    // Load framework-specific base requirements
    const baseReqPath = path.join(
      process.cwd(),
      "../api/base-requirements.txt"
    );
    const baseRequirements = await fs.promises.readFile(baseReqPath, "utf-8");

    // Framework-specific dependencies (minimums only - user requirements take precedence)
    const frameworkDeps: Record<string, string> = {
      sklearn: "scikit-learn>=1.3.2\njoblib>=1.3.2\nnumpy>=1.24.0",
      pytorch:
        "torch>=2.0.0 --index-url https://download.pytorch.org/whl/cpu\ntorchvision>=0.15.0 --index-url https://download.pytorch.org/whl/cpu",
      tensorflow: "tensorflow-cpu>=2.15.0",
      onnx: "onnxruntime>=1.16.0",
    };

    const frameworkReq = frameworkDeps[framework] || "";

    // Smart merge - deduplicate packages
    const allRequirements = [baseRequirements, frameworkReq, userRequirements]
      .filter(Boolean)
      .join("\n");

    return this.deduplicateRequirements(allRequirements);
  }

  private deduplicateRequirements(requirements: string): string {
    const lines = requirements.split("\n");
    const packageMap = new Map<string, string>();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      // Extract package name (before ==, >=, etc.)
      const match = trimmed.match(/^([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        const pkgName = match[1].toLowerCase();
        // ALWAYS override with later version (user requirements come last, so they take precedence)
        packageMap.set(pkgName, trimmed);
      } else {
        // Keep special lines (like --index-url)
        packageMap.set(trimmed, trimmed);
      }
    }

    return Array.from(packageMap.values()).join("\n");
  }

  private generateDockerignore(deploymentType: string): string {
    // For ZIP and Git deployments, we NEED model files in the image
    // For single file deployments, model files are already copied separately
    return `# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/
*.pyc
*.pyo
*.pyd

# Virtual environments
venv/
env/
ENV/
.venv

# IDE
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# Git
.git/
.gitignore
.gitattributes

# Documentation
*.md
README.md
docs/

# Testing
tests/
.pytest_cache/
.coverage
htmlcov/
.tox/

# Logs
*.log
logs/

# Environment files (never include secrets)
.env
.env.local
.env.*.local

# NOTE: Model files are INCLUDED for ZIP/Git deployments
# They are in model_package/ directory and must be in the image

# Build artifacts
build/
dist/
*.egg-info/

# Docker
Dockerfile*
docker-compose*.yml
`;
  }

  private generateDockerfile(
    framework: string,
    deploymentType: string
  ): string {
    const frameworkDeps: Record<string, string> = {
      sklearn: "scikit-learn>=1.3.2 joblib>=1.3.2 numpy>=1.24.0",
      pytorch: "torch>=2.0.0 torchvision>=0.15.0 --index-url https://download.pytorch.org/whl/cpu",
      tensorflow: "tensorflow-cpu>=2.15.0",
      onnx: "onnxruntime>=1.16.0",
    };

    const deps = frameworkDeps[framework] || frameworkDeps["sklearn"];

    return `# ================================================
# OPTIMIZED MULTI-STAGE DOCKERFILE WITH CACHING
# Framework: ${framework}
# Deployment: ${deploymentType}
# Generated: ${new Date().toISOString()}
# ================================================

# ==========================================
# STAGE 1: Base Dependencies (CACHED LAYER)
# ==========================================
FROM python:3.11-slim AS base-deps

WORKDIR /app

# Install system dependencies (rarely changes - CACHED)
RUN apt-get update && apt-get install -y --no-install-recommends \\
    libgomp1 \\
    ca-certificates \\
    && rm -rf /var/lib/apt/lists/*

# ================================================
# STAGE 2: Base FastAPI Dependencies (CACHED)
# ================================================
FROM base-deps AS fastapi-deps

# Install base FastAPI dependencies FIRST (rarely change - HEAVILY CACHED)
# These are installed BEFORE user requirements to maximize cache hits
RUN pip install --no-cache-dir \\
    fastapi==0.104.1 \\
    uvicorn[standard]==0.24.0 \\
    pydantic==2.5.0 \\
    pydantic-settings==2.1.0 \\
    google-cloud-storage==2.14.0 \\
    google-auth==2.25.2 \\
    python-multipart==0.0.6 \\
    aiofiles==23.2.1 \\
    python-json-logger==2.0.7

# ================================================
# STAGE 3: User Dependencies (CACHED IF SAME)
# ================================================
FROM fastapi-deps AS user-deps

# Copy ONLY requirements.txt first (maximizes cache hit rate)
COPY requirements.txt /tmp/user-requirements.txt

# Install user's ML dependencies
# USER REQUIREMENTS CONTROL VERSIONS (installed after base FastAPI)
# This allows user to override numpy/sklearn/etc versions
RUN if [ -s /tmp/user-requirements.txt ]; then \\
      echo "==================== INSTALLING USER REQUIREMENTS ====================" && \\
      cat /tmp/user-requirements.txt && \\
      echo "======================================================================" && \\
      pip install --no-cache-dir -r /tmp/user-requirements.txt && \\
      echo "✅ User requirements installed successfully"; \\
    else \\
      echo "No user requirements.txt provided, installing default ${framework} dependencies" && \\
      pip install --no-cache-dir ${deps} && \\
      echo "✅ Default ${framework} dependencies installed"; \\
    fi

# Verify framework installation
RUN python3 -c "import ${framework === 'sklearn' ? 'sklearn' : framework}; print('✅ ${framework} framework verified')" || \\
    (echo "❌ ${framework} framework not found! Check requirements.txt" && exit 1)

# ================================================
# STAGE 4: Final Runtime Image (LIGHTWEIGHT)
# ================================================
FROM python:3.11-slim AS runtime

WORKDIR /app

# Copy system dependencies from base
COPY --from=base-deps /usr/lib /usr/lib
COPY --from=base-deps /usr/bin /usr/bin

# Copy ALL Python packages from user-deps stage (includes FastAPI + user deps)
COPY --from=user-deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=user-deps /usr/local/bin /usr/local/bin

# Copy FastAPI application code
COPY app/ /app/app/

# Copy user's model package (THIS LAYER CHANGES EVERY DEPLOYMENT)
# Placed LAST to avoid invalidating earlier cached layers
COPY model_package/ /app/user_model/

# Add user model to Python path
ENV PYTHONPATH="/app/user_model:\${PYTHONPATH}"

# Runtime environment
ENV PORT=8080
ENV HOST=0.0.0.0
ENV PYTHONUNBUFFERED=1
ENV GCS_BUCKET_NAME=${this.bucketName}
ENV DOWNLOAD_MODEL_ON_STARTUP=false
ENV BUILD_TIMESTAMP="${Date.now()}"

EXPOSE 8080

# Health check (optional - Cloud Run has its own)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s \\
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health', timeout=5)" || exit 1

# Run with optimized settings
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1", "--log-level", "info"]
`;
  }

  private async copyFastAPIApp(workDir: string) {
    // Get the absolute path to the API app
    // From apps/app (Next.js) we need to go up one level and into apps/api/app
    const projectRoot = path.join(process.cwd(), "..");
    const apiPath = path.join(projectRoot, "api", "app");
    const destPath = path.join(workDir, "app");

    console.log(
      `[EnhancedDeploymentService] Copying FastAPI app from: ${apiPath}`
    );

    // Check if path exists
    try {
      await fs.promises.access(apiPath);
    } catch (error) {
      throw new Error(
        `FastAPI app not found at: ${apiPath}. Current working directory: ${process.cwd()}`
      );
    }

    await this.copyDirectory(apiPath, destPath);
  }

  private async copyDirectory(src: string, dest: string) {
    await fs.promises.mkdir(dest, { recursive: true });
    const entries = await fs.promises.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.promises.copyFile(srcPath, destPath);
      }
    }
  }

  private async buildAndPushImage(
    endpointId: string,
    framework: string,
    workDir: string
  ) {
    const imageName = `${this.artifactRegistry}/${endpointId}:latest`;

    await this.updateStatus(
      endpointId,
      "BUILDING",
      `[${new Date().toISOString()}] Building Docker image (using cache for faster builds)...`
    );

    // Use cache for faster builds! Multi-stage Dockerfile is optimized for caching
    // Only use --no-cache if explicitly needed for debugging
    const { stdout: buildOutput } = await execAsync(
      `docker build --platform linux/amd64 --build-arg BUILDKIT_INLINE_CACHE=1 -t ${imageName} .`,
      { cwd: workDir, maxBuffer: 10 * 1024 * 1024 }
    );

    // Verify model files are in the built image
    try {
      const { stdout: imageFiles } = await execAsync(
        `docker run --rm ${imageName} ls -laR /app/user_model/`,
        { maxBuffer: 10 * 1024 * 1024 }
      );
      console.log(`[Deploy] ==================== IMAGE CONTENTS (/app/user_model/) ====================`);
      console.log(imageFiles);
      console.log(`[Deploy] ================================================================`);

      await this.updateStatus(
        endpointId,
        "BUILDING",
        `[${new Date().toISOString()}] Image built successfully. Verified model files in image:\n${imageFiles.substring(0, 500)}`
      );
    } catch (verifyError) {
      console.error(`[Deploy] Failed to verify image contents:`, verifyError);
      await this.updateStatus(
        endpointId,
        "BUILDING",
        `[${new Date().toISOString()}] Image built successfully (verification skipped)`
      );
    }

    // Push to registry
    await execAsync(
      `gcloud auth configure-docker ${this.region}-docker.pkg.dev --quiet`
    );

    await this.updateStatus(
      endpointId,
      "BUILDING",
      `[${new Date().toISOString()}] Pushing to Artifact Registry...`
    );

    await execAsync(`docker push ${imageName}`, {
      maxBuffer: 10 * 1024 * 1024,
    });

    await this.updateStatus(
      endpointId,
      "DEPLOYING",
      `[${new Date().toISOString()}] Image pushed successfully`
    );
  }

  private async deployToCloudRun(config: DeploymentConfig, workDir: string) {
    const { endpointId, apiKey } = config;
    const imageName = `${this.artifactRegistry}/${endpointId}:latest`;
    const serviceName = `model-${endpointId}`;

    await this.updateStatus(
      endpointId,
      "DEPLOYING",
      `[${new Date().toISOString()}] Deploying to Cloud Run...`
    );

    const deployCommand = `gcloud run deploy ${serviceName} \\
      --image ${imageName} \\
      --platform managed \\
      --region ${this.region} \\
      --allow-unauthenticated \\
      --memory 2Gi \\
      --cpu 2 \\
      --timeout 300 \\
      --max-instances 10 \\
      --set-env-vars API_KEY=${apiKey},GCS_BUCKET_NAME=${this.bucketName},DOWNLOAD_MODEL_ON_STARTUP=false \\
      --project ${this.projectId}`;

    await execAsync(deployCommand);

    // Get service URL using gcloud describe (more reliable than parsing deploy output)
    const { stdout: urlOutput } = await execAsync(
      `gcloud run services describe ${serviceName} --region ${this.region} --project ${this.projectId} --format="value(status.url)"`
    );

    const serviceUrl = urlOutput.trim();

    if (serviceUrl) {
      await prisma.endpoint.update({
        where: { id: endpointId },
        data: {
          serviceUrl,
          imageUri: imageName,
          deployedAt: new Date(),
        },
      });

      await this.updateStatus(
        endpointId,
        "DEPLOYED",
        `[${new Date().toISOString()}] Service deployed: ${serviceUrl}`
      );
    } else {
      throw new Error("Failed to retrieve service URL after deployment");
    }
  }
}
