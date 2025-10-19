import { z } from "zod";
import { TeamRole } from "@repo/db";

export const createTeamSchema = z.object({
  name: z.string().min(3, "Team name must be at least 3 characters"),
  icon: z.string().min(1, "Icon is required"),
});

export const inviteMemberSchema = z.object({
  email: z.email("Please enter a valid email address"),
  role: z.enum(TeamRole, {
    error: () => ({ message: "Please select a valid role" }),
  }),
});
