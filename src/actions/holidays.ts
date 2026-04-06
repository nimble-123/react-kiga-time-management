"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { holidaySchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function getHolidays(year?: number) {
  if (year) {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59);
    return prisma.holiday.findMany({
      where: { date: { gte: start, lte: end } },
      orderBy: { date: "asc" },
    });
  }
  return prisma.holiday.findMany({ orderBy: { date: "asc" } });
}

export async function getHolidayDatesSet(year: number, month: number): Promise<Set<string>> {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  const holidays = await prisma.holiday.findMany({
    where: { date: { gte: start, lte: end } },
  });
  const set = new Set<string>();
  for (const h of holidays) {
    const d = h.date;
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    set.add(iso);
  }
  return set;
}

export async function createHoliday(data: { date: string; name: string }) {
  await requireAdmin();
  const parsed = holidaySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const date = new Date(parsed.data.date + "T00:00:00");

  try {
    await prisma.holiday.create({
      data: { date, name: parsed.data.name },
    });
  } catch {
    return { success: false, error: "Feiertag an diesem Datum existiert bereits" };
  }

  revalidatePath("/admin/holidays");
  return { success: true };
}

export async function deleteHoliday(id: number) {
  await requireAdmin();
  await prisma.holiday.delete({ where: { id } });
  revalidatePath("/admin/holidays");
  return { success: true };
}
