// Leonida Trophy Guide — tracker for the 55 GTA VI trophies.
// Everything is local: progress lives in localStorage, the data is data/trophies.json,
// and the app makes no network request at run time.
const EARNED_KEY = 'leonida-trophy-earned-v1';
const COUNTS_KEY = 'leonida-trophy-counts-v1';
const SPOILER_KEY = 'leonida-trophy-spoilers-v1';

const KIND_LABELS = {
  platinum: 'Platinum', story: 'Story', completion: '100% goal',
  activities: 'Activities', side: 'Side lines', collectibles: 'Collectibles',
  crime: 'Crime', mystery: 'Mystery', money: 'Money',
};
const KIND_ORDER = ['platinum', 'story', 'completion', 'activities', 'side', 'collectibles', 'crime', 'mystery', 'money'];
const STAGE_ORDER = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];

// Demo seed for screenshots: ?demo=1 fills a plausible mid-playthrough state
// (11 earned, a few counters part-way). Real readers start empty.
const DEMO_EARNED = [2, 3, 4, 8, 16, 20, 21, 28, 33, 46, 55];
const DEMO_COUNTS = { 15: 137, 28: 6, 31: 41, 35: 63, 52: 120000 };

const params = new URLSearchParams(location.search);
const isDemo = params.get('demo') === '1';

function loadSet(key, fallback) {
  try { return new Set(JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback); }
  catch { return new Set(fallback); }
}
function loadObj(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; }
  catch { return fallback; }
}

let earned = loadSet(EARNED_KEY, []);
let counts = loadObj(COUNTS_KEY, {});
let spoilersOn = (() => {
  const v = localStorage.getItem(SPOILER_KEY);
  return v === null ? true : v === '1';
})();
const revealed = new Set(); // story trophies revealed this session, in spoiler mode

if (isDemo && earned.size === 0 && Object.keys(counts).length === 0) {
  earned = new Set(DEMO_EARNED);
  counts = { ...DEMO_COUNTS };
  saveAll();
}

let state = {
  view: 'checklist',
  kind: 'all',
  grade: 'all',
  status: 'all',
  query: '',
  selected: null,
};

function saveAll() {
  localStorage.setItem(EARNED_KEY, JSON.stringify([...earned]));
  localStorage.setItem(COUNTS_KEY, JSON.stringify(counts));
  localStorage.setItem(SPOILER_KEY, spoilersOn ? '1' : '0');
}

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));
const sources = new Map(doc.sources.map((s) => [s.id, s]));

function sourceName(id) {
  const s = sources.get(id);
  return s ? s.name.split(' — ')[0] : 'Source ' + id;
}
function citeLinks(ids) {
  return ids.map((id) => {
    const s = sources.get(id);
    return s && s.url
      ? `<a class="cite" href="${s.url}" target="_blank" rel="noopener">[${id}]</a>`
      : `<span class="cite">[${id}]</span>`;
  }).join(' ');
}
function isStoryHidden(t) {
  return spoilersOn && t.kind === 'story' && !earned.has(t.id) && !revealed.has(t.id);
}
function roadmapOrder(list) {
  return [...list].sort((a, b) =>
    STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage) || a.id - b.id);
}
function fmtCount(t, value) {
  const target = t.count.target;
  return t.count.unit === '$'
    ? `$${value.toLocaleString('en-US')} / $${target.toLocaleString('en-US')}`
    : `${value} / ${target} ${t.count.label}`;
}

// ---------- header / audit ----------
function renderHeader() {
  const total = trophies.length;
  const n = earned.size;
  const pct = Math.round((n / total) * 100);
  document.getElementById('progress-count').textContent = `${n} / ${total} earned`;
  document.getElementById('progress-pct').textContent = pct + '%';
  document.getElementById('progress-fill').style.width = pct + '%';
  const gc = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const got = trophies.filter((t) => t.grade === g && earned.has(t.id)).length;
    const all = trophies.filter((t) => t.grade === g).length;
    return `<b>${g[0].toUpperCase()}</b> ${got}/${all}`;
  }).join(' &middot; ');
  document.getElementById('grade-counts').innerHTML = gc;
  document.getElementById('spoiler-toggle').checked = spoilersOn;

  const missable = trophies.filter((t) => t.missable).length;
  const watch = trophies.filter((t) => t.watch).length;
  const unconfirmed = trophies.filter((t) => t.unconfirmed).length;
  const disagree = trophies.filter((t) => t.disagree).length;
  const single = trophies.filter((t) => t.singleSource).length;
  const steps = trophies.reduce((sum, t) => sum + t.steps.length, 0);
  document.getElementById('audit-strip').innerHTML =
    `<span><b>55</b> official &middot; <b>1P 2G 6S 46B</b> &middot; <b>28</b> hidden &middot; <b>0</b> online</span>` +
    `<span><b>55/55</b> guides cite a source &middot; <b>${steps}</b> steps cited</span>` +
    `<span><b>8</b> sources read 20 Nov 2026</span>` +
    `<span class="warn"><b>${missable}</b> possibly missable</span>` +
    `<span><b>${watch}</b> watch &middot; <b>${unconfirmed}</b> unconfirmed &middot; <b>${disagree}</b> disagree &middot; <b>${single}</b> single-source</span>` +
    `<span>Difficulty <b>4/10</b> &middot; platinum <b>~200 h</b> &middot; <b>1</b> playthrough</span>`;
}

