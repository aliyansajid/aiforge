/**
 * Enhanced ZIP Extractor with comprehensive validation
 *
 * Handles all possible ZIP archive structures and validates model_config.json
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
  configPath?: string;
  error?: string;
}

export interface ModelConfig {
  name: string;
  version: string;
  framework: "sklearn" | "pytorch" | "tensorflow" | "onnx" | "custom";
  entry_point: string;
  entry_point_type?: "module" | "class";
  class_name?: string;
  load: {
    name: string;
    args: string[];
  };
  predict: {
    name: string;
    args: string[];
  };
  model_file: string;
  auxiliary_files?: string[];
  description?: string;
  author?: string;
  tags?: string[];
}

export class ZipExtractorEnhanced {
  /**
   * Extract ZIP archive and normalize structure
   */
  static async extract(zipPath: string, destDir: string): Promise<ExtractionResult> {
    try {
      const tempExtractDir = path.join(destDir, "_temp_extract");
      await fs.promises.mkdir(tempExtractDir, { recursive: true });

      console.log(`[ZipExtractor] Extracting ${zipPath} to ${tempExtractDir}`);
      await execAsync(`unzip -q "${zipPath}" -d "${tempExtractDir}"`);

      const contents = await this.listDirectory(tempExtractDir);
      const cleanedContents = this.removeMacOSArtifacts(contents);
      const normalizedPath = await this.normalizeStructure(tempExtractDir, destDir, cleanedContents);

      // Find important files
      const configPath = await this.findFile(normalizedPath, "model_config.json");
      const modelFiles = await this.findModelFiles(normalizedPath);
      const requirementsPath = await this.findFile(normalizedPath, "requirements.txt");
      const inferencePath = configPath
        ? await this.getInferencePathFromConfig(normalizedPath, configPath)
        : await this.findInferenceFile(normalizedPath);

      await fs.promises.rm(tempExtractDir, { recursive: true, force: true });

      console.log(`[ZipExtractor] Extraction complete:`);
      console.log(`  - Config: ${configPath ? "✓" : "✗"}`);
      console.log(`  - Model files: ${modelFiles.length}`);
      console.log(`  - Requirements: ${requirementsPath ? "✓" : "✗"}`);
      console.log(`  - Inference: ${inferencePath ? "✓" : "✗"}`);

      return {
        success: true,
        extractedPath: normalizedPath,
        modelFiles,
        requirementsPath,
        inferencePath,
        configPath,
      };
    } catch (error) {
      console.error(`[ZipExtractor] Extraction failed:`, error);
      return {
        success: false,
        extractedPath: "",
        modelFiles: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Comprehensive validation with model_config.json enforcement
   */
  static async validate(extractedPath: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log(`[ZipExtractor] Validating ${extractedPath}...`);

    // CRITICAL: Check for model_config.json
    const configPath = path.join(extractedPath, "model_config.json");
    if (!(await this.fileExists(configPath))) {
      errors.push(
        "❌ model_config.json not found at ZIP root.\n\n" +
          "This file is REQUIRED for ZIP deployments. It tells us:\n" +
          "  • Which file is your entry point (e.g., inference.py)\n" +
          "  • Which file is your model (e.g., model.pkl)\n" +
          "  • How to load and use your model\n\n" +
          "Example structure:\n" +
          "  my-model.zip/\n" +
          "  ├── model_config.json  ← Required!\n" +
          "  ├── inference.py\n" +
          "  ├── model.pkl\n" +
          "  └── requirements.txt\n\n" +
          "Use the template generator in the form."
      );
      return { valid: false, errors, warnings };
    }

    // Validate model_config.json structure
    try {
      const configContent = await fs.promises.readFile(configPath, "utf-8");
      const config: ModelConfig = JSON.parse(configContent);

      // Required fields validation
      const requiredFields = ["entry_point", "load", "predict", "model_file", "framework"];
      const missingFields = requiredFields.filter((field) => !config[field as keyof ModelConfig]);

      if (missingFields.length > 0) {
        errors.push(
          `model_config.json missing required fields: ${missingFields.join(", ")}\n\n` +
            "Required:\n" +
            "  • entry_point: 'inference.py'\n" +
            "  • load: {name: 'load_model', args: ['model_path']}\n" +
            "  • predict: {name: 'predict', args: ['data']}\n" +
            "  • model_file: 'model.pkl'\n" +
            "  • framework: 'sklearn'|'pytorch'|'tensorflow'|'onnx'|'custom'"
        );
      }

      // Validate load configuration
      if (config.load) {
        if (!config.load.name) {
          errors.push("model_config.json: 'load.name' is required (function name)");
        }
        if (!Array.isArray(config.load.args)) {
          errors.push("model_config.json: 'load.args' must be an array");
        } else {
          const validLoadArgs = ["model_path", "model_dir"];
          const invalidArgs = config.load.args.filter((arg) => !validLoadArgs.includes(arg));
          if (invalidArgs.length > 0) {
            errors.push(
              `Invalid load args: ${invalidArgs.join(", ")}\nValid: ${validLoadArgs.join(", ")}`
            );
          }
        }
      }

      // Validate predict configuration
      if (config.predict) {
        if (!config.predict.name) {
          errors.push("model_config.json: 'predict.name' is required (function name)");
        }
        if (!Array.isArray(config.predict.args)) {
          errors.push("model_config.json: 'predict.args' must be an array");
        } else {
          const validPredictArgs = ["input_data", "data", "model"];
          const invalidArgs = config.predict.args.filter((arg) => !validPredictArgs.includes(arg));
          if (invalidArgs.length > 0) {
            errors.push(
              `Invalid predict args: ${invalidArgs.join(", ")}\nValid: ${validPredictArgs.join(", ")}`
            );
          }
        }
      }

      // Validate framework
      const validFrameworks = ["sklearn", "pytorch", "tensorflow", "onnx", "custom"];
      if (config.framework && !validFrameworks.includes(config.framework)) {
        errors.push(
          `Invalid framework '${config.framework}'\nValid: ${validFrameworks.join(", ")}`
        );
      }

      // Validate entry point file exists
      if (config.entry_point) {
        const entryPointPath = path.join(extractedPath, config.entry_point);
        if (!(await this.fileExists(entryPointPath))) {
          errors.push(
            `Entry point '${config.entry_point}' not found in ZIP.\n` +
              "Verify the path in model_config.json matches your file."
          );
        } else if (!config.entry_point.endsWith(".py")) {
          warnings.push(`Entry point '${config.entry_point}' doesn't end with .py`);
        }
      }

      // Validate model file exists
      if (config.model_file) {
        const modelFilePath = path.join(extractedPath, config.model_file);
        if (!(await this.fileExists(modelFilePath))) {
          errors.push(
            `Model file '${config.model_file}' not found in ZIP.\n` +
              "Verify the path in model_config.json matches your model file."
          );
        }
      }

      // Validate auxiliary files
      if (config.auxiliary_files && Array.isArray(config.auxiliary_files)) {
        for (const auxFile of config.auxiliary_files) {
          const auxPath = path.join(extractedPath, auxFile);
          if (!(await this.fileExists(auxPath))) {
            warnings.push(
              `Auxiliary file '${auxFile}' not found. May cause runtime errors.`
            );
          }
        }
      }

      // Validate class-based entry points
      if (config.entry_point_type === "class" && !config.class_name) {
        errors.push("'class_name' required when entry_point_type is 'class'");
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        errors.push(`Invalid JSON in model_config.json: ${e.message}`);
      } else {
        errors.push(`Failed to parse model_config.json: ${e instanceof Error ? e.message : String(e)}`);
      }
      return { valid: false, errors, warnings };
    }

    // Check for requirements.txt
    const requirementsPath = await this.findFile(extractedPath, "requirements.txt");
    if (!requirementsPath) {
      warnings.push(
        "⚠️  No requirements.txt found (STRONGLY RECOMMENDED).\n" +
          "Include exact versions from training:\n" +
          "  scikit-learn==1.3.2\n" +
          "  numpy==1.24.3"
      );
    }

    // Additional validations
    await this.checkCommonMistakes(extractedPath, warnings);
    await this.validateFileSizes(extractedPath, errors, warnings);

    console.log(`[ZipExtractor] Validation: ${errors.length} errors, ${warnings.length} warnings`);

    return { valid: errors.length === 0, errors, warnings };
  }

  // Helper methods from original implementation
  private static async listDirectory(dir: string): Promise<string[]> {
    const results: string[] = [];
    async function walk(currentPath: string) {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        results.push(path.relative(dir, fullPath));
        if (entry.isDirectory()) await walk(fullPath);
      }
    }
    await walk(dir);
    return results;
  }

  private static removeMacOSArtifacts(files: string[]): string[] {
    return files.filter(
      (file) =>
        !file.startsWith("__MACOSX") &&
        path.basename(file) !== ".DS_Store" &&
        !path.basename(file).startsWith("._")
    );
  }

  private static async normalizeStructure(
    tempDir: string,
    destDir: string,
    files: string[]
  ): Promise<string> {
    if (files.length === 0) throw new Error("ZIP archive is empty");

    const topLevel = files.filter((f) => !f.includes(path.sep));
    const topLevelDirs = topLevel.filter((f) =>
      fs.statSync(path.join(tempDir, f)).isDirectory()
    );

    // Unwrap single root folder
    if (topLevelDirs.length === 1 && topLevel.length === 1) {
      const singleDir = topLevelDirs[0];
      if (!singleDir) {
        throw new Error("Unexpected error: singleDir is undefined");
      }
      const sourcePath = path.join(tempDir, singleDir);
      const finalPath = path.join(destDir, "model_package");
      await fs.promises.mkdir(finalPath, { recursive: true });

      const entries = await fs.promises.readdir(sourcePath);
      for (const entry of entries) {
        await fs.promises.rename(path.join(sourcePath, entry), path.join(finalPath, entry));
      }
      return finalPath;
    }

    // Use flat structure
    const finalPath = path.join(destDir, "model_package");
    await fs.promises.mkdir(finalPath, { recursive: true });

    const entries = await fs.promises.readdir(tempDir);
    for (const entry of entries) {
      await fs.promises.rename(path.join(tempDir, entry), path.join(finalPath, entry));
    }
    return finalPath;
  }

  private static async findModelFiles(dir: string): Promise<string[]> {
    const extensions = [".pkl", ".pt", ".pth", ".h5", ".keras", ".onnx", ".joblib"];
    const modelFiles: string[] = [];

    async function search(currentPath: string) {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        if (entry.isDirectory() && !["__pycache__", ".git", "venv"].includes(entry.name)) {
          await search(fullPath);
        } else if (extensions.includes(path.extname(entry.name).toLowerCase())) {
          modelFiles.push(path.relative(dir, fullPath));
        }
      }
    }

    await search(dir);
    return modelFiles;
  }

  private static async findFile(dir: string, filename: string): Promise<string | undefined> {
    const lowerFilename = filename.toLowerCase();
    async function search(currentPath: string): Promise<string | undefined> {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
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

  private static async findInferenceFile(dir: string): Promise<string | undefined> {
    const names = ["inference.py", "predict.py", "model.py", "handler.py"];
    for (const name of names) {
      const found = await this.findFile(dir, name);
      if (found) return found;
    }
    return undefined;
  }

  private static async getInferencePathFromConfig(
    extractedPath: string,
    configPath: string
  ): Promise<string | undefined> {
    try {
      const configContent = await fs.promises.readFile(configPath, "utf-8");
      const config: ModelConfig = JSON.parse(configContent);
      if (config.entry_point) {
        const fullPath = path.join(extractedPath, config.entry_point);
        if (await this.fileExists(fullPath)) return fullPath;
      }
    } catch (e) {
      console.error(`Failed to get inference path from config:`, e);
    }
    return undefined;
  }

  private static async checkCommonMistakes(extractedPath: string, warnings: string[]): Promise<void> {
    // Check for Mac artifacts
    if (await this.fileExists(path.join(extractedPath, "__MACOSX"))) {
      warnings.push("__MACOSX directory found (adds unnecessary bloat)");
    }

    // Check for git directory
    if (await this.fileExists(path.join(extractedPath, ".git"))) {
      warnings.push(".git directory found (not needed, adds size)");
    }

    // Check for virtual environments
    for (const dir of ["venv", "env", ".venv", "ENV"]) {
      if (await this.fileExists(path.join(extractedPath, dir))) {
        warnings.push(`${dir}/ found - virtual environments should NOT be included`);
      }
    }

    // Check for small model files (might be corrupted)
    const modelFiles = await this.findModelFiles(extractedPath);
    for (const modelFile of modelFiles) {
      const stats = await fs.promises.stat(path.join(extractedPath, modelFile));
      if (stats.size < 1024) {
        warnings.push(`${modelFile} is very small (${stats.size}B) - verify it's valid`);
      }
    }
  }

  private static async validateFileSizes(
    extractedPath: string,
    errors: string[],
    warnings: string[]
  ): Promise<void> {
    const maxTotal = 5 * 1024 * 1024 * 1024; // 5GB
    let totalSize = 0;

    async function walk(dir: string) {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else {
          const stats = await fs.promises.stat(fullPath);
          totalSize += stats.size;
          if (stats.size > 1024 * 1024 * 1024) {
            // 1GB
            warnings.push(`${path.relative(extractedPath, fullPath)} is very large (${(stats.size / 1024 / 1024 / 1024).toFixed(2)}GB)`);
          }
        }
      }
    }

    await walk(extractedPath);

    if (totalSize > maxTotal) {
      errors.push(`Total size (${(totalSize / 1024 / 1024 / 1024).toFixed(2)}GB) exceeds 5GB limit`);
    }
  }

  private static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private static async calculateDirectorySize(dir: string): Promise<number> {
    let totalSize = 0;
    async function walk(currentPath: string) {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
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
   * Generate model_config.json template
   */
  static generateTemplate(options: {
    framework: "sklearn" | "pytorch" | "tensorflow" | "onnx" | "custom";
    modelName?: string;
    modelFile?: string;
    hasAuxiliaryFiles?: boolean;
  }): string {
    const defaults: Record<string, string> = {
      sklearn: "model.pkl",
      pytorch: "model.pt",
      tensorflow: "model.h5",
      onnx: "model.onnx",
      custom: "model.pkl",
    };

    const config: ModelConfig = {
      name: options.modelName || "My Model",
      version: "1.0.0",
      framework: options.framework,
      entry_point: "inference.py",
      load: {
        name: "load_model",
        args: ["model_path"],
      },
      predict: {
        name: "predict",
        args: ["data"],
      },
      model_file: options.modelFile || defaults[options.framework] || "model.pkl",
      description: "Model description here",
      author: "Your Name",
      tags: ["classification"],
    };

    if (options.hasAuxiliaryFiles) {
      config.auxiliary_files = ["vectorizer.pkl", "encoder.pkl"];
    }

    return JSON.stringify(config, null, 2);
  }
}
