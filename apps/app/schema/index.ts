import z from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];
const MAX_MODEL_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
const MAX_REQUIREMENTS_SIZE = 1024 * 1024; // 1MB
const MAX_INFERENCE_SIZE = 512 * 1024; // 512KB

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

export const endpointSchema = z
  .object({
    name: z
      .string({ message: "Endpoint name is required" })
      .min(3, {
        message: "Endpoint name must be at least 3 characters",
      })
      .max(50, {
        message: "Endpoint name must not be longer than 50 characters",
      })
      .regex(/^[a-zA-Z0-9\s-]+$/, {
        message:
          "Endpoint name must contain only alphanumeric characters, spaces, and hyphens",
      }),

    description: z
      .string()
      .max(500, {
        message: "Description must not be longer than 500 characters",
      })
      .optional()
      .or(z.literal("")),

    // Deployment type
    deploymentType: z.enum(["SINGLE_FILE", "ZIP_ARCHIVE", "GIT_REPOSITORY"]),

    // Single file deployment fields
    modelFile: z
      .any()
      .optional()
      .refine(
        (file) => !file || file instanceof File,
        "Model file must be a valid file"
      )
      .refine((file) => !file || file.size > 0, "Model file cannot be empty")
      .refine(
        (file) => !file || file.size <= MAX_MODEL_SIZE,
        `Max model size is ${MAX_MODEL_SIZE / 1024 / 1024 / 1024}GB`
      )
      .refine((file) => {
        if (!file) return true;
        const extension = file.name.split(".").pop()?.toLowerCase();
        return ["h5", "keras", "pt", "pth", "onnx", "pkl", "joblib"].includes(
          extension || ""
        );
      }, "Supported formats: .h5, .keras (TensorFlow), .pt, .pth (PyTorch), .onnx (ONNX), .pkl, .joblib (Scikit-learn)"),

    requirementsFile: z
      .any()
      .optional()
      .refine(
        (file) => !file || file instanceof File,
        "requirements.txt must be a valid file"
      )
      .refine(
        (file) => !file || file.size > 0,
        "requirements.txt cannot be empty"
      )
      .refine(
        (file) => !file || file.size <= MAX_REQUIREMENTS_SIZE,
        `Max requirements.txt size is ${MAX_REQUIREMENTS_SIZE / 1024}KB`
      ),

    inferenceFile: z
      .any()
      .optional()
      .refine(
        (file) => !file || file instanceof File,
        "inference.py must be a valid file"
      )
      .refine((file) => !file || file.size > 0, "inference.py cannot be empty")
      .refine(
        (file) => !file || file.size <= MAX_INFERENCE_SIZE,
        `Max inference.py size is ${MAX_INFERENCE_SIZE / 1024}KB`
      ),

    // ZIP archive deployment
    archiveFile: z
      .any()
      .optional()
      .refine(
        (file) => !file || file instanceof File,
        "Archive must be a valid file"
      )
      .refine((file) => !file || file.size > 0, "Archive file cannot be empty")
      .refine(
        (file) => !file || file.size <= 500 * 1024 * 1024, // 500MB
        "Max archive size is 500MB"
      )
      .refine((file) => {
        if (!file) return true;
        const extension = file.name.split(".").pop()?.toLowerCase();
        return extension === "zip";
      }, "Archive must be a .zip file"),

    // Git repository deployment
    gitRepoUrl: z.string().optional(),
    gitBranch: z.string().optional(),
    gitCommit: z.string().optional(),
    gitAccessToken: z.string().optional(),

    accessType: z.enum(["PUBLIC", "PRIVATE", "PAID"], {
      message: "Please select an access type",
    }),

    inputType: z.enum(["JSON", "IMAGE", "TEXT", "AUDIO", "VIDEO", "FILE"], {
      message: "Please select an input type",
    }),

    pricePerRequest: z
      .string()
      .optional()
      .refine((val) => {
        if (!val || val === "") return true;
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      }, "Price per request must be a valid positive number"),

    pricePerMonth: z
      .string()
      .optional()
      .refine((val) => {
        if (!val || val === "") return true;
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      }, "Monthly price must be a valid positive number"),
  })
  .refine(
    (data) => {
      // Validate based on deployment type
      if (data.deploymentType === "SINGLE_FILE") {
        return (
          data.modelFile instanceof File &&
          data.requirementsFile instanceof File
        );
      }
      if (data.deploymentType === "ZIP_ARCHIVE") {
        return data.archiveFile instanceof File;
      }
      if (data.deploymentType === "GIT_REPOSITORY") {
        return data.gitRepoUrl && data.gitRepoUrl.trim().length > 0;
      }
      return true;
    },
    {
      message: "Please provide required files for the selected deployment type",
      path: ["deploymentType"],
    }
  )
  .refine(
    (data) => {
      if (data.accessType === "PAID") {
        return (
          (data.pricePerRequest && data.pricePerRequest !== "") ||
          (data.pricePerMonth && data.pricePerMonth !== "")
        );
      }
      return true;
    },
    {
      message: "For paid endpoints, please specify at least one pricing option",
      path: ["pricePerRequest"],
    }
  );
