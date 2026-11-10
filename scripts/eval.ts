/**
 * npm run eval            — run eval/questions.jsonl through the pipeline in-process (local index + keys)
 * npm run eval -- --url https://…run.app   — run it against a deployed /api/chat (Eval v2)
 *
 * Writes eval/results/<timestamp>.json and prints the metrics table for the README.
 * Answer correctness is judged by you: key_points hits are printed as a hint only.
 *
 * Questions with an `evidence` field also get the group notebook's retrieval metrics
 * (Precision@k, Recall@k, MRR; see lib/eval/retrieval.ts). Those need the local index, so they
 * are skipped with --url.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { getEnv } from "../lib/env";
import { mean, missingUnits, scoreRetrieval, type Evidence } from "../lib/eval/retrieval";
import { answerQuestion, defaultDeps } from "../lib/rag/answer";
import { indexMismatch, loadIndex } from "../lib/rag/index-store";
import { loadKbDocs } from "../lib/rag/kb";
import { maxContextChunks } from "../lib/rag/prompt";
import type { Source } from "../lib/rag/types";

type Lang = "en" | "fil" | "taglish";

interface Question {
  id: string;
  question: string;
  lang: Lang;
  key_points: string[];
  expected_source_url: string | null;
  in_scope: boolean;
  /** Evidence units for retrieval scoring (phrases copied exactly from the source). */
  evidence?: Evidence;
}

interface Retrieval {
  precision: number;
  recall: number;
  rr: number;
  units_per_rank: string;
}

interface Row extends Question {
  answer: string;
  sources: Source[];
  fallback: boolean;
  latency_ms: number;
  retrieved_urls?: string[];
  retrieved_ids?: string[];
  top_score?: number;
  llm_called?: boolean;
  retrieval_ms?: number;
  generation_ms?: number;
  retrieval?: Retrieval;
  error?: string;
}

const THROTTLE_MS = 7_000; // 10 req/min SEA-LION trial limit

/** The group notebook's best run (Run M: PEOS 600/75, DMW 800/100, TOP_K 3, strict prompt). */
const NOTEBOOK_BASELINE = { recall: 0.611, mrr: 0.481, precision: 0.278 };

const urlArg = process.argv.indexOf("--url");
const remote = urlArg !== -1 ? process.argv[urlArg + 1]?.replace(/\/$/, "") : undefined;

function loadQuestions(): Question[] {
  return readFileSync("eval/questions.jsonl", "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l, i) => {
      try {
        return JSON.parse(l) as Question;
      } catch {
        throw new Error(`eval/questions.jsonl line ${i + 1} is not valid JSON`);
      }
    });
}

/** Rough Filipino detector, good enough to flag language mismatches for manual review. */
const FIL_WORDS =
  /\b(ang|ng|mga|sa|ko|ba|po|paano|kung|naman|yung|ako|kayo|ito|hindi|wala|may|kailangan|pwede|saan|ano|sila|natin|niyo)\b/gi;
export function looksFilipino(text: string): boolean {
  const words = text.split(/\s+/).filter(Boolean).length || 1;
  return (text.match(FIL_WORDS)?.length ?? 0) / words >= 0.08;
}

