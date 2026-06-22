// ===================== APP STATE =====================
let currentCategory = null;
let currentSport = 'badminton';
let currentEvent = DEFAULT_EVENT;
let state = null;
let currentView = null;
let _showingResults = false;

// ===================== HEADER + ACTION BAR =====================
function updateHeader() {
  var badge = document.getElementById('eventBadge');
  if (badge) badge.textContent = currentEvent;
  var tag = document.getElementById('sportTag');
  if (tag) {
    var labels = { badminton: 'Badminton', tableTennis: 'Table Tennis', chess: 'Chess' };
    tag.textContent = labels[currentSport] || currentSport;
  }
}

function renderActionBar() {
  var bar = document.getElementById('actionBar');
  if (!bar) return;
  var title = document.getElementById('stageTitle');
  var right = document.getElementById('actionBarRight');
  if (!title || !right) return;
  if (currentView === 'home' || currentView === 'event' || currentView === 'sport' || currentView === 'results' || _showingResults) {
    bar.style.display = 'none';
    return;
  }
  bar.style.display = '';
  var titles = { setup: 'Setup', groups: 'Group Allocation', fixtures: 'Group Stage Matches', knockout: 'Knockout Stage', champion: '🏆 Champion' };
  title.textContent = titles[currentView] || 'Tournament';
  right.innerHTML = '';
  if (currentView === 'knockout') {
    right.innerHTML = '<button id="actionBarShowResults" class="btn btn-secondary btn-sm hidden admin-only" onclick="showResults()" style="margin-left:4px;">📊 Results</button>'
      + '<button id="actionBarViewChampion" class="btn btn-secondary btn-sm hidden" data-public="1" onclick="viewChampion()" style="margin-left:4px;">📊 Results</button>';
  }
}
// ===================== SAVE (orchestrates storage) =====================
function saveState() {
  if (!currentCategory) return;
  state._lastSave = Date.now();
  localSave(currentCategory, state);
  if (_isAdmin && state.phase !== 'setup') {
    scheduleCloudSave(currentCategory, state);
  }
}

// ===================== RENDER CYCLE =====================
// ===================== HOME PAGE =====================
function goHome() {
  currentView = 'home';
  renderAll();
}

const SPORT_ICONS = { badminton: '🏸', tableTennis: '🏓', chess: '♟' };
const SPORT_LABELS = { badminton: 'Badminton', tableTennis: 'Table Tennis', chess: 'Chess' };
function sportLabel(s) { return SPORT_LABELS[s] || s; }

function renderHomePage() {
  clearDisabled();
  updateHeader();
  var _ab = document.getElementById('actionBar'); if (_ab) _ab.style.display = 'none';
  var cb = document.getElementById('catBar'); if (cb) cb.style.display = 'none';
  const cats = getCategories();
  const events = [...new Set(cats.map(c => c.event || DEFAULT_EVENT))];
  const container = document.getElementById('homeContent');
  let html = '';
  for (const ev of events) {
    const sportCats = {};
    for (const c of cats.filter(c => (c.event || DEFAULT_EVENT) === ev)) {
      if (!sportCats[c.sport]) sportCats[c.sport] = [];
      sportCats[c.sport].push(c);
    }
    html += '<div class="home-event"><h2>' + escapeHtml(ev) + '</h2><div class="home-sport-grid">';
    for (const s of ['badminton', 'tableTennis', 'chess']) {
      if (!sportCats[s]) continue;
      const active = sportCats[s].filter(c => { const st = localLoad(c.id); return st && st.phase !== 'setup'; }).length;
      const total = sportCats[s].length;
      html += '<div class="home-sport-card" onclick="navigateToSport(\'' + ev + '\',\'' + s + '\')">'
        + '<div class="home-sport-icon">' + (SPORT_ICONS[s] || '🎯') + '</div>'
        + '<div class="home-sport-info"><div class="name">' + (s.charAt(0).toUpperCase() + s.slice(1)) + '</div>'
        + '<div class="count">' + active + ' active / ' + total + ' total</div></div>'
        + '<div class="arrow">›</div></div>';
    }
    html += '</div></div>';
  }
  if (!html) html = '<p class="text-muted text-center" style="padding:48px 0;">No categories yet. Admins can add them via Manage.</p>';
  if (container) container.innerHTML = html;
  showScreen('screen-home', true);
  showScreen('screen-setup', false);
  showScreen('screen-groups', false);
  showScreen('screen-fixtures', false);
  showScreen('screen-knockout', false);
  showScreen('screen-champion', false);
  showScreen('screen-results', false);
  if (!_isAdmin) applyViewerMode();
}

