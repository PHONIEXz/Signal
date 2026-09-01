import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      const userId =
        user?.id ?? (typeof token.id === "string" ? token.id : null);

      if (!userId) {
        return null;
      }

      if (user) {
        const currentUser = await prisma.user.update({
          where: { id: userId },
          data: {
            sessionVersion: {
              increment: 1,
            },
          },
          select: {
            sessionVersion: true,
          },
        });

        token.id = userId;
        token.sessionVersion = currentUser.sessionVersion;
        return token;
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          sessionVersion: true,
        },
      });

      if (
        !currentUser ||
        currentUser.sessionVersion !== token.sessionVersion
      ) {
        return null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }

      return session;
    },
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.hashedPassword) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        );

        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});

