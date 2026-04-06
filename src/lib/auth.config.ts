import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

/**
 * Auth config WITHOUT heavy dependencies (bcrypt, prisma).
 * Used by middleware (Edge Runtime) where Node.js modules are unavailable.
 * The actual authorize() logic lives in auth.ts.
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Benutzername", type: "text" },
        password: { label: "Passwort", type: "password" },
      },
      // authorize is defined in auth.ts (server-only)
      authorize: () => null,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
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
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname === "/login";
      const isAuthApi = nextUrl.pathname.startsWith("/api/auth");

      if (isAuthApi) return true;

      if (!isLoggedIn && !isLoginPage) {
        return Response.redirect(new URL("/login", nextUrl));
      }

      if (isLoggedIn && isLoginPage) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      if (nextUrl.pathname.startsWith("/admin")) {
        const role = auth?.user?.role;
        if (role !== "ADMIN") {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
      }

      return true;
    },
  },
};
