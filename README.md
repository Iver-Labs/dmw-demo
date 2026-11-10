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
cp .env.example .env.local      # then fill in SEALION_API_KEY and GEMINI_API_KEY
npm install
npm run dev                     # http://localhost:3000 — pages work without keys; chat needs keys + index
```

In development a missing key or index is logged and `/api/health` returns 503, but pages still
render. In production (`NODE_ENV=production`, i.e. the container) the server **exits 1** instead,
so a misconfigured Cloud Run revision never goes live.

## Commands

| Task                                    | Command                                       |
| --------------------------------------- | --------------------------------------------- |
| Dev server (hot reload)                 | `npm run dev`                                 |
| Typecheck · lint · tests · format check | `npm run verify`                              |
| Unit tests (watch)                      | `npm run test:watch`                          |
| Format                                  | `npm run format`                              |
| Rebuild the index after content changes | `npm run ingest`                              |
| Check the index matches content         | `npm run check:index`                         |
| Eval locally / against the live URL     | `npm run eval` / `npm run eval -- --url $URL` |
| Production build + standalone server    | `npm run build && npm start`                  |
| Production image locally                | `docker compose up --build`                   |
| Apply a changed `.env.local` to compose | `docker compose up -d --force-recreate web`   |

## Day 1 checklist

1. SEA-LION key (Playground → API Key Manager), then pick the model:
   `curl https://api.sea-lion.ai/v1/models -H "Authorization: Bearer $SEALION_API_KEY"` and set
   `SEALION_MODEL` in `.env.local` and `service.yaml` (v3-70B-IT → Gemma v3 9B → v3.5-70B-R).
2. Gemini key from AI Studio → `GEMINI_API_KEY`.
3. Curate 20–40 pages into `content/kb/*.md` (format in [`content/README.md`](content/README.md)).
4. `npm run ingest`, commit content + `data/index.*` together.
5. `curl -X POST localhost:3000/api/chat -H 'content-type: application/json' -d '{"message":"What is the DMW hotline?"}'`
6. Grow `eval/questions.jsonl` to 30 (≈⅓ Taglish/Filipino, 6 out of scope), label `expected_source_url`
   and `key_points`, run `npm run eval`, tune `RETRIEVAL_MIN_SCORE`.

## Layout

```
app/                 pages (rendered from content/kb) + api/chat, api/health
components/chat/     ChatWidget, SuggestedQuestions, SourceChips
components/site/     banner/header/footer, Markdown, SectionPage
lib/env.ts           zod env schema (names only in errors)
lib/startup.ts       env → index → meta check → ready (called by instrumentation.ts)
lib/rag/             glossary, chunk, embed, search, prompt, sealion, citations, fallback, answer
scripts/             ingest.ts, eval.ts, check-index.mjs (+ lib/content-hash.mjs)
content/kb/          curated Markdown (source_url in frontmatter)
data/                index.json + index.meta.json (generated, committed)
```

## Deployment

See the Container Setup Spec: one-time GCP setup (APIs, Artifact Registry, secrets, runtime service
account), then `gcloud builds submit --config cloudbuild.yaml --region asia-southeast1 --substitutions _TAG=$(git rev-parse --short HEAD)`.

## Acceptance tests and eval results

_To fill in: the 12 container acceptance tests, image size, and the v1/v2 eval table._
