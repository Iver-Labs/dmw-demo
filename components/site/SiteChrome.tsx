import Link from "next/link";
import {
  BANNER_TEXT,
  CONTENT_RETRIEVED,
  NAV,
  OFFICIAL_ONLINE_SERVICES,
  OFFICIAL_PORTAL,
  OFFICIAL_SITE,
  SITE_NAME,
} from "@/lib/site";
import { Icon, NewTab } from "./Icons";

export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only z-[60] rounded-lg bg-white px-4 py-3 font-semibold text-action focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
    >
      Skip to content
    </a>
  );
}

/** Guardrail: permanent, non-dismissible unofficial banner on every page. */
export function UnofficialBanner() {
  return (
    <div role="note" className="bg-notice px-4 py-2 text-center text-caption text-notice-ink">
      <Icon name="info" weight="regular" className="mr-1.5 inline size-4 -translate-y-px align-middle" />
      {BANNER_TEXT.replace("dmw.gov.ph.", "")}
      <a
        href={OFFICIAL_SITE}
        className="font-semibold underline underline-offset-2"
        rel="noopener noreferrer"
      >
        dmw.gov.ph
      </a>
      .
    </div>
  );
}

/** Light utility bar: short site name and the official-site exits. */
export function UtilityBar() {
  return (
    <div className="border-b border-line bg-wash">
      <div className="wrap flex min-h-12 items-center gap-x-6 text-sm">
        <Link href="/" className="font-bold tracking-wide text-masthead uppercase">
          {SITE_NAME}
        </Link>
        <a
          href={OFFICIAL_SITE}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex min-h-11 items-center gap-1.5 text-action hover:underline"
        >
          Official DMW website
          <Icon name="external" weight="regular" className="size-4" />
          <NewTab />
        </a>
      </div>
    </div>
  );
}

/** Navy department-style masthead. Neutral globe mark, never the DMW seal. */
export function Masthead() {
  return (
    <header className="on-dark bg-masthead text-white">
      <div className="wrap flex items-center gap-4 py-5 md:gap-5 md:py-6">
        <Link href="/" className="flex min-w-0 items-center gap-4 md:gap-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white text-masthead md:size-16">
            <Icon name="globe" weight="bold" className="size-7 md:size-9" />
          </span>
          <span className="min-w-0">
            <span className="eyebrow block text-white/80">Your guide to DMW information</span>
            <span className="block text-2xl leading-tight font-bold md:text-4xl">{SITE_NAME}</span>
            <span className="block text-sm text-white/85 md:text-base" lang="fil">
              Gabay sa bawat hakbang ng iyong paglalakbay.
            </span>
          </span>
        </Link>
        <div className="ml-auto hidden text-right lg:block">
          <p className="text-lg font-bold">For every Filipino worker.</p>
          <p className="text-sm text-white/80">Preparing. Returning. Moving forward.</p>
        </div>
      </div>
    </header>
  );
}

export function GuidanceStrip() {
  return (
    <p className="border-b border-line bg-white px-4 py-2 text-center text-sm text-muted">
      Find guidance here. Complete transactions on official DMW portals.
    </p>
  );
}

export function SiteFooter() {
  const official = [
    { href: OFFICIAL_SITE, label: "Department of Migrant Workers" },
    { href: OFFICIAL_PORTAL, label: "DMW Online Portal" },
    { href: OFFICIAL_ONLINE_SERVICES, label: "DMW Online Services" },
  ];
  return (
    <footer className="on-dark mt-auto bg-masthead text-white">
      <div className="wrap grid gap-8 py-10 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <p className="text-2xl font-bold">{SITE_NAME}</p>
          <p className="mt-2 max-w-md text-white/85">
            An independent portfolio project helping Filipino workers find and understand DMW information. Not
            affiliated with the Department of Migrant Workers.
          </p>
        </div>
        <nav aria-label="Explore">
          <p className="eyebrow text-white/75">Explore</p>
          <ul className="mt-2">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="inline-flex min-h-11 items-center hover:underline">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Official resources">
          <p className="eyebrow text-white/75">Official resources</p>
          <ul className="mt-2">
            {official.map((o) => (
              <li key={o.href}>
                <a
                  href={o.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 hover:underline"
                >
                  {o.label}
                  <Icon name="external" weight="regular" className="size-4" />
                  <NewTab />
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/15">
        <div className="wrap flex flex-wrap justify-between gap-x-8 gap-y-2 py-5 text-caption text-white/75">
          <p>Independent project. Information assistance only. This demo collects no personal data.</p>
          <p>Content adapted from dmw.gov.ph, retrieved {CONTENT_RETRIEVED}; may be outdated.</p>
        </div>
      </div>
    </footer>
  );
}
