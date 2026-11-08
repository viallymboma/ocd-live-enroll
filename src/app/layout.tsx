import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";

import { I18nProvider } from "@/i18n/client";
import { getDict } from "@/i18n/server";

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

export const viewport: Viewport = { themeColor: "#0e0c0b", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale } = await getDict();
  return (
    <html lang={locale} className={`${fraunces.variable} ${manrope.variable}`}>
      <body className="grain">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