// ===================== BREADCRUMB =====================
function renderBreadcrumb() {
  var bc = document.getElementById('breadcrumb');
  if (!bc) return;
  if (currentView === 'home' || _showingResults) { bc.classList.add('hidden'); return; }
  bc.classList.remove('hidden');
  var parts = ['<span class="bc-item" onclick="goHome()">Home</span>'];
  if (currentView === 'event') {
    parts.push('<span class="bc-sep">›</span>');
    parts.push('<span class="bc-item bc-current">' + escapeHtml(currentEvent) + '</span>');
  } else if (currentView === 'sport') {
    parts.push('<span class="bc-sep">›</span>');
    parts.push('<span class="bc-item" onclick="goToEventPage()">' + escapeHtml(currentEvent) + '</span>');
    parts.push('<span class="bc-sep">›</span>');
    parts.push('<span class="bc-item bc-current">' + sportLabel(currentSport) + '</span>');
  } else {
    parts.push('<span class="bc-sep">›</span>');
    parts.push('<span class="bc-item" onclick="goToEventPage()">' + escapeHtml(currentEvent) + '</span>');
    parts.push('<span class="bc-sep">›</span>');
    parts.push('<span class="bc-item" onclick="goToSportPage()">' + sportLabel(currentSport) + '</span>');
    parts.push('<span class="bc-sep">›</span>');
    parts.push('<span class="bc-item bc-current">' + escapeHtml(getCategoryLabel()) + '</span>');
  }
  bc.innerHTML = parts.join('');
}

function getCategoryLabel() {
  var cats = getCategories();
  for (var i = 0; i < cats.length; i++) { if (cats[i].id === currentCategory) return cats[i].label; }
  return currentCategory || 'Tournament';
}

// ===================== EVENT / SPORT PAGES =====================
function goToEventPage(ev) {
  if (ev) currentEvent = ev;
  currentView = 'event';
  renderAll();
}

function goToSportPage(ev, sport) {
  if (ev) currentEvent = ev;
  if (sport) currentSport = sport;
  currentView = 'sport';
  renderAll();
}

function renderEventPage() {
  clearDisabled();
  updateHeader();
  var container = document.getElementById('eventContent');
  var cats = getCategories().filter(function(c) { return (c.event || DEFAULT_EVENT) === currentEvent; });
  var sportCats = {};
  for (var i = 0; i < cats.length; i++) {
    var c = cats[i];
    if (!sportCats[c.sport]) sportCats[c.sport] = [];
    sportCats[c.sport].push(c);
  }
  var html = '<h2 class="page-title">' + escapeHtml(currentEvent) + '</h2><div class="home-sport-grid">';
  var sports = ['badminton', 'tableTennis', 'chess'];
  for (var si = 0; si < sports.length; si++) {
    var s = sports[si];
    if (!sportCats[s]) continue;
    var active = 0;
    for (var j = 0; j < sportCats[s].length; j++) {
      var st = localLoad(sportCats[s][j].id);
      if (st && st.phase !== 'setup') active++;
    }
    html += '<div class="home-sport-card" onclick="goToSportPage(\'' + currentEvent + '\',\'' + s + '\')">'
      + '<div class="home-sport-icon">' + (SPORT_ICONS[s] || '🎯') + '</div>'
      + '<div class="home-sport-info"><div class="name">' + sportLabel(s) + '</div>'
      + '<div class="count">' + active + ' active / ' + sportCats[s].length + ' total</div></div>'
      + '<div class="arrow">›</div></div>';
  }
  html += '</div>';
  if (!html) html = '<p class="text-muted text-center" style="padding:48px 0;">No sports in this event.</p>';
  if (container) container.innerHTML = html;
  showScreen('screen-event', true);
  showScreen('screen-sport', false);
  showScreen('screen-home', false);
  showScreen('screen-setup', false);
  showScreen('screen-groups', false);
  showScreen('screen-fixtures', false);
  showScreen('screen-knockout', false);
  showScreen('screen-champion', false);
  showScreen('screen-results', false);
  var _tb = document.getElementById('tournamentTabs'); if (_tb) _tb.classList.add('hidden');
  if (!_isAdmin) applyViewerMode();
}

