export type Role = "USER" | "ADMIN";

export type Marker = "URLAUB" | "KRANK" | "FEIERTAG" | "UEBERSTD_ABBAU";

export type BlockType = "TAETIGKEIT" | "VORBEREITUNG" | "DB" | "PAUSE";

export type ReviewStatus = "OPEN" | "SUBMITTED" | "APPROVED" | "RETURNED";

export const MARKER_LABELS: Record<Marker, string> = {
  URLAUB: "Urlaub",
  KRANK: "Krankheit",
  FEIERTAG: "Feiertag",
  UEBERSTD_ABBAU: "Ueberstundenabbau",
};

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  TAETIGKEIT: "Taetigkeit",
  VORBEREITUNG: "Vorbereitung",
  DB: "Dienstbesprechung",
  PAUSE: "Pause",
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  OPEN: "Offen",
  SUBMITTED: "Eingereicht",
  APPROVED: "Genehmigt",
  RETURNED: "Zurueckgegeben",
};

export const WEEKDAY_MAP: Record<string, number> = {
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
  SU: 0,
};

export const WEEKDAY_LABELS: Record<string, string> = {
  MO: "Montag",
  TU: "Dienstag",
  WE: "Mittwoch",
  TH: "Donnerstag",
  FR: "Freitag",
  SA: "Samstag",
  SU: "Sonntag",
};

export interface TimeBlockData {
  blockType: BlockType;
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
}

export interface DayEntryData {
  workDate: string; // YYYY-MM-DD
  marker: Marker | null;
  note: string | null;
  timeBlocks: TimeBlockData[];
}

export interface DayCalculation {
  ist: number;
  soll: number;
  delta: number;
}

export interface WeekSummary {
  ist: number;
  soll: number;
  delta: number;
}

export interface MonthSummary {
  ist: number;
  soll: number;
  delta: number;
  carryOver: number;
}

export interface WorkScheduleData {
  weeklyHours: number;
  workingDays: string[];
  dailyHours: Record<string, number> | null;
}
