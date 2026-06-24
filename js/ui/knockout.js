function renderKnockout() {
  clearDisabled();
  var _koCfg = getCurrentConfig();
  const container = document.getElementById('bracket');
  const ko = AppState.tournament.knockout;
  if (!ko || ko.length === 0) { container.innerHTML = '<p class="text-muted">No knockout matches.</p>'; return; }
  const rounds = ['QF', 'SF', 'Final'];
  const roundLabels = { QF: 'Quarter Final', SF: 'Semi Final', Final: 'Final' };
  let html = '';
  for (const round of rounds) {
    const matches = ko.filter(m => m.round === round);
    if (matches.length === 0) continue;
    html += '<div class="bracket-round"><div class="round-title">' + roundLabels[round] + 's</div>';
    for (const m of matches) {
      const isFinal = m.round === 'Final';
      const done = m.done;
      const canPlay = m.p1 && m.p2;
      const isWaiting = !canPlay;

      let cardsCls = 'match-card';
      if (done) cardsCls += ' match-done';
      if (isWaiting) cardsCls += ' is-waiting';

      html += '<div class="' + cardsCls + '">'
        + '<div class="match-card-header">'
        + '<span class="match-label">' + roundLabels[round] + '</span>';

      if (done) {
        html += '<span class="match-status" style="color:var(--success);">✓ ' + escapeHtml(pName(m.winner)) + '</span>';
      } else if (isWaiting) {
        html += '<span class="match-status">— Waiting</span>';
      } else if (isAdmin() && m.status === 'UPCOMING') {
        html += '<button class="btn-go-live" onclick="startKnockoutMatch(\'' + m.id + '\')">▶ Go Live</button>';
      } else if (m.status === 'LIVE') {
        html += '<span class="match-status" style="color:var(--danger);">🔴 LIVE</span>';
      } else if (canPlay) {
        html += '<span class="match-status">● Ready</span>';
      }

      html += '</div>'
        + '<div class="match-versus-row">'
        + '<div class="team-horizontal">'
        + '<div class="avatar">' + escapeHtml(getInitials(m.p1)) + '</div>'
        + '<span class="player-name">' + escapeHtml(pName(m.p1)) + '</span>'
        + '</div>'
        + '<span class="vs-circle">VS</span>'
        + '<div class="team-horizontal">'
        + '<div class="avatar">' + escapeHtml(getInitials(m.p2)) + '</div>'
        + '<span class="player-name">' + escapeHtml(pName(m.p2)) + '</span>'
        + '</div>'
        + '</div>';

      if (canPlay && isAdmin()) {
        html += '<div class="match-score-area">';
        if (isFinal) {
          html += renderFinalSetInputs(m);
        } else {
          html += '<input class="score-input" type="number" min="0" max="' + _koCfg.maxScoreInput + '" value="' + (m.s1 ?? '') + '" onchange="enterKnockoutScore(\'' + m.id + '\',this.value,this.parentElement.querySelector(\'.ks2\').value)" onfocus="this.select()">'
            + '<span class="vs">vs</span>'
            + '<input class="score-input ks2" type="number" min="0" max="' + _koCfg.maxScoreInput + '" value="' + (m.s2 ?? '') + '" onchange="enterKnockoutScore(\'' + m.id + '\',this.parentElement.querySelector(\'.score-input\').value,this.value)" onfocus="this.select()">';
        }
        html += '</div>';
        if (m.status !== 'COMPLETED') {
          html += '<div class="match-controls-inline">';
          if (m.status === 'UPCOMING') {
            html += '<button class="btn btn-sm btn-outline" onclick="startKnockoutMatch(\'' + m.id + '\')">▶ Start Match</button>';
          }
          if (m.status === 'LIVE') {
            html += '<button class="btn btn-sm btn-outline" onclick="completeKnockoutMatch(\'' + m.id + '\')" style="border-color:var(--success);color:var(--success);">☑ Match Completed</button>';
          }
          html += '</div>';
        }
      } else if (canPlay && !isAdmin()) {
        if (isFinal) {
          html += '<div class="match-score-area">' + renderFinalSetText(m) + '</div>';
        } else if (m.s1 !== null && m.s2 !== null) {
          html += '<div class="match-score-area"><span class="score-text">' + escapeHtml(m.s1) + '</span><span class="vs">vs</span><span class="score-text">' + escapeHtml(m.s2) + '</span></div>';
        }
      }
      html += '</div>';
    }
    html += '</div>';
  }
  container.innerHTML = html;
  const finalMatch = ko.find(function(mm) { return mm.id === 'final'; });
  const finalDone = finalMatch && finalMatch.done;
  document.getElementById('btnShowResults').classList.toggle('hidden', !(finalDone && isAdmin()));
  document.getElementById('btnViewChampion').classList.toggle('hidden', !finalDone);
  var _ab1 = document.getElementById('actionBarShowResults');
  var _ab2 = document.getElementById('actionBarViewChampion');
  if (_ab1) _ab1.classList.toggle('hidden', !(finalDone && isAdmin()));
  if (_ab2) _ab2.classList.toggle('hidden', !finalDone);
}

