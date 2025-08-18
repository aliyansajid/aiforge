"use server";

import { auth } from "@repo/auth";
import { prisma } from "@repo/db";
import bcrypt from "bcryptjs";
import {
  addMFADeviceSchema,
  changePasswordSchema,
  emailSchema,
} from "@/schemas/auth";
import { authenticator } from "otplib";
import QRCode from "qrcode";

export async function updatePassword(formData: FormData) {
  const rawData = {
    oldPassword: formData.get("oldPassword") as string,
    newPassword: formData.get("newPassword") as string,
  };

  // Check if all required fields are provided
  if (!rawData.oldPassword || !rawData.newPassword) {
    return {
      error: "All fields are required",
      success: false,
    };
  }

  const validationResult = changePasswordSchema.safeParse(rawData);
  if (!validationResult.success) {
    return {
      error: validationResult.error.issues[0]?.message || "Invalid input",
      success: false,
    };
  }

  const { oldPassword, newPassword } = validationResult.data;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        error: "Your session has expired. Please log in again.",
        success: false,
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    });

    if (!user || !user.password) {
      return {
        error: "Unable to process request. Please try again.",
        success: false,
      };
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      return {
        error: "Incorrect old password",
        success: false,
      };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    });

    return { message: "Password updated successfully", success: true };
  } catch (error) {
    console.error("updatePassword error:", error);
    return {
      error: "An unexpected error occurred. Please try again later.",
      success: false,
    };
  }
}

export async function generateMfaSetup() {
  try {
    const session = await auth();

    if (!session?.user?.id || !session?.user?.email) {
      return {
        error: "Your session has expired. Please log in again.",
        success: false,
      };
    }

    const validationResult = emailSchema.safeParse({
      email: session.user.email,
    });
    if (!validationResult.success) {
      return {
        error: validationResult.error.issues[0]?.message || "Invalid email",
        success: false,
      };
    }

    const { email } = validationResult.data;

    // Generate MFA secret
    const secret = authenticator.generateSecret();
    const issuer = "AIForge";
    const otpauthUrl = authenticator.keyuri(email, issuer, secret);

    // Generate QR code data URL
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    return {
      message: "MFA setup generated successfully",
      success: true,
      data: { qrCodeUrl, secret },
    };
  } catch (error) {
    console.error("generateMfaSetup error:", error);
    return {
      error: "An unexpected error occurred. Please try again later.",
      success: false,
    };
  }
}

export async function addMfaDevice(formData: FormData) {
  const rawData = {
    name: formData.get("name") as string,
    otp: formData.get("otp") as string,
    secret: formData.get("secret") as string,
  };

  // Check if all required fields are provided
  if (!rawData.name || !rawData.otp || !rawData.secret) {
    return {
      error: "All fields are required",
      success: false,
    };
  }

  const validationResult = addMFADeviceSchema.safeParse(rawData);
  if (!validationResult.success) {
    return {
      error: validationResult.error.issues[0]?.message || "Invalid input",
      success: false,
    };
  }

  const { name, otp, secret } = validationResult.data;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        error: "Your session has expired. Please log in again.",
        success: false,
      };
    }

    // Verify the new device OTP
    const isValidOtp = authenticator.check(otp, secret);
    if (!isValidOtp) {
      return {
        error: "Invalid OTP. Please try again.",
        success: false,
      };
    }

    // Save MFA device and ensure MFA is enabled
    await prisma.mfaDevice.create({
      data: {
        userId: session.user.id,
        name,
        secret,
      },
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { isMfaEnabled: true },
    });

    return { message: "MFA device added successfully", success: true };
  } catch (error) {
    console.error("addMfaDevice error:", error);
    return {
      error: "An unexpected error occurred. Please try again later.",
      success: false,
    };
  }
}

