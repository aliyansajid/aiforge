"use server";

import { personalInfoSchema, emailSchema, otpSchema } from "@/schemas/auth";
import { auth } from "@repo/auth";
import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";
import {
  sendEmailChangeVerificationEmail,
  sendEmailChangeNotificationEmail,
} from "@/lib/email/nodemailer";
import bcrypt from "bcryptjs";

/**
 * Get user's account connection status and provider emails
 */
export async function getUserAccountStatus() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      console.error("getUserAccountStatus: No authenticated user");
      return null;
    }

    // Fetch user's connected accounts from database
    const userAccounts = await prisma.account.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        provider: true,
        providerAccountId: true,
      },
    });

    // Fetch user data to check if they have a password (credentials)
    const userData = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        password: true,
        email: true,
      },
    });

    // Check which providers are connected
    const connectedProviders = userAccounts.map((account) => account.provider);
    const isGoogleConnected = connectedProviders.includes("google");
    const isGithubConnected = connectedProviders.includes("github");
    const hasCredentials = !!userData?.password;

    return {
      isGoogleConnected,
      isGithubConnected,
      hasCredentials,
      userEmail: userData?.email || null,
      connectedProviders,
    };
  } catch (error) {
    console.error("getUserAccountStatus error:", error);
    return null;
  }
}

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

export async function updateName(formData: FormData) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      console.error("updateName: No authenticated user");
      return {
        error: "Authentication required. Please sign in again.",
        success: false,
      };
    }

    const rawData = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
    };

    // Validate required fields
    if (!rawData.firstName || !rawData.lastName) {
      console.error("updateName: Missing required fields", rawData);
      return {
        error: "First name and last name are required",
        success: false,
      };
    }

    // Validate using Zod schema
    const nameSchema = personalInfoSchema.pick({
      firstName: true,
      lastName: true,
    });

    const validationResult = nameSchema.safeParse(rawData);
    if (!validationResult.success) {
      console.error(
        "updateName validation error:",
        validationResult.error.issues
      );
      return {
        error:
          validationResult.error.issues[0]?.message ||
          "Please check your input and try again",
        success: false,
      };
    }

    const { firstName, lastName } = validationResult.data;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!existingUser) {
      console.error("updateName: User not found", session.user.id);
      return {
        error: "User account not found",
        success: false,
      };
    }

    // Update user name
    await prisma.user.update({
      where: { id: session.user.id },
      data: { firstName, lastName },
    });

    revalidatePath("/account");

    return {
      message: "Name updated successfully",
      success: true,
    };
  } catch (error) {
    console.error("updateName error:", error);
    return {
      error: "Failed to update name. Please try again.",
      success: false,
    };
  }
}

export async function sendEmailChangeOtp(formData: FormData) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      console.error("sendEmailChangeOtp: No authenticated user");
      return {
        error: "Authentication required. Please sign in again.",
        success: false,
      };
    }

    const rawData = {
      email: formData.get("email") as string,
    };

    // Validate required fields
    if (!rawData.email) {
      console.error("sendEmailChangeOtp: Missing email", rawData);
      return {
        error: "Email is required",
        success: false,
      };
    }

    // Validate using Zod schema
    const validationResult = emailSchema.safeParse(rawData);
    if (!validationResult.success) {
      console.error(
        "sendEmailChangeOtp validation error:",
        validationResult.error.issues
      );
      return {
        error:
          validationResult.error.issues[0]?.message ||
          "Please enter a valid email",
        success: false,
      };
    }

    const { email: newEmail } = validationResult.data;

    // Get current user data
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });

    if (!currentUser) {
      console.error("sendEmailChangeOtp: User not found", session.user.id);
      return {
        error: "User account not found",
        success: false,
      };
    }

    // Check if the new email is actually different
    if (currentUser.email === newEmail) {
      console.error("sendEmailChangeOtp: Same email provided", newEmail);
      return {
        error: "New email must be different from current email",
        success: false,
      };
    }

    // Check if the new email is already taken by another user
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail },
    });

    if (existingUser) {
      console.error("sendEmailChangeOtp: Email already in use", newEmail);
      return {
        error: "This email is already in use",
        success: false,
      };
    }

    // Generate OTP and save it
    const otp = generateOtp();
    const otpWithDash = `${otp.slice(0, 3)}-${otp.slice(3)}`;
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Save the OTP in the DB
    await prisma.verificationToken.create({
      data: {
        email: newEmail,
        token: otp,
        expires,
      },
    });

    // Send the OTP via email
    const emailResult = await sendEmailChangeVerificationEmail(
      newEmail,
      otpWithDash
    );

    if (!emailResult.success) {
      // Cleanup if email delivery fails
      await prisma.verificationToken.deleteMany({
        where: { email: newEmail, token: otp },
      });

      console.error("sendEmailChangeOtp: Email delivery failed", emailResult);
      return {
        error: "Failed to send verification email. Please try again.",
        success: false,
      };
    }

    return {
      message: "Otp sent to your new email",
      success: true,
    };
  } catch (error) {
    console.error("sendEmailChangeOtp error:", error);
    return {
      error: "Failed to send otp. Please try again.",
      success: false,
    };
  }
}

