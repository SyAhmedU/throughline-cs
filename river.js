// The CS river (home hero): yearly OpenAlex works per Computer Science subfield
// (primary_topic.field = 17), 2000 → last full year. Live, cached 24 h per browser.
// No-fab: every band width is a real OpenAlex count; the centred stacking, curve
// smoothing, colours and the drifting current lines are layout only.
const OA = 'https://api.openalex.org/works';
const Y0 = 2000, Y1 = new Date().getFullYear() - 1; // the current year is still being indexed
const KEY = `tlcs_river_v1_${Y1}`, TTL = 864e5;
const HUES = ['#9270F4', '#F14575', '#FF9656', '#2563eb', '#0d9488', '#ca8a04', '#d946ef', '#64748b', '#16a34a', '#c2410c', '#0891b2', '#a16207'];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n = (x) => Number(x).toLocaleString();
let mem = null;

async function getJSON(u) { const r = await fetch(u); if (!r.ok) throw new Error('OpenAlex ' + r.status); return r.json(); }
async function load() {
  if (mem) return mem;
  try { const c = JSON.parse(localStorage.getItem(KEY) || 'null'); if (c && Date.now() - c.at < TTL) return (mem = c); } catch {}
  const top = await getJSON(`${OA}?filter=primary_topic.field.id:17,publication_year:${Y0}-${Y1}&group_by=primary_topic.subfield.id`);
  const subs = top.group_by.filter((g) => g.count > 0).map((g) => ({ id: g.key.split('/').pop(), name: g.key_display_name, total: g.count }));
  const q = subs.slice(); // three at a time: OpenAlex caps bursts at 10 req/s
  await Promise.all([0, 1, 2].map(async () => {
    for (let s; (s = q.shift());) {
      const d = await getJSON(`${OA}?filter=primary_topic.subfield.id:${s.id},publication_year:${Y0}-${Y1}&group_by=publication_year`);
      const by = Object.fromEntries(d.group_by.map((g) => [+g.key, g.count]));
      s.years = Array.from({ length: Y1 - Y0 + 1 }, (_, i) => by[Y0 + i] || 0);
    }
  }));
  mem = { at: Date.now(), subs };
  try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch {}
  return mem;
}

