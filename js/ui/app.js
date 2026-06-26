// ===================== APP STATE =====================
// AppState is defined in js/models/appState.js and loaded before this script.

// ===================== HEADER + ACTION BAR =====================
function updateHeader() {
  var sub = document.getElementById('eventSubtitle');
  if (sub) {
    sub.textContent = getCurrentEventName() || '';
  }
}


function renderActionBar() {
  var bar = document.getElementById('actionBar');
  if (!bar) return;
  var title = document.getElementById('stageTitle');
  var right = document.getElementById('actionBarRight');
  if (!title || !right) return;
  var titles = { setup: 'Setup', groups: 'Group Allocation', fixtures: 'Group Stage Matches', knockout: 'Knockout Stage', champion: '🏆 Champion' };
  title.textContent = titles[AppState.view] || 'Tournament';
  right.innerHTML = '';
  if (AppState.view === 'knockout') {
    right.innerHTML += '<button id="actionBarShowResults" class="btn btn-secondary btn-sm hidden admin-only" onclick="showResults()" style="margin-left:4px;">📊 Results</button>'
      + '<button id="actionBarViewChampion" class="btn btn-secondary btn-sm hidden" data-public="1" onclick="viewChampion()" style="margin-left:4px;">🏆 Champion</button>';
  }
}
// ===================== ADMIN DROPDOWN =====================
function toggleAdminMenu() {
  var m = document.getElementById('adminDropdownMenu');
  if (m) m.classList.toggle('show-menu');
}

function closeAdminMenu() {
  var m = document.getElementById('adminDropdownMenu');
  if (m) m.classList.remove('show-menu');
}

// Close dropdown on outside click (delegated)
document.addEventListener('click', function(e) {
  var menu = document.getElementById('adminDropdownMenu');
  var btn = document.getElementById('adminMenuBtn');
  if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
    menu.classList.remove('show-menu');
  }
});

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
// ===================== TOAST NOTIFICATION =====================
function showToast(html, duration) {
  duration = duration || 4000;
  var t = document.createElement('div');
  t.className = 'toast-notification';
  t.innerHTML = html;
  document.body.appendChild(t);
  setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, duration);
}

// ===================== HOME PAGE =====================
function goHome() {
  navigateTo('home');
}

function sportLabel(s) { return getSportLabel(s); }

