import { z } from "zod";

const nameRegex = /^[A-Za-z]+$/;

export const loginSchema = z.object({
  email: z.email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const emailSchema = z.object({
  email: z.email("Please enter a valid email"),
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
    .max(50, "First name cannot exceed 50 characters")
    .regex(nameRegex, "First name can only contain alphabets"),
  lastName: z
    .string()
    .min(3, "Last name must be at least 3 characters")
    .max(50, "Last name cannot exceed 50 characters")
    .regex(nameRegex, "Last name can only contain alphabets"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Old password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
});

export const addMFADeviceSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(50, "Name cannot exceed 50 characters"),
  otp: z.string().regex(/^\d{6}$/, "OTP must be a 6-digit number"),
  secret: z.string().min(1, "Secret is required"),
});

export const verifyOtpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "OTP must be a 6-digit number"),
});

export const verifyRecoveryCodeSchema = z.object({
  recoveryCode: z
    .string()
    .regex(/^\d{6}$/, "Recovery code must be a 6-digit number"),
});