export async function verifyEmailChangeOtp(formData: FormData) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      console.error("verifyEmailChangeOtp: No authenticated user");
      return {
        error: "Authentication required. Please sign in again.",
        success: false,
      };
    }

    const rawData = {
      email: formData.get("email") as string,
      otp: formData.get("otp") as string,
    };

    // Validate required fields
    if (!rawData.email || !rawData.otp) {
      console.error("verifyEmailChangeOtp: Missing required fields", rawData);
      return {
        error: "Email and otp are required",
        success: false,
      };
    }

    // Remove dash for DB comparison
    const normalizedOtp = rawData.otp.replace("-", "");

    // Validate using Zod schema
    const validationResult = otpSchema.safeParse({ otp: normalizedOtp });
    if (!validationResult.success) {
      console.error(
        "verifyEmailChangeOtp validation error:",
        validationResult.error.issues
      );
      return {
        error:
          validationResult.error.issues[0]?.message ||
          "Please enter a valid otp",
        success: false,
      };
    }

    // Check for a valid token
    const token = await prisma.verificationToken.findFirst({
      where: {
        email: rawData.email,
        token: normalizedOtp,
        expires: { gte: new Date() },
      },
    });

    if (!token) {
      console.error("verifyEmailChangeOtp: Invalid or expired token", {
        email: rawData.email,
        otp: normalizedOtp,
      });
      return {
        error: "Invalid or expired otp",
        success: false,
      };
    }

    // Get current user data before updating
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, firstName: true },
    });

    if (!currentUser) {
      console.error("verifyEmailChangeOtp: User not found", session.user.id);
      return {
        error: "User account not found",
        success: false,
      };
    }

    // Update the user's email address
    await prisma.user.update({
      where: { id: session.user.id },
      data: { email: rawData.email },
    });

    // Invalidate the OTP (one-time use)
    await prisma.verificationToken.delete({
      where: { id: token.id },
    });

    // Send notification to the old email address
    try {
      await sendEmailChangeNotificationEmail(currentUser.email, {
        firstName: currentUser.firstName || "User",
      });
    } catch (emailError) {
      console.error(
        "verifyEmailChangeOtp: Failed to send notification email:",
        emailError
      );
      // Don't fail the email change if notification fails
    }

    revalidatePath("/account");

    return {
      message: "Email updated successfully",
      success: true,
    };
  } catch (error) {
    console.error("verifyEmailChangeOtp error:", error);
    return {
      error: "Failed to verify code. Please try again.",
      success: false,
    };
  }
}

