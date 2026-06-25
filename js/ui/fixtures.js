function renderFixtures() {
  clearDisabled();
  var _cfg = getCurrentConfig();
  var container = document.getElementById('fixtureList');
  var standingsContainer = document.getElementById('groupStandings');
  var fixtures = AppState.tournament.fixtures || [];
  var groups = AppState.tournament.groups || {};
  var standings = AppState.tournament.standings || {};
  var groupKeys = Object.keys(groups);

  if (groupKeys.length === 0) {
    container.innerHTML = '<p class="text-muted">No fixtures to display.</p>';
    standingsContainer.innerHTML = '';
    return;
  }

  var fixturesHtml = '';
  var standingsHtml = '';

  for (var _g = 0; _g < groupKeys.length; _g++) {
    var key = groupKeys[_g];
    var groupFixtures = fixtures.filter(function(f) { return f.group === key; });
    var groupStanding = standings[key] || [];

    fixturesHtml += '<div class="fixture-group-card">'
      + '<div class="fixture-group-header">'
      + '<span class="fixture-group-label">Group ' + escapeHtml(key) + '</span>'
      + '<span class="fixture-group-count">' + (groups[key] ? groups[key].length : 0) + ' players</span>'
      + '</div>'
      + '<div class="fixture-group-matches">';

    if (groupFixtures.length === 0) {
      fixturesHtml += '<div class="fixture-match-row"><span class="text-muted" style="grid-column:1/-1;text-align:center;">No matches.</span></div>';
    } else {
      for (var _f = 0; _f < groupFixtures.length; _f++) {
        var f = groupFixtures[_f];
        var done = f.done;
        var canPlay = f.p1 && f.p2;
        var winnerIsP1 = done && f.winner && f.winner === f.p1;
        var i1 = getInitials(f.p1);
        var i2 = getInitials(f.p2);
        var rowCls = 'fixture-match-row';
        if (done) rowCls += ' match-done';

        var badge = '';
        if (done) {
          badge = '<span class="fixture-status-badge">Done</span>';
        } else if (!canPlay) {
          badge = '<span class="fixture-status-badge is-pending">Waiting</span>';
        } else if (f.status === 'LIVE') {
          badge = '<span class="fixture-status-badge is-live">LIVE</span>';
        } else {
          badge = '<span class="fixture-status-badge is-pending">Upcoming</span>';
        }

        fixturesHtml += '<div class="' + rowCls + '">'
          + '<div class="fixture-team' + (winnerIsP1 ? ' is-winner' : '') + '">'
          + '<span class="fixture-avatar">' + escapeHtml(i1) + '</span>'
          + '<span>' + escapeHtml(pName(f.p1)) + '</span>'
          + '</div>';

        if (canPlay) {
          if (isAdmin()) {
            fixturesHtml += '<div class="fixture-score-area">'
              + '<input class="score-input" type="number" min="0" max="' + _cfg.maxScoreInput + '" value="' + (f.s1 ?? '') + '" onchange="enterFixtureScore(' + f.id + ',this.value,this.parentElement.querySelector(\'.fs2\').value)" onfocus="this.select()">'
              + '<span class="vs">vs</span>'
              + '<input class="score-input fs2" type="number" min="0" max="' + _cfg.maxScoreInput + '" value="' + (f.s2 ?? '') + '" onchange="enterFixtureScore(' + f.id + ',this.parentElement.querySelector(\'.score-input\').value,this.value)" onfocus="this.select()">'
              + '</div>';
          } else if (f.s1 !== null && f.s2 !== null) {
            fixturesHtml += '<div class="fixture-score-area">'
              + '<span class="score-text">' + escapeHtml(f.s1) + '</span><span class="vs">vs</span><span class="score-text">' + escapeHtml(f.s2) + '</span>'
              + '</div>';
          } else {
            fixturesHtml += '<div class="fixture-score-area"><span class="vs">vs</span></div>';
          }
        } else {
          fixturesHtml += '<div class="fixture-score-area"><span class="vs">vs</span></div>';
        }

        fixturesHtml += '<div class="fixture-team' + (done && f.winner && f.winner === f.p2 ? ' is-winner align-right' : ' align-right') + '">'
          + '<span>' + escapeHtml(pName(f.p2)) + '</span>'
          + '<span class="fixture-avatar">' + escapeHtml(i2) + '</span>'
          + '</div>'
          + '</div>';

        if (canPlay && isAdmin()) {
          var btns = '';
          if (f.status === 'UPCOMING' || !f.status) {
            btns += '<button class="btn btn-sm btn-go-live" onclick="startFixtureMatch(' + f.id + ')">▶ Go Live</button>';
          } else if (f.status === 'LIVE') {
            btns += '<button class="btn btn-sm btn-outline" onclick="revertFixtureMatch(' + f.id + ')">↩ Revert</button>'
              + '<button class="btn btn-sm btn-outline" onclick="completeFixtureMatch(' + f.id + ')">☑ Complete</button>';
          } else if (f.status === 'COMPLETED') {
            btns += '<button class="btn btn-sm btn-outline" onclick="reopenFixtureMatch(' + f.id + ')">↩ Reopen</button>';
          }
          if (btns) fixturesHtml += '<div class="fixture-controls-row">' + btns + '</div>';
        }
      }
    }
    fixturesHtml += '</div></div>';

    standingsHtml += '<div class="fixture-sidebar">'
      + '<h4 style="font-size:0.8rem;font-weight:700;margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:0.04em;color:var(--text-muted);">Group ' + escapeHtml(key) + ' Standings</h4>';

    if (groupStanding.length === 0) {
      standingsHtml += '<p class="text-muted" style="font-size:0.8rem;">No results yet.</p>';
    } else {
      standingsHtml += '<table class="fixture-standings-table">'
        + '<thead><tr><th>#</th><th>Player</th><th>P</th><th>W</th><th>L</th><th>PF</th><th>PA</th><th>PD</th></tr></thead>'
        + '<tbody>';
      for (var _s = 0; _s < groupStanding.length; _s++) {
        var s = groupStanding[_s];
        var isQ = _s < 2;
        standingsHtml += '<tr class="' + (isQ ? 'qualified-row' : '') + '">'
          + '<td><span class="fixture-rank-pill">' + (_s + 1) + '</span></td>'
          + '<td><span class="fixture-player-name">' + escapeHtml(s.name || s.id) + '</span></td>'
          + '<td>' + s.played + '</td>'
          + '<td>' + s.won + '</td>'
          + '<td>' + s.lost + '</td>'
          + '<td>' + s.pf + '</td>'
          + '<td>' + s.pa + '</td>'
          + '<td>' + (s.pd >= 0 ? '+' : '') + s.pd + '</td>'
          + '</tr>';
      }
      standingsHtml += '</tbody></table>';
    }
    standingsHtml += '</div>';
  }

  container.innerHTML = fixturesHtml;
  standingsContainer.innerHTML = standingsHtml;

  var allDone = fixtures.length > 0 && fixtures.every(function(f) { return f.done || !f.p1; });
  document.getElementById('btnProceedKnockout').classList.toggle('hidden', !(allDone && AppState.tournament.knockout.length > 0 && isAdmin()));
  document.getElementById('btnViewKnockout').classList.toggle('hidden', !(allDone && AppState.tournament.knockout.length > 0));
}

