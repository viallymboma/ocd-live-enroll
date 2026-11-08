import "server-only";

import type { DayHours, PackageDTO, ScheduleRules } from "@/lib/types";
import { collections, type PackageDoc, type ScheduleDoc } from "./db";

/**
 * DEFAULTS — OCD Live's proposed offer (2026-11-08). The CEO can change
 * every value in the dashboard (Formules, Planning).
 */
const days = (d: DayHours, sunday: boolean): DayHours[] => [sunday ? d : null, d, d, d, d, d, d];

export const DEFAULT_RULES: ScheduleRules = {
  // Togo uses the West African CFA franc (XOF), shown as "FCFA".
  currency: "XOF",
  currencyConfirmed: true,
  gapMinutes: 30,
  capacity: 1,
  stepMinutes: 30,
  bookingWindowDays: 60,
  minNoticeHours: 48,
  hours: {
    // Online lives follow the audience: late morning to late evening, every day.
    online: days({ open: "10:00", close: "22:00" }, true),
    // The Lomé studio: Monday to Saturday, daytime.
    onsite: days({ open: "09:00", close: "19:00" }, false),
  },
  closedDays: [],
};

type Seed = Omit<PackageDoc, "_id" | "createdAt" | "updatedAt">;

/** The six proposed packages — durations on a clear ladder, priced around the 1 h 30 ≈ 15,000 reference. */
export const SUGGESTED_PACKAGES: Seed[] = [
  {
    name: { fr: "Flash", en: "Flash" },
    description: { fr: "Un passage express pour tester le live et faire découvrir votre produit.", en: "A quick slot to try live selling and introduce your product." },
    deliverables: {
      fr: ["30 min de présentation en live", "Démonstration du produit", "1 mention de votre page", "Lien ou code promo annoncé en direct"],
      en: ["30 min live presentation", "Product demo", "1 shout-out of your page", "Link or promo code announced live"],
    },
    durationMinutes: 30, price: 7500, liveTypes: ["online"], order: 1, active: true, placeholder: false,
  },
  {
    name: { fr: "Découverte", en: "Discovery" },
    description: { fr: "Une heure pour présenter votre marque et répondre aux questions du public.", en: "One hour to present your brand and answer the audience's questions." },
    deliverables: {
      fr: ["1 h en live avec un influenceur", "Questions-réponses avec le public", "2 mentions de votre page", "Code promo annoncé en direct"],
      en: ["1 h live with an influencer", "Audience Q&A", "2 shout-outs of your page", "Promo code announced live"],
    },
    durationMinutes: 60, price: 10000, liveTypes: ["online", "onsite"], order: 2, active: true, placeholder: false,
  },
  {
    name: { fr: "Essentiel", en: "Essential" },
    description: { fr: "La formule de référence : le temps de convaincre et de vendre.", en: "Our core package: enough time to convince and to sell." },
    deliverables: {
      fr: ["1 h 30 en live avec un influenceur", "Démonstration et essai du produit", "Code promo exclusif", "1 extrait vidéo du live offert"],
      en: ["1 h 30 live with an influencer", "Product demo and try-on", "Exclusive promo code", "1 video clip of the live"],
    },
    durationMinutes: 90, price: 15000, liveTypes: ["online", "onsite"], order: 3, active: true, placeholder: false,
  },
  {
    name: { fr: "Boost", en: "Boost" },
    description: { fr: "Deux heures et une visibilité prolongée après le live.", en: "Two hours, plus visibility that lasts after the live." },
    deliverables: {
      fr: ["2 h en live avec un influenceur", "Jeu-concours pour le public", "2 extraits vidéo montés", "Story de rappel la veille du live", "Bilan : vues et commentaires"],
      en: ["2 h live with an influencer", "Giveaway for the audience", "2 edited video clips", "Reminder story the day before", "Report: views and comments"],
    },
    durationMinutes: 120, price: 25000, liveTypes: ["online", "onsite"], order: 4, active: true, placeholder: false,
  },
  {
    name: { fr: "Prestige", en: "Prestige" },
    description: { fr: "Une demi-journée avec une personnalité connue pour un vrai lancement.", en: "Half a day with a well-known personality for a real launch." },
    deliverables: {
      fr: ["4 h en live animé par une célébrité", "Plusieurs passages de votre produit", "Séance photo produit au studio", "4 extraits vidéo montés", "Annonce du live sur les réseaux OCD Live", "Bilan détaillé"],
      en: ["4 h live hosted by a celebrity", "Several product segments", "Product photo shoot at the studio", "4 edited video clips", "Live announced on OCD Live's socials", "Detailed report"],
    },
    durationMinutes: 240, price: 45000, liveTypes: ["online", "onsite"], order: 5, active: true, placeholder: false,
  },
  {
    name: { fr: "Journée OCD", en: "OCD Takeover" },
    description: { fr: "Le studio de Lomé à vous pour la journée : lancement, événement, grande promo.", en: "The Lomé studio is yours for the day: launch, event or big sale." },
    deliverables: {
      fr: ["8 h au studio OCD Live de Lomé", "Célébrité et influenceurs en relais", "Décor du plateau à vos couleurs", "Séance photo et vidéo complète", "Extraits vidéo illimités de la journée", "Campagne d'annonce sur les réseaux OCD Live"],
      en: ["8 h at the OCD Live studio in Lomé", "Celebrity and influencers taking turns", "Set dressed in your brand colours", "Full photo and video shoot", "Unlimited video clips from the day", "Announcement campaign on OCD Live's socials"],
    },
    durationMinutes: 480, price: 80000, liveTypes: ["onsite"], order: 6, active: true, placeholder: false,
  },
];

function seedPackages(): Omit<PackageDoc, "_id">[] {
  const now = new Date();
  return SUGGESTED_PACKAGES.map((p) => ({ ...p, createdAt: now, updatedAt: now }));
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

/** All packages; the six suggested packages are created on first use of an empty database. */
export async function listPackages(opts: { activeOnly?: boolean } = {}): Promise<PackageDTO[]> {
  const { packages } = await collections();
  if ((await packages.estimatedDocumentCount()) === 0) {
    // Upsert-by-order so two cold starts cannot seed twice.
    await Promise.all(
      seedPackages().map((p) => packages.updateOne({ order: p.order }, { $setOnInsert: p }, { upsert: true })),
    );
  }
  const docs = await packages.find(opts.activeOnly ? { active: true } : {}).sort({ order: 1 }).toArray();
  return docs.map(toPackageDTO);
}
