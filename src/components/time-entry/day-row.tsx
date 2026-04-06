"use client";

import { useState } from "react";
import { TimeInput } from "@/components/ui/time-input";
import { Select } from "@/components/ui/select";
import {
  formatDateToISO,
  calculateDay,
  formatHours,
  formatHoursDelta,
} from "@/lib/calculations";
import { formatDateShort } from "@/lib/utils";
import type { WorkScheduleData, DayEntryData, Marker, TimeBlockData } from "@/types";
import { Save, Trash2, Loader2 } from "lucide-react";

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

interface DayRowProps {
  date: Date;
  entry: DayEntryWithBlocks | null;
  schedule: WorkScheduleData;
  holidayDates: Set<string>;
  isLocked: boolean;
  onSave: (data: DayEntryData) => Promise<{ success: boolean; error?: string }>;
  onDelete: (workDate: string) => Promise<{ success: boolean; error?: string }>;
  onDetail: () => void;
}

function getBlockTime(entry: DayEntryWithBlocks | null, blockType: string, field: "start" | "end"): string {
  const block = entry?.timeBlocks.find((tb) => tb.blockType === blockType);
  return block ? (field === "start" ? block.startTime : block.endTime) : "";
}

export function DayRow({ date, entry, schedule, holidayDates, isLocked, onSave, onDelete, onDetail }: DayRowProps) {
  const dateStr = formatDateToISO(date);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const isHoliday = holidayDates.has(dateStr);
  const isToday = formatDateToISO(new Date()) === dateStr;

  const [taetigVon, setTaetigVon] = useState(getBlockTime(entry, "TAETIGKEIT", "start"));
  const [taetigBis, setTaetigBis] = useState(getBlockTime(entry, "TAETIGKEIT", "end"));
  const [vorbVon, setVorbVon] = useState(getBlockTime(entry, "VORBEREITUNG", "start"));
  const [vorbBis, setVorbBis] = useState(getBlockTime(entry, "VORBEREITUNG", "end"));
  const [dbVon, setDbVon] = useState(getBlockTime(entry, "DB", "start"));
  const [dbBis, setDbBis] = useState(getBlockTime(entry, "DB", "end"));
  const [pauseVon, setPauseVon] = useState(getBlockTime(entry, "PAUSE", "start"));
  const [pauseBis, setPauseBis] = useState(getBlockTime(entry, "PAUSE", "end"));
  const [marker, setMarker] = useState<string>(entry?.marker ?? "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const hasAbsenceMarker = ["URLAUB", "KRANK", "FEIERTAG", "UEBERSTD_ABBAU"].includes(marker);

  const buildBlocks = (): TimeBlockData[] => {
    const blocks: TimeBlockData[] = [];
    if (taetigVon && taetigBis) blocks.push({ blockType: "TAETIGKEIT", startTime: taetigVon, endTime: taetigBis });
    if (vorbVon && vorbBis) blocks.push({ blockType: "VORBEREITUNG", startTime: vorbVon, endTime: vorbBis });
    if (dbVon && dbBis) blocks.push({ blockType: "DB", startTime: dbVon, endTime: dbBis });
    if (pauseVon && pauseBis) blocks.push({ blockType: "PAUSE", startTime: pauseVon, endTime: pauseBis });
    return blocks;
  };

  const hasData = !!(taetigVon || taetigBis || vorbVon || vorbBis || dbVon || dbBis || pauseVon || pauseBis || marker);
  const blocks = hasAbsenceMarker ? [] : buildBlocks();
  const calc = calculateDay(date, marker || null, blocks, schedule, holidayDates);

  const markDirty = () => { if (!dirty) setDirty(true); };

  const handleSave = async () => {
    if (isLocked || saving) return;
    setSaving(true);
    const currentBlocks = hasAbsenceMarker ? [] : buildBlocks();
    await onSave({
      workDate: dateStr,
      marker: (marker as Marker) || null,
      note: entry?.note ?? null,
      timeBlocks: currentBlocks,
    });
    setSaving(false);
    setDirty(false);
  };

  const handleDelete = async () => {
    if (isLocked) return;
    await onDelete(dateStr);
    setTaetigVon(""); setTaetigBis("");
    setVorbVon(""); setVorbBis("");
    setDbVon(""); setDbBis("");
    setPauseVon(""); setPauseBis("");
    setMarker("");
    setDirty(false);
  };

  // Save on Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && dirty && hasData) {
      e.preventDefault();
      handleSave();
    }
  };

  if (isWeekend) return null;

  const inputDisabled = isLocked || hasAbsenceMarker;

  return (
    <div
      className={`grid grid-cols-[120px_1fr_1fr_1fr_1fr_100px_80px_80px_80px_40px] border-b border-border text-sm hover:bg-muted/20 transition-colors ${isToday ? "bg-blue-50/50" : ""} ${isHoliday ? "bg-green-50/30" : ""}`}
      onKeyDown={handleKeyDown}
    >
      {/* Date */}
      <div
        className="p-2 font-medium cursor-pointer hover:text-primary flex items-center gap-1"
        onClick={onDetail}
        title="Klicken fuer Tagesdetails mit Notizen und weiteren Zeitbloecken"
      >
        <span>{formatDateShort(date)}</span>
        {isHoliday && <span className="text-[10px] text-green-600 font-bold" title="Feiertag">F</span>}
        {isToday && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" title="Heute" />}
      </div>

      {/* Taetigkeit */}
      <div className="p-1 flex gap-1 items-center" title="Arbeitszeit (Haupttaetigkeit)">
        <TimeInput className="w-[70px]" placeholder="08:00" value={taetigVon} onValueChange={(v) => { setTaetigVon(v); markDirty(); }} disabled={inputDisabled} />
        <span className="text-muted-foreground text-xs">-</span>
        <TimeInput className="w-[70px]" placeholder="13:00" value={taetigBis} onValueChange={(v) => { setTaetigBis(v); markDirty(); }} disabled={inputDisabled} />
      </div>

      {/* Vorbereitung */}
      <div className="p-1 flex gap-1 items-center" title="Vor- und Nachbereitungszeit">
        <TimeInput className="w-[70px]" placeholder="von" value={vorbVon} onValueChange={(v) => { setVorbVon(v); markDirty(); }} disabled={inputDisabled} />
        <span className="text-muted-foreground text-xs">-</span>
        <TimeInput className="w-[70px]" placeholder="bis" value={vorbBis} onValueChange={(v) => { setVorbBis(v); markDirty(); }} disabled={inputDisabled} />
      </div>

      {/* DB */}
      <div className="p-1 flex gap-1 items-center" title="Dienstbesprechung">
        <TimeInput className="w-[70px]" placeholder="von" value={dbVon} onValueChange={(v) => { setDbVon(v); markDirty(); }} disabled={inputDisabled} />
        <span className="text-muted-foreground text-xs">-</span>
        <TimeInput className="w-[70px]" placeholder="bis" value={dbBis} onValueChange={(v) => { setDbBis(v); markDirty(); }} disabled={inputDisabled} />
      </div>

      {/* Pause */}
      <div className="p-1 flex gap-1 items-center" title="Pausenzeit (wird von der Arbeitszeit abgezogen)">
        <TimeInput className="w-[70px]" placeholder="von" value={pauseVon} onValueChange={(v) => { setPauseVon(v); markDirty(); }} disabled={inputDisabled} />
        <span className="text-muted-foreground text-xs">-</span>
        <TimeInput className="w-[70px]" placeholder="bis" value={pauseBis} onValueChange={(v) => { setPauseBis(v); markDirty(); }} disabled={inputDisabled} />
      </div>

      {/* Marker */}
      <div className="p-1" title="Tageskennzeichnung (Urlaub, Krank, etc.)">
        <Select
          className="h-7 text-xs px-1"
          value={marker}
          onChange={(e) => { setMarker(e.target.value); setDirty(true); }}
          disabled={isLocked}
        >
          <option value="">-</option>
          <option value="URLAUB">Urlaub</option>
          <option value="KRANK">Krank</option>
          <option value="FEIERTAG">Feiertag</option>
          <option value="UEBERSTD_ABBAU">UE-Abbau</option>
        </Select>
      </div>

      {/* IST */}
      <div className="p-2 text-right font-mono tabular-nums" title="Ist-Stunden (tatsaechlich gearbeitet)">
        {calc.ist > 0 || hasAbsenceMarker ? formatHours(calc.ist) : ""}
      </div>

      {/* SOLL */}
      <div className="p-2 text-right font-mono tabular-nums text-muted-foreground" title="Soll-Stunden (lt. Arbeitszeitmodell)">
        {calc.soll > 0 ? formatHours(calc.soll) : ""}
      </div>

      {/* Delta */}
      <div className={`p-2 text-right font-mono tabular-nums ${calc.delta > 0 ? "text-positive" : calc.delta < 0 ? "text-negative" : ""}`} title="Differenz IST minus SOLL">
        {calc.delta !== 0 ? formatHoursDelta(calc.delta) : ""}
      </div>

      {/* Actions */}
      <div className="p-1 flex items-center justify-center">
        {!isLocked && saving && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
        {!isLocked && !saving && dirty && hasData && (
          <button
            onClick={handleSave}
            className="p-0.5 rounded hover:bg-accent text-primary cursor-pointer"
            title="Speichern (Enter)"
          >
            <Save className="h-3.5 w-3.5" />
          </button>
        )}
        {!isLocked && !saving && !dirty && (hasData || entry) && (
          <button
            onClick={handleDelete}
            className="p-0.5 rounded hover:bg-red-50 text-muted-foreground hover:text-destructive cursor-pointer"
            title="Tageseintrag loeschen"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
