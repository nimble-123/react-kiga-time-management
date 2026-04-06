import { z } from "zod/v4";

// --- Time & Block Schemas ---

export const timeStringSchema = z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM erwartet");

export const blockTypeSchema = z.enum(["TAETIGKEIT", "VORBEREITUNG", "DB", "PAUSE"]);

export const markerSchema = z.enum(["URLAUB", "KRANK", "FEIERTAG", "UEBERSTD_ABBAU"]).nullable();

export const timeBlockSchema = z.object({
  blockType: blockTypeSchema,
  startTime: timeStringSchema,
  endTime: timeStringSchema,
}).refine(
  (data) => {
    const [sh, sm] = data.startTime.split(":").map(Number);
    const [eh, em] = data.endTime.split(":").map(Number);
    return eh * 60 + em > sh * 60 + sm;
  },
  { message: "Endzeit muss nach Startzeit liegen" },
);

// --- Day Entry Schemas ---

export const dayEntryCreateSchema = z.object({
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD erwartet"),
  marker: markerSchema,
  note: z.string().max(500).nullable().optional(),
  timeBlocks: z.array(z.object({
    blockType: blockTypeSchema,
    startTime: timeStringSchema,
    endTime: timeStringSchema,
  })),
});

export const dayEntryUpdateSchema = dayEntryCreateSchema.partial().extend({
  id: z.number().int().positive(),
});

// --- User Schemas ---

export const loginSchema = z.object({
  username: z.string().min(1, "Benutzername erforderlich"),
  password: z.string().min(1, "Passwort erforderlich"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Aktuelles Passwort erforderlich"),
  newPassword: z.string().min(6, "Mindestens 6 Zeichen"),
  confirmPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  { message: "Passwoerter stimmen nicht ueberein", path: ["confirmPassword"] },
);

export const createUserSchema = z.object({
  username: z.string().min(2, "Mindestens 2 Zeichen").max(50).regex(/^[a-zA-Z0-9._-]+$/, "Nur Buchstaben, Zahlen, Punkt, Bindestrich, Unterstrich"),
  displayName: z.string().min(2, "Mindestens 2 Zeichen").max(100),
  password: z.string().min(6, "Mindestens 6 Zeichen"),
  role: z.enum(["USER", "ADMIN"]),
  weeklyHours: z.number().min(0).max(50),
  workingDays: z.array(z.enum(["MO", "TU", "WE", "TH", "FR", "SA", "SU"])).min(1),
});

export const updateUserSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  isActive: z.boolean().optional(),
  weeklyHours: z.number().min(0).max(50).optional(),
  workingDays: z.array(z.enum(["MO", "TU", "WE", "TH", "FR", "SA", "SU"])).min(1).optional(),
});

// --- Monthly Review ---

export const monthlyReviewActionSchema = z.object({
  userId: z.number().int().positive(),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  comment: z.string().max(1000).optional(),
});

// --- Holiday ---

export const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD erwartet"),
  name: z.string().min(1, "Name erforderlich").max(100),
});

// --- Work Schedule ---

export const workScheduleSchema = z.object({
  userId: z.number().int().positive(),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weeklyHours: z.number().min(0).max(50),
  workingDays: z.array(z.enum(["MO", "TU", "WE", "TH", "FR", "SA", "SU"])).min(1),
  dailyHours: z.record(z.string(), z.number().min(0).max(12)).nullable().optional(),
});
