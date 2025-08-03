import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Separate schema just for MFA code input
export const mfaCodeSchema = z.object({
  mfaCode: z
    .string()
    .length(6, "MFA code must be 6 digits")
    .regex(/^\d{6}$/, "MFA code must contain only digits"),
});

// Separate schema just for backup code input
export const backupCodeInputSchema = z.object({
  backupCode: z.string().min(1, "Backup code is required"),
});

// These are for server-side validation (keep existing)
export const mfaVerificationSchema = z.object({
  email: z.email(),
  password: z.string(),
  mfaCode: z
    .string()
    .length(6, "MFA code must be 6 digits")
    .regex(/^\d{6}$/, "MFA code must contain only digits"),
  isBackupCode: z.boolean().optional(),
});

export const backupCodeSchema = z.object({
  email: z.email(),
  password: z.string(),
  backupCode: z.string().min(1, "Backup code is required"),
});

export const emailSchema = z.object({
  email: z.email("Please enter a valid email address"),
});

export const otpSchema = z.object({
  otp: z
    .string()
    .length(6, "OTP must be 6 characters")
    .regex(
      /^[A-Z0-9]+$/,
      "OTP must contain only uppercase letters and numbers"
    ),
});

export const personalInfoSchema = z.object({
  firstName: z
    .string()
    .min(3, "First name must be at least 3 characters")
    .max(50, "First name cannot exceed 50 characters"),
  lastName: z
    .string()
    .min(3, "Last name must be at least 3 characters")
    .max(50, "Last name cannot exceed 50 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
});
