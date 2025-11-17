/**
 * Intelligent ZIP Extractor
 *
 * Handles all possible ZIP archive structures:
 * 1. MyModel.zip -> MyModel/ -> files (nested folder)
 * 2. MyModel.zip -> files (flat)
 * 3. MyModel.zip -> multiple folders
 * 4. Archive with __MACOSX, .DS_Store (macOS artifacts)
 *
 * Extracts contents to a clean, flat directory structure
 */

import fs from "fs";
import path from "path";
import { execAsync } from "./utils";

interface ExtractionResult {
  success: boolean;
  extractedPath: string;
  modelFiles: string[];
  requirementsPath?: string;
  inferencePath?: string;
  error?: string;
}

export class ZipExtractor {
  /**
   * Extract ZIP archive and normalize structure
   * Handles nested folders, removes macOS artifacts, finds model files
   */
  static async extract(
    zipPath: string,
    destDir: string
  ): Promise<ExtractionResult> {
    try {
      // Create temporary extraction directory
      const tempExtractDir = path.join(destDir, "_temp_extract");
      await fs.promises.mkdir(tempExtractDir, { recursive: true });

      // Extract ZIP file
      await execAsync(`unzip -q "${zipPath}" -d "${tempExtractDir}"`);

      // Analyze extracted contents
      const contents = await this.listDirectory(tempExtractDir);

      // Remove macOS artifacts
      const cleanedContents = this.removeMacOSArtifacts(contents);

      // Detect structure and normalize
      const normalizedPath = await this.normalizeStructure(
        tempExtractDir,
        destDir,
        cleanedContents
      );

      // Find important files
      const modelFiles = await this.findModelFiles(normalizedPath);
      const requirementsPath = await this.findFile(
        normalizedPath,
        "requirements.txt"
      );
      const inferencePath = await this.findFile(normalizedPath, "inference.py");

      // Clean up temp directory
      await fs.promises.rm(tempExtractDir, { recursive: true, force: true });

      // DEBUG: Verify files actually exist at normalizedPath
      console.log(`[ZipExtractor] Final extraction path: ${normalizedPath}`);
      const finalFiles = await fs.promises.readdir(normalizedPath);
      console.log(`[ZipExtractor] Files at extraction path:`, finalFiles);

      return {
        success: true,
        extractedPath: normalizedPath,
        modelFiles,
        requirementsPath,
        inferencePath,
      };
    } catch (error) {
      return {
        success: false,
        extractedPath: "",
        modelFiles: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * List all files and directories recursively
   */
  private static async listDirectory(dir: string): Promise<string[]> {
    const results: string[] = [];

    async function walk(currentPath: string) {
      const entries = await fs.promises.readdir(currentPath, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(dir, fullPath);

        results.push(relativePath);

        if (entry.isDirectory()) {
          await walk(fullPath);
        }
      }
    }

    await walk(dir);
    return results;
  }

  /**
   * Remove macOS artifacts and hidden files
   */
  private static removeMacOSArtifacts(files: string[]): string[] {
    return files.filter((file) => {
      const name = path.basename(file);
      return (
        !file.startsWith("__MACOSX") &&
        name !== ".DS_Store" &&
        !name.startsWith("._") &&
        name !== ".gitignore" &&
        name !== ".git"
      );
    });
  }

  /**
   * Normalize directory structure
   *
   * Case 1: ZIP contains single root folder with all content
   *   MyModel.zip -> MyModel/ -> model.pkl, requirements.txt
   *   Result: Extract MyModel/* to destDir
   *
   * Case 2: ZIP contains files at root level
   *   MyModel.zip -> model.pkl, requirements.txt
   *   Result: Use as-is
   *
   * Case 3: ZIP contains multiple folders
   *   MyModel.zip -> models/, utils/, requirements.txt
   *   Result: Use as-is
   */
  private static async normalizeStructure(
    tempDir: string,
    destDir: string,
    files: string[]
  ): Promise<string> {
    if (files.length === 0) {
      throw new Error("ZIP archive is empty");
    }

    // Get top-level entries (not nested)
    const topLevel = files.filter((f) => !f.includes(path.sep));
    const topLevelDirs = topLevel.filter((f) =>
      fs.statSync(path.join(tempDir, f)).isDirectory()
    );

    // Case 1: Single root folder - unwrap it
    if (topLevelDirs.length === 1 && topLevel.length === 1 && topLevelDirs[0]) {
      const singleDir = topLevelDirs[0];
      const sourcePath = path.join(tempDir, singleDir);

      console.log(
        `[ZipExtractor] Detected nested structure, unwrapping: ${singleDir}`
      );

      // Move contents of nested folder to destDir
      const finalPath = path.join(destDir, "model_package");
      await fs.promises.mkdir(finalPath, { recursive: true });

      const entries = await fs.promises.readdir(sourcePath);
      for (const entry of entries) {
        const src = path.join(sourcePath, entry);
        const dest = path.join(finalPath, entry);
        await fs.promises.rename(src, dest);
      }

      return finalPath;
    }

    // Case 2 & 3: Flat or multiple folders - use as-is
    console.log(`[ZipExtractor] Using flat structure`);

    const finalPath = path.join(destDir, "model_package");
    await fs.promises.mkdir(finalPath, { recursive: true });

    const entries = await fs.promises.readdir(tempDir);
    console.log(`[ZipExtractor] Moving ${entries.length} entries from ${tempDir} to ${finalPath}`);
    console.log(`[ZipExtractor] Entries to move:`, entries);

    for (const entry of entries) {
      const src = path.join(tempDir, entry);
      const dest = path.join(finalPath, entry);
      console.log(`[ZipExtractor] Moving: ${entry} from ${src} to ${dest}`);
      await fs.promises.rename(src, dest);
    }

    return finalPath;
  }

  /**
   * Find model files (*.pkl, *.pt, *.pth, *.h5, *.onnx, *.joblib)
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
      ".pb", // TensorFlow
      ".tflite",
      ".mlmodel", // CoreML
    ];

    const modelFiles: string[] = [];

    async function search(currentPath: string) {
      const entries = await fs.promises.readdir(currentPath, {
        withFileTypes: true,
      });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          // Skip common non-model directories
          if (
            !["__pycache__", ".git", "node_modules", "venv"].includes(
              entry.name
            )
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
   * Find a specific file by name (case-insensitive)
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

        if (entry.isDirectory() && entry.name !== "__pycache__") {
          const found = await search(fullPath);
          if (found) return found;
        }
      }

      return undefined;
    }

    return search(dir);
  }

  /**
   * Validate ZIP archive structure
   */
  static async validate(extractedPath: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for model files
    const modelFiles = await this.findModelFiles(extractedPath);
    if (modelFiles.length === 0) {
      errors.push("No model files found (.pkl, .pt, .h5, .onnx, etc.)");
    } else if (modelFiles.length > 5) {
      warnings.push(
        `Found ${modelFiles.length} model files - this may slow down deployment`
      );
    }

    // Check for requirements.txt
    const requirementsPath = await this.findFile(
      extractedPath,
      "requirements.txt"
    );
    if (!requirementsPath) {
      warnings.push(
        "No requirements.txt found - will use default dependencies"
      );
    }

    // Check total size
    const totalSize = await this.calculateDirectorySize(extractedPath);
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (totalSize > maxSize) {
      errors.push(
        `Archive too large: ${(totalSize / 1024 / 1024).toFixed(2)}MB (max 500MB)`
      );
    }

    // Check for suspicious files
    const suspiciousPatterns = [".env", "credentials", "secret", ".key"];
    const allFiles = await this.listDirectory(extractedPath);

    for (const file of allFiles) {
      const lowerFile = file.toLowerCase();
      for (const pattern of suspiciousPatterns) {
        if (lowerFile.includes(pattern)) {
          warnings.push(`Potentially sensitive file detected: ${file}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Calculate total directory size in bytes
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
}
