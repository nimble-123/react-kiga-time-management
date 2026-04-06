import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      displayName: "Administrator",
      passwordHash: adminPassword,
      role: "ADMIN",
      mustChangePassword: false,
    },
  });

  // Create test users
  const userPassword = await bcrypt.hash("user123", 12);
  const inge = await prisma.user.upsert({
    where: { username: "inge" },
    update: {},
    create: {
      username: "inge",
      displayName: "Inge Mueller",
      passwordHash: userPassword,
      role: "USER",
      mustChangePassword: false,
      entryDate: new Date("2023-04-01"),
    },
  });

  const petra = await prisma.user.upsert({
    where: { username: "petra" },
    update: {},
    create: {
      username: "petra",
      displayName: "Petra Schmidt",
      passwordHash: userPassword,
      role: "USER",
      mustChangePassword: false,
      entryDate: new Date("2024-09-01"),
    },
  });

  // Work schedules
  await prisma.workSchedule.deleteMany();

  await prisma.workSchedule.create({
    data: {
      userId: inge.id,
      validFrom: new Date("2025-01-01"),
      weeklyHours: 30,
      workingDays: JSON.stringify(["MO", "TU", "WE", "TH", "FR"]),
      dailyHours: JSON.stringify({ MO: 6, TU: 6, WE: 6, TH: 6, FR: 6 }),
    },
  });

  await prisma.workSchedule.create({
    data: {
      userId: petra.id,
      validFrom: new Date("2025-01-01"),
      weeklyHours: 20,
      workingDays: JSON.stringify(["MO", "TU", "WE", "TH"]),
      dailyHours: JSON.stringify({ MO: 5, TU: 5, WE: 5, TH: 5 }),
    },
  });

  // Initial balances
  await prisma.initialBalance.deleteMany();

  await prisma.initialBalance.create({
    data: {
      userId: inge.id,
      asOfDate: new Date("2025-01-01"),
      overtimeHours: 12.5,
    },
  });

  await prisma.initialBalance.create({
    data: {
      userId: petra.id,
      asOfDate: new Date("2025-01-01"),
      overtimeHours: -3.0,
    },
  });

  // Holidays 2025/2026
  await prisma.holiday.deleteMany();

  const holidays = [
    { date: new Date("2025-01-01"), name: "Neujahr" },
    { date: new Date("2025-04-18"), name: "Karfreitag" },
    { date: new Date("2025-04-21"), name: "Ostermontag" },
    { date: new Date("2025-05-01"), name: "Tag der Arbeit" },
    { date: new Date("2025-05-29"), name: "Christi Himmelfahrt" },
    { date: new Date("2025-06-09"), name: "Pfingstmontag" },
    { date: new Date("2025-10-03"), name: "Tag der Deutschen Einheit" },
    { date: new Date("2025-12-25"), name: "1. Weihnachtstag" },
    { date: new Date("2025-12-26"), name: "2. Weihnachtstag" },
    { date: new Date("2026-01-01"), name: "Neujahr" },
    { date: new Date("2026-04-03"), name: "Karfreitag" },
    { date: new Date("2026-04-06"), name: "Ostermontag" },
    { date: new Date("2026-05-01"), name: "Tag der Arbeit" },
    { date: new Date("2026-05-14"), name: "Christi Himmelfahrt" },
    { date: new Date("2026-05-25"), name: "Pfingstmontag" },
    { date: new Date("2026-10-03"), name: "Tag der Deutschen Einheit" },
    { date: new Date("2026-12-25"), name: "1. Weihnachtstag" },
    { date: new Date("2026-12-26"), name: "2. Weihnachtstag" },
  ];

  for (const h of holidays) {
    await prisma.holiday.create({ data: h });
  }

  console.log("Seed completed:");
  console.log(`  Users: ${admin.displayName}, ${inge.displayName}, ${petra.displayName}`);
  console.log(`  Holidays: ${holidays.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