function renderFinalSetText(m) {
  if (!m.sets) return '<span class="vs">vs</span>';
  var _cfg = getCurrentConfig();
  let h = '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">';
  for (let i = 0; i < _cfg.finalSets; i++) {
    const s = m.sets[i];
    if (!s || s.s1 === null) break;
    h += '<span style="font-size:.85rem;font-weight:600;padding:2px 8px;background:var(--bg-page);border-radius:4px;">S' + (i+1) + ': ' + escapeHtml(s.s1) + '-' + escapeHtml(s.s2) + '</span>';
  }
  h += '</div>';
  return h;
}

function renderFinalSets(m) {
  if (!m.sets) return '<span class="vs">vs</span>';
  var _cfg = getCurrentConfig();
  let h = '';
  for (let i = 0; i < _cfg.finalSets; i++) {
    const s = m.sets[i];
    if (!s || s.s1 === null) break;
    h += '<span style="font-size:.8rem;padding:0 4px;">' + escapeHtml(s.s1) + '-' + escapeHtml(s.s2) + '</span>';
  }
  return h;
}

function renderFinalSetInputs(m) {
  var _cfg = getCurrentConfig();
  let h = '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">';
  for (let i = 0; i < _cfg.finalSets; i++) {
    const s = m.sets ? m.sets[i] : null;
    h += '<span style="display:flex;align-items:center;gap:2px;font-size:.8rem;">'
      + 'S' + (i+1) + ':'
      + '<input class="score-input" type="number" min="0" max="' + _cfg.maxFinalSetInput + '" style="width:56px;" value="' + (s ? (s.s1 ?? '') : '') + '" '
      + 'onchange="enterFinalSet(\'' + m.id + '\',' + i + ',this.value,this.parentElement.querySelector(\'.fs2-' + i + '\').value)" onfocus="this.select()">'
      + '-'
      + '<input class="score-input fs2-' + i + '" type="number" min="0" max="' + _cfg.maxFinalSetInput + '" style="width:56px;" value="' + (s ? (s.s2 ?? '') : '') + '" '
      + 'onchange="enterFinalSet(\'' + m.id + '\',' + i + ',this.parentElement.querySelector(\'.score-input\').value,this.value)" onfocus="this.select()">'
      + '</span>';
  }
  h += '</div>';
  return h;
}

function enterKnockoutScore(id, s1, s2) {
  if (!isAdmin()) return;
  const m = AppState.tournament.knockout.find(function(mm) { return mm.id === id; });
  if (!m) return;
  m.s1 = parseInt(s1) || 0;
  m.s2 = parseInt(s2) || 0;
  m.updatedAt = Date.now();
  if (m.status === 'UPCOMING') m.status = 'LIVE';
  if (m.round === 'Final') return;
  AppState.tournament.knockout = advanceWinner(AppState.tournament.knockout);
  saveState();
  renderKnockout();
}

function enterFinalSet(id, setNum, s1, s2) {
  if (!isAdmin()) return;
  const m = AppState.tournament.knockout.find(function(mm) { return mm.id === id; });
  if (!m) return;
  var _cfg = getCurrentConfig();
  if (!m.sets) {
    m.sets = [];
    for (var _i = 0; _i < _cfg.finalSets; _i++) m.sets.push({s1:null,s2:null});
  }
  const v1 = s1 === '' || s1 === null || s1 === undefined ? null : parseInt(s1) || 0;
  const v2 = s2 === '' || s2 === null || s2 === undefined ? null : parseInt(s2) || 0;
  m.sets[setNum] = { s1: v1, s2: v2 };
  m.updatedAt = Date.now();
  if (m.status === 'UPCOMING') m.status = 'LIVE';
  saveState();
  renderKnockout();
}

function startKnockoutMatch(id) {
  if (!isAdmin()) return;
  if (!confirm('Start this knockout match? It will be marked as live.')) return;
  const m = AppState.tournament.knockout.find(function(mm) { return mm.id === id; });
  if (!m) return;
  startMatch(m);
  saveState();
  renderKnockout();
}

function completeKnockoutMatch(id) {
  if (!isAdmin()) return;
  const m = AppState.tournament.knockout.find(function(mm) { return mm.id === id; });
  if (!m) return;
  completeMatch(m, AppState.tournament.participants);
  AppState.tournament.knockout = advanceWinner(AppState.tournament.knockout);
  if (m.id === 'final' && m.done && m.winner) {
    AppState.tournament.champion = m.winner;
    AppState.tournament.runnerUp = m.winner === m.p1 ? m.p2 : m.p1;
  }
  saveState();
  renderKnockout();
}
