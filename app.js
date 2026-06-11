// ════════════════════════════════════════════════════════════════
// THROUGHLINE CS — app logic. ES module, no dependencies, no build.
// Literature live from arXiv / Semantic Scholar / DBLP / OpenAlex —
// every record verbatim from the API, badged by source. Stats from
// ./stats.js (verified). Nothing fabricated, ever.
// ════════════════════════════════════════════════════════════════
import { VENUES, AREAS, DEADLINE_LINKS, dblpUrl } from './venues.js';
import * as S from './stats.js';

// ── tiny helpers ──────────────────────────────────────────────────
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const fmt = (x, d = 4) => (x == null || Number.isNaN(x)) ? '—' : (typeof x === 'number' ? (Math.abs(x) >= 1000 ? x.toFixed(0) : x.toFixed(d)) : String(x));
const debounce = (fn, ms = 350) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
function download(filename, text, mime = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: mime + ';charset=utf-8' }));
  a.download = filename; a.click(); URL.revokeObjectURL(a.href);
}

// ── theme ─────────────────────────────────────────────────────────
const THEME_KEY = 'syed-theme';
function setTheme(t) { document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem(THEME_KEY, t); } catch {} }
try { const t = localStorage.getItem(THEME_KEY); if (t) setTheme(t); else if (matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark'); } catch {}
$('#themeToggle')?.addEventListener('click', () => setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

// ── store ─────────────────────────────────────────────────────────
const LS = 'tlcs_projects_v1';
function loadAll() { try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch { return []; } }
function saveAll(ps) { try { localStorage.setItem(LS, JSON.stringify(ps)); } catch (e) { alert('Could not save (storage full?): ' + e.message); } }
function newProject(name) {
  return {
    id: uid(), name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    discover: { papers: [] },
    frame: { problem: '', gap: '', rqs: '', contributions: '', scope: '' },
    design: { paradigm: '', methods: '', datasets: [], metrics: '', seeds: '1, 2, 3', ablations: '', threats: {} },
    experiment: { runs: [], repro: {} },
    analyze: { captures: [] },
    write: { sections: {} },
    publish: { shortlist: [], checks: {} },
  };
}
function getP(id) { return loadAll().find((p) => p.id === id); }
function saveP(p) {
  p.updatedAt = new Date().toISOString();
  const ps = loadAll(); const i = ps.findIndex((x) => x.id === p.id);
  if (i >= 0) ps[i] = p; else ps.push(p);
  saveAll(ps);
}
const saveSoon = debounce(saveP, 400);

// ── stages ────────────────────────────────────────────────────────
const STAGES = [
  { id: 'discover',  n: 1, name: 'Discover',  hue: '#FF9656', desc: 'Search the literature live — arXiv, Semantic Scholar, DBLP, OpenAlex — and build your reading list.' },
  { id: 'frame',     n: 2, name: 'Frame',     hue: '#F87059', desc: 'Pin down the problem, the gap, your research questions and claimed contributions — then check novelty against the live literature.' },
  { id: 'design',    n: 3, name: 'Design',    hue: '#F14575', desc: 'Plan the experiment matrix: methods × datasets × metrics × seeds, ablations, and threats to validity.' },
  { id: 'experiment',n: 4, name: 'Experiment',hue: '#D957A8', desc: 'Track every run — config, seed, metrics — with a reproducibility checklist.' },
  { id: 'analyze',   n: 5, name: 'Analyze',   hue: '#B964D4', desc: 'Aggregate runs across seeds, test differences honestly (paired t / Welch), capture publication-ready tables.' },
  { id: 'write',     n: 6, name: 'Write',     hue: '#9270F4', desc: 'Assemble the paper section by section; export Markdown, LaTeX and a real BibTeX file from your reading list.' },
  { id: 'publish',   n: 7, name: 'Publish',   hue: '#7A82F7', desc: 'Pick the venue (real directory, linked to DBLP), then work the arXiv / artifact / camera-ready checklists.' },
];
const stageById = Object.fromEntries(STAGES.map((s) => [s.id, s]));
function stageDone(p, id) {
  switch (id) {
    case 'discover': return p.discover.papers.length > 0;
    case 'frame': return !!(p.frame.problem?.trim() && p.frame.rqs?.trim());
    case 'design': return !!(p.design.methods?.trim() && p.design.datasets.length && p.design.metrics?.trim());
    case 'experiment': return p.experiment.runs.filter((r) => Object.keys(r.metrics || {}).length).length >= 2;
    case 'analyze': return p.analyze.captures.length > 0;
    case 'write': return Object.values(p.write.sections).filter((v) => v?.trim()).length >= 3;
    case 'publish': return p.publish.shortlist.length > 0 || Object.values(p.publish.checks).some(Boolean);
  }
  return false;
}
const progress = (p) => STAGES.filter((s) => stageDone(p, s.id)).length / STAGES.length;

// ── router ────────────────────────────────────────────────────────
const view = $('#view');
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [seg, pid, stage] = h.split('/');
  if (seg === 'p' && pid) {
    const p = getP(pid);
    if (!p) { location.hash = '#/'; return; }
    renderProject(p, stageById[stage] ? stage : 'discover');
  } else renderHome();
  view.scrollIntoView({ block: 'start' });
}
addEventListener('hashchange', route);

// ══════════════════════════════════════════════════════════════════
// HOME
// ══════════════════════════════════════════════════════════════════
function renderHome() {
  const ps = loadAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  view.innerHTML = `
    <section style="padding:54px 0 10px">
      <div class="kicker">One workflow · seven stages · live literature</div>
      <h1 class="display">Computer-science research,<br>from <em>problem to paper</em>.</h1>
      <p class="lede">Discover what's been done (arXiv · Semantic Scholar · DBLP · OpenAlex, live), frame your contribution, design the experiment matrix, track every run, analyze with real statistics, write with a generated BibTeX, and pick the venue. Each stage hands its work to the next. Everything stays in your browser.</p>
      <div class="note-fab">No fabrication: every paper, venue and dataset here is a real record fetched from a public scholarly API or hand-verified; statistics are computed locally by a <span class="mono">verified</span> open implementation. Nothing is AI-generated.</div>
    </section>
    <section class="card">
      <h2 class="sec">Your projects</h2>
      <div class="row" style="margin-top:8px">
        <input type="text" id="np" class="grow" placeholder="Name a new project — e.g. Efficient retrieval for long-context LLMs" maxlength="120">
        <button class="btn btn-fill" id="npGo">Create project</button>
        <button class="btn btn-ghost btn-sm" id="impBtn" title="Import a project JSON exported from this app">⬆ Import</button>
      </div>
      <div id="plist">${ps.length ? '' : '<p class="empty">No projects yet — name one above to start the thread.</p>'}</div>
    </section>
    <section style="margin-top:34px">
      <div class="kicker">The thread</div>
      ${STAGES.map((s) => `
        <div class="card" style="--sc:${s.hue};border-left:3px solid ${s.hue};margin-top:10px;padding:14px 18px">
          <strong style="font-size:.92rem"><span class="mono" style="color:${s.hue};font-size:.72rem">0${s.n}</span> &nbsp;${s.name}</strong>
          <span class="hint" style="margin-left:8px">${s.desc}</span>
        </div>`).join('')}
    </section>`;
  const plist = $('#plist');
  for (const p of ps) {
    const card = document.createElement('div');
    card.className = 'card proj-card';
    card.style.cursor = 'pointer';
    card.innerHTML = `
      <div class="row" style="justify-content:space-between">
        <div>
          <strong>${esc(p.name)}</strong>
          <div class="statline">updated ${new Date(p.updatedAt).toLocaleDateString()} · ${p.discover.papers.length} papers · ${p.experiment.runs.length} runs</div>
          <div class="dots">${STAGES.map((s) => `<i class="${stageDone(p, s.id) ? 'on' : ''}" style="--sc:${s.hue}" title="${s.name}"></i>`).join('')}</div>
        </div>
        <div class="row">
          <button class="more-link" data-open>Open</button>
          <button class="btn-sm btn btn-ghost" data-exp title="Export this project as JSON">⬇</button>
          <button class="del" data-del title="Delete project">✕</button>
        </div>
      </div>`;
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-del]')) {
        if (confirm(`Delete "${p.name}"? This cannot be undone.`)) { saveAll(loadAll().filter((x) => x.id !== p.id)); route(); }
        return;
      }
      if (e.target.closest('[data-exp]')) { download(p.name.replace(/\W+/g, '-').toLowerCase() + '.tlcs.json', JSON.stringify(p, null, 2), 'application/json'); return; }
      location.hash = `#/p/${p.id}/discover`;
    });
    plist.appendChild(card);
  }
  const create = () => {
    const name = $('#np').value.trim();
    if (!name) return $('#np').focus();
    const p = newProject(name); saveP(p);
    location.hash = `#/p/${p.id}/discover`;
  };
  $('#npGo').addEventListener('click', create);
  $('#np').addEventListener('keydown', (e) => { if (e.key === 'Enter') create(); });
  $('#impBtn').addEventListener('click', () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json';
    inp.onchange = async () => {
      try {
        const p = JSON.parse(await inp.files[0].text());
        if (!p.id || !p.discover) throw new Error('not a Throughline CS project file');
        p.id = uid(); saveP(p); route();
      } catch (e) { alert('Import failed: ' + e.message); }
    };
    inp.click();
  });
}

