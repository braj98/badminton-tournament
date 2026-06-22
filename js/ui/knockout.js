function renderKnockout() {
  clearDisabled();
  var _koCfg = getCurrentConfig();
  const container = document.getElementById('bracket');
  const ko = state.knockout;
  if (!ko || ko.length === 0) { container.innerHTML = '<p class="text-muted">No knockout matches.</p>'; return; }
  const rounds = ['QF', 'SF', 'Final'];
  let html = '';
  for (const round of rounds) {
    const matches = ko.filter(m => m.round === round);
    if (matches.length === 0) continue;
    html += '<div class="bracket-round"><h3>' + (round === 'QF' ? 'Quarter Finals' : round === 'SF' ? 'Semi Finals' : 'Final') + '</h3>';
    for (const m of matches) {
      const isFinal = m.round === 'Final';
      html += '<div class="bracket-match">';
      if (isFinal) {
        html += '<span class="pname">' + escapeHtml(pName(m.p1)) + '</span>';
        if (_isAdmin) {
          html += renderFinalSetInputs(m);
        } else {
          html += renderFinalSetText(m);
        }
        html += '<span class="pname">' + escapeHtml(pName(m.p2)) + '</span>'
          + (m.done ? '<span class="winner-badge">🏆 ' + escapeHtml(pName(m.winner)) + '</span>' : '');
      } else {
        const canPlay = m.p1 && m.p2;
        html += '<span class="pname">' + escapeHtml(pName(m.p1)) + '</span>';
        if (canPlay) {
          if (_isAdmin) {
            html += '<input class="score-input" type="number" min="0" max="' + _koCfg.maxScoreInput + '" value="' + (m.s1 ?? '') + '" onchange="enterKnockoutScore(\'' + m.id + '\',this.value,this.parentElement.querySelector(\'.ks2\').value)" onfocus="this.select()">'
              + '<span class="vs">vs</span>'
              + '<input class="score-input ks2" type="number" min="0" max="' + _koCfg.maxScoreInput + '" value="' + (m.s2 ?? '') + '" onchange="enterKnockoutScore(\'' + m.id + '\',this.parentElement.querySelector(\'.score-input\').value,this.value)" onfocus="this.select()">';
          } else {
            html += '<span class="score-text">' + (m.s1 ?? '') + '</span>'
              + '<span class="vs">vs</span>'
              + '<span class="score-text">' + (m.s2 ?? '') + '</span>';
          }
        } else {
          html += '<span style="min-width:56px;text-align:center;">—</span>'
            + '<span class="vs">vs</span>'
            + '<span style="min-width:56px;text-align:center;">—</span>';
        }
        html += '<span class="pname">' + escapeHtml(pName(m.p2)) + '</span>'
          + (m.done ? '<span class="winner-badge">→ ' + escapeHtml(pName(m.winner)) + '</span>' : '');
      }
      html += '</div>';
    }
    html += '</div>';
  }
  container.innerHTML = html;
  const finalMatch = ko.find(m => m.id === 'final');
  const finalDone = finalMatch && finalMatch.done;
  document.getElementById('btnShowResults').classList.toggle('hidden', !(finalDone && _isAdmin));
  document.getElementById('btnViewChampion').classList.toggle('hidden', !finalDone);
}

function renderFinalSetText(m) {
  if (!m.sets) return '<span class="vs">vs</span>';
  var _cfg = getCurrentConfig();
  let h = '<div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;">';
  for (let i = 0; i < _cfg.finalSets; i++) {
    const s = m.sets[i];
    if (!s || s.s1 === null) break;
    h += '<span style="font-size:.8rem;padding:2px 4px;">S' + (i+1) + ': ' + escapeHtml(s.s1) + '-' + escapeHtml(s.s2) + '</span>';
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
  let h = '<div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;">';
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
  if (!_isAdmin) return;
  const m = state.knockout.find(m => m.id === id);
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
  state.knockout = advanceWinner(state.knockout);
  saveState();
  renderKnockout();
}

function enterFinalSet(id, setNum, s1, s2) {
  if (!_isAdmin) return;
  const m = state.knockout.find(m => m.id === id);
  if (!m) return;
  var _cfg = getCurrentConfig();
  if (!m.sets) {
    m.sets = [];
    for (var _i = 0; _i < _cfg.finalSets; _i++) m.sets.push({s1:null,s2:null});
  }
  m.sets[setNum] = { s1: parseInt(s1)||0, s2: parseInt(s2)||0 };
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
    m.winner = w1 >= 2 ? m.p1 : m.p2;
    m.s1 = w1;
    m.s2 = w2;
  } else {
    m.done = false;
    m.winner = null;
    m.s1 = null;
    m.s2 = null;
  }
  state.knockout = advanceWinner(state.knockout);
  saveState();
  renderKnockout();
}
