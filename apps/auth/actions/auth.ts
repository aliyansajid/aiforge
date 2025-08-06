"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@repo/db";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/lib/email/nodemailer";
import {
  emailSchema,
  otpSchema,
  personalInfoSchema,
  resetPasswordSchema,
} from "@/schemas/auth";

/**
 * Generates a 6-character alphanumeric OTP using uppercase letters and digits.
 */
function generateOtp() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const otpLength = 6;
  let otp = "";

  for (let i = 0; i < otpLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    otp += characters[randomIndex];
  }

  return otp;
}

/**
 * Handles OTP generation and sending for new user email verification.
 * - Validates input
 * - Prevents duplicate user registration
 * - Generates and stores a temporary OTP
 * - Sends OTP via email
 */
export async function sendOtp(formData: FormData) {
  const rawData = {
    email: formData.get("email") as string,
  };

  if (!rawData.email) {
    console.error("Send OTP error: Email is missing or null");
    return {
      error: "Email is required",
      success: false,
    };
  }

  const validationResult = emailSchema.safeParse(rawData);
  if (!validationResult.success) {
    console.error("Send OTP validation error:", validationResult.error.issues);
    return {
      error: validationResult.error.issues[0]?.message || "Invalid email",
      success: false,
    };
  }

  const { email } = validationResult.data;

  try {
    // Ensure this email isn't already registered
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        error: "An account with this email already exists",
        success: false,
      };
    }

    // Generate a new OTP and define expiration
    const otp = generateOtp();
    const otpWithDash = `${otp.slice(0, 3)}-${otp.slice(3)}`; // For readability
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins validity

    // Save the OTP in the DB (without dash)
    await prisma.verificationToken.create({
      data: {
        email,
        token: otp,
        expires,
      },
    });

    // Send the OTP via email
    const emailResult = await sendVerificationEmail(email, otpWithDash);

    if (!emailResult.success) {
      // Cleanup if email delivery fails
      await prisma.verificationToken.deleteMany({
        where: { email, token: otp },
      });

      return {
        error: "Failed to send OTP. Please try again.",
        success: false,
      };
    }

    return {
      message: "OTP sent to your email",
      success: true,
    };
  } catch (error) {
    console.error("Send OTP error:", error);
    return {
      error: "An unexpected error occurred. Please try again later.",
      success: false,
    };
  }
}

/**
 * Verifies the OTP provided by the user.
 * - Validates input and token existence
 * - Deletes token after successful verification (one-time use)
 */
export async function verifyOtp(formData: FormData) {
  const rawData = {
    email: formData.get("email") as string,
    otp: formData.get("otp") as string,
  };

  if (!rawData.email || !rawData.otp) {
    console.error("Verify OTP error: Email or OTP is missing");
    return {
      error: "Email and OTP are required",
      success: false,
    };
  }

  // Remove dash for DB comparison
  const normalizedOtp = rawData.otp.replace("-", "");

  const validationResult = otpSchema.safeParse({ otp: normalizedOtp });
  if (!validationResult.success) {
    console.error(
      "Verify OTP validation error:",
      validationResult.error.issues
    );
    return {
      error: validationResult.error.issues[0]?.message || "Invalid OTP",
      success: false,
    };
  }

  try {
    // Check for a valid token
    const token = await prisma.verificationToken.findFirst({
      where: {
        email: rawData.email,
        token: normalizedOtp,
        expires: { gte: new Date() },
      },
    });

    if (!token) {
      return {
        error: "Invalid or expired OTP",
        success: false,
      };
    }

    // Invalidate the OTP (one-time use)
    await prisma.verificationToken.delete({
      where: { id: token.id },
    });

    return {
      message: "OTP verified successfully",
      success: true,
    };
  } catch (error) {
    console.error("Verify OTP error:", error);
    return {
      error: "An unexpected error occurred. Please try again later.",
      success: false,
    };
  }
}

/**
 * Registers a new user after successful OTP verification.
 * - Validates all form fields
 * - Hashes password before storing
 * - Creates user record with default status and role
 */
