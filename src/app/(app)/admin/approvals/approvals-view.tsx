"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { approveMonth, returnMonth } from "@/actions/monthly-reviews";
import { formatMonthYear } from "@/lib/utils";
import { formatHours, formatHoursDelta } from "@/lib/calculations";
import { REVIEW_STATUS_LABELS, MARKER_LABELS } from "@/types";
import type { ReviewStatus, Marker } from "@/types";
import { CheckCircle, RotateCcw, ChevronDown, ChevronUp, Loader2, Clock, TrendingUp, Wallet } from "lucide-react";

interface Review {
  id: number;
  userId: number;
  year: number;
  month: number;
  status: string;
  comment: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  user: { id: number; displayName: string; username: string };
  reviewer: { displayName: string } | null;
}

interface DayInfo {
  date: string;
  marker: string | null;
  note: string | null;
  blocks: string;
  ist: number;
  soll: number;
  delta: number;
  isHoliday: boolean;
}

interface WeekGroup {
  days: DayInfo[];
  ist: number;
  soll: number;
  delta: number;
}

interface MonthDetails {
  weeks: WeekGroup[];
  summary: { ist: number; soll: number; delta: number; overtimeAccount: number; carryOver: number };
  schedule: { weeklyHours: number; workingDays: string[] };
}

