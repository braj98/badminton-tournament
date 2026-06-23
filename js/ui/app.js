// ===================== APP STATE =====================
// AppState is defined in js/models/appState.js and loaded before this script.

// ===================== HEADER + ACTION BAR =====================
function updateHeader() {
  var badge = document.getElementById('eventBadge');
  var tag = document.getElementById('sportTag');
  
  if (AppState.view === 'home' || AppState.ui.showingResults) {
    if (badge) badge.classList.add('hidden');
    if (tag) tag.classList.add('hidden');
  } else if (AppState.view === 'event') {
    if (badge) {
      badge.textContent = AppState.event;
      badge.classList.remove('hidden');
    }
    if (tag) tag.classList.add('hidden');
  } else {
    if (badge) {
      badge.textContent = AppState.event;
      badge.classList.remove('hidden');
    }
    if (tag) {
      tag.textContent = getSportLabel(AppState.sport);
      tag.classList.remove('hidden');
    }
  }
}


function renderActionBar() {
  var bar = document.getElementById('actionBar');
  if (!bar) return;
  var title = document.getElementById('stageTitle');
  var right = document.getElementById('actionBarRight');
  if (!title || !right) return;
  if (AppState.view === 'home' || AppState.view === 'event' || AppState.view === 'sport' || AppState.view === 'results' || AppState.ui.showingResults) {
    bar.style.display = 'none';
    return;
  }
  bar.style.display = '';
  var titles = { setup: 'Setup', groups: 'Group Allocation', fixtures: 'Group Stage Matches', knockout: 'Knockout Stage', champion: '🏆 Champion' };
  title.textContent = titles[AppState.view] || 'Tournament';
  right.innerHTML = '';
  if (AppState.view === 'knockout') {
    right.innerHTML = '<button id="actionBarShowResults" class="btn btn-secondary btn-sm hidden admin-only" onclick="showResults()" style="margin-left:4px;">📊 Results</button>'
      + '<button id="actionBarViewChampion" class="btn btn-secondary btn-sm hidden" data-public="1" onclick="viewChampion()" style="margin-left:4px;">🏆 Champion</button>';
  }
}
// ===================== SAVE (orchestrates storage) =====================
function saveState() {
  if (!AppState.category) return;
  AppState.tournament._lastSave = Date.now();
  AppState.tournament.updatedAt = AppState.tournament._lastSave;
  localSave(AppState.category, AppState.tournament);
  if (isAdmin() && AppState.tournament.phase !== 'setup') {
    scheduleCloudSave(AppState.category, AppState.tournament);
  }
}

// ===================== RENDER CYCLE =====================
// ===================== HOME PAGE =====================
function goHome() {
  AppState.view = 'home';
  renderAll();
}

function sportLabel(s) { return getSportLabel(s); }

function renderHomePage() {
  clearDisabled();
  updateHeader();
  var _ab = document.getElementById('actionBar'); if (_ab) _ab.style.display = 'none';
  var cb = document.getElementById('catBar'); if (cb) cb.style.display = 'none';
  const cats = getCategories();
  const events = [...new Set(cats.map(c => c.event || APP_CONFIG.defaultEvent))];
  const container = document.getElementById('homeContent');
  let html = '<h2 class="page-title">Events</h2><div class="home-events-list">';
  for (const ev of events) {
    const eventCats = cats.filter(c => (c.event || APP_CONFIG.defaultEvent) === ev);
    let active = 0;
    for (const c of eventCats) {
      const st = localLoad(c.id);
      if (st && st.phase !== 'setup') active++;
    }
    const total = eventCats.length;
    html += '<div class="event-card" onclick="goToEventPage(\'' + escapeHtml(ev) + '\')">'
      + '<div class="event-icon">🏆</div>'
      + '<div class="event-info">'
      + '<div class="name">' + escapeHtml(ev) + '</div>'
      + '<div class="count">' + active + ' active / ' + total + ' total categories</div>'
      + '</div>'
      + '<div class="arrow">›</div>'
      + '</div>';
  }
  html += '</div>';
  if (events.length === 0) {
    html = '<p class="text-muted text-center" style="padding:48px 0;">No events configured yet. Admins can add categories via Manage.</p>';
  }
  if (container) container.innerHTML = html;
  showScreen('screen-home', true);
  showScreen('screen-setup', false);
  showScreen('screen-groups', false);
  showScreen('screen-fixtures', false);
  showScreen('screen-knockout', false);
  showScreen('screen-champion', false);
  showScreen('screen-results', false);
  if (!isAdmin()) applyViewerMode();
}


