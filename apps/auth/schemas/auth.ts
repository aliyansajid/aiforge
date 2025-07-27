import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
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
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});
