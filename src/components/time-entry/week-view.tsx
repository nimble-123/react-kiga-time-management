"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { DayRow } from "./day-row";
import { DayDetailDialog } from "./day-detail-dialog";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  formatDateToISO,
  getWeekDates,
  calculateDay,
  formatHours,
  formatHoursDelta,
} from "@/lib/calculations";
import { formatDateShort, formatMonthYear } from "@/lib/utils";
import { saveDayEntry, deleteDayEntry } from "@/actions/day-entries";
import type { WorkScheduleData, DayEntryData, TimeBlockData } from "@/types";

interface DayEntryWithBlocks {
  id: number;
  workDate: Date;
  marker: string | null;
  note: string | null;
  timeBlocks: {
    id: number;
    blockType: string;
    startTime: string;
    endTime: string;
  }[];
}

interface WeekViewProps {
  initialWeekStart: string;
  initialEntries: DayEntryWithBlocks[];
  schedule: WorkScheduleData;
  holidayDates: string[];
  reviewStatus?: string;
}

export function WeekView({
  initialWeekStart,
  initialEntries,
  schedule,
  holidayDates,
  reviewStatus,
}: WeekViewProps) {
  const [weekStart, setWeekStart] = useState(() => new Date(initialWeekStart + "T00:00:00"));
  const [entries, setEntries] = useState<DayEntryWithBlocks[]>(initialEntries);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  const weekDates = getWeekDates(weekStart);
  const holidays = new Set(holidayDates);
  const isLocked = reviewStatus === "APPROVED" || reviewStatus === "SUBMITTED";

  const entryMap = new Map<string, DayEntryWithBlocks>();
  for (const e of entries) {
    entryMap.set(formatDateToISO(e.workDate), e);
  }

  // Week summary
  let weekIst = 0;
  let weekSoll = 0;
  for (const date of weekDates) {
    const dateStr = formatDateToISO(date);
    const entry = entryMap.get(dateStr);
    const blocks: TimeBlockData[] = entry?.timeBlocks.map((tb) => ({
      blockType: tb.blockType as TimeBlockData["blockType"],
      startTime: tb.startTime,
      endTime: tb.endTime,
    })) ?? [];
    const calc = calculateDay(date, entry?.marker ?? null, blocks, schedule, holidays);
    weekIst += calc.ist;
    weekSoll += calc.soll;
  }
  const weekDelta = Math.round((weekIst - weekSoll) * 100) / 100;

  const refreshEntries = useCallback(async (start: Date) => {
    const startStr = formatDateToISO(start);
    const res = await fetch(`/api/time-entries?weekStart=${startStr}`);
    if (res.ok) {
      const data = await res.json();
      setEntries(data.map((e: DayEntryWithBlocks) => ({
        ...e,
        workDate: new Date(e.workDate),
      })));
    }
  }, []);

  const navigateWeek = useCallback(async (direction: number) => {
    setNavigating(true);
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + direction * 7);
    setWeekStart(newStart);
    await refreshEntries(newStart);
    setNavigating(false);
  }, [weekStart, refreshEntries]);

  const handleSave = useCallback(async (data: DayEntryData) => {
    const result = await saveDayEntry({
      workDate: data.workDate,
      marker: data.marker,
      note: data.note,
      timeBlocks: data.timeBlocks,
    });
    if (result.success) {
      showSuccess("Gespeichert");
      await refreshEntries(weekStart);
    } else {
      showError(result.error ?? "Fehler beim Speichern");
    }
    setSelectedDay(null);
    return result;
  }, [weekStart, refreshEntries, showSuccess, showError]);

  const handleDeleteRequest = useCallback((workDate: string) => {
    setConfirmDelete(workDate);
    return Promise.resolve({ success: true });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!confirmDelete) return;
    const result = await deleteDayEntry(confirmDelete);
    if (result.success) {
      setEntries((prev) => prev.filter((e) => formatDateToISO(e.workDate) !== confirmDelete));
      showSuccess("Eintrag geloescht");
    } else {
      showError(result.error ?? "Fehler beim Loeschen");
    }
    setConfirmDelete(null);
  }, [confirmDelete, showSuccess, showError]);

  const midWeek = new Date(weekStart);
  midWeek.setDate(midWeek.getDate() + 2);

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigateWeek(-1)} disabled={navigating} title="Vorherige Woche anzeigen">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Vorherige Woche
        </Button>
        <div className="text-center">
          <h2 className="text-lg font-semibold flex items-center gap-2 justify-center">
            {navigating && <Loader2 className="h-4 w-4 animate-spin" />}
            {formatDateShort(weekDates[0])} - {formatDateShort(weekDates[4])}
          </h2>
          <p className="text-sm text-muted-foreground">
            {formatMonthYear(midWeek.getFullYear(), midWeek.getMonth() + 1)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigateWeek(1)} disabled={navigating} title="Naechste Woche anzeigen">
          Naechste Woche
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {isLocked && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
          Dieser Monat ist {reviewStatus === "APPROVED" ? "genehmigt" : "eingereicht"} und kann nicht bearbeitet werden.
          {reviewStatus === "SUBMITTED" && " Warte auf Pruefung durch die Leitung."}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span title="Klicke auf ein Datum fuer die Detailansicht mit Notizen">Tipp: Datum anklicken = Detailansicht</span>
        <span>|</span>
        <span title="Mit Enter speichern">Enter = Speichern</span>
        <span>|</span>
        <span>Kurzeingabe: &quot;8&quot; = 08:00, &quot;830&quot; = 08:30</span>
      </div>

      {/* Week table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[120px_1fr_1fr_1fr_1fr_100px_80px_80px_80px_40px] bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground">
          <div className="p-2">Datum</div>
          <div className="p-2" title="Haupttaetigkeit (Arbeitszeit)">Taetigkeit</div>
          <div className="p-2" title="Vor- und Nachbereitungszeit">Vorbereitung</div>
          <div className="p-2" title="Dienstbesprechung">DB</div>
          <div className="p-2" title="Pausenzeit (wird abgezogen)">Pause</div>
          <div className="p-2" title="Tageskennzeichnung">Marker</div>
          <div className="p-2 text-right" title="Ist-Stunden">IST</div>
          <div className="p-2 text-right" title="Soll-Stunden">SOLL</div>
          <div className="p-2 text-right" title="Differenz (IST - SOLL)">Delta</div>
          <div className="p-2"></div>
        </div>

        {weekDates.map((date) => {
          const dateStr = formatDateToISO(date);
          const entry = entryMap.get(dateStr);
          return (
            <DayRow
              key={dateStr}
              date={date}
              entry={entry ?? null}
              schedule={schedule}
              holidayDates={holidays}
              isLocked={isLocked}
              onSave={handleSave}
              onDelete={handleDeleteRequest}
              onDetail={() => setSelectedDay(dateStr)}
            />
          );
        })}

        {/* Week summary */}
        <div className="grid grid-cols-[120px_1fr_1fr_1fr_1fr_100px_80px_80px_80px_40px] bg-muted/30 border-t-2 border-border font-semibold text-sm">
          <div className="p-2 col-span-6 text-right">Gesamt Woche</div>
          <div className="p-2 text-right font-mono tabular-nums">{formatHours(weekIst)}</div>
          <div className="p-2 text-right font-mono tabular-nums">{formatHours(weekSoll)}</div>
          <div className={`p-2 text-right font-mono tabular-nums ${weekDelta >= 0 ? "text-positive" : "text-negative"}`}>
            {formatHoursDelta(weekDelta)}
          </div>
          <div className="p-2"></div>
        </div>
      </div>

      {/* Day detail dialog */}
      {selectedDay && (
        <DayDetailDialog
          date={selectedDay}
          entry={entryMap.get(selectedDay) ?? null}
          schedule={schedule}
          holidayDates={holidays}
          isLocked={isLocked}
          onSave={handleSave}
          onDelete={async (wd) => {
            const result = await deleteDayEntry(wd);
            if (result.success) {
              setEntries((prev) => prev.filter((e) => formatDateToISO(e.workDate) !== wd));
              showSuccess("Eintrag geloescht");
            }
            return result;
          }}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <ConfirmDialog
          title="Eintrag loeschen"
          message="Soll der gesamte Tageseintrag mit allen Zeitbloecken geloescht werden?"
          confirmLabel="Loeschen"
          variant="destructive"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
