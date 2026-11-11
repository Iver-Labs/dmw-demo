# DMW Info Demo

> **Unofficial portfolio demo — not affiliated with the Department of Migrant Workers.**
> For official services, visit [dmw.gov.ph](https://dmw.gov.ph).

A replica of five DMW information pages with a bilingual (English / Filipino / Taglish) SEA-LION
chatbot that answers only from DMW's own pages, cites its sources and declines what it can't answer.
Next.js 16 (App Router, TypeScript, Tailwind) on Google Cloud Run (`asia-southeast1`).

## Status

| Area                                                                                       | State                                                                         |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Container + deploy files (Dockerfile, compose, `service.yaml`, `cloudbuild.yaml`)          | Done, per the Container Setup Spec                                            |
| Runtime contract (env validation, index check, `/api/health`, JSON logs)                   | Done, tested                                                                  |
| RAG pipeline (`lib/rag`: embed → hybrid search (vector + BM25, RRF) → SEA-LION → fallback) | Ported from the group notebook's FINAL run (`content/handoff`); parity-tested |
| Chatbot knowledge (`content/handoff/chunks.jsonl`) and index (`data/index.json`)           | 3,849 notebook chunks (PEOS module + DMW agency list)                         |
| Eval set (`content/handoff/eval_questions.jsonl`)                                          | 33 notebook question versions; `npm run eval` compares site vs notebook       |
| Site clone styling                                                                         | Neutral placeholder layout; match DMW's look on Day 2                         |

## Quick start

```bash
cp .env.example .env.local      # then fill in SEALION_API_KEY (the only key)
npm install
npm run dev                     # fetches the embedding model first; http://localhost:3000 — chat needs the key + index
```

In development a missing key or index is logged and `/api/health` returns 503, but pages still
render. In production (`NODE_ENV=production`, i.e. the container) the server **exits 1** instead,
so a misconfigured Cloud Run revision never goes live.

## Commands

| Task                                     | Command                                       |
| ---------------------------------------- | --------------------------------------------- |
| Dev server (hot reload)                  | `npm run dev`                                 |
| Typecheck · lint · tests · format check  | `npm run verify`                              |
| Unit tests (watch)                       | `npm run test:watch`                          |
| Format                                   | `npm run format`                              |
| Rebuild the index after a new handoff    | `npm run ingest`                              |
| Fetch + verify the local embedding model | `npm run model:fetch`                         |
| Check the index matches the handoff      | `npm run check:index`                         |
| Compare with the notebook (local / live) | `npm run eval` / `npm run eval -- --url $URL` |
| Production build + standalone server     | `npm run build && npm start`                  |
| Production image locally                 | `docker compose up --build`                   |
| Apply a changed `.env.local` to compose  | `docker compose up -d --force-recreate web`   |

## Day 1 checklist

1. SEA-LION key (Playground → API Key Manager), then pick the model:
   `curl https://api.sea-lion.ai/v1/models -H "Authorization: Bearer $SEALION_API_KEY"` and set
   `SEALION_MODEL` in `.env.local` and `service.yaml` (v3-70B-IT → Gemma v3 9B → v3.5-70B-R).
   Done 2026-11-10: the key lists `aisingapore/Llama-SEA-LION-v3-70B-IT`.
2. Embeddings run locally with `multilingual-e5-small` (no key), the model of the group notebook's FINAL run.
3. The chatbot's knowledge is the notebook handoff in `content/handoff/` (copied verbatim: `chunks.jsonl`,
   `system_prompt.txt`, `final_config.json`, `eval_questions.jsonl`, `HANDOFF.md`). Don't edit it by hand:
   a new handoff replaces the folder. `content/kb/*.md` only renders the site pages.
4. `npm run ingest`, commit `content/handoff` + `data/index.*` together.
5. `curl -X POST localhost:3000/api/chat -H 'content-type: application/json' -d '{"message":"What is the DMW hotline?"}'`
6. `npm run eval` (HANDOFF.md step 6): runs the notebook's 33 question versions and reports how many have the
   same top-3 chunk ids and the same answers as the notebook.

## Spec deviations

Approved changes from the Container Setup Spec and 2-Day PoC Plan (2026-11-10):