// ══════════════════════════════════════════════════════════════════
// PROJECT SHELL
// ══════════════════════════════════════════════════════════════════
function renderProject(p, stageId) {
  const st = stageById[stageId];
  view.innerHTML = `
    <section style="padding:30px 0 0">
      <div class="row" style="justify-content:space-between">
        <div>
          <div class="kicker"><a href="#/" style="color:inherit;text-decoration:none">Projects</a> / ${esc(p.name)}</div>
          <h1 class="display" style="font-size:clamp(1.5rem,3.4vw,2.3rem)">${esc(p.name)}</h1>
        </div>
        <span class="circle-arrow" aria-hidden="true" style="color:${st.hue}"></span>
      </div>
      <nav class="stage-nav">${STAGES.map((s) => `
        <a class="stage-pill ${s.id === stageId ? 'active' : ''} ${stageDone(p, s.id) ? 'done' : ''}" style="--sc:${s.hue}" href="#/p/${p.id}/${s.id}">
          <span class="n">${s.n}</span>${s.name}</a>`).join('')}
      </nav>
      <div class="spine"><i style="--fill:${Math.round(progress(p) * 100)}%"></i></div>
      <p class="hint" style="margin-bottom:6px">${st.desc}</p>
    </section>
    <section id="stage"></section>`;
  const mount = $('#stage');
  ({ discover: rDiscover, frame: rFrame, design: rDesign, experiment: rExperiment, analyze: rAnalyze, write: rWrite, publish: rPublish })[stageId](mount, p);
}

// field binding: write-through on input, debounced persist (no rerender → keeps focus)
function bind(input, obj, key, p) {
  input.value = obj[key] ?? '';
  input.addEventListener('input', () => { obj[key] = input.value; saveSoon(p); });
}

