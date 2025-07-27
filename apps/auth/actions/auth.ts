"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@repo/db";
import { sendVerificationEmail } from "@/lib/email/nodemailer";
import { emailSchema, otpSchema, personalInfoSchema } from "@/schemas/auth";

/**
 * Generates a 6-character alphanumeric OTP
 * @returns {string} Random OTP (e.g., "A1B2C3")
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
 * Sends an OTP to the user's email for account verification
 * Checks for existing users and creates a verification token
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
    await prisma.$connect();

    // Prevent duplicate registrations
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return {
        error: "An account with this email already exists",
        success: false,
      };
    }

    // Generate OTP and format for display
    const otp = generateOtp(); // e.g., "A1B2C3"
    const otpWithDash = `${otp.slice(0, 3)}-${otp.slice(3)}`; // e.g., "A1B-2C3"
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store plain OTP in database for comparison
    await prisma.verificationToken.create({
      data: {
        email,
        token: otp, // Store without dash
        expires,
      },
    });

    // Send formatted OTP via email
    const emailResult = await sendVerificationEmail(email, otpWithDash);

    if (!emailResult.success) {
      // Clean up verification token if email fails
      await prisma.verificationToken.deleteMany({
        where: { email, token: otp },
      });

      return {
        error: "Failed to send OTP email. Please try again later.",
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
      error: "Failed to send OTP. Please try again later.",
      success: false,
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Verifies the OTP entered by the user
 * Marks the token as used to prevent replay attacks
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

  // Normalize OTP input
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
    await prisma.$connect();

    // Find valid, unused OTP token
    const token = await prisma.verificationToken.findFirst({
      where: {
        email: rawData.email,
        token: normalizedOtp,
        expires: { gte: new Date() },
        used: false,
      },
    });

    if (!token) {
      return {
        error: "Invalid or expired OTP",
        success: false,
      };
    }

    // Mark token as used to prevent reuse
    await prisma.verificationToken.update({
      where: { id: token.id },
      data: { used: true },
    });

    return {
      message: "OTP verified successfully",
      success: true,
    };
  } catch (error) {
    console.error("Verify OTP error:", error);
    return {
      error: "Failed to verify OTP. Please try again later.",
      success: false,
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Creates a new user account after email verification
 * Validates all input fields and creates user with hashed password
 */
export async function registerUser(formData: FormData) {
  const rawData = {
    email: formData.get("email") as string,
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    password: formData.get("password") as string,
  };

  // Ensure all required fields are present
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

  // Validate personal information and password strength
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
    await prisma.$connect();

    // Final check for existing user
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return {
        error: "An account with this email already exists",
        success: false,
      };
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with verified email status
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
      error: "Something went wrong. Please try again later.",
      success: false,
    };
  } finally {
    await prisma.$disconnect();
  }
}
