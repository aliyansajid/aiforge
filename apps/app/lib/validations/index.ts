import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().min(3, "Team name must be at least 3 characters"),
  icon: z.string().min(1, "Icon is required"),
});
