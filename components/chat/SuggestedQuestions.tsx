import { SUGGESTED_QUESTIONS } from "@/lib/site";

export function SuggestedQuestions({
  onPick,
  disabled,
  label,
}: {
  onPick: (q: string) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">{label}</p>
      <ul className="flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((q) => (
          <li key={q}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(q)}
              className="min-h-11 rounded-lg border border-line bg-white px-3.5 py-2 text-left text-sm font-semibold text-ink transition-colors hover:border-action hover:text-action disabled:opacity-50"
            >
              {q}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
