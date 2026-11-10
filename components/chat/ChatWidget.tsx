"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/site/Icons";
import type { ChatTurn, Source } from "@/lib/rag/types";
import { ASSISTANT_NAME, OFFICIAL_PORTAL, topicFor } from "@/lib/site";
import { LABELS, OPEN_ASSISTANT_EVENT, type Labels, type Lang } from "./labels";
import { SourceCards } from "./SourceCards";
import { SuggestedQuestions } from "./SuggestedQuestions";

const MAX_CHARS = 500;
const MOBILE_QUERY = "(max-width: 767px)";

interface Message extends ChatTurn {
  sources?: Source[];
  fallback?: boolean;
}

interface Failure {
  question: string;
  kind: "network" | "busy" | "server";
  detail?: string;
}

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * Design 01 / Classic DMW Portal assistant: a labelled launcher that opens a non-modal panel on
 * desktop and a modal sheet on mobile. The only input on the site; never asks for personal data.
 */
export function ChatWidget() {
  const pathname = usePathname();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const titleId = useId();

  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [status, setStatus] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const t = LABELS[lang];

  const openPanel = useCallback(() => {
    const active = document.activeElement;
    returnFocusRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
    setOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
    // Restore focus to whatever opened the panel, without moving the page.
    requestAnimationFrame(() => {
      const back = returnFocusRef.current?.isConnected ? returnFocusRef.current : launcherRef.current;
      back?.focus({ preventScroll: true });
    });
  }, []);

  // Contextual "Ask the Assistant" buttons elsewhere on the page.
  useEffect(() => {
    window.addEventListener(OPEN_ASSISTANT_EVENT, openPanel);
    return () => window.removeEventListener(OPEN_ASSISTANT_EVENT, openPanel);
  }, [openPanel]);

  useEffect(() => {
    if (open) inputRef.current?.focus({ preventScroll: true });
  }, [open]);

  // Escape closes the panel when focus is in it, or was lost to <body> (e.g. a clicked
  // suggestion unmounted). Focus elsewhere on the page leaves the desktop rail open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const active = document.activeElement;
      if (!active || active === document.body || panelRef.current?.contains(active)) closePanel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closePanel]);

  // Mobile sheet is modal: background inert and not scrollable while it's open.
  useEffect(() => {
    if (!open || !isMobile) return;
    const root = rootRef.current;
    const others = Array.from(document.body.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== root && !el.contains(root),
    );
    others.forEach((el) => (el.inert = true));
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      others.forEach((el) => (el.inert = false));
      document.body.style.overflow = overflow;
    };
  }, [open, isMobile]);

  // Keep the newest content in view inside the panel only (never scroll the page).
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, pending, failure, open]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || pending) return;
    // Last 2 complete turns go to the server for follow-up context.
    const history: ChatTurn[] = messages.slice(-4).map(({ role, content }) => ({ role, content }));
    const labels = t;
    setFailure(null);
    setPending(question);
    setInput("");
    setStatus(labels.searching);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: question, history }),
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const kind = res.status === 429 ? "busy" : "server";
        setFailure({ question, kind, detail: typeof data.error === "string" ? data.error : undefined });
        setStatus(kind === "busy" ? labels.busyTitle : labels.serverTitle);
        return;
      }
      setMessages((m) => [
        ...m,
        { role: "user", content: question },
        { role: "assistant", content: data.answer, sources: data.sources ?? [], fallback: data.fallback },
      ]);
      setStatus(data.fallback ? labels.noSourceTitle : labels.answered);
    } catch {
      if (ctrl.signal.aborted) return;
      setFailure({ question, kind: "network" });
      setStatus(labels.networkTitle);
    } finally {
      if (abortRef.current === ctrl) {
        abortRef.current = null;
        setPending(null);
      }
    }
  }

  function cancel() {
    const question = pending;
    abortRef.current?.abort();
    abortRef.current = null;
    setPending(null);
    setStatus("");
    setInput(question ?? "");
    inputRef.current?.focus();
  }

  const empty = messages.length === 0 && !pending && !failure;

  return (
    <div ref={rootRef}>
      <button
        ref={launcherRef}
        type="button"
        hidden={open}
        onClick={openPanel}
        aria-haspopup="dialog"
        className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 inline-flex min-h-13 items-center gap-2.5 rounded-full bg-action px-6 text-[17px] font-bold text-white shadow-[0_10px_28px_rgba(21,93,252,0.35)] transition-colors hover:bg-action-hover sm:right-6 sm:bottom-6"
      >
        <Icon name="chat" className="size-6" />
        {t.launcher}
      </button>

      {open && isMobile && (
        <div className="fixed inset-0 z-40 bg-ink/45" aria-hidden="true" onClick={closePanel} />
      )}

      {open && (
        <section
          role="dialog"
          aria-modal={isMobile || undefined}
          aria-labelledby={titleId}
          ref={panelRef}
          className="fixed inset-x-2 top-[max(0.5rem,env(safe-area-inset-top))] bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-50 flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_18px_50px_rgba(22,37,86,0.28)] md:inset-x-auto md:top-auto md:right-6 md:bottom-6 md:h-[min(46rem,calc(100dvh-3rem))] md:w-[25.5rem]"
        >
          <header className="flex items-start gap-3 bg-masthead px-5 py-4 text-white">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-white/12">
              <Icon name="chat" className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-lg leading-snug font-bold">
                {ASSISTANT_NAME}
              </h2>
              <p className="text-xs text-white/75">{t.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={closePanel}
              aria-label={t.close}
              className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-lg hover:bg-white/10"
            >
              <Icon name="close" className="size-6" />
            </button>
          </header>

          <p className="bg-surface px-5 py-2.5 text-sm font-semibold text-ink">
            {t.topic}: {topicFor(pathname, lang)}
          </p>

          <div className="flex items-center justify-between px-5 pt-1">
            <span className="text-xs font-bold tracking-wide text-action uppercase">{t.langName}</span>
            <button
              type="button"
              onClick={() => setLang((l) => (l === "en" ? "fil" : "en"))}
              aria-label={t.switchAria}
              className="-mr-2 min-h-11 px-2 text-xs text-muted hover:text-action"
            >
              {t.switchTo}
            </button>
          </div>

          <div ref={logRef} className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-4">
            {empty && (
              <>
                <p className="text-[15px] text-muted">{t.intro}</p>
                <SuggestedQuestions
                  onPick={(q) => {
                    // The chip unmounts once the conversation starts; keep focus in the panel.
                    inputRef.current?.focus({ preventScroll: true });
                    send(q);
                  }}
                  disabled={Boolean(pending)}
                  label={t.tryAsking}
                />
              </>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <UserBubble key={i} text={m.content} />
              ) : m.fallback ? (
                <NoSourceCard key={i} message={m} t={t} />
              ) : (
                <div key={i}>
                  <p className="leading-relaxed whitespace-pre-wrap text-ink">{m.content}</p>
                  <SourceCards sources={m.sources ?? []} label={t.sources} newTab={t.newTab} />
                </div>
              ),
            )}

            {pending && (
              <>
                <UserBubble text={pending} />
                <StateCard eyebrow={t.searchingEyebrow}>
                  <span className="mb-2 flex gap-1.5" aria-hidden="true">
                    <span className="size-2 animate-pulse rounded-full bg-action" />
                    <span className="size-2 animate-pulse rounded-full bg-action/70 [animation-delay:150ms]" />
                    <span className="size-2 animate-pulse rounded-full bg-action/40 [animation-delay:300ms]" />
                  </span>
                  <p className="font-bold text-ink">{t.searching}</p>
                  <button
                    type="button"
                    onClick={cancel}
                    className="-ml-2 min-h-11 px-2 text-sm font-semibold text-action hover:underline"
                  >
                    {t.cancel}
                  </button>
                </StateCard>
              </>
            )}

            {failure && (
              <>
                <UserBubble text={failure.question} />
                <FailureCard failure={failure} t={t} onRetry={() => send(failure.question)} />
              </>
            )}
          </div>

          <form
            className="border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <div className="flex items-center rounded-xl border border-line pl-4 focus-within:border-action focus-within:ring-2 focus-within:ring-action/20">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={MAX_CHARS}
                placeholder={t.placeholder}
                aria-label={t.inputAria}
                autoComplete="off"
                enterKeyHint="send"
                className="min-h-12 min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-muted focus-visible:outline-none"
              />
              <button
                type="submit"
                disabled={Boolean(pending) || !input.trim()}
                aria-label={t.send}
                className="m-1 grid size-11 shrink-0 place-items-center rounded-lg bg-action text-white transition-colors hover:bg-action-hover disabled:opacity-40"
              >
                <Icon name="arrow" className="size-5" />
              </button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted">{t.footnote}</p>
          </form>

          {/* Announce state changes once to screen readers. */}
          <p role="status" className="sr-only">
            {status}
          </p>
        </section>
      )}
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return <p className="ml-8 rounded-xl bg-surface px-4 py-3 whitespace-pre-wrap text-ink">{text}</p>;
}

