import { requireAdmin } from "@/lib/auth";
import { getHolidays } from "@/actions/holidays";
import { HolidaysView } from "./holidays-view";

export default async function HolidaysPage() {
  await requireAdmin();
  const holidays = await getHolidays();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Feiertage</h1>
      <HolidaysView holidays={holidays} />
    </div>
  );
}
