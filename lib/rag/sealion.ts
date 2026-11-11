import { MAX_TOKENS, TEMPERATURE } from "./notebook";
import type { PromptMessage } from "./prompt";

/** SEA-LION chat via its OpenAI-compatible API, plain fetch, non-streaming (the notebook's call_llm). */
export interface SeaLionConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Sends chat_template_kwargs thinking_mode "off". The notebook doesn't send it: keep SEALION_THINKING_OFF=false. */
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
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
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
  // Notebook: (response.choices[0].message.content or "").strip()
  return (json.choices?.[0]?.message?.content ?? "").trim();
}
