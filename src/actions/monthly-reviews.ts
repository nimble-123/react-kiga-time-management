"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getMonthlyReview(year: number, month: number) {
  const user = await requireAuth();
  return prisma.monthlyReview.findUnique({
    where: {
      userId_year_month: {
        userId: parseInt(user.id),
        year,
        month,
      },
    },
  });
}

export async function submitMonth(year: number, month: number) {
  const user = await requireAuth();
  const userId = parseInt(user.id);

  await prisma.monthlyReview.upsert({
    where: { userId_year_month: { userId, year, month } },
    create: {
      userId,
      year,
      month,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
    update: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      comment: null,
    },
  });

  revalidatePath("/monthly");
  revalidatePath("/dashboard");
  revalidatePath("/admin/approvals");
  return { success: true };
}

export async function getPendingReviews() {
  await requireAdmin();

  return prisma.monthlyReview.findMany({
    where: { status: "SUBMITTED" },
    include: { user: { select: { id: true, displayName: true, username: true } } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}

export async function getAllReviews() {
  await requireAdmin();

  return prisma.monthlyReview.findMany({
    include: {
      user: { select: { id: true, displayName: true, username: true } },
      reviewer: { select: { displayName: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}

export async function approveMonth(userId: number, year: number, month: number) {
  const admin = await requireAdmin();

  await prisma.monthlyReview.update({
    where: { userId_year_month: { userId, year, month } },
    data: {
      status: "APPROVED",
      reviewedBy: parseInt(admin.id),
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/admin/approvals");
  revalidatePath("/monthly");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function returnMonth(userId: number, year: number, month: number, comment: string) {
  const admin = await requireAdmin();

  await prisma.monthlyReview.update({
    where: { userId_year_month: { userId, year, month } },
    data: {
      status: "RETURNED",
      reviewedBy: parseInt(admin.id),
      reviewedAt: new Date(),
      comment,
    },
  });

  revalidatePath("/admin/approvals");
  revalidatePath("/monthly");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getReviewForUser(userId: number, year: number, month: number) {
  await requireAdmin();
  return prisma.monthlyReview.findUnique({
    where: { userId_year_month: { userId, year, month } },
  });
}
