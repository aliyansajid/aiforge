"use server";

import { z } from "zod";
import { prisma } from "@repo/db";
import bcrypt from "bcryptjs";
import { authSchema } from "@repo/auth/validation";
import { RoleTypes } from "@repo/db";

export async function createUser(data: z.infer<typeof authSchema>) {
  try {
    // Validate input
    const parsed = authSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: "Invalid input format",
      };
    }

    const { email, password } = parsed.data;

    // Check for existing user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      return {
        success: false,
        error: "User with this email already exists",
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with default USER role
    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: email.split("@")[0], // Default name from email
        roles: {
          connectOrCreate: {
            where: { role: "USER" as RoleTypes },
            create: { role: "USER" as RoleTypes },
          },
        },
      },
    });

    return {
      success: true,
      message: "User created successfully",
    };
  } catch (error) {
    console.error("CreateUser error:", error);
    return {
      success: false,
      error: "Failed to create user",
    };
  }
}