export async function registerUser(formData: FormData) {
  const rawData = {
    email: formData.get("email") as string,
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    password: formData.get("password") as string,
  };

  // Check for missing values before parsing
  if (
    !rawData.email ||
    !rawData.firstName ||
    !rawData.lastName ||
    !rawData.password
  ) {
    console.error("Register user error: All fields are required");
    return {
      error: "All fields are required",
      success: false,
    };
  }

  // Validate email format
  const emailValidation = emailSchema.safeParse({ email: rawData.email });
  if (!emailValidation.success) {
    console.error(
      "Register user email validation error:",
      emailValidation.error.issues
    );
    return {
      error: emailValidation.error.issues[0]?.message || "Invalid email",
      success: false,
    };
  }

  // Validate names and password
  const personalValidation = personalInfoSchema.safeParse({
    firstName: rawData.firstName,
    lastName: rawData.lastName,
    password: rawData.password,
  });
  if (!personalValidation.success) {
    console.error(
      "Register user personal info validation error:",
      personalValidation.error.issues
    );
    return {
      error: personalValidation.error.issues[0]?.message || "Invalid input",
      success: false,
    };
  }

  const { email } = emailValidation.data;
  const { firstName, lastName, password } = personalValidation.data;

  try {
    // Final safeguard against duplicate registration
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        error: "An account with this email already exists",
        success: false,
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with default role and active status
    await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        password: hashedPassword,
        emailVerified: new Date(),
        role: "CONSUMER",
        status: "ACTIVE",
      },
    });

    return {
      message: "Account created successfully",
      success: true,
    };
  } catch (error) {
    console.error("Registration error:", error);
    return {
      error: "An unexpected error occurred. Please try again later.",
      success: false,
    };
  }
}

/**
 * Sends a password reset OTP to the user’s email if the account exists.
 * - Always returns a generic success message to prevent email enumeration
 */
export async function sendPasswordResetOtp(formData: FormData) {
  const rawData = {
    email: formData.get("email") as string,
  };

  if (!rawData.email) {
    console.error("Send OTP error: Email is missing or null");
    return {
      error: "Email is required",
      success: false,
    };
  }

  const validationResult = emailSchema.safeParse(rawData);
  if (!validationResult.success) {
    console.error("Send OTP validation error:", validationResult.error.issues);
    return {
      error: validationResult.error.issues[0]?.message || "Invalid email",
      success: false,
    };
  }

  const { email } = validationResult.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Generate OTP and save to DB
      const otp = generateOtp();
      const otpWithDash = `${otp.slice(0, 3)}-${otp.slice(3)}`;
      const expires = new Date(Date.now() + 15 * 60 * 1000);

      await prisma.verificationToken.create({
        data: {
          email,
          token: otp,
          expires,
        },
      });

      const emailResult = await sendPasswordResetEmail(email, otpWithDash);

      if (!emailResult.success) {
        await prisma.verificationToken.deleteMany({
          where: { email, token: otp },
        });

        return {
          error: "Failed to send OTP. Please try again.",
          success: false,
        };
      }
    }

    // Prevents leaking whether an account exists or not
    return {
      message:
        "If an account exists with this email, you will receive reset instructions",
      success: true,
    };
  } catch (error) {
    console.error("Send OTP error:", error);
    return {
      error: "An unexpected error occurred. Please try again later.",
      success: false,
    };
  }
}

/**
 * Resets the user’s password after OTP verification.
 * - Validates email and password
 * - Updates the password if user exists
 */
export async function resetPassword(formData: FormData) {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  if (!rawData.email || !rawData.password) {
    console.error("Reset password error: Email or password is missing");
    return {
      error: "Email and password are required",
      success: false,
    };
  }

  const emailValidation = emailSchema.safeParse({ email: rawData.email });
  if (!emailValidation.success) {
    console.error(
      "Reset password email validation error:",
      emailValidation.error.issues
    );
    return {
      error: emailValidation.error.issues[0]?.message || "Invalid email",
      success: false,
    };
  }

  const passwordValidation = resetPasswordSchema.safeParse({
    password: rawData.password,
  });
  if (!passwordValidation.success) {
    console.error(
      "Reset password validation error:",
      passwordValidation.error.issues
    );
    return {
      error: passwordValidation.error.issues[0]?.message || "Invalid password",
      success: false,
    };
  }

  const { email } = emailValidation.data;
  const { password } = passwordValidation.data;

  try {
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return { error: "No account found with this email", success: false };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    return { message: "Password updated successfully", success: true };
  } catch (error) {
    console.error("Reset password error:", error);
    return {
      error: "An unexpected error occurred. Please try again later.",
      success: false,
    };
  }
}
