function renderLiveView() {
  clearDisabled();
  const container = document.getElementById('resultsList');
  if (!AppState.tournament) {
    container.innerHTML = '<p class="text-muted text-center" style="padding:32px 0;">No tournament data.</p>';
    return;
  }
  const fixtures = AppState.tournament.fixtures || [];
  const knockout = AppState.tournament.knockout || [];
  const liveMatches = fixtures.filter(function(f) { return f.status === 'LIVE'; }).concat(
    knockout.filter(function(m) { return m.status === 'LIVE'; })
  );
  if (liveMatches.length === 0) {
    container.innerHTML = '<p class="text-muted text-center" style="padding:32px 0;">No matches currently live.</p>';
    return;
  }
  const roundLabel = { 'QF': 'Quarter Final', 'SF': 'Semi Final', 'Final': 'Final', 'group': 'Group Stage' };
  var _koCfg = getCurrentConfig();
  let html = '<div class="results-cards">';
  for (const m of liveMatches) {
    var isFinal = m.round === 'Final';
    var isGroup = m.round === 'group';
    var n1 = pName(m.p1), n2 = pName(m.p2);
    html += '<div class="result-card result-live">'
      + '<div class="result-card-header">'
      + '<span class="result-cat">' + escapeHtml(roundLabel[m.round] || m.round) + '</span>'
      + '<span class="result-round" style="color:var(--danger);">🔴 LIVE</span>'
      + '</div>'
      + '<div class="result-match">' + escapeHtml(n1) + ' <span class="vs">vs</span> ' + escapeHtml(n2) + '</div>';
    if (isAdmin()) {
      html += '<div class="match-score-area" style="margin-top:4px;">';
      if (isFinal) {
        html += renderFinalSetInputs(m);
      } else if (isGroup) {
        var _max = getCurrentConfig().maxScoreInput;
        html += '<input class="score-input" type="number" min="0" max="' + _max + '" value="' + (m.s1 ?? '') + '" '
          + 'onchange="enterLiveFixtureScore(' + m.id + ',this.value,this.parentElement.querySelector(\'.ls2\').value)">'
          + '<span class="vs">vs</span>'
          + '<input class="score-input ls2" type="number" min="0" max="' + _max + '" value="' + (m.s2 ?? '') + '" '
          + 'onchange="enterLiveFixtureScore(' + m.id + ',this.parentElement.querySelector(\'.score-input\').value,this.value)">';
      } else {
        html += '<input class="score-input" type="number" min="0" max="' + _koCfg.maxScoreInput + '" value="' + (m.s1 ?? '') + '" '
          + 'onchange="enterLiveKnockoutScore(\'' + m.id + '\',this.value,this.parentElement.querySelector(\'.ls2\').value)">'
          + '<span class="vs">vs</span>'
          + '<input class="score-input ls2" type="number" min="0" max="' + _koCfg.maxScoreInput + '" value="' + (m.s2 ?? '') + '" '
          + 'onchange="enterLiveKnockoutScore(\'' + m.id + '\',this.parentElement.querySelector(\'.score-input\').value,this.value)">';
      }
      html += '</div>';
    } else {
      html += '<div class="result-score">' + (m.s1 ?? '-') + ' - ' + (m.s2 ?? '-') + '</div>';
    }
    html += '</div>';
  }
  html += '</div>';
  container.innerHTML = html;
  document.getElementById('subNavLive').classList.add('active');
  document.getElementById('subNavUpcoming').classList.remove('active');
  document.getElementById('subNavResults').classList.remove('active');
  document.getElementById('subNavChampions').classList.remove('active');
}

function enterLiveFixtureScore(id, s1, s2) {
  if (!isAdmin()) return;
  const f = AppState.tournament.fixtures.find(function(m) { return m.id === id; });
  if (!f) return;
  f.s1 = parseInt(s1) || 0;
  f.s2 = parseInt(s2) || 0;
  f.updatedAt = Date.now();
  if (f.status === 'UPCOMING') f.status = 'LIVE';
  const result = computeStandings(AppState.tournament.groups, AppState.tournament.fixtures, AppState.tournament.participants);
  AppState.tournament.standings = result.standings;
  AppState.tournament.qualifiers = result.qualifiers;
  AppState.tournament.knockout = createKnockoutBracket(AppState.tournament.qualifiers);
  saveState();
  renderLiveView();
}

function enterLiveKnockoutScore(id, s1, s2) {
  if (!isAdmin()) return;
  const m = AppState.tournament.knockout.find(function(mm) { return mm.id === id; });
  if (!m) return;
  m.s1 = parseInt(s1) || 0;
  m.s2 = parseInt(s2) || 0;
  m.updatedAt = Date.now();
  if (m.status === 'UPCOMING') m.status = 'LIVE';
  if (m.round !== 'Final') {
    AppState.tournament.knockout = advanceWinner(AppState.tournament.knockout);
  }
  saveState();
  renderLiveView();
}