// ---------- checklist ----------
function filteredTrophies() {
  const q = state.query.trim().toLowerCase();
  return trophies.filter((t) => {
    if (state.kind !== 'all' && t.kind !== state.kind) return false;
    if (state.grade !== 'all' && t.grade !== state.grade) return false;
    if (state.status === 'earned' && !earned.has(t.id)) return false;
    if (state.status === 'unearned' && earned.has(t.id)) return false;
    if (q && !(t.name + ' ' + t.description + ' ' + t.summary).toLowerCase().includes(q)) return false;
    return true;
  });
}

function renderKindChips() {
  const box = document.getElementById('kind-chips');
  box.replaceChildren();
  const all = document.createElement('button');
  all.type = 'button';
  all.className = 'chip' + (state.kind === 'all' ? ' active' : '');
  all.textContent = `All kinds (55)`;
  all.addEventListener('click', () => { state.kind = 'all'; renderAll(); });
  box.append(all);
  for (const k of KIND_ORDER) {
    const n = trophies.filter((t) => t.kind === k).length;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (state.kind === k ? ' active' : '');
    b.textContent = `${KIND_LABELS[k]} ${n}`;
    b.addEventListener('click', () => { state.kind = k; renderAll(); });
    box.append(b);
  }
}

function renderList() {
  const list = filteredTrophies();
  document.getElementById('shown-count').textContent = `— showing ${list.length} of 55`;
  const ul = document.getElementById('trophy-list');
  ul.replaceChildren();
  for (const t of roadmapOrder(list)) {
    const li = document.createElement('li');
    li.className = (earned.has(t.id) ? 'earned ' : '') + (state.selected === t.id ? 'selected' : '');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', 'Mark ' + t.name + ' earned');
    box.addEventListener('click', (e) => e.stopPropagation());
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.id); else earned.delete(t.id);
      saveAll(); renderAll();
    });
    const main = document.createElement('div');
    const badge = document.createElement('span');
    badge.className = 'grade-badge grade-' + t.grade;
    badge.textContent = t.grade === 'platinum' ? 'P' : t.grade === 'gold' ? 'G' : t.grade === 'silver' ? 'S' : 'B';
    const name = document.createElement('span');
    name.className = 't-name';
    const desc = document.createElement('div');
    desc.className = 't-desc';
    if (isStoryHidden(t)) {
      name.textContent = 'Hidden trophy — story';
      desc.textContent = 'Hidden until earned. Turn spoilers off or reveal it to read the name.';
    } else {
      name.textContent = t.name;
      desc.textContent = t.description;
    }
    const flags = document.createElement('div');
    if (t.missable) {
      const f = document.createElement('span'); f.className = 'mini-flag'; f.textContent = 'POSSIBLY MISSABLE'; flags.append(f);
    } else if (t.watch) {
      const f = document.createElement('span'); f.className = 'mini-watch'; f.textContent = 'WATCH'; flags.append(f);
    }
    if (t.count) {
      const c = document.createElement('span'); c.className = 't-desc';
      c.textContent = ` ${counts[t.id] ?? 0}/${t.count.target} ${t.count.label}`;
      flags.append(c);
    }
    main.append(badge, document.createTextNode(' '), name, desc, flags);
    li.append(box, main);
    li.addEventListener('click', () => { state.selected = t.id; renderAll(); });
    ul.append(li);
  }

  const next = roadmapOrder(trophies.filter((t) => !earned.has(t.id))).slice(0, 5);
  const nu = document.getElementById('nextup');
  nu.replaceChildren();
  for (const t of next) {
    const li = document.createElement('li');
    const tag = document.createElement('span');
    tag.className = 'stage-tag';
    tag.textContent = t.stage + ' · ' + KIND_LABELS[t.kind];
    const name = document.createElement('span');
    name.textContent = isStoryHidden(t) ? 'Hidden story trophy' : t.name;
    li.append(tag, name);
    if (t.missable) {
      const f = document.createElement('span'); f.className = 'flag'; f.textContent = 'DO FIRST'; li.append(f);
    }
    li.addEventListener('click', () => { state.selected = t.id; renderAll(); });
    nu.append(li);
  }
}

