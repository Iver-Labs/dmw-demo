/** Site-wide constants. Guardrails: no official name, seal or look-alike branding. */
export const SITE_NAME = "DMW Info Demo";
export const ASSISTANT_NAME = "DMW Info Assistant";

export const BANNER_TEXT =
  "Unofficial portfolio demo — not affiliated with the Department of Migrant Workers. For official services, visit dmw.gov.ph.";

export const OFFICIAL_SITE = "https://dmw.gov.ph";
export const OFFICIAL_ONLINE_SERVICES = "https://onlineservices.dmw.gov.ph";
export const OFFICIAL_PORTAL = "https://portal.dmw.gov.ph/Public/DMWOnlinePortal.aspx";

/** Date the content in content/kb was retrieved; update when re-curating. */
export const CONTENT_RETRIEVED = "2026-11-10";

export const NAV = [
  { href: "/", label: "Home", fil: "Home" },
  { href: "/faqs", label: "FAQs", fil: "Mga FAQ" },
  { href: "/oec-balik-manggagawa", label: "OEC & Balik-Manggagawa", fil: "OEC at Balik-Manggagawa" },
  { href: "/guides", label: "Guides", fil: "Mga gabay" },
  { href: "/directory", label: "Office Directory", fil: "Direktoryo ng opisina" },
  { href: "/contact", label: "Contact & Hotlines", fil: "Kontak at hotline" },
] as const;

/** Assistant topic label for the current page ("Topic: …"). Never inferred from the user. */
export function topicFor(pathname: string, lang: "en" | "fil"): string {
  const page = NAV.find((n) => n.href !== "/" && pathname.startsWith(n.href));
  if (!page) return lang === "fil" ? "Pangkalahatang gabay" : "General guidance";
  return lang === "fil" ? page.fil : page.label;
}

/** Home "Your journey" cards: the pages this demo clones. */
export const JOURNEYS = [
  {
    href: "/oec-balik-manggagawa",
    title: "OEC & Balik-Manggagawa",
    body: "For OFWs returning to a job",
    icon: "briefcase",
  },
  { href: "/faqs", title: "Common questions", body: "Answers from DMW's published FAQs", icon: "help" },
  {
    href: "/directory",
    title: "Office Directory",
    body: "Regional offices across the country",
    icon: "building",
  },
  { href: "/contact", title: "Contact & Hotlines", body: "Reach DMW by phone or email", icon: "phone" },
] as const;

/** Home "Quick Access Services": official destinations (links from the design handoff). */
export const QUICK_SERVICES = [
  {
    title: "Registration",
    body: "Create or update your worker profile.",
    href: OFFICIAL_ONLINE_SERVICES,
    icon: "idcard",
  },
  {
    title: "Recruitment agencies",
    body: "Find the official agency directory.",
    href: "https://dmw.gov.ph/inquiry/licensed-recruitment-agencies",
    icon: "shield",
  },
  {
    title: "Approved job orders",
    body: "Browse the official job-order listing.",
    href: "https://dmw.gov.ph/inquiry/approved-job-orders",
    icon: "briefcase",
  },
  {
    title: "Working abroad again",
    body: "Find returning-worker services.",
    href: OFFICIAL_PORTAL,
    icon: "send",
  },
  {
    title: "Reintegration",
    body: "Explore support for returning home.",
    href: "https://dmw.gov.ph/archives/v1/reintegration",
    icon: "home",
  },
  {
    title: "Helpdesk & FAQs",
    body: "Find official support and answers.",
    href: OFFICIAL_PORTAL,
    icon: "help",
  },
] as const;

export const SUGGESTED_QUESTIONS = [
  "Paano kumuha ng OEC exemption?",
  "Who qualifies as a Balik-Manggagawa?",
  "Kailangan ko pa ba ng OEC kung babalik ako sa parehong employer?",
  "Saan ang DMW regional office sa Cebu?",
  "What is the DMW hotline?",
] as const;
