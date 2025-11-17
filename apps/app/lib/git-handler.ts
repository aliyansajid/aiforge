/**
 * GitHub Repository Handler
 *
 * Handles cloning and processing of GitHub/GitLab repositories
 * Supports:
 * - Public repositories
 * - Private repositories (with access token)
 * - Specific branches and commits
 * - Repository validation
 */

import fs from "fs";
import path from "path";
import { execAsync } from "./utils";

interface GitCloneResult {
  success: boolean;
  clonedPath: string;
  branch: string;
  commitSha: string;
  modelFiles: string[];
  requirementsPath?: string;
  inferencePath?: string;
  error?: string;
}

interface GitRepoInfo {
  url: string;
  branch?: string;
  commit?: string;
  accessToken?: string;
}

export class GitHandler {
  /**
   * Clone repository and prepare for deployment
   */
  static async clone(
    repoInfo: GitRepoInfo,
    destDir: string
  ): Promise<GitCloneResult> {
    try {
      const cloneDir = path.join(destDir, "model_package");
      await fs.promises.mkdir(cloneDir, { recursive: true });

      // Parse repository URL
      const { repoUrl, isPrivate } = this.parseRepoUrl(
        repoInfo.url,
        repoInfo.accessToken
      );

      console.log(`[GitHandler] Cloning repository: ${repoInfo.url}`);
      console.log(`[GitHandler] Branch: ${repoInfo.branch || "default"}`);

      // Clone with depth=1 for faster cloning (shallow clone)
      const branchFlag = repoInfo.branch ? `-b ${repoInfo.branch}` : "";
      const cloneCommand = `git clone --depth 1 ${branchFlag} "${repoUrl}" "${cloneDir}"`;

      await execAsync(cloneCommand, {
        timeout: 300000, // 5 minutes timeout
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: "0", // Disable interactive prompts
        },
      });

      // If specific commit requested, fetch and checkout
      if (repoInfo.commit) {
        await execAsync(`git fetch --depth 1 origin ${repoInfo.commit}`, {
          cwd: cloneDir,
        });
        await execAsync(`git checkout ${repoInfo.commit}`, {
          cwd: cloneDir,
        });
      }

      // Get current commit SHA
      const { stdout: commitSha } = await execAsync("git rev-parse HEAD", {
        cwd: cloneDir,
      });

      // Get current branch
      const { stdout: branch } = await execAsync(
        "git rev-parse --abbrev-ref HEAD",
        { cwd: cloneDir }
      );

      // Remove .git directory to save space
      await fs.promises.rm(path.join(cloneDir, ".git"), {
        recursive: true,
        force: true,
      });

      // Find important files
      const modelFiles = await this.findModelFiles(cloneDir);
      const requirementsPath = await this.findFile(
        cloneDir,
        "requirements.txt"
      );
      const inferencePath = await this.findFile(cloneDir, "inference.py");

      return {
        success: true,
        clonedPath: cloneDir,
        branch: branch.trim(),
        commitSha: commitSha.trim(),
        modelFiles,
        requirementsPath,
        inferencePath,
      };
    } catch (error) {
      return {
        success: false,
        clonedPath: "",
        branch: "",
        commitSha: "",
        modelFiles: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Parse repository URL and inject access token if needed
   */
  private static parseRepoUrl(
    url: string,
    accessToken?: string
  ): { repoUrl: string; isPrivate: boolean } {
    // Check if it's a GitHub/GitLab URL
    const githubRegex =
      /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+?)(\.git)?$/;
    const gitlabRegex =
      /^https?:\/\/gitlab\.com\/([^\/]+)\/([^\/]+?)(\.git)?$/;

    let repoUrl = url;
    let isPrivate = false;

    // If access token provided, inject it into URL
    if (accessToken) {
      isPrivate = true;

      if (githubRegex.test(url)) {
        // GitHub: https://token@github.com/user/repo.git
        repoUrl = url.replace("https://", `https://${accessToken}@`);
      } else if (gitlabRegex.test(url)) {
        // GitLab: https://oauth2:token@gitlab.com/user/repo.git
        repoUrl = url.replace("https://", `https://oauth2:${accessToken}@`);
      }
    }

    // Ensure .git suffix
    if (!repoUrl.endsWith(".git")) {
      repoUrl += ".git";
    }

    return { repoUrl, isPrivate };
  }

  /**
   * Validate repository URL format
   */
  static validateRepoUrl(url: string): {
    valid: boolean;
    error?: string;
    provider?: "github" | "gitlab" | "other";
  } {
    if (!url) {
      return { valid: false, error: "Repository URL is required" };
    }

    // Check if it's a valid URL
    try {
      new URL(url);
    } catch {
      return { valid: false, error: "Invalid URL format" };
    }

    // Check for supported providers
    if (url.includes("github.com")) {
      const githubRegex =
        /^https?:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/;
      if (!githubRegex.test(url)) {
        return {
          valid: false,
          error: "Invalid GitHub URL format. Expected: https://github.com/user/repo",
        };
      }
      return { valid: true, provider: "github" };
    }

    if (url.includes("gitlab.com")) {
      const gitlabRegex =
        /^https?:\/\/gitlab\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+/;
      if (!gitlabRegex.test(url)) {
        return {
          valid: false,
          error: "Invalid GitLab URL format. Expected: https://gitlab.com/user/repo",
        };
      }
      return { valid: true, provider: "gitlab" };
    }

    // Other Git providers
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return { valid: true, provider: "other" };
    }

    return {
      valid: false,
      error: "Unsupported Git provider. Please use GitHub, GitLab, or another HTTPS Git URL",
    };
  }

