import { AskAssistantButton } from "@/components/chat/AskAssistantButton";
import { docsBySection } from "@/lib/rag/kb";
import type { Section } from "@/lib/rag/types";
import { OFFICIAL_PORTAL, OFFICIAL_SITE } from "@/lib/site";
import { Icon, NewTab } from "./Icons";
import { Markdown } from "./Markdown";

/**
 * A cloned page rendered from the same content/kb Markdown that feeds the index,
 * so the site and the bot can't disagree.
 */
export function SectionPage({ section, title, intro }: { section: Section; title: string; intro?: string }) {
  const docs = docsBySection(section);
  return (
    <main id="main" className="flex-1">
      <div className="border-b border-line bg-surface/60">
        <div className="wrap py-8 md:py-10">
          <p className="eyebrow">DMW information</p>
          <h1 className="mt-1 text-3xl font-bold text-ink md:text-4xl">{title}</h1>
          {intro && <p className="mt-2 max-w-3xl text-muted md:text-lg">{intro}</p>}
        </div>
      </div>

      <div className="wrap grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          {docs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-6 text-muted">
              No content yet. Add Markdown files with <code>section: {section}</code> to{" "}
              <code>content/kb/</code> (see <code>content/README.md</code>).
            </p>
          ) : (
            docs.map((doc) => (
              <article key={doc.slug} className="card p-5 md:p-7">
                <h2 className="mb-3 text-xl font-bold text-ink md:text-2xl">{doc.title}</h2>
                <Markdown>{doc.body}</Markdown>
                <p className="mt-6 border-t border-line pt-3 text-xs text-muted">
                  Source:{" "}
                  <a
                    href={doc.sourceUrl}
                    className="inline-flex items-center gap-1 break-all text-action underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {doc.sourceUrl}
                    <NewTab />
                  </a>{" "}
                  · Retrieved {doc.retrieved} (not a policy update date)
                </p>
              </article>
            ))
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-xl bg-surface p-5">
            <p className="font-bold text-ink">Have a question about this page?</p>
            <p className="mt-1 text-sm text-muted">
              The assistant answers from these pages in English, Filipino or Taglish, and links its sources.
            </p>
            <AskAssistantButton className="btn-primary mt-4 w-full" />
          </div>
          <div className="card p-5">
            <p className="font-bold text-ink">Ready to transact?</p>
            <p className="mt-1 text-sm text-muted">
              Applications and appointments happen on official DMW portals.
            </p>
            <ul className="mt-2 text-sm">
              {[
                { href: OFFICIAL_PORTAL, label: "DMW Online Portal" },
                { href: OFFICIAL_SITE, label: "dmw.gov.ph" },
              ].map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-action hover:underline"
                  >
                    {l.label}
                    <Icon name="external" className="size-4" />
                    <NewTab />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
