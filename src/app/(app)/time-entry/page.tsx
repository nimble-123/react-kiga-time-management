import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WeekView } from "@/components/time-entry/week-view";
import { getMonday, formatDateToISO } from "@/lib/calculations";
import { getWorkSchedule, getHolidaySet } from "@/actions/data";

export default async function TimeEntryPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = parseInt(session.user.id);
  const now = new Date();
  const weekStart = getMonday(now);
  const weekStartStr = formatDateToISO(weekStart);

  // Fetch data
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 4);
  weekEnd.setHours(23, 59, 59);

  const entries = await prisma.dayEntry.findMany({
    where: {
      userId,
      workDate: { gte: weekStart, lte: weekEnd },
    },
    include: { timeBlocks: true },
    orderBy: { workDate: "asc" },
  });

  const schedule = await getWorkSchedule(userId, now);
  if (!schedule) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Kein Arbeitszeitmodell hinterlegt. Bitte wenden Sie sich an den Administrator.</p>
      </div>
    );
  }

  // Get holidays for the current month and potentially next
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const holidays1 = await getHolidaySet(year, month);
  const holidays2 = month < 12 ? await getHolidaySet(year, month + 1) : await getHolidaySet(year + 1, 1);
  const allHolidays = [...holidays1, ...holidays2];

  // Check review status
  const review = await prisma.monthlyReview.findUnique({
    where: { userId_year_month: { userId, year, month } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Wochenansicht</h1>
      <WeekView
        initialWeekStart={weekStartStr}
        initialEntries={entries}
        schedule={schedule}
        holidayDates={allHolidays}
        reviewStatus={review?.status}
      />
    </div>
  );
}
