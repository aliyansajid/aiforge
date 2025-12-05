/**
 * Google Cloud Platform Credentials Handler
 *
 * This utility handles GCP credentials for both local and Vercel deployments:
 * - Local: Uses GOOGLE_APPLICATION_CREDENTIALS file path
 * - Vercel: Uses GOOGLE_APPLICATION_CREDENTIALS_BASE64 environment variable
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

let credentialsPath: string | undefined;

/**
 * Get credentials for Google Cloud clients
 * Returns either credentials object or undefined to use default auth
 */
export function getGoogleCredentials(): { keyFilename?: string; credentials?: any } {
  // If we already have a credentials path, use it
  if (credentialsPath && existsSync(credentialsPath)) {
    return { keyFilename: credentialsPath };
  }

  // Check for file-based credentials (local development)
  const localCredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (localCredPath && existsSync(localCredPath)) {
    credentialsPath = localCredPath;
    return { keyFilename: credentialsPath };
  }

  // Check for base64-encoded credentials (Vercel)
  const base64Creds = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
  if (base64Creds) {
    try {
      // Decode base64 credentials
      const credentialsJson = Buffer.from(base64Creds, 'base64').toString('utf-8');
      const credentials = JSON.parse(credentialsJson);

      // Write to temp file (required by some GCP clients)
      const tempDir = tmpdir();
      const tempCredPath = join(tempDir, 'gcp-credentials.json');

      // Ensure temp directory exists
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
      }

      writeFileSync(tempCredPath, credentialsJson, { mode: 0o600 });
      credentialsPath = tempCredPath;

      console.log('[GCP] Using base64-encoded credentials from environment');
      return { keyFilename: credentialsPath };
    } catch (error) {
      console.error('[GCP] Error processing base64 credentials:', error);
    }
  }

  // No credentials found - will use default application credentials
  console.warn('[GCP] No credentials configured. Using default application credentials.');
  return {};
}

/**
 * Check if GCP credentials are available
 */
export function hasGoogleCredentials(): boolean {
  return !!(
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64
  );
}
