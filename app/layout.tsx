import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next } from "next/font/google";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { SectionNav } from "@/components/site/SectionNav";
import {
  GuidanceStrip,
  Masthead,
  SiteFooter,
  SkipLink,
  UnofficialBanner,
  UtilityBar,
} from "@/components/site/SiteChrome";
import { SITE_NAME } from "@/lib/site";
import "./globals.css";

// Built for legibility: I/l/1 and 0/O stay distinct, which matters when reading OEC and reference
// numbers. Downloaded at build time and self-hosted; the browser never calls Google.
const atkinson = Atkinson_Hyperlegible_Next({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-atkinson",
  // next/font has no metric overrides for this family, so name the swap fallback explicitly.
  adjustFontFallback: false,
  fallback: ["system-ui", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: "Unofficial portfolio demo of DMW information pages with a cited SEA-LION chatbot.",
  // Guardrail: never searchable (also X-Robots-Tag in next.config.ts and public/robots.txt).
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#102252",
  // Mobile keyboards resize the page, so the assistant's composer stays above the keyboard.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${atkinson.variable} h-full font-sans antialiased`}>
      <body className="flex min-h-full flex-col">
        <SkipLink />
        <UnofficialBanner />
        <UtilityBar />
        <Masthead />
        <SectionNav />
        <GuidanceStrip />
        {children}
        <SiteFooter />
        <ChatWidget />
      </body>
    </html>
  );
}
