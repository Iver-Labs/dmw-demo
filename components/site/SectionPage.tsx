import { docsBySection } from "@/lib/rag/kb";
import type { Section } from "@/lib/rag/types";
import { Markdown } from "./Markdown";

/**
 * A cloned page rendered from the same content/kb Markdown that feeds the index,
 * so the site and the bot can't disagree.
 */
export function SectionPage({ section, title, intro }: { section: Section; title: string; intro?: string }) {
  const docs = docsBySection(section);
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <h1 className="mb-3 text-3xl font-bold text-slate-900">{title}</h1>
      {intro && <p className="mb-8 text-slate-600">{intro}</p>}
      {docs.length === 0 ? (
        <p className="rounded border border-dashed border-slate-300 p-6 text-slate-500">
          No content yet. Add Markdown files with <code>section: {section}</code> to <code>content/kb/</code>{" "}
          (see <code>content/README.md</code>).
        </p>
      ) : (
        docs.map((doc) => (
          <article key={doc.slug} className="mb-10">
            <h2 className="mb-2 text-xl font-semibold text-slate-900">{doc.title}</h2>
            <Markdown>{doc.body}</Markdown>
            <p className="mt-3 text-xs text-slate-500">
              Source:{" "}
              <a href={doc.sourceUrl} className="underline" target="_blank" rel="noopener noreferrer">
                {doc.sourceUrl}
              </a>{" "}
              · retrieved {doc.retrieved}
            </p>
          </article>
        ))
      )}
    </main>
  );
}
