import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@repo/db";
import bcrypt from "bcryptjs";
import Credentials from "next-auth/providers/credentials";
import { credentialsSchema } from "./validation";

export const { handlers, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID!,
      clientSecret: process.env.AUTH_GITHUB_SECRET!,
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Credentials({
      async authorize(credentials) {
        try {
          const parsed = credentialsSchema.safeParse(credentials);

          if (!parsed.success) {
            throw new Error("Invalid credentials");
          }

          const { email, password } = parsed.data;

          const user = await prisma.user.findUnique({
            where: { email },
            include: { roles: true },
          });

          if (!user || !user.password) {
            throw new Error("User not found or invalid credentials");
          }

          const isPasswordValid = await bcrypt.compare(password, user.password);
          if (!isPasswordValid) {
            throw new Error("Invalid password");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            roles: user.roles.map((r) => r.role),
          };
        } catch (error) {
          console.error("Credentials authorize error:", error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    session: ({ session, user }) => {
      return {
        ...session,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        },
      };
    },
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "database",
  },
});
