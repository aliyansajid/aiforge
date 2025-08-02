import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@repo/db";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { encode as defaultEncode } from "next-auth/jwt";
import { v4 as uuid } from "uuid";

// Create and configure the Prisma adapter for database integration
const adapter = PrismaAdapter(prisma);

// Export NextAuth handlers and utility functions
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter,

  // Configure authentication providers
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true, // Allow same email across providers
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      // Custom login handler using email/password
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        // Look up user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) {
          throw new Error("Invalid credentials.");
        }

        if (!user.password) {
          // Prevent credentials login if user registered with social login
          throw new Error(
            "This account uses social login. Please sign in with Google or GitHub"
          );
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid credentials.");
        }

        return user; // Successful login returns the user object
      },
    }),
  ],

  // Override default NextAuth pages
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },

  // JWT signing secret
  secret: process.env.AUTH_SECRET,

  // Database sessions
  session: {
    strategy: "database",
    maxAge: 7 * 24 * 60 * 60, // Session lasts 7 days
  },

  // Callback hooks to customize session and token logic
  callbacks: {
    // Modify JWT token before it’s stored
    async jwt({ token, account }) {
      if (account?.provider === "credentials") {
        token.credentials = true; // Flag for custom encode logic
      }
      return token;
    },

    // Add custom data to the session object
    async session({ session, user }) {
      if (user?.firstName) {
        session.user.name = `${user.firstName} ${user.lastName}`.trim();
        session.user.firstName = user.firstName;
        session.user.lastName = user.lastName;
        session.user.createdAt = user.createdAt;
      }
      return session;
    },
  },

  // Custom JWT encoding logic (used only when session strategy = "database")
  jwt: {
    encode: async function (params) {
      // For credentials login, manually create a database session
      if (params.token?.credentials) {
        const sessionToken = uuid();

        if (!params.token.sub) {
          throw new Error("No user ID found in token");
        }

        // Manually create a session in the database
        const createdSession = await adapter?.createSession?.({
          sessionToken,
          userId: params.token.sub,
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });

        if (!createdSession) {
          throw new Error("Failed to create session");
        }

        return sessionToken; // Return custom session token
      }

      // Default encoding for social logins
      return defaultEncode(params);
    },
  },
});
