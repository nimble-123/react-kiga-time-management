import { describe, it, expect } from "vitest";
import { parseTimeInput, formatDateShort, formatMonthYear } from "@/lib/utils";

describe("parseTimeInput", () => {
  it("parses HH:MM format", () => {
    expect(parseTimeInput("08:00")).toBe("08:00");
    expect(parseTimeInput("23:59")).toBe("23:59");
  });

  it("parses H:MM format (single hour digit)", () => {
    expect(parseTimeInput("8:00")).toBe("08:00");
    expect(parseTimeInput("8:30")).toBe("08:30");
  });

  it("parses single digit as full hour", () => {
    expect(parseTimeInput("8")).toBe("08:00");
    expect(parseTimeInput("0")).toBe("00:00");
    expect(parseTimeInput("7")).toBe("07:00");
  });

  it("parses two digits as full hour", () => {
    expect(parseTimeInput("08")).toBe("08:00");
    expect(parseTimeInput("14")).toBe("14:00");
    expect(parseTimeInput("23")).toBe("23:00");
  });

  it("parses 3-digit shorthand", () => {
    expect(parseTimeInput("700")).toBe("07:00");
    expect(parseTimeInput("830")).toBe("08:30");
    expect(parseTimeInput("945")).toBe("09:45");
  });

  it("parses 4-digit shorthand", () => {
    expect(parseTimeInput("0700")).toBe("07:00");
    expect(parseTimeInput("1300")).toBe("13:00");
    expect(parseTimeInput("1453")).toBe("14:53");
  });

  it("handles whitespace", () => {
    expect(parseTimeInput(" 8 ")).toBe("08:00");
    expect(parseTimeInput(" 08:30 ")).toBe("08:30");
  });

  it("returns null for invalid input", () => {
    expect(parseTimeInput("abc")).toBeNull();
    expect(parseTimeInput("25:00")).toBeNull();
    expect(parseTimeInput("")).toBeNull();
    expect(parseTimeInput("24")).toBeNull();
    expect(parseTimeInput("12345")).toBeNull();
  });
});

describe("formatDateShort", () => {
  it("formats Monday correctly", () => {
    // Nov 3 2025 is a Monday
    const result = formatDateShort(new Date(2025, 10, 3));
    expect(result).toBe("Mo 03.11.");
  });

  it("formats Friday correctly", () => {
    const result = formatDateShort(new Date(2025, 10, 7));
    expect(result).toBe("Fr 07.11.");
  });
});

describe("formatMonthYear", () => {
  it("formats November 2025", () => {
    expect(formatMonthYear(2025, 11)).toBe("November 2025");
  });
  it("formats January 2026", () => {
    expect(formatMonthYear(2026, 1)).toBe("Januar 2026");
  });
});
