import { emailSchema } from "@/schemas/auth";
import { auth } from "@repo/auth";
import { prisma } from "@repo/db";

export async function deleteAccount(formData: FormData) {
  const rawData = {
    email: formData.get("email") as string,
  };

  // Check if all required fields are provided
  if (!rawData.email) {
    return {
      error: "Email is required",
      success: false,
    };
  }

  const validationResult = emailSchema.safeParse(rawData);
  if (!validationResult.success) {
    return {
      error: validationResult.error.issues[0]?.message || "Invalid email",
      success: false,
    };
  }

  const { email } = validationResult.data;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        error: "Your session has expired. Please log in again.",
        success: false,
      };
    }

    // Verify the email matches the session user's email
    if (email !== session.user.email) {
      return {
        error: "Please enter your correct email address.",
        success: false,
      };
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        deletedAt: new Date(),
        status: "INACTIVE",
      },
    });

    if (!user) {
      return {
        error: "Unable to process request. Please try again.",
        success: false,
      };
    }

    return {
      message: "Account deletion initiated successfully.",
      success: true,
    };
  } catch (error) {
    console.error("deleteAccount error:", error);
    return {
      error: "An unexpected error occurred. Please try again later.",
      success: false,
    };
  }
}