| Area                | Spec                                 | This repo                                                                 | Why                                                                                                                           |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Embeddings          | `gemini-embedding-001` (768) via API | `multilingual-e5-small` (384, fp32 ONNX) run locally with Transformers.js | No second API key; multilingual (Filipino Recall@3 0.25 → 0.75 vs MiniLM). Needs `query: ` / `passage: ` prefixes.            |
| Secrets             | SEA-LION + Gemini keys               | SEA-LION key only                                                         | Embeddings need no key                                                                                                        |
| Image size (test 2) | under 300 MB                         | **under 900 MB** (fp32 e5 model is 470 MB; not yet re-measured)           | ONNX runtime (CPU only) + the full-precision model, to match the notebook's embeddings (approved 2026-11-11)                  |
| Cloud Run memory    | 512Mi                                | 2Gi                                                                       | fp32 e5 peaks at ~1.35 GB RSS in the standalone server (approved 2026-11-11); uses free-tier GiB-seconds twice as fast as 1Gi |
| Retrieval top-K     | 6                                    | 3                                                                         | The notebook's FINAL run (`content/handoff/final_config.json`)                                                                |
| Score gate          | 0.55                                 | off (`RETRIEVAL_MIN_SCORE=0`)                                             | The notebook's FINAL run has no gate (answerable and unanswerable similarities overlap); pending sign-off                     |
| SEA-LION model      | v3.5-70B-R default                   | `Llama-SEA-LION-v3-70B-IT`                                                | Priority 1 in the Model plan and listed for the key; v3.5-70B-R is not                                                        |

## Layout

```
app/                 pages (rendered from content/kb) + api/chat, api/health
components/chat/     ChatWidget (Design 01 assistant), SourceCards, SuggestedQuestions, labels (EN/FIL)
components/site/     banner, utility bar, masthead, section nav, footer, icons, Markdown, SectionPage
lib/env.ts           zod env schema (names only in errors)
lib/startup.ts       env → index → meta check → ready (called by instrumentation.ts)
lib/rag/             notebook (FINAL settings), embed (local e5-small), bm25, search (hybrid + RRF), prompt, sealion,
                     fallback, answer, index-store; chunk + kb parse content/kb for the pages
lib/eval/            retrieval metrics ported from the group notebook (P@k, R@k, MRR)
scripts/             ingest.ts, eval.ts, fetch-model.mjs, check-index.mjs (+ lib/content-hash.mjs), deploy.sh
models/              local embedding model (fetched + SHA-256 verified; gitignored)
content/kb/          curated Markdown for the site pages (source_url in frontmatter)
content/handoff/     the group notebook's website handoff, verbatim (chatbot chunks, prompt, config, eval set)
data/                index.json + index.meta.json (generated, committed)
```

## Deployment

See the Container Setup Spec for the one-time GCP setup (APIs, Artifact Registry, secrets, runtime service
account). Then deploy from WSL with `npm run deploy` (needs the gcloud CLI, a clean tree and a committed index).
It runs `check:index`, then `gcloud builds submit --config cloudbuild.yaml --region asia-southeast1 --substitutions _TAG=<sha>`,
and checks `/api/health` on the new revision.

### Staying inside the free tier

The demo is for internal team testing on an unlisted public URL (`noindex` everywhere), and the goal is $0 per month.

| Resource          | Free per month                       | This service                                                                                 |
| ----------------- | ------------------------------------ | -------------------------------------------------------------------------------------------- |
| Cloud Run         | 180k vCPU-s, 360k GiB-s, 2M requests | 1 vCPU / 1 GiB, request-based billing, scale to 0, max 2 instances ≈ 50 h of active requests |
| Artifact Registry | 0.5 GB storage                       | `cleanup-policy.json` keeps the 2 newest images                                              |
| Cloud Build       | 2,500 build-minutes (e2-standard-2)  | a few minutes per deploy                                                                     |
| Secret Manager    | 6 active versions, 10k accesses      | 1 secret, read when an instance starts                                                       |

One-time guardrails (fill in your IDs):

```bash
# re-apply the 2-image cleanup policy after changing it
gcloud artifacts repositories set-cleanup-policies dmw-demo --location=asia-southeast1 \
  --policy=cleanup-policy.json --no-dry-run
# email alert at 50% and 100% of $1 (alerts only; they don't stop spending)
gcloud billing budgets create --billing-account=<BILLING_ACCOUNT_ID> --display-name="dmw-demo \$1" \
  --budget-amount=1USD --threshold-rule=percent=0.5 --threshold-rule=percent=1.0
```

Not fully covered: the 1 GB free egress is North America only, so traffic from `asia-southeast1` is billed. At
team-testing volume that is well under a cent a month. `max-instances 2` and the per-IP chat rate limit cap the
damage if the URL leaks.