function renderDetail() {
  const box = document.getElementById('detail');
  const t = byId.get(state.selected) ?? roadmapOrder(trophies.filter((x) => !earned.has(x.id)))[0] ?? trophies[0];
  if (!t) { box.innerHTML = '<p>No trophy selected.</p>'; return; }
  state.selected = t.id;

  if (isStoryHidden(t)) {
    box.innerHTML = `
      <div class="hidden-box">
        <span class="grade-badge grade-${t.grade}">${t.grade}</span>
        <h2>Hidden story trophy</h2>
        <p>This trophy is hidden on PlayStation until you earn it, and spoiler mode is on.
        Its name and description stay hidden so the story is not spoiled.</p>
        <p>Stage ${t.stage} &middot; ${KIND_LABELS[t.kind]} &middot; trophy #${t.id} of 55</p>
        <button type="button" id="reveal-btn">Reveal this trophy</button>
        <p><label><input type="checkbox" id="earn-hidden"> Mark earned</label></p>
      </div>`;
    document.getElementById('reveal-btn').addEventListener('click', () => {
      revealed.add(t.id); renderAll();
    });
    document.getElementById('earn-hidden').addEventListener('change', (e) => {
      if (e.target.checked) { earned.add(t.id); saveAll(); renderAll(); }
    });
    renderSideSources(t);
    return;
  }

  const flags = [];
  if (t.missable) flags.push('<span class="meta-tag red">Possibly missable</span>');
  if (t.watch) flags.push(`<span class="meta-tag amber">Watch: ${escapeHtml(t.watch)}</span>`);
  if (t.unconfirmed) flags.push('<span class="meta-tag red">Unconfirmed</span>');
  if (t.disagree) flags.push('<span class="meta-tag amber">Sources disagree</span>');
  if (t.singleSource) flags.push('<span class="meta-tag amber">Single source</span>');
  if (t.hidden) flags.push('<span class="meta-tag">Hidden on PSN</span>');
  flags.push(`<span class="meta-tag">${KIND_LABELS[t.kind]}</span>`);
  flags.push(`<span class="meta-tag">Stage ${t.stage}</span>`);

  let callouts = '';
  if (t.missable) {
    callouts += `<div class="callout red"><h3>Possibly missable — do this in Chapter 1</h3><p>${escapeHtml(t.unconfirmed ?? '')} The balcony meditation at Jason's house disappears after Chapter 1. Keep a manual save at the start of the chapter.</p></div>`;
  }
  if (t.disagree) {
    callouts += `<div class="callout"><h3>Sources disagree</h3><p>${escapeHtml(t.disagree)}</p></div>`;
  }
  if (t.unconfirmed && !t.missable) {
    callouts += `<div class="callout red"><h3>Unconfirmed</h3><p>${escapeHtml(t.unconfirmed)}</p></div>`;
  }

  let stepper = '';
  if (t.count) {
    const v = counts[t.id] ?? 0;
    const pct = Math.min(100, Math.round((v / t.count.target) * 100));
    stepper = `<div class="stepper">
      <span>Your count</span>
      <button type="button" id="count-minus" aria-label="Decrease count">−</button>
      <span class="count-now">${fmtCount(t, v)}</span>
      <button type="button" id="count-plus" aria-label="Increase count">+</button>
      <span class="count-bar"><i style="width:${pct}%"></i></span>
      ${v >= t.count.target ? '<span class="meta-tag green">Target reached — tick it earned</span>' : ''}
    </div>`;
  }

  const stepsHtml = t.steps.map((s, i) =>
    `<li>${escapeHtml(s.text)} ${citeLinks(s.sources)}</li>`).join('');

  box.innerHTML = `
    <h2>${escapeHtml(t.name)}</h2>
    <p class="official">“${escapeHtml(t.description)}” — official description, as PlayStation publishes it.</p>
    <div class="detail-meta">
      <span class="grade-badge grade-${t.grade}">${t.grade}</span>
      ${flags.join('')}
    </div>
    ${callouts}
    <p><strong>In short:</strong> ${escapeHtml(t.summary)}</p>
    ${stepper}
    <h3>How to get it</h3>
    <ol class="steps">${stepsHtml}</ol>
    <div class="earn-row">
      <label><input type="checkbox" id="earn-box" ${earned.has(t.id) ? 'checked' : ''}> Earned</label>
      <span>#${t.id} of 55 &middot; ${earned.has(t.id) ? 'done' : 'not yet earned'}</span>
    </div>
    <div class="detail-sources">
      <strong>Sources for this trophy:</strong>
      ${t.sources.map((id) => {
        const s = sources.get(id);
        return s && s.url ? `<a href="${s.url}" target="_blank" rel="noopener">[${id}] ${escapeHtml(s.name)}</a>` : `[${id}] ${escapeHtml(s ? s.name : '')}`;
      }).join(' &middot; ')}
      <br>Guide in our own words from the official description and the sources above; steps that cite no source are not given.
    </div>`;

  document.getElementById('earn-box').addEventListener('change', (e) => {
    if (e.target.checked) earned.add(t.id); else earned.delete(t.id);
    saveAll(); renderAll();
  });
  const minus = document.getElementById('count-minus');
  const plus = document.getElementById('count-plus');
  if (minus) minus.addEventListener('click', () => {
    counts[t.id] = Math.max(0, (counts[t.id] ?? 0) - 1); saveAll(); renderAll();
  });
  if (plus) plus.addEventListener('click', () => {
    counts[t.id] = Math.min(t.count.target, (counts[t.id] ?? 0) + 1); saveAll(); renderAll();
  });
  renderSideSources(t);
}

