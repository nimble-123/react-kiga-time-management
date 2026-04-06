import { describe, it, expect } from "vitest";
import {
  parseTime,
  timeDurationHours,
  calculateDailyIst,
  calculateDailySoll,
  calculateDay,
  getWeekdayCode,
  getMonday,
  getWeekDates,
  getWeeksInMonth,
  formatDateToISO,
  parseISODate,
  formatHoursDelta,
  formatHours,
} from "@/lib/calculations";
import type { TimeBlockData, WorkScheduleData } from "@/types";

// --- parseTime ---
describe("parseTime", () => {
  it("parses 08:00 to 480 minutes", () => {
    expect(parseTime("08:00")).toBe(480);
  });
  it("parses 13:30 to 810 minutes", () => {
    expect(parseTime("13:30")).toBe(810);
  });
  it("parses 00:00 to 0", () => {
    expect(parseTime("00:00")).toBe(0);
  });
  it("parses 23:59 to 1439", () => {
    expect(parseTime("23:59")).toBe(1439);
  });
});

// --- timeDurationHours ---
describe("timeDurationHours", () => {
  it("calculates 08:00-13:00 as 5.0 hours", () => {
    expect(timeDurationHours("08:00", "13:00")).toBe(5);
  });
  it("calculates 07:00-13:30 as 6.5 hours", () => {
    expect(timeDurationHours("07:00", "13:30")).toBe(6.5);
  });
  it("returns 0 if end <= start", () => {
    expect(timeDurationHours("13:00", "08:00")).toBe(0);
  });
  it("returns 0 if same time", () => {
    expect(timeDurationHours("08:00", "08:00")).toBe(0);
  });
});

// --- calculateDailyIst ---
describe("calculateDailyIst", () => {
  const workBlocks: TimeBlockData[] = [
    { blockType: "TAETIGKEIT", startTime: "08:00", endTime: "13:00" },
  ];

  it("returns SOLL for URLAUB marker", () => {
    expect(calculateDailyIst("URLAUB", [], 6)).toBe(6);
  });

  it("returns SOLL for KRANK marker", () => {
    expect(calculateDailyIst("KRANK", [], 6)).toBe(6);
  });

  it("returns SOLL for FEIERTAG marker", () => {
    expect(calculateDailyIst("FEIERTAG", [], 6)).toBe(6);
  });

  it("returns 0 for UEBERSTD_ABBAU marker", () => {
    expect(calculateDailyIst("UEBERSTD_ABBAU", [], 6)).toBe(0);
  });

  it("calculates simple work block", () => {
    expect(calculateDailyIst(null, workBlocks, 6)).toBe(5);
  });

  it("calculates work minus pause", () => {
    const blocks: TimeBlockData[] = [
      { blockType: "TAETIGKEIT", startTime: "07:00", endTime: "13:00" },
      { blockType: "PAUSE", startTime: "09:30", endTime: "10:00" },
    ];
    expect(calculateDailyIst(null, blocks, 6)).toBe(5.5);
  });

  it("calculates multiple work blocks", () => {
    const blocks: TimeBlockData[] = [
      { blockType: "TAETIGKEIT", startTime: "07:00", endTime: "13:00" },
      { blockType: "DB", startTime: "17:00", endTime: "20:00" },
    ];
    expect(calculateDailyIst(null, blocks, 6)).toBe(9);
  });

  it("calculates Vorbereitung + Taetigkeit + DB - Pause", () => {
    const blocks: TimeBlockData[] = [
      { blockType: "TAETIGKEIT", startTime: "08:00", endTime: "12:00" },
      { blockType: "VORBEREITUNG", startTime: "12:00", endTime: "13:00" },
      { blockType: "DB", startTime: "16:00", endTime: "18:00" },
      { blockType: "PAUSE", startTime: "10:00", endTime: "10:30" },
    ];
    // Work: 4 + 1 + 2 = 7, Pause: 0.5, Net: 6.5
    expect(calculateDailyIst(null, blocks, 6)).toBe(6.5);
  });

  it("returns 0 for no blocks and no marker", () => {
    expect(calculateDailyIst(null, [], 6)).toBe(0);
  });
});

