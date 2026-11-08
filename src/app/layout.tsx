import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";

import { I18nProvider } from "@/i18n/client";
import { getDict } from "@/i18n/server";
import { THEME_SCRIPT } from "@/lib/theme";
import { getThemePref } from "@/lib/theme-server";

import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz", "SOFT"], style: ["normal", "italic"], display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return {
    title: { default: t.meta.title, template: "%s · OCD Live" },
    description: t.meta.description,
    openGraph: { title: t.meta.title, description: t.meta.description, type: "website" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0c0b" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getDict();
  const pref = await getThemePref();
  return (
    // DARK is the default (light is a choice). "system" is resolved before paint by THEME_SCRIPT (hence suppressHydrationWarning).
    <html lang={locale} data-theme={pref === "light" ? "light" : "dark"} data-theme-pref={pref} className={`${fraunces.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="grain">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
