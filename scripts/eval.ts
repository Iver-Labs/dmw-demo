/**
 * npm run eval — HANDOFF.md step 6: check that the site matches the notebook.
 *
 * Sends every question in content/handoff/eval_questions.jsonl through the site's pipeline (the same
 * answerQuestion() that /api/chat calls, with the local index and .env.local keys) and compares
 *   - the retrieved top-3 chunk ids with notebook_retrieved_ids, and
 *   - the answer and fallback with notebook_answer / notebook_fallback.
 *
 * npm run eval -- --url https://…run.app   sends the questions to a deployed /api/chat instead;
 * the API doesn't return chunk ids, so only answers and fallbacks are compared.
 *
 * Writes eval/results/<timestamp>-notebook-compare.json and prints the summary for the paper.
 * Answers that differ in wording still need a human judgement of whether they agree.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { getEnv } from "../lib/env";
import { answerQuestion, defaultDeps } from "../lib/rag/answer";
import { indexMismatch, loadIndex } from "../lib/rag/index-store";
import { HANDOFF_DIR } from "../lib/rag/notebook";
import { UpstreamError } from "../lib/rag/sealion";

interface EvalQuestion {
  id: string;
  type: "answerable" | "unanswerable";
  language: string;
  question: string;
  reference_answer: string;
  notebook_answer: string;
  notebook_retrieved_ids: string[];
  notebook_fallback: boolean;
}

interface Site {
  answer: string;
  fallback: boolean;
  retrieved_ids?: string[];
  top_score?: number;
  llm_called?: boolean;
}

interface Row extends EvalQuestion {
  site_answer: string;
  site_fallback: boolean;
  site_retrieved_ids?: string[];
  same_top3_order?: boolean;
  same_top3_set?: boolean;
  same_answer: boolean;
  same_fallback: boolean;
  latency_ms: number;
  error?: string;
}

/** The notebook's MIN_SECONDS_BETWEEN_CALLS and retry policy (SEA-LION free tier: ~10 requests/min). */
const MIN_MS_BETWEEN_CALLS = 6_500;
const MAX_RETRIES = 6;

const urlArg = process.argv.indexOf("--url");
const remote = urlArg !== -1 ? process.argv[urlArg + 1]?.replace(/\/$/, "") : undefined;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
const pct = (n: number, d: number) => (d === 0 ? "n/a" : `${n}/${d} (${Math.round((100 * n) / d)}%)`);

function loadQuestions(): EvalQuestion[] {
  return readFileSync(`${HANDOFF_DIR}/eval_questions.jsonl`, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as EvalQuestion);
}

