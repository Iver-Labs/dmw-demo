/**
 * Acronyms expanded in the user's query before embedding.
 * Grow this when eval questions miss because of an unexpanded term.
 */
export const GLOSSARY: Record<string, string> = {
  OEC: "Overseas Employment Certificate",
  BM: "Balik-Manggagawa",
  "POPS-BaM": "POEA Online Processing System for Balik-Manggagawa",
  MWO: "Migrant Workers Office (formerly POLO)",
  POLO: "Philippine Overseas Labor Office (now Migrant Workers Office)",
  OWWA: "Overseas Workers Welfare Administration",
  DMW: "Department of Migrant Workers",
  OFW: "Overseas Filipino Worker",
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const patterns = Object.keys(GLOSSARY).map((term) => ({
  term,
  // Whole word, case-insensitive; hyphens count as part of a word so "POPS-BaM" isn't read as "BM".
  re: new RegExp(`(?<![A-Za-z0-9-])${escape(term)}(?![A-Za-z0-9-])`, "i"),
}));

/** Glossary terms present in `text`, in glossary order. */
export function findAcronyms(text: string): string[] {
  return patterns.filter((p) => p.re.test(text)).map((p) => p.term);
}

/** The query with the expansions of any acronyms it contains appended. */
export function expandQuery(text: string): string {
  const found = findAcronyms(text);
  if (found.length === 0) return text;
  return `${text}\n\n${found.map((t) => `${t} = ${GLOSSARY[t]}`).join("; ")}`;
}
