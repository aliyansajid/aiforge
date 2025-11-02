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

    const teamsData = teamMembers.map((tm) => ({
      id: tm.team.id,
      name: tm.team.name,
      slug: tm.team.slug,
      image: tm.team.image,
      role: tm.role,
    }));

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

    const publicUrl = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${destination}`;
    return publicUrl;
  } catch (err) {
    console.error("Error uploading file to GCS:", err);
    throw new Error("Failed to upload image. Please try again.");
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
