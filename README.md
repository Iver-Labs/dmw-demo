# DMW Info Demo

> **Unofficial portfolio demo — not affiliated with the Department of Migrant Workers.**
> For official services, visit [dmw.gov.ph](https://dmw.gov.ph).

A replica of five DMW information pages with a bilingual (English / Filipino / Taglish) SEA-LION
chatbot that answers only from DMW's own pages, cites its sources and declines what it can't answer.
Next.js 16 (App Router, TypeScript, Tailwind) on Google Cloud Run (`asia-southeast1`).

## Status

| Area                                                                              | State                                                     |
| --------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Container + deploy files (Dockerfile, compose, `service.yaml`, `cloudbuild.yaml`) | Done, per the Container Setup Spec                        |
| Runtime contract (env validation, index check, `/api/health`, JSON logs)          | Done, tested                                              |
| RAG pipeline (`lib/rag`: glossary → embed → search → gate → SEA-LION → citations) | Implemented, unit-tested with fakes; needs keys + content |
| Content (`content/kb`) and index (`data/index.json`)                              | **To do (Day 1)**                                         |
| Eval set (`eval/questions.jsonl`)                                                 | 7 seed questions; grow to 30 and label                    |
| Site clone styling                                                                | Neutral placeholder layout; match DMW's look on Day 2     |

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
| Rebuild the index after content changes  | `npm run ingest`                              |
| Fetch + verify the local embedding model | `npm run model:fetch`                         |
| Check the index matches content          | `npm run check:index`                         |
| Eval locally / against the live URL      | `npm run eval` / `npm run eval -- --url $URL` |
| Production build + standalone server     | `npm run build && npm start`                  |
| Production image locally                 | `docker compose up --build`                   |
| Apply a changed `.env.local` to compose  | `docker compose up -d --force-recreate web`   |

## Day 1 checklist

1. SEA-LION key (Playground → API Key Manager), then pick the model:
   `curl https://api.sea-lion.ai/v1/models -H "Authorization: Bearer $SEALION_API_KEY"` and set
   `SEALION_MODEL` in `.env.local` and `service.yaml` (v3-70B-IT → Gemma v3 9B → v3.5-70B-R).
   Done 2026-11-10: the key lists `aisingapore/Llama-SEA-LION-v3-70B-IT`.
2. Embeddings run locally with `all-MiniLM-L6-v2` (the group notebook's model; no key). It is
   English-only, so Filipino/Taglish questions score lower: tune `RETRIEVAL_MIN_SCORE` with the eval.
3. Curate 20–40 pages into `content/kb/*.md` (format in [`content/README.md`](content/README.md)).
4. `npm run ingest`, commit content + `data/index.*` together.
5. `curl -X POST localhost:3000/api/chat -H 'content-type: application/json' -d '{"message":"What is the DMW hotline?"}'`
6. Grow `eval/questions.jsonl` to 30 (≈⅓ Taglish/Filipino, 6 out of scope), label `expected_source_url`
   and `key_points`, run `npm run eval`, tune `RETRIEVAL_MIN_SCORE`.

## Spec deviations

Approved changes from the Container Setup Spec and 2-Day PoC Plan (2026-11-10):

| Area                | Spec                                 | This repo                                                             | Why                                                                                                             |
| ------------------- | ------------------------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Embeddings          | `gemini-embedding-001` (768) via API | `all-MiniLM-L6-v2` (384, 8-bit ONNX) run locally with Transformers.js | The group notebook's model; no second API key. English-only, so Filipino/Taglish recall is watched in the eval. |
| Secrets             | SEA-LION + Gemini keys               | SEA-LION key only                                                     | Embeddings need no key                                                                                          |
| Image size (test 2) | under 300 MB                         | **under 450 MB** (measured 396 MB)                                    | ONNX runtime (CPU only) + model add ~100 MB                                                                     |
| Retrieval top-K     | 6                                    | 3                                                                     | The notebook's best run (Run M); top-K 5 lowered its precision                                                  |
| Score gate          | 0.55                                 | 0.3, provisional                                                      | MiniLM scores Taglish ~0.3 against English passages; tune with the eval                                         |
| SEA-LION model      | v3.5-70B-R default                   | `Llama-SEA-LION-v3-70B-IT`                                            | Priority 1 in the Model plan and listed for the key; v3.5-70B-R is not                                          |

## Layout

```
app/                 pages (rendered from content/kb) + api/chat, api/health
components/chat/     ChatWidget (Design 01 assistant), SourceCards, SuggestedQuestions, labels (EN/FIL)
components/site/     banner, utility bar, masthead, section nav, footer, icons, Markdown, SectionPage
lib/env.ts           zod env schema (names only in errors)
lib/startup.ts       env → index → meta check → ready (called by instrumentation.ts)
lib/rag/             glossary, chunk, embed (local MiniLM), search, prompt, sealion, citations, fallback, answer
lib/eval/            retrieval metrics ported from the group notebook (P@k, R@k, MRR)
scripts/             ingest.ts, eval.ts, fetch-model.mjs, check-index.mjs (+ lib/content-hash.mjs)
models/              local embedding model (fetched + SHA-256 verified; gitignored)
content/kb/          curated Markdown (source_url in frontmatter)
data/                index.json + index.meta.json (generated, committed)
```

## Deployment

See the Container Setup Spec: one-time GCP setup (APIs, Artifact Registry, secrets, runtime service
account), then `gcloud builds submit --config cloudbuild.yaml --region asia-southeast1 --substitutions _TAG=$(git rev-parse --short HEAD)`.

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

## License

The code is released under the [MIT License](LICENSE).

Text adapted from dmw.gov.ph (in `content/kb/` and the generated `data/` index) belongs to the
Department of Migrant Workers and is not covered by this license. This project is not affiliated with
DMW, and the DMW name is used only to describe the information it links to.
