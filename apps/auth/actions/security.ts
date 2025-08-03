"use server";

import z from "zod";
import { auth } from "@repo/auth";
import { prisma } from "@repo/db";
import bcrypt from "bcryptjs";
import { generateSecret, verifyToken } from "node-2fa";
import QRCode from "qrcode";
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY!;
const ALGORITHM = "aes-256-cbc";

// Validate encryption key on startup
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error(
    "MFA_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)"
  );
}

// Encryption utility functions
function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(ENCRYPTION_KEY, "hex"); // Parse as hex
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return iv.toString("hex") + ":" + encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
}

function decrypt(text: string): string {
  try {
    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift()!, "hex");
    const encryptedText = textParts.join(":");
    const key = Buffer.from(ENCRYPTION_KEY, "hex"); // Parse as hex

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
}

export async function updatePassword(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    console.error("updatePassword: No authenticated user");
    return {
      error: "Authentication required. Please sign in again.",
      success: false,
    };
  }

  const rawData = {
    oldPassword: formData.get("oldPassword") as string,
    newPassword: formData.get("newPassword") as string,
  };

  // Validate required fields
  if (!rawData.oldPassword || !rawData.newPassword) {
    console.error("updatePassword: Missing required fields", rawData);
    return {
      error: "Old password and new password are required",
      success: false,
    };
  }

  const passwordSchema = z.object({
    oldPassword: z.string(),
    newPassword: z.string(),
  });

  const validationResult = passwordSchema.safeParse(rawData);
  if (!validationResult.success) {
    console.error(
      "updatePassword validation error:",
      validationResult.error.issues
    );
    return {
      error:
        validationResult.error.issues[0]?.message ||
        "Please check your input and try again",
      success: false,
    };
  }

  const { oldPassword, newPassword } = validationResult.data;

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
  });

  if (!user) {
    console.error("updatePassword: User not found");
    return {
      error: "User not found",
      success: false,
    };
  }

  if (!user.password) {
    console.error("updatePassword: User password not set");
    return {
      error: "User password not set",
      success: false,
    };
  }

  const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

  if (!isPasswordValid) {
    console.error("updatePassword: Old password is incorrect", rawData);
    return {
      error: "Old password is incorrect",
      success: false,
    };
  }

  // Update the password in the database
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashedPassword },
  });

  return {
    success: true,
    message: "Password updated successfully",
  };
}

// Generate MFA secret and QR code
export async function generateMfaSecret() {
  const session = await auth();

  if (!session?.user?.id) {
    console.error("generateMfaSecret: No authenticated user");
    return {
      error: "Authentication required. Please sign in again.",
      success: false,
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });

    if (!user) {
      return {
        error: "User not found",
        success: false,
      };
    }

    // Generate TOTP secret
    const secret = generateSecret({
      name: user.email || "User",
      account: "AIForge",
    });

    // Generate QR code as data URL
    const qrCodeUrl = await QRCode.toDataURL(secret.uri);

    return {
      success: true,
      data: {
        secret: secret.secret,
        qrCodeUrl,
        otpAuthUrl: secret.uri,
      },
    };
  } catch (error) {
    console.error("generateMfaSecret error:", error);
    return {
      error: "Failed to generate MFA secret",
      success: false,
    };
  }
}

// Verify OTP and save MFA device
export async function verifyAndSaveMfaDevice(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    console.error("verifyAndSaveMfaDevice: No authenticated user");
    return {
      error: "Authentication required. Please sign in again.",
      success: false,
    };
  }

  const rawData = {
    otp: formData.get("otp") as string,
    name: formData.get("name") as string,
    secret: formData.get("secret") as string,
  };

  console.log("Raw form data:", rawData);

  // Validate required fields
  if (!rawData.otp || !rawData.name || !rawData.secret) {
    console.error("verifyAndSaveMfaDevice: Missing required fields", rawData);
    return {
      error: "All fields are required",
      success: false,
    };
  }

  const mfaSchema = z.object({
    otp: z
      .string()
      .length(6, "OTP must be 6 digits")
      .regex(/^\d{6}$/, "OTP must contain only digits"),
    name: z
      .string()
      .min(3, "Name must be at least 3 characters")
      .max(50, "Name cannot exceed 50 characters"),
    secret: z.string().min(1, "Secret is required"),
  });

  const validationResult = mfaSchema.safeParse(rawData);
  if (!validationResult.success) {
    console.error(
      "verifyAndSaveMfaDevice validation error:",
      validationResult.error.issues
    );
    return {
      error:
        validationResult.error.issues[0]?.message ||
        "Please check your input and try again",
      success: false,
    };
  }

  const { otp, name, secret } = validationResult.data;

  console.log("Validated data:", { otp, name, secretLength: secret.length });

  try {
    // Verify the OTP
    console.log("Verifying OTP with secret...");
    const verification = verifyToken(secret, otp);

    console.log("Verification result:", verification);

    if (!verification || verification.delta !== 0) {
      console.error("verifyAndSaveMfaDevice: Invalid OTP", {
        otp,
        delta: verification?.delta,
        verification,
      });
      return {
        error:
          "Invalid OTP code. Please ensure the code is current and try again.",
        success: false,
      };
    }

    console.log("OTP verified successfully!");

    // Check if device name already exists for this user
    const existingDevice = await prisma.mfaDevice.findFirst({
      where: {
        userId: session.user.id,
        name: name,
      },
    });

    if (existingDevice) {
      return {
        error:
          "A device with this name already exists. Please choose a different name.",
        success: false,
      };
    }

    console.log("Encrypting secret and saving device...");

    // Encrypt and save the secret
    const encryptedSecret = encrypt(secret);

    const newDevice = await prisma.mfaDevice.create({
      data: {
        name,
        secret: encryptedSecret,
        userId: session.user.id,
        verified: true,
        lastUsed: new Date(),
      },
    });

    console.log("Device created:", newDevice.id);

    // Enable MFA for the user if this is their first device
    const deviceCount = await prisma.mfaDevice.count({
      where: { userId: session.user.id },
    });

    console.log("Total devices for user:", deviceCount);

    if (deviceCount === 1) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { mfaEnabled: true },
      });
      console.log("MFA enabled for user");
    }

    return {
      success: true,
      message: "Authenticator added successfully",
    };
  } catch (error) {
    console.error("verifyAndSaveMfaDevice error:", error);
    return {
      error: "Failed to setup authenticator. Please try again.",
      success: false,
    };
  }
}

