/**
 * npm run eval            — run eval/questions.jsonl through the pipeline in-process (local index + keys)
 * npm run eval -- --url https://…run.app   — run it against a deployed /api/chat (Eval v2)
 *
 * Writes eval/results/<timestamp>.json and prints the metrics table for the README.
 * Answer correctness is judged by you: key_points hits are printed as a hint only.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { getEnv } from "../lib/env";
import { answerQuestion, defaultDeps } from "../lib/rag/answer";
import { indexMismatch, loadIndex } from "../lib/rag/index-store";
import type { Source } from "../lib/rag/types";

interface Question {
  id: string;
  question: string;
  lang: "en" | "fil" | "taglish";
  key_points: string[];
  expected_source_url: string | null;
  in_scope: boolean;
}

interface Row extends Question {
  answer: string;
  sources: Source[];
  fallback: boolean;
  latency_ms: number;
  retrieved_urls?: string[];
  top_score?: number;
  llm_called?: boolean;
  error?: string;
}

const THROTTLE_MS = 7_000; // 10 req/min SEA-LION trial limit

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

async function main() {
  const questions = loadQuestions();
  const rows: Row[] = [];
  let ask: (q: Question) => Promise<Omit<Row, keyof Question>>;

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
    ask = async (q) => {
      const t = performance.now();
      const r = await answerQuestion(q.question, [], index, env, deps);
      return {
        answer: r.answer,
        sources: r.sources,
        fallback: r.fallback,
        latency_ms: Math.round(performance.now() - t),
        retrieved_urls: r.meta.retrieved_urls,
        top_score: r.meta.top_score,
        llm_called: r.meta.llm_called,
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
    const hint = q.key_points.filter((k) => row.answer.toLowerCase().includes(k.toLowerCase())).length;
    console.log(
      `${i + 1}/${questions.length} ${q.id} ${row.error ? "ERROR" : row.fallback ? "FALLBACK" : "answered"}` +
        ` key_points ${hint}/${q.key_points.length} ${row.latency_ms}ms`,
    );
    // Gated questions made no LLM call, so they don't need the throttle.
    if (i < questions.length - 1 && (remote || row.llm_called)) await sleep(THROTTLE_MS);
  }

  const inScope = rows.filter((r) => r.in_scope && r.expected_source_url);
  const outScope = rows.filter((r) => !r.in_scope);
  const local = inScope.filter((r) => r.retrieved_urls);
  const latencies = rows
    .filter((r) => !r.error)
    .map((r) => r.latency_ms)
    .sort((a, b) => a - b);
  const median = latencies.length ? latencies[Math.floor(latencies.length / 2)] : 0;
  const answered = rows.filter((r) => !r.error && !r.fallback);

  const metrics = {
    "Retrieval hit rate (target ≥ 90%)": remote
      ? "n/a (remote)"
      : pct(local.filter((r) => r.retrieved_urls!.includes(r.expected_source_url!)).length, local.length),
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
    "Median latency (target < 6 s)": `${(median / 1000).toFixed(1)} s`,
  };
  const unlabelled = rows.filter((r) => r.in_scope && !r.expected_source_url).length;

  mkdirSync("eval/results", { recursive: true });
  const file = `eval/results/${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(file, JSON.stringify({ target: remote ?? "local", metrics, rows }, null, 2));

  console.log("\n| Metric | Result |\n| --- | --- |");
  for (const [k, v] of Object.entries(metrics)) console.log(`| ${k} | ${v} |`);
  if (unlabelled) console.log(`\n${unlabelled} in-scope question(s) have no expected_source_url yet.`);
  console.log(`\nSaved ${file}`);
}

main().catch((err) => {
  console.error(`eval failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
