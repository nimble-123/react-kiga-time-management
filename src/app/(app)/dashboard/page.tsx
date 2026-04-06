import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMonthSummary } from "@/actions/data";
import { getMonthlyReview } from "@/actions/monthly-reviews";
import { formatHours, formatHoursDelta } from "@/lib/calculations";
import { formatMonthYear } from "@/lib/utils";
import Link from "next/link";
import { Clock, CalendarDays, TrendingUp, Wallet } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const userId = parseInt(session.user.id);

  const summary = await getMonthSummary(userId, year, month);
  const review = await getMonthlyReview(year, month);

  const reviewStatus = review?.status ?? "OPEN";
  const statusVariant = {
    OPEN: "secondary" as const,
    SUBMITTED: "info" as const,
    APPROVED: "success" as const,
    RETURNED: "destructive" as const,
  }[reviewStatus];
  const statusLabel = {
    OPEN: "Offen",
    SUBMITTED: "Eingereicht",
    APPROVED: "Genehmigt",
    RETURNED: "Zurueckgegeben",
  }[reviewStatus];

  const overtimeTotal = Math.round((summary.carryOver + summary.delta) * 100) / 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Willkommen, {session.user.displayName}
        </p>
      </div>

      {/* Month KPIs */}
      <div>
        <h2 className="text-lg font-semibold mb-3">{formatMonthYear(year, month)}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                IST-Stunden
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono tabular-nums" title="Tatsaechlich gearbeitete Stunden in diesem Monat">{formatHours(summary.ist)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                SOLL-Stunden
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono tabular-nums" title="Vertraglich vereinbarte Stunden fuer diesen Monat">{formatHours(summary.soll)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Differenz Monat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold font-mono tabular-nums ${summary.delta >= 0 ? "text-positive" : "text-negative"}`} title="IST minus SOLL fuer den aktuellen Monat">
                {formatHoursDelta(summary.delta)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" />
                Ueberstundenkonto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold font-mono tabular-nums ${overtimeTotal >= 0 ? "text-positive" : "text-negative"}`} title="Gesamtsaldo aller Ueberstunden inkl. aktuellem Monat">
                {formatHoursDelta(overtimeTotal)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Saldo Vormonat: {formatHoursDelta(summary.carryOver)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monatsstatus</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant={statusVariant}>{statusLabel}</Badge>
            {review?.comment && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Kommentar:</span> {review.comment}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Link href="/time-entry" className="text-sm text-primary hover:underline" title="Zur Wochenansicht wechseln">
              Wochenansicht
            </Link>
            <Link href="/monthly" className="text-sm text-primary hover:underline" title="Zur Monatsansicht wechseln">
              Monatsansicht
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