// ===================== BREADCRUMB =====================
function renderBreadcrumb() {
  var bc = document.getElementById('breadcrumb');
  if (!bc) return;
  bc.classList.remove('hidden');
  var parts = ['<span class="bc-item' + (AppState.view === 'home' ? ' bc-current' : '') + '" onclick="goHome()">Home</span>'];
  if (AppState.view === 'event') {
    parts.push('<span class="bc-sep">›</span>');
    parts.push('<span class="bc-item bc-current">' + escapeHtml(AppState.event) + '</span>');
  } else if (AppState.view === 'sport') {
    parts.push('<span class="bc-sep">›</span>');
    parts.push('<span class="bc-item" onclick="goToEventPage()">' + escapeHtml(AppState.event) + '</span>');
    parts.push('<span class="bc-sep">›</span>');
    parts.push('<span class="bc-item bc-current">' + sportLabel(AppState.sport) + '</span>');
  } else {
    parts.push('<span class="bc-sep">›</span>');
    parts.push('<span class="bc-item" onclick="goToEventPage()">' + escapeHtml(AppState.event) + '</span>');
    parts.push('<span class="bc-sep">›</span>');
    parts.push('<span class="bc-item" onclick="goToSportPage()">' + sportLabel(AppState.sport) + '</span>');
    parts.push('<span class="bc-sep">›</span>');
    parts.push('<span class="bc-item bc-current">' + escapeHtml(getCategoryLabel()) + '</span>');
  }
  bc.innerHTML = parts.join('');
}

function updateGlobalNavigation() {
  const view = AppState.view;
  const showingResults = AppState.ui.showingResults;

  const catBar = document.getElementById('catBar');
  const tournamentTabs = document.getElementById('tournamentTabs');
  const actionBar = document.getElementById('actionBar');

  if (catBar) {
    const showCatBar = view !== 'home' && view !== 'event' && view !== 'sport';
    catBar.style.display = showCatBar ? '' : 'none';
  }

  if (tournamentTabs) {
    tournamentTabs.classList.toggle('hidden', view === 'home' || view === 'event' || view === 'sport' || view === 'results' || showingResults);
  }

  if (actionBar) {
    actionBar.style.display = (view === 'home' || view === 'event' || view === 'sport' || view === 'results' || showingResults) ? 'none' : '';
  }
}

function getCategoryLabel() {
  var cats = getCategories();
  for (var i = 0; i < cats.length; i++) { if (cats[i].id === AppState.category) return cats[i].label; }
  return AppState.category || 'Tournament';
}

// ===================== EVENT / SPORT PAGES =====================
function goToEventPage(ev) {
  if (ev) AppState.event = ev;
  AppState.view = 'event';
  renderAll();
}

function goToSportPage(ev, sport) {
  if (ev) AppState.event = ev;
  if (sport) AppState.sport = sport;
  AppState.view = 'sport';
  renderAll();
}

