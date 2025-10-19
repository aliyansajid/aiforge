import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      firstName: string;
      lastName: string;
      createdAt: Date | string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    firstName: string;
    lastName: string;
    createdAt: Date | string;
  }
}

declare module "next-auth/adapters" {
  interface AdapterUser {
    firstName: string;
    lastName: string;
    createdAt: Date | string;
  }
}
