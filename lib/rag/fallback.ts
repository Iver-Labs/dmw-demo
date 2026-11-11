import { OFFICIAL_SITE } from "../site";
import type { Source } from "./types";

export { FALLBACK_MESSAGE as FALLBACK_TEXT } from "./notebook";

export const BUSY_TEXT = "Maraming nagtatanong ngayon — try again in a few seconds.";

/** Link shown with the fallback message: the official site (site guardrail, not part of the notebook). */
export function fallbackSources(): Source[] {
  return [{ n: 1, title: "dmw.gov.ph (official site)", url: OFFICIAL_SITE }];
}
