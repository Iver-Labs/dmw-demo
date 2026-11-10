/** Site-wide constants. Guardrails: no official name, seal or look-alike branding. */
export const SITE_NAME = "DMW Info Demo";

export const BANNER_TEXT =
  "Unofficial portfolio demo — not affiliated with the Department of Migrant Workers. For official services, visit dmw.gov.ph.";

export const OFFICIAL_SITE = "https://dmw.gov.ph";
export const OFFICIAL_ONLINE_SERVICES = "https://onlineservices.dmw.gov.ph";

/** Date the content in content/kb was retrieved; update when re-curating. */
export const CONTENT_RETRIEVED = "2026-11-10";

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/faqs", label: "FAQs" },
  { href: "/oec-balik-manggagawa", label: "OEC & Balik-Manggagawa" },
  { href: "/directory", label: "Office Directory" },
  { href: "/contact", label: "Contact & Hotlines" },
] as const;

export const SUGGESTED_QUESTIONS = [
  "Paano kumuha ng OEC exemption?",
  "Who qualifies as a Balik-Manggagawa?",
  "Kailangan ko pa ba ng OEC kung babalik ako sa parehong employer?",
  "Saan ang DMW regional office sa Cebu?",
  "What is the DMW hotline?",
] as const;
