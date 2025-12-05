"use server";

import { auth } from "@repo/auth";
import { prisma, TeamRole } from "@repo/db";
import { revalidatePath } from "next/cache";
import { Storage } from "@google-cloud/storage";
import { teamSchema } from "@/schema/index";
import path from "path";
import { ActionResponse, Team } from "@/types";

const GCS_BUCKET_NAME = "aiforge-assets";
const FOLDER_PATH = "team-images";

const SERVICE_ACCOUNT_PATH = path.join(process.cwd(), "service-account.json");

let storage: Storage;

try {
  storage = new Storage({
    keyFilename: SERVICE_ACCOUNT_PATH,
  });
} catch (error) {
  console.error("Google Cloud Storage initialization failed.", {
    path: SERVICE_ACCOUNT_PATH,
    error,
  });
  throw new Error(
    "Failed to initialize Google Cloud Storage. Please check the service account configuration."
  );
}

const bucket = storage.bucket(GCS_BUCKET_NAME);

async function generateSignedUrl(filePath: string): Promise<string> {
  try {
    const file = bucket.file(filePath);
    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    return url;
  } catch (error) {
    console.error("Error generating signed URL for", filePath, ":", error);
    // Return empty string to fall back to gradient
    return "";
  }
}

export async function getUserTeams(): Promise<ActionResponse<Team[]>> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      message: "Please sign in to view your teams.",
      data: null,
    };
  }

  try {
    const teamMembers = await prisma.teamMember.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        team: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const teamsData = await Promise.all(
      teamMembers.map(async (tm) => {
        let imageUrl = tm.team.image;

        // Generate signed URL if image exists in GCS
        if (imageUrl && imageUrl.startsWith(`gs://${GCS_BUCKET_NAME}/`)) {
          const filePath = imageUrl.replace(`gs://${GCS_BUCKET_NAME}/`, "");
          imageUrl = await generateSignedUrl(filePath);
        }

        return {
          id: tm.team.id,
          name: tm.team.name,
          slug: tm.team.slug,
          image: imageUrl,
          role: tm.role,
        };
      })
    );

    return {
      success: true,
      message: "Teams fetched successfully",
      data: teamsData,
    };
  } catch (error) {
    console.error("Error fetching user teams:", error);
    return {
      success: false,
      message: "An unexpected error occurred while fetching teams.",
      data: null,
    };
  }
}

async function uploadFileToGCS(file: File, teamSlug: string): Promise<string> {
  const fileExtension = file.name.split(".").pop();
  const fileName = `${teamSlug}-${Date.now()}.${fileExtension}`;
  const destination = `${FOLDER_PATH}/${fileName}`;
  const fileRef = bucket.file(destination);

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await fileRef.save(buffer, {
      resumable: false,
      contentType: file.type,
      metadata: {
        cacheControl: "public, max-age=31536000",
      },
    });

    // Return GCS path format so we can generate signed URLs later
    const gcsPath = `gs://${GCS_BUCKET_NAME}/${destination}`;
    return gcsPath;
  } catch (err) {
    console.error("Error uploading file to GCS:", err);
    throw new Error("Failed to upload image. Please try again.");
  }
}

