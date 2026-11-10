import type { Metadata, Viewport } from "next";
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

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: "Unofficial portfolio demo of DMW information pages with a cited SEA-LION chatbot.",
  // Guardrail: never searchable (also X-Robots-Tag in next.config.ts and public/robots.txt).
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#162556",
  // Mobile keyboards resize the page, so the assistant's composer stays above the keyboard.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
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