export function ApprovalsView({ reviews }: { reviews: Review[] }) {
  const [filter, setFilter] = useState<string>("SUBMITTED");
  const [comment, setComment] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, MonthDetails>>({});
  const [detailsLoading, setDetailsLoading] = useState<string | null>(null);
  const [confirmApprove, setConfirmApprove] = useState<Review | null>(null);
  const { showSuccess, showError } = useToast();

  const filtered = reviews.filter((r) => filter === "ALL" || r.status === filter);

  const toggleExpand = useCallback(async (r: Review) => {
    const key = `${r.userId}-${r.year}-${r.month}`;
    if (expanded === key) {
      setExpanded(null);
      return;
    }

    setExpanded(key);

    // Load details if not cached
    if (!details[key]) {
      setDetailsLoading(key);
      try {
        const res = await fetch(`/api/admin/month-details?userId=${r.userId}&year=${r.year}&month=${r.month}`);
        if (res.ok) {
          const data = await res.json();
          setDetails((prev) => ({ ...prev, [key]: data }));
        }
      } catch {
        showError("Fehler beim Laden der Monatsdetails");
      }
      setDetailsLoading(null);
    }
  }, [expanded, details, showError]);

  const handleApprove = async (r: Review) => {
    setConfirmApprove(null);
    const key = `${r.userId}-${r.year}-${r.month}`;
    setLoading(key);
    await approveMonth(r.userId, r.year, r.month);
    showSuccess(`${formatMonthYear(r.year, r.month)} fuer ${r.user.displayName} genehmigt`);
    setLoading(null);
    window.location.reload();
  };

  const handleReturn = async (r: Review) => {
    const key = `${r.userId}-${r.year}-${r.month}`;
    const c = comment[key] || "";
    if (!c.trim()) {
      showError("Bitte einen Kommentar fuer die Rueckgabe angeben");
      return;
    }
    setLoading(key);
    await returnMonth(r.userId, r.year, r.month, c);
    showSuccess(`${formatMonthYear(r.year, r.month)} an ${r.user.displayName} zurueckgegeben`);
    setLoading(null);
    window.location.reload();
  };

  const statusVariant = (status: string) => ({
    OPEN: "secondary", SUBMITTED: "info", APPROVED: "success", RETURNED: "destructive",
  }[status] ?? "secondary") as "secondary" | "info" | "success" | "destructive";

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-2">
        {["SUBMITTED", "APPROVED", "RETURNED", "ALL"].map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
            {f === "ALL" ? "Alle" : REVIEW_STATUS_LABELS[f as ReviewStatus] ?? f}
            {f !== "ALL" && (
              <span className="ml-1.5 text-xs opacity-70">
                ({reviews.filter((r) => r.status === f).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center border border-dashed rounded-lg">
          <p>Keine Eintraege mit Status &quot;{filter === "ALL" ? "Alle" : REVIEW_STATUS_LABELS[filter as ReviewStatus]}&quot;.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const key = `${r.userId}-${r.year}-${r.month}`;
            const isExpanded = expanded === key;
            const detail = details[key];
            const isLoadingDetails = detailsLoading === key;

            return (
              <Card key={r.id} className={isExpanded ? "ring-2 ring-primary/20" : ""}>
                <CardContent className="p-0">
                  {/* Header row */}
                  <div className="flex items-center justify-between p-4">
                    <button
                      className="flex items-center gap-3 cursor-pointer hover:text-primary transition-colors text-left"
                      onClick={() => toggleExpand(r)}
                      title={isExpanded ? "Details einklappen" : "Details aufklappen"}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                      <div>
                        <p className="font-medium">{r.user.displayName}</p>
                        <p className="text-sm text-muted-foreground">{formatMonthYear(r.year, r.month)}</p>
                      </div>
                      <Badge variant={statusVariant(r.status)}>
                        {REVIEW_STATUS_LABELS[r.status as ReviewStatus] ?? r.status}
                      </Badge>
                      {r.reviewer && (
                        <span className="text-xs text-muted-foreground">von {r.reviewer.displayName}</span>
                      )}
                    </button>

                    {r.status === "SUBMITTED" && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Input
                          placeholder="Kommentar (bei Rueckgabe)"
                          className="w-56 h-8 text-sm"
                          value={comment[key] ?? ""}
                          onChange={(e) => setComment({ ...comment, [key]: e.target.value })}
                        />
                        <Button
                          size="sm" variant="outline"
                          onClick={() => handleReturn(r)}
                          disabled={loading === key}
                          title="Monat an den Mitarbeiter zurueckgeben"
                        >
                          {loading === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-1" />}
                          Zurueck
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setConfirmApprove(r)}
                          disabled={loading === key}
                          title="Monat genehmigen"
                        >
                          {loading === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                          Genehmigen
                        </Button>
                      </div>
                    )}
                  </div>

                  {r.comment && (
                    <div className="px-4 pb-2 -mt-1">
                      <p className="text-sm text-muted-foreground"><span className="font-medium">Kommentar:</span> {r.comment}</p>
                    </div>
                  )}

                  {/* Expanded detail view */}
                  {isExpanded && (
                    <div className="border-t">
                      {isLoadingDetails ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Lade Monatsdetails...
                        </div>
                      ) : detail ? (
                        <div>
                          {/* KPI summary bar */}
                          <div className="grid grid-cols-4 gap-px bg-muted/50 border-b">
                            <div className="bg-background p-3 text-center">
                              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Clock className="h-3 w-3" />IST</p>
                              <p className="text-lg font-bold font-mono tabular-nums">{formatHours(detail.summary.ist)}</p>
                            </div>
                            <div className="bg-background p-3 text-center">
                              <p className="text-xs text-muted-foreground">SOLL</p>
                              <p className="text-lg font-bold font-mono tabular-nums">{formatHours(detail.summary.soll)}</p>
                            </div>
                            <div className="bg-background p-3 text-center">
                              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><TrendingUp className="h-3 w-3" />Differenz</p>
                              <p className={`text-lg font-bold font-mono tabular-nums ${detail.summary.delta >= 0 ? "text-positive" : "text-negative"}`}>
                                {formatHoursDelta(detail.summary.delta)}
                              </p>
                            </div>
                            <div className="bg-background p-3 text-center">
                              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Wallet className="h-3 w-3" />Konto</p>
                              <p className={`text-lg font-bold font-mono tabular-nums ${detail.summary.overtimeAccount >= 0 ? "text-positive" : "text-negative"}`}>
                                {formatHoursDelta(detail.summary.overtimeAccount)}
                              </p>
                              <p className="text-[10px] text-muted-foreground">Vormonat: {formatHoursDelta(detail.summary.carryOver)}</p>
                            </div>
                          </div>

                          {/* Compact day table */}
                          <div className="text-xs">
                            {/* Table header */}
                            <div className="grid grid-cols-[90px_80px_1fr_60px_60px_60px] bg-muted/30 border-b font-semibold text-muted-foreground">
                              <div className="px-3 py-1.5">Tag</div>
                              <div className="px-2 py-1.5">Kennz.</div>
                              <div className="px-2 py-1.5">Zeitbloecke</div>
                              <div className="px-2 py-1.5 text-right">IST</div>
                              <div className="px-2 py-1.5 text-right">SOLL</div>
                              <div className="px-2 py-1.5 text-right">+/-</div>
                            </div>

                            {detail.weeks.map((week, wi) => (
                              <div key={wi}>
                                {week.days.map((day, di) => {
                                  const hasNoEntry = !day.blocks && !day.marker && day.soll > 0 && !day.isHoliday;
                                  return (
                                    <div
                                      key={di}
                                      className={`grid grid-cols-[90px_80px_1fr_60px_60px_60px] border-b border-border/50 ${day.isHoliday ? "bg-green-50/30" : ""} ${hasNoEntry ? "bg-orange-50/40" : ""}`}
                                    >
                                      <div className="px-3 py-1 font-medium">
                                        {day.date}
                                        {day.isHoliday && <span className="text-green-600 ml-0.5">F</span>}
                                      </div>
                                      <div className="px-2 py-1">
                                        {day.marker && (
                                          <span className="text-[10px] px-1 py-0.5 rounded bg-muted">
                                            {MARKER_LABELS[day.marker as Marker] ?? day.marker}
                                          </span>
                                        )}
                                      </div>
                                      <div className="px-2 py-1 text-muted-foreground font-mono truncate" title={day.blocks || undefined}>
                                        {day.blocks || (day.note ? <span className="italic">{day.note}</span> : "")}
                                      </div>
                                      <div className="px-2 py-1 text-right font-mono tabular-nums">
                                        {day.ist > 0 ? formatHours(day.ist) : ""}
                                      </div>
                                      <div className="px-2 py-1 text-right font-mono tabular-nums text-muted-foreground">
                                        {day.soll > 0 ? formatHours(day.soll) : ""}
                                      </div>
                                      <div className={`px-2 py-1 text-right font-mono tabular-nums ${day.delta > 0 ? "text-positive" : day.delta < 0 ? "text-negative" : ""}`}>
                                        {day.delta !== 0 ? formatHoursDelta(day.delta) : ""}
                                      </div>
                                    </div>
                                  );
                                })}
                                {/* Week summary */}
                                <div className="grid grid-cols-[90px_80px_1fr_60px_60px_60px] bg-muted/20 border-b font-semibold">
                                  <div className="px-3 py-1 col-span-3 text-right text-muted-foreground">Woche {wi + 1}</div>
                                  <div className="px-2 py-1 text-right font-mono tabular-nums">{formatHours(week.ist)}</div>
                                  <div className="px-2 py-1 text-right font-mono tabular-nums">{formatHours(week.soll)}</div>
                                  <div className={`px-2 py-1 text-right font-mono tabular-nums ${week.delta >= 0 ? "text-positive" : "text-negative"}`}>
                                    {formatHoursDelta(week.delta)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Footer info */}
                          <div className="px-4 py-2 bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
                            <span>Arbeitszeitmodell: {detail.schedule.weeklyHours}h/Woche ({detail.schedule.workingDays.join(", ")})</span>
                            {r.submittedAt && (
                              <span>Eingereicht am {new Date(r.submittedAt).toLocaleDateString("de-DE")} um {new Date(r.submittedAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Approve confirmation */}
      {confirmApprove && (
        <ConfirmDialog
          title="Monat genehmigen"
          message={`${formatMonthYear(confirmApprove.year, confirmApprove.month)} fuer ${confirmApprove.user.displayName} genehmigen? Der Mitarbeiter kann danach keine Aenderungen mehr vornehmen.`}
          confirmLabel="Genehmigen"
          onConfirm={() => handleApprove(confirmApprove)}
          onCancel={() => setConfirmApprove(null)}
        />
      )}
    </div>
  );
}
