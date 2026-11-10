"use client";

import { Icon } from "@/components/site/Icons";
import { OPEN_ASSISTANT_EVENT } from "./labels";

/** Contextual prompt that opens the assistant; closing it returns focus here. */
export function AskAssistantButton({
  className = "btn-secondary",
  children = "Ask the Assistant",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      className={className}
      onClick={() => window.dispatchEvent(new Event(OPEN_ASSISTANT_EVENT))}
    >
      <Icon name="chat" className="size-5" />
      {children}
    </button>
  );
}
