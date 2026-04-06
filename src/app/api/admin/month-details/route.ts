import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDay, formatDateToISO, getMonday } from "@/lib/calculations";
import { getWorkSchedule, getHolidaySet, getMonthSummary } from "@/actions/data";
import type { TimeBlockData } from "@/types";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  const userId = parseInt(request.nextUrl.searchParams.get("userId") ?? "0");
  const year = parseInt(request.nextUrl.searchParams.get("year") ?? "0");
  const month = parseInt(request.nextUrl.searchParams.get("month") ?? "0");

  if (!userId || !year || !month) {
    return NextResponse.json({ error: "Parameter fehlen" }, { status: 400 });
  }

  const schedule = await getWorkSchedule(userId, new Date(year, month - 1, 15));
  if (!schedule) {
    return NextResponse.json({ error: "Kein Arbeitszeitmodell" }, { status: 404 });
  }

  const holidayStrings = await getHolidaySet(year, month);
  const holidays = new Set(holidayStrings);

  // Fetch entries
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const entries = await prisma.dayEntry.findMany({
    where: { userId, workDate: { gte: startDate, lte: endDate } },
    include: { timeBlocks: true },
    orderBy: { workDate: "asc" },
  });

  const entryMap = new Map<string, typeof entries[0]>();
  for (const e of entries) entryMap.set(formatDateToISO(e.workDate), e);

  // Build day-by-day data grouped by week
  const daysInMonth = new Date(year, month, 0).getDate();
  interface DayInfo {
    date: string;
    weekday: string;
    marker: string | null;
    note: string | null;
    blocks: string;
    ist: number;
    soll: number;
    delta: number;
    isHoliday: boolean;
  }

  const allDays: DayInfo[] = [];
  const dayNames = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const dateStr = formatDateToISO(date);
    const entry = entryMap.get(dateStr);
    const blocks: TimeBlockData[] = entry?.timeBlocks.map((tb) => ({
      blockType: tb.blockType as TimeBlockData["blockType"],
      startTime: tb.startTime,
      endTime: tb.endTime,
    })) ?? [];

    const calc = calculateDay(date, entry?.marker ?? null, blocks, schedule, holidays);

    // Compact blocks string
    const blocksSummary = blocks.map((b) => {
      const prefix = b.blockType === "PAUSE" ? "P" : b.blockType === "DB" ? "DB" : b.blockType === "VORBEREITUNG" ? "V" : "T";
      return `${prefix} ${b.startTime}-${b.endTime}`;
    }).join(", ");

    allDays.push({
      date: `${dayNames[date.getDay()]} ${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.`,
      weekday: dayNames[date.getDay()],
      marker: entry?.marker ?? null,
      note: entry?.note ?? null,
      blocks: blocksSummary,
      ist: calc.ist,
      soll: calc.soll,
      delta: calc.delta,
      isHoliday: holidays.has(dateStr),
    });
  }

  // Group by week
  interface WeekGroup {
    days: DayInfo[];
    ist: number;
    soll: number;
    delta: number;
  }

  const weeks: WeekGroup[] = [];
  let currentWeek: DayInfo[] = [];
  let prevMonday = "";

  for (const day of allDays) {
    // Parse back to date for monday calc
    const parts = day.date.split(" ")[1].split(".");
    const dayDate = new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]));
    const monday = formatDateToISO(getMonday(dayDate));

    if (monday !== prevMonday && currentWeek.length > 0) {
      const wIst = currentWeek.reduce((s, d) => s + d.ist, 0);
      const wSoll = currentWeek.reduce((s, d) => s + d.soll, 0);
      weeks.push({ days: currentWeek, ist: wIst, soll: wSoll, delta: Math.round((wIst - wSoll) * 100) / 100 });
      currentWeek = [];
    }
    prevMonday = monday;
    currentWeek.push(day);
  }
  if (currentWeek.length > 0) {
    const wIst = currentWeek.reduce((s, d) => s + d.ist, 0);
    const wSoll = currentWeek.reduce((s, d) => s + d.soll, 0);
    weeks.push({ days: currentWeek, ist: wIst, soll: wSoll, delta: Math.round((wIst - wSoll) * 100) / 100 });
  }

  const summary = await getMonthSummary(userId, year, month);

  return NextResponse.json({
    weeks,
    summary: {
      ist: summary.ist,
      soll: summary.soll,
      delta: summary.delta,
      overtimeAccount: Math.round((summary.carryOver + summary.delta) * 100) / 100,
      carryOver: summary.carryOver,
    },
    schedule: {
      weeklyHours: schedule.weeklyHours,
      workingDays: schedule.workingDays,
    },
  });
}
