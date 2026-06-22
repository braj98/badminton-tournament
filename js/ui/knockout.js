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
      var isFinal = m.round === 'Final';
      var done = m.done;
      var canPlay = m.p1 && m.p2;
      html += '<div class="match-card' + (done ? ' match-done' : '') + '">'
        + '<div class="match-card-header">'
        + '<span class="match-label">' + roundLabels[round] + '</span>'
        + '<span class="match-status">' + (done ? '✓ ' + escapeHtml(pName(m.winner)) : (canPlay ? '● Ready to Play' : '— Waiting')) + '</span>'
        + '</div>'
        + '<div class="match-body">'
        + '<div class="team"><div class="avatar">' + escapeHtml(getInitials(m.p1)) + '</div><div class="team-names">' + escapeHtml(pName(m.p1)) + '</div></div>'
        + '<div class="vs-circle">VS</div>'
        + '<div class="team"><div class="avatar">' + escapeHtml(getInitials(m.p2)) + '</div><div class="team-names">' + escapeHtml(pName(m.p2)) + '</div></div>'
        + '</div>';
      if (canPlay && AppState.isAdmin) {
        html += '<div class="match-score-area">';
        if (isFinal) {
          html += renderFinalSetInputs(m);
        } else {
          html += '<input class="score-input" type="number" min="0" max="' + _koCfg.maxScoreInput + '" value="' + (m.s1 ?? '') + '" onchange="enterKnockoutScore(\'' + m.id + '\',this.value,this.parentElement.querySelector(\'.ks2\').value)" onfocus="this.select()">'
            + '<span class="vs">vs</span>'
            + '<input class="score-input ks2" type="number" min="0" max="' + _koCfg.maxScoreInput + '" value="' + (m.s2 ?? '') + '" onchange="enterKnockoutScore(\'' + m.id + '\',this.parentElement.querySelector(\'.score-input\').value,this.value)" onfocus="this.select()">';
        }
        html += '</div>';
      } else if (canPlay && !AppState.isAdmin) {
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
  document.getElementById('btnShowResults').classList.toggle('hidden', !(finalDone && AppState.isAdmin));
  document.getElementById('btnViewChampion').classList.toggle('hidden', !finalDone);
  var _ab1 = document.getElementById('actionBarShowResults');
  var _ab2 = document.getElementById('actionBarViewChampion');
  if (_ab1) _ab1.classList.toggle('hidden', !(finalDone && AppState.isAdmin));
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
  if (!AppState.isAdmin) return;
  const m = AppState.tournament.knockout.find(function(mm) { return mm.id === id; });
  if (!m) return;
  m.s1 = parseInt(s1) || 0;
  m.s2 = parseInt(s2) || 0;
  m.updatedAt = Date.now();
  if (m.round === 'Final') return;
  if (m.s1 !== m.s2 && m.p1 && m.p2) {
    m.done = true;
    m.winner = m.s1 > m.s2 ? m.p1 : m.p2;
  } else {
    m.done = false;
    m.winner = null;
  }
  AppState.tournament.knockout = advanceWinner(AppState.tournament.knockout);
  if (AppState.tournament.phase === 'champion') {
    var _fm = AppState.tournament.knockout.find(function(mm) { return mm.id === 'final'; });
    if (_fm && _fm.done && _fm.winner) {
      AppState.tournament.champion = _fm.winner;
      AppState.tournament.runnerUp = _fm.winner === _fm.p1 ? _fm.p2 : _fm.p1;
    }
  }
  saveState();
  renderKnockout();
}

function enterFinalSet(id, setNum, s1, s2) {
  if (!AppState.isAdmin) return;
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
  let w1 = 0, w2 = 0;
  for (const s of m.sets) {
    if (s.s1 !== null && s.s2 !== null) {
      if (s.s1 > s.s2) w1++;
      else if (s.s2 > s.s1) w2++;
    }
  }
  var _needed = Math.ceil(_cfg.finalSets / 2);
  if ((w1 >= _needed || w2 >= _needed) && m.p1 && m.p2) {
    m.done = true;
    m.winner = w1 >= _needed ? m.p1 : m.p2;
    m.s1 = w1;
    m.s2 = w2;
  } else {
    m.done = false;
    m.winner = null;
    m.s1 = null;
    m.s2 = null;
  }
  AppState.tournament.knockout = advanceWinner(AppState.tournament.knockout);
  if (AppState.tournament.phase === 'champion') {
    var _fm = AppState.tournament.knockout.find(function(mm) { return mm.id === 'final'; });
    if (_fm && _fm.done && _fm.winner) {
      AppState.tournament.champion = _fm.winner;
      AppState.tournament.runnerUp = _fm.winner === _fm.p1 ? _fm.p2 : _fm.p1;
    }
  }
  saveState();
  renderKnockout();
}
