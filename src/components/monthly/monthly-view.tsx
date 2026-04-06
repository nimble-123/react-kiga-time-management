"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ChevronLeft, ChevronRight, Send, Loader2, Clock, CalendarDays, TrendingUp, Wallet } from "lucide-react";
import { submitMonth } from "@/actions/monthly-reviews";
import {
  calculateDay,
  formatDateToISO,
  formatHours,
  formatHoursDelta,
  getMonday,
} from "@/lib/calculations";
import { formatDateShort, formatMonthYear } from "@/lib/utils";
import { MARKER_LABELS, REVIEW_STATUS_LABELS } from "@/types";
import type { WorkScheduleData, TimeBlockData, MonthSummary, ReviewStatus } from "@/types";

interface MonthlyViewProps {
  year: number;
  month: number;
  entries: {
    id: number;
    workDate: Date;
    marker: string | null;
    note: string | null;
    timeBlocks: { blockType: string; startTime: string; endTime: string }[];
  }[];
  summary: MonthSummary;
  review: { status: string; comment: string | null } | null;
  schedule: WorkScheduleData;
  holidayDates: string[];
}

export function MonthlyView({
  year, month, entries, summary, review, schedule, holidayDates,
}: MonthlyViewProps) {
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const holidays = new Set(holidayDates);
  const status = (review?.status ?? "OPEN") as ReviewStatus;
  const isLocked = status === "APPROVED" || status === "SUBMITTED";

  const entryMap = new Map<string, typeof entries[0]>();
  for (const e of entries) entryMap.set(formatDateToISO(e.workDate), e);

  // Build weeks
  const daysInMonth = new Date(year, month, 0).getDate();
  const allDays: { date: Date; dateStr: string }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      allDays.push({ date, dateStr: formatDateToISO(date) });
    }
  }

  const weeks: { days: typeof allDays }[] = [];
  let currentWeekMonday: string | null = null;
  let currentWeekDays: typeof allDays = [];
  for (const day of allDays) {
    const mondayStr = formatDateToISO(getMonday(day.date));
    if (mondayStr !== currentWeekMonday) {
      if (currentWeekDays.length > 0) weeks.push({ days: currentWeekDays });
      currentWeekMonday = mondayStr;
      currentWeekDays = [];
    }
    currentWeekDays.push(day);
  }
  if (currentWeekDays.length > 0) weeks.push({ days: currentWeekDays });

  const handleSubmit = async () => {
    setShowSubmitConfirm(false);
    setSubmitting(true);
    await submitMonth(year, month);
    setSubmitting(false);
    window.location.reload();
  };

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const overtimeTotal = Math.round((summary.carryOver + summary.delta) * 100) / 100;

  const statusVariant = {
    OPEN: "secondary", SUBMITTED: "info", APPROVED: "success", RETURNED: "destructive",
  }[status] as "secondary" | "info" | "success" | "destructive";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Monatsansicht</h1>
        <div className="flex items-center gap-4">
          <Badge variant={statusVariant}>{REVIEW_STATUS_LABELS[status]}</Badge>
          {(status === "OPEN" || status === "RETURNED") && (
            <Button onClick={() => setShowSubmitConfirm(true)} disabled={submitting} size="sm" title="Monat zur Pruefung durch die Leitung einreichen">
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {submitting ? "Wird eingereicht..." : "Monat einreichen"}
            </Button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link href={`/monthly?year=${prevYear}&month=${prevMonth}`}>
          <Button variant="outline" size="sm" title={formatMonthYear(prevYear, prevMonth)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {formatMonthYear(prevYear, prevMonth)}
          </Button>
        </Link>
        <h2 className="text-lg font-semibold">{formatMonthYear(year, month)}</h2>
        <Link href={`/monthly?year=${nextYear}&month=${nextMonth}`}>
          <Button variant="outline" size="sm" title={formatMonthYear(nextYear, nextMonth)}>
            {formatMonthYear(nextYear, nextMonth)}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      {review?.comment && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm">
          <strong>Kommentar der Leitung:</strong> {review.comment}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />IST-Stunden</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold font-mono tabular-nums" title="Gearbeitete Stunden im Monat">{formatHours(summary.ist)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />SOLL-Stunden</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold font-mono tabular-nums" title="Vertragliche Stunden im Monat">{formatHours(summary.soll)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Differenz Monat</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold font-mono tabular-nums ${summary.delta >= 0 ? "text-positive" : "text-negative"}`} title="IST minus SOLL diesen Monat">{formatHoursDelta(summary.delta)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" />Ueberstundenkonto</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold font-mono tabular-nums ${overtimeTotal >= 0 ? "text-positive" : "text-negative"}`} title="Gesamtsaldo aller Ueberstunden">{formatHoursDelta(overtimeTotal)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Saldo Vormonat: {formatHoursDelta(summary.carryOver)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[120px_100px_120px_1fr_80px_80px_80px] bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground">
          <div className="p-2">Datum</div>
          <div className="p-2" title="Tageskennzeichnung">Kennzeichnung</div>
          <div className="p-2">Notiz</div>
          <div className="p-2" title="Uebersicht der erfassten Zeitbloecke">Zeitbloecke</div>
          <div className="p-2 text-right" title="Ist-Stunden">IST</div>
          <div className="p-2 text-right" title="Soll-Stunden">SOLL</div>
          <div className="p-2 text-right" title="Differenz IST - SOLL">Delta</div>
        </div>

        {weeks.map((week, wi) => {
          let weekIst = 0;
          let weekSoll = 0;

          const dayRows = week.days.map((day) => {
            const entry = entryMap.get(day.dateStr);
            const blocks: TimeBlockData[] = entry?.timeBlocks.map((tb) => ({
              blockType: tb.blockType as TimeBlockData["blockType"],
              startTime: tb.startTime,
              endTime: tb.endTime,
            })) ?? [];
            const calc = calculateDay(day.date, entry?.marker ?? null, blocks, schedule, holidays);
            weekIst += calc.ist;
            weekSoll += calc.soll;
            const isToday = formatDateToISO(new Date()) === day.dateStr;
            const isHoliday = holidays.has(day.dateStr);
            const hasNoEntry = !entry && calc.soll > 0 && !isHoliday;

            return (
              <div
                key={day.dateStr}
                className={`grid grid-cols-[120px_100px_120px_1fr_80px_80px_80px] border-b border-border text-sm ${isToday ? "bg-blue-50/50" : ""} ${isHoliday ? "bg-green-50/30" : ""} ${hasNoEntry ? "bg-orange-50/30" : ""}`}
                title={hasNoEntry ? "Arbeitstag ohne Eintrag" : undefined}
              >
                <div className="p-2 font-medium">
                  {formatDateShort(day.date)}
                  {isHoliday && <span className="text-[10px] text-green-600 font-bold ml-1" title="Feiertag">F</span>}
                  {isToday && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary ml-1" title="Heute" />}
                </div>
                <div className="p-2">
                  {entry?.marker && (
                    <Badge variant="secondary" className="text-xs">
                      {MARKER_LABELS[entry.marker as keyof typeof MARKER_LABELS] ?? entry.marker}
                    </Badge>
                  )}
                </div>
                <div className="p-2 text-xs text-muted-foreground truncate" title={entry?.note ?? undefined}>{entry?.note}</div>
                <div className="p-2 text-xs text-muted-foreground font-mono">
                  {blocks.map((b, i) => (
                    <span key={i} className="mr-2">
                      {b.blockType === "PAUSE" ? "P" : b.blockType === "DB" ? "DB" : b.blockType === "VORBEREITUNG" ? "V" : "T"}
                      :{b.startTime}-{b.endTime}
                    </span>
                  ))}
                </div>
                <div className="p-2 text-right font-mono tabular-nums">{calc.ist > 0 ? formatHours(calc.ist) : ""}</div>
                <div className="p-2 text-right font-mono tabular-nums text-muted-foreground">{calc.soll > 0 ? formatHours(calc.soll) : ""}</div>
                <div className={`p-2 text-right font-mono tabular-nums ${calc.delta > 0 ? "text-positive" : calc.delta < 0 ? "text-negative" : ""}`}>
                  {calc.delta !== 0 ? formatHoursDelta(calc.delta) : ""}
                </div>
              </div>
            );
          });

          const weekDelta = Math.round((weekIst - weekSoll) * 100) / 100;

          return (
            <div key={wi}>
              {dayRows}
              <div className="grid grid-cols-[120px_100px_120px_1fr_80px_80px_80px] bg-muted/30 border-b-2 border-border font-semibold text-sm">
                <div className="p-2 col-span-4 text-right">Woche {wi + 1}</div>
                <div className="p-2 text-right font-mono tabular-nums">{formatHours(weekIst)}</div>
                <div className="p-2 text-right font-mono tabular-nums">{formatHours(weekSoll)}</div>
                <div className={`p-2 text-right font-mono tabular-nums ${weekDelta >= 0 ? "text-positive" : "text-negative"}`}>
                  {formatHoursDelta(weekDelta)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit confirmation */}
      {showSubmitConfirm && (
        <ConfirmDialog
          title="Monat einreichen"
          message={`${formatMonthYear(year, month)} zur Pruefung durch die Leitung einreichen? Eintraege koennen danach nicht mehr bearbeitet werden, bis die Leitung den Monat zurueckgibt oder genehmigt.`}
          confirmLabel="Einreichen"
          onConfirm={handleSubmit}
          onCancel={() => setShowSubmitConfirm(false)}
        />
      )}
    </div>
  );
}
