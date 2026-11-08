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

Set them for **Production** (and Preview if you use preview links), then redeploy.

| Name | Required | Value |
|---|---|---|
| `MONGODB_URI` | ✅ | Same Atlas URI as FOSOBA (`mongodb+srv://…`) |
| `MONGODB_DB` | ✅ | `ocd_live` — never FOSOBA's database |
| `AUTH_SECRET` | ✅ | 32+ random characters — `openssl rand -base64 48` (signs the admin cookie) |
| `SETUP_TOKEN` | ✅ first time | 16+ characters; the code `/setup` asks for to create the CEO account |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASSWORD` | ✅ for email | Without them no email leaves: no client confirmations and **no password-reset link** |
| `MAIL_FROM` | ✅ for email | e.g. `OCD Live <no-reply@your-domain>` (must be allowed by the SMTP account) |
| `SMTP_SECURE` | | `true`/`false`; default: true on port 465 |
| `CLOUDINARY_URL` | for photos | `cloudinary://key:secret@cloud`; without it the logo/photo fields are hidden |
| `CLOUDINARY_FOLDER` | | default `ocd-live` |
| `ADMIN_NOTIFY_EMAIL` | | Gets a "new request" alert (comma-separated) |
| `ADMIN_LOCALE` | | Language of that alert: `fr` (default) or `en` |
| `PUBLIC_URL` | | Site address for the logo in emails (default: the Vercel production URL) |

## Password reset

Login → "Forgot password?" → a one-time link valid 30 minutes is emailed (needs SMTP).
Setting a new password signs every other device out and lifts a login lock. No two-factor step.

## First admin

Open `/setup`, enter `SETUP_TOKEN`, name, email, password. The screen refuses once an account exists.

## Map

`npm run map:build` regenerates `src/components/map/africa-geo.ts` from Natural Earth (world-atlas).

## Languages

French first, English toggle. Without a choice, an English-first browser gets English.
All text lives in `src/i18n/fr.ts` and `src/i18n/en.ts` (same shape, type-checked); emails in `src/server/mail.ts`.

## Brand

`public/brand/` — logo traced from the studio sign (SVG on light / on dark, PNG, email PNG).