const pct = (n: number, d: number) => (d === 0 ? "n/a" : `${Math.round((100 * n) / d)}% (${n}/${d})`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const median = (values: number[]) => {
  const v = [...values].sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : 0;
};
const f3 = (n: number) => n.toFixed(3);

async function main() {
  const questions = loadQuestions();
  const rows: Row[] = [];
  let ask: (q: Question) => Promise<Omit<Row, keyof Question>>;
  /** Questions whose evidence can't be found in content/kb; left out of the retrieval averages. */
  const unscorable = new Map<string, string[]>();

  if (remote) {
    ask = async (q) => {
      const t = performance.now();
      const res = await fetch(`${remote}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: q.question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${data.error}`);
      return { ...data, latency_ms: Math.round(performance.now() - t) };
    };
  } else {
    const env = getEnv();
    const index = await loadIndex();
    const mismatch = indexMismatch(index.meta, env);
    if (mismatch) throw new Error(mismatch);
    const deps = defaultDeps(env);
    const k = maxContextChunks(env.SEALION_MODEL, env.RETRIEVAL_TOP_K);
    const textById = new Map(index.chunks.map((c) => [c.id, c.text]));

    // Port of the notebook's check_evidence_phrases(): match against whole documents.
    const corpus = loadKbDocs().map((d) => `${d.title}\n${d.body}`);
    for (const q of questions) {
      if (!q.evidence) continue;
      const missing = missingUnits(q.evidence, corpus);
      if (missing.length) unscorable.set(q.id, missing);
    }
    if (unscorable.size)
      console.warn(
        `WARNING: evidence not found in content/kb for ${[...unscorable].map(([id, u]) => `${id} ${u.join(",")}`).join("; ")}.\n` +
          "These questions are left out of Precision/Recall/MRR (source not ingested yet, or a typo in the evidence).\n",
      );

    ask = async (q) => {
      const t = performance.now();
      const r = await answerQuestion(q.question, [], index, env, deps);
      let retrieval: Retrieval | undefined;
      if (q.evidence && !unscorable.has(q.id)) {
        const texts = r.meta.retrieved_ids.map((id) => textById.get(id) ?? "");
        const s = scoreRetrieval(texts, q.evidence, k);
        retrieval = {
          precision: s.precision,
          recall: s.recall,
          rr: s.reciprocalRank,
          units_per_rank: s.coveredPerRank
            .map((u, i) => `#${i + 1} ${r.meta.retrieved_ids[i]} [${u.join(",") || "-"}]`)
            .join(" | "),
        };
      }
      return {
        answer: r.answer,
        sources: r.sources,
        fallback: r.fallback,
        latency_ms: Math.round(performance.now() - t),
        retrieved_urls: r.meta.retrieved_urls,
        retrieved_ids: r.meta.retrieved_ids,
        top_score: r.meta.top_score,
        llm_called: r.meta.llm_called,
        retrieval_ms: r.meta.retrieval_ms,
        generation_ms: r.meta.generation_ms,
        retrieval,
      };
    };
  }

  for (const [i, q] of questions.entries()) {
    let row: Row;
    try {
      row = { ...q, ...(await ask(q)) };
    } catch (err) {
      row = { ...q, answer: "", sources: [], fallback: false, latency_ms: 0, error: String(err) };
    }
    rows.push(row);
    const hint = q.key_points.filter((kp) => row.answer.toLowerCase().includes(kp.toLowerCase())).length;
    const ret = row.retrieval
      ? ` | P ${row.retrieval.precision.toFixed(2)} R ${row.retrieval.recall.toFixed(2)} RR ${row.retrieval.rr.toFixed(2)}`
      : "";
    console.log(
      `${i + 1}/${questions.length} ${q.id} ${row.error ? "ERROR" : row.fallback ? "FALLBACK" : "answered"}` +
        ` key_points ${hint}/${q.key_points.length} ${row.latency_ms}ms${ret}`,
    );
    // Gated questions made no LLM call, so they don't need the throttle.
    if (i < questions.length - 1 && (remote || row.llm_called)) await sleep(THROTTLE_MS);
  }

  const inScope = rows.filter((r) => r.in_scope && r.expected_source_url);
  const outScope = rows.filter((r) => !r.in_scope);
  const local = inScope.filter((r) => r.retrieved_urls);
  const ok = rows.filter((r) => !r.error);
  const answered = ok.filter((r) => !r.fallback);
  const scored = rows.filter((r) => r.retrieval);

  const retrievalSummary = (subset: Row[]) =>
    subset.length === 0
      ? "n/a"
      : `P@k ${f3(mean(subset.map((r) => r.retrieval!.precision)))} · ` +
        `R@k ${f3(mean(subset.map((r) => r.retrieval!.recall)))} · ` +
        `MRR ${f3(mean(subset.map((r) => r.retrieval!.rr)))} (${subset.length} q)`;

  const metrics: Record<string, string> = {
    "Retrieval hit rate (target ≥ 90%)": remote
      ? "n/a (remote)"
      : pct(local.filter((r) => r.retrieved_urls!.includes(r.expected_source_url!)).length, local.length),
    [`Retrieval P@k / R@k / MRR (notebook Run M: R@3 ${NOTEBOOK_BASELINE.recall}, MRR ${NOTEBOOK_BASELINE.mrr})`]:
      remote ? "n/a (remote)" : retrievalSummary(scored),
    "  English": remote ? "n/a" : retrievalSummary(scored.filter((r) => r.lang === "en")),
    "  Filipino": remote ? "n/a" : retrievalSummary(scored.filter((r) => r.lang === "fil")),
    "  Taglish": remote ? "n/a" : retrievalSummary(scored.filter((r) => r.lang === "taglish")),
    "Answer correctness (target ≥ 80%)": "judge manually from the results file",
    "Citation accuracy (target ≥ 80%)": pct(
      inScope.filter((r) => r.sources.some((s) => s.url === r.expected_source_url)).length,
      inScope.length,
    ),
    "Out-of-scope refusal (target ≥ 5 of 6)": pct(outScope.filter((r) => r.fallback).length, outScope.length),
    "Language match (target ≥ 90%, heuristic)": pct(
      answered.filter((r) => looksFilipino(r.answer) === (r.lang !== "en")).length,
      answered.length,
    ),
    "Median latency (target < 6 s)": `${(median(ok.map((r) => r.latency_ms)) / 1000).toFixed(1)} s`,
  };
  if (!remote) {
    const generated = ok.filter((r) => r.llm_called);
    metrics["  Median retrieval / generation"] =
      `${median(ok.map((r) => r.retrieval_ms ?? 0))} ms / ` +
      (generated.length
        ? `${(median(generated.map((r) => r.generation_ms ?? 0)) / 1000).toFixed(1)} s`
        : "n/a");
  }
  const unlabelled = rows.filter((r) => r.in_scope && !r.expected_source_url).length;

  mkdirSync("eval/results", { recursive: true });
  const file = `eval/results/${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(
    file,
    JSON.stringify(
      { target: remote ?? "local", metrics, unscorable: Object.fromEntries(unscorable), rows },
      null,
      2,
    ),
  );

  console.log("\n| Metric | Result |\n| --- | --- |");
  for (const [key, v] of Object.entries(metrics)) console.log(`| ${key} | ${v} |`);
  if (unlabelled) console.log(`\n${unlabelled} in-scope question(s) have no expected_source_url yet.`);
  console.log(`\nSaved ${file}`);
}

main().catch((err) => {
  console.error(`eval failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
