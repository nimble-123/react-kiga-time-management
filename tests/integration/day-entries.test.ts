import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createTestDb, cleanupTestDb } from "./helpers";

let prisma: PrismaClient;
let dbPath: string;
let userId: number;
let adminId: number;

beforeAll(async () => {
  const db = await createTestDb();
  prisma = db.prisma;
  dbPath = db.dbPath;
  userId = db.user.id;
  adminId = db.admin.id;
});

afterAll(async () => {
  await cleanupTestDb(prisma, dbPath);
});

describe("DayEntry CRUD", () => {
  it("creates a day entry with time blocks", async () => {
    const entry = await prisma.dayEntry.create({
      data: {
        userId,
        workDate: new Date("2025-11-03"),
        marker: null,
        note: "Testnotiz",
        timeBlocks: {
          create: [
            { blockType: "TAETIGKEIT", startTime: "08:00", endTime: "13:00" },
            { blockType: "PAUSE", startTime: "10:00", endTime: "10:30" },
          ],
        },
      },
      include: { timeBlocks: true },
    });

    expect(entry.id).toBeDefined();
    expect(entry.timeBlocks).toHaveLength(2);
    expect(entry.note).toBe("Testnotiz");
  });

  it("enforces unique constraint on userId + workDate", async () => {
    await expect(
      prisma.dayEntry.create({
        data: {
          userId,
          workDate: new Date("2025-11-03"),
          marker: null,
        },
      }),
    ).rejects.toThrow();
  });

  it("updates a day entry", async () => {
    const entry = await prisma.dayEntry.findFirst({
      where: { userId, workDate: new Date("2025-11-03") },
    });

    const updated = await prisma.dayEntry.update({
      where: { id: entry!.id },
      data: { marker: "URLAUB", note: "Aktualisiert" },
    });

    expect(updated.marker).toBe("URLAUB");
    expect(updated.note).toBe("Aktualisiert");
  });

  it("cascades delete to time blocks", async () => {
    const entry = await prisma.dayEntry.findFirst({
      where: { userId, workDate: new Date("2025-11-03") },
      include: { timeBlocks: true },
    });

    expect(entry!.timeBlocks.length).toBeGreaterThan(0);

    await prisma.dayEntry.delete({ where: { id: entry!.id } });

    const blocks = await prisma.timeBlock.findMany({
      where: { dayEntryId: entry!.id },
    });
    expect(blocks).toHaveLength(0);
  });

  it("creates entry with URLAUB marker and no blocks", async () => {
    const entry = await prisma.dayEntry.create({
      data: {
        userId,
        workDate: new Date("2025-11-04"),
        marker: "URLAUB",
      },
      include: { timeBlocks: true },
    });

    expect(entry.marker).toBe("URLAUB");
    expect(entry.timeBlocks).toHaveLength(0);
  });
});

describe("MonthlyReview workflow", () => {
  it("creates a monthly review in OPEN status", async () => {
    const review = await prisma.monthlyReview.create({
      data: { userId, year: 2025, month: 11, status: "OPEN" },
    });
    expect(review.status).toBe("OPEN");
  });

  it("submits a month", async () => {
    const review = await prisma.monthlyReview.update({
      where: { userId_year_month: { userId, year: 2025, month: 11 } },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });
    expect(review.status).toBe("SUBMITTED");
  });

  it("approves a month", async () => {
    const review = await prisma.monthlyReview.update({
      where: { userId_year_month: { userId, year: 2025, month: 11 } },
      data: {
        status: "APPROVED",
        reviewedBy: adminId,
        reviewedAt: new Date(),
      },
    });
    expect(review.status).toBe("APPROVED");
    expect(review.reviewedBy).toBe(adminId);
  });

  it("returns a month with comment", async () => {
    // First create a new review for December
    await prisma.monthlyReview.create({
      data: { userId, year: 2025, month: 12, status: "SUBMITTED", submittedAt: new Date() },
    });

    const review = await prisma.monthlyReview.update({
      where: { userId_year_month: { userId, year: 2025, month: 12 } },
      data: {
        status: "RETURNED",
        reviewedBy: adminId,
        reviewedAt: new Date(),
        comment: "Bitte Mittwoch nochmal pruefen",
      },
    });
    expect(review.status).toBe("RETURNED");
    expect(review.comment).toBe("Bitte Mittwoch nochmal pruefen");
  });

  it("enforces unique constraint on userId + year + month", async () => {
    await expect(
      prisma.monthlyReview.create({
        data: { userId, year: 2025, month: 11, status: "OPEN" },
      }),
    ).rejects.toThrow();
  });
});

describe("User management", () => {
  it("deactivates a user", async () => {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
    expect(user.isActive).toBe(false);

    // Re-activate for other tests
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });
  });

  it("reads work schedule for a user", async () => {
    const schedule = await prisma.workSchedule.findFirst({
      where: { userId },
      orderBy: { validFrom: "desc" },
    });

    expect(schedule).not.toBeNull();
    expect(schedule!.weeklyHours).toBe(30);
    expect(JSON.parse(schedule!.workingDays)).toContain("MO");
  });

  it("reads initial balance", async () => {
    const balance = await prisma.initialBalance.findUnique({
      where: { userId },
    });

    expect(balance).not.toBeNull();
    expect(balance!.overtimeHours).toBe(10);
  });
});

describe("Holiday management", () => {
  it("queries holidays for a date range", async () => {
    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: new Date("2025-12-01"),
          lte: new Date("2025-12-31"),
        },
      },
    });

    expect(holidays).toHaveLength(1);
    expect(holidays[0].name).toBe("Weihnachten");
  });
});
