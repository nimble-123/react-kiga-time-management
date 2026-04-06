"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { dayEntryCreateSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function getDayEntries(month: string) {
  const user = await requireAuth();
  const [year, m] = month.split("-").map(Number);
  const startDate = new Date(year, m - 1, 1);
  const endDate = new Date(year, m, 0, 23, 59, 59);

  return prisma.dayEntry.findMany({
    where: {
      userId: parseInt(user.id),
      workDate: { gte: startDate, lte: endDate },
    },
    include: { timeBlocks: true },
    orderBy: { workDate: "asc" },
  });
}

export async function getDayEntriesForWeek(weekStart: string) {
  const user = await requireAuth();
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  end.setHours(23, 59, 59);

  return prisma.dayEntry.findMany({
    where: {
      userId: parseInt(user.id),
      workDate: { gte: start, lte: end },
    },
    include: { timeBlocks: true },
    orderBy: { workDate: "asc" },
  });
}

export async function getDayEntriesForUser(userId: number, month: string) {
  const admin = await requireAuth();
  if (admin.role !== "ADMIN") throw new Error("Keine Berechtigung");

  const [year, m] = month.split("-").map(Number);
  const startDate = new Date(year, m - 1, 1);
  const endDate = new Date(year, m, 0, 23, 59, 59);

  return prisma.dayEntry.findMany({
    where: {
      userId,
      workDate: { gte: startDate, lte: endDate },
    },
    include: { timeBlocks: true },
    orderBy: { workDate: "asc" },
  });
}

export async function saveDayEntry(data: {
  workDate: string;
  marker: string | null;
  note?: string | null;
  timeBlocks: { blockType: string; startTime: string; endTime: string }[];
}) {
  const user = await requireAuth();
  const parsed = dayEntryCreateSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const userId = parseInt(user.id);
  const workDate = new Date(parsed.data.workDate + "T00:00:00");

  // Check if month is locked (approved)
  const year = workDate.getFullYear();
  const month = workDate.getMonth() + 1;
  const review = await prisma.monthlyReview.findUnique({
    where: { userId_year_month: { userId, year, month } },
  });
  if (review?.status === "APPROVED") {
    return { success: false, error: "Monat ist bereits genehmigt" };
  }
  if (review?.status === "SUBMITTED") {
    return { success: false, error: "Monat ist eingereicht und kann nicht bearbeitet werden" };
  }

  // Upsert day entry
  const existing = await prisma.dayEntry.findUnique({
    where: { userId_workDate: { userId, workDate } },
  });

  if (existing) {
    // Delete old time blocks
    await prisma.timeBlock.deleteMany({ where: { dayEntryId: existing.id } });

    // Update entry
    await prisma.dayEntry.update({
      where: { id: existing.id },
      data: {
        marker: parsed.data.marker,
        note: parsed.data.note ?? null,
        timeBlocks: {
          create: parsed.data.timeBlocks.map((tb) => ({
            blockType: tb.blockType,
            startTime: tb.startTime,
            endTime: tb.endTime,
          })),
        },
      },
    });
  } else {
    await prisma.dayEntry.create({
      data: {
        userId,
        workDate,
        marker: parsed.data.marker,
        note: parsed.data.note ?? null,
        timeBlocks: {
          create: parsed.data.timeBlocks.map((tb) => ({
            blockType: tb.blockType,
            startTime: tb.startTime,
            endTime: tb.endTime,
          })),
        },
      },
    });
  }

  revalidatePath("/time-entry");
  revalidatePath("/monthly");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteDayEntry(workDate: string) {
  const user = await requireAuth();
  const userId = parseInt(user.id);
  const date = new Date(workDate + "T00:00:00");

  // Check if month is locked
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const review = await prisma.monthlyReview.findUnique({
    where: { userId_year_month: { userId, year, month } },
  });
  if (review?.status === "APPROVED" || review?.status === "SUBMITTED") {
    return { success: false, error: "Monat ist gesperrt" };
  }

  await prisma.dayEntry.deleteMany({
    where: { userId, workDate: date },
  });

  revalidatePath("/time-entry");
  revalidatePath("/monthly");
  return { success: true };
}
