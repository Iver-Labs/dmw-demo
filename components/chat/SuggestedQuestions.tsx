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
      <p className="eyebrow mb-2 text-muted">{label}</p>
      <ul className="flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((q) => (
          <li key={q}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(q)}
              className="press min-h-11 rounded-lg border border-line bg-white px-3.5 py-2 text-left text-sm font-semibold text-ink hover:border-action hover:text-action disabled:opacity-40"
            >
              {q}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
