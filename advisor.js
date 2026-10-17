// ════════════════════════════════════════════════════════════════
// THROUGHLINE CS — Top-venue desk. The CS counterpart of ResearchFlow's
// editor-audited dossier: 8 stages drafted by the shared suite backend
// (researchflow /api/cs/stage — Groq gpt-oss, free), each scored by an
// area-chair rubric, every stage reviewable by a NeurIPS-style Reviewer 2.
// Related work is grounded in live arXiv records whose ids the server
// verifies; venues come only from the hand-verified list in venues.js.
// AI output is a draft to edit — labelled as such, never presented as fact.
// ════════════════════════════════════════════════════════════════
const API = 'https://researchflow-syahmedus-projects.vercel.app';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const DESK = [
  { id: 'problem',         name: 'Problem',           q: 'What fails today, for whom, and how will we know we fixed it?' },
  { id: 'related',         name: 'Related work',      q: 'What is the closest recent work, and what exactly is our delta? (live arXiv)' },
  { id: 'contributions',   name: 'Contributions',     q: 'Which claims will the paper make, and what evidence backs each?' },
  { id: 'method',          name: 'Method',            q: 'What is the key idea, and why these design choices?' },
  { id: 'experiments',     name: 'Experiments',       q: 'Baselines, datasets, metrics, seeds, statistics and ablations a reviewer will accept.' },
  { id: 'threats',         name: 'Threats & limits',  q: 'Leakage, contamination, metric validity, generalisation, ethics.' },
  { id: 'reproducibility', name: 'Reproducibility',   q: 'Artifacts, checklist, compute reporting.' },
  { id: 'writing',         name: 'Paper & venue',     q: 'Outline, figures, venue fit from the verified list, reviewer objections.' },
];
const LABEL = (k) => k.replace(/^_/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
const mean = (a) => { const s = a?.editorAudit?.scores || []; const v = s.map((x) => +x.score).filter((x) => x > 0); return v.length ? v.reduce((p, x) => p + x, 0) / v.length : null; };
const verdictOf = (m) => m == null ? '' : m >= 4.5 ? 'accept-ready' : m >= 3.75 ? 'weak accept' : m >= 3 ? 'borderline' : m >= 2 ? 'weak reject' : 'reject';

async function post(path, body) {
  const r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(150000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.detail || ('HTTP ' + r.status));
  return j;
}

// generic, readable renderer for a stage's JSON (arXiv refs badged)
function val(v, depth = 0) {
  if (v == null || v === '') return '<span class="adv-muted">—</span>';
  if (typeof v !== 'object') return `<span>${esc(v)}</span>`;
  if (Array.isArray(v)) {
    if (!v.length) return '<span class="adv-muted">—</span>';
    if (v.every((x) => typeof x !== 'object')) return `<ul class="adv-ul">${v.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    return `<div class="adv-items">${v.map((x) => `<div class="adv-item">${val(x, depth + 1)}</div>`).join('')}</div>`;
  }
  if (typeof v.arxiv === 'string' && v.arxiv) {
    const badge = v.verified ? '<span class="adv-ok" title="arXiv id returned by the live search">✓ verified</span>' : '<span class="adv-warn" title="Not in the live arXiv results — check it exists before citing">⚠ verify</span>';
    const rest = Object.entries(v).filter(([k]) => !['arxiv', 'title', 'verified', 'verify'].includes(k));
    return `<div><a href="https://arxiv.org/abs/${encodeURIComponent(v.arxiv)}" target="_blank" rel="noopener"><b>${esc(v.title || v.arxiv)}</b> ↗</a> <span class="adv-muted">arXiv:${esc(v.arxiv)}</span> ${badge}${rest.map(([k, x]) => `<div class="adv-kv"><span>${esc(LABEL(k))}</span>${val(x, depth + 1)}</div>`).join('')}</div>`;
  }
  if ('inVenueList' in v) v = { ...v, _venue: v.inVenueList ? '✓ in the hand-verified venue list' : '⚠ not in the verified list — check' };
  return Object.entries(v).filter(([k]) => k !== 'inVenueList' && k !== 'verify').map(([k, x]) => `<div class="adv-kv"><span>${esc(LABEL(k))}</span>${val(x, depth + 1)}</div>`).join('');
}

function auditHTML(a) {
  const au = a?.editorAudit; if (!au) return '<p class="adv-muted">Draft this stage to get an area-chair audit.</p>';
  const m = mean(a);
  return `<div class="adv-mean"><b>${m?.toFixed(1) ?? '—'}</b><span>/ 5 · ${esc(verdictOf(m))}</span></div>
    ${(au.scores || []).map((s) => `<div class="adv-score"><div class="adv-score-h"><span>${esc(s.criterion)}</span><b>${esc(s.score)}</b></div><div class="adv-bar"><i style="width:${Math.max(0, Math.min(5, +s.score)) * 20}%"></i></div><p>${esc(s.why)}</p></div>`).join('')}
    ${(au.redFlags || []).length ? `<h4>Red flags</h4><ul class="adv-ul">${au.redFlags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    ${(au.toReachTop1 || []).length ? `<h4>To reach acceptance</h4><ul class="adv-ul">${au.toReachTop1.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`;
}

function reviewHTML(rv) {
  if (!rv) return '';
  const s = rv.scores || {};
  return `<section class="adv-review"><div class="adv-kicker">REVIEWER 2 · NEURIPS-STYLE</div>
    <div class="adv-chips">${[['Soundness', s.soundness, 4], ['Presentation', s.presentation, 4], ['Contribution', s.contribution, 4], ['Overall', s.overall, 10], ['Confidence', s.confidence, 5]].map(([k, v, mx]) => `<span>${k} <b>${esc(v ?? '—')}</b>/${mx}</span>`).join('')}</div>
    <p><b>${esc(rv.verdict || '')}</b></p>
    <div class="adv-items">${(rv.critique || []).map((c) => `<div class="adv-item"><span class="adv-sev ${c.severity === 'major' ? 'maj' : ''}">${esc(c.severity || '')}</span> ${esc(c.issue)}<div class="adv-kv"><span>Fix</span><span>${esc(c.fix)}</span></div></div>`).join('')}</div>
    ${rv.revised ? '<div class="row" style="margin-top:10px"><button class="btn btn-fill btn-sm" data-adv-accept>Accept the revised section</button><button class="btn btn-ghost btn-sm" data-adv-dismiss>Dismiss</button></div>' : ''}</section>`;
}

export function renderAdvisor(mount, p, saveP) {
  p.advisor ||= { stages: {}, reviews: {}, idea: '' };
  const A = p.advisor;
  if (!A.idea) A.idea = [p.frame?.problem, p.frame?.rqs].filter((x) => x && x.trim()).join('\n') || p.name;
  let cur = A.current && DESK.some((d) => d.id === A.current) ? A.current : 'problem';
  let busy = '';
  const session = () => ({ idea: A.idea, ...A.stages });

  function draw() {
    const st = DESK.find((d) => d.id === cur), data = A.stages[cur], rv = A.reviews[cur];
    const means = DESK.map((d) => mean(A.stages[d.id])).filter((x) => x != null);
    const overall = means.length ? means.reduce((a, b) => a + b, 0) / means.length : null;
    mount.innerHTML = `
    <div class="adv-intro"><div><div class="adv-kicker">TOP-VENUE DESK · AREA-CHAIR AUDITED</div>
      <p>Draft each stage of the paper plan with the suite's free advisor. Each stage is scored against the rubric a top-venue area chair applies, and Reviewer 2 can challenge any stage. Related work is grounded in live arXiv records (ids verified). Venues come only from the hand-verified list. <b>Everything here is a draft to edit, not a result.</b></p></div>
      <div class="adv-overall"><b>${overall?.toFixed(1) ?? '—'}</b><span>desk mean · ${esc(verdictOf(overall)) || 'no stages yet'}</span><span>${Object.keys(A.stages).length}/${DESK.length} stages drafted</span></div></div>
    <div class="adv-desk">
      <nav class="adv-rail" aria-label="Desk stages">${DESK.map((d, i) => { const m = mean(A.stages[d.id]); return `<button class="${d.id === cur ? 'on' : ''}" data-adv-go="${d.id}"><span class="adv-n">${i + 1}</span><span class="adv-nm">${d.name}</span>${m != null ? `<span class="adv-dot" title="audit mean">${m.toFixed(1)}</span>` : ''}</button>`; }).join('')}</nav>
      <main class="adv-main">
        <div class="adv-kicker">STAGE ${DESK.indexOf(st) + 1} OF ${DESK.length}</div><h2 class="adv-h">${st.name}</h2><p class="adv-q">${esc(st.q)}</p>
        ${cur === 'problem' ? `<label class="adv-lab" for="adv-idea">Your idea / problem (seeded from Frame; edit freely)</label><textarea id="adv-idea" rows="4">${esc(A.idea)}</textarea>` : ''}
        <label class="adv-lab" for="adv-ref">Guidance for this stage (optional)</label><input id="adv-ref" placeholder="e.g. focus on retrieval-augmented baselines; we have 4×A100 for two weeks" value="${esc(A.ref?.[cur] || '')}">
        <div class="row" style="margin:10px 0 4px"><button class="btn btn-fill" data-adv-run ${busy ? 'disabled' : ''}>${data ? '↻ Redraft' : '✦ Draft'} ${esc(st.name.toLowerCase())}</button>${data ? `<button class="btn btn-ghost" data-adv-review ${busy ? 'disabled' : ''}>Reviewer 2 ↯</button>` : ''}${cur === 'problem' && data ? '<button class="btn btn-ghost" data-adv-apply="frame">Copy into Frame</button>' : ''}${cur === 'experiments' && data ? '<button class="btn btn-ghost" data-adv-apply="design">Copy into Design</button>' : ''}<button class="btn btn-ghost" data-adv-export>Export desk (.md)</button></div>
        <p class="adv-status" role="status">${esc(busy)}</p>
        ${data?._checks ? `<p class="adv-muted">Checks: ${data._checks.arxivRecords ? data._checks.arxivRecords + ' live arXiv records · ' : ''}${data._checks.unverifiedCitations} citation(s) to verify${data._checks.venueList ? ' · ' + data._checks.venueList + ' verified venues offered' : ''}</p>` : ''}
        ${reviewHTML(rv)}
        <div class="adv-doc">${data ? val(Object.fromEntries(Object.entries(data).filter(([k]) => !k.startsWith('_') && k !== 'editorAudit'))) : '<p class="adv-muted">Not drafted yet. Stages build on each other: draft them in order for the best grounding.</p>'}</div>
        ${data?._arxiv?.length ? `<details class="adv-src"><summary>The ${data._arxiv.length} live arXiv records the advisor was given</summary><ul class="adv-ul">${data._arxiv.map((r) => `<li><a href="https://arxiv.org/abs/${encodeURIComponent(r.arxiv)}" target="_blank" rel="noopener">${esc(r.title)}</a> · ${esc((r.authors || []).join(', '))} (${esc(r.year)})</li>`).join('')}</ul></details>` : ''}
      </main>
      <aside class="adv-aside"><div class="adv-kicker">AREA-CHAIR AUDIT</div>${auditHTML(data)}</aside>
    </div>`;
    wire();
  }
  const keep = () => { const i = mount.querySelector('#adv-idea'); if (i) A.idea = i.value; const r = mount.querySelector('#adv-ref'); if (r) { A.ref ||= {}; A.ref[cur] = r.value; } };
  function wire() {
    mount.querySelectorAll('[data-adv-go]').forEach((b) => b.onclick = () => { keep(); cur = A.current = b.dataset.advGo; saveP(p); draw(); });
    mount.querySelector('#adv-idea')?.addEventListener('input', (e) => { A.idea = e.target.value; saveP(p); });
    mount.querySelector('#adv-ref')?.addEventListener('input', (e) => { A.ref ||= {}; A.ref[cur] = e.target.value; saveP(p); });
    mount.querySelector('[data-adv-run]')?.addEventListener('click', run);
    mount.querySelector('[data-adv-review]')?.addEventListener('click', review);
    mount.querySelector('[data-adv-accept]')?.addEventListener('click', () => { const rv = A.reviews[cur]; A.stages[cur] = { ...rv.revised, editorAudit: A.stages[cur]?.editorAudit, _accepted: 'Reviewer 2 revision' }; delete A.reviews[cur]; saveP(p); draw(); });
    mount.querySelector('[data-adv-dismiss]')?.addEventListener('click', () => { delete A.reviews[cur]; saveP(p); draw(); });
    mount.querySelector('[data-adv-export]')?.addEventListener('click', exportMd);
    mount.querySelectorAll('[data-adv-apply]').forEach((b) => b.onclick = () => apply(b.dataset.advApply));
  }
  async function run() {
    keep(); if (!A.idea.trim()) { busy = 'Describe the idea first.'; return draw(); }
    busy = `Drafting ${cur}… (the free model takes 10–60 s)`; draw();
    try { const r = await post('/api/cs/stage', { stage: cur, session: session(), refinement: A.ref?.[cur] || '' }); A.stages[cur] = r.result; delete A.reviews[cur]; busy = ''; saveP(p); }
    catch (e) { busy = 'Could not draft: ' + e.message; }
    draw();
  }
  async function review() {
    busy = 'Reviewer 2 is reading this section…'; draw();
    try { A.reviews[cur] = await post('/api/cs/review', { stage: cur, session: session() }); busy = ''; saveP(p); }
    catch (e) { busy = 'Review failed: ' + e.message; }
    draw();
  }
  function apply(where) {
    const d = A.stages[cur]; if (!d) return;
    if (where === 'frame') {
      p.frame.problem = d.problemStatement || p.frame.problem;
      p.frame.rqs = (d.researchQuestions || []).join('\n') || p.frame.rqs;
      p.frame.scope = d.scope ? `In: ${(d.scope.in || []).join('; ')}\nOut: ${(d.scope.out || []).join('; ')}` : p.frame.scope;
    } else if (where === 'design') {
      p.design.methods = [p.design.methods, ...(d.baselines || []).map((b) => b.name)].filter(Boolean).join('\n');
      p.design.metrics = [d.metrics?.primary, ...(d.metrics?.secondary || [])].filter(Boolean).join('\n') || p.design.metrics;
      p.design.ablations = (d.ablations || []).map((a) => `${a.remove} — ${a.tests}`).join('\n') || p.design.ablations;
    }
    saveP(p); busy = where === 'frame' ? 'Copied into Frame (problem, RQs, scope).' : 'Copied into Design (baselines → methods, metrics, ablations).'; draw();
  }
  function md(v, d = 0) {
    if (v == null) return '';
    if (typeof v !== 'object') return String(v);
    if (Array.isArray(v)) return v.map((x) => `${'  '.repeat(d)}- ${typeof x === 'object' ? md(x, d + 1).trim().replace(/\n/g, '\n' + '  '.repeat(d + 1)) : x}`).join('\n');
    return Object.entries(v).filter(([k]) => !k.startsWith('_') && k !== 'editorAudit').map(([k, x]) => `**${LABEL(k)}:** ${typeof x === 'object' ? '\n' + md(x, d) : x}`).join('\n');
  }
  function exportMd() {
    const out = [`# ${p.name} — top-venue desk`, `Exported ${new Date().toISOString().slice(0, 10)} from Throughline CS. AI-drafted plan (Groq gpt-oss via the suite backend); arXiv ids marked ✓ were returned by a live arXiv search, all others must be verified. Not results.`, '', '## Idea', A.idea];
    for (const d of DESK) { const s = A.stages[d.id]; if (!s) continue; const m = mean(s); out.push('', `## ${d.name}${m != null ? ` (area-chair audit ${m.toFixed(1)}/5)` : ''}`, md(s)); }
    const blob = new Blob([out.join('\n')], { type: 'text/markdown' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${p.name.replace(/[^\w]+/g, '-').slice(0, 40)}-desk.md`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  draw();
}