export async function updateTeamSettings(data: {
  teamSlug: string;
  name: string;
  slug: string;
  avatarFile: File | null;
}): Promise<ActionResponse<Team>> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      message: "Please sign in to update team settings",
      data: null,
    };
  }

  try {
    // Verify user has permission (Owner or Admin)
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        team: {
          slug: data.teamSlug,
        },
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
      include: {
        team: true,
      },
    });

    if (!teamMember) {
      return {
        success: false,
        message: "You don't have permission to update team settings",
        data: null,
      };
    }

    const updates: {
      name?: string;
      slug?: string;
      image?: string;
    } = {};

    // Validate and update name
    if (data.name && data.name !== teamMember.team.name) {
      if (data.name.trim().length < 2) {
        return {
          success: false,
          message: "Team name must be at least 2 characters long",
          data: null,
        };
      }
      updates.name = data.name.trim();
    }

    // Validate and update slug
    if (data.slug && data.slug !== teamMember.team.slug) {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(data.slug)) {
        return {
          success: false,
          message:
            "Team slug can only contain lowercase letters, numbers, and hyphens",
          data: null,
        };
      }

      // Check if slug is already taken
      const existingTeam = await prisma.team.findUnique({
        where: { slug: data.slug },
      });

      if (existingTeam && existingTeam.id !== teamMember.team.id) {
        return {
          success: false,
          message: "This slug is already taken. Please choose another one",
          data: null,
        };
      }

      updates.slug = data.slug;
    }

    // Handle avatar upload
    if (data.avatarFile) {
      try {
        const imageUrl = await uploadFileToGCS(
          data.avatarFile,
          data.slug || teamMember.team.slug
        );
        updates.image = imageUrl;
      } catch (error) {
        console.error("Error uploading team avatar:", error);
        return {
          success: false,
          message: "Failed to upload team avatar. Please try again",
          data: null,
        };
      }
    }

    // If no updates, return early
    if (Object.keys(updates).length === 0) {
      return {
        success: true,
        message: "No changes to save",
        data: {
          id: teamMember.team.id,
          name: teamMember.team.name,
          slug: teamMember.team.slug,
          image: teamMember.team.image,
          role: teamMember.role,
        },
      };
    }

    // Update team
    const updatedTeam = await prisma.team.update({
      where: { id: teamMember.teamId },
      data: updates,
    });

    // Revalidate relevant paths
    revalidatePath(`/${teamMember.team.slug}/settings/general`);
    if (updates.slug) {
      revalidatePath(`/${updates.slug}/settings/general`);
    }

    return {
      success: true,
      message: "Team settings updated successfully",
      data: {
        id: updatedTeam.id,
        name: updatedTeam.name,
        slug: updatedTeam.slug,
        image: updatedTeam.image,
        role: teamMember.role,
      },
    };
  } catch (error) {
    console.error("Error updating team settings:", error);
    return {
      success: false,
      message: "An unexpected error occurred while updating team settings",
      data: null,
    };
  }
}

export async function createTeam(
  formData: FormData
): Promise<ActionResponse<Team>> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      message: "Please sign in to create a team.",
      data: null,
    };
  }

  const data = Object.fromEntries(formData.entries());
  const validatedData = teamSchema.safeParse(data);

  if (!validatedData.success) {
    console.error("Validation failed:", validatedData.error.flatten());
    return {
      success: false,
      message: "Invalid team data. Please check the inputs and try again.",
      data: null,
    };
  }

  const { name, image } = validatedData.data;

  try {
    // Generate base slug from team name
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Function to generate unique slug with numeric suffix
    let slug = baseSlug;
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      const existingTeam = await prisma.team.findUnique({
        where: { slug },
      });

      if (!existingTeam) {
        // Slug is available, break the loop
        break;
      }

      // Generate random 4-6 digit number
      const randomNumber = Math.floor(1000 + Math.random() * 9000); // 4-digit: 1000-9999
      slug = `${baseSlug}-${randomNumber}`;
      attempts++;
    }

    // If still not unique after max attempts (very unlikely)
    if (attempts === maxAttempts) {
      return {
        success: false,
        message:
          "Unable to generate a unique team identifier. Please try again.",
        data: null,
      };
    }

    let imageUrl: string | null = null;

    if (image) {
      try {
        imageUrl = await uploadFileToGCS(image, slug);
      } catch (e) {
        console.error("Error uploading team image:", e);
        return {
          success: false,
          message:
            "Failed to upload team image. Please try again or proceed without an image.",
          data: null,
        };
      }
    }

    const team = await prisma.team.create({
      data: {
        name,
        slug,
        image: imageUrl,
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
      },
      include: {
        members: {
          where: {
            userId: session.user.id,
          },
        },
      },
    });

    revalidatePath("/");

    return {
      success: true,
      message: "Team created successfully.",
      data: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        image: team.image,
        role: team.members[0]!.role,
      },
    };
  } catch (error) {
    console.error("Error creating team:", error);
    return {
      success: false,
      message: "An unexpected error occurred while creating the team.",
      data: null,
    };
  }
}
