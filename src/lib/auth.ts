import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      displayName: string;
      role: "USER" | "ADMIN";
    };
  }

  interface User {
    id: string;
    username: string;
    displayName: string;
    role: "USER" | "ADMIN";
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Benutzername", type: "text" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );

        if (!isValid) {
          return null;
        }

        return {
          id: String(user.id),
          username: user.username,
          displayName: user.displayName,
          role: user.role as "USER" | "ADMIN",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as { username: string }).username;
        token.displayName = (user as { displayName: string }).displayName;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const user = session.user as any;
      user.id = token.id as string;
      user.username = token.username as string;
      user.displayName = token.displayName as string;
      user.role = token.role as string;
      return session;
    },
  },
});

/**
 * Get the current session user or throw if not authenticated.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Nicht authentifiziert");
  }
  return session.user;
}

/**
 * Get the current session user and require ADMIN role.
 */
export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    throw new Error("Keine Berechtigung");
  }
  return user;
}