// Get user's MFA devices
export async function getMfaDevices() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: "Authentication required",
      success: false,
    };
  }

  try {
    const devices = await prisma.mfaDevice.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        verified: true,
        lastUsed: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: devices,
    };
  } catch (error) {
    console.error("getMfaDevices error:", error);
    return {
      error: "Failed to fetch MFA devices",
      success: false,
    };
  }
}

// Remove MFA device
export async function removeMfaDevice(deviceId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: "Authentication required",
      success: false,
    };
  }

  try {
    // Verify the device belongs to the user
    const device = await prisma.mfaDevice.findFirst({
      where: {
        id: deviceId,
        userId: session.user.id,
      },
    });

    if (!device) {
      return {
        error: "Device not found",
        success: false,
      };
    }

    // Delete the device
    await prisma.mfaDevice.delete({
      where: { id: deviceId },
    });

    // Check if user has any remaining devices
    const remainingDevices = await prisma.mfaDevice.count({
      where: { userId: session.user.id },
    });

    // Disable MFA if no devices left
    if (remainingDevices === 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { mfaEnabled: false },
      });
    }

    return {
      success: true,
      message: "Authenticator removed successfully",
    };
  } catch (error) {
    console.error("removeMfaDevice error:", error);
    return {
      error: "Failed to remove authenticator",
      success: false,
    };
  }
}

export async function verifyMfaForBackupCodes(otp: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: "Authentication required",
      success: false,
    };
  }

  try {
    // Get user's MFA devices
    const devices = await prisma.mfaDevice.findMany({
      where: {
        userId: session.user.id,
        verified: true,
      },
      select: { secret: true },
    });

    if (devices.length === 0) {
      return {
        error: "No verified MFA devices found",
        success: false,
      };
    }

    // Verify OTP against any of the user's devices
    for (const device of devices) {
      try {
        const decryptedSecret = decrypt(device.secret);
        const verification = verifyToken(decryptedSecret, otp);

        if (verification && verification.delta === 0) {
          console.log(
            "MFA verification successful for backup codes generation"
          );
          return {
            success: true,
            message: "Device verified successfully",
          };
        }
      } catch (error) {
        console.error("Error verifying device:", error);
        continue; // Try next device
      }
    }

    return {
      error: "Invalid verification code. Please try again.",
      success: false,
    };
  } catch (error) {
    console.error("verifyMfaForBackupCodes error:", error);
    return {
      error: "Failed to verify device",
      success: false,
    };
  }
}

// Updated generateBackupCodes - remove the MFA check since we verify separately
export async function generateBackupCodes() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: "Authentication required",
      success: false,
    };
  }

  try {
    // Generate 10 backup codes (8 characters each, alphanumeric)
    const backupCodes = Array.from({ length: 10 }, () => {
      return crypto.randomBytes(4).toString("hex").toUpperCase();
    });

    // Hash the backup codes before storing
    const hashedCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 10))
    );

    // Update user with new backup codes
    await prisma.user.update({
      where: { id: session.user.id },
      data: { backupCodes: hashedCodes },
    });

    console.log("Generated backup codes for user:", session.user.id);

    return {
      success: true,
      data: {
        codes: backupCodes,
        message: "New backup codes generated successfully",
      },
    };
  } catch (error) {
    console.error("generateBackupCodes error:", error);
    return {
      error: "Failed to generate backup codes",
      success: false,
    };
  }
}