function renderEventPage() {
  clearDisabled();
  updateHeader();
  var container = document.getElementById('eventContent');
  var cats = getCategories().filter(function(c) { return (c.event || APP_CONFIG.defaultEvent) === AppState.event; });
  var sportCats = {};
  for (var i = 0; i < cats.length; i++) {
    var c = cats[i];
    if (!sportCats[c.sport]) sportCats[c.sport] = [];
    sportCats[c.sport].push(c);
  }
  var html = '<h2 class="page-title">' + escapeHtml(AppState.event) + '</h2><div class="home-sport-grid">';
  var sports = SPORT_IDS;
  for (var si = 0; si < sports.length; si++) {
    var s = sports[si];
    if (!sportCats[s]) continue;
    var active = 0;
    for (var j = 0; j < sportCats[s].length; j++) {
      var st = localLoad(sportCats[s][j].id);
      if (st && st.phase !== 'setup') active++;
    }
    html += '<div class="home-sport-card" onclick="goToSportPage(\'' + AppState.event + '\',\'' + s + '\')">'
      + '<div class="home-sport-icon">' + getSportIcon(s) + '</div>'
      + '<div class="home-sport-info"><div class="name">' + getSportLabel(s) + '</div>'
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
  var cb = document.getElementById('catBar'); if (cb) cb.style.display = 'none';
  if (!isAdmin()) applyViewerMode();
}

function renderSportPage() {
  clearDisabled();
  updateHeader();
  var container = document.getElementById('sportContent');
  var cats = getCategories().filter(function(c) { return (c.event || APP_CONFIG.defaultEvent) === AppState.event && c.sport === AppState.sport; });
  var html = '<h2 class="page-title">' + sportLabel(AppState.sport) + '</h2>';
  if (cats.length === 0) {
    html += '<p class="text-muted text-center" style="padding:48px 0;">No categories in this sport.</p>';
  } else {
    for (var i = 0; i < cats.length; i++) {
      var cat = cats[i];
      var s = localLoad(cat.id);
      var dot = 'setup';
      var statusText = '⚪ Not Started';
      if (s) {
        if (s.phase === 'champion') { dot = 'done'; statusText = '🏆 Complete'; }
        else if (s.phase !== 'setup') { dot = 'playing'; statusText = '🟢 In Progress'; }
      }
      var fmt = cat.format || 'singles';
      var isDoubles = fmt === 'doubles';
      var countLabel = isDoubles ? ' Teams' : ' Players';
      var participantCount = (s && s.participants) ? s.participants.length : 0;
      html += '<div class="category-card" onclick="switchCategory(\'' + cat.id + '\')">'
        + '<div class="cat-card-left"><span class="dot ' + dot + '"></span>'
        + '<span class="cat-card-name">' + escapeHtml(cat.label) + '</span></div>'
        + '<div class="cat-card-right"><span class="cat-card-count">' + participantCount + countLabel + '</span>'
        + '<span class="cat-card-format">' + fmt + '</span>'
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
  var cb = document.getElementById('catBar'); if (cb) cb.style.display = 'none';
  if (!isAdmin()) applyViewerMode();
}

// ===================== TOURNAMENT TABS =====================
function switchTab(tab) {
  if (tab === 'groups') { goToGroups(); return; }
  if (tab === 'fixtures') { goToFixtures(); return; }
  if (tab === 'knockout') { viewKnockout(); return; }
  if (tab === 'champion') { viewChampion(); return; }
}

function navigateToSport(ev, sport) {
  AppState.event = ev;
  AppState.sport = sport;
  goToSportPage(ev, sport);
}

// ===================== RENDER CYCLE =====================
function renderAll() {
  AppState.ui.showingResults = false;
  clearDisabled();

  renderBreadcrumb();

  if (AppState.view === 'home') {
    renderHomePage();
    return;
  }

  // Event / Sport pages
  if (AppState.view === 'event') { renderEventPage(); return; }
  if (AppState.view === 'sport') { renderSportPage(); return; }

  // Tournament view
  updateGlobalNavigation();

  // Tournament tabs
  var _tb = document.getElementById('tournamentTabs');
  if (_tb) {
    if (AppState.view === 'setup' || !AppState.tournament) {
      _tb.classList.add('hidden');
    } else {
      _tb.classList.remove('hidden');
      document.querySelectorAll('.tab-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.tab === AppState.view);
        var tab = b.dataset.tab;
        if (tab === 'groups' || tab === 'fixtures') {
          b.classList.toggle('hidden', !AppState.tournament || AppState.tournament.phase === 'setup');
        } else {
          b.classList.toggle('hidden', !AppState.tournament || (AppState.tournament.phase !== 'knockout' && AppState.tournament.phase !== 'champion'));
        }
      });
    }
  }

  if (!isAdmin() && AppState.tournament && AppState.tournament.phase === 'setup') {
    const cats = getCategories().filter(c => c.sport === AppState.sport && (c.event || APP_CONFIG.defaultEvent) === AppState.event);
    let foundCat = null;
    for (const cat of cats) {
      if (cat.id === AppState.category) continue;
      const s = localLoad(cat.id);
      if (s && s.phase !== 'setup') { foundCat = cat.id; break; }
    }
    if (foundCat) {
      AppState.category = foundCat;
      AppState.tournament = localLoad(foundCat) || defaultState();
      AppState.view = AppState.tournament.phase;
      renderAll();
      return;
    }
    renderCategoryBar();
    updateHeader();
    var _ab = document.getElementById('actionBar'); if (_ab) _ab.style.display = 'none';
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-results').classList.add('active');
    document.getElementById('resultsList').innerHTML = '<p class="text-muted text-center" style="padding:48px 0;">No active tournaments yet.</p>';
    if (!isAdmin()) applyViewerMode();
    return;
  }

  if (!AppState.tournament) { AppState.tournament = defaultState(); }
  renderCategoryBar();
  updateHeader();
  renderActionBar();
  // Sync knockout buttons in action bar
  if (AppState.view === 'knockout' && AppState.tournament.knockout) {
    var _finalMatch = AppState.tournament.knockout.find(function(mm) { return mm.id === 'final'; });
    var _finalDone = _finalMatch && _finalMatch.done;
    var _ab1 = document.getElementById('actionBarShowResults');
    var _ab2 = document.getElementById('actionBarViewChampion');
    if (_ab1) _ab1.classList.toggle('hidden', !(_finalDone && isAdmin()));
    if (_ab2) _ab2.classList.toggle('hidden', !_finalDone);
  }
  showScreen('screen-setup', AppState.view === 'setup');
  showScreen('screen-groups', AppState.view === 'groups');
  showScreen('screen-fixtures', AppState.view === 'fixtures');
  showScreen('screen-knockout', AppState.view === 'knockout');
  showScreen('screen-champion', AppState.view === 'champion');
  showScreen('screen-event', false);
  showScreen('screen-sport', false);
  showScreen('screen-home', false);
  showScreen('screen-results', false);
  if (AppState.view === 'setup') renderSetup();
  if (AppState.view === 'groups') renderGroups();
  if (AppState.view === 'fixtures') renderFixtures();
  if (AppState.view === 'knockout') renderKnockout();
  if (AppState.view === 'champion') renderChampion();
  if (!isAdmin()) applyViewerMode();
}

function clearDisabled() {
  if (isAdmin()) document.body.classList.remove('viewer-mode');
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
  AppState.view = 'knockout';
  renderAll();
}

function goToGroups() {
  AppState.view = 'groups';
  renderAll();
}

function goToFixtures() {
  AppState.view = 'fixtures';
  const result = computeStandings(AppState.tournament.groups, AppState.tournament.fixtures, AppState.tournament.participants);
  AppState.tournament.standings = result.standings;
  AppState.tournament.qualifiers = result.qualifiers;
  renderAll();
}

function goToKnockout() {
  if (!isAdmin()) return;
  AppState.tournament.phase = 'knockout';
  AppState.view = 'knockout';
  AppState.tournament.knockout = advanceWinner(AppState.tournament.knockout);
  saveState();
  renderAll();
}

function goToFixturesFromKnockout() {
  AppState.view = 'fixtures';
  const result = computeStandings(AppState.tournament.groups, AppState.tournament.fixtures, AppState.tournament.participants);
  AppState.tournament.standings = result.standings;
  AppState.tournament.qualifiers = result.qualifiers;
  renderAll();
}

function goBackFromChampion() {
  AppState.view = 'knockout';
  renderAll();
}

// ===================== RESULTS PAGE =====================
function showResultsPage() {
  AppState.ui.showingResults = true;
  renderBreadcrumb();
  updateGlobalNavigation();
  renderCategoryBar();
  updateHeader();
  var _sh = document.getElementById('screen-home'); if (_sh) _sh.classList.remove('active');
  document.getElementById('screen-results').classList.add('active');
  document.querySelectorAll('.screen:not(#screen-results)').forEach(s => { if (s.id !== 'screen-home') s.classList.remove('active'); });
  renderResults();
  applyViewerMode();
  document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
}

function closeResults() {
  AppState.ui.showingResults = false;
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
    html += '<h2 class="mt-20">Knockout Matches</h2><div class="results-cards">';
    for (const m of matches) {
      const status = m.done ? '<span class="match-status-done">✓ ' + escapeHtml(m.winner) + '</span>' : '<span class="match-status-pending">⏳ Upcoming</span>';
      html += '<div class="result-card' + (m.done ? ' result-done' : '') + '">'
        + '<div class="result-card-header">'
        + '<span class="result-cat">' + escapeHtml(m.cat.label) + '</span>'
        + '<span class="result-round">' + m.round + '</span>'
        + '</div>'
        + '<div class="result-match">' + escapeHtml(m.p1) + ' <span class="vs">vs</span> ' + escapeHtml(m.p2) + '</div>'
        + '<div class="result-score">' + escapeHtml(m.score) + '</div>'
        + '<div class="result-status">' + status + '</div>'
        + '</div>';
    }
    html += '</div>';
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
  if (_supabase && isAdmin()) {
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
    if (firstCat.sport) AppState.sport = firstCat.sport;
    if (firstCat.event) AppState.event = firstCat.event;
  }
  AppState.category = startCat || (firstCat ? firstCat.id : null);
  const saved = localLoad(AppState.category);
  if (saved && saved.phase !== 'setup') {
    AppState.tournament = saved;
  } else {
    AppState.tournament = defaultState();
  }
  AppState.view = AppState.tournament.phase;

  // Supabase-first for current category state
  if (_supabase) {
    const serverState = await fetchState(AppState.category).catch(() => null);
    if (serverState && serverState._lastSave > (AppState.tournament._lastSave || 0)) {
      AppState.tournament = serverState;
      localSave(AppState.category, AppState.tournament);
      AppState.view = AppState.tournament.phase;
    }
  }

  if (location.search.includes('admin')) {
    const link = document.getElementById('adminFooterLink');
    if (link) link.classList.remove('hidden');
  }

  showResultsPage();
}

document.addEventListener('DOMContentLoaded', function() { init(); });