function renderSportPage() {
  clearDisabled();
  updateHeader();
  var container = document.getElementById('sportContent');
  var cats = getCategories().filter(function(c) { return (c.event || DEFAULT_EVENT) === currentEvent && c.sport === currentSport; });
  var html = '<h2 class="page-title">' + sportLabel(currentSport) + '</h2>';
  if (cats.length === 0) {
    html += '<p class="text-muted text-center" style="padding:48px 0;">No categories in this sport.</p>';
  } else {
    for (var i = 0; i < cats.length; i++) {
      var cat = cats[i];
      var s = localLoad(cat.id);
      var dot = 'setup';
      var statusText = 'Setup';
      if (s) {
        if (s.phase === 'champion') { dot = 'done'; statusText = 'Complete'; }
        else if (s.phase !== 'setup') { dot = 'playing'; statusText = 'In Progress'; }
      }
      var fmt = cat.format || 'singles';
      html += '<div class="category-card" onclick="switchCategory(\'' + cat.id + '\')">'
        + '<div class="cat-card-left"><span class="dot ' + dot + '"></span>'
        + '<span class="cat-card-name">' + escapeHtml(cat.label) + '</span></div>'
        + '<div class="cat-card-right"><span class="cat-card-format">' + fmt + '</span>'
        + '<span class="cat-card-status ' + dot + '">' + statusText + '</span></div></div>';
    }
  }
  if (container) container.innerHTML = html;
  showScreen('screen-sport', true);
  showScreen('screen-event', false);
  showScreen('screen-home', false);
  showScreen('screen-setup', false);
  showScreen('screen-groups', false);
  showScreen('screen-fixtures', false);
  showScreen('screen-knockout', false);
  showScreen('screen-champion', false);
  showScreen('screen-results', false);
  var _tb = document.getElementById('tournamentTabs'); if (_tb) _tb.classList.add('hidden');
  if (!_isAdmin) applyViewerMode();
}

// ===================== TOURNAMENT TABS =====================
function switchTab(tab) {
  if (tab === 'groups') { goToGroups(); return; }
  if (tab === 'fixtures') { goToFixtures(); return; }
  if (tab === 'knockout') { viewKnockout(); return; }
  if (tab === 'champion') { viewChampion(); return; }
}

function navigateToSport(ev, sport) {
  currentEvent = ev;
  currentSport = sport;
  goToSportPage(ev, sport);
}