// Check if user has backup codes
export async function hasBackupCodes() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      error: "Authentication required",
      success: false,
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { backupCodes: true, mfaEnabled: true },
    });

    if (!user) {
      return {
        error: "User not found",
        success: false,
      };
    }

    return {
      success: true,
      data: {
        hasBackupCodes: user.backupCodes && user.backupCodes.length > 0,
        mfaEnabled: user.mfaEnabled,
        codesCount: user.backupCodes?.length || 0,
      },
    };
  } catch (error) {
    console.error("hasBackupCodes error:", error);
    return {
      error: "Failed to check backup codes",
      success: false,
    };
  }
}

export async function verifyBackupCode(code: string, userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { backupCodes: true, mfaEnabled: true },
    });

    if (!user?.mfaEnabled || !user.backupCodes?.length) {
      return {
        error: "No backup codes available",
        success: false,
      };
    }

    // Check if the provided code matches any of the stored hashed codes
    for (let i = 0; i < user.backupCodes.length; i++) {
      const hashedCode = user.backupCodes[i];

      // Add type check to ensure hashedCode is not undefined
      if (!hashedCode) {
        continue;
      }

      const isMatch = await bcrypt.compare(code.toUpperCase(), hashedCode);

      if (isMatch) {
        // Remove the used code from the array
        const updatedCodes = user.backupCodes.filter((_, index) => index !== i);

        await prisma.user.update({
          where: { id: userId },
          data: { backupCodes: updatedCodes },
        });

        console.log("Backup code used successfully for user:", userId);

        return {
          success: true,
          data: {
            message: "Backup code verified successfully",
            remainingCodes: updatedCodes.length,
          },
        };
      }
    }

    return {
      error: "Invalid backup code",
      success: false,
    };
  } catch (error) {
    console.error("verifyBackupCode error:", error);
    return {
      error: "Failed to verify backup code",
      success: false,
    };
  }
}

// Check if user needs MFA verification
export async function checkMfaRequired(email: string, password: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        password: true,
        mfaEnabled: true,
        status: true,
      },
    });

    if (!user || !user.password) {
      return {
        error: "Invalid credentials",
        success: false,
      };
    }

    // Verify password first
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return {
        error: "Invalid credentials",
        success: false,
      };
    }

    // Check account status
    if (user.status !== "ACTIVE") {
      return {
        error: "Account is not active",
        success: false,
      };
    }

    return {
      success: true,
      data: {
        userId: user.id,
        mfaRequired: user.mfaEnabled,
      },
    };
  } catch (error) {
    console.error("checkMfaRequired error:", error);
    return {
      error: "Authentication failed",
      success: false,
    };
  }
}

// Verify MFA code and complete login
export async function verifyMfaAndLogin(
  email: string,
  password: string,
  mfaCode: string
) {
  try {
    // First verify credentials again
    const checkResult = await checkMfaRequired(email, password);
    if (!checkResult.success || !checkResult.data) {
      return checkResult;
    }

    const { userId } = checkResult.data;

    // Get user's MFA devices
    const devices = await prisma.mfaDevice.findMany({
      where: {
        userId,
        verified: true,
      },
      select: { secret: true },
    });

    if (devices.length === 0) {
      return {
        error: "No MFA devices found",
        success: false,
      };
    }

    // Verify MFA code against any device
    let isValidMfa = false;
    for (const device of devices) {
      try {
        const decryptedSecret = decrypt(device.secret);
        const verification = verifyToken(decryptedSecret, mfaCode);

        if (verification && Math.abs(verification.delta) <= 1) {
          // Allow 1 step tolerance
          isValidMfa = true;
          break;
        }
      } catch (error) {
        console.error("Error verifying MFA device:", error);
        continue;
      }
    }

    if (!isValidMfa) {
      return {
        error: "Invalid MFA code",
        success: false,
      };
    }

    // Update last used timestamp for MFA devices
    await prisma.mfaDevice.updateMany({
      where: { userId },
      data: { lastUsed: new Date() },
    });

    return {
      success: true,
      data: {
        userId,
        message: "MFA verification successful",
      },
    };
  } catch (error) {
    console.error("verifyMfaAndLogin error:", error);
    return {
      error: "MFA verification failed",
      success: false,
    };
  }
}

// Verify backup code and complete login
export async function verifyBackupCodeAndLogin(
  email: string,
  password: string,
  backupCode: string
) {
  try {
    // First verify credentials
    const checkResult = await checkMfaRequired(email, password);
    if (!checkResult.success || !checkResult.data) {
      return checkResult;
    }

    const { userId } = checkResult.data;

    // Verify backup code
    const backupResult = await verifyBackupCode(backupCode, userId);
    if (!backupResult.success) {
      return backupResult;
    }

    return {
      success: true,
      data: {
        userId,
        message: "Backup code verification successful",
        remainingCodes: backupResult.data?.remainingCodes || 0,
      },
    };
  } catch (error) {
    console.error("verifyBackupCodeAndLogin error:", error);
    return {
      error: "Backup code verification failed",
      success: false,
    };
  }
}
