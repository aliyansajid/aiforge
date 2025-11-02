import z from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const teamSchema = z.object({
  name: z
    .string({ error: "Team name is required" })
    .min(3, {
      message: "Team name must be at least 3 characters",
    })
    .max(50, {
      message: "Team name must not be longer than 50 characters",
    })
    .regex(/^[a-zA-Z\s]+$/, {
      message: "Team name must contain only alphabetic characters and spaces",
    }),
  image: z
    .any()
    .refine((file) => !file || file instanceof File, "Image must be a file")
    .optional()
    .refine(
      (file) => !file || file.size <= MAX_FILE_SIZE,
      `Max image size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`
    )
    .refine(
      (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Only .jpg, .jpeg, .png and .webp formats are supported"
    ),
});

export const projectSchema = z.object({
  name: z
    .string({ message: "Project name is required" })
    .min(3, {
      message: "Project name must be at least 3 characters",
    })
    .max(50, {
      message: "Project name must not be longer than 50 characters",
    })
    .regex(/^[a-zA-Z0-9\s]+$/, {
      message:
        "Project name must contain only alphanumeric characters and spaces",
    }),
});