// ══════════════════════════════════════════════════════════════════
// 1 · DISCOVER — multi-source live literature search
// ══════════════════════════════════════════════════════════════════
async function searchArxiv(q) {
  const u = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent('all:' + q)}&start=0&max_results=12&sortBy=relevance`;
  const xml = new DOMParser().parseFromString(await (await fetch(u)).text(), 'text/xml');
  return $$('entry', xml).map((e) => {
    const id = (e.querySelector('id')?.textContent || '').replace(/^https?:\/\/arxiv\.org\/abs\//, '').replace(/v\d+$/, '');
    const doiEl = e.getElementsByTagNameNS('http://arxiv.org/schemas/atom', 'doi')[0];
    return {
      src: 'arxiv', rawId: id, arxivId: id,
      title: e.querySelector('title')?.textContent.replace(/\s+/g, ' ').trim(),
      abstract: e.querySelector('summary')?.textContent.replace(/\s+/g, ' ').trim(),
      authors: $$('author > name', e).map((n) => n.textContent.trim()),
      year: +(e.querySelector('published')?.textContent || '').slice(0, 4) || null,
      venue: 'arXiv', doi: doiEl?.textContent || null,
      url: `https://arxiv.org/abs/${id}`,
    };
  });
}
async function searchS2(q) {
  const u = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(q)}&limit=12&fields=title,abstract,year,venue,authors,externalIds,citationCount,url`;
  const j = await (await fetch(u)).json();
  return (j.data || []).map((d) => ({
    src: 's2', rawId: d.paperId,
    title: d.title, abstract: d.abstract || null,
    authors: (d.authors || []).map((a) => a.name),
    year: d.year, venue: d.venue || null,
    doi: d.externalIds?.DOI || null, arxivId: d.externalIds?.ArXiv || null,
    url: d.url, cites: d.citationCount,
  }));
}
async function searchDblp(q) {
  const u = `https://dblp.org/search/publ/api?q=${encodeURIComponent(q)}&format=json&h=12`;
  const j = await (await fetch(u)).json();
  const hits = j.result?.hits?.hit || [];
  return hits.map((h) => {
    const i = h.info; let au = i.authors?.author || [];
    if (!Array.isArray(au)) au = [au];
    return {
      src: 'dblp', rawId: i.key,
      title: (i.title || '').replace(/\.$/, ''), abstract: null,
      authors: au.map((a) => (typeof a === 'string' ? a : a.text)),
      year: +i.year || null, venue: i.venue || null,
      doi: i.doi || null, url: i.ee || i.url, kind: i.type,
    };
  });
}
function invertAbstract(inv) {
  if (!inv) return null;
  const words = [];
  for (const [w, idxs] of Object.entries(inv)) for (const i of idxs) words[i] = w;
  return words.join(' ');
}
async function searchOpenAlex(q) {
  const u = `https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=12`;
  const j = await (await fetch(u)).json();
  return (j.results || []).map((w) => ({
    src: 'openalex', rawId: w.id,
    title: w.display_name, abstract: invertAbstract(w.abstract_inverted_index),
    authors: (w.authorships || []).slice(0, 12).map((a) => a.author?.display_name).filter(Boolean),
    year: w.publication_year, venue: w.primary_location?.source?.display_name || null,
    doi: w.doi ? w.doi.replace(/^https?:\/\/doi\.org\//, '') : null,
    url: w.doi || w.id, cites: w.cited_by_count,
  }));
}
const SOURCES = [
  { id: 'arxiv', label: 'arXiv', fn: searchArxiv },
  { id: 's2', label: 'Semantic Scholar', fn: searchS2 },
  { id: 'dblp', label: 'DBLP', fn: searchDblp },
  { id: 'openalex', label: 'OpenAlex', fn: searchOpenAlex },
];
const normTitle = (t) => (t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function paperKey(r) { return r.doi ? 'doi:' + r.doi.toLowerCase() : r.arxivId ? 'arxiv:' + r.arxivId : 'title:' + normTitle(r.title); }
function dedupe(results) {
  const seen = new Map();
  for (const r of results) {
    const k = paperKey(r);
    if (!seen.has(k)) seen.set(k, r);
    else { // merge: keep richer record, remember extra source
      const prev = seen.get(k);
      prev.alsoIn = [...new Set([...(prev.alsoIn || []), r.src])];
      prev.abstract = prev.abstract || r.abstract;
      prev.doi = prev.doi || r.doi; prev.venue = prev.venue || r.venue;
      prev.cites = prev.cites ?? r.cites;
    }
  }
  return [...seen.values()];
}

function bibKey(r) {
  const last = ((r.authors?.[0] || 'anon').split(/\s+/).pop() || 'anon').replace(/[^A-Za-z]/g, '').toLowerCase();
  const word = (normTitle(r.title).split(' ').find((w) => w.length > 3) || 'paper');
  return `${last}${r.year || ''}${word}`;
}
function bibtexFor(r) {
  // All field values verbatim from the source record — nothing invented.
  const isJournal = r.venue && /journal|trans\.|transactions|jmlr|pvldb|tacl|cacm/i.test(r.venue) && r.venue !== 'arXiv';
  const type = r.venue === 'arXiv' || !r.venue ? 'misc' : isJournal ? 'article' : 'inproceedings';
  const f = [];
  f.push(`  title = {${r.title}}`);
  if (r.authors?.length) f.push(`  author = {${r.authors.join(' and ')}}`);
  if (r.year) f.push(`  year = {${r.year}}`);
  if (type === 'article') f.push(`  journal = {${r.venue}}`);
  if (type === 'inproceedings') f.push(`  booktitle = {${r.venue}}`);
  if (r.arxivId) { f.push(`  eprint = {${r.arxivId}}`); f.push(`  archivePrefix = {arXiv}`); }
  if (r.doi) f.push(`  doi = {${r.doi}}`);
  if (r.url) f.push(`  url = {${r.url}}`);
  return `@${type}{${bibKey(r)},\n${f.join(',\n')}\n}`;
}
const srcBadge = (s) => `<span class="badge src-${s}">${({ arxiv: 'arXiv', s2: 'Semantic Scholar', dblp: 'DBLP', openalex: 'OpenAlex' })[s] || s}</span>`;

function paperRow(r, acts) {
  return `<div class="paper">
    <div class="t">${esc(r.title)}</div>
    <div class="m">${esc((r.authors || []).slice(0, 6).join(', '))}${(r.authors || []).length > 6 ? ' et al.' : ''}
      ${r.year ? ' · ' + r.year : ''}${r.venue ? ' · <em>' + esc(r.venue) + '</em>' : ''}${r.cites != null ? ` · ${r.cites} citations` : ''}</div>
    ${r.abstract ? `<div class="abs">${esc(r.abstract.length > 420 ? r.abstract.slice(0, 420) + '…' : r.abstract)}</div>` : ''}
    <div class="acts">${srcBadge(r.src)}${(r.alsoIn || []).map(srcBadge).join('')}
      ${r.url ? `<a class="more-link" href="${esc(r.url)}" target="_blank" rel="noopener">Open</a>` : ''}
      ${r.doi ? `<a class="more-link" href="https://doi.org/${esc(r.doi)}" target="_blank" rel="noopener">DOI</a>` : ''}
      ${acts}
    </div>
  </div>`;
}

function rDiscover(mount, p) {
  mount.innerHTML = `
    <div class="card">
      <div class="row">
        <input type="text" id="dq" class="grow" placeholder="Search the live literature — e.g. retrieval augmented generation long context" autocomplete="off">
        <button class="btn btn-fill" id="dgo">Search 4 sources</button>
      </div>
      <div class="statline" id="dstat"></div>
      <div id="dres"></div>
    </div>
    <div class="card">
      <h2 class="sec">Reading list <span class="hint">(${p.discover.papers.length})</span></h2>
      <p class="hint">Saved records keep their source provenance; the Write stage turns this list into a real <span class="mono">refs.bib</span>.</p>
      <div class="row" style="margin-top:8px">
        <button class="btn btn-ghost btn-sm" id="dbib">⬇ refs.bib</button>
        <button class="btn btn-ghost btn-sm" id="djson">⬇ reading-list JSON</button>
      </div>
      <div id="dlist"></div>
    </div>`;
  const renderList = () => {
    $('#dlist').innerHTML = p.discover.papers.length
      ? p.discover.papers.map((r, i) => paperRow(r, `
          <span class="badge">cite key: ${esc(bibKey(r))}</span>
          <input type="text" data-tag="${i}" value="${esc(r.tag || '')}" placeholder="tag (e.g. baseline)" style="width:130px;padding:3px 8px;font-size:.74rem">
          <button class="del" data-rm="${i}">✕ remove</button>`)).join('')
      : '<p class="empty">Nothing saved yet — search above and ⊕ save what matters.</p>';
    $$('#dlist [data-rm]').forEach((b) => b.addEventListener('click', () => { p.discover.papers.splice(+b.dataset.rm, 1); saveP(p); renderList(); }));
    $$('#dlist [data-tag]').forEach((inp) => inp.addEventListener('input', () => { p.discover.papers[+inp.dataset.tag].tag = inp.value; saveSoon(p); }));
  };
  renderList();
  $('#dbib').addEventListener('click', () => download('refs.bib', p.discover.papers.map(bibtexFor).join('\n\n'), 'text/plain'));
  $('#djson').addEventListener('click', () => download('reading-list.json', JSON.stringify(p.discover.papers, null, 2), 'application/json'));

  const doSearch = async () => {
    const q = $('#dq').value.trim();
    if (!q) return;
    $('#dstat').textContent = 'searching arXiv · Semantic Scholar · DBLP · OpenAlex…';
    $('#dres').innerHTML = '';
    const settled = await Promise.allSettled(SOURCES.map((s) => s.fn(q)));
    const all = []; const notes = [];
    settled.forEach((r, i) => {
      if (r.status === 'fulfilled') { all.push(...r.value); notes.push(`${SOURCES[i].label} ${r.value.length}`); }
      else notes.push(`${SOURCES[i].label} unavailable`);
    });
    const merged = dedupe(all).sort((a, b) => (b.cites ?? -1) - (a.cites ?? -1));
    $('#dstat').textContent = `${merged.length} unique results — ${notes.join(' · ')}`;
    const saved = new Set(p.discover.papers.map(paperKey));
    $('#dres').innerHTML = merged.map((r, i) => paperRow(r,
      saved.has(paperKey(r))
        ? '<span class="badge">✓ in reading list</span>'
        : `<button class="more-link" data-save="${i}">⊕ Save</button>`)).join('');
    $$('#dres [data-save]').forEach((b) => b.addEventListener('click', () => {
      p.discover.papers.push(merged[+b.dataset.save]); saveP(p);
      b.outerHTML = '<span class="badge">✓ in reading list</span>'; renderList();
    }));
  };
  $('#dgo').addEventListener('click', doSearch);
  $('#dq').addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
}

// ══════════════════════════════════════════════════════════════════
// 2 · FRAME
// ══════════════════════════════════════════════════════════════════
function rFrame(mount, p) {
  mount.innerHTML = `
    <div class="card">
      <label class="fl">The problem <span class="hint">— one paragraph: what is broken/slow/unknown, for whom?</span></label>
      <textarea id="f-problem"></textarea>
      <label class="fl">The gap <span class="hint">— what existing work doesn't do (cite your reading list)</span></label>
      <textarea id="f-gap"></textarea>
      <label class="fl">Research questions <span class="hint">— one per line; keep them answerable by an experiment</span></label>
      <textarea id="f-rqs" placeholder="RQ1: Does …&#10;RQ2: How much …"></textarea>
      <label class="fl">Claimed contributions <span class="hint">— one per line; mark the kind, e.g. [algorithm] [system] [theory] [dataset] [benchmark] [study]</span></label>
      <textarea id="f-contrib" placeholder="[algorithm] A retrieval policy that …&#10;[study] The first systematic comparison of …"></textarea>
      <label class="fl">Scope &amp; assumptions</label>
      <textarea id="f-scope"></textarea>
    </div>
    <div class="card">
      <h2 class="sec">Novelty check</h2>
      <p class="hint">Runs each research question as a live Semantic Scholar query — if the top hits already answer it, sharpen the question. Honest input beats a sad reviewer.</p>
      <button class="btn btn-ghost" id="fnov" style="margin-top:10px">Check RQs against the literature</button>
      <div id="fnovres"></div>
    </div>`;
  bind($('#f-problem'), p.frame, 'problem', p);
  bind($('#f-gap'), p.frame, 'gap', p);
  bind($('#f-rqs'), p.frame, 'rqs', p);
  bind($('#f-contrib'), p.frame, 'contributions', p);
  bind($('#f-scope'), p.frame, 'scope', p);
  $('#fnov').addEventListener('click', async () => {
    const rqs = (p.frame.rqs || '').split('\n').map((s) => s.trim()).filter(Boolean);
    if (!rqs.length) return ($('#fnovres').innerHTML = '<p class="empty">Write at least one research question first.</p>');
    $('#fnovres').innerHTML = '<p class="statline">querying Semantic Scholar…</p>';
    let html = '';
    for (const rq of rqs) {
      const q = rq.replace(/^RQ\d+[:.]?\s*/i, '');
      try {
        const hits = (await searchS2(q)).slice(0, 3);
        html += `<div style="margin-top:14px"><strong style="font-size:.9rem">${esc(rq)}</strong>` +
          (hits.length ? hits.map((h) => paperRow(h, '')).join('') : '<p class="empty">no close hits</p>') + '</div>';
      } catch { html += `<div style="margin-top:14px"><strong>${esc(rq)}</strong><p class="empty">Semantic Scholar unavailable (rate limit?) — try again shortly.</p></div>`; }
      $('#fnovres').innerHTML = html;
      await new Promise((r) => setTimeout(r, 1100)); // be polite to the shared rate pool
    }
  });
}

// ══════════════════════════════════════════════════════════════════
// 3 · DESIGN
// ══════════════════════════════════════════════════════════════════
function rDesign(mount, p) {
  const d = p.design;
  mount.innerHTML = `
    <div class="card">
      <label class="fl">Study paradigm</label>
      <select id="g-paradigm">
        <option value="">— choose —</option>
        ${['Empirical / benchmark comparison', 'Systems / performance evaluation', 'Theory with experimental validation', 'User study (HCI)', 'Dataset / benchmark contribution', 'Measurement / reproduction study'].map((x) => `<option${d.paradigm === x ? ' selected' : ''}>${x}</option>`).join('')}
      </select>
      <label class="fl">Methods <span class="hint">— one per line, your proposed method first; the rest are baselines (pull them from your reading list)</span></label>
      <textarea id="g-methods" placeholder="ours&#10;baseline-bm25&#10;baseline-dense"></textarea>
      <label class="fl">Metrics <span class="hint">— one per line, exactly as you will log them (e.g. acc, f1, latency_ms)</span></label>
      <textarea id="g-metrics" placeholder="acc&#10;f1"></textarea>
      <label class="fl">Seeds <span class="hint">— comma-separated; ≥3 lets the Analyze stage put honest error bars on every claim</span></label>
      <input type="text" id="g-seeds">
      <label class="fl">Planned ablations</label>
      <textarea id="g-abl" placeholder="− retrieval component&#10;− reranker&#10;half training data"></textarea>
    </div>
    <div class="card">
      <h2 class="sec">Datasets</h2>
      <p class="hint">Add your own, or search Hugging Face live (real records, linked).</p>
      <div class="row" style="margin-top:8px">
        <input type="text" id="g-dsq" class="grow" placeholder="Search Hugging Face datasets — e.g. squad, imagenet, ms marco">
        <button class="btn btn-ghost" id="g-dsgo">Search HF</button>
      </div>
      <div id="g-dsres"></div>
      <div class="row" style="margin-top:10px">
        <input type="text" id="g-dsname" class="grow" placeholder="…or add a dataset by name (private / not on HF)">
        <button class="btn btn-ghost btn-sm" id="g-dsadd">Add</button>
      </div>
      <div id="g-dslist"></div>
    </div>
    <div class="card">
      <h2 class="sec">Experiment matrix</h2>
      <div id="g-matrix"></div>
      <button class="btn btn-fill" id="g-seed" style="margin-top:12px">Seed planned runs into the Experiment tracker →</button>
      <p class="hint" style="margin-top:6px">Creates one planned run per method × dataset × seed (skips combinations already tracked).</p>
    </div>
    <div class="card">
      <h2 class="sec">Threats to validity</h2>
      ${[['internal', 'Internal — could something other than your method explain the result? (tuning budget parity, same train/eval splits, identical hardware)'],
         ['external', 'External — will it hold beyond your setup? (more datasets, model scales, distribution shift)'],
         ['construct', 'Construct — do your metrics actually measure the claim? (proxy metrics, benchmark contamination)'],
         ['stat', 'Statistical — multiple seeds, variance reported, tests not p-hacked (declare comparisons in advance)']]
        .map(([k, txt]) => `<label class="check"><input type="checkbox" data-th="${k}" ${d.threats[k] ? 'checked' : ''}> <span>${txt}</span></label>`).join('')}
    </div>`;
  $('#g-paradigm').addEventListener('change', (e) => { d.paradigm = e.target.value; saveSoon(p); });
  bind($('#g-methods'), d, 'methods', p);
  bind($('#g-metrics'), d, 'metrics', p);
  bind($('#g-seeds'), d, 'seeds', p);
  bind($('#g-abl'), d, 'ablations', p);
  $$('[data-th]').forEach((c) => c.addEventListener('change', () => { d.threats[c.dataset.th] = c.checked; saveSoon(p); }));

  const renderDs = () => {
    $('#g-dslist').innerHTML = d.datasets.length
      ? d.datasets.map((ds, i) => `<div class="paper"><div class="t" style="font-size:.88rem">${esc(ds.name)}</div>
          <div class="acts">${ds.src === 'hf' ? '<span class="badge">Hugging Face</span>' : '<span class="badge">user-added</span>'}
          ${ds.url ? `<a class="more-link" href="${esc(ds.url)}" target="_blank" rel="noopener">Open</a>` : ''}
          <button class="del" data-dsrm="${i}">✕</button></div></div>`).join('')
      : '<p class="empty">No datasets yet.</p>';
    $$('#g-dslist [data-dsrm]').forEach((b) => b.addEventListener('click', () => { d.datasets.splice(+b.dataset.dsrm, 1); saveP(p); renderDs(); renderMatrix(); }));
  };
  const renderMatrix = () => {
    const ms = (d.methods || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const seeds = (d.seeds || '').split(',').map((s) => s.trim()).filter(Boolean);
    $('#g-matrix').innerHTML = ms.length && d.datasets.length
      ? `<table class="tl"><tr><th>method \\ dataset</th>${d.datasets.map((ds) => `<th>${esc(ds.name)}</th>`).join('')}</tr>
         ${ms.map((m) => `<tr><td><strong>${esc(m)}</strong></td>${d.datasets.map(() => `<td class="mono hint">${seeds.length} seed${seeds.length === 1 ? '' : 's'}</td>`).join('')}</tr>`).join('')}</table>
         <p class="statline">${ms.length} methods × ${d.datasets.length} datasets × ${seeds.length} seeds = ${ms.length * d.datasets.length * seeds.length} planned runs</p>`
      : '<p class="empty">Add methods and at least one dataset to see the matrix.</p>';
  };
  renderDs(); renderMatrix();
  $('#g-methods').addEventListener('input', renderMatrix);
  $('#g-seeds').addEventListener('input', renderMatrix);
  $('#g-dsadd').addEventListener('click', () => {
    const name = $('#g-dsname').value.trim();
    if (!name) return;
    d.datasets.push({ name, src: 'user' }); $('#g-dsname').value = ''; saveP(p); renderDs(); renderMatrix();
  });
  $('#g-dsgo').addEventListener('click', async () => {
    const q = $('#g-dsq').value.trim();
    if (!q) return;
    $('#g-dsres').innerHTML = '<p class="statline">searching huggingface.co…</p>';
    try {
      const j = await (await fetch(`https://huggingface.co/api/datasets?search=${encodeURIComponent(q)}&limit=8`)).json();
      $('#g-dsres').innerHTML = j.length ? j.map((ds, i) => `<div class="paper">
          <div class="t" style="font-size:.88rem">${esc(ds.id)}</div>
          <div class="m">${ds.downloads != null ? ds.downloads.toLocaleString() + ' downloads' : ''}${ds.likes != null ? ' · ♥ ' + ds.likes : ''}</div>
          <div class="acts"><span class="badge">Hugging Face</span>
            <a class="more-link" href="https://huggingface.co/datasets/${esc(ds.id)}" target="_blank" rel="noopener">Open</a>
            <button class="more-link" data-hf="${i}">⊕ Add</button></div></div>`).join('')
        : '<p class="empty">no matches</p>';
      $$('#g-dsres [data-hf]').forEach((b) => b.addEventListener('click', () => {
        const ds = j[+b.dataset.hf];
        if (!d.datasets.some((x) => x.name === ds.id)) d.datasets.push({ name: ds.id, src: 'hf', url: `https://huggingface.co/datasets/${ds.id}` });
        saveP(p); renderDs(); renderMatrix();
      }));
    } catch { $('#g-dsres').innerHTML = '<p class="empty">Hugging Face unavailable right now.</p>'; }
  });
  $('#g-seed').addEventListener('click', () => {
    const ms = (d.methods || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const seeds = (d.seeds || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!ms.length || !d.datasets.length || !seeds.length) return alert('Need methods, datasets and seeds first.');
    const have = new Set(p.experiment.runs.map((r) => `${r.method}|${r.dataset}|${r.seed}`));
    let added = 0;
    for (const m of ms) for (const ds of d.datasets) for (const s of seeds) {
      if (have.has(`${m}|${ds.name}|${s}`)) continue;
      p.experiment.runs.push({ id: uid(), method: m, dataset: ds.name, seed: s, params: '', metrics: {}, status: 'planned', notes: '', ts: new Date().toISOString() });
      added++;
    }
    saveP(p);
    location.hash = `#/p/${p.id}/experiment`;
    setTimeout(() => alert(`${added} planned runs created.`), 50);
  });
}

// ══════════════════════════════════════════════════════════════════
// 4 · EXPERIMENT — run tracker
// ══════════════════════════════════════════════════════════════════
function parseMetrics(s) {
  const out = {};
  for (const m of String(s || '').matchAll(/([A-Za-z_][\w.@-]*)\s*[=:]\s*(-?\d+(?:\.\d+)?(?:e-?\d+)?)/g)) out[m[1]] = +m[2];
  return out;
}
const metricsStr = (m) => Object.entries(m || {}).map(([k, v]) => `${k}=${v}`).join(' ');

function rExperiment(mount, p) {
  const ex = p.experiment;
  mount.innerHTML = `
    <div class="card">
      <h2 class="sec">Log a run</h2>
      <div class="row" style="margin-top:8px">
        <input type="text" id="r-method" placeholder="method" list="r-ml" style="max-width:170px"><datalist id="r-ml">${(p.design.methods || '').split('\n').filter(Boolean).map((m) => `<option value="${esc(m.trim())}">`).join('')}</datalist>
        <input type="text" id="r-dataset" placeholder="dataset" list="r-dl" style="max-width:170px"><datalist id="r-dl">${p.design.datasets.map((d) => `<option value="${esc(d.name)}">`).join('')}</datalist>
        <input type="text" id="r-seed" placeholder="seed" style="max-width:80px">
        <input type="text" id="r-metrics" class="grow" placeholder="metrics — e.g. acc=0.912 f1=0.887 latency_ms=41">
        <button class="btn btn-fill btn-sm" id="r-add">Add run</button>
      </div>
      <div class="row" style="margin-top:8px">
        <input type="text" id="r-params" class="grow" placeholder="config / hyperparams (free text) — e.g. lr=3e-4 bs=32 ckpt=a1b2c3">
        <input type="text" id="r-notes" class="grow" placeholder="notes">
      </div>
      <div class="row" style="margin-top:10px">
        <button class="btn btn-ghost btn-sm" id="r-csv">⬇ CSV</button>
        <button class="btn btn-ghost btn-sm" id="r-json">⬇ JSON</button>
        <button class="btn btn-ghost btn-sm" id="r-imp">⬆ JSON</button>
        <span class="statline" id="r-stat"></span>
      </div>
      <div id="r-table" style="overflow-x:auto"></div>
    </div>
    <div class="card">
      <h2 class="sec">Reproducibility checklist</h2>
      ${[['code', 'Code is in version control; the exact commit for each run is recorded in its config'],
         ['env', 'Environment captured (lockfile / container / requirements with pins)'],
         ['seeds', 'All randomness seeded, and the seed is logged per run'],
         ['data', 'Dataset versions/hashes pinned; preprocessing scripted, not manual'],
         ['cmd', 'One command reproduces each table/figure from raw logs'],
         ['release', 'Plan to release code + configs (artifact evaluation, if the venue has it)']]
        .map(([k, txt]) => `<label class="check"><input type="checkbox" data-rp="${k}" ${ex.repro[k] ? 'checked' : ''}> <span>${txt}</span></label>`).join('')}
    </div>`;
  $$('[data-rp]').forEach((c) => c.addEventListener('change', () => { ex.repro[c.dataset.rp] = c.checked; saveSoon(p); }));

  const renderTable = () => {
    const mkeys = [...new Set(ex.runs.flatMap((r) => Object.keys(r.metrics || {})))];
    $('#r-stat').textContent = `${ex.runs.length} runs · ${ex.runs.filter((r) => Object.keys(r.metrics || {}).length).length} with results`;
    $('#r-table').innerHTML = ex.runs.length ? `<table class="tl">
      <tr><th>method</th><th>dataset</th><th>seed</th>${mkeys.map((k) => `<th>${esc(k)}</th>`).join('')}<th>status</th><th>config</th><th></th></tr>
      ${ex.runs.map((r, i) => `<tr>
        <td><strong>${esc(r.method)}</strong></td><td>${esc(r.dataset)}</td><td class="mono">${esc(r.seed)}</td>
        ${mkeys.map((k) => `<td class="mono">${r.metrics?.[k] != null ? r.metrics[k] : '—'}</td>`).join('')}
        <td><input type="text" data-rmx="${i}" value="${esc(metricsStr(r.metrics))}" placeholder="acc=…" style="min-width:130px;padding:3px 7px;font-size:.74rem"></td>
        <td class="hint" title="${esc(r.params)}">${esc((r.params || '').slice(0, 24))}${(r.params || '').length > 24 ? '…' : ''}</td>
        <td><button class="del" data-rrm="${i}">✕</button></td></tr>`).join('')}
    </table>` : '<p class="empty">No runs yet — log one above, or seed the matrix from Design.</p>';
    $$('#r-table [data-rrm]').forEach((b) => b.addEventListener('click', () => { ex.runs.splice(+b.dataset.rrm, 1); saveP(p); renderTable(); }));
    $$('#r-table [data-rmx]').forEach((inp) => inp.addEventListener('change', () => {
      const r = ex.runs[+inp.dataset.rmx];
      r.metrics = parseMetrics(inp.value);
      r.status = Object.keys(r.metrics).length ? 'done' : r.status;
      saveP(p); renderTable();
    }));
  };
  renderTable();
  $('#r-add').addEventListener('click', () => {
    const method = $('#r-method').value.trim(), dataset = $('#r-dataset').value.trim();
    if (!method || !dataset) return alert('method + dataset are required');
    const metrics = parseMetrics($('#r-metrics').value);
    ex.runs.push({ id: uid(), method, dataset, seed: $('#r-seed').value.trim(), params: $('#r-params').value.trim(), metrics, status: Object.keys(metrics).length ? 'done' : 'planned', notes: $('#r-notes').value.trim(), ts: new Date().toISOString() });
    saveP(p); renderTable();
    $('#r-metrics').value = ''; $('#r-seed').value = '';
  });
  $('#r-csv').addEventListener('click', () => {
    const mkeys = [...new Set(ex.runs.flatMap((r) => Object.keys(r.metrics || {})))];
    const head = ['method', 'dataset', 'seed', 'status', ...mkeys, 'params', 'notes'];
    const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const rows = ex.runs.map((r) => [r.method, r.dataset, r.seed, r.status, ...mkeys.map((k) => r.metrics?.[k] ?? ''), r.params, r.notes].map(q).join(','));
    download('runs.csv', [head.map(q).join(','), ...rows].join('\n'), 'text/csv');
  });
  $('#r-json').addEventListener('click', () => download('runs.json', JSON.stringify(ex.runs, null, 2), 'application/json'));
  $('#r-imp').addEventListener('click', () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json';
    inp.onchange = async () => {
      try {
        const runs = JSON.parse(await inp.files[0].text());
        if (!Array.isArray(runs)) throw new Error('expected an array of runs');
        for (const r of runs) if (r.method && r.dataset) ex.runs.push({ id: uid(), metrics: {}, params: '', notes: '', seed: '', status: 'done', ...r });
        saveP(p); renderTable();
      } catch (e) { alert('Import failed: ' + e.message); }
    };
    inp.click();
  });
}

// ══════════════════════════════════════════════════════════════════
// 5 · ANALYZE
// ══════════════════════════════════════════════════════════════════
function rAnalyze(mount, p) {
  const runs = p.experiment.runs.filter((r) => Object.keys(r.metrics || {}).length);
  const mkeys = [...new Set(runs.flatMap((r) => Object.keys(r.metrics)))];
  const methods = [...new Set(runs.map((r) => r.method))];
  const datasets = [...new Set(runs.map((r) => r.dataset))];
  mount.innerHTML = `
    <div class="card">
      <h2 class="sec">Aggregate across seeds</h2>
      ${mkeys.length ? `<div class="row" style="margin-top:8px">
        <label class="hint">metric</label><select id="a-metric" style="max-width:200px">${mkeys.map((k) => `<option>${esc(k)}</option>`).join('')}</select>
      </div><div id="a-agg"></div>` : '<p class="empty">No runs with metrics yet — log results in the Experiment stage first.</p>'}
    </div>
    ${mkeys.length ? `
    <div class="card">
      <h2 class="sec">Compare two methods</h2>
      <p class="hint">Pairs runs by seed when both methods share the same seeds (paired t-test); otherwise falls back to Welch's t-test. Cohen's d reported alongside p — a tiny p with a tiny effect is still a tiny effect.</p>
      <div class="row" style="margin-top:8px">
        <select id="a-m1" style="max-width:180px">${methods.map((m) => `<option>${esc(m)}</option>`).join('')}</select>
        <span class="hint">vs</span>
        <select id="a-m2" style="max-width:180px">${methods.map((m, i) => `<option${i === 1 ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select>
        <span class="hint">on</span>
        <select id="a-ds" style="max-width:180px">${datasets.map((d) => `<option>${esc(d)}</option>`).join('')}</select>
        <button class="btn btn-ghost btn-sm" id="a-cmp">Compare</button>
      </div>
      <div id="a-cmpres"></div>
    </div>
    <div class="card">
      <h2 class="sec">Captured tables <span class="hint">(${p.analyze.captures.length})</span></h2>
      <p class="hint">Captures are inserted into the Write stage's Results section as Markdown + LaTeX.</p>
      <div id="a-caps"></div>
    </div>` : ''}`;
  if (!mkeys.length) return;

  const agg = () => {
    const metric = $('#a-metric').value;
    const groups = [];
    for (const ds of datasets) for (const m of methods) {
      const vals = runs.filter((r) => r.method === m && r.dataset === ds && r.metrics[metric] != null).map((r) => r.metrics[metric]);
      if (vals.length) groups.push({ method: m, dataset: ds, ...S.summarize(vals), vals });
    }
    $('#a-agg').innerHTML = `<table class="tl">
      <tr><th>method</th><th>dataset</th><th>n</th><th>mean</th><th>sd</th><th>95% CI</th></tr>
      ${groups.map((g) => `<tr><td><strong>${esc(g.method)}</strong></td><td>${esc(g.dataset)}</td>
        <td class="mono">${g.n}</td><td class="mono">${fmt(g.mean)}</td><td class="mono">${g.n > 1 ? fmt(g.sd) : '—'}</td>
        <td class="mono">${g.n > 1 ? `[${fmt(g.ci95[0])}, ${fmt(g.ci95[1])}]` : '—'}</td></tr>`).join('')}
    </table>
    <div class="row" style="margin-top:10px"><button class="btn btn-ghost btn-sm" id="a-cap">📋 Capture this table for the paper</button>
    ${groups.some((g) => g.n < 3) ? '<span class="hint">⚠ some cells have &lt;3 seeds — error bars are unstable below n=3</span>' : ''}</div>`;
    $('#a-cap')?.addEventListener('click', () => {
      const md = [`| Method | Dataset | n | ${metric} (mean ± sd) | 95% CI |`, '|---|---|---|---|---|',
        ...groups.map((g) => `| ${g.method} | ${g.dataset} | ${g.n} | ${fmt(g.mean)} ± ${g.n > 1 ? fmt(g.sd) : '—'} | ${g.n > 1 ? `[${fmt(g.ci95[0])}, ${fmt(g.ci95[1])}]` : '—'} |`)].join('\n');
      const tex = ['\\begin{table}[t]\\centering', `\\caption{${metric} by method and dataset (mean $\\pm$ sd over seeds; 95\\% CI).}`,
        '\\begin{tabular}{llrrr}', '\\toprule', `Method & Dataset & $n$ & ${metric} & 95\\% CI \\\\`, '\\midrule',
        ...groups.map((g) => `${g.method} & ${g.dataset} & ${g.n} & $${fmt(g.mean)} \\pm ${g.n > 1 ? fmt(g.sd) : '-'}$ & $[${g.n > 1 ? fmt(g.ci95[0]) + ', ' + fmt(g.ci95[1]) : '-'}]$ \\\\`),
        '\\bottomrule', '\\end{tabular}\\end{table}'].join('\n');
      p.analyze.captures.push({ id: uid(), title: `${metric} summary`, md, tex, ts: new Date().toISOString() });
      saveP(p); renderCaps();
    });
  };
  const renderCaps = () => {
    $('#a-caps').innerHTML = p.analyze.captures.length
      ? p.analyze.captures.map((c, i) => `<div class="paper"><div class="row" style="justify-content:space-between">
          <strong style="font-size:.9rem">${esc(c.title)}</strong><button class="del" data-crm="${i}">✕</button></div>
          <pre class="code">${esc(c.md)}</pre></div>`).join('')
      : '<p class="empty">Nothing captured yet.</p>';
    $$('#a-caps [data-crm]').forEach((b) => b.addEventListener('click', () => { p.analyze.captures.splice(+b.dataset.crm, 1); saveP(p); renderCaps(); }));
  };
  $('#a-metric').addEventListener('change', agg);
  agg(); renderCaps();

  $('#a-cmp').addEventListener('click', () => {
    const metric = $('#a-metric').value, m1 = $('#a-m1').value, m2 = $('#a-m2').value, ds = $('#a-ds').value;
    const r1 = runs.filter((r) => r.method === m1 && r.dataset === ds && r.metrics[metric] != null);
    const r2 = runs.filter((r) => r.method === m2 && r.dataset === ds && r.metrics[metric] != null);
    if (r1.length < 2 || r2.length < 2) return ($('#a-cmpres').innerHTML = '<p class="empty">Need ≥2 results per method on that dataset for a test.</p>');
    const s1 = new Map(r1.map((r) => [String(r.seed), r.metrics[metric]]));
    const s2 = new Map(r2.map((r) => [String(r.seed), r.metrics[metric]]));
    const shared = [...s1.keys()].filter((k) => s2.has(k) && k !== '');
    let html, res, kind;
    const ft = (t) => (isFinite(t) ? fmt(t, 3) : '∞ (zero variance in the differences — every seed moved by the same amount)');
    if (shared.length >= 2 && shared.length === s1.size && shared.length === s2.size) {
      kind = 'paired t-test (paired by seed)';
      res = S.pairedT(shared.map((k) => s1.get(k)), shared.map((k) => s2.get(k)));
      html = `t(${res.df}) = ${ft(res.t)}, p = ${fmt(res.p)}, Cohen's d_z = ${fmt(res.dz, 3)}, Δ = ${fmt(res.meanDiff)}`;
    } else {
      kind = "Welch's t-test (unpaired — seed sets differ)";
      res = S.welchT(r1.map((r) => r.metrics[metric]), r2.map((r) => r.metrics[metric]));
      html = `t(${fmt(res.df, 2)}) = ${ft(res.t)}, p = ${fmt(res.p)}, Cohen's d = ${fmt(res.d, 3)}, Δ = ${fmt(res.meanDiff)}`;
    }
    const ci = S.bootMeanCI(r1.map((r) => r.metrics[metric]), { seed: 42 });
    const better = res.meanDiff > 0 ? m1 : m2;
    const sig = res.p < 0.05;
    $('#a-cmpres').innerHTML = `<div class="note-fab" style="margin-top:12px">
      <strong>${esc(kind)}</strong> on <span class="mono">${esc(metric)}</span> · ${esc(ds)}<br>
      <span class="mono">${html}</span><br>
      ${sig ? `<strong>${esc(better)}</strong> is higher and the difference is statistically significant at α=.05.` : `The difference is <strong>not</strong> statistically significant at α=.05 — do not claim a win on this comparison.`}
      ${(r1.length < 4 || r2.length < 4) ? '<br>⚠ Fewer than 4 results per side — treat this as indicative, not conclusive; add seeds.' : ''}
    </div>`;
  });
}

// ══════════════════════════════════════════════════════════════════
// 6 · WRITE
// ══════════════════════════════════════════════════════════════════
const SECTIONS = [
  ['abstract', 'Abstract', 'Problem · approach · key result (with the actual number) · why it matters. ~150–250 words.'],
  ['intro', 'Introduction', 'The problem, why now, the gap, then your contributions as a bulleted list (insert below).'],
  ['related', 'Related Work', 'Group your reading list by theme; say how each line of work differs from yours.'],
  ['method', 'Method', 'What you built / proved. A figure sketch and notation table help.'],
  ['setup', 'Experimental Setup', 'Datasets, baselines, metrics, hardware, seeds, tuning protocol — enough to reproduce.'],
  ['results', 'Results', 'Lead with the main table (insert a capture below). Report variance. Ablations after.'],
  ['limitations', 'Limitations', 'Honest scope: where it fails, what you did not test.'],
  ['ethics', 'Ethics & Reproducibility statement', 'Data licensing, compute, release plan.'],
  ['conclusion', 'Conclusion', 'What is now true that was not before. No new claims.'],
];
function rWrite(mount, p) {
  const w = p.write.sections;
  mount.innerHTML = `
    <div class="card">
      <div class="row">
        <button class="btn btn-fill btn-sm" id="w-md">⬇ paper.md</button>
        <button class="btn btn-ghost btn-sm" id="w-tex">⬇ paper.tex</button>
        <button class="btn btn-ghost btn-sm" id="w-bib">⬇ refs.bib (${p.discover.papers.length})</button>
        <span class="hint">cite with <span class="mono">\\cite{key}</span> — keys shown in your reading list</span>
      </div>
    </div>
    ${SECTIONS.map(([k, name, hint]) => `
      <div class="card">
        <h2 class="sec">${name}</h2>
        <p class="hint">${hint}</p>
        ${k === 'intro' ? '<button class="btn btn-ghost btn-sm" id="w-ic" style="margin:8px 0 0">⊕ Insert contributions from Frame</button>' : ''}
        ${k === 'related' ? '<button class="btn btn-ghost btn-sm" id="w-ir" style="margin:8px 0 0">⊕ Insert reading list grouped by tag</button>' : ''}
        ${k === 'results' ? `<div class="row" style="margin:8px 0 0">${p.analyze.captures.map((c, i) => `<button class="btn btn-ghost btn-sm" data-cap="${i}">⊕ ${esc(c.title)}</button>`).join('') || '<span class="hint">capture a table in Analyze to insert it here</span>'}</div>` : ''}
        <textarea data-sec="${k}" style="min-height:110px;margin-top:10px"></textarea>
      </div>`).join('')}`;
  $$('[data-sec]').forEach((t) => { t.value = w[t.dataset.sec] || ''; t.addEventListener('input', () => { w[t.dataset.sec] = t.value; saveSoon(p); }); });
  const append = (k, text) => { const t = $(`[data-sec="${k}"]`); t.value = (t.value ? t.value + '\n\n' : '') + text; w[k] = t.value; saveP(p); };
  $('#w-ic')?.addEventListener('click', () => {
    const c = (p.frame.contributions || '').split('\n').filter((s) => s.trim());
    append('intro', c.length ? 'Our contributions are:\n' + c.map((x) => '- ' + x.trim()).join('\n') : '(no contributions written in Frame yet)');
  });
  $('#w-ir')?.addEventListener('click', () => {
    const by = {};
    for (const r of p.discover.papers) (by[r.tag || 'untagged'] ||= []).push(r);
    append('related', Object.entries(by).map(([tag, rs]) =>
      `**${tag}.** ` + rs.map((r) => `${r.title} \\cite{${bibKey(r)}}`).join('; ') + '.').join('\n\n') || '(reading list is empty)');
  });
  $$('[data-cap]').forEach((b) => b.addEventListener('click', () => append('results', p.analyze.captures[+b.dataset.cap].md)));
  const paperMd = () => `# ${p.name}\n\n` + SECTIONS.map(([k, name]) => `## ${name}\n\n${w[k] || '*(todo)*'}`).join('\n\n');
  $('#w-md').addEventListener('click', () => download('paper.md', paperMd(), 'text/markdown'));
  $('#w-bib').addEventListener('click', () => download('refs.bib', p.discover.papers.map(bibtexFor).join('\n\n')));
  $('#w-tex').addEventListener('click', () => {
    const texEsc = (s) => String(s || '').replace(/([%&#_])/g, '\\$1');
    const body = SECTIONS.map(([k, name]) => `\\section{${name}}\n${k === 'results' ? (w[k] || '') /* may contain a tex-ish table already */ : texEsc(w[k] || '')}`).join('\n\n');
    download('paper.tex', `\\documentclass{article}\n\\usepackage{booktabs}\n\\usepackage{hyperref}\n\\title{${texEsc(p.name)}}\n\\begin{document}\n\\maketitle\n\n${body}\n\n\\bibliographystyle{plain}\n\\bibliography{refs}\n\\end{document}\n`);
  });
}

// ══════════════════════════════════════════════════════════════════
// 7 · PUBLISH
// ══════════════════════════════════════════════════════════════════
const PUB_CHECKS = [
  ['arxiv', 'arXiv preprint', [
    ['axlicense', 'Checked the venue allows preprints (most CS venues do; some run anonymous-preprint policies)'],
    ['axsrc', 'LaTeX source compiles standalone (arXiv builds from source, not your PDF)'],
    ['axmeta', 'Title/abstract plain-text ready; categories chosen (e.g. cs.LG, cs.CL)'],
  ], 'https://info.arxiv.org/help/submit/index.html', 'arXiv submission help'],
  ['artifact', 'Artifact & reproducibility', [
    ['afcode', 'Code + configs public, with the exact commands behind every table and figure'],
    ['afdata', 'Data available or generation scripted; licenses checked'],
    ['afdoc', 'README lets a stranger reproduce the main result on one GPU/CPU in finite time'],
  ], 'https://www.acm.org/publications/policies/artifact-review-and-badging-current', 'ACM artifact badging'],
  ['camera', 'Submission & camera-ready', [
    ['cmfmt', 'Venue template + page limit respected (check the current year’s CFP)'],
    ['cmanon', 'Properly anonymized if double-blind (acks, repo links, self-citations in third person)'],
    ['cmstats', 'Every claim in the abstract is backed by a number in the paper'],
    ['cmlimit', 'Limitations section present (required at several ML venues now)'],
  ], null, null],
];
function rPublish(mount, p) {
  const pub = p.publish;
  mount.innerHTML = `
    <div class="card">
      <h2 class="sec">Venue directory <span class="hint">— ${VENUES.length} long-running CS venues, hand-verified, linked to DBLP</span></h2>
      <p class="hint">Deadlines move every year, so they are never hardcoded here — check the live aggregators:
        ${DEADLINE_LINKS.map((d) => `<a class="more-link" href="${d.url}" target="_blank" rel="noopener">${esc(d.name.split(' — ')[0])}</a>`).join(' ')}</p>
      <div class="row" style="margin-top:10px">
        <select id="v-area" style="max-width:220px"><option value="">All areas</option>${AREAS.map((a) => `<option>${a}</option>`).join('')}</select>
        <select id="v-type" style="max-width:160px"><option value="">conf + journal</option><option value="conf">conferences</option><option value="journal">journals</option></select>
        <input type="text" id="v-q" class="grow" placeholder="filter by name…">
      </div>
      <div class="vgrid" id="v-grid"></div>
    </div>
    <div class="card">
      <h2 class="sec">Shortlist <span class="hint">(${pub.shortlist.length})</span></h2>
      <div id="v-short"></div>
    </div>
    ${PUB_CHECKS.map(([gid, gname, items, url, urlLabel]) => `
      <div class="card">
        <h2 class="sec">${gname} ${url ? `<a class="more-link" href="${url}" target="_blank" rel="noopener" style="margin-left:8px">${urlLabel}</a>` : ''}</h2>
        ${items.map(([k, txt]) => `<label class="check"><input type="checkbox" data-pc="${k}" ${pub.checks[k] ? 'checked' : ''}> <span>${txt}</span></label>`).join('')}
      </div>`).join('')}`;
  $$('[data-pc]').forEach((c) => c.addEventListener('change', () => { pub.checks[c.dataset.pc] = c.checked; saveSoon(p); }));
  const vcard = (v) => `<div class="vcard">
      <div class="vn">${esc(v.name)}</div>
      <div class="vm">${esc(v.area)} · ${v.type === 'conf' ? 'conference' : 'journal'} · ${esc(v.org)}</div>
      <div class="row">
        <a class="more-link" href="${dblpUrl(v)}" target="_blank" rel="noopener">DBLP</a>
        ${v.site ? `<a class="more-link" href="${v.site}" target="_blank" rel="noopener">Site</a>` : ''}
        <button class="more-link" data-star="${v.id}">${pub.shortlist.includes(v.id) ? '★ shortlisted' : '☆ shortlist'}</button>
      </div></div>`;
  const renderVenues = () => {
    const area = $('#v-area').value, type = $('#v-type').value, q = $('#v-q').value.toLowerCase();
    const vs = VENUES.filter((v) => (!area || v.area === area) && (!type || v.type === type) && (!q || v.name.toLowerCase().includes(q)));
    $('#v-grid').innerHTML = vs.map(vcard).join('') || '<p class="empty">no venues match</p>';
    $('#v-short').innerHTML = pub.shortlist.length
      ? `<div class="vgrid">${pub.shortlist.map((id) => VENUES.find((v) => v.id === id)).filter(Boolean).map(vcard).join('')}</div>`
      : '<p class="empty">Star venues above to build a target list.</p>';
    $$('[data-star]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.star;
      pub.shortlist = pub.shortlist.includes(id) ? pub.shortlist.filter((x) => x !== id) : [...pub.shortlist, id];
      saveP(p); renderVenues();
    }));
  };
  ['v-area', 'v-type'].forEach((id) => $('#' + id).addEventListener('change', renderVenues));
  $('#v-q').addEventListener('input', debounce(renderVenues, 150));
  renderVenues();
}

// ── go ────────────────────────────────────────────────────────────
route();
