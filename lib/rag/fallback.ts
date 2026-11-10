import { OFFICIAL_SITE } from "../site";
import type { LoadedChunk, Source } from "./types";

export const FALLBACK_TEXT =
  "Pasensya na, wala akong sapat na impormasyon tungkol diyan. / Sorry, I don't have enough information on that.";

export const BUSY_TEXT = "Maraming nagtatanong ngayon — try again in a few seconds.";

/**
 * Links shown with the fallback: the official site, plus the hotline chunk from the indexed
 * directory/contact pages, so the number is sourced rather than typed from memory.
 */
export function fallbackSources(chunks: LoadedChunk[]): Source[] {
  const sources: Source[] = [{ n: 1, title: "dmw.gov.ph (official site)", url: OFFICIAL_SITE }];
  const hotline = chunks.find(
    (c) => (c.section === "contact" || c.section === "directory") && /hotline/i.test(c.text),
  );
  if (hotline) sources.push({ n: 2, title: hotline.title, url: hotline.url });
  return sources;
}
