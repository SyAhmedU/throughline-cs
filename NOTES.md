# Throughline CS — full notes (project #24; stub lives in ~/CLAUDE.md)

> Detail offloaded from CLAUDE.md 2026-07-04 to keep the index lean. **This file is the source of truth for this project** — update it (not CLAUDE.md) when detail changes.

### 24. throughline-cs/ — Throughline CS (**standalone sibling product, NOT a suite surface**)
CS-researcher counterpart to Throughline — 7 stages in one static app (no build, ES modules; `index.html` + `app.js` + `venues.js` + `stats.js`). **Discover** (live arXiv+S2+DBLP+OpenAlex multi-search, DOI/arXiv-id dedupe, reading list → verbatim BibTeX) → **Frame** (S2 novelty check per RQ) → **Design** (methods×datasets×metrics×seeds matrix, live HF dataset search, threats checklist) → **Experiment** (run tracker, CSV/JSON, repro checklist) → **Analyze** (paired-t when seeds align else Welch, d, CIs, bootstrap; captures → md+LaTeX) → **Write** (exports paper.md/.tex/refs.bib) → **Publish** (56 hand-verified venues w/ DBLP links — **no hardcoded deadlines/acceptance rates**, links to ccfddl/aideadlin.es; arXiv/artifact/camera-ready checklists).
- **v1.1 depth:** Discover bulk DOI/arXiv add + refs/cited-by chaining (S2 graph) + PaperCards `#seed=` link; Design seeds-needed calculator (Cohen approx, verified); Experiment bulk-paste log (`method | dataset | seed | metrics`); Analyze seed-level dot plot + all-pairs Holm–Bonferroni; Publish on-demand OpenAlex venue metrics (strict ≥70% token gate, else "no confident match"); Home worked example (papers fetched live, runs labeled SIMULATED).
- **No-fab:** all literature/datasets live from APIs verbatim; venue links verified by `_venues.verify.mjs` (dblp rate-limits hard — script uses uni-trier mirror + cooldown). `stats.js` verified vs textbook values (`npm test`, 26 checks). Storage `tlcs_projects_v1`; **syed-ambient + syed-tour stamped** (85s tour in throughline-media). Smoke `_mobile-audit/_tlcs_smoke.mjs` (stubs the APIs) + `_tlcs_live.mjs`.
- GitHub Pages → syahmedu.github.io/throughline-cs/


## 2026-10-10 — Latest-data control

A non-destructive **↻ Latest data** panel checks this app's named published reference files and searches current Crossref journal-article metadata. Source/build dates are distinguished from the time of checking; failed checks retain previous successful evidence. Fetched files and metadata can be downloaded. It never clears saved work, resets survey responses, replaces selected scales, regenerates AI text or reloads the current workspace. Curated catalogues, full corpus harvests, publisher policies and current Scopus verification require their separate maintained source workflows. Existing in-memory results remain unchanged.

Canonical source/config: `research-suite/tools/refresh/{research-refresh.js,install.mjs}` in the sibling repository. Run the installer after changes; local script copies are shipped per app. Generated service workers bypass explicit no-store/research_refresh requests.


## UI/UX review — 2026-10-10

Named project entry, 16px mobile fields and larger navigation controls; supporting utilities sit below content. Literature and statistics unchanged. Browser and build evidence is recorded in `../output/design-review-2026-10-10/`. This is a heuristic/interaction review, not a complete accessibility certification or user study.

## 2026-10-17 — ★ Top-venue desk (ResearchFlow-depth workflow)
- New route `#/p/<id>/desk` (pill after Publish), in `advisor.js`. It has 8 stages: Problem → Related work → Contributions → Method → Experiments → Threats & limits → Reproducibility → Paper & venue.
- Each stage is drafted by the shared suite backend, `researchflow/api` **`/api/cs/stage`** (Groq gpt-oss, free; prompts in `researchflow/api/_cs_prompts.py`), and scored against an area-chair rubric (editorAudit, a 1–5 calibration to top-venue acceptance). **`/api/cs/review`** gives a NeurIPS-style Reviewer 2 (soundness/presentation/contribution 1–4, overall 1–10, confidence) plus a revised section you can accept.
- Grounding: related work gets live arXiv API records (last 3 years); any arXiv id not in those results is badged ⚠ verify. Paper & venue may only choose from `venues.js` (fetched server-side from Pages) and each pick is badged `inVenueList`.
- Desk state lives in `p.advisor` (same `tlcs_projects_v1` storage). "Copy into Frame/Design" pushes problem/RQs/scope and baselines/metrics/ablations into the existing stages. "Export desk (.md)" downloads the plan.
- Home copy updated: the literature/venues/stats remain non-AI, and the desk is labelled AI draft.
- Smoke: `_mobile-audit/_tlcs_desk.mjs` (real backend: draft → Reviewer 2 → accept → copy to Frame; 390 px overflow 0). ⚠ The old `_tlcs_smoke.mjs` already failed before this change (it doesn't pass the entry gate; same failure with the change stashed).
