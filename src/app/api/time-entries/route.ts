import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const weekStart = request.nextUrl.searchParams.get("weekStart");
  if (!weekStart) {
    return NextResponse.json({ error: "weekStart parameter required" }, { status: 400 });
  }

  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  end.setHours(23, 59, 59);

  const entries = await prisma.dayEntry.findMany({
    where: {
      userId: parseInt(session.user.id),
      workDate: { gte: start, lte: end },
    },
    include: { timeBlocks: true },
    orderBy: { workDate: "asc" },
  });

  return NextResponse.json(entries);
}
