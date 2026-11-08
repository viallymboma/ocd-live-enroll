import { z } from "zod";

import { SECTORS } from "./types";

/** Shared by the browser (instant feedback) and the server (the real check). */
const text = (max: number) => z.string().trim().min(1, "required").max(max, "tooLong");
const optionalText = (max: number) => z.string().trim().max(max, "tooLong").optional().transform((v) => v || undefined);

export function normalizeUrl(v: string) {
  const s = v.trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}
const optionalUrl = z
  .string()
  .trim()
  .max(300, "tooLong")
  .optional()
  .transform((v) => (v ? normalizeUrl(v) : undefined))
  .refine((v) => !v || /^https?:\/\/[^\s/$.?#][^\s]*\.[^\s]{2,}/i.test(v), "url");

export function normalizePhone(v: string) {
  const digits = v.replace(/[^\d+]/g, "");
  return digits.startsWith("00") ? `+${digits.slice(2)}` : digits;
}

export const businessSchema = z.object({
  name: text(120),
  sector: z.enum(SECTORS, { message: "required" }),
  product: text(160),
  description: text(1500),
  country: text(80),
  city: text(80),
  tiktok: optionalUrl,
  instagram: optionalUrl,
  facebook: optionalUrl,
  website: optionalUrl,
  specialRequests: optionalText(1000),
});

export const contactSchema = z.object({
  fullName: text(120),
  whatsapp: z
    .string()
    .trim()
    .transform(normalizePhone)
    .refine((v) => /^\+?\d{8,15}$/.test(v), "phone"),
  email: z.string().trim().toLowerCase().pipe(z.email("email")).pipe(z.string().max(160, "tooLong")),
});

export const bookingSchema = z.object({
  liveType: z.enum(["online", "onsite"]),
  packageId: z.string().regex(/^[a-f0-9]{24}$/),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  business: businessSchema,
  contact: contactSchema,
  uploads: z.object({ logo: z.string().nullable(), photos: z.array(z.string()).max(5) }),
  locale: z.enum(["fr", "en"]),
  /** Honeypot: humans never fill it. */
  website2: z.string().max(0).optional(),
});

/** First error message per field, as dictionary keys ("required", "email"…). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
