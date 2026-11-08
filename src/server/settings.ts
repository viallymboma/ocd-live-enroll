import "server-only";

import type { DayHours, PackageDTO, ScheduleRules } from "@/lib/types";
import { collections, type PackageDoc, type ScheduleDoc } from "./db";

/**
 * DEFAULTS — every value here is a placeholder the CEO replaces in the
 * dashboard. Nothing below is a confirmed commercial offer.
 */
const weekdays = (d: DayHours): DayHours[] => [null, d, d, d, d, d, d]; // closed on Sunday

export const DEFAULT_RULES: ScheduleRules = {
  // The client quoted prices in XAF; Togo uses XOF. Shown as "to confirm" until the CEO ticks it.
  currency: "XAF",
  currencyConfirmed: false,
  gapMinutes: 30,
  capacity: 1,
  stepMinutes: 30,
  bookingWindowDays: 60,
  minNoticeHours: 24,
  hours: {
    online: weekdays({ open: "09:00", close: "21:00" }),
    onsite: weekdays({ open: "09:00", close: "18:00" }),
  },
  closedDays: [],
};

const PLACEHOLDER_DURATIONS = [90, 120, 180, 240, 360, 480];

function placeholderPackages(): Omit<PackageDoc, "_id">[] {
  const now = new Date();
  return PLACEHOLDER_DURATIONS.map((durationMinutes, i) => ({
    name: { fr: `Formule ${i + 1}`, en: `Package ${i + 1}` },
    description: {
      fr: "Contenu à confirmer par OCD Live.",
      en: "Content to be confirmed by OCD Live.",
    },
    deliverables: {
      fr: ["Contenu à confirmer"],
      en: ["Content to be confirmed"],
    },
    durationMinutes,
    // 0 = "price to be confirmed". The client only gave an example (1 h 30 ≈ 15,000), not a price list.
    price: 0,
    liveTypes: ["online", "onsite"],
    order: i + 1,
    active: true,
    placeholder: true,
    createdAt: now,
    updatedAt: now,
  }));
}

export async function getRules(): Promise<ScheduleRules> {
  const { schedule } = await collections();
  const doc = await schedule.findOne({ _id: "main" });
  if (!doc) return DEFAULT_RULES;
  const { _id, updatedAt, ...rules } = doc;
  void _id;
  void updatedAt;
  return { ...DEFAULT_RULES, ...rules };
}

export async function saveRules(rules: ScheduleRules) {
  const { schedule } = await collections();
  const doc: ScheduleDoc = { _id: "main", ...rules, updatedAt: new Date() };
  await schedule.replaceOne({ _id: "main" }, doc, { upsert: true });
}

export function toPackageDTO(p: PackageDoc): PackageDTO {
  return {
    id: p._id.toHexString(),
    name: p.name,
    description: p.description,
    deliverables: p.deliverables,
    durationMinutes: p.durationMinutes,
    price: p.price,
    liveTypes: p.liveTypes,
    order: p.order,
    active: p.active,
    placeholder: p.placeholder,
  };
}

/** All packages; the six placeholders are created on first use of an empty database. */
export async function listPackages(opts: { activeOnly?: boolean } = {}): Promise<PackageDTO[]> {
  const { packages } = await collections();
  if ((await packages.estimatedDocumentCount()) === 0) {
    // Upsert-by-order so two cold starts cannot seed twice.
    await Promise.all(
      placeholderPackages().map((p) => packages.updateOne({ order: p.order }, { $setOnInsert: p }, { upsert: true })),
    );
  }
  const docs = await packages.find(opts.activeOnly ? { active: true } : {}).sort({ order: 1 }).toArray();
  return docs.map(toPackageDTO);
}
