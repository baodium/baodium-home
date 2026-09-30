import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Newsreader } from "next/font/google";
import { CursorFollower } from "@/components/CursorFollower";
import { ScrollProgress } from "@/components/ScrollProgress";
import { StudioField } from "@/components/StudioField";
import { site } from "@/data/site";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    template: "%s — Baodium",
  },
  description: site.description,
  applicationName: "Baodium",
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  alternates: {
    canonical: site.url,
  },
  openGraph: {
    type: "website",
    url: site.url,
    siteName: "Baodium",
    title: site.title,
    description: site.description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: site.title,
    description: site.description,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${newsreader.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg font-sans text-ink">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <ScrollProgress />
        <CursorFollower />
        <StudioField />
        {children}
        <noscript>
          <style>{`.reveal,.map-root,.map-root *{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
      </body>
    </html>
  );
}
