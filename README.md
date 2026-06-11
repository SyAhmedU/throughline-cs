# Throughline CS

**Computer-science research, from problem to paper — one guided workflow.**
Sibling to [Throughline](https://syahmedu.github.io/research-suite/) (the social-science suite), rebuilt around how CS research actually runs.

Live: https://syahmedu.github.io/throughline-cs/

## The seven stages

1. **Discover** — one search across arXiv, Semantic Scholar, DBLP and OpenAlex (live APIs, deduped by DOI/arXiv id, badged by source); build a reading list that becomes your BibTeX.
2. **Frame** — problem, gap, research questions, claimed contributions; a novelty check runs each RQ against the live literature.
3. **Design** — experiment matrix (methods × datasets × metrics × seeds), live Hugging Face dataset search, ablation plan, threats-to-validity checklist.
4. **Experiment** — run tracker (config, seed, metrics) with CSV/JSON export and a reproducibility checklist.
5. **Analyze** — aggregate across seeds (mean ± sd, t-based 95% CI), compare methods honestly (paired t when seeds align, Welch otherwise, Cohen's d alongside p), capture Markdown + LaTeX tables.
6. **Write** — section-by-section paper assembler; exports `paper.md`, `paper.tex`, and a real `refs.bib` generated verbatim from fetched metadata.
7. **Publish** — hand-verified directory of long-running CS venues (linked to DBLP), live deadline aggregators, arXiv / artifact / camera-ready checklists.

## Principles

- **No fabrication.** Every paper, dataset and venue is a real record from a public scholarly API or hand-verified (`node _venues.verify.mjs` link-checks the whole directory). BibTeX fields are verbatim from source records. Nothing is AI-generated.
- **Verified statistics.** `stats.js` is hand-written and dependency-free, with real t-distribution tails (incomplete beta); `node stats.verify.mjs` checks it against textbook critical values.
- **Local-first.** No accounts, no server — projects live in your browser's localStorage; export/import as JSON.

## Run

Static ES modules — serve the folder over HTTP (`python -m http.server`) or open the live URL. No build, no dependencies.

Tests: `node stats.verify.mjs` (stats) · `node _venues.verify.mjs` (venue links; slow, polite to dblp).