async function main() {
  const questions = loadQuestions();
  let ask: (q: string) => Promise<Site>;

  if (remote) {
    ask = async (q) => {
      const res = await fetch(`${remote}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      const data = await res.json();
      if (res.status === 429) throw new UpstreamError("rate limited", 429);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${data.error}`);
      return { answer: data.answer, fallback: data.fallback };
    };
  } else {
    const env = getEnv();
    const index = await loadIndex();
    const mismatch = indexMismatch(index.meta, env);
    if (mismatch) throw new Error(mismatch);
    const deps = defaultDeps(env);
    ask = async (q) => {
      const r = await answerQuestion(q, index, env, deps);
      return {
        answer: r.answer,
        fallback: r.fallback,
        retrieved_ids: r.meta.retrieved_ids,
        top_score: r.meta.top_score,
        llm_called: r.meta.llm_called,
      };
    };
  }

  const rows: Row[] = [];
  let lastCall = 0;
  for (const [i, q] of questions.entries()) {
    let site: Site | undefined;
    let error: string | undefined;
    const t = performance.now();
    for (let attempt = 1; attempt <= MAX_RETRIES && !site; attempt++) {
      const gap = MIN_MS_BETWEEN_CALLS - (Date.now() - lastCall);
      if (gap > 0) await sleep(gap);
      lastCall = Date.now();
      try {
        site = await ask(q.question);
      } catch (err) {
        const retryable = err instanceof UpstreamError && [429, 500, 502, 503, 504].includes(err.status);
        error = String(err);
        if (!retryable) break;
        const backoff = Math.min(60, 5 * 2 ** (attempt - 1));
        console.log(
          `  ${q.id}: SEA-LION busy (${err.status}); retry ${attempt}/${MAX_RETRIES} in ${backoff} s`,
        );
        await sleep(backoff * 1000);
      }
    }

    const row: Row = {
      ...q,
      site_answer: site?.answer ?? "",
      site_fallback: site?.fallback ?? false,
      site_retrieved_ids: site?.retrieved_ids,
      same_answer: site ? site.answer.trim() === q.notebook_answer.trim() : false,
      same_fallback: site ? site.fallback === q.notebook_fallback : false,
      latency_ms: Math.round(performance.now() - t),
      ...(site ? {} : { error }),
    };
    if (site?.retrieved_ids) {
      row.same_top3_order = same(site.retrieved_ids, q.notebook_retrieved_ids);
      row.same_top3_set = same([...site.retrieved_ids].sort(), [...q.notebook_retrieved_ids].sort());
    }
    rows.push(row);

    const ids =
      row.same_top3_order === undefined
        ? ""
        : row.same_top3_order
          ? " | top-3 ids same"
          : row.same_top3_set
            ? " | top-3 ids same set, different order"
            : ` | top-3 ids DIFFER: notebook ${q.notebook_retrieved_ids.join(",")} site ${row.site_retrieved_ids!.join(",")}`;
    console.log(
      `${i + 1}/${questions.length} ${q.id} ${row.error ? `ERROR ${row.error}` : row.site_fallback ? "FALLBACK" : "answered"}` +
        `${ids} | answer ${row.same_answer ? "identical" : "differs"} | fallback ${row.same_fallback ? "agrees" : "DIFFERS"}`,
    );
  }

  const ok = rows.filter((r) => !r.error);
  const withIds = ok.filter((r) => r.same_top3_order !== undefined);
  const ans = ok.filter((r) => r.type === "answerable");
  const una = ok.filter((r) => r.type === "unanswerable");
  const summary: Record<string, string> = {
    "Question versions": `${rows.length} (${rows.length - ok.length} errors)`,
    "Same top-3 chunk ids, same order": remote
      ? "n/a (remote)"
      : pct(withIds.filter((r) => r.same_top3_order).length, withIds.length),
    "Same top-3 chunk ids, any order": remote
      ? "n/a (remote)"
      : pct(withIds.filter((r) => r.same_top3_set).length, withIds.length),
    "Identical answer text": pct(ok.filter((r) => r.same_answer).length, ok.length),
    "Same fallback decision": pct(ok.filter((r) => r.same_fallback).length, ok.length),
    "Fallback on answerable (notebook / site)": `${ans.filter((r) => r.notebook_fallback).length} / ${ans.filter((r) => r.site_fallback).length} of ${ans.length}`,
    "Fallback on unanswerable (notebook / site)": `${una.filter((r) => r.notebook_fallback).length} / ${una.filter((r) => r.site_fallback).length} of ${una.length}`,
  };

  mkdirSync("eval/results", { recursive: true });
  const file = `eval/results/${new Date().toISOString().replace(/[:.]/g, "-")}-notebook-compare.json`;
  writeFileSync(file, JSON.stringify({ target: remote ?? "local", summary, rows }, null, 2));

  console.log("\n| Check | Result |\n| --- | --- |");
  for (const [k, v] of Object.entries(summary)) console.log(`| ${k} | ${v} |`);
  const differing = ok.filter((r) => !r.same_answer).map((r) => r.id);
  if (differing.length) console.log(`\nAnswers to judge by hand (wording differs): ${differing.join(", ")}`);
  console.log(`\nSaved ${file}`);
}

main().catch((err) => {
  console.error(`eval failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
