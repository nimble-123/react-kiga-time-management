"use server";

import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { changePasswordSchema } from "@/lib/validations";
import { AuthError } from "next-auth";

export async function loginAction(username: string, password: string) {
  try {
    await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: "Benutzername oder Passwort falsch" };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function changePasswordAction(formData: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const user = await requireAuth();
  const parsed = changePasswordSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: parseInt(user.id) },
  });

  if (!dbUser) {
    return { success: false, error: "Benutzer nicht gefunden" };
  }

  const isValid = await bcrypt.compare(parsed.data.currentPassword, dbUser.passwordHash);
  if (!isValid) {
    return { success: false, error: "Aktuelles Passwort ist falsch" };
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
    },
  });

  return { success: true };
}
