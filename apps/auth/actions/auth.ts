"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@repo/db";
import { registerSchema } from "@/schemas/auth";

function getNameFromEmail(email: string): string {
  const parts = email.split("@");
  const localPart = parts[0] || "";
  const name = localPart
    .replace(/[0-9._-]/g, " ")
    .split(" ")
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
  return name || "User";
}

export async function registerUser(formData: FormData) {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const validationResult = registerSchema.safeParse(rawData);
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0];
    return {
      error: firstError?.message || "Invalid input provided",
      success: false,
    };
  }

  const { email, password } = validationResult.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        error: "An account with this email already exists",
        success: false,
      };
    }

    const name = getNameFromEmail(email);
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
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
  }
}
