# OCD Live — enrolment & booking

Businesses book a slot to have their product presented on an influencer/celebrity live
(online, or at the OCD Live studio in Lomé). The CEO validates each request from `/admin`.

Business rules: [`docs/PRODUCT_BRIEF.md`](docs/PRODUCT_BRIEF.md).

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind 4 · Motion · MongoDB Atlas (driver, no ORM) ·
Cloudinary (private photos) · Nodemailer (SMTP) · Vercel.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill it in
npm run dev
```

`npm test` (availability rules) · `npm run typecheck` · `npm run lint` · `npm run build`.

## Environment variables (Vercel → Settings → Environment Variables)

| Name | Required | Notes |
|---|---|---|
| `MONGODB_URI` | ✅ | Same Atlas cluster as FOSOBA |
| `MONGODB_DB` | ✅ | `ocd_live` — never FOSOBA's database |
| `AUTH_SECRET` | ✅ | 32+ random characters (signs the admin cookie) |
| `SETUP_TOKEN` | ✅ first time | Code asked by `/setup` to create the CEO account |
| `CLOUDINARY_URL` | for photos | Without it, the photo fields are hidden |
| `CLOUDINARY_FOLDER` | | default `ocd-live` |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASSWORD` `MAIL_FROM` | for email | Without them nothing is sent; bookings still work |
| `ADMIN_NOTIFY_EMAIL` | | Gets a "new request" alert (comma-separated) |
| `ADMIN_LOCALE` | | Language of that alert: `fr` (default) or `en` |
| `PUBLIC_URL` | | Site address for the logo in emails (default: Vercel production URL) |

## First admin

Open `/setup`, enter `SETUP_TOKEN`, name, email, password. The screen refuses once an account exists.

## Map

`npm run map:build` regenerates `src/components/map/africa-geo.ts` from Natural Earth (world-atlas).

## Languages

French first, English toggle. Without a choice, an English-first browser gets English.
All text lives in `src/i18n/fr.ts` and `src/i18n/en.ts` (same shape, type-checked); emails in `src/server/mail.ts`.

## Brand

`public/brand/` — logo traced from the studio sign (SVG on light / on dark, PNG, email PNG).