  /**
   * Find model files in repository
   */
  private static async findModelFiles(dir: string): Promise<string[]> {
    const modelExtensions = [
      ".pkl",
      ".pickle",
      ".pt",
      ".pth",
      ".h5",
      ".keras",
      ".onnx",
      ".joblib",
      ".pb",
      ".tflite",
    ];

    const modelFiles: string[] = [];

    async function search(currentPath: string) {
      const entries = await fs.promises.readdir(currentPath, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          if (
            ![
              "__pycache__",
              ".git",
              "node_modules",
              "venv",
              ".venv",
              "env",
            ].includes(entry.name)
          ) {
            await search(fullPath);
          }
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (modelExtensions.includes(ext)) {
            modelFiles.push(path.relative(dir, fullPath));
          }
        }
      }
    }

    await search(dir);
    return modelFiles;
  }

  /**
   * Find a specific file by name
   */
  private static async findFile(
    dir: string,
    filename: string
  ): Promise<string | undefined> {
    const lowerFilename = filename.toLowerCase();

    async function search(currentPath: string): Promise<string | undefined> {
      const entries = await fs.promises.readdir(currentPath, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isFile() && entry.name.toLowerCase() === lowerFilename) {
          return fullPath;
        }

        if (
          entry.isDirectory() &&
          !["__pycache__", ".git", "node_modules", "venv"].includes(entry.name)
        ) {
          const found = await search(fullPath);
          if (found) return found;
        }
      }

      return undefined;
    }

    return search(dir);
  }

  /**
   * Validate repository structure for model deployment
   */
  static async validate(clonedPath: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for model files
    const modelFiles = await this.findModelFiles(clonedPath);
    if (modelFiles.length === 0) {
      errors.push("No model files found in repository");
    }

    // Check for requirements.txt or setup.py
    const requirementsPath = await this.findFile(
      clonedPath,
      "requirements.txt"
    );
    const setupPath = await this.findFile(clonedPath, "setup.py");
    const pyprojectPath = await this.findFile(clonedPath, "pyproject.toml");

    if (!requirementsPath && !setupPath && !pyprojectPath) {
      warnings.push(
        "No dependency file found (requirements.txt, setup.py, or pyproject.toml)"
      );
    }

    // Check for README
    const readmePath = await this.findFile(clonedPath, "README.md");
    if (!readmePath) {
      warnings.push("No README.md found - consider adding documentation");
    }

    // Check repository size
    const repoSize = await this.calculateDirectorySize(clonedPath);
    const maxSize = 1024 * 1024 * 1024; // 1GB
    if (repoSize > maxSize) {
      errors.push(
        `Repository too large: ${(repoSize / 1024 / 1024).toFixed(2)}MB (max 1GB)`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Calculate directory size
   */
  private static async calculateDirectorySize(dir: string): Promise<number> {
    let totalSize = 0;

    async function walk(currentPath: string) {
      const entries = await fs.promises.readdir(currentPath, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else {
          const stats = await fs.promises.stat(fullPath);
          totalSize += stats.size;
        }
      }
    }

    await walk(dir);
    return totalSize;
  }

  /**
   * Extract owner and repo name from URL
   */
  static parseRepoName(url: string): {
    owner: string;
    repo: string;
  } | null {
    const githubRegex =
      /github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/;
    const gitlabRegex =
      /gitlab\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/;

    const githubMatch = url.match(githubRegex);
    if (githubMatch && githubMatch[1] && githubMatch[2]) {
      return {
        owner: githubMatch[1],
        repo: githubMatch[2].replace(/\.git$/, ""),
      };
    }

    const gitlabMatch = url.match(gitlabRegex);
    if (gitlabMatch && gitlabMatch[1] && gitlabMatch[2]) {
      return {
        owner: gitlabMatch[1],
        repo: gitlabMatch[2].replace(/\.git$/, ""),
      };
    }

    return null;
  }
}
