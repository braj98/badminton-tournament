function renderFixtures() {
  clearDisabled();
  const container = document.getElementById('fixtureList');
  const groups = Object.keys(AppState.tournament.groups);
  const fixtures = AppState.tournament.fixtures;
  let html = '';
  for (const key of groups) {
    const gf = fixtures.filter(f => f.group === key);
    if (gf.length === 0) continue;
    const playerCount = (AppState.tournament.groups[key] || []).length;
    const doneCount = gf.filter(f => f.done).length;
    html += '<div class="fixture-panel">'
      + '<div class="fixture-panel-header">'
      + '<span class="fixture-panel-title">Group ' + escapeHtml(key) + '</span>'
      + '<span class="fixture-panel-meta">' + doneCount + '/' + gf.length + ' done · ' + playerCount + ' players</span>'
      + '</div>'
      + '<div class="fixture-split-grid">'
      + '<div class="fixture-matches-stack">';

    for (const f of gf) {
      const done = f.done;
      const n1 = pName(f.p1), n2 = pName(f.p2);
      const i1 = getInitials(f.p1), i2 = getInitials(f.p2);
      const winnerIsP1 = done && f.s1 !== null && f.s2 !== null && f.s1 > f.s2;
      const winnerIsP2 = done && f.s1 !== null && f.s2 !== null && f.s2 > f.s1;

      html += '<div class="fixture-match-row' + (done ? ' match-done' : '') + '">'
        + '<div class="fixture-team' + (winnerIsP1 ? ' is-winner' : '') + '">'
        + '<span class="fixture-avatar">' + escapeHtml(i1) + '</span>'
        + escapeHtml(n1)
        + '</div>';

      // Score area
      html += '<div class="fixture-score-area">';
      if (isAdmin()) {
        var _max = getCurrentConfig().maxScoreInput;
        html += '<input class="score-input s-first" type="number" min="0" max="' + _max + '" value="' + (f.s1 ?? '') + '" '
          + 'onchange="enterFixtureScore(' + f.id + ',this.value,this.parentElement.querySelector(\'.s2\').value)" '
          + 'onfocus="this.select()">'
          + '<span class="vs" style="font-size:.65rem;color:var(--text-muted);"> - </span>'
          + '<input class="score-input s2" type="number" min="0" max="' + _max + '" value="' + (f.s2 ?? '') + '" '
          + 'onchange="enterFixtureScore(' + f.id + ',this.parentElement.querySelector(\'.s-first\').value,this.value)" '
          + 'onfocus="this.select()">';
      } else {
        html += '<span class="fixture-score-pill">' + (done && f.s1 !== null ? f.s1 + ' - ' + f.s2 : '—') + '</span>';
      }
      html += '</div>';

      html += '<div class="fixture-team align-right' + (winnerIsP2 ? ' is-winner' : '') + '">'
        + '<span class="fixture-avatar">' + escapeHtml(i2) + '</span>'
        + escapeHtml(n2)
        + '</div>'
        + '<div class="fixture-status-badge' + (done ? '' : (f.status === 'LIVE' ? ' is-live' : ' is-pending')) + '">'
        + (done ? '✓ Completed' : (f.status === 'LIVE' ? '🔴 LIVE' : '⏳ Pending'))
        + '</div>'
        + '</div>';

      // Controls row
      if (isAdmin() && f.p1 && f.p2 && f.status !== 'COMPLETED') {
        html += '<div class="fixture-controls-row">';
        if (f.status === 'UPCOMING') {
          html += '<button class="btn btn-sm btn-outline" onclick="startFixtureMatch(' + f.id + ')">▶ Start Match</button>';
        }
        if (f.status === 'LIVE') {
          html += '<button class="btn btn-sm btn-outline" onclick="completeFixtureMatch(' + f.id + ')" style="border-color:var(--success);color:var(--success);">☑ Complete Match</button>';
        }
        html += '</div>';
      }
    }

    html += '</div>'; // fixture-matches-stack

    // Standings sidebar
    const rows = AppState.tournament.standings[key];
    html += '<div class="fixture-sidebar">';
    if (rows && rows.length > 0) {
      html += '<table class="fixture-standings-table">'
        + '<thead><tr>'
        + '<th>#</th><th>Player</th><th class="cell-center">P</th><th class="cell-center">W</th><th class="cell-center">L</th><th class="cell-center">PD</th>'
        + '</tr></thead><tbody>';
      for (const r of rows) {
        html += '<tr' + (r.rank <= 2 ? ' class="qualified-row"' : '') + '>'
          + '<td><span class="fixture-rank-pill">' + (r.rank || (rows.indexOf(r) + 1)) + '</span></td>'
          + '<td class="fixture-player-name">' + escapeHtml(r.name) + '</td>'
          + '<td class="cell-center">' + r.played + '</td>'
          + '<td class="cell-center">' + r.won + '</td>'
          + '<td class="cell-center">' + r.lost + '</td>'
          + '<td class="cell-center">' + (r.pd > 0 ? '+' : '') + r.pd + '</td>'
          + '</tr>';
      }
      html += '</tbody></table>';
    } else {
      html += '<p class="text-muted" style="font-size:.85rem;padding:1rem 0;text-align:center;">No standings data</p>';
    }
    html += '</div>'; // fixture-sidebar

    html += '</div></div>'; // fixture-split-grid, fixture-panel
  }
  container.innerHTML = html;
  document.getElementById('groupStandings').innerHTML = '';
  const allDone = fixtures.filter(f => f.done).length === fixtures.length;
  document.getElementById('btnProceedKnockout').classList.toggle('hidden', !allDone);
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

function completeFixtureMatch(id) {
  if (!isAdmin()) return;
  const f = AppState.tournament.fixtures.find(m => m.id === id);
  if (!f) return;
  completeMatch(f);
  const result = computeStandings(AppState.tournament.groups, AppState.tournament.fixtures, AppState.tournament.participants);
  AppState.tournament.standings = result.standings;
  AppState.tournament.qualifiers = result.qualifiers;
  AppState.tournament.knockout = createKnockoutBracket(AppState.tournament.qualifiers);
  saveState();
  renderFixtures();
}
