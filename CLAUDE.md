@AGENTS.md

# DMW Info Demo — notes for Claude

- Spec sources: "DMW Demo — Container Setup Spec" and "DMW Website Clone + RAG Chatbot — 2-Day PoC Plan" (Claude Docs). Follow them; don't drift from the env var names, ports, or file list they define.
- Guardrails are requirements: permanent unofficial banner, no official seal/name, noindex everywhere, no inputs except the chat box, never ask users for personal numbers.
- Secrets: never put keys in the image, build args, logs or any `NEXT_PUBLIC_*` var. `.env.local` is gitignored.
- Next.js 16 with Cache Components: GET route handlers must `await connection()` if per-request; pages read content/kb synchronously and prerender.
- After changing `content/kb`, run `npm run ingest` and commit content + `data/index.*` together.
- Before committing: `npm run verify`.
