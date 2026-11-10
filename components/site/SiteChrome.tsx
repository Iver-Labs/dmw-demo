import Link from "next/link";
import { BANNER_TEXT, CONTENT_RETRIEVED, NAV, OFFICIAL_SITE, SITE_NAME } from "@/lib/site";

/** Guardrail: permanent, non-dismissible unofficial banner on every page. */
export function UnofficialBanner() {
  return (
    <div role="note" className="bg-amber-300 px-4 py-2 text-center text-sm font-semibold text-amber-950">
      {BANNER_TEXT.replace("dmw.gov.ph.", "")}
      <a href={OFFICIAL_SITE} className="underline" rel="noopener noreferrer">
        dmw.gov.ph
      </a>
      .
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          {/* Neutral placeholder mark: no official seal or logo. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mark.svg" alt="" width={40} height={40} />
          <span className="text-lg font-bold text-slate-900">{SITE_NAME}</span>
        </Link>
        <nav aria-label="Main" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-slate-700">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-blue-800 hover:underline">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50 text-sm text-slate-600">
      <div className="mx-auto max-w-6xl space-y-2 px-4 py-6">
        <p>
          Content adapted from{" "}
          <a href={OFFICIAL_SITE} className="underline" rel="noopener noreferrer">
            dmw.gov.ph
          </a>{" "}
          for demonstration, retrieved {CONTENT_RETRIEVED}; may be outdated.
        </p>
        <p>
          {SITE_NAME} is a non-commercial portfolio project and is not affiliated with the Department of
          Migrant Workers.
        </p>
      </div>
    </footer>
  );
}
