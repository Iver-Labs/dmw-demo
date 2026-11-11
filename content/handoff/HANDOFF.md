# AlalayOFW website handoff (generated 2026-11-11 10:18:00)

The final notebook run is **FINAL** (settings copied from run **R6**). The website must run the same pipeline.

## 1. Embeddings
- Use `Xenova/multilingual-e5-small` in transformers.js (Python model: `intfloat/multilingual-e5-small`), with mean pooling and normalization, and cosine similarity.
- Prefix every chunk with `'passage: '` and every query with `'query: '` before embedding.
- The site may run a quantized (q8) build; vectors will differ slightly from the notebook, so step 6 checks the effect.

## 2. Chunks
- Do NOT re-chunk. Embed the 3,849 chunks in `chunks.jsonl` as they are (id, source, page, record_no, agency, text).
- Citations show "PEOS module, page N" or "DMW licensed agencies list, page N, record M".

## 3. Retrieval (hybrid, top_k = 3)
- Vector search: top 20 chunks by cosine similarity.
- Keyword search (if hybrid): BM25 (k1 1.5, b 0.75) over the same chunks, tokens = lowercase words/numbers (regex \w+); top 20 with score > 0.
- Merge with Reciprocal Rank Fusion: score = 1.0/(60 + vector_rank) + 1.0/(60 + bm25_rank); keep the top 3.
- Score gate: off.

## 4. Generation
- SEA-LION API `aisingapore/Llama-SEA-LION-v3-70B-IT`, temperature 0.0, max_tokens 400.
- System prompt: `system_prompt.txt`, unchanged. User message: "CONTEXT:" + numbered passages "[n] (where)\ntext" + "QUESTION:" + question.
- If the reply starts with FALLBACK, show the fallback message from `final_config.json`.
- Require a valid [n] citation: False.

## 5. Site guardrails (unchanged)
- Keep the unofficial-demo banner and noindex on every page; never ask users for personal numbers.
- The DMW chunks include representative names, addresses and contact numbers (group decision). The prompt tells the model not to volunteer them; decide as a group whether the public site should strip them, and if so, re-run the notebook with stripped records so both stay identical.

## 6. Check that the site matches the notebook
- Send every question in `eval_questions.jsonl` to the site's /api/chat.
- Compare the retrieved chunk ids with `notebook_retrieved_ids` and the answers with `notebook_answer`.
- Report how many versions match (same top-3 ids) and how many answers agree; explain any differences in the paper.
- Notebook final retrieval results: {"n_versions": 33, "precision_at_k": 0.395, "recall_at_k": 0.944, "mrr_at_k": 0.901, "recall_EN": 1.0, "recall_TL": 0.833, "recall_TGL": 1.0, "recall_PEOS": 0.9, "recall_DMW": 1.0, "fallback_on_answerable": 1, "fallback_on_unanswerable": 3, "avg_total_s": 0.415}