function revertFixtureMatch(id) {
  if (!isAdmin()) return;
  if (!confirm('Revert this match to Upcoming? All scores will be cleared.')) return;
  var f = AppState.tournament.fixtures.find(function(m) { return m.id === id; });
  if (!f) return;
  f.s1 = null;
  f.s2 = null;
  f.done = false;
  f.winner = null;
  f.status = 'UPCOMING';
  f.updatedAt = Date.now();
  var result = computeStandings(AppState.tournament.groups, AppState.tournament.fixtures, AppState.tournament.participants);
  AppState.tournament.standings = result.standings;
  AppState.tournament.qualifiers = result.qualifiers;
  AppState.tournament.knockout = createKnockoutBracket(AppState.tournament.qualifiers);
  syncTournamentState(AppState.tournament);
  saveState();
  renderFixtures();
}

function completeFixtureMatch(id) {
  if (!isAdmin()) return;
  const f = AppState.tournament.fixtures.find(m => m.id === id);
  if (!f) return;
  showCompleteConfirm(f, function() {
    completeMatch(f);
    f.updatedAt = Date.now();
    const result = computeStandings(AppState.tournament.groups, AppState.tournament.fixtures, AppState.tournament.participants);
    AppState.tournament.standings = result.standings;
    AppState.tournament.qualifiers = result.qualifiers;
    AppState.tournament.knockout = createKnockoutBracket(AppState.tournament.qualifiers);
    syncTournamentState(AppState.tournament);
    saveState();
    renderFixtures();
  });
}

function reopenFixtureMatch(id) {
  if (!isAdmin()) return;
  if (!confirm('Reopen this match? It will go back to live with scores preserved.')) return;
  const f = AppState.tournament.fixtures.find(m => m.id === id);
  if (!f) return;
  reopenMatch(f);
  f.updatedAt = Date.now();
  const result = computeStandings(AppState.tournament.groups, AppState.tournament.fixtures, AppState.tournament.participants);
  AppState.tournament.standings = result.standings;
  AppState.tournament.qualifiers = result.qualifiers;
  AppState.tournament.knockout = createKnockoutBracket(AppState.tournament.qualifiers);
  syncTournamentState(AppState.tournament);
  saveState();
  renderFixtures();
}

function enterFixtureScore(id, s1, s2) {
  if (!isAdmin()) return;
  const f = AppState.tournament.fixtures.find(m => m.id === id);
  if (!f) return;
  f.s1 = parseInt(s1) || 0;
  f.s2 = parseInt(s2) || 0;
  f.updatedAt = Date.now();
  if (f.status === 'UPCOMING') f.status = 'LIVE';
  const result = computeStandings(AppState.tournament.groups, AppState.tournament.fixtures, AppState.tournament.participants);
  AppState.tournament.standings = result.standings;
  AppState.tournament.qualifiers = result.qualifiers;
  AppState.tournament.knockout = createKnockoutBracket(AppState.tournament.qualifiers);
  syncTournamentState(AppState.tournament);
  saveState();
  renderFixtures();
}

function startFixtureMatch(id) {
  if (!isAdmin()) return;
  if (!confirm('Start this fixture match? It will be marked as live.')) return;
  const f = AppState.tournament.fixtures.find(m => m.id === id);
  if (!f) return;
  startMatch(f);
  saveState();
  renderFixtures();
}