function renderSideSources(t) {
  const rail = document.getElementById('side-sources');
  const citedBy = new Map();
  for (const x of trophies) for (const id of x.sources) citedBy.set(id, (citedBy.get(id) ?? 0) + 1);
  rail.innerHTML = `<h2>Sources</h2><ol>` + doc.sources.map((s) => {
    const n = citedBy.get(s.id) ?? 0;
    return `<li><span class="src-name">[${s.id}] ${escapeHtml(s.name)}</span><br>` +
      `<span class="src-meta">Read ${s.read} &middot; cited by ${n} of 55 guides</span><br>` +
      `<span class="src-meta">${escapeHtml(s.what)}</span></li>`;
  }).join('') + `</ol>
  <p class="sources-note">Names, descriptions and grades come from the official list [6], which agrees with Exophase and PSNProfiles on all 55. Hidden flags: the 12 story trophies are confirmed hidden; the other 16 hidden trophies are our inference from the published 28-hidden total (27 bronze + 1 gold) — PSN hides them until earned, and no per-trophy hidden list is published.</p>`;
}

// ---------- roadmap ----------
function renderRoadmap() {
  const grid = document.getElementById('stage-grid');
  grid.replaceChildren();
  for (const stage of doc.roadmap) {
    const card = document.createElement('div');
    card.className = 'stage-card';
    const ids = stage.trophies;
    const got = ids.filter((id) => earned.has(id)).length;
    const pct = Math.round((got / ids.length) * 100);
    card.innerHTML = `<h3><span class="stage-tag">${stage.stage}</span>${escapeHtml(stage.title)}</h3>
      <p>${escapeHtml(stage.text)}</p>
      <div class="detail-sources">Sources: ${citeLinks(stage.sources ?? [1])}</div>
      <div class="stage-bar"><i style="width:${pct}%"></i></div>
      <div class="stage-count">${got} / ${ids.length} earned &middot; ${escapeHtml(stage.hours)} hours</div>
      <ul>${ids.map((id) => {
        const t = byId.get(id);
        const label = isStoryHidden(t) ? 'Hidden story trophy' : t.name;
        return `<li class="${earned.has(id) ? 'earned' : ''}">${escapeHtml(label)} <span class="grade-badge grade-${t.grade}">${t.grade}</span>${t.missable ? ' <span class="mini-flag">MISSABLE</span>' : ''}</li>`;
      }).join('')}</ul>`;
    grid.append(card);
  }
  const warn = document.createElement('div');
  warn.className = 'warn-box';
  warn.innerHTML = `<h3>Before you start — the three rules that cost people the platinum</h3>
    <ul>
      <li><strong>No mission replay, no New Game+.</strong> Keep a manual save at the start and end of every chapter (15 manual slots, 1 autosave) — a save is your only way back. [1][2]</li>
      <li><strong>One possibly missable trophy:</strong> Positive Mental Attitude — the Chapter 1 balcony meditation at Jason's house. Do it the morning after Down to Earth, or it is gone. [1][2][3]</li>
      <li><strong>Cheats disable trophies and saving.</strong> Leave them off for the whole run. [1][2]</li>
      <li><strong>Side lines stay open after the story</strong> — Kenton, Andy, Billy, Randy, Tyrone and Bret all return or remain available in free-roam, so only the meditation is time-critical. [1]</li>
    </ul>`;
  grid.append(warn);
}

