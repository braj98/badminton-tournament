// ===================== APP STATE =====================
let currentCategory = null;
let state = null;
let currentView = null;
let _showingResults = false;

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
function renderAll() {
  _showingResults = false;
  clearDisabled();

  if (!_isAdmin && state.phase === 'setup') {
    const cats = getCategories();
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
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-results').classList.add('active');
    document.getElementById('resultsList').innerHTML = '<p class="text-muted text-center" style="padding:48px 0;">No active tournaments yet.</p>';
    if (!_isAdmin) applyViewerMode();
    return;
  }

  renderCategoryBar();
  showScreen('screen-setup', state.phase === 'setup');
  showScreen('screen-groups', currentView === 'groups');
  showScreen('screen-fixtures', currentView === 'fixtures');
  showScreen('screen-knockout', currentView === 'knockout');
  showScreen('screen-champion', currentView === 'champion');
  showScreen('screen-results', false);
  if (currentView === 'setup') renderSetup();
  if (currentView === 'groups') renderGroups();
  if (currentView === 'fixtures') renderFixtures();
  if (currentView === 'knockout') renderKnockout();
  if (currentView === 'champion') renderChampion();
  document.getElementById('btnViewKnockout').classList.toggle('hidden', !(state.phase === 'knockout' || state.phase === 'champion'));
  if (!_isAdmin) applyViewerMode();
}

function clearDisabled() {
  if (_isAdmin) document.body.classList.remove('viewer-mode');
  const app = document.getElementById('app');
  app.querySelectorAll('input, button, select').forEach(el => {
    if (el.closest('#loginOverlay')) return;
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
  document.getElementById(id).classList.toggle('active', show);
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
  const result = calculateStandings(state.groups, state.fixtures, state.participants);
  state.standings = result.standings;
  state.qualifiers = result.qualifiers;
  renderAll();
}

function goToKnockout() {
  if (!_isAdmin) return;
  state.phase = 'knockout';
  currentView = 'knockout';
  state.knockout = advanceKnockout(state.knockout);
  saveState();
  renderAll();
}

function goToFixturesFromKnockout() {
  currentView = 'fixtures';
  const result = calculateStandings(state.groups, state.fixtures, state.participants);
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
  document.getElementById('screen-results').classList.add('active');
  document.querySelectorAll('.screen:not(#screen-results)').forEach(s => s.classList.remove('active'));
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
    const p1Name = s.participants ? participantName(s.participants, m.p1) || m.p1 || 'TBD' : m.p1 || 'TBD';
    const p2Name = s.participants ? participantName(s.participants, m.p2) || m.p2 || 'TBD' : m.p2 || 'TBD';
    const p1 = p1Name;
    const p2 = p2Name;
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
        winner: m.winner || null,
        updatedAt: m.updatedAt || 0
      });
    }
    if (s.champion) {
      const chName = s.participants ? participantName(s.participants, s.champion) || s.champion : s.champion;
      const ruName = s.participants ? participantName(s.participants, s.runnerUp) || s.runnerUp || '—' : s.runnerUp || '—';
      champions.push({ cat: cat, champion: chName, runnerUp: ruName, championPhoto: s.championPhoto, runnerUpPhoto: s.runnerUpPhoto, completedAt: s.completedAt });
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
      const status = m.done ? '<span style="color:var(--green);font-weight:600;">✓ ' + escapeHtml(m.winner) + '</span>' : '<span style="color:var(--muted);">⏳ Upcoming</span>';
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

  let startCat = null;
  for (const cat of getCategories()) {
    const s = localLoad(cat.id);
    if (s && s.phase !== 'setup') { startCat = cat.id; break; }
  }
  currentCategory = startCat || getCategories()[0].id;
  const saved = localLoad(currentCategory);
  if (saved && saved.phase !== 'setup') {
    state = saved;
  } else {
    state = defaultState();
  }
  currentView = state.phase;
  initSupabase();

  // Supabase is primary source of truth — fetch before first render
  if (_supabase) {
    await checkSession();
    const serverState = await fetchState(currentCategory).catch(() => null);
    if (serverState && serverState._lastSave > (state._lastSave || 0)) {
      state = serverState;
      localSave(currentCategory, state);
      currentView = state.phase;
    }
    subscribeToChanges();
    // Sync remaining categories in background
    for (const cat of getCategories()) {
      if (cat.id === currentCategory) continue;
      const s = await fetchState(cat.id).catch(() => null);
      if (s) localSave(cat.id, s);
    }
    updateBanners();
  }

  showResultsPage();
}

document.addEventListener('DOMContentLoaded', function() { init(); });
