// Leonida Platinum: the tracker itself. Plain script, no modules, no network
// beyond the one local fetch of data/trophies.json. Progress lives in
// localStorage under one key, so it survives reloads and works offline.
// Demo mode (?demo=1) seeds 11 earned trophies and five part-way counters,
// only for previews and screenshots; real progress always starts empty.
(function () {
  'use strict';

  var STORAGE_KEY = 'leonida-platinum-v3';
  var DEMO_EARNED = [2, 3, 4, 8, 16, 20, 21, 28, 33, 46, 55];
  var DEMO_COUNTS = { 15: 137, 28: 6, 31: 41, 35: 63, 52: 120000 };

  var STAGES = [
    { id: 'S1', title: 'S1 — Story first', advice: 'Play Chapters 1 to 4 and the final mission in order. Do the Chapter 1 balcony meditation (Positive Mental Attitude) before Chapter 1 ends — it is the only trophy that can be missed.' },
    { id: 'S2', title: 'S2 — Partner crime', advice: 'Two trophies need your partner beside you: lose a 4-star wanted level together, then rob three shops back-to-back without the heat clearing. Set both up on purpose.' },
    { id: 'S3', title: 'S3 — Activities sampler', advice: 'Try every activity type once, then work the longer activity counts: stunts, shooting range golds, drone races, race wins, fishing, arcade and bowling.' },
    { id: 'S4', title: 'S4 — Side strands', advice: 'Finish the five named stranger strands plus three more, and sweep the 18 meditation spots. This stage also closes the Strangers & Freaks silver.' },
    { id: 'S5', title: 'S5 — Collectibles and exploration', advice: 'Sweep districts for card sets, WAiNK spots and challenges, and let the 52-area exploration trophy finish itself along the way. Discover a new vehicle whenever you travel.' },
    { id: 'S6', title: 'S6 — Crime mastery', advice: 'Combat Focus multi-kills, vaults, the armored truck, gang operations and the stealth jobs. Plan each robbery with its exit in mind before going in.' },
    { id: 'S7', title: 'S7 — Money and cleanup', advice: 'Launder marked bills, spend across shops, buy the garages, register vehicles, and mop up the mystery trophies. The platinum and the 100% gold land here.' },
  ];

  var SOURCE_BLURBS = {
    'PowerPyx': 'The long-running trophy guide site; cited for story order, mission steps and count totals.',
    'OutputLag': 'A GTA-focused guide outlet; cited for mission walkthroughs and activity steps.',
    'KeenGamer': 'A games guide site; cited for side strands, meditation spots and activity tips.',
    'eGamers': 'A trophy guide collection; cited for mission order and challenge steps.',
    'GTA-Zone': 'A GTA community guide hub; cited for map sweeps, collectibles and exploration counts.',
    'daftar resmi kit': 'The official PlayStation 5 trophy list as published before this guide was written (names, descriptions, grades).',
    'HowToVideoGame': 'A how-to guide site; cited for single-method steps such as the airport departure and the armored truck.',
    'GTAScoop': 'A GTA news and guide outlet; cited for hunts, heists and the stranger encounters.',
  };

  var params = new URLSearchParams(window.location.search);
  var demoMode = params.get('demo') === '1';
  var trophies = [];
  var state = loadState();

  function loadState() {
    var fresh = { earned: {}, counts: {}, spoiler: true, selected: null };
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.earned && typeof parsed.earned === 'object') fresh.earned = parsed.earned;
          if (parsed.counts && typeof parsed.counts === 'object') fresh.counts = parsed.counts;
          if (typeof parsed.spoiler === 'boolean') fresh.spoiler = parsed.spoiler;
        }
      }
    } catch (err) { /* a corrupt save starts fresh rather than breaking the page */ }
    if (demoMode) {
      DEMO_EARNED.forEach(function (id) { fresh.earned[id] = true; });
      Object.keys(DEMO_COUNTS).forEach(function (id) { fresh.counts[id] = DEMO_COUNTS[id]; });
    }
    return fresh;
  }

  function saveState() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        earned: state.earned, counts: state.counts, spoiler: state.spoiler,
      }));
    } catch (err) { /* private mode: the page still works, it just does not persist */ }
  }

  function trophyById(id) {
    for (var i = 0; i < trophies.length; i++) if (trophies[i].id === id) return trophies[i];
    return null;
  }

  function isEarned(trophy) { return !!state.earned[trophy.id]; }
  function countOf(trophy) {
    var value = state.counts[trophy.id];
    return typeof value === 'number' && value > 0 ? value : 0;
  }
  function isSpoilerHidden(trophy) {
    return state.spoiler && trophy.kind === 'story' && !isEarned(trophy);
  }
  function displayName(trophy) {
    return isSpoilerHidden(trophy) ? 'Story trophy — hidden until earned' : trophy.name;
  }
  function displayDescription(trophy) {
    return isSpoilerHidden(trophy) ? 'Hidden by the spoiler setting. Earn it in the game, then tick it off here to reveal it.' : trophy.description;
  }

  function gradeLabel(grade) {
    return grade.charAt(0).toUpperCase() + grade.slice(1);
  }

  function updateProgress() {
    var earned = trophies.filter(isEarned);
    var total = trophies.length || 55;
    document.getElementById('progressText').textContent = earned.length + ' / ' + total + ' earned';
    document.getElementById('progressPct').textContent = Math.round((earned.length / total) * 100) + '%';
    document.getElementById('progressFill').style.width = ((earned.length / total) * 100) + '%';
    var counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
    earned.forEach(function (t) { if (counts[t.grade] !== undefined) counts[t.grade]++; });
    document.getElementById('gradeCounts').textContent =
      counts.platinum + ' platinum · ' + counts.gold + ' gold · ' + counts.silver + ' silver · ' + counts.bronze + ' bronze';
  }

  function matchesFilters(trophy) {
    var query = (document.getElementById('searchInput').value || '').trim().toLowerCase();
    var kind = document.getElementById('kindFilter').value;
    var grade = document.getElementById('gradeFilter').value;
    var status = document.getElementById('statusFilter').value;
    if (kind !== 'all' && trophy.kind !== kind) return false;
    if (grade !== 'all' && trophy.grade !== grade) return false;
    if (status === 'earned' && !isEarned(trophy)) return false;
    if (status === 'unearned' && isEarned(trophy)) return false;
    if (status === 'missable' && trophy.missable === 'none') return false;
    if (query) {
      var haystack = (trophy.name + ' ' + trophy.description + ' ' + trophy.guide + ' ' + trophy.kind).toLowerCase();
      if (haystack.indexOf(query) === -1) return false;
    }
    return true;
  }

  function chip(text, className) {
    var span = document.createElement('span');
    span.className = 'chip ' + className;
    span.textContent = text;
    return span;
  }

  function renderList() {
    var list = document.getElementById('trophyList');
    list.innerHTML = '';
    var shown = trophies.filter(matchesFilters);
    document.getElementById('listSummary').textContent =
      'Showing ' + shown.length + ' of ' + trophies.length + ' trophies' +
      (demoMode ? ' — demo progress (11 earned) is seeded for this preview.' : '.');
    if (!shown.length) {
      var empty = document.createElement('li');
      empty.className = 'empty-note';
      empty.textContent = 'No trophy matches these filters. Clear the search or widen the filters.';
      list.appendChild(empty);
      return;
    }
    shown.forEach(function (trophy) {
      var row = document.createElement('li');
      row.className = 'trophy-row' + (isEarned(trophy) ? ' is-earned' : '') + (state.selected === trophy.id ? ' is-selected' : '');
      row.dataset.id = trophy.id;

      var box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = isEarned(trophy);
      box.setAttribute('aria-label', 'Mark ' + displayName(trophy) + ' as earned');
      box.addEventListener('click', function (event) {
        event.stopPropagation();
        state.earned[trophy.id] = box.checked;
        if (!box.checked) delete state.earned[trophy.id];
        saveState();
        updateProgress();
        renderList();
        renderDetail();
      });
      row.appendChild(box);

      var middle = document.createElement('div');
      var name = document.createElement('div');
      name.className = 'trophy-name';
      name.textContent = displayName(trophy);
      middle.appendChild(name);
      var desc = document.createElement('div');
      desc.className = 'trophy-desc';
      desc.textContent = displayDescription(trophy);
      middle.appendChild(desc);
      var meta = document.createElement('div');
      meta.className = 'trophy-meta';
      meta.appendChild(chip(gradeLabel(trophy.grade), 'grade-' + trophy.grade));
      meta.appendChild(chip(trophy.kind, ''));
      meta.appendChild(chip('Stage ' + trophy.stage, ''));
      if (trophy.hidden) meta.appendChild(chip('Hidden', 'flag-hidden'));
      if (trophy.missable === 'possible') meta.appendChild(chip('Possibly missable', 'flag-missable'));
      if (trophy.missable === 'watch') meta.appendChild(chip('Watch', 'flag-watch'));
      if (trophy.status !== 'confirmed') meta.appendChild(chip(trophy.status, 'flag-status'));
      middle.appendChild(meta);
      row.appendChild(middle);

      var right = document.createElement('div');
      right.className = 'trophy-count';
      if (trophy.target) right.textContent = countOf(trophy) + ' / ' + trophy.target.toLocaleString('en-US');
      row.appendChild(right);

      row.addEventListener('click', function () {
        state.selected = trophy.id;
        renderList();
        renderDetail();
      });
      list.appendChild(row);
    });
  }

  function renderDetail() {
    var pane = document.getElementById('detailPane');
    pane.innerHTML = '';
    var trophy = state.selected ? trophyById(state.selected) : null;
    if (!trophy) {
      var hint = document.createElement('p');
      hint.textContent = 'Select a trophy on the left to read its guide: what to do, where, when it can be missed, and the source of each step.';
      pane.appendChild(hint);
      var note = document.createElement('p');
      note.className = 'trophy-desc';
      note.textContent = 'Tip: the checklist saves itself in this browser as you tick trophies off. Export a backup from the toolbar before clearing browser data.';
      pane.appendChild(note);
      return;
    }
    var title = document.createElement('h3');
    title.textContent = displayName(trophy);
    pane.appendChild(title);
    var official = document.createElement('p');
    official.className = 'official';
    official.textContent = gradeLabel(trophy.grade) + ' · ' + trophy.kind + ' · Stage ' + trophy.stage + ' — “' + displayDescription(trophy) + '”';
    pane.appendChild(official);

    if (trophy.target) {
      var stepperTitle = document.createElement('h4');
      stepperTitle.textContent = 'Counter';
      pane.appendChild(stepperTitle);
      var stepper = document.createElement('div');
      stepper.className = 'stepper';
      var minus = document.createElement('button');
      minus.type = 'button';
      minus.textContent = '−';
      minus.setAttribute('aria-label', 'Decrease counter');
      minus.addEventListener('click', function () {
        state.counts[trophy.id] = Math.max(0, countOf(trophy) - 1);
        saveState();
        renderDetail();
        renderList();
      });
      var output = document.createElement('output');
      output.textContent = countOf(trophy).toLocaleString('en-US') + ' / ' + trophy.target.toLocaleString('en-US');
      var plus = document.createElement('button');
      plus.type = 'button';
      plus.textContent = '+';
      plus.setAttribute('aria-label', 'Increase counter');
      plus.addEventListener('click', function () {
        state.counts[trophy.id] = Math.min(trophy.target, countOf(trophy) + 1);
        if (countOf(trophy) >= trophy.target) state.earned[trophy.id] = true;
        saveState();
        updateProgress();
        renderDetail();
        renderList();
      });
      var plusTen = document.createElement('button');
      plusTen.type = 'button';
      plusTen.textContent = '+10';
      plusTen.setAttribute('aria-label', 'Add ten to counter');
      plusTen.addEventListener('click', function () {
        state.counts[trophy.id] = Math.min(trophy.target, countOf(trophy) + 10);
        if (countOf(trophy) >= trophy.target) state.earned[trophy.id] = true;
        saveState();
        updateProgress();
        renderDetail();
        renderList();
      });
      stepper.appendChild(minus);
      stepper.appendChild(output);
      stepper.appendChild(plus);
      stepper.appendChild(plusTen);
      pane.appendChild(stepper);
      var stepperNote = document.createElement('p');
      stepperNote.className = 'trophy-desc';
      stepperNote.textContent = 'Reaching the target ticks the trophy earned automatically. The count is saved with your progress.';
      pane.appendChild(stepperNote);
    }

    if (trophy.missable === 'possible' || trophy.missable === 'watch') {
      var warnTitle = document.createElement('h4');
      warnTitle.textContent = trophy.missable === 'possible' ? 'Possibly missable — read first' : 'Watch — setup matters';
      pane.appendChild(warnTitle);
      var warn = document.createElement('p');
      warn.textContent = trophy.missable === 'possible'
        ? 'This trophy can be missed if you pass its window. Do it as soon as the guide says, before moving the story on.'
        : 'This trophy is not missable, but it fails if the setup or order is wrong. Follow the steps in order.';
      pane.appendChild(warn);
    }

    var guideTitle = document.createElement('h4');
    guideTitle.textContent = 'Guide';
    pane.appendChild(guideTitle);
    var guide = document.createElement('p');
    guide.textContent = isSpoilerHidden(trophy) ? 'Hidden by the spoiler setting until earned.' : trophy.guide;
    pane.appendChild(guide);

    if (!isSpoilerHidden(trophy)) {
      var stepsTitle = document.createElement('h4');
      stepsTitle.textContent = 'Steps — each with its source';
      pane.appendChild(stepsTitle);
      var steps = document.createElement('ol');
      trophy.steps.forEach(function (step) {
        var item = document.createElement('li');
        item.appendChild(document.createTextNode(step.text + ' '));
        var source = document.createElement('span');
        source.className = 'step-source';
        source.textContent = 'Source: ' + step.source;
        item.appendChild(source);
        steps.appendChild(item);
      });
      pane.appendChild(steps);
      var sourcesLine = document.createElement('p');
      sourcesLine.className = 'trophy-desc';
      sourcesLine.textContent = 'Sources for this trophy: ' + trophy.sources.join(', ') + '. Verification: ' + trophy.status + '.';
      pane.appendChild(sourcesLine);
    }

    var earnedBtn = document.createElement('button');
    earnedBtn.type = 'button';
    earnedBtn.textContent = isEarned(trophy) ? 'Mark as unearned' : 'Mark as earned';
    earnedBtn.addEventListener('click', function () {
      if (isEarned(trophy)) delete state.earned[trophy.id];
      else state.earned[trophy.id] = true;
      saveState();
      updateProgress();
      renderList();
      renderDetail();
    });
    pane.appendChild(earnedBtn);
  }

  function renderRoadmap() {
    var holder = document.getElementById('roadmapStages');
    holder.innerHTML = '';
    STAGES.forEach(function (stage) {
      var card = document.createElement('article');
      card.className = 'stage';
      var title = document.createElement('h3');
      title.textContent = stage.title;
      card.appendChild(title);
      var advice = document.createElement('p');
      advice.textContent = stage.advice;
      card.appendChild(advice);
      var chips = document.createElement('div');
      chips.className = 'stage-trophies';
      trophies.filter(function (t) { return t.stage === stage.id; }).forEach(function (t) {
        var label = isEarned(t) ? '✓ ' + t.name : displayName(t);
        var c = chip(label, 'grade-' + t.grade);
        if (isEarned(t)) c.style.textDecoration = 'line-through';
        chips.appendChild(c);
      });
      card.appendChild(chips);
      holder.appendChild(card);
    });
  }

  function renderMissables() {
    var holder = document.getElementById('missableList');
    holder.innerHTML = '';
    var flagged = trophies.filter(function (t) { return t.missable !== 'none'; });
    flagged.sort(function (a, b) {
      if (a.missable === 'possible' && b.missable !== 'possible') return -1;
      if (b.missable === 'possible' && a.missable !== 'possible') return 1;
      return a.id - b.id;
    });
    flagged.forEach(function (trophy) {
      var card = document.createElement('article');
      card.className = 'missable-card' + (trophy.missable === 'watch' ? ' watch-only' : '');
      var title = document.createElement('h3');
      title.textContent = (trophy.missable === 'possible' ? 'Possibly missable: ' : 'Watch: ') + trophy.name;
      card.appendChild(title);
      var desc = document.createElement('p');
      desc.textContent = trophy.description + ' — ' + trophy.guide;
      card.appendChild(desc);
      var meta = document.createElement('p');
      meta.className = 'trophy-desc';
      meta.textContent = 'Stage ' + trophy.stage + ' · ' + gradeLabel(trophy.grade) + ' · Sources: ' + trophy.sources.join(', ') + '.';
      card.appendChild(meta);
      holder.appendChild(card);
    });
  }

  function renderSources() {
    var holder = document.getElementById('sourceList');
    holder.innerHTML = '';
    Object.keys(SOURCE_BLURBS).forEach(function (name) {
      var citing = trophies.filter(function (t) { return t.sources.indexOf(name) !== -1; });
      var row = document.createElement('div');
      row.className = 'source-row';
      var head = document.createElement('strong');
      head.textContent = name + ' (' + citing.length + ')';
      row.appendChild(head);
      var body = document.createElement('div');
      body.textContent = SOURCE_BLURBS[name] + ' Trophies citing it: ' + citing.map(function (t) { return t.name; }).join('; ') + '.';
      row.appendChild(body);
      holder.appendChild(row);
    });
    var counts = { confirmed: 0, unconfirmed: 0, disagree: 0, 'single-source': 0 };
    trophies.forEach(function (t) { if (counts[t.status] !== undefined) counts[t.status]++; });
    document.getElementById('verifySummary').textContent =
      'Of the 55 trophies, ' + counts.confirmed + ' are confirmed, ' + counts.unconfirmed + ' unconfirmed, ' +
      counts.disagree + ' disagree across sources, and ' + counts['single-source'] + ' rest on a single source. ' +
      'One trophy is possibly missable and six more are flagged watch.';
  }

  function setView(name) {
    document.querySelectorAll('.view-btn').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.view === name);
    });
    document.querySelectorAll('.view').forEach(function (section) {
      section.classList.toggle('is-active', section.id === 'view-' + name);
    });
    if (name === 'roadmap') renderRoadmap();
    if (name === 'missables') renderMissables();
    if (name === 'sources') renderSources();
  }

  function exportProgress() {
    var payload = {
      app: 'leonida-platinum',
      version: 3,
      exportedAt: new Date().toISOString(),
      earned: Object.keys(state.earned).map(Number).sort(function (a, b) { return a - b; }),
      counts: state.counts,
      spoiler: state.spoiler,
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'gta6-trophy-progress.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  function importProgress(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(String(reader.result));
        var earned = {};
        var list = Array.isArray(data.earned) ? data.earned : [];
        list.forEach(function (id) { if (trophyById(Number(id))) earned[Number(id)] = true; });
        var counts = {};
        if (data.counts && typeof data.counts === 'object') {
          Object.keys(data.counts).forEach(function (id) {
            var trophy = trophyById(Number(id));
            var value = Number(data.counts[id]);
            if (trophy && trophy.target && Number.isFinite(value)) counts[Number(id)] = Math.max(0, Math.min(trophy.target, value));
          });
        }
        state.earned = earned;
        state.counts = counts;
        if (typeof data.spoiler === 'boolean') {
          state.spoiler = data.spoiler;
          document.getElementById('spoilerToggle').checked = state.spoiler;
        }
        saveState();
        updateProgress();
        renderList();
        renderDetail();
        window.alert('Progress imported: ' + Object.keys(earned).length + ' trophies earned.');
      } catch (err) {
        window.alert('That file could not be imported. It is not a progress export from this guide.');
      }
    };
    reader.readAsText(file);
  }

  function bindControls() {
    document.querySelectorAll('.view-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { setView(btn.dataset.view); });
    });
    ['searchInput', 'kindFilter', 'gradeFilter', 'statusFilter'].forEach(function (id) {
      document.getElementById(id).addEventListener('input', renderList);
      document.getElementById(id).addEventListener('change', renderList);
    });
    document.getElementById('spoilerToggle').checked = state.spoiler;
    document.getElementById('spoilerToggle').addEventListener('change', function (event) {
      state.spoiler = event.target.checked;
      saveState();
      renderList();
      renderDetail();
    });
    document.getElementById('exportBtn').addEventListener('click', exportProgress);
    document.getElementById('importBtn').addEventListener('click', function () {
      document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', function (event) {
      if (event.target.files && event.target.files[0]) importProgress(event.target.files[0]);
      event.target.value = '';
    });
    document.getElementById('resetBtn').addEventListener('click', function () {
      if (!window.confirm('Clear all saved progress and counters?')) return;
      state.earned = {};
      state.counts = {};
      saveState();
      updateProgress();
      renderList();
      renderDetail();
    });
  }

  function boot() {
    var selectedParam = Number(params.get('t'));
    if (selectedParam && !Number.isNaN(selectedParam)) state.selected = selectedParam;
    bindControls();
    fetch('data/trophies.json')
      .then(function (response) { return response.json(); })
      .then(function (data) {
        trophies = data.trophies || data;
        if (!state.selected && trophies.length) state.selected = trophies[0].id;
        updateProgress();
        renderList();
        renderDetail();
        renderRoadmap();
        renderMissables();
        renderSources();
        var viewParam = params.get('view');
        if (viewParam === 'roadmap' || viewParam === 'missables' || viewParam === 'sources') setView(viewParam);
        else setView('checklist');
      })
      .catch(function () {
        document.getElementById('trophyList').innerHTML = '<li class="empty-note">The trophy data could not be loaded. Check that data/trophies.json sits beside this page.</li>';
      });
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
