import Link from "next/link";
import { NAV, OFFICIAL_ONLINE_SERVICES, SITE_NAME } from "@/lib/site";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">{SITE_NAME}</h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        A replica of selected Department of Migrant Workers information pages, with an assistant that answers
        from them in English, Filipino or Taglish and cites its sources.
      </p>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {NAV.filter((n) => n.href !== "/").map((n) => (
          <li key={n.href}>
            <Link
              href={n.href}
              className="block rounded-lg border border-slate-200 bg-white p-5 font-semibold text-slate-900 shadow-sm hover:border-blue-400"
            >
              {n.label} →
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-10 text-sm text-slate-600">
        To apply, register or log in, use the official{" "}
        <a href={OFFICIAL_ONLINE_SERVICES} className="underline" rel="noopener noreferrer">
          DMW Online Services
        </a>
        . This demo collects no personal data.
      </p>
    </main>
  );
}