// Catmull-Rom → cubic Bézier through points [[x,y],…]
function curve(P) {
  let d = '';
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export async function mountRiver(fig) {
  if (!fig) return;
  const box = fig.querySelector('.rv-svg'), read = fig.querySelector('.rv-read'), fb = fig.querySelector('.rv-flow');
  let data;
  try { data = await load(); } catch { box.innerHTML = '<div class="rv-wait">OpenAlex did not answer just now, so the river is resting. Everything else on this page works.</div>'; return; }
  if (!fig.isConnected) return;
  const subs = data.subs.slice().sort((a, b) => b.total - a.total), Ny = Y1 - Y0 + 1;
  // biggest stream in the middle, the rest alternate outward (layout)
  const order = []; subs.forEach((s, i) => (i % 2 ? order.push(s) : order.unshift(s)));
  const col = new Map(subs.map((s, i) => [s.id, HUES[i % HUES.length]]));
  const tot = Array.from({ length: Ny }, (_, i) => subs.reduce((a, s) => a + s.years[i], 0));
  const peakTot = Math.max(...tot), peakYi = tot.indexOf(peakTot);
  let W0 = 0, pinned = null;
  const idle = `<b>${n(subs.reduce((a, s) => a + s.total, 0))} computer-science works</b>, ${Y0}–${Y1}, across ${subs.length} OpenAlex subfields · widest year: ${Y0 + peakYi} (${n(peakTot)}) · hover a stream.`;
  function draw() {
    const W = Math.max(320, box.clientWidth), small = W < 640, H = small ? 230 : 300, padX = small ? 10 : 16, axis = 22; W0 = W;
    const X = (i) => padX + (i / (Ny - 1)) * (W - padX * 2), k = (H - axis - 16) / peakTot, mid = (H - axis) / 2 + 4;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="rvT"><title id="rvT">Computer-science works per year by subfield, ${Y0}–${Y1}, live from OpenAlex</title>`;
    const lower = tot.map((t) => mid - (t * k) / 2), cur = lower.slice(), labels = [];
    order.forEach((sb, j) => {
      const top = cur.map((y, i) => [X(i), y]), bot = cur.map((y, i) => [X(i), y + sb.years[i] * k]);
      const centre = cur.map((y, i) => [X(i), y + (sb.years[i] * k) / 2]);
      const li = Math.round((Ny - 1) * 0.62), th = sb.years[li] * k;
      if (th > (small ? 15 : 13)) labels.push(`<text x="${X(li).toFixed(0)}" y="${(centre[li][1] + 4).toFixed(1)}" text-anchor="middle" class="rv-lab">${esc(small && sb.name.length > 24 ? sb.name.replace(/^Computer /, '').split(' ')[0] : sb.name)}</text>`);
      bot.forEach((p, i) => (cur[i] = p[1]));
      const rb = bot.slice().reverse();
      s += `<g class="stream" data-i="${subs.indexOf(sb)}" tabindex="0" role="button" aria-label="${esc(sb.name)}: ${n(sb.total)} works ${Y0}–${Y1}">` +
        `<path d="M${top[0][0].toFixed(1)},${top[0][1].toFixed(1)}${curve(top)} L${rb[0][0].toFixed(1)},${rb[0][1].toFixed(1)}${curve(rb)} Z" fill="${col.get(sb.id)}"/>` +
        `<path class="cur" d="M${centre[0][0].toFixed(1)},${centre[0][1].toFixed(1)}${curve(centre)}" style="--d:${(26 + j * 3) % 40 + 18}s"/></g>`;
    });
    s += `<g pointer-events="none">${labels.join('')}</g>`;
    for (let y = Y0; y <= Y1 - (small ? 4 : 2); y += small ? 10 : 5) s += `<text x="${X(y - Y0).toFixed(0)}" y="${H - 6}" text-anchor="${y === Y0 ? 'start' : 'middle'}" class="rv-yr">${y}</text>`;
    s += `<text x="${X(Ny - 1).toFixed(0)}" y="${H - 6}" text-anchor="end" class="rv-yr">${Y1}</text>`;
    s += `<line class="rv-hair" x1="0" x2="0" y1="6" y2="${H - axis}" visibility="hidden"/></svg>`;
    box.innerHTML = s;
    const svg = box.querySelector('svg'), hair = svg.querySelector('.rv-hair');
    const yearAt = (e) => { const r = svg.getBoundingClientRect(); const x = (e.clientX - r.left) * (W / r.width); return Math.max(0, Math.min(Ny - 1, Math.round(((x - padX) / (W - padX * 2)) * (Ny - 1)))); };
    const say = (sb, yi) => {
      const pk = sb.years.indexOf(Math.max(...sb.years));
      read.innerHTML = `<b>${esc(sb.name)}</b> — ${yi == null ? '' : `${n(sb.years[yi])} works in ${Y0 + yi} · `}${n(sb.total)} in ${Y0}–${Y1} · peak ${Y0 + pk} (${n(sb.years[pk])}) · <a href="https://openalex.org/subfields/${esc(sb.id)}" target="_blank" rel="noopener">OpenAlex ↗</a>`;
    };
    svg.querySelectorAll('.stream').forEach((g) => {
      const sb = subs[+g.dataset.i];
      g.addEventListener('mousemove', (e) => { if (pinned) return; const yi = yearAt(e); hair.setAttribute('x1', X(yi)); hair.setAttribute('x2', X(yi)); hair.setAttribute('visibility', 'visible'); box.classList.add('hl'); svg.querySelectorAll('.stream').forEach((o) => o.classList.toggle('on', o === g)); say(sb, yi); });
      g.addEventListener('focus', () => { box.classList.add('hl'); svg.querySelectorAll('.stream').forEach((o) => o.classList.toggle('on', o === g)); say(sb, null); });
      g.addEventListener('click', (e) => { pinned = pinned === sb ? null : sb; if (pinned) say(sb, yearAt(e)); });
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pinned = pinned === sb ? null : sb; } });
    });
    const reset = () => { if (pinned) return; box.classList.remove('hl'); hair.setAttribute('visibility', 'hidden'); svg.querySelectorAll('.stream.on').forEach((o) => o.classList.remove('on')); read.innerHTML = idle; };
    svg.addEventListener('mouseleave', reset); svg.addEventListener('focusout', (e) => { if (!svg.contains(e.relatedTarget)) { pinned = null; reset(); } });
    read.innerHTML = idle;
  }
  fig.querySelector('.rv-key').innerHTML = subs.map((sb) => `<span><i style="background:${col.get(sb.id)}"></i>${esc(sb.name)}</span>`).join('');
  draw();
  let t = 0; const onR = () => { if (!fig.isConnected) return removeEventListener('resize', onR); clearTimeout(t); t = setTimeout(() => { if (Math.abs(box.clientWidth - W0) > 4) draw(); }, 200); };
  addEventListener('resize', onR);
  const rm = matchMedia('(prefers-reduced-motion: reduce)').matches; let flow = false, vis = true;
  try { flow = localStorage.getItem('syed_flow') === '1'; } catch {}
  const go = () => { fig.dataset.play = vis && (!rm || flow) ? '1' : '0'; fb.hidden = !rm; fb.textContent = flow ? '❚❚ Keep still' : '▶ Let it flow'; };
  fb.onclick = () => { flow = !flow; try { localStorage.setItem('syed_flow', flow ? '1' : '0'); } catch {} go(); };
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { vis = es[0].isIntersecting; go(); }).observe(fig);
  go();
}

export const RIVER_HTML = `
  <figure class="river" id="csRiver">
    <div class="rv-svg"><div class="rv-wait">Gathering the river from OpenAlex…</div></div>
    <figcaption>
      <span class="rv-read" aria-live="polite"></span>
      <span class="rv-key"></span>
      <details class="rv-how"><summary>How to read this</summary><span>Each stream is one Computer Science subfield in OpenAlex; its width in a year is the number of works published that year whose primary topic falls in that subfield (live, <code>group_by=publication_year</code>, cached for a day in this browser). The current year is left out because it is still being indexed. Streams are stacked around a centre line with the largest in the middle; that arrangement, the smoothing between years, the colours and the drifting current lines are layout, not data. OpenAlex's topic classification is machine-assigned.</span></details>
      <button class="rv-flow chip-btn" type="button" hidden>▶ Let it flow</button>
    </figcaption>
  </figure>`;
