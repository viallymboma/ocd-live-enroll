import "server-only";

import nodemailer from "nodemailer";

import { formatDay, formatDuration, formatMoney, lomeTime } from "@/lib/time";
import type { BookingDoc } from "./db";
import { env } from "./env";

/**
 * EMAIL — a failed email NEVER fails the booking or the CEO's action.
 * Without SMTP settings nothing is sent and everything else still works.
 */
type Transport = ReturnType<typeof nodemailer.createTransport>;
let transport: Transport | null | undefined;

function getTransport(): Transport | null {
  if (transport !== undefined) return transport;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !process.env.MAIL_FROM) return (transport = null);
  const port = Number(SMTP_PORT || 465);
  transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: SMTP_SECURE ? SMTP_SECURE === "true" : port === 465,
    auth: SMTP_USER && SMTP_PASSWORD ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transport;
}

async function send(to: string, subject: string, text: string, html: string) {
  const t = getTransport();
  if (!t) return;
  try {
    await t.sendMail({ from: process.env.MAIL_FROM, to, subject, text, html });
  } catch (e) {
    console.error("[mail]", subject, e instanceof Error ? e.message : e);
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Public address of the site, for the logo in emails. */
function siteUrl() {
  const raw = process.env.PUBLIC_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "";
  if (!raw) return "";
  return (/^https?:\/\//.test(raw) ? raw : `https://${raw}`).replace(/\/+$/, "");
}

function layout(title: string, lines: string[], rows: [string, string][]) {
  const table = rows
    .map(([k, v]) => `<tr><td style="padding:6px 16px 6px 0;color:#8a7f72;font-size:13px">${esc(k)}</td><td style="padding:6px 0;color:#f3ebdd;font-size:14px">${esc(v)}</td></tr>`)
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#0e0c0b;font-family:Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
${siteUrl() ? `<img src="${siteUrl()}/brand/ocd-live-logo-email.png" width="120" alt="OCD Live" style="display:block;border:0">` : `<div style="font-size:28px;font-weight:800;letter-spacing:-1px;color:#d2692a">OCD <span style="color:#f3ebdd">Live</span></div>`}
<h1 style="color:#f3ebdd;font-size:22px;line-height:1.3;margin:28px 0 16px">${esc(title)}</h1>
${lines.map((l) => `<p style="color:#cfc4b4;font-size:15px;line-height:1.6;margin:0 0 12px">${esc(l)}</p>`).join("")}
<table style="margin-top:20px;border-top:1px solid #2a2420;padding-top:12px">${table}</table>
<p style="color:#6f655a;font-size:12px;margin-top:32px">OCD Live · Lomé, Togo</p>
</div></body></html>`;
}

const T = {
  fr: {
    type: { online: "Live en ligne", onsite: "Live sur place — Lomé" },
    rows: ["Référence", "Type de live", "Formule", "Durée", "Prix", "Date", "Heure (Lomé)", "Entreprise"],
    priceTbc: "À confirmer",
    received: {
      subject: (r: string) => `Demande reçue — ${r}`,
      title: "Nous avons bien reçu votre demande.",
      lines: [
        "Votre créneau est réservé pendant que notre équipe étudie votre demande.",
        "Elle n'est pas encore validée : nous vous contactons très vite sur WhatsApp ou par e-mail.",
      ],
    },
    validated: {
      subject: (r: string) => `Demande validée — ${r}`,
      title: "Bonne nouvelle : votre demande est validée.",
      lines: ["Votre live est confirmé. Notre équipe vous contacte pour préparer la suite."],
    },
    rejected: {
      subject: (r: string) => `Votre demande ${r}`,
      title: "Nous ne pouvons pas donner suite à votre demande.",
      lines: ["Le créneau a été libéré. N'hésitez pas à refaire une demande."],
      reason: "Motif : ",
    },
    cancelled: {
      subject: (r: string) => `Réservation annulée — ${r}`,
      title: "Votre réservation a été annulée.",
      lines: ["Le créneau a été libéré. Contactez-nous pour toute question."],
    },
    moved: {
      subject: (r: string) => `Nouvel horaire — ${r}`,
      title: "L'horaire de votre live a changé.",
      lines: ["Voici la nouvelle date et heure retenues par notre équipe."],
    },
    admin: {
      title: (b: string) => `Nouvelle demande : ${b}`,
      toValidate: "À valider : ",
      rows: ["Référence", "Entreprise", "Type", "Formule", "Date", "Contact"],
    },
  },
  en: {
    type: { online: "Online live", onsite: "On-site live — Lomé" },
    rows: ["Reference", "Live type", "Package", "Duration", "Price", "Date", "Time (Lomé)", "Business"],
    priceTbc: "To be confirmed",
    received: {
      subject: (r: string) => `Request received — ${r}`,
      title: "We've received your request.",
      lines: [
        "Your time slot is held while our team reviews your request.",
        "It is not approved yet: we'll contact you shortly on WhatsApp or by email.",
      ],
    },
    validated: {
      subject: (r: string) => `Request approved — ${r}`,
      title: "Good news: your request is approved.",
      lines: ["Your live is confirmed. Our team will contact you to prepare the next steps."],
    },
    rejected: {
      subject: (r: string) => `Your request ${r}`,
      title: "We're unable to accept your request.",
      lines: ["The time slot has been released. You're welcome to send a new request."],
      reason: "Reason: ",
    },
    cancelled: {
      subject: (r: string) => `Booking cancelled — ${r}`,
      title: "Your booking has been cancelled.",
      lines: ["The time slot has been released. Contact us with any questions."],
    },
    moved: {
      subject: (r: string) => `New time — ${r}`,
      title: "The time of your live has changed.",
      lines: ["Here are the new date and time chosen by our team."],
    },
    admin: {
      title: (b: string) => `New request: ${b}`,
      toValidate: "To validate: ",
      rows: ["Reference", "Business", "Type", "Package", "Date", "Contact"],
    },
  },
};

export type MailKind = "received" | "validated" | "rejected" | "cancelled" | "moved";

export async function mailClient(kind: MailKind, b: BookingDoc) {
  const l = b.locale;
  const t = T[l];
  const k = t[kind];
  const lines = [...k.lines];
  if (kind === "rejected" && b.rejectionReason) lines.push(t.rejected.reason + b.rejectionReason);
  const values = [
    b.reference,
    t.type[b.liveType],
    b.package.name[l],
    formatDuration(b.package.durationMinutes, l),
    b.package.price > 0 ? formatMoney(b.package.price, b.package.currency, l) : t.priceTbc,
    formatDay(b.day, l),
    lomeTime(b.start),
    b.business.name,
  ];
  const rows = t.rows.map((r, i) => [r, values[i]] as [string, string]);
  const text = [k.title, "", ...lines, "", ...rows.map(([a, v]) => `${a}: ${v}`)].join("\n");
  await send(b.contact.email, k.subject(b.reference), text, layout(k.title, lines, rows));
}

/** Alert to the CEO about a new request (ADMIN_NOTIFY_EMAIL, comma-separated; ADMIN_LOCALE fr|en, default fr). */
export async function mailAdminNewRequest(b: BookingDoc, adminUrl: string) {
  const to = env().ADMIN_NOTIFY_EMAIL;
  if (!to) return;
  const l = process.env.ADMIN_LOCALE === "en" ? "en" : "fr";
  const t = T[l];
  const values = [
    b.reference,
    b.business.name,
    t.type[b.liveType],
    b.package.name[l],
    `${formatDay(b.day, l)} · ${lomeTime(b.start)}`,
    `${b.contact.fullName} · ${b.contact.whatsapp}`,
  ];
  const rows = t.admin.rows.map((r, i) => [r, values[i]] as [string, string]);
  const title = t.admin.title(b.business.name);
  await send(to, `${title} (${b.reference})`, `${title}\n${adminUrl}\n\n${rows.map(([a, v]) => `${a}: ${v}`).join("\n")}`, layout(title, [t.admin.toValidate + adminUrl], rows));
}
