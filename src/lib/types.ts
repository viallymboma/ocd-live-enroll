/** Shared types — safe for both browser and server. */
export type LiveType = "online" | "onsite";
export const LIVE_TYPES: LiveType[] = ["online", "onsite"];

export type Locale = "fr" | "en";
export type Localized = { fr: string; en: string };
export type LocalizedList = { fr: string[]; en: string[] };

export type BookingStatus = "pending" | "validated" | "rejected" | "cancelled";
export const BOOKING_STATUSES: BookingStatus[] = ["pending", "validated", "rejected", "cancelled"];
/** Statuses that keep their time slot reserved. */
export const HOLDING_STATUSES: BookingStatus[] = ["pending", "validated"];

export type PackageDTO = {
  id: string;
  name: Localized;
  description: Localized;
  deliverables: LocalizedList;
  durationMinutes: number;
  price: number;
  liveTypes: LiveType[];
  order: number;
  active: boolean;
  /** True while the CEO has not confirmed this offer: shown as "to be confirmed". */
  placeholder: boolean;
};

/** One weekday's opening hours ("HH:MM"), or null when closed. Index 0 = Sunday. */
export type DayHours = { open: string; close: string } | null;

export type ClosedDay = { date: string; liveType: LiveType | "both"; note: string };

export type ScheduleRules = {
  currency: string;
  /** False until the CEO confirms the currency (XAF vs XOF question). */
  currencyConfirmed: boolean;
  gapMinutes: number;
  capacity: number;
  stepMinutes: number;
  bookingWindowDays: number;
  minNoticeHours: number;
  hours: Record<LiveType, DayHours[]>;
  closedDays: ClosedDay[];
};

export type BusinessInfo = {
  name: string;
  sector: string;
  product: string;
  description: string;
  /** ISO 3166-1 alpha-2, e.g. "TG". */
  country: string;
  city: string;
  socials: { network: string; url: string }[];
  specialRequests?: string;
};

export type ContactInfo = { fullName: string; whatsapp: string; email: string };

export const SECTORS = ["fashion", "beauty", "food", "tech", "health", "home", "services", "events", "other"] as const;
