# Knowledge base

One file per curated DMW page in `content/kb/<slug>.md`. The Markdown renders the cloned pages.

The chatbot does **not** read these files: its knowledge is the group notebook's handoff in
`content/handoff/` (3,849 chunks from the PEOS module and the DMW list of licensed agencies), embedded
as-is by `npm run ingest`. The chunking notes below apply to the old site chunker only.

```markdown
---
title: "Balik-Manggagawa OEC exemption"
source_url: "https://dmw.gov.ph/..." # the exact page you copied from; cited in answers
section: oec-bm # faq | oec-bm | guides | directory | contact
retrieved: 2026-11-10
# Optional, for long sections only (characters). Overlap may be at most 25% of chunk_size.
# chunk_size: 600
# chunk_overlap: 75
---

## First heading

Text…
```

How each section is written (each `##` heading becomes one chunk; long sections are split at
~1,500 characters with 200 overlap, or at the file's `chunk_size` / `chunk_overlap`, and every
chunk is prefixed with `title > heading`). Starting points from the group notebook's best run:
600/75 for prose like the PEOS module, 800/100 for record lists.

| section     | One `##` heading per…                            |
| ----------- | ------------------------------------------------ |
| `faq`       | question (heading = the question, body = answer) |
| `oec-bm`    | step or topic of the guide                       |
| `guides`    | topic of the orientation module (e.g. PEOS)      |
| `directory` | office: name, region, address, phone, email      |
| `contact`   | hotline group (include the word "hotline")       |

After a new notebook handoff replaces `content/handoff/`, run `npm run ingest` and commit it with
`data/index.json` and `data/index.meta.json`; `npm run check:index` (and Cloud Build) fails otherwise.
