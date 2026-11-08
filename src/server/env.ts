import "server-only";

import { z } from "zod";

/** Environment variables, read and checked once. Empty values count as missing. */
const clean = Object.fromEntries(Object.entries(process.env).map(([k, v]) => [k, v?.trim() ? v : undefined]));

const schema = z.object({
  MONGODB_URI: z.string().startsWith("mongodb"),
  MONGODB_DB: z.string().min(1).default("ocd_live"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  SETUP_TOKEN: z.string().min(16).optional(),
  CLOUDINARY_URL: z.string().regex(/^cloudinary:\/\/[^:]+:[^@]+@.+$/).optional(),
  CLOUDINARY_FOLDER: z.string().regex(/^[a-z0-9_-]+$/i).default("ocd-live"),
  ADMIN_NOTIFY_EMAIL: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

let parsed: z.infer<typeof schema> | undefined;
/** Lazy so `next build` does not need the secrets. */
export function env() {
  parsed ??= schema.parse(clean);
  return parsed;
}
