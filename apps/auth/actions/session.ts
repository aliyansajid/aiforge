"use server";

import { auth, signOut } from "@repo/auth";
import { prisma } from "@repo/db";
import { revalidatePath } from "next/cache";

export async function getCurrentSession() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  try {
    // Get the most recent session for the user
    const currentSession = await prisma.session.findFirst({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        city: true,
        region: true,
        country: true,
        timezone: true,
        ipAddress: true,
        lat: true,
        lon: true,
        createdAt: true,
        expires: true,
      },
    });

    return currentSession;
  } catch (error) {
    console.error("Error fetching current session:", error);
    return null;
  }
}

export async function getActiveSessions() {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  try {
    // Get the current session ID first
    const currentSession = await prisma.session.findFirst({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
      },
    });

    // Get all active sessions (excluding the current one)
    const activeSessions = await prisma.session.findMany({
      where: {
        userId: session.user.id,
        id: {
          not: currentSession?.id,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        city: true,
        region: true,
        country: true,
        timezone: true,
        ipAddress: true,
        lat: true,
        lon: true,
        createdAt: true,
        expires: true,
      },
    });

    return activeSessions;
  } catch (error) {
    console.error("Error fetching active sessions:", error);
    return [];
  }
}

export async function deleteSession(sessionId: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    // Verify the session belongs to the current user before deleting
    const sessionToDelete = await prisma.session.findUnique({
      where: {
        id: sessionId,
      },
      select: {
        userId: true,
      },
    });

    if (!sessionToDelete || sessionToDelete.userId !== session.user.id) {
      throw new Error("Session not found or unauthorized");
    }

    await prisma.session.delete({
      where: {
        id: sessionId,
      },
    });
    revalidatePath("/sessions");
    return { success: true };
  } catch (error) {
    console.error("Error deleting session:", error);
    throw new Error("Failed to delete session");
  }
}

export async function signOutAllSessions() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  try {
    // Delete all sessions for the user
    await prisma.session.deleteMany({
      where: {
        userId: session.user.id,
      },
    });

    // Sign out the user
    await signOut();
    return { success: true };
  } catch (error) {
    console.error("Error signing out all sessions:", error);
    throw new Error("Failed to sign out all sessions");
  }
}
