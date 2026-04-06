import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MonthlyView } from "@/components/monthly/monthly-view";
import { getMonthSummary, getWorkSchedule, getHolidaySet } from "@/actions/data";
import { getMonthlyReview } from "@/actions/monthly-reviews";
import { getDayEntries } from "@/actions/day-entries";

export default async function MonthlyPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const now = new Date();
  const year = params.year ? parseInt(params.year) : now.getFullYear();
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1;
  const userId = parseInt(session.user.id);

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const [entries, summary, review, schedule, holidays] = await Promise.all([
    getDayEntries(monthStr),
    getMonthSummary(userId, year, month),
    getMonthlyReview(year, month),
    getWorkSchedule(userId, new Date(year, month - 1, 15)),
    getHolidaySet(year, month),
  ]);

  if (!schedule) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Kein Arbeitszeitmodell hinterlegt.</p>
      </div>
    );
  }

  return (
    <MonthlyView
      year={year}
      month={month}
      entries={entries}
      summary={summary}
      review={review}
      schedule={schedule}
      holidayDates={holidays}
    />
  );
}