// ---------- missables ----------
function renderMissables() {
  const body = document.getElementById('missables-body');
  const row = (t, sev, note) => `<tr>
    <td><strong>${isStoryHidden(t) ? 'Hidden story trophy' : escapeHtml(t.name)}</strong><br><span style="color:var(--muted)">${escapeHtml(t.description)}</span></td>
    <td>${escapeHtml(t.stage)} &middot; ${KIND_LABELS[t.kind]}</td>
    <td class="sev ${sev === 'red' ? 'sev-red' : 'sev-amber'}">${sev === 'red' ? 'MISSABLE / UNCONFIRMED' : 'WATCH'}</td>
    <td>${note}</td></tr>`;
  const missable = trophies.filter((t) => t.missable);
  const watch = trophies.filter((t) => t.watch);
  const unconfirmed = trophies.filter((t) => t.unconfirmed && !t.missable);
  const disagree = trophies.filter((t) => t.disagree);
  body.innerHTML = `
    <h3>Possibly missable — ${missable.length}</h3>
    <table class="flag-table"><thead><tr><th>Trophy</th><th>Stage</th><th>Risk</th><th>What to do</th></tr></thead><tbody>
    ${missable.map((t) => row(t, 'red', 'In Chapter 1, after Down to Earth, talk to Lucia in the kitchen in the morning, follow her to the balcony and choose Accept. Whether this meditation is required is still unconfirmed — do it anyway. [1][2][3][4]')).join('')}
    </tbody></table>
    <h3>Watch — character-locked or temporarily away (${watch.length})</h3>
    <table class="flag-table"><thead><tr><th>Trophy</th><th>Stage</th><th>Risk</th><th>What to do</th></tr></thead><tbody>
    ${watch.map((t) => row(t, 'amber', escapeHtml(t.watch) + '. The line stays open after the story. [1]')).join('')}
    </tbody></table>
    <h3>Unconfirmed — no verified method yet (${unconfirmed.length})</h3>
    <table class="flag-table"><thead><tr><th>Trophy</th><th>Stage</th><th>Risk</th><th>What to do</th></tr></thead><tbody>
    ${unconfirmed.map((t) => row(t, 'red', escapeHtml(t.unconfirmed))).join('')}
    </tbody></table>
    <h3>Sources disagree (${disagree.length})</h3>
    <table class="flag-table"><thead><tr><th>Trophy</th><th>Stage</th><th>Risk</th><th>What to do</th></tr></thead><tbody>
    ${disagree.map((t) => row(t, 'amber', escapeHtml(t.disagree))).join('')}
    </tbody></table>
    <p style="color:var(--muted)">Everything else on the list can be finished after the story in free-roam. The full list is 55 trophies with no online trophies and no difficulty trophies. [1][2]</p>`;
}

