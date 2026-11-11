import { Icon } from "@/components/site/Icons";
import type { Source } from "@/lib/rag/types";

/**
 * "Sources" list, numbered like the [n] markers in the answer. The notebook's passages carry no URL
 * ("PEOS module, page 6"), so they render as plain labels; a source with a URL opens in a new tab.
 */
export function SourceCards({
  sources,
  label,
  newTab,
  className = "",
}: {
  sources: Source[];
  label: string;
  newTab: string;
  className?: string;
}) {
  if (sources.length === 0) return null;
  return (
    <div className={`mt-3 ${className}`}>
      <p className="eyebrow mb-2 text-muted">{label}</p>
      <ul className="space-y-2">
        {sources.map((s) => (
          <li key={s.n}>
            {!s.url ? (
              <p className="flex min-h-11 items-center gap-2 rounded-lg border border-transparent bg-white px-3 py-2 text-sm font-semibold text-ink shadow-card">
                <span className="min-w-0 flex-1 break-words">
                  [{s.n}] {s.title}
                </span>
              </p>
            ) : (
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                title={s.url}
                className="flex min-h-11 items-center gap-2 rounded-lg border border-transparent bg-white px-3 py-2 text-sm font-semibold text-action shadow-card transition-[box-shadow,background-color] duration-150 ease-out hover:bg-surface hover:shadow-card-hover"
              >
                <span className="min-w-0 flex-1 break-words">
                  [{s.n}] {s.title}
                </span>
                <Icon name="external" className="size-4 shrink-0" />
                <span className="sr-only">{newTab}</span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
