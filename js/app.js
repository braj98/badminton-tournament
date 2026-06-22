// ===================== RENDER =====================
function renderAll() {
  clearDisabled();

  renderCategoryBar();
  showScreen('screen-setup', state.phase === 'setup');
  showScreen('screen-groups', state.phase === 'groups');
  showScreen('screen-fixtures', state.phase === 'fixtures');
  showScreen('screen-knockout', state.phase === 'knockout');
  showScreen('screen-champion', state.phase === 'champion');
  showScreen('screen-results', false);

  if (state.phase === 'setup') renderSetup();
  if (state.phase === 'groups') renderGroups();
  if (state.phase === 'fixtures') renderFixtures();
  if (state.phase === 'knockout') renderKnockout();
  if (state.phase === 'champion') renderChampion();

  if (!_isAdmin) applyViewerMode();
}

function clearDisabled() {
  const app = document.getElementById('app');
  app.querySelectorAll('input, button, select').forEach(el => {
    if (el.closest('#loginOverlay')) return;
    el.disabled = false;
  });
  app.querySelectorAll('.photo-zone').forEach(el => {
    el.style.pointerEvents = '';
    el.style.cursor = '';
  });
  app.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
}

function applyViewerMode() {
  const app = document.getElementById('app');
  app.querySelectorAll('input, button, select').forEach(el => {
    if (el.closest('#loginOverlay') || el.closest('#adminBanner') || el.closest('#viewerBanner')) return;
    el.disabled = true;
  });
  app.querySelectorAll('.photo-zone').forEach(el => {
    el.style.pointerEvents = 'none';
    el.style.cursor = 'default';
  });
  app.querySelectorAll('.cat-btn, [data-public]').forEach(el => { el.disabled = false; });
  app.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
}

function showScreen(id, show) {
  document.getElementById(id).classList.toggle('active', show);
}

// ===================== NAVIGATION =====================
function goToGroups() {
  state.phase = 'groups';
  saveState();
  renderAll();
}
function goToFixtures() {
  state.phase = 'fixtures';
  calculateStandings();
  saveState();
  renderAll();
}
function goToKnockout() {
  state.phase = 'knockout';
  advanceKnockout();
  saveState();
  renderAll();
}
function goToFixturesFromKnockout() {
  state.phase = 'fixtures';
  calculateStandings();
  saveState();
  renderAll();
}
function goBackFromChampion() {
  state.phase = 'knockout';
  renderAll();
}

// ===================== RESULTS PAGE =====================
function showResultsPage() {
  document.getElementById('screen-results').classList.add('active');
  document.querySelectorAll('.screen:not(#screen-results)').forEach(s => s.classList.remove('active'));
  renderResults();
}

function closeResults() {
  document.getElementById('screen-results').classList.remove('active');
  renderAll();
}

function renderResults() {
  clearDisabled();
  const cats = getCategories();
  const matches = [];
  const champions = [];
  for (const cat of cats) {
    const s = loadState(cat.id);
    if (!s || (s.phase !== 'knockout' && s.phase !== 'champion' && s.phase !== 'fixtures') || !s.knockout) continue;
    const roundLabel = { 'QF': 'Quarter Final', 'SF': 'Semi Final', 'Final': 'Final' };
    for (const m of s.knockout) {
      const p1 = m.p1 || 'TBD';
      const p2 = m.p2 || 'TBD';
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
        p1: p1,
        p2: p2,
        score: score || '—',
        done: m.done,
        winner: m.winner || null,
        updatedAt: m.updatedAt || 0
      });
    }
    if (s.champion) {
      champions.push({ cat: cat, champion: s.champion, runnerUp: s.runnerUp || '—', championPhoto: s.championPhoto, runnerUpPhoto: s.runnerUpPhoto, completedAt: s.completedAt });
    }
  }
  matches.sort((a, b) => b.updatedAt - a.updatedAt);
  const container = document.getElementById('resultsList');
  let html = '';
  if (champions.length > 0) {
    html += '<h2 style="margin-bottom:8px;">🏆 Champions</h2>';
    for (const c of champions) {
      html += '<div class="champion-card" style="margin-bottom:12px;padding:16px;">'
        + '<div class="crown">' + c.cat.label + '</div>'
        + '<div class="name" style="font-size:1.2rem;">' + c.champion + '</div>'
        + (c.championPhoto ? '<img src="' + c.championPhoto + '" style="width:80px;height:80px;object-fit:cover;border-radius:var(--radius);margin:6px auto;display:block;">' : '')
        + '<div class="runner-up" style="border:none;padding-top:8px;font-size:.8rem;">Runner-up: <strong>' + c.runnerUp + '</strong></div>'
        + (c.runnerUpPhoto ? '<img src="' + c.runnerUpPhoto + '" style="width:60px;height:60px;object-fit:cover;border-radius:var(--radius);margin:4px auto;display:block;">' : '')
        + '</div>';
    }
  }
  if (matches.length === 0) {
    html += '<p class="text-muted text-center" style="padding:32px 0;">No knockout matches yet.</p>';
  } else {
    html += '<h2 class="mt-20">Knockout Matches</h2><table class="standings-table"><thead><tr><th>Category</th><th>Round</th><th>Match</th><th>Score</th><th>Status</th></tr></thead><tbody>';
    for (const m of matches) {
      const status = m.done ? '<span style="color:var(--green);font-weight:600;">✓ ' + m.winner + '</span>' : '<span style="color:var(--muted);">⏳ Upcoming</span>';
      html += '<tr><td style="font-weight:600;">' + m.cat.label + '</td>'
        + '<td>' + m.round + '</td>'
        + '<td>' + m.p1 + ' <span class="vs">vs</span> ' + m.p2 + '</td>'
        + '<td style="font-weight:600;">' + m.score + '</td>'
        + '<td>' + status + '</td></tr>';
    }
    html += '</tbody></table>';
  }
  container.innerHTML = html;
}

// ===================== INIT =====================
function init() {
  try {
    const old = localStorage.getItem('btm_state');
    if (old && !localStorage.getItem('btm_state_senior_boys')) {
      localStorage.setItem('btm_state_senior_boys', old);
    }
    localStorage.removeItem('btm_state');
  } catch(e) {}

  let startCat = null;
  for (const cat of getCategories()) {
    const s = loadState(cat.id);
    if (s && s.phase !== 'setup') { startCat = cat.id; break; }
  }
  currentCategory = startCat || getCategories()[0].id;
  const saved = loadState(currentCategory);
  if (saved && saved.phase !== 'setup') {
    state = saved;
  } else {
    state = defaultState();
  }
  renderAll();

  initSupabase();
  setTimeout(checkAndUpdateFromServer, 0);
}

document.addEventListener('DOMContentLoaded', init);
