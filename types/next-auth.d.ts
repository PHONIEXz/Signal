import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    passwordVersion?: number;
  }
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
