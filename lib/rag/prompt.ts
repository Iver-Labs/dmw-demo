import type { ChatTurn, ScoredChunk } from "./types";

export const FALLBACK_TOKEN = "FALLBACK";

const RULES = `You are an UNOFFICIAL demo assistant on a replica of the Department of Migrant Workers (DMW) website.
Rules:
1. Answer ONLY from the CONTEXT below. If CONTEXT does not contain the answer, reply with exactly: ${FALLBACK_TOKEN}
2. Reply in the same language the user wrote in: English, Filipino or Taglish.
3. After each fact, cite its source number like [1] or [2].
4. Use numbered steps for procedures. Keep answers under 150 words.
5. Never ask for passport, OEC, e-registration or other personal numbers. For case-specific help, point to official DMW channels.`;

export function formatContext(chunks: ScoredChunk[]): string {
  return chunks.map((c, i) => `[${i + 1}] ${c.title} — ${c.url}\n${c.text}`).join("\n\n");
}

/** Gemma-SEA-LION v3 9B isn't trained for system prompts; its rules go in the first user message. */
export const supportsSystemPrompt = (model: string) => !/gemma/i.test(model);

/** Max context chunks for a model (Gemma 9B has an 8,192-token context). */
export const maxContextChunks = (model: string, topK: number) =>
  supportsSystemPrompt(model) ? topK : Math.min(topK, 5);

export interface PromptMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** System message (rules + numbered CONTEXT), the last 2 turns, then the question. */
export function buildMessages(
  model: string,
  context: ScoredChunk[],
  question: string,
  history: ChatTurn[] = [],
): PromptMessage[] {
  const system = `${RULES}\nCONTEXT:\n${formatContext(context)}`;
  const recent = history.slice(-4); // 2 turns = up to 2 user + 2 assistant messages
  const userMsg = `QUESTION: ${question}`;
  if (supportsSystemPrompt(model)) {
    return [{ role: "system", content: system }, ...recent, { role: "user", content: userMsg }];
  }
  // Gemma: rules + context ride on the first user message; roles must alternate user/assistant.
  const turns: PromptMessage[] = [...recent, { role: "user", content: userMsg }];
  while (turns.length && turns[0].role !== "user") turns.shift();
  turns[0] = { role: "user", content: `${system}\n\n${turns[0].content}` };
  return turns;
}