// ===================== RENDER CYCLE =====================
function renderAll() {
  _showingResults = false;
  clearDisabled();

  renderBreadcrumb();

  if (currentView === 'home') {
    renderHomePage();
    return;
  }

  // Event / Sport pages
  if (currentView === 'event') { renderEventPage(); return; }
  if (currentView === 'sport') { renderSportPage(); return; }

  // Tournament view
  var _cb = document.getElementById('catBar'); if (_cb) _cb.style.display = '';

  // Tournament tabs
  var _tb = document.getElementById('tournamentTabs');
  if (_tb) {
    if (currentView === 'setup' || !state) {
      _tb.classList.add('hidden');
    } else {
      _tb.classList.remove('hidden');
      document.querySelectorAll('.tab-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.tab === currentView);
        var tab = b.dataset.tab;
        if (tab === 'groups' || tab === 'fixtures') {
          b.classList.toggle('hidden', !state || state.phase === 'setup');
        } else {
          b.classList.toggle('hidden', !state || (state.phase !== 'knockout' && state.phase !== 'champion'));
        }
      });
    }
  }

  if (!_isAdmin && state && state.phase === 'setup') {
    const cats = getCategories().filter(c => c.sport === currentSport && (c.event || DEFAULT_EVENT) === currentEvent);
    let foundCat = null;
    for (const cat of cats) {
      if (cat.id === currentCategory) continue;
      const s = localLoad(cat.id);
      if (s && s.phase !== 'setup') { foundCat = cat.id; break; }
    }
    if (foundCat) {
      currentCategory = foundCat;
      state = localLoad(foundCat) || defaultState();
      currentView = state.phase;
      renderAll();
      return;
    }
    renderCategoryBar();
    updateHeader();
    var _ab = document.getElementById('actionBar'); if (_ab) _ab.style.display = 'none';
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-results').classList.add('active');
    document.getElementById('resultsList').innerHTML = '<p class="text-muted text-center" style="padding:48px 0;">No active tournaments yet.</p>';
    if (!_isAdmin) applyViewerMode();
    return;
  }

  if (!state) { state = defaultState(); }
  renderCategoryBar();
  updateHeader();
  renderActionBar();
  // Sync knockout buttons in action bar
  if (currentView === 'knockout' && state.knockout) {
    var _finalMatch = state.knockout.find(function(mm) { return mm.id === 'final'; });
    var _finalDone = _finalMatch && _finalMatch.done;
    var _ab1 = document.getElementById('actionBarShowResults');
    var _ab2 = document.getElementById('actionBarViewChampion');
    if (_ab1) _ab1.classList.toggle('hidden', !(_finalDone && _isAdmin));
    if (_ab2) _ab2.classList.toggle('hidden', !_finalDone);
  }
  showScreen('screen-setup', currentView === 'setup');
  showScreen('screen-groups', currentView === 'groups');
  showScreen('screen-fixtures', currentView === 'fixtures');
  showScreen('screen-knockout', currentView === 'knockout');
  showScreen('screen-champion', currentView === 'champion');
  showScreen('screen-event', false);
  showScreen('screen-sport', false);
  showScreen('screen-home', false);
  showScreen('screen-results', false);
  if (currentView === 'setup') renderSetup();
  if (currentView === 'groups') renderGroups();
  if (currentView === 'fixtures') renderFixtures();
  if (currentView === 'knockout') renderKnockout();
  if (currentView === 'champion') renderChampion();
  if (!_isAdmin) applyViewerMode();
}

function clearDisabled() {
  if (_isAdmin) document.body.classList.remove('viewer-mode');
  const app = document.getElementById('app');
  app.querySelectorAll('input, button, select').forEach(el => {
    if (el.type === 'file') { el.disabled = false; return; }
    el.style.display = '';
    el.disabled = false;
  });
  app.querySelectorAll('.photo-zone').forEach(el => {
    el.style.pointerEvents = '';
    el.style.cursor = '';
  });
  app.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
}

function applyViewerMode() {
  document.body.classList.add('viewer-mode');
  document.querySelectorAll('.photo-zone').forEach(el => {
    el.style.pointerEvents = 'none';
    el.style.cursor = 'default';
  });
}

function showScreen(id, show) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('active', show);
}

// ===================== NAVIGATION =====================
function viewKnockout() {
  currentView = 'knockout';
  renderAll();
}

function goToGroups() {
  currentView = 'groups';
  renderAll();
}

function goToFixtures() {
  currentView = 'fixtures';
  const result = computeStandings(state.groups, state.fixtures, state.participants);
  state.standings = result.standings;
  state.qualifiers = result.qualifiers;
  renderAll();
}

function goToKnockout() {
  if (!_isAdmin) return;
  state.phase = 'knockout';
  currentView = 'knockout';
  state.knockout = advanceWinner(state.knockout);
  saveState();
  renderAll();
}

function goToFixturesFromKnockout() {
  currentView = 'fixtures';
  const result = computeStandings(state.groups, state.fixtures, state.participants);
  state.standings = result.standings;
  state.qualifiers = result.qualifiers;
  renderAll();
}

function goBackFromChampion() {
  currentView = 'knockout';
  renderAll();
}

// ===================== RESULTS PAGE =====================
function showResultsPage() {
  _showingResults = true;
  renderBreadcrumb();
  var _tb = document.getElementById('tournamentTabs'); if (_tb) _tb.classList.add('hidden');
  var _cb = document.getElementById('catBar'); if (_cb) _cb.style.display = '';
  renderCategoryBar();
  updateHeader();
  var ab = document.getElementById('actionBar'); if (ab) ab.style.display = 'none';
  var _sh = document.getElementById('screen-home'); if (_sh) _sh.classList.remove('active');
  document.getElementById('screen-results').classList.add('active');
  document.querySelectorAll('.screen:not(#screen-results)').forEach(s => { if (s.id !== 'screen-home') s.classList.remove('active'); });
  renderResults();
  applyViewerMode();
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
}