function renderHomePage() {
  clearDisabled();
  updateHeader();
  updateNavigationVisibility();
  const events = getEvents();
  const container = document.getElementById('homeContent');
  let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">'
    + '<h2 class="page-title" style="margin:0;">Events</h2>'
    + (isAdmin() ? '<button class="btn btn-sm btn-secondary" onclick="createEventFromHome()">➕ New Event</button>' : '')
    + '</div>'
    + '<div class="home-events-list">';
  for (const ev of events) {
    const cats = getCategories().filter(c => c.eventId === ev.id);
    let active = 0;
    for (const c of cats) {
      const st = localLoad(c.id);
      if (st && st.phase !== 'setup') active++;
    }
    const total = cats.length;
    html += '<div class="event-card" onclick="goToEventPage(\'' + escapeHtml(ev.name) + '\')">'
      + '<div class="event-icon">🏆</div>'
      + '<div class="event-info">'
      + '<div class="name">' + escapeHtml(ev.name) + '</div>'
      + '<div class="count">' + active + ' active / ' + total + ' competitions</div>'
      + '</div>'
      + '<div class="arrow">›</div>'
      + '</div>';
  }
  html += '</div>';
  if (events.length === 0) {
    html = '<p class="text-muted text-center" style="padding:48px 0;">No events yet.'
      + (isAdmin() ? ' <button class="btn btn-sm btn-secondary" onclick="createEventFromHome()">Create your first event</button>' : '')
      + '</p>';
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
  if (AppState.view === 'home') {
    bc.innerHTML = '<span class="bc-item bc-current" onclick="goHome()">Home</span>';
    return;
  }
  var parts = ['<span class="bc-item" onclick="goHome()">Home</span>'];
  if (AppState.view === 'report') {
    parts.push('<span class="bc-sep">›</span>');
    parts.push('<span class="bc-item bc-current">' + escapeHtml(getCurrentEventName()) + ' Report</span>');
  } else if (AppState.view === 'event') {
    parts.push('<span class="bc-sep">›</span>');
    parts.push('<span class="bc-item bc-current" onclick="goToEventPage()">' + escapeHtml(getCurrentEventName()) + '</span>');
  } else if (AppState.view === 'sport') {
    parts.push('<span class="bc-sep">›</span>');
    parts.push('<span class="bc-item" onclick="goToEventPage()">' + escapeHtml(getCurrentEventName()) + '</span>');
    parts.push('<span class="bc-sep">›</span>');
    parts.push('<span class="bc-item bc-current" onclick="goToSportPage()">' + sportLabel(AppState.sport) + '</span>');
  } else {
    parts.push('<span class="bc-sep">›</span>');
    parts.push('<span class="bc-item" onclick="goToEventPage()">' + escapeHtml(getCurrentEventName()) + '</span>');
    parts.push('<span class="bc-sep">›</span>');
    parts.push('<span class="bc-item" onclick="goToSportPage()">' + sportLabel(AppState.sport) + '</span>');
    parts.push('<span class="bc-sep">›</span>');
    parts.push('<span class="bc-item bc-current" onclick="renderAll()">' + escapeHtml(getCategoryLabel()) + '</span>');
  }
  bc.innerHTML = parts.join('');
}

function updateNavigationVisibility() {
  var catBar = document.getElementById('catBar');
  var tournamentTabs = document.getElementById('tournamentTabs');
  var actionBar = document.getElementById('actionBar');
  var view = AppState.view;
  var showingResults = AppState.ui.showingResults;
  var isOverview = view === 'home' || view === 'event' || view === 'sport' || view === 'results' || view === 'report' || showingResults;
  var isTournamentView = !isOverview;

  if (catBar) catBar.style.display = isTournamentView ? '' : 'none';
  if (actionBar) actionBar.style.display = isTournamentView ? '' : 'none';
  if (tournamentTabs) tournamentTabs.classList.toggle('hidden', isOverview || view === 'setup');
}

function getCategoryLabel() {
  var tmpl = getTemplates().find(function(t) { return t.id === AppState.category; });
  return tmpl ? tmpl.name : (AppState.category || 'Tournament');
}

// ===================== EVENT / SPORT PAGES =====================
function goToEventPage(ev) {
  if (ev) setCurrentEvent(ev);
  navigateTo('event');
}

function goToSportPage(ev, sport) {
  if (ev) setCurrentEvent(ev);
  if (sport) AppState.sport = sport;
  navigateTo('sport');
}

function renderEventPage() {
  clearDisabled();
  updateHeader();
  var container = document.getElementById('eventContent');
  var cats = getCategories().filter(function(c) { return c.eventId === AppState.eventId; });
  var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">'
    + '<h2 class="page-title" style="margin:0;">' + escapeHtml(getCurrentEventName()) + '</h2>'
    + '<div style="display:flex;gap:6px;">';

  var existingReport = loadReport(AppState.eventId);
  if (existingReport) {
    if (existingReport.status === 'published') {
      html += '<button class="btn btn-sm" onclick="goToReport()">📄 View Report</button>';
    } else {
      if (isAdmin()) html += '<button class="btn btn-sm btn-secondary" onclick="goToReport()">📄 Preview Draft</button>';
    }
  } else {
    if (isAdmin()) html += '<button class="btn btn-sm btn-secondary" onclick="generateDraftReport()">📄 Generate Report</button>';
  }
  html += '</div></div>';
  if (cats.length === 0) {
    html += '<p class="text-muted text-center" style="padding:48px 0;">No competitions in this event.</p>';
  } else {
    html += '<div class="home-sport-grid">';
    for (var i = 0; i < cats.length; i++) {
      var c = cats[i];
      var st = localLoad(c.id);
      var phase = st ? st.phase : 'setup';
      var statusIcon = phase === 'setup' ? '⚪' : phase === 'champion' ? '🏆' : '🟢';
      var statusLabel = phase === 'setup' ? 'Not Started' : phase === 'champion' ? 'Complete' : 'In Progress';
      var count = st && st.participants ? st.participants.length : 0;
      var countLabel = c.type === 'doubles' ? 'teams' : 'players';
      html += '<div class="home-sport-card" onclick="switchCategory(\'' + c.id + '\')">'
        + '<div class="home-sport-icon">' + getSportIcon(c.sport) + '</div>'
        + '<div class="home-sport-info">'
        + '<div class="name">' + escapeHtml(c.label) + '</div>'
        + '<div class="count">' + statusIcon + ' ' + statusLabel + (count > 0 ? ' &middot; ' + count + ' ' + countLabel : '') + '</div>'
        + '</div>'
        + '<div class="arrow">›</div></div>';
    }
    html += '</div>';
  }
  // Template management (admin only)
  if (isAdmin()) {
    const ev = getEvents().find(function(e) { return e.id === AppState.eventId; });
    const templates = getTemplates();
    const evTemplates = templates.filter(function(t) { return ev && ev.templateIds.indexOf(t.id) !== -1; });
    html += '<div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border);">'
      + '<h3 style="font-size:.9rem;margin-bottom:8px;">Competitions in this Event</h3>'
      + '<div id="eventTemplateList" style="margin-bottom:8px;">';
    for (var ti = 0; ti < evTemplates.length; ti++) {
      var t = evTemplates[ti];
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border);font-size:.85rem;">'
        + '<span>' + escapeHtml(t.name) + ' <span style="font-size:.7rem;color:var(--text-muted);">(' + getSportLabel(t.sport) + ', ' + t.type + ')</span></span>'
        + '<button class="btn btn-outline btn-sm" style="font-size:.7rem;padding:2px 8px;border-color:var(--danger);color:var(--danger);" onclick="toggleConfirmRemoveFromEvent(\'' + t.id + '\')">✕</button>'
        + '</div>'
+ '<div id="confirmRemoveFromEvent_' + t.id + '" class="hidden" style="margin-top:4px;margin-bottom:6px;background:var(--danger-light);border:1px solid var(--danger);border-radius:6px;padding:6px 8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap;">'
+ '<span style="font-size:.7rem;color:var(--danger);font-weight:500;">Type REMOVE:</span>'
+ '<input type="text" id="confirmRemoveFromEventInput_' + t.id + '" style="flex:1;min-width:80px;padding:3px 6px;border:2px solid var(--danger);border-radius:6px;font-size:.75rem;" placeholder="REMOVE">'
+ '<button class="btn" style="padding:3px 8px;font-size:.7rem;background:var(--danger);" onclick="executeRemoveFromEvent(\'' + t.id + '\')">Go</button></div>';
    }
    html += '</div>'
      + '<div class="form-row" style="margin-top:8px;">'
      + '<div class="form-field"><label class="form-label">Label</label><input type="text" id="newTemplateLabel" class="form-input" placeholder="e.g. Junior" style="font-size:.8rem;"></div>'
      + '<div class="form-field"><label class="form-label">Sport</label><select id="newTemplateSport" class="form-input" style="font-size:.8rem;"><option value="badminton">Badminton</option><option value="tableTennis">Table Tennis</option><option value="chess">Chess</option></select></div>'
      + '<div class="form-field"><label class="form-label">Format</label><select id="newTemplateType" class="form-input" style="font-size:.8rem;"><option value="singles">Singles</option><option value="doubles">Doubles</option></select></div>'
      + '<div style="display:flex;align-items:flex-end;"><button class="btn btn-sm" onclick="addTemplateToCurrentEvent()" style="font-size:.8rem;">Add</button></div>'
      + '</div>'
      + '<span id="eventTemplateError" style="font-size:.75rem;color:var(--danger);display:block;margin-top:4px;"></span>'
      + '</div>';
  }
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
  updateNavigationVisibility();
  if (!isAdmin()) applyViewerMode();
}

