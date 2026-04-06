import type {
  Marker,
  BlockType,
  TimeBlockData,
  DayCalculation,
  WorkScheduleData,
} from "@/types";
import { WEEKDAY_MAP } from "@/types";

/**
 * Parse "HH:MM" time string to total minutes since midnight.
 */
export function parseTime(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Calculate duration in hours between two HH:MM time strings.
 * Returns 0 if end <= start (no overnight support in V1).
 */
export function timeDurationHours(startTime: string, endTime: string): number {
  const startMin = parseTime(startTime);
  const endMin = parseTime(endTime);
  if (endMin <= startMin) return 0;
  return Math.round(((endMin - startMin) / 60) * 100) / 100;
}

/**
 * Calculate the daily IST (actual) hours based on marker and time blocks.
 */
export function calculateDailyIst(
  marker: Marker | string | null,
  timeBlocks: TimeBlockData[],
  dailySoll: number,
): number {
  // Absence markers: IST = SOLL
  if (marker === "URLAUB" || marker === "KRANK" || marker === "FEIERTAG") {
    return dailySoll;
  }

  // Overtime reduction: IST = 0
  if (marker === "UEBERSTD_ABBAU") {
    return 0;
  }

  // Normal: sum work blocks minus pause blocks
  let workMinutes = 0;
  let pauseMinutes = 0;

  for (const block of timeBlocks) {
    const startMin = parseTime(block.startTime);
    const endMin = parseTime(block.endTime);
    const duration = endMin > startMin ? endMin - startMin : 0;

    if (block.blockType === "PAUSE") {
      pauseMinutes += duration;
    } else {
      workMinutes += duration;
    }
  }

  const netMinutes = Math.max(0, workMinutes - pauseMinutes);
  return Math.round((netMinutes / 60) * 100) / 100;
}

/**
 * Get the weekday code (MO, TU, etc.) for a given date.
 */
export function getWeekdayCode(date: Date): string {
  const day = date.getDay(); // 0=Sun, 1=Mon, ...
  const codeMap: Record<number, string> = {
    0: "SU",
    1: "MO",
    2: "TU",
    3: "WE",
    4: "TH",
    5: "FR",
    6: "SA",
  };
  return codeMap[day];
}

/**
 * Calculate the daily SOLL (target) hours based on work schedule and holidays.
 */
export function calculateDailySoll(
  date: Date,
  schedule: WorkScheduleData,
  holidayDates: Set<string>,
): number {
  const dateStr = formatDateToISO(date);

  // Holiday -> SOLL = 0
  if (holidayDates.has(dateStr)) {
    return 0;
  }

  const weekdayCode = getWeekdayCode(date);

  // Not a working day -> SOLL = 0
  if (!schedule.workingDays.includes(weekdayCode)) {
    return 0;
  }

  // Specific daily hours configured
  if (schedule.dailyHours && schedule.dailyHours[weekdayCode] !== undefined) {
    return schedule.dailyHours[weekdayCode];
  }

  // Default: equal distribution
  return Math.round((schedule.weeklyHours / schedule.workingDays.length) * 100) / 100;
}

/**
 * Calculate daily IST, SOLL, Delta for a given day entry.
 */
export function calculateDay(
  date: Date,
  marker: Marker | string | null,
  timeBlocks: TimeBlockData[],
  schedule: WorkScheduleData,
  holidayDates: Set<string>,
): DayCalculation {
  const soll = calculateDailySoll(date, schedule, holidayDates);
  const ist = calculateDailyIst(marker, timeBlocks, soll);
  const delta = Math.round((ist - soll) * 100) / 100;

  return { ist, soll, delta };
}

/**
 * Format a Date to YYYY-MM-DD string (local time, no timezone shift).
 */
export function formatDateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parse a YYYY-MM-DD string to a Date (local time).
 */
export function parseISODate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Format hours as a signed string like "+2.50" or "-1.00".
 */
export function formatHoursDelta(hours: number): string {
  const sign = hours >= 0 ? "+" : "";
  return `${sign}${hours.toFixed(2)}`;
}

/**
 * Format hours as "6.00".
 */
export function formatHours(hours: number): string {
  return hours.toFixed(2);
}

/**
 * Get all dates of a given week (Monday to Friday).
 * weekStart should be a Monday.
 */
export function getWeekDates(weekStart: Date): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    dates.push(d);
  }
  return dates;
}

/**
 * Get the Monday of the week containing the given date.
 */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get all weeks (as Monday dates) in a given month.
 */
export function getWeeksInMonth(year: number, month: number): Date[] {
  const weeks: Date[] = [];
  const firstDay = new Date(year, month - 1, 1);
  let currentMonday = getMonday(firstDay);

  // Include the week if it contains any day of the target month
  while (true) {
    const friday = new Date(currentMonday);
    friday.setDate(currentMonday.getDate() + 4);

    // Stop if Monday is already in next month and Friday too
    if (currentMonday.getMonth() >= month && currentMonday.getFullYear() >= year) {
      break;
    }

    weeks.push(new Date(currentMonday));
    currentMonday.setDate(currentMonday.getDate() + 7);
  }

  return weeks;
}
