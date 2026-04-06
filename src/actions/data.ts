"use server";

import { prisma } from "@/lib/prisma";
import { calculateDay, formatDateToISO } from "@/lib/calculations";
import type { WorkScheduleData, TimeBlockData, MonthSummary } from "@/types";

/**
 * Get the work schedule for a user valid at the given date.
 */
export async function getWorkSchedule(userId: number, date: Date): Promise<WorkScheduleData | null> {
  const schedule = await prisma.workSchedule.findFirst({
    where: {
      userId,
      validFrom: { lte: date },
      OR: [
        { validTo: null },
        { validTo: { gte: date } },
      ],
    },
    orderBy: { validFrom: "desc" },
  });

  if (!schedule) return null;

  return {
    weeklyHours: schedule.weeklyHours,
    workingDays: JSON.parse(schedule.workingDays),
    dailyHours: schedule.dailyHours ? JSON.parse(schedule.dailyHours) : null,
  };
}

/**
 * Get holiday dates as a Set of ISO strings for a given month.
 */
export async function getHolidaySet(year: number, month: number): Promise<string[]> {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);
  const holidays = await prisma.holiday.findMany({
    where: { date: { gte: start, lte: end } },
  });
  return holidays.map((h) => formatDateToISO(h.date));
}

/**
 * Check if a date falls within the user's employment period.
 */
async function isWithinEmployment(userId: number, date: Date): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { entryDate: true, exitDate: true },
  });
  if (!user) return false;
  if (user.entryDate && date < user.entryDate) return false;
  if (user.exitDate && date > user.exitDate) return false;
  return true;
}

/**
 * Get the employment date range for a user.
 */
async function getEmploymentRange(userId: number): Promise<{ entryDate: Date | null; exitDate: Date | null }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { entryDate: true, exitDate: true },
  });
  return { entryDate: user?.entryDate ?? null, exitDate: user?.exitDate ?? null };
}

/**
 * Calculate a single month's delta for carry-over calculation.
 */
async function calcMonthDelta(
  userId: number,
  year: number,
  month: number,
  employment: { entryDate: Date | null; exitDate: Date | null },
): Promise<number> {
  const schedule = await getWorkSchedule(userId, new Date(year, month - 1, 15));
  if (!schedule) return 0;

  const holidayStrings = await getHolidaySet(year, month);
  const holidayDates = new Set(holidayStrings);

  const mStart = new Date(year, month - 1, 1);
  const mEnd = new Date(year, month, 0, 23, 59, 59);
  const entries = await prisma.dayEntry.findMany({
    where: { userId, workDate: { gte: mStart, lte: mEnd } },
    include: { timeBlocks: true },
  });

  const entryMap = new Map<string, typeof entries[0]>();
  for (const e of entries) entryMap.set(formatDateToISO(e.workDate), e);

  let totalIst = 0;
  let totalSoll = 0;
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);

    // Skip days outside employment
    if (employment.entryDate && date < employment.entryDate) continue;
    if (employment.exitDate && date > employment.exitDate) continue;

    const dateStr = formatDateToISO(date);
    const entry = entryMap.get(dateStr);
    const blocks: TimeBlockData[] = entry?.timeBlocks.map((tb) => ({
      blockType: tb.blockType as TimeBlockData["blockType"],
      startTime: tb.startTime,
      endTime: tb.endTime,
    })) ?? [];

    const calc = calculateDay(date, entry?.marker ?? null, blocks, schedule, holidayDates);
    totalIst += calc.ist;
    totalSoll += calc.soll;
  }

  return Math.round((totalIst - totalSoll) * 100) / 100;
}

/**
 * Calculate monthly summary for a user.
 */
export async function getMonthSummary(
  userId: number,
  year: number,
  month: number,
): Promise<MonthSummary> {
  const schedule = await getWorkSchedule(userId, new Date(year, month - 1, 15));
  if (!schedule) return { ist: 0, soll: 0, delta: 0, carryOver: 0 };

  const employment = await getEmploymentRange(userId);
  const holidayStrings = await getHolidaySet(year, month);
  const holidayDates = new Set(holidayStrings);

  // Get entries for this month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const entries = await prisma.dayEntry.findMany({
    where: { userId, workDate: { gte: startDate, lte: endDate } },
    include: { timeBlocks: true },
  });

  const entryMap = new Map<string, typeof entries[0]>();
  for (const e of entries) entryMap.set(formatDateToISO(e.workDate), e);

  let totalIst = 0;
  let totalSoll = 0;
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);

    // Skip days outside employment
    if (employment.entryDate && date < employment.entryDate) continue;
    if (employment.exitDate && date > employment.exitDate) continue;

    const dateStr = formatDateToISO(date);
    const entry = entryMap.get(dateStr);
    const blocks: TimeBlockData[] = entry?.timeBlocks.map((tb) => ({
      blockType: tb.blockType as TimeBlockData["blockType"],
      startTime: tb.startTime,
      endTime: tb.endTime,
    })) ?? [];

    const calc = calculateDay(date, entry?.marker ?? null, blocks, schedule, holidayDates);
    totalIst += calc.ist;
    totalSoll += calc.soll;
  }

  const delta = Math.round((totalIst - totalSoll) * 100) / 100;

  // Calculate carry-over from initial balance + all previous months
  const initialBalance = await prisma.initialBalance.findUnique({ where: { userId } });
  const startOvertimeHours = initialBalance?.overtimeHours ?? 0;
  const balanceStart = initialBalance?.asOfDate ?? new Date(year, 0, 1);

  let carryOver = startOvertimeHours;
  let cy = balanceStart.getFullYear();
  let cm = balanceStart.getMonth() + 1;

  while (cy < year || (cy === year && cm < month)) {
    carryOver += await calcMonthDelta(userId, cy, cm, employment);
    cm++;
    if (cm > 12) { cm = 1; cy++; }
  }

  return {
    ist: Math.round(totalIst * 100) / 100,
    soll: Math.round(totalSoll * 100) / 100,
    delta,
    carryOver: Math.round(carryOver * 100) / 100,
  };
}
