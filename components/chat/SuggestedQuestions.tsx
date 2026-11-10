import { SUGGESTED_QUESTIONS } from "@/lib/site";

export function SuggestedQuestions({
  onPick,
  disabled,
}: {
  onPick: (q: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {SUGGESTED_QUESTIONS.map((q) => (
        <button
          key={q}
          type="button"
          disabled={disabled}
          onClick={() => onPick(q)}
          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-left text-xs text-slate-800 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
