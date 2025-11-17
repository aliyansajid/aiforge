/**
 * Security Validator
 *
 * Validates user-provided code and files for security issues
 * - Checks for malicious patterns
 * - Scans for potential secrets
 * - Validates Python code safety
 */

import fs from "fs";
import path from "path";

interface SecurityIssue {
  severity: "critical" | "high" | "medium" | "low";
  type: string;
  message: string;
  file?: string;
  line?: number;
}

interface ValidationResult {
  safe: boolean;
  issues: SecurityIssue[];
  warnings: string[];
}

export class SecurityValidator {
  // Dangerous Python patterns
  private static readonly DANGEROUS_PATTERNS = [
    {
      pattern: /\b(eval|exec|compile)\s*\(/g,
      severity: "critical" as const,
      type: "code_execution",
      message: "Dangerous function detected: eval/exec/compile can execute arbitrary code",
    },
    {
      pattern: /import\s+os\s*;.*os\.(system|popen|spawn)/g,
      severity: "critical" as const,
      type: "command_execution",
      message: "Command execution detected: os.system/popen/spawn",
    },
    {
      pattern: /subprocess\.(call|run|Popen)/g,
      severity: "high" as const,
      type: "subprocess",
      message: "Subprocess execution detected - review for safety",
    },
    {
      pattern: /__import__\s*\(/g,
      severity: "medium" as const,
      type: "dynamic_import",
      message: "Dynamic import detected - review for safety",
    },
    {
      pattern: /open\s*\([^)]*['"]w['"][^)]*\)/g,
      severity: "medium" as const,
      type: "file_write",
      message: "File write operation detected",
    },
    {
      pattern: /requests\.(get|post|put|delete)\s*\(/g,
      severity: "low" as const,
      type: "network_request",
      message: "Network request detected - ensure it's necessary",
    },
  ];

  // Sensitive file patterns
  private static readonly SENSITIVE_PATTERNS = [
    /\.env$/i,
    /credentials?\.json$/i,
    /\.key$/i,
    /\.pem$/i,
    /id_rsa/i,
    /\.pgp$/i,
    /secret/i,
    /password/i,
    /token/i,
    /api[_-]?key/i,
  ];

  // Suspicious content patterns
  private static readonly CONTENT_PATTERNS = [
    {
      pattern: /sk-[a-zA-Z0-9]{48}/g, // OpenAI API keys
      message: "Potential OpenAI API key detected",
    },
    {
      pattern: /ghp_[a-zA-Z0-9]{36}/g, // GitHub Personal Access Token
      message: "Potential GitHub token detected",
    },
    {
      pattern: /AIza[0-9A-Za-z_-]{35}/g, // Google API key
      message: "Potential Google API key detected",
    },
    {
      pattern: /AKIA[0-9A-Z]{16}/g, // AWS Access Key
      message: "Potential AWS access key detected",
    },
    {
      pattern: /-----BEGIN (RSA |DSA )?PRIVATE KEY-----/g,
      message: "Private key detected",
    },
  ];

  /**
   * Validate Python code for security issues
   */
  static async validatePythonCode(
    code: string,
    filename: string = "inference.py"
  ): Promise<ValidationResult> {
    const issues: SecurityIssue[] = [];
    const warnings: string[] = [];

    // Check for dangerous patterns
    for (const { pattern, severity, type, message } of this.DANGEROUS_PATTERNS) {
      const matches = code.matchAll(pattern);
      for (const match of matches) {
        // Get line number
        const lines = code.substring(0, match.index).split("\n");
        const lineNumber = lines.length;

        issues.push({
          severity,
          type,
          message,
          file: filename,
          line: lineNumber,
        });
      }
    }

    // Check for secrets in code
    for (const { pattern, message } of this.CONTENT_PATTERNS) {
      if (pattern.test(code)) {
        issues.push({
          severity: "critical",
          type: "secret_exposure",
          message,
          file: filename,
        });
      }
    }

    // Check code length (potential DoS)
    if (code.length > 1000000) {
      // 1MB
      issues.push({
        severity: "medium",
        type: "size_limit",
        message: "Code file is very large (>1MB) - may cause performance issues",
        file: filename,
      });
    }

    // Check for infinite loops (basic detection)
    if (/while\s+True:/g.test(code) && !/break/g.test(code)) {
      warnings.push(
        "Potential infinite loop detected (while True without break)"
      );
    }

    const safe = !issues.some((issue) =>
      ["critical", "high"].includes(issue.severity)
    );

    return { safe, issues, warnings };
  }

  /**
   * Validate entire directory for security issues
   */
  static async validateDirectory(dirPath: string): Promise<ValidationResult> {
    const issues: SecurityIssue[] = [];
    const warnings: string[] = [];

    await this.walkDirectory(dirPath, async (filePath) => {
      const relativePath = path.relative(dirPath, filePath);
      const basename = path.basename(filePath);

      // Check for sensitive files
      for (const pattern of this.SENSITIVE_PATTERNS) {
        if (pattern.test(basename)) {
          issues.push({
            severity: "high",
            type: "sensitive_file",
            message: `Potentially sensitive file: ${basename}`,
            file: relativePath,
          });
        }
      }

      // Validate Python files
      if (filePath.endsWith(".py")) {
        try {
          const code = await fs.promises.readFile(filePath, "utf-8");
          const result = await this.validatePythonCode(code, relativePath);

          issues.push(...result.issues);
          warnings.push(...result.warnings);
        } catch (error) {
          warnings.push(`Could not read file: ${relativePath}`);
        }
      }

      // Check file size
      const stats = await fs.promises.stat(filePath);
      if (stats.size > 100 * 1024 * 1024) {
        // 100MB
        warnings.push(
          `Large file detected: ${relativePath} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`
        );
      }
    });

    const safe = !issues.some((issue) =>
      ["critical", "high"].includes(issue.severity)
    );

    return { safe, issues, warnings };
  }

  /**
   * Walk directory recursively
   */
  private static async walkDirectory(
    dir: string,
    callback: (filePath: string) => Promise<void>
  ): Promise<void> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip common directories
      if (
        entry.isDirectory() &&
        [
          "__pycache__",
          ".git",
          "node_modules",
          "venv",
          ".venv",
          "__MACOSX",
        ].includes(entry.name)
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        await this.walkDirectory(fullPath, callback);
      } else {
        await callback(fullPath);
      }
    }
  }

  /**
   * Sanitize user input (for Git URLs, etc.)
   */
  static sanitizeInput(input: string): string {
    // Remove potential command injection characters
    return input
      .replace(/[;&|`$()]/g, "")
      .replace(/\.\./g, "")
      .trim();
  }

  /**
   * Validate file size
   */
  static validateFileSize(
    sizeInBytes: number,
    maxSizeMB: number = 500
  ): { valid: boolean; message?: string } {
    const maxBytes = maxSizeMB * 1024 * 1024;

    if (sizeInBytes > maxBytes) {
      return {
        valid: false,
        message: `File size (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${maxSizeMB}MB)`,
      };
    }

    return { valid: true };
  }

  /**
   * Generate security report
   */
  static generateReport(result: ValidationResult): string {
    let report = "=== Security Validation Report ===\n\n";

    if (result.safe) {
      report += "✓ No critical security issues detected\n\n";
    } else {
      report += "✗ SECURITY ISSUES DETECTED\n\n";
    }

    // Group issues by severity
    const critical = result.issues.filter((i) => i.severity === "critical");
    const high = result.issues.filter((i) => i.severity === "high");
    const medium = result.issues.filter((i) => i.severity === "medium");
    const low = result.issues.filter((i) => i.severity === "low");

    if (critical.length > 0) {
      report += `CRITICAL ISSUES (${critical.length}):\n`;
      critical.forEach((issue, i) => {
        report += `  ${i + 1}. ${issue.message}\n`;
        if (issue.file) report += `     File: ${issue.file}`;
        if (issue.line) report += `:${issue.line}`;
        report += "\n";
      });
      report += "\n";
    }

    if (high.length > 0) {
      report += `HIGH SEVERITY (${high.length}):\n`;
      high.forEach((issue, i) => {
        report += `  ${i + 1}. ${issue.message}\n`;
        if (issue.file) report += `     File: ${issue.file}\n`;
      });
      report += "\n";
    }

    if (medium.length > 0) {
      report += `MEDIUM SEVERITY (${medium.length}):\n`;
      medium.forEach((issue, i) => {
        report += `  ${i + 1}. ${issue.message}\n`;
      });
      report += "\n";
    }

    if (result.warnings.length > 0) {
      report += `WARNINGS (${result.warnings.length}):\n`;
      result.warnings.forEach((warning, i) => {
        report += `  ${i + 1}. ${warning}\n`;
      });
      report += "\n";
    }

    if (result.safe && result.issues.length === 0 && result.warnings.length === 0) {
      report += "No issues or warnings detected.\n";
    }

    return report;
  }
}