// --- calculateDailySoll ---
describe("calculateDailySoll", () => {
  const schedule: WorkScheduleData = {
    weeklyHours: 30,
    workingDays: ["MO", "TU", "WE", "TH", "FR"],
    dailyHours: { MO: 6, TU: 6, WE: 6, TH: 6, FR: 6 },
  };

  const holidays = new Set(["2025-12-25"]);

  it("returns 6 for a normal working day", () => {
    // Monday 2025-11-03
    expect(calculateDailySoll(new Date(2025, 10, 3), schedule, holidays)).toBe(6);
  });

  it("returns 0 for Saturday", () => {
    // Saturday 2025-11-01
    expect(calculateDailySoll(new Date(2025, 10, 1), schedule, holidays)).toBe(0);
  });

  it("returns 0 for Sunday", () => {
    // Sunday 2025-11-02
    expect(calculateDailySoll(new Date(2025, 10, 2), schedule, holidays)).toBe(0);
  });

  it("returns 0 for a holiday", () => {
    // Thursday 2025-12-25
    expect(calculateDailySoll(new Date(2025, 11, 25), schedule, holidays)).toBe(0);
  });

  it("uses equal distribution when dailyHours is null", () => {
    const s: WorkScheduleData = {
      weeklyHours: 30,
      workingDays: ["MO", "TU", "WE", "TH", "FR"],
      dailyHours: null,
    };
    expect(calculateDailySoll(new Date(2025, 10, 3), s, new Set())).toBe(6);
  });

  it("handles unequal daily distribution", () => {
    const s: WorkScheduleData = {
      weeklyHours: 20,
      workingDays: ["MO", "TU", "WE", "TH"],
      dailyHours: { MO: 8, TU: 4, WE: 4, TH: 4 },
    };
    // Monday
    expect(calculateDailySoll(new Date(2025, 10, 3), s, new Set())).toBe(8);
    // Tuesday
    expect(calculateDailySoll(new Date(2025, 10, 4), s, new Set())).toBe(4);
    // Friday (not a working day)
    expect(calculateDailySoll(new Date(2025, 10, 7), s, new Set())).toBe(0);
  });
});

// --- calculateDay ---
describe("calculateDay", () => {
  const schedule: WorkScheduleData = {
    weeklyHours: 30,
    workingDays: ["MO", "TU", "WE", "TH", "FR"],
    dailyHours: { MO: 6, TU: 6, WE: 6, TH: 6, FR: 6 },
  };
  const holidays = new Set<string>();
  const monday = new Date(2025, 10, 3); // Monday 2025-11-03

  it("calculates normal day with work blocks", () => {
    const blocks: TimeBlockData[] = [
      { blockType: "TAETIGKEIT", startTime: "08:00", endTime: "13:00" },
    ];
    const result = calculateDay(monday, null, blocks, schedule, holidays);
    expect(result).toEqual({ ist: 5, soll: 6, delta: -1 });
  });

  it("calculates URLAUB day", () => {
    const result = calculateDay(monday, "URLAUB", [], schedule, holidays);
    expect(result).toEqual({ ist: 6, soll: 6, delta: 0 });
  });

  it("calculates UEBERSTD_ABBAU day", () => {
    const result = calculateDay(monday, "UEBERSTD_ABBAU", [], schedule, holidays);
    expect(result).toEqual({ ist: 0, soll: 6, delta: -6 });
  });

  it("calculates weekend day", () => {
    const saturday = new Date(2025, 10, 1);
    const result = calculateDay(saturday, null, [], schedule, holidays);
    expect(result).toEqual({ ist: 0, soll: 0, delta: 0 });
  });
});

// --- Date utility functions ---
describe("getWeekdayCode", () => {
  it("returns MO for Monday", () => {
    expect(getWeekdayCode(new Date(2025, 10, 3))).toBe("MO");
  });
  it("returns FR for Friday", () => {
    expect(getWeekdayCode(new Date(2025, 10, 7))).toBe("FR");
  });
  it("returns SU for Sunday", () => {
    expect(getWeekdayCode(new Date(2025, 10, 2))).toBe("SU");
  });
});

describe("getMonday", () => {
  it("returns the same date for a Monday", () => {
    const mon = getMonday(new Date(2025, 10, 3));
    expect(mon.getDate()).toBe(3);
  });
  it("returns Monday for a Wednesday", () => {
    const mon = getMonday(new Date(2025, 10, 5));
    expect(mon.getDate()).toBe(3);
  });
  it("returns Monday for a Sunday", () => {
    const mon = getMonday(new Date(2025, 10, 9));
    expect(mon.getDate()).toBe(3);
  });
});

describe("getWeekDates", () => {
  it("returns 5 dates from Monday to Friday", () => {
    const dates = getWeekDates(new Date(2025, 10, 3));
    expect(dates).toHaveLength(5);
    expect(dates[0].getDay()).toBe(1); // Monday
    expect(dates[4].getDay()).toBe(5); // Friday
  });
});

describe("getWeeksInMonth", () => {
  it("returns correct weeks for November 2025", () => {
    const weeks = getWeeksInMonth(2025, 11);
    expect(weeks.length).toBeGreaterThanOrEqual(4);
    expect(weeks.length).toBeLessThanOrEqual(6);
  });
});

// --- Formatting ---
describe("formatDateToISO", () => {
  it("formats date correctly", () => {
    expect(formatDateToISO(new Date(2025, 10, 3))).toBe("2025-11-03");
  });
});

describe("parseISODate", () => {
  it("parses ISO date correctly", () => {
    const d = parseISODate("2025-11-03");
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(10);
    expect(d.getDate()).toBe(3);
  });
});

describe("formatHoursDelta", () => {
  it("formats positive delta", () => {
    expect(formatHoursDelta(2.5)).toBe("+2.50");
  });
  it("formats negative delta", () => {
    expect(formatHoursDelta(-1)).toBe("-1.00");
  });
  it("formats zero delta", () => {
    expect(formatHoursDelta(0)).toBe("+0.00");
  });
});

describe("formatHours", () => {
  it("formats hours", () => {
    expect(formatHours(6)).toBe("6.00");
  });
});
