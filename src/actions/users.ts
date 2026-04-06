"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { createUserSchema, updateUserSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function getUsers() {
  await requireAdmin();
  return prisma.user.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      isActive: true,
      entryDate: true,
      exitDate: true,
      createdAt: true,
      workSchedules: {
        orderBy: { validFrom: "desc" },
        take: 1,
      },
      initialBalance: true,
    },
    orderBy: { displayName: "asc" },
  });
}

export async function createUser(data: {
  username: string;
  displayName: string;
  password: string;
  role: "USER" | "ADMIN";
  weeklyHours: number;
  workingDays: string[];
}) {
  await requireAdmin();
  const parsed = createUserSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Check username uniqueness
  const existing = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });
  if (existing) {
    return { success: false, error: "Benutzername bereits vergeben" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const user = await prisma.user.create({
    data: {
      username: parsed.data.username,
      displayName: parsed.data.displayName,
      passwordHash,
      role: parsed.data.role,
      mustChangePassword: true,
    },
  });

  // Create work schedule
  const numDays = parsed.data.workingDays.length;
  const dailyDefault = Math.round((parsed.data.weeklyHours / numDays) * 100) / 100;
  const dailyHoursMap: Record<string, number> = {};
  for (const day of parsed.data.workingDays) {
    dailyHoursMap[day] = dailyDefault;
  }

  await prisma.workSchedule.create({
    data: {
      userId: user.id,
      validFrom: new Date(),
      weeklyHours: parsed.data.weeklyHours,
      workingDays: JSON.stringify(parsed.data.workingDays),
      dailyHours: JSON.stringify(dailyHoursMap),
    },
  });

  // Create initial balance
  await prisma.initialBalance.create({
    data: {
      userId: user.id,
      asOfDate: new Date(),
      overtimeHours: 0,
    },
  });

  revalidatePath("/admin/users");
  return { success: true, userId: user.id };
}

export async function updateUser(
  userId: number,
  data: {
    displayName?: string;
    role?: "USER" | "ADMIN";
    isActive?: boolean;
    weeklyHours?: number;
    workingDays?: string[];
  },
) {
  await requireAdmin();
  const parsed = updateUserSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      displayName: parsed.data.displayName,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    },
  });

  // Update work schedule if hours/days changed
  if (parsed.data.weeklyHours !== undefined || parsed.data.workingDays !== undefined) {
    const currentSchedule = await prisma.workSchedule.findFirst({
      where: { userId },
      orderBy: { validFrom: "desc" },
    });

    const weeklyHours = parsed.data.weeklyHours ?? currentSchedule?.weeklyHours ?? 30;
    const workingDays = parsed.data.workingDays ??
      (currentSchedule ? JSON.parse(currentSchedule.workingDays) : ["MO", "TU", "WE", "TH", "FR"]);

    const numDays = workingDays.length;
    const dailyDefault = Math.round((weeklyHours / numDays) * 100) / 100;
    const dailyHoursMap: Record<string, number> = {};
    for (const day of workingDays) {
      dailyHoursMap[day] = dailyDefault;
    }

    // Close current schedule
    if (currentSchedule) {
      await prisma.workSchedule.update({
        where: { id: currentSchedule.id },
        data: { validTo: new Date() },
      });
    }

    await prisma.workSchedule.create({
      data: {
        userId,
        validFrom: new Date(),
        weeklyHours,
        workingDays: JSON.stringify(workingDays),
        dailyHours: JSON.stringify(dailyHoursMap),
      },
    });
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function resetUserPassword(userId: number, newPassword: string) {
  await requireAdmin();
  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hash, mustChangePassword: true },
  });
  return { success: true };
}

export async function setInitialBalance(userId: number, overtimeHours: number) {
  await requireAdmin();
  await prisma.initialBalance.upsert({
    where: { userId },
    create: { userId, asOfDate: new Date(), overtimeHours },
    update: { overtimeHours },
  });
  revalidatePath("/admin/users");
  return { success: true };
}
