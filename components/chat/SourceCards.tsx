import { Icon } from "@/components/site/Icons";
import type { Source } from "@/lib/rag/types";

/** "Official sources" list: numbered titles that open the real page in a new tab. */
export function SourceCards({
  sources,
  label,
  newTab,
}: {
  sources: Source[];
  label: string;
  newTab: string;
}) {
  if (sources.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="mb-2 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">{label}</p>
      <ul className="space-y-2">
        {sources.map((s) => (
          <li key={s.url}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              title={s.url}
              className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-[#f7f9fe] px-3 py-2 text-sm font-semibold text-action transition-colors hover:border-action hover:bg-surface"
            >
              <span className="min-w-0 flex-1 break-words">
                [{s.n}] {s.title}
              </span>
              <Icon name="external" className="size-4 shrink-0" />
              <span className="sr-only">{newTab}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