function closeResults() {
  _showingResults = false;
  document.getElementById('screen-results').classList.remove('active');
  renderAll();
}

function renderResults() {
  clearDisabled();
  const cats = getCategories();
  const matches = [];
  const champions = [];
  for (const cat of cats) {
    const s = localLoad(cat.id);
    if (!s || (s.phase !== 'knockout' && s.phase !== 'champion') || !s.knockout) continue;
    const roundLabel = { 'QF': 'Quarter Final', 'SF': 'Semi Final', 'Final': 'Final' };
    for (const m of s.knockout) {
    const _participants = s.participants;
    const resolve = function(id) { return _participants ? participantName(_participants, id) || id || 'TBD' : id || 'TBD'; };
    const p1 = resolve(m.p1);
    const p2 = resolve(m.p2);
    const winnerName = resolve(m.winner);
      let score = '';
      if (m.round === 'Final' && m.sets) {
        const parts = [];
        for (const set of m.sets) {
          if (set.s1 !== null && set.s2 !== null) parts.push(set.s1 + '-' + set.s2);
        }
        score = parts.join(' / ');
      } else if (m.s1 !== null && m.s2 !== null) {
        score = m.s1 + '-' + m.s2;
      }
      matches.push({
        cat: cat,
        round: roundLabel[m.round] || m.round,
        p1: p1, p2: p2,
        score: score || '—',
        done: m.done,
        winner: winnerName,
        updatedAt: m.updatedAt || 0
      });
    }
    const _final = s.knockout.find(m => m.id === 'final');
    if (_final && _final.done && _final.winner) {
      const chId = _final.winner;
      const ruId = _final.winner === _final.p1 ? _final.p2 : _final.p1;
      const chName = s.participants ? participantName(s.participants, chId) || chId : chId;
      const ruName = s.participants ? participantName(s.participants, ruId) || ruId || '—' : ruId || '—';
      champions.push({ cat: cat, champion: chName, runnerUp: ruName, championPhoto: s.championPhoto, runnerUpPhoto: s.runnerUpPhoto, completedAt: s.completedAt || _final.updatedAt });
    }
  }
  matches.sort((a, b) => b.updatedAt - a.updatedAt);
  const container = document.getElementById('resultsList');
  let html = '';
  if (champions.length > 0) {
    html += '<h2 style="margin-bottom:8px;">🏆 Champions</h2>';
    for (const c of champions) {
      html += '<div class="champion-card" style="margin-bottom:12px;padding:16px;">'
        + '<div class="crown">' + escapeHtml(c.cat.label) + '</div>'
        + '<div class="name" style="font-size:1.2rem;">' + escapeHtml(c.champion) + '</div>'
        + (c.championPhoto ? '<img src="' + c.championPhoto + '" style="width:80px;height:80px;object-fit:cover;border-radius:var(--radius);margin:6px auto;display:block;">' : '')
        + '<div class="runner-up" style="border:none;padding-top:8px;font-size:.8rem;">Runner-up: <strong>' + escapeHtml(c.runnerUp) + '</strong></div>'
        + (c.runnerUpPhoto ? '<img src="' + c.runnerUpPhoto + '" style="width:60px;height:60px;object-fit:cover;border-radius:var(--radius);margin:4px auto;display:block;">' : '')
        + '</div>';
    }
  }
  if (matches.length === 0) {
    html += '<p class="text-muted text-center" style="padding:32px 0;">No knockout matches yet.</p>';
  } else {
    html += '<h2 class="mt-20">Knockout Matches</h2><table class="standings-table"><thead><tr><th>Category</th><th>Round</th><th>Match</th><th>Score</th><th>Status</th></tr></thead><tbody>';
    for (const m of matches) {
      const status = m.done ? '<span style="color:var(--success);font-weight:600;">✓ ' + escapeHtml(m.winner) + '</span>' : '<span style="color:var(--muted);">⏳ Upcoming</span>';
      html += '<tr><td style="font-weight:600;">' + escapeHtml(m.cat.label) + '</td>'
        + '<td>' + m.round + '</td>'
        + '<td>' + escapeHtml(m.p1) + ' <span class="vs">vs</span> ' + escapeHtml(m.p2) + '</td>'
        + '<td style="font-weight:600;">' + escapeHtml(m.score) + '</td>'
        + '<td>' + status + '</td></tr>';
    }
    html += '</tbody></table>';
  }
  container.innerHTML = html;
}

