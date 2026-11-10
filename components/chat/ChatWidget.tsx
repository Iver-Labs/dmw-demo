"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatTurn, Source } from "@/lib/rag/types";
import { SourceChips } from "./SourceChips";
import { SuggestedQuestions } from "./SuggestedQuestions";

const MAX_CHARS = 500;

interface Message extends ChatTurn {
  sources?: Source[];
  fallback?: boolean;
  error?: boolean;
}

/** Floating chat: the only input on the site. Never asks for personal data. */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, loading]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading) return;
    // Last 2 turns of real (non-error) conversation go to the server.
    const history: ChatTurn[] = messages
      .filter((m) => !m.error)
      .slice(-4)
      .map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: "user", content: message }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.answer, sources: data.sources, fallback: data.fallback },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: err instanceof Error ? err.message : String(err), error: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <section
          aria-label="Chat assistant"
          className="flex h-[min(36rem,calc(100dvh-6rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between bg-blue-900 px-4 py-3 text-white">
            <div>
              <p className="font-semibold">Ask about OEC, BM &amp; DMW offices</p>
              <p className="text-xs text-blue-100">English, Filipino o Taglish</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="text-xl">
              ×
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.length === 0 && (
              <>
                <p className="text-slate-600">
                  Hi! I answer from DMW&apos;s published pages and cite my sources. I can&apos;t look up your
                  case, so please don&apos;t share passport or OEC numbers.
                </p>
                <SuggestedQuestions onPick={send} disabled={loading} />
              </>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-lg bg-blue-900 px-3 py-2 text-white"
                      : `max-w-[95%] rounded-lg px-3 py-2 whitespace-pre-wrap ${m.error ? "bg-amber-50 text-amber-900" : "bg-slate-100 text-slate-900"}`
                  }
                >
                  {m.content}
                  {m.sources && <SourceChips sources={m.sources} />}
                </div>
              </div>
            ))}
            {loading && <p className="animate-pulse text-slate-500">Hinahanap ang sagot…</p>}
            <div ref={endRef} />
          </div>

          <form
            className="border-t border-slate-200 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={MAX_CHARS}
                placeholder="Type your question…"
                aria-label="Your question"
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-700 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-md bg-blue-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Send
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">Unofficial demo · verify at dmw.gov.ph</p>
          </form>
        </section>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="rounded-full bg-blue-900 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-blue-800"
      >
        {open ? "Close" : "Ask a question"}
      </button>
    </div>
  );
}
