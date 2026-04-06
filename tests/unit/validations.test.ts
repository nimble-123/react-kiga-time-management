import { describe, it, expect } from "vitest";
import {
  timeStringSchema,
  blockTypeSchema,
  markerSchema,
  timeBlockSchema,
  dayEntryCreateSchema,
  loginSchema,
  changePasswordSchema,
  createUserSchema,
} from "@/lib/validations";

describe("timeStringSchema", () => {
  it("accepts valid HH:MM format", () => {
    expect(timeStringSchema.safeParse("08:00").success).toBe(true);
    expect(timeStringSchema.safeParse("23:59").success).toBe(true);
  });
  it("rejects invalid format", () => {
    expect(timeStringSchema.safeParse("8:00").success).toBe(false);
    expect(timeStringSchema.safeParse("abc").success).toBe(false);
    expect(timeStringSchema.safeParse("").success).toBe(false);
  });
});

describe("blockTypeSchema", () => {
  it("accepts valid block types", () => {
    expect(blockTypeSchema.safeParse("TAETIGKEIT").success).toBe(true);
    expect(blockTypeSchema.safeParse("VORBEREITUNG").success).toBe(true);
    expect(blockTypeSchema.safeParse("DB").success).toBe(true);
    expect(blockTypeSchema.safeParse("PAUSE").success).toBe(true);
  });
  it("rejects invalid type", () => {
    expect(blockTypeSchema.safeParse("INVALID").success).toBe(false);
  });
});

describe("markerSchema", () => {
  it("accepts valid markers and null", () => {
    expect(markerSchema.safeParse("URLAUB").success).toBe(true);
    expect(markerSchema.safeParse("KRANK").success).toBe(true);
    expect(markerSchema.safeParse("FEIERTAG").success).toBe(true);
    expect(markerSchema.safeParse("UEBERSTD_ABBAU").success).toBe(true);
    expect(markerSchema.safeParse(null).success).toBe(true);
  });
  it("rejects invalid marker", () => {
    expect(markerSchema.safeParse("INVALID").success).toBe(false);
  });
});

describe("timeBlockSchema", () => {
  it("accepts valid time block", () => {
    const result = timeBlockSchema.safeParse({
      blockType: "TAETIGKEIT",
      startTime: "08:00",
      endTime: "13:00",
    });
    expect(result.success).toBe(true);
  });
  it("rejects when endTime before startTime", () => {
    const result = timeBlockSchema.safeParse({
      blockType: "TAETIGKEIT",
      startTime: "13:00",
      endTime: "08:00",
    });
    expect(result.success).toBe(false);
  });
});

describe("dayEntryCreateSchema", () => {
  it("accepts valid day entry", () => {
    const result = dayEntryCreateSchema.safeParse({
      workDate: "2025-11-03",
      marker: null,
      note: null,
      timeBlocks: [
        { blockType: "TAETIGKEIT", startTime: "08:00", endTime: "13:00" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts day entry with marker and no blocks", () => {
    const result = dayEntryCreateSchema.safeParse({
      workDate: "2025-11-03",
      marker: "URLAUB",
      note: null,
      timeBlocks: [],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid date format", () => {
    const result = dayEntryCreateSchema.safeParse({
      workDate: "03.11.2025",
      marker: null,
      timeBlocks: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid login", () => {
    expect(loginSchema.safeParse({ username: "admin", password: "admin123" }).success).toBe(true);
  });
  it("rejects empty fields", () => {
    expect(loginSchema.safeParse({ username: "", password: "" }).success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("accepts matching passwords", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old123",
      newPassword: "new12345",
      confirmPassword: "new12345",
    });
    expect(result.success).toBe(true);
  });
  it("rejects non-matching passwords", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old123",
      newPassword: "new12345",
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
  });
  it("rejects too short password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old123",
      newPassword: "abc",
      confirmPassword: "abc",
    });
    expect(result.success).toBe(false);
  });
});

describe("createUserSchema", () => {
  it("accepts valid user data", () => {
    const result = createUserSchema.safeParse({
      username: "test.user",
      displayName: "Test User",
      password: "password123",
      role: "USER",
      weeklyHours: 30,
      workingDays: ["MO", "TU", "WE", "TH", "FR"],
    });
    expect(result.success).toBe(true);
  });
  it("rejects invalid username chars", () => {
    const result = createUserSchema.safeParse({
      username: "test user!",
      displayName: "Test User",
      password: "password123",
      role: "USER",
      weeklyHours: 30,
      workingDays: ["MO"],
    });
    expect(result.success).toBe(false);
  });
});