// ===================== INIT =====================
async function init() {
  initSupabase();

  // Categories from Supabase first, fallback to localStorage
  if (_supabase) {
    await checkSession();
    const cloudCats = await fetchCategoriesFromCloud().catch(() => null);
    if (cloudCats && cloudCats.length) {
      saveCategories(cloudCats);
    }
  }

  migrateCategorySports();

  // Sync migrated categories back to cloud so login() gets the correct format
  if (_supabase) {
    const cats = getCategories();
    if (cats.length) upsertCategories(cats);
  }

  try {
    const old = localStorage.getItem('btm_state');
    if (old && !localStorage.getItem('btm_state_senior_boys')) {
      localStorage.setItem('btm_state_senior_boys', old);
    }
    localStorage.removeItem('btm_state');
  } catch(e) {}

  // Migrate old-format state to participant IDs
  for (const cat of getCategories()) {
    const s = localLoad(cat.id);
    if (s && s.players && !s.participants) {
      const nameToId = {};
      s.participants = s.players.map((n, i) => {
        const p = createParticipant(n);
        nameToId[n] = p.id;
        return p;
      });
      if (s.groups) {
        for (const key of Object.keys(s.groups)) {
          s.groups[key] = s.groups[key].map(name => nameToId[name] || name);
        }
      }
      if (s.fixtures) {
        for (const f of s.fixtures) {
          if (f.p1) f.p1 = nameToId[f.p1] || f.p1;
          if (f.p2) f.p2 = nameToId[f.p2] || f.p2;
        }
      }
      if (s.knockout) {
        for (const m of s.knockout) {
          if (m.p1) m.p1 = nameToId[m.p1] || m.p1;
          if (m.p2) m.p2 = nameToId[m.p2] || m.p2;
          if (m.winner) m.winner = nameToId[m.winner] || m.winner;
        }
      }
      if (s.standings) {
        for (const key of Object.keys(s.standings)) {
          for (const r of s.standings[key]) {
            r.id = nameToId[r.name] || r.name;
          }
        }
      }
      if (s.qualifiers) {
        for (const q of s.qualifiers) {
          q.id = nameToId[q.id] || q.id;
        }
      }
      if (s.champion) s.champion = nameToId[s.champion] || s.champion;
      if (s.runnerUp) s.runnerUp = nameToId[s.runnerUp] || s.runnerUp;
      localSave(cat.id, s);
    }
  }

  // Prep: sync category states from Supabase, then pick starting category
  if (_supabase) {
    for (const cat of getCategories()) {
      const s = await fetchState(cat.id).catch(() => null);
      if (s && s._lastSave > ((localLoad(cat.id) || {})._lastSave || 0)) {
        localSave(cat.id, s);
      }
    }
    subscribeToChanges();
    updateBanners();
  }

  let startCat = null;
  for (const cat of getCategories()) {
    const s = localLoad(cat.id);
    if (s && s.phase !== 'setup') { startCat = cat.id; break; }
  }
  const firstCat = getCategories()[0];
  if (firstCat) {
    if (firstCat.sport) currentSport = firstCat.sport;
    if (firstCat.event) currentEvent = firstCat.event;
  }
  currentCategory = startCat || (firstCat ? firstCat.id : null);
  const saved = localLoad(currentCategory);
  if (saved && saved.phase !== 'setup') {
    state = saved;
  } else {
    state = defaultState();
  }
  currentView = state.phase;

  // Supabase-first for current category state
  if (_supabase) {
    const serverState = await fetchState(currentCategory).catch(() => null);
    if (serverState && serverState._lastSave > (state._lastSave || 0)) {
      state = serverState;
      localSave(currentCategory, state);
      currentView = state.phase;
    }
  }

  if (location.search.includes('admin')) {
    const link = document.getElementById('adminFooterLink');
    if (link) link.classList.remove('hidden');
  }

  showResultsPage();
}

document.addEventListener('DOMContentLoaded', function() { init(); });