export async function setupPassword(formData: FormData) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      console.error("setupPassword: No authenticated user");
      return {
        error: "Authentication required. Please sign in again.",
        success: false,
      };
    }

    const rawData = {
      password: formData.get("password") as string,
    };

    // Validate required fields
    if (!rawData.password) {
      console.error("setupPassword: Missing password", rawData);
      return {
        error: "Password is required",
        success: false,
      };
    }

    // Validate using Zod schema
    const passwordSchema = personalInfoSchema.pick({ password: true });
    const validationResult = passwordSchema.safeParse(rawData);
    if (!validationResult.success) {
      console.error(
        "setupPassword validation error:",
        validationResult.error.issues
      );
      return {
        error:
          validationResult.error.issues[0]?.message ||
          "Please check your password requirements and try again",
        success: false,
      };
    }

    const { password } = validationResult.data;

    // Check if user already has a password
    const userData = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!userData) {
      console.error("setupPassword: User not found", session.user.id);
      return {
        error: "User account not found",
        success: false,
      };
    }

    if (userData.password) {
      console.error("setupPassword: Password already exists", session.user.id);
      return {
        error:
          "Password is already set. Use the disable button to remove it first.",
        success: false,
      };
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user with new password
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    });

    revalidatePath("/account");

    return {
      message: "Password set up successfully",
      success: true,
    };
  } catch (error) {
    console.error("setupPassword error:", error);
    return {
      error: "Failed to set up password. Please try again.",
      success: false,
    };
  }
}

export async function disconnectOAuthProvider(provider: "google" | "github") {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      console.error("disconnectOAuthProvider: No authenticated user");
      return {
        error: "Authentication required. Please sign in again.",
        success: false,
      };
    }

    // Validate provider
    if (!provider || !["google", "github"].includes(provider)) {
      console.error("disconnectOAuthProvider: Invalid provider", provider);
      return {
        error: "Invalid provider specified",
        success: false,
      };
    }

    // Check if user has other sign-in methods before allowing disconnect
    const userAccounts = await prisma.account.findMany({
      where: { userId: session.user.id },
    });

    const userData = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!userData) {
      console.error("disconnectOAuthProvider: User not found", session.user.id);
      return {
        error: "User account not found",
        success: false,
      };
    }

    const hasCredentials = !!userData.password;
    const otherProviders = userAccounts.filter(
      (account) => account.provider !== provider
    );

    // Prevent disconnecting if it's the only sign-in method
    if (otherProviders.length === 0 && !hasCredentials) {
      console.error(
        "disconnectOAuthProvider: Attempting to disconnect only sign-in method",
        {
          userId: session.user.id,
          provider,
          hasCredentials,
          otherProviders: otherProviders.length,
        }
      );
      return {
        error:
          "Cannot disconnect the only sign-in method. Please add another sign-in method first.",
        success: false,
      };
    }

    // Delete the OAuth account connection
    const deleteResult = await prisma.account.deleteMany({
      where: {
        userId: session.user.id,
        provider: provider,
      },
    });

    if (deleteResult.count === 0) {
      console.error("disconnectOAuthProvider: No account found to disconnect", {
        userId: session.user.id,
        provider,
      });
      return {
        error: "No connected account found to disconnect",
        success: false,
      };
    }

    revalidatePath("/account");

    return {
      message: `${provider} account disconnected successfully`,
      success: true,
    };
  } catch (error) {
    console.error("disconnectOAuthProvider error:", error);
    return {
      error: "Failed to disconnect account. Please try again.",
      success: false,
    };
  }
}

export async function disableCredentials(formData: FormData): Promise<void> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      console.error("disableCredentials: No authenticated user");
      // Instead of returning an error, you could throw or redirect
      throw new Error("Authentication required. Please sign in again.");
    }

    // Check if user has other sign-in methods
    const userAccounts = await prisma.account.findMany({
      where: { userId: session.user.id },
    });

    if (userAccounts.length === 0) {
      console.error("disableCredentials: No other sign-in methods available", {
        userId: session.user.id,
        accountsCount: userAccounts.length,
      });
      throw new Error(
        "Cannot disable password. Please add another sign-in method first."
      );
    }

    // Check if user actually has a password
    const userData = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!userData) {
      console.error("disableCredentials: User not found", session.user.id);
      throw new Error("User account not found");
    }

    if (!userData.password) {
      console.error(
        "disableCredentials: No password to disable",
        session.user.id
      );
      throw new Error("No password is currently set");
    }

    // Remove password from user
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: null },
    });

    revalidatePath("/account");

    // Don't return anything - form actions should return void
  } catch (error) {
    console.error("disableCredentials error:", error);
    // You could handle this with redirects, cookies, etc.
    // For now, we'll just rethrow
    throw error;
  }
}