function StateCard({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line p-4">
      <p className="mb-2 text-[11px] font-bold tracking-[0.14em] text-action uppercase">{eyebrow}</p>
      {children}
    </div>
  );
}

function NoSourceCard({ message, t }: { message: Message; t: Labels }) {
  return (
    <StateCard eyebrow={t.noSourceEyebrow}>
      <p className="font-bold text-ink">{t.noSourceTitle}</p>
      <p className="mt-1 text-sm whitespace-pre-wrap text-muted">{message.content}</p>
      <p className="mt-1 text-sm text-muted">{t.noSourceBody}</p>
      <SourceCards sources={message.sources ?? []} label={t.sources} newTab={t.newTab} />
      <a
        href={OFFICIAL_PORTAL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-secondary mt-3 min-h-11 text-sm"
      >
        {t.helpdesk}
        <Icon name="arrow" className="size-4" />
        <span className="sr-only">{t.newTab}</span>
      </a>
    </StateCard>
  );
}

function FailureCard({ failure, t, onRetry }: { failure: Failure; t: Labels; onRetry: () => void }) {
  const copy = {
    network: { eyebrow: t.networkEyebrow, title: t.networkTitle, body: t.networkBody },
    busy: { eyebrow: t.busyEyebrow, title: t.busyTitle, body: failure.detail },
    server: { eyebrow: t.serverEyebrow, title: t.serverTitle, body: failure.detail },
  }[failure.kind];
  return (
    <StateCard eyebrow={copy.eyebrow}>
      <p className="font-bold text-ink">{copy.title}</p>
      {copy.body && <p className="mt-1 text-sm text-muted">{copy.body}</p>}
      <button type="button" onClick={onRetry} className="btn-primary mt-3 min-h-11 text-sm">
        {t.retry}
        <Icon name="arrow" className="size-4" />
      </button>
    </StateCard>
  );
}
