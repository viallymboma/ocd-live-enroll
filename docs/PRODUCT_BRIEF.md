# OCD Live — Enrolment Platform Plan

**Status:** source of truth for business rules · v1 built 2026-11-08 · brand reference: `brand-reference-studio-sign.jpeg`

---

## 1. What OCD Live is (corrected)

Businesses pay to **advertise their product during a live** hosted by an influencer or celebrity.
The platform is where a business **signs up, picks a package, books a slot, and tells us about its business**.
The CEO then **validates** each sign-up from a private dashboard.

Two kinds of live:

| Type | Where |
|---|---|
| **Online live** | Streamed (TikTok etc.) |
| **On-site live** | OCD Live studio in Lomé, Togo |

### Corrections from the first brief
- "6 people" = **6 packages** (pricing + what's included), not 6 seats.
  Example: *1 h 30 — 15,000 XAF*, *4 h — …*, etc.
- The cut-off sentence = the CEO **can validate** sign-ups.

---

## 2. Sign-up path (what the business sees)

Smooth, phone-first, no password to create. One screen per step, with a progress bar and a Back button.

1. **Landing page** — OCD Live logo, one line on what it is, two big buttons right away:
   **Online live** · **On-site live in Lomé**
2. **Pick a package** — 6 cards: name, duration, price in XAF, what's included (bullet list). One tap selects.
3. **Pick a day** — calendar. Only days with free time for that package can be clicked.
4. **Pick a time** — start times for that day appear. Only times where the **whole package duration fits** are shown (a 4 h package won't be offered at 17:00 if the day ends at 18:00).
5. **About your business** — see §3.
6. **Your contact** — contact person name, WhatsApp number, email.
7. **Review** — summary of everything, "Edit" link on each part, then **Send my request**.
8. **Done** — "Request received. We'll validate it and contact you." + reference number (e.g. `OCD-4K7P`). Same summary sent by email.

The slot is **held** as soon as the request is sent, so nobody else can book it while the CEO decides.

---

## 3. Business information form

Proposed fields (client to confirm the list):

| Field | Required |
|---|---|
| Business name | ✅ |
| Sector (list: fashion, beauty, food, tech, services, other…) | ✅ |
| Product / service to promote | ✅ |
| Short description (what should the host say?) | ✅ |
| Country + city | ✅ |
| Social links (TikTok, Instagram, Facebook, website) | optional |
| Logo + up to 5 product photos | optional |
| Special requests for the live | optional |

---

## 4. CEO dashboard

Private, email + password login.

**Requests**
- List of all sign-ups: reference, business, package, type, day + time, status, date sent.
- Filters: status, type, package, date range. Search by business name or phone.
- Open one request → see everything (business info, photos, contact).
- Actions: **Validate**, **Reject** (with a reason), **Move** to another slot, add a private note.
- Statuses: `Pending` → `Validated` / `Rejected` / `Cancelled`. A rejected or cancelled request frees its slot.
- Business gets an email on each status change.
- Export to Excel/CSV.

**Packages**
- Edit the 6 packages: name, duration, price, included items, order, on/off, and whether each is for online, on-site, or both.

**Schedule**
- Set opening hours per weekday for each type (online / Lomé).
- Close specific days (holidays, events).
- Gap between two lives (e.g. 30 min).
- How many businesses can share one time slot (default 1).

**Overview**
- Calendar view of the week: booked / free time.
- Counters: pending, validated this month, revenue of validated requests.

---

## 5. Technical choices

| Item | Choice |
|---|---|
| App | Next.js (same stack as FOSOBA), TypeScript, Tailwind |
| Database | Same MongoDB Atlas cluster as FOSOBA, **separate database `ocd_live`** |
| Hosting | Vercel — project `ocd-live-enroll`, auto-deploy from `main` of `github.com/viallymboma/ocd-live-enroll` |
| Photos | Vercel Blob (or the store FOSOBA already uses) |
| Email | Same SMTP as FOSOBA |
| CEO login | Email + password, stored hashed; first account created by a one-time setup screen |
| Double booking | Server re-checks the slot when saving (unique index on the slot), so two people can't take the same time |
| Time zone | Africa/Lomé (UTC+0), shown everywhere |
| Language | French first, English toggle |
| Brand | From the logo: warm orange "OCD" + charcoal "Live", white background, Africa shape as a visual motif |

**Data (4 collections):** `packages`, `scheduleRules` (opening hours, closed days, settings), `bookings` (business info + contact + slot + status + history), `admins`.

---

## 6. Build order

| Step | What | Result |
|---|---|---|
| 1 | Project setup, brand colours, DB connection, deploy to Vercel | Empty site live on Vercel |
| 2 | Packages + schedule models, seeded with 6 sample packages | Data ready |
| 3 | Sign-up path, steps 1–8 | A business can book end to end |
| 4 | CEO login + Requests list + Validate / Reject | CEO can validate |
| 5 | Emails (received, validated, rejected) | Business is kept informed |
| 6 | Packages + Schedule editors in the dashboard | CEO runs it alone |
| 7 | Move, notes, export, overview calendar | Nice-to-haves |
| 8 | Phone test of the whole flow in the browser, fixes | Ready to show the client |

Steps 1–5 = first demo to the CEO.

---

## 7. Questions for the client

1. **The 6 packages** — exact names, durations, prices, and what each includes.
2. **Packages per type** — same 6 for online and Lomé, or different?
3. **Payment** — how does the business pay? Mobile Money (T-Money / Flooz / MTN / Orange), on site, or after validation? (v1 plan: no online payment; CEO validates once paid.)
4. **Opening hours** — which days and hours for online lives, and for Lomé?
5. **One business per slot**, or can several businesses share one live?
6. **Business form** — is the field list in §3 right? Anything to add (tax number, budget, target audience)?
7. **Host choice** — does the business pick the influencer/celebrity, or does OCD Live decide?
8. **Currency** — XAF only, or also XOF (Togo uses XOF)?
9. **Domain name** — use the Vercel address for now, or do they have one?

> Note on 8: Togo uses the **XOF** (West African franc), not XAF (Central African franc). Worth checking which one the prices are in.

---

## 8. What v1 implements (2026-11-08)

| Rule | How |
|---|---|
| Slot held while pending | `pending` and `validated` hold time; `rejected`/`cancelled` release it |
| No overlap between packages of different lengths | Interval overlap + gap check (`src/lib/schedule.ts`, unit-tested) |
| No double booking under concurrency | Re-check inside a MongoDB transaction + per-(type, day) lock document (`dayLocks`) → write conflict forces a retry on fresh data |
| Capacity > 1 | Sweep-line: never more than N bookings at the same instant |
| Package edits never rewrite history | Each booking keeps a snapshot of name, duration, price, currency, deliverables |
| No pending auto-expiry | Not implemented on purpose (not decided by the client) |
| Online and Lomé schedules | Separate resources; a Lomé booking never blocks an online slot |
| Currency | Setting in Planning, default XAF, flagged "to confirm" until the CEO ticks it |
| Placeholder packages | 6 × "Formule N", price 0 = "Tarif à confirmer", badge "Contenu à confirmer" |
