import type { PromptMessage } from "./prompt";

/** SEA-LION chat via its OpenAI-compatible API, plain fetch, non-streaming. */
export interface SeaLionConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  thinkingOff: boolean;
  timeoutMs: number;
}

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

/** Remove reasoning text that v3.5-R may still emit with thinking off. */
export function stripReasoning(text: string): string {
  let out = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  // An unopened closing tag means everything before it was reasoning.
  const close = out.toLowerCase().lastIndexOf("</think>");
  if (close !== -1) out = out.slice(close + "</think>".length);
  // An unclosed opening tag (cut off by max_tokens) means nothing usable follows.
  const open = out.toLowerCase().indexOf("<think>");
  if (open !== -1) out = out.slice(0, open);
  return out.trim();
}

export async function chatCompletion(
  messages: PromptMessage[],
  { baseUrl, apiKey, model, thinkingOff, timeoutMs }: SeaLionConfig,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 600,
        stream: false,
        ...(thinkingOff ? { chat_template_kwargs: { thinking_mode: "off" } } : {}),
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    throw new UpstreamError(timedOut ? "SEA-LION timed out" : "SEA-LION unreachable", timedOut ? 504 : 502);
  }
  if (!res.ok) throw new UpstreamError(`SEA-LION returned HTTP ${res.status}`, res.status);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return stripReasoning(json.choices?.[0]?.message?.content ?? "");
}
