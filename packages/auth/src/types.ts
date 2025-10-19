import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      createdAt: Date;
    } & DefaultSession["user"];
  }

  interface User {
    firstName: string;
    lastName: string;
    createdAt: Date;
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    firstName: string;
    lastName: string;
    createdAt: Date;
  }
}
