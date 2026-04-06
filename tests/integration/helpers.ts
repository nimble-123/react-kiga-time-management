import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";

let testDbCounter = 0;

/**
 * Create a fresh test database with seeded data.
 * Returns a PrismaClient connected to the test DB.
 */
export async function createTestDb() {
  testDbCounter++;
  const dbPath = path.join(__dirname, `../../prisma/data/test-${process.pid}-${testDbCounter}.db`);

  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: `file:${dbPath}` } },
  });

  // Push schema
  const { execSync } = await import("child_process");
  execSync(`DATABASE_URL="file:${dbPath}" npx prisma db push --skip-generate 2>&1`, {
    cwd: path.join(__dirname, "../.."),
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
  });

  // Seed basic data
  const adminHash = await bcrypt.hash("admin123", 4); // Low rounds for speed
  const userHash = await bcrypt.hash("user123", 4);

  const admin = await prisma.user.create({
    data: {
      username: "admin",
      displayName: "Admin User",
      passwordHash: adminHash,
      role: "ADMIN",
      mustChangePassword: false,
    },
  });

  const user = await prisma.user.create({
    data: {
      username: "testuser",
      displayName: "Test User",
      passwordHash: userHash,
      role: "USER",
      mustChangePassword: false,
    },
  });

  await prisma.workSchedule.create({
    data: {
      userId: user.id,
      validFrom: new Date("2025-01-01"),
      weeklyHours: 30,
      workingDays: JSON.stringify(["MO", "TU", "WE", "TH", "FR"]),
      dailyHours: JSON.stringify({ MO: 6, TU: 6, WE: 6, TH: 6, FR: 6 }),
    },
  });

  await prisma.initialBalance.create({
    data: {
      userId: user.id,
      asOfDate: new Date("2025-01-01"),
      overtimeHours: 10,
    },
  });

  await prisma.holiday.create({
    data: { date: new Date("2025-12-25"), name: "Weihnachten" },
  });

  return { prisma, admin, user, dbPath };
}

/**
 * Cleanup test database.
 */
export async function cleanupTestDb(prisma: PrismaClient, dbPath: string) {
  await prisma.$disconnect();
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  // Also remove WAL/SHM files
  if (fs.existsSync(dbPath + "-wal")) fs.unlinkSync(dbPath + "-wal");
  if (fs.existsSync(dbPath + "-shm")) fs.unlinkSync(dbPath + "-shm");
}