export async function verifyMfaForAction(
  formData: FormData,
  action: "add-device" | "delete-device" | "recovery-codes" = "add-device"
) {
  const rawData = {
    otp: formData.get("otp") as string | null,
    recoveryCode: formData.get("recoveryCode") as string | null,
    deviceId: formData.get("deviceId") as string | null,
  };

  // Check if at least one verification method is provided
  if (!rawData.otp && !rawData.recoveryCode) {
    return {
      error: "Please provide either an OTP or recovery code",
      success: false,
    };
  }

  // Validate individual fields
  if (rawData.otp) {
    if (!/^\d{6}$/.test(rawData.otp)) {
      return {
        error: "OTP must be a 6-digit number",
        success: false,
      };
    }
  }

  if (rawData.recoveryCode) {
    if (!/^\d{6}$/.test(rawData.recoveryCode)) {
      return {
        error: "Recovery code must be a 6-digit number",
        success: false,
      };
    }
  }

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        error: "Your session has expired. Please log in again.",
        success: false,
      };
    }

    // Get user's MFA devices and recovery codes
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        mfaDevices: {
          select: { id: true, secret: true },
        },
        recoveryCodes: {
          where: { isUsed: false },
          select: { id: true, code: true },
        },
      },
    });

    if (!user) {
      return {
        error: "Unable to process request. Please try again.",
        success: false,
      };
    }

    // Check if verification is required based on action and device count
    const deviceCount = user.mfaDevices.length;
    let verificationRequired = false;

    if (action === "add-device" && deviceCount === 1) {
      verificationRequired = true;
    } else if (action === "delete-device" && deviceCount === 1) {
      verificationRequired = true;
    } else if (action === "recovery-codes" && deviceCount > 0) {
      verificationRequired = true;
    }

    if (!verificationRequired) {
      return {
        error: "Verification not required for your current setup.",
        success: false,
      };
    }

    let isValid = false;

    // Verify OTP if provided
    if (rawData.otp) {
      isValid = user.mfaDevices.some((device) =>
        authenticator.check(rawData.otp!, device.secret)
      );
    }

    // Verify recovery code if provided (and OTP wasn't valid)
    if (!isValid && rawData.recoveryCode) {
      const matchingRecoveryCode = user.recoveryCodes.find(
        (recovery) => recovery.code === rawData.recoveryCode
      );

      if (matchingRecoveryCode) {
        isValid = true;

        // Mark the recovery code as used
        await prisma.recoveryCode.update({
          where: { id: matchingRecoveryCode.id },
          data: {
            isUsed: true,
            updatedAt: new Date(),
          },
        });
      }
    }

    if (!isValid) {
      return {
        error: "Invalid recovery code. Please try again.",
        success: false,
      };
    }

    return {
      message: "Verification successful",
      success: true,
      data: {
        deviceId: rawData.deviceId,
        action: action,
      },
    };
  } catch (error) {
    console.error("verifyMfaForAction error:", error);
    return {
      error: "An unexpected error occurred. Please try again later.",
      success: false,
    };
  }
}

export async function deleteMfaDevice(formData: FormData) {
  const rawData = { deviceId: formData.get("deviceId") as string };

  if (!rawData.deviceId) {
    return {
      error: "Device ID is required",
      success: false,
    };
  }

  const { deviceId } = rawData;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        error: "Your session has expired. Please log in again.",
        success: false,
      };
    }

    // Check if the device exists and belongs to the user
    const device = await prisma.mfaDevice.findUnique({
      where: { id: deviceId },
      select: { userId: true },
    });

    if (!device || device.userId !== session.user.id) {
      return {
        error: "Unable to process request. Please try again.",
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

    // If no devices remain, disable MFA
    if (remainingDevices === 0) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { isMfaEnabled: false },
      });
    }

    return { message: "MFA device deleted successfully", success: true };
  } catch (error) {
    console.error("deleteMfaDevice error:", error);
    return {
      error: "An unexpected error occurred. Please try again later.",
      success: false,
    };
  }
}

export async function generateRecoveryCodes() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        error: "Your session has expired. Please log in again.",
        success: false,
      };
    }

    // Generate 10 random 6-digit codes
    const codes = Array.from({ length: 10 }, () => {
      return Math.floor(100000 + Math.random() * 900000).toString();
    });

    // Delete existing recovery codes
    await prisma.recoveryCode.deleteMany({
      where: { userId: session.user.id },
    });

    // Create new recovery codes
    await prisma.recoveryCode.createMany({
      data: codes.map((code) => ({
        userId: session.user.id!,
        code: code,
      })),
    });

    return {
      message: "Recovery codes generated successfully",
      success: true,
      data: { codes },
    };
  } catch (error) {
    console.error("generateRecoveryCodes error:", error);
    return {
      error: "An unexpected error occurred. Please try again later.",
      success: false,
    };
  }
}

export async function getMfaStatus() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        error: "Your session has expired. Please log in again.",
        success: false,
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        isMfaEnabled: true,
        mfaDevices: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return {
        error: "Unable to process request. Please try again.",
        success: false,
      };
    }

    return {
      message: "MFA status retrieved successfully",
      success: true,
      data: {
        isMfaEnabled: user.isMfaEnabled,
        mfaDevices: user.mfaDevices,
      },
    };
  } catch (error) {
    console.error("getMfaStatus error:", error);
    return {
      error: "An unexpected error occurred. Please try again later.",
      success: false,
    };
  }
}

export async function getRecoveryCodesStatus() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        error: "Your session has expired. Please log in again.",
        success: false,
      };
    }

    // Get both unused and total recovery codes count
    const [unusedCount, totalCount] = await Promise.all([
      prisma.recoveryCode.count({
        where: {
          userId: session.user.id,
          isUsed: false,
        },
      }),
      prisma.recoveryCode.count({
        where: {
          userId: session.user.id,
        },
      }),
    ]);

    return {
      message: "Recovery codes status retrieved successfully",
      success: true,
      data: {
        hasRecoveryCodes: unusedCount > 0,
        totalCodes: unusedCount,
        hasEverGenerated: totalCount > 0,
      },
    };
  } catch (error) {
    console.error("getRecoveryCodesStatus error:", error);
    return {
      error: "An unexpected error occurred. Please try again later.",
      success: false,
    };
  }
}
