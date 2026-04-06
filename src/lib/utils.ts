import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a Date to German locale short date: "Mo 03.11."
 */
export function formatDateShort(date: Date): string {
  const days = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const day = days[date.getDay()];
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${day} ${d}.${m}.`;
}

/**
 * Format a Date to German locale full date: "Montag, 03.11.2025"
 */
export function formatDateFull(date: Date): string {
  const days = [
    "Sonntag", "Montag", "Dienstag", "Mittwoch",
    "Donnerstag", "Freitag", "Samstag",
  ];
  const day = days[date.getDay()];
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${day}, ${d}.${m}.${y}`;
}

/**
 * Format a month/year to German: "November 2025"
 */
export function formatMonthYear(year: number, month: number): string {
  const months = [
    "Januar", "Februar", "Maerz", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
  ];
  return `${months[month - 1]} ${year}`;
}

/**
 * Parse user-typed time input to HH:MM format.
 * Accepts: "8" -> "08:00", "14" -> "14:00", "830" -> "08:30",
 *          "0830" -> "08:30", "8:30" -> "08:30", "08:30" -> "08:30"
 */
export function parseTimeInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const cleaned = trimmed.replace(/[^0-9:]/g, "");

  // Format with colon: "H:MM" or "HH:MM"
  if (cleaned.includes(":")) {
    const parts = cleaned.split(":");
    if (parts.length !== 2) return null;
    const h = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  // Digits only
  const digits = cleaned;

  if (digits.length === 1) {
    // "8" -> "08:00"
    const h = parseInt(digits);
    if (h >= 0 && h <= 9) return `0${h}:00`;
    return null;
  }

  if (digits.length === 2) {
    // "08" -> "08:00", "14" -> "14:00"
    const h = parseInt(digits);
    if (h >= 0 && h <= 23) return `${String(h).padStart(2, "0")}:00`;
    return null;
  }

  if (digits.length === 3) {
    // "830" -> "08:30", "700" -> "07:00"
    const h = parseInt(digits[0]);
    const m = parseInt(digits.slice(1));
    if (h >= 0 && h <= 9 && m >= 0 && m <= 59) {
      return `0${h}:${String(m).padStart(2, "0")}`;
    }
    return null;
  }

  if (digits.length === 4) {
    // "0830" -> "08:30", "1430" -> "14:30"
    const h = parseInt(digits.slice(0, 2));
    const m = parseInt(digits.slice(2));
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
    return null;
  }

  return null;
}
