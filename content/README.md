# Knowledge base

One file per curated DMW page in `content/kb/<slug>.md`. The same Markdown renders the cloned
pages **and** feeds the chatbot index, so the site and the bot can't disagree.

```markdown
---
title: "Balik-Manggagawa OEC exemption"
source_url: "https://dmw.gov.ph/..." # the exact page you copied from; cited in answers
section: oec-bm # faq | oec-bm | directory | contact
retrieved: 2026-11-10
---

## First heading

Text…
```

How each section is written (each `##` heading becomes one chunk; long sections are split at
~1,500 characters with 200 overlap, and every chunk is prefixed with `title > heading`):

| section     | One `##` heading per…                            |
| ----------- | ------------------------------------------------ |
| `faq`       | question (heading = the question, body = answer) |
| `oec-bm`    | step or topic of the guide                       |
| `directory` | office: name, region, address, phone, email      |
| `contact`   | hotline group (include the word "hotline")       |

After any change here run `npm run ingest` and commit the content, `data/index.json` and
`data/index.meta.json` together; `npm run check:index` (and Cloud Build) fails otherwise.
