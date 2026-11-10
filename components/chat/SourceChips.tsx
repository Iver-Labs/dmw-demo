import type { Source } from "@/lib/rag/types";

export function SourceChips({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Sources">
      {sources.map((s) => (
        <li key={s.url}>
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block max-w-56 truncate rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs text-blue-900 hover:bg-blue-100"
            title={s.url}
          >
            [{s.n}] {s.title}
          </a>
        </li>
      ))}
    </ul>
  );
}