## Acceptance tests and eval results

_Still to fill in: the 12 container acceptance tests on the final image._

### Eval v1 (2026-11-10, local, PEOS content only)

`npm run eval` with `Llama-SEA-LION-v3-70B-IT`, local `all-MiniLM-L6-v2`, top-K 3, gate 0.3. Only the
PEOS module is ingested, so OEC/BM, directory and agency questions are expected to fall back.

| Metric                                                 | v1                                               | Group notebook, Run M (same PEOS questions)                    |
| ------------------------------------------------------ | ------------------------------------------------ | -------------------------------------------------------------- |
| Recall@3 / MRR, PEOS questions (P1–P3 × EN/TL/Taglish) | **0.778 / 0.722**                                | 0.667 / 0.556                                                  |
| English · Taglish · Filipino Recall@3                  | 1.00 · 1.00 · 0.25                               | —                                                              |
| PEOS answers correct with citation                     | 7 of 9 (the 2 Filipino-only questions fall back) | Filipino P2/P3 got invented answers (₱10,000 fee; wrong payer) |
| Invented answers                                       | **0** after adding prompt rule 11                | —                                                              |
| Out-of-scope refusal                                   | 3 of 3                                           | —                                                              |
| Median latency (retrieval / generation)                | 3.6 s (7 ms / 3.6 s)                             | ~4.8 s on a Colab T4                                           |

Known weakness: short Filipino questions such as "Ano ang PRICEST?" (tracked as `G1-TL`) retrieve the
wrong chunk because MiniLM is English-only. That is the case for the multilingual A/B test.

### Retrieval A/B: MiniLM vs multilingual-e5-small (2026-11-11, retrieval only)

The same 75-chunk PEOS index and eval questions, with the LLM stubbed out (no SEA-LION calls), top-K 3, scored with
`lib/eval/retrieval.ts`. 10 questions have evidence in `content/kb`.

| Recall@3 / MRR  | all-MiniLM-L6-v2 | multilingual-e5-small |
| --------------- | ---------------- | --------------------- |
| All (10)        | 0.700 / 0.650    | **0.800 / 0.800**     |
| English (3)     | 1.000 / 1.000    | 0.833 / 0.833         |
| Filipino (4)    | 0.250 / 0.250    | **0.750 / 0.750**     |
| Taglish (3)     | 1.000 / 0.833    | 0.833 / 0.833         |
| `G1-TL` PRICEST | miss             | **hit**               |

e5 fixes `G1-TL` and `P2-TL`. It regresses on P3 (repatriation): recall 0.5 in English and Taglish and a miss
in Filipino.

### Eval v2 (2026-11-11, local, e5-small, gate 0.8)

`npm run eval` with `Llama-SEA-LION-v3-70B-IT`, top-K 3. Answers were checked by hand against `content/kb`.

| Metric                                   | v1 (MiniLM)                   | v2a (e5)                              | v2b (e5 + prompt rule 12 + Filipino terms) |
| ---------------------------------------- | ----------------------------- | ------------------------------------- | ------------------------------------------ |
| Recall@3 / MRR (10 PEOS questions)       | 0.778 / 0.722 (9 q)           | 0.800 / 0.800                         | 0.800 / 0.800                              |
| PEOS answers fully correct               | 7 of 9 (2 Filipino fell back) | 8 of 10                               | **9 of 10**                                |
| Answers with a wrong statement           | 0                             | 2 (P3-TL both parts, P3-TGL one part) | 1 (P3-TL, misconduct part)                 |
| Citation accuracy · out-of-scope refusal | —                             | 100% · 3/3                            | 100% · 3/3                                 |
| Median latency (retrieval / generation)  | 3.6 s (7 ms / 3.6 s)          | 1.5 s (5 ms / 1.7 s)                  | 1.4 s (5 ms / 1.6 s)                       |

Open issue, `P3-TL`: it says the employer pays repatriation after the worker's serious misconduct (the source says the
worker pays). The only passage that says so (`peos-5-seal-the-deal#7`) ranks 6th for the Filipino phrasing, even when
the question's two parts are searched separately. Keyword boosts were tried and didn't move it. Candidates: top-K 6,
an EmbeddingGemma-300m A/B, or a reranker.

## License

The code is released under the [MIT License](LICENSE).

Text adapted from dmw.gov.ph (in `content/kb/` and the generated `data/` index) belongs to the
Department of Migrant Workers and is not covered by this license. This project is not affiliated with
DMW, and the DMW name is used only to describe the information it links to.