// ---------- sources ----------
function renderSources() {
  const body = document.getElementById('sources-body');
  const citedBy = new Map();
  for (const x of trophies) for (const id of x.sources) citedBy.set(id, (citedBy.get(id) ?? 0) + 1);
  const totalSteps = trophies.reduce((s, t) => s + t.steps.length, 0);
  body.innerHTML = `
    <div class="audit-grid">
      <div class="audit-cell"><div class="big">55/55</div><div class="lbl">trophies with a cited guide</div></div>
      <div class="audit-cell"><div class="big">${totalSteps}</div><div class="lbl">guide steps, each with its source numbers</div></div>
      <div class="audit-cell"><div class="big">8</div><div class="lbl">sources read 20 Nov 2026</div></div>
      <div class="audit-cell"><div class="big">1 + 6</div><div class="lbl">possibly missable + watch-list trophies</div></div>
    </div>
    <table class="source-table"><thead><tr><th>#</th><th>Source</th><th>What it was used for</th><th>Cited by</th></tr></thead><tbody>
    ${doc.sources.map((s) => `<tr><td><strong>[${s.id}]</strong></td>
      <td>${s.url ? `<a href="${s.url}" target="_blank" rel="noopener">${escapeHtml(s.name)}</a>` : escapeHtml(s.name)}<br><span style="color:var(--muted)">Read ${s.read}</span></td>
      <td>${escapeHtml(s.what)}</td><td>${citedBy.get(s.id) ?? 0} of 55 guides</td></tr>`).join('')}
    </tbody></table>
    <h3>How this guide is honest</h3>
    <ul>
      <li><strong>Official text is quoted, the rest is ours.</strong> Trophy names and descriptions are shown exactly as PlayStation publishes them; every guide step is written in our own words and carries its source numbers. Nothing is copied from another guide.</li>
      <li><strong>Disagreements are shown, not smoothed over.</strong> Positive Mental Attitude (18 spots vs 15 needed for 100%), Don't Touch My Deck (18 vs 15 card sets) and Strangers &amp; Freaks (which strangers count) each carry a “Sources disagree” note.</li>
      <li><strong>Unconfirmed stays unconfirmed.</strong> Bad Luck, I Guess has no verified method; Fair Game's exact animal is unconfirmed; the Chapter 1 meditation's role is unconfirmed. Those trophies say so instead of inventing a method.</li>
      <li><strong>Single-source steps are flagged.</strong> Six trophies rest on one published guide so far — In The Beginning…, Capital Offense, Personal Best, Bad Luck, I Guess, The Truth Is Out There and Ten Pin — and each says so.</li>
      <li><strong>Hidden flags are labelled by confidence.</strong> The 12 story trophies are confirmed hidden; the other 16 hidden trophies are inferred from the published 28-hidden total, because no per-trophy hidden list is published.</li>
    </ul>`;
}

// ---------- views / events ----------
function setView(view) {
  state.view = view;
  document.querySelectorAll('.tabs button').forEach((b) =>
    b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach((v) =>
    v.classList.toggle('active', v.id === 'view-' + view));
  if (view === 'roadmap') renderRoadmap();
  if (view === 'missables') renderMissables();
  if (view === 'sources') renderSources();
  history.replaceState(null, '', '#/' + view);
}

function renderAll() {
  renderHeader();
  renderKindChips();
  renderList();
  renderDetail();
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

document.querySelectorAll('.tabs button').forEach((b) =>
  b.addEventListener('click', () => setView(b.dataset.view)));
document.getElementById('search-box').addEventListener('input', (e) => {
  state.query = e.target.value; renderList();
});
document.getElementById('grade-filter').addEventListener('change', (e) => {
  state.grade = e.target.value; renderList();
});
document.getElementById('status-filter').addEventListener('change', (e) => {
  state.status = e.target.value; renderList();
});
document.getElementById('spoiler-toggle').addEventListener('change', (e) => {
  spoilersOn = e.target.checked; saveAll(); renderAll();
});
document.getElementById('export-btn').addEventListener('click', () => {
  const payload = {
    app: 'leonida-trophy-guide',
    game: 'Grand Theft Auto VI',
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b),
    counts,
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'leonida-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : (data.earned ?? []);
    const valid = ids.filter((id) => byId.has(id));
    if (valid.length === 0) throw new Error('no known trophy ids in file');
    earned = new Set(valid);
    if (data.counts && typeof data.counts === 'object') {
      counts = {};
      for (const [k, v] of Object.entries(data.counts)) {
        const t = byId.get(Number(k));
        if (t && t.count && Number.isFinite(v)) counts[t.id] = Math.max(0, Math.min(t.count.target, Math.round(v)));
      }
    }
    saveAll(); renderAll();
  } catch (err) {
    alert('Could not import that file: ' + err.message);
  }
  e.target.value = '';
});
document.getElementById('reset-btn').addEventListener('click', () => {
  if (!confirm('Clear all earned trophies and counters?')) return;
  earned = new Set(); counts = {}; revealed.clear();
  saveAll(); renderAll();
});

// Route from hash or ?view= / ?t= (used by screenshots).
const hash = location.hash.replace(/^#\/?/, '');
const startView = params.get('view') || (['roadmap', 'missables', 'sources'].includes(hash) ? hash : 'checklist');
const startTrophy = Number(params.get('t')) || null;
if (startTrophy && byId.has(startTrophy)) state.selected = startTrophy;
renderAll();
setView(startView);
