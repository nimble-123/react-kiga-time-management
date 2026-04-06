"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TimeInput } from "@/components/ui/time-input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { X, Plus, Trash2, Loader2, Info } from "lucide-react";
import {
  formatDateToISO,
  calculateDay,
  formatHours,
  formatHoursDelta,
} from "@/lib/calculations";
import { formatDateFull } from "@/lib/utils";
import { BLOCK_TYPE_LABELS } from "@/types";
import type { WorkScheduleData, DayEntryData, Marker, TimeBlockData, BlockType } from "@/types";

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

interface DayDetailDialogProps {
  date: string;
  entry: DayEntryWithBlocks | null;
  schedule: WorkScheduleData;
  holidayDates: Set<string>;
  isLocked: boolean;
  onSave: (data: DayEntryData) => Promise<{ success: boolean; error?: string }>;
  onDelete: (workDate: string) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
}

export function DayDetailDialog({
  date,
  entry,
  schedule,
  holidayDates,
  isLocked,
  onSave,
  onDelete,
  onClose,
}: DayDetailDialogProps) {
  const dateObj = new Date(date + "T00:00:00");
  const [marker, setMarker] = useState(entry?.marker ?? "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [blocks, setBlocks] = useState<TimeBlockData[]>(
    entry?.timeBlocks.map((tb) => ({
      blockType: tb.blockType as BlockType,
      startTime: tb.startTime,
      endTime: tb.endTime,
    })) ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const hasAbsenceMarker = ["URLAUB", "KRANK", "FEIERTAG", "UEBERSTD_ABBAU"].includes(marker);
  const calc = calculateDay(dateObj, marker || null, hasAbsenceMarker ? [] : blocks, schedule, holidayDates);

  const addBlock = () => {
    setBlocks([...blocks, { blockType: "TAETIGKEIT", startTime: "", endTime: "" }]);
  };

  const updateBlock = (index: number, field: keyof TimeBlockData, value: string) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], [field]: value };
    setBlocks(newBlocks);
  };

  const removeBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const result = await onSave({
      workDate: date,
      marker: (marker as Marker) || null,
      note: note || null,
      timeBlocks: hasAbsenceMarker ? [] : blocks,
    });
    if (!result.success) {
      setError(result.error ?? "Fehler beim Speichern");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    const result = await onDelete(date);
    if (result.success) {
      onClose();
    }
  };

  // Close on Escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  const markerHints: Record<string, string> = {
    URLAUB: "IST wird automatisch auf SOLL gesetzt. Keine Zeitbloecke noetig.",
    KRANK: "IST wird automatisch auf SOLL gesetzt. Keine Zeitbloecke noetig.",
    FEIERTAG: "IST wird automatisch auf SOLL gesetzt. Keine Zeitbloecke noetig.",
    UEBERSTD_ABBAU: "IST = 0 Stunden. SOLL-Stunden werden vom Ueberstundenkonto abgezogen.",
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onKeyDown={handleKeyDown}>
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{formatDateFull(dateObj)}</CardTitle>
            {isLocked && (
              <p className="text-xs text-muted-foreground mt-1">Monat ist gesperrt - keine Bearbeitung moeglich</p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} title="Schliessen (Esc)">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Marker */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Tageskennzeichnung
              <span className="text-muted-foreground font-normal ml-1">(optional)</span>
            </label>
            <Select value={marker} onChange={(e) => setMarker(e.target.value)} disabled={isLocked}>
              <option value="">Normal (keine)</option>
              <option value="URLAUB">Urlaub</option>
              <option value="KRANK">Krankheit</option>
              <option value="FEIERTAG">Feiertag</option>
              <option value="UEBERSTD_ABBAU">Ueberstundenabbau</option>
            </Select>
            {marker && markerHints[marker] && (
              <p className="flex items-start gap-1.5 mt-2 text-xs text-muted-foreground bg-muted p-2 rounded">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                {markerHints[marker]}
              </p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Notiz
              <span className="text-muted-foreground font-normal ml-1">(z.B. Lichterfest, Teamtag)</span>
            </label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optionale Anmerkung zum Tag"
              disabled={isLocked}
              maxLength={500}
            />
          </div>

          {/* Time blocks */}
          {!hasAbsenceMarker && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Zeitbloecke</label>
                {!isLocked && (
                  <Button variant="outline" size="sm" onClick={addBlock} title="Weiteren Zeitblock hinzufuegen">
                    <Plus className="h-3 w-3 mr-1" />
                    Zeitblock
                  </Button>
                )}
              </div>

              {blocks.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
                  Keine Zeitbloecke vorhanden. Klicke &quot;+ Zeitblock&quot; um einen hinzuzufuegen.
                </p>
              )}

              <div className="space-y-2">
                {blocks.map((block, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 border rounded-md bg-muted/20">
                    <Select
                      className="w-44 h-8 text-sm"
                      value={block.blockType}
                      onChange={(e) => updateBlock(i, "blockType", e.target.value)}
                      disabled={isLocked}
                    >
                      {Object.entries(BLOCK_TYPE_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </Select>
                    <TimeInput
                      className="w-20 h-8 text-sm"
                      placeholder="08:00"
                      value={block.startTime}
                      onValueChange={(v) => updateBlock(i, "startTime", v)}
                      disabled={isLocked}
                    />
                    <span className="text-muted-foreground">-</span>
                    <TimeInput
                      className="w-20 h-8 text-sm"
                      placeholder="13:00"
                      value={block.endTime}
                      onValueChange={(v) => updateBlock(i, "endTime", v)}
                      disabled={isLocked}
                    />
                    {!isLocked && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeBlock(i)}
                        title="Zeitblock entfernen"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Calculation preview */}
          <div className="grid grid-cols-3 gap-4 bg-muted/50 p-4 rounded-md">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">IST-Stunden</p>
              <p className="text-lg font-bold font-mono tabular-nums">{formatHours(calc.ist)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">SOLL-Stunden</p>
              <p className="text-lg font-bold font-mono tabular-nums">{formatHours(calc.soll)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Differenz</p>
              <p className={`text-lg font-bold font-mono tabular-nums ${calc.delta > 0 ? "text-positive" : calc.delta < 0 ? "text-negative" : ""}`}>
                {formatHoursDelta(calc.delta)}
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-red-50 p-3 rounded-md border border-red-200">
              <Info className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          {!isLocked && (
            <div className="flex justify-between pt-2 border-t">
              <div>
                {entry && (
                  <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)} title="Gesamten Tageseintrag loeschen">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Tag loeschen
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>Abbrechen</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Speichern...
                    </>
                  ) : "Speichern"}
                </Button>
              </div>
            </div>
          )}
          {isLocked && (
            <div className="flex justify-end pt-2 border-t">
              <Button variant="outline" onClick={onClose}>Schliessen</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Tageseintrag loeschen"
          message="Der gesamte Eintrag mit allen Zeitbloecken wird unwiderruflich geloescht."
          confirmLabel="Endgueltig loeschen"
          variant="destructive"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