function renderSportPage() {
  clearDisabled();
  updateHeader();
  var container = document.getElementById('sportContent');
  var ev = getEvents().find(function(e) { return e.id === AppState.eventId; });
  var templates = getTemplates();
  var evTemplates = ev ? templates.filter(function(t) { return ev.templateIds.indexOf(t.id) !== -1 && t.sport === AppState.sport; }) : [];
  var html = '<h2 class="page-title">' + sportLabel(AppState.sport) + '</h2>';
  if (evTemplates.length === 0) {
    html += '<p class="text-muted text-center" style="padding:48px 0;">No competitions in this sport.</p>';
  } else {
    for (var i = 0; i < evTemplates.length; i++) {
      var t = evTemplates[i];
      var s = localLoad(t.id);
      var dot = 'setup';
      var statusText = '⚪ Not Started';
      if (s) {
        if (s.phase === 'champion') { dot = 'done'; statusText = '🏆 Complete'; }
        else if (s.phase !== 'setup') { dot = 'playing'; statusText = '🟢 In Progress'; }
      }
      var fmt = t.type || 'singles';
      var isDoubles = fmt === 'doubles';
      var countLabel = isDoubles ? ' Teams' : ' Players';
      var participantCount = (s && s.participants) ? s.participants.length : 0;
      html += '<div class="category-card" onclick="switchCategory(\'' + t.id + '\')">'
        + '<div class="cat-card-left"><span class="dot ' + dot + '"></span>'
        + '<span class="cat-card-name">' + escapeHtml(t.name) + '</span></div>'
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
  updateNavigationVisibility();
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
  setCurrentEvent(ev);
  AppState.sport = sport;
  goToSportPage(ev, sport);
}

// ===================== RENDER CYCLE =====================
function renderAll() {
  AppState.ui.showingResults = false;
  clearDisabled();
  updateBanners();

  renderBreadcrumb();
  renderSportBar();
  renderEventBar();

  if (AppState.view === 'home') {
    renderHomePage();
    return;
  }

  // Event / Sport / Report pages
  if (AppState.view === 'event') { renderEventPage(); return; }
  if (AppState.view === 'sport') { renderSportPage(); return; }
  if (AppState.view === 'report') { renderReport(); return; }

  // Tournament view
  updateNavigationVisibility();

  // Tournament tabs
  // Tab button visibility (overall tabs visibility handled by updateNavigationVisibility)
  var _tb = document.getElementById('tournamentTabs');
  if (_tb && AppState.tournament) {
  document.querySelectorAll('.tab-btn').forEach(function(b) {
    // Skip results sub-tab buttons (match view nav bar)
    if (b.id && b.id.startsWith('subNav')) return;
    b.classList.toggle('active', b.dataset.tab === AppState.view);
      var tab = b.dataset.tab;
      if (tab === 'groups' || tab === 'fixtures') {
        b.classList.toggle('hidden', AppState.tournament.phase === 'setup');
      } else {
        b.classList.toggle('hidden', AppState.tournament.phase !== 'knockout' && AppState.tournament.phase !== 'champion');
      }
    });
  }

  if (!isAdmin() && AppState.tournament && AppState.tournament.phase === 'setup') {
    const ev = getEvents().find(function(e) { return e.id === AppState.eventId; });
    const templates = getTemplates();
    let foundTmpl = null;
    if (ev) {
      for (const tmplId of ev.templateIds) {
        const tmpl = templates.find(function(t) { return t.id === tmplId && t.sport === AppState.sport; });
        if (!tmpl) continue;
        if (tmpl.id === AppState.category) continue;
        const s = localLoad(tmpl.id);
        if (s && s.phase !== 'setup') { foundTmpl = tmpl.id; break; }
      }
    }
    if (foundTmpl) {
      AppState.category = foundTmpl;
      AppState.tournament = localLoad(foundTmpl) || defaultState();
      navigateTo(AppState.tournament.phase);
      return;
    }
    renderCategoryBar();
    updateHeader();
    var _ab = document.getElementById('actionBar'); if (_ab) _ab.style.display = 'none';
    AppState.view = 'home';
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-results').classList.add('active');
    document.getElementById('resultsList').innerHTML = '<p class="text-muted text-center" style="padding:48px 0;">No active tournaments yet.</p>';
    document.getElementById('subNavFeed').classList.remove('active');
    document.getElementById('subNavLive').classList.add('active');
    document.getElementById('subNavResults').classList.remove('active');
    document.getElementById('subNavUpcoming').classList.remove('active');
    document.getElementById('subNavChampions').classList.remove('active');
    if (!isAdmin()) applyViewerMode();
    return;
  }

  if (!AppState.tournament) { AppState.tournament = defaultState(); }
  syncTournamentState(AppState.tournament);
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
  renderTicker();
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
function navigateTo(view) {
  AppState.view = view;
  renderAll();
}

function viewKnockout() {
  navigateTo('knockout');
}

function goToGroups() {
  navigateTo('groups');
}

function goToFixtures() {
  const result = computeStandings(AppState.tournament.groups, AppState.tournament.fixtures, AppState.tournament.participants);
  AppState.tournament.standings = result.standings;
  AppState.tournament.qualifiers = result.qualifiers;
  navigateTo('fixtures');
}

function goToKnockout() {
  if (!isAdmin()) return;
  AppState.tournament.phase = 'knockout';
  AppState.tournament.knockout = advanceWinner(AppState.tournament.knockout);
  saveState();
  navigateTo('knockout');
}

function goToFixturesFromKnockout() {
  const result = computeStandings(AppState.tournament.groups, AppState.tournament.fixtures, AppState.tournament.participants);
  AppState.tournament.standings = result.standings;
  AppState.tournament.qualifiers = result.qualifiers;
  navigateTo('fixtures');
}

function goBackFromChampion() {
  navigateTo('knockout');
}

// ===================== MATCH VIEWS (Live / Upcoming / Results Archive / Champions) =====================
var _currentMatchView = 'live';

function showResultsPage() {
  AppState.ui.showingResults = true;
  _currentMatchView = 'live';
  renderBreadcrumb();
  updateNavigationVisibility();
  renderCategoryBar();
  updateHeader();
  updateBanners();
  var _sh = document.getElementById('screen-home'); if (_sh) _sh.classList.remove('active');
  document.getElementById('screen-results').classList.add('active');
  document.querySelectorAll('.screen:not(#screen-results)').forEach(s => { if (s.id !== 'screen-home') s.classList.remove('active'); });
  renderMatchView();
  renderTicker();
  if (!isAdmin()) {
    applyViewerMode();
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
  }
}

function switchMatchView(view) {
  _currentMatchView = view;
  renderMatchView();
  renderTicker();
  if (!isAdmin()) {
    applyViewerMode();
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
  }
}

function renderMatchView() {
  clearDisabled();
  if (_currentMatchView === 'feed') { renderTournamentFeed(); return; }
  if (_currentMatchView === 'live') { renderLiveView(); return; }
  if (_currentMatchView === 'results') { renderRecentResults(); return; }
  if (_currentMatchView === 'upcoming') { renderUpcomingView(); return; }
  if (_currentMatchView === 'champions') { renderChampionsView(); return; }
}

function closeResults() {
  AppState.ui.showingResults = false;
  document.getElementById('screen-results').classList.remove('active');
  renderAll();
}

function renderRecentResults() {
  clearDisabled();
  const container = document.getElementById('resultsList');
  const ev = getEvents().find(e => e.id === AppState.eventId);
  if (!ev) {
    container.innerHTML = '<p class="text-muted text-center" style="padding:32px 0;">No event selected.</p>';
    return;
  }
  const templates = getTemplates();
  const roundLabel = { 'QF': 'Quarter Final', 'SF': 'Semi Final', 'Final': 'Final', 'group': 'Group Stage' };
  const sportIcons = { badminton: '🏸', tableTennis: '🏓', chess: '♟' };
  let allCompleted = [];
  for (const tmplId of ev.templateIds) {
    const tmpl = templates.find(t => t.id === tmplId);
    if (!tmpl) continue;
    const s = localLoad(tmpl.id);
    if (!s) continue;
    syncTournamentState(s);
    const resolve = function(id) { return s.participants ? participantName(s.participants, id) || id || 'TBD' : id || 'TBD'; };
    for (const m of (s.knockout || [])) {
      if (m.status !== 'COMPLETED') continue;
      let scores = [];
      if (m.round === 'Final' && m.sets) {
        scores = m.sets.filter(st => st.s1 !== null && st.s2 !== null).map(st => ({ s1: st.s1, s2: st.s2 }));
      } else if (m.s1 !== null && m.s2 !== null) {
        scores = [{ s1: m.s1, s2: m.s2 }];
      }
      const winnerId = m.winner;
      const loserId = winnerId === m.p1 ? m.p2 : m.p1;
      allCompleted.push({
        catLabel: tmpl.name,
        catSport: tmpl.sport,
        round: roundLabel[m.round] || m.round,
        winner: resolve(winnerId),
        loser: resolve(loserId),
        scores: scores,
        updatedAt: m.updatedAt || 0
      });
    }
  }
  allCompleted.sort(function(a, b) { return b.updatedAt - a.updatedAt; });
  var _maxResults = 10;
  var _recent = allCompleted.slice(0, _maxResults);
  var _hasMore = allCompleted.length > _maxResults;
  let html = '';
  if (_recent.length === 0) {
    html = '<p class="text-muted text-center" style="padding:32px 0;">No completed matches yet.</p>';
  } else {
    html = '<div class="results-ledger-stack">';
    for (const m of _recent) {
      let stageCls = '';
      if (m.round === 'Final') stageCls = ' stage-final';
      else if (m.round === 'Semi Final') stageCls = ' stage-semifinal';
      const badgeText = m.round === 'Final' ? '🥇 Final' : m.round;
      let scoreHtml = '<div class="scores-tablet-wrapper">';
      for (const sc of m.scores) {
        scoreHtml += '<span class="score-set-pill' + (sc.s1 > sc.s2 ? ' won-set' : '') + '">' + sc.s1 + '-' + sc.s2 + '</span>';
      }
      scoreHtml += '</div>';
      html += '<div class="result-matrix-row' + stageCls + '">'
        + '<div class="meta-tags-block">'
        + '<span class="division-label-string">' + (sportIcons[m.catSport] || '🏸') + ' ' + escapeHtml(m.catLabel) + '</span>'
        + '<span class="stage-badge-tag">' + escapeHtml(badgeText) + '</span>'
        + '</div>'
        + '<div class="competitors-versus-block">'
        + '<div class="competitor-row match-winner"><span class="check-icon-marker">✓</span> ' + escapeHtml(m.winner) + '</div>'
        + '<div class="competitor-row">' + escapeHtml(m.loser) + '</div>'
        + '</div>'
        + scoreHtml
        + '</div>';
    }
    html += '</div>';
    if (_hasMore) {
      html += '<p class="text-muted text-center" style="padding:8px 0;font-size:.85rem;">Showing last ' + _maxResults + ' of ' + allCompleted.length + ' completed matches.</p>';
    }
  }
  container.innerHTML = html;
  document.getElementById('subNavFeed').classList.remove('active');
  document.getElementById('subNavLive').classList.remove('active');
  document.getElementById('subNavResults').classList.add('active');
  document.getElementById('subNavUpcoming').classList.remove('active');
  document.getElementById('subNavChampions').classList.remove('active');
}

function renderChampionsView() {
  const templates = getTemplates();
  const events = getEvents();
  const container = document.getElementById('resultsList');
  let html = '<div class="champions-grid-stack">';
  let hasContent = false;
  const filteredEvents = events.filter(function(ev) { return ev.id === AppState.eventId; });
  for (const ev of filteredEvents) {
    for (const tmplId of ev.templateIds) {
      const tmpl = templates.find(t => t.id === tmplId);
      if (!tmpl) continue;
      const s = localLoad(tmpl.id);
      if (!s || !s.knockout) continue;
      syncTournamentState(s);
      if (!s.champion) continue;
      hasContent = true;
      const chName = s.champion;
      const ruName = s.runnerUp || '—';
      html += '<div class="division-block-container">'
        + '<span class="division-header-badge">' + escapeHtml(tmpl.name) + '</span>'
        + '<div class="podium-split-row">'
        + '<div class="placement-sub-card rank-gold">'
        + '<div class="medal-emblem-badge">🥇</div>'
        + '<div class="winner-text-details">'
        + '<h4>Tournament Champion</h4>'
        + '<p>' + escapeHtml(chName) + '</p>'
        + '</div>'
        + (s.championPhoto ? '<img src="' + s.championPhoto + '" class="champion-podium-photo" alt="">' : '')
        + '</div>'
        + '<div class="placement-sub-card rank-silver">'
        + '<div class="medal-emblem-badge">🥈</div>'
        + '<div class="winner-text-details">'
        + '<h4>Runner-Up</h4>'
        + '<p>' + escapeHtml(ruName) + '</p>'
        + '</div>'
        + (s.runnerUpPhoto ? '<img src="' + s.runnerUpPhoto + '" class="champion-podium-photo" alt="">' : '')
        + '</div>'
        + '</div>'
        + '</div>';
    }
  }
  if (!hasContent) {
    html += '<p class="text-muted text-center" style="padding:32px 0;">No champions yet.</p>';
  }
  html += '</div>';
  container.innerHTML = html;
  document.getElementById('subNavFeed').classList.remove('active');
  document.getElementById('subNavLive').classList.remove('active');
  document.getElementById('subNavResults').classList.remove('active');
  document.getElementById('subNavUpcoming').classList.remove('active');
  document.getElementById('subNavChampions').classList.add('active');
}

// ===================== INIT =====================
async function init() {
  on('userLoggedIn', function() { updateBanners(); renderAll(); });
  on('userLoggedOut', function() { navigateTo(AppState.tournament.phase); });

  initSupabase();

  // Metadata (templates + events) from Supabase first, fallback to localStorage
  if (_supabase) {
    await checkSession();
    const meta = await fetchMetadataFromCloud().catch(() => null);
    if (meta) {
      if (meta.templates && meta.events) {
        saveTemplates(meta.templates);
        saveEvents(meta.events);
      } else if (meta.categories) {
        saveCategories(meta.categories);
      }
    }
  }

  runMigration();
  runStateKeyMigration();

  // Sync metadata to cloud
  if (_supabase && isAdmin()) {
    syncMetadataToCloud();
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
    subscribeToMetadataChanges();
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
    if (firstCat.event) setCurrentEvent(firstCat.event);
  }
  AppState.category = startCat || (firstCat ? firstCat.id : null);
  const saved = localLoad(AppState.category);
  if (saved && saved.phase !== 'setup') {
    AppState.tournament = saved;
  } else {
    AppState.tournament = defaultState();
  }

  syncTournamentState(AppState.tournament);

  // Supabase-first for current category state
  if (_supabase) {
    const serverState = await fetchState(AppState.category).catch(() => null);
    if (serverState && serverState._lastSave > (AppState.tournament._lastSave || 0)) {
      AppState.tournament = serverState;
      syncTournamentState(AppState.tournament);
      localSave(AppState.category, AppState.tournament);
    }
  }

  if (location.search.includes('admin')) {
    const link = document.getElementById('adminFooterLink');
    if (link) link.classList.remove('hidden');
  }

  if (AppState.eventId) {
    AppState.view = 'home';
    showResultsPage();
  } else {
    navigateTo('home');
  }
}

document.addEventListener('DOMContentLoaded', function() { init(); });
