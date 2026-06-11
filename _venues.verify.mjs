// Verifies every venue key in venues.js against the dblp database (HTTP 200)
// plus official sites and deadline aggregators. dblp.org rate-limits hard, so
// keys are checked via the official mirror dblp.uni-trier.de — same database,
// same paths. Run: node _venues.verify.mjs  — exits 1 if anything is dead.
import { VENUES, DEADLINE_LINKS } from './venues.js';

const COOLDOWN = +(process.env.VERIFY_COOLDOWN ?? 90000);
const DELAY = +(process.env.VERIFY_DELAY ?? 2500);

const targets = [
  ...VENUES.map(v => ({ label: v.id + ' dblp', url: `https://dblp.uni-trier.de/db/${v.dblp}/` })),
  ...VENUES.filter(v => v.site).map(v => ({ label: v.id + ' site', url: v.site })),
  ...DEADLINE_LINKS.map(d => ({ label: d.name, url: d.url })),
];

if (COOLDOWN) { console.log(`cooling down ${COOLDOWN / 1000}s before hitting dblp…`); await new Promise(r => setTimeout(r, COOLDOWN)); }
let fail = 0;
for (const t of targets) {
  let res = null, err = null;
  for (let attempt = 0; attempt < 2 && !res?.ok; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 30000));
    try {
      res = await fetch(t.url, { method: 'HEAD', redirect: 'follow' });
      if (res.status === 405 || res.status === 403) res = await fetch(t.url, { redirect: 'follow' });
    } catch (e) { err = e.message; }
  }
  if (res?.ok) console.log('ok   ', t.label);
  else { fail++; console.error('FAIL ', res?.status ?? err, t.label, '→', t.url); }
  await new Promise(r => setTimeout(r, DELAY));
}
console.log(fail ? `\n${fail} dead link(s)` : `\nall ${targets.length} links live`);
process.exit(fail ? 1 : 0);
