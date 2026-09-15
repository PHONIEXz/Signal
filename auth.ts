import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";
import { emailValue, sessionVersionMatches } from "@/lib/auth-policy";
import { findPasswordUser } from "@/lib/password-reset";
import { googleAuthConfig } from "@/lib/auth-providers";

const google = googleAuthConfig();

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const record = await prisma.user.findUnique({
          where: { id: user.id },
          select: { passwordVersion: true },
        });
        if (!record) return null;
        // Credentials carries the version checked alongside the password.
        token.passwordVersion = user.passwordVersion ?? record.passwordVersion;
        if (!sessionVersionMatches(token.passwordVersion, record.passwordVersion)) return null;
      } else {
        if (typeof token.id !== "string") return null;
        const record = await prisma.user.findUnique({
          where: { id: token.id },
          select: { passwordVersion: true },
        });
        if (!record || !sessionVersionMatches(token.passwordVersion, record.passwordVersion)) return null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
  providers: [
    ...(google ? [Google(google)] : []),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = emailValue(credentials?.email);
        if (!email || typeof credentials?.password !== "string") return null;
        const user = await findPasswordUser(email);

        if (!user || !user.hashedPassword) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        );

        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, passwordVersion: user.passwordVersion };
      },
    }),
  ],
});
