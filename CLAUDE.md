@AGENTS.md

# DMW Info Demo — notes for Claude

- Spec sources: "DMW Demo — Container Setup Spec" and "DMW Website Clone + RAG Chatbot — 2-Day PoC Plan" (Claude Docs). Follow them; don't drift from the env var names, ports, or file list they define.
- Guardrails are requirements: permanent unofficial banner, no official seal/name, noindex everywhere, no inputs except the chat box, never ask users for personal numbers.
- Secrets: never put keys in the image, build args, logs or any `NEXT_PUBLIC_*` var. `.env.local` is gitignored.
- Next.js 16 with Cache Components: GET route handlers must `await connection()` if per-request; pages read content/kb synchronously and prerender.
- The chatbot's knowledge is the notebook handoff in `content/handoff/` (verbatim; don't hand-edit). After replacing it, run `npm run ingest` and commit it + `data/index.*` together. `content/kb` only renders pages.
- The RAG pipeline must match the group notebook's FINAL run (`content/handoff/HANDOFF.md`); `tests/notebook-parity.test.ts` pins it. Changes to it need the owner's approval.
- Before committing: `npm run verify`.
