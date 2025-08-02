import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      firstName?: string | null;
      lastName?: string | null;
      createdAt?: Date | string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    firstName?: string | null;
    lastName?: string | null;
    createdAt?: Date | string | null;
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    firstName?: string | null;
    lastName?: string | null;
    createdAt?: Date | string | null;
  }
}
